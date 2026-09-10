/**
 * =============================================================================
 *  GỬI HÀNG TỰ ĐỘNG — Shop Thànhđẹptrai.vn
 *  Chạy trên Google Apps Script, hoàn toàn miễn phí, không cần gói Blaze.
 * =============================================================================
 *
 *  NÓ LÀM GÌ
 *  Cứ mỗi phút, tìm trong Realtime Database những đơn có trangThai = 'daXacNhan'
 *  (khách đã bấm "Đã thanh toán"), rồi:
 *    · Có email  → gửi thư kèm đường tải từng sản phẩm, đánh dấu 'daGui'.
 *    · Không email → báo cho chủ shop gửi tay qua Zalo, đánh dấu 'canXemTay'.
 *  Đơn nào cũng gửi kèm một thư báo cho chủ shop để còn đối soát tiền.
 *
 *  KHÔNG CÓ BÍ MẬT NÀO TRONG TỆP NÀY.
 *  Khoá cơ sở dữ liệu và các đường tải sản phẩm nằm trong Script Properties
 *  (Project Settings → Script Properties), không nằm trong mã. Nhờ vậy tệp này
 *  đưa lên GitHub được mà không lộ gì.
 *
 *  QUAN TRỌNG — HÃY ĐỌC:
 *  Script này gửi hàng khi KHÁCH TỰ BẤM "đã thanh toán", chứ KHÔNG kiểm tra
 *  tiền đã thật sự về tài khoản hay chưa. Nó tự động hoá khâu GỬI, không tự
 *  động hoá khâu ĐỐI SOÁT. Chủ shop vẫn phải mở app ngân hàng đối chiếu.
 *  Muốn tự động cả khâu đối soát thì phải nối thêm cổng thanh toán — xem
 *  hàm doPost() ở cuối tệp, chỗ đó đã chừa sẵn.
 * =============================================================================
 */

/* --------------------------------------------------------------- CẤU HÌNH */

// Tên sản phẩm hiện trong thư gửi khách. Mã phải khớp với SAN_PHAM trong
// src/js/app/01-foundation.js của website.
var TEN_SAN_PHAM = {
  sp1: 'App Lightroom cho điện thoại Android — bản quyền trọn đời',
  sp2: 'Bộ Preset 10.000 màu cao cấp cho Lightroom điện thoại',
  sp3: 'Bộ Preset 650 màu cao cấp cho Lightroom và Photoshop máy tính',
  sp4: 'Bộ Khoá học Lightroom điện thoại',
  sp5: 'Bộ Khoá học Lightroom máy tính',
  sp6: 'Phần mềm Lightroom Classic cho máy tính Windows — bản quyền trọn đời',
  sp7: 'Phần mềm Photoshop cho máy tính Windows — bản quyền trọn đời',
  sp8: 'Kho tài nguyên thiết kế (1000+ ảnh RAW, Mockup, PSD)',
  sp9: '1000+ font chữ Việt hoá cao cấp cho máy tính'
};

var SO_DON_MOI_LAN = 25;      // xử lý tối đa bấy nhiêu đơn mỗi lượt chạy
var LINK_NHAN_HANG = 'https://thanhdeptrai.vn/sanpham';
var TEN_SHOP = 'Shop Thànhđẹptrai.vn';
var WEB_SHOP = 'thanhdeptrai.vn';
var EMAIL_LIEN_HE = '219thanhdeptrai@gmail.com';

// SỐ ZALO CỦA SHOP KHÔNG NẰM Ở ĐÂY. Nó đọc từ nhánh 'thongtinlienhe' của
// Realtime Database lúc chạy — cùng một chỗ mà trang quản trị sửa, nên đổi số
// ở /admin là thư gửi khách đổi theo ngay, không phải dán lại script này. Đây
// cũng là lý do không có số điện thoại nào viết chết trong toàn bộ mã nguồn.

// Bảng ký tự sinh mã nhận hàng — đúng bảng của mã đơn, đã bỏ 0 O 1 I L để khách
// đọc lại trong email không phân vân số 0 hay chữ O.
var CHU_MA_NHAN_HANG = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
var DAI_MA_NHAN_HANG = 16;

/**
 * Mỗi khách MỘT đường dẫn riêng.
 *
 * Đây là điểm mấu chốt của cả khâu giao hàng: email KHÔNG còn chứa đường tải
 * file nữa. Trước đây thư liệt kê thẳng link tải từng món — ai chuyển tiếp lá
 * thư đó đi là mất hàng, và shop không cách nào biết. Nay thư chỉ chứa một
 * đường dẫn riêng của khách; máy chủ cấp phát mới là nơi giữ đường tải thật, và
 * nó ghi nhớ thiết bị đầu tiên bấm tải.
 *
 * 16 ký tự trên bảng 30 chữ — đoán mò là chuyện không thể.
 */
function sinhMaNhanHang() {
  var ma = '';
  for (var i = 0; i < DAI_MA_NHAN_HANG; i++) {
    ma += CHU_MA_NHAN_HANG.charAt(Math.floor(Math.random() * CHU_MA_NHAN_HANG.length));
  }
  return ma;
}

/** Đường dẫn nhận hàng của riêng một đơn. */
function linkNhanHangCuaDon(don) {
  return LINK_NHAN_HANG + '?ma=' + (don.maNhanHang || '');
}

/** Đọc một thiết lập bắt buộc. Thiếu thì dừng ngay với lời nhắc rõ ràng. */
function docThietLap(ten) {
  var giaTri = PropertiesService.getScriptProperties().getProperty(ten);
  if (!giaTri) {
    throw new Error('Thiếu Script Property "' + ten + '". Vào Project Settings → Script Properties để thêm.');
  }
  return giaTri;
}

/**
 * Danh mục sản phẩm, đọc từ Firebase.
 *
 * Script này KHÔNG còn giữ đường tải nào. Trước đây có một Script Property tên
 * LINK_TAI chứa bảng "mã sản phẩm → đường tải", và thư gửi khách in thẳng những
 * đường đó ra: ai chuyển tiếp lá thư đi là mất hàng. Nay thư chỉ mang đường dẫn
 * riêng của khách; đường tải thật do máy chủ cấp phát giữ. Hàm này chỉ dùng để
 * KIỂM TRA xem chủ shop đã khai đủ danh mục ở trang /admin chưa.
 */
/** Đọc thông tin liên hệ của shop. Hỏng thì trả về rỗng, thư vẫn gửi được. */
function docLienHe() {
  try {
    var traLoi = goiFirebase('thongtinlienhe');
    if (traLoi.getResponseCode() !== 200) return {};
    return JSON.parse(traLoi.getContentText()) || {};
  } catch (loi) {
    return {};
  }
}

/**
 * Dựng đường dẫn zalo.me từ một số điện thoại.
 *
 * Zalo chỉ nhận số dạng quốc tế không dấu cộng: 84xxxxxxxxx. Nên:
 *   0912345678   → 84912345678
 *   84912345678  → giữ nguyên
 *   +84912345678 → bỏ dấu cộng
 *
 * Số không bắt đầu bằng 0, 84 hay +84 thì TRẢ VỀ RỖNG — bên gọi sẽ ẩn luôn
 * đường dẫn đi. Dựng bừa một đường dẫn hỏng còn tệ hơn không có: bấm vào nó
 * Zalo báo lỗi, và người bấm tưởng khách đã chặn mình.
 */
function linkZalo(so) {
  var s = String(so || '').replace(/[^\d+]/g, '');
  if (s.indexOf('+84') === 0) s = s.slice(1);
  else if (s.indexOf('84') === 0) { /* đã đúng dạng */ }
  else if (s.indexOf('0') === 0) s = '84' + s.slice(1);
  else return '';
  // Số Việt Nam ở dạng 84xxxxxxxxx dài 11 hoặc 12 chữ số. Ngoài khoảng đó là
  // số gõ sai, đừng dựng đường dẫn.
  if (!/^84\d{8,10}$/.test(s)) return '';
  return 'https://zalo.me/' + s;
}

function docDanhMuc() {
  var traLoi = goiFirebase('danhmuc');
  if (traLoi.getResponseCode() !== 200) return {};
  try {
    return JSON.parse(traLoi.getContentText()) || {};
  } catch (e) {
    return {};
  }
}

/** Sản phẩm nào chưa có hàng để giao. Hai khoá học không tính — chúng học trên web. */
function sanPhamThieuHang() {
  var dm = docDanhMuc();
  return Object.keys(TEN_SAN_PHAM).filter(function (m) {
    if (m === 'sp4' || m === 'sp5') return false;
    var d = dm[m];
    if (!d) return true;
    if (d.nguon === 'drive') return !d.link;
    return !(d.file && d.file.length);
  });
}

/* ------------------------------------------------- NÓI CHUYỆN VỚI FIREBASE */

function duongDanDB(duong, thamSo) {
  var url = docThietLap('FIREBASE_DB_URL').replace(/\/+$/, '') +
    '/' + duong + '.json?auth=' + encodeURIComponent(docThietLap('FIREBASE_SECRET'));
  return thamSo ? url + '&' + thamSo : url;
}

/**
 * Gọi Firebase, và KHÔNG BAO GIỜ để địa chỉ lọt vào lời báo lỗi.
 *
 * Địa chỉ có mang ?auth=<khoá cơ sở dữ liệu>. Khi UrlFetchApp ném lỗi, lời
 * ném của nó chứa nguyên địa chỉ — mà Google lại gửi lời ném đó vào thư "script
 * failed" của anh. Khoá đọc-ghi toàn bộ cơ sở dữ liệu đi vào hộp thư như vậy là
 * chuyện đã xảy ra thật. Nên mọi cú gọi đều đi qua đây, và lỗi được viết lại.
 *
 * Tiện thể thử lại vài lần: "Address unavailable" là lỗi mạng chốc lát của phía
 * Google, một nhịp nghỉ là qua. Không thử lại thì cả lượt chạy hỏng, đơn của
 * khách nằm chờ tới phút sau.
 */
function goiFirebase(duong, thamSo, tuyChon) {
  var opts = tuyChon || {};
  opts.muteHttpExceptions = true;
  var loiCuoi = '';
  for (var lan = 1; lan <= 3; lan++) {
    try {
      return UrlFetchApp.fetch(duongDanDB(duong, thamSo), opts);
    } catch (loi) {
      // Cắt sạch địa chỉ khỏi lời báo — nó mang khoá.
      loiCuoi = String(loi && loi.message || loi).split('http')[0].trim() || 'lỗi mạng';
      if (lan < 3) Utilities.sleep(1500 * lan);
    }
  }
  throw new Error('Không gọi được Firebase sau 3 lần thử (' + loiCuoi + '). ' +
    'Thường là mạng phía Google chập chờn; lượt chạy sau sẽ tự làm lại.');
}

/** Lấy danh sách đơn đang chờ gửi. Lọc ngay tại Firebase nên luôn nhẹ. */
function layDonChoGui() {
  var traLoi = goiFirebase('donhang',
    'orderBy=' + encodeURIComponent('"trangThai"') +
    '&equalTo=' + encodeURIComponent('"daXacNhan"') +
    '&limitToFirst=' + SO_DON_MOI_LAN);
  if (traLoi.getResponseCode() !== 200) {
    throw new Error('Firebase trả về mã ' + traLoi.getResponseCode() + ': ' + traLoi.getContentText().slice(0, 300));
  }
  var du = JSON.parse(traLoi.getContentText());
  if (!du) return [];
  return Object.keys(du).map(function (ma) {
    var don = du[ma];
    don.__ma = ma;
    return don;
  });
}

/** Ghi đè vài trường của một đơn. */
function capNhatDon(maDon, thayDoi) {
  var traLoi = goiFirebase('donhang/' + maDon, '', {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(thayDoi)
  });
  if (traLoi.getResponseCode() !== 200) {
    throw new Error('Không cập nhật được đơn ' + maDon + ': ' + traLoi.getContentText().slice(0, 200));
  }
}

/* ------------------------------------------------------------ SOẠN NỘI DUNG */

/**
 * Bọc thân thư trong một tài liệu HTML có KHAI BÁO BẢNG MÃ rõ ràng.
 * Thiếu dòng meta này, một số ứng dụng thư (Gmail trên Android hay gặp nhất)
 * tự đoán bảng mã và đoán trúng Latin-1, làm "Đã gửi" hiện thành "Ä Ă£ gá»­i".
 */
function bocThu(than) {
  return '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body>' + than + '</body></html>';
}

/**
 * Gửi thư. Dùng GmailApp thay cho MailApp vì GmailApp khai bảng mã UTF-8 cho cả
 * TIÊU ĐỀ lẫn thân thư; MailApp có lúc để trống phần đó và chữ có dấu vỡ hết.
 */
function guiThu(nguoiNhan, tieuDe, thanHtml, tuyChon) {
  var opts = { htmlBody: bocThu(thanHtml), charset: 'UTF-8' };
  if (tuyChon) {
    Object.keys(tuyChon).forEach(function (k) { opts[k] = tuyChon[k]; });
  }
  GmailApp.sendEmail(nguoiNhan, tieuDe, thanHtml.replace(/<[^>]+>/g, ' '), opts);
}

function thoatHtml(chu) {
  return String(chu == null ? '' : chu)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function dinhDangTien(so) {
  return Number(so || 0).toLocaleString('vi-VN') + ' đ';
}

/**
 * Dựng thư giao hàng. Trả về { tieuDe, html, thieu } — thieu là danh sách mã
 * sản phẩm chưa khai đường tải, để còn báo cho chủ shop biết mà bổ sung.
 */
function soanThuGiaoHang(don) {
  var ma = don.maSanPham || [];
  var link = linkNhanHangCuaDon(don);
  var dong = ma.map(function (m) {
    return '<li style="margin:0 0 8px"><b>' + thoatHtml(TEN_SAN_PHAM[m] || m) + '</b></li>';
  }).join('');

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:620px">' +
      '<h2 style="margin:0 0 6px;color:#1473e6">Cảm ơn bạn đã mua hàng!</h2>' +
      '<p style="margin:0 0 18px;color:#555">Đơn hàng của bạn đã sẵn sàng. Đây là những sản phẩm bạn đã chọn:</p>' +
      '<ul style="padding-left:20px;margin:0 0 18px">' + dong + '</ul>' +
      '<div style="padding:16px 18px;background:#f4f7fb;border-left:3px solid #1473e6;border-radius:6px;margin:0 0 18px">' +
        '<div style="margin:0 0 12px"><b>Trang nhận sản phẩm của riêng bạn:</b></div>' +
        '<div style="margin:0 0 12px"><a href="' + thoatHtml(link) + '" ' +
          'style="display:inline-block;padding:12px 20px;background:#2d9d5f;color:#fff;' +
          'border-radius:8px;text-decoration:none;font-weight:bold">Mở trang nhận sản phẩm</a></div>' +
        '<div style="color:#666;font-size:13px;word-break:break-all">' + thoatHtml(link) + '</div>' +
      '</div>' +
      '<p style="margin:0 0 18px;padding:12px 14px;background:#fff6e6;border-left:3px solid #b45309;' +
        'border-radius:6px;color:#7a4a06">Vào trang đó, bấm đúng sản phẩm bạn đã mua là tải về được ngay, ' +
        '<b>không phải nhập mã nào cả</b>. Xin đừng chia sẻ đường dẫn này cho người khác — ' +
        '<b>mỗi sản phẩm chỉ tải được trên MỘT thiết bị</b>, nên hãy mở nó trên đúng chiếc máy bạn sẽ dùng.</p>' +
      '<div style="padding:12px 14px;background:#f7f7f7;border-radius:6px;margin:0 0 18px">' +
        '<div>Số tiền đã thanh toán: <b>' + dinhDangTien(don.thanhTien) + '</b></div>' +
        '<div style="color:#666;font-size:13px">Mã đơn hàng: ' + thoatHtml(don.__ma) + '</div>' +
      '</div>' +
      '<p style="margin:0 0 16px"><b>Cần hỗ trợ cài đặt?</b> Cứ nhắn cho shop, shop hướng dẫn tận nơi.</p>' +
      veKhoiLienHe() +
      '<p style="margin:0;color:#888;font-size:13px">' + thoatHtml(TEN_SHOP) + '</p>' +
    '</div>';

  return { tieuDe: 'Đơn hàng của bạn tại ' + TEN_SHOP + ' đã sẵn sàng', html: html, thieu: [] };
}

/**
 * Mẩu tin nhắn soạn sẵn để chủ shop CHÉP THẲNG rồi dán vào Zalo.
 * Khách không để lại email thì phải nhắn tay — có sẵn mẩu này thì việc nhắn chỉ
 * còn là chép và dán, không phải gõ lại từng chữ mỗi đơn.
 */
/**
 * Khối liên hệ ở cuối thư gửi khách.
 *
 * Số zalo đọc từ Realtime Database chứ không viết chết ở đây. Không đọc được
 * (mất mạng, Firebase từ chối) thì bỏ hẳn dòng zalo đi — in ra một dòng trống
 * hay một đường dẫn hỏng thì khách bấm vào và nghĩ shop bỏ mặc mình.
 */
function veKhoiLienHe() {
  var lienHe = docLienHe();
  var zalo = String(lienHe.zalo || '').trim();
  var duongZalo = linkZalo(zalo);

  var dongZalo = '';
  if (zalo) {
    dongZalo = '<div>Số zalo: <b>' + thoatHtml(zalo) + '</b>' +
      (duongZalo ? ' — <a href="' + thoatHtml(duongZalo) + '" style="color:#1473e6">' +
        thoatHtml(duongZalo) + '</a>' : '') +
      '</div>';
  }

  return '<div style="padding:14px 16px;background:#f4f7fb;border-radius:6px;margin:0 0 18px;' +
      'font-size:14px;line-height:1.8">' +
      '<div style="margin:0 0 6px"><b>Liên hệ với shop</b></div>' +
      '<div>Website: <a href="https://' + thoatHtml(WEB_SHOP) + '" style="color:#1473e6">' +
        thoatHtml(WEB_SHOP) + '</a></div>' +
      '<div>Email: <a href="mailto:' + thoatHtml(EMAIL_LIEN_HE) + '" style="color:#1473e6">' +
        thoatHtml(EMAIL_LIEN_HE) + '</a></div>' +
      dongZalo +
    '</div>';
}

function soanTinZalo(don) {
  var ten = (don.maSanPham || []).map(function (m) { return '· ' + (TEN_SAN_PHAM[m] || m); }).join('\n');
  var than = '' +
    'Chào bạn, shop đã nhận được thanh toán đơn ' + (don.maDon || don.__ma) + '.\n' +
    'Sản phẩm bạn đã mua:\n' + ten + '\n' +
    'Đây là đường dẫn nhận sản phẩm của riêng bạn:\n' +
    linkNhanHangCuaDon(don) + '\n' +
    'Bấm vào đó, chọn đúng sản phẩm bạn đã mua là tải về được ngay, không phải ' +
    'nhập mã nào cả.\n' +
    'Xin đừng chia sẻ đường dẫn này cho người khác — mỗi sản phẩm chỉ tải được ' +
    'trên MỘT thiết bị (một trình duyệt), nên hãy mở nó trên đúng chiếc máy bạn sẽ dùng.\n' +
    'Cần hỗ trợ cài đặt cứ nhắn cho shop nhé. Cảm ơn bạn đã tin tưởng!';

  // NHÂN ĐÔI MỌI DẤU XUỐNG DÒNG, và đây không phải chuyện thẩm mỹ.
  //
  // Chép một đoạn nhiều dòng rồi dán vào ô soạn tin của Zalo, rất nhiều thiết
  // bị nuốt mất dấu xuống dòng đơn và biến nó thành dấu cách — mẩu tin dính
  // thành một khối chữ dài, khách đọc không ra đâu là đường dẫn. Xuống dòng đôi
  // thì dù có bị nuốt một cái vẫn còn một cái, mẩu tin giữ được hình dạng.
  //
  // Viết thân tin bằng \n đơn rồi nhân đôi ở đúng một chỗ này, thay vì rải \n\n
  // khắp nơi — sửa câu chữ về sau không phải nhớ quy ước.
  return than.replace(/\n/g, '\n\n');
}

/**
 * Mẩu tin SMS — đường lui khi khách không để lại cả email lẫn Zalo.
 *
 * Nhà mạng tính tiền theo từng 160 ký tự, VÀ chỉ đếm được 160 khi toàn bộ tin
 * là ASCII. Một chữ có dấu tiếng Việt là cả tin rớt xuống bảng mã Unicode và
 * hạn mức tụt còn 70 ký tự — tức là cùng một nội dung bỗng tốn gấp ba lần tiền
 * và rất dễ bị cắt cụt mất đường dẫn. Nên mẩu này viết KHÔNG DẤU, và ngắn hết
 * mức có thể: chỉ còn lời cảm ơn, đường dẫn, và lời dặn đừng chia sẻ.
 */
function soanTinSMS(don) {
  return 'Thanhdeptrai.vn cam on ban! Link san pham rieng: ' +
    linkNhanHangCuaDon(don) + ' Xin dung chia se cho ai.';
}

function soanThuBaoShop(don, ketQua) {
  var ma = (don.maSanPham || []).join(', ');
  var soZalo = String(don.zalo || '').trim();
  var duongZalo = linkZalo(soZalo);
  var soNhan = soZalo || String(don.dienThoai || '').trim();

  // Dòng Zalo mang luôn đường dẫn bấm được. Chủ shop nhìn thư trên điện thoại
  // là bấm thẳng vào cuộc trò chuyện với khách, không phải mở Zalo rồi gõ số
  // đi tìm. Số gõ sai (không bắt đầu bằng 0, 84 hay +84) thì linkZalo trả về
  // rỗng và đường dẫn tự ẩn — bấm vào một đường dẫn hỏng còn tệ hơn không có.
  var oZalo = soZalo
    ? thoatHtml(soZalo) +
      (duongZalo
        ? ' — <a href="' + thoatHtml(duongZalo) + '" style="color:#1473e6">' + thoatHtml(duongZalo) + '</a>'
        : ' <span style="color:#b45309">(số này không dựng được đường dẫn Zalo)</span>')
    : '<i>không có</i>';

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#222">' +
      '<h3 style="margin:0 0 10px">' + thoatHtml(ketQua) + '</h3>' +
      '<table cellpadding="6" style="border-collapse:collapse">' +
        '<tr><td><b>Nội dung CK</b></td><td><b>' + thoatHtml(don.noiDungCK) + '</b></td></tr>' +
        '<tr><td><b>Mã đơn</b></td><td>' + thoatHtml(don.__ma) + '</td></tr>' +
        '<tr><td><b>Số tiền</b></td><td>' + dinhDangTien(don.thanhTien) + '</td></tr>' +
        '<tr><td><b>Email</b></td><td>' + (thoatHtml(don.email) || '<i>không có</i>') + '</td></tr>' +
        '<tr><td><b>Zalo</b></td><td>' + oZalo + '</td></tr>' +
        '<tr><td><b>Điện thoại</b></td><td>' + (thoatHtml(don.dienThoai) || '<i>không có</i>') + '</td></tr>' +
        '<tr><td><b>Sản phẩm</b></td><td>' + thoatHtml(ma) + '</td></tr>' +
      '</table>' +

      // Lời dặn này từng ghi "script chỉ biết khách đã bấm nút, không biết tiền
      // đã về". Từ khi nối app Checkout thì câu đó sai: script gửi hàng CHÍNH VÌ
      // tiền đã về. Nhưng vẫn phải soát tay, vì có hai đường vào cùng dẫn tới
      // đây — báo có từ ngân hàng, và cú bấm "đã thanh toán" của khách. Đường
      // thứ hai vẫn chưa chứng minh được đồng nào.
      '<div style="margin:14px 0 0;padding:12px 14px;background:#fff6e6;border-left:3px solid #b45309;' +
        'border-radius:6px;color:#7a4a06">' +
        '<b>Đã gửi đường dẫn sản phẩm cho khách.</b> Soát lại tài khoản một lượt cho chắc: ' +
        'đơn có thể tới đây vì ngân hàng báo có, mà cũng có thể chỉ vì khách tự bấm ' +
        '“đã thanh toán”. Vào <a href="https://' + thoatHtml(WEB_SHOP) + '/admin" ' +
        'style="color:#1473e6">' + thoatHtml(WEB_SHOP) + '/admin</a> mục <b>Đơn hàng</b> ' +
        'để xem lại đơn này và trạng thái của nó.' +
      '</div>' +

      // Hai mẩu tin LUÔN có mặt, kể cả khi khách đã có email: khách chưa thấy
      // email, khách hỏi lại, khách muốn được nhắn cho chắc — lúc nào chủ shop
      // cũng chỉ việc bôi đen rồi chép, không phải ngồi gõ lại.
      '<p style="margin:18px 0 6px"><b>Mẩu tin nhắn Zalo — bôi đen rồi chép:</b>' +
        (soNhan
          ? ' <span style="color:#555">(gửi tới ' + thoatHtml(soNhan) + ')</span>'
          : ' <span style="color:#b45309">(khách không để lại số nào)</span>') +
      '</p>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;padding:12px 14px;background:#f4f7fb;' +
        'border-left:3px solid #1473e6;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;' +
        'line-height:1.7;margin:0">' + thoatHtml(soanTinZalo(don)) + '</pre>' +

      '<p style="margin:18px 0 6px"><b>Mẩu tin SMS — dùng khi khách không có email lẫn Zalo:</b>' +
        ' <span style="color:#555">(viết không dấu cho gọn trong một tin)</span></p>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;padding:12px 14px;background:#f7f7f7;' +
        'border-left:3px solid #888;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;' +
        'line-height:1.7;margin:0">' + thoatHtml(soanTinSMS(don)) + '</pre>' +
    '</div>';
  return html;
}


/* ------------------------------------------------------------ VIỆC CHÍNH */

/**
 * Hàm chạy định kỳ. Đây là hàm cần gắn trigger.
 * Có khoá để hai lượt chạy không bao giờ chồng lên nhau — chồng nhau là khách
 * nhận hai email giống hệt.
 */
function guiHangChoDonDaXacNhan() {
  var khoa = LockService.getScriptLock();
  if (!khoa.tryLock(20000)) {
    Logger.log('Lượt trước còn đang chạy, bỏ qua lượt này.');
    return;
  }

  try {
    var emailShop = docThietLap('EMAIL_SHOP');
    var danhSach = layDonChoGui();
    if (!danhSach.length) return;

    Logger.log('Có ' + danhSach.length + ' đơn chờ gửi.');

    danhSach.forEach(function (don) {
      try {
        // Cấp đường dẫn riêng cho đơn này TRƯỚC khi soạn bất cứ lá thư nào —
        // cả thư cho khách lẫn mẩu tin Zalo cho chủ shop đều cần nó. Đơn đã có
        // mã rồi (lượt chạy trước gửi hỏng giữa chừng) thì giữ nguyên mã cũ,
        // không cấp mã mới: khách có thể đã cầm đường dẫn cũ trong tay.
        if (!don.maNhanHang) {
          don.maNhanHang = sinhMaNhanHang();
          capNhatDon(don.__ma, { maNhanHang: don.maNhanHang });
        }

        // Không có email thì không gửi tự động được — chuyển cho chủ shop.
        if (!don.email) {
          guiThu(emailShop,
            '[Gửi tay] Đơn ' + don.__ma + ' — khách không để lại email',
            soanThuBaoShop(don, 'Khách KHÔNG để lại email. Vui lòng gửi tay qua Zalo hoặc SMS.'));
          capNhatDon(don.__ma, {
            trangThai: 'canXemTay',
            guiLuc: Date.now(),
            ghiChuGui: 'Khách không để lại email, cần gửi tay.'
          });
          return;
        }

        var thu = soanThuGiaoHang(don);
        guiThu(don.email, thu.tieuDe, thu.html, { name: TEN_SHOP, replyTo: emailShop });

        capNhatDon(don.__ma, {
          trangThai: 'daGui',
          guiLuc: Date.now(),
          ghiChuGui: thu.thieu.length
            ? 'Đã gửi email, nhưng thiếu đường tải cho: ' + thu.thieu.join(', ')
            : 'Đã gửi email đầy đủ.'
        });

        guiThu(emailShop,
          (thu.thieu.length ? '[THIẾU LINK] ' : '[Đã gửi] ') + 'Đơn ' + don.__ma,
          soanThuBaoShop(don, thu.thieu.length
            ? 'ĐÃ gửi email cho khách, NHƯNG thiếu đường tải cho: ' + thu.thieu.join(', ')
            : 'Đã gửi email giao hàng cho khách.'));

      } catch (loi) {
        // Một đơn hỏng thì không được kéo cả lượt chạy hỏng theo.
        Logger.log('Lỗi ở đơn ' + don.__ma + ': ' + loi.message);
        try {
          capNhatDon(don.__ma, {
            trangThai: 'canXemTay',
            ghiChuGui: ('Lỗi khi gửi: ' + loi.message).slice(0, 300)
          });
          guiThu(emailShop,
            '[LỖI] Đơn ' + don.__ma + ' chưa gửi được',
            soanThuBaoShop(don, 'LỖI khi gửi: ' + loi.message));
        } catch (loiNua) {
          Logger.log('Không báo được lỗi ra ngoài: ' + loiNua.message);
        }
      }
    });

  } finally {
    khoa.releaseLock();
  }
}

/* --------------------------------------------------------- CHẠY THỬ MỘT LẦN */

/**
 * Bấm Run hàm này để kiểm tra mọi thiết lập đã đúng chưa, TRƯỚC khi gắn trigger.
 * Nó không gửi cho khách nào, chỉ gửi một thư mẫu về hộp thư của chính chủ shop.
 */
function kiemTraThietLap() {
  var emailShop = docThietLap('EMAIL_SHOP');

  // 1) Kết nối được Firebase chưa?
  //
  // KHÔNG dùng shallow=true ở đây: Firebase từ chối thẳng khi shallow đi cùng
  // orderBy/limitToFirst ("orderBy not supported for with shallow GET"). Mà bỏ
  // orderBy thì lại không giới hạn được số đơn tải về. Nên đọc đúng một đơn
  // theo khoá — nhẹ như nhau mà không đụng luật của Firebase.
  var traLoi = goiFirebase('donhang', 'orderBy=%22%24key%22&limitToFirst=1');
  var noiFirebase = traLoi.getResponseCode() === 200;
  var noiDung = 'Firebase trả mã ' + traLoi.getResponseCode();
  if (!noiFirebase) {
    noiDung += ' — ' + traLoi.getContentText().slice(0, 200);
  }

  // 2) Sản phẩm nào chưa có hàng để giao?
  var thieu = sanPhamThieuHang();

  // 3) Còn gửi được bao nhiêu email hôm nay?
  var conLai = MailApp.getRemainingDailyQuota();

  var don = {
    __ma: 'DON-THU-NGHIEM',
    thanhTien: 199000,
    noiDungCK: 'lr thu nghiem',
    email: emailShop,
    zalo: '',
    dienThoai: '',
    maSanPham: Object.keys(TEN_SAN_PHAM).slice(0, 3),
    maNhanHang: sinhMaNhanHang()
  };
  var thu = soanThuGiaoHang(don);

  // Tiêu đề thư phải nói ngay đạt hay hỏng. Thư mẫu bên dưới lúc nào cũng đẹp,
  // nên nếu chỉ ghi kết quả bằng một dòng nhỏ giữa thư thì người đọc lướt qua
  // và tưởng mọi thứ đã xong — chuyện đã xảy ra thật.
  var tieuDe = noiFirebase
      ? '[Ki\u1ec3m tra] \u0110\u1ea0T \u2014 thi\u1ebft l\u1eadp g\u1eedi h\u00e0ng t\u1ef1 \u0111\u1ed9ng'
      : '[Ki\u1ec3m tra] H\u1eceNG \u2014 ch\u01b0a n\u1ed1i \u0111\u01b0\u1ee3c Firebase';

  guiThu(emailShop, tieuDe,
      '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">' +
        (noiFirebase ? '' :
          '<div style="background:#ffe9e7;border:2px solid #e5534b;border-radius:8px;padding:14px;margin-bottom:16px">' +
            '<b style="color:#b3261e;font-size:16px">CH\u01afA N\u1ed0I \u0110\u01af\u1ee2C FIREBASE</b><br>' +
            'Thi\u1ebft l\u1eadp ch\u01b0a d\u00f9ng \u0111\u01b0\u1ee3c. Th\u01b0 m\u1eabu b\u00ean d\u01b0\u1edbi ch\u1ec9 l\u00e0 v\u00ed d\u1ee5 \u2014 ' +
            'kh\u00e1ch s\u1ebd KH\u00d4NG nh\u1eadn \u0111\u01b0\u1ee3c g\u00ec cho t\u1edbi khi s\u1eeda xong.<br>' +
            'M\u00e3 401: sai FIREBASE_SECRET. M\u00e3 404: sai FIREBASE_DB_URL (nh\u1edb k\u00e8m t\u00ean v\u00f9ng).' +
          '</div>') +
        '<h3>Kết quả kiểm tra</h3>' +
        '<ul>' +
          '<li>' + thoatHtml(noiDung) + '</li>' +
          '<li>Số email còn gửi được hôm nay: <b>' + conLai + '</b></li>' +
          '<li>' + (thieu.length
            ? 'CHƯA khai danh mục ở trang /admin cho: <b>' + thoatHtml(thieu.join(', ')) + '</b>'
            : 'Đã khai đủ danh mục cho mọi sản phẩm có hàng.') + '</li>' +
        '</ul>' +
        '<hr><h3>Thư mẫu mà khách sẽ nhận</h3>' + thu.html +
      '</div>');

  Logger.log(noiDung + ' | còn ' + conLai + ' email | thiếu danh mục: ' + (thieu.join(', ') || 'không'));
}

/* ------------------------------------------- NHẬN BÁO CÓ TỪ APP CHECKOUT */

/**
 * TỪ ĐÂY VIỆC GỬI HÀNG CĂN THEO TIỀN ĐÃ VỀ, KHÔNG PHẢI THEO CÚ BẤM CỦA KHÁCH.
 *
 * App Checkout nằm trên điện thoại Android, đọc SMS và thông báo của app ngân
 * hàng, lọc lấy những cái có chứa từ khoá "LR" rồi gọi sang đây bằng GET với
 * ba tham số:
 *
 *     message  — nguyên văn tin nhắn ngân hàng
 *     type     — 'sms' hoặc 'notification'
 *     source   — tên ngân hàng gửi thông báo
 *
 * KHÔNG CÓ TRƯỜNG SỐ TIỀN. Số tiền nằm lẫn trong câu tiếng Việt của ngân hàng
 * và phải tự bóc ra — đây là chỗ dễ sai nhất trong cả hệ thống, xem bocTienTuTinNhan.
 *
 * BỐN ĐIỀU PHẢI GIỮ, MẤT MỘT LÀ MẤT HÀNG HOẶC MẤT TIỀN:
 *
 * 1. ĐỊA CHỈ NÀY AI GỌI CŨNG ĐƯỢC. Web App của Apps Script không hạn chế được
 *    người gọi. Nên mỗi cú gọi phải mang mật khẩu (Script Property WEBHOOK_KEY);
 *    sai là từ chối thẳng. Thiếu lớp này thì ai đoán ra địa chỉ cũng tự đánh dấu
 *    đơn của mình là đã trả tiền.
 *
 * 2. SỐ TIỀN PHẢI ĐỦ. Khớp mã đơn thôi chưa đủ — người ta chuyển 1.000đ với
 *    đúng nội dung là lấy được cả gói.
 *
 * 3. KHÔNG CHẮC THÌ KHÔNG GIAO. Bóc không ra số tiền, hay bóc ra mà không chắc
 *    đó là tiền vào chứ không phải số dư, thì chuyển đơn sang 'canXemTay' và
 *    báo chủ shop. Thà chậm một lúc còn hơn giao nhầm.
 *
 * 4. MỘT GIAO DỊCH CHỈ TÍNH MỘT LẦN. App này đọc CẢ SMS lẫn thông báo, nên
 *    cùng một lần chuyển tiền rất hay tới đây hai lượt. Đơn đã ở trạng thái
 *    'daGui' thì bỏ qua, đừng gửi lá thư thứ hai cho khách.
 */

/** Bỏ dấu tiếng Việt, để so khớp "Số dư" và "So du" như nhau. */
function boDau(chu) {
  return String(chu || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

/** Rút mã đơn ra khỏi nội dung chuyển khoản ngân hàng gửi về. */
function docMaDonTrongNoiDung(chu) {
  // Ngân hàng viết hoa, bỏ dấu, và RẤT HAY nuốt dấu cách hoặc chèn thêm chữ.
  // Nên không so khớp nguyên chuỗi, chỉ đi tìm "LR" rồi 6 ký tự của bảng mã.
  var s = boDau(chu).toUpperCase();
  var khop = s.match(/LR\s*([23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6})/);
  return khop ? khop[1] : '';
}

/**
 * Bóc SỐ TIỀN VÀO ra khỏi một câu thông báo ngân hàng.
 *
 * ĐÂY LÀ HÀM DỄ LÀM MẤT HÀNG NHẤT. Một tin nhắn ngân hàng luôn có ÍT NHẤT HAI
 * con số tiền:
 *
 *     NGANHANG: TK xxxx...|PS:+99.000VND|SD: 1.234.567VND|ND: LR WNAT7M
 *                             ^^^^^^^ tiền vào        ^^^^^^^^^ SỐ DƯ
 *
 * Bắt nhầm số dư thì đơn nào cũng "đủ tiền" và cả kho hàng đi theo. Nên:
 *
 *   · Bỏ mọi con số đứng ngay sau "SD", "So du", "Balance", "Số dư", và cả
 *     "SD KHA DUNG" — Ngân hàng của shop báo BA con số tiền chứ không phải hai:
 *
 *       PS:+1.000.000VND  SD: 1.044.353VND  SD KHA DUNG: 1.044.353VND
 *              tiền vào         số dư            số dư khả dụng
 *
 *     Bỏ sót con thứ ba là hỏng đúng lúc nguy hiểm nhất: khi CHÍNH ANH chuyển
 *     tiền đi, số phát sinh mang dấu trừ nên bị loại, số dư bị loại, và số dư
 *     khả dụng còn lại một mình — script sẽ tưởng đó là tiền khách vừa trả.
 *   · Bỏ mọi con số mang dấu trừ — đó là tiền RA khỏi tài khoản.
 *   · Ưu tiên tuyệt đối con số mang dấu cộng.
 *   · Bỏ số dưới 1.000 — đó là ngày giờ, số thứ tự, không phải tiền.
 *   · Còn nhiều hơn một ứng viên mà không cái nào có dấu cộng thì TRẢ VỀ 0,
 *     tức là "không chắc". Bên gọi sẽ không giao hàng. Đoán bừa ở đây là hỏng.
 */
function bocTienTuTinNhan(chu) {
  var s = String(chu || '');
  var khongDau = boDau(s);
  var ungVien = [];

  // Hai dạng đáng tin: số có dấu +/- đứng trước, hoặc số có "VND" đứng sau.
  // Con số trần không dấu không đơn vị thì bỏ qua — nó hay là số tài khoản.
  var mau = /([+\-])?\s*(\d[\d.,]*)\s*(VND|VNĐ|đ|dồng|dong)?/gi;
  var khop;
  while ((khop = mau.exec(khongDau)) !== null) {
    var dau = khop[1] || '';
    var donVi = khop[3] || '';
    if (!dau && !donVi) continue;

    var so = parseInt(String(khop[2]).replace(/[^\d]/g, ''), 10);
    if (isNaN(so) || so < 1000) continue;
    if (dau === '-') continue;

    // Nhìn lui 20 ký tự: nếu đó là chỗ ngân hàng báo SỐ DƯ thì bỏ qua. Phải đủ
    // 20 mới trùm hết được cụm dài nhất là "SD KHA DUNG: ".
    var truoc = khongDau.slice(Math.max(0, khop.index - 20), khop.index).toUpperCase();
    if (/(SO DU|SODU|BALANCE|KHA DUNG|KHADUNG|\bSD\b)[^A-Z0-9]*$/.test(truoc)) continue;

    ungVien.push({ so: so, cong: dau === '+' });
  }

  if (!ungVien.length) return 0;
  var cong = ungVien.filter(function (u) { return u.cong; });
  if (cong.length) return cong[0].so;
  if (ungVien.length === 1) return ungVien[0].so;
  return 0;   // nhiều ứng viên, không cái nào chắc — nói thẳng là không biết
}

/** Tìm đơn theo mã đơn ngắn in trong nội dung chuyển khoản. */
function timDonTheoMaDon(maDon) {
  var traLoi = goiFirebase('donhang',
    'orderBy=' + encodeURIComponent('"maDon"') +
    '&equalTo=' + encodeURIComponent('"' + maDon + '"') +
    '&limitToFirst=5');
  if (traLoi.getResponseCode() !== 200) {
    throw new Error('Firebase trả về mã ' + traLoi.getResponseCode() + ' khi tìm đơn ' + maDon);
  }
  var du = JSON.parse(traLoi.getContentText());
  if (!du) return null;
  var khoa = Object.keys(du);
  if (!khoa.length) return null;
  var don = du[khoa[0]];
  don.__ma = khoa[0];
  return don;
}

/**
 * App Checkout gọi bằng GET. Giữ luôn doPost để phòng khi app đổi cách gọi,
 * hoặc sau này anh đổi sang cổng khác — cả hai cửa cùng đi vào một lõi.
 */
function doGet(e) { return xuLyBaoCo(e); }
function doPost(e) { return xuLyBaoCo(e); }

function xuLyBaoCo(e) {
  var ghi = function (chu) { Logger.log('[bao-co] ' + chu); };
  try {
    var thamSo = (e && e.parameter) || {};

    // 1) Mật khẩu.
    var matKhau = PropertiesService.getScriptProperties().getProperty('WEBHOOK_KEY');
    if (!matKhau) {
      ghi('Chưa khai WEBHOOK_KEY — từ chối tất cả cho tới khi khai.');
      return traLoiJSON({ ok: false, vi: 'chua-khai-khoa' });
    }
    // Vài app nối tham số bằng dấu "?" thay vì "&", làm khoá dính luôn phần
    // sau nó. Cắt ra thay vì từ chối oan — người dùng sẽ không bao giờ đoán
    // được vì sao "khoá đúng mà vẫn báo sai".
    var khoaGui = String(thamSo.key || thamSo.k || '').split('?')[0].split('&')[0];
    if (!khoaGui) {
      var than = (e && e.postData && e.postData.contents) || '';
      try { khoaGui = String((JSON.parse(than) || {}).key || ''); } catch (loi) { khoaGui = ''; }
    }
    if (khoaGui !== String(matKhau)) {
      ghi('Sai mật khẩu, bỏ qua.');
      return traLoiJSON({ ok: false, vi: 'sai-khoa' });
    }

    // 2) Lấy nội dung. App Checkout đặt tên trường là 'message'; các cổng khác
    //    dùng tên khác nên nhận luôn vài tên thường gặp.
    var noiDung = String(thamSo.message || thamSo.content || thamSo.noiDung || thamSo.description || '');
    var nguon = String(thamSo.source || '');
    if (!noiDung && e && e.postData && e.postData.contents) {
      try {
        var goi = JSON.parse(e.postData.contents) || {};
        noiDung = String(goi.message || goi.content || goi.description || '');
      } catch (loi2) { /* không phải JSON thì thôi */ }
    }
    if (!noiDung) {
      ghi('Gọi tới mà không có nội dung nào.');
      return traLoiJSON({ ok: true, vi: 'khong-co-noi-dung' });
    }

    // Chỉ nhận báo có từ đúng ngân hàng của shop, NẾU chủ shop có khai. Không
    // khai thì nhận tất — để anh chạy được ngay mà chưa phải cấu hình gì thêm.
    var nguonCho = PropertiesService.getScriptProperties().getProperty('NGUON_BAO_CO');
    if (nguonCho && nguon && boDau(nguon).toUpperCase().indexOf(boDau(nguonCho).toUpperCase()) === -1) {
      ghi('Bỏ qua báo có từ nguồn lạ: ' + nguon);
      return traLoiJSON({ ok: true, vi: 'nguon-la' });
    }

    ghi('Nhận: [' + nguon + '] ' + noiDung);

    var maDon = docMaDonTrongNoiDung(noiDung);
    if (!maDon) {
      // Thường là tiền của người khác chuyển vào, hoặc khách gõ tay sai nội
      // dung. Báo chủ shop xem, đừng im lặng nuốt mất.
      baoShopBaoCoLa(noiDung, nguon, 0, 'Không tìm thấy mã đơn trong nội dung chuyển khoản.');
      return traLoiJSON({ ok: true, vi: 'khong-co-ma-don' });
    }

    var don = timDonTheoMaDon(maDon);
    if (!don) {
      baoShopBaoCoLa(noiDung, nguon, 0, 'Có mã đơn ' + maDon + ' nhưng không tìm thấy đơn nào mang mã đó.');
      return traLoiJSON({ ok: true, vi: 'khong-co-don' });
    }

    // 3) Đã gửi rồi thì thôi. App đọc CẢ SMS lẫn thông báo nên cùng một lần
    //    chuyển tiền rất hay tới đây hai lượt.
    if (don.trangThai === 'daGui') {
      ghi('Đơn ' + maDon + ' đã gửi từ trước, bỏ qua báo có lặp.');
      return traLoiJSON({ ok: true, vi: 'da-gui-tu-truoc' });
    }

    // 4) Bóc số tiền. Không chắc thì KHÔNG giao.
    var tien = bocTienTuTinNhan(noiDung);
    var canTra = Number(don.thanhTien || 0);
    if (!tien) {
      capNhatDon(don.__ma, { trangThai: 'canXemTay', ghiChuGui: 'Khong boc duoc so tien tu tin nhan ngan hang' });
      baoShopBaoCoLa(noiDung, nguon, 0,
        'Đơn ' + maDon + ': không chắc chắn bóc đúng số tiền từ tin nhắn ngân hàng, nên KHÔNG gửi hàng. ' +
        'Bạn tự đối chiếu rồi bấm gửi tay ở trang quản trị.');
      return traLoiJSON({ ok: true, vi: 'khong-boc-duoc-tien' });
    }
    if (tien < canTra) {
      capNhatDon(don.__ma, { trangThai: 'canXemTay', ghiChuGui: 'Bao co thieu tien: nhan ' + tien + ' / can ' + canTra });
      baoShopBaoCoLa(noiDung, nguon, tien,
        'Đơn ' + maDon + ' nhận thiếu tiền: ' + dinhDangTien(tien) + ' trong khi cần ' +
        dinhDangTien(canTra) + '. Đã chuyển sang "cần xem tay", CHƯA gửi hàng.');
      return traLoiJSON({ ok: true, vi: 'thieu-tien' });
    }

    // 5) Đủ tiền. Đánh dấu rồi gửi ngay, không đợi lượt quét định kỳ.
    capNhatDon(don.__ma, { trangThai: 'daXacNhan', daXacNhan: true, xacNhanLuc: Date.now() });
    ghi('Đơn ' + maDon + ' đủ tiền (' + tien + '), gửi hàng ngay.');
    guiHangChoDonDaXacNhan();
    return traLoiJSON({ ok: true, vi: 'da-gui', maDon: maDon, tien: tien });

  } catch (loi) {
    ghi('Lỗi: ' + loi.message);
    try {
      guiThu(docThietLap('EMAIL_SHOP'), '[Báo có] Có giao dịch xử lý hỏng',
        '<p>Script nhận được một báo có nhưng xử lý hỏng:</p><p><b>' + thoatHtml(loi.message) + '</b></p>' +
        '<p>Đơn của khách có thể đang nằm chờ. Vào trang quản trị mục Đơn hàng để xem.</p>');
    } catch (loi2) { /* hộp thư đầy hay hết hạn mức — đã ghi log ở trên rồi */ }
    return traLoiJSON({ ok: false, vi: 'loi' });
  }
}

function traLoiJSON(du) {
  return ContentService.createTextOutput(JSON.stringify(du))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Báo chủ shop một khoản tiền vào mà script không tự xử được. */
function baoShopBaoCoLa(noiDung, nguon, tien, vi) {
  Logger.log('[bao-co] ' + vi);
  guiThu(docThietLap('EMAIL_SHOP'), '[Báo có] Cần bạn xem tay',
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">' +
      '<p>' + thoatHtml(vi) + '</p>' +
      '<ul>' +
        '<li>Ngân hàng: <b>' + thoatHtml(nguon || '(không rõ)') + '</b></li>' +
        '<li>Số tiền script đọc được: <b>' + thoatHtml(tien ? dinhDangTien(tien) : 'không đọc được') + '</b></li>' +
      '</ul>' +
      '<p>Nguyên văn tin nhắn ngân hàng:</p>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;padding:12px 14px;background:#f4f7fb;' +
        'border-left:3px solid #1473e6;border-radius:6px;font-size:13px;margin:0">' +
        thoatHtml(noiDung) + '</pre>' +
      '<p>Không có hàng nào được gửi cho khoản này.</p>' +
    '</div>');
}

/**
 * Bấm Run hàm này để thử trọn luồng báo có mà KHÔNG cần chuyển tiền thật.
 * Sửa hai dòng đầu cho khớp một đơn đang chờ của anh rồi chạy.
 */
function kiemTraBaoCo() {
  var MA_DON_THU = 'WNAT7M';   // mã đơn ngắn, đọc ở trang quản trị mục Đơn hàng
  var SO_TIEN_THU = 99000;     // số tiền của đơn đó

  // Đúng định dạng thật ngân hàng của shop gửi, kể cả cụm "SD KHA DUNG" hay bẫy người viết mã.
  var tin = '(NGANHANG): 09/09/26;21:23 TK: xxxx0000000 PS:+' + SO_TIEN_THU + 'VND ' +
    'SD: 9.999.999VND SD KHA DUNG: 9.999.999VND ND: LR ' + MA_DON_THU + ' SO GD: 000TEST000';
  var gia = {
    parameter: {
      key: PropertiesService.getScriptProperties().getProperty('WEBHOOK_KEY'),
      message: tin,
      type: 'sms',
      source: 'NGANHANG'
    }
  };
  Logger.log('Tin thử: ' + tin);
  Logger.log('Số tiền bóc được: ' + bocTienTuTinNhan(tin));
  Logger.log('Kết quả: ' + doGet(gia).getContent());
}
