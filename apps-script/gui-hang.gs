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
      '<p style="margin:0 0 8px"><b>Cần hỗ trợ cài đặt?</b> Cứ nhắn cho shop, shop hướng dẫn tận nơi.</p>' +
      '<p style="margin:0 0 18px;color:#555">Nếu không hài lòng, bạn được <b>hoàn tiền 100% trong 15 ngày</b> đầu sử dụng.</p>' +
      '<p style="margin:0;color:#888;font-size:13px">' + thoatHtml(TEN_SHOP) + '</p>' +
    '</div>';

  return { tieuDe: 'Đơn hàng của bạn tại ' + TEN_SHOP + ' đã sẵn sàng', html: html, thieu: [] };
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
    linkNhanHangCuaDon(don) + '\n\n' +
    'Bấm vào đó, chọn đúng sản phẩm bạn đã mua là tải về được ngay, không phải ' +
    'nhập mã nào cả.\n\n' +
    'Xin đừng chia sẻ đường dẫn này cho người khác — mỗi sản phẩm chỉ tải được ' +
    'trên MỘT thiết bị, nên hãy mở nó trên đúng chiếc máy bạn sẽ dùng.\n\n' +
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

/* ------------------------------------------- NHẬN BÁO CÓ TỪ CỔNG THANH TOÁN */

/**
 * TỪ ĐÂY VIỆC GỬI HÀNG CĂN THEO TIỀN ĐÃ VỀ, KHÔNG PHẢI THEO CÚ BẤM CỦA KHÁCH.
 *
 * App Checkout trên điện thoại đọc thông báo biến động số dư của ngân hàng rồi
 * đẩy sang đây. Nhận được là script tìm đơn khớp, đánh dấu đã trả tiền, và gọi
 * luôn khâu gửi hàng — nên khách nhận được sản phẩm ngay cả lúc chủ shop đang
 * ngủ.
 *
 * BA ĐIỀU PHẢI GIỮ, MẤT MỘT LÀ HỎNG:
 *
 * 1. ĐỊA CHỈ NÀY AI GỌI CŨNG ĐƯỢC. Web App của Apps Script không có cách nào
 *    hạn chế người gọi. Nên phải có mật khẩu riêng (Script Property WEBHOOK_KEY)
 *    đi kèm mỗi cú gọi; sai mật khẩu là từ chối thẳng. Thiếu lớp này thì bất kỳ
 *    ai đoán ra địa chỉ đều tự đánh dấu đơn của mình là đã trả tiền.
 *
 * 2. SỐ TIỀN PHẢI ĐỦ. Khớp mã đơn thôi chưa đủ — người ta chuyển 1.000đ với
 *    đúng nội dung là lấy được cả gói. Thiếu tiền thì chuyển đơn sang cần xem
 *    tay, không gửi hàng.
 *
 * 3. MỘT GIAO DỊCH CHỈ TÍNH MỘT LẦN. Cổng nào cũng có lúc gửi lại cùng một báo
 *    có (mất mạng giữa chừng, app thử lại). Đơn đã ở trạng thái đã gửi thì bỏ
 *    qua, đừng gửi lá thư thứ hai cho khách.
 */

/** Rút mã đơn ra khỏi nội dung chuyển khoản ngân hàng gửi về. */
function docMaDonTrongNoiDung(chu) {
  // Ngân hàng viết hoa, bỏ dấu, và RẤT HAY nuốt dấu cách hoặc chèn thêm chữ.
  // Nên không so khớp nguyên chuỗi, chỉ đi tìm "LR" rồi 6 ký tự của bảng mã.
  var s = String(chu || '').toUpperCase();
  var khop = s.match(/LR\s*([23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6})/);
  return khop ? khop[1] : '';
}

/**
 * Moi số tiền và nội dung ra khỏi gói dữ liệu cổng gửi tới.
 *
 * Mỗi cổng đặt tên trường một kiểu và còn đổi theo phiên bản, nên thay vì đoán
 * đúng một tên, hàm này lục mọi tên thường gặp — kể cả khi chúng nằm lồng trong
 * một nhánh con. Cổng nào đổi tên trường thì thêm một chữ vào danh sách là xong,
 * không phải viết lại gì.
 */
function bocBaoCo(du) {
  var TEN_TIEN = ['amount', 'transferAmount', 'creditAmount', 'money', 'soTien', 'value', 'amountIn'];
  var TEN_NOI_DUNG = ['description', 'content', 'noiDung', 'transferContent', 'comment', 'message', 'detail', 'body'];
  var TEN_MA_GD = ['id', 'transactionId', 'tid', 'referenceCode', 'reference', 'maGiaoDich', 'transactionID'];

  var ra = { tien: 0, noiDung: '', maGD: '' };

  function lucQua(o, sau) {
    if (!o || typeof o !== 'object' || sau > 4) return;
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (v && typeof v === 'object') { lucQua(v, sau + 1); return; }
      var kt = k.toLowerCase();
      if (!ra.tien && TEN_TIEN.some(function (t) { return t.toLowerCase() === kt; })) {
        // "1.500.000" hay "1,500,000" đều phải ra 1500000.
        var so = parseInt(String(v).replace(/[^\d]/g, ''), 10);
        if (!isNaN(so)) ra.tien = so;
      }
      if (!ra.noiDung && TEN_NOI_DUNG.some(function (t) { return t.toLowerCase() === kt; })) {
        ra.noiDung = String(v == null ? '' : v);
      }
      if (!ra.maGD && TEN_MA_GD.some(function (t) { return t.toLowerCase() === kt; })) {
        ra.maGD = String(v == null ? '' : v);
      }
    });
  }
  lucQua(du, 0);
  return ra;
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
 * Cổng thanh toán gọi vào đây. Trả về JSON để phía cổng biết đã nhận.
 *
 * LUÔN trả 200 kèm { ok: ... }: cổng nào cũng coi mã lỗi là "gửi hỏng" và thử
 * lại mãi, làm ngập cả log lẫn hộp thư. Chuyện gì xảy ra thì ghi vào log và báo
 * cho chủ shop, đừng bắt cổng thử lại một việc sẽ hỏng y như cũ.
 */
function doPost(e) {
  var ghi = function (chu) { Logger.log('[webhook] ' + chu); };
  try {
    // 1) Mật khẩu. Chấp nhận cả trong địa chỉ (?key=…) lẫn trong gói dữ liệu,
    //    vì app mỗi hãng cho khai một kiểu.
    var matKhau = PropertiesService.getScriptProperties().getProperty('WEBHOOK_KEY');
    if (!matKhau) {
      ghi('Chưa khai WEBHOOK_KEY — từ chối tất cả cho tới khi khai.');
      return traLoiJSON({ ok: false, vi: 'chua-khai-khoa' });
    }
    var than = (e && e.postData && e.postData.contents) || '';
    var du = {};
    try { du = JSON.parse(than) || {}; } catch (loi) { du = {}; }
    var khoaGui = (e && e.parameter && (e.parameter.key || e.parameter.k)) || du.key || du.secret || '';
    if (String(khoaGui) !== String(matKhau)) {
      ghi('Sai mật khẩu, bỏ qua.');
      return traLoiJSON({ ok: false, vi: 'sai-khoa' });
    }

    // 2) Moi số tiền và nội dung ra khỏi gói dữ liệu.
    var bao = bocBaoCo(du);
    ghi('Báo có: ' + bao.tien + 'đ | ' + bao.noiDung);
    var maDon = docMaDonTrongNoiDung(bao.noiDung);
    if (!maDon) {
      // Không có mã đơn thì đây thường là tiền của người khác chuyển vào, hoặc
      // khách gõ tay sai nội dung. Báo chủ shop xem, đừng im lặng nuốt mất.
      baoShopBaoCoLa(bao, 'Không tìm thấy mã đơn trong nội dung chuyển khoản.');
      return traLoiJSON({ ok: true, vi: 'khong-co-ma-don' });
    }

    var don = timDonTheoMaDon(maDon);
    if (!don) {
      baoShopBaoCoLa(bao, 'Có mã đơn ' + maDon + ' nhưng không tìm thấy đơn nào mang mã đó.');
      return traLoiJSON({ ok: true, vi: 'khong-co-don' });
    }

    // 3) Đã gửi rồi thì thôi. Cổng gửi lại cùng một báo có là chuyện thường.
    if (don.trangThai === 'daGui') {
      ghi('Đơn ' + maDon + ' đã gửi từ trước, bỏ qua báo có lặp.');
      return traLoiJSON({ ok: true, vi: 'da-gui-tu-truoc' });
    }

    // 4) Tiền phải đủ. Khớp mã mà thiếu tiền thì KHÔNG gửi hàng.
    var canTra = Number(don.thanhTien || 0);
    if (bao.tien < canTra) {
      capNhatDon(don.__ma, { trangThai: 'canXemTay', ghiChuGui: 'Bao co thieu tien: nhan ' + bao.tien + ' / can ' + canTra });
      baoShopBaoCoLa(bao, 'Đơn ' + maDon + ' nhận thiếu tiền: ' + dinhDangTien(bao.tien) +
        ' trong khi cần ' + dinhDangTien(canTra) + '. Đã chuyển sang "cần xem tay", CHƯA gửi hàng.');
      return traLoiJSON({ ok: true, vi: 'thieu-tien' });
    }

    // 5) Đủ tiền. Đánh dấu rồi gửi ngay, không đợi lượt quét định kỳ.
    capNhatDon(don.__ma, { trangThai: 'daXacNhan', daXacNhan: true, xacNhanLuc: Date.now() });
    ghi('Đơn ' + maDon + ' đã đủ tiền, gửi hàng ngay.');
    guiHangChoDonDaXacNhan();
    return traLoiJSON({ ok: true, vi: 'da-gui', maDon: maDon });

  } catch (loi) {
    ghi('Lỗi: ' + loi.message);
    try {
      guiThu(docThietLap('EMAIL_SHOP'), '[Cổng thanh toán] Có báo có xử lý hỏng',
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
function baoShopBaoCoLa(bao, vi) {
  Logger.log('[webhook] ' + vi);
  guiThu(docThietLap('EMAIL_SHOP'), '[Cổng thanh toán] Cần bạn xem tay',
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">' +
      '<p>' + thoatHtml(vi) + '</p>' +
      '<ul>' +
        '<li>Số tiền: <b>' + thoatHtml(dinhDangTien(bao.tien)) + '</b></li>' +
        '<li>Nội dung: <b>' + thoatHtml(bao.noiDung || '(trống)') + '</b></li>' +
      '</ul>' +
      '<p>Không có hàng nào được gửi cho khoản này.</p>' +
    '</div>');
}

/**
 * Bấm Run hàm này để thử luồng cổng thanh toán mà KHÔNG cần chuyển tiền thật.
 * Sửa hai dòng đầu cho khớp một đơn đang chờ của anh rồi chạy.
 */
function kiemTraCongThanhToan() {
  var MA_DON_THU = 'WNAT7M';   // mã đơn ngắn, đọc ở trang quản trị mục Đơn hàng
  var SO_TIEN_THU = 99000;     // số tiền khách chuyển

  var gia = {
    postData: { contents: JSON.stringify({
      amount: SO_TIEN_THU,
      description: 'CHUYEN TIEN LR ' + MA_DON_THU,
      id: 'THU-' + Date.now()
    }) },
    parameter: { key: PropertiesService.getScriptProperties().getProperty('WEBHOOK_KEY') }
  };
  Logger.log(doPost(gia).getContent());
}
