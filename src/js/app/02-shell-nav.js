
  /* ===========================================================================
     PHẦN 02 — VỎ GIAO DIỆN: nút nổi, menu bên trái, khung modal dùng chung.
     =========================================================================== */

  function goc(){
    return document.getElementById('root');
  }

  // Vùng chứa riêng cho chồng modal, đặt ngoài #root để việc vẽ lại nội dung
  // trang KHÔNG bao giờ xoá mất modal đang mở (và ngược lại).
  function lopModal(){
    let el = document.getElementById('lop-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lop-modal';
      document.body.appendChild(el);
    }
    return el;
  }

  // ------------------------------------------------------------- MENU TRÁI

  function veMenuTrai(){
    const muc = MODULE.map(function(m){
      const dangXem = (m.kieu === 'trang' && m.ma === state.module) ? ' dang-xem' : '';
      return '<button type="button" class="muc-menu' + dangXem + '" data-hanh-dong="mo-module" data-module="' +
        escapeHtml(m.ma) + '">' +
        '<span class="bieu-tuong" aria-hidden="true">' + escapeHtml(m.bieuTuong) + '</span>' +
        '<span class="ten-muc">' + escapeHtml(m.ten) + '</span>' +
        '</button>';
    }).join('');

    return '' +
      '<div class="lop-phu' + (state.menuMo ? ' mo' : '') + '" data-hanh-dong="dong-menu"></div>' +
      '<nav class="menu-trai' + (state.menuMo ? ' mo' : '') + '" aria-label="Danh sách module"' +
        (state.menuMo ? '' : ' aria-hidden="true"') + '>' +
        '<div class="menu-dau">' +
          '<span class="nhan">Chuyển module</span>' +
          '<span class="ten">Shop Thànhđẹptrai<span class="cham-xanh">.vn</span></span>' +
        '</div>' +
        '<div class="danh-sach">' + muc + '</div>' +
        '<div class="menu-day">Bấm ra ngoài hoặc bấm lại nút nổi để ẩn menu.</div>' +
      '</nav>';
  }

  function moMenu(){
    state.menuMo = true;
    render();
    capNhatKhoaCuon();
  }

  function dongMenu(){
    if (!state.menuMo) return;
    state.menuMo = false;
    render();
    capNhatKhoaCuon();
  }

  function doiMenu(){
    if (state.menuMo) dongMenu();
    else moMenu();
  }

  // Khoá cuộn nền khi menu hoặc modal đang che màn hình.
  function capNhatKhoaCuon(){
    const can = state.menuMo || state.modal.length > 0;
    if (!document.body || !document.body.classList) return;
    if (can) document.body.classList.add('khoa-cuon');
    else document.body.classList.remove('khoa-cuon');
  }

  // ------------------------------------------------------ CHUYỂN ĐỔI MODULE

  function moModule(ma){
    const m = timModule(ma);
    if (!m) return;
    dongMenu();
    if (m.kieu === 'modal') {
      moModalVanBan(m);
      return;
    }
    state.module = m.ma;
    datHash(m.ma);
    render();
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  // ------------------------------------------------------- KHUNG MODAL CHUNG
  //
  // Mỗi modal trong chồng là một object:
  //   { ma, tieuDe, than: '<html>', day: '<html>', khiDong: hàm (tuỳ chọn) }
  // Quy ước bắt buộc cho MỌI modal của web này: có nút X ở góc trên bên phải,
  // và ở đáy luôn có nút đóng bảng hoặc nút quay lại bước trước.

  function veChongModal(){
    const el = lopModal();
    if (!state.modal.length) {
      el.innerHTML = '';
      capNhatKhoaCuon();
      return;
    }
    el.innerHTML = state.modal.map(function(m){
      return '' +
        '<div class="modal-lop" data-ma-modal="' + escapeHtml(m.ma) + '" data-hanh-dong="dong-modal-neu-ngoai" role="dialog" aria-modal="true" aria-label="' + escapeHtml(m.tieuDe) + '">' +
          '<div class="modal">' +
            '<button type="button" class="nut-x" data-hanh-dong="dong-modal" aria-label="Đóng bảng">×</button>' +
            '<div class="modal-dau"><h2>' + escapeHtml(m.tieuDe) + '</h2></div>' +
            '<div class="modal-than">' + m.than + '</div>' +
            '<div class="modal-day">' + m.day + '</div>' +
          '</div>' +
        '</div>';
    }).join('');
    capNhatKhoaCuon();
    if (typeof state.modal[state.modal.length - 1].khiVe === 'function') {
      state.modal[state.modal.length - 1].khiVe();
    }
  }

  function moModal(modal){
    state.modal.push(modal);
    veChongModal();
  }

  // Đóng modal trên cùng. Modal bên dưới (nếu có) lộ ra — đó chính là hành vi
  // của nút "Quay lại bước trước".
  function dongModal(){
    const dong = state.modal.pop();
    if (dong && typeof dong.khiDong === 'function') dong.khiDong();
    veChongModal();
  }

  function dongHetModal(){
    while (state.modal.length) {
      const m = state.modal.pop();
      if (m && typeof m.khiDong === 'function') m.khiDong();
    }
    veChongModal();
  }

  // Modal văn bản dùng cho "Điều khoản sử dụng và điều kiện" và
  // "Bảo mật và quyền riêng tư" — hai mục này chưa có nội dung thật.
  function moModalVanBan(m){
    moModal({
      ma: 'van-ban-' + m.ma,
      tieuDe: m.ten,
      than: '' +
        '<div class="noi-dung-van-ban">' +
          '<p style="text-align:center;font-size:2.4rem;margin-bottom:10px" aria-hidden="true">🛠️</p>' +
          '<p style="text-align:center"><strong>Nội dung đang được nâng cấp.</strong></p>' +
          '<p style="text-align:center;color:var(--chu-diu);margin-bottom:0">Phần “' + escapeHtml(m.ten) +
          '” sẽ sớm có đầy đủ nội dung. Trong lúc chờ, mọi thắc mắc xin liên hệ trực tiếp với shop.</p>' +
        '</div>',
      day: '<button type="button" class="nut-day chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  // ---------------------------------------------------- VẼ TOÀN BỘ GIAO DIỆN

  function veNoiDungModule(){
    const m = timModule(state.module);
    if (m && m.ma === 'goi-vip') return veModuleGoiVip();
    return veManNangCap(m ? m.ten : '');
  }

  function veManNangCap(ten){
    return '' +
      '<div class="man-nang-cap">' +
        '<div class="hinh" aria-hidden="true">🛠️</div>' +
        '<h2>Tính năng đang nâng cấp</h2>' +
        '<p>Module “' + escapeHtml(ten) + '” đang được xây dựng và sẽ mở trong thời gian tới.</p>' +
        '<p style="margin-top:14px;margin-bottom:0">Mời bạn xem <strong>Gói hàng VIP Lightroom</strong> — phần đã sẵn sàng phục vụ.</p>' +
      '</div>';
  }

  function render(){
    const el = goc();
    if (!el) return;
    const m = timModule(state.module);
    const coThanhDay = !!(m && m.ma === 'goi-vip');

    el.innerHTML = '' +
      '<button type="button" class="nut-noi" data-hanh-dong="doi-menu" aria-label="Chuyển module" aria-expanded="' +
        (state.menuMo ? 'true' : 'false') + '">' +
        '<span class="vach"></span><span class="vach"></span><span class="vach"></span>' +
      '</button>' +
      veMenuTrai() +
      '<header class="thanh-tieu-de">' +
        '<h1 class="ten-shop">Shop Thànhđẹptrai<span class="cham-xanh">.vn</span></h1>' +
      '</header>' +
      '<main class="khung-noi-dung' + (coThanhDay ? '' : ' khong-thanh-day') + '">' +
        veNoiDungModule() +
      '</main>' +
      (coThanhDay ? veThanhBaoGia() : '');
  }
