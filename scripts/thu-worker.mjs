#!/usr/bin/env node

// BỘ THỬ MÁY CHỦ CẤP PHÁT — chạy worker/kho-worker.js ngay trong Node.
//
// Worker là thứ duy nhất biết đường tới tệp thật trong kho, nên nó phải được
// thử bằng cách CHẠY chứ không chỉ bằng regex. Ở đây Firebase và binding R2
// được giả lập: fetch bị thay bằng một kho dữ liệu trong bộ nhớ, env.KHO trả
// về nội dung giả. Nhờ vậy thử được trọn các cửa kiểm tra mà không cần mạng,
// không cần khoá thật, và không đụng tới kho hàng thật.
//
// Chạy:  node scripts/thu-worker.mjs
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

let dat = 0, hong = 0;
const ok = (dk, ten, thuc) => { if (dk) { dat++; console.log('  ✓ ' + ten); } else { hong++; console.log('  ✗ ' + ten + '  →  ' + thuc); } };

// Kho dữ liệu Firebase giả
let DB = {
  donhang: {
    '-Nabc': { maDon: 'YK3J2A', maNhanHang: 'MANHANHANG0000001', maSanPham: ['sp1', 'sp2'], trangThai: 'daGui' },
    '-Nxyz': { maDon: 'ZZ9Q1B', maNhanHang: 'MANHANHANG0000002', maSanPham: ['sp7'], trangThai: 'daGui' }
  },
  danhmuc: {
    sp1: { nguon: 'r2', file: [{ tep: 'sp1.apk', ten: 'Lightroom Premium' }] },
    sp2: { nguon: 'r2', file: [{ tep: 'sp2/00-tron-bo.zip', ten: 'Trọn bộ' }] },
    sp7: { nguon: 'r2', file: [{ tep: 'sp7/photoshop.zip', ten: 'Photoshop' }] },
    sp8: { nguon: 'drive', link: 'https://drive.google.com/x' }
  },
  thietbi: {}
};

function docDuong(duong) {
  return duong.split('/').reduce((n, k) => (n == null ? null : n[k]), DB);
}
function ghiDuong(duong, giaTri) {
  const phan = duong.split('/');
  let n = DB;
  for (let i = 0; i < phan.length - 1; i++) n = (n[phan[i]] = n[phan[i]] || {});
  n[phan[phan.length - 1]] = giaTri;
}

// Trang xem của Drive, giả lập bốn ca: có đủ og:title/og:description, chỉ có
// <title> (không og:description), thẻ meta viết content= TRƯỚC property=
// (thứ tự thuộc tính khác — HTML thật của Google không cố định thứ tự này),
// và một mã "chết" trả về lỗi.
const TRANG_DRIVE_GIA = {
  'coU1TieuDeVaMoTa000': '<html><head><meta property="og:title" content="Video hướng dẫn cài preset.mp4">' +
    '<meta property="og:description" content="Video quay màn hình, 5 phút."></head><body></body></html>',
  'chiCoTieuDeThoi00001': '<html><head><title>Bản ghi màn hình.mov - Google Drive</title></head><body></body></html>',
  'thuTuThuocTinhNguoc01': '<html><head><meta content="Video quay tay.mp4" property="og:title"></head><body></body></html>'
};

// Đếm số lần Worker thật sự gọi ra drive.google.com — dùng để kiểm chứng
// cache có tránh được lượt gọi thứ hai cho CÙNG một mã tệp hay không (đúng
// ca sp6/sp7 dùng chung một link).
let SO_LAN_GOI_DRIVE = 0;

// Giả lập Cache API của Cloudflare Worker (caches.default) — Node không có
// sẵn nên tự dựng một kho trong bộ nhớ, đủ để thử put()/match().
const KHO_CACHE = new Map();
globalThis.caches = {
  default: {
    async match(req) {
      const v = KHO_CACHE.get(req.url);
      return v ? v.clone() : undefined;
    },
    async put(req, res) {
      KHO_CACHE.set(req.url, res.clone());
    }
  }
};

globalThis.fetch = async (url, tuyChon) => {
  const u = new URL(url);
  if (u.hostname === 'drive.google.com') {
    SO_LAN_GOI_DRIVE++;
    const id = (u.pathname.match(/\/file\/d\/([^/]+)\//) || [])[1];
    if (id === 'maChetMayChuLoi000000') return new Response('lỗi', { status: 500 });
    const html = TRANG_DRIVE_GIA[id];
    if (!html) return new Response('không có', { status: 404 });
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } });
  }
  const duong = u.pathname.replace(/^\//, '').replace(/\.json$/, '');
  if (!u.searchParams.get('auth')) return new Response('thiếu auth', { status: 401 });
  if (tuyChon && tuyChon.method === 'PUT') {
    ghiDuong(duong, JSON.parse(tuyChon.body));
    return new Response('{}', { status: 200 });
  }
  const orderBy = u.searchParams.get('orderBy');
  if (orderBy) {
    const truong = JSON.parse(orderBy);
    const gia = JSON.parse(u.searchParams.get('equalTo'));
    const nguon = docDuong(duong) || {};
    const ra = {};
    for (const k of Object.keys(nguon)) if (nguon[k][truong] === gia) ra[k] = nguon[k];
    return new Response(JSON.stringify(Object.keys(ra).length ? ra : null), { status: 200 });
  }
  return new Response(JSON.stringify(docDuong(duong) ?? null), { status: 200 });
};

const NOI_DUNG_TEP = { 'sp1.apk': 'NOI-DUNG-APK', 'sp2/00-tron-bo.zip': 'NOI-DUNG-ZIP', 'sp7/photoshop.zip': 'NOI-DUNG-PS' };
const env = {
  FIREBASE_DB_URL: 'https://thu-default-rtdb.asia-southeast1.firebasedatabase.app',
  FIREBASE_SECRET: 'bi-mat-thu',
  KY_TOKEN: 'chuoi-ky-that-dai-va-ngau-nhien-0123456789',
  GOC_CHO_PHEP: 'https://thanhdeptrai.vn, https://xemtruoc.web.app',
  KHO: {
    async get(khoa) {
      if (!(khoa in NOI_DUNG_TEP)) return null;
      return {
        body: NOI_DUNG_TEP[khoa],
        httpEtag: '"etag-' + khoa + '"',
        writeHttpMetadata(mu) { mu.set('content-type', 'application/octet-stream'); }
      };
    }
  }
};

const nguon = readFileSync(new URL('../worker/kho-worker.js', import.meta.url), 'utf8');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(nguon).toString('base64'))).default;

// Địa chỉ bịa cho bộ thử. CỐ Ý không dùng dạng ".workers.dev" thật: hợp đồng
// quét cả kho và chặn mọi địa chỉ máy chủ kho lọt vào mã nguồn, kể cả địa chỉ
// giả — chặn hẳn còn hơn phải phân biệt thật giả.
const GOC = 'https://kho-thu-nghiem.test';
const goi = (than, goc = 'https://thanhdeptrai.vn') =>
  worker.fetch(new Request(GOC + '/cap-phat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: goc },
    body: JSON.stringify(than)
  }), env);

const THIET_BI_A = 'may-cua-khach-A-0001';
const THIET_BI_B = 'may-khac-hoan-toan-B02';

console.log('— Cửa vào —');
{
  const r = await worker.fetch(new Request(GOC + '/cap-phat', {
    method: 'POST', headers: { Origin: 'https://ke-trom.com' }, body: '{}'
  }), env);
  ok(r.status === 403, 'Địa chỉ lạ bị chặn ngay ở cửa', r.status);
}
{
  const r = await goi({ sanPham: 'sp1', tep: 'sp1.apk', thietBi: THIET_BI_A });
  ok((await r.json()).lyDo === 'thieu-ma', 'Thiếu mã nhận hàng thì từ chối', 'không từ chối');
}
{
  const r = await goi({ ma: 'MA-KHONG-CO-THAT', sanPham: 'sp1', tep: 'sp1.apk', thietBi: THIET_BI_A });
  ok((await r.json()).lyDo === 'sai-ma', 'Mã bịa ra thì từ chối', 'không từ chối');
}
{
  const r = await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp1', tep: 'sp1.apk', thietBi: 'x' });
  ok((await r.json()).lyDo === 'thieu-thiet-bi', 'Mã thiết bị méo thì từ chối', 'không từ chối');
}

console.log('\n— Hỏi đơn của mình —');
{
  const goiDon = (than, goc = 'https://thanhdeptrai.vn') =>
    worker.fetch(new Request(GOC + '/don', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: goc },
      body: JSON.stringify(than)
    }), env);

  const kq = await (await goiDon({ ma: 'MANHANHANG0000001' })).json();
  ok(kq.duoc === true, 'Mã đúng thì trả về đơn', JSON.stringify(kq));
  ok(JSON.stringify(kq.maSanPham) === '["sp1","sp2"]', 'Trả đúng danh sách món đã mua', JSON.stringify(kq.maSanPham));
  ok(!('email' in kq) && !('zalo' in kq) && !('thanhTien' in kq) && !('maDon' in kq),
    'CHỈ trả mã sản phẩm — không email, không số tiền, không mã đơn', JSON.stringify(kq));

  const sai = await (await goiDon({ ma: 'BIA-DAT-RA' })).json();
  ok(sai.lyDo === 'sai-ma', 'Mã bịa thì không moi được đơn nào', JSON.stringify(sai));

  const la = await goiDon({ ma: 'MANHANHANG0000001' }, 'https://ke-trom.com');
  ok(la.status === 403, 'Địa chỉ lạ không hỏi được đơn của khách', la.status);
}

console.log('\n— Chặn lấy hàng không phải của mình —');
{
  // Đơn 1 mua sp1 và sp2, KHÔNG mua sp7.
  const r = await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp7', tep: 'sp7/photoshop.zip', thietBi: THIET_BI_A });
  ok((await r.json()).lyDo === 'khong-co-trong-don', 'Không mua sp7 thì không tải được sp7', 'LỌT');
}
{
  // Tên tệp tự bịa, không có trong danh mục.
  const r = await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp1', tep: 'sp7/photoshop.zip', thietBi: THIET_BI_A });
  ok((await r.json()).lyDo === 'yeu-cau-hong', 'Gõ tên tệp của sản phẩm khác thì không qua', 'LỌT');
}
{
  const r = await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp8', tep: 'x', thietBi: THIET_BI_A });
  ok((await r.json()).lyDo === 'khong-co-trong-don', 'Sản phẩm Drive không đi qua cửa cấp phát', 'LỌT');
}

{
  // Đơn gõ tay trong Firebase Console rất dễ ghi maSanPham thành một dòng chữ
  // thay vì danh sách. Lúc đó indexOf hoá ra tìm chuỗi con — "sp30" cho qua cả
  // "sp3". Chuyện này đã suýt xảy ra thật khi dựng đơn thử.
  DB.donhang['-Nchuoi'] = { maDon: 'X', maNhanHang: 'MANHANHANG0000009', maSanPham: 'sp30' };
  const kq = await (await goi({ ma: 'MANHANHANG0000009', sanPham: 'sp3', tep: 'sp3/01.zip', thietBi: THIET_BI_A })).json();
  ok(kq.lyDo === 'don-hong', 'Đơn ghi maSanPham thành chuỗi thì từ chối, không đoán mò', JSON.stringify(kq));
  delete DB.donhang['-Nchuoi'];
}

console.log('\n— Cấp phát đúng —');
let duongDan1 = '';
{
  const kq = await (await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp1', tep: 'sp1.apk', thietBi: THIET_BI_A })).json();
  ok(kq.duoc === true, 'Đơn đúng, sản phẩm đúng, tệp đúng → được cấp', JSON.stringify(kq));
  ok(typeof kq.duongDan === 'string' && kq.duongDan.includes('/tai?t='), 'Trả về đường dẫn tải', kq.duongDan);
  ok(!kq.duongDan.includes('sp1.apk'), 'Đường dẫn KHÔNG lộ tên tệp trong kho', kq.duongDan);
  ok(!kq.duongDan.includes('r2.cloudflarestorage'), 'Và không lộ địa chỉ kho R2', kq.duongDan);
  duongDan1 = kq.duongDan;
  ok(DB.thietbi['MANHANHANG0000001'].sp1.thietBi === THIET_BI_A, 'Thiết bị được ghi nhớ ngay lần đầu', JSON.stringify(DB.thietbi));
}

console.log('\n— Khoá thiết bị —');
{
  const kq = await (await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp1', tep: 'sp1.apk', thietBi: THIET_BI_B })).json();
  ok(kq.lyDo === 'da-dung-thiet-bi-khac', 'Máy khác xin cùng sản phẩm thì bị chặn', JSON.stringify(kq));
}
{
  const kq = await (await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp1', tep: 'sp1.apk', thietBi: THIET_BI_A })).json();
  ok(kq.duoc === true, 'Đúng máy cũ thì xin lại vẫn được', JSON.stringify(kq));
}
{
  // sp2 chưa mở khoá trên máy nào — máy B mở được, vì khoá theo TỪNG sản phẩm.
  const kq = await (await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp2', tep: 'sp2/00-tron-bo.zip', thietBi: THIET_BI_B })).json();
  ok(kq.duoc === true, 'Khoá theo từng sản phẩm, không phải cả đơn', JSON.stringify(kq));
}

console.log('\n— Rót tệp —');
{
  const r = await worker.fetch(new Request(duongDan1), env);
  ok(r.status === 200, 'Đường dẫn vừa cấp thì tải được', r.status);
  ok(await r.text() === 'NOI-DUNG-APK', 'Rót đúng nội dung tệp', 'sai nội dung');
  ok(/attachment/.test(r.headers.get('Content-Disposition') || ''), 'Buộc tải xuống, không mở trong tab', r.headers.get('Content-Disposition'));
  ok(/sp1\.apk/.test(r.headers.get('Content-Disposition') || ''), 'Tên tệp gọn gàng khi lưu về máy', r.headers.get('Content-Disposition'));
  ok(/no-store/.test(r.headers.get('Cache-Control') || ''), 'Không cho proxy nào cache lại', r.headers.get('Cache-Control'));
}
{
  const r = await worker.fetch(new Request(GOC + '/tai?t=bia-dat-ra'), env);
  ok(r.status === 403, 'Token bịa thì bị chặn', r.status);
}
{
  // Sửa một ký tự trong token → chữ ký hỏng
  const hong = duongDan1.slice(0, -2) + (duongDan1.slice(-2, -1) === 'A' ? 'B' : 'A') + duongDan1.slice(-1);
  const r = await worker.fetch(new Request(hong), env);
  ok(r.status === 403, 'Sửa một ký tự trong token là chữ ký hỏng', r.status);
}
{
  // Hạn của đường dẫn tuỳ SẢN PHẨM: sp1 5 phút, sp7 60 phút. Tua đồng hồ để thử
  // từng mốc thay vì ngồi đợi thật.
  const that = Date.now;
  const thuHan = async (sanPham, tep, ma, phutTua) => {
    const kq = await (await goi({ ma, sanPham, tep, thietBi: THIET_BI_A })).json();
    Date.now = () => that() + phutTua * 60 * 1000;
    const r = await worker.fetch(new Request(kq.duongDan), env);
    Date.now = that;
    return r.status;
  };
  ok(await thuHan('sp1', 'sp1.apk', 'MANHANHANG0000001', 4) === 200, 'sp1: 4 phút sau vẫn tải được', 'chết sớm');
  ok(await thuHan('sp1', 'sp1.apk', 'MANHANHANG0000001', 6) === 403, 'sp1: quá 5 phút thì đường dẫn chết', 'còn sống');
  ok(await thuHan('sp7', 'sp7/photoshop.zip', 'MANHANHANG0000002', 30) === 200, 'sp7: 30 phút sau vẫn tải được', 'chết sớm');
  ok(await thuHan('sp7', 'sp7/photoshop.zip', 'MANHANHANG0000002', 61) === 403, 'sp7: quá 60 phút thì đường dẫn chết', 'còn sống');
  // Đường dẫn không mang con số hạn ra ngoài — khách không biết mình có bao lâu.
  const kq = await (await goi({ ma: 'MANHANHANG0000001', sanPham: 'sp1', tep: 'sp1.apk', thietBi: THIET_BI_A })).json();
  ok(!/[?&](phut|han|ttl|exp)=/.test(kq.duongDan), 'Đường dẫn không lộ hạn dùng ra ngoài', kq.duongDan);
}
{
  const r = await worker.fetch(new Request(GOC + '/'), env);
  ok(r.status === 200, 'Đường / báo máy chủ đang sống', r.status);
  const r2 = await worker.fetch(new Request(GOC + '/duong-la'), env);
  ok(r2.status === 404, 'Đường lạ trả 404', r2.status);
}

console.log('\n— Xem trước video ở /admin —');
const xemTruoc = (id) =>
  worker.fetch(new Request(GOC + '/video-xem-truoc?id=' + encodeURIComponent(id), {
    headers: { Origin: 'https://thanhdeptrai.vn' }
  }), env);
{
  const r = await xemTruoc('coU1TieuDeVaMoTa000');
  const j = await r.json();
  ok(r.status === 200 && j.duoc === true, 'Có og:title/og:description thì đọc được', JSON.stringify(j));
  ok(j.ten === 'Video hướng dẫn cài preset.mp4', 'Lấy đúng tên từ og:title', j.ten);
  ok(j.moTa === 'Video quay màn hình, 5 phút.', 'Lấy đúng mô tả từ og:description', j.moTa);
}
{
  const r = await xemTruoc('chiCoTieuDeThoi00001');
  const j = await r.json();
  ok(j.duoc === true, 'Không có og:title thì lùi về thẻ <title>', JSON.stringify(j));
  ok(j.ten === 'Bản ghi màn hình.mov', 'Bỏ đúng đuôi "- Google Drive" ở cuối tiêu đề', j.ten);
  ok(j.moTa === '', 'Không có og:description thì để trống, không bịa', JSON.stringify(j.moTa));
}
{
  const r = await xemTruoc('thuTuThuocTinhNguoc01');
  const j = await r.json();
  ok(j.ten === 'Video quay tay.mp4', 'Đọc được cả khi content= đứng TRƯỚC property= trong thẻ meta', JSON.stringify(j));
}
{
  const r = await xemTruoc('maChetMayChuLoi000000');
  ok(r.status === 502, 'Drive lỗi thì báo lỗi máy chủ, không vỡ', r.status);
}
{
  const r = await xemTruoc('../../../etc/passwd');
  ok(r.status === 400, 'Mã tệp méo (có ký tự lạ) thì chặn ngay, không gọi ra ngoài', r.status);
}
{
  const r = await xemTruoc('ngan-qua');
  ok(r.status === 400, 'Mã tệp quá ngắn thì chặn', r.status);
}
{
  // Không cách nào nhét được một máy chủ khác vào — chỉ có tham số ?id=.
  const r = await worker.fetch(new Request(GOC + '/video-xem-truoc?id=coU1TieuDeVaMoTa000&goc=https://ke-trom.com',
    { headers: { Origin: 'https://thanhdeptrai.vn' } }), env);
  const j = await r.json();
  ok(j.duoc === true, 'Tham số lạ bị bỏ qua, vẫn chỉ đọc đúng mã Drive', JSON.stringify(j));
}
{
  // sp6 và sp7 hay dán CHUNG một link — hỏi lần đầu xong phải nhớ, lần thứ
  // hai đọc thẳng trong cache, không gọi ra Google lần nữa (đỡ bị Google coi
  // là hỏi dồn dập cùng một tệp, và trả lời tức thì thay vì đợi Drive).
  const idRieng = 'capNhoCacheRieng0001';
  TRANG_DRIVE_GIA[idRieng] = '<html><head><meta property="og:title" content="Video dùng chung.mp4"></head></html>';
  const truoc = SO_LAN_GOI_DRIVE;
  const j1 = await (await xemTruoc(idRieng)).json();
  ok(j1.ten === 'Video dùng chung.mp4', 'Lần đầu (sp6) đọc đúng tên', JSON.stringify(j1));
  ok(SO_LAN_GOI_DRIVE === truoc + 1, 'Lần đầu có gọi ra Google đúng một lần', SO_LAN_GOI_DRIVE - truoc);
  const j2 = await (await xemTruoc(idRieng)).json();
  ok(j2.ten === 'Video dùng chung.mp4', 'Lần hai (sp7, CÙNG link) vẫn đọc đúng tên', JSON.stringify(j2));
  ok(SO_LAN_GOI_DRIVE === truoc + 1, 'Lần hai đọc từ cache, KHÔNG gọi ra Google lần hai', SO_LAN_GOI_DRIVE - truoc);
}

if (hong) {
  console.error('\nBộ thử máy chủ cấp phát THẤT BẠI: ' + hong + ' mục hỏng.');
  process.exit(1);
}
console.log('\nBộ thử máy chủ cấp phát ĐẠT: ' + dat + ' mục, đủ bốn cửa kiểm tra, khoá thiết bị và hạn token.');
