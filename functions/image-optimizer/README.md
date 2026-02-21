# Image Optimizer Cloud Function

Automated image optimization service for Go2Fix.ro profile images and company logos.

## Overview

This Cloud Function Gen 2 automatically optimizes images uploaded to GCS buckets:
- **Triggered by**: GCS object finalize events (file uploads)
- **Target files**: Images in `/avatars/` and `/logos/` directories
- **Processing**: Resize, compress, and convert to WebP format
- **Smart**: Skips already-optimized images (checks metadata flag)
- **Efficient**: Only processes relevant files, maintains aspect ratio

## Features

### Automatic Optimization

- **Avatars**: Resize to 400x400px, 85% quality, convert to WebP
- **Logos**: Resize to 800x600px, 90% quality, convert to WebP
- **Size reduction**: Typically 50-70% smaller file sizes
- **Aspect ratio**: Preserved during resize (no distortion)
- **Skip small images**: Images already smaller than target size are kept at original size

### Metadata Tracking

Each optimized image has metadata set:
- `optimized: "true"` - Flag to prevent re-optimization
- `original-size: "{bytes}"` - Original file size
- `optimized-size: "{bytes}"` - Optimized file size
- `optimization-pct: "{percent}%"` - Size reduction percentage

### Cache Headers

Optimized images have `Cache-Control: public, max-age=31536000` (1 year) for optimal CDN caching.

## Prerequisites

### System Requirements

The Cloud Function requires **libvips** for image processing. This is pre-installed in the Cloud Functions Gen 2 runtime.

For local testing, install libvips:

```bash
# macOS
brew install vips

# Ubuntu/Debian
sudo apt-get install libvips-dev

# Alpine
apk add vips-dev
```

### GCP Configuration

> **Note:** The GCP project ID (`helpmeclean-dev`) and bucket names (`helpmeclean-dev-uploads`) below are legacy infrastructure names. They will be migrated to `go2fix-*` when the GCP projects are reconfigured.

1. **Enable APIs**:
   ```bash
   gcloud services enable cloudfunctions.googleapis.com \
     cloudbuild.googleapis.com \
     eventarc.googleapis.com \
     --project=helpmeclean-dev
   ```

2. **Service Account Permissions**:
   The function needs `roles/storage.objectAdmin` on the GCS bucket:
   ```bash
   PROJECT_ID="helpmeclean-dev"
   BUCKET_NAME="helpmeclean-dev-uploads"
   SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

   gsutil iam ch serviceAccount:${SERVICE_ACCOUNT}:roles/storage.objectAdmin gs://${BUCKET_NAME}
   ```

3. **Eventarc Service Agent**:
   Grant permission for Eventarc to trigger functions:
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')

   gcloud projects add-iam-policy-binding ${PROJECT_ID} \
     --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountTokenCreator"
   ```

## Deployment

### Deploy to Development

```bash
cd functions/image-optimizer
./deploy.sh dev
```

### Deploy to Production

```bash
cd functions/image-optimizer
./deploy.sh prod
```

### Manual Deployment

```bash
gcloud functions deploy image-optimizer-dev \
  --gen2 \
  --runtime=go122 \
  --region=europe-central2 \
  --source=. \
  --entry-point=OptimizeImage \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=helpmeclean-dev-uploads" \
  --trigger-location=europe-central2 \
  --memory=512Mi \
  --timeout=60s \
  --max-instances=10 \
  --min-instances=0 \
  --project=helpmeclean-dev
```

## Testing

### Test Upload

Upload a test image to trigger optimization:

```bash
# Create a test image (requires ImageMagick)
convert -size 2000x2000 xc:blue test-avatar.jpg

# Upload to GCS
gsutil cp test-avatar.jpg gs://helpmeclean-dev-uploads/uploads/clients/test-user-123/avatars/

# Wait ~5-10 seconds for processing
sleep 10

# Check if optimized
gsutil stat gs://helpmeclean-dev-uploads/uploads/clients/test-user-123/avatars/test-avatar.jpg

# Should see metadata: optimized: "true"
```

### View Logs

```bash
# Real-time logs
gcloud functions logs read image-optimizer-dev \
  --region=europe-central2 \
  --project=helpmeclean-dev \
  --limit=50

# Follow logs
gcloud functions logs tail image-optimizer-dev \
  --region=europe-central2 \
  --project=helpmeclean-dev
```

### Test Optimization Results

```bash
# Download optimized image
gsutil cp gs://helpmeclean-dev-uploads/uploads/clients/test-user-123/avatars/test-avatar.jpg ./optimized.webp

# Check file size
ls -lh optimized.webp

# View metadata
gsutil stat gs://helpmeclean-dev-uploads/uploads/clients/test-user-123/avatars/test-avatar.jpg | grep optimized
```

## How It Works

### Event Flow

1. **Upload**: User uploads image via GraphQL mutation
2. **Store**: Backend saves original image to GCS with public ACL
3. **Trigger**: GCS finalize event triggers Cloud Function
4. **Filter**: Function checks if file is in `/avatars/` or `/logos/` path
5. **Check**: Function checks metadata for `optimized: "true"` flag
6. **Download**: If not optimized, download original image
7. **Process**: Resize, compress, convert to WebP
8. **Upload**: Overwrite original with optimized version
9. **Metadata**: Set `optimized: "true"` and size metrics
10. **Cache**: Set 1-year cache header for CDN

### Path Detection

- **Avatars**: Any path containing `/avatars/`
  - `uploads/clients/{userId}/avatars/{file}`
  - `uploads/cleaners/{cleanerId}/avatars/{file}`
  - Optimization: 400x400px, 85% quality

- **Logos**: Any path containing `/logos/`
  - `uploads/companies/{companyId}/logos/{file}`
  - Optimization: 800x600px, 90% quality

### Skip Conditions

The function skips processing if:
1. File path doesn't contain `/avatars/` or `/logos/`
2. File extension is not `.jpg`, `.jpeg`, `.png`, or `.webp`
3. Metadata contains `optimized: "true"` flag

## Architecture

```
User Upload → Backend → GCS Bucket → Cloud Function
                ↓                         ↓
            Public URL              Optimized Image
                ↓                         ↓
            User Profile ← ─ ─ ─ ─ ─ GCS Bucket
```

## Performance

- **Cold start**: ~2-3 seconds (Gen 2 runtime)
- **Warm execution**: <1 second
- **Processing time**: 2-5 seconds per image (depends on size)
- **Concurrency**: Up to 10 concurrent instances
- **Memory**: 512Mi per instance
- **Timeout**: 60 seconds

## Cost Estimates

**Development (low traffic)**:
- Function invocations: ~100/month = $0.00
- Compute time: ~500 GB-seconds/month = $0.01
- Networking: Negligible
- **Total**: ~$0.01/month

**Production (moderate traffic)**:
- Function invocations: ~10,000/month = $0.20
- Compute time: ~50,000 GB-seconds/month = $1.00
- Networking: ~10GB egress = $1.20
- **Total**: ~$2.40/month

## Monitoring

### Key Metrics

Monitor in Cloud Console > Cloud Functions > Metrics:
- **Invocations**: Should match upload rate
- **Execution time**: Should be 2-5 seconds avg
- **Memory utilization**: Should stay under 256Mi
- **Errors**: Should be <1%

### Alerts

Set up alerts for:
- Error rate > 5%
- Execution time > 30 seconds
- Memory usage > 400Mi

## Troubleshooting

### Function Not Triggering

1. Check Eventarc trigger exists:
   ```bash
   gcloud eventarc triggers list --location=europe-central2
   ```

2. Verify bucket name matches trigger:
   ```bash
   gcloud eventarc triggers describe image-optimizer-dev-trigger --location=europe-central2
   ```

3. Check service account permissions:
   ```bash
   gsutil iam get gs://helpmeclean-dev-uploads
   ```

### Optimization Errors

1. Check function logs:
   ```bash
   gcloud functions logs read image-optimizer-dev --limit=50
   ```

2. Common errors:
   - `permission denied`: Service account lacks storage.objectAdmin
   - `image decode failed`: Invalid image file or corrupted upload
   - `timeout exceeded`: Image too large (>10MB), increase timeout

### Image Quality Issues

If optimized images look poor:
1. Increase quality setting in `getOptimizationParams()` (85 → 90 for avatars)
2. Increase target dimensions (400x400 → 600x600 for avatars)
3. Consider using JPEG instead of WebP for certain images

## Future Enhancements

- [ ] Support additional image formats (AVIF, HEIC)
- [ ] Smart cropping for non-square images
- [ ] Background removal for profile photos
- [ ] Face detection and centering
- [ ] Image validation (detect inappropriate content)
- [ ] Thumbnail generation (multiple sizes)
- [ ] Watermark application for copyrighted images

## References

- [Cloud Functions Gen 2 Documentation](https://cloud.google.com/functions/docs/2nd-gen/overview)
- [Eventarc Triggers](https://cloud.google.com/eventarc/docs/overview)
- [libvips Image Processing](https://www.libvips.org/)
- [bimg Go Library](https://github.com/h2non/bimg)
