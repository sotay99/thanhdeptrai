  /* ===========================================================================
     PHẦN 03F — MODULE "QUÀ TẶNG DÀNH CHO THIẾT BỊ ANDROID"

     Lưới 6 sản phẩm, thẻ LỚN y khuôn thẻ sản phẩm ở module "Trọn bộ sản phẩm
     VIP" (PHẦN 03):

       1. Lightroom — CHÍNH LÀ sp1 của module kia, nhúng lại NGUYÊN
          veTheSanPham(timSanPham('sp1'), 0, 'mua-ngay') — cheDo 'mua-ngay' đổi
          nút cuối thẻ thành "Mua hàng", bấm là mở thẳng modal "Xác nhận đơn
          hàng" (xem muaHangNgay ở PHẦN 03), tận dụng lại TOÀN BỘ hạ tầng
          mua–giao hàng–email có sẵn của sp1. Mã sản phẩm, giá, QR, email admin
          và khách hàng đều y hệt bên module gốc.

       2. Bộ Preset 500 màu — bản quà tặng của sp2 ("Bộ Preset 10.000 màu..."),
          y chang thiết kế sp2 (ảnh, nội dung chi tiết), chỉ đổi 10.000 → 500
          ở những chỗ liên quan, KHÔNG có mã sản phẩm riêng, KHÔNG giá, KHÔNG
          đơn hàng. Nút "Sử dụng sản phẩm này" mở modal "Hướng dẫn sử dụng"
          RIÊNG (nội dung nhập preset vào Lightroom, không phải cài APK —
          xem veHuongDan trong khai báo qt-preset500 bên dưới), dùng CHUNG
          video hướng dẫn với sp2 (đọc danhmuc/sp2/linkHuongDan, PHẦN 03B).
          Nút tải đổi chữ thành "Tải Preset về máy" (chuNutTai), dẫn tới link
          riêng (linkPreset500) admin khai trong /admin.

       3-6. PicsArt, Remini, SnapEdit, XingTu — KHÔNG có mã sản phẩm riêng,
          KHÔNG giá, KHÔNG đơn hàng, KHÔNG email nào cả. Tên hiện trên thẻ
          LUÔN theo mẫu "<Tên app> - VIP Đã có bản quyền trọn đời". Dòng giá
          vẫn giữ, hiện chữ "MIỄN PHÍ" (giống cách sp4/sp5 — hai khoá học —
          hiển thị).
          Nút "Xem chi tiết sản phẩm" mở bảng mô tả viết riêng cho từng app —
          tái dùng NGUYÊN cơ chế dựng bảng mô tả sản phẩm của PHẦN 01B
          (veOAnh/veKhoiMoTa): ảnh "đã quét an toàn" ở ĐẦU bài (ghép ngang
          hàng với khối chữ đầu tiên, giống hệt sp1), các khối tính năng VIP
          mở khoá bên dưới, KHÔNG có khối cam kết cuối bài (sp2-5 không mua
          bán gì nên không cam kết giao hàng/hoàn tiền).
          Nút cuối thẻ là "Sử dụng sản phẩm này", mở bảng "Hướng dẫn sử dụng"
          — DÙNG CHUNG một bài hướng dẫn cài APK tổng quát, chỉ đổi tên app.
          Bảng đó có nút cuối "Tải file APK về máy và cài đặt" dẫn tới link
          MediaFire của đúng sản phẩm — link KHÔNG để cứng trong mã nguồn, đọc
          từ nhánh Firebase công khai quaTangAndroid (admin tự sửa trong
          /admin, xem O_QUA_TANG_ANDROID ở PHẦN 04B), tái dùng NGUYÊN cơ chế
          "một ô, một nút Lưu".

       Ảnh "đã quét an toàn" của sp1 (Lightroom) KHÔNG định nghĩa ở đây — nó
       dán vào CUỐI bài mô tả sp1 ở PHẦN 01B (ANH_CUOI_MO_TA), áp dụng chung
       cho cả module này lẫn module "Trọn bộ sản phẩm VIP" vì hai nơi gọi
       chung một hàm moModalChiTietSanPham('sp1').

     Ảnh đại diện 2-5 tái dùng ẢNH ĐÃ CẮT của module "Mua App VIP Pro"
     (PHẦN 03E) — XingTu mượn ảnh Hypic vì không có ảnh riêng.
     =========================================================================== */

  // ten: hiện trên THẺ ở lưới — luôn theo mẫu "<Tên app> - VIP Đã có bản
  // quyền trọn đời". tenPhienBan: hiện làm TIÊU ĐỀ bảng "Xem chi tiết sản
  // phẩm" — ghi rõ số phiên bản, khác với ten ở thẻ.
  // anh: ảnh đại diện ở thẻ (tái dùng ảnh đã cắt của module App VIP Pro).
  // anhChiTiet: ảnh lớn "đã quét an toàn" đứng đầu bảng chi tiết.
  // khoi: nội dung bảng chi tiết — khối đầu tiên LUÔN kiểu 'khau-hieu' (ghép
  // ngang hàng với anhChiTiet), các khối sau dựng thường, KHÔNG có khối cam
  // kết ở cuối (khác sp1 — sp1 có mua bán thật nên giữ cam kết).
  const QUA_TANG_ANDROID = [
    // Bản quà tặng của sp2 ("Bộ Preset 10.000 màu...") — y chang thiết kế sp2,
    // chỉ đổi 10.000 → 500 ở những chỗ liên quan. Tái dùng NGUYÊN ảnh của sp2
    // (ANH_DAI_DIEN/ANH_SAN_PHAM, PHẦN 01B) — không cắt ảnh mới. veHuongDan +
    // chuNutTai ghi đè nội dung/nút mặc định của moModalHuongDanQuaTang (xem
    // bên dưới) vì đây là hướng dẫn NHẬP PRESET, không phải cài APK.
    { ma: 'qt-preset500', ten: 'Bộ Preset 500 màu cao cấp cài sẵn cho Lightroom điện thoại',
      tenPhienBan: 'Bộ Preset 500 màu cao cấp cài sẵn cho Lightroom điện thoại',
      anh: ANH_DAI_DIEN.sp2, anhChiTiet: ANH_SAN_PHAM.sp2, chuNutTai: 'Tải Preset về máy',
      khoi: [
        { kieu: 'khau-hieu',
          chu: '500 màu cao cấp, cài sẵn thẳng vào tài khoản của bạn. Mở app lên là có, không phải nhập tay tấm nào. 🎨' },
        { kieu: 'doan', chu: 'Preset trôi nổi trên mạng thì nhiều, nhưng phần lớn là màu rác: nạp vào ảnh cháy sáng, da người xám ngoét, hoặc lỗi không hiện. Bộ này <strong>được tuyển chọn kỹ từng bộ một</strong> và <strong>đã test thành công</strong> trước khi giao cho bạn.' },
        { kieu: 'muc', tieuDe: '💎 Vì sao bộ màu này khác', y: [
          '🔍 <strong>Tuyển chọn kỹ lưỡng:</strong> mỗi bộ màu đều được kiểm thử trên ảnh thật, loại thẳng những màu hỏng, màu trùng, màu vô dụng.',
          '📦 <strong>Cài trực tiếp vào tài khoản cá nhân của bạn</strong> — không phải mò import từng file, mở Lightroom là màu đã nằm sẵn trong danh sách.',
          '🛡️ <strong>An toàn và riêng tư:</strong> thao tác trên chính tài khoản của bạn, shop không giữ, không dùng chung, không đụng vào ảnh của bạn.',
          '♾️ <strong>Sử dụng trọn đời:</strong> màu nằm trong tài khoản, đổi điện thoại vẫn còn nguyên.'
        ] },
        { kieu: 'noi-bat', chu: '⏱️ Làm phép tính nhanh: mỗi tấm ảnh bạn dò màu mất 5 phút. Có sẵn 500 màu, bạn chỉ lướt và chọn — 30 giây là xong. Một buổi chụp 20 tấm tiết kiệm gần 1,5 tiếng ngồi máy.' },
        { kieu: 'doan', chu: 'Từ tông phim hoài cổ, tông Hàn Quốc trong trẻo, tông cưới sang trọng, tông du lịch rực nắng cho tới tông đường phố xám lạnh — bạn luôn có sẵn một dải màu để bắt đầu, thay vì ngồi trước tấm ảnh thô và không biết kéo thanh nào trước.' }
      ],
      veHuongDan: function(dm){
        return '' +
          veKhungVideo(dm && dm.linkHuongDan, 'doc') +
          '<h4 class="hd-buoc">Bộ preset này gồm những gì?</h4>' +
          '<p>Đây là <strong>gói 500 preset Lightroom Mobile</strong> tổng hợp, máy yếu vẫn nhập được mượt mà.</p>' +
          '<h4 class="hd-buoc">Nên cài gói nào?</h4>' +
          '<p>· Cài <strong>gói 500 màu 1 lần duy nhất</strong>. Muốn có thêm nhiều preset nữa, hãy tham khảo thêm ' +
            'các sản phẩm preset giá rẻ của shop.</p>' +
          '<h4 class="hd-buoc">Các bước cài đặt chi tiết</h4>' +
          '<p>1. Tải file <strong>.zip</strong> preset về máy điện thoại từ nút bên dưới.</p>' +
          '<p>2. Mở app <strong>Lightroom</strong> → bấm vào <strong>Thiết đặt sẵn (Presets)</strong> ở thanh dưới.</p>' +
          '<p>3. Chọn mục <strong>“Của bạn” (Yours)</strong>.</p>' +
          '<p>4. Nhìn lên góc trên bên phải màn hình, bấm vào dấu ba chấm dọc <strong>“⋮”</strong>.</p>' +
          '<p>5. Chọn <strong>“Nhập thiết đặt sẵn” (Import Presets)</strong>.</p>' +
          '<p>6. Bấm <strong>“Tải file lên”</strong>, rồi chọn đúng file <strong>.zip</strong> preset vừa tải.</p>' +
          '<p>7. Ngồi chờ vài chục giây để Lightroom tải preset lên và tự đồng bộ vào bộ nhớ đám mây Adobe ' +
            'của bạn — xong là preset xuất hiện ngay trong mục “Của bạn”, dùng được cho mọi tấm ảnh.</p>';
      } },
    { ma: 'qt-picsart', tenApp: 'PicsArt', ten: 'PicsArt - VIP Đã có bản quyền trọn đời', tenPhienBan: 'PicsArt_v29.1.4',
      anh: '/assets/anh/app-vip-picsart.jpg', anhChiTiet: '/assets/anh/qt-antoan-picsart.jpg',
      khoi: [
        { kieu: 'khau-hieu',
          chu: 'Studio chỉnh ảnh AI mạnh nhất trong túi bạn — không quảng cáo, không watermark, không giới hạn. 🎨✨' },
        { kieu: 'muc', tieuDe: '🔓 Những tính năng VIP Pro được mở khoá', y: [
          '🚫 <strong>Xoá sạch quảng cáo và watermark PicsArt</strong> khi xuất ảnh — tải về sạch 100%, không logo che góc.',
          '🤖 <strong>Bộ công cụ AI cao cấp:</strong> xoá và thay thế vật thể bằng AI (Magic Replace), mở rộng khung ảnh bằng AI (Magic Expand), tạo phông nền bằng AI.',
          '✂️ <strong>Tách nền tự động không giới hạn lượt</strong> — độ chính xác cao, không cần tự tô viền tay.',
          '🎁 Mở khoá <strong>toàn bộ kho sticker, phông nền, font chữ cao cấp</strong> — hàng chục nghìn mẫu.',
          '📤 <strong>Xuất ảnh độ phân giải gốc</strong>, không bị nén hay giảm chất lượng như bản miễn phí.'
        ] }
      ] },
    { ma: 'qt-remini', tenApp: 'Remini', ten: 'Remini - VIP Đã có bản quyền trọn đời', tenPhienBan: 'Remini-v3.7.1333',
      anh: '/assets/anh/app-vip-remini.jpg', anhChiTiet: '/assets/anh/qt-antoan-remini.jpg',
      khoi: [
        { kieu: 'khau-hieu',
          chu: 'Phục chế ảnh mờ, cũ, vỡ nét thành ảnh sắc nét như chụp bằng máy ảnh chuyên nghiệp — chỉ trong một chạm. 📸✨' },
        { kieu: 'muc', tieuDe: '🔓 Những tính năng VIP Pro được mở khoá', y: [
          '🚫 <strong>Xoá sạch quảng cáo và watermark Remini</strong> trên mọi ảnh, video xuất ra.',
          '✨ <strong>Nâng cấp chất lượng ảnh bằng AI</strong> (AI Photo Enhancer) không giới hạn số lượt, không phải chờ quảng cáo giữa mỗi lần dùng.',
          '🎬 <strong>Video Enhancer AI</strong> — làm nét lại video cũ, mờ, vỡ khung hình.',
          '🎭 Mở khoá toàn bộ <strong>bộ lọc AI cao cấp</strong>: AI Avatar, Hollywood Filter, và các AI Filter thế hệ mới.',
          '📤 <strong>Xuất ảnh/video ở độ phân giải tối đa</strong>, không giới hạn như bản miễn phí.'
        ] }
      ] },
    { ma: 'qt-snapedit', tenApp: 'SnapEdit', ten: 'SnapEdit - VIP Đã có bản quyền trọn đời', tenPhienBan: 'SnapEdit-v7.6.6',
      anh: '/assets/anh/app-vip-snapedit.jpg', anhChiTiet: '/assets/anh/qt-antoan-snapedit.jpg',
      khoi: [
        { kieu: 'khau-hieu',
          chu: 'Xoá nền, xoá người thừa, chỉnh ảnh bằng AI chỉ trong vài giây — không cần biết Photoshop. 🪄' },
        { kieu: 'muc', tieuDe: '🔓 Những tính năng VIP Pro được mở khoá', y: [
          '🚫 <strong>Xoá sạch quảng cáo và watermark SnapEdit</strong> khi xuất ảnh.',
          '✂️ <strong>Xoá nền ảnh (Remove Background) không giới hạn lượt</strong>, độ chính xác cao, tách cả tóc và chi tiết nhỏ.',
          '🪄 <strong>Công cụ AI xoá vật thể, người lạ, rác trong ảnh</strong> (Remove Object) không giới hạn.',
          '✨ <strong>AI Photo Enhancer</strong> nâng cấp chất lượng ảnh mờ, ảnh cũ.',
          '📤 <strong>Xuất ảnh full độ phân giải gốc</strong>, không giới hạn số lượt chỉnh sửa mỗi ngày.'
        ] }
      ] },
    { ma: 'qt-xingtu', tenApp: 'XingTu', ten: 'XingTu - VIP Đã có bản quyền trọn đời', tenPhienBan: 'XingTu_v7.0.0_Việt Hoá',
      anh: '/assets/anh/app-vip-hypic.jpg', anhChiTiet: '/assets/anh/qt-antoan-xingtu.jpg',
      khoi: [
        { kieu: 'khau-hieu',
          chu: 'App làm đẹp ảnh chân dung hàng đầu Trung Quốc (cùng nhà phát triển với CapCut) — bản Việt hoá đầy đủ, dễ dùng. 💄' },
        { kieu: 'luu-y', tieuDe: 'ℹ️ Lưu ý về phiên bản', y: [
          'Đây là phiên bản XingTu <strong>đã ra mắt được một thời gian</strong> (không phải bản mới nhất), nhưng vẫn ' +
          '<strong>dùng thoải mái và ổn định</strong> cho mọi nhu cầu chỉnh sửa quen thuộc: chỉnh mặt, trang điểm, chỉnh ' +
          'vóc dáng cơ thể... app chạy mượt, không lỗi vặt.'
        ] },
        { kieu: 'muc', tieuDe: '🔓 Những tính năng VIP được mở khoá', y: [
          '💄 <strong>Trang điểm AI</strong> — tô son, kẻ mắt, làm mịn da tự nhiên chỉ bằng một chạm.',
          '🧍 <strong>Chỉnh dáng người (Bodyedit)</strong> — thon gọn, cao ráo, chỉnh tỷ lệ cơ thể tự nhiên, không méo nền.',
          '😊 <strong>Chỉnh mặt chi tiết</strong> — mắt to hơn, mũi cao hơn, cằm V-line... tinh chỉnh từng chi tiết khuôn mặt.',
          '🎨 Mở khoá <strong>kho filter, phông nền, bộ lọc thời trang cao cấp</strong> cập nhật liên tục.',
          '🚫 Xoá quảng cáo, mở khoá toàn bộ công cụ chỉnh sửa nâng cao đang bị khoá ở bản thường.'
        ] }
      ] }
  ];

  // Link MediaFire của từng app — admin khai trong /admin, tái dùng cơ chế
  // "một ô, một nút Lưu" (veMotO/luuCaiDat ở PHẦN 04B). Trường ở đây khớp
  // ĐÚNG tên trường trong database.rules.json nhánh quaTangAndroid.
  const O_QUA_TANG_ANDROID = [
    { truong: 'linkPreset500', ten: 'Link tải — Bộ Preset 500 màu', kieu: 'link',
      goi: 'https://drive.google.com/.../Preset500.zip' },
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
    'qt-preset500': 'linkPreset500',
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

  // Bộ Preset 500 màu (qt-preset500) dùng CHUNG video hướng dẫn với sp2 —
  // đọc nhánh công khai danhmuc (PHẦN 03B) để lấy danhmuc/sp2/linkHuongDan.
  function taiDanhMucChoQuaTang(){
    // state.danhMuc khởi tạo sẵn là {} (PHẦN 01) nên KHÔNG dùng được làm cờ
    // "đã tải" — phải có cờ riêng, giống quaTangAndroidDaTai ở trên.
    if (state.danhMucChoQuaTangDaTai) return;
    state.danhMucChoQuaTangDaTai = true;
    taiDanhMuc().then(function(){ if (state.module === 'qua-tang-android') render(); });
  }

  // ------------------------------------------------------------------ VẼ

  function veModuleQuaTangAndroid(){
    taiLinkQuaTangAndroid();
    taiDanhMucChoQuaTang();
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

  // "Xem chi tiết sản phẩm" của sp2-5 — tái dùng NGUYÊN cơ chế dựng bảng mô tả
  // của PHẦN 01B (veOAnh/veKhoiMoTa): ảnh lớn ghép ngang hàng với khối chữ đầu
  // tiên, các khối sau trôi vào lần lượt. Khác sp1 ở chỗ KHÔNG có khối cam kết
  // cuối bài (sp2-5 không mua bán gì nên không cam kết giao hàng/hoàn tiền).
  function veNoiDungChiTietQuaTang(q){
    const danhSach = q.khoi || [];
    if (!danhSach.length) return '';
    return '' +
      '<div class="hang-anh-chu troi-ngang" style="animation-delay:0s">' +
        veOAnh(q.anhChiTiet, 'Ảnh minh hoạ: ' + q.tenPhienBan) + veKhoiMoTa(danhSach[0], 0, true) +
      '</div>' +
      danhSach.slice(1).map(function(k, i){ return veKhoiMoTa(k, i + 1); }).join('');
  }

  function moModalChiTietQuaTang(ma){
    const q = timQuaTangAndroid(ma);
    if (!q) return;
    moModal({
      ma: 'qt-chi-tiet-' + ma,
      tieuDe: 'Chi tiết sản phẩm',
      than: '' +
        '<div class="mo-ta-sp">' +
          '<div class="mo-ta-dinh troi-ngang">' +
            '<h3>' + escapeHtml(q.tenPhienBan) + '</h3>' +
            '<p class="hang-gia"><span class="gia-chot" data-chu-cuoi="MIỄN PHÍ">MIỄN PHÍ</span></p>' +
          '</div>' +
          veNoiDungChiTietQuaTang(q) +
        '</div>',
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
    // qt-preset500 ghi đè nội dung (hướng dẫn nhập preset, không phải cài
    // APK) và chữ nút tải — các app khác dùng bài hướng dẫn chung bên dưới.
    const noiDung = q.veHuongDan ? q.veHuongDan(danhMucCua('sp2')) : noiDungHuongDanQuaTang(q.tenApp);
    const chuNutTai = q.chuNutTai || 'Tải file APK về máy và cài đặt';
    moModal({
      ma: 'qt-huong-dan-' + ma,
      tieuDe: 'Hướng dẫn sử dụng',
      than: '<div class="noi-dung-huong-dan">' + noiDung + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        (link
          ? '<a class="nut nut-chinh" href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' +
            escapeHtml(chuNutTai) + '</a>'
          : '<button type="button" class="nut nut-chinh" disabled>Link đang được cập nhật</button>'),
      khiVe: function(){ initKhungVideo(); hienMuiTenTruot(); }
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
