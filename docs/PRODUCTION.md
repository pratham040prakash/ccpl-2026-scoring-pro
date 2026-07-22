# Production Launch — CCPL 2026 Scoring Pro

Move from demo to **production** with Firebase auth, admin access, and live data.

**Live site:** [ccpl-2026-scoring-pro.vercel.app](https://ccpl-2026-scoring-pro.vercel.app)

---

## Step 1 — Vercel environment variables

**Vercel → Project → Settings → Environment Variables**

Add all of these for **Production**:

### Firebase (client)
| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project settings → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same |
| `NEXT_PUBLIC_APP_URL` | `https://ccpl-2026-scoring-pro.vercel.app` |

### Server (secret)
| Variable | Value |
|----------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase → Project settings → Service accounts → Generate key → paste **one-line JSON** |
| `ADMIN_EMAILS` | `sppratham@gmail.com` |

> `ADMIN_EMAILS` can list multiple admins: `email1@gmail.com,email2@cisco.com`

Click **Save** → **Deployments → Redeploy** latest.

---

## Step 2 — Firebase Console

1. **Authentication → Sign-in method** → Enable **Email/Password** and **Google**
2. **Authentication → Users → Add user** → create admin account:
   - Email: `sppratham@gmail.com`
   - Password: choose a strong password (you will use this on the sign-in form)
3. **Authentication → Settings → Authorized domains** → add:
   - `ccpl-2026-scoring-pro.vercel.app`
3. **Firestore** database created (production mode)
4. Deploy rules from your machine:

```bash
cd ~/Documents/personal/ccpl-2026-scoring-pro
firebase login
cp .firebaserc.example .firebaserc   # set your project ID
npm run firebase:deploy:rules
```

---

## Step 3 — Get admin access

1. Open [https://ccpl-2026-scoring-pro.vercel.app/login](https://ccpl-2026-scoring-pro.vercel.app/login) (or `/admin`)
2. Enter **email** and **password** (the account you created in Firebase)
3. You are auto-promoted to **administrator** if your email is in `ADMIN_EMAILS`
4. Admin panel unlocks

Google sign-in is also available as an option on the sign-in page.

If access is denied:
- Confirm `ADMIN_EMAILS` matches your Google email exactly
- Confirm `FIREBASE_SERVICE_ACCOUNT_JSON` is set on Vercel
- Redeploy and sign out / sign in again

---

## Step 4 — Seed tournament data

1. In **Admin → Database → Seed Database**  
   **or**
2. Run (with service account configured):

```bash
curl -X POST https://ccpl-2026-scoring-pro.vercel.app/api/seed
```

Verify in Firestore: `teams`, `players`, `fixtures`, `settings` collections populated.

---

## Step 5 — Verify production

| Check | Expected |
|-------|----------|
| Home page | 18 teams, 18 fixtures |
| `/admin` | Full admin panel after Google sign-in |
| Demo mode | **Off** (no auto demo login) |
| Sign in | Required for admin actions |
| `/admin/scores` | CSV / manual score updates |

---

## Security (production)

- Users **cannot** self-promote to admin (Firestore rules block role changes)
- Admin promotion only via `ADMIN_EMAILS` + server bootstrap API
- Service account JSON stays server-only (never `NEXT_PUBLIC_`)

---

## Local production testing

```bash
cp .env.example .env.local
# Fill Firebase vars + ADMIN_EMAILS + FIREBASE_SERVICE_ACCOUNT_JSON
npm run firebase:setup-check
npm run dev
```

Sign in at `/admin` with your Google account.

---

## Quick reference

```bash
npm run firebase:deploy:rules   # Deploy Firestore + Storage rules
npm run firebase:setup-check    # Validate .env.local
npm run seed                    # Seed local Firestore
git push                        # Auto-deploy to Vercel
```
