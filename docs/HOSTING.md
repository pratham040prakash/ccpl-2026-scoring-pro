# Host CCPL from GitHub

Connect your Git repo to **Vercel** for automatic deploys on every `git push`.

**Repo:** [github.com/pratham040prakash/ccpl-2026-scoring-pro](https://github.com/pratham040prakash/ccpl-2026-scoring-pro)

---

## One-time setup (5 minutes)

### 1. Push latest code to GitHub

```bash
cd ~/Documents/personal/ccpl-2026-scoring-pro
git add .
git commit -m "Add Firebase setup and Vercel hosting config"
git push
```

### 2. Import repo on Vercel

1. Go to [vercel.com](https://vercel.com) → **Sign up / Log in**
2. Choose **Continue with GitHub**
3. Authorize Vercel for **`pratham040prakash`**
4. Click **Add New… → Project**
5. Import **`ccpl-2026-scoring-pro`**
6. Settings (auto-detected):
   - **Framework:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
7. Click **Deploy**

First deploy takes ~2 minutes. You get a URL like:

```
https://ccpl-2026-scoring-pro.vercel.app
```

---

## Environment variables (Vercel dashboard)

**Project → Settings → Environment Variables**

Add for **Production**, **Preview**, and **Development**:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | For live data | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | For live data | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | For live data | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | For live data | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | For live data | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | For live data | |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your Vercel URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | For seed API | Server-only, one-line JSON |

**Without Firebase vars:** app runs in **demo mode** (local seed data).

After adding vars → **Deployments → Redeploy** latest.

---

## Firebase + Vercel together

1. Deploy on Vercel (above)
2. Copy Vercel URL
3. Firebase Console → **Authentication → Settings → Authorized domains**
4. Add: `ccpl-2026-scoring-pro.vercel.app` (your actual URL)
5. Set `NEXT_PUBLIC_APP_URL` in Vercel to the same URL
6. Redeploy

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase project setup.

---

## Auto-deploy workflow

```
Edit code locally
    ↓
git add . && git commit -m "..." && git push
    ↓
GitHub receives push
    ↓
Vercel builds & deploys automatically
    ↓
Live site updated (~1–2 min)
```

Every push to **`main`** → **Production** deploy.  
Pull requests → **Preview** URLs (optional).

---

## Custom domain (optional)

Vercel → **Project → Settings → Domains**

Example: `ccpl.yourdomain.com`

Add the DNS records Vercel shows, then add that domain to Firebase **Authorized domains**.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build failed on Vercel | Check **Deployments → Logs**; run `npm run build` locally |
| Demo mode on live site | Add all `NEXT_PUBLIC_FIREBASE_*` env vars in Vercel |
| Google login fails | Add Vercel domain to Firebase Authorized domains |
| Seed API fails | Add `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel env |

---

## Why Vercel (not Streamlit / Firebase Hosting alone)?

| Platform | CCPL Next.js app |
|----------|------------------|
| **Vercel** | Best fit — native Next.js, Git deploy, API routes |
| Streamlit Cloud | Python only — **does not run this app** |
| Firebase Hosting | Static export only — loses `/api/seed` unless extra setup |

Use **Vercel for the website** + **Firebase for Auth/Database**.
