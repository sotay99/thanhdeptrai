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
  ["Khoá học chỉnh màu Lightroom điện thoại", 199000, 0],
  ["Khoá học Lightroom máy tính PC", 199000, 0],
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
// 3) Nội dung chuyển khoản: "LR" viết hoa + DẤU CÁCH + mã đơn 6 ký tự, đúng
//    9 ký tự. Ngắn tới mức không ngân hàng nào cắt, và khớp từ khoá "LR" đã
//    đặt trong app đọc thông báo ngân hàng.
//
//    Dấu cách là bắt buộc: không có nó thì "LRWNAT7M" dính thành một khối,
//    khách đọc lại trên app ngân hàng không biết đâu là mã đơn của mình.
// ---------------------------------------------------------------------------
[
  [/return\s+'LR '\s*\+\s*\(state\.maDonNgan\s*\|\|\s*''\)/,
    'nội dung chuyển khoản là "LR" + dấu cách + mã đơn'],
  [/const\s+DAI_MA_DON\s*=\s*6\s*;/, "mã đơn dài 6 ký tự"],
  [/const\s+CHU_MA_DON\s*=\s*'23456789ABCDEFGHJKMNPQRSTUVWXYZ'/,
    "bảng ký tự sinh mã đơn, đã bỏ 0 O 1 I L cho khỏi đọc nhầm"],
  [/function\s+sinhMaDon\s*\(/, "hàm sinh mã đơn"],
  [/state\.maDonNgan\s*=\s*sinhMaDon\(\);/, "sinh mã đơn trước khi dựng bảng thanh toán"],
  [/maDon:\s*state\.maDonNgan/, "mã đơn được lưu vào đơn hàng"],
  [/function\s+chuKyDon\s*\(/, "hàm vân tay đơn hàng"],
  [/if\s*\(!state\.maDonNgan\s*\|\|\s*state\.chuKyDon\s*!==\s*chuKy\)/,
    "chỉ sinh mã đơn mới khi đơn thật sự đổi — bấm tới bấm lui không đẻ đơn trùng"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Bốn cặp ký tự dễ đọc nhầm trên màn hình ngân hàng: 0/O, 1/I/L.
["0", "O", "1", "I", "L"].forEach((ky) => {
  const bang = banNoi.match(/const\s+CHU_MA_DON\s*=\s*'([^']*)'/);
  if (bang && bang[1].includes(ky)) {
    fail(`Bảng ký tự sinh mã đơn không được chứa "${ky}" — dễ đọc nhầm khi đối chiếu ngân hàng.`);
  }
});

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

// ---------------------------------------------------------------------------
// 14) APPS SCRIPT — email báo shop LUÔN kèm mẩu tin nhắn Zalo
//     Chủ shop cần chép mẩu tin gửi cho khách, kể cả khi khách đã có email
//     (khách chưa thấy email, khách hỏi lại, khách muốn được nhắn cho chắc).
// ---------------------------------------------------------------------------
{
  const gs = doc("apps-script/gui-hang.gs");
  [
    [/function\s+soanTinZalo\s*\(/, "hàm soạn mẩu tin nhắn Zalo"],
    [/Mẩu tin nhắn Zalo — bôi đen rồi chép:/, "nhãn mẩu tin nhắn Zalo trong email báo shop"],
    [/thoatHtml\(soanTinZalo\(don\)\)/, "mẩu tin Zalo được nhúng vào email báo shop"],
    [/linkNhanHangCuaDon\(don\)\s*\+\s*'\\n\\n'/, "mẩu tin Zalo có kèm đường dẫn nhận sản phẩm RIÊNG của đơn"],
    [/function\s+sinhMaNhanHang\s*\(/, "hàm sinh mã nhận hàng riêng cho từng đơn"],
    [/function\s+linkNhanHangCuaDon\s*\(/, "hàm dựng đường dẫn nhận hàng riêng của một đơn"],
    [/LINK_NHAN_HANG\s*\+\s*'\?ma='/, "đường dẫn riêng mang mã nhận hàng theo dạng ?ma="],
    [/capNhatDon\(don\.__ma,\s*\{\s*maNhanHang:\s*don\.maNhanHang\s*\}\)/,
      "mã nhận hàng được lưu lại vào đơn trước khi gửi thư"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(gs)) fail(`Thiếu ${ten} trong apps-script/gui-hang.gs.`);
  });

  // Script KHÔNG được giữ bảng đường tải nữa: đường tải chỉ do máy chủ cấp phát
  // biết. Script Property LINK_TAI từng tồn tại và từng in thẳng link vào thư.
  if (/LINK_TAI['"]/.test(gs) || /function\s+bangDuongTai\s*\(/.test(gs)) {
    fail("apps-script không được giữ bảng đường tải (LINK_TAI / bangDuongTai) — đường tải chỉ do máy chủ cấp phát biết.");
  }
  [
    [/function\s+docDanhMuc\s*\(/, "hàm đọc danh mục từ Firebase"],
    [/function\s+sanPhamThieuHang\s*\(/, "hàm kiểm sản phẩm chưa có hàng để giao"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(gs)) fail(`Thiếu ${ten} trong apps-script/gui-hang.gs.`);
  });

  // Thư gửi khách KHÔNG được chứa đường tải file. Ai chuyển tiếp lá thư đó đi là
  // mất hàng, mà shop không cách nào biết. Thư chỉ được mang đường dẫn riêng.
  {
    const thu = gs.match(/function\s+soanThuGiaoHang\s*\([\s\S]*?\n\}/);
    if (!thu) {
      fail("Thiếu hàm soanThuGiaoHang trong apps-script/gui-hang.gs.");
    } else {
      if (/bangDuongTai\(\)/.test(thu[0])) {
        fail("Thư giao hàng không được lấy bảng đường tải — đường tải chỉ do máy chủ cấp phát giữ.");
      }
      if (!/linkNhanHangCuaDon\(don\)/.test(thu[0])) {
        fail("Thư giao hàng phải mang đường dẫn nhận hàng riêng của đơn.");
      }
    }
  }

  // Mẩu tin từng chỉ hiện khi khách KHÔNG có email. Nay phải luôn hiện.
  if (/\(don\.email\s*\?\s*''\s*:[\s\S]{0,120}soanTinZalo/.test(gs)) {
    fail('Mẩu tin nhắn Zalo không được đặt sau điều kiện "khách không có email" — phải luôn có trong email báo shop.');
  }
}

// ---------------------------------------------------------------------------
// 15) TRANG NHẬN HÀNG "/sanpham"
//     Địa chỉ này nằm trong email và trong tin nhắn Zalo đã gửi cho khách nên
//     KHÔNG được đổi. Hai luật xương sống:
//       - Mỗi khách một đường dẫn riêng, KHÔNG bắt khách gõ mã kích hoạt.
//       - Nút tải xuống chỉ được dựng ra SAU KHI máy chủ trả lời là được phép.
// ---------------------------------------------------------------------------
[
  [/const\s+DUONG_DAN_NHAN_HANG\s*=\s*'\/sanpham'/, 'đường dẫn trang nhận hàng là "/sanpham"'],
  [/function\s+docDuongDan\s*\(/, "hàm đọc đường dẫn để rẽ nhánh trang"],
  [/function\s+docMaNhanHangTrenDuongDan\s*\(/, "hàm đọc mã nhận hàng từ chính đường dẫn"],
  [/function\s+veTrangNhanHang\s*\(/, "hàm vẽ trang nhận hàng"],
  [/function\s+veTheNhanHang\s*\(/, "hàm vẽ thẻ sản phẩm ở trang nhận hàng"],
  [/>Sử dụng sản phẩm này</, 'nút "Sử dụng sản phẩm này" ở cuối thẻ nhận hàng'],
  [/rtdb\.ref\('thongtinkho'\)/, "địa chỉ máy chủ cấp phát đọc từ Realtime Database"],
  [/function\s+chuanHoaMaNhanHang\s*\(/, "hàm chuẩn hoá mã nhận hàng"],
  [/MỘT thiết bị/, "lời cảnh báo mỗi sản phẩm chỉ tải được trên một thiết bị"],
  [/state\.trang\s*===\s*'sanpham'/, "trang nhận hàng được rẽ nhánh theo state.trang"],
  [/function\s+moModalKhoaHoc\s*\(/, "bảng riêng cho hai khoá học"],
  [/function\s+moModalDrive\s*\(/, "bảng riêng cho sản phẩm để trên Google Drive"],
  [/function\s+taiDanhMuc\s*\(/, "hàm đọc danh mục sản phẩm"],
  [/rtdb\.ref\('danhmuc'\)/, "danh mục đọc từ Realtime Database"],
  [/function\s+laTronBo\s*\(/, "hàm nhận biết gói trọn bộ"],
  [/Vào module /, 'nút "Vào module ..." của hai khoá học'],
  [/bấm <strong>nút quay lại<\/strong>/, "lời dặn cách quay lại trang nhận hàng"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Khách KHÔNG bao giờ phải gõ mã: mỗi người một đường dẫn riêng. Có ô nhập mã
// nào mọc lại trong trang nhận hàng là sai hẳn thiết kế.
if (/o-ma-kich-hoat|data-truong-kich-hoat|Mã kích hoạt/.test(banNoi)) {
  fail("Trang nhận hàng không được bắt khách gõ mã kích hoạt — mỗi khách đã có một đường dẫn riêng.");
}

// Hai khoá học phải đi nhánh riêng TRƯỚC khi rơi vào luồng tải file.
{
  const than = banNoi.match(/function\s+moModalNhanHang\s*\([\s\S]*?\n  \}/);
  if (!than) {
    fail("Thiếu hàm moModalNhanHang.");
  } else if (than[0].indexOf("moModalKhoaHoc") < 0) {
    fail("moModalNhanHang phải rẽ hai khoá học sang bảng riêng, không cho rơi vào luồng tải file.");
  }
}

// Nút tải xuống PHẢI nằm sau nhánh "máy chủ đã cho phép". Dựng sẵn rồi ẩn đi là
// hỏng cả cơ chế — mở F12 lên là thấy đường dẫn.
{
  const than = banNoi.match(/function\s+veKetQuaNhanHang\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  if (!than) {
    fail("Thiếu hàm veKetQuaNhanHang — nơi duy nhất được dựng nút tải xuống.");
  } else {
    const doan = than[0];
    if (!/if\s*\(!kq\.duoc\)/.test(doan)) {
      fail("veKetQuaNhanHang phải chặn trước ở nhánh máy chủ TỪ CHỐI rồi mới tới nút tải.");
    }
    if (doan.indexOf("nut-tai-ve") < doan.indexOf("if (!kq.duoc)")) {
      fail("Nút tải xuống bị dựng TRƯỚC khi kiểm tra máy chủ có cho phép hay không.");
    }
  }
  if (/\.nut-tai-ve[^{]*\{[^}]*display:\s*none/.test(cssApp)) {
    fail("Không được dựng sẵn nút tải rồi ẩn bằng CSS — ẩn bằng CSS thì mở F12 là thấy.");
  }
}

// ---------------------------------------------------------------------------
// 16) TRANG QUẢN TRỊ "/admin"
//     Quyền THẬT nằm ở database.rules.json, không ở giao diện. Và khoá API của
//     AI không bao giờ được đi qua trình duyệt khách.
// ---------------------------------------------------------------------------
{
  const rules = doc("database.rules.json");
  const EMAIL_CHU_SHOP = ["lookatmevanthanhpham@gmail.com", "219thanhdeptrai@gmail.com"];

  [
    [/const\s+DUONG_DAN_ADMIN\s*=\s*'\/admin'/, 'đường dẫn trang quản trị là "/admin"'],
    [/function\s+veTrangAdmin\s*\(/, "hàm vẽ trang quản trị"],
    [/function\s+laChuShop\s*\(/, "hàm kiểm email chủ shop"],
    [/signInWithPopup/, "đăng nhập Google bằng cửa sổ bật lên"],
    [/firebase-auth-compat\.js/, "SDK đăng nhập"],
    [/napMotLan\(AUTH_SDK/, "SDK đăng nhập được nạp ĐỘNG, không nằm trong index.html"],
    [/napMotLan\(CSS_ADMIN/, "CSS quản trị được nạp ĐỘNG"],
    [/state\.trang\s*===\s*'admin'/, "trang quản trị được rẽ nhánh theo state.trang"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Hai email phải có mặt ở CẢ HAI nơi. Thiếu ở Rules là ai đăng nhập cũng ghi
  // đè được số tài khoản; thiếu trong mã là chủ shop đăng nhập xong bị từ chối.
  EMAIL_CHU_SHOP.forEach((email) => {
    if (!banNoi.includes(email)) {
      fail(`Email chủ shop ${email} không có trong danh sách EMAIL_CHU_SHOP của mã nguồn.`);
    }
    if (!rules.includes(email)) {
      fail(`Email chủ shop ${email} không có trong database.rules.json — giao diện chặn được, Rules thì không.`);
    }
  });

  // Rules phải đòi email ĐÃ XÁC MINH. Thiếu điều kiện này thì một tài khoản
  // Google tự dựng, khai email trùng nhưng chưa xác minh, vẫn ghi được.
  if (!/email_verified/.test(rules)) {
    fail("database.rules.json phải đòi auth.token.email_verified === true cho quyền ghi của chủ shop.");
  }

  // Firebase hiểu "//" là dấu mở CHÚ THÍCH, nên một khoá JSON tên "//" làm hỏng
  // cả bộ luật — Console từ chối với "Expected '{'". Lỗi này đã xảy ra thật.
  // Chú thích của bộ luật để trong CLAUDE.md, không để trong chính tệp.
  if (/"\/\//.test(rules)) {
    fail('database.rules.json không được có khoá "//" — Firebase hiểu đó là dấu mở chú thích và từ chối cả bộ luật.');
  }

  // Nhánh giữ khoá AI TUYỆT ĐỐI không được cho đọc công khai.
  {
    const khoiAdmin = rules.match(/"admin"\s*:\s*\{[\s\S]*?\n    \},?\n/);
    if (!khoiAdmin) {
      fail('database.rules.json thiếu nhánh "admin" — nơi giữ khoá API của AI.');
    } else if (/"\.read"\s*:\s*true/.test(khoiAdmin[0])) {
      fail('Nhánh "admin" đang cho ĐỌC CÔNG KHAI — khoá API của AI sẽ lộ cho bất kỳ ai.');
    }
  }

  // Ba nhánh web khách cần đọc thì phải còn đọc công khai, nếu không nút Zalo
  // và mã QR ngoài web chết câm.
  ["thongtinthanhtoan", "thongtinlienhe", "thongtinkho"].forEach((nhanh) => {
    const khoi = rules.match(new RegExp('"' + nhanh + '"\\s*:\\s*\\{[\\s\\S]*?\\n    \\},?\\n'));
    if (!khoi) fail(`database.rules.json thiếu nhánh "${nhanh}".`);
    else if (!/"\.read"\s*:\s*true/.test(khoi[0])) {
      fail(`Nhánh "${nhanh}" phải cho đọc công khai — web của khách đọc nó lúc chạy.`);
    }
  });

  // Trang quản trị KHÔNG được tự gọi API AI: làm vậy là khoá đi qua trình duyệt.
  if (/api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com/.test(banNoi)) {
    fail("Mã web gọi thẳng API AI — khoá sẽ lộ cho bất kỳ ai mở tab Network. Phải gọi qua máy chủ trung gian.");
  }
}


// ---------------------------------------------------------------------------
// 17) DANH MỤC SẢN PHẨM VÀ HAI NGUỒN HÀNG
//     Kho riêng (R2) khoá được thiết bị; Google Drive công khai thì không.
//     Trang quản trị PHẢI nói thẳng điều đó ngay tại chỗ chọn, để không ai
//     chọn nhầm vì tưởng hai nguồn như nhau.
// ---------------------------------------------------------------------------
[
  [/const\s+NGUON_HANG\s*=\s*\{/, "bảng khai hai nguồn hàng"],
  [/function\s+veAdminDanhMuc\s*\(/, "module Danh mục sản phẩm trong trang quản trị"],
  [/function\s+sanPhamCoHang\s*\(/, "hàm lọc ra sản phẩm có hàng để giao"],
  [/function\s+adminLuuDanhMuc\s*\(/, "hàm lưu danh mục"],
  [/rtdb\.ref\('danhmuc\/'\s*\+\s*maSP\)/, "danh mục ghi theo từng sản phẩm"],
  [/không khoá được theo thiết bị/, "lời cảnh báo về giới hạn của Google Drive trong trang quản trị"],
  [/không thu hồi được/, "lời cảnh báo rằng link Drive không thu hồi được"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Hai khoá học không có hàng để giao — chúng phải bị loại khỏi danh mục, nếu
// không chủ shop ngồi khai tệp cho một thứ không có tệp nào.
{
  const than = banNoi.match(/function\s+sanPhamCoHang\s*\([\s\S]*?\n  \}/);
  if (than && !/MODULE_KHOA_HOC/.test(than[0])) {
    fail("sanPhamCoHang phải loại hai khoá học ra khỏi danh mục.");
  }
}


// ---------------------------------------------------------------------------
// 18) MÁY CHỦ CẤP PHÁT (worker/kho-worker.js)
//     Đây là thứ DUY NHẤT biết đường tới tệp thật. Bốn cửa kiểm tra trong
//     /cap-phat là toàn bộ lớp bảo vệ của kho hàng — thiếu một cửa là thủng.
// ---------------------------------------------------------------------------
{
  const wk = doc("worker/kho-worker.js");
  if (!wk) {
    fail("Thiếu worker/kho-worker.js — máy chủ cấp phát.");
  } else {
    [
      [/\/cap-phat/, "đường /cap-phat"],
      [/\/tai/, "đường /tai"],
      [/orderBy=.*maNhanHang/, "tra đơn theo mã nhận hàng"],
      [/khong-co-trong-don/, "cửa chặn sản phẩm không có trong đơn"],
      [/da-dung-thiet-bi-khac/, "cửa khoá thiết bị"],
      [/thietbi\/'\s*\+\s*maNhanHang/, "nhánh ghi nhớ thiết bị"],
      [/crypto\.subtle\.sign/, "ký token bằng HMAC"],
      [/crypto\.subtle\.verify/, "mở chữ ký token bằng HMAC"],
      [/env\.KHO\.get/, "đọc tệp từ binding R2"],
      [/Content-Disposition/, "buộc trình duyệt tải xuống thay vì mở trong tab"],
      [/gocDuocPhep/, "chặn lời gọi từ địa chỉ lạ"],
      [/\/don['"]/, "đường /don trả danh sách món đã mua"],
      [/function\s+donCuaToi\s*\(/, "hàm trả đơn của khách"],
      [/const\s+PHUT_SONG_THEO_SAN_PHAM\s*=\s*\{/, "bảng hạn dùng theo từng sản phẩm"],
      [/phutSong\(maSanPham\)/, "hạn token lấy theo sản phẩm"],
    ].forEach(([mau, ten]) => {
      if (!mau.test(wk)) fail(`Thiếu ${ten} trong worker/kho-worker.js.`);
    });

    // Bốn cửa phải nằm TRƯỚC lúc cấp token. Đảo thứ tự là cấp trước rồi mới hỏi.
    const iToken = wk.indexOf("taoToken(env, {");
    ["sai-ma", "khong-co-trong-don", "chua-khai", "da-dung-thiet-bi-khac"].forEach((cua) => {
      const i = wk.indexOf(cua);
      if (i === -1 || iToken === -1 || i > iToken) {
        fail(`Cửa kiểm tra "${cua}" phải chạy TRƯỚC khi cấp token tải.`);
      }
    });

    // Token phải có hạn. Token sống mãi thì chép ra dán cho ai cũng dùng được.
    if (!/than\.h/.test(wk) || !/Date\.now\(\) > than\.h/.test(wk)) {
      fail("Token tải phải có hạn dùng và phải được kiểm hạn khi rót tệp.");
    }

    // Khoá và địa chỉ Firebase KHÔNG được viết chết trong Worker.
    if (/firebasedatabase\.app/.test(wk.replace(/^\s*\*.*$/gm, ""))) {
      fail("Địa chỉ Firebase phải nằm trong biến môi trường của Worker, không viết chết trong mã.");
    }
  }

  // /don chỉ được trả danh sách mã sản phẩm. Trả cả đơn là lộ email, số điện
  // thoại và số tiền của khách cho bất cứ ai đoán trúng mã.
  {
    const wk = doc("worker/kho-worker.js");
    const than = wk.match(/async function\s+donCuaToi\s*\([\s\S]*?\n\}/);
    if (than && !/traJSON\(\{\s*duoc:\s*true,\s*maSanPham:\s*don\.maSanPham\s*\}/.test(than[0])) {
      fail("/don chỉ được trả về maSanPham — trả cả đơn là lộ email và số điện thoại của khách.");
    }
  }

  // Ba trạng thái của donCuaToi phải phân biệt được: null (chưa biết) khác hẳn
  // mảng rỗng (biết chắc chưa mua gì).
  [
    [/function\s+duocDung\s*\(/, "hàm quyết định món nào bấm được"],
    [/if\s*\(!state\.donCuaToi\)\s*return true/, "chưa biết đơn thì không làm mờ nút nào"],
    [/if\s*\(MODULE_KHOA_HOC\[maSP\]\)\s*return true/, "hai khoá học luôn bấm được"],
    [/khung-chua-mua/, "khung chữ thay cho nút ở món chưa mua"],
    [/Bạn chưa mua sản phẩm này/, "dòng chữ báo chưa mua"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // CẢ KHUNG THẺ là vùng bấm. Món chưa mua phải gỡ hành động khỏi thẻ, không thì
  // nút đã thành khung chữ mà bấm vào chỗ trống của thẻ vẫn mở bảng — với sp8 và
  // sp9 để trên Google Drive thì bảng mở ra là lộ nguyên đường dẫn Drive. Lỗi
  // thật đã xảy ra.
  {
    const than = banNoi.match(/function\s+veTheNhanHang\s*\([\s\S]*?\n  \}/);
    if (!than) {
      fail("Thiếu hàm veTheNhanHang.");
    } else if (!/\(mo \? ' data-hanh-dong="su-dung-san-pham"' : ''\)/.test(than[0])) {
      fail("Thẻ của món chưa mua vẫn mang data-hanh-dong — bấm vào chỗ trống của thẻ sẽ mở bảng và lộ đường dẫn Drive.");
    }
  }

  // Và một lớp chặn nữa ngay tại cửa mở bảng.
  {
    const than = banNoi.match(/function\s+moModalNhanHang\s*\([\s\S]*?\n  \}/);
    if (than && !/if\s*\(!duocDung\(sp\.ma\)\)\s*return;/.test(than[0])) {
      fail("moModalNhanHang phải tự chặn món khách chưa mua, không chỉ dựa vào việc thẻ không có hành động.");
    }
  }

  // Món chưa mua KHÔNG được là một cái nút bị mờ — nút mờ vẫn dụ người ta bấm.
  if (/nut-su-dung[^']*'\s*\+[^;]*disabled/.test(banNoi)) {
    fail("Món chưa mua phải là khung chữ, không phải nút disabled.");
  }

  // Đường dẫn tải KHÔNG được mang con số hạn ra ngoài — khách không cần biết
  // mình có bao lâu, và biết thì chỉ tổ dò.
  {
    const wk = doc("worker/kho-worker.js");
    if (/duongDan:[^;]*(phut|han|ttl|exp)=/.test(wk)) {
      fail("Đường dẫn tải không được mang hạn dùng ra ngoài.");
    }
  }

  // Ba trạng thái đường dẫn phải phân biệt được. Gộp "mất mạng" vào "mã sai" là
  // vu cho khách bấm nhầm link trong khi lỗi nằm ở phía mình.
  [
    [/function\s+veBaoDuongDanSai\s*\(/, "dải báo đường dẫn sai ở đầu trang"],
    [/state\.trangThaiDon\s*=\s*'sai-ma'/, "trạng thái mã sai"],
    [/state\.trangThaiDon\s*=\s*'thieu-ma'/, "trạng thái thiếu mã"],
    [/state\.trangThaiDon\s*=\s*'khong-hoi-duoc'/, "trạng thái không hỏi được máy chủ"],
    [/đúng đường dẫn shop đã gửi/, "lời dặn bấm đúng đường dẫn shop gửi"],
    [/Bấm nút bên dưới là mở thư mục chứa toàn bộ tệp/, "câu hướng dẫn ở bảng Google Drive"],
    [/>Mở thư mục và tải file về<\/a>/, "tên nút ở bảng Google Drive"],
    [/class="canh-bao-trinh-duyet"/, "dải dặn mở bằng trình duyệt thật"],
    [/không nên truy cập trang này ngay bên trong app zalo hoặc email/,
      "câu dặn đừng mở trong app Zalo hay ứng dụng thư"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // 'khong-hoi-duoc' KHÔNG được khoá món nào — lỗi phía mình thì đừng đổ cho khách.
  {
    const than = banNoi.match(/function\s+duocDung\s*\([\s\S]*?\n  \}/);
    if (than && /khong-hoi-duoc/.test(than[0])) {
      fail("Không hỏi được máy chủ thì KHÔNG được khoá món nào — đó là lỗi phía mình, không phải khách bấm nhầm link.");
    }
  }

  // Dải báo đường dẫn sai phải nhún một nhịp rồi nghỉ 2 giây, lặp mãi. Nhịp nhún
  // dài đúng bằng nhịp của khung cam kết giao hàng ở modal đơn hàng — hai chỗ
  // nhún giống hệt nhau, chỉ khác quãng nghỉ.
  {
    const khoi = cssApp.match(/\.bao-duong-dan-sai\s*\{[^}]*\}/);
    if (!khoi || !/animation:\s*nhun-nhay-bao-sai\s+2\.3s[^;]*infinite/.test(khoi[0])) {
      fail("Dải báo đường dẫn sai phải nhún theo nhịp 2,3s lặp mãi.");
    }
    const nhip = cssApp.match(/@keyframes\s+nhun-nhay-bao-sai\s*\{[\s\S]*?\n\}/);
    if (!nhip) {
      fail("Thiếu @keyframes nhun-nhay-bao-sai.");
    } else if (!/12\.5%/.test(nhip[0])) {
      // 12,5% của 2,3s = 0,2875s nhún, còn lại đúng 2 giây nghỉ. Đổi mốc này là
      // đổi quãng nghỉ mà không ai nhận ra.
      fail("Nhịp nhún phải kết thúc ở mốc 12,5% — đúng 2 giây nghỉ sau đó.");
    }
    if (!/@media\s*\(prefers-reduced-motion: reduce\)\s*\{\s*\.bao-duong-dan-sai\s*\{\s*animation:\s*none/.test(cssApp)) {
      fail("Dải báo đường dẫn sai phải tắt hiệu ứng khi máy khách xin giảm chuyển động.");
    }
  }

  // Dải dặn trình duyệt phải đứng TRÊN cảnh báo thiết bị, và phải khác màu nó.
  // Cùng tông đỏ đặt cạnh nhau thì mắt gộp thành một khối và người ta chỉ đọc
  // cái đầu — mất luôn một trong hai lời dặn.
  {
    const than = banNoi.match(/function\s+veThanNhanHang\s*\([\s\S]*?\n  \}/);
    if (!than) {
      fail("Thiếu hàm veThanNhanHang.");
    } else if (than[0].indexOf("canh-bao-trinh-duyet") > than[0].indexOf("canh-bao-thiet-bi")) {
      fail("Dải dặn trình duyệt phải nằm TRÊN cảnh báo thiết bị.");
    }
    const khoi = cssApp.match(/\.khung-nhan-hang \.canh-bao-trinh-duyet\s*\{[^}]*\}/);
    if (!khoi) fail("Thiếu khối CSS .khung-nhan-hang .canh-bao-trinh-duyet.");
    else if (!/background:\s*rgba\(45,\s*157,\s*95/.test(khoi[0])) {
      fail("Dải dặn trình duyệt phải có nền xanh lá nhạt, khác tông đỏ của cảnh báo thiết bị.");
    }
  }

  // Mọi lời báo phải tự xuống hàng, nếu không câu dài tràn qua mép phải màn hình.
  ["\\.dong-tep-nhan \\.loi-nhan-hang", "\\.khung-chua-mua", "\\.bao-duong-dan-sai \\.chu", "\\.canh-bao-trinh-duyet \\.chu"].forEach((chon) => {
    const khoi = cssApp.match(new RegExp(chon + "\\s*\\{[^}]*\\}"));
    if (!khoi) fail(`Thiếu khối CSS ${chon}.`);
    else if (!/overflow-wrap:\s*anywhere/.test(khoi[0])) {
      fail(`${chon} thiếu overflow-wrap: anywhere — câu dài sẽ tràn qua mép phải màn hình.`);
    }
  });

  // Trang nhận hàng phải gửi kèm mã thiết bị, nếu không Worker không khoá được.
  [
    [/function\s+maThietBi\s*\(/, "hàm sinh mã thiết bị"],
    [/thietBi:\s*maThietBi\(\)/, "mã thiết bị được gửi kèm khi xin cấp phát"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Nhánh thiết bị TUYỆT ĐỐI không cho khách đọc — đọc được là thấy mã nhận
  // hàng của người khác.
  {
    const rules = doc("database.rules.json");
    const khoi = rules.match(/"thietbi"\s*:\s*\{[\s\S]*?\n    \},?\n/);
    if (!khoi) fail('database.rules.json thiếu nhánh "thietbi".');
    else if (/"\.read"\s*:\s*true/.test(khoi[0]) || /"\.write"\s*:\s*true/.test(khoi[0])) {
      fail('Nhánh "thietbi" không được mở cho khách — chỉ Worker (qua khoá dịch vụ) và chủ shop.');
    }
    if (!/"maNhanHang"/.test((rules.match(/"\.indexOn"[\s\S]{0,120}/) || [""])[0])) {
      fail('donhang phải có .indexOn "maNhanHang" — Worker tra đơn theo mã đó.');
    }
  }
}

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
// 18) MODULE MỚI TRONG MENU VÀ BỐ CỤC ĐẦU THẺ SẢN PHẨM
// ---------------------------------------------------------------------------
[
  [/ma:\s*'video-ngan'[\s\S]{0,90}?kieu:\s*'trang'/, "module Xem video ngắn"],
  [/ma:\s*'khoa-photoshop'[\s\S]{0,110}?kieu:\s*'trang'/, "module Khoá Photoshop"],
  [/ten:\s*'Khoá Photoshop - edit ảnh bằng điện thoại \(miễn phí\)'/, "tên mới của module Khoá Photoshop"],
  [/ma:\s*'app-vip-pro'[\s\S]{0,90}?kieu:\s*'trang'/, "module Mua App VIP pro giá rẻ"],
  [/ten:\s*'Liên hệ và Thông tin về Shop'/, "tên mới của mục Liên hệ"],
  [/ten:\s*'Khoá học chỉnh màu Lightroom điện thoại \(miễn phí\)'/, "tên mới của module khoá học điện thoại"],
  [/ten:\s*'Khoá học Lightroom máy tính PC \(miễn phí\)'/, "tên mới của module khoá học máy tính"],
  [/function\s+veAnhDaiDien\s*\(/, "hàm dựng ảnh đại diện của thẻ sản phẩm"],
  [/const\s+ANH_DAI_DIEN\s*=/, "bảng ảnh đại diện"],
  [/class="dau-the"/, "đầu thẻ chia hai phần"],
  [/class="so-tt" aria-hidden="true"/, "số thứ tự đóng khung"],
  [/class="anh-dai-dien trong"/, "khung ảnh rỗng giữ chỗ khi chưa có ảnh"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});

// Thứ tự các mục trong menu.
[
  ["video-ngan", "lien-he", '"Xem video ngắn" phải nằm TRÊN "Liên hệ và Thông tin về Shop"'],
  ["khoa-hoc-may-tinh", "khoa-photoshop", '"Khoá Photoshop" phải nằm DƯỚI "Khoá học Lightroom máy tính PC"'],
  ["lien-he", "cong-nhan", '"Sự công nhận" phải nằm DƯỚI "Liên hệ và Thông tin về Shop"'],
].forEach(([truoc, sau, loi]) => {
  if (banNoi.indexOf(`ma: '${truoc}'`) > banNoi.indexOf(`ma: '${sau}'`)) fail(loi);
});

// Ô "SẢN PHẨM N" cũ đã gộp vào dòng tên, không được còn sót.
if (/class="so-thu-tu">SẢN PHẨM/.test(banNoi)) {
  fail('Ô "SẢN PHẨM N" cũ phải được gộp vào dòng tên sản phẩm.');
}

[
  [/\.the-sanpham \.dau-the\s*\{[\s\S]*?display:\s*flex/, "đầu thẻ xếp ngang: ảnh trái, chữ phải"],
  [/\.the-sanpham \.anh-dai-dien\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1/, "ảnh đại diện giữ khung vuông 1:1"],
  [/\.the-sanpham \.so-tt\s*\{/, "kiểu riêng cho số thứ tự đóng khung"],
  [/\.the-sanpham \.hang-gia\s*\{[\s\S]*?margin-top:\s*auto/,
    "cụm giá và nút chọn luôn bám sát đáy thẻ, để mảng xanh khớp với nút"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 19) ẢNH ĐẠI DIỆN CỦA TỪNG SẢN PHẨM
// ---------------------------------------------------------------------------
SAN_PHAM_CHOT.forEach((_, i) => {
  const ma = `sp${i + 1}`;
  if (!new RegExp(`${ma}:\\s*'/assets/anh/dd-${ma}\\.svg'`).test(banNoi)) {
    fail(`Sản phẩm ${ma} chưa được khai ảnh đại diện trong ANH_DAI_DIEN.`);
  }
  if (!fs.existsSync(path.join(root, `src/anh/dd-${ma}.svg`))) {
    fail(`Thiếu tệp ảnh đại diện src/anh/dd-${ma}.svg.`);
  }
});

// Chín ảnh phải có chín độ trễ KHÁC NHAU — trùng nhau là chúng nhô lên cùng lúc.
{
  const khoi = banNoi.match(/const\s+TRE_BONG_BENH\s*=\s*\{([\s\S]*?)\}/);
  if (!khoi) {
    fail("Thiếu bảng độ trễ bồng bềnh TRE_BONG_BENH.");
  } else {
    const so = (khoi[1].match(/:\s*([\d.]+)/g) || []).map((x) => x.trim());
    if (so.length !== 9) fail(`TRE_BONG_BENH phải khai đủ 9 sản phẩm, đang thấy ${so.length}.`);
    if (new Set(so).size !== so.length) fail("Các độ trễ trong TRE_BONG_BENH phải khác nhau hết.");
  }
}

if (!/animation-delay:'\s*\+\s*tre\s*\+\s*'s/.test(banNoi)) {
  fail("Ảnh đại diện chưa được gắn độ trễ riêng vào style.");
}

[
  [/\.the-sanpham \.anh-dai-dien\s*\{[\s\S]*?animation:\s*bong-benh-anh\s+9s[^;]*infinite/,
    "ảnh đại diện bồng bềnh, mỗi vòng 9 giây"],
  [/@keyframes\s+bong-benh-anh\s*\{[\s\S]*?33\.3%[^}]*translateY\(0\)[\s\S]*?100%[^}]*translateY\(0\)/,
    "nhịp bồng bềnh của ảnh: 3 giây nhô rồi 6 giây đứng im"],
  [/\.the-sanpham \.so-tt\s*\{[\s\S]*?position:\s*absolute[\s\S]*?top:\s*0;[\s\S]*?left:\s*0;/,
    "số thứ tự dán sát góc trên bên trái của thẻ"],
  [/\.the-sanpham \.so-tt\s*\{[\s\S]*?z-index:\s*3/, "số thứ tự nằm trên ảnh đại diện"],
  [/\.the-sanpham \.so-tt\s*\{[\s\S]*?pointer-events:\s*none/,
    "số thứ tự không chắn cú bấm xuống thẻ"],
].forEach(([mau, ten]) => {
  if (!mau.test(cssApp)) fail(`Thiếu ${ten} trong src/css/app.css.`);
});

// ---------------------------------------------------------------------------
// 20) SỐ THỨ TỰ DÁN Ở GÓC THẺ, KHÔNG NẰM TRONG DÒNG TÊN
// ---------------------------------------------------------------------------
// Đặt số vào trong <h3> thì chính nó quyết định chiều cao dòng đầu và tên sản
// phẩm giãn dòng lệch. Nó phải là con TRỰC TIẾP của thẻ, đứng trước .dau-the.
if (!/class="so-tt" aria-hidden="true">'\s*\+\s*\(chiSo \+ 1\)\s*\+\s*'<\/span>'\s*\+[\s\S]{0,400}?'<div class="dau-the">/.test(banNoi)) {
  fail("Số thứ tự phải là con trực tiếp của thẻ và đứng ngay trước khối .dau-the.");
}
if (/<h3 class="ten-sanpham">'\s*\+[\s\S]{0,120}?class="so-tt"/.test(banNoi)) {
  fail("Số thứ tự không được nằm trong dòng tên sản phẩm nữa.");
}

// ---------------------------------------------------------------------------
// 21) BẢNG HỎI LẠI TRƯỚC KHI CHỐT ĐƠN
// ---------------------------------------------------------------------------
// Cú bấm ở bảng này kích hoạt gửi hàng tự động, nên KHÔNG được chốt đơn thẳng
// từ bảng mã QR — phải hỏi lại một câu rõ ràng.
[
  [/ma:\s*'xac-nhan-lan-hai'/, "bảng hỏi lại trước khi chốt đơn"],
  [/data-hanh-dong="chot-don"/, "nút chốt đơn ở bảng hỏi lại"],
  [/function\s+chotDon\s*\(\)\{[\s\S]{0,200}?danhDauDaThanhToan\(\)/,
    "chỉ bảng hỏi lại mới thật sự chốt đơn"],
  [/Ngay khi shop nhận được tiền<\/strong>, hệ thống tự động gửi sản phẩm/,
    "ghi chú: gửi hàng khi shop NHẬN ĐƯỢC TIỀN, không phải khi khách bấm nút"],
  [/đã nằm trong hệ thống<\/strong> và đang chờ tiền về/,
    "ghi chú: đơn đã được tạo từ lúc hiện mã QR"],
  [/chưa để lại email<\/strong>/, "cảnh báo khi khách không để lại email"],
  [/qua <strong>Zalo<\/strong> hoặc <strong>tin nhắn SMS<\/strong>/,
    "nói rõ sẽ liên hệ qua Zalo hoặc SMS khi khách không có email"],
].forEach(([mau, ten]) => {
  if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
});


// Lời văn TUYỆT ĐỐI không được hứa "bấm xong là gửi ngay": thứ kích hoạt gửi
// hàng là tiền về tài khoản, không phải cú bấm của khách.
if (/(Ngay sau khi bạn xác nhận|sau khi bạn bấm)[^']{0,60}gửi/.test(banNoi)) {
  fail('Bảng xác nhận không được hứa gửi hàng ngay sau cú bấm của khách.');
}

// Bảng mã QR không được gọi thẳng danhDauDaThanhToan.
if (/function\s+xacNhanThanhToan\s*\(\)\{[\s\S]{0,300}?danhDauDaThanhToan\(\)/.test(banNoi)) {
  fail("Bảng mã QR phải mở bảng hỏi lại, không được chốt đơn thẳng.");
}

if (!/\.khung-xac-nhan\s*\{/.test(cssApp)) {
  fail("Thiếu kiểu riêng cho bảng hỏi lại trong src/css/app.css.");
}

// ---------------------------------------------------------------------------
// 22) MỤC ĐƠN HÀNG TRONG TRANG QUẢN TRỊ.
//    Chỗ này đọc thông tin khách và cấp đường dẫn nhận hàng — sai một điểm là
//    hoặc lộ dữ liệu khách, hoặc phá link đã gửi đi rồi.
// ---------------------------------------------------------------------------
{
  const cssAdmin = doc("src/css/admin.css");

  [
    [/function\s+veAdminDonHang\s*\(/, "hàm vẽ mục Đơn hàng"],
    [/if\s*\(ma === 'don-hang'\)\s*return veAdminDonHang\(\);/, "mục Đơn hàng được nối vào bộ chọn module"],
    [/function\s+adminDonMoKhoa\s*\(/, "nút cấp quyền lại cho khách đổi máy"],
    [/rtdb\.ref\('thietbi\/'\s*\+\s*don\.maNhanHang\s*\+\s*'\/'\s*\+\s*maSP\)\.remove\(\)/, "thao tác xoá khoá thiết bị của đúng một sản phẩm"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  if (!/\.admin-the-don\s*\{/.test(cssAdmin)) {
    fail("Thiếu kiểu riêng cho thẻ đơn hàng trong src/css/admin.css.");
  }

  // Danh sách đơn CHỈ tải khi thật sự mở mục Đơn hàng. Đọc sẵn là kéo cả thông
  // tin liên lạc của khách về máy chủ shop mỗi lần mở trang quản trị.
  {
    const than = banNoi.match(/function\s+adminMoModule\s*\([\s\S]*?\n  \}/);
    if (!than) fail("Thiếu hàm adminMoModule.");
    else if (!/ma === 'don-hang'[\s\S]*taiDanhSachDon\(\)/.test(than[0])) {
      fail("Danh sách đơn phải chỉ tải khi mở mục Đơn hàng, không đọc sẵn cùng các nhánh cài đặt.");
    }
  }
  if (/NHANH_ADMIN\s*=\s*\{[^}]*donhang/.test(banNoi)) {
    fail("Nhánh 'donhang' không được nằm trong NHANH_ADMIN — như vậy là đọc sẵn đơn của khách mỗi lần mở trang quản trị.");
  }

  // Đọc đơn theo KHOÁ, không theo 'taoLuc'. Khoá push vốn xếp theo thời gian nên
  // không cần chỉ mục mới; sắp theo taoLuc là bắt chủ shop dán lại Rules.
  if (/orderByChild\('taoLuc'\)/.test(banNoi)) {
    fail("Đừng sắp đơn theo 'taoLuc' — nhánh donhang không có chỉ mục đó, đổi sang orderByKey().");
  }
  if (!/orderByKey\(\)\.limitToLast\(/.test(banNoi)) {
    fail("Thiếu truy vấn orderByKey().limitToLast() cho bộ lọc 'tất cả'.");
  }
  if (!/orderByChild\('trangThai'\)\.equalTo\(/.test(banNoi)) {
    fail("Thiếu truy vấn lọc theo 'trangThai' — thiếu nó là tải cả kho đơn về mỗi lần lọc.");
  }
  {
    const rules = doc("database.rules.json");
    const khoi = rules.match(/"donhang"\s*:\s*\{[\s\S]*?"\.indexOn"\s*:\s*\[[^\]]*\]/);
    if (!khoi || !/"trangThai"/.test(khoi[0])) {
      fail('database.rules.json thiếu .indexOn "trangThai" ở nhánh donhang — Firebase sẽ từ chối truy vấn lọc.');
    }
  }

  // Mã nhận hàng sinh ở trang quản trị phải TRÙNG LUẬT với Apps Script: cùng
  // bảng chữ (bỏ 0/1/I/L/O) và cùng độ dài. Khác nhau là hai nơi cấp ra hai
  // kiểu mã, khách đọc bằng mắt sẽ nhầm.
  {
    const gs = doc("apps-script/gui-hang.gs");
    const bangGS = gs.match(/CHU_MA_NHAN_HANG\s*=\s*'([^']+)'/);
    const bangJS = banNoi.match(/CHU_MA_NHAN_HANG\s*=\s*'([^']+)'/);
    const daiGS = gs.match(/DAI_MA_NHAN_HANG\s*=\s*(\d+)/);
    const daiJS = banNoi.match(/DAI_MA_NHAN_HANG\s*=\s*(\d+)/);
    if (!bangJS || !daiJS) {
      fail("Trang quản trị thiếu bảng chữ hoặc độ dài mã nhận hàng.");
    } else if (bangGS && bangJS[1] !== bangGS[1]) {
      fail("Bảng chữ mã nhận hàng ở trang quản trị khác Apps Script — hai nơi phải cấp ra cùng một kiểu mã.");
    } else if (daiGS && daiJS[1] !== daiGS[1]) {
      fail("Độ dài mã nhận hàng ở trang quản trị khác Apps Script.");
    }
  }

  // Cấp mã lần hai là phá link đã gửi cho khách. Phải chặn hẳn.
  {
    const than = banNoi.match(/function\s+adminDonTaoMa\s*\([\s\S]*?\n  \}/);
    if (!than) fail("Thiếu hàm adminDonTaoMa.");
    else if (!/if\s*\(don\.maNhanHang\)\s*return;/.test(than[0])) {
      fail("adminDonTaoMa phải từ chối cấp đè mã — cấp lần hai là link đã gửi cho khách thành vô dụng.");
    }
  }

  // Cấp quyền lại là việc không lùi được, phải hỏi lại trước khi làm.
  {
    const than = banNoi.match(/function\s+adminDonMoKhoa\s*\([\s\S]*?\n  \}/);
    if (than && !/window\.confirm\(/.test(than[0])) {
      fail("Nút cấp quyền lại phải hỏi lại trước khi xoá khoá thiết bị.");
    }
  }
}

// ---------------------------------------------------------------------------
// 23) SỐ TÀI KHOẢN VÀ SỐ ZALO KHÔNG ĐƯỢC LỌT VÀO MÃ NGUỒN.
//    Thông tin chuyển khoản chỉ nằm trong Realtime Database, đọc lúc chạy.
//    Quét toàn bộ tệp trong kho (trừ .git, public/, node_modules).
// ---------------------------------------------------------------------------
// Số tài khoản, tên chủ tài khoản, tên ngân hàng và SỐ ZALO của shop đều chỉ
// được nằm trong Realtime Database, tuyệt đối không nằm trong mã nguồn.
const CAM = [
  /1000103484[38]/, /PHAM\s+VAN\s+THANH/i, /\bTPBank\b/i,
  /\b\+?84\s*9\s*1\s*7\s*1\s*1\s*4\s*9\s*4\s*1\b/, /917114941/,
  // Kho file sản phẩm: cả đường dẫn tới file lẫn địa chỉ máy chủ cấp phát đều
  // KHÔNG được nằm trong mã nguồn. Máy chủ đọc từ Realtime Database; đường dẫn
  // file thì chỉ máy chủ biết, và nó chỉ trả về khi mã kích hoạt đúng.
  /r2\.cloudflarestorage\.com/i, /[a-z0-9-]+\.r2\.dev/i, /[a-z0-9-]+\.workers\.dev/i,
];
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
console.log("Hợp đồng phần bán hàng ĐẠT: 9 sản phẩm đúng giá gốc và giá chốt, giảm lần hai 10%/sản phẩm, quy tắc nhập liệu, thanh neo đáy, mục Đơn hàng trong trang quản trị, và không có thông tin ngân hàng nào trong mã nguồn.");
