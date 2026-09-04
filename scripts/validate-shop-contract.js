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
  ["Bộ Preset 650 màu cao cấp cài sẵn cho Lightroom Máy tính và photoshop máy tính", 359000, 125000],
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
// 8) NÚT TRONG BẢNG CHI TIẾT VÀ KHU QUÀ TẶNG CUỐI MODULE
// ---------------------------------------------------------------------------
[
  [/data-hanh-dong="chon-tu-chi-tiet"/, 'nút "Chọn sản phẩm này" trong bảng chi tiết'],
  [/function\s+chonTuBangChiTiet\s*\(/, "hàm chọn sản phẩm từ bảng chi tiết"],
  [/data-hanh-dong="vao-hoc-ngay"/, 'nút "Vào học ngay" của hai bộ khoá học'],
  [/sp4:\s*'khoa-hoc-mobile'/, "sp4 dẫn sang module Khoá học Lightroom điện thoại"],
  [/sp5:\s*'khoa-hoc-may-tinh'/, "sp5 dẫn sang module Khoá học Lightroom máy tính"],
  [/data-chu-cuoi/, "chữ kết thúc của số tiền nhảy trong bảng chi tiết"],
  [/khiVe:\s*function\(\)\{[\s\S]{0,220}?chayNhaySo\(/, "giá chốt nhảy số lại mỗi lần mở bảng chi tiết"],
  [/Xem và nhận quà tặng của shop mà không cần mua hàng gì cả:/, "dòng mời quà cuối module"],
  [/Nhận quà tặng của Shop mà không cần mua hàng/, "nút mời quà ngay dưới dòng ưu đãi"],
  [/data-hanh-dong="xuong-qua-tang"/, "hành động cuộn xuống khu quà tặng"],
  [/data-hanh-dong="cuon-len-dau"/, "nút cuộn lên đầu trang"],
  [/const\s+QUA_TANG\s*=\s*\[/, "danh sách ba nút quà tặng"],
  [/module:\s*'qua-tang-android'/, "nút quà dẫn sang module Quà tặng cho người dùng điện thoại android"],
  [/module:\s*'khoa-hoc-mobile'/, "nút quà dẫn sang module Khoá học Lightroom điện thoại"],
  [/module:\s*'khoa-hoc-may-tinh'/, "nút quà dẫn sang module Khoá học Lightroom máy tính"],
  [/classList\.add\('nhay-qua-tang'\)/, "bật hiệu ứng nhảy múa của dòng mời quà"],
  [/function\s+doChoThanhDay\s*\(/, "đo chiều cao thật của thanh neo đáy để chừa chỗ cuối trang"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

[
  [/@keyframes\s+nhay-dong-qua-tang\s*\{[\s\S]*?scale\(1\.7\)/, "nhịp phóng to 1,7 lần của dòng mời quà"],
  [/\.dong-qua-tang\.nhay-qua-tang\s*\{[^}]*animation:[^;]*\s5\s/, "dòng mời quà nhảy đúng 5 lần rồi đứng im"],
  [/\.nut-len-dau\s*\{/, "kiểu riêng cho nút cuộn lên đầu trang"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 9) LƯU Ý CỦA SẢN PHẨM 1, BẢNG ĐẶC QUYỀN, MỤC LIÊN HỆ SHOP
// ---------------------------------------------------------------------------
[
  [/kieu:\s*'luu-y'/, "khối Lưu ý của sản phẩm 1"],
  [/chỉ dành cho điện thoại chạy hệ điều hành Android/, "lưu ý chỉ dành cho Android"],
  [/không dành cho iPhone/, "lưu ý không dành cho iPhone"],
  [/đăng nhập bằng tài khoản Adobe/, "lưu ý chỉ đăng nhập bằng tài khoản Adobe"],
  [/Không đăng nhập được bằng Google/, "lưu ý không đăng nhập bằng Google"],
  [/const\s+TRE_MOI_KHOI_MO_TA\s*=\s*0\.33\s*;/, "nhịp trễ 0,33 giây giữa hai khối mô tả"],
  [/const\s+NOI_DUNG_DAC_QUYEN\s*=\s*\[/, "nội dung bảng Đặc quyền"],
  [/không quá 2 khoá học/, "giới hạn không quá 2 khoá học"],
  [/function\s+veNoiDungDacQuyen\s*\(/, "hàm dựng nội dung bảng Đặc quyền"],
  [/function\s+moModalDacQuyen\s*\(/, "hàm mở bảng Đặc quyền"],
  [/data-hanh-dong="lien-he-zalo"/, "nút Liên hệ Zalo"],
  [/function\s+taiThongTinLienHe\s*\(/, "hàm đọc số Zalo của shop từ Realtime Database"],
  [/rtdb\.ref\('thongtinlienhe'\)/, "nhánh /thongtinlienhe trong Realtime Database"],
  [/function\s+moZaloShop\s*\(/, "hàm mở Zalo của shop"],
  [/window\.open\('https:\/\/zalo\.me\/'\s*\+\s*so/, "địa chỉ Zalo dựng lúc bấm, không in sẵn vào HTML"],
  [/ma:\s*'dac-quyen'[\s\S]{0,140}?kieu:\s*'modal'/, "mục Đặc quyền trong menu bên trái"],
  [/ma:\s*'lien-he'[\s\S]{0,80}?kieu:\s*'modal'/, "mục Liên hệ shop trong menu bên trái"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Mục "Đặc quyền" PHẢI đứng trên "Yêu cầu hoàn tiền" trong danh sách MODULE.
if (banNoi.indexOf("ma: 'dac-quyen'") > banNoi.indexOf("ma: 'hoan-tien'")) {
  fail('Mục "Đặc quyền" phải nằm TRÊN mục "Yêu cầu hoàn tiền" trong menu bên trái.');
}

[
  [/@keyframes\s+thong-bao-giam\s*\{[\s\S]*?scale\(1\.6\)/, "cú bung to gấp 1,6 lần của thông báo mức giảm"],
  [/\.khoi-luu-y\s*\{/, "kiểu riêng cho khối Lưu ý"],
  [/\.nut-zalo\s*\{/, "kiểu riêng cho nút Liên hệ Zalo"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 10) NÚT CHỌN TẤT CẢ NHÚN NHẢY, MẢNG XANH THẺ ĐÃ CHỌN, NÚT ĐẶC QUYỀN TRONG
//     MODULE, NHỊP NHẢY SỐ RIÊNG CỦA BẢNG CHI TIẾT
// ---------------------------------------------------------------------------
[
  [/const\s+NHAY_SO_TRONG_BANG\s*=\s*1800\s*;/, "nhịp nhảy số riêng của bảng chi tiết (chậm gấp đôi)"],
  [/chayNhaySo\(gia,\s*NHAY_SO_TRONG_BANG\)/, "bảng chi tiết dùng nhịp nhảy số chậm gấp đôi"],
  [/const\s+THOI_LUONG_NHAY_SO\s*=\s*900\s*;/, "nhịp nhảy số mặc định của lưới sản phẩm"],
  [/class="nut nut-rong nut-dac-quyen"[^']*data-hanh-dong="mo-module" data-module="dac-quyen"/,
    "nút Đặc quyền trong module, dẫn đúng module dac-quyen"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Câu người dùng yêu cầu bỏ hẳn khỏi bảng Đặc quyền.
if (/Nhớ nhé/.test(banNoi)) {
  fail('Câu "Nhớ nhé — không quá 2 khoá học…" đã được yêu cầu xoá khỏi bảng Đặc quyền.');
}

// Nút Đặc quyền phải đứng TRƯỚC khung quà tặng trong luồng dựng HTML.
if (banNoi.indexOf('nut-dac-quyen') > banNoi.indexOf('veKhuQuaTang();')) {
  fail('Nút Đặc quyền phải nằm TRÊN khung quà tặng ở cuối module.');
}

[
  [/\.nut-chon-tat-ca:not\(\.sang\)\s+\.chu\s*\{[\s\S]*?animation:\s*nhun-nhay-mua-hang/,
    'chữ "Chọn tất cả" nhún nhảy cùng nhịp với nút Mua hàng khi chưa tích hết'],
  [/\.the-sanpham\.da-chon\s*\{[\s\S]*?rgba\(20, 115, 230, \.55\) 26px, rgba\(20, 115, 230, 0\) 64px/,
    "mảng xanh của thẻ đã chọn dâng cao tới 64px"],
  [/\.nut-dac-quyen\s*\{/, "kiểu riêng cho nút Đặc quyền trong module"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 11) CAM KẾT GIAO HÀNG NHANH VÀ KHUNG CAM KẾT TRONG BẢNG XÁC NHẬN ĐƠN HÀNG
// ---------------------------------------------------------------------------
[
  [/const\s+CAM_KET_CHUNG\s*=\s*\[\s*\n\s*'⚡ <strong>Giao hàng tức thì, không có thời gian chờ:/,
    "cam kết giao hàng nhanh, xếp ĐẦU tiên trong khối cam kết"],
  [/ngay khi shop nhận được tiền thanh toán/, "mốc giao hàng: ngay khi nhận được tiền thanh toán"],
  [/hệ thống tự động gửi hàng[\s\S]{0,200}?<strong>email<\/strong>[\s\S]{0,120}?<strong>Zalo<\/strong>[\s\S]{0,80}?SMS/,
    "ba đường giao hàng: email tự động, Zalo, SMS"],
  [/class="khung-cam-ket-giao"/, "khung cam kết trong bảng xác nhận đơn hàng"],
  [/ít nhất 1 trong 3 trường<\/strong> \(khung nhập liệu\)/, 'câu mời nhập "ít nhất 1 trong 3 trường (khung nhập liệu)"'],
  [/cam kết giao sản phẩm ngay lập tức/, "lời cam kết giao ngay khi nhận được tiền"],
  [/ưu tiên giao qua <strong>email<\/strong> \(thông qua hệ thống tự động\)/, "ưu tiên giao qua email tự động"],
  [/nếu bạn chưa nhập email/, "giao qua Zalo khi khách chưa nhập email"],
  [/nếu không thể liên hệ qua Zalo/, "giao qua SMS khi không liên hệ được Zalo"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Dòng ghi chú cũ phải được thay hẳn, không để hai chỗ nói cùng một việc.
if (/class="ghi-chu">Vui lòng nhập/.test(banNoi)) {
  fail('Dòng ghi chú cũ trong bảng xác nhận đơn hàng phải được thay bằng khung cam kết.');
}

[
  [/\.the-sanpham\s*\{[\s\S]*?rgba\(20, 115, 230, \.25\) 11px, rgba\(20, 115, 230, 0\) 28px/,
    "mảng xanh của thẻ chưa chọn thấp đi một nửa, còn 28px"],
  [/\.khung-cam-ket-giao\s*\{[\s\S]*?animation:\s*nhun-nhay-cam-ket\s+3\.5s[^;]*infinite/,
    "khung cam kết nhún nhảy tuần hoàn, mỗi vòng 3,5 giây"],
  [/@keyframes\s+nhun-nhay-cam-ket\s*\{[\s\S]*?8\.2%[^}]*scale\(1\)[\s\S]*?100%/,
    "nhịp nhún nhảy của khung cam kết: nảy xong thì nghỉ khoảng ba giây"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 12) ẢNH SẢN PHẨM TRONG BẢNG MÔ TẢ
// ---------------------------------------------------------------------------
SAN_PHAM_CHOT.forEach((_, i) => {
  const ma = `sp${i + 1}`;
  if (!new RegExp(`${ma}:\\s*'/assets/anh/${ma}\\.jpg'`).test(banNoi)) {
    fail(`Sản phẩm ${ma} chưa được khai ảnh trong ANH_SAN_PHAM.`);
  }
  if (!fs.existsSync(path.join(root, `src/anh/${ma}.jpg`))) {
    fail(`Thiếu tệp ảnh src/anh/${ma}.jpg.`);
  }
});

[
  [/const\s+ANH_SAN_PHAM\s*=\s*\{/, "bảng ảnh sản phẩm"],
  [/class="anh-san-pham"/, "khung ảnh trong bảng mô tả"],
  [/loading="lazy"/, "ảnh chỉ tải khi cần (loading=lazy)"],
  [/width="640" height="640"/, "khai sẵn kích thước ảnh để trang không giật khi ảnh tải xong"],
  [/class="hang-anh-chu troi-ngang"/, "hàng ghép ảnh với khối chữ đầu tiên"],
  [/veKhoiMoTa\(danhSach\[0\], 0, true\)/, "khối chữ đầu tiên nằm chung hàng với ảnh"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// map() truyền cả mảng vào tham số thứ ba của veKhoiMoTa — rơi trúng cờ
// trongHang và tắt mất hiệu ứng trôi. Lỗi này đã xảy ra một lần, chặn lại.
if (/\.map\(veKhoiMoTa\)/.test(banNoi)) {
  fail("Không được truyền thẳng veKhoiMoTa vào .map() — hãy bọc qua function(k, i).");
}

[
  [/\.hang-anh-chu\s*\{[\s\S]*?flex-wrap:\s*wrap/, "hàng ảnh + chữ tự xuống dòng trên màn hình hẹp"],
  [/\.anh-san-pham\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1/, "ảnh giữ khung vuông 1:1"],
  [/\.anh-san-pham img\s*\{[\s\S]*?object-fit:\s*cover/, "ảnh phủ kín khung mà không méo"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 13) KHẨU HIỆU SẢN PHẨM 1, NHỊP TRƯỢT KHUNG ẢNH, NÚT YÊU CẦU HOÀN TIỀN
// ---------------------------------------------------------------------------
[
  [/<span class="dong-dau">Lightroom Tiếng Việt dễ sử dụng - Premium<\/span>/,
    "dòng mở đầu của khẩu hiệu sản phẩm 1"],
  [/Mở toàn bộ kho vũ khí của Lightroom ngay trên chiếc điện thoại/,
    "câu khẩu hiệu cũ của sản phẩm 1 vẫn giữ"],
  [/class="nut nut-rong nut-hoan-tien"[^']*data-hanh-dong="mo-module" data-module="hoan-tien"/,
    "nút Yêu cầu hoàn tiền trong module, dẫn đúng module hoan-tien"],
  [/Yêu cầu hoàn tiền 100% với sản phẩm đã mua/, "tên nút Yêu cầu hoàn tiền trong module"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Thẻ <a href="https://zalo.me/..."> in thẳng số vào HTML — cấm hẳn.
if (/<a[^>]*zalo\.me/.test(banNoi)) {
  fail('Không được dựng sẵn thẻ <a href> tới zalo.me — số Zalo phải đọc từ Realtime Database lúc chạy.');
}

// Nút hoàn tiền phải đứng SAU nút Đặc quyền và TRƯỚC khung quà tặng.
{
  const iDacQuyen = banNoi.indexOf("nut-dac-quyen");
  const iHoanTien = banNoi.indexOf("nut-hoan-tien");
  const iKhuQua = banNoi.indexOf("veKhuQuaTang();");
  if (!(iDacQuyen < iHoanTien && iHoanTien < iKhuQua)) {
    fail('Nút "Yêu cầu hoàn tiền" phải nằm dưới nút Đặc quyền và trên khung quà tặng.');
  }
}

[
  [/\.khoi-khau-hieu \.dong-dau\s*\{[\s\S]*?display:\s*block/, "dòng mở đầu khẩu hiệu đứng riêng một dòng"],
  [/\.hang-anh-chu\.troi-ngang\s*\{[^}]*animation-duration:\s*4\.25s/,
    "khung chứa ảnh trượt trong 4,25 giây (chậm gấp 5 lần khối chữ)"],
  [/\.troi-ngang\s*\{[\s\S]*?troi-tu-phai\s+\.85s/, "nhịp trượt gốc 0,85 giây của các khối chữ"],
  [/\.nut-hoan-tien\s*\{/, "kiểu riêng cho nút Yêu cầu hoàn tiền trong module"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 14) BỐ CỤC MÀN HÌNH HẸP VÀ NÚT NỔI BỒNG BỀNH
// ---------------------------------------------------------------------------
[
  [/@media \(max-width: 560px\)\s*\{[^@]*?\.thanh-bao-gia \.so-lieu\s*\{[^}]*order:\s*-1/,
    "màn hẹp: khối số liệu lên tầng trên, hai nút xuống tầng dưới"],
  [/@media \(max-width: 560px\)\s*\{[^@]*?\.the-sanpham \.gia-chot\s*\{[^}]*flex:\s*0 0 100%/,
    "màn hẹp: giá chốt luôn đứng riêng một dòng"],
  [/\.nut-noi\s*\{\s*animation:\s*bong-benh\s+5s[^;]*infinite/, "nút nổi bồng bềnh, mỗi vòng 5 giây"],
  [/\.nut-noi\.menu-dang-mo\s*\{\s*animation:\s*none/, "nút đứng yên khi menu đang mở"],
  [/@keyframes\s+bong-benh\s*\{[\s\S]*?60%[^}]*translateY\(0\)[\s\S]*?100%[^}]*translateY\(0\)/,
    "nhịp bồng bềnh: 3 giây nhấp nhô (tới mốc 60%) rồi 2 giây đứng im"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 15) TÊN MODULE BÁN HÀNG PHẢI THỐNG NHẤT TRONG TOÀN APP
// ---------------------------------------------------------------------------
{
  const TEN_MODULE = "Trọn bộ sản phẩm VIP cho Lightroom, Photoshop và Thiết kế";
  const html = doc("index.html");

  if (!new RegExp(`ma: 'goi-vip',\\s*ten: '${TEN_MODULE}'`).test(banNoi)) {
    fail(`Mục menu của module bán hàng phải mang tên "${TEN_MODULE}".`);
  }
  if (!banNoi.includes(`<h2>${TEN_MODULE}</h2>`)) {
    fail(`Tiêu đề trong module bán hàng phải là "${TEN_MODULE}".`);
  }
  if (!banNoi.includes(`<strong class="chu-nhan">${TEN_MODULE}</strong>`)) {
    fail(`Màn "đang nâng cấp" phải mời sang "${TEN_MODULE}".`);
  }
  if ((html.match(new RegExp(TEN_MODULE, "g")) || []).length < 6) {
    fail(`index.html phải dùng "${TEN_MODULE}" ở đủ tiêu đề và các thẻ meta.`);
  }
  // Tên cũ không được sót lại ở bất kỳ đâu.
  [banNoi, html, cssApp, cssBase].forEach((noiDung) => {
    if (/Gói hàng VIP/.test(noiDung)) {
      fail('Tên module cũ "Gói hàng VIP Lightroom" vẫn còn sót — phải đổi hết thành tên mới.');
    }
  });
  // Mã module là địa chỉ #hash khách đã lưu, đổi là gãy mọi liên kết cũ.
  if (!/MODULE_MAC_DINH\s*=\s*'goi-vip'/.test(banNoi)) {
    fail("Mã module bán hàng phải giữ nguyên là 'goi-vip' — đổi sẽ làm gãy các liên kết #hash cũ.");
  }
}

// ---------------------------------------------------------------------------
// 16) THÔNG BÁO MỨC GIẢM BẬT RA TẠI THẺ, ẢNH BẢNG ĐẶC QUYỀN, NÚT TƯ VẤN
// ---------------------------------------------------------------------------
[
  [/function\s+hienThongBaoGiam\(maSanPham\)/, "thông báo mức giảm nhận mã sản phẩm vừa bấm"],
  [/hienThongBaoGiam\(ma\)/, "chọn/bỏ chọn một sản phẩm thì truyền mã vào thông báo"],
  [/el\.classList\.add\('tai-the'\)/, "thông báo gắn toạ độ theo thẻ vừa bấm"],
  [/const\s+ANH_DAC_QUYEN\s*=\s*'\/assets\/anh\/dac-quyen\.jpg'/, "ảnh minh hoạ của bảng Đặc quyền"],
  [/function\s+veOAnh\s*\(/, "hàm dựng ô ảnh dùng chung"],
  [/veOAnh\(ANH_DAC_QUYEN/, "bảng Đặc quyền dùng ô ảnh đó"],
  [/<span class="chu-nhan-xanh">học thêm khoá thiết kế bạn thích/, "phần khẩu hiệu được tô nhấn"],
  [/class="nut nut-rong nut-tu-van"/, 'nút "Tôi cần được Tư vấn thêm"'],
  [/Tôi cần được Tư vấn thêm/, "tên nút Tư vấn"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Bấm "Chọn tất cả" thì thông báo phải ra giữa màn hình, tức KHÔNG truyền mã.
if (!/function\s+chonTatCa\(\)\{[\s\S]{0,400}?hienThongBaoGiam\(\);/.test(banNoi)) {
  fail('Nút "Chọn tất cả" phải gọi hienThongBaoGiam() không tham số để thông báo ra giữa màn hình.');
}

// Nút Tư vấn cố ý chưa nối việc, nhưng KHÔNG được disabled (disabled làm nút xám).
if (/class="nut nut-rong nut-tu-van"[^>]*(disabled|data-hanh-dong)/.test(banNoi)) {
  fail('Nút Tư vấn không được đặt disabled, cũng chưa được gắn data-hanh-dong.');
}

if (!fs.existsSync(path.join(root, "src/anh/dac-quyen.jpg"))) {
  fail("Thiếu tệp ảnh src/anh/dac-quyen.jpg.");
}

[
  [/\.thong-bao-giam\.tai-the\s*\{[\s\S]*?animation:\s*thong-bao-giam-tai-the/,
    "nhịp riêng cho thông báo bật ra tại thẻ"],
  [/@keyframes\s+thong-bao-giam-tai-the\s*\{[\s\S]*?scale\(1\.6\)[\s\S]*?translateY\(46vh\)/,
    "thông báo tại thẻ vẫn bung 1,6 lần rồi trôi xuống mất hẳn"],
  [/\.khoi-khau-hieu \.chu-nhan-xanh\s*\{[\s\S]*?display:\s*block[\s\S]*?color:\s*var\(--xanh\)/,
    "phần tô nhấn xuống hàng riêng và mang màu xanh"],
  [/\.nut-tu-van\s*\{/, "kiểu riêng cho nút Tư vấn"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 17) MỖI ĐỢT NHÚN NHẢY CHỈ MỘT LẦN NẢY, CÂU MỜI Ở Ô EMAIL, MỤC MENU MỚI
// ---------------------------------------------------------------------------
// Nhún nhảy hai lần liên tiếp nhìn lâu mỏi mắt, nên mỗi đợt chỉ được có ĐÚNG
// MỘT mốc phóng to. Đếm số mốc scale lớn hơn 1 trong mỗi khối keyframes.
[
  ["nhun-nhay-mua-hang", 1],
  ["nhun-nhay-cam-ket", 1],
].forEach(([ten, soLanToiDa]) => {
  const khoi = cssApp.match(new RegExp(`@keyframes\\s+${ten}\\s*\\{[^@]*?\\n\\}`));
  if (!khoi) {
    fail(`Không thấy khối @keyframes ${ten} trong src/css/app.css.`);
    return;
  }
  const soLanPhongTo = (khoi[0].match(/scale\((?:1\.\d+|[2-9])/g) || []).length;
  if (soLanPhongTo !== soLanToiDa) {
    fail(`@keyframes ${ten} phải có đúng ${soLanToiDa} lần phóng to mỗi đợt, đang thấy ${soLanPhongTo}.`);
  }
});

[
  [/khuyến khích nhập Email để nhận sản phẩm Nhanh chỉ trong 1 phút/, "câu mời nhập email ở ô Email"],
  [/bỏ qua nếu chưa có email/, "câu mời nói rõ có thể bỏ qua"],
  [/class="nhan-phu"/, "chỗ hiện câu mời cạnh tên trường"],
  [/function\s+veOTruong\(ten, nhan, giaTri, goiY, kieu, nhanPhu\)/, "tham số nhãn phụ của ô nhập liệu"],
  [/ma:\s*'cong-nhan'[\s\S]{0,90}?kieu:\s*'modal'/, "mục Sự công nhận của khách hàng trong menu"],
  [/Sự công nhận của khách hàng/, "tên mục menu mới"],
  [/m\.ma === 'cong-nhan'/, "bảng Sự công nhận báo đang được thiết kế"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Mục mới phải đứng ngay dưới "Liên hệ shop".
if (banNoi.indexOf("ma: 'cong-nhan'") < banNoi.indexOf("ma: 'lien-he'")) {
  fail('Mục "Sự công nhận của khách hàng" phải nằm DƯỚI mục "Liên hệ shop".');
}

if (!/\.truong label \.nhan-phu\s*\{/.test(cssApp)) {
  fail("Thiếu kiểu riêng cho câu mời cạnh tên trường trong src/css/app.css.");
}

// ---------------------------------------------------------------------------
// 18) SỐ TÀI KHOẢN VÀ SỐ ZALO KHÔNG ĐƯỢC LỌT VÀO MÃ NGUỒN.
//    Thông tin chuyển khoản chỉ nằm trong Realtime Database, đọc lúc chạy.
//    Quét toàn bộ tệp trong kho (trừ .git, public/, node_modules).
// ---------------------------------------------------------------------------
// Số tài khoản, tên chủ tài khoản, tên ngân hàng và SỐ ZALO của shop đều chỉ
// được nằm trong Realtime Database, tuyệt đối không nằm trong mã nguồn.
const CAM = [/10001034848/, /PHAM\s+VAN\s+THANH/i, /\bTPBank\b/i, /\b\+?84\s*9\s*1\s*7\s*1\s*1\s*4\s*9\s*4\s*1\b/, /917114941/];
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
