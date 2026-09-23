/* Copies the web app files into www/ -- the folder Capacitor bundles
   inside the APK. Run automatically by "npm run sync" and "npm run apk".

   Cross-platform on purpose (no shell cp), so it works the same in
   GitHub Codespaces, on Windows and on macOS. */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WWW = path.join(ROOT, "www");

const FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "config.js",
  "manifest.json",
];

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW, { recursive: true });

let copied = 0;
for (const file of FILES) {
  const from = path.join(ROOT, file);
  if (!fs.existsSync(from)) {
    console.warn("  ! haipo, imerukwa:", file);
    continue;
  }
  fs.copyFileSync(from, path.join(WWW, file));
  copied += 1;
  console.log("  +", file);
}

console.log(`\nwww/ iko tayari — faili ${copied} zimenakiliwa.`);
