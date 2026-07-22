#!/usr/bin/env node
/**
 * Quick check that Firebase env vars are present before deploy/seed.
 * Usage: npm run firebase:setup-check
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

const requiredPublic = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const vars = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const env = { ...process.env, ...loadEnvFile(envPath) };
let ok = true;

console.log("CCPL Firebase setup check\n");

if (!existsSync(envPath)) {
  console.log("⚠  .env.local not found — copy from .env.example");
  ok = false;
} else {
  console.log("✓  .env.local exists");
}

for (const key of requiredPublic) {
  const val = env[key];
  if (!val || val.startsWith("your_") || val.includes("your-project")) {
    console.log(`✗  ${key} — not set or still placeholder`);
    ok = false;
  } else {
    console.log(`✓  ${key}`);
  }
}

if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log("✓  FIREBASE_SERVICE_ACCOUNT_JSON (valid JSON)");
  } catch {
    console.log("✗  FIREBASE_SERVICE_ACCOUNT_JSON — invalid JSON");
    ok = false;
  }
} else {
  console.log("⚠  FIREBASE_SERVICE_ACCOUNT_JSON — missing (required for seed + admin bootstrap)");
}

if (env.ADMIN_EMAILS && !env.ADMIN_EMAILS.includes("your-google")) {
  console.log(`✓  ADMIN_EMAILS (${env.ADMIN_EMAILS.split(",").length} email(s))`);
} else {
  console.log("⚠  ADMIN_EMAILS — set your Google email for admin access");
}

if (existsSync(resolve(root, ".firebaserc"))) {
  console.log("✓  .firebaserc exists");
} else {
  console.log("⚠  .firebaserc missing — copy from .firebaserc.example");
}

console.log("");
if (ok) {
  console.log("Client Firebase config looks good.");
  console.log("Next: firebase login → npm run firebase:deploy:rules → npm run seed");
} else {
  console.log("Fix items above. See docs/FIREBASE_SETUP.md");
  process.exit(1);
}
