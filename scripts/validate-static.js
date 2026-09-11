#!/usr/bin/env node

"use strict";

// KIỂM TRA BẢN TĨNH ĐÃ BUILD — chạy SAU scripts/build-static.js.
//
// Bảo đảm ba điều mà một lần build lỗi hay quên:
//   1) index.html chỉ trỏ tới tài sản có vân tay, đúng 4 tệp, đúng thứ tự nạp.
//   2) Mỗi tệp trong public/ khớp BYTE-BY-BYTE với nguồn trong src/ (không có
//      bản build cũ sót lại, không ai sửa tay trong public/).
//   3) public/index.html giống hệt index.html gốc.
//   4) Mỗi ảnh trong src/anh/ có đúng một bản mang vân tay trong public/, và
//      bản nối app trong public/ gọi đúng tên có vân tay đó (không còn đường
//      dẫn trần nào sót lại).
//   5) CSS nạp động (src/css/admin.css) cũng vậy: nó KHÔNG có thẻ <link> trong
//      index.html mà được mã JS nạp khi mở "/admin", nên phải kiểm qua bản nối
//      chứ không qua index.html.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const hostingRoot = path.join(root, "public");
const publicIndexPath = path.join(hostingRoot, "index.html");
const manifestPath = path.join(root, "src/js/app/manifest.json");
const failures = [];

function fail(message) {
  failures.push(message);
}

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

if (!fs.existsSync(indexPath)) fail("Thiếu index.html");
if (!fs.existsSync(hostingRoot)) fail("Thiếu thư mục public/ — chạy node scripts/build-static.js trước");

const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";

// Bảng "đường dẫn ảnh trần -> đường dẫn có vân tay", dựng lại y hệt cách
// scripts/build-static.js dựng. Cần trước cả phần so bản nối, vì bản nối trong
// public/ đã được thay tên ảnh nên không còn khớp byte với src/ nếu so thô.
const anhSourceRoot = path.join(root, "src/anh");
const bangAnh = new Map();
if (fs.existsSync(anhSourceRoot)) {
  for (const ten of fs.readdirSync(anhSourceRoot).sort()) {
    if (!/\.(?:jpg|jpeg|png|webp|avif|svg)$/i.test(ten)) continue;
    const nguon = fs.readFileSync(path.join(anhSourceRoot, ten));
    const duoi = path.extname(ten);
    bangAnh.set(`/assets/anh/${ten}`, {
      url: `/assets/anh/${path.basename(ten, duoi)}.${hash(nguon).slice(0, 12)}${duoi}`,
      nguon,
      ten,
    });
  }
}

// Bảng tài sản nạp động (CSS/JS chỉ tải khi mở đúng module cần nó), dựng lại
// y hệt cách build dựng. Cũng cần TRƯỚC phần so bản nối, vì bản nối trong
// public/ đã thay tên các tệp này rồi.
const TAI_SAN_NAP_DONG = [
  { nguon: "src/css/admin.css", tenTran: "admin", duoi: "css" },
  { nguon: "src/css/trang-chu.css", tenTran: "trang-chu", duoi: "css" },
  { nguon: "src/js/trang-chu-editor.js", tenTran: "trang-chu-editor", duoi: "js" },
];
const bangCssDong = new Map();
for (const muc of TAI_SAN_NAP_DONG) {
  const nguonPath = path.join(root, muc.nguon);
  if (!fs.existsSync(nguonPath)) continue;
  const noiDung = fs.readFileSync(nguonPath);
  bangCssDong.set(`/assets/${muc.duoi}/${muc.tenTran}.${muc.duoi}`, {
    url: `/assets/${muc.duoi}/${muc.tenTran}.${hash(noiDung).slice(0, 12)}.${muc.duoi}`,
    nguon: noiDung,
    ten: `${muc.tenTran}.${muc.duoi}`,
  });
}

// --- 1) Tham chiếu trong index.html -----------------------------------------
const references = Array.from(
  html.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)\s*=\s*(["'])(.*?)\1[^>]*>/gi),
  (match) => match[2].trim(),
).filter((url) => url && !/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(url) && !/^(?:data:|#)/i.test(url));

const expected = [
  { pattern: /^\/assets\/css\/base\.[a-f0-9]{12}\.css$/, source: "src/css/base.css" },
  { pattern: /^\/assets\/css\/app\.[a-f0-9]{12}\.css$/, source: "src/css/app.css" },
  { pattern: /^\/assets\/js\/firebase-init\.[a-f0-9]{12}\.js$/, source: "src/js/firebase-init.js" },
  { pattern: /^\/assets\/js\/app\.[a-f0-9]{12}\.js$/, source: null /* bản nối từ manifest */ },
];

if (references.length !== expected.length) {
  fail(`index.html phải có đúng ${expected.length} tham chiếu nội bộ, đang thấy ${references.length}: ${references.join(", ")}`);
}

expected.forEach((item, index) => {
  const url = references[index];
  if (!url) return;
  if (!url.startsWith("/")) {
    fail(`Tham chiếu nội bộ phải bắt đầu bằng "/": ${url}`);
    return;
  }
  if (!item.pattern.test(url)) {
    fail(`Tham chiếu thứ ${index + 1} sai khuôn (thiếu vân tay hoặc sai thứ tự nạp): ${url}`);
    return;
  }

  // --- 2) Tệp trong public/ phải khớp byte với nguồn trong src/ -------------
  const built = readIfExists(path.join(hostingRoot, url.replace(/^\//, "")));
  if (!built) {
    fail(`index.html trỏ tới tài sản không tồn tại trong public/: ${url}`);
    return;
  }

  let source;
  if (item.source) {
    source = readIfExists(path.join(root, item.source));
    if (!source) {
      fail(`Thiếu tệp nguồn ${item.source}`);
      return;
    }
  } else {
    if (!fs.existsSync(manifestPath)) {
      fail("Thiếu src/js/app/manifest.json");
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const appSourceRoot = path.dirname(manifestPath);
    const missing = manifest.filter((name) => !fs.existsSync(path.join(appSourceRoot, name)));
    if (missing.length) {
      fail(`Manifest khai báo phần không tồn tại: ${missing.join(", ")}`);
      return;
    }
    let banNoi = Buffer.concat(manifest.map((name) => fs.readFileSync(path.join(appSourceRoot, name)))).toString("utf8");
    for (const [tran, anh] of bangAnh) banNoi = banNoi.split(tran).join(anh.url);
    for (const [tran, css] of bangCssDong) banNoi = banNoi.split(tran).join(css.url);
    source = Buffer.from(banNoi);
  }

  if (hash(built) !== hash(source)) {
    fail(`${url} trong public/ KHÔNG khớp nguồn — chạy lại node scripts/build-static.js`);
  }
  const fingerprintInName = url.match(/\.([a-f0-9]{12})\.(?:css|js)$/)[1];
  if (hash(source).slice(0, 12) !== fingerprintInName) {
    fail(`Vân tay trong tên tệp ${url} không khớp nội dung — chạy lại node scripts/build-static.js`);
  }
});

// --- 3) public/index.html phải giống hệt bản gốc -----------------------------
const publicIndex = readIfExists(publicIndexPath);
if (!publicIndex) {
  fail("Thiếu public/index.html");
} else if (hash(publicIndex) !== hash(Buffer.from(html))) {
  fail("public/index.html khác index.html gốc — chạy lại node scripts/build-static.js");
}

// --- 4) Ảnh sản phẩm ---------------------------------------------------------
// Mỗi tệp trong src/anh/ phải có đúng một bản mang vân tay trong public/, và
// bản nối app đã deploy không được còn gọi ảnh bằng đường dẫn trần.
const publicAnhRoot = path.join(hostingRoot, "assets/anh");
const anhHopLe = new Set();
const cssDongHopLe = new Set();
{
  const banNoiUrl = references.find((url) => /^\/assets\/js\/app\.[a-f0-9]{12}\.js$/.test(url));
  const banNoi = banNoiUrl ? readIfExists(path.join(hostingRoot, banNoiUrl.replace(/^\//, ""))) : null;
  const chuBanNoi = banNoi ? banNoi.toString("utf8") : "";

  for (const [tran, anh] of bangAnh) {
    anhHopLe.add(anh.url);
    const daBuild = readIfExists(path.join(hostingRoot, anh.url.replace(/^\//, "")));
    if (!daBuild) {
      fail(`Thiếu bản có vân tay của ảnh ${anh.ten} trong public/ — chạy lại node scripts/build-static.js`);
    } else if (hash(daBuild) !== hash(anh.nguon)) {
      fail(`${anh.url} trong public/ KHÔNG khớp src/anh/${anh.ten}`);
    }
    if (chuBanNoi.includes(tran)) {
      fail(`Bản nối app còn gọi ảnh bằng đường dẫn trần ${tran} — chạy lại node scripts/build-static.js`);
    }
  }

  if (!bangAnh.size && fs.existsSync(publicAnhRoot) && fs.readdirSync(publicAnhRoot).length) {
    fail("public/assets/anh còn ảnh nhưng src/anh/ đã trống");
  }

  // Tài sản nạp động (CSS/JS): cùng ba phép kiểm như ảnh.
  for (const [tran, css] of bangCssDong) {
    cssDongHopLe.add(css.url);
    const daBuild = readIfExists(path.join(hostingRoot, css.url.replace(/^\//, "")));
    if (!daBuild) {
      fail(`Thiếu bản có vân tay của ${css.ten} trong public/ — chạy lại node scripts/build-static.js`);
    } else if (hash(daBuild) !== hash(css.nguon)) {
      fail(`${css.url} trong public/ KHÔNG khớp nguồn của ${css.ten}`);
    }
    if (chuBanNoi.includes(tran)) {
      fail(`Bản nối app còn gọi ${tran} bằng đường dẫn trần — chạy lại node scripts/build-static.js`);
    }
    // Nạp động mà không ai gọi thì tệp nằm chết trong public/ — bắt luôn.
    if (!chuBanNoi.includes(css.url)) {
      fail(`Không mã nào nạp ${css.url} — tài sản nạp động phải được gọi từ bản nối app.`);
    }
  }
}

// --- 5) Không để tài sản mồ côi trong public/assets --------------------------
const assetRoot = path.join(hostingRoot, "assets");
if (fs.existsSync(assetRoot)) {
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  for (const file of walk(assetRoot)) {
    const url = `/${path.relative(hostingRoot, file).split(path.sep).join("/")}`;
    if (!references.includes(url) && !anhHopLe.has(url) && !cssDongHopLe.has(url)) {
      fail(`Tài sản mồ côi trong public/ (không tệp nào trỏ tới): ${url}`);
    }
  }
}

if (failures.length) {
  console.error("Kiểm tra bản tĩnh THẤT BẠI:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log(
  `Kiểm tra bản tĩnh ĐẠT: index.html, public/index.html, 4 tài sản có vân tay` +
    (cssDongHopLe.size ? `, ${cssDongHopLe.size} tài sản nạp động` : "") +
    (anhHopLe.size ? ` và ${anhHopLe.size} ảnh sản phẩm` : "") +
    " đều khớp nguồn.",
);
