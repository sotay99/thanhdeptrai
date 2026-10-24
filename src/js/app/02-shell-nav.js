
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

  // Mở / đóng menu chỉ đổi đúng ba phần tử liên quan, KHÔNG vẽ lại cả trang.
  // Vẽ lại sẽ xoá sạch hiệu ứng xuất hiện đang chạy dở của lưới sản phẩm —
  // lỗi thật đã xảy ra: vào module qua menu rồi bấm đóng menu là bảy tám thẻ
  // đang trôi bụp hiện hết cùng lúc.
  function capNhatKhungMenu(){
    const nut = document.querySelector('.nut-noi');
    const khung = document.querySelector('.menu-trai');
    const phu = document.querySelector('.lop-phu');
    if (nut) {
      nut.classList.toggle('menu-dang-mo', state.menuMo);
      nut.setAttribute('aria-expanded', state.menuMo ? 'true' : 'false');
      nut.setAttribute('aria-label', state.menuMo ? 'Đóng menu' : 'Chuyển module');
    }
    if (khung) {
      khung.classList.toggle('mo', state.menuMo);
      if (state.menuMo) khung.removeAttribute('aria-hidden');
      else khung.setAttribute('aria-hidden', 'true');
    }
    if (phu) phu.classList.toggle('mo', state.menuMo);
    capNhatKhoaCuon();
  }

  function moMenu(){
    state.menuMo = true;
    capNhatKhungMenu();
  }

  function dongMenu(){
    if (!state.menuMo) return;
    state.menuMo = false;
    capNhatKhungMenu();
  }

  function doiMenu(){
    if (state.menuMo) dongMenu();
    else moMenu();
  }

  // -------------------------------------------- "NHẤP NHÁY GỢI Ý" MỤC MENU
  //
  // Dùng ở Trang chủ (PHẦN 05B) và ở 3 nút quà tặng trong module "Trọn bộ sản
  // phẩm VIP" (PHẦN 03) — và ở MỌI thanh chạy chữ gắn thêm đầu/cuối các
  // module khác (xem veNoiDungModule() dưới đây). Mở khung menu (không đóng
  // nếu đã mở), cuộn tới đúng mục trong khung đó rồi cho nó nhấp nháy để
  // khách TỰ bấm — CỐ Ý không nhảy module, khác hẳn moModule().
  function goiYMoModule(ma){
    const dangMoRoi = state.menuMo;
    moMenu();
    // Khung vừa trượt ra mất .3s (CSS .menu-trai) — đợi gần xong rồi mới tìm
    // phần tử, nếu không scrollIntoView() tính toán trên vị trí CHƯA trượt
    // tới, cuộn sai chỗ. Khung đã mở sẵn thì không cần đợi.
    setTimeout(function(){
      const muc = document.querySelector('.menu-trai .muc-menu[data-module="' + ma + '"]');
      if (!muc) return;
      muc.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const cu = document.querySelector('.muc-menu.nhap-nhay');
      if (cu && cu !== muc) cu.classList.remove('nhap-nhay');
      // Gỡ rồi gắn lại ngay — nếu bấm lại đúng mục đang nhấp nháy dở thì
      // animation phải CHẠY LẠI TỪ ĐẦU chứ không đứng yên (đã có class rồi
      // thì gắn thêm lần nữa trình duyệt coi như không đổi gì).
      muc.classList.remove('nhap-nhay');
      void muc.offsetWidth;   // ép trình duyệt tính lại style trước khi gắn lại
      muc.classList.add('nhap-nhay');
      muc.addEventListener('animationend', function xong(){
        muc.classList.remove('nhap-nhay');
        muc.removeEventListener('animationend', xong);
      });
    }, dangMoRoi ? 30 : 340);
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
    // Đang ở trang nhận hàng mà chọn một module thì phải rời "/sanpham" về "/",
    // nếu không địa chỉ trên thanh trình duyệt nói một đằng còn nội dung hiện
    // một nẻo.
    //
    // Cả quãng đường đó chỉ được ghi MỘT mục lịch sử: đường dẫn và #hash đổi
    // trong cùng một cú pushState. Làm hai bước (đổi đường dẫn rồi mới đặt hash)
    // là sinh hai mục, và khách phải bấm nút quay lại HAI lần mới về được trang
    // nhận sản phẩm — trong khi thư của shop dặn họ bấm quay lại một lần.
    const roiTrangNhanHang = state.trang === 'sanpham';
    state.module = m.ma;
    state.hieuUngVaoModule = true;   // vào lại module bao nhiêu lần cũng trôi lại
    if (m.ma === 'image-editor-pro') hienCanhBaoImageEditorPro();
    if (roiTrangNhanHang) {
      state.trang = 'chinh';
      dongHetModal();
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/#/' + m.ma);
      } else {
        datHash(m.ma);
      }
    } else {
      datHash(m.ma);
    }
    render();   // vẽ lại cả trang, menu giữ nguyên trạng thái đang mở/đóng
    if (window.scrollTo) window.scrollTo(0, 0);
  }

  // Rời trang có địa chỉ riêng (nhận hàng, quản trị) về trang chính.
  function veTrangChinh(){
    if (state.trang === 'chinh') return;
    state.trang = 'chinh';
    dongHetModal();
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', '/' + (window.location.hash || ''));
    }
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
  // Bảng "Đặc quyền dành cho khách hàng đã từng mua hàng của shop". Dựng đúng
  // bằng bộ khối và hiệu ứng của bảng mô tả sản phẩm — khác mỗi tiêu đề, nội
  // dung, và nút ở đáy là "Liên hệ Zalo" thay cho "Chọn sản phẩm này".
  function moModalDacQuyen(m){
    moModal({
      ma: 'dac-quyen',
      tieuDe: m.ten,
      than: '<div class="mo-ta-sp">' + veNoiDungDacQuyen() + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        // CỐ Ý KHÔNG dùng thẻ <a href>: làm vậy là in thẳng số Zalo của shop vào
        // HTML. Nút này chỉ mang một hành động; địa chỉ được dựng lúc bấm từ
        // con số đọc được ở Realtime Database (xem moZaloShop ở PHẦN 05).
        '<button type="button" class="nut nut-zalo" data-hanh-dong="lien-he-zalo">Liên hệ Zalo</button>'
    });
  }

  // Mỗi mục liên hệ: trường đọc từ /thongtinlienhe, nhãn hiện ra, và loại để
  // dựng đúng địa chỉ "Mở" (xem diaChiMoLienHe bên dưới). Mục nào admin để
  // trống thì veDongLienHe() tự bỏ qua, không hiện dòng nào.
  //
  // CỐ Ý KHÔNG liệt kê 'zaloLienKet' ở đây dù admin có ô nhập riêng cho nó
  // (O_LIEN_HE, PHẦN 04B) — số Zalo liên kết chỉ dùng NỘI BỘ cho luồng "Đặt
  // mua App VIP Pro" (PHẦN 03E), không công khai ở module Liên hệ.
  const MUC_LIEN_HE = [
    { truong: 'zalo',        nhan: 'Zalo',                           loai: 'zalo' },
    { truong: 'whatsapp',    nhan: 'WhatsApp',                       loai: 'whatsapp' },
    { truong: 'telegram',    nhan: 'Telegram',                       loai: 'telegram' },
    { truong: 'emailShop',   nhan: 'Email',                          loai: 'email' },
    { truong: 'tiktok',      nhan: 'TikTok',                         loai: 'link' },
    { truong: 'youtube',     nhan: 'YouTube',                        loai: 'link' },
    { truong: 'fanpage',     nhan: 'Fanpage Facebook',                loai: 'link' },
    { truong: 'groupFB',     nhan: 'Group Facebook',                 loai: 'link' }
  ];

  function diaChiMoLienHe(loai, giaTri){
    const g = String(giaTri || '').trim();
    if (!g) return '';
    if (loai === 'zalo') return 'https://zalo.me/' + g.replace(/\D/g, '');
    if (loai === 'whatsapp') return 'https://wa.me/' + g.replace(/\D/g, '');
    if (loai === 'email') return 'mailto:' + g;
    if (loai === 'telegram') {
      if (/^https?:\/\//i.test(g)) return g;
      return 'https://t.me/' + g.replace(/^@/, '');
    }
    // loai === 'link' (TikTok/YouTube/Fanpage/Group) — admin dán link đầy đủ,
    // chỉ thêm https:// nếu lỡ gõ thiếu.
    return /^https?:\/\//i.test(g) ? g : 'https://' + g;
  }

  function veDongLienHe(muc){
    const gia = String((state.thongTinLienHe || {})[muc.truong] || '').trim();
    if (!gia) return '';
    const diaChi = diaChiMoLienHe(muc.loai, gia);
    return '' +
      '<div class="dong-lien-he">' +
        '<span class="nhan-lien-he">' + escapeHtml(muc.nhan) + '</span>' +
        '<span class="gia-tri-lien-he">' + escapeHtml(gia) + '</span>' +
        '<div class="hang-nut-lien-he">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="sao-chep" data-chuoi="' +
            escapeHtml(gia) + '">📋 Sao chép</button>' +
          (diaChi
            ? '<a class="nut nut-nho nut-chinh" href="' + escapeHtml(diaChi) + '" target="_blank" rel="noopener">↗ Mở</a>'
            : '') +
        '</div>' +
      '</div>';
  }

  function moModalLienHe(m){
    // Dữ liệu thường đã đọc sẵn từ lúc boot (xem taiThongTinLienHe ở PHẦN 05),
    // nhưng phòng khi bảng mở ra trước khi kịp tải xong thì tải lại rồi vẽ lại
    // ĐÚNG bảng này một lần nữa — chỉ khi bảng vẫn còn đang mở.
    if (!state.thongTinLienHeDaTai) {
      taiThongTinLienHe().then(function(){
        const dangMo = state.modal.some(function(x){ return x.ma === 'lien-he'; });
        if (dangMo) { dongModal(); moModalLienHe(m); }
      });
    }
    const du = state.thongTinLienHe || {};
    const coDuLieu = MUC_LIEN_HE.some(function(muc){ return String(du[muc.truong] || '').trim(); });
    const dangTai = !state.thongTinLienHeDaTai;
    moModal({
      ma: 'lien-he',
      tieuDe: m.ten,
      than: coDuLieu
        ? '<div class="danh-sach-lien-he">' + MUC_LIEN_HE.map(veDongLienHe).join('') + '</div>'
        : '' +
          '<div class="noi-dung-van-ban" style="text-align:center">' +
            '<p style="font-size:28px;margin-bottom:8px" aria-hidden="true">' + (dangTai ? '⏳' : '🛠️') + '</p>' +
            '<p><strong>' + (dangTai ? 'Đang tải thông tin liên hệ…' : 'Thông tin liên hệ đang được cập nhật.') + '</strong></p>' +
            (dangTai ? '' : '<p style="color:var(--chu-diu);margin-bottom:0">Mời bạn quay lại bảng này sau nhé.</p>') +
          '</div>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  // Dòng "Liên hệ" đứng cuối cả hai bảng văn bản — bấm là mở module Liên hệ
  // và Thông tin về Shop (chồng thêm một modal nữa lên trên, không đóng bảng
  // đang đọc — đóng bảng trên cùng là quay lại y nguyên vị trí đang đọc).
  function dongLienHeCuoiVanBan(){
    return '<p class="dong-lien-he-cuoi">Mọi thắc mắc khác, xin liên hệ: ' +
      '<button type="button" class="nut-lien-ket-module" data-hanh-dong="mo-module" data-module="lien-he">' +
      'Liên hệ và Thông tin về Shop</button>.</p>';
  }

  function moModalDieuKhoan(m){
    moModal({
      ma: 'van-ban-dieu-khoan',
      tieuDe: m.ten,
      than: '' +
        '<div class="noi-dung-van-ban">' +
          '<p>Việc bạn truy cập và mua hàng tại <strong>thanhdeptrai.vn</strong> đồng nghĩa với việc bạn đã đọc, ' +
            'hiểu và đồng ý với các điều khoản dưới đây.</p>' +

          '<h3>1. Sản phẩm số và hình thức giao hàng</h3>' +
          '<p>Toàn bộ sản phẩm trên web (preset, phần mềm, khoá học...) đều là <strong>sản phẩm số</strong>, giao ' +
            'tự động qua email ngay sau khi nhận được thanh toán, hoặc qua tin nhắn Zalo/SMS nếu bạn không để lại ' +
            'email. Mỗi khách nhận một đường dẫn lấy hàng riêng, không dùng chung với ai khác.</p>' +

          '<h3>2. Giá bán và thanh toán</h3>' +
          '<p>Giá hiển thị trên web là giá cuối cùng khách phải trả. Thanh toán bằng hình thức chuyển khoản qua mã ' +
            'QR; shop <strong>không lưu và không yêu cầu</strong> thông tin thẻ hay tài khoản ngân hàng của bạn.</p>' +

          '<h3>3. Chính sách hoàn tiền</h3>' +
          '<p>Shop hoàn tiền <strong>100%</strong> nếu bạn không hài lòng trong <strong>15 ngày đầu sử dụng</strong>, ' +
            'không hỏi lý do dài dòng. Gửi yêu cầu qua mục ' +
            '<button type="button" class="nut-lien-ket-module" data-hanh-dong="mo-module" data-module="hoan-tien">' +
            'Yêu cầu hoàn tiền</button> ở menu bên trái.</p>' +

          '<h3>4. Quyền sử dụng sản phẩm</h3>' +
          '<p>Sản phẩm bạn mua chỉ dùng cho <strong>mục đích cá nhân</strong>. Tuyệt đối không chia sẻ, bán lại, ' +
            'hay phân phối dưới bất kỳ hình thức nào cho bên thứ ba.</p>' +

          '<h3>5. Giới hạn trách nhiệm</h3>' +
          '<p>Một số sản phẩm liên quan tới phần mềm của bên thứ ba (Adobe Lightroom, Photoshop...). Shop không ' +
            'chịu trách nhiệm về lỗi hay thay đổi phát sinh từ chính các ứng dụng gốc đó — những vấn đề thuộc về ' +
            'preset/khoá học do shop cung cấp, shop luôn hỗ trợ tận nơi.</p>' +

          '<h3>6. Thay đổi điều khoản</h3>' +
          '<p>Shop có quyền cập nhật các điều khoản này bất cứ lúc nào. Bản mới nhất luôn được hiển thị tại đúng ' +
            'mục này.</p>' +

          '<h3>7. Liên hệ</h3>' +
          dongLienHeCuoiVanBan() +
        '</div>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  function moModalBaoMat(m){
    moModal({
      ma: 'van-ban-bao-mat',
      tieuDe: m.ten,
      than: '' +
        '<div class="noi-dung-van-ban">' +
          '<p>Shop <strong>thanhdeptrai.vn</strong> tôn trọng quyền riêng tư của khách hàng. Chính sách dưới đây ' +
            'giải thích rõ chúng tôi thu thập gì, dùng vào việc gì, và bảo vệ thông tin của bạn ra sao.</p>' +

          '<h3>1. Thông tin thu thập</h3>' +
          '<p>Chỉ khi bạn chủ động đặt mua hàng hoặc gửi yêu cầu hoàn tiền, shop mới ghi nhận: email, số Zalo/điện ' +
            'thoại, và nội dung bạn tự nhập vào biểu mẫu. Ngoài ra, trình duyệt của bạn tự sinh một ' +
            '<strong>mã thiết bị ngẫu nhiên</strong> (lưu cục bộ, không định danh cá nhân) để nhận đúng hàng đã ' +
            'mua. Shop <strong>không bao giờ</strong> thu thập mật khẩu hay thông tin thẻ/tài khoản ngân hàng của ' +
            'bạn.</p>' +

          '<h3>2. Mục đích sử dụng</h3>' +
          '<p>Thông tin thu thập được chỉ dùng để <strong>giao sản phẩm, hỗ trợ và liên hệ khi cần thiết</strong> ' +
            '— không dùng vào bất kỳ mục đích nào khác.</p>' +

          '<h3>3. Lưu trữ và bảo mật</h3>' +
          '<p>Dữ liệu được lưu trên Firebase Realtime Database của Google, chỉ tài khoản đã xác thực của chủ shop ' +
            'mới truy cập được — khách hàng khác hay người lạ không thể đọc được thông tin của bạn.</p>' +

          '<h3>4. Chia sẻ với bên thứ ba</h3>' +
          '<p>Shop <strong>không bán, không chia sẻ</strong> thông tin của bạn cho bất kỳ bên nào, trừ khi pháp ' +
            'luật yêu cầu.</p>' +

          '<h3>5. Quyền của khách hàng</h3>' +
          '<p>Bạn có quyền yêu cầu xem, chỉnh sửa hoặc xoá thông tin của mình bất cứ lúc nào — chỉ cần liên hệ ' +
            'trực tiếp với shop.</p>' +

          '<h3>6. Lưu trữ cục bộ trên trình duyệt</h3>' +
          '<p>Web chỉ lưu đúng một mã thiết bị ngẫu nhiên trong trình duyệt của bạn để nhận đúng sản phẩm đã mua — ' +
            'đây <strong>không phải</strong> cookie theo dõi quảng cáo hay thu thập hành vi duyệt web.</p>' +

          '<h3>7. Thay đổi chính sách</h3>' +
          '<p>Chính sách này có thể được cập nhật theo thời gian. Bản mới nhất luôn hiển thị tại đúng mục này.</p>' +

          '<h3>8. Liên hệ</h3>' +
          dongLienHeCuoiVanBan() +
        '</div>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  function moModalVanBan(m){
    if (m.ma === 'dac-quyen') { moModalDacQuyen(m); return; }
    if (m.ma === 'lien-he') { moModalLienHe(m); return; }
    if (m.ma === 'cong-nhan') { moModalCongNhan(m); return; }
    if (m.ma === 'hoan-tien') { moModalHoanTien(m); return; }
    if (m.ma === 'dieu-khoan') { moModalDieuKhoan(m); return; }
    if (m.ma === 'bao-mat') { moModalBaoMat(m); return; }
  }

  // Hai bộ khoá học không bán rời mà là quà tặng, nên bảng chi tiết của chúng
  // KHÔNG có nút chọn hàng — thay bằng nút dẫn thẳng sang module khoá học.
  const MODULE_KHOA_HOC = {
    sp4: 'khoa-hoc-mobile',
    sp5: 'khoa-hoc-may-tinh'
  };

  // Bảng phụ "Chi tiết sản phẩm": đầu bảng là tên và giá, thân bảng là các khối
  // mô tả lấy từ PHẦN 01B. Các khối tự trôi từ phải qua trái, lần lượt từ trên
  // xuống — hiệu ứng nằm hết trong CSS, chạy ngay khi bảng mở, khách KHÔNG cần
  // cuộn màn hình mới thấy khối bên dưới xuất hiện.
  //
  // Giá chốt bắt đầu hiện ĐÚNG BẰNG giá gốc rồi mới đếm dần về giá thật, giống
  // hệt lúc thẻ sản phẩm trôi lên ngoài lưới. Việc đếm nằm trong khiVe nên mở
  // bảng bao nhiêu lần cũng chạy lại bấy nhiêu lần.
  function moModalChiTietSanPham(ma){
    const sp = timSanPham(ma);
    if (!sp) return;
    const mienPhi = !sp.giaChot;
    const chuGiaCuoi = mienPhi ? 'MIỄN PHÍ' : dinhDangTien(sp.giaChot);
    const maKhoaHoc = MODULE_KHOA_HOC[sp.ma];
    const nutPhai = maKhoaHoc
      ? '<button type="button" class="nut nut-la" data-hanh-dong="vao-hoc-ngay" data-module="' +
          escapeHtml(maKhoaHoc) + '">Vào học ngay</button>'
      : '<button type="button" class="nut nut-chinh" data-hanh-dong="chon-tu-chi-tiet" data-ma="' +
          escapeHtml(sp.ma) + '">Chọn sản phẩm này</button>';

    moModal({
      ma: 'chi-tiet-' + sp.ma,
      tieuDe: 'Chi tiết sản phẩm',
      than: '' +
        '<div class="mo-ta-sp">' +
          '<div class="mo-ta-dinh troi-ngang">' +
            '<h3>' + escapeHtml(sp.ten) + '</h3>' +
            '<p class="hang-gia">' +
              '<span class="gia-goc">' + dinhDangTien(sp.giaGoc) + '</span> ' +
              '<span class="phan-tram">Giảm ' + phanTramGiamSanPham(sp) + '%</span> ' +
              '<span class="chi-con">chỉ còn</span> ' +
              '<span class="gia-chot" data-gia-goc="' + sp.giaGoc + '" data-gia-chot="' + sp.giaChot +
                '" data-chu-cuoi="' + escapeHtml(chuGiaCuoi) + '">' + dinhDangTien(sp.giaGoc) + '</span>' +
            '</p>' +
          '</div>' +
          veMoTaSanPham(sp) +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        nutPhai,
      khiVe: function(){
        const gia = document.querySelector('.modal-lop[data-ma-modal="chi-tiet-' + sp.ma + '"] .gia-chot');
        chayNhaySo(gia, NHAY_SO_TRONG_BANG);
      }
    });
  }

  // ---------------------------------------------------- VẼ TOÀN BỘ GIAO DIỆN

  // Danh sách tên module cho các thanh chạy chữ — TOÀN BỘ menu, trừ chính
  // "Trang chủ" (bấm vào tên mình thì chẳng dẫn đi đâu). Dùng chung cho thanh
  // ở Trang chủ (PHẦN 05B) lẫn thanh gắn đầu/cuối các module khác dưới đây.
  function dsModuleChayChu(){
    return MODULE.filter(function(m){ return m.sanSang && m.ma !== 'trang-chu'; });
  }

  // id: để phân biệt nhiều thanh trên cùng một trang (mỗi id phải DUY NHẤT
  // trong DOM — không thật sự cần thiết cho việc chạy, chỉ để dễ dò khi cần).
  // Bấm vào tên nào: goiYMoModule() (mở menu + cuộn + nhấp nháy), KHÔNG nhảy
  // module — xem lý do ở hàm đó.
  function veThanhChayModule(id){
    const ds = dsModuleChayChu();
    const veMuc = function(m){
      return '<span class="tc-marquee-item" data-hanh-dong="nhap-nhay-module" data-module="' + escapeHtml(m.ma) + '">' +
        '<span aria-hidden="true">' + m.bieuTuong + '</span> ' + escapeHtml(m.tenNgan || m.ten) + '</span>';
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

  // Module dạng "trang" (một màn hình riêng hoàn chỉnh) được gắn thêm 2 thanh
  // chạy chữ ở đầu và cuối — TRỪ "Trang chủ" (tự nó đã có hai thanh y hệt,
  // xen giữa các khối, PHẦN 05B) và TRỪ "Image Editor Pro" (công cụ toàn màn
  // hình riêng, thêm thanh vào phá bố cục công cụ). Module kieu "modal"
  // (Liên hệ, Hoàn tiền, Đặc quyền...) không phải màn hình riêng nên cũng
  // không có.
  function canhThanhChayModule(m){
    return !!m && m.kieu === 'trang' && m.ma !== 'trang-chu' && m.ma !== 'image-editor-pro';
  }

  function veNoiDungModule(){
    // Hai trang có địa chỉ riêng, đứng ngoài hệ thống module: trang nhận hàng
    // (gửi cho khách qua email và Zalo) và trang quản trị của chủ shop.
    if (state.trang === 'admin') return veTrangAdmin();
    if (state.trang === 'sanpham') return veTrangNhanHang();
    const m = timModule(state.module);
    if (m && m.ma === 'trang-chu') return veModuleTrangChu();

    let noiDung;
    if (m && m.ma === 'goi-vip') noiDung = veModuleGoiVip();
    else if (m && m.ma === 'khoa-hoc-mobile') noiDung = veModuleKhoaHocMobile();
    else if (m && m.ma === 'khoa-hoc-may-tinh') noiDung = veModuleKhoaHocMayTinh();
    else if (m && m.ma === 'app-vip-pro') noiDung = veModuleAppVipPro();
    else if (m && m.ma === 'qua-tang-android') noiDung = veModuleQuaTangAndroid();
    else if (m && m.ma === 'video-ngan') noiDung = veModuleVideoNgan();
    else if (m && m.ma === 'khoa-photoshop') noiDung = veModuleKhoaPhotoshop();
    else if (m && m.ma === 'image-editor-pro') noiDung = veModuleImageEditorPro();
    // Module "trang" nào đó CHƯA có hàm vẽ riêng (sanSang: false trong tương
    // lai) rơi vào khung "đang nâng cấp" chung bên dưới.
    else noiDung = veManNangCap(m ? m.ten : '');

    if (canhThanhChayModule(m)) {
      return veThanhChayModule('tc-dau-' + m.ma) + noiDung + veThanhChayModule('tc-cuoi-' + m.ma);
    }
    return noiDung;
  }

  function veManNangCap(ten){
    return '' +
      '<div class="man-nang-cap">' +
        '<div class="hinh" aria-hidden="true">🛠️</div>' +
        '<h2>Tính năng đang nâng cấp</h2>' +
        '<p>Module “' + escapeHtml(ten) + '” đang được xây dựng và sẽ mở trong thời gian tới.</p>' +
        '<p style="margin-top:10px;margin-bottom:0">Mời bạn xem <strong class="chu-nhan">Trọn bộ sản phẩm VIP cho Lightroom, Photoshop và Thiết kế</strong> — phần đã sẵn sàng phục vụ.</p>' +
      '</div>';
  }

  function render(){
    const el = goc();
    if (!el) return;
    const m = timModule(state.module);
    // Thanh báo giá chỉ có ở module bán hàng. Trang nhận hàng không bán gì nên
    // không có thanh nào ở đáy. Module "Mua App VIP Pro" có thanh neo đáy
    // RIÊNG (đếm app, không tính tiền) — xem veThanhAppVip() ở PHẦN 03E.
    const laGoiVip = state.trang === 'chinh' && !!(m && m.ma === 'goi-vip');
    const laAppVip = state.trang === 'chinh' && !!(m && m.ma === 'app-vip-pro');
    const coThanhDay = laGoiVip || laAppVip;
    // Nền đen thuần + hoạ tiết xanh thương hiệu CHỈ ở Trang chủ (PHẦN 05B,
    // CSS .trang-chu-nen trong base.css) — gắn lên <body> vì .khung-noi-dung
    // bị giới hạn max-width, không phủ hết bề ngang màn hình.
    if (document.body && document.body.classList) {
      document.body.classList.toggle('trang-chu-nen', state.trang === 'chinh' && !!(m && m.ma === 'trang-chu'));
    }

    // Trang quản trị có vỏ riêng: không nút nổi, không menu của khách, không
    // thanh tiêu đề shop. Nó là chỗ làm việc, không phải chỗ mua hàng.
    if (state.trang === 'admin') {
      el.innerHTML = '<main class="khung-noi-dung khong-thanh-day admin-trang">' + veNoiDungModule() + '</main>';
      doChoThanhDay();
      return;
    }

    el.innerHTML = '' +
      '<button type="button" class="nut-noi' + (state.menuMo ? ' menu-dang-mo' : '') +
        '" data-hanh-dong="doi-menu" aria-label="' + (state.menuMo ? 'Đóng menu' : 'Chuyển module') +
        '" aria-expanded="' + (state.menuMo ? 'true' : 'false') + '">' +
        '<span class="vach"></span><span class="vach"></span><span class="vach"></span>' +
      '</button>' +
      veMenuTrai() +
      '<header class="thanh-tieu-de" data-hanh-dong="mo-module" data-module="trang-chu">' +
        '<img class="logo-shop" src="/assets/anh/logo.svg" width="30" height="30" alt="" aria-hidden="true">' +
        '<h1 class="ten-shop">Shop Thànhđẹptrai<span class="cham-xanh">.vn</span></h1>' +
      '</header>' +
      '<main class="khung-noi-dung' + (coThanhDay ? '' : ' khong-thanh-day') + '">' +
        veNoiDungModule() +
      '</main>' +
      (coThanhDay ? (laAppVip ? veThanhAppVip() : veThanhBaoGia()) : '');

    // Gắn hiệu ứng NGAY SAU khi HTML mới đã nằm trong trang.
    ganHieuUngTroiLen();
    ganHieuUngTrangChu();   // vô hại ở module khác — không tìm thấy phần tử nào
    doChoThanhDay();   // chừa đúng chiều cao thật của thanh neo đáy
  }
