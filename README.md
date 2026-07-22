# CCPL 2026 Scoring Pro

Enterprise-grade cricket tournament management and live scoring platform for the **Cisco Champions Premier League (CCPL 2026)**.

## Features

- **Live Scoring Engine** — Ball-by-ball scoring with undo, extras, wickets, penalty runs
- **Mobile Scorer Mode** — One-handed scoring, offline queue, auto-sync
- **TV Scoreboard Mode** — Fullscreen LED/projector display with QR codes
- **Tournament Engine** — Auto progression Round 1 → Integration → QF → SF → Final
- **Statistics Engine** — Points table, NRR, Orange/Purple Cap, leaderboards
- **AI Features** — Match summary, player insights, win probability
- **Export Center** — PDF scorecards, CSV/Excel exports
- **PWA** — Installable, offline-first, mobile-optimized
- **RBAC** — Administrator, Scorer, Captain, Viewer roles

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15+, React 19, TypeScript, Tailwind CSS |
| UI | Framer Motion, Recharts, React Hook Form, Zod |
| State | TanStack React Query |
| Backend | Firebase Auth, Firestore, Storage, Cloud Functions |
| PWA | Service Worker, IndexedDB offline queue |

## Quick Start

```bash
cd ccpl-2026-scoring-pro
npm install
cp .env.example .env.local
# Add Firebase credentials to .env.local (optional for demo mode)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Firebase configured, the app runs in **demo mode** with preloaded CCPL 2026 teams and fixtures.

## Host from GitHub (Vercel)

1. Push repo to GitHub: [pratham040prakash/ccpl-2026-scoring-pro](https://github.com/pratham040prakash/ccpl-2026-scoring-pro)
2. [vercel.com](https://vercel.com) → **Import Project** → select the repo → **Deploy**
3. Add Firebase env vars in Vercel (optional for demo mode)

Full guide: [docs/HOSTING.md](docs/HOSTING.md) · Firebase: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

## Seed Database

1. Configure Firebase in `.env.local`
2. Enable Google Authentication in Firebase Console
3. Deploy Firestore rules: `npm run firebase:deploy:rules`
4. Seed data from Admin Panel or API:

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- 16+ teams with full player rosters
- 18 preloaded fixtures (R1-1 through Final)
- Tournament settings, rules, announcements

## Preloaded Fixtures

| Stage | Matches |
|-------|---------|
| Round 1 (Day 1–2) | R1-1 to R1-9 |
| Integration | R2-1, R2-2 |
| Quarter Finals | QF1–QF4 |
| Semi Finals | SF1, SF2 |
| Final | F |

## Firestore Collections

```
users, roles, teams, players, fixtures, matches, innings, overs,
balls, commentary, statistics, pointsTable, leaderboards, awards,
notifications, media, settings
```

See [docs/FIRESTORE_SCHEMA.md](docs/FIRESTORE_SCHEMA.md) for full schema.

## Deployment

### Vercel (Recommended for Next.js)

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel dashboard from `.env.example`.

### Firebase Hosting

```bash
npm run build
npm run firebase:deploy
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Home dashboard
│   ├── ccpl/             # CCPL hub
│   ├── live/[matchId]/   # Public live score
│   ├── match/[matchId]/  # TV + mobile scorer
│   ├── admin/            # Admin panel
│   └── api/seed/         # Database seed endpoint
├── components/           # UI components
├── lib/
│   ├── engine/           # Scoring, tournament, stats, AI
│   ├── firebase/         # Firebase config & Firestore helpers
│   ├── offline/          # IndexedDB offline queue
│   └── export/           # PDF, CSV, Excel
├── hooks/                # React Query hooks
├── providers/            # Auth, theme, query providers
└── types/                # TypeScript definitions
firebase/
├── firestore.rules
└── storage.rules
```

## Roles

| Role | Permissions |
|------|-------------|
| Administrator | Full access, seed, backup, team management |
| Scorer | Live scoring, ball entry, match control |
| Captain | Team roster view, limited edits |
| Viewer | Read-only access to scores and stats |

## CCPL 2026 Tournament Format

1. **Round 1:** 9 league matches, 6 overs
2. **Integration:** Winner R1-9 vs Best Losing Team (highest NRR)
3. **Standings:** Points → NRR → Runs Scored → Top 8 qualify
4. **Knockout:** QF (8 ov) → SF (10 ov) → Final (10 ov)

## License

Private — Cisco Champions Premier League 2026
