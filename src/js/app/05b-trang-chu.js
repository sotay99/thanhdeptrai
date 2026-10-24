
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

     Bấm vào bất kỳ thẻ/mục nào ở đây (kể cả hai thanh chạy chữ, xen giữa các
     khối) → goiYMoModule(ma) (PHẦN 02): mở khung menu rồi cuộn-tới-và-nhấp-
     nháy đúng mục trong khung đó, CỐ Ý KHÔNG nhảy module — khách tự bấm mục
     đã nhấp nháy để thật sự vào đó. Hàm này còn dùng ở 3 nút quà tặng trong
     module "Trọn bộ sản phẩm VIP" (PHẦN 03) và ở hai thanh chạy chữ gắn thêm
     đầu/cuối MỌI module khác (xem veNoiDungModule(), PHẦN 02) — không viết
     riêng ở đây nữa.
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
      // Bỏ sp4/sp5 (hai "khoá học" trong SAN_PHAM, giá 0) — đã có mặt riêng ở
      // khối "3 khoá học miễn phí" phía trên, liệt kê lại ở đây là trùng.
      // Chỉ bỏ ở bản tóm tắt Trang chủ; module "goi-vip" THẬT vẫn đủ 9 sản
      // phẩm, không đụng tới.
      layMuc: function(){
        return SAN_PHAM.filter(function(sp){ return sp.ma !== 'sp4' && sp.ma !== 'sp5'; })
          .map(function(sp){ return { ten: sp.ten, anh: ANH_DAI_DIEN[sp.ma], module: 'goi-vip' }; });
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
      nhan: 'Miễn phí',
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

  // Độ trễ (giây) trước khi ảnh đại diện bắt đầu bồng bềnh — Y CHANG cách làm
  // ở TRE_BONG_BENH (PHẦN 01B, module "Trọn bộ sản phẩm VIP"): vài số lẻ,
  // không chia hết cho nhau, để nhiều ảnh gần nhau không nhấp nhô cùng lúc.
  // Trang chủ có nhiều thẻ hơn 9 món của TRE_BONG_BENH nên lặp vòng qua mảng
  // này (biChiSoTreBongBenh tăng dần mỗi thẻ, reset ở đầu veModuleTrangChu()).
  const DAY_TRE_BONG_BENH_TC = [1.5, 2.7, 0.6, 4.1, 3.3, 5.4, 1.9, 6.2, 3.8, 0.9, 5.0, 2.2];
  let biChiSoTreBongBenh = 0;
  function treBongBenhTiepTheo(){
    const tre = DAY_TRE_BONG_BENH_TC[biChiSoTreBongBenh % DAY_TRE_BONG_BENH_TC.length];
    biChiSoTreBongBenh++;
    return tre;
  }

  function veTheTrangChu(muc){
    const tre = treBongBenhTiepTheo();
    return '' +
      '<article class="tc-the cho-troi-len" data-hanh-dong="nhap-nhay-module" data-module="' +
        escapeHtml(muc.module) + '">' +
        '<figure class="tc-anh" style="animation-delay:' + tre + 's">' +
          '<img src="' + muc.anh + '" width="84" height="84" loading="lazy" decoding="async"' +
          ' alt="Ảnh đại diện: ' + escapeHtml(muc.ten) + '"></figure>' +
        '<span class="tc-ten">' + escapeHtml(muc.ten) + '</span>' +
      '</article>';
  }

  // Thẻ đại diện DUY NHẤT cho cả module — anh (ảnh) hoặc icon (chữ/emoji),
  // kèm "noiDungThem" tuỳ khối (App VIP Pro chèn thêm danh sách 3 nhóm app).
  function veTheDonTrangChu(khoi){
    const tre = treBongBenhTiepTheo();
    const anhHoacIcon = khoi.anh
      ? '<img src="' + khoi.anh + '" width="84" height="84" loading="lazy" decoding="async" alt="Ảnh đại diện: ' +
        escapeHtml(khoi.tieuDe) + '">'
      : '<span class="tc-icon" aria-hidden="true">' + khoi.icon + '</span>';
    const nhomApp = khoi.layDanhSachNhom ? khoi.layDanhSachNhom().map(function(n){
      return '<p class="tc-nhom-app"><strong>' + escapeHtml(n.ten) + ':</strong> ' + escapeHtml(n.apps) + '</p>';
    }).join('') : '';
    return '' +
      '<article class="tc-the tc-the-don cho-troi-len" data-hanh-dong="nhap-nhay-module" data-module="' +
        escapeHtml(khoi.module) + '">' +
        '<figure class="tc-anh" style="animation-delay:' + tre + 's">' + anhHoacIcon + '</figure>' +
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

  // Hai thanh chạy chữ dùng chung veThanhChayModule() (PHẦN 02) — cũng là
  // hàm gắn thêm đầu/cuối MỌI module khác, nên id ở đây phải khác id những
  // nơi đó dùng để không trùng trong cùng một DOM.
  function veModuleTrangChu(){
    // Reset về đầu mảng DAY_TRE_BONG_BENH_TC mỗi lần vẽ lại — vào lại Trang
    // chủ bao nhiêu lần cũng ra đúng một kiểu so le, không cộng dồn lệch pha.
    biChiSoTreBongBenh = 0;
    // Cố định ngay SAU khối "goi-vip" (chỉ số 2: khoa-hoc-mien-phi, qua-tang-
    // android, goi-vip) và TRƯỚC "app-vip-pro" — không chia đôi theo số lượng
    // khối như trước, vì vị trí này đã được chốt rõ.
    const giua = 3;
    const dauKhoi = TRANG_CHU_KHOI.slice(0, giua);
    const cuoiKhoi = TRANG_CHU_KHOI.slice(giua);
    return '' +
      '<div class="tc-landing">' +
        '<section class="tc-hero cho-troi-len" data-khoi="hero">' +
          '<h1>Shop Thànhđẹptrai<span class="cham-xanh">.vn</span></h1>' +
          '<p>Lightroom, Photoshop và trọn bộ công cụ chỉnh ảnh chuyên nghiệp — giá tốt, giao ngay, ' +
            'hoàn tiền 100% nếu không hài lòng trong 15 ngày.</p>' +
        '</section>' +
        dauKhoi.map(veKhoiTrangChu).join('') +
        veThanhChayModule('tc-marquee-giua') +
        cuoiKhoi.map(veKhoiTrangChu).join('') +
        veThanhChayModule('tc-marquee-cuoi') +
      '</div>';
  }

  // --------------------------------------------------------- HIỆU ỨNG CUỘN

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
