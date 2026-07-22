# Run CCPL 2026 Scoring Pro

## 1. Go to the app folder

```bash
cd ccpl-2026-scoring-pro
```

**Not** the `stock-analyzer` root — the app lives in the `ccpl-2026-scoring-pro` subfolder.

## 2. Install (first time only)

```bash
npm install
```

## 3. Start the dev server

```bash
npm run dev
```

Open: **http://127.0.0.1:3000**

## If port 3000 is busy

```bash
npm run dev:3001
```

Then open **http://127.0.0.1:3001**

## If you see a network / `uv_interface_addresses` error

The dev script already binds to `127.0.0.1`. If it still fails, run:

```bash
npx next dev -H 127.0.0.1 -p 3000
```

## Demo mode

No Firebase setup required. The app loads CCPL teams and fixtures from local seed data automatically.

## Update teams from CCPL.xlsx

When you receive an updated roster spreadsheet:

```bash
npm run import:teams
# or specify path:
python3 scripts/import-teams-from-xlsx.py ~/Downloads/CCPL.xlsx
```

Then restart the dev server. Re-seed Firestore from Admin if using Firebase.

## Firebase (optional, for production)

Copy `.env.example` to `.env.local` and add your Firebase keys.
