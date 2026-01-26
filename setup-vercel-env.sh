#!/bin/bash
# Setup Vercel Environment Variables

# Set VITE_API_URL for production and preview
# This uses the backend API deployed on Vercel

vercel env add VITE_API_URL <<< "https://eco-system-api.vercel.app/api/v1
Production
Preview
n
"

echo "✅ VITE_API_URL set to: https://eco-system-api.vercel.app/api/v1"
echo "📝 Visit https://vercel.com/ayesh156s-projects/eco-system/settings/environment-variables"
echo "   to verify the environment variable is set correctly"
