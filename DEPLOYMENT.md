# 🚀 SmartUML Deployment Guide

This guide covers deploying the **SmartUML** application:
- **Backend**: FastAPI (Python) on **Render** (or Railway / Fly.io)
- **Frontend**: React + Vite on **Vercel** (or Firebase Hosting)

---

## 🛠️ Step 1: Deploy Backend (Render)

1. **Push your repository** to GitHub/GitLab.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your Git repository.
4. Set the following settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key)*
   - `ALLOWED_ORIGINS`: `*` *(or your Vercel frontend URL once deployed)*
6. Click **Create Web Service**.
7. Copy your deployed backend service URL (e.g. `https://smartuml-backend.onrender.com`).

---

## 💻 Step 2: Deploy Frontend (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** -> **Project**.
2. Import your Git repository.
3. Select **Root Directory**: Edit and set it to `client`.
4. Framework Preset should auto-detect as **Vite**.
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://smartuml-backend.onrender.com` *(Your Render backend URL from Step 1)*
   - Add your Firebase variables:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
6. Click **Deploy**.

---

## 🔒 Step 3: Firebase Authentication Domains (Important)

If you are using Firebase Auth (Email/Password or Google Sign-In):
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication** -> **Settings** -> **Authorized domains**.
3. Add your Vercel deployment domain (e.g. `smartuml.vercel.app`).

---

## ✅ Step 4: Verification

1. Open your deployed Vercel URL in your browser.
2. Log in or create an account.
3. Try generating a UML diagram (e.g., Use Case Diagram for Library Management System).
4. Verify diagram generation, SVG download, XML download, and Draw.io visual editing work smoothly!
