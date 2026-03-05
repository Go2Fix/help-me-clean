package imageoptimizer

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"path/filepath"
	"strings"

	"cloud.google.com/go/storage"
	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/cloudevents/sdk-go/v2/event"
	"github.com/disintegration/imaging"
)

// StorageObjectData represents the data structure for GCS finalize events
type StorageObjectData struct {
	Bucket         string                 `json:"bucket"`
	Name           string                 `json:"name"`
	Metageneration int64                  `json:"metageneration"`
	TimeCreated    string                 `json:"timeCreated"`
	Updated        string                 `json:"updated"`
	Metadata       map[string]interface{} `json:"metadata"`
}

func init() {
	functions.CloudEvent("OptimizeImage", optimizeImage)
}

// optimizeImage is triggered on GCS object finalize events
func optimizeImage(ctx context.Context, e event.Event) error {
	var data StorageObjectData
	if err := e.DataAs(&data); err != nil {
		return fmt.Errorf("event.DataAs: %w", err)
	}

	log.Printf("Processing file: gs://%s/%s", data.Bucket, data.Name)

	// Check if file is in a path we optimize
	if !shouldOptimize(data.Name) {
		log.Printf("Skipping non-image or non-targeted file: %s", data.Name)
		return nil
	}

	// Check if already optimized (avoid infinite loop on re-upload)
	if isAlreadyOptimized(data.Metadata) {
		log.Printf("File already optimized, skipping: %s", data.Name)
		return nil
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return fmt.Errorf("storage.NewClient: %w", err)
	}
	defer client.Close()

	bucket := client.Bucket(data.Bucket)
	obj := bucket.Object(data.Name)

	// Download original image
	reader, err := obj.NewReader(ctx)
	if err != nil {
		return fmt.Errorf("obj.NewReader: %w", err)
	}
	defer reader.Close()

	imageData, err := io.ReadAll(reader)
	if err != nil {
		return fmt.Errorf("io.ReadAll: %w", err)
	}

	// Resize and compress
	maxWidth, maxHeight, quality := getOptimizationParams(data.Name)
	optimized, err := processImage(imageData, maxWidth, maxHeight, quality)
	if err != nil {
		return fmt.Errorf("processImage: %w", err)
	}

	// Overwrite original object with optimized JPEG
	writer := obj.NewWriter(ctx)
	writer.ContentType = "image/jpeg"
	writer.CacheControl = "public, max-age=31536000" // 1 year
	writer.Metadata = map[string]string{
		"optimized":        "true",
		"original-size":    fmt.Sprintf("%d", len(imageData)),
		"optimized-size":   fmt.Sprintf("%d", len(optimized)),
		"optimization-pct": fmt.Sprintf("%.1f%%", float64(len(imageData)-len(optimized))/float64(len(imageData))*100),
	}

	if _, err := writer.Write(optimized); err != nil {
		writer.Close()
		return fmt.Errorf("writer.Write: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("writer.Close: %w", err)
	}

	log.Printf("Optimized %s: %d bytes → %d bytes (%.1f%% reduction)",
		data.Name, len(imageData), len(optimized),
		float64(len(imageData)-len(optimized))/float64(len(imageData))*100,
	)

	return nil
}

// shouldOptimize checks if the file should be optimized
func shouldOptimize(path string) bool {
	imageDir := strings.Contains(path, "/avatars/") ||
		strings.Contains(path, "/logos/") ||
		strings.Contains(path, "/job-photos/") ||
		strings.Contains(path, "/photos/")
	if !imageDir {
		return false
	}

	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp"
}

// isAlreadyOptimized checks metadata to avoid re-processing
func isAlreadyOptimized(metadata map[string]interface{}) bool {
	if metadata == nil {
		return false
	}
	v, ok := metadata["optimized"]
	if !ok {
		return false
	}
	return v == "true" || v == true
}

// getOptimizationParams returns max dimensions and JPEG quality for the given path
func getOptimizationParams(path string) (maxWidth, maxHeight, quality int) {
	switch {
	case strings.Contains(path, "/avatars/"):
		return 400, 400, 85
	case strings.Contains(path, "/logos/"):
		return 800, 600, 90
	case strings.Contains(path, "/job-photos/"):
		// Keep higher resolution for before/after evidence photos
		return 1200, 900, 85
	case strings.Contains(path, "/photos/"):
		// Review photos
		return 1000, 750, 82
	default:
		return 800, 600, 85
	}
}

// processImage resizes the image to fit within maxWidth×maxHeight (preserving aspect ratio)
// and encodes it as JPEG at the given quality. Uses Lanczos resampling.
func processImage(data []byte, maxWidth, maxHeight, quality int) ([]byte, error) {
	src, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("imaging.Decode: %w", err)
	}

	// Fit within bounds without cropping
	resized := imaging.Fit(src, maxWidth, maxHeight, imaging.Lanczos)

	var buf bytes.Buffer
	if err := imaging.Encode(&buf, resized, imaging.JPEG, imaging.JPEGQuality(quality)); err != nil {
		return nil, fmt.Errorf("imaging.Encode: %w", err)
	}

	return buf.Bytes(), nil
}
