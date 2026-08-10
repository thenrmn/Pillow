const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4310;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const FONTS_DIR = path.join(PUBLIC_DIR, "fonts");
const DESIGNS_DIR = path.join(ROOT, "designs");
const BRAND_FILE = path.join(ROOT, "brand.json");
// Pre-installed Chromium on this machine; falls back to Playwright's own
// managed browser (auto-downloaded on first use) if that path is missing.
const LOCAL_CHROMIUM = "/opt/pw-browsers/chromium";

fs.mkdirSync(DESIGNS_DIR, { recursive: true });
fs.mkdirSync(FONTS_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: "50mb" })); // designs embed image data URIs
app.use(express.static(PUBLIC_DIR));

// ---- helpers ----------------------------------------------------------

function safeName(raw) {
  const name = String(raw || "").trim();
  if (!name || name.length > 100 || /[\/\\]/.test(name) || name.includes("..")) {
    const err = new Error("Invalid design name");
    err.status = 400;
    throw err;
  }
  return name;
}

function designPath(name) {
  const p = path.join(DESIGNS_DIR, `${safeName(name)}.json`);
  if (path.dirname(p) !== DESIGNS_DIR) {
    const err = new Error("Invalid design name");
    err.status = 400;
    throw err;
  }
  return p;
}

const FONT_EXTENSIONS = { ".ttf": "truetype", ".otf": "opentype", ".woff": "woff", ".woff2": "woff2" };

// Font files follow `FamilyName-Weight.ext` or `FamilyName-Weight-Italic.ext`
// (underscores in FamilyName become spaces). See README for details.
function scanFonts() {
  let files = [];
  try {
    files = fs.readdirSync(FONTS_DIR);
  } catch {
    return [];
  }

  const fonts = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!FONT_EXTENSIONS[ext]) continue;
    const base = path.basename(file, ext);
    const parts = base.split("-");
    const family = (parts[0] || base).replace(/_/g, " ");
    const rest = parts.slice(1).join("-").toLowerCase();
    const italic = rest.includes("italic");
    const bold = rest.includes("bold");
    fonts.push({
      family,
      file,
      weight: bold ? "700" : "400",
      style: italic ? "italic" : "normal",
    });
  }
  return fonts;
}

// ---- API ----------------------------------------------------------------

app.get("/api/brand", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(BRAND_FILE, "utf8")));
  } catch {
    res.json({ colors: [], fonts: [] });
  }
});

app.get("/api/fonts", (req, res) => {
  const local = scanFonts();
  const families = [...new Set(local.map((f) => f.family))];
  const systemFallback = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];
  res.json({ local: families, system: systemFallback });
});

// Generated @font-face CSS for every font file found in public/fonts.
app.get("/fonts.css", (req, res) => {
  const fonts = scanFonts();
  const css = fonts
    .map(
      (f) => `@font-face {
  font-family: "${f.family}";
  src: url("/fonts/${encodeURIComponent(f.file)}") format("${FONT_EXTENSIONS[path.extname(f.file).toLowerCase()]}");
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`
    )
    .join("\n\n");
  res.type("text/css").send(css);
});

app.get("/api/designs", (req, res) => {
  const files = fs.readdirSync(DESIGNS_DIR).filter((f) => f.endsWith(".json"));
  const list = files.map((f) => {
    const name = f.slice(0, -5);
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(DESIGNS_DIR, f), "utf8")).meta || {};
    } catch {
      // ignore unreadable files
    }
    const stat = fs.statSync(path.join(DESIGNS_DIR, f));
    return { name, width: meta.width, height: meta.height, updatedAt: stat.mtime };
  });
  list.sort((a, b) => (a.name > b.name ? 1 : -1));
  res.json(list);
});

app.get("/api/designs/:name", (req, res) => {
  try {
    const p = designPath(req.params.name);
    if (!fs.existsSync(p)) return res.status(404).json({ error: "Design not found" });
    res.json(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.put("/api/designs/:name", (req, res) => {
  try {
    const p = designPath(req.params.name);
    const body = req.body || {};
    if (!body.fabric || !body.meta) {
      return res.status(400).json({ error: "Design must include fabric and meta" });
    }
    fs.writeFileSync(p, JSON.stringify(body, null, 2));
    res.json({ ok: true, name: req.params.name });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post("/api/designs/:name/duplicate", (req, res) => {
  try {
    const src = designPath(req.params.name);
    const newName = safeName(req.body && req.body.newName);
    const dest = designPath(newName);
    if (!fs.existsSync(src)) return res.status(404).json({ error: "Design not found" });
    if (fs.existsSync(dest)) return res.status(409).json({ error: "A design with that name already exists" });
    const data = JSON.parse(fs.readFileSync(src, "utf8"));
    data.meta = { ...data.meta, name: newName };
    fs.writeFileSync(dest, JSON.stringify(data, null, 2));
    res.json({ ok: true, name: newName });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---- PDF export (Playwright prints the /print.html page) ----------------

app.post("/api/export/pdf/:name", async (req, res) => {
  let browser;
  try {
    const p = designPath(req.params.name);
    if (!fs.existsSync(p)) return res.status(404).json({ error: "Design not found" });
    const { meta } = JSON.parse(fs.readFileSync(p, "utf8"));

    const { chromium } = require("playwright");
    const launchOpts = fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {};
    browser = await chromium.launch(launchOpts);
    const page = await browser.newPage();
    const url = `http://localhost:${PORT}/print.html?name=${encodeURIComponent(req.params.name)}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction("window.__PRINT_READY__ === true", { timeout: 20000 });

    const pdf = await page.pdf({
      width: `${meta.width}px`,
      height: `${meta.height}px`,
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.name}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Design editor running at http://localhost:${PORT}`);
});
