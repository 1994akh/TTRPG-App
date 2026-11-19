// Rasterises watabou/out/*.svg to final/ as 3000 px JPG (a PNG would pass D&D Beyond's 10 MB limit) with the preinstalled Playwright Chromium.
//   node watabou/render.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FINAL = path.join(HERE, "..", "final");
fs.mkdirSync(FINAL, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 3000, height: 3000 } });
for ( const f of fs.readdirSync(path.join(HERE, "out")).filter(f => f.endsWith(".svg")) ) {
  await p.goto("file://" + path.join(HERE, "out", f));
  await p.waitForTimeout(500);
  const base = path.join(FINAL, f.replace(".svg", ""));
  await p.screenshot({ path: base + ".jpg", type: "jpeg", quality: 90, clip: { x: 0, y: 0, width: 3000, height: 3000 } });
  console.log("final/" + path.basename(base) + ".jpg", (fs.statSync(base + ".jpg").size / 1e6).toFixed(1) + " MB jpg");
}
await b.close();
