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
| `images/` | Photos (the sync saves product photos here; About photos go in `images/about/`) | About photos only |
| `assets/style.css` | Colors and fonts (tokens at the top) | Only to change the look |
| `assets/site.js` | Draws the pages | No |
| `scripts/etsy-sync.mjs` | The sync | No |
| `scripts/etsy-sync.test.mjs` | Tests for the sync, run before every sync | No |

## What the sync decides, and how to fix it

- **Menu section** (Paintings, Cyanotypes, Printmaking, Prints, Gifts): from words in a new listing's
  Etsy title, shop section and tags, using `categoryRules` in `data/etsy-sync.json` (first match wins).
  To fix one piece, change its `"category"` in `data/products.json`; the sync keeps your change. To
  send a whole Etsy shop section somewhere, add it to `sectionCategories`, e.g.
  `"sectionCategories": { "Note Cards": "gifts" }`.
- **Subject filters** (Florals, Leaves, Landscapes, Beach, Bucks County): every subject whose words
  match the title, section or tags (`subjectRules`). Fix a piece by editing its `"subjects"` list.
- **Merging:** listings with the same title once sizes and words like "matted" are taken out become
  one piece with one "Buy on Etsy" button per listing. Originals and prints of the same piece stay
  separate, and link to each other. To join a listing to a piece by hand, add
  `"<etsy listing id>": "<product id>"` to `merge`. To stop a listing merging, add its id to
  `keepSeparate`. (A wrong merge already made: delete that option from the piece in
  `data/products.json` and add its id to `keepSeparate`; the next sync adds it on its own.)
- **Sold and gone:** when a one-of-a-kind original leaves Etsy, it's marked sold and moves to the
  Sold gallery. Any other listing that leaves Etsy is hidden. Both come back if the listing returns.
  Turn the Sold gallery or its prices on or off in `config.js`.
- **A piece's name:** the start of its Etsy title, without a size. Rename it in `data/products.json`.
- **Safety stops:** more than `maxNewPerRun` new listings or `maxGonePerRun` listings gone in one run
  changes nothing and fails the run, and GitHub emails you. If it's right (a big batch of new work),
  raise the number and run again. The first run, with an empty products list, imports everything.

## Setup (one time)

1. **Etsy key:** GitHub → this repo → Settings → Secrets and variables → Actions: `ETSY_API_KEY`
   and `ETSY_SHARED_SECRET` (the same Etsy app as the ed.mcveigh shop).
2. **Cloudflare Pages:** Workers & Pages → Create → Pages → Connect to Git → `artworkbymarita-site`.
   Framework preset: None. Build command: leave empty. Build output directory: `/`.
3. Run **Sync from Etsy** once by hand. The first run downloads every photo, so it takes a while.

## Etsy's terms

The footer carries the notice Etsy requires of sites that use its API. Keep it.
