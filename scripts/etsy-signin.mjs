// One-time Etsy sign-in, so the daily sync can read each listing's options ("Original 11x14 mat",
// "Print 8x10 mat") and tell originals from prints for certain. README.md → "Etsy sign-in" has the steps.
//
// Run it on your computer from the website folder:   node scripts/etsy-signin.mjs
//
// What it does:
//   1. Asks for the Etsy app's keystring and shared secret (typing stays hidden; nothing is saved on disk).
//   2. Opens Etsy's "allow access" page. Marita signs in to HER Etsy account there and clicks Allow.
//      Etsy then shows a one-time code on artworkbymarita-site.pages.dev/etsy-signin/; paste it here.
//   3. Checks the sign-in belongs to the artworkbymarita shop and that listing options can be read.
//   4. Saves the sign-in to GitHub as the secret ETSY_REFRESH_TOKEN (with the GitHub CLI, `gh`).
//      The token is never printed. The sync renews it every morning.
//
// It only asks Etsy for "listings_r": permission to READ listings. It can't change anything in her shop.
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import readline from "node:readline";

const REDIRECT = "https://artworkbymarita-site.pages.dev/etsy-signin/";
const API = "https://openapi.etsy.com/v3/application";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

// Ask a question in the terminal; `hidden` keeps what you type off the screen (for keys).
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); });
  });
}
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const stop = (msg) => { console.error(`\nStopped: ${msg}\nNothing was saved. You can run it again.`); process.exit(1); };

const settings = JSON.parse(await readFile(new URL("../data/etsy-sync.json", import.meta.url), "utf8"));
console.log("Etsy sign-in for the website's daily sync (read-only access to listing options).\n");
const key = process.env.ETSY_API_KEY || await ask("Etsy app keystring (hidden): ", { hidden: true });
const secret = process.env.ETSY_SHARED_SECRET || await ask("Etsy app shared secret (hidden): ", { hidden: true });
if (!key || !secret) stop("the keystring and shared secret are both needed.");

// PKCE: a one-time secret (verifier) stays here; Etsy only sees its fingerprint (challenge).
const verifier = b64url(randomBytes(48));
const challenge = b64url(createHash("sha256").update(verifier).digest());
const state = b64url(randomBytes(8));
// Etsy's full link is too long for Messages to make tappable, so text her a short one: the sign-in page on
// her site turns it into Etsy's link (etsy-signin/index.html). The full link is the fallback.
const url = /^[A-Za-z0-9]+$/.test(key)
  ? `${REDIRECT}#go.${key}.${challenge}.${state}`
  : "https://www.etsy.com/oauth/connect?" + new URLSearchParams({
    response_type: "code", client_id: key, redirect_uri: REDIRECT, scope: "listings_r",
    state, code_challenge: challenge, code_challenge_method: "S256",
  });
let copied = false;
try { execFileSync("pbcopy", { input: url }); copied = true; } catch { /* not a Mac: copy it by hand */ }

console.log(`
Next: Marita signs in to HER Etsy account and taps "Allow access".
  • ${copied ? "The link is copied: paste it (Cmd+V) into a text to Marita." : "Text Marita this link:"}
    She taps it on her phone, where she's already signed in to Etsy.
    (Doing it on this Mac instead? Use a private window, so you're not signed in as yourself.)

${url}

  • After she taps Allow, a page shows a code. She taps "Copy the code" and texts it back.
    Paste it below. It only works for a few minutes, so keep this window open.
`);
const pasted = (await ask("Paste the code here: ")).replace(/\s+/g, "");
const [gotState, code] = pasted.includes(":") ? pasted.split(/:(.*)/s) : ["", pasted];
if (!code) stop("no code was pasted.");
if (gotState !== state) stop("that code is from a different sign-in. Start again and use the newest link.");

const headers = { "x-api-key": `${key}:${secret}`, accept: "application/json" };
const tokenRes = await fetch(TOKEN_URL, {
  method: "POST",
  headers: { ...headers, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "authorization_code", client_id: key, redirect_uri: REDIRECT, code, code_verifier: verifier }),
});
const token = await tokenRes.json().catch(() => ({}));
if (!tokenRes.ok || !token.access_token || !token.refresh_token) stop(`Etsy didn't accept the code (${tokenRes.status}: ${token.error_description || token.error || "no reason given"}).`);
const authed = { ...headers, authorization: `Bearer ${token.access_token}` };

// Make sure it's Marita's account, not whoever was signed in to Etsy in that browser. Etsy's tokens start
// with the id of the person who said yes ("12345678.abc…"); her shop's public record names its owner's id.
// (Asking Etsy "who am I" needs a permission this sign-in doesn't ask for, so it isn't used.)
const signedInAs = String(token.access_token).split(".")[0];
const found = await (await fetch(`${API}/shops?shop_name=${encodeURIComponent(settings.shopName)}`, { headers })).json().catch(() => ({}));
const shop = (found.results || []).find((s) => String(s.shop_name).toLowerCase() === String(settings.shopName).toLowerCase());
if (!shop) stop(`couldn't look up the ${settings.shopName} shop on Etsy (${found.error || "no shop with that name"}).`);
// If the shop record doesn't name its owner, ask Etsy which shop the signed-in person owns instead.
const owned = shop.user_id ? null
  : await (await fetch(`${API}/users/${signedInAs}/shops`, { headers })).json().catch(() => ({}));
if (owned ? String(owned.shop_id) !== String(shop.shop_id) : String(shop.user_id) !== signedInAs)
  stop(`the Etsy account that said yes isn't the owner of ${shop.shop_name}. Marita needs to be signed in to her own Etsy account when she taps Allow.`);
console.log(`\nSigned in as the owner of the ${shop.shop_name} shop.`);
const me = { shop_id: shop.shop_id };

// Try reading options on one listing that has them.
const active = await (await fetch(`${API}/shops/${me.shop_id}/listings/active?limit=100`, { headers })).json().catch(() => ({}));
const withOptions = (active.results || []).find((l) => l.has_variations);
if (withOptions) {
  const inv = await fetch(`${API}/listings/batch/inventory?listing_ids=${withOptions.listing_id}`, { headers: authed });
  console.log(inv.ok ? `Reading listing options works ("${withOptions.title.slice(0, 50)}").` : `Note: reading options said ${inv.status}; the sync will report it.`);
}

// Save to GitHub without showing it: the token goes to `gh` through stdin.
let repo;
try { repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { encoding: "utf8" }).trim(); }
catch { stop("the GitHub CLI (gh) isn't signed in here. Run `gh auth login` first."); }
await new Promise((resolve, reject) => {
  const gh = spawn("gh", ["secret", "set", "ETSY_REFRESH_TOKEN", "--repo", repo], { stdio: ["pipe", "ignore", "inherit"] });
  gh.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`gh exited with ${c}`))));
  gh.stdin.end(token.refresh_token);
}).catch((e) => stop(`couldn't save the secret to GitHub (${e.message}).`));
console.log(`Saved the sign-in to GitHub (${repo} → secret ETSY_REFRESH_TOKEN). Done!`);
process.exit(0);
