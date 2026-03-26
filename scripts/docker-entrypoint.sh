#!/bin/sh

# Wait for database to be ready
echo "Waiting for database (quitpetas_db:5432) to be ready..."
until npx prisma db push --accept-data-loss; do
  echo "Prisma db push failed. Database might not be ready. Retrying in 5 seconds..."
  sleep 5
done

# Start the application
echo "Database ready. Starting application..."
exec "$@"
