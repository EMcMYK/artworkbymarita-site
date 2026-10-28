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

## Etsy's terms

The footer carries the notice Etsy requires of sites that use its API. Keep it.
