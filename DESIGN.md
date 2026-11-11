---
name: Marita McVeigh
description: Joyful, colorful paintings and prints, shown whole on warm sand and paper.
colors:
  sand: "#efe4d0"
  paper: "#f7f1e6"
  warm-ink: "#2e2620"
  clay-gray: "#6b5e52"
  cyanotype-blue: "#1f4e8c"
  hairline: "rgba(46, 38, 32, 0.14)"
  sold-rose: "#b73557"
  line-paintings: "#b73557"
  line-cyanotypes: "#1f4e8c"
  line-printmaking: "#88431d"
  line-prints: "#316429"
  line-gifts: "#8a6200"
typography:
  display:
    fontFamily: "Alegreya Sans, Trebuchet MS, sans-serif"
    fontSize: "clamp(40px, 2.6vw + 23px, 60px)"
    fontWeight: 400
    lineHeight: 1.1
  headline:
    fontFamily: "Alegreya Sans, Trebuchet MS, sans-serif"
    fontSize: "clamp(28px, 1.1vw + 21px, 36px)"
    fontWeight: 400
    lineHeight: 1.2
  section:
    fontFamily: "Alegreya Sans, Trebuchet MS, sans-serif"
    fontSize: "clamp(32px, 1.5vw + 22px, 44px)"
    fontWeight: 400
    lineHeight: 1.15
  quote:
    fontFamily: "Alegreya Sans, Trebuchet MS, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.3
  wordmark:
    fontFamily: "Alegreya Sans, Trebuchet MS, sans-serif"
    fontSize: "25px"
    fontWeight: 500
    lineHeight: 1
  title:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "clamp(16px, 0.6vw + 13.5px, 22px)"
    fontWeight: 400
    lineHeight: 1.35
  lede:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
  price:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.6
  button:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
  small:
    fontFamily: "Figtree, Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  gutter: "clamp(24px, 5vw - 8px, 64px)"
  page: "1180px"
  grid-gap: "19px"
  grid-gap-phone: "8px"
  card-padding: "clamp(12px, 1.8vw, 24px)"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.cyanotype-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "12px 32px"
  button-hero:
    backgroundColor: "{colors.cyanotype-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-contact:
    backgroundColor: "{colors.cyanotype-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  piece-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "{spacing.card-padding}"
  section-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.warm-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "8px 12px 8px 8px"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 14px"
  filter-chip-active:
    backgroundColor: "{colors.cyanotype-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "3px 14px"
  nav-link:
    textColor: "{colors.warm-ink}"
    typography: "{typography.label}"
---

# Design System: Marita McVeigh

## Overview

**Creative North Star: "Paint on a Palette"**

The site is the palette, and the color is Marita's paint. Everything structural is warm and neutral: Sand walls, Paper cards and mats, Warm ink type. The color comes from two places only: her artwork, always shown whole, and five hand-cut watercolor splashes, one per menu section, made from her own cyanotype of petals. Cyanotype blue, from her sun prints, is the single interface color, kept for the logo, links and buttons.

Pages are simple and uncrowded: generous margins, one idea per band, the art first. The handmade shows up in small, deliberate places, never as texture spread over everything: a brushstroke line under each menu word, a splash tucked behind a section name, a splash that paints itself in on hover. Surfaces stay flat at rest and lift a little when touched, like picking a card off a table.

It must never read as a cold white gallery (the site's earlier placeholder look), a corporate or salesy shop, a busy marketplace, or anything dark and moody.

**Key Characteristics:**
- Warm neutral ground; color only from the art and the five section splashes.
- One interface color: Cyanotype blue.
- Artwork always whole: contained, never cropped. Studio photos may be cropped.
- Alegreya Sans for headings, Figtree for everything you read or tap.
- Flat paper surfaces; lift appears only on hover, and only with a mouse.
- Handmade marks are small and specific: brush lines, splashes, the tulip.

## Colors

Warm, low-contrast neutrals carry the page; one blue does all the interface work; five earthy section colors mark the menu.

### Primary
- **Cyanotype Blue** (`cyanotype-blue`): the blue of her sun prints. The wordmark, links, every button (Paper text on it), the active filter chip, focus rings, the footer rule and the See more underline. It is the only color that means "you can act here".

### Secondary
- **Section Line Colors** (`line-paintings` rose, `line-cyanotypes` blue, `line-printmaking` rust brown, `line-prints` leaf green, `line-gifts` mustard gold): one per menu section. Used only for that section's brush line under the menu word and the colored bar in the phone menu. Each section also has a matching watercolor splash image (pink, sky blue, orange, lime, yellow), which carries its brighter color.
- **Sold Rose** (`sold-rose`): the small dot beside "Sold" on originals that have sold, the way galleries mark them.

### Neutral
- **Sand** (`sand`): the page background everywhere, header and hero included.
- **Paper** (`paper`): cards, the mats behind artwork, notes, anything that holds something; also the text color on blue.
- **Warm Ink** (`warm-ink`): all headings and body text; filter chip outlines; the brush line under About and Sold.
- **Clay Gray** (`clay-gray`): quiet text: prices, the "Original · Cyanotypes" details line, ledes, notes, the footer small print.
- **Hairline** (`hairline`): thin dividers, such as the line above the purchase block and thumbnail outlines.

### Named Rules
**The Paint Comes From Her Rule.** The interface adds no color of its own beyond Cyanotype blue. Anything bright on the page is her artwork or one of the five section splashes.

**The One Splash Rule.** A splash belongs to one section and appears only behind that section's name or menu word, never behind body text or art, and never stacked with another splash. The only place all five appear together is the small row beside "Browse the art".

## Typography

**Display Font:** Alegreya Sans (with Trebuchet MS, then any sans serif)
**Body Font:** Figtree (with Helvetica, Arial)

**Character:** Alegreya Sans is friendly and a little organic, like handwriting that has been tidied; Figtree is open and plain, so the reading never feels corporate. Both stay at regular weights except where noted.

### Hierarchy
- **Display** (Alegreya Sans 400, 60px desktop to 40px phone, line height 1.1): the hero heading and section page titles. One per page. The hero heading always sets as two lines, "I like painting the / joyful part of life", even where both halves would fit on one: each half stays whole and the column grows to hold it.
- **Section** (Alegreya Sans 400, 44px to 32px, 1.15): front-page section headings ("What's new", "Browse the art"), one step under the hero so it leads.
- **Headline** (Alegreya Sans 400, 36px to 28px, 1.2): piece titles on their own page, section names on the Browse cards, headings inside descriptions.
- **Quote** (Alegreya Sans Medium Italic 500, 26px, 1.3): pull quotes in her own words.
- **Wordmark** (Alegreya Sans 500, 25px, 22px under 1180px): "Marita McVeigh" beside the tulip, in Cyanotype blue.
- **Title** (Figtree 400, 22px desktop, about 19px tablet, 16px phone, 1.35): piece names and prices on cards. Names clamp to two lines.
- **Lede** (Figtree 400, 20px, 1.5; 18px on phones): the hero's introduction in her words, and the email on the Contact page.
- **Price** (Figtree 400, 24px, 1.2): the price above Buy on Etsy on a piece page.
- **Body** (Figtree 400, 18px, 1.6): descriptions, About, everything you read. Lines stay under 65 characters.
- **Label** (Figtree 500, 18px, 1.6): menu words, the Contact me button.
- **Button** (Figtree 600, 18px, 1.4): Buy on Etsy and See what's new.
- **Small** (Figtree 400, 16px, 1.5): filter chips, the Etsy note under the buy button, captions, the footer's small print.

### Named Rules
**The Regular Headings Rule.** Headings are Alegreya Sans Regular (400). Medium (500) is only for the wordmark and quotes.

**The Readable Floor Rule.** Body text is never smaller than 18px. Only card captions on phones and small print go below it, and nothing goes under 16px.

**The Two-Line Hero Rule.** The hero heading is always two lines, broken between its two phrases and never inside one, at every width. On small tablets it grows (up to 60px, 9vw) to hold its own over the full-width introduction; on the smallest phones it shrinks a little (down to about 36px at 300px wide) rather than break a phrase.

**The Her Own Words Rule.** The front page speaks as Marita in the first person, starting in the hero: who she is, where she paints, and that every piece is for sale in her Etsy shop.

## Layout

One centered column of content 1180px wide (`page`), with side margins that grow from 24px on phones to 64px on wide screens (`gutter`); at 1440px that leaves about 130px each side. The header spans wider (up to 1440px).

- **Front page:** the hero is only as tall as its content, and the studio photo tops out at 58% of the window, so the first row of What's new shows at the bottom of the first screen. Desktop hero: heading, her introduction and the button on the left, studio photo on the right (742:567). Phones stack a shorter close crop of the photo (342:280), heading, introduction, then a full-width button; small tablets (521–759px) stack the wide crop at 16:10 so the button stays on the first screen. When stacked, the introduction runs the full width (two lines on a small tablet).
- **Grids of pieces:** four across on the front page (desktop), three on tablets, two on phones; section pages fill rows of cards at least 230px wide. Gaps are 19px, 8px on phones.
- **Browse the art:** two wide cards then three on desktop, each 300px tall with the name along the top and the piece filling the rest; two across on tablets (Paintings takes the full row when the count is odd); one per row on phones.
- **Piece page:** photo on the left, details on the right (about 57/43); stacks below 1000px. Under the title: the details line, then the price, so what it is and what it costs read together; her description follows, then Buy on Etsy. On a phone the price shows on the first screen.
- **Breakpoints:** 1180px (wordmark shrinks), 1100px (four to three across), 1000px (menu button replaces the menu, piece page stacks), 760px (hero stacks, two-across cards), 520px (phone header).

**The Art Peeks In Rule.** On the front page the first row of new work starts showing at the bottom of the first screen (about 100px at 1440×900 and on a 390×844 phone), so a whole painting is always one small scroll away.

## Elevation & Depth

Flat by default, on a warm ground. Cards and section cards sit flat on Sand with no shadow; Paper against Sand is the only separation. The mat behind a piece's main photo carries a faint ambient shadow so the art feels hung. Depth appears as a response: on hover (mouse only) cards rise 4px with a soft warm shadow, and buttons rise 2px with a blue-tinted shadow.

### Shadow Vocabulary
- **Mat** (`box-shadow: 0 1px 2px rgba(46, 38, 32, .06), 0 6px 18px -10px rgba(46, 38, 32, .25)`): the mat behind a piece's main photo.
- **Lift** (`box-shadow: 0 2px 6px rgba(46, 38, 32, .08), 0 14px 28px -14px rgba(46, 38, 32, .4)`): piece cards and section cards on hover.
- **Button rest** (`box-shadow: 0 1px 2px rgba(31, 78, 140, .25)`): every blue button at rest.
- **Button lift** (`box-shadow: 0 6px 14px -6px rgba(31, 78, 140, .6)`): blue buttons on hover.

### Named Rules
**The Picked-Up Card Rule.** Surfaces are flat at rest. Lift is a reaction to a mouse, never a resting state, and never on touch screens where a tap would leave it stuck.

## Shapes

Gently rounded and calm. Buttons, section cards, notes and piece cards on phones use a soft 6px corner; piece cards go square-cornered on wider screens, like a print on a mat. The hero photo has an 8px corner, thumbnails 4px, filter chips are full pills. The handmade forms are the only irregular shapes: the brushstroke line under each menu word (always 5px tall), the watercolor splashes turned at their own angles (Paintings and Cyanotypes 9°, Printmaking -69°, Prints 0°, Gifts -28° and nudged right to line up), and the tulip badge circle.

## Components

### Buttons
Solid, friendly and obvious: there is one kind of button and it is blue.
- **Shape:** soft corner (6px).
- **Primary (Buy on Etsy):** Cyanotype blue with Paper text, Figtree 600, 12px by 32px, only as wide as its words. Several options stack at the width of the widest.
- **Hero (See what's new):** same color, 12px by 24px; full width on phones.
- **Contact me (header):** same color, Figtree 500, 8px by 16px.
- **Hover / Focus:** rises 2px with the button-lift shadow and brightens 10% (mouse only); pressing settles it back. Focus shows a 2px Cyanotype blue outline 3px out.

### Chips
- **Style:** subject filters and tags are outlined pills: 1px Warm ink border, Warm ink text, Figtree 16px, 3px by 14px.
- **State:** hover turns border and text Cyanotype blue; the selected filter fills Cyanotype blue with Paper text.
- **Tap area:** 44px tall, wider than the visible pill, for both the filters and the tags.

### Cards / Containers
**Piece card.** Paper, padded 12 to 24px, soft 6px corners on phones and square on wider screens, no border or shadow at rest. The art sits whole in a slightly wide box (15:14), top-aligned; below it the name (two lines at most) and the price in Clay gray italic. Cards in a row share their title and price lines, so prices line up, and a row only makes room for a second title line when one of its names wraps. Hover: the lift.

**Section card (Browse the art).** Paper, 6px corners, a fixed height per breakpoint (300px desktop, 150px tablet, 109px phone). The section name in Alegreya Sans over its splash, a whole piece from that section, and a blue arrow: on desktop the name and arrow run along the top and the piece fills the card below; on tablets and phones they sit in a row with the piece at the right. The piece is one not already in What's new. When the card is too narrow (under 280px inside), the picture drops out. Hover: the lift.

**Mat.** Behind a piece's main photo: Paper with the mat shadow, art contained with room around it. The mat is as tall as the piece's tallest photo (at most 70% of the window), so switching photos never moves the page; a piece with one photo gets a mat that fits it exactly, and a wide photo among tall ones sits centered with more paper above and below. Tapping the photo opens it larger.

**Enlarged photo.** A full-screen view over a Sand wash: the photo on Paper with the mat shadow, a Close pill at the top right. Arrow keys and swipes move between photos; Escape, Close or a tap outside closes it.

### Navigation
- **Desktop menu:** the five sections, then About (and Sold once something has sold), in Figtree 500 18px Warm ink, each over a 5px hand-painted brush line in its section color (Warm ink for About and Sold). Hover or the current page paints the section's splash in from left to right behind the word, squashed into a brushstroke and turned -5°. The Contact me button ends the row.
- **Phone menu (under 1000px):** a blue three-line button opens a panel of full-width 52px rows; each section word sits over the same 5px hand-painted line as the desktop menu, and the current section's splash paints in as the panel opens.
- **Wordmark:** the outline tulip and "Marita McVeigh" in Cyanotype blue at the far left.
- **Skip link:** "Skip to the art", hidden until the first Tab press, then a 44px Paper pill at the top left.
- **Page changes:** focus moves to the new page's heading, so screen readers announce it; the scroll position is left alone.

### Photo strip (piece page)
Thumbnails 64px square on Paper with a hairline border, using the sync's small copy of each photo; the current one gets a Cyanotype blue outline. When the photos run past the edge, that edge fades out (48px) and the strip snaps from photo to photo; on phones a "1 of 9 photos" count in Clay gray sits under it. The details line under the piece title names a single piece in the singular: "Original · Cyanotype", "Cyanotype print", "Linocut print", "Gift". Arrow keys move through the photos, the strip follows the current one, and screen readers hear "Photo 2 of 10".

### Piece page extras
- **Breadcrumb:** 44px tall; it goes back to where you came from, keeping the subject filter and the scroll.
- **Description:** her words as she wrote them, tidied (doubled spaces, a lone "i"); short label lines become small headings, and product specs and care notes fold under a "Details" toggle.
- **More from this section:** ends with a "See all Cyanotypes" link (not on sold pieces).
- **Missing pages:** a mistyped address says "I couldn't find that page"; a piece that's been taken down says "That piece isn't on the site anymore". Both show everything on the site below.

### See more link
Figtree 500, 18px, Cyanotype blue with a 2px underline and a small arrow, right-aligned under the What's new grid. On mouse hover the underline thickens to 4px inside a fixed-height row, so nothing below moves.

### Section heading with splash
The section's watercolor splash tucked behind the first letters of its name, turned to that section's angle. On page titles the text lines up with the page's left edge like everything below it, and the splash hangs out into the margin (by 0.45em). On the Browse cards the splash sits inside the card. Used on section page titles and the Browse cards.

### Footer
A thin Cyanotype blue rule, then the simplified tulip badge (a blue disc, since it's under 96px) with the email (or Contact me), the studio line ("Made by hand in my studio, near Philadelphia") in Warm ink at the center, and About, Policies and Privacy at the right; the four social icons in blue below. Every link is at least 44px tall to tap; the icons stay 27px (22px on phones) inside 44px squares. Hover is easy to see: text links turn Warm ink with a 3px blue underline; social icons get a Paper circle and rise 2px. Then the small print centered in Clay gray at 16px: © Marita McVeigh, the required Etsy notice, the icon credit. Stacks and centers under 1000px.

## Do's and Don'ts

### Do:
- **Do** show every artwork whole (`object-fit: contain`), in any card, mat, thumbnail or preview.
- **Do** keep Sand as the page and Paper for anything that holds something.
- **Do** use Cyanotype blue for every link, button and focus ring, and nothing decorative.
- **Do** give each section its own line color and splash, and use them only for that section.
- **Do** keep headings in Alegreya Sans Regular and body text at 18px or larger.
- **Do** keep surfaces flat at rest; lift only on mouse hover, and respect reduced motion.
- **Do** use the simplified tulip badge only below 96px; the full outline badge from 96px up.
- **Do** make every link and button at least 44px tall to tap, even when its visible mark is smaller.

### Don't:
- **Don't** crop a piece of art to fit a frame. Crop studio photos only.
- **Don't** go back to cool gallery white, gray or serif headings: the old placeholder look.
- **Don't** add sale banners, badges, countdowns, "shop now" urgency or stock-photo polish.
- **Don't** build marketplace density: ratings, crowded filters, ads, many columns of tiny thumbnails.
- **Don't** use dark backgrounds or moody, high-contrast styling.
- **Don't** add new interface colors, gradients or decorative color; brightness comes from her art and the splashes.
- **Don't** put a splash behind body text or artwork, or stack two splashes.
- **Don't** mark list rows or cards with a thick colored bar down one side; section color lives in the hand-painted line under the word.
