# SevaSetu Government Certificate Assistance Platform

SevaSetu is a simple full-stack project for a government certificate and brokerage assistance portal. It connects citizens with verified agents and gives admins an operations view for services, pricing, verification, disputes, and KPIs.

## Tech Stack

- Frontend: React with Tailwind CSS
- Backend: Node.js with Express
- Database for demo: JSON file storage in `data/db.json`
- Build tool: Vite

## What is Included

- Citizen portal for browsing services, viewing documents and charges, creating requests, uploading documents, and tracking history.
- Agent dashboard for accepting, rejecting, updating, and completing assigned requests.
- Admin console for agent verification, pricing guideline edits, request monitoring, complaints, and KPI analytics.
- Demo login/register flow with role-based access.
- Mobile-responsive React UI using Tailwind.

## Run

Install dependencies:

```bash
npm install
```

Run the backend in one terminal:

```bash
npm run backend
```

Run the React frontend in another terminal:

```bash
npm run frontend
```

Then visit:

```text
http://127.0.0.1:5173
```

For local frontend-to-backend API calls, Vite proxies `/api` to `http://127.0.0.1:3000`.

Demo accounts:

- Citizen: `citizen@sevasetu.test` / `Citizen@123`
- Agent: `agent@sevasetu.test` / `Agent@123`
- Admin: `admin@sevasetu.test` / `Admin@123`

Production-style build:

```bash
npm run build
npm start
```

Then visit `http://127.0.0.1:3000`.

## Separate Deployment

Deploy the backend and frontend separately.

### Backend on Render

Create a new Render Web Service from this GitHub repository.

Recommended settings:

```text
Build Command: npm install
Start Command: npm start
```

Environment variables:

```text
NODE_ENV=production
SEVASETU_TOKEN_SECRET=<any-long-random-secret>
FRONTEND_URL=https://your-vercel-frontend-url.vercel.app
```

Render will provide a backend URL like:

```text
https://your-render-service.onrender.com
```

Health check:

```text
https://your-render-service.onrender.com/api/health
```

Note: the demo uses JSON file storage. On free/serverless-style hosting this is fine for project demonstration, but a production app should move data to MongoDB Atlas or PostgreSQL.

### Frontend on Vercel

Import the same GitHub repository into Vercel.

Recommended settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Environment variable:

```text
VITE_API_URL=https://your-render-service.onrender.com/api
```

After deployment, use the Vercel URL as the Project Deployed Link:

```text
https://your-vercel-project.vercel.app
```

### Useful Files

- `vercel.json` contains Vercel build/output settings and SPA rewrites.
- `render.yaml` contains a Render backend blueprint.
- `.env.example` shows the required environment variables.

## Phase Plan

Phase 1: Citizen service catalog, request creation, request tracking, document metadata upload, and basic admin setup.

Phase 2: Agent onboarding, agent verification, assignment handling, request progress updates, and complaint handling.

Phase 3: KPI analytics, multi-location scaling, stronger document validation, payment placeholder, and deployment polish.

The app intentionally does not integrate with government databases, payment gateways, or native mobile apps in Phase 1.
