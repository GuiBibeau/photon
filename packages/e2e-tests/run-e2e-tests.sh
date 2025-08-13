#!/bin/bash

# E2E Test Runner for Photon SDK
# This script runs the Playwright e2e tests with proper environment setup

echo "🚀 Starting Photon SDK E2E Tests"
echo "================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your VITE_PRIVATE_KEY"
    echo "Example: VITE_PRIVATE_KEY=your-base58-private-key"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if VITE_PRIVATE_KEY is set
if [ -z "$VITE_PRIVATE_KEY" ]; then
    echo "❌ Error: VITE_PRIVATE_KEY not set in .env file!"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "📦 Installing dependencies..."
pnpm install

echo "🔨 Building the app..."
pnpm build

echo "🎭 Running Playwright tests..."
echo ""

# Run specific test suites
if [ "$1" = "wallet" ]; then
    echo "Running wallet flow tests only..."
    pnpm playwright test wallet-flow.spec.ts
elif [ "$1" = "token" ]; then
    echo "Running token flow tests only..."
    pnpm playwright test token-flow.spec.ts
else
    echo "Running all e2e tests..."
    pnpm playwright test
fi

# Show the report if tests complete
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Tests completed successfully!"
    echo "📊 Opening test report..."
    pnpm playwright show-report
else
    echo ""
    echo "❌ Some tests failed. Check the report for details."
    pnpm playwright show-report
fi