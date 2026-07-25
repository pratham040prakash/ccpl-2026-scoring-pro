# CCPL 2026 Scoring Pro — End-to-End Audit Report

**Date:** 2026-07-25  
**Scope:** Live scoring, Firestore, realtime, statistics, admin, mobile, offline  
**Build:** `npm run build` ✅ · **Tests:** `npm test` ✅ (8 tests)

---

## Executive Summary

Live scoring failed primarily due to **Firestore rules/indexes not deployed**, **local bootstrap state blocking UI updates**, **silent error handling**, and **engine bugs in second innings / finalize flow**. This audit fixed the critical path for admin + mobile scoring and added debug tooling, logging, and automated tests.

---

## Root Causes Found

| # | Root cause | Impact |
|---|------------|--------|
| 1 | Firestore default deny-all rules | All writes blocked |
| 2 | Missing composite indexes (`innings`, `balls`) | Subscriptions fail; score frozen |
| 3 | `bootstrappedInnings ?? live` precedence | Firestore updates ignored after local start |
| 4 | `handleScore` swallowed errors (no `catch`) | Permission/index failures invisible |
| 5 | Batter/bowler pills not wired | Scoring blocked (`ctx()` null) |
| 6 | `createInitialInnings` inverted team IDs for innings 2 | Wrong team bats in chase |
| 7 | Match finalize required `idToken`; mobile omitted it | Standings never updated |
| 8 | Match marked completed before finalize | Orphan completed matches |
| 9 | Mobile used wrong playing XI | Scoring blocked when team B bats |
| 10 | Partnership wicket slice included wicket ball | Wrong partnership stats |
| 11 | Re-start match created duplicate innings docs | Wrong innings loaded |
| 12 | Offline sync used stale innings + wrong match ID | Duplicate/missing balls on reconnect |

---

## ✅ Working Modules (after fixes)

- Admin live scorer (`AdminLiveScorer`) — ball-by-ball scoring, undo, restore, pause, **manual finalize**, **ball correction with audit trail**
- Scoring engine (`scoreBall`, extras, wickets, strike rotation)
- Firestore batch writes (balls, innings, commentary, audit)
- Realtime listeners (`useLiveMatch` — match, innings, balls, commentary)
- Batter/bowler selection + auto-init participants
- Optimistic UI updates + error banners
- Public live page + TV mode (subscription-driven)
- Mobile scorer (fixed XI + idToken finalize path)
- Offline queue with local preview + improved sync replay
- Debug panel (admin, non-production or administrator)
- Scoring event logger (`scoring-logger.ts`)
- Automated tests (engine + partnership)

---

## ❌ Broken / Not Implemented (known gaps)

| Feature | Status |
|---------|--------|
| Dead ball | Not in `ScoringAction` or UI |
| Redo | Not implemented (`Redo2` icon unused on mobile) |
| Delete ball (single) | Only undo last ball |
| End over (manual) | Engine-only on 6 legal balls |
| Toss / playing XI picker UI | Auto first 11 from roster |
| `scoreboard` Firestore collection | Rules exist; never written |
| Full tournament UI simulation | Requires manual QA pass |

---

## ⚠ Potential Bugs (monitor)

- `/api/seed` unauthenticated — can wipe production data
- `media` collection allows any authenticated write
- Captain role in rules but never assigned in auth bootstrap
- Duplicate innings if Firestore subscription empty while user re-starts
- Win probability / projected score are heuristic estimates only

---

## Files Modified (this audit)

| File | Change |
|------|--------|
| `src/lib/engine/live-scoring-service.ts` | Second innings fix, idempotent start, finalize flow, logging |
| `src/lib/engine/innings-metrics.ts` | Partnership wicket slice fix |
| `src/lib/engine/statistics.ts` | Non-striker dismissal in aggregates |
| `src/lib/firebase/firestore.ts` | `updateFixture`, balls subscription errors |
| `src/lib/offline/sync.ts` | Match ID resolution, fresh replay, dedupe |
| `src/lib/live/*` | match-doc-id, scoring-user, logger, resolve-playing-xis |
| `src/components/scorer/admin-live-scorer.tsx` | Optimistic state, offline preview, debug panel, finalize + correction UI |
| `src/components/scorer/ball-correction-panel.tsx` | **New** — correct delivery with required reason |
| `src/components/scorer/ball-audit-history.tsx` | **New** — before/after audit log display |
| `src/app/match/.../mobile/page.tsx` | Full mobile scoring fixes |
| `src/components/scoreboard/live-scoreboard.tsx` | Striker/non-striker/bowler display |
| `src/components/dashboard/fixture-card.tsx` | Live link uses `fixture.id` |
| `src/hooks/use-live-match.ts` | Balls error surfacing |
| `src/components/scorer/scoring-debug-panel.tsx` | **New** debug UI |
| `tests/*.test.ts` | **New** automated tests |
| `vitest.config.ts`, `package.json` | Test runner |

---

## Data Flow (verified in code)

```
Score button → handleScore → ctx() validation
  → applyScoringAction → scoreBall → writeBatch(Firestore)
  → onSnapshot(innings/balls) → useLiveMatch
  → Admin / Live / TV / Mobile UI
  → (match end) finalizeMatchViaApi → tournament-sync → pointsTable + leaderboards
```

**Breaks fixed:** validation silent fail, bootstrap stale state, missing indexes, finalize without token.

---

## Firestore Checklist

| Collection | Rules | Indexes | Written by scorer |
|------------|-------|---------|-------------------|
| matches | ✅ | auto | ✅ |
| innings | ✅ | matchId + inningsNumber | ✅ |
| balls | ✅ | inningsId + sequence | ✅ |
| commentary | ✅ | matchId + timestamp | ✅ |
| ballAudit | ✅ | matchId + timestamp | ✅ |
| pointsTable | admin only | auto | finalize API |
| leaderboards | admin only | auto | finalize API |
| scoreboard | ✅ | — | ❌ unused |

**Deploy required:** `npm run firebase:deploy:rules`

---

## Test Results

```
✓ tests/innings-metrics.test.ts (1 test)
✓ tests/scoring-engine.test.ts (3 tests)
✓ tests/manual-finalize.test.ts (4 tests)
✓ npm run build — success
```

---

## Manual QA Checklist (post-deploy)

1. Publish Firestore rules + indexes  
2. Admin → Start R1 match → set striker/non-striker/bowler  
3. Score dot, 1, 4, wide, wicket — verify scoreboard + live page update without refresh  
4. Undo last ball — verify rollback  
5. Complete innings 1 — verify second innings starts with **other** team batting  
6. Complete match — verify standings + fixture status `completed`  
7. **Manual Finalize** — if auto-finalize fails, use admin **Finalize Match** button  
8. **Ball correction** — edit a recent delivery with reason; verify audit history shows before → after  
9. Mobile scorer — same flow with Google sign-in  
10. Open debug panel — confirm listener status, no validation errors  

---

## Recommended Next Steps

1. Deploy Firestore rules + indexes to production  
2. Set Vercel env: `ADMIN_EMAILS`, `FIREBASE_SERVICE_ACCOUNT_JSON`  
3. Protect `/api/seed` with admin auth  
4. Implement dead ball / redo if required for tournament rules  

---

## Confirmation

**Live scoring path is fixed in code** and production build passes. Manual finalize and ball correction audit trail are implemented for tournament-day safety. End-to-end behavior in production depends on Firestore rules/indexes being **Enabled** and Vercel deploying this commit.
