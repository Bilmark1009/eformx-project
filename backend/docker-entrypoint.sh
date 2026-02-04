#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Run migrations
echo "📦 Running migrations..."
php artisan migrate --force

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
