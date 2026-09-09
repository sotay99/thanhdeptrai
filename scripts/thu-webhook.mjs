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
  const dung2 = new Function(...ten2, nguonVa + '\n;return { doPost: doPost, docMaDonTrongNoiDung: docMaDonTrongNoiDung, bocBaoCo: bocBaoCo };');
  const api = dung2.apply({}, ten.map((t) => moiTruong[t]).concat([thu]));

  return { api, kho, thu, log, thietLap };
}

function goi(api, than, khoa) {
  return JSON.parse(api.doPost({
    postData: { contents: typeof than === 'string' ? than : JSON.stringify(than) },
    parameter: khoa === undefined ? { key: 'MAT-KHAU-DUNG' } : { key: khoa }
  }).getContent());
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

console.log('\n— Moi tiền và nội dung ra khỏi gói dữ liệu —');
{
  const { api } = dungSanKhau(DON_MAU);
  const b = api.bocBaoCo;
  ok(b({ amount: 99000, description: 'LR WNAT7M' }).tien === 99000, 'Tên trường kiểu Casso/SePay', JSON.stringify(b({ amount: 99000 })));
  ok(b({ transferAmount: 99000, content: 'LR WNAT7M' }).noiDung === 'LR WNAT7M', 'Tên trường kiểu khác', '');
  ok(b({ soTien: '99.000', noiDung: 'x' }).tien === 99000, 'Số tiền có dấu chấm vẫn ra đúng', String(b({ soTien: '99.000' }).tien));
  ok(b({ data: { amount: 99000, description: 'LR WNAT7M' } }).tien === 99000, 'Trường nằm lồng trong nhánh con vẫn tìm ra', '');
  ok(b({}).tien === 0 && b({}).noiDung === '', 'Gói rỗng thì ra 0 và chuỗi rỗng', '');
}

console.log('\n— Cửa mật khẩu —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, { amount: 99000, description: 'LR WNAT7M' }, 'MAT-KHAU-BAY');
  ok(ra.ok === false && ra.vi === 'sai-khoa', 'Sai mật khẩu thì từ chối', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'moi', 'Và KHÔNG đụng vào đơn', kho.donhang['-Naaa'].trangThai);
  ok(thu.length === 0, 'Và không gửi lá thư nào', String(thu.length));
}

console.log('\n— Đủ tiền thì gửi hàng —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, { amount: 99000, description: 'CHUYEN KHOAN LR WNAT7M', id: 'GD1' });
  ok(ra.ok === true && ra.vi === 'da-gui', 'Trả về đã gửi', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'daGui', 'Đơn chuyển sang đã gửi', kho.donhang['-Naaa'].trangThai);
  ok(!!kho.donhang['-Naaa'].maNhanHang, 'Đơn được cấp mã nhận hàng', JSON.stringify(kho.donhang['-Naaa'].maNhanHang));
  ok(thu.some((t) => t.toi === 'khach@thu.test'), 'Khách nhận được thư', JSON.stringify(thu.map((t) => t.toi)));
  ok(thu.some((t) => t.toi === 'shop@thu.test'), 'Shop cũng nhận được thư đối soát', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Trả dư tiền vẫn gửi —');
{
  const { api, kho } = dungSanKhau(DON_MAU);
  goi(api, { amount: 200000, description: 'LR WNAT7M' });
  ok(kho.donhang['-Naaa'].trangThai === 'daGui', 'Chuyển dư thì vẫn là đã trả đủ', kho.donhang['-Naaa'].trangThai);
}

console.log('\n— Thiếu tiền thì KHÔNG gửi —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, { amount: 1000, description: 'LR WNAT7M' });
  ok(ra.vi === 'thieu-tien', 'Trả về thiếu tiền', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'canXemTay', 'Đơn chuyển sang cần xem tay', kho.donhang['-Naaa'].trangThai);
  ok(!thu.some((t) => t.toi === 'khach@thu.test'), 'Khách KHÔNG nhận được hàng', JSON.stringify(thu.map((t) => t.toi)));
  ok(thu.some((t) => t.toi === 'shop@thu.test'), 'Nhưng shop được báo', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Cổng gửi lại cùng một báo có —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  goi(api, { amount: 99000, description: 'LR WNAT7M', id: 'GD1' });
  const soThuLan1 = thu.length;
  const maLan1 = kho.donhang['-Naaa'].maNhanHang;
  const ra = goi(api, { amount: 99000, description: 'LR WNAT7M', id: 'GD1' });
  ok(ra.vi === 'da-gui-tu-truoc', 'Lần hai bị nhận ra là lặp', JSON.stringify(ra));
  ok(thu.length === soThuLan1, 'Không gửi thêm lá thư nào', thu.length + ' / ' + soThuLan1);
  ok(kho.donhang['-Naaa'].maNhanHang === maLan1, 'Và giữ nguyên mã nhận hàng cũ', 'mã bị đổi');
}

console.log('\n— Tiền của người khác chuyển vào —');
{
  const { api, kho, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, { amount: 50000, description: 'ME GUI TIEN AN SANG' });
  ok(ra.vi === 'khong-co-ma-don', 'Không có mã đơn thì không gửi gì', JSON.stringify(ra));
  ok(kho.donhang['-Naaa'].trangThai === 'moi', 'Đơn đang có không bị đụng tới', kho.donhang['-Naaa'].trangThai);
  ok(thu.length === 1 && thu[0].toi === 'shop@thu.test', 'Chỉ báo cho shop một lá', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Mã đơn không có thật —');
{
  const { api, thu } = dungSanKhau(DON_MAU);
  const ra = goi(api, { amount: 99000, description: 'LR ZZZZZZ' });
  ok(ra.vi === 'khong-co-don', 'Báo không tìm thấy đơn', JSON.stringify(ra));
  ok(thu.length === 1 && thu[0].toi === 'shop@thu.test', 'Và báo cho shop', JSON.stringify(thu.map((t) => t.toi)));
}

console.log('\n— Gói dữ liệu méo —');
{
  const { api } = dungSanKhau(DON_MAU);
  ok(goi(api, 'khong-phai-json').vi === 'khong-co-ma-don', 'Không phải JSON thì không nổ', '');
  ok(goi(api, {}).vi === 'khong-co-ma-don', 'Gói rỗng thì không nổ', '');
}

console.log('\n===== ' + (hong.length ? 'CÓ ' + hong.length + ' MỤC HỎNG' : 'TẤT CẢ ' + dat + ' MỤC ĐỀU ĐẠT') + ' =====');
if (hong.length) process.exit(1);
console.log('Bộ thử cổng thanh toán ĐẠT: ' + dat + ' mục — cửa mật khẩu, đủ/thiếu tiền, báo có lặp, và gói dữ liệu méo.');
