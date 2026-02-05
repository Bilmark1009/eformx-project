#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Check for APP_KEY
if [ -z "$APP_KEY" ]; then
    echo "❌ ERROR: APP_KEY is not set. Please add it to your environment variables."
    exit 1
fi

# Run migrations
echo "📦 Running migrations..."
php artisan migrate --force || { echo "❌ Migration failed!"; exit 1; }

# Check if seeding is requested
if [ "$RUN_SEEDS" = "true" ]; then
    echo "🌱 Seeding database..."
    php artisan db:seed --force
else
    echo "⏭️  Skipping seeding (RUN_SEEDS not set to true)"
fi

# Start Apache
echo "🔥 Starting Server..."
exec apache2-foreground
