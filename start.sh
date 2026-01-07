#!/bin/bash

# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "============================================"
echo "TPN-MMU Emulator v1.0.0"
echo "============================================"
echo ""

# Check if .env exists, create from example if not
if [ ! -f ".env" ]; then
    echo "No configuration found. Creating from template..."
    cp .env.example .env
    echo "✅ Configuration created: .env"
    echo ""
fi

echo "Starting TPN-MMU emulator..."
echo "Config: $(pwd)/.env"
echo ""
node main.js
