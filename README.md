# 🌿 EcoSystem - Business Management System

A modern, full-stack business management system built with **React + Vite**, **Express.js**, **Prisma**, and **Supabase**. Deployed on **Render.com** with a PostgreSQL database on **Supabase**.

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
│   │   └── seed.ts               # Database seeding
│   ├── 📁 src/
│   │   ├── 📁 controllers/       # Route handlers
│   │   ├── 📁 middleware/        # Express middleware
│   │   ├── 📁 routes/            # API routes
│   │   ├── 📁 validators/        # Input validation
│   │   ├── 📁 services/          # Business logic (PDF, Email)
│   │   ├── 📁 config/            # Security config
│   │   ├── 📁 lib/               # Utilities (Prisma client)
│   │   └── index.ts              # Server entry point
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
│   │   ├── 📁 contexts/          # React contexts
│   │   ├── 📁 services/          # API services
│   │   ├── 📁 data/              # Mock data (fallback)
│   │   ├── App.tsx               # Main app component
│   │   └── main.tsx              # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── .gitignore
├── package.json                   # Root package.json
├── render.yaml                    # Render.com Blueprint
└── README.md
```

## ✨ Features

- ✅ **Invoice Management** - Full CRUD with PDF generation & email
- ✅ **Payment Tracking** - Record and track payments with reminders
- ✅ **Customer Management** - Customer database with credit tracking
- ✅ **Product Management** - Inventory with serial/IMEI tracking
- ✅ **Supplier & GRN Management** - Purchase orders & goods received
- ✅ **WhatsApp Integration** - Send invoices & reminders via WhatsApp
- ✅ **PDF Generation** - Server-side PDF with Puppeteer
- ✅ **Dark Mode** - Full theme switching support
- ✅ **Responsive Design** - Mobile-friendly interface
- ✅ **JWT Authentication** - Role-based access (ADMIN, MANAGER, STAFF)
- ✅ **Multi-Tenant** - Shop isolation with BOLA prevention

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- **Node.js** 18+
- **npm**
- **Supabase** account (free tier) for PostgreSQL

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/eco-system.git
cd eco-system
npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase credentials
```

**backend/.env:**
```env
NODE_ENV=development
PORT=3001

# Database - Supabase PostgreSQL
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters"
JWT_REFRESH_SECRET="another-secret-key-for-refresh-tokens"

# CORS
FRONTEND_URL="http://localhost:5173"

# SMTP (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### 3. Set Up Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
cd ..
```

### 4. Start Development

```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

---

## 🌐 Deploying to Render.com

### Option A: Blueprint (Recommended)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **Blueprints**
3. Click **"New Blueprint Instance"**
4. Connect your GitHub repo
5. Render detects `render.yaml` and creates both services
6. Set environment variables in dashboard (marked as `sync: false`)

### Option B: Manual Setup

#### Deploy Backend (Web Service)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `eco-system-api` |
| **Region** | Singapore (closest to Sri Lanka) |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate && npx tsc` |
| **Start Command** | `node dist/index.js` |
| **Plan** | Free |

4. Add environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | Your Supabase pooler URL |
| `DIRECT_URL` | Your Supabase direct URL |
| `JWT_SECRET` | Generate: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 64` |
| `FRONTEND_URL` | Set after frontend deploys |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your email |
| `SMTP_PASS` | Your app password |
| `SMTP_FROM` | Your email |

5. Deploy and copy URL: `https://eco-system-api.onrender.com`

#### Deploy Frontend (Static Site)

1. Go to **New** → **Static Site**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `eco-system-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. Add environment variable:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://eco-system-api.onrender.com/api/v1` |

5. Add rewrite rule: `/*` → `/index.html` (for SPA routing)

6. Deploy!

#### Post-Deploy: Update Backend CORS

Go back to your backend service and update:
```
FRONTEND_URL=https://eco-system-frontend.onrender.com
```

---

## 🗄️ Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Set **Region**: `Singapore (Southeast Asia)` (closest to Sri Lanka)
3. Save your database password!
4. Get connection strings from **Project Settings** → **Database**:
   - **Transaction Pooler** (port 6543) → `DATABASE_URL`
   - **Session/Direct** (port 5432) → `DIRECT_URL`

---

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Run both frontend and backend
npm run dev:frontend     # Frontend only (http://localhost:5173)
npm run dev:backend      # Backend only (http://localhost:3001)

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Create migration
npm run db:studio        # Open Prisma Studio

# Build
npm run build            # Build both projects
npm run build:frontend   # Build frontend only
npm run build:backend    # Build backend only (prisma generate + tsc)

# Lint
npm run lint             # Lint both projects
```

---

## 📝 API Documentation

### Base URL
- **Development:** `http://localhost:3001/api/v1`
- **Production:** `https://eco-system-api.onrender.com/api/v1`

### Endpoints

| Resource | Methods | Description |
|----------|---------|-------------|
| `/auth` | POST | Login, Register, Refresh token |
| `/invoices` | GET, POST, PUT, DELETE | Invoice management |
| `/customers` | GET, POST, PUT, DELETE | Customer management |
| `/products` | GET, POST, PUT, DELETE | Product management |
| `/categories` | GET, POST, PUT, DELETE | Category management |
| `/brands` | GET, POST, PUT, DELETE | Brand management |
| `/suppliers` | GET, POST, PUT, DELETE | Supplier management |
| `/grns` | GET, POST, PUT, DELETE | GRN management |
| `/shops` | GET, POST, PUT | Shop management |
| `/admin` | GET, POST, PUT | Admin operations |

### Health Check
```bash
curl https://eco-system-api.onrender.com/health
```

---

## 🎨 Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** + **Radix UI**
- **React Router v6** + **TanStack Query**
- **Lucide React** icons

### Backend
- **Express.js** + **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **JWT** authentication + **Helmet** security
- **Puppeteer** for PDF generation
- **Nodemailer** for email

### Infrastructure
- **Render.com** - Frontend (Static Site) + Backend (Web Service)
- **Supabase** - PostgreSQL database hosting

---

## 📄 License

This project is licensed under the MIT License.

---

Made with ❤️ by EcoTech Team
