// Copies the Fabric.js UMD build into public/vendor so the app can load it
// with a plain <script> tag, no bundler and no CDN required at runtime.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "fabric", "dist", "fabric.min.js");
const destDir = path.join(__dirname, "..", "public", "vendor");
const dest = path.join(destDir, "fabric.min.js");

if (!fs.existsSync(src)) {
  console.warn("fabric.min.js not found in node_modules; run `npm install` first.");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("Vendored fabric.min.js -> public/vendor/fabric.min.js");
