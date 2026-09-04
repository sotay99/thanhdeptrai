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
  ["App Lightroom cho điện thoại Android - đã có bản quyền trọn đời", 299000, 99000],
  ["Bộ Preset 10.000 màu cao cấp cài sẵn cho Lightroom điện thoại", 99000, 79000],
  ["Bộ Preset 650 màu cao cấp cài sẵn cho Lightroom Máy tính và photoshop máy tính", 359000, 179000],
  ["Bộ Khóa học dành cho Lightroom điện thoại", 199000, 0],
  ["Bộ Khóa học dành cho Lightroom máy tính", 199000, 0],
  ["Phần mềm Lightroom classic dành cho máy tính Win - bản quyền trọn đời", 599000, 179000],
  ["Phần mềm Photoshop dành cho máy tính Win - bản quyền trọn đời", 599000, 179000],
  ["Kho tài nguyên thiết kế (1000+ ảnh RAW, file Mockup, file PSD,...)", 159000, 39000],
  ["1000+ font chữ Việt Hoá cao cấp cho máy tính", 159000, 39000],
];

SAN_PHAM_CHOT.forEach(([ten, giaGoc, giaChot], i) => {
  if (!banNoi.includes(ten)) {
    fail(`Thiếu (hoặc sai chữ) tên sản phẩm ${i + 1}: \u201c${ten}\u201d`);
    return;
  }
  const viTri = banNoi.indexOf(ten);
  const doanSau = banNoi.slice(viTri, viTri + ten.length + 80);
  if (!new RegExp(`giaGoc:\\s*${giaGoc}\\b`).test(doanSau)) {
    fail(`Sản phẩm ${i + 1} không còn khai giá gốc ${giaGoc}`);
  }
  if (!new RegExp(`giaChot:\\s*${giaChot}\\b`).test(doanSau)) {
    fail(`Sản phẩm ${i + 1} không còn khai giá chốt ${giaChot}`);
  }
});

const soSanPham = (banNoi.match(/\{\s*ma:\s*'sp\d+'/g) || []).length;
if (soSanPham !== 9) {
  fail(`Danh sách phải có đúng 9 sản phẩm, đang thấy ${soSanPham}`);
}

// ---------------------------------------------------------------------------
// 2) Giảm giá lần hai: mỗi sản phẩm thêm 10%, trừ hai Bộ Khoá học miễn phí.
//    Số tiền cuối cùng làm tròn XUỐNG hàng nghìn, và phải > 0 mới cho chốt đơn.
// ---------------------------------------------------------------------------
const khaiGiam = banNoi.match(/const\s+GIAM_MOI_SAN_PHAM\s*=\s*(\d+)\s*;/g) || [];
if (khaiGiam.length !== 1) {
  fail(`GIAM_MOI_SAN_PHAM phải được khai đúng 1 lần, đang thấy ${khaiGiam.length} lần`);
} else if (!/=\s*10\s*;/.test(khaiGiam[0])) {
  fail(`Mỗi sản phẩm phải được giảm thêm 10%, đang thấy: ${khaiGiam[0]}`);
}
if (!/const\s+KHONG_TINH_GIAM_LAN_HAI\s*=\s*\['sp4',\s*'sp5',\s*'sp8',\s*'sp9'\]/.test(banNoi)) {
  fail("Bốn mã sp4, sp5, sp8, sp9 phải nằm ngoài mức giảm giá lần hai");
}
if (!/Math\.floor\(\(tongTien - tienGiam\) \/ 1000\) \* 1000/.test(banNoi)) {
  fail("Số tiền cuối cùng phải được làm tròn xuống hàng nghìn");
}
if (!/t\.soLuong > 0 && t\.thanhTien > 0/.test(banNoi)) {
  fail("Chỉ được bấm Mua hàng khi số tiền cuối cùng lớn hơn 0");
}
if (!/function phanTramGiamSanPham\(/.test(banNoi)) {
  fail("Phần trăm giảm của từng sản phẩm phải tính ra từ giá gốc và giá chốt");
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
// Cả ba trường đều phải gọt sạch dấu cách ngay lúc gõ / lúc dán vào.
if (!/function boDauCach\(/.test(banNoi) || !/replace\(\/\\s\+\/g, ''\)/.test(banNoi)) {
  fail("Email, số zalo và số điện thoại đều phải loại bỏ mọi dấu cách");
}
// Bấm vào khoảng trống của khung sản phẩm cũng là chọn / bỏ chọn.
if (!/<article class="the-sanpham[\s\S]{0,220}data-hanh-dong="chon-san-pham"/.test(banNoi)) {
  fail("Cả khung sản phẩm phải bấm được để chọn / bỏ chọn");
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

// Bảng phụ KHÔNG được tự đóng khi bấm ra vùng tối bên ngoài — khách đang nhập
// dở đơn hàng mà lỡ tay bấm trượt là mất sạch.
if (/dong-modal-neu-ngoai/.test(banNoi)) {
  fail("Bảng phụ không được tự đóng khi bấm ra ngoài — chỉ nút X hoặc nút ở đáy mới đóng được");
}
if (!/data-hanh-dong="xem-chi-tiet"/.test(banNoi) || !/function moModalChiTietSanPham\(/.test(banNoi)) {
  fail("Mỗi sản phẩm phải có nút “Xem chi tiết sản phẩm” mở ra bảng chi tiết riêng");
}

["Quay lại bước trước", "Xác nhận đã thanh toán thành công", "Tiến hành thanh toán", "Đóng bảng", "Xem chi tiết sản phẩm"].forEach((chu) => {
  if (!banNoi.includes(chu)) fail(`Thiếu nút mang đúng tên tiếng Việt: “${chu}”`);
});

// ---------------------------------------------------------------------------
// 7) MÔ TẢ CHI TIẾT SẢN PHẨM — mỗi sản phẩm phải có mô tả riêng, và mọi mô tả
//    đều kết thúc bằng khối cam kết chung (hướng dẫn cụ thể sau khi mua +
//    hoàn tiền 100% trong 15 ngày + chỉ đường tới mục "Yêu cầu hoàn tiền").
// ---------------------------------------------------------------------------
SAN_PHAM_CHOT.forEach((_, i) => {
  const ma = `sp${i + 1}`;
  const mau = new RegExp("\\b" + ma + ":\\s*\\{[\\s\\S]{0,400}?khauHieu:");
  if (!mau.test(banNoi)) {
    fail(`Sản phẩm ${ma} chưa có khối mô tả trong MO_TA_SAN_PHAM (01b-mo-ta-san-pham.js).`);
  }
});

[
  [/const\s+CAM_KET_CHUNG\s*=\s*\[/, "khối cam kết dùng chung CAM_KET_CHUNG"],
  [/Hướng dẫn tận tay/, "cam kết có hướng dẫn cụ thể, chi tiết sau khi mua hàng"],
  [/Hoàn tiền 100% nếu không hài lòng/, "cam kết hoàn tiền 100% nếu không hài lòng"],
  [/15 ngày đầu sử dụng/, "mốc 15 ngày đầu sử dụng"],
  [/Yêu cầu hoàn tiền/, "chỉ đường tới mục Yêu cầu hoàn tiền ở menu trái"],
  [/danhSach\.push\(\{\s*kieu:\s*'cam-ket'/, "khối cam kết dán ở CUỐI mọi mô tả"],
  [/function\s+veMoTaSanPham\s*\(/, "hàm veMoTaSanPham dựng mô tả"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten} trong phần mô tả sản phẩm.`);
});

[
  [/@keyframes\s+troi-tu-phai\s*\{[\s\S]*?translateX\(/, "hiệu ứng trôi từ phải qua trái cho khối mô tả"],
  [/\.khoi-cam-ket\s*\{/, "kiểu riêng cho khối cam kết"],
  [/@keyframes\s+nhun-nhay-mua-hang\s*\{[\s\S]*?scale\(1\.1[0-9]?\)/, "nhịp nhún nhảy của nút Mua hàng"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 8) SỐ TÀI KHOẢN KHÔNG ĐƯỢC LỌT VÀO MÃ NGUỒN.
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
console.log("Hợp đồng phần bán hàng ĐẠT: 9 sản phẩm đúng giá gốc và giá chốt, giảm lần hai 10%/sản phẩm, quy tắc nhập liệu, thanh neo đáy, và không có thông tin ngân hàng nào trong mã nguồn.");
