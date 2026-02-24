-- name: CreateWorkerDocument :one
INSERT INTO worker_documents (worker_id, document_type, file_url, file_name)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetWorkerDocument :one
SELECT * FROM worker_documents WHERE id = $1;

-- name: ListWorkerDocuments :many
SELECT * FROM worker_documents WHERE worker_id = $1 ORDER BY uploaded_at DESC;

-- name: DeleteWorkerDocument :exec
DELETE FROM worker_documents WHERE id = $1;

-- name: UpdateWorkerDocumentStatus :one
UPDATE worker_documents
SET status = $2,
    reviewed_by = $3,
    rejection_reason = $4,
    reviewed_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListPendingWorkerDocuments :many
SELECT * FROM worker_documents WHERE status = 'pending' ORDER BY uploaded_at ASC;
