
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
    khiMenuDongKiemTraChaoModule();   // PHẦN 08 — animation chào module đang chờ menu ẩn thì hiện ngay bây giờ
  }

  function doiMenu(){
    if (state.menuMo) dongMenu();
    else moMenu();
  }

  // -------------------------------------------- "NHẤP NHÁY GỢI Ý" MỤC MENU
  //
  // Dùng ở Trang chủ (PHẦN 05B) và ở 3 nút quà tặng trong module "Trọn bộ sản
  // phẩm VIP" (PHẦN 03) — và ở MỌI thanh chạy chữ gắn thêm cuối các module
  // khác (xem veNoiDungModule() dưới đây). Mở khung menu (không đóng nếu đã
  // mở), cuộn tới đúng mục trong khung đó rồi cho nó nhấp nháy để khách TỰ
  // bấm — CỐ Ý không nhảy module, khác hẳn moModule().
  //
  // NGOẠI LỆ: module kieu 'modal' (Sự công nhận, Liên hệ, Hoàn tiền, Đặc
  // quyền, Điều khoản, Bảo mật) không hề "nhảy module" — bấm vào chỉ mở một
  // bảng phụ NỔI LÊN TRÊN, không đổi trang đang đứng. Nhấp nháy gợi ý vì vậy
  // vô nghĩa ở đây: mở thẳng bảng đó luôn, y hệt hành vi cũ (mo-module).
  function goiYMoModule(ma){
    const m = timModule(ma);
    if (m && m.kieu === 'modal') { moModule(ma); return; }

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
      // Mèo đẩy bóng chỉ vào đúng dòng này (PHẦN 08) — PHẢI đợi scrollIntoView()
      // mượt ở trên cuộn XONG hẳn rồi mới gọi: gọi ngay thì (1) toạ độ tính
      // trên vị trí CHƯA cuộn tới, ghim sai chỗ, và (2) chính cú cuộn đang
      // chạy dở đó sẽ tự kích hoạt luôn "cuộn trang thì ẩn" của PHẦN 08,
      // mèo vừa hiện đã biến mất ngay.
      setTimeout(function(){ veMeoChiModule(muc); }, 450);
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

  // Animation "Hello" chào LẦN ĐẦU vào bảng này trong một lần tải trang
  // (cơ chế dùng chung PHẦN 08 — kiemTraChaoModalLanDau()).
  const LIEN_HE_CHAO_DU_LIEU =
{"v":"5.7.0","fr":60,"ip":0,"op":361,"w":500,"h":500,"nm":"3814765 2","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Shape Layer 3","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[403.744,76.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[19,19,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.328646540642,0.052967268974,0.794509768486,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":6,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":68,"s":[0]},{"t":158,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":107,"s":[0]},{"t":198,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[98,98],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":27,"op":1827,"st":27,"bm":0},{"ddd":0,"ind":2,"ty":4,"nm":"Shape Layer 2","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[204.744,166.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[19,19,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.328646540642,0.052967268974,0.794509768486,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":3,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":68,"s":[0]},{"t":158,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":107,"s":[0]},{"t":198,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[98,98],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":27,"op":1827,"st":27,"bm":0},{"ddd":0,"ind":3,"ty":4,"nm":"Shape Layer 5","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[329.744,212.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[12,12,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0,0.960784375668,0.886182188988,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":3,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":41,"s":[0]},{"t":131,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":80,"s":[0]},{"t":171,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[93,93],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":4,"ty":4,"nm":"Shape Layer 7","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[120.744,322.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[32,32,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.857254862785,0.027566595003,0.550758302212,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":139,"s":[0]},{"t":229,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":178,"s":[0]},{"t":269,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[96,96],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":98,"op":1898,"st":99,"bm":0},{"ddd":0,"ind":5,"ty":4,"nm":"Shape Layer 6","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[120.744,322.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[32,32,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.974219560623,0.003921568394,1,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":128,"s":[0]},{"t":218,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":167,"s":[0]},{"t":258,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":87,"op":1887,"st":87,"bm":0},{"ddd":0,"ind":6,"ty":4,"nm":"Shape Layer 4","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[329.744,212.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[24,24,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.018838850781,0.960784375668,0.072031214833,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":41,"s":[0]},{"t":131,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":80,"s":[0]},{"t":171,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":7,"ty":4,"nm":"Shape Layer 1","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[178.744,147.822,0],"ix":2},"a":{"a":0,"k":[-0.256,48.822,0],"ix":1},"s":{"a":0,"k":[24,24,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[2.874,31.609],[2.874,-27.011]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.998431396484,0.292090053184,0.292090053184,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":3,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":41,"s":[0]},{"t":131,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":80,"s":[0]},{"t":171,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false},{"ty":"rp","c":{"a":0,"k":16,"ix":1},"o":{"a":0,"k":0,"ix":2},"m":1,"ix":3,"tr":{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,49],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":68,"ix":4},"so":{"a":0,"k":100,"ix":5},"eo":{"a":0,"k":100,"ix":6},"nm":"Transform"},"nm":"Repeater 1","mn":"ADBE Vector Filter - Repeater","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":8,"ty":4,"nm":"HELLO Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[382.292,139.736,0],"ix":2},"a":{"a":0,"k":[19.625,-12,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":0,"s":[0,0,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":52,"s":[0,0,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":80,"s":[110,110,100]},{"i":{"x":[0.833,0.833,0.833],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":89,"s":[85,85,100]},{"t":109,"s":[100,100,100]}],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[0.779,0],[3.894,0],[3.894,-9.742],[5.48,-9.742],[5.48,0],[8.595,0],[8.595,-23.081],[5.48,-23.081],[5.48,-12.744],[3.894,-12.744],[3.894,-23.081],[0.779,-23.081]],"c":true},"ix":2},"nm":"H","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0,0,0,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.01,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"H","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[10.719,0],[16.029,0],[16.029,-3.03],[13.834,-3.03],[13.834,-9.742],[16.029,-9.742],[16.029,-12.744],[13.834,-12.744],[13.834,-20.022],[16.029,-20.022],[16.029,-23.081],[10.719,-23.081]],"c":true},"ix":2},"nm":"E","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0,0,0,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.01,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"E","np":3,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[17.642,0],[22.57,0],[22.57,-3.073],[20.758,-3.073],[20.758,-23.081],[17.642,-23.081]],"c":true},"ix":2},"nm":"L","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0,0,0,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.01,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"L","np":3,"cix":2,"bm":0,"ix":3,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[24.269,0],[29.197,0],[29.197,-3.073],[27.384,-3.073],[27.384,-23.081],[24.269,-23.081]],"c":true},"ix":2},"nm":"L","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0,0,0,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.01,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"L","np":3,"cix":2,"bm":0,"ix":4,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.85,-2.237],[-1.274,0],[-0.67,1.142],[0,4.701],[0.217,1.638],[0.415,0.977],[0.491,0.378],[0.51,0],[0.736,-1.548],[0,-4.456]],"o":[[0.698,1.813],[0.906,0],[1.142,-1.945],[0,-1.86],[-0.217,-1.638],[-0.416,-0.977],[-0.491,-0.377],[-1.095,0],[-0.954,2.011],[0,3.568]],"v":[[30.81,-2.535],[33.77,0.184],[36.134,-1.529],[37.848,-11.498],[37.522,-16.744],[36.573,-20.667],[35.214,-22.699],[33.713,-23.265],[30.966,-20.943],[29.536,-11.243]],"c":true},"ix":2},"nm":"O","mn":"ADBE Vector Shape - Group","hd":false},{"ind":1,"ty":"sh","ix":2,"ks":{"a":0,"k":{"i":[[-0.132,-0.699],[0,-2.426],[0.066,-2.36],[0.113,-0.505],[0.274,-0.547],[0.132,0.736],[0,2.615],[-0.085,2.02],[-0.123,0.496],[-0.246,0.416]],"o":[[0.198,1.048],[0,1.086],[-0.038,1.274],[-0.113,0.505],[-0.293,-0.557],[-0.208,-1.152],[0,-1.161],[0.057,-1.284],[0.123,-0.496],[0.274,0.481]],"v":[[34.322,-17.941],[34.619,-12.73],[34.52,-7.562],[34.294,-4.892],[33.713,-3.313],[33.076,-5.253],[32.764,-10.903],[32.892,-15.675],[33.161,-18.344],[33.713,-19.711]],"c":true},"ix":2},"nm":"O","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"mm","mm":1,"nm":"Merge Paths 1","mn":"ADBE Vector Filter - Merge","hd":false},{"ty":"st","c":{"a":0,"k":[0,0,0,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.01,"ix":5},"lc":1,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"O","np":5,"cix":2,"bm":0,"ix":5,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":10,"ty":4,"nm":"plant Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":-31,"s":[4]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":125,"s":[2]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":241,"s":[10]},{"t":328,"s":[4]}],"ix":10},"p":{"a":0,"k":[419.174,481.829,0],"ix":2},"a":{"a":0,"k":[31.308,123.075,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.009,0.002],[-0.042,-0.208],[-0.073,-0.383],[-0.312,-1.528],[-0.69,-2.13],[-0.641,-2.742],[-0.571,-3.253],[-1.628,-3.337],[-0.66,-1.854],[-0.197,-2.014],[-0.776,-4.218],[-1.445,-7.291],[-1.133,-5.517],[-0.629,-3.116],[-0.164,-0.847],[-0.043,-0.237],[0.009,-0.002],[0.052,0.206],[0.09,0.38],[0.336,1.508],[1.176,5.47],[1.535,7.263],[1.683,8.413],[0.299,4.026],[0.657,1.808],[0.759,1.702],[0.573,3.235],[0.625,2.734],[0.694,2.117],[0.308,1.566],[0.128,0.82],[0.033,0.239]],"o":[[0.009,-0.001],[0.046,0.237],[0.16,0.81],[0.329,1.526],[0.722,2.118],[0.65,2.74],[0.594,3.245],[0.758,1.687],[0.679,1.854],[0.308,4.041],[1.668,8.411],[1.493,7.274],[1.107,5.483],[0.293,1.515],[0.069,0.384],[0.034,0.209],[-0.009,0.002],[-0.055,-0.234],[-0.187,-0.842],[-0.667,-3.108],[-1.164,-5.51],[-1.459,-7.294],[-0.776,-4.215],[-0.193,-2.003],[-0.64,-1.817],[-1.636,-3.386],[-0.552,-3.258],[-0.614,-2.736],[-0.657,-2.124],[-0.286,-1.557],[-0.051,-0.387],[-0.025,-0.211]],"v":[[-13.374,-60.508],[-13.297,-60.196],[-13.12,-59.271],[-12.468,-55.716],[-10.606,-50.316],[-8.524,-43.008],[-6.753,-33.979],[-3.946,-23.904],[-1.667,-18.654],[-0.47,-12.779],[1.171,-0.396],[5.872,23.318],[9.844,42.66],[12.479,55.709],[13.168,59.262],[13.335,60.188],[13.374,60.508],[13.283,60.199],[13.065,59.283],[12.279,55.75],[9.483,42.734],[5.402,23.417],[0.658,-0.303],[-0.978,-12.728],[-2.136,-18.488],[-4.385,-23.708],[-7.179,-33.904],[-8.884,-42.926],[-10.883,-50.223],[-12.665,-55.672],[-13.224,-59.254],[-13.35,-60.187]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.004000000393,0.337000020345,0.40800000359,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.25,"ix":5},"lc":1,"lj":1,"ml":10,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[17.82,66.768],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.009,0.002],[-0.042,-0.208],[-0.073,-0.383],[-0.312,-1.528],[-0.69,-2.13],[-0.641,-2.742],[-0.571,-3.253],[-1.628,-3.337],[-0.66,-1.854],[-0.197,-2.014],[-0.776,-4.218],[-1.445,-7.291],[-1.133,-5.517],[-0.629,-3.116],[-0.164,-0.847],[-0.043,-0.237],[0.009,-0.002],[0.052,0.206],[0.09,0.38],[0.336,1.508],[1.176,5.47],[1.535,7.263],[1.683,8.413],[0.299,4.026],[0.657,1.808],[0.759,1.702],[0.573,3.235],[0.625,2.734],[0.694,2.117],[0.308,1.566],[0.128,0.82],[0.033,0.239]],"o":[[0.009,-0.001],[0.046,0.237],[0.16,0.81],[0.329,1.526],[0.722,2.118],[0.65,2.74],[0.594,3.245],[0.758,1.687],[0.679,1.854],[0.308,4.041],[1.668,8.411],[1.493,7.274],[1.107,5.483],[0.293,1.515],[0.069,0.384],[0.034,0.209],[-0.009,0.002],[-0.055,-0.234],[-0.187,-0.842],[-0.667,-3.108],[-1.164,-5.51],[-1.459,-7.294],[-0.776,-4.215],[-0.193,-2.003],[-0.64,-1.817],[-1.636,-3.386],[-0.552,-3.258],[-0.614,-2.736],[-0.657,-2.124],[-0.286,-1.557],[-0.051,-0.387],[-0.025,-0.211]],"v":[[-13.374,-60.508],[-13.297,-60.196],[-13.12,-59.271],[-12.468,-55.716],[-10.606,-50.316],[-8.524,-43.008],[-6.753,-33.979],[-3.946,-23.904],[-1.667,-18.654],[-0.47,-12.779],[1.171,-0.396],[5.872,23.318],[9.844,42.66],[12.479,55.709],[13.168,59.262],[13.335,60.188],[13.374,60.508],[13.283,60.199],[13.065,59.283],[12.279,55.75],[9.483,42.734],[5.402,23.417],[0.658,-0.303],[-0.978,-12.728],[-2.136,-18.488],[-4.385,-23.708],[-7.179,-33.904],[-8.884,-42.926],[-10.883,-50.223],[-12.665,-55.672],[-13.224,-59.254],[-13.35,-60.187]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.74900004069,1,0.894000004787,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[17.82,66.768],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[2.259,5.783],[0.636,6.176],[1.133,4.636],[-0.033,6.442],[0.184,3.609],[2.127,3.889],[1.14,6.688],[5.952,3.257],[-0.513,-7.698],[-0.472,-6.059],[-0.242,-3.624],[-1.283,-3.293],[-0.734,-2.606],[-1.121,-4.97],[-0.621,-4.273],[-2.024,-5.718],[-0.681,-2.932],[-0.48,-2.285],[-3.754,0.249]],"o":[[5.319,-3.203],[-2.259,-5.783],[-0.488,-4.748],[-1.528,-6.258],[0.02,-3.614],[-0.226,-4.427],[-3.256,-5.953],[-1.14,-6.69],[-0.845,5.689],[0.185,2.765],[0.282,3.621],[0.236,3.526],[0.983,2.524],[1.382,4.905],[0.95,4.211],[0.871,6.003],[1.003,2.838],[0.527,2.276],[0.772,3.683],[0,0]],"v":[[11.887,63.439],[16.423,44.816],[9.602,27.583],[9.507,13.316],[1.867,-4.202],[3.74,-14.838],[-2.033,-26.648],[-6.681,-46.348],[-16.365,-63.449],[-18.169,-46.161],[-14.271,-32.063],[-13.546,-21.191],[-11.777,-10.781],[-8.491,-3.362],[-7.736,11.846],[-3.226,23.941],[-4.184,41.926],[-0.148,49.967],[0.311,56.943],[11.887,63.201]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.004000000393,0.337000020345,0.40800000359,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.25,"ix":5},"lc":1,"lj":1,"ml":10,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[19.307,64.075],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 3","np":2,"cix":2,"bm":0,"ix":3,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[2.259,5.783],[0.636,6.176],[1.133,4.636],[-0.033,6.442],[0.184,3.609],[2.127,3.889],[1.14,6.688],[5.952,3.257],[-0.513,-7.698],[-0.472,-6.059],[-0.242,-3.624],[-1.283,-3.293],[-0.734,-2.606],[-1.121,-4.97],[-0.621,-4.273],[-2.024,-5.718],[-0.681,-2.932],[-0.48,-2.285],[-3.754,0.249]],"o":[[5.319,-3.203],[-2.259,-5.783],[-0.488,-4.748],[-1.528,-6.258],[0.02,-3.614],[-0.226,-4.427],[-3.256,-5.953],[-1.14,-6.69],[-0.845,5.689],[0.185,2.765],[0.282,3.621],[0.236,3.526],[0.983,2.524],[1.382,4.905],[0.95,4.211],[0.871,6.003],[1.003,2.838],[0.527,2.276],[0.772,3.683],[0,0]],"v":[[11.887,63.439],[16.423,44.816],[9.602,27.583],[9.507,13.316],[1.867,-4.202],[3.74,-14.838],[-2.033,-26.648],[-6.681,-46.348],[-16.365,-63.449],[-18.169,-46.161],[-14.271,-32.063],[-13.546,-21.191],[-11.777,-10.781],[-8.491,-3.362],[-7.736,11.846],[-3.226,23.941],[-4.184,41.926],[-0.148,49.967],[0.311,56.943],[11.887,63.201]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.74900004069,1,0.894000004787,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[19.307,64.075],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 4","np":4,"cix":2,"bm":0,"ix":4,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":12,"ty":4,"nm":"Layer 17 Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":0,"s":[0]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":156,"s":[-2]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":272,"s":[6]},{"t":359,"s":[0]}],"ix":10},"p":{"a":0,"k":[419.563,479.911,0],"ix":2},"a":{"a":0,"k":[4.299,95.857,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.009,-0.001],[0.025,-0.169],[0.05,-0.304],[0.276,-1.245],[0.592,-1.685],[0.577,-2.179],[0.544,-2.601],[1.422,-2.674],[0.569,-1.436],[0.217,-1.603],[0.755,-3.362],[1.4,-5.816],[1.112,-4.395],[0.641,-2.489],[0.183,-0.683],[0.055,-0.193],[0.008,0.003],[-0.034,0.167],[-0.065,0.301],[-0.278,1.2],[-1.052,4.362],[-1.423,5.796],[-1.601,6.705],[-0.374,3.239],[-0.605,1.474],[-0.662,1.331],[-0.581,2.59],[-0.61,2.183],[-0.65,1.678],[-0.315,1.212],[-0.156,0.645],[-0.047,0.195]],"o":[[0.009,0.002],[-0.034,0.198],[-0.125,0.655],[-0.294,1.253],[-0.62,1.68],[-0.585,2.178],[-0.558,2.581],[-0.663,1.345],[-0.582,1.428],[-0.366,3.223],[-1.617,6.708],[-1.464,5.785],[-1.119,4.346],[-0.317,1.191],[-0.085,0.295],[-0.049,0.163],[-0.008,-0.002],[0.042,-0.197],[0.159,-0.688],[0.602,-2.499],[1.08,-4.402],[1.388,-5.815],[0.756,-3.367],[0.222,-1.614],[0.591,-1.473],[1.411,-2.626],[0.562,-2.596],[0.603,-2.183],[0.624,-1.692],[0.3,-1.215],[0.072,-0.298],[0.042,-0.166]],"v":[[12.635,-48.204],[12.61,-47.945],[12.485,-47.198],[11.933,-44.335],[10.338,-40.007],[8.512,-34.206],[6.867,-27.011],[4.305,-18.893],[2.338,-14.771],[1.232,-10.189],[-0.47,-0.254],[-5.026,18.658],[-8.92,34.052],[-11.589,44.418],[-12.34,47.231],[-12.548,47.959],[-12.636,48.202],[-12.599,47.946],[-12.441,47.205],[-11.785,44.369],[-9.277,33.963],[-5.492,18.542],[-0.979,-0.364],[0.726,-10.26],[1.875,-14.955],[3.874,-19.106],[6.445,-27.101],[8.156,-34.303],[10.066,-40.109],[11.738,-44.387],[12.381,-47.22],[12.558,-47.956]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.004000000393,0.337000020345,0.40800000359,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.25,"ix":5},"lc":1,"lj":1,"ml":10,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[17.529,53.71],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.009,-0.001],[0.025,-0.169],[0.05,-0.304],[0.276,-1.245],[0.592,-1.685],[0.577,-2.179],[0.544,-2.601],[1.422,-2.674],[0.569,-1.436],[0.217,-1.603],[0.755,-3.362],[1.4,-5.816],[1.112,-4.395],[0.641,-2.489],[0.183,-0.683],[0.055,-0.193],[0.008,0.003],[-0.034,0.167],[-0.065,0.301],[-0.278,1.2],[-1.052,4.362],[-1.423,5.796],[-1.601,6.705],[-0.374,3.239],[-0.605,1.474],[-0.662,1.331],[-0.581,2.59],[-0.61,2.183],[-0.65,1.678],[-0.315,1.212],[-0.156,0.645],[-0.047,0.195]],"o":[[0.009,0.002],[-0.034,0.198],[-0.125,0.655],[-0.294,1.253],[-0.62,1.68],[-0.585,2.178],[-0.558,2.581],[-0.663,1.345],[-0.582,1.428],[-0.366,3.223],[-1.617,6.708],[-1.464,5.785],[-1.119,4.346],[-0.317,1.191],[-0.085,0.295],[-0.049,0.163],[-0.008,-0.002],[0.042,-0.197],[0.159,-0.688],[0.602,-2.499],[1.08,-4.402],[1.388,-5.815],[0.756,-3.367],[0.222,-1.614],[0.591,-1.473],[1.411,-2.626],[0.562,-2.596],[0.603,-2.183],[0.624,-1.692],[0.3,-1.215],[0.072,-0.298],[0.042,-0.166]],"v":[[12.635,-48.204],[12.61,-47.945],[12.485,-47.198],[11.933,-44.335],[10.338,-40.007],[8.512,-34.206],[6.867,-27.011],[4.305,-18.893],[2.338,-14.771],[1.232,-10.189],[-0.47,-0.254],[-5.026,18.658],[-8.92,34.052],[-11.589,44.418],[-12.34,47.231],[-12.548,47.959],[-12.636,48.202],[-12.599,47.946],[-12.441,47.205],[-11.785,44.369],[-9.277,33.963],[-5.492,18.542],[-0.979,-0.364],[0.726,-10.26],[1.875,-14.955],[3.874,-19.106],[6.445,-27.101],[8.156,-34.303],[10.066,-40.109],[11.738,-44.387],[12.381,-47.22],[12.558,-47.956]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.944999964097,0.948999980852,0.948999980852,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[17.529,53.71],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.377,-0.012],[-0.723,0.136],[-1.003,0.384],[-1.062,0.889],[-0.253,0.707],[-0.038,0.841],[-0.139,0.93],[-0.507,0.867],[-0.46,2.198],[0.409,2.457],[-0.949,2.67],[-0.832,2.785],[-0.161,3.153],[-0.693,1.494],[-0.682,1.484],[-0.371,3.435],[-0.186,1.761],[-0.557,1.744],[-0.708,1.685],[-0.194,0.861],[-0.047,0.911],[0.241,1.862],[0.216,1.91],[0.011,0.104],[0,0],[1.105,-1.487],[0.657,-1.713],[0.674,-3.536],[1.839,-3.011],[0.925,-1.399],[0.228,-1.592],[0.375,-3.263],[0.756,-1.328],[0.82,-1.213],[0.559,-1.28],[0.086,-1.346],[0.201,-2.52],[0.992,-2.019],[0.918,-1.753],[0.343,-0.845],[0.167,-0.823],[-0.172,-1.374],[-0.906,-1.134],[0.035,-0.041],[0.306,0.223],[0.194,0.205],[0.217,0.301],[0.371,2.797],[-0.258,1.696],[-0.364,0.863],[-0.458,0.883],[-0.978,2.016],[-0.152,2.473],[-0.184,2.757],[-0.582,1.318],[-0.82,1.222],[-0.734,1.31],[-0.133,1.522],[-0.463,3.459],[-0.938,1.414],[-0.888,1.459],[-0.652,3.515],[-1.344,3.518],[-1.161,1.527],[-1.744,0.886],[0,0],[0,0],[-0.013,-0.111],[-0.232,-1.885],[0.081,-1.874],[0.154,-0.964],[0.349,-0.851],[0.493,-1.714],[0.184,-1.768],[0.184,-1.724],[1.433,-3.086],[0.653,-1.45],[0.077,-1.552],[0.875,-2.915],[0.862,-2.561],[-0.393,-2.45],[0.546,-2.264],[0.954,-1.698],[0.133,-0.901],[0.039,-0.854],[0.277,-0.758],[0.529,-0.468],[1.013,-0.377],[0.731,-0.111]],"o":[[0,0],[0.376,-0.013],[0.723,-0.127],[0.996,-0.387],[0.508,-0.46],[0.254,-0.71],[0.031,-0.848],[0.129,-0.935],[0.974,-1.747],[0.514,-2.176],[-0.403,-2.441],[0.886,-2.641],[0.837,-2.798],[0.072,-1.577],[0.672,-1.497],[1.379,-2.979],[0.182,-1.725],[0.179,-1.746],[0.503,-1.753],[0.346,-0.842],[0.138,-0.86],[0.079,-1.847],[-0.23,-1.862],[-0.013,-0.114],[0,0],[-1.663,0.845],[-1.123,1.474],[-1.322,3.447],[-0.659,3.528],[-0.914,1.497],[-0.925,1.389],[-0.472,3.215],[-0.145,1.61],[-0.755,1.337],[-0.82,1.212],[-0.567,1.276],[-0.192,2.693],[-0.168,2.537],[-0.997,2.028],[-0.462,0.873],[-0.361,0.838],[-0.268,1.664],[0.336,2.766],[0.916,1.143],[0,0],[-0.155,-0.108],[-0.197,-0.199],[-0.944,-1.128],[-0.189,-1.389],[0.163,-0.839],[0.343,-0.865],[0.911,-1.768],[0.97,-2.008],[0.188,-2.469],[0.082,-1.375],[0.572,-1.322],[0.821,-1.222],[0.736,-1.302],[0.379,-3.064],[0.24,-1.699],[0.94,-1.425],[1.783,-2.929],[0.668,-3.514],[0.67,-1.748],[1.142,-1.537],[0,0],[0,0],[0.012,0.102],[0.214,1.889],[0.243,1.883],[-0.053,0.946],[-0.215,0.943],[-0.713,1.692],[-0.547,1.704],[-0.188,1.759],[-0.377,3.421],[-0.707,1.526],[-0.671,1.441],[-0.171,3.088],[-0.88,2.885],[-0.923,2.559],[0.394,2.454],[-0.504,2.3],[-0.502,0.847],[-0.141,0.9],[-0.047,0.854],[-0.281,0.76],[-1.103,0.902],[-1.019,0.373],[-1.47,0.239]],"v":[[-11.905,50.555],[-11.334,50.56],[-9.673,50.39],[-7.059,49.665],[-3.868,47.842],[-2.61,46.115],[-2.275,43.738],[-2.118,41.062],[-1.121,38.324],[1.858,32.784],[1.553,25.758],[1.684,17.891],[5.17,10.135],[5.74,1.103],[6.808,-3.607],[9.07,-7.962],[11.057,-17.811],[11.607,-23.04],[12.496,-28.356],[14.437,-33.48],[15.339,-36.033],[15.575,-38.76],[15.327,-44.329],[14.529,-49.973],[14.491,-50.303],[14.865,-50.098],[10.671,-46.514],[8.067,-41.65],[5.6,-31.024],[2.222,-20.959],[-0.698,-16.727],[-2.633,-12.26],[-1.573,-2.737],[-3.107,1.685],[-5.557,5.455],[-7.705,9.162],[-8.668,13.127],[-8.667,20.961],[-10.715,27.807],[-13.731,33.405],[-14.963,35.981],[-15.671,38.508],[-15.749,43.105],[-13.497,49],[-11.905,50.555],[-12.375,50.23],[-12.914,49.778],[-13.579,49.066],[-15.95,43.131],[-15.916,38.467],[-15.213,35.881],[-13.989,33.27],[-11.011,27.662],[-9.033,20.935],[-9.068,13.097],[-8.087,8.996],[-5.915,5.214],[-3.495,1.467],[-2.028,-2.782],[-3.107,-12.33],[-1.106,-16.997],[1.797,-21.216],[5.099,-31.119],[7.582,-41.833],[10.256,-46.828],[14.633,-50.564],[14.964,-50.732],[15.008,-50.359],[15.046,-50.034],[15.843,-44.393],[16.093,-38.739],[15.845,-35.927],[14.912,-33.282],[12.987,-28.214],[12.108,-22.982],[11.551,-17.758],[9.505,-7.76],[7.236,-3.415],[6.197,1.129],[5.584,10.258],[2.064,18.021],[1.917,25.7],[2.18,32.86],[-0.868,38.469],[-1.851,41.103],[-2.027,43.747],[-2.398,46.191],[-3.736,47.995],[-7.005,49.81],[-9.656,50.493]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.004000000393,0.337000020345,0.40800000359,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.25,"ix":5},"lc":1,"lj":1,"ml":10,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[16.799,51.357],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 3","np":2,"cix":2,"bm":0,"ix":3,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.377,-0.012],[-0.723,0.136],[-1.003,0.384],[-1.062,0.889],[-0.253,0.707],[-0.038,0.841],[-0.139,0.93],[-0.507,0.867],[-0.46,2.198],[0.409,2.457],[-0.949,2.67],[-0.832,2.785],[-0.161,3.153],[-0.693,1.494],[-0.682,1.484],[-0.371,3.435],[-0.186,1.761],[-0.557,1.744],[-0.708,1.685],[-0.194,0.861],[-0.047,0.911],[0.241,1.862],[0.216,1.91],[0.011,0.104],[0,0],[1.105,-1.487],[0.657,-1.713],[0.674,-3.536],[1.839,-3.011],[0.925,-1.399],[0.228,-1.592],[0.375,-3.263],[0.756,-1.328],[0.82,-1.213],[0.559,-1.28],[0.086,-1.346],[0.201,-2.52],[0.992,-2.019],[0.918,-1.753],[0.343,-0.845],[0.167,-0.823],[-0.172,-1.374],[-0.906,-1.134],[0.035,-0.041],[0.306,0.223],[0.194,0.205],[0.217,0.301],[0.371,2.797],[-0.258,1.696],[-0.364,0.863],[-0.458,0.883],[-0.978,2.016],[-0.152,2.473],[-0.184,2.757],[-0.582,1.318],[-0.82,1.222],[-0.734,1.31],[-0.133,1.522],[-0.463,3.459],[-0.938,1.414],[-0.888,1.459],[-0.652,3.515],[-1.344,3.518],[-1.161,1.527],[-1.744,0.886],[0,0],[0,0],[-0.013,-0.111],[-0.232,-1.885],[0.081,-1.874],[0.154,-0.964],[0.349,-0.851],[0.493,-1.714],[0.184,-1.768],[0.184,-1.724],[1.433,-3.086],[0.653,-1.45],[0.077,-1.552],[0.875,-2.915],[0.862,-2.561],[-0.393,-2.45],[0.546,-2.264],[0.954,-1.698],[0.133,-0.901],[0.039,-0.854],[0.277,-0.758],[0.529,-0.468],[1.013,-0.377],[0.731,-0.111]],"o":[[0,0],[0.376,-0.013],[0.723,-0.127],[0.996,-0.387],[0.508,-0.46],[0.254,-0.71],[0.031,-0.848],[0.129,-0.935],[0.974,-1.747],[0.514,-2.176],[-0.403,-2.441],[0.886,-2.641],[0.837,-2.798],[0.072,-1.577],[0.672,-1.497],[1.379,-2.979],[0.182,-1.725],[0.179,-1.746],[0.503,-1.753],[0.346,-0.842],[0.138,-0.86],[0.079,-1.847],[-0.23,-1.862],[-0.013,-0.114],[0,0],[-1.663,0.845],[-1.123,1.474],[-1.322,3.447],[-0.659,3.528],[-0.914,1.497],[-0.925,1.389],[-0.472,3.215],[-0.145,1.61],[-0.755,1.337],[-0.82,1.212],[-0.567,1.276],[-0.192,2.693],[-0.168,2.537],[-0.997,2.028],[-0.462,0.873],[-0.361,0.838],[-0.268,1.664],[0.336,2.766],[0.916,1.143],[0,0],[-0.155,-0.108],[-0.197,-0.199],[-0.944,-1.128],[-0.189,-1.389],[0.163,-0.839],[0.343,-0.865],[0.911,-1.768],[0.97,-2.008],[0.188,-2.469],[0.082,-1.375],[0.572,-1.322],[0.821,-1.222],[0.736,-1.302],[0.379,-3.064],[0.24,-1.699],[0.94,-1.425],[1.783,-2.929],[0.668,-3.514],[0.67,-1.748],[1.142,-1.537],[0,0],[0,0],[0.012,0.102],[0.214,1.889],[0.243,1.883],[-0.053,0.946],[-0.215,0.943],[-0.713,1.692],[-0.547,1.704],[-0.188,1.759],[-0.377,3.421],[-0.707,1.526],[-0.671,1.441],[-0.171,3.088],[-0.88,2.885],[-0.923,2.559],[0.394,2.454],[-0.504,2.3],[-0.502,0.847],[-0.141,0.9],[-0.047,0.854],[-0.281,0.76],[-1.103,0.902],[-1.019,0.373],[-1.47,0.239]],"v":[[-11.905,50.555],[-11.334,50.56],[-9.673,50.39],[-7.059,49.665],[-3.868,47.842],[-2.61,46.115],[-2.275,43.738],[-2.118,41.062],[-1.121,38.324],[1.858,32.784],[1.553,25.758],[1.684,17.891],[5.17,10.135],[5.74,1.103],[6.808,-3.607],[9.07,-7.962],[11.057,-17.811],[11.607,-23.04],[12.496,-28.356],[14.437,-33.48],[15.339,-36.033],[15.575,-38.76],[15.327,-44.329],[14.529,-49.973],[14.491,-50.303],[14.865,-50.098],[10.671,-46.514],[8.067,-41.65],[5.6,-31.024],[2.222,-20.959],[-0.698,-16.727],[-2.633,-12.26],[-1.573,-2.737],[-3.107,1.685],[-5.557,5.455],[-7.705,9.162],[-8.668,13.127],[-8.667,20.961],[-10.715,27.807],[-13.731,33.405],[-14.963,35.981],[-15.671,38.508],[-15.749,43.105],[-13.497,49],[-11.905,50.555],[-12.375,50.23],[-12.914,49.778],[-13.579,49.066],[-15.95,43.131],[-15.916,38.467],[-15.213,35.881],[-13.989,33.27],[-11.011,27.662],[-9.033,20.935],[-9.068,13.097],[-8.087,8.996],[-5.915,5.214],[-3.495,1.467],[-2.028,-2.782],[-3.107,-12.33],[-1.106,-16.997],[1.797,-21.216],[5.099,-31.119],[7.582,-41.833],[10.256,-46.828],[14.633,-50.564],[14.964,-50.732],[15.008,-50.359],[15.046,-50.034],[15.843,-44.393],[16.093,-38.739],[15.845,-35.927],[14.912,-33.282],[12.987,-28.214],[12.108,-22.982],[11.551,-17.758],[9.505,-7.76],[7.236,-3.415],[6.197,1.129],[5.584,10.258],[2.064,18.021],[1.917,25.7],[2.18,32.86],[-0.868,38.469],[-1.851,41.103],[-2.027,43.747],[-2.398,46.191],[-3.736,47.995],[-7.005,49.81],[-9.656,50.493]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.944999964097,0.948999980852,0.948999980852,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[16.799,51.357],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 4","np":4,"cix":2,"bm":0,"ix":4,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":14,"ty":4,"nm":"Layer 18 Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":0,"s":[0]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":156,"s":[-10]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":261,"s":[6]},{"t":359,"s":[0]}],"ix":10},"p":{"a":0,"k":[409.188,482.676,0],"ix":2},"a":{"a":0,"k":[31.775,71.956,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[1.983,1.936],[1.041,2.568],[2.858,3.464],[1.493,2.179],[0.314,1.349],[4.894,5.097],[-2.889,-5.427],[-0.395,-2.44],[-0.996,-3.886],[-0.263,-4.582],[-0.275,-3.871],[-0.86,-1.411],[-6.671,0.149],[0,0]],"o":[[0.678,-2.688],[-1.983,-1.936],[-1.686,-4.161],[-1.68,-2.038],[-0.784,-1.142],[-1.596,-6.884],[-0.304,6.14],[1.161,2.182],[0.64,3.961],[1.139,4.447],[0.223,3.874],[0.116,1.647],[3.024,4.964],[0,0],[0,0]],"v":[[11.469,17.451],[8.387,10.144],[2.994,3.909],[0.656,-9.129],[-5.514,-14.013],[-6.87,-17.914],[-16.846,-36.331],[-12.872,-18.549],[-9.893,-11.803],[-10.446,0.142],[-4.027,12.122],[-6.887,23.287],[-5.137,27.872],[8.977,36.092],[17.15,36.331]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.004000000393,0.337000020345,0.40800000359,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":0.25,"ix":5},"lc":1,"lj":1,"ml":10,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[17.775,36.956],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[1.983,1.936],[1.041,2.568],[2.858,3.464],[1.493,2.179],[0.314,1.349],[4.894,5.097],[-2.889,-5.427],[-0.395,-2.44],[-0.996,-3.886],[-0.263,-4.582],[-0.275,-3.871],[-0.86,-1.411],[-6.671,0.149],[0,0]],"o":[[0.678,-2.688],[-1.983,-1.936],[-1.686,-4.161],[-1.68,-2.038],[-0.784,-1.142],[-1.596,-6.884],[-0.304,6.14],[1.161,2.182],[0.64,3.961],[1.139,4.447],[0.223,3.874],[0.116,1.647],[3.024,4.964],[0,0],[0,0]],"v":[[11.469,17.451],[8.387,10.144],[2.994,3.909],[0.656,-9.129],[-5.514,-14.013],[-6.87,-17.914],[-16.846,-36.331],[-12.872,-18.549],[-9.893,-11.803],[-10.446,0.142],[-4.027,12.122],[-6.887,23.287],[-5.137,27.872],[8.977,36.092],[17.15,36.331]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.579999976065,1,0.791999966491,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[17.775,36.956],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":18,"ty":4,"nm":"hello Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[379.383,140.886,0],"ix":2},"a":{"a":0,"k":[23.229,30.831,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":3,"s":[0,0,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":55,"s":[0,0,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":87,"s":[160,160,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":100,"s":[120,120,100]},{"t":115,"s":[150,150,100]}],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.601,24.76],[-10.118,1.536],[-4.015,-7.219],[-0.505,-13.475],[0,0],[11.62,5.742]],"o":[[0,0],[0,0],[9.189,-1.395],[0,0],[0.578,15.403],[0,0],[0,0]],"v":[[-12.922,30.581],[-20.51,-18.94],[-5.612,-29.186],[16.97,-19.951],[20.534,-1.844],[19.141,21.738],[-7.948,22.496]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.57599995931,0.46699999641,0.910000011968,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[25.096,30.831],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[2.748,-5.496],[0,0],[-11.408,-16.067],[0,0],[0,0],[0,0]],"o":[[0,0],[-1.919,3.839],[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[-12.793,-27.651],[-19.897,-19.917],[-21.654,-9.789],[-10.249,27.651],[-7.716,23.535],[18.77,22.56],[21.815,18.807]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.505999995213,0.128999986836,0.910000011968,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[22.065,33.603],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":20,"ty":4,"nm":"Body Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[220.149,482.222,0],"ix":2},"a":{"a":0,"k":[129.103,373.153,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.412,0.412,0.667],"y":[1,1,1]},"o":{"x":[0.801,0.801,0.333],"y":[0,0,0]},"t":0,"s":[0,0,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.772,0.772,0.333],"y":[0,0,0]},"t":40,"s":[120,120,100]},{"t":60,"s":[100,100,100]}],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[1.442,1.382],[3.324,3.654],[0.28,0.92],[0,-1.825],[-1.58,-8.035],[-1.383,-6.335],[-10.105,-0.632],[-0.18,12.757]],"o":[[-3.097,-2.187],[-9.331,-10.257],[-0.281,-0.92],[0,1.825],[3.749,19.062],[3.031,13.895],[1.54,-1.499],[0.189,-13.466]],"v":[[12.171,-3.874],[2.341,-12.549],[-12.23,-40.743],[-22.15,-35.634],[-18.161,-16.883],[-12.398,12.736],[12.36,41.663],[21.961,19.432]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.764999988032,0.626999978458,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[64.717,142.536],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[5.874,26.247],[-0.19,2.842],[0.884,7.452],[0.126,0.883],[1.263,-3.663],[0.631,-1.264],[0,0],[2.476,2.218],[1.936,2.735],[4.511,1.873],[-2.638,-6.86],[-3.966,-5.295],[0.345,-1.183],[9.544,7.919],[0.853,-0.189],[-0.19,-1.516],[-5.495,-2.653],[-3.504,-6.157],[1.042,-0.095],[4.737,1.895],[0.758,-0.284],[-0.474,-1.138],[-4.642,-1.137],[-2.273,-2.842],[0.758,-0.474],[3.505,0.473],[0.479,-0.474],[-2.842,-1.042],[-0.568,-0.095],[-1.232,-0.759],[-3.884,-2.463],[0,0]],"o":[[0,0],[0.189,-2.842],[-0.884,-7.453],[-0.126,-0.885],[-1.263,3.663],[-0.631,1.263],[-0.888,-1.509],[0,0],[-1.936,-2.736],[-1.267,0.453],[2.638,6.86],[2.13,2.845],[-0.345,1.184],[-4.452,-3.695],[-0.852,0.19],[0.189,1.516],[0,0],[0,0],[-1.043,0.095],[-4.737,-1.895],[-0.758,0.284],[0.473,1.136],[0,0],[0,0],[-0.758,0.474],[-3.506,-0.474],[-0.48,0.474],[2.842,1.042],[0.569,0.095],[1.231,0.758],[3.884,2.463],[0,0]],"v":[[23.021,15.48],[27.758,4.77],[24.158,-11.46],[24.916,-25.481],[18.979,-22.83],[18.979,-11.334],[16.832,-7.925],[8.369,-19.041],[4.765,-24.11],[-8.851,-40.995],[-9.787,-34.868],[-2.276,-24.143],[2.558,-14.86],[-7.769,-24.692],[-21.411,-35.967],[-23.21,-32.745],[-13.926,-21.946],[-3.79,-11.24],[-6.347,-8.588],[-18.095,-14.367],[-27.947,-17.209],[-27.947,-14.081],[-18.568,-8.493],[-9.379,-2.903],[-10.421,0.412],[-20.368,-0.439],[-28.415,0.128],[-25.674,3.255],[-18.853,3.729],[-6.726,7.803],[3.793,19.096],[13.263,20.308]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.764999988032,0.626999978458,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[49.057,109.885],"ix":2},"a":{"a":0,"k":[19.912,22.278],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.167],"y":[0.167]},"t":74,"s":[0]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.167],"y":[0.167]},"t":98,"s":[13.11]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.167],"y":[0.167]},"t":165,"s":[8]},{"t":264,"s":[-3]}],"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"tr","p":{"a":0,"k":[74.954,176.432],"ix":2},"a":{"a":0,"k":[74.954,176.432],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":60,"s":[0]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":100,"s":[-15]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":140,"s":[3]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":240,"s":[-15]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":326,"s":[3]},{"t":359,"s":[0]}],"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 49","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[-3.032,-13.895],[-10.105,-0.631],[-0.506,18.696]],"o":[[0,0],[0,0],[3.031,13.895],[0,0],[0.505,-18.694]],"v":[[12.632,-23.432],[8.653,-22.105],[-15.916,-5.494],[8.842,23.432],[18.443,1.2]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.764999988032,0.626999978458,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[68.909,160.453],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 3","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.442,0.703],[0,0],[0,0],[-0.995,-0.37],[0,0],[-1.156,-0.239]],"o":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[7.251,-6.604],[3.845,-5.504],[-7.251,6.342],[-5.879,6.604],[4.063,-3.913],[6.856,-4.535]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.128999986836,0.161000001197,0.356999984442,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[136.563,52.821],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 4","np":4,"cix":2,"bm":0,"ix":3,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.171,-0.458],[-3.6,-1.558],[-0.231,0.548],[4.955,-1.199]],"o":[[0,0],[0,0],[0,0],[0,0]],"v":[[-2.912,1.349],[3.6,0.732],[3.759,-0.587],[-3.759,-0.151]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.128999986836,0.161000001197,0.356999984442,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[167.45,41.081],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 5","np":4,"cix":2,"bm":0,"ix":4,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[1.033,-2.864],[2.163,2.003],[-1.262,1.911],[-1.516,-1.672]],"o":[[-0.89,2.465],[-1.944,-1.801],[1.053,-1.596],[1.516,1.672]],"v":[[3.664,5.299],[-1.594,6.334],[-3.994,-6.198],[3.873,-6.606]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ind":1,"ty":"sh","ix":2,"ks":{"a":0,"k":{"i":[[1.137,1.873],[1.618,-1.158],[-2.877,-3.822],[-0.775,0.547]],"o":[[-1.137,-1.873],[-1.05,0.752],[1.817,2.413],[2.148,-1.516]],"v":[[4.579,-7.102],[-4.666,-7.102],[-2.268,6.562],[2.905,7.857]],"c":true},"ix":2},"nm":"Path 2","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"mm","mm":1,"nm":"Merge Paths 1","mn":"ADBE Vector Filter - Merge","hd":false},{"ty":"fl","c":{"a":0,"k":[0.097999999102,0.226999993418,0.372999991623,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[175.789,46.934],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 6","np":6,"cix":2,"bm":0,"ix":5,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[1.56,-4.314],[4.836,1.285],[-1.137,5.211],[-1.881,-1.986]],"o":[[-1.561,4.315],[-2.981,-0.792],[1.137,-5.21],[1.518,1.603]],"v":[[10.211,4.111],[-1.931,8.596],[-8.859,-2.033],[9.589,-7.505]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ind":1,"ty":"sh","ix":2,"ks":{"a":0,"k":{"i":[[1.737,2.307],[3.743,-4.142],[-5.937,-1.172],[-1.926,2.933]],"o":[[-1.919,-2.551],[-3.742,4.142],[6.943,1.369],[2.032,-3.095]],"v":[[10.299,-8.165],[-8.704,-4.164],[-1.712,9.347],[10.414,5.539]],"c":true},"ix":2},"nm":"Path 2","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"mm","mm":1,"nm":"Merge Paths 1","mn":"ADBE Vector Filter - Merge","hd":false},{"ty":"fl","c":{"a":0,"k":[0.128999986836,0.161000001197,0.356999984442,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[153.591,49.307],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 7","np":6,"cix":2,"bm":0,"ix":6,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.126,2.021],[-3.032,-0.189],[-1.135,0.821],[3.79,-2.147],[1.579,0.568],[2.716,0.505]],"o":[[0,0],[3.032,0.19],[0,0],[0,0],[0,0],[0,0]],"v":[[-6.663,-2.305],[-0.347,-2.116],[6.602,-3.126],[2.999,2.558],[-0.096,2.558],[-4.264,0.474]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.638999968884,0.560999971278,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[169.879,60.494],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 9","np":4,"cix":2,"bm":0,"ix":7,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[3.916,-0.548],[0,0],[0,0],[0,0]],"o":[[-3.915,0.548],[0,0],[3.347,-0.189],[0,0]],"v":[[-0.632,-3.242],[-6.632,2.526],[0.757,3.789],[6.632,1.706]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.709999952129,0.620000023935,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[169.848,55.663],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 10","np":4,"cix":2,"bm":0,"ix":8,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0.026,-0.26],[0,0],[-31.835,9.484],[-2.776,15.856],[12.983,9.588],[0.015,0.275],[0,0],[-25.192,-18.604],[2.776,-15.866],[17.604,-5.245]],"o":[[0,0],[0.026,-0.262],[17.416,-5.189],[2.744,-15.681],[-25.388,-18.749],[0,0],[0.015,0.272],[13.134,9.699],[-2.81,16.049],[-31.518,9.39]],"v":[[-34.451,78.54],[-34.949,78.49],[-0.093,42.583],[31.681,9.467],[14.825,-32.127],[-12.339,-78.513],[-11.84,-78.54],[15.122,-32.529],[32.173,9.554],[0.05,43.062]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.819999964097,0.827000038297,0.830999995213,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[239.79,291.516],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 11","np":4,"cix":2,"bm":0,"ix":9,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[1.121,2.59],[-0.222,0.255],[-0.232,1.03],[-0.207,-1.141],[-0.533,-1.002],[0.452,-0.094],[0.229,0.348]],"o":[[0.225,-0.204],[1.124,-1.296],[-0.023,0.844],[0.328,1.809],[0.254,3.522],[-0.151,0.031],[-1.121,-2.59]],"v":[[-2.182,-1.909],[-1.509,-2.596],[0.341,-6.342],[0.569,-3.335],[2.045,0.914],[1.749,6.338],[1.18,5.862]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.067000003889,0,0.20800000359,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[172.548,22.273],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 12","np":4,"cix":2,"bm":0,"ix":10,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0]],"v":[[-0.04,0.115],[-0.04,-0.115],[0.04,-0.115],[0.04,0.115]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0]],"v":[[-224.042,282.695],[275.958,282.695],[275.958,-217.305],[-224.042,-217.305]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ind":1,"ty":"sh","ix":2,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0]],"v":[[-224.042,-217.305],[275.958,-217.305],[275.958,282.695],[-224.042,282.695]],"c":true},"ix":2},"nm":"Path 2","mn":"ADBE Vector Shape - Group","hd":false},{"ind":2,"ty":"sh","ix":3,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[0,0]],"v":[[-0.04,0.115],[0.04,0.115],[0.04,-0.115],[-0.04,-0.115]],"c":true},"ix":2},"nm":"Path 3","mn":"ADBE Vector Shape - Group","hd":false},{"ind":3,"ty":"sh","ix":4,"ks":{"a":0,"k":{"i":[[0.01,0.039],[-0.03,-0.08]],"o":[[0.02,0.08],[-0.04,-0.11]],"v":[[-0.04,-0.115],[0.04,0.115]],"c":true},"ix":2},"nm":"Path 4","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"mm","mm":4,"nm":"Merge Paths 1","mn":"ADBE Vector Filter - Merge","hd":false},{"ty":"fl","c":{"a":0,"k":[0.5,0.5,0.5,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[132.996,108.237],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 13","np":4,"cix":2,"bm":0,"ix":11,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"o":[[-38.28,-4.93],[-13.694,23.446],[0,0],[9.85,-29.8],[26.02,-1.39],[0,0]],"v":[[42.825,-30.19],[-11.015,-32.84],[-41.305,36.25],[-42.825,33.8],[-11.745,-34.86],[41.815,-32.09]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.184000007779,0,0.416000007181,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[233.131,167.201],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 14","np":4,"cix":2,"bm":0,"ix":12,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-0.369],[0.369,0],[0,0.369],[-0.369,0]],"o":[[0,0.369],[-0.369,0],[0,-0.369],[0.369,0]],"v":[[0.668,0],[0,0.668],[-0.668,0],[0,-0.668]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[174.968,46.414],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 15","np":4,"cix":2,"bm":0,"ix":13,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-0.366],[0.367,0],[0,0.367],[-0.366,0]],"o":[[0,0.367],[-0.366,0],[0,-0.366],[0.367,0]],"v":[[0.663,-0.001],[-0.001,0.663],[-0.664,-0.001],[-0.001,-0.663]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[157.247,48.716],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 16","np":4,"cix":2,"bm":0,"ix":14,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[3.04,-1.111],[0,0],[-1.972,0.532],[0,0],[-0.036,-2.987],[-1.383,2.109]],"o":[[0,0],[-3.04,1.111],[0,0],[1.972,-0.53],[0,0],[0.037,2.987],[1.384,-2.109]],"v":[[4.096,-2.605],[-2.629,-5.815],[-4.796,0.142],[-2.787,-3.935],[0.396,-1.915],[-0.624,1.16],[4.285,4.817]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.638999968884,0.560999971278,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[131.854,71.18],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 17","np":4,"cix":2,"bm":0,"ix":15,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[4.723,3.801],[3.742,-3.528],[-4.911,-3.983],[-0.947,4.121]],"o":[[0,0],[-4.439,4.187],[4.267,3.461],[0,0]],"v":[[4.858,-5.955],[-5.142,-8.663],[-1.531,8.73],[8.279,7.151]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.764999988032,0.626999978458,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[131.252,68.659],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 18","np":4,"cix":2,"bm":0,"ix":16,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.694,-0.474],[0,0]],"o":[[0,0],[0.695,0.473],[0,0]],"v":[[-0.937,-4.171],[-1.848,3.969],[2.542,-4.441]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.255000005984,0.250999989229,0.258999992819,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[229.548,209.021],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 19","np":4,"cix":2,"bm":0,"ix":17,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-2.053,0.347],[1.011,-0.253]],"o":[[0,0],[0,0],[-1.01,0.252]],"v":[[-2.179,0.97],[2.179,-0.56],[-1.011,-0.717]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.889999988032,0.493999974868,0.497999991623,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[160.531,64.212],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 20","np":4,"cix":2,"bm":0,"ix":18,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-4.738,-1.453],[-1.473,1.642],[2.779,-0.505],[1.983,1.524],[0,0]],"o":[[0,0],[4.736,1.452],[0,0],[-2.78,0.506],[-2.179,-1.674],[0,0]],"v":[[-7.284,-2.89],[-2.309,1.131],[7.947,0.048],[3.643,2.383],[-5.326,0.71],[-7.947,-2.447]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.517999985639,0.607999973671,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[167.689,66.984],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 21","np":4,"cix":2,"bm":0,"ix":19,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[1.579,-3.221],[-0.568,3.221],[0,0],[0,0],[1.742,-3.716]],"o":[[0,0],[0,0],[0,0],[0,0],[0,0]],"v":[[-2.573,4.227],[-1.753,-2.783],[-1.374,-1.456],[-0.272,-4.227],[0.832,1.217]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.156999999402,0,0.33300000359,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[174,32.362],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 22","np":4,"cix":2,"bm":0,"ix":20,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-1.168,-5.747],[-2.623,6.157]],"o":[[0,0],[0,0],[0,0]],"v":[[0.563,-8.493],[-0.386,8.493],[1.554,-6.305]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.910000011968,0.477999997606,0.552999997606,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[171.276,40.854],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 23","np":4,"cix":2,"bm":0,"ix":21,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-1.51],[1.03,0],[0.22,0.13],[0.06,0.29],[-0.65,2],[0,0]],"o":[[0,1.51],[-0.25,0],[-0.07,-0.25],[0,0],[0,0],[1.03,0]],"v":[[1.39,0.005],[-0.47,2.735],[-1.19,2.525],[-1.39,1.715],[-0.53,-2.735],[-0.47,-2.735]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.388000009574,0.325,0.522000002394,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[172.275,46.336],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 24","np":4,"cix":2,"bm":0,"ix":22,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-2.11],[1.481,0],[0.121,0.03],[0.15,0.57],[0.061,0.29],[-0.651,2],[-0.181,0.35]],"o":[[0,2.18],[-0.13,0],[-0.299,-0.34],[-0.071,-0.25],[0,0],[0.15,-0.44],[1.42,0.11]],"v":[[1.946,0],[-0.736,3.94],[-1.115,3.9],[-1.744,2.52],[-1.946,1.71],[-1.085,-2.74],[-0.594,-3.94]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.541000007181,0.122000002394,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[172.83,46.341],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 25","np":4,"cix":2,"bm":0,"ix":23,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-1.509],[1.509,0],[0,1.51],[-1.509,0]],"o":[[0,1.51],[-1.509,0],[0,-1.509],[1.509,0]],"v":[[2.733,0],[0,2.733],[-2.733,0],[0,-2.733]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.388000009574,0.325,0.522000002394,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[153.382,48.479],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 26","np":4,"cix":2,"bm":0,"ix":24,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-2.18],[2.18,0],[0,2.18],[-0.01,0.03],[-1.5,0.87],[-0.2,0]],"o":[[0,2.18],[-2.18,0],[0,-0.03],[0.61,-1.47],[0.19,-0.03],[2.18,0]],"v":[[3.945,0.005],[0.005,3.945],[-3.945,0.005],[-3.935,-0.095],[-0.595,-3.895],[0.005,-3.945]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.541000007181,0.122000002394,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[153.381,48.476],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 27","np":4,"cix":2,"bm":0,"ix":25,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-0.04,-2.61],[1.981,0.04],[0.361,0.4],[0.151,0.57],[0.061,0.29],[-0.651,2],[-0.181,0.35],[-0.469,0.16]],"o":[[0.05,2.6],[-0.83,-0.02],[-0.3,-0.34],[-0.07,-0.25],[0,0],[0.15,-0.44],[0.319,-0.63],[1.54,-0.56]],"v":[[2.771,0.595],[-0.29,5.135],[-1.991,4.485],[-2.621,3.105],[-2.82,2.295],[-1.96,-2.155],[-1.47,-3.355],[-0.29,-4.615]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.944999964097,0.948999980852,0.948999980852,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[173.706,45.757],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 28","np":4,"cix":2,"bm":0,"ix":26,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0.119,-1.16],[3.411,0],[-0.009,1.74],[-0.281,0.67],[-1.5,0.87],[-1.161,-0.12]],"o":[[-0.131,1.17],[-3.029,0],[0,-0.61],[0.61,-1.47],[1,-0.59],[3.67,0.38]],"v":[[5.536,1.695],[0.415,4.955],[-5.645,1.695],[-5.204,-0.245],[-1.865,-4.045],[1.426,-4.835]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.944999964097,0.948999980852,0.948999980852,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[154.65,48.626],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 29","np":4,"cix":2,"bm":0,"ix":27,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-4.595,1.99],[0,0]],"o":[[0,0],[4.595,-1.989],[0,0]],"v":[[-5.312,4.795],[-0.796,-2.806],[5.392,1.655]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.46699999641,0.282000014361,0.368999974868,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[154.317,45.531],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 30","np":4,"cix":2,"bm":0,"ix":28,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-2.321,0.443],[0,0]],"o":[[0,0],[1.944,-0.37],[0,0]],"v":[[-2.589,4.401],[-0.269,-4.031],[2.589,0.113]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.46699999641,0.282000014361,0.368999974868,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[173.479,43.651],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 31","np":4,"cix":2,"bm":0,"ix":29,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-2.983,3.09],[-2.908,1.137],[0,-1.769],[-0.411,1.579],[0.19,-3.079],[4.181,-1.14]],"o":[[0,0],[2.147,-2.224],[0,0],[0,0],[0,0],[0,0],[-5.21,1.421]],"v":[[-7.318,6.142],[-3.861,0],[5.344,-5.605],[5.786,-2.889],[6.671,-6.142],[7.128,-1.484],[0.402,0.553]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.156999999402,0,0.33300000359,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[150.166,38.026],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 32","np":4,"cix":2,"bm":0,"ix":30,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[1.821,0.253],[-0.504,-5.349],[-2.399,0.695],[0.189,0.631]],"o":[[0,0],[0,0],[2.401,-0.694],[-0.19,-0.632]],"v":[[1.564,-2.337],[-3.787,2.444],[1.89,2.21],[3.785,-0.947]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.957000014361,0.689999988032,0.57599995931,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[258.581,179.516],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 33","np":4,"cix":2,"bm":0,"ix":31,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,-2.18],[8.621,-1.074],[-0.806,1.8],[-3.552,0.568]],"o":[[0,0],[0,2.178],[0,0],[0.805,-1.8],[0,0]],"v":[[3.813,-5.672],[7.224,-0.328],[-6.418,5.672],[-6.418,2.198],[2.25,-2.697]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.957000014361,0.689999988032,0.57599995931,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[266.266,157.139],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 34","np":4,"cix":2,"bm":0,"ix":32,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0.035,-1.272],[-2.261,0.477],[0.411,1.374]],"o":[[0,0],[2.262,-0.477],[-0.41,-1.374]],"v":[[-2.772,2.185],[0.51,3.337],[2.15,-2.44]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.910000011968,0.477999997606,0.552999997606,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[174.266,47.745],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 35","np":4,"cix":2,"bm":0,"ix":33,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.406,-1.335],[4.232,-1.148],[0,0],[-0.253,-0.948],[2.526,-0.506],[1.264,1.137],[-1.895,0.442],[-0.126,1.93],[-6.758,-0.631]],"o":[[0,0],[0.442,1.452],[0,0],[0,0],[0.253,0.947],[-2.527,0.505],[-1.262,-1.137],[0,0],[0.127,-1.93],[0,0]],"v":[[5.368,-7.674],[7.832,-4.705],[4.611,1.548],[2.715,2.053],[4.358,3.632],[0.506,7.169],[-7.516,5.526],[-6.063,2.368],[-8.717,-0.186],[4.548,-3.569]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.957000014361,0.689999988032,0.57599995931,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[259.595,168.747],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 36","np":4,"cix":2,"bm":0,"ix":34,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],"o":[[-7.83,20.97],[-28.29,5.43],[0,0],[9.85,-29.8],[26.02,-1.39],[0,0]],"v":[[42.825,-32.465],[13.515,33.095],[-41.305,33.975],[-42.825,31.525],[-11.745,-37.135],[41.815,-34.365]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0,0.19199999641,0.455000005984,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[233.131,169.476],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 37","np":4,"cix":2,"bm":0,"ix":35,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.331,-1.753],[-2.993,2.655]],"o":[[0,0],[0.332,1.752],[2.992,-2.654]],"v":[[-5.837,-3.579],[-6.146,0.117],[3.486,0.924]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.910000011968,0.477999997606,0.552999997606,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[155.151,51.631],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 38","np":4,"cix":2,"bm":0,"ix":36,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-4.92,-21.41],[-0.38,-2.649],[-0.01,-0.029],[0,0],[-1.14,-1.89],[-0.04,-0.46],[0,0],[23.679,-2.08],[0,0],[-2.609,3.6],[-0.19,1.329],[2.27,10.61],[4.739,20.71],[0.19,1.521],[0,0],[0,0],[2.909,26.15],[5.41,-0.73],[-1.011,-0.09],[0,0],[-3.98,1.39],[0,0],[-10.528,1.245],[0,0],[-4.04,-0.941],[0,0],[-3.159,-2.39],[1.259,-21.22]],"o":[[0,0],[0,0],[0,0],[0.36,2.641],[0,0],[0.21,0.36],[0.181,1.96],[0,0],[-23.68,2.089],[0,0],[0,0],[0.19,-1.33],[-2.28,-10.609],[0,0],[-0.19,-1.51],[0,0],[0,0],[-2.901,-26.149],[0,0],[1.009,0.09],[0,0],[3.98,-1.39],[0,0],[12.016,-1.421],[0,0],[4.05,0.949],[0,0],[3.16,2.38],[-1.26,21.22]],"v":[[33.92,1.029],[35.061,42.21],[38.471,46.939],[38.481,46.99],[38.28,52.059],[40.75,55.279],[41.12,56.52],[40.181,60.96],[14.221,68.921],[-27.84,75.551],[-26.66,67.219],[-30.499,62.29],[-23.86,35.199],[-39.399,-4.73],[-42.749,-7.311],[-41.36,-11.29],[-40.789,-10.21],[-32.899,-42.55],[-44.28,-69.561],[-38.959,-73.46],[-37.57,-71.51],[-30.209,-71.51],[-23.559,-75.55],[10.963,-56.479],[14.504,-71.054],[26.091,-68.639],[31.65,-68.639],[37.21,-69.82],[43.021,-33.081]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.280999995213,0.526000019148,0.907000014361,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[156.385,174.762],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 39","np":4,"cix":2,"bm":0,"ix":37,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[2.37,-6.66],[3.161,5.5],[5.68,-1.98],[-1.23,1.89],[4.95,-2.11],[0,0.95],[4.17,-0.09],[3.98,-7.58],[-2.18,-1.98],[-0.24,-7.86],[-0.37,-1.78],[-0.07,-0.26],[0,0],[2.19,4.98],[0.31,0.61],[0,0],[0.13,0.25],[-0.604,4.839],[-2.02,3.04],[3.01,-3.03],[-2.36,1.61],[-3.42,1.38],[-5.49,4.36],[-4.07,-3.5],[-0.58,-1.12],[0,0],[0,0],[0,0],[0,-0.02],[0,0]],"o":[[0,0],[0,0],[0,0],[-0.221,0.17],[0,0],[0,-0.95],[-4.17,0.1],[-3.97,7.58],[0,0],[0.08,2.35],[0.06,0.29],[0,0],[0,0],[-0.24,-0.57],[0,0],[-0.12,-0.24],[-1.36,-2.54],[0.569,-4.551],[0,0],[0,0],[2.35,-1.61],[3.43,-1.37],[5.5,-4.36],[1.05,0.9],[0,0],[0,0],[0,0],[0.01,0.02],[1.68,3.22],[0,0]],"v":[[25.113,-0.83],[21.512,-11.89],[12.323,-6.21],[16.193,-10.55],[7.493,-5.54],[8.913,-8.67],[1.143,-13.69],[-14.967,-3.27],[-12.767,6.99],[-13.617,24.25],[-12.967,30.59],[-12.767,31.41],[-18.457,26.21],[-20.697,17.76],[-21.527,15.99],[-21.557,15.94],[-21.937,15.21],[-26.879,3.079],[-16.007,-8.42],[-25.367,-3.36],[-22.527,-7.82],[-14.777,-9.81],[-1.227,-27.05],[20.943,-27.05],[23.353,-23.94],[23.363,-23.94],[23.363,-23.93],[23.363,-23.92],[23.383,-23.87],[25.113,-17.2]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.156999999402,0,0.33300000359,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[149.473,31.66],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 40","np":4,"cix":2,"bm":0,"ix":38,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[4.63,-5.77],[0.031,-0.05],[0.41,-0.21],[8.21,7.2],[1.86,3.35],[0,0],[1.64,3.9],[-0.54,6.11],[-7.71,6.57],[-4.8,-6.57],[-1.141,-3.28],[-1.139,-4.42]],"o":[[-0.03,0.03],[-0.359,0.43],[-5.69,2.91],[-3.12,-2.74],[-0.01,-0.03],[-2.98,-5.43],[-2.65,-6.31],[0.5,-5.68],[7.7,-6.57],[4.799,6.57],[1.14,3.29],[1.04,4.09]],"v":[[21.526,35.675],[21.424,35.785],[20.276,36.755],[-8.774,31.705],[-16.094,22.335],[-16.114,22.295],[-22.424,7.325],[-26.714,-15.665],[-17.364,-32.715],[14.086,-33.095],[19.896,-8.465],[26.215,3.155]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.764999988032,0.626999978458,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[156.521,53.766],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 41","np":4,"cix":2,"bm":0,"ix":39,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-11.295,-0.71],[-1.87,2.786],[0.364,0.99],[-0.473,-0.173],[2.385,-4.882],[7.305,3.081],[0,0]],"o":[[0,0],[2.515,0.158],[1.639,-2.444],[0.474,0.172],[0.915,1.193],[-2.898,5.93],[-9.209,-3.885],[0,0]],"v":[[-19.244,-11.79],[5.173,1.567],[13.771,-1.033],[13.963,-7.771],[15.383,-7.253],[19.182,5.86],[-3.546,8.104],[-21.568,-10.871]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.902000038297,0.905999995213,0.910000011968,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[155.504,111.001],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 42","np":4,"cix":2,"bm":0,"ix":40,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[3.282,4.675],[-0.002,11.437],[0,0],[4.342,-7.651],[0,0],[-11.241,2.771],[0,0]],"o":[[0,0],[0,0],[0,0],[-1.147,2.021],[0,0],[11.242,-2.771],[0,0]],"v":[[15.511,3.57],[12.222,-12.781],[-13.397,-25.282],[-16.451,-8.807],[-22.947,-3.592],[11.705,22.511],[20.693,7.499]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,0.638999968884,0.560999971278,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[155.983,104.891],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 43","np":4,"cix":2,"bm":0,"ix":41,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[28.17,-19.45],[0,0],[7.76,-7.2],[2.66,-4.871],[4.15,-5.869],[4.33,3.329],[0.41,4.07],[-1.06,7.59],[-2.01,2.89],[-1.9,3.03],[-0.09,-0.069],[-1.66,0.299],[0,0],[-0.63,-0.89],[-5.44,8.77],[0,0],[-1.88,0.35],[-1.67,-0.39]],"o":[[0,0],[0,0],[0,0],[0,0],[-4.15,5.87],[-1.15,-0.881],[-0.61,-6.151],[0.88,-6.259],[0,0],[0.09,0.06],[0.62,0.391],[2.15,-0.38],[0,0],[0,0],[5.43,-8.76],[0,0],[1.48,-0.28],[0,0]],"v":[[7.96,19.7],[5.88,8.33],[-7.19,15.53],[-10.04,24.3],[-23.13,34.479],[-33.18,37.61],[-35.52,29.67],[-34.84,7.309],[-30.5,-7.39],[-28.79,-14.279],[-28.51,-14.09],[-24.63,-13.14],[-20.68,-16.809],[-18.82,-15.79],[-4.79,-29.77],[1.52,-39.61],[4.79,-40.529],[9.73,-40.55]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.26699999641,0.517000026329,0.904999976065,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[107.315,145.731],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 44","np":4,"cix":2,"bm":0,"ix":42,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-0.017,-2.041],[0,0]],"o":[[0,0],[0.019,2.041],[0,0]],"v":[[-0.536,-3.229],[2.413,1.188],[-2.432,2.282]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.957000014361,0.588000009574,0.57599995931,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[260.068,177.992],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 45","np":4,"cix":2,"bm":0,"ix":43,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-5.116,-3.979],[-5.179,8.968]],"o":[[0,0],[0,0],[5.179,-8.969]],"v":[[-12.237,-0.789],[-7.879,11.716],[7.816,-2.747]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.957000014361,0.689999988032,0.57599995931,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[231.252,202.41],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 46","np":4,"cix":2,"bm":0,"ix":44,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0.56,-6.25],[0.48,-1.62],[0,0],[0.56,-2.399],[0,0],[0,0],[-1.52,13.65],[0.67,3.849],[0,0],[1.71,-1.889],[0,0],[0,0],[0,0],[-2.47,4.36],[-2.47,19.7],[-0.58,7.33],[0,0],[0,0],[0,0],[0,0],[-0.29,-1.519],[0,0]],"o":[[-0.21,2.301],[0,0],[-0.81,2.79],[-0.88,3.79],[0,0],[1.009,-5.46],[1.45,-13.05],[-0.03,-0.17],[-6.819,28.54],[-1.7,1.901],[-1.9,3.599],[0,0],[1.7,-7.799],[2.46,-4.361],[1.03,-8.21],[0,0],[0.81,-10.24],[7.76,-7.951],[0,0],[0,0],[0.279,1.51],[6.81,38.649]],"v":[[48.11,36.145],[47.02,41.924],[47.02,41.935],[44.63,49.215],[42.74,67.754],[16.21,67.754],[20,44.415],[12.98,-17.465],[12.929,-17.725],[-12.34,45.805],[-17.45,49.405],[-23.33,67.754],[-53.83,67.754],[-41.89,43.915],[-27.68,-9.896],[-25.28,-34.105],[-25.28,-34.125],[-24.08,-51.964],[44.389,-67.755],[46.31,-61.525],[48.77,-59.535],[47.02,-56.634]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.043000000598,0,0.33300000359,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[152.626,302.276],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 47","np":4,"cix":2,"bm":0,"ix":45,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[1.009,-2.02],[-0.88,-6.82],[0,0],[1.64,-1.14],[0,0],[0.05,0.04],[0.06,0.04],[0,0],[3.1,2.13],[0,0],[0,1.13],[7.951,8.33],[-1.02,5.91],[0,0],[-2.78,-2.031],[-0.5,-12.63],[0,0],[-2.53,-0.92]],"o":[[0,0],[-1.01,2.02],[0.889,6.82],[0,0],[0,0],[-0.019,-0.01],[-0.04,-0.02],[0,0],[-0.97,-0.64],[-3.66,-2.53],[0,0],[0,-1.14],[-7.42,-7.77],[0,0],[0,0],[2.769,2.04],[0.509,12.63],[0,0],[0,0]],"v":[[20.886,10.93],[17.355,12.19],[14.066,45.28],[17.476,49.58],[15.585,54.76],[15.575,54.75],[15.465,54.67],[15.316,54.57],[15.305,54.57],[7.876,49.58],[2.066,44.9],[2.575,39.73],[-13.465,3.35],[-12.575,-54.1],[-12.455,-54.76],[-3.236,-50.831],[10.025,-11.56],[15.075,8.24],[19.126,8.24]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.284000022739,0.527999997606,0.907000014361,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[206.81,163.221],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 48","np":4,"cix":2,"bm":0,"ix":46,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":24,"ty":4,"nm":"Bg b3 Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[219.008,65.371,0],"ix":2},"a":{"a":0,"k":[14.893,11.226,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"ef":[{"ty":5,"nm":"Turbulent Displace","np":16,"mn":"ADBE Turbulent Displace","ix":1,"en":1,"ef":[{"ty":7,"nm":"Displacement","mn":"ADBE Turbulent Displace-0001","ix":1,"v":{"a":0,"k":1,"ix":1}},{"ty":0,"nm":"Amount","mn":"ADBE Turbulent Displace-0002","ix":2,"v":{"a":0,"k":24,"ix":2}},{"ty":0,"nm":"Size","mn":"ADBE Turbulent Displace-0003","ix":3,"v":{"a":0,"k":115,"ix":3}},{"ty":3,"nm":"Offset (Turbulence)","mn":"ADBE Turbulent Displace-0004","ix":4,"v":{"a":0,"k":[250,250],"ix":4}},{"ty":0,"nm":"Complexity","mn":"ADBE Turbulent Displace-0005","ix":5,"v":{"a":0,"k":1,"ix":5}},{"ty":0,"nm":"Evolution","mn":"ADBE Turbulent Displace-0006","ix":6,"v":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0]},{"t":360,"s":[360]}],"ix":6}},{"ty":6,"nm":"Evolution Options","mn":"ADBE Turbulent Displace-0007","ix":7,"v":0},{"ty":7,"nm":"Cycle Evolution","mn":"ADBE Turbulent Displace-0008","ix":8,"v":{"a":0,"k":0,"ix":8}},{"ty":0,"nm":"Cycle (in Revolutions)","mn":"ADBE Turbulent Displace-0009","ix":9,"v":{"a":0,"k":1,"ix":9}},{"ty":0,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0010","ix":10,"v":{"a":0,"k":0,"ix":10}},{"ty":6,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0011","ix":11,"v":0},{"ty":7,"nm":"Pinning","mn":"ADBE Turbulent Displace-0012","ix":12,"v":{"a":0,"k":3,"ix":12}},{"ty":7,"nm":"Resize Layer","mn":"ADBE Turbulent Displace-0013","ix":13,"v":{"a":0,"k":0,"ix":13}},{"ty":7,"nm":"Antialiasing for Best Quality","mn":"ADBE Turbulent Displace-0014","ix":14,"v":{"a":0,"k":1,"ix":14}}]}],"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-1.23,1.506],[5.564,2.895],[4.124,-4.579],[-6.333,-1.774]],"o":[[3.967,-4.858],[-4.38,-2.279],[-7.98,8.862],[2.686,0.752]],"v":[[10.676,7.572],[7.369,-7.445],[-6.663,-6.397],[3.66,10.223]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.313999998803,0.847000002394,0.564999988032,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[14.893,11.226],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":26,"ty":4,"nm":"BG b2 Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[65.298,272.214,0],"ix":2},"a":{"a":0,"k":[12.083,14.408,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"ef":[{"ty":5,"nm":"Turbulent Displace","np":16,"mn":"ADBE Turbulent Displace","ix":1,"en":1,"ef":[{"ty":7,"nm":"Displacement","mn":"ADBE Turbulent Displace-0001","ix":1,"v":{"a":0,"k":1,"ix":1}},{"ty":0,"nm":"Amount","mn":"ADBE Turbulent Displace-0002","ix":2,"v":{"a":0,"k":8,"ix":2}},{"ty":0,"nm":"Size","mn":"ADBE Turbulent Displace-0003","ix":3,"v":{"a":0,"k":116,"ix":3}},{"ty":3,"nm":"Offset (Turbulence)","mn":"ADBE Turbulent Displace-0004","ix":4,"v":{"a":0,"k":[250,250],"ix":4}},{"ty":0,"nm":"Complexity","mn":"ADBE Turbulent Displace-0005","ix":5,"v":{"a":0,"k":1,"ix":5}},{"ty":0,"nm":"Evolution","mn":"ADBE Turbulent Displace-0006","ix":6,"v":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0]},{"t":361,"s":[360]}],"ix":6}},{"ty":6,"nm":"Evolution Options","mn":"ADBE Turbulent Displace-0007","ix":7,"v":0},{"ty":7,"nm":"Cycle Evolution","mn":"ADBE Turbulent Displace-0008","ix":8,"v":{"a":0,"k":0,"ix":8}},{"ty":0,"nm":"Cycle (in Revolutions)","mn":"ADBE Turbulent Displace-0009","ix":9,"v":{"a":0,"k":1,"ix":9}},{"ty":0,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0010","ix":10,"v":{"a":0,"k":0,"ix":10}},{"ty":6,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0011","ix":11,"v":0},{"ty":7,"nm":"Pinning","mn":"ADBE Turbulent Displace-0012","ix":12,"v":{"a":0,"k":3,"ix":12}},{"ty":7,"nm":"Resize Layer","mn":"ADBE Turbulent Displace-0013","ix":13,"v":{"a":0,"k":0,"ix":13}},{"ty":7,"nm":"Antialiasing for Best Quality","mn":"ADBE Turbulent Displace-0014","ix":14,"v":{"a":0,"k":1,"ix":14}}]}],"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0.996,1.671],[4.621,-4.241],[-2.896,-5.44],[-3.831,5.347]],"o":[[-3.211,-5.387],[-3.637,3.338],[5.604,10.527],[1.624,-2.268]],"v":[[10.112,-7.896],[-5.132,-9.917],[-8.937,3.63],[10.209,-0.396]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.630999995213,0.902000038297,0.889999988032,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[12.083,14.408],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":28,"ty":4,"nm":"BG b1 Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":1,"k":[{"i":{"x":0.667,"y":1},"o":{"x":0.333,"y":0},"t":0,"s":[450.787,242.075,0],"to":[-0.333,24.5,0],"ti":[0,0,0]},{"i":{"x":0.667,"y":1},"o":{"x":0.333,"y":0},"t":180,"s":[448.787,389.075,0],"to":[0,0,0],"ti":[-91.333,69.5,0]},{"t":345,"s":[450.787,242.075,0]}],"ix":2},"a":{"a":0,"k":[13.635,20.42,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"ef":[{"ty":5,"nm":"Turbulent Displace","np":16,"mn":"ADBE Turbulent Displace","ix":1,"en":1,"ef":[{"ty":7,"nm":"Displacement","mn":"ADBE Turbulent Displace-0001","ix":1,"v":{"a":0,"k":1,"ix":1}},{"ty":0,"nm":"Amount","mn":"ADBE Turbulent Displace-0002","ix":2,"v":{"a":0,"k":30,"ix":2}},{"ty":0,"nm":"Size","mn":"ADBE Turbulent Displace-0003","ix":3,"v":{"a":0,"k":121,"ix":3}},{"ty":3,"nm":"Offset (Turbulence)","mn":"ADBE Turbulent Displace-0004","ix":4,"v":{"a":0,"k":[250,250],"ix":4}},{"ty":0,"nm":"Complexity","mn":"ADBE Turbulent Displace-0005","ix":5,"v":{"a":0,"k":1,"ix":5}},{"ty":0,"nm":"Evolution","mn":"ADBE Turbulent Displace-0006","ix":6,"v":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0]},{"t":361,"s":[1201]}],"ix":6}},{"ty":6,"nm":"Evolution Options","mn":"ADBE Turbulent Displace-0007","ix":7,"v":0},{"ty":7,"nm":"Cycle Evolution","mn":"ADBE Turbulent Displace-0008","ix":8,"v":{"a":0,"k":0,"ix":8}},{"ty":0,"nm":"Cycle (in Revolutions)","mn":"ADBE Turbulent Displace-0009","ix":9,"v":{"a":0,"k":1,"ix":9}},{"ty":0,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0010","ix":10,"v":{"a":0,"k":0,"ix":10}},{"ty":6,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0011","ix":11,"v":0},{"ty":7,"nm":"Pinning","mn":"ADBE Turbulent Displace-0012","ix":12,"v":{"a":0,"k":3,"ix":12}},{"ty":7,"nm":"Resize Layer","mn":"ADBE Turbulent Displace-0013","ix":13,"v":{"a":0,"k":0,"ix":13}},{"ty":7,"nm":"Antialiasing for Best Quality","mn":"ADBE Turbulent Displace-0014","ix":14,"v":{"a":0,"k":1,"ix":14}}]}],"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-2.187,6.258],[8.382,6.988],[-3.391,-9.528]],"o":[[0,0],[-8.383,-6.987],[3.391,9.528]],"v":[[5.386,11.292],[5.003,-13.183],[-9.994,10.642]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.92549020052,0.984313726425,0.988235294819,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[13.635,20.42],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":30,"ty":4,"nm":"BG b Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[261.468,236.383,0],"ix":2},"a":{"a":0,"k":[250.839,175.745,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"ef":[{"ty":5,"nm":"Turbulent Displace","np":16,"mn":"ADBE Turbulent Displace","ix":1,"en":1,"ef":[{"ty":7,"nm":"Displacement","mn":"ADBE Turbulent Displace-0001","ix":1,"v":{"a":0,"k":1,"ix":1}},{"ty":0,"nm":"Amount","mn":"ADBE Turbulent Displace-0002","ix":2,"v":{"a":0,"k":41,"ix":2}},{"ty":0,"nm":"Size","mn":"ADBE Turbulent Displace-0003","ix":3,"v":{"a":0,"k":106,"ix":3}},{"ty":3,"nm":"Offset (Turbulence)","mn":"ADBE Turbulent Displace-0004","ix":4,"v":{"a":0,"k":[250,250],"ix":4}},{"ty":0,"nm":"Complexity","mn":"ADBE Turbulent Displace-0005","ix":5,"v":{"a":0,"k":1,"ix":5}},{"ty":0,"nm":"Evolution","mn":"ADBE Turbulent Displace-0006","ix":6,"v":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0]},{"t":360,"s":[224]}],"ix":6}},{"ty":6,"nm":"Evolution Options","mn":"ADBE Turbulent Displace-0007","ix":7,"v":0},{"ty":7,"nm":"Cycle Evolution","mn":"ADBE Turbulent Displace-0008","ix":8,"v":{"a":0,"k":0,"ix":8}},{"ty":0,"nm":"Cycle (in Revolutions)","mn":"ADBE Turbulent Displace-0009","ix":9,"v":{"a":0,"k":1,"ix":9}},{"ty":0,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0010","ix":10,"v":{"a":0,"k":0,"ix":10}},{"ty":6,"nm":"Random Seed","mn":"ADBE Turbulent Displace-0011","ix":11,"v":0},{"ty":7,"nm":"Pinning","mn":"ADBE Turbulent Displace-0012","ix":12,"v":{"a":0,"k":3,"ix":12}},{"ty":7,"nm":"Resize Layer","mn":"ADBE Turbulent Displace-0013","ix":13,"v":{"a":0,"k":0,"ix":13}},{"ty":7,"nm":"Antialiasing for Best Quality","mn":"ADBE Turbulent Displace-0014","ix":14,"v":{"a":0,"k":1,"ix":14}}]}],"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[258.589,82.023],[40.905,-50.765],[102.758,-50.646],[-76.823,12.422],[-193.004,-29.41]],"o":[[0,0],[-40.906,50.765],[-72.566,35.764],[87.418,-14.133],[95.597,14.568]],"v":[[-1.972,-141.678],[-127.868,-124.73],[-171.994,42.98],[-130.619,163.074],[90.378,128.932]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.925,0.984000052658,0.987999949736,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[244.81,175.745],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0},{"ddd":0,"ind":32,"ty":4,"nm":"BG Bottom Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[248.139,488.509,0],"ix":2},"a":{"a":0,"k":[225.721,9.741,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,-5.242],[124.525,0],[0,5.242],[-124.524,0]],"o":[[0,5.242],[-124.524,0],[0,-5.242],[124.525,0]],"v":[[225.471,0],[0,9.491],[-225.471,0],[0,-9.491]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.823999980852,0.980000035903,0.984000052658,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[225.721,9.741],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":4,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":1800,"st":0,"bm":0}],"markers":[]};

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
      than: (coDuLieu
        ? '<div class="danh-sach-lien-he">' + MUC_LIEN_HE.map(veDongLienHe).join('') + '</div>'
        : '' +
          '<div class="noi-dung-van-ban" style="text-align:center">' +
            '<p style="font-size:28px;margin-bottom:8px" aria-hidden="true">' + (dangTai ? '⏳' : '🛠️') + '</p>' +
            '<p><strong>' + (dangTai ? 'Đang tải thông tin liên hệ…' : 'Thông tin liên hệ đang được cập nhật.') + '</strong></p>' +
            (dangTai ? '' : '<p style="color:var(--chu-diu);margin-bottom:0">Mời bạn quay lại bảng này sau nhé.</p>') +
          '</div>') +
        veKhoiGiangVien(du),
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>',
      // Tổng thời lượng animation chỉ 2 giây rồi tự ẩn (toiDaGiay, PHẦN 08).
      khiVe: function(){ kiemTraChaoModalLanDau('lien-he', 'chao-lien-he-lan-dau', LIEN_HE_CHAO_DU_LIEU, 2); }
    });
  }

  // Khối "Thông tin giảng viên" ở cuối bảng Liên hệ — admin nhập ở mục Liên
  // hệ và mạng xã hội trong trang quản trị (cùng nhánh 'thongtinlienhe' nên
  // không cần tải thêm gì ở đây), PHẦN 04B. Để trống tên là ẩn hẳn khối này.
  function veKhoiGiangVien(du){
    const ten = String(du.giangVienTen || '').trim();
    if (!ten) return '';
    const chucDanh = String(du.giangVienChucDanh || '').trim();
    const moTa = String(du.giangVienMoTa || '').trim();
    const anh = String(du.giangVienAnh || '').trim();
    return '' +
      '<div class="khoi-giang-vien">' +
        '<h3 class="khoi-giang-vien-tieu-de">Thông tin giảng viên</h3>' +
        '<div class="khoi-giang-vien-than">' +
          (anh
            // srcAnhCongNhan() (PHẦN 03I) tái dùng NGUYÊN — link Drive share
            // (.../file/d/...) không tự hiện ra được như ảnh, phải tách mã
            // rồi dựng lại địa chỉ xem trước của Drive. Đây CHÍNH LÀ lỗi
            // thật đã xảy ra: dán thẳng link Drive vào src thì ảnh không
            // hiện, trong khi module "Sự công nhận" đã xử lý đúng từ đầu.
            ? '<img class="khoi-giang-vien-anh" src="' + escapeHtml(srcAnhCongNhan(anh)) + '" alt="Ảnh giảng viên ' + escapeHtml(ten) + '" loading="lazy">'
            : '') +
          '<div class="khoi-giang-vien-chu">' +
            '<p class="khoi-giang-vien-ten">' + escapeHtml(ten) + '</p>' +
            (chucDanh ? '<p class="khoi-giang-vien-chuc-danh">' + escapeHtml(chucDanh) + '</p>' : '') +
            (moTa ? '<p class="khoi-giang-vien-mo-ta">' + escapeHtml(moTa).replace(/\n/g, '<br>') + '</p>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
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

  // Module dạng "trang" (một màn hình riêng hoàn chỉnh) được gắn thêm MỘT
  // thanh chạy chữ ở CUỐI — TRỪ "Trang chủ" (tự nó đã có hai thanh y hệt, xen
  // giữa các khối, PHẦN 05B) và TRỪ "Image Editor Pro" (công cụ toàn màn
  // hình riêng, thêm thanh vào phá bố cục công cụ). Module kieu "modal"
  // (Liên hệ, Hoàn tiền, Đặc quyền...) không phải màn hình riêng nên cũng
  // không có. CHỈ ở cuối, không còn ở đầu nữa (đã bỏ theo yêu cầu).
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
      return noiDung + veThanhChayModule('tc-cuoi-' + m.ma);
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
    // Video 1 và 2 của module "Xem video ngắn" (PHẦN 03G), và Bài 1 của ba
    // khoá học "Lightroom điện thoại"/"Photoshop"/"Lightroom máy tính"
    // (PHẦN 03C/03H/03D) chèn khung xem NGAY tại trang chính (không qua
    // modal) — khung đó cần initKhungVideo() canh tỷ lệ y như mọi khung
    // video khác trong web.
    if (m && (m.ma === 'video-ngan' || m.ma === 'khoa-hoc-mobile' || m.ma === 'khoa-photoshop' ||
      m.ma === 'khoa-hoc-may-tinh')) initKhungVideo();
    // Animation chào LẦN ĐẦU vào module (PHẦN 08 — kiemTraChaoModuleLanDau():
    // cờ bằng biến JS thường, KHÔNG localStorage, tải lại trang (F5) là coi
    // như lần đầu lại; vào-ra nhiều lần trong cùng một lần tải trang thì chỉ
    // hiện đúng một lần đầu tiên; phải đợi menu trái ẩn mới thật sự hiện).
    if (laAppVip) kiemTraChaoAppVipLanDau();
    if (m && state.trang === 'chinh' && m.ma === 'khoa-hoc-mobile') kiemTraChaoKhoaHocMobileLanDau();
    if (m && state.trang === 'chinh' && m.ma === 'khoa-hoc-may-tinh') kiemTraChaoKhoaHocMayTinhLanDau();
    if (m && state.trang === 'chinh' && m.ma === 'khoa-photoshop') kiemTraChaoKhoaPhotoshopLanDau();
    if (m && state.trang === 'chinh' && m.ma === 'qua-tang-android') kiemTraChaoQuaTangAndroidLanDau();
    if (m && state.trang === 'chinh' && m.ma === 'video-ngan') kiemTraChaoVideoNganLanDau();
    if (m && state.trang === 'chinh' && m.ma === 'image-editor-pro') kiemTraChaoImageEditorLanDau();
    doChoThanhDay();   // chừa đúng chiều cao thật của thanh neo đáy
  }
