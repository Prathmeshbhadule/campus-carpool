# MITAOE Campus Carpool — Production Deployment Guide

This document outlines the step-by-step instructions for deploying the **MITAOE Campus Carpool** application to production cloud infrastructure.

The application supports two production deployment architectures:
1. **Option A (Recommended & Simplest): Unified Full-Stack Service** (Render / Railway / AWS / Docker) — Express serves both the REST API and the optimized React SPA bundle from a single origin.
2. **Option B: Decoupled Deployment** (Vercel / Netlify Frontend + Render / Railway Backend + MongoDB Atlas).

---

## Architecture Overview

```
Option A: Unified Full-Stack Deployment (Single Service)
┌─────────────────────────────────────────────────────────────┐
│                 Render / Railway / Docker Host              │
│                                                             │
│   ┌────────────────────────┐       ┌────────────────────┐   │
│   │ Express REST API       │       │ React 18 SPA       │   │
│   │ /api/v1/*, /health     │       │ client/dist/*      │   │
│   └───────────┬────────────┘       └─────────┬──────────┘   │
└───────────────┼──────────────────────────────┼──────────────┘
                │ HTTPS                        │ Single Port
                ▼                              ▼
      [ MongoDB Atlas ]                 End User Browser
```

```
Option B: Decoupled Multi-Host Deployment
[ Vercel / Netlify ] ────────────── HTTPS ──────────────> [ Render / Railway ]
  (React 18 SPA)                                          (Node 20+ Express API)
         │                                                           │
         ▼                                                           ▼
  End User Browser                                          [ MongoDB Atlas ]
                                                           (Dedicated Cluster)
```

---

## 1. Database Setup (MongoDB Atlas)

Regardless of the hosting model, production requires a high-availability MongoDB Atlas cluster:

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new database project and deploy a cluster (e.g., AWS `ap-south-1` Mumbai region for optimal Pune/India latency).
3. Under **Database Access**, create an application database user with `readWriteAnyDatabase` permissions.
4. Under **Network Access**, add IP whitelist entry `0.0.0.0/0` (or the static egress IP of your cloud host).
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/mitaoe_carpool?retryWrites=true&w=majority
   ```

---

## 2. Option A: 1-Click Unified Full-Stack Deployment (Recommended)

In this mode, Express serves the pre-built React application from `client/dist`, eliminating CORS and cross-origin configuration issues.

### A. Deploying on Render via Blueprint (`render.yaml`)
1. Push repository to GitHub/GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New** &rarr; **Blueprint** and connect the repository.
4. Render automatically reads [`render.yaml`](../render.yaml) and creates the web service:
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
5. Supply the `MONGODB_URI` environment variable when prompted.
6. Once deployed, the platform is live at `https://<service-name>.onrender.com`.

### B. Deploying via Docker
Run the production multi-stage container locally or on any cloud VPS (DigitalOcean, AWS EC2, Linode):
```bash
# Build and start MongoDB and the production app
docker compose up -d --build

# View logs
docker compose logs -f app
```
The app is available at `http://localhost:5000`.

---

## 3. Option B: Decoupled Multi-Host Deployment

### A. Backend API Deployment (Render / Railway)
1. Connect your repository to **Render** or **Railway**.
2. Select Web Service deployment:
   - **Root Directory:** `carpool`
   - **Build Command:** `npm install && cd server && npm install`
   - **Start Command:** `node server/src/server.js`
3. Configure Environment Variables:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `5000` | Render assigns dynamically |
   | `MONGODB_URI` | `mongodb+srv://...` | Connection string from MongoDB Atlas |
   | `JWT_SECRET` | `<64-char random string>` | Cryptographic secret for signing tokens |
   | `CLIENT_URL` | `https://your-frontend.vercel.app` | Production frontend domain for CORS |
4. Deploy and verify health check at `https://<backend-domain>/health`.

### B. Frontend SPA Deployment (Vercel / Netlify)
1. Connect your repository to **Vercel** or **Netlify**.
2. Configure build settings:
   - **Root Directory:** `carpool/client` (or `client`)
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Configure Environment Variables:
   | Variable | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://<backend-domain>/api/v1` |
4. Routing rewrites are pre-configured via [`vercel.json`](../client/vercel.json) and [`_redirects`](../client/public/_redirects) for seamless SPA page refreshes.

---

## 4. Post-Deployment Verification Checklist

Once deployed, verify the following operations:

- [ ] **Health Check:** `GET /health` returns `{ "success": true, "environment": "production" }`.
- [ ] **API Documentation:** `GET /api/docs` renders Swagger interactive OpenAPI specification.
- [ ] **Registration & Auth:** Register a test `@mitaoe.ac.in` account, receive JWT, and verify session persistence.
- [ ] **Route Map & GPS:** Open `/post-ride`, click "Use My Current GPS", and ensure Leaflet / Google Maps renders.
- [ ] **Interactive Fare Calculator:** Verify `/calculator` computes accurate Pune-Alandi route cost savings.
- [ ] **Atomic Booking:** Reserve a seat and confirm `seatsAvailable` decrements atomically.
- [ ] **Real-Time UPI Payment:** Click "Pay Driver via Real-Time UPI QR" on any booked ride to display scannable QR.
