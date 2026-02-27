package resolver

import (
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/graph/model"
)

// UUID helpers

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func stringToUUID(s string) pgtype.UUID {
	s = strings.ReplaceAll(s, "-", "")
	if len(s) != 32 {
		return pgtype.UUID{}
	}
	var b [16]byte
	for i := 0; i < 16; i++ {
		_, err := fmt.Sscanf(s[i*2:i*2+2], "%02x", &b[i])
		if err != nil {
			return pgtype.UUID{}
		}
	}
	return pgtype.UUID{Bytes: b, Valid: true}
}

// Nullable helpers

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func textVal(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func int4Ptr(i pgtype.Int4) *int {
	if !i.Valid {
		return nil
	}
	v := int(i.Int32)
	return &v
}

func int4Val(i pgtype.Int4) int {
	if !i.Valid {
		return 0
	}
	return int(i.Int32)
}

func boolPtr(b pgtype.Bool) *bool {
	if !b.Valid {
		return nil
	}
	return &b.Bool
}

func boolVal(b pgtype.Bool) bool {
	if !b.Valid {
		return false
	}
	return b.Bool
}

func float8Ptr(f pgtype.Float8) *float64 {
	if !f.Valid {
		return nil
	}
	return &f.Float64
}

// interfaceToFloat converts an interface{} value (from COALESCE/SUM SQL results) to float64.
func interfaceToFloat(v interface{}) float64 {
	if v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	case string:
		var f float64
		fmt.Sscanf(val, "%f", &f)
		return f
	case pgtype.Numeric:
		return numericToFloat(val)
	default:
		return 0
	}
}

func numericToFloat(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, _ := n.Float64Value()
	return f.Float64
}

func numericToFloatPtr(n pgtype.Numeric) *float64 {
	if !n.Valid {
		return nil
	}
	f, _ := n.Float64Value()
	return &f.Float64
}

func timestamptzToTime(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

func timestamptzToTimePtr(t pgtype.Timestamptz) *time.Time {
	if !t.Valid {
		return nil
	}
	return &t.Time
}

func dateToString(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

func timeToString(t pgtype.Time) string {
	if !t.Valid {
		return ""
	}
	hours := t.Microseconds / 3_600_000_000
	mins := (t.Microseconds % 3_600_000_000) / 60_000_000
	return fmt.Sprintf("%02d:%02d", hours, mins)
}

func parseHHMMToTime(s string) pgtype.Time {
	var h, m int
	fmt.Sscanf(s, "%d:%d", &h, &m)
	return pgtype.Time{
		Microseconds: int64(h)*3_600_000_000 + int64(m)*60_000_000,
		Valid:        true,
	}
}

func pgTextEmpty() pgtype.Text {
	return pgtype.Text{}
}

func stringToText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func stringToTextVal(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}

func intToInt4(i *int) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{}
	}
	return pgtype.Int4{Int32: int32(*i), Valid: true}
}

func intToInt4Val(i int) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(i), Valid: true}
}

func boolToPgBool(b *bool) pgtype.Bool {
	if b == nil {
		return pgtype.Bool{}
	}
	return pgtype.Bool{Bool: *b, Valid: true}
}

func float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	n.Scan(fmt.Sprintf("%f", f))
	return n
}

func float64PtrToFloat8(f *float64) pgtype.Float8 {
	if f == nil {
		return pgtype.Float8{}
	}
	return pgtype.Float8{Float64: *f, Valid: true}
}

// Enum conversions (DB uses lowercase, GQL uses UPPERCASE)

func dbUserRoleToGQL(r db.UserRole) model.UserRole {
	return model.UserRole(strings.ToUpper(string(r)))
}

func gqlUserRoleToDb(r model.UserRole) db.UserRole {
	return db.UserRole(strings.ToLower(string(r)))
}

func dbUserStatusToGQL(s db.UserStatus) model.UserStatus {
	return model.UserStatus(strings.ToUpper(string(s)))
}

func dbBookingStatusToGQL(s db.BookingStatus) model.BookingStatus {
	return model.BookingStatus(strings.ToUpper(string(s)))
}

func gqlBookingStatusToDb(s model.BookingStatus) db.BookingStatus {
	return db.BookingStatus(strings.ToLower(string(s)))
}

func dbServiceTypeToGQL(s db.ServiceType) model.ServiceType {
	return model.ServiceType(strings.ToUpper(string(s)))
}

func gqlServiceTypeToDb(s model.ServiceType) db.ServiceType {
	return db.ServiceType(strings.ToLower(string(s)))
}

func dbCompanyStatusToGQL(s db.CompanyStatus) model.CompanyStatus {
	return model.CompanyStatus(strings.ToUpper(string(s)))
}

func gqlCompanyStatusToDb(s model.CompanyStatus) db.CompanyStatus {
	return db.CompanyStatus(strings.ToLower(string(s)))
}

func dbCompanyTypeToGQL(t db.CompanyType) model.CompanyType {
	return model.CompanyType(strings.ToUpper(string(t)))
}

func gqlCompanyTypeToDb(t model.CompanyType) db.CompanyType {
	return db.CompanyType(strings.ToLower(string(t)))
}

func dbWorkerStatusToGQL(s db.WorkerStatus) model.WorkerStatus {
	return model.WorkerStatus(strings.ToUpper(string(s)))
}

func gqlWorkerStatusToDb(s model.WorkerStatus) db.WorkerStatus {
	return db.WorkerStatus(strings.ToLower(string(s)))
}

// Model converters

func dbUserToGQL(u db.User) *model.User {
	return &model.User{
		ID:                uuidToString(u.ID),
		Email:             u.Email,
		FullName:          u.FullName,
		Phone:             textPtr(u.Phone),
		AvatarURL:         textPtr(u.AvatarUrl),
		Role:              dbUserRoleToGQL(u.Role),
		Status:            dbUserStatusToGQL(u.Status),
		PreferredLanguage: textVal(u.PreferredLanguage),
		CreatedAt:         timestamptzToTime(u.CreatedAt),
	}
}

func dbServiceDefToGQL(s db.ServiceDefinition) *model.ServiceDefinition {
	var categoryID *string
	if s.CategoryID.Valid {
		cid := uuidToString(s.CategoryID)
		categoryID = &cid
	}

	return &model.ServiceDefinition{
		ID:                 uuidToString(s.ID),
		ServiceType:        dbServiceTypeToGQL(s.ServiceType),
		NameRo:             s.NameRo,
		NameEn:             s.NameEn,
		DescriptionRo:      textPtr(s.DescriptionRo),
		DescriptionEn:      textPtr(s.DescriptionEn),
		BasePricePerHour:   numericToFloat(s.BasePricePerHour),
		MinHours:           numericToFloat(s.MinHours),
		HoursPerRoom:       numericToFloat(s.HoursPerRoom),
		HoursPerBathroom:   numericToFloat(s.HoursPerBathroom),
		HoursPer100Sqm:     numericToFloat(s.HoursPer100Sqm),
		HouseMultiplier:    numericToFloat(s.HouseMultiplier),
		PetDurationMinutes: int(s.PetDurationMinutes),
		Icon:               textPtr(s.Icon),
		IsActive:           boolVal(s.IsActive),
		IncludedItems:      s.IncludedItems,
		CategoryID:         categoryID,
		PricingModel:       dbPricingModelToGQL(s.PricingModel),
		PricePerSqm:        numericToFloatPtr(s.PricePerSqm),
	}
}

func dbServiceCatToGQL(c db.ServiceCategory) *model.ServiceCategory {
	var formFields *string
	if len(c.FormFields) > 0 {
		s := string(c.FormFields)
		formFields = &s
	}

	return &model.ServiceCategory{
		ID:            uuidToString(c.ID),
		Slug:          c.Slug,
		NameRo:        c.NameRo,
		NameEn:        c.NameEn,
		DescriptionRo: textPtr(c.DescriptionRo),
		DescriptionEn: textPtr(c.DescriptionEn),
		Icon:          textPtr(c.Icon),
		ImageURL:      textPtr(c.ImageUrl),
		CommissionPct: numericToFloatPtr(c.CommissionPct),
		SortOrder:     int(c.SortOrder),
		IsActive:      c.IsActive,
		FormFields:    formFields,
		Services:      []*model.ServiceDefinition{},
	}
}

func dbPricingModelToGQL(pm db.PricingModel) model.PricingModel {
	switch pm {
	case db.PricingModelPerSqm:
		return model.PricingModelPerSqm
	default:
		return model.PricingModelHourly
	}
}

func gqlPricingModelToDb(pm model.PricingModel) db.PricingModel {
	switch pm {
	case model.PricingModelPerSqm:
		return db.PricingModelPerSqm
	default:
		return db.PricingModelHourly
	}
}

func dbServiceExtraToGQL(e db.ServiceExtra) *model.ServiceExtra {
	var categoryID *string
	if e.CategoryID.Valid {
		s := uuidToString(e.CategoryID)
		categoryID = &s
	}
	return &model.ServiceExtra{
		ID:              uuidToString(e.ID),
		NameRo:          e.NameRo,
		NameEn:          e.NameEn,
		Price:           numericToFloat(e.Price),
		DurationMinutes: int(e.DurationMinutes),
		Icon:            textPtr(e.Icon),
		IsActive:        boolVal(e.IsActive),
		AllowMultiple:   e.AllowMultiple,
		UnitLabel:       textPtr(e.UnitLabel),
		CategoryID:      categoryID,
	}
}

func dbBookingToGQL(b db.Booking) *model.Booking {
	paymentStatus := textVal(b.PaymentStatus)
	if paymentStatus == "" {
		paymentStatus = "pending"
	}
	var recurringGroupID *string
	if b.RecurringGroupID.Valid {
		s := uuidToString(b.RecurringGroupID)
		recurringGroupID = &s
	}
	var subscriptionID *string
	if b.SubscriptionID.Valid {
		s := uuidToString(b.SubscriptionID)
		subscriptionID = &s
	}

	var categoryID *string
	if b.CategoryID.Valid {
		s := uuidToString(b.CategoryID)
		categoryID = &s
	}

	var customFields *string
	if len(b.CustomFields) > 0 {
		s := string(b.CustomFields)
		customFields = &s
	}

	return &model.Booking{
		ID:                     uuidToString(b.ID),
		ReferenceCode:          b.ReferenceCode,
		ServiceType:            dbServiceTypeToGQL(b.ServiceType),
		ScheduledDate:          dateToString(b.ScheduledDate),
		ScheduledStartTime:     timeToString(b.ScheduledStartTime),
		EstimatedDurationHours: numericToFloat(b.EstimatedDurationHours),
		PropertyType:           textPtr(b.PropertyType),
		NumRooms:               int4Ptr(b.NumRooms),
		NumBathrooms:           int4Ptr(b.NumBathrooms),
		AreaSqm:                int4Ptr(b.AreaSqm),
		HasPets:                boolPtr(b.HasPets),
		SpecialInstructions:    textPtr(b.SpecialInstructions),
		HourlyRate:             numericToFloat(b.HourlyRate),
		EstimatedTotal:         numericToFloat(b.EstimatedTotal),
		FinalTotal: func() *float64 {
			if !b.FinalTotal.Valid {
				return nil
			}
			v := numericToFloat(b.FinalTotal)
			return &v
		}(),
		PlatformCommissionPct: numericToFloat(b.PlatformCommissionPct),
		Status:                dbBookingStatusToGQL(b.Status),
		RecurringGroupID:      recurringGroupID,
		SubscriptionID:        subscriptionID,
		OccurrenceNumber:      int4Ptr(b.OccurrenceNumber),
		RescheduleCount:       int(b.RescheduleCount),
		RescheduledAt:         timestamptzToTimePtr(b.RescheduledAt),
		StartedAt:             timestamptzToTimePtr(b.StartedAt),
		CompletedAt:           timestamptzToTimePtr(b.CompletedAt),
		CancelledAt:           timestamptzToTimePtr(b.CancelledAt),
		CancellationReason:    textPtr(b.CancellationReason),
		TimeSlots:             []*model.BookingTimeSlot{},
		Extras:                []*model.BookingExtra{},
		IncludedItems:         []string{},
		PaymentStatus:         paymentStatus,
		PaidAt:                timestamptzToTimePtr(b.PaidAt),
		CategoryID:            categoryID,
		CustomFields:          customFields,
		CreatedAt:             timestamptzToTime(b.CreatedAt),
	}
}

// dbSearchBookingRowToGQL converts a SearchBookingsWithDetailsRow (JOIN result) to a GQL Booking.
// Used by SearchBookings to avoid N+1 enrichBooking calls.
func dbSearchBookingRowToGQL(row db.SearchBookingsWithDetailsRow) *model.Booking {
	paymentStatus := textVal(row.PaymentStatus)
	if paymentStatus == "" {
		paymentStatus = "pending"
	}
	var recurringGroupID *string
	if row.RecurringGroupID.Valid {
		s := uuidToString(row.RecurringGroupID)
		recurringGroupID = &s
	}
	var subscriptionID2 *string
	if row.SubscriptionID.Valid {
		s := uuidToString(row.SubscriptionID)
		subscriptionID2 = &s
	}

	serviceName := textVal(row.ServiceNameRo)
	if serviceName == "" {
		serviceName = string(row.ServiceType)
	}

	var customFields *string
	if len(row.CustomFields) > 0 {
		s := string(row.CustomFields)
		customFields = &s
	}

	booking := &model.Booking{
		ID:                     uuidToString(row.ID),
		ReferenceCode:          row.ReferenceCode,
		ServiceType:            dbServiceTypeToGQL(row.ServiceType),
		ServiceName:            serviceName,
		ScheduledDate:          dateToString(row.ScheduledDate),
		ScheduledStartTime:     timeToString(row.ScheduledStartTime),
		EstimatedDurationHours: numericToFloat(row.EstimatedDurationHours),
		PropertyType:           textPtr(row.PropertyType),
		NumRooms:               int4Ptr(row.NumRooms),
		NumBathrooms:           int4Ptr(row.NumBathrooms),
		AreaSqm:                int4Ptr(row.AreaSqm),
		HasPets:                boolPtr(row.HasPets),
		SpecialInstructions:    textPtr(row.SpecialInstructions),
		HourlyRate:             numericToFloat(row.HourlyRate),
		EstimatedTotal:         numericToFloat(row.EstimatedTotal),
		FinalTotal: func() *float64 {
			if !row.FinalTotal.Valid {
				return nil
			}
			v := numericToFloat(row.FinalTotal)
			return &v
		}(),
		PlatformCommissionPct: numericToFloat(row.PlatformCommissionPct),
		Status:                dbBookingStatusToGQL(row.Status),
		RecurringGroupID:      recurringGroupID,
		SubscriptionID:        subscriptionID2,
		OccurrenceNumber:      int4Ptr(row.OccurrenceNumber),
		RescheduleCount:       int(row.RescheduleCount),
		RescheduledAt:         timestamptzToTimePtr(row.RescheduledAt),
		StartedAt:             timestamptzToTimePtr(row.StartedAt),
		CompletedAt:           timestamptzToTimePtr(row.CompletedAt),
		CancelledAt:           timestamptzToTimePtr(row.CancelledAt),
		CancellationReason:    textPtr(row.CancellationReason),
		TimeSlots:             []*model.BookingTimeSlot{},
		Extras:                []*model.BookingExtra{},
		IncludedItems:         []string{},
		PaymentStatus:         paymentStatus,
		PaidAt:                timestamptzToTimePtr(row.PaidAt),
		CustomFields:          customFields,
		CreatedAt:             timestamptzToTime(row.CreatedAt),
	}

	// Attach client from JOIN data
	if row.ClientUserID.Valid {
		booking.Client = &model.User{
			ID:       uuidToString(row.ClientUserID),
			FullName: textVal(row.ClientFullName),
			Email:    textVal(row.ClientEmail),
		}
	}

	// Attach company from JOIN data
	if row.CompanyID.Valid {
		booking.Company = &model.Company{
			ID:          uuidToString(row.CompanyID),
			CompanyName: textVal(row.CompanyCompanyName),
		}
	}

	return booking
}

func dbCompanyToGQL(c db.Company) *model.Company {
	return &model.Company{
		ID:                    uuidToString(c.ID),
		CompanyName:           c.CompanyName,
		Cui:                   c.Cui,
		CompanyType:           dbCompanyTypeToGQL(c.CompanyType),
		LegalRepresentative:   c.LegalRepresentative,
		ContactEmail:          c.ContactEmail,
		ContactPhone:          c.ContactPhone,
		Address:               c.Address,
		City:                  c.City,
		County:                c.County,
		Description:           textPtr(c.Description),
		LogoURL:               textPtr(c.LogoUrl),
		Status:                dbCompanyStatusToGQL(c.Status),
		RejectionReason:       textPtr(c.RejectionReason),
		MaxServiceRadiusKm:    int4Val(c.MaxServiceRadiusKm),
		RatingAvg:             numericToFloat(c.RatingAvg),
		TotalJobsCompleted:    int4Val(c.TotalJobsCompleted),
		CommissionOverridePct: numericToFloatPtr(c.CommissionOverridePct),
		CreatedAt:             timestamptzToTime(c.CreatedAt),
		AnafVerification:      dbANAFVerificationToGQL(c),
	}
}

// dbANAFVerificationToGQL converts the anaf_* columns from a Company row into
// an ANAFVerification model, computing the derived nameMatchScore and isActive fields.
func dbANAFVerificationToGQL(c db.Company) *model.ANAFVerification {
	status := "unknown"
	if c.AnafStatus.Valid {
		status = c.AnafStatus.String
	} else {
		return &model.ANAFVerification{Status: status}
	}

	v := &model.ANAFVerification{Status: status}

	if c.AnafDenumire.Valid {
		v.Denumire = &c.AnafDenumire.String
		score := nameMatchScore(c.CompanyName, c.AnafDenumire.String)
		v.NameMatchScore = &score
	}
	if c.AnafAdresa.Valid {
		v.Adresa = &c.AnafAdresa.String
	}
	if c.AnafDataInfiintare.Valid {
		v.DataInfiintare = &c.AnafDataInfiintare.String
	}
	if c.AnafScpTva.Valid {
		v.ScpTva = &c.AnafScpTva.Bool
	}
	if c.AnafInactive.Valid {
		v.Inactive = &c.AnafInactive.Bool
		isActive := !c.AnafInactive.Bool && status == "verified"
		v.IsActive = &isActive
	}
	if c.AnafVerifiedAt.Valid {
		t := c.AnafVerifiedAt.Time
		v.VerifiedAt = &t
	}
	if c.AnafRawError.Valid {
		v.RawError = &c.AnafRawError.String
	}

	return v
}

func dbWorkerToGQL(c db.Worker, u *db.User) *model.WorkerProfile {
	var userID *string
	if c.UserID.Valid {
		s := uuidToString(c.UserID)
		userID = &s
	}

	profile := &model.WorkerProfile{
		ID:                 uuidToString(c.ID),
		UserID:             userID,
		Bio:                textPtr(c.Bio),
		Status:             dbWorkerStatusToGQL(c.Status),
		IsCompanyAdmin:     boolVal(c.IsCompanyAdmin),
		InviteToken:        textPtr(c.InviteToken),
		RatingAvg:          numericToFloat(c.RatingAvg),
		TotalJobsCompleted: int4Val(c.TotalJobsCompleted),
		CreatedAt:          timestamptzToTime(c.CreatedAt),
	}

	// Populate from user (source of truth)
	if u != nil {
		profile.FullName = u.FullName
		profile.Email = &u.Email
		profile.Phone = textPtr(u.Phone)
	}

	return profile
}

func dbAddressToGQL(a db.ClientAddress) *model.Address {
	addr := &model.Address{
		ID:            uuidToString(a.ID),
		Label:         textPtr(a.Label),
		StreetAddress: a.StreetAddress,
		City:          a.City,
		County:        a.County,
		PostalCode:    textPtr(a.PostalCode),
		Floor:         textPtr(a.Floor),
		Apartment:     textPtr(a.Apartment),
		EntryCode:     textPtr(a.EntryCode),
		Notes:         textPtr(a.Notes),
		IsDefault:     boolVal(a.IsDefault),
	}
	if a.Latitude.Valid && a.Longitude.Valid {
		addr.Coordinates = &model.Coordinates{
			Latitude:  a.Latitude.Float64,
			Longitude: a.Longitude.Float64,
		}
	}
	return addr
}

func dbPaymentMethodToGQL(p db.ClientPaymentMethod) *model.PaymentMethod {
	return &model.PaymentMethod{
		ID:                    uuidToString(p.ID),
		StripePaymentMethodID: textVal(p.StripePaymentMethodID),
		CardLastFour:          textVal(p.CardLastFour),
		CardBrand:             textVal(p.CardBrand),
		CardExpMonth:          int4Ptr(p.CardExpMonth),
		CardExpYear:           int4Ptr(p.CardExpYear),
		IsDefault:             boolVal(p.IsDefault),
	}
}

func dbPaymentTransactionToGQL(t db.PaymentTransaction) *model.PaymentTransaction {
	return &model.PaymentTransaction{
		ID:                    uuidToString(t.ID),
		BookingID:             uuidToString(t.BookingID),
		StripePaymentIntentID: t.StripePaymentIntentID,
		AmountTotal:           int(t.AmountTotal),
		AmountCompany:         int(t.AmountCompany),
		AmountPlatformFee:     int(t.AmountPlatformFee),
		Currency:              t.Currency,
		Status:                model.PaymentTransactionStatus(strings.ToUpper(string(t.Status))),
		FailureReason:         textPtr(t.FailureReason),
		RefundAmount:          int4Ptr(t.RefundAmount),
		CreatedAt:             timestamptzToTime(t.CreatedAt),
	}
}

func dbCompanyPayoutToGQL(p db.CompanyPayout) *model.CompanyPayout {
	return &model.CompanyPayout{
		ID:           uuidToString(p.ID),
		Amount:       int(p.Amount),
		Currency:     p.Currency,
		PeriodFrom:   dateToString(p.PeriodFrom),
		PeriodTo:     dateToString(p.PeriodTo),
		BookingCount: int(p.BookingCount),
		Status:       model.PayoutStatus(strings.ToUpper(string(p.Status))),
		PaidAt:       timestamptzToTimePtr(p.PaidAt),
		LineItems:    []*model.PayoutLineItem{},
		CreatedAt:    timestamptzToTime(p.CreatedAt),
	}
}

func dbPayoutLineItemToGQL(li db.PayoutLineItem) *model.PayoutLineItem {
	return &model.PayoutLineItem{
		ID:               uuidToString(li.ID),
		AmountGross:      int(li.AmountGross),
		AmountCommission: int(li.AmountCommission),
		AmountNet:        int(li.AmountNet),
	}
}

func dbRefundRequestToGQL(r db.RefundRequest) *model.RefundRequest {
	return &model.RefundRequest{
		ID:          uuidToString(r.ID),
		Amount:      int(r.Amount),
		Reason:      r.Reason,
		Status:      model.RefundStatus(strings.ToUpper(string(r.Status))),
		ProcessedAt: timestamptzToTimePtr(r.ProcessedAt),
		CreatedAt:   timestamptzToTime(r.CreatedAt),
	}
}

func dbInvoiceToGQL(inv db.Invoice) *model.Invoice {
	return &model.Invoice{
		ID:                uuidToString(inv.ID),
		InvoiceType:       model.InvoiceType(strings.ToUpper(string(inv.InvoiceType))),
		InvoiceNumber:     textPtr(inv.InvoiceNumber),
		Status:            model.InvoiceStatus(strings.ToUpper(string(inv.Status))),
		SellerCompanyName: inv.SellerCompanyName,
		SellerCui:         inv.SellerCui,
		BuyerName:         inv.BuyerName,
		BuyerCui:          textPtr(inv.BuyerCui),
		SubtotalAmount:    int(inv.SubtotalAmount),
		VatRate:           numericToFloat(inv.VatRate),
		VatAmount:         int(inv.VatAmount),
		TotalAmount:       int(inv.TotalAmount),
		Currency:          inv.Currency,
		EfacturaStatus:    textPtr(inv.EfacturaStatus),
		DownloadURL:       textPtr(inv.FactureazaDownloadUrl),
		IssuedAt:          timestamptzToTimePtr(inv.IssuedAt),
		DueDate: func() *string {
			s := dateToString(inv.DueDate)
			if s == "" {
				return nil
			}
			return &s
		}(),
		Notes:     textPtr(inv.Notes),
		LineItems: []*model.InvoiceLineItem{},
		CreatedAt: timestamptzToTime(inv.CreatedAt),
	}
}

func dbInvoiceLineItemToGQL(li db.InvoiceLineItem) *model.InvoiceLineItem {
	return &model.InvoiceLineItem{
		ID:               uuidToString(li.ID),
		DescriptionRo:    li.DescriptionRo,
		DescriptionEn:    textPtr(li.DescriptionEn),
		Quantity:         numericToFloat(li.Quantity),
		UnitPrice:        int(li.UnitPrice),
		VatRate:          numericToFloat(li.VatRate),
		VatAmount:        int(li.VatAmount),
		LineTotal:        int(li.LineTotal),
		LineTotalWithVat: int(li.LineTotalWithVat),
	}
}

func dbBillingProfileToGQL(bp db.ClientBillingProfile) *model.ClientBillingProfile {
	return &model.ClientBillingProfile{
		ID:          uuidToString(bp.ID),
		IsCompany:   bp.IsCompany,
		CompanyName: textPtr(bp.CompanyName),
		Cui:         textPtr(bp.Cui),
		RegNumber:   textPtr(bp.RegNumber),
		Address:     textPtr(bp.Address),
		City:        textPtr(bp.City),
		County:      textPtr(bp.County),
		IsVatPayer:  boolVal(bp.IsVatPayer),
		BankName:    textPtr(bp.BankName),
		Iban:        textPtr(bp.Iban),
		IsDefault:   boolVal(bp.IsDefault),
	}
}

func dbNotificationToGQL(n db.Notification) *model.Notification {
	return &model.Notification{
		ID:        uuidToString(n.ID),
		Type:      string(n.Type),
		Title:     n.Title,
		Body:      n.Body,
		IsRead:    boolVal(n.IsRead),
		CreatedAt: timestamptzToTime(n.CreatedAt),
	}
}

func dbChatRoomToGQL(r db.ChatRoom) *model.ChatRoom {
	return &model.ChatRoom{
		ID:        uuidToString(r.ID),
		RoomType:  r.RoomType,
		CreatedAt: timestamptzToTime(r.CreatedAt),
	}
}

func dbChatMessageToGQL(m db.ChatMessage) *model.ChatMessage {
	return &model.ChatMessage{
		ID:          uuidToString(m.ID),
		Content:     m.Content,
		MessageType: textVal(m.MessageType),
		IsRead:      boolVal(m.IsRead),
		CreatedAt:   timestamptzToTime(m.CreatedAt),
	}
}

func dbReviewToGQL(r db.Review) *model.Review {
	return &model.Review{
		ID:                  uuidToString(r.ID),
		Rating:              int(r.Rating),
		RatingPunctuality:   int4Ptr(r.RatingPunctuality),
		RatingQuality:       int4Ptr(r.RatingQuality),
		RatingCommunication: int4Ptr(r.RatingCommunication),
		RatingValue:         int4Ptr(r.RatingValue),
		Comment:             textPtr(r.Comment),
		ReviewType:          r.ReviewType,
		Status:              r.Status,
		Photos:              []*model.ReviewPhoto{},
		CreatedAt:           timestamptzToTime(r.CreatedAt),
	}
}

func dbReviewPhotoToGQL(p db.ReviewPhoto) *model.ReviewPhoto {
	return &model.ReviewPhoto{
		ID:        uuidToString(p.ID),
		PhotoURL:  p.PhotoUrl,
		SortOrder: int(p.SortOrder),
	}
}

func dbDocStatusToGQL(s string) model.DocumentStatus {
	switch s {
	case "approved":
		return model.DocumentStatusApproved
	case "rejected":
		return model.DocumentStatusRejected
	default:
		return model.DocumentStatusPending
	}
}

func dbCompanyDocToGQL(d db.CompanyDocument) *model.CompanyDocument {
	return &model.CompanyDocument{
		ID:              uuidToString(d.ID),
		DocumentType:    d.DocumentType,
		FileURL:         d.FileUrl,
		FileName:        d.FileName,
		Status:          dbDocStatusToGQL(d.Status),
		UploadedAt:      timestamptzToTime(d.UploadedAt),
		ReviewedAt:      timestamptzToTimePtr(d.ReviewedAt),
		RejectionReason: textPtr(d.RejectionReason),
	}
}

func dbWorkerDocToGQL(d db.WorkerDocument) *model.WorkerDocument {
	return &model.WorkerDocument{
		ID:              uuidToString(d.ID),
		DocumentType:    d.DocumentType,
		FileURL:         d.FileUrl,
		FileName:        d.FileName,
		Status:          dbDocStatusToGQL(d.Status),
		UploadedAt:      timestamptzToTime(d.UploadedAt),
		ReviewedAt:      timestamptzToTimePtr(d.ReviewedAt),
		RejectionReason: textPtr(d.RejectionReason),
	}
}

func dbPersonalityAssessmentToGQL(a db.PersonalityAssessment) *model.PersonalityAssessment {
	facetScores := []*model.PersonalityFacetScore{
		{FacetCode: "A1", FacetName: "Încredere", Score: int(a.TrustScore), MaxScore: 20, IsFlagged: a.TrustScore < 10},
		{FacetCode: "A2", FacetName: "Moralitate", Score: int(a.MoralityScore), MaxScore: 20, IsFlagged: a.MoralityScore < 10},
		{FacetCode: "A3", FacetName: "Altruism", Score: int(a.AltruismScore), MaxScore: 20, IsFlagged: a.AltruismScore < 10},
		{FacetCode: "C2", FacetName: "Ordine", Score: int(a.OrderlinessScore), MaxScore: 20, IsFlagged: a.OrderlinessScore < 10},
		{FacetCode: "C3", FacetName: "Responsabilitate", Score: int(a.DutifulnessScore), MaxScore: 20, IsFlagged: a.DutifulnessScore < 10},
		{FacetCode: "C5", FacetName: "Autodisciplină", Score: int(a.SelfDisciplineScore), MaxScore: 20, IsFlagged: a.SelfDisciplineScore < 10},
		{FacetCode: "C6", FacetName: "Prudență", Score: int(a.CautiousnessScore), MaxScore: 20, IsFlagged: a.CautiousnessScore < 10},
	}

	flaggedFacets := a.FlaggedFacets
	if flaggedFacets == nil {
		flaggedFacets = []string{}
	}

	return &model.PersonalityAssessment{
		ID:             uuidToString(a.ID),
		WorkerID:      uuidToString(a.WorkerID),
		FacetScores:    facetScores,
		IntegrityAvg:   numericToFloat(a.IntegrityAvg),
		WorkQualityAvg: numericToFloat(a.WorkQualityAvg),
		HasConcerns:    a.HasConcerns,
		FlaggedFacets:  flaggedFacets,
		CompletedAt:    timestamptzToTime(a.CompletedAt),
	}
}

func dbPersonalityInsightsToGQL(i db.PersonalityInsight) *model.PersonalityInsights {
	strengths := i.Strengths
	if strengths == nil {
		strengths = []string{}
	}

	concerns := i.Concerns
	if concerns == nil {
		concerns = []string{}
	}

	return &model.PersonalityInsights{
		Summary:           i.Summary,
		Strengths:         strengths,
		Concerns:          concerns,
		TeamFitAnalysis:   i.TeamFitAnalysis,
		RecommendedAction: i.RecommendedAction,
		Confidence:        i.Confidence,
		AiModel:           i.AiModel,
		GeneratedAt:       timestamptzToTime(i.GeneratedAt),
	}
}

func dbRecurrenceTypeToGQL(r db.RecurrenceType) model.RecurrenceType {
	return model.RecurrenceType(strings.ToUpper(string(r)))
}

func gqlRecurrenceTypeToDb(r model.RecurrenceType) db.RecurrenceType {
	return db.RecurrenceType(strings.ToLower(string(r)))
}

// validateStatusTransition checks whether a booking status transition is allowed.
func validateStatusTransition(current db.BookingStatus, target db.BookingStatus) error {
	// Cancellation is allowed from any non-terminal state.
	isCancelTarget := target == db.BookingStatusCancelledByClient ||
		target == db.BookingStatusCancelledByCompany ||
		target == db.BookingStatusCancelledByAdmin
	isCancelledCurrent := current == db.BookingStatusCancelledByClient ||
		current == db.BookingStatusCancelledByCompany ||
		current == db.BookingStatusCancelledByAdmin

	if isCancelledCurrent || current == db.BookingStatusCompleted {
		return fmt.Errorf("cannot change status of a %s booking", current)
	}
	if isCancelTarget {
		return nil // cancellation allowed from any active state
	}

	allowed := map[db.BookingStatus][]db.BookingStatus{
		db.BookingStatusAssigned:   {db.BookingStatusConfirmed},
		db.BookingStatusConfirmed:  {db.BookingStatusInProgress},
		db.BookingStatusInProgress: {db.BookingStatusCompleted},
	}

	for _, a := range allowed[current] {
		if a == target {
			return nil
		}
	}

	return fmt.Errorf("cannot transition booking from %s to %s", current, target)
}
