// frontend/scripts/patch-indexhtml.js
// Purpose: Make CRA build script tag load as type="module" so `import.meta` doesn't crash in browser.

const fs = require("fs");
const path = require("path");

const indexPath = path.join(__dirname, "..", "build", "index.html");

// 1) File must exist
if (!fs.existsSync(indexPath)) {
  console.error("[patch-indexhtml] build/index.html not found:", indexPath);
  process.exit(1);
}

let html = fs.readFileSync(indexPath, "utf8");

// 2) If already patched, exit cleanly
if (html.includes('type="module"')) {
  console.log("[patch-indexhtml] already patched (type=module present).");
  process.exit(0);
}

// 3) CRA injects main bundle like:
// <script defer="defer" src="/static/js/main.xxxxx.js"></script>
const re = /<script\b([^>]*?)\bsrc="(\/static\/js\/main\.[^"]+\.js)"([^>]*)><\/script>/i;

if (!re.test(html)) {
  console.error("[patch-indexhtml] main bundle script tag not found in build/index.html");
  process.exit(1);
}

// 4) Inject type="module" into that script tag
html = html.replace(re, (full, before, src, after) => {
  // If it already has type attribute, keep safe
  if (/\btype\s*=/.test(full)) return full;
  return `<script${before} type="module" src="${src}"${after}></script>`;
});

// 5) Write back
fs.writeFileSync(indexPath, html, "utf8");
console.log("[patch-indexhtml] patched build/index.html -> main bundle is now type=module");
