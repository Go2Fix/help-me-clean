-- name: CreateWaitlistLead :one
INSERT INTO waitlist_leads (lead_type, name, email, phone, city, company_name, message)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListWaitlistLeads :many
SELECT wl.*, (u.id IS NOT NULL) AS is_converted
FROM waitlist_leads wl
LEFT JOIN users u ON lower(u.email) = lower(wl.email)
WHERE ($1::text = '' OR wl.lead_type::text = $1)
ORDER BY wl.created_at DESC
LIMIT $2 OFFSET $3;

-- name: CountWaitlistLeads :one
SELECT
    COUNT(*) FILTER (WHERE lead_type = 'client')  AS client_count,
    COUNT(*) FILTER (WHERE lead_type = 'company') AS company_count,
    COUNT(*) AS total_count
FROM waitlist_leads;
