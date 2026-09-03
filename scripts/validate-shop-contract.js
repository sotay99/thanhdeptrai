#!/usr/bin/env node

"use strict";

// HỢP ĐỒNG BẰNG REGEX cho phần bán hàng.
//
// Đọc kỹ trước khi sửa: tệp này chỉ kiểm tra một đoạn mã CÓ MẶT, nó KHÔNG
// kiểm tra đoạn đó chạy đúng. Đổi tên hàm hay sửa câu chữ tiếng Việt sẽ làm
// nó đỏ — khi đó cập nhật lại mẫu ngay trong tệp này, ĐỪNG xoá mục đi cho xanh.
//
// Mục đích: chặn những thay đổi âm thầm làm sai cam kết với chủ shop —
// thiếu sản phẩm, sai giá, đổi mức giảm giá, đổi ký hiệu chuyển khoản, và
// nhất là để lọt số tài khoản thật vào mã nguồn trên GitHub.

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appRoot = path.join(root, "src/js/app");
const failures = [];

function fail(message) {
  failures.push(message);
}

function doc(duongDan) {
  const day = path.join(root, duongDan);
  return fs.existsSync(day) ? fs.readFileSync(day, "utf8") : "";
}

const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, "manifest.json"), "utf8"));
const banNoi = manifest
  .map((ten) => (fs.existsSync(path.join(appRoot, ten)) ? fs.readFileSync(path.join(appRoot, ten), "utf8") : ""))
  .join("");
const cssApp = doc("src/css/app.css");
const cssBase = doc("src/css/base.css");

// ---------------------------------------------------------------------------
// 1) Đủ 7 sản phẩm, đúng tên và đúng giá.
// ---------------------------------------------------------------------------
const SAN_PHAM_CHOT = [
  ["App Lightroom cho điện thoại Android - đã có bản quyền trọn đời", 299000],
  ["Bộ Preset 10.000 màu cao cấp cài sẵn cho Lightroom điện thoại", 99000],
  ["Bộ Preset 650 màu cao cấp cài sẵn cho Lightroom Máy tính và photoshop máy tính", 359000],
  ["Bộ Khóa học dành cho Lightroom điện thoại", 199000],
  ["Bộ Khóa học dành cho Lightroom máy tính", 199000],
  ["Phần mềm Lightroom classic dành cho máy tính Win - bản quyền trọn đời", 599000],
  ["Phần mềm Photoshop dành cho máy tính Win - bản quyền trọn đời", 599000],
];

SAN_PHAM_CHOT.forEach(([ten, gia], i) => {
  if (!banNoi.includes(ten)) {
    fail(`Thiếu (hoặc sai chữ) tên sản phẩm ${i + 1}: “${ten}”`);
    return;
  }
  const viTri = banNoi.indexOf(ten);
  const doanSau = banNoi.slice(viTri, viTri + ten.length + 60);
  if (!new RegExp(`gia:\\s*${gia}\\b`).test(doanSau)) {
    fail(`Sản phẩm ${i + 1} (“${ten}”) không còn khai giá ${gia}`);
  }
});

const soSanPham = (banNoi.match(/\{\s*ma:\s*'sp\d+'/g) || []).length;
if (soSanPham !== 7) {
  fail(`Danh sách phải có đúng 7 sản phẩm, đang thấy ${soSanPham}`);
}

// ---------------------------------------------------------------------------
// 2) Mức giảm giá mặc định 50%, khai đúng một chỗ.
// ---------------------------------------------------------------------------
const khaiGiam = banNoi.match(/const\s+PHAN_TRAM_GIAM\s*=\s*(\d+)\s*;/g) || [];
if (khaiGiam.length !== 1) {
  fail(`PHAN_TRAM_GIAM phải được khai đúng 1 lần, đang thấy ${khaiGiam.length} lần`);
} else if (!/=\s*50\s*;/.test(khaiGiam[0])) {
  fail(`Mức giảm giá mặc định phải là 50%, đang thấy: ${khaiGiam[0]}`);
}

// ---------------------------------------------------------------------------
// 3) Nội dung chuyển khoản: tiền tố "lr", đổi "@" thành dấu cách, bỏ trường
//    trống, và không lặp lại khi số zalo trùng số điện thoại.
// ---------------------------------------------------------------------------
if (!/const\s+phan\s*=\s*\['lr'\]/.test(banNoi)) {
  fail("Nội dung chuyển khoản phải bắt đầu bằng ký hiệu 'lr'");
}
if (!/kh\.email\.replace\(\/@\/g,\s*' '\)/.test(banNoi)) {
  fail("Email trong nội dung chuyển khoản phải đổi dấu '@' thành dấu cách");
}
if (!/kh\.dienThoai\s*&&\s*kh\.dienThoai\s*!==\s*kh\.zalo/.test(banNoi)) {
  fail("Số điện thoại trùng số zalo thì chỉ được ghi MỘT lần trong nội dung chuyển khoản");
}

// ---------------------------------------------------------------------------
// 4) Quy tắc nhập liệu: email tối đa 35 ký tự, số tối đa 12 chữ số.
// ---------------------------------------------------------------------------
if (!/const\s+GIOI_HAN_EMAIL\s*=\s*35\s*;/.test(banNoi)) fail("Email phải giới hạn 35 ký tự");
if (!/const\s+GIOI_HAN_SO\s*=\s*12\s*;/.test(banNoi)) fail("Số zalo / số điện thoại phải giới hạn 12 số");
if (!/coItNhatMot\s*&&\s*khongLoi/.test(banNoi)) {
  fail("Phải bắt buộc nhập ít nhất một trong ba trường trước khi cho thanh toán");
}

// ---------------------------------------------------------------------------
// 5) Thanh báo giá phải NEO ở đáy màn hình.
// ---------------------------------------------------------------------------
const khoiThanhDay = cssApp.match(/\.thanh-bao-gia\s*\{[\s\S]*?\}/);
if (!khoiThanhDay) {
  fail("Thiếu khối CSS .thanh-bao-gia");
} else {
  if (!/position:\s*fixed/.test(khoiThanhDay[0])) fail(".thanh-bao-gia phải dùng position: fixed để neo đáy màn hình");
  if (!/bottom:\s*0/.test(khoiThanhDay[0])) fail(".thanh-bao-gia phải dính bottom: 0");
}

// ---------------------------------------------------------------------------
// 6) Mọi modal đều có nút X ở góc trên bên phải và nút ở đáy bảng.
// ---------------------------------------------------------------------------
if (!/class="modal-x"\s+data-hanh-dong="dong-modal"/.test(banNoi)) {
  fail("Khung modal chung phải có nút X đóng bảng ở góc trên bên phải");
}
if (!/<div class="modal-day">/.test(banNoi)) {
  fail("Khung modal chung phải có phần đáy chứa nút đóng / quay lại");
}
if (!/function ganNutCuonModal\(/.test(banNoi) || !/function theoDoiNutCuonModal\(/.test(banNoi)) {
  fail("Thiếu cơ chế tự chèn 2 nút cuộn lên đầu / xuống cuối cho mọi bảng phụ");
}
if (!/nut-cuon-modal/.test(cssBase)) {
  fail("Thiếu khối CSS .nut-cuon-modal cho 2 nút cuộn của bảng phụ");
}

["Quay lại bước trước", "Xác nhận đã thanh toán thành công", "Tiến hành thanh toán", "Đóng bảng"].forEach((chu) => {
  if (!banNoi.includes(chu)) fail(`Thiếu nút mang đúng tên tiếng Việt: “${chu}”`);
});

// ---------------------------------------------------------------------------
// 7) SỐ TÀI KHOẢN KHÔNG ĐƯỢC LỌT VÀO MÃ NGUỒN.
//    Thông tin chuyển khoản chỉ nằm trong Realtime Database, đọc lúc chạy.
//    Quét toàn bộ tệp trong kho (trừ .git, public/, node_modules).
// ---------------------------------------------------------------------------
const CAM = [/10001034848/, /PHAM\s+VAN\s+THANH/i, /\bTPBank\b/i];
const BO_QUA = new Set([".git", "public", "node_modules"]);

function quet(thuMuc) {
  for (const muc of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    if (BO_QUA.has(muc.name)) continue;
    const day = path.join(thuMuc, muc.name);
    if (muc.isDirectory()) {
      quet(day);
      continue;
    }
    // Chính tệp này chứa các mẫu cần chặn nên phải tự loại mình ra.
    if (path.resolve(day) === path.resolve(__filename)) continue;
    let noiDung;
    try {
      noiDung = fs.readFileSync(day, "utf8");
    } catch (e) {
      continue;
    }
    CAM.forEach((mau) => {
      if (mau.test(noiDung)) {
        fail(
          `Thông tin ngân hàng bị lộ trong mã nguồn: ${path.relative(root, day)} khớp ${mau}. ` +
            `Số tài khoản, tên chủ tài khoản và tên ngân hàng chỉ được nằm trong Realtime Database.`,
        );
      }
    });
  }
}
quet(root);

if (failures.length) {
  console.error("Hợp đồng phần bán hàng THẤT BẠI:");
  failures.forEach((m) => console.error(`- ${m}`));
  process.exit(1);
}
console.log("Hợp đồng phần bán hàng ĐẠT: 7 sản phẩm đúng giá, giảm 50%, quy tắc nhập liệu, thanh neo đáy, và không có thông tin ngân hàng nào trong mã nguồn.");
