
  /* ===========================================================================
     PHẦN 04B — TRANG QUẢN TRỊ "/admin"

     ĐỌC KỸ TRƯỚC KHI SỬA — chỗ này giữ tiền và bí mật của shop.

     1. QUYỀN THẬT NẰM Ở database.rules.json, KHÔNG nằm ở đây.
        Hai email chủ shop được khai trong Rules. Mọi thứ trong tệp này chỉ là
        lớp lịch sự: ẩn nút, hiện lời từ chối. Người biết nghề mở console vẫn
        gọi thẳng Firebase được — và bị Rules chặn. Nếu có ngày ai đó bỏ điều
        kiện email trong Rules "cho tiện thử", cả kho hàng lẫn số tài khoản
        thành của chung.

     2. KHOÁ API CỦA AI KHÔNG BAO GIỜ ĐƯỢC ĐI QUA TRÌNH DUYỆT KHÁCH.
        Trang này cho chủ shop NHẬP khoá; nhánh giữ khoá cấm đọc công khai.
        Con chatbot sau này KHÔNG đọc khoá — nó hỏi Worker, Worker mới giữ khoá
        và gọi AI. Web tĩnh mà gọi thẳng API bằng khoá là biếu khoá cho bất kỳ
        ai mở tab Network.

     3. SDK ĐĂNG NHẬP NẠP ĐỘNG.
        firebase-auth-compat chỉ được tải khi có người mở "/admin". Khách mua
        hàng không phải tải một byte nào của nó. CSS quản trị cũng vậy.
     =========================================================================== */

  // Hai email này cũng có mặt trong database.rules.json. Đổi ở đây mà quên đổi
  // trong Rules thì người mới vẫn không ghi được gì — và ngược lại, đổi trong
  // Rules mà quên ở đây thì họ đăng nhập xong nhìn thấy lời từ chối. Hợp đồng
  // regex canh cho hai nơi luôn khớp nhau.
  const EMAIL_CHU_SHOP = [
    'lookatmevanthanhpham@gmail.com',
    '219thanhdeptrai@gmail.com'
  ];

  const AUTH_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js';
  const CSS_ADMIN = '/assets/css/admin.css';
  const GIAY_HIEN_DA_LUU = 3;

  const MODULE_ADMIN = [
    { ma: 'tong-quan',   ten: 'Tổng quan',              bieuTuong: '◉' },
    { ma: 'khoa-ai',     ten: 'Khoá AI',                bieuTuong: '🔑' },
    { ma: 'lien-he',     ten: 'Liên hệ và mạng xã hội', bieuTuong: '💬' },
    { ma: 'nhan-tien',   ten: 'Thông tin nhận tiền',    bieuTuong: '🏦' },
    { ma: 'danh-muc',    ten: 'Danh mục sản phẩm',      bieuTuong: '📦' },
    { ma: 'don-hang',    ten: 'Đơn hàng',               bieuTuong: '🧾' }
  ];

  // --------------------------------------------------------- KHAI BÁO CÁC Ô
  //
  // Mỗi ô cài đặt khai một dòng ở đây, không viết HTML tay từng cái. Thêm một
  // mục cài đặt mới về sau chỉ là thêm một dòng.
  //
  //   nhanh   — nhánh trong Realtime Database
  //   truong  — tên trường trong nhánh đó
  //   kieu    — 'chu' | 'so' | 'link' | 'bimat'
  //   goi     — câu gợi ý hiện mờ trong ô nhập

  const O_LIEN_HE = [
    { truong: 'zalo',        ten: 'Số Zalo của shop', kieu: 'so',
      goi: '0912345678',
      ghiChu: 'Đây là số mà nút “Liên hệ Zalo” ngoài web dẫn tới. Sửa xong là đổi ngay, không phải deploy lại.' },
    { truong: 'zaloLienKet', ten: 'Số Zalo shop liên kết', kieu: 'so',
      goi: 'Để trống nếu chưa có',
      ghiChu: 'Dành cho shop đối tác. Chỗ hiển thị ngoài web sẽ làm sau; để trống thì không có gì hiện ra cả.' },
    { truong: 'tiktok',      ten: 'Link TikTok',            kieu: 'link', goi: 'https://tiktok.com/@...' },
    { truong: 'youtube',     ten: 'Link YouTube',           kieu: 'link', goi: 'https://youtube.com/@...' },
    { truong: 'fanpage',     ten: 'Link Fanpage Facebook',  kieu: 'link', goi: 'https://facebook.com/...' },
    { truong: 'groupFB',     ten: 'Link Group Facebook',    kieu: 'link', goi: 'https://facebook.com/groups/...' }
  ];

  const O_NHAN_TIEN = [
    { truong: 'nganHang',       ten: 'Tên ngân hàng',       kieu: 'chu', goi: 'Tên ngân hàng của bạn' },
    { truong: 'maNganHang',     ten: 'Mã ngân hàng',        kieu: 'chu', goi: '970423',
      ghiChu: 'Mã dùng để sinh mã QR. Sai mã là QR quét ra sai ngân hàng.' },
    { truong: 'soTaiKhoan',     ten: 'Số tài khoản',        kieu: 'chu', goi: '000000000' },
    { truong: 'tenChuTaiKhoan', ten: 'Tên chủ tài khoản',   kieu: 'chu', goi: 'NGUYEN VAN A',
      ghiChu: 'Viết HOA, không dấu — đúng như ngân hàng hiển thị.' },
    { truong: 'loiNhanQR',      ten: 'Lời nhắn hiện dưới mã QR', kieu: 'chu',
      goi: 'Chuyển xong chờ khoảng 1 phút nhé',
      ghiChu: 'Để trống thì không hiện gì thêm.' }
  ];

  const O_KHOA_AI = [
    { truong: 'khoa',      ten: 'Khoá API', kieu: 'bimat', goi: 'Dán khoá vào đây',
      ghiChu: 'Khoá này KHÔNG bao giờ đi qua trình duyệt khách. Chỉ máy chủ trung gian đọc nó để gọi AI.' },
    { truong: 'nhaCungCap', ten: 'Nhà cung cấp', kieu: 'chu', goi: 'anthropic' },
    { truong: 'model',      ten: 'Tên model',    kieu: 'chu', goi: 'claude-...' }
  ];

  // ------------------------------------------------------------- ĐĂNG NHẬP

  function laChuShop(email){
    return EMAIL_CHU_SHOP.indexOf(String(email || '').toLowerCase()) !== -1;
  }

  // Nạp một tệp ngoài đúng MỘT lần, dù được gọi bao nhiêu lần.
  const daNap = {};
  function napMotLan(dia, la){
    if (daNap[dia]) return daNap[dia];
    daNap[dia] = new Promise(function(xong, hong){
      const el = document.createElement(la === 'css' ? 'link' : 'script');
      if (la === 'css') { el.rel = 'stylesheet'; el.href = dia; }
      else { el.src = dia; }
      el.onload = function(){ xong(true); };
      el.onerror = function(){ hong(new Error('Không nạp được ' + dia)); };
      document.head.appendChild(el);
    });
    return daNap[dia];
  }

  function chuanBiAdmin(){
    napMotLan(CSS_ADMIN, 'css').catch(function(e){ console.error(e); });
    if (!firebaseSanSang) {
      state.admin.sanSang = true;
      state.admin.loi = 'Chưa nối được Firebase nên không đăng nhập được.';
      render();
      return;
    }
    napMotLan(AUTH_SDK, 'js').then(function(){
      firebase.auth().onAuthStateChanged(function(nguoi){
        state.admin.sanSang = true;
        state.admin.dangDangNhap = false;
        if (!nguoi) {
          state.admin.nguoiDung = null;
          state.admin.duocPhep = false;
        } else {
          state.admin.nguoiDung = {
            email: String(nguoi.email || '').toLowerCase(),
            ten: nguoi.displayName || '',
            anh: nguoi.photoURL || ''
          };
          state.admin.duocPhep = laChuShop(state.admin.nguoiDung.email);
        }
        render();
        if (state.admin.duocPhep) taiCaiDatAdmin();
      });
    }).catch(function(e){
      console.error(e);
      state.admin.sanSang = true;
      state.admin.loi = 'Không tải được thành phần đăng nhập. Kiểm tra lại mạng rồi tải lại trang.';
      render();
    });
  }

  function dangNhapGoogle(){
    if (!firebaseSanSang || !window.firebase || !firebase.auth) return;
    state.admin.dangDangNhap = true;
    state.admin.loi = '';
    render();
    const nhaCungCap = new firebase.auth.GoogleAuthProvider();
    nhaCungCap.setCustomParameters({ prompt: 'select_account' });
    firebase.auth().signInWithPopup(nhaCungCap).catch(function(e){
      state.admin.dangDangNhap = false;
      // Khách tự đóng cửa sổ đăng nhập không phải là lỗi, đừng doạ họ.
      state.admin.loi = (e && e.code === 'auth/popup-closed-by-user')
        ? ''
        : 'Đăng nhập không thành công: ' + ((e && e.message) || 'lỗi không rõ');
      render();
    });
  }

  function dangXuat(){
    if (!window.firebase || !firebase.auth) return;
    firebase.auth().signOut().catch(function(e){ console.error(e); });
  }

  // --------------------------------------------------------- ĐỌC / GHI CÀI ĐẶT

  const NHANH_ADMIN = {
    'lien-he':   'thongtinlienhe',
    'nhan-tien': 'thongtinthanhtoan',
    'khoa-ai':   'admin/khoaAI',
    'kho':       'thongtinkho'
  };

  function taiCaiDatAdmin(){
    if (!firebaseSanSang || !rtdb) return;
    Object.keys(NHANH_ADMIN).forEach(function(khoa){
      rtdb.ref(NHANH_ADMIN[khoa]).once('value').then(function(anh){
        state.admin.duLieu[khoa] = (anh && anh.val()) || {};
        if (state.trang === 'admin') render();
      }).catch(function(e){
        // Nhánh khoá AI bị Rules chặn khi email không đúng — đó là chuyện ĐÚNG,
        // ghi ra console thôi, không doạ người dùng bằng bảng lỗi đỏ.
        console.error('Không đọc được nhánh ' + NHANH_ADMIN[khoa] + ':', e);
        state.admin.duLieu[khoa] = {};
      });
    });
  }

  function luuCaiDat(khoa, truong, giaTri){
    if (!firebaseSanSang || !rtdb) return;
    const nhanh = NHANH_ADMIN[khoa];
    if (!nhanh) return;
    const nut = truong;
    state.admin.dangLuu = nut;
    capNhatMotO(khoa, truong);
    const thayDoi = {};
    thayDoi[truong] = giaTri;
    rtdb.ref(nhanh).update(thayDoi).then(function(){
      state.admin.duLieu[khoa] = state.admin.duLieu[khoa] || {};
      state.admin.duLieu[khoa][truong] = giaTri;
      state.admin.dangLuu = '';
      state.admin.vuaLuu = nut;
      capNhatMotO(khoa, truong);
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== nut) return;
        state.admin.vuaLuu = '';
        capNhatMotO(khoa, truong);
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được ' + nhanh + '/' + truong + ':', e);
      state.admin.dangLuu = '';
      state.admin.vuaLuu = '';
      capNhatMotO(khoa, truong);
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.\n\n' +
        'Nếu bạn vừa đổi email đăng nhập, hãy kiểm tra lại database.rules.json.');
    });
  }

  // ------------------------------------------------------------------ VẼ

  function veTrangAdmin(){
    const a = state.admin;
    if (!a.sanSang) return veAdminDangCho();
    if (!a.nguoiDung) return veAdminManDangNhap();
    if (!a.duocPhep) return veAdminTuChoi();
    return veAdminBenTrong();
  }

  function veAdminDangCho(){
    return '<div class="admin-giua"><div class="admin-the-giua">' +
      '<p class="admin-dang-cho">Đang kiểm tra đăng nhập…</p>' +
      '</div></div>';
  }

  function veAdminManDangNhap(){
    const a = state.admin;
    return '<div class="admin-giua"><div class="admin-the-giua">' +
      '<div class="admin-khoa" aria-hidden="true">🔒</div>' +
      '<h2>Trang quản trị</h2>' +
      '<p class="admin-phu">Khu vực riêng của chủ shop. Đăng nhập bằng tài khoản Google đã được cấp quyền.</p>' +
      (a.loi ? '<p class="admin-loi">' + escapeHtml(a.loi) + '</p>' : '') +
      '<button type="button" class="nut nut-chinh nut-rong nut-dang-nhap" data-hanh-dong="admin-dang-nhap"' +
        (a.dangDangNhap ? ' disabled' : '') + '>' +
        (a.dangDangNhap ? 'Đang mở cửa sổ đăng nhập…' : 'Đăng nhập bằng Google') +
      '</button>' +
      '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="ve-trang-mua-hang">Về trang bán hàng</button>' +
      '</div></div>';
  }

  function veAdminTuChoi(){
    const a = state.admin;
    return '<div class="admin-giua"><div class="admin-the-giua">' +
      '<div class="admin-khoa" aria-hidden="true">⛔</div>' +
      '<h2>Tài khoản này không có quyền</h2>' +
      '<p class="admin-phu">Bạn đang đăng nhập bằng <strong>' + escapeHtml(a.nguoiDung.email) + '</strong>. ' +
        'Trang quản trị chỉ mở cho tài khoản của chủ shop.</p>' +
      '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="admin-dang-xuat">Đăng xuất và thử tài khoản khác</button>' +
      '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="ve-trang-mua-hang">Về trang bán hàng</button>' +
      '</div></div>';
  }

  function veAdminBenTrong(){
    const a = state.admin;
    const muc = MODULE_ADMIN.map(function(m){
      return '<button type="button" class="admin-muc' + (m.ma === a.module ? ' dang-xem' : '') +
        '" data-hanh-dong="admin-mo-module" data-module="' + escapeHtml(m.ma) + '">' +
        '<span class="bieu-tuong" aria-hidden="true">' + m.bieuTuong + '</span>' +
        '<span class="chu">' + escapeHtml(m.ten) + '</span></button>';
    }).join('');

    return '' +
      '<div class="admin-khung">' +
        '<aside class="admin-canh">' +
          '<div class="admin-nguoi">' +
            '<span class="nhan">Đang đăng nhập</span>' +
            '<span class="email">' + escapeHtml(a.nguoiDung.email) + '</span>' +
          '</div>' +
          '<nav class="admin-danh-sach" aria-label="Danh sách cài đặt">' + muc + '</nav>' +
          '<div class="admin-canh-day">' +
            '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="admin-dang-xuat">Đăng xuất</button>' +
            '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="ve-trang-mua-hang">Về trang bán hàng</button>' +
          '</div>' +
        '</aside>' +
        '<section class="admin-noi-dung">' + veModuleAdmin(a.module) + '</section>' +
      '</div>';
  }

  function veModuleAdmin(ma){
    if (ma === 'tong-quan') return veAdminTongQuan();
    if (ma === 'lien-he')   return veAdminNhomO('lien-he', 'Liên hệ và mạng xã hội',
      'Sửa ở đây là ngoài web đổi theo ngay, không phải deploy lại. Ô nào để trống thì nút tương ứng ngoài web tự ẩn đi.',
      O_LIEN_HE);
    if (ma === 'nhan-tien') return veAdminNhanTien();
    if (ma === 'khoa-ai')   return veAdminKhoaAI();
    return veAdminChuaLam(ma);
  }

  function veAdminChuaLam(ma){
    const m = MODULE_ADMIN.filter(function(x){ return x.ma === ma; })[0];
    const ten = m ? m.ten : ma;
    const vi = (ma === 'danh-muc' || ma === 'don-hang')
      ? 'Phần này cần máy chủ kho (Worker) mới chạy được — nó phải đọc danh sách file thật trong R2. ' +
        'Dựng xong Worker là mở được ngay.'
      : 'Phần này đang được xây dựng.';
    return '<header class="admin-dau"><h2>' + escapeHtml(ten) + '</h2></header>' +
      '<div class="admin-trong"><p>' + escapeHtml(vi) + '</p></div>';
  }

  function veAdminTongQuan(){
    const a = state.admin;
    const lienHe = a.duLieu['lien-he'] || {};
    const tien = a.duLieu['nhan-tien'] || {};
    const kho = a.duLieu['kho'] || {};
    const dong = [
      ['Firebase', firebaseSanSang, firebaseSanSang ? 'Đã nối' : 'Chưa nối được'],
      ['Số Zalo của shop', !!lienHe.zalo, lienHe.zalo ? 'Đã khai' : 'Chưa khai — nút Liên hệ Zalo ngoài web sẽ báo lỗi'],
      ['Thông tin nhận tiền', !!(tien.soTaiKhoan && tien.maNganHang),
        (tien.soTaiKhoan && tien.maNganHang) ? 'Đã khai' : 'Chưa đủ — mã QR không sinh được'],
      ['Máy chủ kho (Worker)', !!kho.mayChu, kho.mayChu ? 'Đã khai' : 'Chưa dựng — trang nhận hàng chưa tải được file']
    ].map(function(d){
      return '<div class="admin-dong-trang-thai' + (d[1] ? ' xanh' : ' vang') + '">' +
        '<span class="ten">' + escapeHtml(d[0]) + '</span>' +
        '<span class="tri">' + escapeHtml(d[2]) + '</span></div>';
    }).join('');

    return '<header class="admin-dau">' +
        '<h2>Tổng quan</h2>' +
        '<p>Nhìn một lượt là biết hệ thống có đang chạy đủ hay không.</p>' +
      '</header>' +
      '<div class="admin-bang-trang-thai">' + dong + '</div>';
  }

  function veAdminNhanTien(){
    return veAdminNhomO('nhan-tien', 'Thông tin nhận tiền',
      'Đây là số tài khoản mã QR sẽ trỏ tới. Sửa sai một chữ số là tiền của khách đi lạc, nên soát kỹ trước khi lưu.',
      O_NHAN_TIEN);
  }

  function veAdminKhoaAI(){
    return veAdminNhomO('khoa-ai', 'Khoá AI',
      'Khoá này chỉ máy chủ trung gian đọc để gọi AI. Chatbot ngoài web KHÔNG bao giờ chạm vào nó — ' +
      'web tĩnh mà gọi thẳng API bằng khoá là biếu khoá cho bất kỳ ai mở tab Network của trình duyệt.',
      O_KHOA_AI);
  }

  // Một nhóm ô cài đặt. Mỗi ô tự lo phần hiển thị, nút Lưu và lời báo của nó.
  function veAdminNhomO(khoa, tieuDe, dan, danhSachO){
    const o = danhSachO.map(function(x){ return veMotO(khoa, x); }).join('');
    return '<header class="admin-dau">' +
        '<h2>' + escapeHtml(tieuDe) + '</h2>' +
        '<p>' + escapeHtml(dan) + '</p>' +
      '</header>' +
      '<div class="admin-nhom-o">' + o + '</div>';
  }

  function giaTriO(khoa, truong){
    const d = state.admin.duLieu[khoa] || {};
    return d[truong] == null ? '' : String(d[truong]);
  }

  // Khoá API không bao giờ hiện nguyên vẹn khi trang vừa mở. Người ta hay quản
  // trị web ở quán cà phê, ở văn phòng — có người đứng sau lưng là mất khoá.
  function cheBiMat(chuoi){
    const s = String(chuoi || '');
    if (!s) return '';
    if (s.length <= 8) return '••••••••';
    return s.slice(0, 4) + '••••••••••••' + s.slice(-4);
  }

  function veMotO(khoa, o){
    const gia = giaTriO(khoa, o.truong);
    const dangLuu = state.admin.dangLuu === o.truong;
    const vuaLuu = state.admin.vuaLuu === o.truong;
    const biMat = o.kieu === 'bimat';
    const kieuInput = (o.kieu === 'so') ? 'tel' : 'text';

    return '' +
      '<div class="admin-o" data-o="' + escapeHtml(khoa + ':' + o.truong) + '">' +
        '<label class="admin-nhan" for="o-' + escapeHtml(o.truong) + '">' + escapeHtml(o.ten) + '</label>' +
        (o.ghiChu ? '<p class="admin-ghi-chu">' + escapeHtml(o.ghiChu) + '</p>' : '') +
        '<div class="admin-hang-nhap">' +
          '<input type="' + kieuInput + '" id="o-' + escapeHtml(o.truong) + '" class="admin-nhap' +
            (biMat ? ' bi-mat' : '') + '" data-admin-truong="' + escapeHtml(khoa + ':' + o.truong) + '"' +
            ' autocomplete="off" spellcheck="false" placeholder="' + escapeHtml(o.goi || '') + '"' +
            ' value="' + escapeHtml(biMat ? cheBiMat(gia) : gia) + '"' +
            (biMat ? ' data-che="1" readonly' : '') + '>' +
          (biMat
            ? '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="admin-hien-bi-mat"' +
              ' data-o="' + escapeHtml(khoa + ':' + o.truong) + '">Sửa</button>'
            : '') +
          '<button type="button" class="nut nut-nho nut-chinh" data-hanh-dong="admin-luu-o"' +
            ' data-o="' + escapeHtml(khoa + ':' + o.truong) + '"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu') +
          '</button>' +
        '</div>' +
        '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
      '</div>';
  }

  // Vẽ lại đúng MỘT ô, không dựng lại cả trang — dựng lại cả trang thì con trỏ
  // nhập nhảy về đầu và chữ đang gõ dở bay mất.
  function capNhatMotO(khoa, truong){
    if (state.trang !== 'admin') return;
    const khung = document.querySelector('[data-o="' + khoa + ':' + truong + '"]');
    if (!khung) return;
    const danhSach = khoa === 'lien-he' ? O_LIEN_HE : (khoa === 'nhan-tien' ? O_NHAN_TIEN : O_KHOA_AI);
    const o = danhSach.filter(function(x){ return x.truong === truong; })[0];
    if (!o) return;
    const tam = document.createElement('div');
    tam.innerHTML = veMotO(khoa, o);
    khung.parentNode.replaceChild(tam.firstChild, khung);
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminMoModule(ma){
    state.admin.module = ma;
    render();
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  function adminHienBiMat(khoaTruong){
    const o = document.querySelector('[data-admin-truong="' + khoaTruong + '"]');
    if (!o) return;
    const phan = String(khoaTruong).split(':');
    o.removeAttribute('readonly');
    o.removeAttribute('data-che');
    o.value = giaTriO(phan[0], phan[1]);
    o.focus();
    o.select();
  }

  function adminLuuO(khoaTruong){
    const o = document.querySelector('[data-admin-truong="' + khoaTruong + '"]');
    if (!o) return;
    const phan = String(khoaTruong).split(':');
    // Ô bí mật còn đang che thì người dùng chưa bấm Sửa — lưu lúc này là ghi đè
    // khoá thật bằng chuỗi dấu chấm. Chặn hẳn.
    if (o.getAttribute('data-che')) {
      alert('Bấm nút “Sửa” trước rồi mới nhập khoá mới.');
      return;
    }
    let gia = String(o.value == null ? '' : o.value).trim();
    const danhSach = phan[0] === 'lien-he' ? O_LIEN_HE : (phan[0] === 'nhan-tien' ? O_NHAN_TIEN : O_KHOA_AI);
    const khai = danhSach.filter(function(x){ return x.truong === phan[1]; })[0];
    if (khai && khai.kieu === 'so') gia = gia.replace(/[^\d+]/g, '');
    if (khai && khai.kieu === 'link' && gia && !/^https?:\/\//i.test(gia)) gia = 'https://' + gia;
    luuCaiDat(phan[0], phan[1], gia);
  }
