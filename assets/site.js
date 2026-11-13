/*
  Marita McVeigh's website: the whole site in one script.

  - Loads the artwork from data/products.json (the Etsy sync keeps that file up to date).
  - Shows a page for the part of the address after "#":
      /                  → front page
      /#paintings        → one menu section (also cyanotypes, printmaking, prints, gifts)
      /#prints/florals   → a section, filtered to one subject
      /#sold             → the Sold gallery
      /#<product-id>     → one piece
      /#about, /#contact, /#privacy
  - Every "Buy on Etsy" button opens the Etsy listing. Checkout and shipping happen on Etsy.
*/
(function () {
  "use strict";

  const CONFIG = window.SITE_CONFIG || {};
  const app = document.getElementById("app");
  const CATEGORIES = CONFIG.categories || [];
  const SUBJECTS = CONFIG.subjects || [];
  let ALL = [];       // everything in products.json except hidden pieces
  let GONE = new Set(); // ids of pieces that were on the site and are now hidden
  let gallery = null; // the product page's photo controls, for the left/right keys

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toFixed(2).replace(/\.00$/, "");
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const byId = (id) => ALL.find((p) => p.id === id);
  const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || { id, title: id, note: "" };
  const forSale = () => ALL.filter((p) => !p.soldOut);
  // Sold originals, including an original sold from a listing that still sells prints of it.
  const soldOn = (p) => String(p.soldOn || p.originalSoldOn || "");
  const sold = () => ALL.filter((p) => p.soldOut || (p.originalSold && !p.hidden)).sort((a, b) => soldOn(b).localeCompare(soldOn(a)));
  const newestFirst = (list) => list.slice().sort((a, b) => String(b.listedOn || "").localeCompare(String(a.listedOn || "")));
  // A piece shows in its own section, and prints show in two: prints of paintings in Paintings and Prints,
  // cyanotype prints (and listings selling the original or a print) in Cyanotypes and Prints.
  // Printmaking prints stay in Printmaking only: they're a different kind of print.
  const isPrint = (p) => p.kind === "print" || p.kind === "both";
  const inSection = (p, id) => p.category === id
    || (id === "prints" && isPrint(p) && (p.category === "cyanotypes" || p.category === "paintings"))
    || (id === "paintings" && p.category === "prints");
  const inCategory = (id) => newestFirst(forSale().filter((p) => inSection(p, id)));
  const buyable = (p) => (p.options || []).filter((o) => o.available !== false);
  const soldGalleryOn = () => CONFIG.showSoldGallery && sold().length > 0;

  function priceText(p) {
    const opts = buyable(p);
    if (!opts.length) return "";
    const low = Math.min(...opts.map((o) => o.price));
    return opts.length > 1 || opts.some((o) => o.hasVariations) ? `From ${money(low)}` : money(low);
  }
  // What a single piece is, in the singular: "Original · Cyanotype", "Cyanotype print", "Linocut print", "Gift".
  // A piece Etsy doesn't mark as original or print says so honestly instead of guessing.
  function kindLine(p) {
    const cat = categoryOf(p.category), one = cat.one || cat.title.replace(/s$/, "");
    if (p.category === "gifts") return "Gift";
    if (p.kind === "original") return p.category === "paintings" ? "Original" : `Original · ${one}`;
    if (p.kind === "both") return `Original or print · ${one}`;  // one listing sells both, as Etsy options
    if (p.kind === "print") {
      if (p.category === "cyanotypes") return "Cyanotype print";
      const medium = String(p.name).match(/\b(linocut|etching|monotype|giclee|giclée)\b/i);
      return medium ? `${medium[1][0].toUpperCase()}${medium[1].slice(1).toLowerCase()} print` : "Print";
    }
    if (p.category === "prints") return "Print";
    return (p.options || []).some((o) => o.hasVariations) ? `${one} · several options on Etsy` : one;
  }

  // A piece's short title for cards and its page: the Etsy name without the medium and format words
  // ("Caladium - Original Oil Painting" → "Caladium"). Gifts keep what they are ("Ornament", "Notebook").
  const MEDIUM = /\b(original|signed|limited edition|hand pulled|framed|matted|matte canvas|mini|large|(oil|acrylic|watercolou?r|pastel|gouache) painting|painting|watercolou?r|gouache|mixed media|collage|(cyanotype|linocut|art|poster|giclee|canvas) print|cyanotype|linocut|etching|monotype|print)\b/gi;
  const PACKAGING = /\b(original|framed|matte canvas)\b/gi;
  function shortTitle(p) {
    const words = p.category === "gifts" ? PACKAGING : MEDIUM;
    const clean = (s) => s.replace(/\([^)]*\)/g, "").replace(words, "")
      .replace(/\s+on (wood panel|watercolou?r paper|canvas)\b/gi, "").replace(/\bart\s*$/i, "")
      .replace(/\s+/g, " ").replace(/^[\s,.;–-]+|[\s,.;:–-]+$/g, "").replace(/^(of an?|of) /i, "");
    const name = String(p.name || "").trim();
    // "Etching - Laundry day", "Print-copper": a dash with a space on either side, or straight after "Print", splits the name
    const [head, ...rest] = name.split(":");
    const parts = head.replace(/\b(print|painting)-/gi, "$1 - ").split(/\s+[-–]\s*|\s*[-–]\s+/).map(clean).filter(Boolean);
    let title = parts.join(", ");
    // "Abstract Oil Painting on Wood Panel: City Mood": the real title is after the colon
    if (/^(abstract|floral|art)?$/i.test(title) && rest.length) title = clean(rest.join(":").split(/\s+[-–]\s+/)[0]) || title;
    return title || name;
  }

  // The smaller copy of a photo (saved by the sync) for cards and thumbnails; the full photo if there isn't one yet.
  const smallPhoto = (p, i = 0) => (p.thumbs && p.thumbs[i]) || (p.images && p.images[i]);

  // A piece shown whole on its mat, never cropped. `main` = the big photo on a product page.
  function picture(p, index = 0, main = false) {
    const img = main ? p.images && p.images[index] : smallPhoto(p, index);
    return `<div class="mat">${img
      ? `<img src="${esc(img)}" alt="${esc(p.name)}" ${main ? 'fetchpriority="high" decoding="async"' : 'loading="lazy"'}>`
      : `<span class="no-photo">${esc(p.name)}</span>`}</div>`;
  }

  // The word on its own line under a card's name: "Original" or "Print"; "" for gifts and unmarked pieces.
  // A listing that sells both the original and prints says "Original": the original is the headline.
  function cardKind(p) {
    if (p.category === "gifts") return "";
    if (p.kind === "original" || p.kind === "both") return "Original";
    if (p.kind === "print") return "Print";
    return "";  // Etsy doesn't say: no guessing
  }
  // The price line. A listing selling both shows its lowest price, which is a print's, so under "Original"
  // it reads "Prints from $35" rather than suggesting the original costs $35.
  function cardPrice(p, kinds = true) {
    const price = priceText(p);
    if (!(kinds && p.kind === "both" && cardKind(p)) || !price) return price;
    return `Prints ${price.startsWith("From ") ? price.replace(/^From /, "from ") : `from ${price}`}`;
  }

  // A piece on its Paper card: the art whole, its name, what it is ("Original"), then the price in quiet
  // italic. "What it is" and the price share the card's last row with the cards beside it, the price at the
  // bottom, so prices line up even beside a gift with no "Original"/"Print" line. kinds: false leaves that
  // line out (the Prints section, where every card is a print).
  function card(p, { showPrice = true, kinds = true } = {}) {
    const kind = kinds && showPrice && !p.soldOut ? cardKind(p) : "";
    return `<a class="card" href="#${esc(p.id)}">
      ${picture(p)}
      <span class="card-cap">
        <span class="card-title">${esc(shortTitle(p))}</span>
        <span class="card-info">${kind ? `<span class="card-kind">${esc(kind)}</span>` : ""}<span class="card-meta">${p.soldOut ? `<span class="dot" aria-hidden="true"></span>Sold` : !showPrice && p.originalSold ? `<span class="dot" aria-hidden="true"></span>Original sold` : esc(showPrice ? cardPrice(p, kinds) : "")}</span></span>
      </span>
    </a>`;
  }
  const grid = (list, opts) => `<div class="grid">${list.map((p) => card(p, opts)).join("")}</div>`;

  // ---------- header, menu and footer ----------
  function navLinks(active) {
    const cur = (id) => active === id ? ' aria-current="page"' : "";
    const sections = CATEGORIES.filter((c) => inCategory(c.id).length || !ALL.length);
    // Each section gets its own brush-line color (data-section, in style.css).
    // The label's own box carries the hover splash in the phone menu, where the link is full width.
    return sections.map((c) => `<a href="#${esc(c.id)}" data-section="${esc(c.id)}"${cur(c.id)}><span class="label">${esc(c.title)}</span></a>`).join("") +
      (soldGalleryOn() ? `<a href="#sold"${cur("sold")}>Sold</a>` : "") +
      `<a href="#about"${cur("about")}>About</a><a class="nav-contact" href="#contact"${cur("contact")}>Contact me</a>`;
  }
  function renderChrome(active) {
    document.querySelector("#siteName span").textContent = CONFIG.siteName || "Marita McVeigh";
    document.getElementById("nav").innerHTML = navLinks(active);
    document.getElementById("menuPanel").innerHTML = navLinks(active);
    setMenu(false);
  }
  function setMenu(open) {
    const btn = document.getElementById("menuBtn"), panel = document.getElementById("menuPanel");
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
  }
  function wireMenu() {
    const btn = document.getElementById("menuBtn"), panel = document.getElementById("menuPanel");
    btn.addEventListener("click", () => setMenu(panel.hidden));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { setMenu(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (!panel.hidden && !e.target.closest(".header")) setMenu(false); });
  }
  // Footer: badge and email, social icons, the studio line, then the small print Etsy requires.
  // All four social icons always show; one whose link in config.js is still "" shows but isn't a link.
  function renderFooter() {
    const out = (url, label, body) => `<a href="${esc(url)}" target="_blank" rel="noopener"${label ? ` aria-label="${label}"` : ""}>${body}</a>`;
    const social = [
      ["instagramUrl", "Instagram", "instagram"], ["fineArtAmericaUrl", "Fine Art America", "palette"],
      ["etsyUrl", "Etsy shop", "etsy"], ["facebookUrl", "Facebook", "facebook"]
    ].map(([key, label, icon]) => {
      const img = `<img src="assets/icon-${icon}.svg" alt="">`;
      return CONFIG[key] ? out(CONFIG[key], label, img) : `<span title="${label}">${img}</span>`;
    });
    const email = CONFIG.contactEmail
      ? `<a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>`
      : `<a href="#contact">Contact me</a>`;
    const policies = CONFIG.policiesUrl || (CONFIG.etsyUrl && `${CONFIG.etsyUrl}#policies`);
    document.getElementById("footer").innerHTML = `<div class="footer-main">
      <div class="footer-contact">
        <img class="badge" src="favicon.svg" alt="" width="49" height="49">
        ${email}
      </div>
      <p class="footer-line">Made by hand in my studio, near Philadelphia</p>
      ${social.length ? `<nav class="social" aria-label="Elsewhere">${social.join("")}</nav>` : ""}
      <nav class="footer-links" aria-label="More">
        <a href="#about">About</a>${policies ? out(policies, "", "Policies") : ""}<a href="#privacy">Privacy</a>
      </nav>
    </div>
    <div class="footer-fine">
      <p class="footer-copy">© ${esc(CONFIG.siteName || "Marita McVeigh")}</p>
      <p>The term ‘Etsy’ is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.</p>
      <p>Social icons from <a href="https://iconscout.com" target="_blank" rel="noopener">iconscout.com</a></p>
    </div>`;
  }

  // ---------- pages ----------
  const arrow = `<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.26 13.5H0v-3h18.26l-8.4-8.4L12 0l12 12-12 12-2.14-2.1 8.4-8.4Z"/></svg>`;

  // Front-page hero (Main page in Figma): heading and button on the left, studio photo on the right.
  // Phones stack a closer crop of the same photo (her face, the bouquet and her palette) on top;
  // small tablets stack the wide crop.
  // The words are hers (brand guide quote) and say plainly that buying happens on Etsy.
  function hero(hasNewest) {
    return `<section class="hero"><div class="hero-inner">
      <div class="hero-text">
        <h1><span class="phrase">I like painting the</span> <span class="phrase">joyful part of life</span></h1>
        <p class="hero-lede">I’m Marita McVeigh, and I paint in my studio near Philadelphia. Flowers are my favorite. Every piece here is for sale in my Etsy shop.</p>
        ${hasNewest ? `<a class="hero-btn" href="#newest">See what’s new</a>` : ""}
      </div>
      <picture class="hero-photo">
        <source media="(max-width: 520px)" type="image/webp" srcset="images/about/studio-easel-close.webp">
        <source media="(max-width: 520px)" srcset="images/about/studio-easel-close.jpg">
        <source type="image/webp" srcset="images/about/studio-easel-desk.webp">
        <img src="images/about/studio-easel-desk.jpg" alt="Marita at her easel in her studio, painting a bouquet of flowers" width="1484" height="1134" fetchpriority="high" decoding="async">
      </picture>
    </div></section>`;
  }

  // One card per menu section: its name over its splash, a piece from it, and an arrow.
  // The piece is one not already shown in What's new, so the two sections don't repeat each other.
  function sectionCard(c, list, shown) {
    const p = list.find((x) => x.images?.length && !shown.has(x)) || list.find((x) => x.images?.length);
    return `<a class="room" href="#${esc(c.id)}" data-section="${esc(c.id)}">
      <span class="room-title">${esc(c.title)}</span>
      ${p ? `<img src="${esc(smallPhoto(p))}" alt="" loading="lazy">` : ""}
      ${arrow}
    </a>`;
  }

  function homePage() {
    if (!ALL.length) return `<div class="wrap"><section class="intro"><h1>${esc(CONFIG.siteName)}</h1><p>${esc(CONFIG.tagline)}</p>
      <p class="empty">Her artwork shows up here after the first sync from Etsy.${CONFIG.etsyUrl ? ` Until then, see it all on <a href="${esc(CONFIG.etsyUrl)}" target="_blank" rel="noopener">her Etsy shop</a>.` : ""}</p></section></div>`;
    const sale = forSale();
    const rooms = CATEGORIES.map((c) => ({ c, list: inCategory(c.id) })).filter((x) => x.list.length);
    const newest = newestFirst(sale).slice(0, 8);  // 4 × 2 on desktop; tablets and phones show 6
    return `
      ${hero(newest.length > 0)}
      ${newest.length ? `<section class="wrap home-block" id="newest">
        <h2 class="home-heading" tabindex="-1">What’s new</h2>
        ${grid(newest)}
        <div class="see-more-row"><a class="see-more" href="#new">See more ${arrow}</a></div>
      </section>` : ""}
      <section class="wrap home-block" aria-labelledby="browse">
        <div class="browse-head">
          <h2 class="home-heading" id="browse">Browse the art</h2>
          <span class="splash-row" aria-hidden="true">${rooms.map(({ c }) => `<img src="assets/splash-${esc(c.id)}.webp" alt="" loading="lazy" data-section="${esc(c.id)}">`).join("")}</span>
        </div>
        <div class="rooms">${rooms.map(({ c, list }) => sectionCard(c, list, new Set(newest))).join("")}</div>
      </section>`;
  }

  // "See more": everything for sale, newest first.
  // The subject chips and how many pieces are showing ("11 pieces"). The count is a status line: route()
  // fills it in just after the page is drawn, so screen readers announce it when a filter changes.
  function filterRow(base, here, subject, count) {
    return `<div class="filter-row">
      ${here.length ? `<nav class="filters" aria-label="Filter by subject">
        <a href="#${base}"${subject ? "" : ' aria-current="true"'}>All</a>
        ${here.map((s) => `<a href="#${base}/${slug(s)}"${s === subject ? ' aria-current="true"' : ""}>${esc(s)}</a>`).join("")}
      </nav>` : ""}
      <p class="count" role="status" data-count="${count === 1 ? "1 piece" : `${count} pieces`}"></p>
    </div>`;
  }

  // What's new, with the same subject filters as the section pages (#new/florals and so on).
  function newPage(subject) {
    const all = newestFirst(forSale());
    const here = SUBJECTS.filter((s) => all.some((p) => (p.subjects || []).includes(s)));
    const list = subject ? all.filter((p) => (p.subjects || []).includes(subject)) : all;
    return `<section class="wrap block">
      <h1>What’s new</h1>
      <p class="lede">Everything I have for sale, newest first.</p>
      ${filterRow("new", here, subject, list.length)}
      ${grid(list)}
    </section>`;
  }

  function sectionPage(c, subject) {
    const all = inCategory(c.id);
    const here = SUBJECTS.filter((s) => all.some((p) => (p.subjects || []).includes(s)));
    const list = subject ? all.filter((p) => (p.subjects || []).includes(subject)) : all;
    return `<section class="wrap block">
      <h1 class="splash-heading" data-section="${esc(c.id)}">${esc(c.title)}</h1>
      <p class="lede">${esc(c.note)}</p>
      ${filterRow(esc(c.id), here, subject, list.length)}
      ${list.length ? grid(list, { kinds: c.id !== "prints" }) : `<p class="empty">Nothing here right now. <a href="#${esc(c.id)}">See all ${esc(c.title.toLowerCase())}</a></p>`}
    </section>`;
  }

  function soldPage() {
    const list = sold();
    return `<section class="wrap block">
      <h1>Sold</h1>
      <p class="lede">One-of-a-kind originals that have found a home.</p>
      ${list.length ? grid(list, { showPrice: CONFIG.showSoldPrices }) : `<p class="empty">Nothing here yet.</p>`}
    </section>`;
  }

  // The same piece as an original and as a print: link each to the other.
  function counterpart(p) {
    const name = String(p.mergeKey || "").split(":").slice(1).join(":");
    if (!name) return null;
    return ALL.find((x) => x !== p && !x.hidden && String(x.mergeKey || "").split(":").slice(1).join(":") === name && x.kind !== p.kind) || null;
  }

  function buyButtons(p) {
    const opts = buyable(p);
    if (p.soldOut) {
      const other = counterpart(p);
      return `<p class="sold-note"><span class="dot" aria-hidden="true"></span>This original has sold.${other && !other.soldOut ? ` <a href="#${esc(other.id)}">Prints are available</a>.` : ""}</p>`;
    }
    if (!opts.length) return "";
    // One option: a plain "Buy on Etsy" (the price is shown just above it). Several: one button each, with its price.
    const many = opts.length > 1;
    return `<div class="buy">
      ${opts.map((o) => `<a class="btn" href="${esc(o.url)}" target="_blank" rel="noopener">${many
        ? `<span>${esc(o.label)}</span><span class="btn-price">${o.hasVariations ? `from ${money(o.price)}` : money(o.price)}</span>`
        : "Buy on Etsy"}</a>`).join("")}
    </div>
    <p class="buy-note">${many ? "Each button opens that version on Etsy. " : ""}${opts.some((o) => o.hasVariations) ? "Choose your size or option on Etsy. " : ""}Checkout and shipping happen on Etsy.</p>`;
  }

  function productPage(p) {
    const c = categoryOf(p.category);
    const photos = p.images || [];
    const other = counterpart(p);
    const more = (p.soldOut ? sold() : inCategory(p.category)).filter((x) => x !== p).slice(0, 4);
    return `<div class="wrap">
      <a class="back" href="#${p.soldOut ? "sold" : esc(c.id)}">${p.soldOut ? "Sold gallery" : esc(c.title)}</a>
      <article class="piece">
        <div class="gallery">
          <div class="stage" id="stage"><button type="button" class="zoom" id="main-pic" aria-label="See this photo larger">${picture(p, 0, true)}</button></div>
          ${photos.length > 1 ? `<div class="thumbs" role="group" aria-label="Photos">${photos.map((_, i) =>
            `<button type="button" data-pic="${i}" aria-pressed="${i === 0}" aria-label="Photo ${i + 1} of ${photos.length}"><img src="${esc(smallPhoto(p, i))}" alt="" loading="lazy"></button>`).join("")}</div>
            <p class="photo-count" aria-hidden="true">1 of ${photos.length} photos</p>` : ""}
          <p class="sr-only" aria-live="polite" id="photo-status"></p>
        </div>
        <div class="info">
          <div class="info-head">
            <h1>${esc(shortTitle(p))}</h1>
            <p class="facts">${esc(kindLine(p))}${p.size && buyable(p).length < 2 ? ` · ${esc(p.size)}` : ""}${p.oneOfAKind && !p.soldOut ? " · One of a kind" : ""}</p>
            ${p.soldOut ? "" : `<p class="price">${esc(priceText(p))}</p>`}
            ${p.originalSold && !p.soldOut ? `<p class="sold-note"><span class="dot" aria-hidden="true"></span>The original has sold. Prints are still available.</p>` : ""}
          </div>
          <div class="prose">${describe(p.description || [], p)}</div>
          <div class="purchase">
            ${buyButtons(p)}
            ${other && !p.soldOut && !other.soldOut ? `<p class="also"><a href="#${esc(other.id)}">${other.kind === "original" ? "See the original" : "Prints of this piece"}</a></p>` : ""}
          </div>
          ${(p.subjects || []).length && !p.soldOut ? `<p class="tags">${p.subjects.map((s) => `<a href="#${esc(p.category)}/${slug(s)}">${esc(s)}</a>`).join("")}</p>` : ""}
        </div>
      </article>
      ${more.length ? `<section class="block"><h2>${p.soldOut ? "More sold work" : `More ${esc(c.title.toLowerCase())}`}</h2>${grid(more, { showPrice: !p.soldOut || CONFIG.showSoldPrices })}
        ${p.soldOut ? "" : `<div class="see-more-row"><a class="see-more" href="#${esc(c.id)}">See all ${esc(c.title.toLowerCase())} ${arrow}</a></div>`}</section>` : ""}
      <dialog class="lightbox" id="lightbox" aria-label="${esc(shortTitle(p))}, larger">
        <img id="lightbox-img" alt="${esc(p.name)}">
        <button type="button" class="lightbox-close" id="lightbox-close">Close</button>
      </dialog>
    </div>`;
  }

  function wirePiece(p) {
    const total = (p.images || []).length;
    let shown = 0;
    const box = document.getElementById("lightbox"), boxImg = document.getElementById("lightbox-img");
    const show = (i) => {
      if (total < 2) return;
      shown = (i + total) % total;
      // the new photo replaces the old one once it has loaded, so the mat never flashes empty
      const next = new Image();
      next.src = p.images[shown];
      const swap = () => { document.getElementById("main-pic").innerHTML = picture(p, shown, true); };
      next.decode ? next.decode().then(swap, swap) : swap();
      if (box.open) boxImg.src = p.images[shown];
      document.querySelectorAll("[data-pic]").forEach((b) => {
        const on = Number(b.dataset.pic) === shown;
        b.setAttribute("aria-pressed", String(on));
        if (on) b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });
      });
      const count = document.querySelector(".photo-count");
      if (count) count.textContent = `${shown + 1} of ${total} photos`;
      document.getElementById("photo-status").textContent = `Photo ${shown + 1} of ${total}`;
    };
    document.querySelectorAll("[data-pic]").forEach((b) => b.addEventListener("click", () => show(Number(b.dataset.pic))));
    // Click or tap the photo to see it larger, still whole. Close with the button, Escape or a click outside it.
    document.getElementById("main-pic").addEventListener("click", () => {
      if (!p.images?.length) return;
      boxImg.src = p.images[shown];
      box.showModal();
    });
    document.getElementById("lightbox-close").addEventListener("click", () => box.close());
    box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
    // When the photos run past the edge of the strip, that edge fades and shows a nudge, so it reads as scrollable.
    const thumbs = document.querySelector(".thumbs");
    if (thumbs) {
      const edges = () => {
        thumbs.classList.toggle("more-left", thumbs.scrollLeft > 2);
        thumbs.classList.toggle("more-right", thumbs.scrollLeft + thumbs.clientWidth < thumbs.scrollWidth - 2);
      };
      thumbs.addEventListener("scroll", edges, { passive: true });
      new ResizeObserver(edges).observe(thumbs);
      edges();
    }
    const stage = document.getElementById("stage");
    // Size the mat for the tallest photo, so switching photos doesn't move the page.
    // Photos are measured as they load (the small copies: same shape, fewer bytes); the tallest so far wins.
    let tallest = 0;
    for (const src of (p.images || []).map((_, i) => smallPhoto(p, i))) {
      const im = new Image();
      im.onload = () => {
        const r = im.naturalHeight / im.naturalWidth;
        if (r > tallest) { tallest = r; stage.style.setProperty("--tallest", r.toFixed(4)); }
      };
      im.src = src;
    }
    let x0 = null, y0 = null;
    for (const el of [stage, box]) el.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    for (const el of [stage, box]) el.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) show(shown + (dx < 0 ? 1 : -1));
      x0 = y0 = null;
    }, { passive: true });
    gallery = total > 1 ? { next: () => show(shown + 1), prev: () => show(shown - 1) } : null;
  }
  document.addEventListener("keydown", (e) => {
    if (!gallery || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.target.closest("input, select, textarea")) return;
    e.preventDefault();
    e.key === "ArrowRight" ? gallery.next() : gallery.prev();
  });

  function contactPage() {
    const email = CONFIG.contactEmail;
    return `<section class="wrap block narrow">
      <h1>Contact</h1>
      ${email ? `<p>For questions about a piece, commissions or anything else, email:</p>
        <p class="email"><span id="email">${esc(email)}</span> <button type="button" class="link-btn" id="copyEmail">Copy</button></p>` : ""}
      ${CONFIG.etsyUrl ? `<p>${email ? "You can also message her on Etsy" : "The quickest way to reach her is a message on Etsy"}: open <a href="${esc(CONFIG.etsyUrl)}" target="_blank" rel="noopener">her Etsy shop</a> and choose “Message”.</p>` : ""}
      <p class="fineprint">Questions about an order? Etsy has the order details, so a message there is fastest.</p>
    </section>`;
  }
  function wireContact() {
    const b = document.getElementById("copyEmail");
    if (b) b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(CONFIG.contactEmail); b.textContent = "Copied"; }
      catch { getSelection().selectAllChildren(document.getElementById("email")); b.textContent = "Selected"; }
      setTimeout(() => (b.textContent = "Copy"), 1800);
    });
  }

  // About and Privacy text lives in data/about.html and data/privacy.html.
  const pages = {};
  async function textPage(name) {
    app.innerHTML = `<div class="wrap block narrow"><article class="prose page" id="page-body"><p class="fineprint">Loading…</p></article></div>`;
    try {
      if (!pages[name]) pages[name] = await (await fetch(`data/${name}.html`, { cache: "no-cache" })).text();
      document.getElementById("page-body").innerHTML = pages[name];
    } catch {
      document.getElementById("page-body").innerHTML = `<p>This page didn't load. Refresh to try again.</p>`;
    }
  }

  // ---------- router ----------
  // Back and Forward return you to the spot you left. Before a link on the site is followed, the
  // current scroll position is saved in this page's history entry; Back or Forward reads it back.
  // A link you follow (or a typed address) starts at the top.
  // A link back to the page you just came from (the "‹ Cyanotypes" breadcrumb, say) steps back through
  // history instead, so it also lands where you left off.
  const sameHash = (a, b) => (a === "#" ? "" : a) === (b === "#" ? "" : b);
  let followingLink = false, lastHash = location.hash;
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.classList.contains("skip")) { e.preventDefault(); a.blur(); focusPage(); app.scrollIntoView(); return; }  // skip link: no page change
    const target = a.getAttribute("href");
    if (sameHash(target, location.hash)) return;  // already here: nothing changes
    e.preventDefault();
    const from = history.state && "from" in history.state ? history.state.from : null;
    if (from !== null && (sameHash(target, from) || (a.classList.contains("back") && from.startsWith(target + "/")))) { history.back(); return; }
    history.replaceState({ ...history.state, scrollY: window.scrollY }, "");
    followingLink = true;
    location.hash = target;
  });
  function onHashChange() {
    const cameFrom = lastHash;
    lastHash = location.hash;
    if (followingLink) {
      followingLink = false;
      route();
      history.replaceState({ from: cameFrom }, "");  // remember where this page was opened from
    } else {
      route(history.state?.scrollY);
    }
    pageReady.then(() => focusPage(cameFrom));
  }

  // About and Privacy load their text after the page appears; this settles once the heading is there.
  let pageReady = Promise.resolve();

  // After moving to another page, put keyboard and screen-reader focus on its heading, so the change
  // is announced and Tab continues from the top of the new page. The scroll position is left alone.
  // Changing only the subject filter on the same page (#cyanotypes → #cyanotypes/leaves) keeps focus on the
  // chip just chosen instead, so trying the next one is one Tab away; the count line announces the result.
  const pageOf = (h) => decodeURIComponent(String(h || "").replace(/^#/, "")).split("/")[0];
  function focusPage(cameFrom) {
    if (app.contains(document.activeElement)) return;  // "See what's new" already focused its heading
    const chip = cameFrom !== undefined && pageOf(cameFrom) === pageOf(location.hash)
      && app.querySelector('.filters a[aria-current]');
    if (chip) { chip.focus({ preventScroll: true }); return; }
    const h = app.querySelector("h1");
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }

  function route(restoreTo) {
    gallery = null;
    pageReady = Promise.resolve();
    const hash = decodeURIComponent(location.hash.slice(1));
    const [head, sub] = hash.split("/");
    const name = CONFIG.siteName || "Marita McVeigh";
    const c = CATEGORIES.find((x) => x.id === head);
    const p = byId(hash);
    if (p) {
      app.innerHTML = productPage(p); renderChrome(p.soldOut ? "sold" : p.category); wirePiece(p);
      document.title = `${shortTitle(p)} · ${name}`;
    } else if (c) {
      const subject = SUBJECTS.find((s) => slug(s) === sub) || "";
      app.innerHTML = sectionPage(c, subject); renderChrome(c.id);
      document.title = `${subject ? subject + " · " : ""}${c.title} · ${name}`;
    } else if (head === "new" && (!sub || SUBJECTS.some((s) => slug(s) === sub))) {
      const subject = SUBJECTS.find((s) => slug(s) === sub) || "";
      app.innerHTML = newPage(subject); renderChrome(""); document.title = `${subject ? subject + " · " : ""}What’s new · ${name}`;
    } else if (hash === "sold" && CONFIG.showSoldGallery) {
      app.innerHTML = soldPage(); renderChrome("sold"); document.title = `Sold · ${name}`;
    } else if (hash === "contact") {
      app.innerHTML = contactPage(); renderChrome("contact"); wireContact(); document.title = `Contact · ${name}`;
    } else if (hash === "about" || hash === "privacy") {
      renderChrome(hash); pageReady = textPage(hash); document.title = `${hash === "about" ? "About" : "Privacy"} · ${name}`;
    } else {
      const missing = hash && hash !== "top" && hash !== "newest";
      const gone = missing && GONE.has(hash);  // a piece that was on the site and has since come down
      app.innerHTML = (missing ? `<div class="wrap"><p class="notice" role="status">${gone
        ? "That piece isn't on the site anymore. Here's everything that is."
        : "I couldn't find that page. Here's everything on the site."}</p></div>` : "") + homePage();
      renderChrome(""); document.title = `${name} · Artwork`;
      // "See what's new" (/#newest): glide down to the newest work and put keyboard focus there.
      const newest = hash === "newest" && restoreTo === undefined && document.querySelector("#newest h2");
      if (newest) {
        newest.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
        newest.focus({ preventScroll: true });
        return;
      }
    }
    window.scrollTo(0, restoreTo || 0);
    // Fill the "11 pieces" status line a moment after the page is drawn, so it's announced as a change.
    const count = app.querySelector(".count[data-count]");
    if (count) setTimeout(() => { count.textContent = count.dataset.count; }, 100);
  }

  async function start() {
    renderChrome(""); renderFooter(); wireMenu();
    try {
      const data = window.SITE_PRODUCTS || await (await fetch("data/products.json", { cache: "no-cache" })).json();
      ALL = (data.products || []).filter((p) => !p.hidden);
      GONE = new Set((data.products || []).filter((p) => p.hidden).map((p) => p.id));
    } catch (e) {
      console.error(e);  // for Ed: data/products.json didn't load or isn't valid JSON
      app.innerHTML = `<div class="wrap"><div class="notice load-error" role="alert">
        <p>My artwork didn’t load just now. Please try again in a moment.</p>
        <p><button type="button" class="link-btn" onclick="location.reload()">Try again</button>${CONFIG.etsyUrl ? ` or see everything in <a href="${esc(CONFIG.etsyUrl)}" target="_blank" rel="noopener">my Etsy shop</a>.` : ""}</p>
      </div></div>`;
      return;
    }
    window.addEventListener("hashchange", onHashChange);
    route();
  }
  start();

  // Etsy descriptions → paragraphs, with "•" or "-" lines as lists and short label lines ("Size:", "Product
  // features") as headings. Light tidying only, never rewording: a first line that just repeats the title goes,
  // runs of spaces close up, a lone "i" becomes "I". Product-spec sections from print-on-demand listings
  // ("Product features", "Care instructions") fold behind a Details toggle at the end.
  function describe(paragraphs, p) {
    const isBullet = (l) => /^\s*[•\-–*]\s+/.test(l);
    const strip = (l) => l.replace(/^\s*[•\-–*]\s+/, "");
    const tidy = (l) => l.replace(/[ \t\u00a0]{2,}/g, " ").replace(/(^|[\s(])i(?=[\s',.!?)]|$)/g, "$1I").trim();
    const plain = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const titles = p ? [plain(p.name), plain(shortTitle(p))] : [];
    const isLabel = (l) => (/:\s*$/.test(l) && l.length <= 40) || (l.length <= 30 && !/[.!?,]$/.test(l) && /^[A-Z]/.test(l) && l.split(" ").length <= 4);
    const isSpec = (h) => /^(product features|features|care instructions|care|specifications|details|product details)$/i.test(h);
    let out = "", spec = "", first = true;
    for (const para of paragraphs) {
      let lines = String(para).split("\n").map(tidy).filter(Boolean);
      if (first && lines.length && titles.includes(plain(lines[0]))) lines = lines.slice(1);  // "“Pin Oak Leaves”" above the text
      first = false;
      if (!lines.length) continue;
      let html = "", heading = "";
      if (lines.length > 1 && isLabel(lines[0])) { heading = lines[0].replace(/:\s*$/, ""); html += `<h2>${esc(heading)}</h2>`; lines = lines.slice(1); }
      const firstBullet = lines.findIndex(isBullet);
      if (firstBullet === -1) html += `<p>${esc(lines.join("\n"))}</p>`;
      else {
        if (firstBullet > 0) html += `<p>${esc(lines.slice(0, firstBullet).join("\n"))}</p>`;
        html += `<ul>${lines.slice(firstBullet).map((l) => `<li>${esc(strip(l))}</li>`).join("")}</ul>`;
      }
      if (heading && isSpec(heading)) spec += html; else out += html;
    }
    return out + (spec ? `<details class="spec"><summary>Details</summary>${spec}</details>` : "");
  }
})();
