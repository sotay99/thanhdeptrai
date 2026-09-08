/**
 * =============================================================================
 * MÁY CHỦ CẤP PHÁT — Cloudflare Worker gác cổng kho sản phẩm
 * =============================================================================
 *
 * Đây là thứ DUY NHẤT biết đường tới tệp thật trong kho R2. Web của khách không
 * biết, mã nguồn trên GitHub không biết, email gửi khách cũng không biết.
 *
 * HAI ĐƯỜNG VÀO:
 *
 *   POST /don        Khách hỏi: "đơn của tôi gồm những món nào?". Worker trả
 *                    về DUY NHẤT danh sách mã sản phẩm — không email, không số
 *                    tiền, không số điện thoại. Trang nhận hàng dùng nó để làm
 *                    mờ những món khách chưa mua.
 *
 *   POST /cap-phat   Khách hỏi: "cho tôi tải tệp này". Worker tra đơn hàng
 *                    trong Firebase, kiểm tệp có đúng là hàng của họ không,
 *                    khoá thiết bị, rồi trả về một đường dẫn DÙNG MỘT LẦN.
 *
 *   GET  /tai?t=…    Đường dẫn đó. Worker mở lại chữ ký, nếu còn hạn thì rót
 *                    tệp từ R2 xuống máy khách.
 *
 * VÌ SAO TÁCH LÀM HAI:
 * Nếu /cap-phat trả thẳng nội dung tệp thì mỗi lần khách bấm là phải kiểm tra
 * lại từ đầu, mà việc kiểm tra cần gọi Firebase — chậm, và một cú tải 2,8 GB
 * đứt giữa chừng là phải kiểm tra lại từ đầu. Tách ra thì khâu kiểm tra chạy
 * một lần, còn khâu rót tệp chỉ việc mở chữ ký ra xem.
 *
 * CHỮ KÝ, KHÔNG PHẢI CƠ SỞ DỮ LIỆU:
 * Token mang sẵn trong mình mọi thứ cần biết (tệp nào, hết hạn lúc nào, cho
 * thiết bị nào) và một chữ ký HMAC. Sửa một ký tự là chữ ký hỏng. Nhờ vậy
 * không phải lưu token ở đâu cả, và không có gì để dọn.
 *
 * BIẾN MÔI TRƯỜNG CẦN KHAI (Settings → Variables and Secrets):
 *   FIREBASE_DB_URL   https://<dự-án>-default-rtdb.<vùng>.firebasedatabase.app
 *   FIREBASE_SECRET   Database secret — Worker đọc/ghi vượt qua rules
 *   KY_TOKEN          Chuỗi ngẫu nhiên dài, dùng để ký token tải
 *   GOC_CHO_PHEP      Các địa chỉ web được gọi, ngăn cách bằng dấu phẩy
 *
 * BINDING CẦN KHAI (Settings → Bindings → R2 bucket):
 *   KHO  →  thanhdeptrai-sanpham
 * =============================================================================
 */

// Đường dẫn tải sống bao lâu, tính theo TỪNG SẢN PHẨM.
//
// Hạn này chỉ tính lúc BẮT ĐẦU tải: đã bắt đầu rồi thì chạy tới hết, kể cả tệp
// 2,8 GB mất một tiếng. Nên con số ở đây là "khách có bao lâu để bấm", không
// phải "khách có bao lâu để tải xong".
//
// Món nhẹ thì hạn ngắn, vì hạn càng ngắn thì cửa sổ chia sẻ link cho người
// khác càng hẹp. Món nặng phải rộng tay hơn: mạng chậm, khách còn chọn thư
// mục lưu, còn bị hỏi ghi đè...
//
// Khách KHÔNG thấy con số này ở đâu cả — đường dẫn không mang nó ra ngoài.
const PHUT_SONG_THEO_SAN_PHAM = {
  sp1: 5,
  sp2: 5,
  sp3: 5,
  sp6: 20,
  sp7: 60
};
const PHUT_SONG_MAC_DINH = 15;

function phutSong(maSanPham) {
  const phut = PHUT_SONG_THEO_SAN_PHAM[maSanPham];
  return typeof phut === 'number' ? phut : PHUT_SONG_MAC_DINH;
}
const CHU_MA_THIET_BI = /^[A-Za-z0-9_-]{8,64}$/;

export default {
  async fetch(yeuCau, env) {
    const dia = new URL(yeuCau.url);

    if (yeuCau.method === 'OPTIONS') return traLoiOptions(yeuCau, env);
    if (dia.pathname === '/don' && yeuCau.method === 'POST') return donCuaToi(yeuCau, env);
    if (dia.pathname === '/cap-phat' && yeuCau.method === 'POST') return capPhat(yeuCau, env);
    if (dia.pathname === '/tai' && yeuCau.method === 'GET') return rotTep(dia, env);
    if (dia.pathname === '/' || dia.pathname === '/khoe') {
      return new Response('Máy chủ cấp phát đang chạy.', { status: 200 });
    }
    return new Response('Không có đường này.', { status: 404 });
  }
};

/* ------------------------------------------------------------------- CORS */

// Chỉ nhận lời gọi từ đúng những địa chỉ chủ shop khai. Bỏ trống là không cho
// ai cả — thà chết câm còn hơn mở toang cho mọi trang trên đời gọi vào.
function gocDuocPhep(yeuCau, env) {
  const goc = yeuCau.headers.get('Origin') || '';
  const danhSach = String(env.GOC_CHO_PHEP || '').split(',')
    .map(function (g) { return g.trim(); })
    .filter(Boolean);
  return danhSach.indexOf(goc) !== -1 ? goc : '';
}

function muCORS(yeuCau, env) {
  const goc = gocDuocPhep(yeuCau, env);
  if (!goc) return {};
  return {
    'Access-Control-Allow-Origin': goc,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function traLoiOptions(yeuCau, env) {
  return new Response(null, { status: 204, headers: muCORS(yeuCau, env) });
}

function traJSON(duLieu, yeuCau, env, ma) {
  return new Response(JSON.stringify(duLieu), {
    status: ma || 200,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, muCORS(yeuCau, env))
  });
}

function tuChoi(lyDo, yeuCau, env) {
  return traJSON({ duoc: false, lyDo: lyDo }, yeuCau, env);
}

/* --------------------------------------------------------------- FIREBASE */

function duongDanDB(env, duong, thamSo) {
  const goc = String(env.FIREBASE_DB_URL || '').replace(/\/+$/, '');
  return goc + '/' + duong + '.json?auth=' + encodeURIComponent(env.FIREBASE_SECRET) +
    (thamSo ? '&' + thamSo : '');
}

async function docDB(env, duong, thamSo) {
  const tra = await fetch(duongDanDB(env, duong, thamSo));
  if (!tra.ok) throw new Error('Firebase trả mã ' + tra.status);
  return await tra.json();
}

async function ghiDB(env, duong, duLieu) {
  const tra = await fetch(duongDanDB(env, duong), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(duLieu)
  });
  if (!tra.ok) throw new Error('Firebase từ chối ghi, mã ' + tra.status);
}

/* ----------------------------------------------------------------- KÝ TÊN */

function sangBase64Url(bytes) {
  let chuoi = '';
  const mang = new Uint8Array(bytes);
  for (let i = 0; i < mang.length; i++) chuoi += String.fromCharCode(mang[i]);
  return btoa(chuoi).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tuBase64Url(chuoi) {
  const day = String(chuoi).replace(/-/g, '+').replace(/_/g, '/');
  const bu = day + '==='.slice((day.length + 3) % 4);
  const raw = atob(bu);
  const mang = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) mang[i] = raw.charCodeAt(i);
  return mang;
}

async function khoaKy(env) {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(env.KY_TOKEN || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function taoToken(env, than) {
  const chu = JSON.stringify(than);
  const phanThan = sangBase64Url(new TextEncoder().encode(chu));
  const chuKy = await crypto.subtle.sign('HMAC', await khoaKy(env), new TextEncoder().encode(phanThan));
  return phanThan + '.' + sangBase64Url(chuKy);
}

// Trả về thân token nếu chữ ký đúng và còn hạn, ngược lại trả null.
//
// crypto.subtle.verify so sánh theo kiểu không lộ thời gian, nên không ai dò
// được chữ ký đúng bằng cách đo xem lời từ chối đến nhanh hay chậm.
async function moToken(env, token) {
  const phan = String(token || '').split('.');
  if (phan.length !== 2) return null;
  let dung;
  try {
    dung = await crypto.subtle.verify('HMAC', await khoaKy(env),
      tuBase64Url(phan[1]), new TextEncoder().encode(phan[0]));
  } catch (e) {
    return null;
  }
  if (!dung) return null;
  let than;
  try {
    than = JSON.parse(new TextDecoder().decode(tuBase64Url(phan[0])));
  } catch (e) {
    return null;
  }
  if (!than || typeof than.h !== 'number' || Date.now() > than.h) return null;
  return than;
}

/* ------------------------------------------------------------ ĐƠN CỦA TÔI */
//
// Khách KHÔNG được phép đọc nhánh donhang (rules chặn), vì đọc được là thấy
// email và số điện thoại của mọi khách khác. Nhưng trang nhận hàng cần biết họ
// đã mua món nào để làm mờ những món chưa mua. Worker trả lời hộ, và chỉ trả
// đúng một thứ: danh sách mã sản phẩm.
//
// ĐÂY CHỈ LÀ LỚP GIAO DIỆN CHO DỄ NHÌN. Người sửa lời đáp này trong trình duyệt
// vẫn không tải được gì — cửa thật nằm ở /cap-phat.

async function donCuaToi(yeuCau, env) {
  if (!gocDuocPhep(yeuCau, env)) {
    return new Response('Không nhận lời gọi từ địa chỉ này.', { status: 403 });
  }
  let than;
  try {
    than = await yeuCau.json();
  } catch (e) {
    return tuChoi('yeu-cau-hong', yeuCau, env);
  }
  const maNhanHang = String(than && than.ma || '').trim();
  if (!maNhanHang) return tuChoi('thieu-ma', yeuCau, env);

  try {
    const don = await timDon(env, maNhanHang);
    if (!don) return tuChoi('sai-ma', yeuCau, env);
    if (!Array.isArray(don.maSanPham)) return tuChoi('don-hong', yeuCau, env);
    return traJSON({ duoc: true, maSanPham: don.maSanPham }, yeuCau, env);
  } catch (e) {
    console.error('Lỗi khi tra đơn:', e && e.message);
    return tuChoi('may-chu-tu-choi', yeuCau, env);
  }
}

/** Tìm đơn theo mã nhận hàng. Trả về đơn, hoặc null nếu không có. */
async function timDon(env, maNhanHang) {
  const ketQua = await docDB(env, 'donhang',
    'orderBy=' + encodeURIComponent('"maNhanHang"') +
    '&equalTo=' + encodeURIComponent('"' + maNhanHang + '"') + '&limitToFirst=1');
  const khoa = ketQua ? Object.keys(ketQua) : [];
  return khoa.length ? ketQua[khoa[0]] : null;
}

/* ------------------------------------------------------------- CẤP PHÁT */

async function capPhat(yeuCau, env) {
  if (!gocDuocPhep(yeuCau, env)) {
    return new Response('Không nhận lời gọi từ địa chỉ này.', { status: 403 });
  }

  let than;
  try {
    than = await yeuCau.json();
  } catch (e) {
    return tuChoi('yeu-cau-hong', yeuCau, env);
  }

  const maNhanHang = String(than && than.ma || '').trim();
  const maSanPham = String(than && than.sanPham || '').trim();
  const tep = String(than && than.tep || '').trim();
  const thietBi = String(than && than.thietBi || '').trim();

  if (!maNhanHang) return tuChoi('thieu-ma', yeuCau, env);
  if (!maSanPham || !tep) return tuChoi('yeu-cau-hong', yeuCau, env);
  if (!CHU_MA_THIET_BI.test(thietBi)) return tuChoi('thieu-thiet-bi', yeuCau, env);

  try {
    // 1) Mã này có phải mã của một đơn thật không?
    const don = await timDon(env, maNhanHang);
    if (!don) return tuChoi('sai-ma', yeuCau, env);

    // 2) Sản phẩm này có nằm trong đơn của họ không? Đây là chỗ chặn khách mua
    //    một món rồi lấy đường dẫn của mình đi tải món khác.
    //
    //    maSanPham BẮT BUỘC là danh sách. Nếu nó là một chuỗi thì indexOf hoá
    //    ra tìm chuỗi con: đơn ghi "sp30" sẽ cho qua cả "sp3". Đơn do web ghi
    //    luôn là danh sách; đơn gõ tay trong Console thì rất dễ thành chuỗi,
    //    nên chặn hẳn ở đây thay vì để nó âm thầm cho qua.
    if (!Array.isArray(don.maSanPham)) return tuChoi('don-hong', yeuCau, env);
    if (don.maSanPham.indexOf(maSanPham) === -1) {
      return tuChoi('khong-co-trong-don', yeuCau, env);
    }

    // 3) Tệp này có đúng là tệp của sản phẩm đó không? Danh mục là nguồn sự
    //    thật; khách tự gõ tên tệp khác thì không qua được cửa này.
    const dm = await docDB(env, 'danhmuc/' + maSanPham);
    if (!dm || dm.nguon !== 'r2' || !dm.file || !dm.file.length) {
      return tuChoi('chua-khai', yeuCau, env);
    }
    const hopLe = dm.file.some(function (f) { return f && f.tep === tep; });
    if (!hopLe) return tuChoi('yeu-cau-hong', yeuCau, env);

    // 4) Khoá thiết bị — theo TỪNG SẢN PHẨM, không theo từng tệp. Khách mở khoá
    //    một sản phẩm trên máy nào thì tải hết các tệp của nó trên máy đó.
    const duongThietBi = 'thietbi/' + maNhanHang + '/' + maSanPham;
    const daGhi = await docDB(env, duongThietBi);
    if (daGhi && daGhi.thietBi && daGhi.thietBi !== thietBi) {
      return tuChoi('da-dung-thiet-bi-khac', yeuCau, env);
    }
    if (!daGhi || !daGhi.thietBi) {
      await ghiDB(env, duongThietBi, {
        thietBi: thietBi,
        moLuc: Date.now(),
        maDon: don.maDon || ''
      });
    }

    // 5) Xong cửa. Cấp một đường dẫn có hạn, gắn với đúng thiết bị này. Hạn dài
    //    ngắn tuỳ sản phẩm (xem PHUT_SONG_THEO_SAN_PHAM ở đầu tệp).
    const token = await taoToken(env, {
      t: tep,
      d: thietBi,
      h: Date.now() + phutSong(maSanPham) * 60 * 1000
    });
    const dia = new URL(yeuCau.url);
    return traJSON({
      duoc: true,
      duongDan: dia.origin + '/tai?t=' + encodeURIComponent(token)
    }, yeuCau, env);

  } catch (e) {
    // Không nói cho khách biết máy chủ hỏng ở đâu — chỉ ghi lại cho chủ shop.
    console.error('Lỗi khi cấp phát:', e && e.message);
    return tuChoi('may-chu-tu-choi', yeuCau, env);
  }
}

/* ----------------------------------------------------------------- RÓT TỆP */

async function rotTep(dia, env) {
  const than = await moToken(env, dia.searchParams.get('t'));
  if (!than) {
    return new Response('Đường dẫn đã hết hạn hoặc không hợp lệ. Quay lại trang nhận sản phẩm và bấm lại.',
      { status: 403 });
  }

  const doiTuong = await env.KHO.get(than.t);
  if (!doiTuong) return new Response('Không tìm thấy tệp trong kho.', { status: 404 });

  const mu = new Headers();
  doiTuong.writeHttpMetadata(mu);
  mu.set('etag', doiTuong.httpEtag);
  // Trình duyệt tải xuống chứ không mở trong tab, và mang tên tệp gọn gàng.
  mu.set('Content-Disposition', 'attachment; filename="' + tenTepGon(than.t) + '"');
  // Đường dẫn có hạn nên không được để proxy nào cache lại.
  mu.set('Cache-Control', 'private, no-store');
  return new Response(doiTuong.body, { headers: mu });
}

function tenTepGon(duong) {
  const phan = String(duong).split('/');
  return phan[phan.length - 1].replace(/["\\]/g, '');
}
