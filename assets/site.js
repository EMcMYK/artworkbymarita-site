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
  let gallery = null; // the product page's photo controls, for the left/right keys

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Number(n).toFixed(2).replace(/\.00$/, "");
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const byId = (id) => ALL.find((p) => p.id === id);
  const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) || { id, title: id, note: "" };
  const forSale = () => ALL.filter((p) => !p.soldOut);
  const sold = () => ALL.filter((p) => p.soldOut).sort((a, b) => String(b.soldOn || "").localeCompare(String(a.soldOn || "")));
  const newestFirst = (list) => list.slice().sort((a, b) => String(b.listedOn || "").localeCompare(String(a.listedOn || "")));
  const inCategory = (id) => newestFirst(forSale().filter((p) => p.category === id));
  const buyable = (p) => (p.options || []).filter((o) => o.available !== false);
  const soldGalleryOn = () => CONFIG.showSoldGallery && sold().length > 0;

  function priceText(p) {
    const opts = buyable(p);
    if (!opts.length) return "";
    const low = Math.min(...opts.map((o) => o.price));
    return opts.length > 1 || opts.some((o) => o.hasVariations) ? `From ${money(low)}` : money(low);
  }
  function kindLine(p) {
    const c = categoryOf(p.category).title;
    if (p.kind === "original") return p.category === "paintings" ? "Original" : `Original · ${c}`;
    if (p.kind === "print") return p.category === "prints" ? "Print" : `${c} · print`;
    return c;
  }

  // A piece shown whole on its mat, never cropped. `main` = the big photo on a product page.
  function picture(p, index = 0, main = false) {
    const img = p.images && p.images[index];
    return `<div class="mat">${img
      ? `<img src="${esc(img)}" alt="${esc(p.name)}" ${main ? 'fetchpriority="high" decoding="async"' : 'loading="lazy"'}>`
      : `<span class="no-photo">${esc(p.name)}</span>`}</div>`;
  }

  // A piece on its Paper card: the art whole, its name, then the price in quiet italic.
  function card(p, { showPrice = true } = {}) {
    return `<a class="card" href="#${esc(p.id)}">
      ${picture(p)}
      <span class="card-cap">
        <span class="card-title">${esc(p.name)}</span>
        <span class="card-meta">${p.soldOut ? `<span class="dot" aria-hidden="true"></span>Sold` : esc(showPrice ? priceText(p) : "")}</span>
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
        <span class="badge"><img src="assets/tulip.svg" alt=""></span>
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
  // Phones stack a closer crop of the same photo (her face, the bouquet and her palette) on top.
  function hero(hasNewest) {
    return `<section class="hero"><div class="hero-inner">
      <div class="hero-text">
        <h1>Painting the joyful part of life</h1>
        ${hasNewest ? `<a class="hero-btn" href="#newest">See what’s new</a>` : ""}
      </div>
      <picture class="hero-photo">
        <source media="(max-width: 759px)" type="image/webp" srcset="images/about/studio-easel-close.webp">
        <source media="(max-width: 759px)" srcset="images/about/studio-easel-close.jpg">
        <source type="image/webp" srcset="images/about/studio-easel-desk.webp">
        <img src="images/about/studio-easel-desk.jpg" alt="Marita at her easel in her studio, painting a bouquet of flowers" width="1484" height="1134" fetchpriority="high" decoding="async">
      </picture>
    </div></section>`;
  }

  // One card per menu section: its name over its splash, a piece from it, and an arrow.
  function sectionCard(c, list) {
    const p = list.find((x) => x.images?.length);
    return `<a class="room" href="#${esc(c.id)}" data-section="${esc(c.id)}">
      <span class="room-title">${esc(c.title)}</span>
      ${p ? `<img src="${esc(p.images[0])}" alt="" loading="lazy">` : ""}
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
          <span class="splash-row" aria-hidden="true">${rooms.map(({ c }) => `<img src="assets/splash-${esc(c.id)}.webp" alt="" data-section="${esc(c.id)}">`).join("")}</span>
        </div>
        <div class="rooms">${rooms.map(({ c, list }) => sectionCard(c, list)).join("")}</div>
      </section>`;
  }

  // "See more": everything for sale, newest first.
  function newPage() {
    return `<section class="wrap block">
      <h1>What’s new</h1>
      <p class="lede">Everything I have for sale, newest first.</p>
      ${grid(newestFirst(forSale()))}
    </section>`;
  }

  function sectionPage(c, subject) {
    const all = inCategory(c.id);
    const here = SUBJECTS.filter((s) => all.some((p) => (p.subjects || []).includes(s)));
    const list = subject ? all.filter((p) => (p.subjects || []).includes(subject)) : all;
    return `<section class="wrap block">
      <h1 class="splash-heading" data-section="${esc(c.id)}">${esc(c.title)}</h1>
      <p class="lede">${esc(c.note)}</p>
      ${here.length ? `<nav class="filters" aria-label="Filter by subject">
        <a href="#${esc(c.id)}"${subject ? "" : ' aria-current="true"'}>All</a>
        ${here.map((s) => `<a href="#${esc(c.id)}/${slug(s)}"${s === subject ? ' aria-current="true"' : ""}>${esc(s)}</a>`).join("")}
      </nav>` : ""}
      ${list.length ? grid(list) : `<p class="empty">Nothing here right now. <a href="#${esc(c.id)}">See all ${esc(c.title.toLowerCase())}</a></p>`}
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
    const many = opts.length > 1;
    return `<div class="buy">
      ${opts.map((o) => `<a class="btn" href="${esc(o.url)}" target="_blank" rel="noopener">
        <span>${many ? esc(o.label) : "Buy on Etsy"}</span>
        <span class="btn-price">${o.hasVariations ? `from ${money(o.price)}` : money(o.price)}</span></a>`).join("")}
      <p class="buy-note">${many ? "Each button opens that version on Etsy. " : ""}${opts.some((o) => o.hasVariations) ? "Choose a size on Etsy. " : ""}Checkout and shipping happen on Etsy.</p>
    </div>`;
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
          <div class="stage" id="stage"><div id="main-pic">${picture(p, 0, true)}</div></div>
          ${photos.length > 1 ? `<div class="thumbs" role="group" aria-label="Photos">${photos.map((src, i) =>
            `<button type="button" data-pic="${i}" aria-pressed="${i === 0}" aria-label="Photo ${i + 1} of ${photos.length}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        </div>
        <div class="info">
          <h1>${esc(p.name)}</h1>
          <p class="facts">${esc(kindLine(p))}${p.size && buyable(p).length < 2 ? ` · ${esc(p.size)}` : ""}${p.oneOfAKind && !p.soldOut ? " · One of a kind" : ""}</p>
          ${p.soldOut ? "" : `<p class="price">${esc(priceText(p))}</p>`}
          ${buyButtons(p)}
          ${other && !p.soldOut && !other.soldOut ? `<p class="also"><a href="#${esc(other.id)}">${other.kind === "original" ? "See the original" : "Prints of this piece"}</a></p>` : ""}
          <div class="prose">${describe(p.description || [])}</div>
          ${(p.subjects || []).length && !p.soldOut ? `<p class="tags">${p.subjects.map((s) => `<a href="#${esc(p.category)}/${slug(s)}">${esc(s)}</a>`).join("")}</p>` : ""}
        </div>
      </article>
      ${more.length ? `<section class="block"><h2>${p.soldOut ? "More sold work" : `More ${esc(c.title.toLowerCase())}`}</h2>${grid(more, { showPrice: !p.soldOut || CONFIG.showSoldPrices })}</section>` : ""}
    </div>`;
  }

  function wirePiece(p) {
    const total = (p.images || []).length;
    let shown = 0;
    const show = (i) => {
      if (total < 2) return;
      shown = (i + total) % total;
      document.getElementById("main-pic").innerHTML = picture(p, shown, true);
      document.querySelectorAll("[data-pic]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.pic) === shown)));
    };
    document.querySelectorAll("[data-pic]").forEach((b) => b.addEventListener("click", () => show(Number(b.dataset.pic))));
    const stage = document.getElementById("stage");
    let x0 = null, y0 = null;
    stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
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
  function route() {
    gallery = null;
    const hash = decodeURIComponent(location.hash.slice(1));
    const [head, sub] = hash.split("/");
    const name = CONFIG.siteName || "Marita McVeigh";
    const c = CATEGORIES.find((x) => x.id === head);
    const p = byId(hash);
    if (p) {
      app.innerHTML = productPage(p); renderChrome(p.soldOut ? "sold" : p.category); wirePiece(p);
      document.title = `${p.name} · ${name}`;
    } else if (c) {
      const subject = SUBJECTS.find((s) => slug(s) === sub) || "";
      app.innerHTML = sectionPage(c, subject); renderChrome(c.id);
      document.title = `${subject ? subject + " · " : ""}${c.title} · ${name}`;
    } else if (hash === "new") {
      app.innerHTML = newPage(); renderChrome(""); document.title = `What’s new · ${name}`;
    } else if (hash === "sold" && CONFIG.showSoldGallery) {
      app.innerHTML = soldPage(); renderChrome("sold"); document.title = `Sold · ${name}`;
    } else if (hash === "contact") {
      app.innerHTML = contactPage(); renderChrome("contact"); wireContact(); document.title = `Contact · ${name}`;
    } else if (hash === "about" || hash === "privacy") {
      renderChrome(hash); textPage(hash); document.title = `${hash === "about" ? "About" : "Privacy"} · ${name}`;
    } else {
      const missing = hash && hash !== "top" && hash !== "newest";
      app.innerHTML = (missing ? `<div class="wrap"><p class="notice" role="status">That piece isn't on the site anymore. Here's everything that is.</p></div>` : "") + homePage();
      renderChrome(""); document.title = `${name} · Artwork`;
      // "See what's new" (/#newest): glide down to the newest work and put keyboard focus there.
      const newest = hash === "newest" && document.querySelector("#newest h2");
      if (newest) {
        newest.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
        newest.focus({ preventScroll: true });
        return;
      }
    }
    window.scrollTo(0, 0);
  }

  async function start() {
    renderChrome(""); renderFooter(); wireMenu();
    try {
      const data = window.SITE_PRODUCTS || await (await fetch("data/products.json", { cache: "no-cache" })).json();
      ALL = (data.products || []).filter((p) => !p.hidden);
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="wrap"><p class="notice">The artwork list didn't load. If data/products.json was just edited by hand, check it for a missing comma or quote.</p></div>`;
      return;
    }
    window.addEventListener("hashchange", route);
    route();
  }
  start();

  // Etsy descriptions → paragraphs, with "•" or "-" lines as lists and short lines ending in ":" as headings.
  function describe(paragraphs) {
    const isBullet = (l) => /^\s*[•\-–*]\s+/.test(l);
    const strip = (l) => l.replace(/^\s*[•\-–*]\s+/, "");
    let out = "";
    for (const para of paragraphs) {
      let lines = String(para).split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1 && /:\s*$/.test(lines[0]) && lines[0].length <= 40) { out += `<h2>${esc(lines[0].replace(/:\s*$/, ""))}</h2>`; lines = lines.slice(1); }
      const first = lines.findIndex(isBullet);
      if (first === -1) { out += `<p>${esc(lines.join("\n"))}</p>`; continue; }
      if (first > 0) out += `<p>${esc(lines.slice(0, first).join("\n"))}</p>`;
      out += `<ul>${lines.slice(first).map((l) => `<li>${esc(strip(l))}</li>`).join("")}</ul>`;
    }
    return out;
  }
})();
