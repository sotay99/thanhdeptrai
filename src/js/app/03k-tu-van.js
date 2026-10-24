
  /* ===========================================================================
     PHẦN 03K — MODULE "TÔI CẦN ĐƯỢC TƯ VẤN THÊM"

     Nút gắn ở cuối "Trọn bộ sản phẩm VIP..." (PHẦN 03). Bắt khách chọn ít nhất
     một sản phẩm trước khi bấm được — chưa chọn gì thì chỉ hiện lời nhắc, không
     mở modal. Modal y chang "Xác nhận đơn hàng" (PHẦN 04): cùng 5 trường liên
     lạc, cùng luật "ít nhất 1 trong 5", nhưng dùng state.tuVan RIÊNG (không
     đụng state.khachHang) vì khách có thể đang có một đơn hàng thật mở cùng lúc.

     Gửi xong ghi vào nhánh yeuCauTuVan (đọc-admin, ghi-công khai, giống khuôn
     yeuCauHoanTien) kèm DANH SÁCH SẢN PHẨM đã chọn lúc bấm nút — apps-script
     đọc nhánh này mỗi phút rồi EMAIL cho chủ shop, xem xuLyYeuCauTuVan() trong
     apps-script/gui-hang.gs. Trang admin có mục "Yêu cầu tư vấn" (PHẦN 04K)
     xem đầy đủ thông tin liên lạc + sản phẩm của từng yêu cầu.
     =========================================================================== */

  function bamTuVan(){
    if (!state.daChon.length) {
      const canhBao = document.querySelector('[data-loi="tuVanChung"]');
      if (canhBao) canhBao.textContent = 'Vui lòng chọn ít nhất một sản phẩm trước khi nhận tư vấn.';
      return;
    }
    moModalTuVan();
  }

  // nhanPhu giống PHẦN 04 — mời nhập email để nhận tư vấn nhanh qua email.
  function veOTuVan(ten, nhan, giaTri, goiY, kieu, nhanPhu){
    return '' +
      '<div class="truong">' +
        '<label for="o-tv-' + ten + '">' + escapeHtml(nhan) +
          (nhanPhu ? '<span class="nhan-phu">' + escapeHtml(nhanPhu) + '</span>' : '') +
        '</label>' +
        '<input id="o-tv-' + ten + '" type="' + kieu + '" data-truong-tu-van="' + ten + '" value="' + escapeHtml(giaTri) +
          '" autocomplete="off" inputmode="' + (kieu === 'email' ? 'email' : 'tel') + '">' +
        '<p class="goi-y">' + escapeHtml(goiY) + '</p>' +
        '<p class="loi" data-loi-tu-van="' + ten + '"></p>' +
      '</div>';
  }

  function veDanhSachSanPhamTuVan(){
    const dong = sanPhamDaChon().map(function(sp){
      return '<div class="dong-sp"><span class="ten">' + escapeHtml(sp.ten) + '</span></div>';
    }).join('');
    return '<div class="tom-tat-don">' + dong + '</div>';
  }

  function moModalTuVan(){
    if (!state.daChon.length) return;
    const tv = state.tuVan;
    moModal({
      ma: 'tu-van',
      tieuDe: 'Nhận tư vấn thêm',
      than: '' +
        veDanhSachSanPhamTuVan() +
        '<div class="khung-cam-ket-giao">' +
          '<p>Vui lòng nhập <strong>ít nhất 1 trong 5 trường</strong> (khung nhập liệu) dưới đây, bạn sẽ nhận được ' +
            '<strong>tư vấn của shop trong thời gian sớm nhất</strong> về các sản phẩm đã chọn ở trên.</p>' +
        '</div>' +
        veOTuVan('email', 'Email', tv.email,
          'Tối đa ' + GIOI_HAN_EMAIL + ' ký tự, phải có “@” và dấu chấm, không có dấu cách.', 'email',
          '- khuyến khích nhập Email để nhận tư vấn Nhanh, bỏ qua nếu chưa có email') +
        veOTuVan('zalo', 'Số zalo', tv.zalo, 'Chỉ nhập số, không dấu cách, tối đa ' + GIOI_HAN_SO + ' số, dấu “+” (nếu có) đứng đầu.', 'text') +
        veOTuVan('dienThoai', 'Số điện thoại', tv.dienThoai, 'Tự lấy theo số zalo khi đang để trống, sửa lại được thoải mái.', 'text') +
        veOTuVan('whatsapp', 'Số WhatsApp của bạn (nếu có)', tv.whatsapp,
          'Bỏ qua nếu bạn không dùng. Chỉ nhập số, tối đa ' + GIOI_HAN_SO + ' số, dấu “+” (nếu có) đứng đầu.', 'text') +
        veOTuVan('telegram', 'Số Telegram của bạn (nếu có)', tv.telegram,
          'Bỏ qua nếu bạn không dùng. Chỉ nhập số, tối đa ' + GIOI_HAN_SO + ' số, dấu “+” (nếu có) đứng đầu.', 'text') +
        '<p class="loi loi-chung" data-loi="chungTuVan">' +
          'Vui lòng nhập thông tin vào ít nhất 1 trong 5 trường (khung nhập liệu) ở phía trên' +
        '</p>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="tiep-tuc-tu-van" disabled>Tiếp tục</button>',
      khiVe: function(){ capNhatFormTuVan(); }
    });
  }

  function kiemTraTuVan(){
    const tv = state.tuVan;
    const loi = {
      email: loiEmail(tv.email),
      zalo: loiSo(tv.zalo, 'Số zalo'),
      dienThoai: loiSo(tv.dienThoai, 'Số điện thoại'),
      whatsapp: loiSo(tv.whatsapp, 'Số WhatsApp'),
      telegram: loiSo(tv.telegram, 'Số Telegram')
    };
    const coItNhatMot = TRUONG_LIEN_LAC.some(function(t){ return !!tv[t]; });
    const khongLoi = TRUONG_LIEN_LAC.every(function(t){ return !loi[t]; });
    return { loi: loi, coItNhatMot: coItNhatMot, hopLe: coItNhatMot && khongLoi };
  }

  function capNhatTruongTuVan(ten, giaTri){
    const tv = state.tuVan;
    if (ten === 'email') {
      tv.email = chuanHoaEmail(giaTri);
    } else if (ten === 'zalo') {
      tv.zalo = chuanHoaSo(giaTri);
    } else if (ten === 'dienThoai') {
      tv.dienThoai = chuanHoaSo(giaTri);
    } else if (ten === 'whatsapp' || ten === 'telegram') {
      tv[ten] = chuanHoaSo(giaTri);
    }
    capNhatFormTuVan();
  }

  function capNhatFormTuVan(){
    const ketQua = kiemTraTuVan();
    const tv = state.tuVan;
    TRUONG_LIEN_LAC.forEach(function(ten){
      const o = document.querySelector('[data-truong-tu-van="' + ten + '"]');
      if (!o) return;
      if (o.value !== tv[ten]) o.value = tv[ten];
      const oLoi = document.querySelector('[data-loi-tu-van="' + ten + '"]');
      if (oLoi) oLoi.textContent = ketQua.loi[ten] || '';
      if (ketQua.loi[ten]) o.classList.add('sai');
      else o.classList.remove('sai');
    });
    const canhBao = document.querySelector('[data-loi="chungTuVan"]');
    if (canhBao) {
      if (ketQua.coItNhatMot) canhBao.classList.remove('dang-thieu');
      else canhBao.classList.add('dang-thieu');
    }
    const nut = document.querySelector('[data-hanh-dong="tiep-tuc-tu-van"]');
    if (nut) {
      nut.disabled = !ketQua.hopLe || tv.dangGui;
      nut.textContent = tv.dangGui ? 'Đang gửi…' : 'Tiếp tục';
    }
  }

  function guiYeuCauTuVan(){
    const tv = state.tuVan;
    const ketQua = kiemTraTuVan();
    if (!ketQua.hopLe || tv.dangGui) return;
    if (!firebaseSanSang || !rtdb) { alert('Mất kết nối, vui lòng thử lại.'); return; }

    tv.dangGui = true;
    capNhatFormTuVan();

    const dsSanPham = sanPhamDaChon().map(function(sp){ return sp.ma; });

    rtdb.ref('yeuCauTuVan').push().set({
      email: tv.email,
      zalo: tv.zalo,
      dienThoai: tv.dienThoai,
      whatsapp: tv.whatsapp,
      telegram: tv.telegram,
      dsSanPham: dsSanPham,
      taoLuc: Date.now(),
      daBao: false
    }).then(function(){
      state.tuVan = { email: '', zalo: '', dienThoai: '', whatsapp: '', telegram: '', dangGui: false };
      moModalCamOnTuVan();
    }).catch(function(e){
      console.error('Không gửi được yêu cầu tư vấn:', e);
      tv.dangGui = false;
      capNhatFormTuVan();
      alert('Không gửi được. Vui lòng kiểm tra mạng rồi thử lại.');
    });
  }

  function moModalCamOnTuVan(){
    dongModal();
    moModal({
      ma: 'cam-on-tu-van',
      tieuDe: 'Đã gửi thông tin',
      than: '<p>CẢM ƠN BẠN ĐÃ CUNG CẤP THÔNG TIN, SHOP SẼ CỐ GẮNG LIÊN HỆ TRONG THỜI GIAN SỚM NHẤT CÓ THỂ!</p>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đã hiểu</button>'
    });
  }
