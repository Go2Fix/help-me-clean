package handler

import (
	"io"
	"mime"
	"net/http"
	"path/filepath"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	db "go2fix-backend/internal/db/generated"
	"go2fix-backend/internal/storage"
)

// NewDocumentHandler returns an HTTP handler that streams private documents from storage.
// Route: GET /api/documents/{id}
// Security: document UUIDs are cryptographically unguessable (UUID v4), no auth required.
func NewDocumentHandler(queries *db.Queries, store storage.Storage) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rawID := chi.URLParam(r, "id")
		docID, err := parseUUID(rawID)
		if err != nil {
			http.Error(w, "invalid document id", http.StatusBadRequest)
			return
		}

		var filePath, fileName string

		companyDoc, err := queries.GetCompanyDocument(r.Context(), docID)
		if err == nil {
			filePath = companyDoc.FileUrl
			fileName = companyDoc.FileName
		} else {
			workerDoc, err2 := queries.GetWorkerDocument(r.Context(), docID)
			if err2 != nil {
				http.Error(w, "document not found", http.StatusNotFound)
				return
			}
			filePath = workerDoc.FileUrl
			fileName = workerDoc.FileName
		}

		rc, err := store.GetReader(r.Context(), filePath)
		if err != nil {
			http.Error(w, "failed to read document", http.StatusInternalServerError)
			return
		}
		defer rc.Close()

		contentType := mime.TypeByExtension(filepath.Ext(fileName))
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Disposition", `inline; filename="`+fileName+`"`)
		w.Header().Set("Cache-Control", "private, max-age=3600")
		io.Copy(w, rc) //nolint:errcheck
	}
}

func parseUUID(s string) (pgtype.UUID, error) {
	b, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: b, Valid: true}, nil
}
