# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Local buyers in Philadelphia and Bucks County**, drawn to the color, the vibrancy and the affordable prices.
- **Friends and family** who follow her work and buy or share pieces.
- **Impulse shoppers** who see something joyful and want to bring it home.

Their job: look through Marita's newest and favorite work, find a piece they like, and buy it on Etsy.

## Product Purpose

Marita McVeigh's website: a gallery of her artwork that copies itself from her Etsy shop (artworkbymarita) and sends every sale to Etsy. Etsy stays the only place listings are edited and the only place checkout and shipping happen; the site shows the work and hands visitors to the right Etsy listing.

Success: a visitor enjoys the work, finds a piece, and reaches its Etsy listing with no friction; new work appears on the site without anyone touching it.

## Positioning

Joyful, colorful paintings and prints by a regular person who simply loves making art, priced so anyone can bring one home (brand guide, Oct 2026). Marita found art in her 30s after watching Bill Alexander paint on TV and has never stopped learning; oil painting is home base and flowers are her favorite subject.

## Operating Context

- **Daily Etsy sync:** a GitHub Action ("Sync from Etsy") reads her shop every morning and rewrites `data/products.json` and `images/`. Cloudflare Pages republishes the site a minute later. Rules for sorting pieces into sections and subjects live in `data/etsy-sync.json`.
- **Upkeep:** Ed (her son) maintains the code and design. Marita does not edit the site; listings only change on Etsy.
- **Hosting:** static site on Cloudflare Pages, live at artworkbymarita-site.pages.dev. Every pushed branch gets its own preview address.

## Capabilities and Constraints

- **Sections:** Paintings, Cyanotypes, Printmaking, Prints, Gifts, each with subject filters (Florals, Leaves, Landscapes, Beach, Bucks County). Plus a front page, a What's new page, About, Contact, Privacy, and a Sold gallery of originals that have sold.
- **Pieces:** each has its own page with photos and "Buy on Etsy" buttons; several Etsy listings of the same piece merge into one page with a button per option. Originals and prints of the same piece link to each other.
- **Sold originals** move to the Sold gallery; their prices stay hidden (decided with Marita).
- **Etsy data is never hand-edited** except to fix a name, section or subject, and those fixes are marked so the sync leaves them alone (see README.md).
- **Folders:** `images/` belongs to the sync, which deletes any folder in it that no product uses, except `images/about/`. Site photos go in `images/about/`.
- **Required notice:** the footer carries the notice Etsy requires of sites using its API. Keep it.
- **Stack:** plain static HTML, CSS and JavaScript (`index.html`, `assets/site.js`, `assets/style.css`, `config.js`); no build step.
- **Undecided:** the contact email (`contactEmail` in `config.js` is empty, so the site points to Etsy messages); whether to bring back the artworkbymarita.com domain, which is currently offline.

## Brand Commitments

- **Name:** Marita McVeigh. Etsy shop: artworkbymarita.
- **Voice:** the site speaks as Marita, in first person: warm and chatty, in short, plain sentences, the way she talks. Friendly, not salesy; plain, not arty; bright, not deep. Words to use: joyful, color, flowers, new, bloom, learning, made by hand. Avoid anything dark, political or "deep", art jargon, and sales talk. Do: "Here's what I've been painting lately." Don't: "Shop our exclusive collection today!"
- **Quote:** "I like painting the joyful part of life, with a lot of colors."
- **Artwork is always shown whole, never cropped.** Studio photos may be cropped.
- **Brand guide:** `../BrandGuide/` (outside this repo; Figma file MaritaBrandGuide) is the authority for the logo, badge, colors and type.
- **Logo and badge:** the tulip lockup; the simplified tulip badge is only for icons under 96px, the full outline badge for 96px and up.

## Evidence on Hand

- **Artwork:** every listing in her Etsy shop, synced to `data/products.json` and `images/` (about 160 pieces for sale as of Nov 2026).
- **Studio photos:** `images/about/` (Marita at her easel; her gloved hand painting).
- **Her story:** her Fine Art America bio (fineartamerica.com/profiles/marita-mcveigh) lists classes taught, a 2012 Associate's in Fine Arts from Montgomery County Community College, memberships, and local exhibitions; a copy is in `../Before screenshots/fine-art-america/`. The About page text is in `data/about.html`.
- **Links:** Etsy, Instagram (@marita1112), Facebook (facebook.com/marita.mcveigh), Fine Art America, all in `config.js`.
- **Absent, never to fabricate:** customer testimonials, reviews, press, sales figures, awards, or prices beyond what Etsy reports.

## Product Principles

1. **Etsy is the source of truth.** The site never duplicates checkout, inventory or listing edits; it shows the work and hands off to Etsy.
2. **The art leads.** Pieces appear whole and come first; the site around them stays out of the way.
3. **It sounds like Marita.** Warm, plain, first person, never a sales pitch.
4. **It runs on its own.** New work arrives through the daily sync; nothing should need Marita, or regular hand edits, to stay current.
5. **Approachable, not exclusive.** Affordable, joyful art for anyone; nothing that makes buying art feel intimidating.
