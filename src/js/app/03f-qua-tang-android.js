  /* ===========================================================================
     PHẦN 03F — MODULE "QUÀ TẶNG DÀNH CHO THIẾT BỊ ANDROID"

     Lưới 5 sản phẩm, thẻ LỚN y khuôn thẻ sản phẩm ở module "Trọn bộ sản phẩm
     VIP" (PHẦN 03):

       1. Lightroom — CHÍNH LÀ sp1 của module kia, nhúng lại NGUYÊN
          veTheSanPham(timSanPham('sp1'), 0, 'mua-ngay') — cheDo 'mua-ngay' đổi
          nút cuối thẻ thành "Mua hàng", bấm là mở thẳng modal "Xác nhận đơn
          hàng" (xem muaHangNgay ở PHẦN 03), tận dụng lại TOÀN BỘ hạ tầng
          mua–giao hàng–email có sẵn của sp1. Mã sản phẩm, giá, QR, email admin
          và khách hàng đều y hệt bên module gốc.

       2-5. PicsArt, Remini, SnapEdit, XingTu — KHÔNG có mã sản phẩm riêng,
          KHÔNG giá, KHÔNG đơn hàng, KHÔNG email nào cả. Dòng giá vẫn giữ,
          hiện chữ "MIỄN PHÍ" (giống cách sp4/sp5 — hai khoá học — hiển thị).
          Nút "Xem chi tiết sản phẩm" mở bảng rỗng (nội dung để chủ shop thiết
          kế sau). Nút cuối thẻ là "Sử dụng sản phẩm này", mở bảng "Hướng dẫn
          sử dụng" — DÙNG CHUNG một bài hướng dẫn cài APK tổng quát (xem
          NOI_DUNG_HUONG_DAN_QUA_TANG), chỉ đổi tên app. Bảng đó có nút cuối
          "Tải file APK về máy và cài đặt" dẫn tới link MediaFire của đúng sản
          phẩm — link KHÔNG để cứng trong mã nguồn, đọc từ nhánh Firebase công
          khai quaTangAndroid (admin tự sửa trong /admin, xem O_QUA_TANG_ANDROID
          ở PHẦN 04B), tái dùng NGUYÊN cơ chế "một ô, một nút Lưu".

     Ảnh đại diện 2-5 tái dùng ẢNH ĐÃ CẮT của module "Mua App VIP Pro"
     (PHẦN 03E) — XingTu mượn ảnh Hypic vì không có ảnh riêng.
     =========================================================================== */

  const QUA_TANG_ANDROID = [
    { ma: 'qt-picsart',  ten: 'PicsArt',  anh: '/assets/anh/app-vip-picsart.jpg'  },
    { ma: 'qt-remini',   ten: 'Remini',   anh: '/assets/anh/app-vip-remini.jpg'   },
    { ma: 'qt-snapedit', ten: 'SnapEdit', anh: '/assets/anh/app-vip-snapedit.jpg' },
    { ma: 'qt-xingtu',   ten: 'XingTu',   anh: '/assets/anh/app-vip-hypic.jpg'    }
  ];

  // Link MediaFire của từng app — admin khai trong /admin, tái dùng cơ chế
  // "một ô, một nút Lưu" (veMotO/luuCaiDat ở PHẦN 04B). Trường ở đây khớp
  // ĐÚNG tên trường trong database.rules.json nhánh quaTangAndroid.
  const O_QUA_TANG_ANDROID = [
    { truong: 'linkPicsart',  ten: 'Link MediaFire — PicsArt',  kieu: 'link',
      goi: 'https://www.mediafire.com/file/.../PicsArt.apk/file' },
    { truong: 'linkRemini',   ten: 'Link MediaFire — Remini',   kieu: 'link',
      goi: 'https://www.mediafire.com/file/.../Remini.apk/file' },
    { truong: 'linkSnapedit', ten: 'Link MediaFire — SnapEdit', kieu: 'link',
      goi: 'https://www.mediafire.com/file/.../SnapEdit.apk/file' },
    { truong: 'linkXingtu',   ten: 'Link MediaFire — XingTu',   kieu: 'link',
      goi: 'https://www.mediafire.com/file/.../XingTu.apk/file' }
  ];

  // Tra trường Firebase đúng của một mã quà tặng (qt-picsart → linkPicsart).
  const TRUONG_LINK_QUA_TANG = {
    'qt-picsart':  'linkPicsart',
    'qt-remini':   'linkRemini',
    'qt-snapedit': 'linkSnapedit',
    'qt-xingtu':   'linkXingtu'
  };

  function timQuaTangAndroid(ma){
    return QUA_TANG_ANDROID.filter(function(q){ return q.ma === ma; })[0];
  }

  // Đọc nhánh công khai quaTangAndroid một lần lúc vào module — không cần
  // đăng nhập, y hệt cách taiThongTinKho() đọc nhánh thongtinkho ở PHẦN 03B.
  function taiLinkQuaTangAndroid(){
    if (state.quaTangAndroidDaTai || !firebaseSanSang || !rtdb) return;
    state.quaTangAndroidDaTai = true;
    rtdb.ref('quaTangAndroid').once('value').then(function(anh){
      state.quaTangAndroidLink = (anh && anh.val()) || {};
      if (state.module === 'qua-tang-android') render();
    }).catch(function(e){
      console.error('Không đọc được nhánh quaTangAndroid:', e);
    });
  }

  // ------------------------------------------------------------------ VẼ

  function veModuleQuaTangAndroid(){
    taiLinkQuaTangAndroid();
    const sp1 = timSanPham('sp1');
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Quà tặng dành cho thiết bị Android</h2>' +
        '<p>Những app chỉnh ảnh phổ biến nhất, tặng kèm miễn phí cho bạn — riêng Lightroom vẫn có thể ' +
          'mua bản đầy đủ không giới hạn như ở module "Trọn bộ sản phẩm VIP".</p>' +
      '</section>' +
      '<div class="luoi-sanpham">' +
        (sp1 ? veTheSanPham(sp1, 0, 'mua-ngay') : '') +
        QUA_TANG_ANDROID.map(function(q, i){ return veTheQuaTang(q, i + 1); }).join('') +
      '</div>';
  }

  function veTheQuaTang(q, chiSo){
    return '' +
      '<article class="the-sanpham" data-hanh-dong="qt-su-dung" data-ma="' + escapeHtml(q.ma) + '">' +
        '<span class="so-tt" aria-hidden="true">' + (chiSo + 1) + '</span>' +
        '<div class="dau-the">' +
          '<figure class="anh-dai-dien">' +
            '<img src="' + q.anh + '" width="240" height="240" loading="lazy" decoding="async"' +
              ' alt="Ảnh đại diện: ' + escapeHtml(q.ten) + '">' +
          '</figure>' +
          '<div class="than-dau">' +
            '<h3 class="ten-sanpham"><span class="chu-ten">' + escapeHtml(q.ten) + '</span></h3>' +
            '<button type="button" class="nut nut-nho nut-vien nut-rong nut-chi-tiet" data-hanh-dong="qt-xem-chi-tiet"' +
              ' data-ma="' + escapeHtml(q.ma) + '">Xem chi tiết sản phẩm</button>' +
          '</div>' +
        '</div>' +
        '<div class="hang-gia">' +
          '<span class="gia-chot" data-chu-cuoi="MIỄN PHÍ">MIỄN PHÍ</span>' +
        '</div>' +
        '<button type="button" class="nut nut-rong nut-chinh nut-su-dung" data-hanh-dong="qt-su-dung"' +
          ' data-ma="' + escapeHtml(q.ma) + '">Sử dụng sản phẩm này</button>' +
      '</article>';
  }

  // "Xem chi tiết sản phẩm" của sp2-5: nội dung để chủ shop thiết kế sau,
  // bảng chỉ dựng khung rỗng với một lời nhắc tạm.
  function moModalChiTietQuaTang(ma){
    const q = timQuaTangAndroid(ma);
    if (!q) return;
    moModal({
      ma: 'qt-chi-tiet-' + ma,
      tieuDe: escapeHtml(q.ten),
      than: '<p class="loi-nhan-hang">Nội dung chi tiết đang được cập nhật, mời bạn quay lại bảng này sau nhé.</p>',
      day: '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  // "Sử dụng sản phẩm này" của sp2-5: bảng "Hướng dẫn sử dụng" dùng chung một
  // bài hướng dẫn cài APK tổng quát (chỉ đổi tên app), có nút cuối dẫn tới
  // link MediaFire admin đã khai.
  function moModalHuongDanQuaTang(ma){
    const q = timQuaTangAndroid(ma);
    if (!q) return;
    const truongLink = TRUONG_LINK_QUA_TANG[ma];
    const link = String(state.quaTangAndroidLink[truongLink] || '');
    moModal({
      ma: 'qt-huong-dan-' + ma,
      tieuDe: 'Hướng dẫn sử dụng',
      than: '<div class="noi-dung-huong-dan">' + noiDungHuongDanQuaTang(q.ten) + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        (link
          ? '<a class="nut nut-chinh" href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' +
            'Tải file APK về máy và cài đặt</a>'
          : '<button type="button" class="nut nut-chinh" disabled>Link đang được cập nhật</button>')
    });
  }

  // Bài hướng dẫn cài APK tổng quát — rút gọn từ HUONG_DAN_SU_DUNG.sp1 (PHẦN
  // 03B), chỉ đổi tên app vì cả bốn sản phẩm đều là file .apk cài ngoài CH
  // Play, các bước giống nhau hệt nhau.
  function noiDungHuongDanQuaTang(tenApp){
    const ten = escapeHtml(tenApp);
    return '' +
      '<p class="hd-mo-dau">App ' + ten + ' cài theo cách này chỉ mất khoảng 2–3 phút. Làm đúng theo ' +
        'thứ tự bên dưới là xong, không cần rành công nghệ.</p>' +

      '<h4 class="hd-buoc">Bước 1 — Gỡ ' + ten + ' cũ (nếu máy đã cài sẵn)</h4>' +
      '<p>Nếu điện thoại bạn đã có sẵn một bản ' + ten + ' khác, hãy <strong>gỡ nó ra trước</strong> ' +
        '(giữ icon app → Gỡ cài đặt / Uninstall) để tránh xung đột giữa hai bản.</p>' +

      '<h4 class="hd-buoc">Bước 2 — Cho phép điện thoại cài app ngoài CH Play</h4>' +
      '<p class="hd-co-the-bo-qua">Có thể bỏ qua bước 2 này và đi đến bước 3, nếu bước 3 bị trục trặc ' +
        'thì mới quay lại bước 2 này.</p>' +
      '<p>Android mặc định chỉ cho cài app từ CH Play. Vì file bạn tải về có đuôi ' +
        '<strong>.apk</strong> (cài trực tiếp, không qua CH Play) nên cần bật quyền một lần duy nhất:</p>' +
      '<p>Vào <strong>Cài đặt → An toàn và bảo mật (Bảo mật)</strong>, tìm dòng ' +
        '<strong>“Không rõ nguồn gốc” / “Cài đặt ứng dụng không rõ nguồn gốc”</strong> rồi bật lên, ' +
        'như hình dưới:</p>' +
      '<img class="hd-anh" src="/assets/anh/hd-sp1-b1.jpg" alt="Bật cho phép cài ứng dụng không rõ nguồn gốc trong Cài đặt">' +
      '<p class="hd-ghi-chu">Một số dòng máy (Samsung, Xiaomi, Oppo…) đặt mục này ở tên hơi khác nhau, ' +
        'hoặc chỉ hỏi đúng lúc bạn mở file cài ở Bước 3 — gặp vậy thì cứ bấm <strong>Cho phép / Allow</strong> ' +
        'khi máy hỏi.</p>' +

      '<h4 class="hd-buoc">Bước 3 — Mở file .apk vừa tải và cài đặt</h4>' +
      '<p>Vào ứng dụng <strong>Quản lý tệp / Files / Trình tải xuống (Downloads)</strong>, tìm đúng file ' +
        'vừa tải (đuôi .apk), bấm vào nó. Nếu máy hỏi “Mở bằng”, chọn <strong>Trình cài đặt</strong> ' +
        '(Package Installer) như hình dưới, rồi bấm <strong>Cài đặt</strong>:</p>' +
      '<img class="hd-anh" src="/assets/anh/hd-sp1-b2.jpg" alt="Mở file APK bằng Trình cài đặt">' +

      '<h4 class="hd-buoc">Bước 4 — Nếu Google Play Protect chặn lại</h4>' +
      '<p>App không tải từ CH Play nên đôi khi Google Play Protect sẽ hiện cảnh báo ' +
        '<strong>“Đã chặn ứng dụng để bảo vệ thiết bị của bạn”</strong>. Đây là lời cảnh báo tự động cho ' +
        'MỌI app cài ngoài, không riêng gì app này — app đã được shop kiểm tra kỹ, hoàn toàn sạch. ' +
        'Bấm vào <strong>“Chi tiết khác”</strong> để mở rộng, sẽ hiện thêm nút cho cài tiếp, như hình dưới:</p>' +
      '<img class="hd-anh" src="/assets/anh/hd-sp1-b3.jpg" alt="Bấm Chi tiết khác khi Play Protect cảnh báo">' +
      '<p>Bấm <strong>“Chi tiết khác”</strong> rồi bấm nút <strong>“Vẫn cài đặt” / “Cài đặt bằng mọi cách”</strong> ' +
        'vừa hiện ra là app cài xong ngay sau đó.</p>' +

      '<h4 class="hd-buoc">Xong rồi!</h4>' +
      '<p>Mở app ' + ten + ' lên và dùng bình thường. Có trục trặc gì cứ nhắn shop, shop hỗ trợ tận nơi.</p>';
  }
