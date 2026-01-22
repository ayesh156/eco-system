# 🌿 EcoSystem - Business Management System

A modern, full-stack business management system built with **React + Vite**, **Express.js**, **Prisma**, and **Supabase**. This project follows world-class practices for deploying to **Vercel** with a PostgreSQL database on **Supabase**.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Express.js](https://img.shields.io/badge/Express.js-4.18-green?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.9-2D3748?logo=prisma)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)

## 📁 Project Structure

```
eco-system/
├── 📁 backend/                    # Express.js API Server
│   ├── 📁 prisma/
│   │   ├── schema.prisma         # Database schema
│   │   └── seed.ts               # Database seeding (matches mockData)
│   ├── 📁 src/
│   │   ├── 📁 controllers/       # Route handlers
│   │   ├── 📁 middleware/        # Express middleware
│   │   ├── 📁 routes/            # API routes
│   │   ├── 📁 validators/        # Input validation
│   │   ├── 📁 lib/               # Utilities (Prisma client)
│   │   └── index.ts              # Server entry point
│   ├── .env.example              # Environment template
│   ├── package.json
│   └── tsconfig.json
│
├── 📁 frontend/                   # React + Vite Application
│   ├── 📁 src/
│   │   ├── 📁 components/        # React components
│   │   │   ├── 📁 ui/            # shadcn/ui components
│   │   │   └── 📁 modals/        # Modal components
│   │   ├── 📁 pages/             # Page components
│   │   ├── 📁 hooks/             # Custom React hooks
│   │   ├── 📁 lib/               # Utilities
│   │   ├── 📁 contexts/          # React contexts
│   │   ├── 📁 services/          # API services
│   │   ├── 📁 data/              # Mock data (fallback)
│   │   ├── App.tsx               # Main app component
│   │   └── main.tsx              # Entry point
│   ├── .env.example              # Environment template
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── .gitignore
├── package.json                   # Root package.json
├── vercel.json                    # Vercel configuration
└── README.md
```

## ✨ Features

### Current Features
- ✅ **Invoice Management** - Full CRUD with modern UI
- ✅ **Payment Tracking** - Record and track payments
- ✅ **Customer Management** - Customer database
- ✅ **Product Management** - Inventory tracking
- ✅ **Toast Notifications** - Modern feedback system
- ✅ **Dark Mode** - Theme switching support
- ✅ **Responsive Design** - Mobile-friendly interface

### Authentication Ready
- 🔐 JWT-based authentication structure
- 🔐 Protected route middleware
- 🔐 Role-based authorization (ADMIN, MANAGER, STAFF)

### Coming Soon
- 📊 Dashboard with analytics
- 📈 Reports and charts
- 📧 Email notifications
- 📱 WhatsApp integration

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase** account (free tier available)
- **Vercel** account (for deployment)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/eco-system-frontend.git
cd eco-system-frontend
```

### 2️⃣ Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend and backend dependencies
npm run install:all

# Or manually:
cd frontend && npm install
cd ../backend && npm install
```

### 3️⃣ Set Up Supabase Database

Follow the [Supabase Setup Guide](#-supabase-database-setup) below.

### 4️⃣ Configure Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase credentials

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local if needed
```

### 5️⃣ Set Up the Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or create migration (production)
npm run db:migrate

# Seed sample data
cd backend && npm run prisma:seed
```

### 6️⃣ Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:5000
```

---

## 🗄️ Supabase Database Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Choose your organization
4. Enter project details:
   - **Name**: `ecosystem` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"** and wait for setup (~2 minutes)

### Step 2: Get Database Connection String

1. In your Supabase project, go to **Project Settings** (gear icon)
2. Click **Database** in the sidebar
3. Scroll to **Connection String** section
4. Select **URI** tab
5. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your database password

### Step 3: Configure Backend Environment

Create `backend/.env` file:

```env
# Environment
NODE_ENV=development
PORT=5000

# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_EXPIRES_IN="7d"

# Frontend URL for CORS
FRONTEND_URL="http://localhost:3000"
```

### Step 4: Enable Pooler (Recommended for Production)

For serverless deployments (like Vercel), enable Supavisor:

1. Go to **Project Settings** → **Database**
2. Enable **Connection Pooler**
3. Copy the **Pooler connection string** for `DATABASE_URL`
4. Keep direct connection for `DIRECT_URL` (for migrations)

---

## 🌐 Deploying to Vercel

### Option A: Deploy Frontend + Backend Together (Recommended)

This approach uses Vercel for the frontend and a separate service for the backend.

#### Deploy Backend (Options)

1. **Railway.app** (Recommended)
   - Connect your GitHub repo
   - Select the `backend` folder
   - Add environment variables
   - Deploy automatically

2. **Render.com**
   - Create a new Web Service
   - Connect GitHub repo
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

3. **Fly.io**
   ```bash
   cd backend
   fly launch
   fly secrets set DATABASE_URL="your-supabase-url"
   fly deploy
   ```

#### Deploy Frontend to Vercel

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click **"New Project"**
   - Import your GitHub repository

2. **Configure Project**
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. **Add Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```

4. **Deploy**
   - Click **Deploy**
   - Wait for build to complete

### Option B: Serverless Backend on Vercel

Convert Express to Vercel Serverless Functions (advanced):

```javascript
// backend/api/index.ts
import app from '../src/index';

export default app;
```

Add `vercel.json` to backend:
```json
{
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "api/index.ts" }]
}
```

---

## 🚀 Complete Deployment Guide: Vercel + Supabase (Step-by-Step)

This comprehensive guide covers deploying the full-stack application with:
- **Frontend**: Vercel (React + Vite)
- **Backend**: Railway or Render
- **Database**: Supabase PostgreSQL

### 📋 Prerequisites

1. ✅ GitHub account with your code pushed
2. ✅ [Supabase](https://supabase.com) account (free tier available)
3. ✅ [Vercel](https://vercel.com) account (free tier available)
4. ✅ [Railway](https://railway.app) or [Render](https://render.com) account (for backend)

---

## 📌 Step 1: Create Supabase Database

### 1.1 Create Account & Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"** (green button)
3. Choose your organization (or create one)
4. Fill in project details:

| Field | Value |
|-------|-------|
| **Project Name** | `ecosystem-db` |
| **Database Password** | Create strong password ⚠️ **SAVE THIS!** |
| **Region** | `Singapore (Southeast Asia)` - best for Sri Lanka |
| **Plan** | Free tier is fine |

5. Click **"Create new project"** and wait (~2 minutes)

### 1.2 Get Connection Strings
1. In Supabase dashboard, click **⚙️ Project Settings** (bottom left gear icon)
2. Click **"Database"** in the sidebar
3. Scroll down to **"Connection String"** section
4. You'll see 2 types of connections:

#### Transaction Pooler (Port 6543) - Use for `DATABASE_URL`:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### Session/Direct Pooler (Port 5432) - Use for `DIRECT_URL`:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

> ⚠️ Replace `[PASSWORD]` with your actual database password!

---

## 📌 Step 2: Push Database Schema & Seed Data

Before deploying, set up your database locally:

```bash
# Navigate to backend folder
cd backend

# Create .env file with your Supabase credentials
# Copy .env.example to .env and fill in:
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Generate Prisma Client
npx prisma generate

# Push schema to Supabase database
npx prisma db push

# Seed the database with sample data
npx tsx prisma/seed.ts

# Verify data (opens Prisma Studio)
npx prisma studio
```

---

## 📌 Step 3: Deploy Backend to Railway

### 3.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with **GitHub** (recommended for easy deployment)

### 3.2 Create New Project
1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select your repository: `eco-system` or your repo name
3. Railway will detect it's a Node.js project

### 3.3 Configure Project Settings
1. Click on your service card
2. Go to **"Settings"** tab
3. Set these values:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |

### 3.4 Add Environment Variables ⚠️ CRITICAL

Click **"Variables"** tab and add each variable:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3001` | Server port (Railway uses this) |
| `DATABASE_URL` | `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase Transaction Pooler URL |
| `DIRECT_URL` | `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` | Supabase Direct URL (for Prisma) |
| `JWT_SECRET` | `your-super-secret-jwt-key-minimum-32-characters-long` | Generate with `openssl rand -base64 64` |
| `JWT_EXPIRES_IN` | `7d` | Token expiry time |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Update after Vercel deploy |

### 3.5 Deploy & Get URL
1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Once deployed, go to **"Settings"** → **"Networking"** → **"Generate Domain"**
4. Copy your Railway URL: `https://your-app-production.up.railway.app`

---

## 📌 Step 4: Deploy Frontend to Vercel

### 4.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with **GitHub** (recommended)

### 4.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Find and select your repository

### 4.3 Configure Project Settings

| Setting | Value |
|---------|-------|
| **Framework Preset** | `Vite` |
| **Root Directory** | Click **"Edit"** → Select `frontend` |
| **Build Command** | `npm run build` (default) |
| **Output Directory** | `dist` (default for Vite) |
| **Install Command** | `npm install` (default) |

### 4.4 Add Environment Variables ⚠️ CRITICAL

Click **"Environment Variables"** section and add:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_API_URL` | `https://your-app-production.up.railway.app/api/v1` | Your Railway backend URL + `/api/v1` |
| `VITE_GEMINI_API_KEY` | `your-gemini-api-key` | (Optional) For AI features |

> ⚠️ **IMPORTANT**: Replace the Railway URL with your actual deployed backend URL from Step 3.5!

### 4.5 Deploy
1. Click **"Deploy"**
2. Wait for build to complete (1-3 minutes)
3. Copy your Vercel URL: `https://your-app.vercel.app`

---

## 📌 Step 5: Update Backend CORS

After getting your Vercel frontend URL, update Railway:

1. Go back to Railway dashboard
2. Click your backend service
3. Go to **"Variables"** tab
4. Update `FRONTEND_URL` with your Vercel URL:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
5. Railway will auto-redeploy

---

## 📌 Step 6: Verify Deployment

### Test Backend API:
```bash
curl https://your-app-production.up.railway.app/api/v1/invoices
```

### Test Frontend:
1. Open your Vercel URL in browser
2. Navigate to Invoices page
3. Verify data loads from database

---

## 🔧 Quick Reference: Environment Variables

### Backend (.env) - Railway Environment Variables:
```env
# Application
NODE_ENV=production
PORT=3001

# Database - Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# CORS - Update with your Vercel URL
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (.env) - Vercel Environment Variables:
```env
# Backend API URL - Your Railway backend + /api/v1
VITE_API_URL=https://your-app-production.up.railway.app/api/v1

# Optional: AI Features
VITE_GEMINI_API_KEY=your-gemini-api-key
```

---

## 🔄 Alternative: Deploy Backend to Render

If you prefer Render.com over Railway:

### Render Configuration:

| Setting | Value |
|---------|-------|
| **Environment** | Node |
| **Root Directory** | `backend` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (or paid for no sleep) |

Add the same environment variables as Railway.

---

## 🔄 Alternative: Deploy Backend to Render

1. Go to [render.com](https://render.com) and connect GitHub
2. Create **"New Web Service"**
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add Environment Variables (same as Railway)
5. Deploy and copy the URL

---

## 🔧 Local Development with Database

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/eco-system.git
cd eco-system

# 2. Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..

# 3. Setup environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Edit backend/.env with your Supabase credentials
# DATABASE_URL=your-supabase-pooler-url
# DIRECT_URL=your-supabase-direct-url

# 5. Run database migrations
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..

# 6. Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Database Commands

```bash
# In backend folder
npx prisma migrate dev --name your_migration_name  # Create migration
npx prisma migrate deploy                           # Apply migrations
npx prisma db seed                                  # Seed data
npx prisma studio                                   # Open Prisma Studio
npx prisma generate                                 # Generate client
npx prisma migrate reset                           # Reset database (⚠️ deletes data!)
```

---

## 📝 API Documentation

### Base URL
- Development: `http://localhost:5000/api/v1`
- Production: `https://your-backend-url/api/v1`

### Invoices API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoices` | Get all invoices (with pagination) |
| GET | `/invoices/:id` | Get invoice by ID |
| POST | `/invoices` | Create new invoice |
| PUT | `/invoices/:id` | Update invoice |
| DELETE | `/invoices/:id` | Delete invoice |
| POST | `/invoices/:id/payments` | Add payment to invoice |
| GET | `/invoices/stats` | Get invoice statistics |

### Query Parameters for GET /invoices

```
?page=1
&limit=10
&status=UNPAID|HALFPAY|FULLPAID
&customerId=cust-001
&startDate=2026-01-01
&endDate=2026-12-31
&search=INV-2026
&sortBy=date
&sortOrder=desc
```

### Example: Create Invoice

```bash
curl -X POST http://localhost:5000/api/v1/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-001",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Dell Laptop",
        "quantity": 1,
        "unitPrice": 185000
      }
    ],
    "dueDate": "2026-02-15",
    "paymentMethod": "CASH",
    "paidAmount": 100000
  }'
```

---

## 🔐 Authentication (Future Implementation)

The project includes scaffolding for JWT-based authentication:

### User Roles
- **ADMIN** - Full access
- **MANAGER** - Manage invoices, customers, products
- **STAFF** - Create invoices, view data

### Protected Routes (To Implement)

```typescript
// Example usage
import { protect, authorize } from './middleware/auth';

router.route('/invoices')
  .get(protect, getAllInvoices)
  .post(protect, authorize('ADMIN', 'MANAGER'), createInvoice);
```

---

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Run both frontend and backend
npm run dev:frontend     # Run frontend only
npm run dev:backend      # Run backend only

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio

# Build
npm run build            # Build both projects
npm run build:frontend   # Build frontend
npm run build:backend    # Build backend

# Lint
npm run lint             # Lint both projects
```

---

## 🎨 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful UI components
- **React Router** - Client-side routing
- **Lucide React** - Icons

### Backend
- **Express.js** - Node.js web framework
- **Prisma** - Modern ORM
- **TypeScript** - Type safety
- **Zod** - Validation
- **JWT** - Authentication (ready)
- **Morgan** - Logging
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

### Database
- **PostgreSQL** - Via Supabase
- **Prisma** - Database toolkit

### Deployment
- **Vercel** - Frontend hosting
- **Railway/Render** - Backend hosting
- **Supabase** - Database hosting (PostgreSQL)

---

## 📊 Data Seeding

The project includes matching seed data between:
- **Frontend**: `mockData.ts` (fallback when API is unavailable)
- **Database**: `prisma/seed.ts` (Prisma seeding)

### Seed Data Includes:
- 📦 **10 Categories**: Processors, Graphics Cards, Storage, Memory, etc.
- 🏷️ **16 Brands**: AMD, Intel, NVIDIA, Samsung, Corsair, etc.
- 👥 **8 Customers**: Kasun Perera, Nimali Fernando, Tech Solutions Ltd, etc.
- 📦 **20 Products**: AMD Ryzen 9 7950X, RTX 4090, Samsung 990 Pro, etc.
- 📄 **12 Invoices**: Various statuses (FULLPAID, HALFPAY, UNPAID)

### Run Seed:
```bash
cd backend
npx prisma db seed
```

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Made with ❤️ by EcoTech Team
