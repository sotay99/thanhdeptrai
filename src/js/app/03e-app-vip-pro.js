
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

     Bấm "Đặt mua" mở modal nhập Số điện thoại/Zalo (tái dùng NGUYÊN
     chuanHoaSo()/loiSo() của PHẦN 04 — không viết lại luật kiểm số) + một ô
     Lời nhắn không bắt buộc. Gửi xong ghi vào nhánh yeuCauAppVip của Realtime
     Database (KHÔNG phải donhang — đây không phải một đơn hàng có giá, gộp
     chung sẽ làm hỏng khâu lọc 'trangThai' của gui-hang.gs); apps-script đọc
     nhánh này mỗi phút rồi email cho chủ shop, xem guiYeuCauAppVip() trong
     apps-script/gui-hang.gs.
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

  // --------------------------------------------------- MODAL ĐẶT MUA

  function veOTruongAppVip(id, truong, nhan, giaTri, goiY){
    return '' +
      '<div class="truong">' +
        '<label for="o-' + id + '">' + escapeHtml(nhan) + '</label>' +
        '<input id="o-' + id + '" type="text" data-truong-app-vip="' + truong + '" value="' + escapeHtml(giaTri) +
          '" autocomplete="off" inputmode="tel">' +
        '<p class="goi-y">' + escapeHtml(goiY) + '</p>' +
        '<p class="loi" data-loi-app-vip="' + truong + '"></p>' +
      '</div>';
  }

  function veOGhiChuAppVip(giaTri){
    return '' +
      '<div class="truong">' +
        '<label for="o-ghiChuAppVip">Lời nhắn thêm của bạn (không bắt buộc)</label>' +
        '<textarea id="o-ghiChuAppVip" class="o-ghi-chu-app-vip" data-truong-app-vip="ghiChu" rows="3" autocomplete="off">' +
          escapeHtml(giaTri) + '</textarea>' +
      '</div>';
  }

  function moModalDatMuaAppVip(){
    if (!state.appVipChon.length) return;
    const y = state.yeuCauAppVip;
    const ds = appVipDaChonDanhSach();
    moModal({
      ma: 'dat-mua-app-vip',
      tieuDe: 'Đặt mua App VIP Pro',
      than: '' +
        '<p class="dan-nhap-modal">Bạn đã chọn ' + ds.length + ' app:</p>' +
        '<ul class="ds-app-da-chon">' + ds.map(function(a){ return '<li>' + escapeHtml(a.ten) + '</li>'; }).join('') + '</ul>' +
        '<div class="khung-cam-ket-giao">' +
          '<p>Shop sẽ nhắn tin để tư vấn và chốt giá cụ thể cho từng app, với cam kết mức giá rẻ nhất thị trường hiện nay ' +
            '(90K - 149K/app).</p>' +
        '</div>' +
        veOTruongAppVip('sdtAppVip', 'soDienThoai', 'Số điện thoại (hoặc số Zalo của bạn)', y.soDienThoai,
          'Nếu Zalo của bạn chặn tin nhắn người lạ, shop sẽ nhắn tin qua SMS.') +
        veOGhiChuAppVip(y.ghiChu) +
        '<p class="loi loi-chung" data-loi="chungAppVip"></p>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="gui-yeu-cau-app-vip" disabled>' +
          'Gửi yêu cầu đặt mua</button>',
      khiVe: function(){ capNhatFormAppVip(); }
    });
  }

  function capNhatTruongAppVip(truong, giaTri){
    const y = state.yeuCauAppVip;
    if (truong === 'soDienThoai') y.soDienThoai = chuanHoaSo(giaTri);
    else if (truong === 'ghiChu') y.ghiChu = String(giaTri == null ? '' : giaTri).slice(0, 500);
    capNhatFormAppVip();
  }

  // Cập nhật TẠI CHỖ (không vẽ lại cả modal) để con trỏ nhập không bị nhảy —
  // cùng lý do với capNhatFormKhachHang() ở PHẦN 04.
  function capNhatFormAppVip(){
    const y = state.yeuCauAppVip;
    const oSdt = document.querySelector('[data-truong-app-vip="soDienThoai"]');
    if (oSdt && oSdt.value !== y.soDienThoai) oSdt.value = y.soDienThoai;
    const loi = loiSo(y.soDienThoai, 'Số điện thoại/Zalo');
    const oLoi = document.querySelector('[data-loi-app-vip="soDienThoai"]');
    if (oLoi) oLoi.textContent = loi;
    if (oSdt) oSdt.classList.toggle('sai', !!loi);

    const hopLe = !!y.soDienThoai && !loi;
    const canhBao = document.querySelector('[data-loi="chungAppVip"]');
    if (canhBao) canhBao.textContent = hopLe ? '' : 'Vui lòng nhập số điện thoại hoặc Zalo hợp lệ để shop liên hệ.';

    const nutGui = document.querySelector('[data-hanh-dong="gui-yeu-cau-app-vip"]');
    if (nutGui) {
      nutGui.disabled = !hopLe || y.dangGui;
      nutGui.textContent = y.dangGui ? 'Đang gửi…' : 'Gửi yêu cầu đặt mua';
    }
  }

  function guiYeuCauAppVip(){
    const y = state.yeuCauAppVip;
    if (!y.soDienThoai || loiSo(y.soDienThoai, 'Số điện thoại') || y.dangGui) return;
    if (!firebaseSanSang || !rtdb) { alert('Mất kết nối, vui lòng thử lại.'); return; }
    const ds = appVipDaChonDanhSach();
    if (!ds.length) return;

    y.dangGui = true;
    capNhatFormAppVip();

    rtdb.ref('yeuCauAppVip').push().set({
      dsApp: ds.map(function(a){ return a.ten; }),
      maApp: ds.map(function(a){ return a.ma; }),
      soDienThoai: y.soDienThoai,
      ghiChu: y.ghiChu,
      taoLuc: Date.now(),
      daBao: false
    }).then(function(){
      state.appVipChon = [];
      state.yeuCauAppVip = { soDienThoai: '', ghiChu: '', dangGui: false };
      render();
      moModalCamOnAppVip();
    }).catch(function(e){
      console.error('Không gửi được yêu cầu Mua App VIP Pro:', e);
      y.dangGui = false;
      capNhatFormAppVip();
      alert('Không gửi được. Vui lòng kiểm tra mạng rồi thử lại.');
    });
  }

  function moModalCamOnAppVip(){
    dongModal();
    moModal({
      ma: 'cam-on-app-vip',
      tieuDe: 'Đã gửi yêu cầu',
      than: '<p>Cảm ơn bạn đã gửi yêu cầu đặt mua! Shop sẽ nhắn tin tư vấn và chốt giá trong thời gian sớm nhất.</p>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }
