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
    if (p === "/shops/99/sections") return json({ results: [{ shop_section_id: 1, title: "Art" }] });
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

test("a sold original moves to the Sold gallery, a gone print is hidden, both come back", async () => {
  const root = await site();
  const all = [listing(20, "Sunflowers Original Watercolor", { quantity: 1 }), listing(21, "Sunflowers Print 8x10"), listing(22, "Barn in Snow Print")];
  await run(root, { active: all, gone: {} });
  const report = await run(root, { active: [all[1]], gone: { 20: { state: "sold_out", quantity: 0 }, 22: { state: "inactive", quantity: 2 } } });
  let products = await read(root);
  assert.deepEqual(report.sold, ["Sunflowers Original Watercolor"]);
  assert.equal(products.find((p) => p.name === "Sunflowers Original Watercolor").soldOut, true);
  assert.equal(products.find((p) => p.name === "Barn in Snow Print").hidden, true);
  await run(root, { active: all, gone: {} });
  products = await read(root);
  assert.ok(products.every((p) => !p.soldOut && !p.hidden));
});

test("safety stops change nothing", async () => {
  const root = await site();
  const first = Array.from({ length: 12 }, (_, i) => listing(100 + i, `Piece number ${i} Original`, { quantity: 1 }));
  await run(root, { active: first, gone: {} }); // the first run may import everything
  const before = await readFile(path.join(root, "data/products.json"), "utf8");
  const more = Array.from({ length: 11 }, (_, i) => listing(200 + i, `New piece ${i} Original`, { quantity: 1 }));
  await assert.rejects(run(root, { active: first.concat(more), gone: {} }), /11 new Etsy listings/);
  await assert.rejects(run(root, { active: first.slice(6), gone: {} }), /6 Etsy listings left/);
  assert.equal(await readFile(path.join(root, "data/products.json"), "utf8"), before);
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
