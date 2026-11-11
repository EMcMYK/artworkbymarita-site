// Tests for the Etsy sync, using a pretend Etsy (no keys or network needed).
// Run them with:  node --test scripts/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sync, mergeKey, kindOf, optionLabel, displayName, sizeFrom } from "./etsy-sync.mjs";

process.env.ETSY_API_KEY = "test"; process.env.ETSY_SHARED_SECRET = "test";
const API = "https://openapi.etsy.com/v3/application";
const price = (d) => ({ amount: Math.round(d * 100), divisor: 100, currency_code: "USD" });
let t = 1700000000;
const listing = (id, title, extra = {}) => ({
  listing_id: id, title, description: `About ${title}.\n\nSigned by the artist.`, tags: [], shop_section_id: 1,
  price: price(35), quantity: 5, state: "active", url: `https://www.etsy.com/listing/${id}/x?utm=1`,
  original_creation_timestamp: t++, ...extra,
});

// A pretend Etsy shop: `active` listings, plus `gone` ones answered on their own address.
function fakeEtsy(state) {
  return async (url) => {
    const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body), arrayBuffer: async () => new ArrayBuffer(8) });
    if (!url.startsWith(API)) return json({}); // a photo download
    const p = url.slice(API.length);
    if (p.startsWith("/shops?")) return json({ results: [{ shop_id: 99 }] });
    if (p === "/shops/99/sections") return json({ results: state.sections || [{ shop_section_id: 1, title: "Art" }] });
    if (p.startsWith("/shops/99/listings/active")) return json({ results: state.active });
    let m = p.match(/^\/listings\/(\d+)\/images$/);
    if (m) return json({ results: [{ listing_image_id: Number(m[1]) * 10, rank: 1, url_fullxfull: "https://i.etsystatic.com/x/il_fullxfull.1.jpg" }] });
    m = p.match(/^\/listings\/(\d+)$/);
    if (m) { const g = state.gone[m[1]]; return g ? json(g) : json({ error: "not found" }, 404); }
    return json({ error: "unknown " + p }, 404);
  };
}

async function site() {
  const root = await mkdtemp(path.join(tmpdir(), "abm-"));
  await mkdir(path.join(root, "data"));
  await cp(new URL("../data/etsy-sync.json", import.meta.url), path.join(root, "data/etsy-sync.json"));
  await writeFile(path.join(root, "data/products.json"), JSON.stringify({ products: [] }));
  return root;
}
const read = async (root) => JSON.parse(await readFile(path.join(root, "data/products.json"), "utf8")).products;
const run = (root, state) => sync({ root, fetch: fakeEtsy(state), log: () => {}, pause: 0 });

test("matching helpers", () => {
  assert.equal(kindOf("Color Playground Original Watercolor"), "original");
  assert.equal(kindOf("Golden Nature Cyanotype Matted Print"), "print");
  assert.equal(mergeKey("Golden Nature Cyanotype Print"), mergeKey("Golden Nature Cyanotype Matted Print"));
  assert.equal(mergeKey("Rose Cyanotype Print 8x10"), mergeKey("Rose Cyanotype Print 11x14, Botanical Wall Art"));
  assert.notEqual(mergeKey("Rose Cyanotype Print"), mergeKey("Peony Cyanotype Print"));
  assert.equal(optionLabel("Rose Cyanotype Print 11 x 14 in"), 'Print, 11 × 14"');
  assert.equal(optionLabel("Golden Nature Cyanotype Matted Print"), "Print, matted");
  assert.equal(displayName("Rose Cyanotype Print 8x10, Botanical Wall Art"), "Rose Cyanotype Print");
  assert.equal(sizeFrom('An 8" x 10" print in an 11x14 mat'), "8 × 10 in");
});

test("first run imports the whole shop, merges sizes and keeps originals apart", async () => {
  const root = await site();
  const active = [
    listing(1, "Color Playground Print", { description: "Print size 8x10 inches." }),
    listing(2, "Color Playground Print", { description: "Print size 11x14 inches.", price: price(45) }),
    listing(3, "Color Playground Original Watercolor", { quantity: 1, price: price(250) }),
    listing(4, "Golden Nature Cyanotype Print"),
    listing(5, "Golden Nature Cyanotype Matted Print", { price: price(45) }),
    listing(6, "Original Signed Etching - Laundry day", { quantity: 3 }),
    listing(7, "Down By The Seashore Original watercolor", { quantity: 1, tags: ["beach art", "ocean"] }),
    listing(8, "Original Oil Painting Black Eyed Susans Opening up.", { quantity: 1 }),
    listing(9, "Azalea And Grass Cyanotype Note Cards, Set of 4"),
    listing(10, "Washington Crossing Bucks County Landscape Print 5x7"),
    listing(11, "Bowl of Peonies Print 5x7"), listing(12, "Bowl of Peonies Print 8x10"), listing(13, "Bowl of Peonies Print 11x14"),
  ];
  const report = await run(root, { active, gone: {} });
  const products = await read(root);
  const by = (n) => products.find((p) => p.name === n);
  assert.equal(products.length, 9);
  assert.equal(report.merged.length, 4);
  assert.deepEqual(by("Color Playground Print").options.map((o) => o.price), [35, 45]);
  assert.equal(by("Color Playground Print").category, "prints");
  assert.equal(by("Color Playground Original Watercolor").category, "paintings");
  assert.equal(by("Color Playground Original Watercolor").oneOfAKind, true);
  assert.equal(by("Golden Nature Cyanotype Print").category, "cyanotypes");
  assert.equal(by("Golden Nature Cyanotype Print").options.length, 2);
  assert.equal(by("Original Signed Etching - Laundry day").category, "printmaking");
  assert.equal(by("Original Signed Etching - Laundry day").oneOfAKind, false);
  assert.deepEqual(by("Down By The Seashore Original watercolor").subjects, ["Beach"]);
  assert.deepEqual(by("Original Oil Painting Black Eyed Susans Opening up.").subjects, ["Florals"]);
  assert.equal(by("Azalea And Grass Cyanotype Note Cards").category, "cyanotypes"); // a cyanotype first, a gift second
  assert.deepEqual(by("Washington Crossing Bucks County Landscape Print").subjects.sort(), ["Bucks County", "Landscapes"]);
  assert.equal(by("Bowl of Peonies Print").options.length, 3);
  assert.equal(by("Color Playground Print").options[0].url, "https://www.etsy.com/listing/1/x");
});

test("only a sale moves a piece to the Sold gallery; expired, deactivated or deleted ones hide; all come back", async () => {
  const root = await site();
  const all = [listing(20, "Sunflowers Original Watercolor", { quantity: 1 }), listing(21, "Sunflowers Print 8x10"), listing(22, "Barn in Snow Print"),
    listing(23, "Lilies Original Watercolor", { quantity: 1 }), listing(24, "Pond Original Oil", { quantity: 1 })];
  await run(root, { active: all, gone: {} });
  const report = await run(root, { active: [all[1]], gone: { 20: { state: "sold_out", quantity: 0 }, 22: { state: "inactive", quantity: 2 }, 23: { state: "expired", quantity: 1 } } }); // 24: deleted (404)
  let products = await read(root);
  const by = (n) => products.find((p) => p.name === n);
  assert.deepEqual(report.sold, ["Sunflowers Original Watercolor"]);
  assert.equal(by("Sunflowers Original Watercolor").soldOut, true);
  assert.equal(by("Barn in Snow Print").hidden, true);
  for (const n of ["Lilies Original Watercolor", "Pond Original Oil"]) { assert.equal(by(n).hidden, true); assert.ok(!by(n).soldOut); }
  await run(root, { active: all, gone: {} });
  products = await read(root);
  assert.ok(products.every((p) => !p.soldOut && !p.hidden));
});

test("too many new listings changes nothing; many leaving at once is fine", async () => {
  const root = await site();
  const first = Array.from({ length: 12 }, (_, i) => listing(100 + i, `Piece number ${i} Original`, { quantity: 1 }));
  await run(root, { active: first, gone: {} }); // the first run may import everything
  const before = await readFile(path.join(root, "data/products.json"), "utf8");
  const more = Array.from({ length: 31 }, (_, i) => listing(200 + i, `New piece ${i} Original`, { quantity: 1 }));
  await assert.rejects(run(root, { active: first.concat(more), gone: {} }), /31 new Etsy listings/);
  assert.equal(await readFile(path.join(root, "data/products.json"), "utf8"), before);
  const gone = Object.fromEntries(first.slice(0, 8).map((l) => [l.listing_id, { state: "expired", quantity: 1 }]));
  const report = await run(root, { active: first.slice(8), gone });
  assert.equal(report.hidden.length, 8);
  assert.equal(report.sold.length, 0);
});

test("an original an older sync marked sold, but that only expired, is hidden instead", async () => {
  const root = await site();
  const l = listing(70, "Summer Joy Original Watercolor", { quantity: 1 });
  await run(root, { active: [l], gone: {} });
  const data = JSON.parse(await readFile(path.join(root, "data/products.json"), "utf8"));
  Object.assign(data.products[0], { soldOut: true, soldOn: "2026-10-18" });
  Object.assign(data.products[0].options[0], { available: false, goneOn: "2026-10-18", goneWhy: "expired" });
  await writeFile(path.join(root, "data/products.json"), JSON.stringify(data));
  await run(root, { active: [listing(71, "Other Print")], gone: {} });
  const p = (await read(root)).find((x) => x.name === "Summer Joy Original Watercolor");
  assert.equal(p.hidden, true);
  assert.ok(!p.soldOut);
});

test("a name, section or subject fixed by hand sticks", async () => {
  const root = await site();
  const l = listing(30, "Lake at Dusk Original Oil", { quantity: 1 });
  await run(root, { active: [l], gone: {} });
  const data = JSON.parse(await readFile(path.join(root, "data/products.json"), "utf8"));
  Object.assign(data.products[0], { name: "Lake at Dusk", category: "paintings", subjects: ["Landscapes", "Bucks County"] });
  await writeFile(path.join(root, "data/products.json"), JSON.stringify(data));
  await run(root, { active: [{ ...l, price: price(300), description: "New words." }], gone: {} });
  const [p] = await read(root);
  assert.equal(p.name, "Lake at Dusk");
  assert.deepEqual(p.subjects, ["Landscapes", "Bucks County"]);
  assert.equal(p.options[0].price, 300);
  assert.deepEqual(p.description, ["New words."]);
});

test("sorting: a gift tag doesn't make a painting a gift, shop sections count, generic titles don't merge", async () => {
  const root = await site();
  const active = [
    listing(40, "Sunflower Oil Painting", { quantity: 1, tags: ["sunflower art", "gift for mom"] }),
    listing(41, "Coyote Original Art", { quantity: 1, shop_section_id: 2 }),
    listing(42, "Leaf Botanical Hand Pulled Print- copper"),
    listing(43, "Fox Christmas Tree Ornament", { tags: ["winter decor", "trees"] }),
    listing(44, "Matte Canvas, Framed (Multi-color) Singing Choir"),
    listing(45, "Matte Canvas, Framed Winter Bird"),
    listing(46, "Three Pansies Cyanotype Print", { tags: ["botanical art"] }),
  ];
  const state = { active, gone: {}, sections: [{ shop_section_id: 1, title: "Original Art" }, { shop_section_id: 2, title: "Original Collographs" }] };
  await run(root, state);
  const products = await read(root);
  const by = (n) => products.find((p) => p.name.startsWith(n));
  assert.equal(by("Sunflower Oil Painting").category, "paintings");
  assert.equal(by("Sunflower Oil Painting").kind, "original");    // a painting is an original even if the title doesn't say so
  assert.equal(by("Sunflower Oil Painting").oneOfAKind, true);
  assert.equal(by("Coyote Original Art").category, "printmaking"); // from its Etsy shop section
  assert.equal(by("Leaf Botanical Hand Pulled Print").category, "printmaking");
  assert.equal(by("Fox Christmas Tree Ornament").category, "gifts");
  assert.deepEqual(by("Fox Christmas Tree Ornament").subjects, []);
  assert.equal(products.filter((p) => p.name.startsWith("Matte Canvas")).length, 2);
  assert.deepEqual(by("Three Pansies").subjects, ["Florals"]);
});

test("a fresh import reuses photos already saved, and old photo folders are cleared", async () => {
  const root = await site();
  const active = [listing(50, "Peonies Original Watercolor", { quantity: 1 }), listing(51, "Barn Print")];
  await run(root, { active, gone: {} });
  await mkdir(path.join(root, "images/old-piece"), { recursive: true });
  await writeFile(path.join(root, "data/products.json"), JSON.stringify({ products: [] }));
  let downloads = 0;
  const etsy = fakeEtsy({ active, gone: {} });
  await sync({ root, fetch: (u) => { if (!u.startsWith(API)) downloads++; return etsy(u); }, log: () => {}, pause: 0 });
  assert.equal(downloads, 0);
  await assert.rejects(readFile(path.join(root, "images/old-piece/x")), /ENOENT/);
  const { readdir } = await import("node:fs/promises");
  assert.deepEqual((await readdir(path.join(root, "images"))).sort(), ["barn-print", "peonies-original-watercolor"]);
});

test("re-sort applies new rules to pieces already on the site, except hand fixes", async () => {
  const root = await site();
  await run(root, { active: [listing(60, "Daisy Garden Painting"), listing(61, "Wild Grass Study")], gone: {} });
  const data = JSON.parse(await readFile(path.join(root, "data/products.json"), "utf8"));
  data.products[0].category = "gifts";                                   // pretend an old rule got it wrong
  Object.assign(data.products[1], { category: "prints", siteOnly: ["category"] }); // a hand fix
  await writeFile(path.join(root, "data/products.json"), JSON.stringify(data));
  await sync({ root, fetch: fakeEtsy({ active: [listing(60, "Daisy Garden Painting"), listing(61, "Wild Grass Study")], gone: {} }), log: () => {}, pause: 0, resort: true });
  const [a, b] = await read(root);
  assert.equal(a.category, "paintings");
  assert.equal(b.category, "prints");
});

test("small copies of photos: saved for new pieces, filled in for older ones, replaced with the photos", async () => {
  const { readdir } = await import("node:fs/promises");
  const root = await site();
  const active = [listing(60, "Tulips Original Oil", { quantity: 1 })];
  const urls = [];
  const etsy = fakeEtsy({ active, gone: {} });
  const spy = (u) => { if (!u.startsWith(API)) urls.push(u); return etsy(u); };
  await sync({ root, fetch: spy, log: () => {}, pause: 0 });
  let [p] = await read(root);
  assert.deepEqual(p.thumbs, ["images/tulips-original-oil/600-small.jpg"]);
  assert.ok(urls.some((u) => u.includes("il_570xN")), "the small copy is Etsy's uncropped 570px size");

  // A piece saved before small copies existed gets them on the next run.
  delete p.thumbs;
  await writeFile(path.join(root, "data/products.json"), JSON.stringify({ products: [p] }));
  const { rm } = await import("node:fs/promises");
  await rm(path.join(root, "images/tulips-original-oil/600-small.jpg"));
  await sync({ root, fetch: spy, log: () => {}, pause: 0 });
  [p] = await read(root);
  assert.deepEqual(p.thumbs, ["images/tulips-original-oil/600-small.jpg"]);

  // New photos on Etsy: the old photo and its small copy go, the new ones come in.
  const swapped = async (u) => {
    if (/\/listings\/60\/images$/.test(u)) return { ok: true, status: 200, json: async () => ({ results: [{ listing_image_id: 777, rank: 1, url_fullxfull: "https://i.etsystatic.com/x/il_fullxfull.2.jpg" }] }) };
    return etsy(u);
  };
  await sync({ root, fetch: swapped, log: () => {}, pause: 0 });
  [p] = await read(root);
  assert.deepEqual(p.images, ["images/tulips-original-oil/777.jpg"]);
  assert.deepEqual(p.thumbs, ["images/tulips-original-oil/777-small.jpg"]);
  assert.deepEqual((await readdir(path.join(root, "images/tulips-original-oil"))).sort(), ["777-small.jpg", "777.jpg"]);
});

test("original or print: posters and canvases are prints, descriptions and the rules file decide the rest", async () => {
  const { kindFor } = await import("./etsy-sync.mjs");
  assert.equal(kindFor("Classic Matte Paper Poster size 8x10 inches", [], "prints", 1), "print");
  assert.equal(kindFor("Matte Canvas, Framed (Multi-color) Singing Choir", [], "prints", 1), "print");
  assert.equal(kindFor("Original Campfire Painting, 16x20 Canvas Art", [], "paintings", 1), "original");
  assert.equal(kindFor("Daylily Garden Cyanotype", ["My original cyanotype of a daylily from my garden."], "cyanotypes", 1), "original");
  assert.equal(kindFor("Tulip Cyanotype", ["A print of my original cyanotype."], "cyanotypes", 1), "other");
  assert.equal(kindFor("Pin Oak Leaves Cyanotype", [], "cyanotypes", 42, { kinds: { 42: "both" } }), "both");

  // A piece already on the site is re-checked when its Etsy listing changes.
  const root = await site();
  const active = [listing(70, "Wild Grass Cyanotype")];
  await run(root, { active, gone: {} });
  assert.equal((await read(root))[0].kind, "other");
  const settings = JSON.parse(await readFile(path.join(root, "data/etsy-sync.json"), "utf8"));
  settings.kinds = { 70: "both" };
  await writeFile(path.join(root, "data/etsy-sync.json"), JSON.stringify(settings));
  await run(root, { active, gone: {} });
  assert.equal((await read(root))[0].kind, "both");
});

const opt = (name, quantity = 1, cents = 3500) => ({ property_values: [{ property_name: "size", values: [name] }], offerings: [{ price: { amount: cents, divisor: 100 }, quantity, is_enabled: true }] });

test("listing options decide original, print or both, and notice when the original sold", async () => {
  const { kindFromChoices, originalSold, readChoices } = await import("./etsy-sync.mjs");
  const c = (name, available = true) => ({ name, price: 35, available });
  assert.equal(kindFromChoices([c("Original 11x14 Mat"), c("Print 8x10 Mat")]), "both");
  assert.equal(kindFromChoices([c("Original 11x14 Mat", false), c("Print 8x10 Mat")]), "print");
  assert.ok(originalSold([c("Original 11x14 Mat", false), c("Print 8x10 Mat")]));
  assert.equal(kindFromChoices([c("Print 8x10 Mat"), c("Print 11x14 Mat")]), "print");
  assert.equal(kindFromChoices([c("Small"), c("Large")]), null);  // options that don't say: the usual rules decide
  assert.equal(kindFromChoices(null), null);

  const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
  // The batch way works:
  let got = await readChoices(["5"], async () => reply(200, { results: [{ listing_id: 5, inventory: { products: [opt("Original 11x14 Mat", 1, 7500), opt("Print 8x10 Mat", 0)] } }] }));
  assert.deepEqual(got.choices.get("5"), [{ name: "Original 11x14 Mat", price: 75, available: true }, { name: "Print 8x10 Mat", price: 35, available: false }]);
  // Only one at a time works:
  got = await readChoices(["5"], async (p) => p.includes("batch") ? reply(404, {}) : reply(200, { products: [opt("Print 8x10 Mat")] }));
  assert.equal(got.choices.get("5")[0].name, "Print 8x10 Mat");
  // Neither works:
  got = await readChoices(["5"], async () => reply(401, {}));
  assert.equal(got.problem, "Etsy said 401");
});

test("with Marita's sign-in, the sync reads options, saves the renewed sign-in, and marks a sold original", async () => {
  const { readFile: rf, mkdtemp: mk } = await import("node:fs/promises");
  const root = await site();
  const active = [listing(80, "Pin Oak Leaves Cyanotype", { has_variations: true })];
  let products = [opt("Original 11x14 Mat", 1, 7500), opt("Print 8x10 Mat", 5)];
  const etsy = fakeEtsy({ active, gone: {} });
  const calls = [];
  const fetch = async (url, opts = {}) => {
    if (url.includes("/oauth/token")) {
      calls.push(String(opts.body));
      return { ok: true, status: 200, json: async () => ({ access_token: "1.access", refresh_token: "1.newrefresh" }) };
    }
    if (url.includes("/inventory")) {
      assert.equal(opts.headers.authorization, "Bearer 1.access");
      return { ok: true, status: 200, json: async () => ({ results: [{ listing_id: 80, inventory: { products } }] }) };
    }
    return etsy(url);
  };
  const out = path.join(await mk(path.join(tmpdir(), "tok-")), "token");
  process.env.ETSY_REFRESH_TOKEN = "1.oldrefresh"; process.env.ETSY_TOKEN_OUT = out;
  try {
    let report = await sync({ root, fetch, log: () => {}, pause: 0 });
    let [p] = await read(root);
    assert.equal(p.kind, "both");
    assert.equal(p.options[0].choices.length, 2);
    assert.match(calls[0], /grant_type=refresh_token/);
    assert.equal(await rf(out, "utf8"), "1.newrefresh");
    assert.match(report.options, /read for 1 of 1/);

    products = [opt("Original 11x14 Mat", 0, 7500), opt("Print 8x10 Mat", 5)];  // the original sells
    report = await sync({ root, fetch, log: () => {}, pause: 0 });
    [p] = await read(root);
    assert.equal(p.kind, "print");
    assert.equal(p.originalSold, true);
    assert.ok(report.sold.some((s) => s.includes("the original")));
    assert.ok(!p.soldOut, "the listing stays for sale: prints are still available");
  } finally { delete process.env.ETSY_REFRESH_TOKEN; delete process.env.ETSY_TOKEN_OUT; }
});

test("a sign-in Etsy won't renew falls back to the usual rules and says so", async () => {
  const root = await site();
  const etsy = fakeEtsy({ active: [listing(81, "Wild Grass Cyanotype", { has_variations: true })], gone: {} });
  const fetch = async (url, opts) => url.includes("/oauth/token") ? { ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) } : etsy(url, opts);
  process.env.ETSY_REFRESH_TOKEN = "expired";
  try {
    const report = await sync({ root, fetch, log: () => {}, pause: 0 });
    assert.ok(report.problems.some((x) => x.includes("redo the sign-in")));
    assert.equal((await read(root))[0].kind, "other");
  } finally { delete process.env.ETSY_REFRESH_TOKEN; }
});
