#!/bin/bash
set -e

echo "Setting up EMDR42..."

# Install root deps
echo "Installing root dependencies..."
npm install

# Install service deps
echo "Installing service dependencies..."
cd services/api && npm install && npx prisma generate && cd ../..
cd services/orchestrator && npm install && cd ..

# Install package deps
echo "Installing package dependencies..."
cd packages/emdr-engine && npm install && cd ../..
cd packages/ai-providers && npm install && cd ../..

# Copy env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — please fill in your API keys"
fi

echo "Setup complete! Run 'docker-compose up -d' to start services"
