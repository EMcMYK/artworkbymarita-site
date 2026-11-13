# Marita McVeigh's website

A storefront for Marita McVeigh's artwork that copies itself from her Etsy shop,
[artworkbymarita](https://www.etsy.com/shop/artworkbymarita). Etsy stays the only place anything is
edited. Every piece has "Buy on Etsy" buttons, so checkout and shipping stay on Etsy. Hosting is free
on Cloudflare Pages.

## How it works

1. Every morning, GitHub runs **Sync from Etsy** (`.github/workflows/etsy-sync.yml`). It reads her
   Etsy shop and updates `data/products.json` and the photos in `images/`. It never changes anything
   on Etsy.
2. The sync saves its changes to this repo, and Cloudflare Pages republishes the site a minute later.
3. The site (`index.html`, `assets/site.js`) shows whatever is in `data/products.json`.

To sync right away: GitHub → **Actions** → **Sync from Etsy** → **Run workflow**. Each run's page
lists what was added, merged, updated, sold or hidden.

## What's in this folder

| File | What it is | Do you edit it? |
|---|---|---|
| `config.js` | Her name, tagline, links, contact email, menu sections, subject filters, Sold gallery on or off | Sometimes |
| `data/products.json` | Every piece on the site (the sync writes this) | Only to fix a name, section or subject |
| `data/etsy-sync.json` | The sync's rules: which words put a piece in which section or subject, merges, safety stops | To fix sorting |
| `data/about.html`, `data/privacy.html` | The About and Privacy pages | Yes, the words |
| `images/` | Photos (the sync saves product photos here, each with a smaller `-small.jpg` copy for cards and thumbnails; About photos go in `images/about/`) | About photos only |
| `assets/og-image.png` | The picture shown when someone texts or posts a link to the site (1200×630; the tags are in `index.html`) | Only to change it |
| `assets/style.css` | Colors and fonts (tokens at the top) | Only to change the look |
| `assets/site.js` | Draws the pages | No |
| `scripts/etsy-sync.mjs` | The sync | No |
| `scripts/etsy-sync.test.mjs` | Tests for the sync, run before every sync | No |

## What the sync decides, and how to fix it

All the rules are in `data/etsy-sync.json`. After changing a rule, run the workflow with
**re-sort** ticked (Actions → Sync from Etsy → Run workflow) so pieces already on the site follow it.

- **Menu section** (Paintings, Cyanotypes, Printmaking, Prints, Gifts), from the first match, in order:
  1. `titleRules`: words in the Etsy title ("cyanotype", "linocut", "ornament", "print"…)
  2. `tagRules`: cyanotype or printmaking words in the Etsy tags
  3. `sectionCategories`: her Etsy shop section ("Original Linocuts" → Printmaking). A new Etsy
     section goes here too.
  4. `fallbackRules`: painting words anywhere, then `defaultCategory`

  A piece in the Paintings section that isn't a print counts as an original, so it moves to the
  Sold gallery when it sells.
- **Original or print** (checked every run, not only for new pieces), from the first match:
  1. `kinds`: by Etsy listing id, `"original"`, `"print"`, or `"both"` when one listing sells the
     original and prints as options (the site says "Original or print").
  2. Words in the title: "original"; or "print", "giclee", "poster", "matte canvas"… for a print.
  3. A painting not called a print is an original.
  4. A description that says "original" and never mentions a print.
  Add `"kind"` to a piece's `"siteOnly"` to keep a hand fix.
- **Subject filters** (Florals, Leaves, Landscapes, Beach, Bucks County): every subject in
  `subjectRules` whose words appear in the title, tags or shop section.
- **Fixing one piece by hand:** edit its `"category"` or `"subjects"` in `data/products.json`, and add
  `"siteOnly": ["category", "subjects"]` to it so a re-sort leaves your fix alone. Its `"name"` can
  be edited freely; the sync never renames a piece.
- **Merging:** listings with the same title once sizes and words like "matted" are taken out become
  one piece with one "Buy on Etsy" button per listing. Originals and prints of the same piece stay
  separate, and link to each other. To join a listing to a piece by hand, add
  `"<etsy listing id>": "<product id>"` to `merge`. To stop a listing merging, add its id to
  `keepSeparate`. (A wrong merge already made: delete that option from the piece in
  `data/products.json` and add its id to `keepSeparate`; the next sync adds it on its own.)
- **Sold and gone:** the sync asks Etsy why each missing listing left. Only a listing that sold
  is marked sold and moves to the Sold gallery. One that expired, was deactivated or was deleted
  is hidden, however many go at once. Both come back if the listing returns. Turn the Sold gallery
  or its prices on or off in `config.js`.
- **Safety stop:** more than `maxNewPerRun` new listings in one run changes nothing and fails the
  run, and GitHub emails you. If it's right (a big batch of new work), raise the number and run
  again. A run with an empty products list imports the whole shop, reusing
  any photos already saved.

## Setup (one time)

1. **Etsy key:** GitHub → this repo → Settings → Secrets and variables → Actions: `ETSY_API_KEY`
   and `ETSY_SHARED_SECRET` (the same Etsy app as the ed.mcveigh shop).
2. **Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git → `artworkbymarita-site`.
   Framework preset: None. Build command: leave empty. Build output directory: `/`.
3. Run **Sync from Etsy** once by hand. The first run downloads every photo, so it takes a while.

## Etsy sign-in (reads listing options)

Some listings sell the original and prints as Etsy options ("Original 11x14 mat", "Print 8x10 mat").
Etsy only shares options with Marita's permission. With it, the sync knows for certain whether a
listing sells the original, prints or both, and when the original sells it moves to the Sold gallery
while the prints stay for sale. Without it, the `kinds` rule and the title words decide.

It's read-only (Etsy permission `listings_r`): it can't change anything in her shop.

**One time (about 15 minutes):**
1. **Etsy app:** etsy.com/developers/your-apps → the app → add this callback URL exactly:
   `https://artworkbymarita-site.pages.dev/etsy-signin/`
2. **GitHub token so the sync can keep the sign-in fresh:** github.com → your picture → Settings →
   Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
   Name it "Etsy sync sign-in", expiration 1 year, Repository access: only `artworkbymarita-site`,
   Repository permissions → Secrets: Read and write. Copy it, then in the repo: Settings → Secrets and
   variables → Actions → New repository secret, name `GH_SECRETS_TOKEN`, paste, Add secret.
3. **Sign-in:** in Terminal, in this folder, run `node scripts/etsy-signin.mjs`. Type the Etsy keystring
   and shared secret when asked (hidden). It copies a short link: text it to Marita. She taps it on her
   phone (already signed in to Etsy), taps Allow access, then taps "Copy the code" and texts it back.
   Paste it into Terminal within a few minutes. It checks it's the artworkbymarita shop and saves `ETSY_REFRESH_TOKEN` to GitHub.
4. **Check:** Actions → Sync from Etsy → Run workflow. The run's summary should say
   "Etsy listing options: read for N of N listings with options".

**Upkeep:** the sync renews the sign-in every morning. If a run's summary says "Etsy sign-in: … redo
the sign-in", run step 3 again. The GitHub token from step 2 expires after a year: make a new one the
same way and replace the `GH_SECRETS_TOKEN` secret (GitHub emails a reminder before it expires).

## Etsy's terms

The footer carries the notice Etsy requires of sites that use its API. Keep it.
