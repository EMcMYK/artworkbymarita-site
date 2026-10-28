/*
  Etsy → website. Run by .github/workflows/etsy-sync.yml every morning, and whenever you press
  "Run workflow" on GitHub's Actions tab. Etsy stays the only place anything is edited.

  It only READS Mom's Etsy shop (artworkbymarita). It never changes anything on Etsy.

  • New Etsy listings are added: photos (saved into images/<product-id>/), description, tags, price,
    and a "Buy on Etsy" link.
  • The same piece listed more than once (the same print in two sizes, a plain and a matted
    version) becomes ONE product with one "Buy on Etsy" button per listing. Listings are matched by
    their title with sizes and words like "matted" taken out. Originals and prints of the same piece
    stay separate products. To force a match or a split, see "merge" and "keepSeparate" in
    data/etsy-sync.json.
  • Each product gets a menu section (Paintings, Cyanotypes, Printmaking, Prints, Gifts) from, in
    order: words in its Etsy title, words in its tags, its Etsy shop section, then painting words
    anywhere. Subject filters (Florals, Leaves…) come from words in its title, tags and section. The
    rules are in data/etsy-sync.json. After changing them, run the workflow with "re-sort" ticked to
    apply them to pieces already on the site.
  • Products already on the site take Etsy's description, tags, prices and photos whenever those
    change. The site's own product name, section and subjects stay as they are once set, so a fix
    you make in data/products.json sticks.
  • When a listing leaves Etsy, Etsy says why. Only a listing that SOLD (Etsy: "sold_out") is
    marked Sold and kept for the Sold gallery. One that expired, was deactivated or was deleted is
    hidden, however many go at once. Either comes back by itself if the listing returns.
  • Safety stop: more than "maxNewPerRun" new listings in one run changes nothing and fails the run
    (GitHub emails you). The very first run (an empty products.json) imports the whole shop.

  Keys (GitHub → Settings → Secrets and variables → Actions): ETSY_API_KEY, ETSY_SHARED_SECRET.
*/
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const API = process.env.ETSY_API_BASE || "https://openapi.etsy.com/v3/application";

export async function sync({ root = process.cwd(), fetch = globalThis.fetch, today = new Date(), log = console.log, pause = Number(process.env.ETSY_PAUSE_MS ?? 120), resort = process.env.SYNC_RESORT === "true" } = {}) {
  const key = process.env.ETSY_API_KEY, secret = process.env.ETSY_SHARED_SECRET;
  if (!key || !secret) throw new Error("Missing ETSY_API_KEY or ETSY_SHARED_SECRET (add them under GitHub → Settings → Secrets and variables → Actions).");
  const headers = { "x-api-key": `${key}:${secret}`, accept: "application/json" };
  const wait = () => pause ? new Promise((r) => setTimeout(r, pause)) : null;
  const etsy = async (p, { optional = false } = {}) => {
    await wait();
    const res = await fetch(API + p, { headers });
    if (!res.ok) {
      const msg = `Etsy said ${res.status} for ${p}: ${(await res.text()).slice(0, 200)}`;
      if (optional) { log(msg); return null; }
      throw new Error(msg);
    }
    return res.json();
  };

  const productsPath = path.join(root, "data/products.json");
  const data = JSON.parse(await readFile(productsPath, "utf8"));
  const settings = JSON.parse(await readFile(path.join(root, "data/etsy-sync.json"), "utf8"));
  const products = data.products || (data.products = []);
  const day = today.toISOString().slice(0, 10);
  const firstRun = products.length === 0;
  const report = { added: [], merged: [], updated: [], sold: [], hidden: [], back: [], skipped: [], problems: [] };

  // Every listing the site already knows, and the product option it belongs to.
  const byListing = new Map();
  for (const p of products) for (const o of p.options || []) byListing.set(String(o.etsyListingId), { p, o });
  const ignored = new Set((settings.ignoreListingIds || []).map(String));

  // 1. The shop, its sections and every active listing.
  const shops = await etsy(`/shops?shop_name=${encodeURIComponent(settings.shopName)}`);
  const shopId = shops.results?.[0]?.shop_id;
  if (!shopId) throw new Error(`Couldn't find the Etsy shop "${settings.shopName}".`);
  const sections = new Map(((await etsy(`/shops/${shopId}/sections`, { optional: true }))?.results || [])
    .map((s) => [String(s.shop_section_id), decode(s.title)]));
  const listings = [];
  for (let offset = 0; ; offset += 100) {
    const page = await etsy(`/shops/${shopId}/listings/active?limit=100&offset=${offset}`);
    listings.push(...(page.results || []));
    if ((page.results || []).length < 100) break;
  }
  log(`Etsy: ${listings.length} active listings; the site knows ${byListing.size}`);
  if (!listings.length && byListing.size) throw new Error("Etsy returned no active listings at all, so nothing was changed.");
  const active = new Map(listings.map((l) => [String(l.listing_id), l]));

  // 2. New listings.
  const fresh = listings.filter((l) => {
    const id = String(l.listing_id);
    if (byListing.has(id) || ignored.has(id)) return false;
    const title = decode(l.title);
    if ((settings.skipTitles || []).some((t) => title.toLowerCase().startsWith(t.toLowerCase()))) { report.skipped.push(title); return false; }
    return true;
  });
  const maxNew = settings.maxNewPerRun ?? 10;
  if (!firstRun && fresh.length > maxNew) {
    throw new Error(`Found ${fresh.length} new Etsy listings in one run (the limit is ${maxNew}), so nothing was changed. ` +
      `If they really are all new, raise "maxNewPerRun" in data/etsy-sync.json and run again. New: ${fresh.map((l) => decode(l.title)).join(" | ")}`);
  }

  // Earlier syncs marked any original that left Etsy as sold. Only a sale counts now: an original
  // that expired, was deactivated or was deleted is hidden instead.
  for (const p of products) {
    const whys = (p.options || []).map((o) => o.goneWhy).filter(Boolean);
    if (p.soldOut && whys.length && !whys.includes("sold_out")) {
      delete p.soldOut; delete p.soldOn; p.hidden = true;
      report.hidden.push(`${p.name} (${whys.join(", ")} on Etsy, not sold)`);
    }
  }

  // 3. Listings that left Etsy, each checked one by one, so Etsy says why: sold, expired, deactivated
  //    or deleted. Any number may go at once (Marita sometimes takes down or lets expire a batch).
  const gone = [];
  for (const [lid, { p, o }] of byListing) {
    if (active.has(lid) || o.available === false || ignored.has(lid)) continue;
    await wait();
    const res = await fetch(`${API}/listings/${lid}`, { headers });
    if (res.status === 404) { gone.push({ p, o, why: "removed" }); continue; }
    if (!res.ok) { report.problems.push(`${p.name}: couldn't check Etsy listing ${lid} (${res.status}), left as is.`); continue; }
    const l = await res.json();
    if (l.state !== "active" || Number(l.quantity) < 1) gone.push({ p, o, why: l.state || "inactive" });
    else active.set(lid, l); // still active (missed by paging): update it like any other
  }
  for (const { o, why } of gone) { o.available = false; o.goneOn = day; o.goneWhy = why; }
  for (const p of new Set(gone.map((g) => g.p))) {
    if ((p.options || []).some((o) => o.available !== false)) { report.updated.push(`${p.name}: an option left Etsy`); continue; }
    const whys = gone.filter((g) => g.p === p).map((g) => g.why);
    if (whys.includes("sold_out")) { p.soldOut = true; p.soldOn = day; report.sold.push(p.name); }
    else { p.hidden = true; report.hidden.push(`${p.name} (${whys.join(", ")} on Etsy)`); }
  }

  // 4. Listings already on the site: Etsy's description, tags, price, link and photos.
  for (const [lid, l] of active) {
    const hit = byListing.get(lid);
    if (!hit) continue;
    const { p, o } = hit;
    const changed = [];
    const keep = new Set(p.siteOnly || []);
    const price = money(l.price);
    if (o.price !== price) { o.price = price; changed.push("price"); }
    if (l.url && o.url !== cleanUrl(l.url)) { o.url = cleanUrl(l.url); changed.push("link"); }
    const fromVariations = Boolean(l.has_variations);
    if (Boolean(o.hasVariations) !== fromVariations) { o.hasVariations = fromVariations; changed.push("options"); }
    if (o.available === false) {
      o.available = true; delete o.goneOn; delete o.goneWhy;
      if (p.soldOut || p.hidden) { delete p.soldOut; delete p.soldOn; delete p.hidden; report.back.push(p.name); }
    }
    const lead = p.options[0] === o;
    if (lead) {
      if (p.etsyTitle !== decode(l.title)) p.etsyTitle = decode(l.title); // kept for re-sorting; the site name stays
      const description = paragraphs(l.description);
      if (!keep.has("description") && description.length && JSON.stringify(p.description) !== JSON.stringify(description)) { p.description = description; changed.push("description"); }
      const tags = (l.tags || []).map(decode);
      if (!keep.has("tags") && JSON.stringify(p.tags || []) !== JSON.stringify(tags)) { p.tags = tags; changed.push("tags"); }
      if (!keep.has("size")) { const size = sizeFrom(decode(l.title) + "\n" + description.join("\n")); if (size && size !== p.size) { p.size = size; changed.push("size"); } }
      if (!keep.has("photos")) {
        const images = await etsy(`/listings/${lid}/images`, { optional: true });
        const want = (images?.results || []).slice().sort((a, b) => a.rank - b.rank).slice(0, settings.maxPhotos || 10);
        if (want.length) {
          const wantPaths = want.map((img) => `images/${p.id}/${img.listing_image_id}.jpg`);
          if (JSON.stringify(p.images) !== JSON.stringify(wantPaths)) {
            const have = new Set(await readdir(path.join(root, "images", p.id)).catch(() => []));
            const missing = want.filter((img) => !have.has(`${img.listing_image_id}.jpg`));
            const got = await savePhotos(root, p.id, missing, fetch, log);
            if (got.length === missing.length) {
              for (const f of have) if (!wantPaths.includes(`images/${p.id}/${f}`)) await rm(path.join(root, "images", p.id, f));
              p.images = wantPaths; changed.push("photos");
            } else report.problems.push(`${p.name}: some new photos didn't download, kept the current ones. It tries again next run.`);
          }
        } else if (images) report.problems.push(`${p.name}: Etsy returned no photos, kept the current ones.`);
      }
    }
    if (changed.length) report.updated.push(`${p.name}: ${changed.join(", ")}`);
  }

  // 5. New listings: join a matching product (another size of the same piece) or start a new one.
  const forced = Object.fromEntries(Object.entries(settings.merge || {}).map(([k, v]) => [String(k), v]));
  const separate = new Set((settings.keepSeparate || []).map(String));
  // oldest first, so the first listing of a piece leads its product
  fresh.sort((a, b) => (a.original_creation_timestamp || a.created_timestamp || 0) - (b.original_creation_timestamp || b.created_timestamp || 0));
  for (const l of fresh) {
    const lid = String(l.listing_id);
    const title = decode(l.title);
    const section = sections.get(String(l.shop_section_id)) || "";
    const description = paragraphs(l.description);
    const tags = (l.tags || []).map(decode);
    const category = categoryFor(title, tags, section, settings);
    // a painting not called a print is an original, even when its title doesn't say "original"
    const kind = kindOf(title) === "other" && category === "paintings" ? "original" : kindOf(title);
    const key = mergeKey(title);
    const mkey = key ? `${kind}:${key}` : `${kind}:#${lid}`; // a title of only generic words never merges
    const option = {
      title,
      label: optionLabel(title, description.join("\n")),
      price: money(l.price),
      etsyListingId: Number(l.listing_id),
      url: cleanUrl(l.url || `https://www.etsy.com/listing/${lid}`),
      ...(l.has_variations ? { hasVariations: true } : {}),
    };
    let target = forced[lid] ? products.find((p) => p.id === forced[lid]) : null;
    if (!target && !separate.has(lid)) target = products.find((p) => p.mergeKey === mkey && !p.options.some((o) => separate.has(String(o.etsyListingId))));
    if (target) {
      target.options.push(option);
      if (target.hidden || target.soldOut) { delete target.hidden; delete target.soldOut; delete target.soldOn; }
      byListing.set(lid, { p: target, o: option });
      report.merged.push(`${title} → joins "${target.name}"`);
      continue;
    }

    const name = displayName(title);
    const id = uniqueId(name, products);
    const images = await etsy(`/listings/${lid}/images`, { optional: true });
    const photos = await savePhotos(root, id, (images?.results || []).slice().sort((a, b) => a.rank - b.rank).slice(0, settings.maxPhotos || 10), fetch, log);
    if (!photos.length) { report.problems.push(`${title}: no photos came back from Etsy, so it wasn't added. It tries again next run.`); continue; }
    const p = {
      id,
      name,
      category,
      subjects: subjectsFor(title, tags, section, settings),
      kind,
      oneOfAKind: kind === "original" && Number(l.quantity) <= 1,
      size: sizeFrom(title + "\n" + description.join("\n")),
      images: photos,
      options: [option],
      description,
      tags,
      etsySection: section,
      etsyTitle: title,
      listedOn: new Date(((l.original_creation_timestamp || l.created_timestamp || today.getTime() / 1000)) * 1000).toISOString().slice(0, 10),
      mergeKey: mkey,
    };
    if (!p.size) delete p.size;
    products.push(p);
    byListing.set(lid, { p, o: option });
    report.added.push(`${name} → ${category}${p.subjects.length ? ` (${p.subjects.join(", ")})` : ""}`);
  }

  // 6. Re-sort (Run workflow with "re-sort" ticked): section and subjects again from today's rules.
  //    A product keeps a hand-made fix if its "siteOnly" list names "category" or "subjects".
  if (resort) {
    for (const p of products) {
      if (!p.etsyTitle) continue;
      const keep = new Set(p.siteOnly || []), was = `${p.category} ${JSON.stringify(p.subjects)}`;
      if (!keep.has("category")) p.category = categoryFor(p.etsyTitle, p.tags || [], p.etsySection || "", settings);
      if (!keep.has("subjects")) p.subjects = subjectsFor(p.etsyTitle, p.tags || [], p.etsySection || "", settings);
      if (was !== `${p.category} ${JSON.stringify(p.subjects)}`) report.updated.push(`${p.name}: re-sorted to ${p.category}${p.subjects.length ? ` (${p.subjects.join(", ")})` : ""}`);
    }
  }

  // Cheapest buy button first; a product's options keep their order otherwise.
  for (const p of products) if (p.options.length > 1) p.options.sort((a, b) => (a.available === false) - (b.available === false) || a.price - b.price);

  await writeFile(productsPath, JSON.stringify(data, null, 2) + "\n");

  // Photo folders no product uses anymore (images/about stays).
  const used = new Set(products.map((p) => p.id));
  for (const dir of await readdir(path.join(root, "images"), { withFileTypes: true }).catch(() => [])) {
    if (dir.isDirectory() && dir.name !== "about" && !used.has(dir.name)) await rm(path.join(root, "images", dir.name), { recursive: true });
  }
  return report;
}

// ---------- matching and sorting ----------

const SIZE = /\b\d+(?:\.\d+)?\s*(?:["”″]|in(?:ch(?:es)?)?\.?)?\s*(?:x|×|by)\s*\d+(?:\.\d+)?\s*(?:["”″]|in(?:ch(?:es)?)?\.?)?/i;

// "original", "print" or "other": originals and prints of the same piece stay separate products.
export function kindOf(title) {
  if (/\boriginal\b/i.test(title)) return "original";
  if (/\b(prints?|giclee|giclée|reproduction|matted)\b/i.test(title)) return "print";
  return "other";
}

// The piece's name with sizes, version words and the kind taken out, for matching listings.
export function mergeKey(title) {
  return shortName(decode(title)).toLowerCase()
    .replace(new RegExp(SIZE.source, "gi"), " ")
    .replace(/\b(original|signed|matted|framed|unframed|mat|prints?|giclee|giclée|reproduction|fine art|art|small|medium|large|mini|wall|with|classic|premium|matte|glossy|canvas|paper|posters?|size|decor|vertical|horizontal)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

// The product's name on the site: the start of the Etsy title, without a size.
export function displayName(title) {
  const n = shortName(decode(title)).replace(new RegExp(`\\s*[-–(]?\\s*${SIZE.source}\\s*\\)?`, "i"), "").replace(/\s{2,}/g, " ").trim();
  return n.length >= 3 ? n : shortName(decode(title));
}

// What a "Buy on Etsy" button says when a product has several: its size, and "matted" or "framed".
export function optionLabel(title, description = "") {
  const t = decode(title);
  const size = (t.match(SIZE) || String(description).match(SIZE) || [""])[0];
  const extra = /\bmatted\b/i.test(t) ? "matted" : /\bframed\b/i.test(t) && !/\bunframed\b/i.test(t) ? "framed" : "";
  const nice = size ? size.replace(/\s*(?:x|×|by)\s*/i, " × ").replace(/\s*(?:["”″]|in(?:ch(?:es)?)?\.?)/gi, "").trim() + "\"" : "";
  const kind = kindOf(t);
  const base = kind === "original" ? "Original" : kind === "print" ? "Print" : "";
  return [base, nice, extra].filter(Boolean).join(", ").replace(/^, /, "") || "Buy";
}

// Menu section, from the strongest clue to the weakest: words in the title, words in the tags,
// the Etsy shop section, then painting words anywhere. (Rules: data/etsy-sync.json.)
export function categoryFor(title, tags, section, settings) {
  const first = (rules, text) => { for (const [pattern, cat] of rules || []) if (new RegExp(pattern, "i").test(text)) return cat; return ""; };
  const tagText = (tags || []).join(" | ");
  const sections = Object.entries(settings.sectionCategories || {});
  const bySection = section && ((sections.find(([k]) => k.toLowerCase() === section.toLowerCase()) ||
    sections.find(([k]) => section.toLowerCase().includes(k.toLowerCase())) || [])[1]);
  return first(settings.titleRules, title) || first(settings.tagRules, tagText) || bySection ||
    first(settings.fallbackRules, `${title} | ${tagText}`) || settings.defaultCategory || "paintings";
}

export function subjectsFor(title, tags, section, settings) {
  const text = [title, section, (tags || []).join(" | ")].join(" | ");
  return Object.entries(settings.subjectRules || {}).filter(([, pattern]) => new RegExp(pattern, "i").test(text)).map(([s]) => s);
}

// ---------- helpers ----------

export function decode(s) {
  return String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function paragraphs(text) {
  return decode(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((s) => s.replace(/[ \t]+\n/g, "\n").trim()).filter(Boolean);
}

function money(price) { return price ? Math.round((price.amount / price.divisor) * 100) / 100 : 0; }

function cleanUrl(u) { return String(u).split("?")[0]; }

export function sizeFrom(text) {
  const m = String(text).match(SIZE);
  return m ? m[0].replace(/\s*(?:x|×|by)\s*/i, " × ").replace(/\s*(?:["”″]|in(?:ch(?:es)?)?\.?)/gi, "").trim() + " in" : "";
}

const GENERIC = /^(?:(?:classic|premium|matte|glossy|canvas|paper|posters?|fine|art|prints?|framed|size|wall|decor|vertical|horizontal|giclee|original)\s*)+$/i;
export function shortName(title) {
  const parts = String(title).split(/\s*[,|]\s*/).map((x) => x.trim()).filter(Boolean);
  let short = parts[0] || "";
  if (GENERIC.test(short) && parts[1]) short = `${short}, ${parts[1]}`;
  return short.length >= 3 ? short : String(title);
}

function slug(s) { return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function uniqueId(name, products) {
  const base = slug(name).slice(0, 60) || "item";
  let id = base, n = 2;
  while (products.some((p) => p.id === id) || ["paintings", "cyanotypes", "printmaking", "prints", "gifts", "sold", "about", "contact", "privacy"].includes(id)) id = `${base}-${n++}`;
  return id;
}

async function savePhotos(root, productId, images, fetch, log) {
  const kept = [];
  if (!images.length) return kept;
  const dir = path.join(root, "images", productId);
  await mkdir(dir, { recursive: true });
  for (const img of images) {
    const file = `${img.listing_image_id}.jpg`;
    if (await readFile(path.join(dir, file)).then(() => true, () => false)) { kept.push(`images/${productId}/${file}`); continue; }
    const urls = [String(img.url_fullxfull || "").replace("il_fullxfull", "il_794xN"), img.url_fullxfull, img.url_570xN].filter(Boolean);
    let ok = false;
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (res.ok) { await writeFile(path.join(dir, file), Buffer.from(await res.arrayBuffer())); ok = true; break; }
      } catch { /* try the next size */ }
    }
    if (ok) kept.push(`images/${productId}/${file}`);
    else log(`Couldn't download photo ${img.listing_image_id} for ${productId}`);
  }
  return kept;
}

// Run directly (GitHub Action): sync, then print a summary on the run's page.
if (import.meta.url === `file://${process.argv[1]}`) {
  let report;
  try {
    report = await sync();
  } catch (e) {
    // Show why it stopped as a red note on the run's page (and in the summary), not only deep in the log.
    const msg = String(e.message || e);
    console.log(`::error title=Etsy sync stopped::${msg.replace(/\r?\n/g, " ")}`);
    if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, `## Etsy sync stopped\n\n${msg}\n`, { flag: "a" });
    process.exit(1);
  }
  const list = (items) => items.length ? "\n  - " + items.join("\n  - ") : " none";
  const lines = [
    "## Etsy sync",
    `- Added:${list(report.added)}`,
    `- Joined an existing product (another size or version):${list(report.merged)}`,
    `- Updated from Etsy:${list(report.updated)}`,
    `- Marked sold (moved to the Sold gallery):${list(report.sold)}`,
    `- Hidden (expired, deactivated or deleted on Etsy):${list(report.hidden)}`,
    `- Back on the site:${list(report.back)}`,
    `- Skipped on purpose:${list(report.skipped)}`,
    ...report.problems.map((p) => `- ⚠️ ${p}`),
  ].join("\n");
  console.log(lines);
  if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, lines + "\n", { flag: "a" });
  await writeFile("data/etsy-sync-last.json", JSON.stringify({ ranAt: new Date().toISOString(), ...report }, null, 2) + "\n");
}
