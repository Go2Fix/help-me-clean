package resolver

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/service/anaf"
)

// triggerANAFVerification calls the ANAF API for the given CUI and persists
// the result (or error state) against the company record. It is designed to be
// invoked as a fire-and-forget goroutine from ApplyAsCompany, but can also be
// called synchronously from an admin mutation.
//
// Errors are logged but never returned — callers must not depend on the result.
func (r *Resolver) triggerANAFVerification(companyID pgtype.UUID, cui string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	result, err := anaf.Lookup(ctx, cui)
	if err != nil {
		log.Printf("anaf: verification failed for company %s (cui=%s): %v", uuidToString(companyID), cui, err)
		_, dbErr := r.Queries.SaveANAFError(ctx, db.SaveANAFErrorParams{
			ID:           companyID,
			AnafRawError: pgtype.Text{String: err.Error(), Valid: true},
		})
		if dbErr != nil {
			log.Printf("anaf: failed to persist error state for company %s: %v", uuidToString(companyID), dbErr)
		}
		return
	}

	status := "not_found"
	if result.Found {
		status = "verified"
	}

	_, dbErr := r.Queries.SaveANAFVerification(ctx, db.SaveANAFVerificationParams{
		ID:                 companyID,
		AnafStatus:         pgtype.Text{String: status, Valid: true},
		AnafDenumire:       pgtype.Text{String: result.DenumireRaw, Valid: result.Found},
		AnafAdresa:         pgtype.Text{String: result.Adresa, Valid: result.Found},
		AnafDataInfiintare: pgtype.Text{String: result.DataInfiintare, Valid: result.Found && result.DataInfiintare != ""},
		AnafScpTva:         pgtype.Bool{Bool: result.ScpTva, Valid: result.Found},
		AnafInactive:       pgtype.Bool{Bool: result.Inactive, Valid: result.Found},
	})
	if dbErr != nil {
		log.Printf("anaf: failed to persist verification result for company %s: %v", uuidToString(companyID), dbErr)
	}
}

// nameMatchScore returns a 0.0–1.0 similarity score between two strings using
// lowercase word-token overlap. Strips common Romanian legal entity suffixes.
func nameMatchScore(a, b string) float64 {
	aTokens := tokenizeCompanyName(a)
	bTokens := tokenizeCompanyName(b)
	if len(aTokens) == 0 || len(bTokens) == 0 {
		return 0
	}
	matched := 0
	for _, t := range aTokens {
		for _, bt := range bTokens {
			if t == bt {
				matched++
				break
			}
		}
	}
	maxLen := len(aTokens)
	if len(bTokens) > maxLen {
		maxLen = len(bTokens)
	}
	return float64(matched) / float64(maxLen)
}

func tokenizeCompanyName(s string) []string {
	ignore := map[string]bool{"srl": true, "sa": true, "pfa": true, "ii": true, "scs": true, "sca": true, "ra": true}
	words := strings.Fields(strings.ToLower(s))
	result := make([]string, 0, len(words))
	for _, w := range words {
		w = strings.Trim(w, ".")
		if !ignore[w] && w != "" {
			result = append(result, w)
		}
	}
	return result
}
