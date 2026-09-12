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
// 3) Nội dung chuyển khoản: "LR21" viết hoa + DẤU CÁCH + mã đơn 6 ký tự, đúng
//    11 ký tự. Ngắn tới mức không ngân hàng nào cắt, và chứa "LR" nên vẫn lọt
//    qua từ khoá đã đặt trong app đọc thông báo ngân hàng.
//
//    Dấu cách là bắt buộc: không có nó thì "LR21WNAT7M" dính thành một khối,
//    khách đọc lại trên app ngân hàng không biết đâu là mã đơn của mình.
//
//    TIỀN TỐ PHẢI KHỚP HAI NƠI — web in ra, Apps Script đọc lại. Mục kiểm cuối
//    khối này so hai nơi với nhau, nên đổi một nơi mà quên nơi kia là đỏ ngay.
// ---------------------------------------------------------------------------
[
  [/const\s+TIEN_TO_CK\s*=\s*'LR21'\s*;/, 'hằng số tiền tố nội dung chuyển khoản là LR21'],
  [/return\s+TIEN_TO_CK\s*\+\s*' '\s*\+\s*\(state\.maDonNgan\s*\|\|\s*''\)/,
    'nội dung chuyển khoản là tiền tố + dấu cách + mã đơn'],
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

// Tiền tố ở web và tiền tố Apps Script đọc lại PHẢI là một. Lệch nhau thì tiền
// về mà script không nhận ra đơn nào: khách trả tiền rồi ngồi đợi, chủ shop
// không thấy gì bất thường, và không ai biết vì sao.
{
  const web = banNoi.match(/const\s+TIEN_TO_CK\s*=\s*'([^']+)'/);
  const gs = doc("apps-script/gui-hang.gs").match(/var\s+TIEN_TO_CK\s*=\s*'([^']+)'/);
  if (!gs) fail("apps-script/gui-hang.gs thiếu hằng số TIEN_TO_CK.");
  else if (web && web[1] !== gs[1]) {
    fail(`Tiền tố nội dung chuyển khoản lệch nhau: web dùng "${web[1]}", Apps Script đọc "${gs[1]}".`);
  }
}

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
  fail("Phải bắt buộc nhập ít nhất một trong năm trường trước khi cho thanh toán");
}
// Năm trường liên lạc, khai ở MỘT chỗ. Phần kiểm, phần vẽ và phần cập nhật đều
// đọc theo danh sách đó, nên thêm trường mà quên một nơi là không thể.
if (!/const\s+TRUONG_LIEN_LAC\s*=\s*\['email', 'zalo', 'dienThoai', 'whatsapp', 'telegram'\]/.test(banNoi)) {
  fail("Thiếu danh sách TRUONG_LIEN_LAC đủ năm trường liên lạc.");
}
// Email: ĐÚNG MỘT dấu "@", không ở đầu, không ở cuối. Luật cũ (ít nhất một @)
// cho lọt "a@b@c.com" và "@abc.com" — đơn ghi xuống với email hỏng thì khâu
// gửi hàng ném thư vào hư không, khách trả tiền rồi ngồi đợi.
{
  const than = banNoi.match(/function\s+loiEmail\s*\([\s\S]*?\n  \}/);
  if (!than) fail("Thiếu hàm loiEmail.");
  else {
    if (!/split\('@'\)\.length\s*-\s*1/.test(than[0]) || !/!==\s*1/.test(than[0])) {
      fail("loiEmail phải bắt buộc ĐÚNG MỘT dấu @, không phải 'ít nhất một'.");
    }
    if (!/viTri\s*===\s*0\s*\|\|\s*viTri\s*===\s*email\.length\s*-\s*1/.test(than[0])) {
      fail("loiEmail phải chặn dấu @ đứng đầu hoặc đứng cuối.");
    }
  }
}
// WhatsApp và Telegram gọt ký tự y như số Zalo, nhưng KHÔNG đồng bộ với trường
// nào — Zalo và điện thoại đi cặp vì ở Việt Nam chúng gần như luôn là một số,
// hai cái này thì không, tự điền sang là đoán thay khách.
{
  const than = banNoi.match(/function\s+capNhatTruong\s*\([\s\S]*?\n  \}/);
  if (!than) fail("Thiếu hàm capNhatTruong.");
  else {
    const nhanh = than[0].match(/ten === 'whatsapp' \|\| ten === 'telegram'[\s\S]*?\n    \}/);
    if (!nhanh) fail("capNhatTruong chưa xử lý hai trường whatsapp và telegram.");
    else if (/tuDongDien/.test(nhanh[0])) {
      fail("WhatsApp và Telegram KHÔNG được đồng bộ sang trường khác.");
    }
  }
}
// Hai trường mới phải được LƯU vào đơn, và Rules phải cho phép chúng — nhánh
// donhang khai "$khac": .validate false, nên một trường lạ là Firebase từ chối
// CẢ đơn, không phải chỉ trường đó.
["whatsapp", "telegram"].forEach((t) => {
  if (!new RegExp(t + ":\\s*kh\\." + t).test(banNoi)) {
    fail(`Đơn hàng chưa lưu trường ${t}.`);
  }
  const rules = doc("database.rules.json");
  if (!new RegExp('"' + t + '"\\s*:\\s*\\{').test(rules)) {
    fail(`database.rules.json thiếu trường ${t} trong nhánh donhang — Firebase sẽ từ chối cả đơn.`);
  }
});
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
  [/ít nhất 1 trong 5 trường<\/strong> \(khung nhập liệu\)/, 'câu mời nhập "ít nhất 1 trong 5 trường (khung nhập liệu)"'],
  [/cam kết giao sản phẩm ngay lập tức/, "lời cam kết giao ngay khi nhận được tiền"],
  [/ưu tiên giao qua <strong>email<\/strong> \(thông qua hệ thống tự động\)/, "ưu tiên giao qua email tự động"],
  [/nếu bạn chưa nhập email/, "giao qua Zalo khi khách chưa nhập email"],
  [/nếu không thể liên hệ qua các cách trên/, "giao qua SMS khi không liên hệ được qua các cách trên"],
  [/tin nhắn <strong>Zalo, WhatsApp, Telegram<\/strong>/, "giao qua Zalo, WhatsApp, Telegram khi khách chưa nhập email"],
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
    // Thân tin viết bằng \n đơn rồi nhân đôi ở đúng một chỗ, nên chỗ này chỉ
    // còn một dấu xuống dòng. Việc nhân đôi được canh riêng ngay bên dưới.
    [/linkNhanHangCuaDon\(don\)\s*\+\s*'\\n'/, "mẩu tin Zalo có kèm đường dẫn nhận sản phẩm RIÊNG của đơn"],
    // Dán một đoạn nhiều dòng vào Zalo, nhiều thiết bị nuốt mất dấu xuống dòng
    // đơn và biến nó thành dấu cách — mẩu tin dính thành một khối, khách không
    // đọc ra đâu là đường dẫn. Bỏ dòng này là mẩu tin hỏng mà không ai thấy.
    [/than\.replace\(\/\\n\/g,\s*'\\n\\n'\)/, "mẩu tin Zalo nhân đôi mọi dấu xuống dòng"],
    // Đường lui khi khách không để lại email lẫn Zalo. Viết KHÔNG DẤU: một chữ
    // có dấu là cả tin rớt xuống bảng mã Unicode, hạn mức tụt từ 160 còn 70 ký
    // tự, tốn gấp ba tiền và dễ bị cắt cụt mất đường dẫn.
    [/function\s+soanTinSMS\s*\(/, "hàm soạn mẩu tin SMS"],
    [/thoatHtml\(soanTinSMS\(don\)\)/, "mẩu tin SMS được nhúng vào email báo shop"],
    [/function\s+linkZalo\s*\(/, "hàm dựng đường dẫn zalo.me"],
    [/function\s+veKhoiLienHe\s*\(/, "khối liên hệ ở cuối thư gửi khách"],
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
    [/không nên truy cập trang này ngay bên trong app zalo hoặc email, hoặc bên trong app nào đó/,
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
    // Dải này phải nằm NGOÀI trang, trong veTrangNhanHang — khách đọc nó trước
    // khi bấm món nào. Nằm trong bảng từng sản phẩm thì đọc được khi đã muộn.
    const than = banNoi.match(/function\s+veTrangNhanHang\s*\([\s\S]*?\n  \}/);
    if (!than) {
      fail("Thiếu hàm veTrangNhanHang.");
    } else if (than[0].indexOf("canh-bao-trinh-duyet") === -1) {
      fail("Dải dặn trình duyệt phải nằm ngay ngoài trang nhận hàng, không phải trong bảng sản phẩm.");
    } else if (than[0].indexOf("Bấm đúng sản phẩm") > than[0].indexOf("canh-bao-trinh-duyet") ||
               than[0].indexOf("canh-bao-trinh-duyet") > than[0].indexOf("bang-luu-y-thiet-bi")) {
      fail("Thứ tự phải là: câu dẫn → dải trình duyệt → dải cảnh báo thiết bị.");
    }
    const khoi = cssApp.match(/(?:^|\n)\.canh-bao-trinh-duyet\s*\{[^}]*\}/);
    if (!khoi) fail("Thiếu khối CSS .canh-bao-trinh-duyet.");
    else if (!/background:\s*rgba\(45,\s*157,\s*95/.test(khoi[0])) {
      fail("Dải dặn trình duyệt phải có nền xanh lá nhạt, khác tông cam của cảnh báo thiết bị.");
    }
  }

  // Mọi lời báo phải tự xuống hàng, nếu không câu dài tràn qua mép phải màn hình.
  ["\\.dong-tep-nhan \\.loi-nhan-hang", "\\.khung-chua-mua", "\\.bao-duong-dan-sai \\.chu", "\\n\\.canh-bao-trinh-duyet \\.chu"].forEach((chon) => {
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
  // Câu trấn an phải kể ĐÚNG những kênh khách để lại, không phải một câu chết
  // nói mãi "Zalo hoặc SMS". Khách chỉ điền WhatsApp mà đọc thấy "nhắn tới số "
  // bỏ lửng thì hoang mang đúng lúc vừa chuyển tiền xong.
  [/function\s+kenhLienHeCuaKhach\s*\(/, "hàm liệt kê đúng những kênh khách đã để lại"],
  [/ten:\s*'WhatsApp'/, "WhatsApp nằm trong danh sách kênh liên hệ"],
  [/ten:\s*'Telegram'/, "Telegram nằm trong danh sách kênh liên hệ"],
  [/mọi cách bạn đã để lại<\/strong>/, "câu trấn an nói shop tìm bằng mọi cách khách để lại"],
  [/Shop chưa có cách nào liên hệ với bạn/,
    "lời dặn khi không còn kênh nào — thà nói thẳng còn hơn in ra một câu bỏ lửng"],
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
// 23) CÚ BẤM CỦA KHÁCH KHÔNG BAO GIỜ ĐƯỢC LÀ LỆNH GIAO HÀNG.
//
//     Đây là lỗ nghiêm trọng nhất từng có trong hệ thống, và nó đã từng mở
//     thật: nút "Xác nhận đã thanh toán thành công" đặt trangThai='daXacNhan',
//     đúng thứ bộ gửi hàng quét mỗi phút. Ai mở trang, chọn hàng, bấm nút đó
//     mà không chuyển một đồng nào cũng nhận được sản phẩm trong vòng một phút.
//
//     Ranh giới: cú bấm của khách → 'khachBao' (lời khai). Ngân hàng báo có
//     → 'daXacNhan' (bằng chứng). CHỈ hàm nhận báo có được đặt 'daXacNhan'.
// ---------------------------------------------------------------------------
{
  const gs = doc("apps-script/gui-hang.gs");

  // 1. Nút của khách phải ghi 'khachBao', tuyệt đối không phải 'daXacNhan'.
  const than = banNoi.match(/function\s+danhDauDaThanhToan\s*\([\s\S]*?\n  \}/);
  if (!than) {
    fail("Thiếu hàm danhDauDaThanhToan.");
  } else {
    if (!/trangThai:\s*'khachBao'/.test(than[0])) {
      fail("Nút xác nhận của khách phải đặt trạng thái 'khachBao'.");
    }
    if (/trangThai:\s*'daXacNhan'/.test(than[0])) {
      fail("LỖ BẢO MẬT: cú bấm của khách đặt 'daXacNhan' — bộ gửi hàng sẽ giao hàng miễn phí cho bất kỳ ai bấm nút.");
    }
  }

  // 2. Bộ gửi hàng vẫn chỉ quét đúng 'daXacNhan'.
  if (!/equalTo=.*encodeURIComponent\('"daXacNhan"'\)/.test(gs)) {
    fail("Bộ gửi hàng phải lọc theo đúng trạng thái 'daXacNhan'.");
  }
  // 3. Và chỉ nhánh nhận báo có mới được đặt trạng thái đó.
  {
    const dat = (gs.match(/trangThai:\s*'daXacNhan'/g) || []).length;
    if (dat !== 1) {
      fail(`Chỉ ĐÚNG MỘT nơi trong Apps Script được đặt trangThai='daXacNhan' (đang có ${dat}).`);
    }
    const bao = gs.match(/function\s+xuLyBaoCo\s*\([\s\S]*?\n\}/);
    if (!bao || !/trangThai:\s*'daXacNhan'/.test(bao[0])) {
      fail("Nơi duy nhất đặt 'daXacNhan' phải là hàm nhận báo có từ ngân hàng.");
    }
  }

  // 4. Trang quản trị phải phân biệt được hai trạng thái, nếu không chủ shop
  //    nhìn vào tưởng đơn khách tự khai là đơn đã có tiền.
  [
    [/'khachBao':\s*\{\s*ten:\s*'Khách báo đã trả'/, "trạng thái 'Khách báo đã trả' trong trang quản trị"],
    [/\{ ma: 'khachBao',\s*ten: 'Khách báo đã trả' \}/, "bộ lọc 'Khách báo đã trả'"],
    [/loc:\s*'khachBao'/, "mục Đơn hàng mở sẵn ở nhóm cần mắt người"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });
  if (!/\.the-trang-thai\.tim\s*\{/.test(doc("src/css/admin.css"))) {
    fail("Thiếu màu riêng cho nhãn 'Khách báo đã trả' — nó phải khác hẳn bốn trạng thái kia.");
  }

  // Thẻ đơn phải hiện ĐỦ năm kênh liên lạc. Thiếu một dòng là chủ shop tưởng
  // khách không để lại gì và bỏ mặc họ.
  ["don.email", "don.zalo", "don.dienThoai", "don.whatsapp", "don.telegram"].forEach((d) => {
    if (!new RegExp("'[^']+',\\s+" + d.replace(".", "\\.")).test(banNoi)) {
      fail(`Thẻ đơn ở trang quản trị thiếu dòng ${d}.`);
    }
  });

  // Nút mở thẳng cuộc trò chuyện. Điện thoại KHÔNG có — một con số trần không
  // dẫn tới ứng dụng nào cả, dựng nút ở đó chỉ tổ bấm vào rồi báo lỗi.
  {
    const than = banNoi.match(/const lienLac = \[[\s\S]*?khong-lien-lac/);
    if (!than) fail("Không tìm thấy khối liên lạc trên thẻ đơn.");
    else {
      const dong = than[0].match(/\[[^\]]*don\.dienThoai[^\]]*\]/);
      if (!dong || !/^\[\s*null\s*,/.test(dong[0])) {
        fail("Dòng Điện thoại KHÔNG được có nút Truy cập Link.");
      }
      ["zalo", "whatsapp", "telegram", "email"].forEach((kieu) => {
        if (!new RegExp("'" + kieu + "'\\s*,").test(than[0])) {
          fail(`Dòng ${kieu} thiếu kiểu để dựng nút Truy cập Link.`);
        }
      });
    }
    [
      [/function\s+so84\s*\(/, "hàm đổi số sang dạng 84…"],
      [/function\s+duongDanKenh\s*\(/, "hàm dựng đường dẫn theo từng ứng dụng"],
      [/'https:\/\/zalo\.me\/'\s*\+\s*s/, "đường dẫn Zalo"],
      [/'https:\/\/wa\.me\/'\s*\+\s*s/, "đường dẫn WhatsApp"],
      [/'https:\/\/t\.me\/\+'\s*\+\s*s/, "đường dẫn Telegram"],
      [/'mailto:'\s*\+\s*e/, "đường dẫn email"],
      [/>Link hỏng</, "chữ báo số gõ sai, thay cho nút bấm vào chỉ tổ báo lỗi"],
      [/Truy cập Link</, "tên nút Truy cập Link"],
    ].forEach(([mau, ten]) => {
      if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
    });
  }

  // Đơn phải xếp mới nhất lên đầu Ở MỌI NHÓM, và xếp tường minh theo taoLuc
  // chứ không phó mặc thứ tự Firebase trả về.
  {
    const than = banNoi.match(/function\s+taiDanhSachDon\s*\([\s\S]*?\n  \}/);
    if (!than) fail("Thiếu hàm taiDanhSachDon.");
    else if (!/ds\.sort\(/.test(than[0]) || !/Number\(a\.taoLuc\)/.test(than[0])) {
      fail("Danh sách đơn phải được xếp tường minh theo taoLuc, mới nhất lên đầu.");
    }
  }

  // ------------------------------------------------------ MẪU TIN NHẮN GỬI TAY
  //
  // Hai bản — một ở trình duyệt, một ở Apps Script — phải nói cùng một chuyện.
  // Trình duyệt không gọi được Apps Script nên buộc phải viết lại; chỗ này canh
  // những câu quan trọng có mặt ở CẢ HAI nơi, để chúng không trôi xa nhau.
  {
    const gsMau = doc("apps-script/gui-hang.gs");
    [
      'shop đã nhận được thanh toán đơn',
      'Đây là đường dẫn nhận sản phẩm của riêng bạn',
      'không phải nhập mã nào cả',
      'Xin đừng chia sẻ đường dẫn này cho người khác',
      'Cảm ơn bạn đã tin tưởng!',
    ].forEach((cau) => {
      const oWeb = banNoi.replace(/\s+/g, " ").indexOf(cau) !== -1;
      const oGs = gsMau.replace(/\s+/g, " ").indexOf(cau) !== -1;
      if (!oWeb || !oGs) {
        fail(`Mẩu tin Zalo lệch nhau: câu “${cau}” ${oWeb ? "" : "thiếu ở trang quản trị"}` +
          `${!oWeb && !oGs ? " và " : ""}${oGs ? "" : "thiếu ở Apps Script"}.`);
      }
    });
    if (banNoi.indexOf('Thanhdeptrai.vn cam on ban! Link san pham rieng: ') === -1 ||
        gsMau.indexOf('Thanhdeptrai.vn cam on ban! Link san pham rieng: ') === -1) {
      fail("Mẩu tin SMS ở trang quản trị và ở Apps Script phải giống hệt nhau.");
    }
    [
      [/function\s+mauTinZalo\s*\(/, "mẫu tin Zalo ở trang quản trị"],
      [/function\s+mauTinSMS\s*\(/, "mẫu tin SMS ở trang quản trị"],
      [/than\.replace\(\/\\n\/g, '\\n\\n'\)/, "mẫu Zalo nhân đôi dấu xuống dòng"],
      [/CHƯA CÓ MÃ SẢN PHẨM/, "lời báo khi đơn chưa có mã, thay vì in ra một dòng cụt"],
      [/data-hanh-dong="admin-don-mau-tin"/, "nút Xem mẫu tin nhắn trên thẻ đơn"],
      [/Dùng được cho cả WhatsApp và Telegram/, "ghi chú mẩu Zalo dùng chung cho ba ứng dụng"],
    ].forEach(([mau, ten]) => {
      if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
    });
  }

  // ------------------------------- PHÊ DUYỆT ĐÃ GỬI BẰNG KÊNH KHÁC
  {
    const than = banNoi.match(/function\s+veNutPheDuyet\s*\([\s\S]*?\n  \}/);
    if (!than) {
      fail("Thiếu nút Phê duyệt là đã gửi link sản phẩm.");
    } else {
      if (!/!don\.maNhanHang/.test(than[0])) {
        fail("Nút phê duyệt phải bị khoá khi đơn chưa có mã nhận hàng.");
      }
      if (!/dangGui\[don\.khoa\] === 'cho'/.test(than[0])) {
        fail("Nút phê duyệt phải bị khoá khi đang trong lượt gửi email.");
      }
    }
    const lam = banNoi.match(/function\s+adminDonPheDuyet\s*\([\s\S]*?\n  \}/);
    if (!lam) fail("Thiếu hàm adminDonPheDuyet.");
    else {
      if (/emailGuiLuc/.test(lam[0])) {
        fail("Phê duyệt tay KHÔNG được ghi emailGuiLuc — không lá thư nào bay đi cả.");
      }
      if (!/window\.confirm\(/.test(lam[0])) fail("Nút phê duyệt phải hỏi lại.");
    }
    // Nút "Đánh dấu đã gửi" chung chung phải biến mất — nó không có chốt gác nào.
    if (/'daGui', 'Đánh dấu đã gửi'/.test(banNoi)) {
      fail("Nút 'Đánh dấu đã gửi' cũ phải bị thay bằng nút phê duyệt có chốt gác.");
    }
  }

  // Xoá đơn không lùi được, nên phải hỏi lại và phải nói rõ mất những gì.
  {
    const than = banNoi.match(/function\s+adminDonXoa\s*\([\s\S]*?\n  \}/);
    if (!than) fail("Thiếu hàm xoá đơn adminDonXoa.");
    else {
      if (!/window\.confirm\(/.test(than[0])) fail("Nút xoá đơn phải hỏi lại trước khi xoá.");
      if (!/KHÔNG KHÔI PHỤC ĐƯỢC/.test(than[0])) {
        fail("Lời hỏi lại khi xoá đơn phải nói rõ là không khôi phục được.");
      }
      if (!/rtdb\.ref\('donhang\/' \+ khoa\)\.remove\(\)/.test(than[0])) {
        fail("adminDonXoa phải xoá đúng nhánh donhang của đơn đó.");
      }
    }
    if (!/data-hanh-dong="admin-don-xoa"/.test(banNoi)) fail("Thiếu nút Xoá đơn trên thẻ đơn.");
    if (!/hanhDong === 'admin-don-xoa'/.test(banNoi)) fail("Chưa nối nút Xoá đơn vào bộ điều phối.");
    if (!/\.nut-xoa-don\s*\{/.test(doc("src/css/admin.css"))) {
      fail("Nút Xoá đơn phải có kiểu riêng, tách khỏi nhóm nút đổi trạng thái.");
    }
  }

  // ------------------------------------------------- GỬI EMAIL TAY CHO KHÁCH
  {
    const gsSend = doc("apps-script/gui-hang.gs");

    // 'emailGuiLuc' là BẰNG CHỨNG thư đã bay đi, còn 'daGui' chỉ là cái nhãn —
    // nút "Đánh dấu đã gửi" ở trang quản trị đặt được nhãn đó mà chẳng gửi gì.
    // Nên chỉ ĐÚNG MỘT nơi được ghi bằng chứng: ngay sau lệnh gửi thư thật.
    {
      const dat = (gsSend.match(/emailGuiLuc:\s*Date\.now\(\)/g) || []).length;
      if (dat !== 1) {
        fail(`Chỉ ĐÚNG MỘT nơi trong Apps Script được ghi emailGuiLuc (đang có ${dat}).`);
      }
      if (!/guiThu\(don\.email[\s\S]{0,700}?emailGuiLuc:\s*Date\.now\(\)/.test(gsSend)) {
        fail("emailGuiLuc phải được ghi NGAY SAU lệnh gửi thư cho khách, không ở chỗ nào khác.");
      }
      if (!/soLanGuiEmail:\s*\(Number\(don\.soLanGuiEmail\)\s*\|\|\s*0\)\s*\+\s*1/.test(gsSend)) {
        fail("Thiếu bộ đếm số lần gửi email.");
      }
    }
    // Rules phải cho phép hai trường đó — nhánh donhang khai "$khac": false.
    ["emailGuiLuc", "soLanGuiEmail"].forEach((t) => {
      if (!new RegExp('"' + t + '"\\s*:\\s*\\{').test(doc("database.rules.json"))) {
        fail(`database.rules.json thiếu trường ${t} — Firebase sẽ từ chối cả đơn.`);
      }
    });

    [
      [/function\s+veKhoiGuiEmail\s*\(/, "khối nút gửi email trên thẻ đơn"],
      [/function\s+adminDonGuiEmail\s*\(/, "hành động gửi email tay"],
      [/function\s+ngheDonGuiXong\s*\(/, "người nghe báo lúc thư bay đi thật"],
      [/function\s+thoiNgheHetDon\s*\(/, "hàm gỡ người nghe khi rời danh sách"],
      [/Gửi email kèm link sản phẩm cho khách/, "tên nút khi chưa gửi lần nào"],
      [/Gửi email lại lần nữa cho khách/, "tên nút khi đã gửi rồi"],
      [/Đã gửi email cho khách/, "lời báo sau khi gửi xong"],
      [/class="dau-da-gui-email"/, "dấu đã gửi email trên đầu thẻ đơn"],
    ].forEach(([mau, ten]) => {
      if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
    });

    {
      const than = banNoi.match(/function\s+adminDonGuiEmail\s*\([\s\S]*?\n  \}/);
      if (!than) {
        fail("Thiếu hàm adminDonGuiEmail.");
      } else {
        // Cấp mã nhận hàng TRƯỚC khi xin gửi. Ngược lại thì thư bay đi với
        // đường dẫn rỗng và khách nhận được một lá thư vô dụng.
        if (than[0].indexOf("maNhanHang") > than[0].indexOf("trangThai: 'daXacNhan'")) {
          fail("Phải cấp mã nhận hàng TRƯỚC khi đặt yêu cầu gửi.");
        }
        if (!/if\s*\(!don\.email\)/.test(than[0])) {
          fail("Nút gửi email phải từ chối đơn không có email.");
        }
        // Mốc cũ: so với lần gửi trước, không chỉ nhìn "có emailGuiLuc không".
        if (!/mocCu\s*=\s*Number\(don\.emailGuiLuc\)\s*\|\|\s*0/.test(than[0])) {
          fail("Phải nhớ mốc gửi cũ, nếu không lần gửi lại báo xong ngay bằng dấu vết lần trước.");
        }
      }
    }
    // Bằng chứng gửi xong là emailGuiLuc MỚI HƠN mốc cũ, không phải trạng thái.
    {
      const than = banNoi.match(/function\s+ngheDonGuiXong\s*\([\s\S]*?\n  \}/);
      if (than && !/Number\(moi\.emailGuiLuc \|\| 0\)\s*>\s*mocCu/.test(than[0])) {
        fail("Phải căn theo emailGuiLuc mới hơn mốc cũ, không căn theo trạng thái 'daGui'.");
      }
    }
    if (!/\.khoi-gui-email\s*\{/.test(doc("src/css/admin.css"))) {
      fail("Thiếu kiểu riêng cho khối gửi email.");
    }
  }
}

// ---------------------------------------------------------------------------
// 24) EMAIL VÀ SỐ ZALO LIÊN HỆ CỦA SHOP ĐỌC TỪ DATABASE, KHÔNG VIẾT CHẾT.
// ---------------------------------------------------------------------------
{
  const gs = doc("apps-script/gui-hang.gs");
  if (/EMAIL_LIEN_HE\s*=\s*'[^']+@/.test(gs)) {
    fail("Email liên hệ của shop không được viết chết trong Apps Script — đọc từ thongtinlienhe.");
  }
  if (!/lienHe\.emailShop/.test(gs)) {
    fail("Khối liên hệ trong thư gửi khách phải đọc emailShop từ Realtime Database.");
  }
  // Ba ô mới ở trang quản trị là nguồn của những giá trị đó.
  ["telegram", "whatsapp", "emailShop"].forEach((t) => {
    if (!new RegExp("truong: '" + t + "'").test(banNoi)) {
      fail(`Trang quản trị thiếu ô '${t}' trong mục Liên hệ và mạng xã hội.`);
    }
  });
}

// ---------------------------------------------------------------------------
// 25) HƯỚNG DẪN SỬ DỤNG SẢN PHẨM — nút, nội dung, và video Google Drive.
//
//     Năm sản phẩm có tệp thật (sp1, sp2, sp3, sp6, sp7) phải có nút "Xem
//     hướng dẫn sử dụng" NGAY TRÊN danh sách tệp. Bốn trong số đó (sp2, sp3,
//     sp6, sp7) có video, và link video là DỮ LIỆU của chủ shop (khai ở
//     /admin, đọc từ Firebase) — TUYỆT ĐỐI không phải một link Drive viết
//     chết trong mã nguồn.
// ---------------------------------------------------------------------------
{
  [
    [/const\s+SP_CO_HUONG_DAN\s*=\s*\{\s*sp1:\s*true,\s*sp2:\s*true,\s*sp3:\s*true,\s*sp6:\s*true,\s*sp7:\s*true\s*\}/,
      "danh sách năm sản phẩm có bảng hướng dẫn sử dụng"],
    [/function\s+veNutHuongDan\s*\(/, "hàm dựng nút Xem hướng dẫn sử dụng"],
    [/data-hanh-dong="xem-huong-dan"/, "nút Xem hướng dẫn sử dụng trên bảng nhận hàng"],
    [/function\s+moModalHuongDan\s*\(/, "hàm mở bảng hướng dẫn sử dụng"],
    [/function\s+idDriveTuLink\s*\(/, "hàm rút mã tệp Google Drive từ đường dẫn"],
    [/function\s+veKhungVideo\s*\(/, "hàm dựng khung video Google Drive cho khách"],
    [/drive\.google\.com\/file\/d\/'\s*\+\s*id\s*\+\s*'\/preview'/, "nhúng đúng iframe /preview của Google Drive"],
    [/const\s+HUONG_DAN_SU_DUNG\s*=\s*\{/, "bảng nội dung hướng dẫn theo từng sản phẩm"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Nút phải đứng TRÊN danh sách tệp — khách đọc hướng dẫn TRƯỚC khi tải, chứ
  // không phải tải xong rồi mới biết cách cài.
  {
    const than = banNoi.match(/function\s+veThanNhanHang\s*\([\s\S]*?\n  \}/);
    if (than && than[0].indexOf("veNutHuongDan(sp.ma)") > than[0].indexOf("danh-sach-tep")) {
      fail("Nút Xem hướng dẫn sử dụng phải nằm TRÊN danh sách tệp, không phải dưới.");
    }
  }

  // sp1 là hướng dẫn cài APK bằng ảnh chụp màn hình thật — ba tấm ảnh phải có
  // mặt trong src/anh/ (không phải chỉ được gọi trong mã, vì đó là điều
  // validate-static.js đã canh; ở đây canh việc mã THẬT SỰ gọi đủ ba tấm).
  ["hd-sp1-b1.jpg", "hd-sp1-b2.jpg", "hd-sp1-b3.jpg"].forEach((ten) => {
    if (banNoi.indexOf("/assets/anh/" + ten) === -1) {
      fail(`Hướng dẫn sản phẩm 1 thiếu ảnh minh hoạ ${ten}.`);
    }
  });

  // Bốn sản phẩm có video đọc link từ CHÍNH danh mục của sản phẩm đó
  // (dm.linkHuongDan) — không phải một địa chỉ Drive nào viết chết trong mã.
  {
    const goiVideo = banNoi.match(/veKhungVideo\(dm && dm\.linkHuongDan,/g) || [];
    if (goiVideo.length < 4) {
      fail(`Phải có đủ 4 chỗ đọc dm.linkHuongDan cho sp2/sp3/sp6/sp7 (đang thấy ${goiVideo.length}).`);
    }
    if (/veKhungVideo\('https:\/\/drive\.google\.com/.test(banNoi)) {
      fail("Link video KHÔNG được viết chết trong mã nguồn — phải đọc từ danh mục do /admin khai.");
    }
  }

  // Trang quản trị: bốn sản phẩm có video phải có ô khai + nút xem trước, và
  // giá trị đó phải được LƯU vào cùng gói dữ liệu danhmuc/<mã> khi bấm Lưu.
  [
    [/const\s+SP_CO_VIDEO\s*=\s*\{\s*sp2:\s*true,\s*sp3:\s*true,\s*sp6:\s*true,\s*sp7:\s*true\s*\}/,
      "danh sách bốn sản phẩm có link video hướng dẫn ở trang quản trị"],
    [/function\s+veKhoiVideoHuongDan\s*\(/, "khối nhập link video hướng dẫn ở trang quản trị"],
    [/data-dm-video="/, "ô nhập link video hướng dẫn"],
    [/data-hanh-dong="admin-xem-truoc-video"/, "nút Xem trước link video"],
    [/function\s+adminXemTruocVideo\s*\(/, "hành động mở bảng xem trước video"],
    [/function\s+veXemTruocVideo\s*\(/, "hàm dựng bảng xem trước video"],
    [/duLieu\.linkHuongDan\s*=\s*video/, "link video được gộp vào gói dữ liệu trước khi lưu"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  if (!/\.khung-video\s*\{/.test(cssApp)) fail("Thiếu kiểu khung video ở src/css/app.css.");
  if (!/\.khoi-video-hd\s*\{/.test(doc("src/css/admin.css"))) {
    fail("Thiếu kiểu khối video hướng dẫn ở src/css/admin.css.");
  }
}

// ---------------------------------------------------------------------------
// 26) MODULE "KHOÁ HỌC CHỈNH MÀU LIGHTROOM ĐIỆN THOẠI" — chương/bài tự đánh
//     số, modal video toàn màn hình, và quản lý ở /admin.
// ---------------------------------------------------------------------------
{
  [
    [/ma:\s*'khoa-hoc-mobile',[\s\S]{0,200}sanSang:\s*true/, "module khoá học mobile đã bật (sanSang: true)"],
    [/function\s+veModuleKhoaHocMobile\s*\(/, "hàm vẽ module khoá học ở trang bán hàng"],
    [/function\s+taiKhoaHoc\s*\(/, "hàm đọc dữ liệu khoá học từ Firebase"],
    [/rtdb\.ref\('khoahoc\/lrMobile\/muc'\)/, "đọc đúng nhánh khoahoc/lrMobile/muc"],
    [/function\s+soThuTuKhoaHoc\s*\(/, "hàm tính số thứ tự chương/bài theo vị trí thật"],
    [/function\s+xepKhoaHoc\s*\(/, "hàm xếp bài vào đúng chương gần nhất phía trên"],
    [/function\s+danhSachBaiPhang\s*\(/, "hàm liệt kê bài học xuyên suốt để chuyển bài trước/sau"],
    [/function\s+moModalBaiHoc\s*\(/, "hàm mở modal xem video một bài học"],
    [/function\s+chuyenBaiHoc\s*\(/, "hàm chuyển sang bài trước/sau"],
    [/data-hanh-dong="xem-chi-tiet"\s+data-ma="sp4"/, "nút Xem chi tiết mở đúng sp4"],
    [/data-hanh-dong="bai-hoc-chuyen"[\s\S]{0,100}data-huong="-1"/, "nút Bài trước"],
    [/data-hanh-dong="bai-hoc-chuyen"[\s\S]{0,100}data-huong="1"/, "nút Bài tiếp theo"],
    [/idx\s*<=\s*0\s*\?\s*'\s*disabled'/, "nút Bài trước bị liệt ở bài đầu tiên"],
    [/idx\s*>=\s*flat\.length\s*-\s*1\s*\?\s*'\s*disabled'/, "nút Bài tiếp theo bị liệt ở bài cuối cùng"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Modal bài học phải TÁI DÙNG đúng khung video 9:16 của bảng hướng dẫn sử
  // dụng ở /sanpham — không tự dựng một trình phát khác.
  if (!/veKhungVideo\(bai\.linkVideo,\s*'doc'\)/.test(banNoi)) {
    fail("Modal bài học phải gọi lại veKhungVideo(..., 'doc') — không tự dựng khung video riêng.");
  }

  // Modal phải bao TRỌN màn hình — canh bằng CSS theo tiền tố mã modal, không
  // đụng vào hệ thống modal dùng chung cho mọi bảng khác.
  if (!/\[data-ma-modal\^="bai-hoc-"\][\s\S]{0,400}width:\s*100%[\s\S]{0,200}height:\s*100%/.test(cssApp)) {
    fail("Modal bài học phải có CSS bao trọn màn hình (100% chiều rộng lẫn chiều cao).");
  }

  // Module quản lý ở /admin: thêm/xoá/đổi chỗ, xem trước video, và một nút
  // Lưu tất cả duy nhất — không phải mỗi dòng một nút lưu riêng.
  [
    [/ma:\s*'khoa-hoc',\s*ten:\s*'Khoá học Lightroom mobile'/, "mục Khoá học Lightroom mobile trong menu /admin"],
    [/'khoa-hoc':\s*'khoahoc\/lrMobile'/, "nhánh Firebase khoá học được nạp cùng lúc với các cài đặt khác"],
    [/function\s+veAdminKhoaHoc\s*\(/, "hàm vẽ module quản lý khoá học"],
    [/function\s+adminKhThemBai\s*\(/, "hành động Thêm bài"],
    [/function\s+adminKhThemChuong\s*\(/, "hành động Thêm chương"],
    [/function\s+adminKhXoaDong\s*\(/, "hành động Xoá dòng"],
    [/function\s+adminKhDoiCho\s*\(/, "hành động đổi chỗ (mũi tên lên/xuống)"],
    [/function\s+adminKhXemTruocVideo\s*\(/, "hành động Xem trước link video của một bài học"],
    [/function\s+adminKhLuuTatCa\s*\(/, "hành động Lưu tất cả"],
    [/data-hanh-dong="kh-luu-tat-ca"/, "nút Lưu tất cả"],
    [/rtdb\.ref\(NHANH_KHOA_HOC\)\.set\(/, "Lưu tất cả ghi ĐÈ nguyên mảng xuống Firebase"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Không có nút "Lưu" riêng cho từng dòng chương/bài — chỉ một nút Lưu tất cả.
  if (/data-hanh-dong="kh-luu"[^-]/.test(banNoi)) {
    fail("Không được có nút Lưu riêng cho từng dòng — module này chỉ có một nút Lưu tất cả.");
  }

  // Rules Firebase phải cho đọc công khai (khách xem khoá học không cần đăng
  // nhập) và chỉ chủ shop mới ghi được.
  const rules = doc("database.rules.json");
  if (!/"khoahoc":\s*\{\s*"\.read":\s*true/.test(rules)) {
    fail('Thiếu ".read": true cho nhánh "khoahoc" trong database.rules.json.');
  }
}

// ---------------------------------------------------------------------------
// 27) MODULE "KHOÁ HỌC CHỈNH MÀU LIGHTROOM MÁY TÍNH" — Y CHANG mục 26, chỉ
//     khác nhánh Firebase (lrPC) và video NGANG 16:9 thay vì dọc 9:16.
// ---------------------------------------------------------------------------
{
  [
    [/ma:\s*'khoa-hoc-may-tinh',[\s\S]{0,200}sanSang:\s*true/, "module khoá học máy tính đã bật (sanSang: true)"],
    [/function\s+veModuleKhoaHocMayTinh\s*\(/, "hàm vẽ module khoá học máy tính ở trang bán hàng"],
    [/function\s+taiKhoaHocMayTinh\s*\(/, "hàm đọc dữ liệu khoá học máy tính từ Firebase"],
    [/rtdb\.ref\('khoahoc\/lrPC\/muc'\)/, "đọc đúng nhánh khoahoc/lrPC/muc"],
    [/function\s+moModalBaiHocMayTinh\s*\(/, "hàm mở modal xem video một bài học (khoá máy tính)"],
    [/function\s+chuyenBaiHocMayTinh\s*\(/, "hàm chuyển sang bài trước/sau (khoá máy tính)"],
    [/data-hanh-dong="xem-chi-tiet"\s+data-ma="sp5"/, "nút Xem chi tiết mở đúng sp5"],
    [/data-hanh-dong="bai-hoc-chuyen-pc"[\s\S]{0,100}data-huong="-1"/, "nút Bài trước (khoá máy tính)"],
    [/data-hanh-dong="bai-hoc-chuyen-pc"[\s\S]{0,100}data-huong="1"/, "nút Bài tiếp theo (khoá máy tính)"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Khác biệt DUY NHẤT với khoá điện thoại: video NGANG 16:9, không phải dọc.
  if (!/veKhungVideo\(bai\.linkVideo,\s*'ngang'\)/.test(banNoi)) {
    fail("Modal bài học (khoá máy tính) phải gọi veKhungVideo(..., 'ngang') — video nằm ngang 16:9.");
  }

  // Modal phải bao TRỌN màn hình — dùng đúng tiền tố CSS chung "bai-hoc-".
  if (!/\[data-ma-modal\^="bai-hoc-"\][\s\S]{0,400}width:\s*100%[\s\S]{0,200}height:\s*100%/.test(cssApp)) {
    fail("Modal bài học (khoá máy tính) phải dùng chung CSS bao trọn màn hình [data-ma-modal^=\"bai-hoc-\"].");
  }
  if (!/ma:\s*'bai-hoc-pc-'/.test(banNoi)) {
    fail('Mã modal bài học (khoá máy tính) phải bắt đầu bằng "bai-hoc-" để hưởng CSS toàn màn hình chung.');
  }

  // Module quản lý ở /admin: y chang mục 26 nhưng nhánh và tiền tố hành động
  // riêng (khpc-…) để không đụng module khoá điện thoại.
  [
    [/ma:\s*'khoa-hoc-pc',\s*ten:\s*'Khoá học Lightroom máy tính'/, "mục Khoá học Lightroom máy tính trong menu /admin"],
    [/'khoa-hoc-pc':\s*'khoahoc\/lrPC'/, "nhánh Firebase khoá học máy tính được nạp cùng lúc với các cài đặt khác"],
    [/function\s+veAdminKhoaHocMayTinh\s*\(/, "hàm vẽ module quản lý khoá học máy tính"],
    [/function\s+adminKhpcThemBai\s*\(/, "hành động Thêm bài (khoá máy tính)"],
    [/function\s+adminKhpcThemChuong\s*\(/, "hành động Thêm chương (khoá máy tính)"],
    [/function\s+adminKhpcXoaDong\s*\(/, "hành động Xoá dòng (khoá máy tính)"],
    [/function\s+adminKhpcDoiCho\s*\(/, "hành động đổi chỗ (khoá máy tính)"],
    [/function\s+adminKhpcXemTruocVideo\s*\(/, "hành động Xem trước link video (khoá máy tính)"],
    [/function\s+adminKhpcLuuTatCa\s*\(/, "hành động Lưu tất cả (khoá máy tính)"],
    [/data-hanh-dong="khpc-luu-tat-ca"/, "nút Lưu tất cả (khoá máy tính)"],
    [/rtdb\.ref\(NHANH_KHOA_HOC_MAY_TINH\)\.set\(/, "Lưu tất cả (khoá máy tính) ghi ĐÈ nguyên mảng xuống Firebase"],
  ].forEach(([mau, ten]) => {
    if (!mau.test(banNoi)) fail(`Thiếu ${ten}.`);
  });

  // Không có nút "Lưu" riêng cho từng dòng — chỉ một nút Lưu tất cả.
  if (/data-hanh-dong="khpc-luu"[^-]/.test(banNoi)) {
    fail("Không được có nút Lưu riêng cho từng dòng (khoá máy tính) — chỉ một nút Lưu tất cả.");
  }

  // Nhánh "khoahoc" ở Rules đã bao trọn cả lrMobile lẫn lrPC (kiểm ở mục 26),
  // không cần thêm dòng Rules riêng cho khoá máy tính.
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
  // Cả BỐN SỐ CUỐI tài khoản cũng không được, kể cả trong bộ thử. Ảnh chụp
  // màn hình ngân hàng che phần đầu số tài khoản nhưng để hở phần đuôi, và
  // phần đuôi đó chép vào mã lúc viết bộ thử là chuyện đã suýt xảy ra.
  /1034843/, /0917114941/,
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
