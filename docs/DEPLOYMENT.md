# Deployment Guide — CCPL 2026 Scoring Pro

## Prerequisites

- Node.js 20+
- Firebase project with Blaze plan (for Cloud Functions if needed)
- Vercel account (recommended) or Firebase Hosting

## 1. Firebase Setup

### Create Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create project: `ccpl-2026-scoring-pro`
3. Enable **Authentication** → Google sign-in
4. Create **Firestore** database (production mode)
5. Enable **Storage**

### Web App Config
1. Project Settings → Add Web App
2. Copy config values to `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Deploy Security Rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
npm run firebase:deploy:rules
```

### Create Firestore Indexes
In Firebase Console → Firestore → Indexes, create:
- `fixtures`: `order` ASC
- `balls`: `inningsId` ASC, `sequence` ASC
- `commentary`: `matchId` ASC, `timestamp` DESC

### Seed Data
```bash
npm run dev
curl -X POST http://localhost:3000/api/seed
```

Or use Admin Panel → Seed Database.

### First Admin User
After first Google sign-in, manually update Firestore:
```
users/{uid} → { role: "administrator" }
```

## 2. Vercel Deployment

```bash
npm i -g vercel
vercel login
vercel
```

Add all `NEXT_PUBLIC_*` env vars in Vercel dashboard.

For production:
```bash
vercel --prod
```

## 3. Firebase Hosting (Alternative)

For static export with Firebase Hosting, update `next.config.ts`:
```typescript
output: 'export',
```

Then:
```bash
npm run build
firebase deploy --only hosting
```

Note: API routes (`/api/seed`) require Vercel or Firebase Cloud Functions.

## 4. PWA Installation

The app is installable on mobile/desktop when served over HTTPS:
- Add to Home Screen (iOS/Android)
- Install from browser menu (Chrome/Edge)

## 5. Live Scoring Workflow

1. **Admin** seeds database and assigns scorer roles
2. **Scorer** opens `/admin/matches` → Mobile Scorer for a fixture
3. **Spectators** scan QR on TV scoreboard or visit `/live/{matchId}`
4. **TV Display** opens `/match/{matchId}/tv` on projector

## 6. Post-Deployment Checklist

- [ ] Firebase rules deployed
- [ ] Google Auth authorized domains include production URL
- [ ] Seed data loaded (16 teams, 18 fixtures)
- [ ] Admin user role assigned
- [ ] PWA manifest loads correctly
- [ ] Mobile scorer tested on phone
- [ ] TV scoreboard tested fullscreen

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Demo mode only | Set all `NEXT_PUBLIC_FIREBASE_*` env vars |
| Auth fails | Add domain to Firebase Auth authorized domains |
| Seed fails | Check Firestore rules, ensure admin is signed in |
| Offline sync | IndexedDB queue syncs when back online |
