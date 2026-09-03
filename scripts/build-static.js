#!/usr/bin/env node

"use strict";

// SINH THƯ MỤC public/ ĐỂ FIREBASE HOSTING ĐEM ĐI DEPLOY.
//
// Mã nguồn người viết nằm ở src/ (nhiều tệp nhỏ, dễ soát). Bản chạy thật chỉ
// gồm 4 tài sản, mỗi tài sản mang một "vân tay" băm nội dung trong tên tệp:
//
//   src/css/base.css        -> public/assets/css/base.<vân tay>.css
//   src/css/app.css         -> public/assets/css/app.<vân tay>.css
//   src/js/firebase-init.js -> public/assets/js/firebase-init.<vân tay>.js
//   src/js/app/*.js (nối)   -> public/assets/js/app.<vân tay>.js
//
// Vân tay đổi theo nội dung nên trình duyệt không bao giờ phục vụ bản cũ khi
// đã deploy bản mới, mà vẫn cache vĩnh viễn được (xem header trong firebase.json).
// index.html được ghi lại tại chỗ với tên tệp mới — đó là lý do DUY NHẤT khiến
// tệp gốc index.html thay đổi trong mỗi lần build.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "src/js/app/manifest.json");
const appSourceRoot = path.dirname(manifestPath);
const publicCssRoot = path.join(root, "public/assets/css");
const publicJsRoot = path.join(root, "public/assets/js");
const indexPath = path.join(root, "index.html");

function die(message) {
  console.error(`Build tĩnh THẤT BẠI: ${message}`);
  process.exit(1);
}

function readFile(filePath, description) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    die(`${description} không đọc được: ${path.relative(root, filePath)} (${error.message})`);
  }
}

function fingerprint(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 12);
}

function loadManifest() {
  let manifest;
  try {
    manifest = JSON.parse(readFile(manifestPath, "Manifest của app").toString("utf8"));
  } catch (error) {
    die(`Manifest hỏng: ${error.message}`);
  }
  if (!Array.isArray(manifest) || manifest.length === 0) {
    die("Manifest phải là một mảng JSON không rỗng");
  }
  if (manifest.some((entry) => typeof entry !== "string" || !entry || path.basename(entry) !== entry)) {
    die("Mỗi mục trong manifest phải là một tên tệp trần (không kèm đường dẫn)");
  }
  if (new Set(manifest).size !== manifest.length) {
    die("Manifest có mục trùng lặp");
  }
  return manifest;
}

function cleanGenerated(directory, pattern) {
  fs.mkdirSync(directory, { recursive: true });
  for (const name of fs.readdirSync(directory)) {
    if (pattern.test(name)) fs.rmSync(path.join(directory, name));
  }
}

function replaceExactlyOnce(html, pattern, replacement, label) {
  const matches = html.match(pattern);
  if (!matches || matches.length !== 1) {
    die(`index.html phải tham chiếu ${label} đúng 1 lần, đang thấy ${matches ? matches.length : 0}`);
  }
  return html.replace(pattern, replacement);
}

const manifest = loadManifest();
const app = Buffer.concat(manifest.map((name) => readFile(path.join(appSourceRoot, name), `Phần ${name}`)));
const firebase = readFile(path.join(root, "src/js/firebase-init.js"), "Nguồn Firebase");
const baseCss = readFile(path.join(root, "src/css/base.css"), "Base CSS");
const appCss = readFile(path.join(root, "src/css/app.css"), "App CSS");
let html = readFile(indexPath, "index.html gốc").toString("utf8");

const outputs = {
  app: `app.${fingerprint(app)}.js`,
  firebase: `firebase-init.${fingerprint(firebase)}.js`,
  baseCss: `base.${fingerprint(baseCss)}.css`,
  appCss: `app.${fingerprint(appCss)}.css`,
};

cleanGenerated(publicJsRoot, /^(?:app|firebase-init)\.[a-f0-9]{12}\.js$/);
cleanGenerated(publicCssRoot, /^(?:app|base)\.[a-f0-9]{12}\.css$/);
fs.writeFileSync(path.join(publicJsRoot, outputs.app), app);
fs.writeFileSync(path.join(publicJsRoot, outputs.firebase), firebase);
fs.writeFileSync(path.join(publicCssRoot, outputs.baseCss), baseCss);
fs.writeFileSync(path.join(publicCssRoot, outputs.appCss), appCss);

// Bốn tham chiếu nội bộ phải xuất hiện ĐÚNG THỨ TỰ NẠP: CSS nền, CSS app,
// khởi tạo Firebase, rồi mới tới bản nối app.
const localReferences = Array.from(
  html.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)\s*=\s*(["'])(.*?)\1[^>]*>/gi),
  (match) => match[2].trim(),
).filter((url) => url.startsWith("/"));
const expectedReferencePatterns = [
  /^\/assets\/css\/base\.[a-f0-9]{12}\.css$/,
  /^\/assets\/css\/app\.[a-f0-9]{12}\.css$/,
  /^\/assets\/js\/firebase-init\.[a-f0-9]{12}\.js$/,
  /^\/assets\/js\/app\.[a-f0-9]{12}\.js$/,
];
if (
  localReferences.length !== expectedReferencePatterns.length ||
  expectedReferencePatterns.some((pattern, index) => !pattern.test(localReferences[index] || ""))
) {
  die(`index.html phải có đúng 4 tham chiếu nội bộ theo thứ tự nạp, đang thấy: ${localReferences.join(", ")}`);
}

html = replaceExactlyOnce(html, /\/assets\/css\/base\.[a-f0-9]{12}\.css/g, `/assets/css/${outputs.baseCss}`, "base CSS");
html = replaceExactlyOnce(html, /\/assets\/css\/app\.[a-f0-9]{12}\.css/g, `/assets/css/${outputs.appCss}`, "app CSS");
html = replaceExactlyOnce(
  html,
  /\/assets\/js\/firebase-init\.[a-f0-9]{12}\.js/g,
  `/assets/js/${outputs.firebase}`,
  "Firebase",
);
html = replaceExactlyOnce(html, /\/assets\/js\/app\.[a-f0-9]{12}\.js/g, `/assets/js/${outputs.app}`, "app");

const htmlBuffer = Buffer.from(html);
fs.writeFileSync(indexPath, htmlBuffer);
fs.writeFileSync(path.join(root, "public/index.html"), htmlBuffer);

console.log(`Build tĩnh XONG: ${outputs.baseCss}, ${outputs.appCss}, ${outputs.firebase}, ${outputs.app}`);
