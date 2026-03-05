#!/bin/bash

# Deploy Cloud Function for image optimization
# Usage: ./deploy.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}
REGION="europe-central2"

if [ "$ENVIRONMENT" = "prod" ]; then
  PROJECT_ID="go2fix"
  BUCKET_NAME="go2fix-prod-uploads"
  FUNCTION_NAME="image-optimizer-prod"
  MEMORY="512Mi"
  TIMEOUT="60s"
elif [ "$ENVIRONMENT" = "dev" ]; then
  PROJECT_ID="go2fix"
  BUCKET_NAME="go2fix-dev-uploads"
  FUNCTION_NAME="image-optimizer-dev"
  MEMORY="512Mi"
  TIMEOUT="60s"
else
  echo "Error: Environment must be 'dev' or 'prod'"
  exit 1
fi

echo "Deploying image optimizer Cloud Function to ${ENVIRONMENT} environment..."
echo "Project: ${PROJECT_ID}"
echo "Bucket: ${BUCKET_NAME}"
echo "Function: ${FUNCTION_NAME}"
echo ""

# Deploy Cloud Function Gen 2
gcloud functions deploy ${FUNCTION_NAME} \
  --gen2 \
  --runtime=go124 \
  --region=${REGION} \
  --source=. \
  --entry-point=OptimizeImage \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=${BUCKET_NAME}" \
  --trigger-location=${REGION} \
  --memory=${MEMORY} \
  --timeout=${TIMEOUT} \
  --max-instances=10 \
  --min-instances=0 \
  --project=${PROJECT_ID} \
  --service-account="${PROJECT_ID}@appspot.gserviceaccount.com" \
  --no-allow-unauthenticated

echo ""
echo "Deployment complete!"
echo ""
echo "To view logs:"
echo "  gcloud functions logs read ${FUNCTION_NAME} --region=${REGION} --project=${PROJECT_ID}"
echo ""
echo "To test:"
echo "  Upload an image to gs://${BUCKET_NAME}/uploads/clients/{userId}/avatars/"
echo "  Check function logs for optimization results"
