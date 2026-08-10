// One-off generator: builds the 3 starter designs by driving real Fabric.js
// in a headless browser, so the emitted JSON is exactly what canvas.toJSON()
// produces (not hand-typed guesses at Fabric's internal schema).
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const DESIGNS_DIR = path.join(__dirname, "..", "designs");
const FABRIC_PATH = path.join(__dirname, "..", "public", "vendor", "fabric.min.js");
const LOCAL_CHROMIUM = "/opt/pw-browsers/chromium";

const brand = {
  ink: "#1B1F2A",
  coral: "#FF6B5B",
  sand: "#F4E9DA",
  teal: "#2A9D8F",
  heading: "Poppins",
  body: "Inter",
};

const specs = [
  {
    name: "starter-instagram-post",
    preset: "ig-post",
    width: 1080,
    height: 1080,
    background: brand.sand,
    build: (fabric, canvas, brand) => {
      const bar = new fabric.Rect({ left: 0, top: 0, width: 1080, height: 220, fill: brand.ink });
      const headline = new fabric.Textbox("BIG NEWS", {
        left: 80, top: 420, width: 920, fontSize: 120, fontWeight: "700",
        fontFamily: brand.heading, fill: brand.ink, textAlign: "left",
      });
      const sub = new fabric.Textbox("Tell your audience what's happening, in one short line.", {
        left: 80, top: 580, width: 800, fontSize: 40,
        fontFamily: brand.body, fill: brand.ink, textAlign: "left",
      });
      const dot = new fabric.Rect({ left: 80, top: 90, width: 40, height: 40, fill: brand.coral, rx: 20, ry: 20 });
      canvas.add(bar, dot, headline, sub);
    },
  },
  {
    name: "starter-instagram-story",
    preset: "ig-story",
    width: 1080,
    height: 1920,
    background: brand.ink,
    build: (fabric, canvas, brand) => {
      const stripe = new fabric.Rect({ left: 0, top: 0, width: 1080, height: 24, fill: brand.coral });
      const headline = new fabric.Textbox("Swipe up", {
        left: 90, top: 800, width: 900, fontSize: 140, fontWeight: "700",
        fontFamily: brand.heading, fill: "#ffffff", textAlign: "left",
      });
      const sub = new fabric.Textbox("Add the link or the rest of your story here.", {
        left: 90, top: 1000, width: 780, fontSize: 44,
        fontFamily: brand.body, fill: brand.sand, textAlign: "left",
      });
      const circle = new fabric.Rect({
        left: 90, top: 1700, width: 260, height: 70, fill: brand.teal, rx: 35, ry: 35,
      });
      canvas.add(stripe, headline, sub, circle);
    },
  },
  {
    name: "starter-x-header",
    preset: "x-header",
    width: 1500,
    height: 500,
    background: brand.teal,
    build: (fabric, canvas, brand) => {
      const panel = new fabric.Rect({ left: 0, top: 0, width: 560, height: 500, fill: brand.ink });
      const name = new fabric.Textbox("Your Name", {
        left: 620, top: 170, width: 800, fontSize: 90, fontWeight: "700",
        fontFamily: brand.heading, fill: "#ffffff", textAlign: "left",
      });
      const tag = new fabric.Textbox("what you make, in a few words", {
        left: 620, top: 290, width: 750, fontSize: 34,
        fontFamily: brand.body, fill: brand.sand, textAlign: "left",
      });
      const line = new fabric.Line([620, 260, 900, 260], { stroke: brand.coral, strokeWidth: 6 });
      canvas.add(panel, name, tag, line);
    },
  },
];

async function main() {
  fs.mkdirSync(DESIGNS_DIR, { recursive: true });
  const fabricSrc = fs.readFileSync(FABRIC_PATH, "utf8");

  const launchOpts = fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {};
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><body><canvas id="c"></canvas></body></html>`);
  await page.addScriptTag({ content: fabricSrc });

  for (const spec of specs) {
    const fabricJson = await page.evaluate(
      ({ width, height, background, buildSrc, brand }) => {
        const canvasEl = document.getElementById("c");
        canvasEl.width = width;
        canvasEl.height = height;
        const canvas = new fabric.StaticCanvas("c", { width, height, backgroundColor: background });
        // eslint-disable-next-line no-eval
        const build = eval(`(${buildSrc})`);
        build(fabric, canvas, brand);
        canvas.renderAll();
        return canvas.toJSON();
      },
      { width: spec.width, height: spec.height, background: spec.background, buildSrc: spec.build.toString(), brand }
    );

    const payload = {
      meta: {
        name: spec.name,
        width: spec.width,
        height: spec.height,
        preset: spec.preset,
        updatedAt: new Date().toISOString(),
      },
      fabric: fabricJson,
    };

    fs.writeFileSync(path.join(DESIGNS_DIR, `${spec.name}.json`), JSON.stringify(payload, null, 2));
    console.log(`Wrote designs/${spec.name}.json`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
