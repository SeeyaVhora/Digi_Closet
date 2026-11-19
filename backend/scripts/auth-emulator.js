/**
 * Runs the Firebase Auth Emulator for local development with accounts that
 * survive restarts, crashes and closed terminals.
 *
 * The emulator only writes its data on a clean Ctrl+C, so accounts created
 * since the last clean stop used to vanish (and with them, logins). This
 * wrapper always starts from the saved data, then saves it every
 * SAVE_INTERVAL_MS and once more on exit. Because the running emulator always
 * began from the saved file, saving can't overwrite accounts with older data;
 * as a last guard it never replaces saved accounts with an empty set.
 *
 * Usage: npm run auth:start
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = 'demo-digi-closet';
const DATA_DIR = path.resolve(__dirname, '..', '..', 'emulator-data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'auth_export', 'accounts.json');
const AUTH_URL = 'http://127.0.0.1:9099';
const HUB_URL = 'http://127.0.0.1:4400';
const SAVE_INTERVAL_MS = 30 * 1000;

// Homebrew's OpenJDK isn't on PATH by default; the emulator needs Java.
const JAVA_BIN = '/opt/homebrew/opt/openjdk/bin';
const env = { ...process.env };
if (fs.existsSync(JAVA_BIN) && !env.PATH.split(':').includes(JAVA_BIN)) env.PATH = `${JAVA_BIN}:${env.PATH}`;

fs.mkdirSync(DATA_DIR, { recursive: true });

function savedAccountCount() {
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')).users?.length || 0;
  } catch {
    return 0;
  }
}

async function liveAccountCount() {
  const res = await fetch(`${AUTH_URL}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`account query failed (${res.status})`);
  return Number((await res.json()).recordsCount || 0);
}

let lastSaved = null;
async function save(reason) {
  try {
    const live = await liveAccountCount();
    const saved = savedAccountCount();
    if (live === 0 && saved > 0) {
      console.warn(`[auth-emulator] Not saving: emulator has 0 accounts but ${saved} are saved.`);
      return;
    }
    const res = await fetch(`${HUB_URL}/_admin/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: DATA_DIR, initiatedBy: 'digicloset-autosave' }),
    });
    if (!res.ok) throw new Error(`export failed (${res.status})`);
    if (live !== lastSaved) console.log(`[auth-emulator] Saved ${live} account(s) (${reason}).`);
    lastSaved = live;
  } catch (err) {
    // The emulator may still be starting or already stopping.
    if (reason !== 'startup') console.warn(`[auth-emulator] Save skipped: ${err.message}`);
  }
}

const args = [
  'emulators:start', '--only', 'auth', '--project', PROJECT,
  `--import=${DATA_DIR}`, `--export-on-exit=${DATA_DIR}`,
];
// --import needs an existing export; on the very first run there isn't one.
if (!fs.existsSync(path.join(DATA_DIR, 'firebase-export-metadata.json'))) args.splice(args.indexOf(`--import=${DATA_DIR}`), 1);

console.log(`[auth-emulator] Starting with ${savedAccountCount()} saved account(s) from ${DATA_DIR}`);
// Run from the project root (where firebase.json lives) so the emulator's
// firebase-debug.log isn't written inside backend/, where it would trigger
// nodemon restarts on every save.
const emulator = spawn('firebase', args, { env, stdio: 'inherit', cwd: path.resolve(__dirname, '..', '..') });

const timer = setInterval(() => save('autosave'), SAVE_INTERVAL_MS);

let stopping = false;
const stop = async (signal) => {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await save(`on ${signal}`);
  emulator.kill('SIGINT'); // lets the emulator run its own export-on-exit too
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGHUP', () => stop('SIGHUP')); // terminal window closed

emulator.on('exit', (code) => {
  clearInterval(timer);
  process.exit(code ?? 0);
});
