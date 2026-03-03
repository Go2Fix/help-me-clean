-- name: CreateDispute :one
INSERT INTO booking_disputes (booking_id, opened_by, reason, description, evidence_urls)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetDisputeByID :one
SELECT * FROM booking_disputes WHERE id = $1;

-- name: GetDisputeByBookingID :one
SELECT * FROM booking_disputes WHERE booking_id = $1;

-- name: ListDisputesByStatus :many
SELECT * FROM booking_disputes
WHERE status = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAllDisputes :many
SELECT * FROM booking_disputes
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: CountAllDisputes :one
SELECT COUNT(*) FROM booking_disputes;

-- name: CountDisputesByStatus :one
SELECT COUNT(*) FROM booking_disputes WHERE status = $1;

-- name: UpdateDisputeCompanyResponse :one
UPDATE booking_disputes
SET company_response     = $2,
    company_responded_at = NOW(),
    status               = 'company_responded',
    updated_at           = NOW()
WHERE id = $1
RETURNING *;

-- name: ResolveDispute :one
UPDATE booking_disputes
SET status           = $2,
    resolution_notes = $3,
    resolved_by      = $4,
    refund_amount    = $5,
    updated_at       = NOW()
WHERE id = $1
RETURNING *;

-- name: AddDisputeEvidenceURLs :one
UPDATE booking_disputes
SET evidence_urls = evidence_urls || $2,
    updated_at    = NOW()
WHERE id = $1
RETURNING *;

-- name: AutoCloseExpiredDisputes :many
UPDATE booking_disputes
SET status     = 'auto_closed',
    updated_at = NOW()
WHERE status IN ('open', 'company_responded')
  AND auto_close_at < NOW()
RETURNING *;
