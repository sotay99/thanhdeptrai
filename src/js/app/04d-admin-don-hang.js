  /* ===========================================================================
     PHẦN 04D — MODULE "ĐƠN HÀNG" TRONG TRANG QUẢN TRỊ

     Đây là chỗ chủ shop nhìn thấy tiền đã về và bấm ra hàng.

     BA VIỆC TRANG NÀY LÀM, KHÔNG LÀM GÌ HƠN:

       1. Xem đơn theo trạng thái. Hàng chờ gửi luôn là một danh sách NGẮN vì
          nó lọc theo 'trangThai' — nhánh này có .indexOn trong Rules nên
          Firebase lọc sẵn ở máy chủ, máy chủ không phải tải cả kho đơn về.

       2. Đổi trạng thái và cấp mã nhận hàng. Mã nhận hàng sinh ở đây dùng
          ĐÚNG bảng chữ và ĐÚNG độ dài của Apps Script (bỏ 0/1/I/L/O để không
          ai đọc nhầm khi chép tay). Hai nơi cùng sinh mã nên phải cùng luật.

       3. Cấp quyền lại khi khách đổi máy. Đây là việc xảy ra thường xuyên:
          mã thiết bị nằm ở localStorage, khách xoá dữ liệu duyệt web, đổi
          trình duyệt hay mở tab ẩn danh là hệ thống coi như máy khác. Trước
          khi có nút này, chủ shop phải vào Firebase Console xoá tay nhánh
          'thietbi/<mã nhận hàng>/<mã sản phẩm>'.

     ĐỌC ĐƠN THEO KHOÁ, KHÔNG THEO 'taoLuc'.
     Khoá do Firebase push() sinh vốn đã xếp theo thời gian, nên
     orderByKey().limitToLast() cho ra đúng những đơn mới nhất mà KHÔNG cần
     thêm chỉ mục nào vào Rules. Sắp theo 'taoLuc' thì phải khai .indexOn mới,
     tức là chủ shop phải dán lại Rules — đổi một dòng mã để bắt người dùng
     làm việc là đổi sai chỗ.

     THÔNG TIN KHÁCH LÀ THỨ NHẠY CẢM.
     Nhánh 'donhang' cấm đọc công khai trong Rules; chỉ hai email chủ shop mới
     đọc được. Đừng bao giờ đem đoạn mã đọc đơn này ra ngoài trang quản trị.
     =========================================================================== */

  // Bao nhiêu đơn tải về mỗi lần. Đủ nhiều để không phải bấm "Tải thêm" suốt
  // ngày, đủ ít để máy tính bảng không ì.
  const SO_DON_MOI_LAN = 60;

  // Giống hệt Apps Script: bỏ 0, 1, I, L, O — những chữ hay bị đọc nhầm.
  const CHU_MA_NHAN_HANG = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const DAI_MA_NHAN_HANG = 16;

  // NĂM trạng thái, và ranh giới quan trọng nhất nằm giữa 'khachBao' và
  // 'daXacNhan': cái trước là LỜI KHAI của khách, cái sau là TIỀN ĐÃ VỀ do ngân
  // hàng báo. Bộ gửi hàng tự động chỉ quét 'daXacNhan'. Gộp hai cái này làm một
  // là ai bấm "đã thanh toán" cũng lấy được hàng miễn phí.
  const TRANG_THAI_DON = {
    'moi':       { ten: 'Mới',         mau: 'xam',  mo: 'Khách bấm thanh toán nhưng chưa nói gì thêm.' },
    'khachBao':  { ten: 'Khách báo đã trả', mau: 'tim',
      mo: 'Khách tự bấm “đã thanh toán”. Đây là lời khai, CHƯA phải tiền đã về — soát tài khoản rồi gửi tay.' },
    'daXacNhan': { ten: 'Chờ gửi',     mau: 'vang', mo: 'Ngân hàng đã báo có đủ tiền. Hệ thống đang gửi hàng.' },
    'daGui':     { ten: 'Đã gửi',      mau: 'xanh', mo: 'Đã gửi đường dẫn nhận hàng cho khách.' },
    'canXemTay': { ten: 'Cần xem tay', mau: 'do',   mo: 'Gửi tự động không xong, phải tự xử lý.' }
  };

  // "Khách báo đã trả" đứng đầu vì đó mới là chỗ cần mắt người: tiền về thì máy
  // tự lo, còn nhóm này là những đơn máy CỐ Ý không đụng tới.
  const BO_LOC_DON = [
    { ma: 'khachBao',  ten: 'Khách báo đã trả' },
    { ma: 'daXacNhan', ten: 'Chờ gửi' },
    { ma: 'moi',       ten: 'Mới' },
    { ma: 'daGui',     ten: 'Đã gửi' },
    { ma: 'canXemTay', ten: 'Cần xem tay' },
    { ma: 'tat-ca',    ten: 'Tất cả' }
  ];

  function trangThaiDon(don){
    const t = String(don && don.trangThai || '');
    // Đơn cũ chưa có trường trangThai: cờ daXacNhan chỉ nói khách đã bấm nút,
    // nên xếp vào 'khachBao' chứ không phải 'daXacNhan'.
    return TRANG_THAI_DON[t] ? t : (don && don.daXacNhan ? 'khachBao' : 'moi');
  }

  // Kho tạm của module này. Đặt hẳn một hàm khởi tạo để phần 01 không phải
  // biết gì về cấu trúc bên trong.
  function khoDon(){
    const a = state.admin;
    if (!a.donHang) {
      a.donHang = {
        loc: 'khachBao',
        tim: '',
        dangTai: false,
        daTai: false,
        loi: '',
        danhSach: [],
        moRong: '',      // khoá đơn đang mở phần thiết bị
        thietBi: {},     // khoá đơn -> { <mã sp>: { thietBi, moLuc } }
        dangLam: '',     // thao tác đang chạy, để nút tự khoá lại
        dangGui: {},     // khoá đơn -> 'cho' | 'xong' | 'qua-lau'
        theoDoi: {}      // khoá đơn -> hàm gỡ người nghe Firebase
      };
    }
    return a.donHang;
  }

  function sinhMaNhanHang(){
    let ma = '';
    const so = new Uint32Array(DAI_MA_NHAN_HANG);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(so);
    for (let i = 0; i < DAI_MA_NHAN_HANG; i++) {
      const n = so[i] || Math.floor(Math.random() * 0xffffffff);
      ma += CHU_MA_NHAN_HANG.charAt(n % CHU_MA_NHAN_HANG.length);
    }
    return ma;
  }

  function linkNhanHang(maNhanHang){
    return window.location.origin + DUONG_DAN_NHAN_HANG + '?ma=' + encodeURIComponent(maNhanHang || '');
  }

  // --------------------------------------------------------------- ĐỌC ĐƠN

  function taiDanhSachDon(){
    if (!firebaseSanSang || !rtdb) return;
    const k = khoDon();
    k.dangTai = true;
    k.loi = '';
    veLaiDonHang();

    const loc = k.loc;
    const goc = rtdb.ref('donhang');
    // 'tat-ca' đi theo khoá (khoá push vốn xếp theo thời gian, không cần chỉ
    // mục); các lọc còn lại đi theo 'trangThai' — đã có .indexOn trong Rules.
    const truyVan = (loc === 'tat-ca')
      ? goc.orderByKey().limitToLast(SO_DON_MOI_LAN)
      : goc.orderByChild('trangThai').equalTo(loc).limitToLast(SO_DON_MOI_LAN);

    truyVan.once('value').then(function(anh){
      const ds = [];
      anh.forEach(function(con){
        const v = con.val() || {};
        v.khoa = con.key;
        ds.push(v);
      });
      // XẾP TƯỜNG MINH THEO 'taoLuc', mới nhất lên đầu.
      //
      // Không dựa vào thứ tự Firebase trả về. Khi lọc bằng orderByChild thì thứ
      // tự trong nhóm là thứ tự KHOÁ, mà khoá do push() sinh chỉ trùng với thời
      // gian tạo trong điều kiện bình thường — đơn nào được ghi lại bằng tay,
      // hay đồng hồ máy khách lệch, là thứ tự lệch theo mà không ai thấy.
      // Sáu chục dòng thì xếp lại tốn không đáng kể.
      ds.sort(function(a, b){
        const ta = Number(a.taoLuc) || 0;
        const tb = Number(b.taoLuc) || 0;
        if (tb !== ta) return tb - ta;
        // Cùng mốc thời gian (hoặc cùng thiếu mốc) thì lấy khoá làm trọng tài —
        // khoá push() luôn tăng dần nên đơn sau vẫn đứng trên đơn trước.
        return a.khoa < b.khoa ? 1 : (a.khoa > b.khoa ? -1 : 0);
      });
      if (k.loc !== loc) return;   // người dùng đã đổi bộ lọc trong lúc chờ
      k.danhSach = ds;
      k.dangTai = false;
      k.daTai = true;
      veLaiDonHang();
    }).catch(function(e){
      console.error('Không đọc được đơn hàng:', e);
      if (k.loc !== loc) return;
      k.dangTai = false;
      k.daTai = true;
      k.danhSach = [];
      k.loi = 'Không đọc được danh sách đơn. Firebase từ chối hoặc mất mạng. ' +
        'Nếu vừa đổi email chủ shop, hãy soát lại database.rules.json.';
      veLaiDonHang();
    });
  }

  function timDon(don){
    const k = khoDon();
    const tu = String(k.tim || '').trim().toLowerCase();
    if (!tu) return true;
    const gom = [don.maDon, don.maNhanHang, don.email, don.zalo, don.dienThoai, don.noiDungCK]
      .map(function(x){ return String(x == null ? '' : x).toLowerCase(); }).join(' ');
    return gom.indexOf(tu) !== -1;
  }

  // ------------------------------------------------------------------- VẼ

  function veAdminDonHang(){
    const k = khoDon();
    const nutLoc = BO_LOC_DON.map(function(b){
      return '<button type="button" class="admin-loc-don' + (k.loc === b.ma ? ' dang-chon' : '') +
        '" data-hanh-dong="admin-don-loc" data-loc="' + escapeHtml(b.ma) + '"' +
        ' aria-pressed="' + (k.loc === b.ma ? 'true' : 'false') + '">' +
        escapeHtml(b.ten) + '</button>';
    }).join('');

    return '<header class="admin-dau">' +
        '<h2>Đơn hàng</h2>' +
        '<p>Soát tiền về, cấp đường dẫn nhận hàng, và mở khoá lại cho khách đổi máy. ' +
          'Danh sách chỉ tải khi bạn mở mục này — không đọc sẵn cả kho đơn.</p>' +
      '</header>' +
      '<div class="admin-thanh-don">' +
        '<div class="admin-hang-loc">' + nutLoc + '</div>' +
        '<div class="admin-hang-tim">' +
          '<input type="search" class="admin-nhap" data-admin-tim-don="1" autocomplete="off"' +
            ' placeholder="Tìm theo mã đơn, email, số Zalo…" value="' + escapeHtml(k.tim) + '">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="admin-don-tai-lai"' +
            (k.dangTai ? ' disabled' : '') + '>' + (k.dangTai ? 'Đang tải…' : 'Tải lại') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="admin-vung-don" data-vung-don="1">' + veRuotDonHang() + '</div>';
  }

  function veRuotDonHang(){
    const k = khoDon();
    if (k.dangTai && !k.danhSach.length) {
      return '<div class="admin-trong"><p>Đang tải danh sách đơn…</p></div>';
    }
    if (k.loi) return '<div class="admin-trong admin-trong-loi"><p>' + escapeHtml(k.loi) + '</p></div>';
    const hien = k.danhSach.filter(timDon);
    if (!hien.length) {
      const vi = k.tim
        ? 'Không có đơn nào khớp với “' + k.tim + '”.'
        : 'Chưa có đơn nào ở nhóm này.';
      return '<div class="admin-trong"><p>' + escapeHtml(vi) + '</p></div>';
    }
    return '<p class="admin-dem-don">' + hien.length + ' đơn' +
        (k.tim ? ' khớp với “' + escapeHtml(k.tim) + '”' : '') + '</p>' +
      hien.map(veTheDon).join('');
  }

  function veTheDon(don){
    const k = khoDon();
    const tt = trangThaiDon(don);
    const mo = TRANG_THAI_DON[tt];
    const dangLam = k.dangLam === don.khoa;
    const moRong = k.moRong === don.khoa;

    const mon = (don.sanPham || []).map(function(x){
      return '<li>' + escapeHtml(String(x)) + '</li>';
    }).join('');

    // Đủ NĂM kênh, đúng thứ tự chúng hiện trong bảng khách điền. Thiếu một
    // dòng ở đây là chủ shop tưởng khách không để lại gì và bỏ mặc họ.
    //
    // Cột thứ ba là nút mở thẳng cuộc trò chuyện. Điện thoại KHÔNG có nút đó —
    // một con số điện thoại trần không dẫn tới ứng dụng nào cả.
    const lienLac = [
      ['email',    'Email',       don.email],
      ['zalo',     'Zalo',        don.zalo],
      [null,       'Điện thoại',  don.dienThoai],
      ['whatsapp', 'WhatsApp',    don.whatsapp],
      ['telegram', 'Telegram',    don.telegram]
    ].filter(function(d){ return d[2]; }).map(function(d){
      return '<div class="dong-lien-lac"><span class="nhan">' + escapeHtml(d[1]) + '</span>' +
        '<span class="tri">' + escapeHtml(String(d[2])) + '</span>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="sao-chep"' +
        ' data-chuoi="' + escapeHtml(String(d[2])) + '">Sao chép</button>' +
        (d[0] ? veNutTruyCap(d[0], String(d[2])) : '') +
        '</div>';
    }).join('') || '<p class="khong-lien-lac">Khách không để lại thông tin liên lạc nào.</p>';

    return '' +
      '<article class="admin-the-don" data-the-don="' + escapeHtml(don.khoa) + '">' +
        '<header class="dau-don">' +
          '<div class="dau-don-trai">' +
            '<span class="ma-don">' + escapeHtml(don.maDon || don.khoa) + '</span>' +
            '<span class="luc-don">' + escapeHtml(gioPhutNgay(don.taoLuc)) + '</span>' +
          '</div>' +
          (don.emailGuiLuc
            ? '<span class="dau-da-gui-email" title="' + escapeHtml(
                'Lá thư gần nhất bay đi lúc ' + gioPhutNgay(don.emailGuiLuc)) + '">✉ Đã gửi email' +
              (Number(don.soLanGuiEmail) > 1 ? ' · ' + Number(don.soLanGuiEmail) + ' lần' : '') +
              '</span>'
            : '') +
          '<span class="the-trang-thai ' + mo.mau + '" title="' + escapeHtml(mo.mo) + '">' +
            escapeHtml(mo.ten) + '</span>' +
        '</header>' +
        '<div class="than-don">' +
          '<ul class="mon-don">' + (mon || '<li>(không rõ sản phẩm)</li>') + '</ul>' +
          '<div class="tien-don">' +
            '<span class="nhan">Thành tiền</span>' +
            '<strong class="tri">' + escapeHtml(dinhDangTien(don.thanhTien || 0)) + '</strong>' +
          '</div>' +
          (don.noiDungCK
            ? '<div class="dong-lien-lac"><span class="nhan">Nội dung CK</span>' +
              '<span class="tri">' + escapeHtml(String(don.noiDungCK)) + '</span>' +
              '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="sao-chep"' +
              ' data-chuoi="' + escapeHtml(String(don.noiDungCK)) + '">Sao chép</button></div>'
            : '') +
          lienLac +
        '</div>' +
        veKhoiNhanHang(don, dangLam) +
        veKhoiGuiEmail(don) +
        veKhoiThietBi(don, moRong) +
        '<footer class="day-don">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="admin-don-mau-tin"' +
            ' data-khoa="' + escapeHtml(don.khoa) + '">Xem mẫu tin nhắn</button>' +
          veNutPheDuyet(don, tt, dangLam) +
          veNutTrangThai(don, tt, dangLam) +
          '<button type="button" class="nut nut-nho nut-vien nut-xoa-don"' +
            ' data-hanh-dong="admin-don-xoa" data-khoa="' + escapeHtml(don.khoa) + '"' +
            (dangLam ? ' disabled' : '') + '>Xoá đơn</button>' +
        '</footer>' +
      '</article>';
  }

  /**
   * Đổi một số điện thoại thành dạng quốc tế 84… mà các ứng dụng nhắn tin nhận.
   *
   *   0912345678   → 84912345678
   *   84912345678  → giữ nguyên
   *   +84912345678 → bỏ dấu cộng
   *
   * Số không thuộc ba dạng đó, hoặc dài ngắn bất thường, thì TRẢ VỀ RỖNG. Bên
   * gọi sẽ hiện chữ "link hỏng" thay vì một cái nút bấm vào chỉ tổ báo lỗi —
   * và người bấm sẽ tưởng khách đã chặn mình.
   */
  function so84(so){
    let s = String(so || '').replace(/[^\d+]/g, '');
    if (s.indexOf('+84') === 0) s = s.slice(1);
    else if (s.indexOf('84') === 0) { /* đã đúng dạng */ }
    else if (s.indexOf('0') === 0) s = '84' + s.slice(1);
    else return '';
    return /^84\d{8,10}$/.test(s) ? s : '';
  }

  // Mỗi ứng dụng một kiểu địa chỉ: wa.me không có dấu cộng, t.me thì có.
  function duongDanKenh(kieu, giaTri){
    if (kieu === 'email') {
      const e = String(giaTri || '').trim();
      return e.indexOf('@') > 0 ? 'mailto:' + e : '';
    }
    const s = so84(giaTri);
    if (!s) return '';
    if (kieu === 'zalo') return 'https://zalo.me/' + s;
    if (kieu === 'whatsapp') return 'https://wa.me/' + s;
    if (kieu === 'telegram') return 'https://t.me/+' + s;
    return '';
  }

  function veNutTruyCap(kieu, giaTri){
    const duong = duongDanKenh(kieu, giaTri);
    if (!duong) {
      return '<span class="link-hong" title="Số này không dựng được đường dẫn — ' +
        'chỉ nhận số bắt đầu bằng 0, 84 hoặc +84">Link hỏng</span>';
    }
    return '<a class="nut nut-nho nut-vien nut-truy-cap" href="' + escapeHtml(duong) + '"' +
      ' target="_blank" rel="noopener noreferrer">Truy cập Link</a>';
  }

  function veKhoiNhanHang(don, dangLam){
    if (!don.maNhanHang) {
      return '<div class="khoi-nhan-hang chua-co">' +
        '<p>Đơn này chưa có mã nhận hàng. Cấp mã xong là có ngay đường dẫn riêng để gửi cho khách.</p>' +
        '<button type="button" class="nut nut-nho nut-chinh" data-hanh-dong="admin-don-tao-ma"' +
          ' data-khoa="' + escapeHtml(don.khoa) + '"' + (dangLam ? ' disabled' : '') + '>' +
          (dangLam ? 'Đang cấp…' : 'Cấp mã nhận hàng') + '</button>' +
        '</div>';
    }
    const link = linkNhanHang(don.maNhanHang);
    return '<div class="khoi-nhan-hang">' +
      '<span class="nhan">Đường dẫn nhận hàng</span>' +
      '<code class="link-nhan">' + escapeHtml(link) + '</code>' +
      '<div class="hang-nut-nhan">' +
        '<button type="button" class="nut nut-nho nut-chinh" data-hanh-dong="sao-chep"' +
          ' data-chuoi="' + escapeHtml(link) + '">Sao chép đường dẫn</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="sao-chep"' +
          ' data-chuoi="' + escapeHtml(don.maNhanHang) + '">Chép riêng mã</button>' +
      '</div>' +
      '</div>';
  }

  /**
   * Nút gửi email tay.
   *
   * CÁCH NÓ CHẠY, và vì sao không gọi thẳng Apps Script từ đây:
   *
   * Trang này chạy trong trình duyệt, mà mã của nó tải công khai — ai cũng xem
   * được. Đặt địa chỉ Web App và mật khẩu webhook vào đây là biếu chúng cho bất
   * kỳ ai bấm F12. Thêm nữa, Apps Script không gửi tiêu đề CORS nên trình duyệt
   * cũng không đọc được câu trả lời.
   *
   * Nên nút này không gọi ai cả: nó chỉ ĐẶT TRẠNG THÁI 'daXacNhan' — nghĩa là
   * "đã xác nhận có tiền". Bộ gửi hàng chạy sẵn mỗi phút thấy trạng thái đó thì
   * gửi, y hệt như khi ngân hàng báo có. Không thêm bí mật nào vào trình duyệt,
   * không thêm đường dây nào để hỏng.
   *
   * Đổi lại: mất tới một phút. Nên nút không đứng im chờ — nó gắn người nghe
   * vào đúng đơn đó trong Firebase và tự đổi chữ ngay khi thư bay đi thật.
   *
   * KHÔNG có email thì không bấm được. Bấm cũng vô ích: bộ gửi hàng gặp đơn
   * thiếu email sẽ chuyển sang 'canXemTay' chứ không gửi gì.
   */
  function veKhoiGuiEmail(don){
    const k = khoDon();
    const tt = khoDon().dangGui[don.khoa] || '';
    const daGui = !!don.emailGuiLuc;

    if (!don.email) {
      return '<div class="khoi-gui-email khong-email">' +
        '<span aria-hidden="true">✉️</span> Đơn này không có email nên không gửi tự động được. ' +
        'Chép mẩu tin ở thư báo rồi nhắn tay cho khách.' +
        '</div>';
    }

    if (tt === 'cho') {
      return '<div class="khoi-gui-email dang-cho">' +
        '<span class="quay" aria-hidden="true">⏳</span> Đang gửi… hệ thống gửi trong vòng một phút, ' +
        'bạn cứ để yên trang này.' +
        '</div>';
    }
    if (tt === 'xong') {
      return '<div class="khoi-gui-email xong">' +
        '<span aria-hidden="true">✅</span> <strong>Đã gửi email cho khách.</strong> ' +
        'Thư đã bay tới ' + escapeHtml(don.email) + '.' +
        '</div>';
    }
    if (tt === 'qua-lau') {
      return '<div class="khoi-gui-email qua-lau">' +
        '<span aria-hidden="true">⚠️</span> Chờ quá lâu mà chưa thấy thư bay đi. ' +
        'Kiểm tra trigger của Apps Script còn chạy không, rồi bấm Tải lại để xem trạng thái mới nhất.' +
        '</div>';
    }

    return '<div class="khoi-gui-email">' +
      '<button type="button" class="nut nut-nho ' + (daGui ? 'nut-vien' : 'nut-chinh') + ' nut-gui-email"' +
        ' data-hanh-dong="admin-don-gui-email" data-khoa="' + escapeHtml(don.khoa) + '">' +
        (daGui ? 'Gửi email lại lần nữa cho khách' : 'Gửi email kèm link sản phẩm cho khách') +
      '</button>' +
      (daGui
        ? '<p class="ghi-chu-gui-email">Lần gửi gần nhất: ' + escapeHtml(gioPhutNgay(don.emailGuiLuc)) +
          '. Bấm nút là khách nhận thêm một lá thư y hệt.</p>'
        : '') +
      '</div>';
  }

  // Phần thiết bị chỉ tải khi bấm mở — phần lớn đơn không bao giờ cần tới nó.
  function veKhoiThietBi(don, moRong){
    if (!don.maNhanHang) return '';
    const k = khoDon();
    if (!moRong) {
      return '<div class="khoi-thiet-bi">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="admin-don-thiet-bi"' +
          ' data-khoa="' + escapeHtml(don.khoa) + '">Xem máy đã mở khoá</button>' +
        '</div>';
    }
    const bang = k.thietBi[don.khoa];
    if (bang === 'dang-tai') {
      return '<div class="khoi-thiet-bi mo"><p class="cho-thiet-bi">Đang xem khách đã mở trên máy nào…</p></div>';
    }
    const ma = Object.keys(bang || {});
    const dong = ma.length ? ma.map(function(sp){
      const t = bang[sp] || {};
      const spTen = (timSanPham(sp) || {}).ten || sp;
      return '<div class="dong-thiet-bi">' +
        '<div class="tb-mo-ta">' +
          '<strong>' + escapeHtml(sp) + '</strong> — ' + escapeHtml(spTen) +
          '<span class="tb-luc">Mở khoá lúc ' + escapeHtml(gioPhutNgay(t.moLuc)) + '</span>' +
        '</div>' +
        '<button type="button" class="nut nut-nho nut-vien nut-mo-khoa" data-hanh-dong="admin-don-mo-khoa"' +
          ' data-khoa="' + escapeHtml(don.khoa) + '" data-sp="' + escapeHtml(sp) + '">Cấp quyền lại</button>' +
        '</div>';
    }).join('') : '<p class="cho-thiet-bi">Khách chưa tải gì, chưa máy nào bị khoá.</p>';

    return '<div class="khoi-thiet-bi mo">' +
      '<div class="dau-thiet-bi">' +
        '<span class="nhan">Máy đã mở khoá</span>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="admin-don-dong-thiet-bi"' +
          ' data-khoa="' + escapeHtml(don.khoa) + '">Thu gọn</button>' +
      '</div>' +
      dong +
      '<p class="loi-dan-thiet-bi">Bấm “Cấp quyền lại” là quên máy cũ đi: lần tải kế tiếp của khách ' +
        'mở khoá trên máy nào thì gắn vào máy đó. Dùng khi khách đổi điện thoại, đổi trình duyệt, ' +
        'hoặc xoá dữ liệu duyệt web.</p>' +
      '</div>';
  }

  function veNutTrangThai(don, tt, dangLam){
    const nut = [];
    // KHÔNG còn nút "Đánh dấu đã gửi" chung chung ở đây. Việc đó nay là nút
    // "Phê duyệt là đã gửi link sản phẩm", có hai chốt gác: phải có mã nhận
    // hàng, và không được bấm giữa lượt gửi email.
    if (tt !== 'daXacNhan') {
      nut.push(['daXacNhan', 'Trả về chờ gửi', 'nut-vien']);
    }
    if (tt !== 'canXemTay') {
      nut.push(['canXemTay', 'Đánh dấu cần xem tay', 'nut-vien']);
    }
    return nut.map(function(n){
      return '<button type="button" class="nut nut-nho ' + n[2] + '" data-hanh-dong="admin-don-trang-thai"' +
        ' data-khoa="' + escapeHtml(don.khoa) + '" data-tri="' + n[0] + '"' +
        (dangLam ? ' disabled' : '') + '>' + escapeHtml(n[1]) + '</button>';
    }).join('');
  }

  /* --------------------------------------------- MẪU TIN NHẮN GỬI TAY

     Hai mẩu này phải nói ĐÚNG những gì lá thư báo shop nói — chủ shop chép
     mẩu ở đây hay chép mẩu trong thư đều phải ra cùng một nội dung, nếu không
     khách nhận được hai câu chuyện khác nhau tuỳ chủ shop chép ở đâu.

     Bản gốc nằm ở apps-script/gui-hang.gs (soanTinZalo, soanTinSMS). Ở đây
     phải viết lại vì trình duyệt không gọi được Apps Script — hợp đồng regex
     canh những câu quan trọng có mặt ở CẢ HAI nơi, để hai bản không trôi xa
     nhau lúc nào không biết.

     Đơn chưa có mã nhận hàng thì mẩu tin nói thẳng là chưa có đường dẫn, chứ
     không in ra một dòng cụt — chép nhầm mẩu đó gửi khách là khách bấm vào
     một đường dẫn hỏng. */

  function tenMonCuaDon(don){
    return (don.maSanPham || []).map(function(m){
      const sp = timSanPham(m);
      return '· ' + (sp ? sp.ten : m);
    }).join('\n');
  }

  const CHUA_CO_MA = '(CHƯA CÓ MÃ SẢN PHẨM — chưa hiện được đường dẫn. Hãy bấm ' +
    '“Cấp mã nhận hàng” ở đơn này trước.)';

  function mauTinZalo(don){
    const duong = don.maNhanHang ? linkNhanHang(don.maNhanHang) : CHUA_CO_MA;
    const than =
      'Chào bạn, shop đã nhận được thanh toán đơn ' + (don.maDon || don.khoa) + '.\n' +
      'Sản phẩm bạn đã mua:\n' + tenMonCuaDon(don) + '\n' +
      'Đây là đường dẫn nhận sản phẩm của riêng bạn:\n' +
      duong + '\n' +
      'Bấm vào đó, chọn đúng sản phẩm bạn đã mua là tải về được ngay, không phải nhập mã nào cả.\n' +
      'Xin đừng chia sẻ đường dẫn này cho người khác — mỗi sản phẩm chỉ tải được ' +
      'trên MỘT thiết bị (một trình duyệt), nên hãy mở nó trên đúng chiếc máy bạn sẽ dùng.\n' +
      'Cần hỗ trợ cài đặt cứ nhắn cho shop nhé. Cảm ơn bạn đã tin tưởng!';
    // Nhân đôi mọi dấu xuống dòng: dán một đoạn nhiều dòng vào ô soạn tin,
    // nhiều thiết bị nuốt mất dấu xuống dòng đơn và biến nó thành dấu cách.
    return than.replace(/\n/g, '\n\n');
  }

  function mauTinSMS(don){
    const duong = don.maNhanHang ? linkNhanHang(don.maNhanHang) : '(CHUA CO MA SAN PHAM)';
    return 'Thanhdeptrai.vn cam on ban! Link san pham rieng: ' + duong +
      ' Xin dung chia se cho ai.';
  }

  function adminDonXemMauTin(khoa){
    const don = donTheoKhoa(khoa);
    if (!don) return;
    const zalo = mauTinZalo(don);
    const sms = mauTinSMS(don);
    const thieuMa = !don.maNhanHang;

    function khoiMau(tieuDe, mo, noiDung){
      return '<div class="khoi-mau-tin">' +
        '<div class="dau-mau-tin">' +
          '<div><strong>' + escapeHtml(tieuDe) + '</strong>' +
            '<span class="mo-mau-tin">' + escapeHtml(mo) + '</span></div>' +
          '<button type="button" class="nut nut-nho nut-chinh" data-hanh-dong="sao-chep"' +
            ' data-chuoi="' + escapeHtml(noiDung) + '">Sao chép</button>' +
        '</div>' +
        '<pre class="than-mau-tin">' + escapeHtml(noiDung) + '</pre>' +
      '</div>';
    }

    moModal({
      ma: 'mau-tin-don',
      tieuDe: 'Mẫu tin nhắn — đơn ' + (don.maDon || don.khoa),
      than: '' +
        (thieuMa
          ? '<div class="canh-bao-mau-tin"><span aria-hidden="true">⚠️</span> ' +
            'Đơn này <strong>chưa có mã nhận hàng</strong> nên hai mẩu dưới đây chưa có ' +
            'đường dẫn sản phẩm. Bấm “Cấp mã nhận hàng” ở thẻ đơn rồi mở lại bảng này.</div>'
          : '') +
        khoiMau('Mẩu tin Zalo', 'Dùng được cho cả WhatsApp và Telegram — cùng một nội dung.', zalo) +
        khoiMau('Mẩu tin SMS', 'Viết không dấu cho gọn trong một tin nhắn.', sms),
      day: '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  /* ------------------------------------- PHÊ DUYỆT ĐÃ GỬI BẰNG KÊNH KHÁC

     Dùng khi chủ shop đã tự gửi đường dẫn qua Zalo, WhatsApp hay Telegram.
     Nó KHÔNG ghi 'emailGuiLuc' — không lá thư nào bay đi cả, và dấu "đã gửi
     email" trên thẻ phải nói đúng sự thật đó.

     Khoá lại trong hai trường hợp, cả hai đều là lúc bấm vào chỉ tổ hỏng việc:
       · chưa có mã nhận hàng — nghĩa là chưa có gì để gửi cho khách;
       · đang trong lượt gửi email — đánh dấu "đã gửi" giữa chừng thì đơn rời
         khỏi nhóm đang xem trong khi lá thư còn chưa đi. */

  function veNutPheDuyet(don, tt, dangLam){
    if (tt === 'daGui') return '';
    const dangGui = khoDon().dangGui[don.khoa] === 'cho';
    const thieuMa = !don.maNhanHang;
    const khoa = dangLam || dangGui || thieuMa;
    const vi = thieuMa
      ? 'Chưa cấp mã nhận hàng nên chưa có đường dẫn nào để gửi cho khách.'
      : (dangGui ? 'Đang trong lượt gửi email, chờ gửi xong đã.' : '');
    return '<button type="button" class="nut nut-nho nut-la nut-phe-duyet"' +
      ' data-hanh-dong="admin-don-phe-duyet" data-khoa="' + escapeHtml(don.khoa) + '"' +
      (khoa ? ' disabled' : '') + (vi ? ' title="' + escapeHtml(vi) + '"' : '') + '>' +
      'Phê duyệt là đã gửi link sản phẩm</button>';
  }

  function adminDonPheDuyet(khoa){
    const don = donTheoKhoa(khoa);
    if (!don || !don.maNhanHang) return;
    if (khoDon().dangGui[khoa] === 'cho') return;
    if (!window.confirm('Phê duyệt đơn ' + (don.maDon || khoa) + ' là ĐÃ GỬI?\n\n' +
      'Dùng khi bạn đã tự gửi đường dẫn cho khách qua Zalo, WhatsApp hay Telegram. ' +
      'Đơn sẽ chuyển sang nhóm “Đã gửi”.')) return;
    ghiDon(khoa, { trangThai: 'daGui', guiLuc: Date.now(), ghiChuGui: 'Chủ shop phê duyệt đã gửi tay.' });
  }

  // Ngày giờ theo kiểu người Việt đọc: 14:05 · 09/09/2026
  function gioPhutNgay(moc){
    const n = Number(moc);
    if (!n) return 'không rõ lúc nào';
    const d = new Date(n);
    function hai(x){ return (x < 10 ? '0' : '') + x; }
    return hai(d.getHours()) + ':' + hai(d.getMinutes()) + ' · ' +
      hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  // Vẽ lại ruột danh sách, giữ nguyên thanh lọc và ô tìm — vẽ lại cả trang thì
  // chữ đang gõ trong ô tìm bay mất và con trỏ nhảy về đầu.
  function veLaiDonHang(){
    if (state.trang !== 'admin' || state.admin.module !== 'don-hang') return;
    const vung = document.querySelector('[data-vung-don]');
    if (!vung) return;
    vung.innerHTML = veRuotDonHang();
    const nutTaiLai = document.querySelector('[data-hanh-dong="admin-don-tai-lai"]');
    if (nutTaiLai) {
      const k = khoDon();
      nutTaiLai.disabled = !!k.dangTai;
      nutTaiLai.textContent = k.dangTai ? 'Đang tải…' : 'Tải lại';
    }
  }

  function donTheoKhoa(khoa){
    return khoDon().danhSach.filter(function(d){ return d.khoa === khoa; })[0] || null;
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  // Người nghe Firebase phải được gỡ khi rời khỏi danh sách. Bỏ quên thì mỗi
  // lần đổi bộ lọc lại chồng thêm một người nghe lên cùng một đơn, và trang
  // càng dùng càng nặng.
  function thoiNgheHetDon(){
    const k = khoDon();
    Object.keys(k.theoDoi).forEach(function(khoa){
      const t = k.theoDoi[khoa];
      if (!t) return;
      if (firebaseSanSang && rtdb) rtdb.ref('donhang/' + khoa).off('value', t.nghe);
      window.clearTimeout(t.dongHo);
      delete k.theoDoi[khoa];
    });
    k.dangGui = {};
  }

  function adminDonDoiLoc(loc){
    const k = khoDon();
    if (!loc || k.loc === loc) return;
    thoiNgheHetDon();
    k.loc = loc;
    k.danhSach = [];
    k.moRong = '';
    render();
    taiDanhSachDon();
  }

  function adminDonTaiLai(){
    thoiNgheHetDon();
    khoDon().moRong = '';
    taiDanhSachDon();
  }

  function adminDonGoTim(dich){
    if (!dich.getAttribute || !dich.getAttribute('data-admin-tim-don')) return false;
    khoDon().tim = dich.value;
    veLaiDonHang();
    return true;
  }

  function ghiDon(khoa, thayDoi, xong){
    if (!firebaseSanSang || !rtdb) return;
    const k = khoDon();
    k.dangLam = khoa;
    veLaiDonHang();
    rtdb.ref('donhang/' + khoa).update(thayDoi).then(function(){
      const don = donTheoKhoa(khoa);
      if (don) Object.keys(thayDoi).forEach(function(t){ don[t] = thayDoi[t]; });
      k.dangLam = '';
      // Đơn vừa đổi trạng thái thì không còn thuộc bộ lọc đang xem nữa — bỏ nó
      // khỏi danh sách cho khớp với thực tế, đừng để nó nằm lại gây hiểu nhầm.
      if (thayDoi.trangThai && k.loc !== 'tat-ca' && k.loc !== thayDoi.trangThai) {
        k.danhSach = k.danhSach.filter(function(d){ return d.khoa !== khoa; });
      }
      veLaiDonHang();
      if (xong) xong();
    }).catch(function(e){
      console.error('Không cập nhật được đơn ' + khoa + ':', e);
      k.dangLam = '';
      veLaiDonHang();
      alert('Không lưu được thay đổi. Firebase từ chối hoặc mất mạng.');
    });
  }

  function adminDonDoiTrangThai(khoa, tri){
    if (!TRANG_THAI_DON[tri]) return;
    const thayDoi = { trangThai: tri };
    if (tri === 'daGui') thayDoi.guiLuc = Date.now();
    ghiDon(khoa, thayDoi);
  }

  function adminDonTaoMa(khoa){
    const don = donTheoKhoa(khoa);
    if (!don) return;
    // Cấp mã lần hai là đổi đường dẫn của khách: link cũ đã gửi đi thành vô
    // dụng. Có mã rồi thì không cấp đè.
    if (don.maNhanHang) return;
    ghiDon(khoa, { maNhanHang: sinhMaNhanHang() });
  }

  function adminDonXemThietBi(khoa){
    const don = donTheoKhoa(khoa);
    if (!don || !don.maNhanHang || !firebaseSanSang || !rtdb) return;
    const k = khoDon();
    k.moRong = khoa;
    k.thietBi[khoa] = 'dang-tai';
    veLaiDonHang();
    rtdb.ref('thietbi/' + don.maNhanHang).once('value').then(function(anh){
      k.thietBi[khoa] = (anh && anh.val()) || {};
      veLaiDonHang();
    }).catch(function(e){
      console.error('Không đọc được nhánh thietbi:', e);
      k.thietBi[khoa] = {};
      veLaiDonHang();
    });
  }

  function adminDonDongThietBi(khoa){
    const k = khoDon();
    if (k.moRong === khoa) k.moRong = '';
    veLaiDonHang();
  }

  // Chờ tối đa bấy nhiêu giây rồi mới chịu là hỏng. Bộ gửi hàng chạy mỗi phút,
  // nên 100 giây là đã qua ít nhất một lượt kể cả khi vừa lỡ mất lượt vừa rồi.
  const GIAY_CHO_GUI_EMAIL = 100;

  /**
   * Bấm "Gửi email cho khách".
   *
   * Ba việc, theo đúng thứ tự, và thứ tự này quan trọng: cấp mã nhận hàng
   * TRƯỚC, vì lá thư cần đường dẫn riêng của khách. Cấp sau thì thư bay đi với
   * đường dẫn rỗng.
   */
  function adminDonGuiEmail(khoa){
    const don = donTheoKhoa(khoa);
    if (!don || !firebaseSanSang || !rtdb) return;
    const k = khoDon();
    if (k.dangGui[khoa] === 'cho') return;   // đang chờ rồi, đừng bấm chồng

    if (!don.email) {
      alert('Đơn này không có email nên không gửi tự động được.');
      return;
    }
    const daGui = !!don.emailGuiLuc;
    if (daGui && !window.confirm(
      'Gửi THÊM một lá thư nữa cho ' + don.email + '?\n\n' +
      'Khách sẽ nhận đúng lá thư như lần trước, kèm đúng đường dẫn cũ.')) return;

    // Mốc để biết thư MỚI đã bay đi hay chưa. So với mốc cũ chứ không chỉ nhìn
    // "có emailGuiLuc hay không" — nếu không, lần gửi lại sẽ báo xong ngay lập
    // tức bằng dấu vết của lần gửi trước.
    const mocCu = Number(don.emailGuiLuc) || 0;

    k.dangGui[khoa] = 'cho';
    veLaiDonHang();

    const capMa = don.maNhanHang
      ? Promise.resolve(don.maNhanHang)
      : (function(){
          const ma = sinhMaNhanHang();
          return rtdb.ref('donhang/' + khoa).update({ maNhanHang: ma }).then(function(){
            don.maNhanHang = ma;
            return ma;
          });
        })();

    capMa.then(function(){
      // 'daXacNhan' = đã xác nhận CÓ TIỀN. Ngân hàng báo có đặt nó, và chủ shop
      // tự đối chiếu rồi bấm nút này cũng đặt nó. Điều bất di bất dịch là KHÁCH
      // không bao giờ đặt được — cú bấm của khách chỉ tới 'khachBao'.
      return rtdb.ref('donhang/' + khoa).update({ trangThai: 'daXacNhan' });
    }).then(function(){
      ngheDonGuiXong(khoa, mocCu);
    }).catch(function(e){
      console.error('Không đặt được yêu cầu gửi cho đơn ' + khoa + ':', e);
      k.dangGui[khoa] = '';
      veLaiDonHang();
      alert('Không gửi được yêu cầu. Firebase từ chối hoặc mất mạng.');
    });
  }

  /**
   * Nghe đúng một đơn cho tới khi thư bay đi thật.
   *
   * Nghe bằng người nghe của Firebase chứ không hỏi lại từng giây: đỡ tốn, và
   * đổi chữ ngay giây thư bay đi thay vì đợi tới nhịp hỏi kế tiếp.
   *
   * Bằng chứng là 'emailGuiLuc' mới hơn mốc cũ, KHÔNG phải trạng thái 'daGui':
   * trạng thái đó chủ shop tự bấm tay cũng đặt được, còn 'emailGuiLuc' chỉ Apps
   * Script ghi, và chỉ ngay sau khi lá thư thật sự rời đi.
   */
  function ngheDonGuiXong(khoa, mocCu){
    const k = khoDon();
    const ref = rtdb.ref('donhang/' + khoa);

    function thoi(){
      if (!k.theoDoi[khoa]) return;
      ref.off('value', k.theoDoi[khoa].nghe);
      window.clearTimeout(k.theoDoi[khoa].dongHo);
      delete k.theoDoi[khoa];
    }
    thoi();

    const nghe = ref.on('value', function(anh){
      const moi = anh && anh.val();
      if (!moi) return;
      const don = donTheoKhoa(khoa);
      if (don) Object.keys(moi).forEach(function(t){ don[t] = moi[t]; });

      if (Number(moi.emailGuiLuc || 0) > mocCu) {
        thoi();
        k.dangGui[khoa] = 'xong';
        veLaiDonHang();
        // Giữ lời báo trên màn hình vài giây rồi mới cho đơn rời khỏi nhóm đang
        // xem. Bỏ đi ngay thì đơn biến mất đúng lúc chủ shop đang nhìn nó, và
        // họ không biết việc đã xong hay vừa hỏng.
        window.setTimeout(function(){
          if (k.dangGui[khoa] !== 'xong') return;
          k.dangGui[khoa] = '';
          if (k.loc !== 'tat-ca' && k.loc !== 'daGui') {
            k.danhSach = k.danhSach.filter(function(d){ return d.khoa !== khoa; });
          }
          veLaiDonHang();
        }, GIAY_HIEN_DA_LUU * 1000 + 2000);
        return;
      }
      // Bộ gửi hàng gặp trục trặc thì nó chuyển đơn sang 'canXemTay' — nói ngay
      // thay vì để chủ shop ngồi nhìn chữ "đang gửi" cho tới lúc hết giờ.
      if (moi.trangThai === 'canXemTay') {
        thoi();
        k.dangGui[khoa] = 'qua-lau';
        veLaiDonHang();
      }
    });

    const dongHo = window.setTimeout(function(){
      thoi();
      if (k.dangGui[khoa] === 'cho') {
        k.dangGui[khoa] = 'qua-lau';
        veLaiDonHang();
      }
    }, GIAY_CHO_GUI_EMAIL * 1000);

    k.theoDoi[khoa] = { nghe: nghe, dongHo: dongHo };
  }

  // Xoá hẳn đơn khỏi Firebase. Không lùi được, nên hỏi lại và nói rõ mất gì:
  // mã nhận hàng biến mất theo, và nếu khách đang giữ đường dẫn thì đường dẫn
  // đó chết luôn. Câu hỏi lại in cả mã đơn để chủ shop soi lại trước khi gật.
  function adminDonXoa(khoa){
    const don = donTheoKhoa(khoa);
    if (!don || !firebaseSanSang || !rtdb) return;
    const ten = don.maDon || khoa;
    if (!window.confirm(
      'Xoá hẳn đơn ' + ten + ' khỏi Firebase?\n\n' +
      'KHÔNG KHÔI PHỤC ĐƯỢC. Mã nhận hàng của đơn này mất theo, và nếu khách đang ' +
      'giữ đường dẫn nhận hàng thì đường dẫn đó chết luôn.')) return;

    const k = khoDon();
    k.dangLam = khoa;
    veLaiDonHang();
    rtdb.ref('donhang/' + khoa).remove().then(function(){
      k.dangLam = '';
      k.danhSach = k.danhSach.filter(function(d){ return d.khoa !== khoa; });
      if (k.moRong === khoa) k.moRong = '';
      delete k.thietBi[khoa];
      veLaiDonHang();
    }).catch(function(e){
      console.error('Không xoá được đơn ' + khoa + ':', e);
      k.dangLam = '';
      veLaiDonHang();
      alert('Không xoá được. Firebase từ chối hoặc mất mạng.');
    });
  }

  function adminDonMoKhoa(khoa, maSP){
    const don = donTheoKhoa(khoa);
    if (!don || !don.maNhanHang || !maSP || !firebaseSanSang || !rtdb) return;
    const ten = (timSanPham(maSP) || {}).ten || maSP;
    if (!window.confirm('Cấp quyền lại cho “' + ten + '”?\n\n' +
      'Máy cũ của khách sẽ bị quên đi. Lần tải kế tiếp mở khoá trên máy nào thì gắn vào máy đó.')) return;
    const k = khoDon();
    rtdb.ref('thietbi/' + don.maNhanHang + '/' + maSP).remove().then(function(){
      const bang = k.thietBi[khoa];
      if (bang && typeof bang === 'object') delete bang[maSP];
      veLaiDonHang();
    }).catch(function(e){
      console.error('Không mở khoá được thiết bị:', e);
      alert('Không mở khoá được. Firebase từ chối hoặc mất mạng.');
    });
  }
