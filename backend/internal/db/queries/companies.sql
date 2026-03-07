-- name: GetCompanyByID :one
SELECT * FROM companies WHERE id = $1;

-- name: GetCompanyByAdminUserID :one
SELECT * FROM companies WHERE admin_user_id = $1;

-- name: GetCompanyByCUI :one
SELECT * FROM companies WHERE cui = $1;

-- name: CreateCompany :one
INSERT INTO companies (
    admin_user_id, company_name, cui, company_type, legal_representative,
    contact_email, contact_phone, address, city, county, description, claim_token,
    reg_number, is_vat_payer, bank_name, iban
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
RETURNING *;

-- name: UpdateCompanyStatus :one
UPDATE companies SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: ApproveCompany :one
UPDATE companies SET status = 'approved', approved_at = NOW(), updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: RejectCompany :one
UPDATE companies SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ListCompaniesByStatus :many
SELECT * FROM companies WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListAllCompanies :many
SELECT * FROM companies ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CountCompaniesByStatus :one
SELECT COUNT(*) FROM companies WHERE status = $1;

-- name: GetUnclaimedCompanyByContactEmail :one
SELECT * FROM companies
WHERE contact_email = $1 AND admin_user_id IS NULL
LIMIT 1;

-- name: SetCompanyAdminUser :one
UPDATE companies SET admin_user_id = $1, updated_at = NOW()
WHERE id = $2
RETURNING *;

-- name: GetCompanyByClaimToken :one
SELECT * FROM companies
WHERE claim_token = $1 AND admin_user_id IS NULL;

-- name: ClaimCompanyByToken :one
UPDATE companies
SET admin_user_id = $1, claim_token = NULL, updated_at = NOW()
WHERE claim_token = $2 AND admin_user_id IS NULL
RETURNING *;

-- name: AdminUpdateCompanyProfile :one
UPDATE companies SET company_name = $2, cui = $3, address = $4, contact_phone = $5, contact_email = $6, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: SearchCompanies :many
SELECT * FROM companies WHERE
    (company_name ILIKE '%' || @query::text || '%' OR cui ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text)
ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CountSearchCompanies :one
SELECT COUNT(*) FROM companies WHERE
    (company_name ILIKE '%' || @query::text || '%' OR cui ILIKE '%' || @query::text || '%')
    AND (@status_filter::text = '' OR status::text = @status_filter::text);

-- name: UpdateCompanyOwnProfile :one
UPDATE companies SET
    description = COALESCE(NULLIF(@description::text, ''), description),
    contact_phone = COALESCE(NULLIF(@contact_phone::text, ''), contact_phone),
    contact_email = COALESCE(NULLIF(@contact_email::text, ''), contact_email),
    reg_number = COALESCE(NULLIF(@reg_number::text, ''), reg_number),
    is_vat_payer = @is_vat_payer::boolean,
    bank_name = COALESCE(NULLIF(@bank_name::text, ''), bank_name),
    iban = COALESCE(NULLIF(@iban::text, ''), iban),
    updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: GetCompanyFinancialSummary :one
SELECT
    COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed_bookings,
    COALESCE(SUM(COALESCE(final_total, estimated_total)) FILTER (WHERE status = 'completed'), 0)::numeric AS total_revenue,
    COALESCE(SUM(platform_commission_amount) FILTER (WHERE status = 'completed'), 0)::numeric AS total_commission,
    COALESCE(SUM(COALESCE(final_total, estimated_total) - COALESCE(platform_commission_amount, 0)) FILTER (WHERE status = 'completed'), 0)::numeric AS net_payout
FROM bookings WHERE company_id = $1;

-- name: UpdateCompanyLogo :one
UPDATE companies SET logo_url = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: GetCompanyAverageRating :one
SELECT COALESCE(AVG(r.rating), 0)::DECIMAL(3,2) AS avg_rating
FROM reviews r
JOIN workers w ON r.reviewed_worker_id = w.id
WHERE w.company_id = $1;

-- name: CountCompletedJobsByCompany :one
SELECT COUNT(*) FROM bookings WHERE company_id = $1 AND status = 'completed';

-- name: SetCompanyCommissionOverride :one
UPDATE companies SET commission_override_pct = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: ClearCompanyCommissionOverride :one
UPDATE companies SET commission_override_pct = NULL, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: CheckCompanyDocumentsReady :one
-- Returns true if all 3 required documents exist and are approved
SELECT
  COUNT(CASE WHEN document_type = 'certificat_constatator' AND status = 'approved' THEN 1 END) = 1 AND
  COUNT(CASE WHEN document_type = 'asigurare_raspundere_civila' AND status = 'approved' THEN 1 END) = 1 AND
  COUNT(CASE WHEN document_type = 'cui_document' AND status = 'approved' THEN 1 END) = 1 AS all_ready
FROM company_documents
WHERE company_id = $1;

-- name: SaveANAFVerification :one
UPDATE companies SET
    anaf_status          = $2,
    anaf_denumire        = $3,
    anaf_adresa          = $4,
    anaf_data_infiintare = $5,
    anaf_scp_tva         = $6,
    anaf_inactive        = $7,
    anaf_verified_at     = NOW(),
    anaf_raw_error       = NULL,
    updated_at           = NOW()
WHERE id = $1
RETURNING *;

-- name: SaveANAFError :one
UPDATE companies SET
    anaf_status      = 'error',
    anaf_raw_error   = $2,
    anaf_verified_at = NOW(),
    updated_at       = NOW()
WHERE id = $1
RETURNING *;

-- name: GetCompaniesByIDs :many
SELECT * FROM companies WHERE id = ANY($1::uuid[]) ORDER BY company_name;

-- name: GetCompanyRatingsBatch :many
SELECT w.company_id, COALESCE(AVG(r.rating), 0)::DECIMAL(3,2) AS avg_rating
FROM reviews r
JOIN workers w ON r.reviewed_worker_id = w.id
WHERE w.company_id = ANY($1::uuid[])
GROUP BY w.company_id;

-- name: GetCompanyJobCountsBatch :many
SELECT company_id, COUNT(*)::bigint AS job_count
FROM bookings
WHERE company_id = ANY($1::uuid[]) AND status = 'completed'
GROUP BY company_id;
