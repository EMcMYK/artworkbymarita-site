// Site settings you might want to change. The website reads this file.
window.SITE_CONFIG = {
  // Her name as it appears at the top of every page, and a line under it on the front page.
  siteName: "Marita McVeigh",
  tagline: "Original paintings, cyanotypes, etchings and prints.",

  // Links. Leave a link as "" to hide it.
  etsyUrl: "https://www.etsy.com/shop/artworkbymarita",
  instagramUrl: "https://www.instagram.com/marita1112/",
  facebookUrl: "https://www.facebook.com/marita.mcveigh/",
  fineArtAmericaUrl: "https://fineartamerica.com/profiles/marita-mcveigh",   // the palette icon in the footer
  // The footer's "Policies" link. Leave "" to use her Etsy shop's policies.
  policiesUrl: "",

  // The contact address shown on the Contact page. Leave "" to send people to Etsy messages instead.
  contactEmail: "",

  // The Sold gallery: one-of-a-kind originals that sold on Etsy (decided with Mom).
  showSoldGallery: true,
  showSoldPrices: false,

  // Menu sections, in order. Each product's "category" in data/products.json is one of these ids.
  // "one" is the name for a single piece, used on its own page ("Original · Cyanotype").
  categories: [
    { id: "paintings", title: "Paintings", one: "Painting", note: "Original oils and watercolors" },
    { id: "cyanotypes", title: "Cyanotypes", one: "Cyanotype", note: "Sun prints in Prussian blue" },
    { id: "printmaking", title: "Printmaking", one: "Printmaking", note: "Etchings and hand-pulled prints" },
    { id: "prints", title: "Prints", one: "Print", note: "Prints of my paintings and cyanotypes, in several sizes" },
    { id: "gifts", title: "Gifts", one: "Gift", note: "Cards and smaller pieces" }
  ],

  // Subject filters, in the order they're offered (names match "subjectRules" in data/etsy-sync.json).
  subjects: ["Florals", "Leaves", "Landscapes", "Beach", "Bucks County"]
};
