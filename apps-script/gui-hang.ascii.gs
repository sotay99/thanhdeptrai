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
  sp1: 'App Lightroom cho \u0111i\u1ec7n tho\u1ea1i Android \u2014 b\u1ea3n quy\u1ec1n tr\u1ecdn \u0111\u1eddi',
  sp2: 'B\u1ed9 Preset 10.000 m\u00e0u cao c\u1ea5p cho Lightroom \u0111i\u1ec7n tho\u1ea1i',
  sp3: 'B\u1ed9 Preset 650 m\u00e0u cao c\u1ea5p cho Lightroom v\u00e0 Photoshop m\u00e1y t\u00ednh',
  sp4: 'B\u1ed9 Kho\u00e1 h\u1ecdc Lightroom \u0111i\u1ec7n tho\u1ea1i',
  sp5: 'B\u1ed9 Kho\u00e1 h\u1ecdc Lightroom m\u00e1y t\u00ednh',
  sp6: 'Ph\u1ea7n m\u1ec1m Lightroom Classic cho m\u00e1y t\u00ednh Windows \u2014 b\u1ea3n quy\u1ec1n tr\u1ecdn \u0111\u1eddi',
  sp7: 'Ph\u1ea7n m\u1ec1m Photoshop cho m\u00e1y t\u00ednh Windows \u2014 b\u1ea3n quy\u1ec1n tr\u1ecdn \u0111\u1eddi',
  sp8: 'Kho t\u00e0i nguy\u00ean thi\u1ebft k\u1ebf (1000+ \u1ea3nh RAW, Mockup, PSD)',
  sp9: '1000+ font ch\u1eef Vi\u1ec7t ho\u00e1 cao c\u1ea5p cho m\u00e1y t\u00ednh'
};

var SO_DON_MOI_LAN = 25;      // xử lý tối đa bấy nhiêu đơn mỗi lượt chạy
var TEN_SHOP = 'Shop Th\u00e0nh\u0111\u1eb9ptrai.vn';

/** Đọc một thiết lập bắt buộc. Thiếu thì dừng ngay với lời nhắc rõ ràng. */
function docThietLap(ten) {
  var giaTri = PropertiesService.getScriptProperties().getProperty(ten);
  if (!giaTri) {
    throw new Error('Thi\u1ebfu Script Property "' + ten + '". V\u00e0o Project Settings \u2192 Script Properties \u0111\u1ec3 th\u00eam.');
  }
  return giaTri;
}

/** Bảng "mã sản phẩm → đường tải", cất trong Script Property LINK_TAI dạng JSON. */
function bangDuongTai() {
  try {
    return JSON.parse(docThietLap('LINK_TAI'));
  } catch (e) {
    throw new Error('Script Property "LINK_TAI" kh\u00f4ng ph\u1ea3i JSON h\u1ee3p l\u1ec7: ' + e.message);
  }
}

/* ------------------------------------------------- NÓI CHUYỆN VỚI FIREBASE */

function duongDanDB(duong, thamSo) {
  var url = docThietLap('FIREBASE_DB_URL').replace(/\/+$/, '') +
    '/' + duong + '.json?auth=' + encodeURIComponent(docThietLap('FIREBASE_SECRET'));
  return thamSo ? url + '&' + thamSo : url;
}

/** Lấy danh sách đơn đang chờ gửi. Lọc ngay tại Firebase nên luôn nhẹ. */
function layDonChoGui() {
  var url = duongDanDB('donhang',
    'orderBy=' + encodeURIComponent('"trangThai"') +
    '&equalTo=' + encodeURIComponent('"daXacNhan"') +
    '&limitToFirst=' + SO_DON_MOI_LAN);
  var traLoi = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (traLoi.getResponseCode() !== 200) {
    throw new Error('Firebase tr\u1ea3 v\u1ec1 m\u00e3 ' + traLoi.getResponseCode() + ': ' + traLoi.getContentText().slice(0, 300));
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
  var traLoi = UrlFetchApp.fetch(duongDanDB('donhang/' + maDon), {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(thayDoi),
    muteHttpExceptions: true
  });
  if (traLoi.getResponseCode() !== 200) {
    throw new Error('Kh\u00f4ng c\u1eadp nh\u1eadt \u0111\u01b0\u1ee3c \u0111\u01a1n ' + maDon + ': ' + traLoi.getContentText().slice(0, 200));
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
  return Number(so || 0).toLocaleString('vi-VN') + ' \u0111';
}

/**
 * Dựng thư giao hàng. Trả về { tieuDe, html, thieu } — thieu là danh sách mã
 * sản phẩm chưa khai đường tải, để còn báo cho chủ shop biết mà bổ sung.
 */
function soanThuGiaoHang(don) {
  var duongTai = bangDuongTai();
  var ma = don.maSanPham || [];
  var thieu = [];
  var dong = ma.map(function (m) {
    var ten = TEN_SAN_PHAM[m] || m;
    var link = duongTai[m];
    if (!link) {
      thieu.push(m);
      return '<li style="margin:0 0 10px"><b>' + thoatHtml(ten) + '</b><br>' +
        '<span style="color:#b45309">Shop s\u1ebd g\u1eedi ri\u00eang ph\u1ea7n n\u00e0y cho b\u1ea1n trong \u00edt ph\u00fat.</span></li>';
    }
    return '<li style="margin:0 0 10px"><b>' + thoatHtml(ten) + '</b><br>' +
      '<a href="' + thoatHtml(link) + '" style="color:#1473e6">B\u1ea5m v\u00e0o \u0111\u00e2y \u0111\u1ec3 t\u1ea3i</a></li>';
  }).join('');

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:620px">' +
      '<h2 style="margin:0 0 6px;color:#1473e6">C\u1ea3m \u01a1n b\u1ea1n \u0111\u00e3 mua h\u00e0ng!</h2>' +
      '<p style="margin:0 0 18px;color:#555">\u0110\u01a1n h\u00e0ng c\u1ee7a b\u1ea1n \u0111\u00e3 s\u1eb5n s\u00e0ng. D\u01b0\u1edbi \u0111\u00e2y l\u00e0 to\u00e0n b\u1ed9 s\u1ea3n ph\u1ea9m b\u1ea1n \u0111\u00e3 ch\u1ecdn.</p>' +
      '<ul style="padding-left:20px;margin:0 0 18px">' + dong + '</ul>' +
      '<div style="padding:12px 14px;background:#f4f7fb;border-left:3px solid #1473e6;border-radius:6px;margin:0 0 18px">' +
        '<div>S\u1ed1 ti\u1ec1n \u0111\u00e3 thanh to\u00e1n: <b>' + dinhDangTien(don.thanhTien) + '</b></div>' +
        '<div style="color:#666;font-size:13px">M\u00e3 \u0111\u01a1n h\u00e0ng: ' + thoatHtml(don.__ma) + '</div>' +
      '</div>' +
      '<p style="margin:0 0 8px"><b>C\u1ea7n h\u1ed7 tr\u1ee3 c\u00e0i \u0111\u1eb7t?</b> C\u1ee9 nh\u1eafn cho shop, shop h\u01b0\u1edbng d\u1eabn t\u1eadn n\u01a1i.</p>' +
      '<p style="margin:0 0 18px;color:#555">N\u1ebfu kh\u00f4ng h\u00e0i l\u00f2ng, b\u1ea1n \u0111\u01b0\u1ee3c <b>ho\u00e0n ti\u1ec1n 100% trong 15 ng\u00e0y</b> \u0111\u1ea7u s\u1eed d\u1ee5ng.</p>' +
      '<p style="margin:0;color:#888;font-size:13px">' + thoatHtml(TEN_SHOP) + '</p>' +
    '</div>';

  return { tieuDe: '\u0110\u01a1n h\u00e0ng c\u1ee7a b\u1ea1n t\u1ea1i ' + TEN_SHOP + ' \u0111\u00e3 s\u1eb5n s\u00e0ng', html: html, thieu: thieu };
}

function soanThuBaoShop(don, ketQua) {
  var ma = (don.maSanPham || []).join(', ');
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#222">' +
      '<h3 style="margin:0 0 10px">' + thoatHtml(ketQua) + '</h3>' +
      '<table cellpadding="6" style="border-collapse:collapse">' +
        '<tr><td><b>M\u00e3 \u0111\u01a1n</b></td><td>' + thoatHtml(don.__ma) + '</td></tr>' +
        '<tr><td><b>S\u1ed1 ti\u1ec1n</b></td><td>' + dinhDangTien(don.thanhTien) + '</td></tr>' +
        '<tr><td><b>N\u1ed9i dung CK</b></td><td>' + thoatHtml(don.noiDungCK) + '</td></tr>' +
        '<tr><td><b>Email</b></td><td>' + (thoatHtml(don.email) || '<i>kh\u00f4ng c\u00f3</i>') + '</td></tr>' +
        '<tr><td><b>Zalo</b></td><td>' + (thoatHtml(don.zalo) || '<i>kh\u00f4ng c\u00f3</i>') + '</td></tr>' +
        '<tr><td><b>\u0110i\u1ec7n tho\u1ea1i</b></td><td>' + (thoatHtml(don.dienThoai) || '<i>kh\u00f4ng c\u00f3</i>') + '</td></tr>' +
        '<tr><td><b>S\u1ea3n ph\u1ea9m</b></td><td>' + thoatHtml(ma) + '</td></tr>' +
      '</table>' +
      '<p style="margin:14px 0 0;color:#b45309"><b>Nh\u1edb \u0111\u1ed1i chi\u1ebfu ti\u1ec1n \u0111\u00e3 v\u1ec1 t\u00e0i kho\u1ea3n ch\u01b0a.</b> ' +
        'Script ch\u1ec9 bi\u1ebft kh\u00e1ch \u0111\u00e3 b\u1ea5m n\u00fat x\u00e1c nh\u1eadn, kh\u00f4ng bi\u1ebft ti\u1ec1n \u0111\u00e3 v\u1ec1.</p>' +
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
    Logger.log('L\u01b0\u1ee3t tr\u01b0\u1edbc c\u00f2n \u0111ang ch\u1ea1y, b\u1ecf qua l\u01b0\u1ee3t n\u00e0y.');
    return;
  }

  try {
    var emailShop = docThietLap('EMAIL_SHOP');
    var danhSach = layDonChoGui();
    if (!danhSach.length) return;

    Logger.log('C\u00f3 ' + danhSach.length + ' \u0111\u01a1n ch\u1edd g\u1eedi.');

    danhSach.forEach(function (don) {
      try {
        // Không có email thì không gửi tự động được — chuyển cho chủ shop.
        if (!don.email) {
          guiThu(emailShop,
            '[G\u1eedi tay] \u0110\u01a1n ' + don.__ma + ' \u2014 kh\u00e1ch kh\u00f4ng \u0111\u1ec3 l\u1ea1i email',
            soanThuBaoShop(don, 'Kh\u00e1ch KH\u00d4NG \u0111\u1ec3 l\u1ea1i email. Vui l\u00f2ng g\u1eedi tay qua Zalo ho\u1eb7c SMS.'));
          capNhatDon(don.__ma, {
            trangThai: 'canXemTay',
            guiLuc: Date.now(),
            ghiChuGui: 'Kh\u00e1ch kh\u00f4ng \u0111\u1ec3 l\u1ea1i email, c\u1ea7n g\u1eedi tay.'
          });
          return;
        }

        var thu = soanThuGiaoHang(don);
        guiThu(don.email, thu.tieuDe, thu.html, { name: TEN_SHOP, replyTo: emailShop });

        capNhatDon(don.__ma, {
          trangThai: 'daGui',
          guiLuc: Date.now(),
          ghiChuGui: thu.thieu.length
            ? '\u0110\u00e3 g\u1eedi email, nh\u01b0ng thi\u1ebfu \u0111\u01b0\u1eddng t\u1ea3i cho: ' + thu.thieu.join(', ')
            : '\u0110\u00e3 g\u1eedi email \u0111\u1ea7y \u0111\u1ee7.'
        });

        guiThu(emailShop,
          (thu.thieu.length ? '[THI\u1ebeU LINK] ' : '[\u0110\u00e3 g\u1eedi] ') + '\u0110\u01a1n ' + don.__ma,
          soanThuBaoShop(don, thu.thieu.length
            ? '\u0110\u00c3 g\u1eedi email cho kh\u00e1ch, NH\u01afNG thi\u1ebfu \u0111\u01b0\u1eddng t\u1ea3i cho: ' + thu.thieu.join(', ')
            : '\u0110\u00e3 g\u1eedi email giao h\u00e0ng cho kh\u00e1ch.'));

      } catch (loi) {
        // Một đơn hỏng thì không được kéo cả lượt chạy hỏng theo.
        Logger.log('L\u1ed7i \u1edf \u0111\u01a1n ' + don.__ma + ': ' + loi.message);
        try {
          capNhatDon(don.__ma, {
            trangThai: 'canXemTay',
            ghiChuGui: ('L\u1ed7i khi g\u1eedi: ' + loi.message).slice(0, 300)
          });
          guiThu(emailShop,
            '[L\u1ed6I] \u0110\u01a1n ' + don.__ma + ' ch\u01b0a g\u1eedi \u0111\u01b0\u1ee3c',
            soanThuBaoShop(don, 'L\u1ed6I khi g\u1eedi: ' + loi.message));
        } catch (loiNua) {
          Logger.log('Kh\u00f4ng b\u00e1o \u0111\u01b0\u1ee3c l\u1ed7i ra ngo\u00e0i: ' + loiNua.message);
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
  var duongTai = bangDuongTai();

  // 1) Kết nối được Firebase chưa?
  var traLoi = UrlFetchApp.fetch(duongDanDB('donhang', 'shallow=true&limitToFirst=1&orderBy=%22%24key%22'),
    { muteHttpExceptions: true });
  var noiDung = 'Firebase tr\u1ea3 m\u00e3 ' + traLoi.getResponseCode();
  if (traLoi.getResponseCode() !== 200) {
    noiDung += ' \u2014 ' + traLoi.getContentText().slice(0, 200);
  }

  // 2) Sản phẩm nào chưa khai đường tải?
  var thieu = Object.keys(TEN_SAN_PHAM).filter(function (m) { return !duongTai[m]; });

  // 3) Còn gửi được bao nhiêu email hôm nay?
  var conLai = MailApp.getRemainingDailyQuota();

  var don = {
    __ma: 'DON-THU-NGHIEM',
    thanhTien: 199000,
    noiDungCK: 'lr thu nghiem',
    email: emailShop,
    zalo: '',
    dienThoai: '',
    maSanPham: Object.keys(TEN_SAN_PHAM).slice(0, 3)
  };
  var thu = soanThuGiaoHang(don);

  guiThu(emailShop, '[Ki\u1ec3m tra] Thi\u1ebft l\u1eadp g\u1eedi h\u00e0ng t\u1ef1 \u0111\u1ed9ng',
      '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">' +
        '<h3>K\u1ebft qu\u1ea3 ki\u1ec3m tra</h3>' +
        '<ul>' +
          '<li>' + thoatHtml(noiDung) + '</li>' +
          '<li>S\u1ed1 email c\u00f2n g\u1eedi \u0111\u01b0\u1ee3c h\u00f4m nay: <b>' + conLai + '</b></li>' +
          '<li>' + (thieu.length
            ? 'CH\u01afA khai \u0111\u01b0\u1eddng t\u1ea3i cho: <b>' + thoatHtml(thieu.join(', ')) + '</b>'
            : '\u0110\u00e3 khai \u0111\u1ee7 \u0111\u01b0\u1eddng t\u1ea3i cho c\u1ea3 ' + Object.keys(TEN_SAN_PHAM).length + ' s\u1ea3n ph\u1ea9m.') + '</li>' +
        '</ul>' +
        '<hr><h3>Th\u01b0 m\u1eabu m\u00e0 kh\u00e1ch s\u1ebd nh\u1eadn</h3>' + thu.html +
      '</div>');

  Logger.log(noiDung + ' | c\u00f2n ' + conLai + ' email | thi\u1ebfu link: ' + (thieu.join(', ') || 'kh\u00f4ng'));
}

/* ------------------------------------------------- CHỖ CHỪA CHO CỔNG THANH TOÁN */

/**
 * Khi nào anh nối cổng thanh toán (PayOS, Casso, SePay…), triển khai script này
 * thành Web App rồi trỏ webhook của họ vào đây. Lúc đó việc gửi hàng mới thật sự
 * căn theo TIỀN ĐÃ VỀ chứ không phải theo cú bấm của khách.
 *
 * Hiện tại hàm chỉ nhận và ghi log, CHƯA gửi hàng — cố ý để trống cho tới khi
 * anh chọn xong cổng và biết chính xác họ gửi dữ liệu dạng nào.
 */
function doPost(e) {
  try {
    Logger.log('Nh\u1eadn webhook: ' + (e && e.postData ? e.postData.contents : '(r\u1ed7ng)'));
    // TODO: đọc nội dung chuyển khoản, tìm đơn khớp trong /donhang, đổi trạng
    // thái sang 'daXacNhan' rồi gọi guiHangChoDonDaXacNhan().
  } catch (loi) {
    Logger.log('L\u1ed7i webhook: ' + loi.message);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
