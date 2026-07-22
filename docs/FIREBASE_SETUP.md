# Firebase Setup — CCPL 2026 Scoring Pro

Step-by-step guide to connect the app to Firebase (Auth, Firestore, Storage).

---

## 1. Create Firebase project

1. Open [Firebase Console](https://console.firebase.google.com)
2. **Add project** → name: `ccpl-2026-scoring-pro` (or your choice)
3. Disable Google Analytics if you don't need it (optional)
4. Wait for project creation to finish

---

## 2. Register web app

1. Project **Overview** → **Web** (`</>`)
2. App nickname: `CCPL Scoring Pro Web`
3. **Do not** enable Firebase Hosting yet (use Vercel for Next.js)
4. Copy the `firebaseConfig` values

---

## 3. Local environment variables

```bash
cd ~/Documents/personal/ccpl-2026-scoring-pro
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ccpl-2026-scoring-pro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ccpl-2026-scoring-pro
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ccpl-2026-scoring-pro.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Production URL (after Vercel deploy)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Server-only — for /api/seed (see step 8)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Restart dev server after saving:

```bash
npm run dev
```

Demo mode turns **off** when `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` are set.

---

## 4. Enable Authentication

1. **Build → Authentication → Get started**
2. **Sign-in method → Google → Enable**
3. Support email: your email
4. **Settings → Authorized domains** — add:
   - `localhost`
   - `127.0.0.1`
   - Your Vercel domain (e.g. `ccpl-2026-scoring-pro.vercel.app`)

---

## 5. Create Firestore database

1. **Build → Firestore Database → Create database**
2. Mode: **Production** (we deploy security rules next)
3. Location: choose nearest region (e.g. `asia-south1` for India)
4. Click **Enable**

---

## 6. Enable Storage

1. **Build → Storage → Get started**
2. Use default bucket
3. Location: same as Firestore if possible

---

## 7. Link Firebase CLI & deploy rules

```bash
npm install -g firebase-tools   # if needed
firebase login

cd ~/Documents/personal/ccpl-2026-scoring-pro
cp .firebaserc.example .firebaserc
# Edit .firebaserc — set your project ID

firebase use --add
# Select your project, alias: default

npm run firebase:deploy:rules
```

This deploys:
- `firebase/firestore.rules`
- `firebase/storage.rules`
- `firestore.indexes.json`

---

## 8. Service account (for seeding data)

The seed API needs **Admin SDK** credentials (Firestore rules block unauthenticated writes).

1. **Project Settings → Service accounts**
2. **Generate new private key** → download JSON
3. Minify to one line and add to `.env.local` (never commit this file):

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}
```

Or on Vercel: paste the JSON as env var `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

## 9. First admin user

1. Run app: `npm run dev` → open http://127.0.0.1:3000/admin
2. **Sign in with Google**
3. Firebase Console → **Firestore → users → {your-uid}**
4. Edit document → set field:

```json
"role": "administrator"
```

5. Refresh `/admin` — you should have full access

---

## 10. Seed tournament data

**Option A — Admin panel**

1. Go to `/admin`
2. Click **Seed Database**

**Option B — API**

```bash
npm run seed
# or
curl -X POST http://localhost:3000/api/seed
```

Expected response:

```json
{
  "success": true,
  "message": "Seeded 18 teams, 218 players, 18 fixtures to Firestore."
}
```

Verify in Firestore Console: collections `teams`, `players`, `fixtures`, `settings`.

---

## 11. Production (Vercel)

Add these in **Vercel → Settings → Environment Variables**:

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_FIREBASE_*` | All 6 client vars from step 3 |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-only, for seed API |

Redeploy after adding vars.

Add Vercel domain to Firebase **Authorized domains**.

---

## Quick checklist

- [ ] Firebase project created
- [ ] Web app registered, `.env.local` filled
- [ ] Google Auth enabled + authorized domains
- [ ] Firestore + Storage enabled
- [ ] `firebase login` + rules deployed
- [ ] Service account JSON in `.env.local`
- [ ] Signed in once, `role: administrator` set in Firestore
- [ ] Seed completed (18 teams, 18 fixtures)
- [ ] Vercel env vars set (production)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Still in demo mode | Check `.env.local` has both `API_KEY` and `PROJECT_ID`; restart `npm run dev` |
| Google sign-in popup fails | Add domain to Firebase Auth authorized domains |
| Seed returns permission denied | Add `FIREBASE_SERVICE_ACCOUNT_JSON` to `.env.local` |
| Admin panel locked | Set `users/{uid}.role` to `administrator` in Firestore |
| Missing index error in console | Run `npm run firebase:deploy:rules` (includes indexes) |

---

## Security notes

- Never commit `.env.local` or service account JSON to Git
- `FIREBASE_SERVICE_ACCOUNT_JSON` is **server-only** (no `NEXT_PUBLIC_` prefix)
- Rotate service account key if accidentally exposed
