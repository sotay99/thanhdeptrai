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
        dangLam: ''      // thao tác đang chạy, để nút tự khoá lại
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
      // Firebase trả theo thứ tự tăng dần; đơn mới nhất phải nằm trên đầu.
      ds.reverse();
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

    const lienLac = [
      ['Email', don.email],
      ['Zalo', don.zalo],
      ['Điện thoại', don.dienThoai]
    ].filter(function(d){ return d[1]; }).map(function(d){
      return '<div class="dong-lien-lac"><span class="nhan">' + escapeHtml(d[0]) + '</span>' +
        '<span class="tri">' + escapeHtml(String(d[1])) + '</span>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="sao-chep"' +
        ' data-chuoi="' + escapeHtml(String(d[1])) + '">Sao chép</button></div>';
    }).join('') || '<p class="khong-lien-lac">Khách không để lại thông tin liên lạc nào.</p>';

    return '' +
      '<article class="admin-the-don" data-the-don="' + escapeHtml(don.khoa) + '">' +
        '<header class="dau-don">' +
          '<div class="dau-don-trai">' +
            '<span class="ma-don">' + escapeHtml(don.maDon || don.khoa) + '</span>' +
            '<span class="luc-don">' + escapeHtml(gioPhutNgay(don.taoLuc)) + '</span>' +
          '</div>' +
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
        veKhoiThietBi(don, moRong) +
        '<footer class="day-don">' + veNutTrangThai(don, tt, dangLam) + '</footer>' +
      '</article>';
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
    if (tt !== 'daGui') {
      nut.push(['daGui', 'Đánh dấu đã gửi', 'nut-chinh']);
    }
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

  function adminDonDoiLoc(loc){
    const k = khoDon();
    if (!loc || k.loc === loc) return;
    k.loc = loc;
    k.danhSach = [];
    k.moRong = '';
    render();
    taiDanhSachDon();
  }

  function adminDonTaiLai(){
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
