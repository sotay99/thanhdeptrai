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
// Đường dẫn khách vào để nhận sản phẩm. Khi trang /sanpham xong và có mã kích
// hoạt riêng cho từng đơn, chỗ này sẽ thành LINK_NHAN_HANG + '?k=' + mã.
var LINK_NHAN_HANG = 'https://thanhdeptrai.vn/sanpham';
var TEN_SHOP = 'Shop Thànhđẹptrai.vn';

/** Đọc một thiết lập bắt buộc. Thiếu thì dừng ngay với lời nhắc rõ ràng. */
function docThietLap(ten) {
  var giaTri = PropertiesService.getScriptProperties().getProperty(ten);
  if (!giaTri) {
    throw new Error('Thiếu Script Property "' + ten + '". Vào Project Settings → Script Properties để thêm.');
  }
  return giaTri;
}

/** Bảng "mã sản phẩm → đường tải", cất trong Script Property LINK_TAI dạng JSON. */
function bangDuongTai() {
  try {
    return JSON.parse(docThietLap('LINK_TAI'));
  } catch (e) {
    throw new Error('Script Property "LINK_TAI" không phải JSON hợp lệ: ' + e.message);
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
  var traLoi = UrlFetchApp.fetch(duongDanDB('donhang/' + maDon), {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(thayDoi),
    muteHttpExceptions: true
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
  var duongTai = bangDuongTai();
  var ma = don.maSanPham || [];
  var thieu = [];
  var dong = ma.map(function (m) {
    var ten = TEN_SAN_PHAM[m] || m;
    var link = duongTai[m];
    if (!link) {
      thieu.push(m);
      return '<li style="margin:0 0 10px"><b>' + thoatHtml(ten) + '</b><br>' +
        '<span style="color:#b45309">Shop sẽ gửi riêng phần này cho bạn trong ít phút.</span></li>';
    }
    return '<li style="margin:0 0 10px"><b>' + thoatHtml(ten) + '</b><br>' +
      '<a href="' + thoatHtml(link) + '" style="color:#1473e6">Bấm vào đây để tải</a></li>';
  }).join('');

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:620px">' +
      '<h2 style="margin:0 0 6px;color:#1473e6">Cảm ơn bạn đã mua hàng!</h2>' +
      '<p style="margin:0 0 18px;color:#555">Đơn hàng của bạn đã sẵn sàng. Dưới đây là toàn bộ sản phẩm bạn đã chọn.</p>' +
      '<ul style="padding-left:20px;margin:0 0 18px">' + dong + '</ul>' +
      '<div style="padding:12px 14px;background:#f4f7fb;border-left:3px solid #1473e6;border-radius:6px;margin:0 0 18px">' +
        '<div>Số tiền đã thanh toán: <b>' + dinhDangTien(don.thanhTien) + '</b></div>' +
        '<div style="color:#666;font-size:13px">Mã đơn hàng: ' + thoatHtml(don.__ma) + '</div>' +
      '</div>' +
      '<p style="margin:0 0 8px"><b>Cần hỗ trợ cài đặt?</b> Cứ nhắn cho shop, shop hướng dẫn tận nơi.</p>' +
      '<p style="margin:0 0 18px;color:#555">Nếu không hài lòng, bạn được <b>hoàn tiền 100% trong 15 ngày</b> đầu sử dụng.</p>' +
      '<p style="margin:0;color:#888;font-size:13px">' + thoatHtml(TEN_SHOP) + '</p>' +
    '</div>';

  return { tieuDe: 'Đơn hàng của bạn tại ' + TEN_SHOP + ' đã sẵn sàng', html: html, thieu: thieu };
}

/**
 * Mẩu tin nhắn soạn sẵn để chủ shop CHÉP THẲNG rồi dán vào Zalo.
 * Khách không để lại email thì phải nhắn tay — có sẵn mẩu này thì việc nhắn chỉ
 * còn là chép và dán, không phải gõ lại từng chữ mỗi đơn.
 */
function soanTinZalo(don) {
  var ten = (don.maSanPham || []).map(function (m) { return '· ' + (TEN_SAN_PHAM[m] || m); }).join('\n');
  return '' +
    'Chào bạn, shop đã nhận được thanh toán đơn ' + (don.maDon || don.__ma) + '.\n\n' +
    'Sản phẩm bạn đã mua:\n' + ten + '\n\n' +
    'Đây là đường dẫn nhận sản phẩm của riêng bạn:\n' +
    LINK_NHAN_HANG + '\n\n' +
    'Xin đừng chia sẻ đường dẫn này cho người khác — mỗi đường dẫn chỉ dùng được ' +
    'trên một thiết bị.\n\n' +
    'Cần hỗ trợ cài đặt cứ nhắn cho shop nhé. Cảm ơn bạn đã tin tưởng!';
}

function soanThuBaoShop(don, ketQua) {
  var ma = (don.maSanPham || []).join(', ');
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#222">' +
      '<h3 style="margin:0 0 10px">' + thoatHtml(ketQua) + '</h3>' +
      '<table cellpadding="6" style="border-collapse:collapse">' +
        '<tr><td><b>Nội dung CK</b></td><td><b>' + thoatHtml(don.noiDungCK) + '</b></td></tr>' +
        '<tr><td><b>Mã đơn</b></td><td>' + thoatHtml(don.__ma) + '</td></tr>' +
        '<tr><td><b>Số tiền</b></td><td>' + dinhDangTien(don.thanhTien) + '</td></tr>' +
        '<tr><td><b>Email</b></td><td>' + (thoatHtml(don.email) || '<i>không có</i>') + '</td></tr>' +
        '<tr><td><b>Zalo</b></td><td>' + (thoatHtml(don.zalo) || '<i>không có</i>') + '</td></tr>' +
        '<tr><td><b>Điện thoại</b></td><td>' + (thoatHtml(don.dienThoai) || '<i>không có</i>') + '</td></tr>' +
        '<tr><td><b>Sản phẩm</b></td><td>' + thoatHtml(ma) + '</td></tr>' +
      '</table>' +
      '<p style="margin:14px 0 0;color:#b45309"><b>Nhớ đối chiếu tiền đã về tài khoản chưa.</b> ' +
        'Script chỉ biết khách đã bấm nút xác nhận, không biết tiền đã về.</p>' +
      // Mẩu tin nhắn Zalo LUÔN có mặt, kể cả khi khách đã có email: khách chưa
      // thấy email, khách hỏi lại, khách muốn được nhắn cho chắc — lúc nào chủ
      // shop cũng chỉ việc bôi đen rồi chép, không phải ngồi gõ lại.
      '<p style="margin:16px 0 6px"><b>Mẩu tin nhắn Zalo — bôi đen rồi chép:</b>' +
        (don.zalo || don.dienThoai
          ? ' <span style="color:#555">(gửi tới ' + thoatHtml(don.zalo || don.dienThoai) + ')</span>'
          : ' <span style="color:#b45309">(khách không để lại số nào)</span>') +
      '</p>' +
      '<pre style="white-space:pre-wrap;word-break:break-word;padding:12px 14px;background:#f4f7fb;' +
        'border-left:3px solid #1473e6;border-radius:6px;font-family:Arial,sans-serif;font-size:13px;' +
        'line-height:1.7;margin:0">' + thoatHtml(soanTinZalo(don)) + '</pre>' +
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
  var duongTai = bangDuongTai();

  // 1) Kết nối được Firebase chưa?
  var traLoi = UrlFetchApp.fetch(duongDanDB('donhang', 'shallow=true&limitToFirst=1&orderBy=%22%24key%22'),
    { muteHttpExceptions: true });
  var noiDung = 'Firebase trả mã ' + traLoi.getResponseCode();
  if (traLoi.getResponseCode() !== 200) {
    noiDung += ' — ' + traLoi.getContentText().slice(0, 200);
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

  guiThu(emailShop, '[Kiểm tra] Thiết lập gửi hàng tự động',
      '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">' +
        '<h3>Kết quả kiểm tra</h3>' +
        '<ul>' +
          '<li>' + thoatHtml(noiDung) + '</li>' +
          '<li>Số email còn gửi được hôm nay: <b>' + conLai + '</b></li>' +
          '<li>' + (thieu.length
            ? 'CHƯA khai đường tải cho: <b>' + thoatHtml(thieu.join(', ')) + '</b>'
            : 'Đã khai đủ đường tải cho cả ' + Object.keys(TEN_SAN_PHAM).length + ' sản phẩm.') + '</li>' +
        '</ul>' +
        '<hr><h3>Thư mẫu mà khách sẽ nhận</h3>' + thu.html +
      '</div>');

  Logger.log(noiDung + ' | còn ' + conLai + ' email | thiếu link: ' + (thieu.join(', ') || 'không'));
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
    Logger.log('Nhận webhook: ' + (e && e.postData ? e.postData.contents : '(rỗng)'));
    // TODO: đọc nội dung chuyển khoản, tìm đơn khớp trong /donhang, đổi trạng
    // thái sang 'daXacNhan' rồi gọi guiHangChoDonDaXacNhan().
  } catch (loi) {
    Logger.log('Lỗi webhook: ' + loi.message);
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
