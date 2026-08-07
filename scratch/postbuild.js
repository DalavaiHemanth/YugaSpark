import fs from "fs";
import path from "path";

// 1. Copy dist/client contents to root dist if present
if (fs.existsSync("dist/client")) {
  fs.cpSync("dist/client", "dist", { recursive: true });
}

// 2. Find compiled entry JS script and CSS files inside dist/assets or dist/client/assets
const assetsDir = fs.existsSync("dist/assets") ? "dist/assets" : "dist/client/assets";
let jsFile = "";
let cssFiles = [];

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js")) || files.find((f) => f.endsWith(".js")) || "";
  cssFiles = files.filter((f) => f.endsWith(".css"));
}

const cssTags = cssFiles.map((f) => `<link rel="stylesheet" href="/assets/${f}" />`).join("\n    ");
const jsTag = jsFile ? `<script type="module" src="/assets/${jsFile}"></script>` : "";

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yuga Spark — RGMCET Hackathon Club Portal</title>
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=DM+Sans:wght@400;500&family=JetBrains+Mono:wght@400;600&display=swap" />
    ${cssTags}
  </head>
  <body>
    <div id="root"></div>
    ${jsTag}
  </body>
</html>`;

fs.writeFileSync("dist/index.html", html);
if (fs.existsSync("dist/client")) {
  fs.writeFileSync("dist/client/index.html", html);
}

console.log("✅ Postbuild successfully generated production index.html with compiled JS entry:", jsFile);
