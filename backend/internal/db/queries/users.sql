-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGoogleID :one
SELECT * FROM users WHERE google_id = $1;

-- name: CreateUser :one
INSERT INTO users (email, full_name, phone, avatar_url, role, status, google_id, preferred_language)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET full_name = $2, phone = $3, phone_verified = CASE WHEN phone IS DISTINCT FROM $3 THEN false ELSE phone_verified END, avatar_url = $4, preferred_language = $5, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: UpdateUserFCMToken :exec
UPDATE users SET fcm_token = $2, updated_at = NOW() WHERE id = $1;

-- name: UpdateUserStatus :one
UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: ListUsersByRole :many
SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC;

-- name: CountUsersByRole :one
SELECT COUNT(*) FROM users WHERE role = $1;

-- name: ListAllUsers :many
SELECT * FROM users ORDER BY full_name ASC;

-- name: SearchUsersByName :many
SELECT * FROM users WHERE full_name ILIKE '%' || $1 || '%' ORDER BY full_name ASC LIMIT 20;

-- name: SearchUsers :many
SELECT * FROM users WHERE
    (full_name ILIKE '%' || @query::text || '%' OR email ILIKE '%' || @query::text || '%' OR COALESCE(phone, '') ILIKE '%' || @query::text || '%')
    AND (@role_filter::text = '' OR role::text = @role_filter::text)
    AND (@status_filter::text = '' OR status::text = @status_filter::text)
ORDER BY created_at DESC LIMIT $1 OFFSET $2;

-- name: CountSearchUsers :one
SELECT COUNT(*) FROM users WHERE
    (full_name ILIKE '%' || @query::text || '%' OR email ILIKE '%' || @query::text || '%' OR COALESCE(phone, '') ILIKE '%' || @query::text || '%')
    AND (@role_filter::text = '' OR role::text = @role_filter::text)
    AND (@status_filter::text = '' OR status::text = @status_filter::text);

-- name: UpdateUserRole :one
UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: AdminUpdateUserProfile :one
UPDATE users SET full_name = $2, phone = $3, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: UpdateUserAvatar :one
UPDATE users SET avatar_url = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: UpdateUserPhone :one
UPDATE users SET phone = $2, updated_at = NOW() WHERE id = $1 RETURNING *;

-- name: SetUserPhoneVerified :one
UPDATE users SET phone = $2, phone_verified = $3, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: DeactivateUser :exec
UPDATE users SET status = 'inactive', phone = NULL, avatar_url = NULL, fcm_token = NULL, updated_at = NOW() WHERE id = $1;

-- name: SetUserReferralCodeUsed :one
UPDATE users SET referral_code_used = $2, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: ListGlobalAdmins :many
SELECT * FROM users WHERE role = 'global_admin' AND status = 'active';

-- name: GetUsersByIDs :many
SELECT * FROM users WHERE id = ANY($1::uuid[]) ORDER BY full_name;
