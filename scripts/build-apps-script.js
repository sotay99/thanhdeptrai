#!/usr/bin/env node

"use strict";

// SINH BẢN "AN TOÀN KHI DÁN" CỦA MÃ APPS SCRIPT.
//
//   apps-script/gui-hang.gs        <- bản người viết, tiếng Việt đọc thoải mái
//   apps-script/gui-hang.ascii.gs  <- bản để DÁN vào Google Apps Script
//
// Vì sao cần: chép mã qua vài lớp trung gian (trình duyệt, trình soạn thảo,
// ứng dụng chat) có lúc làm hỏng ký tự có dấu, và lỗi chỉ lộ ra khi khách nhận
// được email đầy chữ "Ä Ă£ gá»­i". Bản ascii viết mọi chuỗi hiển thị bằng dãy
// \uXXXX nên toàn tệp chỉ còn ký tự ASCII — chép kiểu gì cũng không vỡ, mà khi
// chạy JavaScript vẫn dựng lại đúng chữ tiếng Việt.
//
// Chỉ escape phần BÊN TRONG chuỗi. Chú thích giữ nguyên tiếng Việt: chú thích
// có hỏng cũng không đổi cách chương trình chạy, mà giữ được thì dễ đọc hơn.

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const nguonPath = path.join(root, "apps-script/gui-hang.gs");
const dichPath = path.join(root, "apps-script/gui-hang.ascii.gs");

function die(message) {
  console.error(`Sinh bản Apps Script THẤT BẠI: ${message}`);
  process.exit(1);
}

function escapeKyTu(chu) {
  let ra = "";
  for (const ky of chu) {
    const ma = ky.codePointAt(0);
    if (ma < 128) {
      ra += ky;
      continue;
    }
    // Ký tự ngoài mặt phẳng cơ bản (emoji) chiếm hai đơn vị UTF-16.
    for (let i = 0; i < ky.length; i++) {
      ra += "\\u" + ky.charCodeAt(i).toString(16).padStart(4, "0");
    }
  }
  return ra;
}

// Ký tự có nghĩa đứng ngay trước một dấu "/" quyết định đó là phép chia hay là
// mở đầu một biểu thức chính quy. Sau các ký tự này thì chắc chắn là biểu thức
// chính quy, vì không có toán hạng nào để chia.
const TRUOC_REGEX = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "~", "^", "*", "%", "<", ">", "\n", ""]);

/** Nhảy qua trọn một biểu thức chính quy, trả về vị trí ngay sau nó. */
function boQuaRegex(nguon, batDau) {
  let i = batDau + 1;      // bỏ dấu "/" mở đầu
  let trongLop = false;    // đang ở trong [...] thì "/" không kết thúc regex
  while (i < nguon.length) {
    const c = nguon[i];
    if (c === "\\") { i += 2; continue; }
    if (c === "[") { trongLop = true; i += 1; continue; }
    if (c === "]") { trongLop = false; i += 1; continue; }
    if (c === "/" && !trongLop) { i += 1; break; }
    if (c === "\n") break;   // regex không xuống dòng — coi như hết
    i += 1;
  }
  while (i < nguon.length && /[a-z]/.test(nguon[i])) i += 1;   // cờ g, i, m…
  return i;
}

// Máy trạng thái nhỏ: đi hết tệp, biết lúc nào đang ở trong chuỗi, trong chú
// thích một dòng, trong chú thích nhiều dòng, hay trong một biểu thức chính
// quy — chỉ đụng vào chuỗi.
//
// Phải nhận ra biểu thức chính quy, nếu không thì /"/ trong .replace(/"/g, …)
// bị hiểu là dấu mở chuỗi và cả tệp lệch từ đó trở đi. Lỗi này đã xảy ra thật.
function chuyenDoi(nguon) {
  let ra = "";
  let i = 0;
  let trong = null; // null | "'" | '"' | '`' | '//' | '/*'
  let truoc = "";   // ký tự có nghĩa gần nhất đã đọc

  while (i < nguon.length) {
    const c = nguon[i];
    const doi = nguon.slice(i, i + 2);

    if (trong === null) {
      if (doi === "//") { trong = "//"; ra += doi; i += 2; continue; }
      if (doi === "/*") { trong = "/*"; ra += doi; i += 2; continue; }
      if (c === "/" && TRUOC_REGEX.has(truoc)) {
        const het = boQuaRegex(nguon, i);
        ra += nguon.slice(i, het);
        i = het;
        truoc = "/";
        continue;
      }
      if (c === "'" || c === '"' || c === "`") { trong = c; ra += c; i += 1; continue; }
      ra += c;
      if (!/\s/.test(c) || c === "\n") truoc = c;
      i += 1;
      continue;
    }

    if (trong === "//") {
      if (c === "\n") trong = null;
      ra += c;
      i += 1;
      continue;
    }

    if (trong === "/*") {
      if (doi === "*/") { trong = null; ra += doi; i += 2; continue; }
      ra += c;
      i += 1;
      continue;
    }

    // Đang ở trong chuỗi.
    if (c === "\\") { ra += nguon.slice(i, i + 2); i += 2; continue; }
    if (c === trong) { trong = null; truoc = c; ra += c; i += 1; continue; }
    ra += escapeKyTu(c);
    i += 1;
  }

  if (trong === "'" || trong === '"' || trong === "`") {
    die(`Có một chuỗi chưa đóng trong ${path.relative(root, nguonPath)}`);
  }
  return ra;
}

if (!fs.existsSync(nguonPath)) die(`Không thấy ${path.relative(root, nguonPath)}`);
const nguon = fs.readFileSync(nguonPath, "utf8");
const ra = chuyenDoi(nguon);

// Kiểm lại: mọi ký tự ngoài chuỗi vẫn có thể có dấu (chú thích), nhưng không
// được còn ký tự có dấu nào NẰM TRONG chuỗi.
const conSot = chuyenDoi(ra) !== ra;
if (conSot) die("Chuyển đổi không ổn định — có chuỗi chưa được xử lý hết");

fs.writeFileSync(dichPath, ra);

const soDong = ra.split("\n").length;
const soThoat = (ra.match(/\\u[0-9a-f]{4}/g) || []).length;
console.log(
  `Sinh bản Apps Script XONG: apps-script/gui-hang.ascii.gs — ${soDong} dòng, ` +
    `${soThoat} ký tự có dấu đã chuyển thành dãy \\uXXXX.`,
);
