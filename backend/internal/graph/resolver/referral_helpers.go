package resolver

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"strings"

	db "go2fix-backend/internal/db/generated"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const referralCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // excludes 0/O/1/I to avoid visual confusion
const referralCodeLen = 8
const referralRequiredCount = 3

// generateReferralCodeString returns a cryptographically random 8-character code.
func generateReferralCodeString() (string, error) {
	b := make([]byte, referralCodeLen)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(referralCodeAlphabet))))
		if err != nil {
			return "", fmt.Errorf("rand failure: %w", err)
		}
		b[i] = referralCodeAlphabet[n.Int64()]
	}
	return string(b), nil
}

// ensureReferralCode fetches or lazily creates the referral code for the given client user.
func (r *Resolver) ensureReferralCode(ctx context.Context, ownerUserID pgtype.UUID) (db.ReferralCode, error) {
	code, err := r.Queries.GetReferralCodeByOwner(ctx, ownerUserID)
	if err == nil {
		return code, nil
	}
	if err != pgx.ErrNoRows {
		return db.ReferralCode{}, fmt.Errorf("failed to fetch referral code: %w", err)
	}

	// Create with collision-retry.
	const maxRetries = 5
	for i := 0; i < maxRetries; i++ {
		codeStr, genErr := generateReferralCodeString()
		if genErr != nil {
			return db.ReferralCode{}, genErr
		}
		created, createErr := r.Queries.CreateReferralCode(ctx, db.CreateReferralCodeParams{
			OwnerUserID: ownerUserID,
			Code:        codeStr,
		})
		if createErr == nil {
			return created, nil
		}
		if strings.Contains(createErr.Error(), "duplicate") || strings.Contains(createErr.Error(), "unique") {
			continue
		}
		return db.ReferralCode{}, fmt.Errorf("failed to create referral code: %w", createErr)
	}
	return db.ReferralCode{}, fmt.Errorf("failed to generate unique referral code after %d attempts", maxRetries)
}

// processNewUserReferral links a newly-created user to the referral code used at signup.
// Safe to call non-blocking – logs errors.
func (r *Resolver) processNewUserReferral(ctx context.Context, newUserID pgtype.UUID, referralCode string) {
	referralCode = strings.TrimSpace(strings.ToUpper(referralCode))
	if referralCode == "" {
		return
	}

	rc, err := r.Queries.GetReferralCodeByCode(ctx, referralCode)
	if err != nil {
		log.Printf("referral: code %q not found: %v", referralCode, err)
		return
	}

	// Prevent self-referral.
	if rc.OwnerUserID == newUserID {
		log.Printf("referral: user %s tried to use their own code", uuidToString(newUserID))
		return
	}

	// Guard: already referred?
	existing, err := r.Queries.GetReferralSignupByReferredUser(ctx, newUserID)
	if err == nil {
		log.Printf("referral: user %s already referred (code %s)", uuidToString(newUserID), uuidToString(existing.ReferralCodeID))
		return
	}
	if err != pgx.ErrNoRows {
		log.Printf("referral: failed to check existing signup for user %s: %v", uuidToString(newUserID), err)
		return
	}

	_, err = r.Queries.CreateReferralSignup(ctx, db.CreateReferralSignupParams{
		ReferralCodeID: rc.ID,
		ReferredUserID: newUserID,
		CycleNumber:    rc.CurrentCycle,
	})
	if err != nil {
		log.Printf("referral: failed to create signup for user %s: %v", uuidToString(newUserID), err)
		return
	}

	if _, err := r.Queries.SetUserReferralCodeUsed(ctx, db.SetUserReferralCodeUsedParams{
		ID:               newUserID,
		ReferralCodeUsed: pgtype.Text{String: referralCode, Valid: true},
	}); err != nil {
		log.Printf("referral: failed to set referral_code_used for user %s: %v", uuidToString(newUserID), err)
	}

	log.Printf("referral: user %s linked to code %s (cycle %d)", uuidToString(newUserID), referralCode, rc.CurrentCycle)
}

// processReferralAtBookingComplete is called (non-blocking) after a booking is completed.
// It marks the referred user's first booking as complete and, if the cycle quota is met,
// awards a discount to the referrer and advances the cycle.
func (r *Resolver) processReferralAtBookingComplete(ctx context.Context, booking db.Booking) {
	userID := booking.ClientUserID

	signup, err := r.Queries.GetReferralSignupByReferredUser(ctx, userID)
	if err != nil {
		if err != pgx.ErrNoRows {
			log.Printf("referral: processComplete – lookup for user %s: %v", uuidToString(userID), err)
		}
		return
	}

	// Already counted.
	if signup.FirstBookingCompletedAt.Valid {
		return
	}

	_, err = r.Queries.MarkReferralSignupCompleted(ctx, db.MarkReferralSignupCompletedParams{
		ReferredUserID:      userID,
		QualifyingBookingID: booking.ID,
	})
	if err != nil {
		log.Printf("referral: failed to mark signup completed for user %s: %v", uuidToString(userID), err)
		return
	}

	completed, err := r.Queries.CountCompletedSignupsInCycle(ctx, db.CountCompletedSignupsInCycleParams{
		ReferralCodeID: signup.ReferralCodeID,
		CycleNumber:    signup.CycleNumber,
	})
	if err != nil {
		log.Printf("referral: failed to count cycle completions: %v", err)
		return
	}

	log.Printf("referral: code %s cycle %d – %d/%d complete",
		uuidToString(signup.ReferralCodeID), signup.CycleNumber, completed, referralRequiredCount)

	if completed < referralRequiredCount {
		return
	}

	// Fetch the referral code to get the owner.
	rc, err := r.Queries.GetReferralCodeByID(ctx, signup.ReferralCodeID)
	if err != nil {
		log.Printf("referral: failed to fetch referral code %s: %v", uuidToString(signup.ReferralCodeID), err)
		return
	}

	_, err = r.Queries.CreateReferralEarnedDiscount(ctx, db.CreateReferralEarnedDiscountParams{
		ReferralCodeID: signup.ReferralCodeID,
		OwnerUserID:    rc.OwnerUserID,
		CycleNumber:    signup.CycleNumber,
		ExpiresAt:      pgtype.Timestamptz{}, // no expiry
	})
	if err != nil {
		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			log.Printf("referral: discount for cycle %d already exists (idempotent)", signup.CycleNumber)
			return
		}
		log.Printf("referral: failed to create earned discount for code %s cycle %d: %v",
			uuidToString(signup.ReferralCodeID), signup.CycleNumber, err)
		return
	}

	// Advance cycle so new signups go into the next batch.
	if _, err = r.Queries.IncrementReferralCycle(ctx, signup.ReferralCodeID); err != nil {
		log.Printf("referral: failed to increment cycle for code %s: %v", uuidToString(signup.ReferralCodeID), err)
	}

	log.Printf("referral: 🎉 cycle %d complete for code %s – discount awarded to user %s",
		signup.CycleNumber, uuidToString(signup.ReferralCodeID), uuidToString(rc.OwnerUserID))
}
