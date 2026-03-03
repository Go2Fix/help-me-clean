-- name: CreatePhoneOTP :one
INSERT INTO phone_otp_codes (user_id, phone, code, expires_at)
VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')
RETURNING *;

-- name: CountActivePhoneOTPs :one
SELECT COUNT(*) FROM phone_otp_codes
WHERE user_id = $1
  AND expires_at > NOW()
  AND used_at IS NULL;

-- name: GetValidPhoneOTP :one
SELECT * FROM phone_otp_codes
WHERE user_id  = $1
  AND phone    = $2
  AND code     = $3
  AND expires_at > NOW()
  AND used_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- name: MarkPhoneOTPUsed :exec
UPDATE phone_otp_codes
SET used_at = NOW()
WHERE id = $1;

-- name: DeleteExpiredPhoneOTPs :exec
DELETE FROM phone_otp_codes
WHERE expires_at < NOW() - INTERVAL '1 hour';
