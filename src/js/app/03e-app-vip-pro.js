
  /* ===========================================================================
     PHẦN 03E — MODULE "MUA APP VIP PRO GIÁ RẺ"

     Lưới 20 app CHIA 3 NHÓM, mỗi ô nhỏ chỉ có ảnh đại diện + tên — KHÔNG giá,
     KHÔNG nút "Xem chi tiết" (giá dao động 90K-149K tuỳ app, shop tự tư vấn
     sau khi khách chọn, không niêm yết giá riêng từng app). Bấm cả ô để chọn,
     y hệt cách chọn sản phẩm ở module "Trọn bộ sản phẩm VIP" (PHẦN 03).

     Thanh neo đáy TÁI DÙNG class .thanh-bao-gia (CSS định vị fixed/đáy màn
     hình và doChoThanhDay() đo chiều cao đều đọc theo đúng class đó — chỉ một
     trong hai module hiện diện tại một thời điểm nên dùng chung tên lớp không
     va chạm), chỉ đổi nội dung bên trong: không có tổng tiền/giảm giá, chỉ có
     số app đã chọn + nút "Đặt mua".

     Bấm "Đặt mua": nếu trong lựa chọn có app thuộc 5 app đã có bản miễn phí ở
     module "Quà tặng dành cho thiết bị Android" (PHẦN 03F) thì cảnh báo trước
     mời khách qua module đó; "Tiếp tục đặt mua hàng" thì ghi thống kê theo
     thiết bị (nhánh thongKeDatMuaApp, xem /admin PHẦN 04J) rồi mời khách tự
     liên hệ Zalo LIÊN KẾT của shop (không phải Zalo chính) — KHÔNG còn thu
     thập số điện thoại/email/ghi chú của khách, không có đơn hàng nào được
     tạo ra ở module này.
     =========================================================================== */

  // Đường dẫn ẢNH PHẢI là chuỗi TRẦN đầy đủ, không được ghép bằng dấu + lúc
  // chạy — scripts/build-static.js quét nguyên văn đường dẫn ảnh trong mã để
  // đối chiếu với src/anh/, ghép chuỗi động làm nó chỉ thấy được nửa đường
  // dẫn và báo đỏ ngay khi build.
  const ANH_APP_VIP = {
    lightroom:  '/assets/anh/app-vip-lightroom.jpg',
    beautyplus: '/assets/anh/app-vip-beautyplus.jpg',
    lightleap:  '/assets/anh/app-vip-lightleap.jpg',
    pixelance:  '/assets/anh/app-vip-pixelance.jpg',
    capcut:     '/assets/anh/app-vip-capcut.jpg',
    remini:     '/assets/anh/app-vip-remini.jpg',
    beautycam:  '/assets/anh/app-vip-beautycam.jpg',
    meitu:      '/assets/anh/app-vip-meitu.jpg',
    ulike:      '/assets/anh/app-vip-ulike.jpg',
    snow:       '/assets/anh/app-vip-snow.jpg',
    b612:       '/assets/anh/app-vip-b612.jpg',
    hypic:      '/assets/anh/app-vip-hypic.jpg',
    foodie:     '/assets/anh/app-vip-foodie.jpg',
    prettyup:   '/assets/anh/app-vip-prettyup.jpg',
    canva:      '/assets/anh/app-vip-canva.jpg',
    picsart:    '/assets/anh/app-vip-picsart.jpg',
    photoroom:  '/assets/anh/app-vip-photoroom.jpg',
    snapedit:   '/assets/anh/app-vip-snapedit.jpg',
    faceapp:    '/assets/anh/app-vip-faceapp.jpg',
    chatgpt:    '/assets/anh/app-vip-chatgpt.jpg'
  };

  function appVipDangChon(ma){
    return state.appVipChon.indexOf(ma) !== -1;
  }

  function appVipDoiChon(ma){
    const i = state.appVipChon.indexOf(ma);
    if (i === -1) state.appVipChon.push(ma);
    else state.appVipChon.splice(i, 1);
  }

  function appVipDaChonDanhSach(){
    return state.appVipChon
      .map(function(ma){ return APP_VIP_PRO.filter(function(a){ return a.ma === ma; })[0]; })
      .filter(Boolean);
  }

  // ------------------------------------------------------------------ VẼ

  function veTheAppVip(a){
    const daChon = appVipDangChon(a.ma);
    return '' +
      '<button type="button" class="the-app-vip' + (daChon ? ' da-chon' : '') +
        '" data-hanh-dong="chon-app-vip" data-ma="' + escapeHtml(a.ma) +
        '" aria-pressed="' + (daChon ? 'true' : 'false') + '">' +
        '<span class="dau-chon-app-vip" aria-hidden="true">✓</span>' +
        '<img class="anh-app-vip" src="' + ANH_APP_VIP[a.ma] + '" width="80" height="80"' +
          ' loading="lazy" decoding="async" alt="' + escapeHtml(a.ten) + '">' +
        '<span class="ten-app-vip">' + escapeHtml(a.ten) + '</span>' +
      '</button>';
  }

  function veNhomAppVip(n){
    const ds = APP_VIP_PRO.filter(function(a){ return a.nhom === n.ma; });
    return '' +
      '<div class="nhom-app-vip">' +
        '<h3 class="tieu-de-nhom-app-vip"><span aria-hidden="true">⭐</span> ' + escapeHtml(n.ten) + '</h3>' +
        '<div class="luoi-app-vip">' + ds.map(veTheAppVip).join('') + '</div>' +
      '</div>';
  }

  function veModuleAppVipPro(){
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Mua App VIP Pro giá rẻ cho Android và iPhone</h2>' +
        '<p>Mỗi app mở full tính năng VIP chỉ từ <strong>90K - 149K</strong> (giá ưu đãi trong tháng này). ' +
          'Chọn 1 hoặc nhiều app bên dưới, shop sẽ nhắn tin tư vấn với cam kết mức giá rẻ nhất thị trường hiện nay.</p>' +
        '<div class="canh-bao-app-vip"><span aria-hidden="true">⚠️</span> ' +
          'Sản phẩm này <strong>KHÔNG được kèm theo</strong> bộ quà tặng của thanhdeptrai.vn</div>' +
      '</section>' +
      NHOM_APP_VIP.map(veNhomAppVip).join('') +
      '<p class="ghi-chu-cuoi-app-vip">Chọn xong các app bạn cần thì bấm nút <strong>"Đặt mua"</strong> ở thanh dưới đáy màn hình — ' +
        'shop sẽ nhắn tin tư vấn và chốt giá cụ thể, không cần thanh toán ngay tại đây.</p>';
  }

  // ------------------------------------------------- CHỌN / BỎ CHỌN APP

  function capNhatTheAppVip(ma){
    const the = document.querySelector('.the-app-vip[data-ma="' + ma + '"]');
    if (!the) return;
    const daChon = appVipDangChon(ma);
    the.classList.toggle('da-chon', daChon);
    the.setAttribute('aria-pressed', daChon ? 'true' : 'false');
  }

  function veThanhAppVip(){
    const n = state.appVipChon.length;
    return '' +
      '<div class="thanh-bao-gia thanh-app-vip" role="region" aria-label="Thanh đặt mua App VIP Pro">' +
        '<div class="so-lieu">' +
          '<div class="o-so-lieu"><span class="nhan">Đã chọn</span><span class="tri tong">' + n + ' app</span></div>' +
        '</div>' +
        '<button type="button" class="nut nut-do nut-mua-hang" data-hanh-dong="dat-mua-app-vip"' + (n ? '' : ' disabled') + '>' +
          (n ? 'Đặt mua' : 'Hãy chọn app') +
        '</button>' +
      '</div>';
  }

  function capNhatThanhAppVip(){
    const cu = document.querySelector('.thanh-app-vip');
    if (!cu) return;
    const tam = document.createElement('div');
    tam.innerHTML = veThanhAppVip();
    cu.replaceWith(tam.firstChild);
    doChoThanhDay();
  }

  function chonAppVip(ma){
    if (!APP_VIP_PRO.some(function(a){ return a.ma === ma; })) return;
    appVipDoiChon(ma);
    capNhatTheAppVip(ma);
    capNhatThanhAppVip();
  }

  // --------------------------------------------------- LUỒNG "ĐẶT MUA"
  //
  // KHÔNG còn thu thập số điện thoại/Zalo của khách — shop chỉ mời khách tự
  // liên hệ Zalo liên kết. Bấm "Đặt mua":
  //   1. Nếu trong lựa chọn có ÍT NHẤT MỘT app thuộc 5 app có bản miễn phí
  //      cho Android (APP_MIEN_PHI_ANDROID) → hiện modal cảnh báo trước, mời
  //      xem module "Quà tặng cho người dùng điện thoại android".
  //   2. Mọi trường hợp khác (hoặc bấm "Tiếp tục đặt mua hàng" ở bước 1) →
  //      ghi thống kê theo thiết bị rồi mở modal mời liên hệ Zalo liên kết.

  // 5 app đã có mặt (miễn phí) trong module "Quà tặng dành cho thiết bị
  // Android" (PHẦN 03F) — mã phải khớp ĐÚNG với mã trong APP_VIP_PRO.
  const APP_MIEN_PHI_ANDROID = ['lightroom', 'picsart', 'remini', 'snapedit', 'hypic'];

  function coAppMienPhiDangChon(){
    return state.appVipChon.some(function(ma){ return APP_MIEN_PHI_ANDROID.indexOf(ma) !== -1; });
  }

  function batDauDatMuaAppVip(){
    if (!state.appVipChon.length) return;
    if (coAppMienPhiDangChon()) moModalCanhBaoAppMienPhi();
    else tiepTucDatMuaAppVip();
  }

  function moModalCanhBaoAppMienPhi(){
    moModal({
      ma: 'canh-bao-app-mien-phi',
      tieuDe: 'Có bản miễn phí dành cho Android',
      than: '' +
        '<p>Nếu bạn dùng điện thoại Android, có thể sử dụng các app này (Lightroom, PicsArt, Remini, SnapEdit, ' +
          'Hypic) một cách <strong>miễn phí</strong> mà không cần phải mua hàng, vui lòng xem tại ' +
          '<button type="button" class="nut-lien-ket-module" data-hanh-dong="mo-qua-tang-tu-canh-bao">' +
          'module Quà tặng cho người dùng điện thoại android</button>.</p>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Quay lại</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="tiep-tuc-dat-mua-app-vip">Tiếp tục đặt mua hàng</button>'
    });
  }

  function moQuaTangTuCanhBao(){
    dongHetModal();
    moModule('qua-tang-android');
  }

  // Ghi NHẬN DIỆN theo thiết bị (tái dùng NGUYÊN maThietBi() của PHẦN 03B) —
  // mỗi lượt bấm "Tiếp tục đặt mua hàng" ghi THÊM một dòng (push), KHÔNG đọc
  // lại rồi gộp ở phía khách: ghi public chỉ cần quyền WRITE, việc gộp theo
  // thiết bị/khử trùng app để hiện "một thiết bị một dòng" làm ở /admin lúc
  // HIỂN THỊ (xem veAdminThongKeAppVip ở PHẦN 04J) — vừa đơn giản vừa không
  // cần cấp quyền ĐỌC công khai cho nhánh thống kê này.
  function ghiThongKeDatMuaAppVip(){
    if (!firebaseSanSang || !rtdb) return;
    const ds = appVipDaChonDanhSach();
    if (!ds.length) return;
    rtdb.ref('thongKeDatMuaApp').push().set({
      thietBi: maThietBi(),
      dsApp: ds.map(function(a){ return a.ma; }),
      taoLuc: Date.now()
    }).catch(function(e){
      console.error('Không ghi được thống kê đặt mua App VIP:', e);
    });
  }

  function tiepTucDatMuaAppVip(){
    if (!state.appVipChon.length) return;
    ghiThongKeDatMuaAppVip();
    moModalLienHeAppVip();
  }

  function moModalLienHeAppVip(){
    dongHetModal();
    if (!state.thongTinLienHeDaTai) {
      taiThongTinLienHe().then(function(){
        const dangMo = state.modal.some(function(x){ return x.ma === 'lien-he-app-vip'; });
        if (dangMo) { dongModal(); moModalLienHeAppVip(); }
      });
    }
    const so = String((state.thongTinLienHe && state.thongTinLienHe.zaloLienKet) || '').trim();
    // Tái dùng NGUYÊN diaChiMoLienHe() (PHẦN 02) để dựng địa chỉ "Mở" — tránh
    // viết thẳng chuỗi "https://zalo.me/" cạnh href trong mã nguồn (quy tắc
    // chung: không in sẵn thành phần nhận dạng số Zalo như một thẻ <a> tĩnh).
    const diaChi = so ? diaChiMoLienHe('zalo', so) : '';
    moModal({
      ma: 'lien-he-app-vip',
      tieuDe: 'Liên hệ Zalo để được hỗ trợ',
      than: '' +
        '<p>Vui lòng liên hệ trực tiếp Zalo của shop để được hỗ trợ cài app một cách nhanh nhất, kể cả trên điện ' +
          'thoại Android và iPhone, với mức giá chỉ từ <strong>90K - 149K</strong> cho mỗi app.</p>' +
        (so
          ? '<div class="dong-lien-he">' +
              '<span class="nhan-lien-he">Zalo</span>' +
              '<span class="gia-tri-lien-he">' + escapeHtml(so) + '</span>' +
              '<div class="hang-nut-lien-he">' +
                '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="sao-chep" data-chuoi="' +
                  escapeHtml(so) + '">📋 Sao chép</button>' +
                '<a class="nut nut-nho nut-chinh" href="' + escapeHtml(diaChi) +
                  '" target="_blank" rel="noopener">↗ Mở</a>' +
              '</div>' +
            '</div>'
          : '<p class="loi-nhan-hang">Số Zalo liên kết đang được cập nhật, vui lòng quay lại sau.</p>'),
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }
