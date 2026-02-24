-- name: GetChatRoomByID :one
SELECT * FROM chat_rooms WHERE id = $1;

-- name: GetChatRoomByBookingID :one
SELECT * FROM chat_rooms WHERE booking_id = $1;

-- name: CreateChatRoom :one
INSERT INTO chat_rooms (booking_id, room_type) VALUES ($1, $2) RETURNING *;

-- name: ListChatRoomsByUser :many
SELECT cr.* FROM chat_rooms cr
JOIN chat_participants cp ON cr.id = cp.room_id
WHERE cp.user_id = $1
ORDER BY cr.created_at DESC;

-- name: AddChatParticipant :one
INSERT INTO chat_participants (room_id, user_id) VALUES ($1, $2) RETURNING *;

-- name: ListChatParticipants :many
SELECT * FROM chat_participants WHERE room_id = $1;

-- name: CreateChatMessage :one
INSERT INTO chat_messages (room_id, sender_id, content, message_type) VALUES ($1, $2, $3, $4) RETURNING *;

-- name: ListChatMessages :many
SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3;

-- name: MarkMessagesRead :exec
UPDATE chat_messages SET is_read = TRUE WHERE room_id = $1 AND sender_id != $2 AND is_read = FALSE;

-- name: ListAllChatRooms :many
SELECT * FROM chat_rooms ORDER BY created_at DESC;

-- name: CheckChatParticipant :one
SELECT COUNT(*) FROM chat_participants WHERE room_id = $1 AND user_id = $2;

-- name: GetLastChatMessage :one
SELECT * FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1;

-- name: FindDirectChatRoom :one
SELECT cr.* FROM chat_rooms cr
  JOIN chat_participants cp1 ON cp1.room_id = cr.id AND cp1.user_id = $1
  JOIN chat_participants cp2 ON cp2.room_id = cr.id AND cp2.user_id = $2
WHERE cr.room_type = 'admin_support'
LIMIT 1;

-- name: FindChatRoomByExactParticipants :one
SELECT cr.* FROM chat_rooms cr
  JOIN chat_participants cp ON cp.room_id = cr.id
WHERE cr.room_type = 'admin_support'
  AND cp.user_id = ANY(@participant_ids::uuid[])
GROUP BY cr.id, cr.booking_id, cr.room_type, cr.created_at
HAVING COUNT(DISTINCT cp.user_id) = @participant_count::bigint
  AND @participant_count::bigint = (SELECT COUNT(*) FROM chat_participants cp2 WHERE cp2.room_id = cr.id)
LIMIT 1;

-- name: ListChatRoomsByCompanyWorkers :many
SELECT DISTINCT cr.* FROM chat_rooms cr
  JOIN chat_participants cp ON cp.room_id = cr.id
  JOIN workers c ON c.user_id = cp.user_id AND c.company_id = $1
ORDER BY cr.created_at DESC;
