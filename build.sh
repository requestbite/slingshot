#!/bin/bash

# Get the latest git tag, fallback to "dev" if no tags exist
VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "dev")

echo "Building with version: $VERSION"

# Path to the TopBar component
TOPBAR_FILE="src/components/layout/TopBar.jsx"

# Create a backup of the original file
cp "$TOPBAR_FILE" "$TOPBAR_FILE.backup"

# Replace the version placeholder with the actual version (prefixed with "v. ")
sed -i "s/__v. 9.9.9__/v. $VERSION/g" "$TOPBAR_FILE"

# Run the build
yarn vite build

# Restore the original file to keep the placeholder for future builds
mv "$TOPBAR_FILE.backup" "$TOPBAR_FILE"

echo "Build completed with version: $VERSION"
