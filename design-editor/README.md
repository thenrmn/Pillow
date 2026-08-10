# Design Editor

A small local canvas design editor: [Fabric.js](http://fabricjs.com/) on a
`<canvas>` element, vanilla JS, and a tiny Express server for saving and
export. No build step (script tags only), no accounts, no telemetry, no
network calls once installed.

## Run it

```sh
npm install   # also vendors fabric.min.js into public/vendor/
npm start     # http://localhost:4310
```

`npm install` copies Fabric.js's UMD build into `public/vendor/fabric.min.js`
so the browser loads it with a plain `<script>` tag — nothing is fetched
from a CDN at runtime.

## Using it

- **Canvas size**: pick a preset (Instagram post 1080×1080, Instagram story
  1080×1920, X header 1500×500, A4 poster 1240×1754 @150dpi) or "Custom
  size…" for any pixel dimensions.
- **Add elements**: Text, Rectangle, Line, and Image (file upload — images
  are embedded as data URIs, so designs stay fully self-contained).
- **Layers**: the right-hand Layers panel lists every object; drag to
  reorder (changes z-order on the canvas), click to select.
- **Align**: Center H / Center V / Center on the toolbar center the
  selected object on the canvas. Dragging an object also snaps to a
  dashed guide when its center crosses the canvas's horizontal or
  vertical midline.
- **Brand panel**: swatches loaded from `brand.json` (4 colors, 2 fonts).
  Click a color to apply it as fill on the selected object; click a font
  to apply it to the selected text.
- **Save**: enter a name in the top-left field and click Save — writes
  `designs/<name>.json`. Reopening that file via the "Open design…"
  dropdown reproduces the canvas exactly (Fabric's own `toJSON`/
  `loadFromJSON`).
- **Duplicate as Template**: saves the current design, then copies it to
  a new name you choose — that's the whole template system. Start from
  any existing design (including the 3 starters) and duplicate it.
- **Export**:
  - *PNG 1x / PNG 2x* — client-side via `canvas.toDataURL({ multiplier })`,
    downloaded directly by the browser.
  - *PDF* — saves the design, then the server drives headless Chromium
    (Playwright) to load `/print.html?name=...`, which rebuilds the exact
    canvas from the saved JSON at 1:1 pixel size, and prints that page to
    a PDF sized to match the canvas exactly.

## Adding your own fonts

Drop font files into `public/fonts/`. Supported formats: `.ttf`, `.otf`,
`.woff`, `.woff2`.

Name each file `FamilyName-Weight.ext` (or `FamilyName-Weight-Italic.ext`).
The part before the first `-` becomes the font-family name (underscores
become spaces):

```
public/fonts/Poppins-Regular.ttf   -> family "Poppins", weight 400
public/fonts/Poppins-Bold.ttf      -> family "Poppins", weight 700
public/fonts/Open_Sans-Italic.ttf  -> family "Open Sans", style italic
```

The server scans this folder on every request to `/fonts.css` and
`/api/fonts` — just refresh the browser after adding files, no restart or
build step needed. Fonts also appear in the same list used for PDF export,
so what you see in the editor is what prints.

A handful of common system fonts (Arial, Georgia, Times New Roman,
Courier New, Verdana) are always offered as a fallback, since they're
already installed on most machines and need no font files at all.

## Where things live on disk

```
design-editor/
  brand.json          # your 4 colors + 2 fonts for the brand panel
  designs/             # every saved design, as designs/<name>.json
  public/
    fonts/              # drop your own font files here (see above)
    vendor/fabric.min.js  # vendored by `npm install`, not committed
    index.html, app.js, styles.css, print.html
  server.js            # save/list/duplicate API + PDF export
```

Each file in `designs/` is a single JSON document:

```json
{
  "meta": { "name": "...", "width": 1080, "height": 1080, "preset": "ig-post", "updatedAt": "..." },
  "fabric": { "version": "5.3.0", "objects": [...], "background": "#..." }
}
```

`fabric` is exactly what Fabric.js's `canvas.toJSON()` produces, so any
design opens back up pixel-for-pixel. Uploaded images are stored inline as
data URIs inside that JSON — there is no separate assets folder, and no
external references to break.

Three starter designs ship in `designs/`: `starter-instagram-post`,
`starter-instagram-story`, and `starter-x-header`. Open one and use
"Duplicate as Template" to start your own design from it.

## Out of scope

No stock photo library, no AI image tools, no collaboration/accounts. You
bring your own images (upload them directly) and your own fonts.
