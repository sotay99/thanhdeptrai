
  /* ===========================================================================
     PHẦN 02 — VỎ GIAO DIỆN: nút nổi, menu bên trái, khung bảng phụ (modal)
     dùng chung, và 2 nút cuộn tự động cho mọi bảng phụ.
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
        '<div class="menu-day">Chọn module xong menu vẫn mở. Bấm nút ✕ hoặc bấm ra ngoài khung để ẩn menu.</div>' +
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

  // Chọn module KHÔNG đóng khung menu — khách chuyển qua lại nhiều module liên
  // tiếp mà không phải mở menu lại từ đầu. Menu chỉ đóng bằng nút X hoặc bấm ra
  // ngoài khung.
  function moModule(ma){
    const m = timModule(ma);
    if (!m) return;
    if (m.kieu === 'modal') {
      moModalVanBan(m);
      return;
    }
    state.module = m.ma;
    state.hieuUngVaoModule = true;   // vào lại module bao nhiêu lần cũng trôi lại
    datHash(m.ma);
    render();
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  // ------------------------------------------ KÉO THẢ MỘT NHÓM NÚT NỔI (DỌC)
  //
  // Cả nhóm dịch chuyển CÙNG một khoảng, giới hạn theo phần tử chạm biên màn
  // hình sớm nhất — nhờ vậy các nút luôn giữ nguyên khoảng cách với nhau,
  // không nút nào đè lên nút nào khi kéo tới sát mép.

  function keoThaNhom(danhSach){
    danhSach.forEach(function(muc){
      const el = muc.el;
      if (!el || el.dataset.daGanKeoTha) return;
      el.dataset.daGanKeoTha = '1';

      let dangKeo = false, batDauY = 0, giaTriDau = [], daDiChuyen = false;

      const khiNhan = function(su){
        dangKeo = true;
        daDiChuyen = false;
        batDauY = su.touches ? su.touches[0].clientY : su.clientY;
        giaTriDau = danhSach.map(function(m2){ return parseFloat(getComputedStyle(m2.el).top) || 0; });
        document.addEventListener('mousemove', khiDi);
        document.addEventListener('mouseup', khiTha);
        document.addEventListener('touchmove', khiDi, { passive: false });
        document.addEventListener('touchend', khiTha);
      };

      const khiDi = function(su){
        if (!dangKeo) return;
        const yHienTai = su.touches ? su.touches[0].clientY : su.clientY;
        let lech = yHienTai - batDauY;
        if (Math.abs(lech) > 4) daDiChuyen = true;
        if (!daDiChuyen) return;
        if (su.cancelable) su.preventDefault();
        // Ép khoảng dịch chuyển chung vào trong màn hình trước, rồi mới áp cho
        // cả nhóm — cả nhóm dừng cùng lúc thay vì từng nút chạm biên riêng lẻ.
        danhSach.forEach(function(m2, i){
          const moi = giaTriDau[i] + lech;
          const traMax = window.innerHeight - m2.el.offsetHeight - 4;
          if (moi < 4) lech = 4 - giaTriDau[i];
          else if (moi > traMax) lech = traMax - giaTriDau[i];
        });
        danhSach.forEach(function(m2, i){ m2.el.style.top = (giaTriDau[i] + lech) + 'px'; });
      };

      const khiTha = function(){
        dangKeo = false;
        document.removeEventListener('mousemove', khiDi);
        document.removeEventListener('mouseup', khiTha);
        document.removeEventListener('touchmove', khiDi);
        document.removeEventListener('touchend', khiTha);
        if (daDiChuyen) {
          // Chặn cú bấm "ma" ngay sau khi kéo, nhưng chỉ trong 300ms — chờ vô
          // thời hạn sẽ ăn mất lần bấm THẬT kế tiếp của người dùng.
          const chan = function(ev){ ev.stopPropagation(); ev.preventDefault(); };
          el.addEventListener('click', chan, { capture: true });
          setTimeout(function(){ el.removeEventListener('click', chan, { capture: true }); }, 300);
        }
      };

      el.addEventListener('mousedown', khiNhan);
      el.addEventListener('touchstart', khiNhan, { passive: true });
    });
  }

  // ------------------------------------ 2 NÚT CUỘN LÊN ĐẦU / XUỐNG CUỐI MODAL
  //
  // QUY ĐỊNH CHUNG TOÀN WEB: mọi bảng phụ — kể cả bảng viết trong TƯƠNG LAI —
  // đều tự có 2 nút này, không phải khai báo gì thêm. Bộ theo dõi DOM bên dưới
  // tự phát hiện bảng mới và chèn nút vào.
  //
  // Bấm HOẶC chỉ rê chuột vào là cuộn luôn (thao tác nhanh, đỡ phải bấm chính
  // xác), và kéo thả được theo chiều dọc nếu che mất nội dung.

  function ganNutCuonModal(lop){
    // Kiểm tra THỰC TẾ nút còn nằm trong bảng hay không, KHÔNG dựa vào cờ "đã
    // gắn rồi": mỗi lần vẽ lại chồng modal là innerHTML bị thay sạch, hai nút
    // biến mất trong khi cờ cũ vẫn còn — nút sẽ không bao giờ được chèn lại.
    if (lop.querySelector(':scope > .nut-cuon-modal[data-huong="len"]')) return;

    const dichCuon = function(){
      const than = lop.querySelector('.modal-than');
      return than ? [lop, than] : [lop];
    };

    const nutLen = document.createElement('button');
    nutLen.type = 'button';
    nutLen.className = 'nut-cuon-modal';
    nutLen.dataset.huong = 'len';
    nutLen.title = 'Cuộn lên đầu';
    nutLen.textContent = '▲';
    nutLen.style.top = '35vh';

    const nutXuong = document.createElement('button');
    nutXuong.type = 'button';
    nutXuong.className = 'nut-cuon-modal';
    nutXuong.dataset.huong = 'xuong';
    nutXuong.title = 'Cuộn xuống cuối';
    nutXuong.textContent = '▼';
    nutXuong.style.top = 'calc(35vh + 46px)';

    const lenDau = function(){ dichCuon().forEach(function(t){ t.scrollTo({ top: 0, behavior: 'smooth' }); }); };
    const xuongCuoi = function(){ dichCuon().forEach(function(t){ t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }); }); };

    nutLen.addEventListener('click', lenDau);
    nutLen.addEventListener('mouseenter', lenDau);
    nutXuong.addEventListener('click', xuongCuoi);
    nutXuong.addEventListener('mouseenter', xuongCuoi);

    lop.appendChild(nutLen);
    lop.appendChild(nutXuong);
    keoThaNhom([{ el: nutLen }, { el: nutXuong }]);
  }

  function theoDoiNutCuonModal(){
    if (window.__theoDoiNutCuon) return;
    window.__theoDoiNutCuon = new MutationObserver(function(danhSach){
      danhSach.forEach(function(thayDoi){
        // Bảng phụ MỚI vừa được thêm vào trang.
        thayDoi.addedNodes.forEach(function(nut){
          if (nut.nodeType !== 1) return;
          if (nut.classList && nut.classList.contains('modal-lop')) ganNutCuonModal(nut);
          if (nut.querySelectorAll) nut.querySelectorAll('.modal-lop').forEach(ganNutCuonModal);
        });
        // Nội dung BÊN TRONG một bảng phụ có sẵn bị vẽ lại — hai nút vừa bị
        // xoá theo, phải chèn lại ngay.
        const dich = thayDoi.target;
        if (!dich || dich.nodeType !== 1) return;
        const lop = dich.classList && dich.classList.contains('modal-lop')
          ? dich
          : (dich.closest ? dich.closest('.modal-lop') : null);
        if (lop) ganNutCuonModal(lop);
      });
    });
    window.__theoDoiNutCuon.observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------- KHUNG MODAL CHUNG
  //
  // Mỗi modal trong chồng là một object:
  //   { ma, tieuDe, than: '<html>', day: '<html>', khiVe, khiDong }
  // Quy ước bắt buộc cho MỌI bảng phụ của web này: có nút X ở góc trên bên
  // phải, ở đáy luôn có nút đóng bảng hoặc nút quay lại bước trước, và 2 nút
  // cuộn ở mép phải màn hình (tự chèn, không phải khai báo).
  //
  // CỐ Ý KHÔNG đóng bảng khi bấm ra vùng tối bên ngoài: khách đang nhập dở
  // thông tin đơn hàng mà lỡ tay bấm trượt là mất sạch. Chỉ nút X hoặc nút ở
  // đáy bảng mới đóng được.

  function veChongModal(){
    const el = lopModal();
    if (!state.modal.length) {
      el.innerHTML = '';
      capNhatKhoaCuon();
      return;
    }
    el.innerHTML = state.modal.map(function(m){
      return '' +
        '<div class="modal-lop" data-ma-modal="' + escapeHtml(m.ma) + '" role="dialog" aria-modal="true" aria-label="' + escapeHtml(m.tieuDe) + '">' +
          '<div class="modal">' +
            '<button type="button" class="modal-x" data-hanh-dong="dong-modal" aria-label="Đóng bảng">✕</button>' +
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
        '<div class="noi-dung-van-ban" style="text-align:center">' +
          '<p style="font-size:28px;margin-bottom:8px" aria-hidden="true">🛠️</p>' +
          '<p><strong>Nội dung đang được nâng cấp.</strong></p>' +
          '<p style="color:var(--chu-diu);margin-bottom:0">Phần “' + escapeHtml(m.ten) +
          '” sẽ sớm có đầy đủ nội dung. Trong lúc chờ, mọi thắc mắc xin liên hệ trực tiếp với shop.</p>' +
        '</div>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  function moModalChiTietSanPham(ma){
    const sp = timSanPham(ma);
    if (!sp) return;
    moModal({
      ma: 'chi-tiet-' + sp.ma,
      tieuDe: 'Chi tiết sản phẩm',
      than: '' +
        '<div class="noi-dung-van-ban">' +
          '<h3 style="margin:0 0 4px">' + escapeHtml(sp.ten) + '</h3>' +
          '<p class="hang-gia" style="margin-bottom:0">' +
            '<span class="gia-goc">' + dinhDangTien(sp.giaGoc) + '</span> ' +
            '<span class="phan-tram">giảm giá ' + phanTramGiamSanPham(sp) + '%</span> ' +
            '<span class="chi-con">chỉ còn</span> ' +
            '<span class="gia-chot">' + dinhDangTien(sp.giaChot) + '</span>' +
          '</p>' +
          '<div style="text-align:center;padding:18px 0 4px">' +
            '<p style="font-size:28px;margin-bottom:8px" aria-hidden="true">🛠️</p>' +
            '<p><strong>Phần mô tả chi tiết đang được nâng cấp.</strong></p>' +
            '<p style="color:var(--chu-diu);margin-bottom:0">Nội dung riêng của từng sản phẩm sẽ sớm được bổ sung đầy đủ tại đây.</p>' +
          '</div>' +
        '</div>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
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
        '<p style="margin-top:10px;margin-bottom:0">Mời bạn xem <strong class="chu-nhan">Gói hàng VIP Lightroom</strong> — phần đã sẵn sàng phục vụ.</p>' +
      '</div>';
  }

  function render(){
    const el = goc();
    if (!el) return;
    const m = timModule(state.module);
    const coThanhDay = !!(m && m.ma === 'goi-vip');

    el.innerHTML = '' +
      '<button type="button" class="nut-noi' + (state.menuMo ? ' menu-dang-mo' : '') +
        '" data-hanh-dong="doi-menu" aria-label="' + (state.menuMo ? 'Đóng menu' : 'Chuyển module') +
        '" aria-expanded="' + (state.menuMo ? 'true' : 'false') + '">' +
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

    // Gắn hiệu ứng NGAY SAU khi HTML mới đã nằm trong trang.
    ganHieuUngTroiLen();
  }
