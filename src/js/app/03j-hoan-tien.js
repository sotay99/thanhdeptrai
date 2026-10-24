  /* ===========================================================================
     PHẦN 03J — MODULE "YÊU CẦU HOÀN TIỀN"

     Y chang biểu mẫu Google Form gốc shop đang dùng: 5 câu hỏi, 4 câu bắt
     buộc + "Tên sản phẩm..." cũng bắt buộc theo yêu cầu riêng của shop (khác
     bản Google Form gốc, nơi câu đó để trống được). Mỗi ô giới hạn 1000 ký tự.

     KHÔNG có trang xem ở /admin — gửi xong chỉ ghi vào nhánh Firebase
     yeuCauHoanTien (đọc-admin, ghi-công khai, giống khuôn các nhánh "yêu cầu"
     khác), apps-script đọc nhánh này mỗi phút rồi EMAIL cho chủ shop kèm đủ
     nội dung khách đã nhập — xem xuLyYeuCauHoanTien() trong
     apps-script/gui-hang.gs.
     =========================================================================== */

  const GIOI_HAN_HOAN_TIEN = 1000;   // ký tự tối đa mỗi ô

  // batBuoc: true cho cả 5 ô, theo đúng yêu cầu của shop (khác bản Google Form
  // gốc, nơi câu "Tên sản phẩm..." để trống được).
  const O_HOAN_TIEN = [
    { truong: 'hoTen',           nhan: 'Họ và Tên của bạn?',                                            kieu: 'input' },
    { truong: 'tenSanPham',      nhan: 'Tên sản phẩm mà bạn đã mua và muốn Hoàn tiền lại?',               kieu: 'input' },
    { truong: 'soTienMuonNhan',  nhan: 'Số tiền muốn nhận lại?',                                         kieu: 'input' },
    { truong: 'lyDo',            nhan: 'Tại sao bạn muốn hoàn trả lại tiền sản phẩm bạn đã mua?',         kieu: 'textarea' },
    { truong: 'maSanPham',       nhan: 'Mã sản phẩm (hoặc link sản phẩm) của bạn tại trang web? (Nếu không nhớ, bạn có thể xem lại trong email Shop gửi hoặc tin nhắn của shop).', kieu: 'input' },
    { truong: 'soTaiKhoan',      nhan: 'Số tài khoản của bạn kèm theo tên ngân hàng (để nhận tiền được hoàn trả lại)!', kieu: 'input' }
  ];

  function veOHoanTien(o, giaTri){
    const than = o.kieu === 'textarea'
      ? '<textarea id="o-ht-' + o.truong + '" data-truong-hoan-tien="' + o.truong + '" rows="4"' +
        ' maxlength="' + GIOI_HAN_HOAN_TIEN + '" autocomplete="off">' + escapeHtml(giaTri) + '</textarea>'
      : '<input id="o-ht-' + o.truong + '" type="text" data-truong-hoan-tien="' + o.truong + '"' +
        ' maxlength="' + GIOI_HAN_HOAN_TIEN + '" autocomplete="off" value="' + escapeHtml(giaTri) + '">';
    return '' +
      '<div class="truong">' +
        '<label for="o-ht-' + o.truong + '">' + escapeHtml(o.nhan) + ' <span class="dau-bat-buoc">*</span></label>' +
        than +
        '<p class="loi" data-loi-hoan-tien="' + o.truong + '"></p>' +
      '</div>';
  }

  function moModalHoanTien(m){
    const y = state.yeuCauHoanTien;
    moModal({
      ma: 'hoan-tien',
      tieuDe: m.ten,
      than: '' +
        '<div class="khoi-mo-ta khoi-luu-y"><h4>Được hoàn tiền nếu KHÔNG QUÁ 15 ngày kể từ ngày mua sản phẩm</h4></div>' +
        '<p class="dan-nhap-modal">Thành luôn hỗ trợ hết mình nếu bạn yêu cầu hoàn tiền mua sản phẩm! Vui lòng ' +
          'điền đủ thông tin bên dưới (mỗi ô tối đa ' + GIOI_HAN_HOAN_TIEN + ' ký tự).</p>' +
        O_HOAN_TIEN.map(function(o){ return veOHoanTien(o, y[o.truong]); }).join('') +
        '<p class="loi loi-chung" data-loi="chungHoanTien"></p>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="gui-yeu-cau-hoan-tien" disabled>' +
          'Gửi yêu cầu</button>',
      khiVe: function(){ capNhatFormHoanTien(); }
    });
  }

  function capNhatTruongHoanTien(truong, giaTri){
    const y = state.yeuCauHoanTien;
    if (!O_HOAN_TIEN.some(function(o){ return o.truong === truong; })) return;
    y[truong] = String(giaTri == null ? '' : giaTri).slice(0, GIOI_HAN_HOAN_TIEN);
    capNhatFormHoanTien();
  }

  // Cập nhật TẠI CHỖ (không vẽ lại cả modal) để con trỏ nhập không bị nhảy —
  // cùng lý do với capNhatFormKhachHang() ở PHẦN 04.
  function capNhatFormHoanTien(){
    const y = state.yeuCauHoanTien;
    let thieu = 0;
    O_HOAN_TIEN.forEach(function(o){
      const trong = !String(y[o.truong] || '').trim();
      const oLoi = document.querySelector('[data-loi-hoan-tien="' + o.truong + '"]');
      if (oLoi) oLoi.textContent = trong ? 'Vui lòng điền câu này.' : '';
      if (trong) thieu++;
    });
    const canhBao = document.querySelector('[data-loi="chungHoanTien"]');
    if (canhBao) canhBao.textContent = thieu ? 'Vui lòng điền đủ ' + O_HOAN_TIEN.length + ' câu hỏi ở trên.' : '';

    const nutGui = document.querySelector('[data-hanh-dong="gui-yeu-cau-hoan-tien"]');
    if (nutGui) {
      nutGui.disabled = !!thieu || y.dangGui;
      nutGui.textContent = y.dangGui ? 'Đang gửi…' : 'Gửi yêu cầu';
    }
  }

  function guiYeuCauHoanTien(){
    const y = state.yeuCauHoanTien;
    const thieu = O_HOAN_TIEN.some(function(o){ return !String(y[o.truong] || '').trim(); });
    if (thieu || y.dangGui) return;
    if (!firebaseSanSang || !rtdb) { alert('Mất kết nối, vui lòng thử lại.'); return; }

    y.dangGui = true;
    capNhatFormHoanTien();

    rtdb.ref('yeuCauHoanTien').push().set({
      hoTen: y.hoTen,
      tenSanPham: y.tenSanPham,
      soTienMuonNhan: y.soTienMuonNhan,
      lyDo: y.lyDo,
      maSanPham: y.maSanPham,
      soTaiKhoan: y.soTaiKhoan,
      taoLuc: Date.now(),
      daBao: false
    }).then(function(){
      state.yeuCauHoanTien = {
        hoTen: '', tenSanPham: '', soTienMuonNhan: '', lyDo: '', maSanPham: '', soTaiKhoan: '', dangGui: false
      };
      moModalCamOnHoanTien();
    }).catch(function(e){
      console.error('Không gửi được yêu cầu hoàn tiền:', e);
      y.dangGui = false;
      capNhatFormHoanTien();
      alert('Không gửi được. Vui lòng kiểm tra mạng rồi thử lại.');
    });
  }

  function moModalCamOnHoanTien(){
    dongModal();
    moModal({
      ma: 'cam-on-hoan-tien',
      tieuDe: 'Đã gửi yêu cầu',
      than: '<p>CẢM ƠN BẠN ĐÃ SỬ DỤNG SẢN PHẨM CỦA THÀNH, BẠN VUI LÒNG CHỜ HỆ THỐNG SẼ XỬ LÝ YÊU CẦU CỦA BẠN ' +
        'TRONG THỜI GIAN SỚM NHẤT! BẠN SẼ ĐƯỢC HOÀN TIỀN 100%!</p>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }
