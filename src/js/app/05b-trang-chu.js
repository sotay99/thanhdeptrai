
  /* ===========================================================================
     PHẦN 05B — MODULE "TRANG CHỦ" (landingpage quảng bá)

     Trang chủ TRƯỚC ĐÂY để trống (rơi vào khung "đang nâng cấp" chung, xem
     veManNangCap ở PHẦN 02) — nay là landingpage thật: tóm tắt 7 mảng nội
     dung của shop theo đúng thứ tự đã chốt, mỗi mảng có ảnh đại diện TÁI
     DÙNG từ các module gốc (không vẽ ảnh mới, trừ dd-app-vip-pro.svg vì
     module "Mua App VIP Pro" chưa có ảnh đại diện riêng).

     HAI HIỆU ỨNG CHUYỂN ĐỘNG, tách bạch với module "Trọn bộ sản phẩm VIP"
     (PHẦN 03) để không đụng cơ chế trôi-khi-vào-module đã có ở đó:
       1. .tc-khoi / .tc-the "trôi ra" khi cuộn tới — KHÁC cơ chế
          cho-troi-len/dang-troi-len của PHẦN 03 (vào module là trôi theo
          thời gian hoặc theo mép màn hình MỘT LẦN duy nhất lúc vào trang).
          Ở đây dùng IntersectionObserver: phần tử nào đỉnh vừa chạm viewport
          lúc cuộn thì trôi ra, mỗi phần tử một lần (unobserve ngay sau đó).
          Xem ganHieuUngTrangChu(), gọi từ render() (PHẦN 02) mỗi lần vẽ lại
          trang — vô hại ở module khác vì querySelector không tìm thấy gì.
       2. .tc-anh bồng bềnh — TÁI DÙNG nguyên @keyframes bong-benh-anh đã có
          (định nghĩa trong src/css/app.css, dùng chung cho .the-sanpham
          .anh-dai-dien), chỉ thêm selector mới trong CSS, không viết lại
          keyframe.

     Bấm vào bất kỳ thẻ/mục nào ở đây → moMenu() rồi moModule(ma): CHỦ ĐỘNG
     MỞ khung menu bên phải trước khi nhảy module (moModule() sẵn KHÔNG tự
     đóng menu — xem PHẦN 02), để khách thấy hết các mục còn lại ở menu.
     =========================================================================== */

  // "Khối" = một mảng nội dung trên trang chủ. kieu 'luoi' vẽ nhiều thẻ nhỏ
  // (mỗi thẻ một ảnh + tên + dẫn tới module); kieu 'don' vẽ một thẻ to duy
  // nhất đại diện cho cả module (dùng khi bản thân module không có nhiều
  // "món" tách bạch để liệt kê, hoặc liệt kê hết sẽ quá dài — App VIP Pro).
  const TRANG_CHU_KHOI = [
    {
      id: 'khoa-hoc-mien-phi',
      tieuDe: '3 khoá học miễn phí',
      moTa: 'Học chỉnh màu Lightroom và Photoshop ngay trên điện thoại hoặc máy tính — không mất một đồng nào.',
      nhan: 'Miễn phí',
      kieu: 'luoi',
      muc: [
        { ten: 'Khoá học chỉnh màu Lightroom điện thoại', anh: '/assets/anh/dd-sp4.svg', module: 'khoa-hoc-mobile' },
        { ten: 'Khoá học Lightroom máy tính PC', anh: '/assets/anh/dd-sp5.svg', module: 'khoa-hoc-may-tinh' },
        { ten: 'Khoá Photoshop - edit ảnh bằng điện thoại', anh: '/assets/anh/dd-khoa-photoshop.svg', module: 'khoa-photoshop' }
      ]
    },
    {
      id: 'qua-tang-android',
      tieuDe: 'Quà tặng cho người dùng điện thoại Android',
      moTa: 'Preset màu và app chỉnh ảnh VIP — tặng hẳn, không cần mua gì trước.',
      nhan: 'Miễn phí',
      kieu: 'luoi',
      // 5 món của module (PHẦN 03F): mảng QUA_TANG_ANDROID đọc tại lúc gọi
      // hàm vẽ (không đọc ngay lúc khai const này) nên thứ tự nạp file
      // trong manifest không quan trọng.
      layMuc: function(){
        return QUA_TANG_ANDROID.map(function(q){ return { ten: q.ten, anh: q.anh, module: 'qua-tang-android' }; });
      }
    },
    {
      id: 'goi-vip',
      tieuDe: 'Trọn bộ sản phẩm VIP cho Lightroom, Photoshop và Thiết kế',
      moTa: 'Chọn càng nhiều càng rẻ — mỗi sản phẩm được giảm thêm ' + GIAM_MOI_SAN_PHAM + '% ở bước chốt đơn.',
      kieu: 'luoi',
      layMuc: function(){
        return SAN_PHAM.map(function(sp){ return { ten: sp.ten, anh: ANH_DAI_DIEN[sp.ma], module: 'goi-vip' }; });
      }
    },
    {
      id: 'app-vip-pro',
      tieuDe: 'Mua App VIP Pro giá rẻ',
      moTa: '20 app chỉnh ảnh, selfie và thiết kế bản VIP đã mở khoá hết tính năng, giá chỉ một phần nhỏ giá gốc.',
      kieu: 'don',
      module: 'app-vip-pro',
      anh: '/assets/anh/dd-app-vip-pro.svg',
      layDanhSachNhom: function(){
        return NHOM_APP_VIP.map(function(n){
          return {
            ten: n.ten,
            apps: APP_VIP_PRO.filter(function(a){ return a.nhom === n.ma; }).map(function(a){ return a.ten; }).join(', ')
          };
        });
      }
    },
    {
      id: 'video-ngan',
      tieuDe: 'Xem video ngắn',
      moTa: 'Mẹo chỉnh ảnh, review preset và hướng dẫn nhanh — xem lướt qua trong vài chục giây mỗi video.',
      kieu: 'don',
      module: 'video-ngan',
      anh: '/assets/anh/dd-video-ngan.svg'
    },
    {
      id: 'cong-nhan',
      tieuDe: 'Sự công nhận của khách hàng',
      moTa: 'Hơn 1.000 khách đã mua — giao dịch, đoạn chat và lời cảm ơn thật, không dàn dựng.',
      kieu: 'don',
      module: 'cong-nhan',
      icon: '★'
    },
    {
      id: 'lien-he',
      tieuDe: 'Liên hệ và Thông tin về Shop',
      moTa: 'Zalo, WhatsApp, Telegram, Fanpage... đủ cách để shop hỗ trợ bạn nhanh nhất.',
      kieu: 'don',
      module: 'lien-he',
      icon: '☎'
    }
  ];

  // --------------------------------------------------------------- VẼ NỘI DUNG

  function veTheTrangChu(muc){
    return '' +
      '<article class="tc-the cho-troi-len" data-hanh-dong="tc-vao-module" data-module="' +
        escapeHtml(muc.module) + '">' +
        '<figure class="tc-anh"><img src="' + muc.anh + '" width="84" height="84" loading="lazy" decoding="async"' +
          ' alt="Ảnh đại diện: ' + escapeHtml(muc.ten) + '"></figure>' +
        '<span class="tc-ten">' + escapeHtml(muc.ten) + '</span>' +
      '</article>';
  }

  // Thẻ đại diện DUY NHẤT cho cả module — anh (ảnh) hoặc icon (chữ/emoji),
  // kèm "noiDungThem" tuỳ khối (App VIP Pro chèn thêm danh sách 3 nhóm app).
  function veTheDonTrangChu(khoi){
    const anhHoacIcon = khoi.anh
      ? '<img src="' + khoi.anh + '" width="84" height="84" loading="lazy" decoding="async" alt="Ảnh đại diện: ' +
        escapeHtml(khoi.tieuDe) + '">'
      : '<span class="tc-icon" aria-hidden="true">' + khoi.icon + '</span>';
    const nhomApp = khoi.layDanhSachNhom ? khoi.layDanhSachNhom().map(function(n){
      return '<p class="tc-nhom-app"><strong>' + escapeHtml(n.ten) + ':</strong> ' + escapeHtml(n.apps) + '</p>';
    }).join('') : '';
    return '' +
      '<article class="tc-the tc-the-don cho-troi-len" data-hanh-dong="tc-vao-module" data-module="' +
        escapeHtml(khoi.module) + '">' +
        '<figure class="tc-anh">' + anhHoacIcon + '</figure>' +
        '<div class="tc-than-don">' +
          '<span class="tc-ten">' + escapeHtml(khoi.tieuDe) + '</span>' +
          nhomApp +
        '</div>' +
      '</article>';
  }

  function veKhoiTrangChu(khoi){
    const muc = khoi.layMuc ? khoi.layMuc() : (khoi.muc || []);
    const than = khoi.kieu === 'don'
      ? veTheDonTrangChu(khoi)
      : '<div class="tc-luoi">' + muc.map(veTheTrangChu).join('') + '</div>';
    return '' +
      '<section class="tc-khoi cho-troi-len" data-khoi="' + escapeHtml(khoi.id) + '">' +
        '<div class="tc-dau-khoi">' +
          '<h2>' + escapeHtml(khoi.tieuDe) + (khoi.nhan ? '<span class="tc-nhan">' + escapeHtml(khoi.nhan) + '</span>' : '') + '</h2>' +
          '<p>' + escapeHtml(khoi.moTa) + '</p>' +
        '</div>' +
        than +
      '</section>';
  }

  // Danh sách tên module cho hai thanh chạy chữ — TOÀN BỘ menu bên trái, trừ
  // chính "Trang chủ" (bấm vào tên mình thì chẳng dẫn đi đâu).
  function dsModuleChayChu(){
    return MODULE.filter(function(m){ return m.sanSang && m.ma !== 'trang-chu'; });
  }

  function veMarqueeTrangChu(id){
    const ds = dsModuleChayChu();
    const veMuc = function(m){
      return '<span class="tc-marquee-item" data-hanh-dong="tc-vao-module" data-module="' + escapeHtml(m.ma) + '">' +
        '<span aria-hidden="true">' + m.bieuTuong + '</span> ' + escapeHtml(m.ten) + '</span>';
    };
    // Lặp lại nguyên danh sách MỘT lần nữa, nối liền — mẹo cuộn vô hạn không
    // giật: animation chỉ cần trượt đúng 50% chiều ngang rồi lặp lại, lúc đó
    // nửa sau đã trùng khít nửa đầu của lượt kế tiếp.
    return '' +
      '<div class="tc-marquee" aria-hidden="true" id="' + id + '">' +
        '<div class="tc-marquee-track">' +
          ds.map(veMuc).join('') + ds.map(veMuc).join('') +
        '</div>' +
      '</div>';
  }

  function veModuleTrangChu(){
    const giua = Math.ceil(TRANG_CHU_KHOI.length / 2);
    const dauKhoi = TRANG_CHU_KHOI.slice(0, giua);
    const cuoiKhoi = TRANG_CHU_KHOI.slice(giua);
    return '' +
      '<section class="tc-hero cho-troi-len" data-khoi="hero">' +
        '<h1>Shop Thànhđẹptrai<span class="cham-xanh">.vn</span></h1>' +
        '<p>Lightroom, Photoshop và trọn bộ công cụ chỉnh ảnh chuyên nghiệp — giá tốt, giao ngay, ' +
          'hoàn tiền 100% nếu không hài lòng trong 15 ngày.</p>' +
      '</section>' +
      dauKhoi.map(veKhoiTrangChu).join('') +
      veMarqueeTrangChu('tc-marquee-giua') +
      cuoiKhoi.map(veKhoiTrangChu).join('') +
      veMarqueeTrangChu('tc-marquee-cuoi');
  }

  // --------------------------------------------------------- HÀNH ĐỘNG & HIỆU ỨNG

  // Bấm vào BẤT KỲ thành phần nào ở trang chủ: mở khung menu bên phải TRƯỚC
  // (moMenu(), không phải doiMenu() — không được đóng nếu đang mở), rồi mới
  // nhảy module. moModule() đã sẵn không tự đóng menu (PHẦN 02).
  function vaoModuleTuTrangChu(ma){
    moMenu();
    moModule(ma);
  }

  // IntersectionObserver: mỗi khối/thẻ có class cho-troi-len, đỉnh vừa chạm
  // viewport lúc cuộn là thêm dang-troi-len (CSS lo phần chuyển động), rồi
  // unobserve ngay — trôi một lần, cuộn lên xuống lại không giật lại.
  function ganHieuUngTrangChu(){
    const ds = document.querySelectorAll('.tc-khoi.cho-troi-len, .tc-the.cho-troi-len, .tc-hero.cho-troi-len');
    if (!ds.length) return;

    const tatChuyenDong = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (tatChuyenDong || typeof IntersectionObserver !== 'function') {
      ds.forEach(function(el){ el.classList.add('dang-troi-len'); });
      return;
    }

    const quanSat = new IntersectionObserver(function(entries, qs){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        entry.target.classList.add('dang-troi-len');
        qs.unobserve(entry.target);
      });
    }, { threshold: 0 });
    ds.forEach(function(el){ quanSat.observe(el); });
  }
