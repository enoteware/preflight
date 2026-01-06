#!/bin/bash
# Quick installer for Preflight Toolkit
# Usage: curl -fsSL https://raw.githubusercontent.com/enoteware/preflight/main/install.sh | bash

set -e

REPO="enoteware/preflight"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/${REPO}/${BRANCH}"

echo "🚀 Installing Preflight Toolkit..."
echo "   Repo: ${REPO}"
echo ""

# Download and run setup script
echo "📥 Fetching setup script..."
curl -fsSL "${BASE_URL}/src/setup.ts" -o /tmp/preflight-setup.ts

# Run setup
echo "⚙️  Running setup..."
npx tsx /tmp/preflight-setup.ts "$@"

echo ""
echo "✅ Installation complete!"
