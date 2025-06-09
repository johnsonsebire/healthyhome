#!/bin/bash

# Script to check EAS build status and notify when complete

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking EAS build status...${NC}"

# Get the most recent build ID
BUILD_ID=$(eas build:list --json | jq -r '.[0].id')

if [ -z "$BUILD_ID" ]; then
  echo "No builds found"
  exit 1
fi

echo "Monitoring build ID: $BUILD_ID"

# Loop until build is complete
while true; do
  BUILD_STATUS=$(eas build:view $BUILD_ID --json | jq -r '.status')
  
  echo "Current status: $BUILD_STATUS"
  
  if [ "$BUILD_STATUS" == "finished" ]; then
    # Get the artifact URL
    ARTIFACT_URL=$(eas build:view $BUILD_ID --json | jq -r '.artifacts.buildUrl')
    
    echo -e "${GREEN}Build complete!${NC}"
    echo -e "${GREEN}Download URL: $ARTIFACT_URL${NC}"
    
    # Play a sound notification
    paplay /usr/share/sounds/freedesktop/stereo/complete.oga || echo "Sound notification failed"
    
    # Send desktop notification
    notify-send "EAS Build Complete" "Your Healthy Home APK build is ready for download!" || echo "Desktop notification failed"
    
    break
  elif [ "$BUILD_STATUS" == "errored" ]; then
    echo "Build failed. Check the logs for details."
    break
  fi
  
  # Wait 30 seconds before checking again
  echo "Waiting 30 seconds before checking again..."
  sleep 30
done
