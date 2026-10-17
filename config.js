// Site settings you might want to change. The website reads this file.
window.SITE_CONFIG = {
  // Her name as it appears at the top of every page, and a line under it on the front page.
  siteName: "Marita McVeigh",
  tagline: "Original paintings, cyanotypes, etchings and prints.",

  // Links. Leave a link as "" to hide it.
  etsyUrl: "https://www.etsy.com/shop/artworkbymarita",
  instagramUrl: "",
  facebookUrl: "",

  // The contact address shown on the Contact page. Leave "" to send people to Etsy messages instead.
  contactEmail: "",

  // The Sold gallery: one-of-a-kind originals that sold on Etsy (decided with Mom).
  showSoldGallery: true,
  showSoldPrices: false,

  // Menu sections, in order. Each product's "category" in data/products.json is one of these ids.
  categories: [
    { id: "paintings", title: "Paintings", note: "Original oils and watercolors" },
    { id: "cyanotypes", title: "Cyanotypes", note: "Sun prints in Prussian blue" },
    { id: "printmaking", title: "Printmaking", note: "Etchings and hand-pulled prints" },
    { id: "prints", title: "Prints", note: "Prints of her paintings, in several sizes" },
    { id: "gifts", title: "Gifts", note: "Cards and smaller pieces" }
  ],

  // Subject filters, in the order they're offered (names match "subjectRules" in data/etsy-sync.json).
  subjects: ["Florals", "Leaves", "Landscapes", "Beach", "Bucks County"]
};
