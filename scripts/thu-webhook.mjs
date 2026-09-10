#!/usr/bin/env node

// BỘ THỬ KHÂU NHẬN BÁO CÓ TỪ CỔNG THANH TOÁN
//
// Đây là chỗ tiền đổi thành hàng, nên nó phải được thử chứ không thể chỉ đọc
// bằng mắt. Bộ thử nạp thẳng mã Apps Script vào Node, dựng sẵn Firebase giả và
// hòm thư giả, rồi cho chạy đúng những gói dữ liệu mà một cổng thật gửi tới —
// kể cả những gói méo mó: sai mật khẩu, thiếu tiền, gửi lại lần hai, nội dung
// bị ngân hàng nuốt dấu cách.
//
// Chạy: node scripts/thu-webhook.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nguon = fs.readFileSync(path.join(goc, 'apps-script/gui-hang.gs'), 'utf8');

let dat = 0;
const hong = [];
function ok(dieuKien, ten, chiTiet) {
  console.log((dieuKien ? '  ✓ ' : '  ✗ ') + ten + (dieuKien ? '' : '  →  ' + chiTiet));
  if (dieuKien) dat++; else hong.push(ten + ' | ' + chiTiet);
}

// --------------------------------------------------------------- SÂN KHẤU
//
// Dựng lại đúng những thứ Apps Script cho sẵn, ở mức vừa đủ để mã chạy thật:
// Script Properties, UrlFetchApp nói chuyện với một Firebase trong bộ nhớ,
// MailApp ghi thư vào một mảng, LockService luôn cho qua.

function dungSanKhau(donBanDau) {
  const kho = { donhang: JSON.parse(JSON.stringify(donBanDau)), danhmuc: {} };
  const thu = [];
  const log = [];

  const thietLap = {
    EMAIL_SHOP: 'shop@thu.test',
    FIREBASE_DB_URL: 'https://thu.firebasedatabase.app',
    FIREBASE_SECRET: 'BI-MAT',
    WEBHOOK_KEY: 'MAT-KHAU-DUNG'
  };

  function traLoiHTTP(ma, than) {
    return { getResponseCode: () => ma, getContentText: () => than };
  }

  const moiTruong = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (t) => thietLap[t] || null }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Logger: { log: (c) => log.push(String(c)) },
    Utilities: { sleep() {} },
    MailApp: { getRemainingDailyQuota: () => 100 },
    GmailApp: null,
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (c) => ({ getContent: () => c, setMimeType: function () { return this; } })
    },
    UrlFetchApp: {
      fetch(url, opts) {
        const u = new URL(url);
        const duong = u.pathname.replace(/^\//, '').replace(/\.json$/, '');
        const phan = duong.split('/');

        if (opts && opts.method === 'patch') {
          const [nhanh, khoa] = phan;
          Object.assign(kho[nhanh][khoa], JSON.parse(opts.payload));
          return traLoiHTTP(200, opts.payload);
        }

        if (phan.length === 1) {
          const nhanh = kho[phan[0]] || {};
          const truong = u.searchParams.get('orderBy');
          const bang = u.searchParams.get('equalTo');
          if (!truong || truong === '"$key"') return traLoiHTTP(200, JSON.stringify(nhanh));
          const ten = truong.replace(/"/g, '');
          const tri = bang ? bang.replace(/"/g, '') : null;
          const ra = {};
          Object.keys(nhanh).forEach((k) => {
            if (String(nhanh[k][ten]) === tri) ra[k] = nhanh[k];
          });
          return traLoiHTTP(200, JSON.stringify(ra));
        }
        return traLoiHTTP(404, '{}');
      }
    }
  };

  // Nạp mã thật. Hàm guiThu nằm trong chính tệp đó nên phải thay sau khi nạp:
  // gọi MailApp thật thì bộ thử đi gửi thư ra ngoài đời.
  const ten = Object.keys(moiTruong);
  const dung = new Function(...ten, nguon + '\n;return this;');
  const pham = dung.apply({}, ten.map((t) => moiTruong[t]));

  // Ghi đè guiThu bằng bản ghi vào mảng. Đây là biên giới duy nhất của bộ thử
  // với thế giới bên ngoài, nên chặn đúng một chỗ này là đủ.
  const nguonVa = nguon.replace(
    /function guiThu\(nguoiNhan, tieuDe, thanHtml, tuyChon\) \{[\s\S]*?\n\}/,
    'function guiThu(nguoiNhan, tieuDe, thanHtml) { __thu.push({ toi: nguoiNhan, tieuDe: tieuDe, than: thanHtml }); }'
  );
  const ten2 = ten.concat(['__thu']);
  const dung2 = new Function(...ten2, nguonVa + '\n;return { doGet: doGet, doPost: doPost, docMaDonTrongNoiDung: docMaDonTrongNoiDung, bocTienTuTinNhan: bocTienTuTinNhan };');
  const api = dung2.apply({}, ten.map((t) => moiTruong[t]).concat([thu]));

  return { api, kho, thu, log, thietLap };
}

function goi(api, tin, khoa, nguon) {
  return JSON.parse(api.doGet({
    parameter: {
      key: khoa === undefined ? 'MAT-KHAU-DUNG' : khoa,
      message: tin,
      type: 'sms',
      source: nguon === undefined ? 'NGANHANG' : nguon
    }
  }).getContent());
}

// Đúng định dạng ngân hàng của shop gửi thật, chỉ thay tên và số tài khoản
// bằng thứ giả — tên ngân hàng thật chỉ được nằm trong Realtime Database. Ba con số
// tiền: phát sinh, số dư, số dư khả dụng — chính là cái bẫy của hàm bóc tiền.
function tinNganHang(dauTien, soTien, noiDung) {
  return '(NGANHANG): 09/09/26;11:08 TK: xxxx0000000 PS:' + dauTien + soTien + 'VND ' +
    'SD: 1.044.353VND SD KHA DUNG: 1.044.353VND ND: ' + noiDung + ' SO GD: 039CTIB262520914';
}

const DON_MAU = {
  '-Naaa': {
    maDon: 'WNAT7M', trangThai: 'moi', daXacNhan: false, thanhTien: 99000,
    sanPham: ['App Lightroom — 99.000₫'], maSanPham: ['sp1'],
    email: 'khach@thu.test', zalo: '', dienThoai: '', taoLuc: 1757300000000
  }
};

console.log('— Đọc mã đơn trong nội dung ngân hàng —');
{
  const { api } = dungSanKhau(DON_MAU);
  const d = api.docMaDonTrongNoiDung;
  ok(d('LR WNAT7M') === 'WNAT7M', 'Nội dung chuẩn', d('LR WNAT7M'));
  ok(d('LRWNAT7M') === 'WNAT7M', 'Ngân hàng nuốt dấu cách vẫn đọc ra', d('LRWNAT7M'));
  ok(d('CHUYEN TIEN LR WNAT7M GD 123456') === 'WNAT7M', 'Có chữ thừa hai đầu vẫn đọc ra', d('CHUYEN TIEN LR WNAT7M GD 123456'));
  ok(d('lr wnat7m') === 'WNAT7M', 'Viết thường vẫn đọc ra', d('lr wnat7m'));
  ok(d('TIEN AN TRUA') === '', 'Không có mã thì trả về rỗng', d('TIEN AN TRUA'));
  ok(d('') === '', 'Nội dung trống thì trả về rỗng', d(''));
  // Bảng mã đã bỏ 0 O 1 I L, nên chuỗi mang chúng KHÔNG phải mã đơn.
  ok(d('LR WNAT70') === '', 'Chuỗi chứa số 0 không phải mã đơn', d('LR WNAT70'));
}

console.log('\n— Bóc số tiền khỏi tin nhắn ngân hàng thật —');
{
  const { api } = dungSanKhau(DON_MAU);
  const b = api.bocTienTuTinNhan;

  // Đúng định dạng thật: PS:+X | SD: Y | SD KHA DUNG: Z. Ba con số tiền.
  ok(b(tinNganHang('+', '99.000', 'LR WNAT7M')) === 99000,
    'Tiền vào: lấy đúng số phát sinh, không lấy số dư', String(b(tinNganHang('+', '99.000', 'LR WNAT7M'))));
  ok(b(tinNganHang('+', '1.000.000', 'LR WNAT7M')) === 1000000,
    'Số triệu có dấu chấm phân cách vẫn đúng', String(b(tinNganHang('+', '1.000.000', 'LR WNAT7M'))));

  // ĐÂY LÀ CA NGUY HIỂM NHẤT. Chính chủ shop chuyển tiền ĐI: số phát sinh mang
  // dấu trừ nên bị loại, số dư bị loại — nếu "SD KHA DUNG" không bị loại nốt
  // thì nó còn lại một mình và bị tưởng là tiền khách trả.
  ok(b(tinNganHang('-', '500.000', 'LR WNAT7M')) === 0,
    'Tiền CHUYỂN ĐI: không bóc ra đồng nào, kể cả số dư khả dụng', String(b(tinNganHang('-', '500.000', 'LR WNAT7M'))));

  ok(b('SD: 1.044.353VND SD KHA DUNG: 1.044.353VND') === 0,
    'Tin chỉ có số dư thì không có tiền vào nào', String(b('SD: 1.044.353VND SD KHA DUNG: 1.044.353VND')));
  ok(b('TK 0123456789 So du: 5.000.000 VND') === 0,
    '"So du" không dấu cũng bị loại', String(b('TK 0123456789 So du: 5.000.000 VND')));
  ok(b('Số dư: 5.000.000 VND') === 0,
    '"Số dư" có dấu cũng bị loại', String(b('Số dư: 5.000.000 VND')));

  // Các kiểu ngân hàng khác
  ok(b('SD TK VCB 0123456789 +99,000 VND luc 09-09-2026. SD 1,234,567 VND. Ref LR WNAT7M') === 99000,
    'Vietcombank: dấu phẩy phân cách, vẫn lấy đúng số vào',
    String(b('SD TK VCB 0123456789 +99,000 VND luc 09-09-2026. SD 1,234,567 VND. Ref LR WNAT7M')));
  ok(b('Thay doi: +125000VND. So du: 1234567VND. ND: LR WNAT7M') === 125000,
    'Số liền không phân cách vẫn đúng', String(b('Thay doi: +125000VND. So du: 1234567VND. ND: LR WNAT7M')));

  ok(b('Nhan tien 99.000 VND ND LR WNAT7M') === 99000,
    'Chỉ một con số duy nhất thì lấy con đó', String(b('Nhan tien 99.000 VND ND LR WNAT7M')));
  ok(b('') === 0 && b('khong co so nao') === 0, 'Không có số thì trả về 0', '');
  ok(b('GD luc 09/09/26 21:23 ND LR WNAT7M') === 0,
    'Ngày giờ không bị nhầm thành tiền', String(b('GD luc 09/09/26 21:23 ND LR WNAT7M')));
  ok(b('TK: xxxx9876543 ND: LR WNAT7M') === 0,
    'Số tài khoản trần không bị nhầm thành tiền', String(b('TK: xxxx9876543 ND: LR WNAT7M')));

  // Nhiều con số cùng có đơn vị mà không con nào có dấu + — không đoán bừa.
  ok(b('Phi 15.000VND va 99.000VND ND LR WNAT7M') === 0,
    'Nhiều ứng viên mà không cái nào chắc thì trả về 0, không đoán bừa',
    String(b('Phi 15.000VND va 99.000VND ND LR WNAT7M')));
}

console.log('\n— Cửa mật khẩu —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, tinNganHang('+', '99.000', 'LR WNAT7M'), 'MAT-KHAU-BAY');
  ok(ra.ok === false && ra.vi === 'sai-khoa', 'Sai mật khẩu thì từ chối', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'moi', 'Và KHÔNG đụng vào đơn', kho.donhang['-Naaa'].trangThai);
  ok(thu.length === 0, 'Và không gửi lá thư nào', String(thu.length));
}

console.log('\n— Đủ tiền thì gửi hàng —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, tinNganHang('+', '99.000', 'LR WNAT7M'));
  ok(ra.ok === true && ra.vi === 'da-gui', 'Trả về đã gửi', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'daGui', 'Đơn chuyển sang đã gửi', kho.donhang['-Naaa'].trangThai);
  ok(!!kho.donhang['-Naaa'].maNhanHang, 'Đơn được cấp mã nhận hàng', JSON.stringify(kho.donhang['-Naaa'].maNhanHang));
  ok(thu.some((t) => t.toi === 'khach@thu.test'), 'Khách nhận được thư', JSON.stringify(thu.map((t) => t.toi)));
  ok(thu.some((t) => t.toi === 'shop@thu.test'), 'Shop cũng nhận được thư đối soát', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Trả dư tiền vẫn gửi —');
{
  const { api, kho } = dungSanKhau(DON_MAU);
  goi(api, tinNganHang('+', '200.000', 'LR WNAT7M'));
  ok(kho.donhang['-Naaa'].trangThai === 'daGui', 'Chuyển dư thì vẫn là đã trả đủ', kho.donhang['-Naaa'].trangThai);
}

console.log('\n— Thiếu tiền thì KHÔNG gửi —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, tinNganHang('+', '1.000', 'LR WNAT7M'));
  ok(ra.vi === 'thieu-tien', 'Trả về thiếu tiền', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'canXemTay', 'Đơn chuyển sang cần xem tay', kho.donhang['-Naaa'].trangThai);
  ok(!thu.some((t) => t.toi === 'khach@thu.test'), 'Khách KHÔNG nhận được hàng', JSON.stringify(thu.map((t) => t.toi)));
  ok(thu.some((t) => t.toi === 'shop@thu.test'), 'Nhưng shop được báo', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Cổng gửi lại cùng một báo có —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  goi(api, tinNganHang('+', '99.000', 'LR WNAT7M'));
  const soThuLan1 = thu.length;
  const maLan1 = kho.donhang['-Naaa'].maNhanHang;
  const ra = goi(api, tinNganHang('+', '99.000', 'LR WNAT7M'));
  ok(ra.vi === 'da-gui-tu-truoc', 'Lần hai bị nhận ra là lặp', JSON.stringify(ra));
  ok(thu.length === soThuLan1, 'Không gửi thêm lá thư nào', thu.length + ' / ' + soThuLan1);
  ok(kho.donhang['-Naaa'].maNhanHang === maLan1, 'Và giữ nguyên mã nhận hàng cũ', 'mã bị đổi');
}

console.log('\n— Tiền của người khác chuyển vào —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, tinNganHang('+', '50.000', 'ME GUI TIEN AN SANG'));
  ok(ra.vi === 'khong-co-ma-don', 'Không có mã đơn thì không gửi gì', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'moi', 'Đơn đang có không bị đụng tới', kho.donhang['-Naaa'].trangThai);
  ok(thu.length === 1 && thu[0].toi === 'shop@thu.test', 'Chỉ báo cho shop một lá', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Mã đơn không có thật —');
{
  const { api, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, tinNganHang('+', '99.000', 'LR ZZZZZZ'));
  ok(ra.vi === 'khong-co-don', 'Báo không tìm thấy đơn', JSON.stringify(ra));
  ok(thu.length === 1 && thu[0].toi === 'shop@thu.test', 'Và báo cho shop', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Gói dữ liệu méo —');
{
  const { api } = dungSanKhau(DON_MAU);
  ok(goi(api, 'tin nhan bat ky khong co ma').vi === 'khong-co-ma-don', 'Tin lạ thì không nổ', '');
  ok(JSON.parse(api.doGet({ parameter: { key: 'MAT-KHAU-DUNG' } }).getContent()).vi === 'khong-co-noi-dung',
    'Gọi mà không kèm message thì không nổ', '');
  ok(JSON.parse(api.doGet({}).getContent()).vi === 'sai-khoa', 'Gọi trống trơn thì bị chặn ở cửa mật khẩu', '');
}

console.log('\n===== ' + (hong.length ? 'CÓ ' + hong.length + ' MỤC HỎNG' : 'TẤT CẢ ' + dat + ' MỤC ĐỀU ĐẠT') + ' =====');
if (hong.length) process.exit(1);
console.log('Bộ thử cổng thanh toán ĐẠT: ' + dat + ' mục — cửa mật khẩu, đủ/thiếu tiền, báo có lặp, và gói dữ liệu méo.');
