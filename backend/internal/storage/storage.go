package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"google.golang.org/api/option"
)

// StorageType defines access control for uploaded files
type StorageType string

const (
	StorageTypePublic  StorageType = "public"  // Publicly readable (avatars, logos)
	StorageTypePrivate StorageType = "private" // Private with signed URLs (documents)
)

// Storage handles file uploads and retrieval from cloud storage or local filesystem
type Storage interface {
	// Upload saves a file and returns its public URL
	Upload(ctx context.Context, path string, filename string, reader io.Reader, storageType StorageType) (string, error)

	// Delete removes a file
	Delete(ctx context.Context, path string) error

	// GetSignedURL generates a temporary signed URL for private files (1-hour expiration)
	GetSignedURL(ctx context.Context, path string) (string, error)

	// GetPublicURL returns the public URL for a file (for public files only)
	GetPublicURL(path string) string

	// GetReader returns a streaming reader for a private file
	GetReader(ctx context.Context, path string) (io.ReadCloser, error)
}

// GCSStorage implements Storage interface using Google Cloud Storage
type GCSStorage struct {
	client     *storage.Client
	bucketName string
	projectID  string
}

// NewGCSStorage creates a GCS-backed storage client.
// credentials can be:
//   - empty string → use Application Default Credentials (Cloud Run / Workload Identity)
//   - a file path  → use service account key file (local development)
//   - a JSON blob  → use inline credentials JSON (Vercel, where no filesystem is available)
func NewGCSStorage(ctx context.Context, bucketName, projectID string, credentials string) (*GCSStorage, error) {
	var client *storage.Client
	var err error

	switch {
	case credentials == "":
		// Use Application Default Credentials (Cloud Run Workload Identity, etc.)
		client, err = storage.NewClient(ctx)
	case len(credentials) > 0 && credentials[0] == '{':
		// Inline JSON credentials — used on Vercel where there is no writable filesystem.
		// Set GOOGLE_APPLICATION_CREDENTIALS to the full JSON content of the service account key.
		client, err = storage.NewClient(ctx, option.WithCredentialsJSON([]byte(credentials)))
	default:
		// File path to a service account key (local development).
		client, err = storage.NewClient(ctx, option.WithCredentialsFile(credentials))
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create GCS client: %w", err)
	}

	return &GCSStorage{
		client:     client,
		bucketName: bucketName,
		projectID:  projectID,
	}, nil
}

// Upload saves a file to GCS with UUID prefix
func (s *GCSStorage) Upload(ctx context.Context, path string, filename string, reader io.Reader, storageType StorageType) (string, error) {
	// Generate UUID-prefixed filename to avoid collisions
	uuidFilename := uuid.New().String() + "_" + filename
	objectPath := path + "/" + uuidFilename

	bucket := s.client.Bucket(s.bucketName)
	obj := bucket.Object(objectPath)
	writer := obj.NewWriter(ctx)

	// Set metadata
	writer.Metadata = map[string]string{
		"original-filename": filename,
	}

	// Set cache headers for public files
	if storageType == StorageTypePublic {
		writer.CacheControl = "public, max-age=31536000" // 1 year
	}

	// Copy file data to GCS
	if _, err := io.Copy(writer, reader); err != nil {
		writer.Close()
		return "", fmt.Errorf("failed to write file to GCS: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("failed to close GCS writer: %w", err)
	}

	// Return public URL for public files, GCS path for private files
	if storageType == StorageTypePublic {
		return s.GetPublicURL(objectPath), nil
	}

	return objectPath, nil
}

// Delete removes a file from GCS
func (s *GCSStorage) Delete(ctx context.Context, path string) error {
	bucket := s.client.Bucket(s.bucketName)
	obj := bucket.Object(path)

	if err := obj.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete file from GCS: %w", err)
	}

	return nil
}

// GetSignedURL generates a temporary signed URL for private files (1-hour expiration)
func (s *GCSStorage) GetSignedURL(ctx context.Context, path string) (string, error) {
	opts := &storage.SignedURLOptions{
		Scheme:  storage.SigningSchemeV4,
		Method:  "GET",
		Expires: time.Now().Add(1 * time.Hour),
	}

	// Use the bucket handle's SignedURL so the client's own credentials are used
	// for signing (works with SA key JSON, ADC, and Workload Identity).
	url, err := s.client.Bucket(s.bucketName).SignedURL(path, opts)
	if err != nil {
		return "", fmt.Errorf("failed to generate signed URL: %w", err)
	}

	return url, nil
}

// GetPublicURL returns the public URL for a file in GCS
func (s *GCSStorage) GetPublicURL(path string) string {
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.bucketName, path)
}

// GetReader returns a streaming reader for a private GCS object
func (s *GCSStorage) GetReader(ctx context.Context, path string) (io.ReadCloser, error) {
	rc, err := s.client.Bucket(s.bucketName).Object(path).NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to open GCS object: %w", err)
	}
	return rc, nil
}

// LocalStorage implements Storage interface using local filesystem (for development)
type LocalStorage struct {
	basePath string
	baseURL  string
}

// NewLocalStorage creates a local filesystem storage rooted at basePath
func NewLocalStorage(basePath, baseURL string) *LocalStorage {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		log.Fatalf("Failed to create storage directory: %v", err)
	}
	return &LocalStorage{basePath: basePath, baseURL: baseURL}
}

// Upload saves a file to local storage with UUID prefix
func (s *LocalStorage) Upload(ctx context.Context, path string, filename string, reader io.Reader, storageType StorageType) (string, error) {
	dir := filepath.Join(s.basePath, path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create subdirectory: %w", err)
	}

	uuidFilename := uuid.New().String() + "_" + filename
	filePath := filepath.Join(dir, uuidFilename)

	file, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer file.Close()

	if _, err := io.Copy(file, reader); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	url := s.baseURL + "/" + path + "/" + uuidFilename
	return url, nil
}

// Delete removes a file from local storage
func (s *LocalStorage) Delete(ctx context.Context, path string) error {
	fullPath := filepath.Join(s.basePath, path)

	if err := os.Remove(fullPath); err != nil {
		return fmt.Errorf("failed to delete file: %w", err)
	}

	return nil
}

// GetSignedURL returns the same URL (no signing for local storage)
func (s *LocalStorage) GetSignedURL(ctx context.Context, path string) (string, error) {
	return s.baseURL + "/" + path, nil
}

// GetPublicURL returns the public URL for a local file
func (s *LocalStorage) GetPublicURL(path string) string {
	return s.baseURL + "/" + path
}

// GetReader returns a streaming reader for a local file
func (s *LocalStorage) GetReader(ctx context.Context, path string) (io.ReadCloser, error) {
	return os.Open(filepath.Join(s.basePath, path))
}
