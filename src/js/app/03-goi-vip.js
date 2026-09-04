
  /* ===========================================================================
     PHẦN 03 — MODULE "GÓI HÀNG VIP LIGHTROOM"
     Danh sách sản phẩm, hiệu ứng xuất hiện, thanh báo giá neo đáy.
     =========================================================================== */

  const THOI_LUONG_TROI = 2000;      // ms — khớp với transition trong app.css
  const TRE_MOI_THE_RONG = 500;      // ms — màn hình rộng: thẻ sau trễ hơn thẻ trước
  const THOI_LUONG_NHAY_SO = 900;    // ms — giá chốt đếm từ giá gốc về giá thật
  const NHAY_SO_TRONG_BANG = 1800;   // ms — trong bảng chi tiết thì chậm gấp đôi
  const MAN_HINH_RONG = '(min-width: 720px)';

  function manHinhRong(){
    return typeof window.matchMedia === 'function' && window.matchMedia(MAN_HINH_RONG).matches;
  }

  function veTheSanPham(sp, chiSo){
    const daChon = dangChon(sp.ma);
    const phanTram = phanTramGiamSanPham(sp);
    const choTroi = state.hieuUngVaoModule ? ' cho-troi-len' : '';
    // Lúc chờ trôi, giá chốt cố ý hiện ĐÚNG BẰNG giá gốc; trôi xong nó mới đếm
    // ngược về giá thật (xem chayNhaySo) — khách thấy rõ mình được bớt bao nhiêu.
    const giaHienBanDau = state.hieuUngVaoModule ? sp.giaGoc : sp.giaChot;

    // Cả khung sản phẩm cũng là một vùng bấm chọn. Không cần xử lý gì thêm để
    // tránh bấm hai lần: bộ phân phối sự kiện tìm phần tử [data-hanh-dong] GẦN
    // NHẤT tính từ chỗ bấm, nên bấm trúng nút bên trong (Xem chi tiết / Chọn
    // sản phẩm này) thì nút đó nhận, chỉ khi bấm vào khoảng trống của khung
    // mới tới lượt chính khung.
    return '' +
      '<article class="the-sanpham' + (daChon ? ' da-chon' : '') + choTroi +
        '" data-hanh-dong="chon-san-pham" data-ma="' + escapeHtml(sp.ma) + '">' +
        '<div class="so-thu-tu">SẢN PHẨM ' + (chiSo + 1) + '</div>' +
        '<h3 class="ten-sanpham">' + escapeHtml(sp.ten) + '</h3>' +
        '<button type="button" class="nut nut-nho nut-vien nut-rong nut-chi-tiet" data-hanh-dong="xem-chi-tiet" data-ma="' +
          escapeHtml(sp.ma) + '">Xem chi tiết sản phẩm</button>' +
        // Dòng giá gồm ba phần trên cùng một hàng: giá gốc (cam) → phần trăm
        // giảm (xanh lá đậm) → giá chốt (xanh của web, to rõ).
        '<div class="hang-gia">' +
          '<span class="gia-goc">' + dinhDangTien(sp.giaGoc) + '</span>' +
          '<span class="phan-tram">Giảm ' + phanTram + '%</span>' +
          '<span class="chi-con">chỉ còn</span>' +
          '<span class="gia-chot" data-gia-chot="' + sp.giaChot + '" data-gia-goc="' + sp.giaGoc + '">' +
            dinhDangTien(giaHienBanDau) + '</span>' +
        '</div>' +
        '<button type="button" class="nut nut-rong ' + (daChon ? 'nut-chinh' : 'nut-chua-chon') +
          '" data-hanh-dong="chon-san-pham" data-ma="' + escapeHtml(sp.ma) + '"' +
          ' aria-pressed="' + (daChon ? 'true' : 'false') + '">' +
          (daChon ? '✓ Đã chọn — bấm để bỏ' : 'Chọn sản phẩm này') +
        '</button>' +
      '</article>';
  }

  // Ba món quà tặng nằm ở cuối module — đều là module có sẵn trong MODULE, chỉ
  // dẫn sang chứ không mở bảng phụ nào.
  const QUA_TANG = [
    { module: 'qua-tang-android',  ten: 'Quà tặng cho người dùng điện thoại android', bieuTuong: '🎁' },
    { module: 'khoa-hoc-mobile',   ten: 'Khoá học Lightroom điện thoại',              bieuTuong: '📱' },
    { module: 'khoa-hoc-may-tinh', ten: 'Khoá học Lightroom máy tính',                bieuTuong: '💻' }
  ];

  function veKhuQuaTang(){
    const nut = QUA_TANG.map(function(q){
      return '<button type="button" class="nut nut-vien nut-rong nut-qua" data-hanh-dong="mo-module" data-module="' +
        escapeHtml(q.module) + '">' +
        '<span class="bieu-tuong" aria-hidden="true">' + q.bieuTuong + '</span>' +
        '<span class="chu">' + escapeHtml(q.ten) + '</span>' +
        '</button>';
    }).join('');

    return '' +
      '<section class="khu-qua-tang">' +
        '<p class="dong-qua-tang" id="dong-qua-tang">Xem và nhận quà tặng của shop mà không cần mua hàng gì cả:</p>' +
        '<div class="hang-nut-qua">' + nut + '</div>' +
        '<button type="button" class="nut nut-rong nut-len-dau" data-hanh-dong="cuon-len-dau">' +
          '<span aria-hidden="true">↑</span> Cuộn lên đầu trang</button>' +
      '</section>';
  }

  function veModuleGoiVip(){
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Trọn bộ sản phẩm VIP cho Lightroom, Photoshop và Thiết kế</h2>' +
        '<p>Chọn những sản phẩm bạn cần, giá đã chốt hiện ngay ở thanh dưới đáy màn hình.</p>' +
        '<div class="bang-uu-dai"><span aria-hidden="true">🔥</span> Chọn càng nhiều càng rẻ: mỗi sản phẩm được giảm thêm ' +
          GIAM_MOI_SAN_PHAM + '% ở bước chốt đơn — chỉ áp dụng với sản phẩm giá trị trên 40K</div>' +
        '<button type="button" class="nut nut-rong nut-toi-qua-tang" data-hanh-dong="xuong-qua-tang">' +
          '<span aria-hidden="true">🎁</span> Nhận quà tặng của Shop mà không cần mua hàng</button>' +
      '</section>' +
      '<div class="luoi-sanpham">' +
        SAN_PHAM.map(veTheSanPham).join('') +
      '</div>' +
      // Dẫn thẳng tới đúng module 'dac-quyen' trong MODULE, nên nút này và mục
      // cùng tên ở menu bên trái luôn mở ra y hệt một bảng.
      '<button type="button" class="nut nut-rong nut-dac-quyen" data-hanh-dong="mo-module" data-module="dac-quyen">' +
        '<span aria-hidden="true">👑</span> Đặc quyền dành cho khách đã từng mua hàng của shop</button>' +
      // Cùng dẫn tới module 'hoan-tien' như mục ở menu bên trái, nên hai nơi
      // luôn mở ra y hệt một bảng.
      '<button type="button" class="nut nut-rong nut-hoan-tien" data-hanh-dong="mo-module" data-module="hoan-tien">' +
        '<span aria-hidden="true">↩</span> Yêu cầu hoàn tiền 100% với sản phẩm đã mua</button>' +
      // CỐ Ý chưa có data-hanh-dong: nút đã dựng sẵn chỗ nhưng chưa nối việc gì.
      // Cũng cố ý KHÔNG dùng thuộc tính disabled — disabled làm nút xám đi và
      // báo với khách rằng nó hỏng; ở đây nó chỉ là dòng chữ chờ ngày nối việc.
      '<button type="button" class="nut nut-rong nut-tu-van">' +
        '<span aria-hidden="true">💬</span> Tôi cần được Tư vấn thêm</button>' +
      veKhuQuaTang();
  }

  // --------------------------------------------- CUỘN VÀ HIỆU ỨNG KHU QUÀ TẶNG

  const SO_LAN_NHAY_QUA_TANG = 5;   // nhảy đúng 5 lần rồi đứng im hẳn

  function cuonLenDauTrang(){
    if (window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Bấm nút mời quà ở đầu module: cuộn thẳng xuống cuối, đồng thời cho dòng
  // chữ mời quà nhảy múa. Hiệu ứng chạy ngay chứ không đợi cuộn xong — nó kéo
  // dài hơn quãng cuộn nên khi mắt tới nơi thì dòng chữ vẫn đang nhảy.
  function xuongKhuQuaTang(){
    if (window.scrollTo) {
      const day = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.scrollTo({ top: day, behavior: 'smooth' });
    }
    const dong = document.getElementById('dong-qua-tang');
    if (!dong) return;
    // Gỡ rồi gắn lại lớp để hiệu ứng chạy LẠI TỪ ĐẦU ở những lần bấm sau —
    // gắn thêm một lớp đã có sẵn thì trình duyệt coi như không đổi gì.
    dong.classList.remove('nhay-qua-tang');
    void dong.offsetWidth;   // buộc trình duyệt tính lại, nếu không lớp mới bị gộp
    dong.classList.add('nhay-qua-tang');
  }

  // ------------------------------------------------- THANH BÁO GIÁ NEO ĐÁY
  // Thanh này dùng position:fixed nên luôn dính đáy màn hình dù trang cuộn lên
  // hay xuống. Phần cuối trang đã được chừa sẵn khoảng trống (--cao-thanh-day)
  // để thanh không che mất sản phẩm cuối cùng.

  function dangChonHet(){
    return state.daChon.length === SAN_PHAM.length;
  }

  function veThanhBaoGia(){
    const t = tinhTien();
    // Chốt đơn được khi đã chọn hàng VÀ số tiền cuối cùng lớn hơn 0 — chọn mỗi
    // hai Bộ Khoá học miễn phí thì không có gì để thanh toán.
    const chotDuoc = t.soLuong > 0 && t.thanhTien > 0;
    const chonHet = dangChonHet();
    return '' +
      '<div class="thanh-bao-gia" role="region" aria-label="Bảng báo giá">' +
        // Nút chọn tất cả nằm sát mép trái thanh, tách hẳn khỏi khối số liệu
        // đang dồn về bên phải.
        '<button type="button" class="nut-chon-tat-ca' + (chonHet ? ' sang' : '') +
          '" data-hanh-dong="chon-tat-ca" aria-pressed="' + (chonHet ? 'true' : 'false') + '">' +
          '<span class="o-tich" aria-hidden="true">' + (chonHet ? '✓' : '') + '</span>' +
          '<span class="chu">Chọn tất cả</span>' +
        '</button>' +
        '<div class="so-lieu">' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Đã chọn</span>' +
            '<span class="tri">' + t.soLuong + ' sản phẩm</span>' +
          '</div>' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Tổng trị giá</span>' +
            '<span class="tri tong">' + dinhDangTien(t.tongTien) + '</span>' +
          '</div>' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Giảm giá lần hai</span>' +
            '<span class="tri giam">' + t.phanTramGiam + '% (−' + dinhDangTien(t.tienGiam) + ')</span>' +
          '</div>' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Số tiền cuối cùng</span>' +
            '<span class="tri chot">' + dinhDangTien(t.thanhTien) + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="nut nut-do nut-mua-hang" data-hanh-dong="mua-hang"' + (chotDuoc ? '' : ' disabled') + '>' +
          (t.soLuong === 0 ? 'Hãy chọn sản phẩm' : (chotDuoc ? 'Mua hàng' : 'Chưa có gì để thanh toán')) +
        '</button>' +
      '</div>';
  }

  // --------------------------------------------------- GIÁ CHỐT ĐẾM VỀ SỐ THẬT

  // Đếm từ giá gốc xuống giá chốt, nhảy từng nấc chứ không đổi số tức thì.
  // Làm tròn tới hàng nghìn cho số nhảy gọn mắt; nhịp chậm dần về cuối
  // (ease-out) nên mắt kịp đọc con số dừng lại.
  // thoiLuong: bỏ trống thì dùng nhịp mặc định của lưới sản phẩm. Bảng mô tả
  // chi tiết truyền vào nhịp riêng, chậm gấp đôi — ở đó khách đang đọc chứ
  // không lướt, con số chạy thong thả mới kịp thấy nó rơi từ đâu xuống đâu.
  function chayNhaySo(el, thoiLuong){
    if (!el || el.dataset.dangNhay === '1') return;
    const nhipChay = Number(thoiLuong) > 0 ? Number(thoiLuong) : THOI_LUONG_NHAY_SO;
    const tuSo = Number(el.getAttribute('data-gia-goc')) || 0;
    const denSo = Number(el.getAttribute('data-gia-chot')) || 0;
    if (tuSo === denSo) return;

    if (typeof requestAnimationFrame !== 'function') {
      el.textContent = dinhDangTien(denSo);
      return;
    }

    el.dataset.dangNhay = '1';
    const batDau = Date.now();
    const buoc = function(){
      const troi = Math.min(1, (Date.now() - batDau) / nhipChay);
      const nhip = 1 - Math.pow(1 - troi, 3);   // nhanh lúc đầu, chậm dần về cuối
      if (troi >= 1) {
        // Sản phẩm giá 0 dừng ở chữ "MIỄN PHÍ" thay vì "0 ₫" — chữ cuối do nơi
        // gọi đặt sẵn trong data-chu-cuoi.
        el.textContent = el.getAttribute('data-chu-cuoi') || dinhDangTien(denSo);
        delete el.dataset.dangNhay;
        return;
      }
      const hienTai = Math.round((tuSo + (denSo - tuSo) * nhip) / 1000) * 1000;
      el.textContent = dinhDangTien(hienTai);
      requestAnimationFrame(buoc);
    };
    requestAnimationFrame(buoc);
  }

  // ------------------------------------------- HIỆU ỨNG XUẤT HIỆN CỦA CÁC THẺ
  //
  // Hai kiểu khác nhau, tuỳ bề ngang màn hình:
  //
  //   MÀN HÌNH RỘNG — thấy được cả lưới ngay từ đầu nên không bắt khách cuộn:
  //     thẻ 1 chạy tức thì, thẻ 2 trễ 0,5 giây, thẻ 3 trễ 1 giây... cứ thế.
  //
  //   MÀN HÌNH HẸP — chỉ thấy một hai thẻ mỗi lúc nên chạy theo tầm nhìn: chỉ
  //     cần MÉP TRÊN của khung (tính ở vị trí sau khi trôi xong, chứ không phải
  //     vị trí đang bị đẩy xuống) lọt vào màn hình dù chỉ một chút là thẻ đó
  //     trôi lên ngay. Vì thẻ đang bị đẩy xuống đúng một chiều cao của chính
  //     nó, mép trên ở vị trí thật = rect.top - rect.height.
  //
  // Trôi xong thì giá chốt bắt đầu đếm về số thật.

  function batDauTroi(el){
    if (!el || !el.classList.contains('cho-troi-len') || el.classList.contains('dang-troi-len')) return;
    el.classList.add('dang-troi-len');
    setTimeout(function(){ chayNhaySo(el.querySelector('.gia-chot')); }, THOI_LUONG_TROI);
  }

  function ganHieuUngTroiLen(){
    const the = Array.prototype.slice.call(document.querySelectorAll('.the-sanpham.cho-troi-len'));
    // Dọn bộ theo dõi của lần vào module trước, nếu còn.
    if (window.__goHieuUngTroi) { window.__goHieuUngTroi(); window.__goHieuUngTroi = null; }
    if (!the.length) return;

    state.hieuUngVaoModule = false;   // cờ dùng xong, lần vẽ lại sau không trôi nữa

    // Máy đã tắt hiệu ứng chuyển động trong hệ điều hành: hiện thẳng, đủ số.
    const tatChuyenDong = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (tatChuyenDong) {
      the.forEach(function(el){
        el.classList.remove('cho-troi-len');
        const gia = el.querySelector('.gia-chot');
        if (gia) gia.textContent = dinhDangTien(Number(gia.getAttribute('data-gia-chot')) || 0);
      });
      return;
    }

    if (manHinhRong()) {
      const hen = the.map(function(el, i){
        return setTimeout(function(){ batDauTroi(el); }, i * TRE_MOI_THE_RONG);
      });
      window.__goHieuUngTroi = function(){ hen.forEach(clearTimeout); };
      return;
    }

    // ----- Màn hình hẹp: chạy theo tầm nhìn
    let choXet = false;
    const xet = function(){
      choXet = false;
      let conLai = 0;
      the.forEach(function(el){
        if (el.classList.contains('dang-troi-len')) return;
        conLai++;
        const o = el.getBoundingClientRect();
        // o.top đang là vị trí SAU khi bị đẩy xuống; trừ đi chiều cao thẻ ra
        // đúng mép trên ở vị trí thật. Chỉ cần nó nhỏ hơn đáy màn hình (lọt vào
        // dù một chút) là trôi ngay.
        if (o.top - o.height < window.innerHeight) batDauTroi(el);
      });
      if (!conLai && window.__goHieuUngTroi) { window.__goHieuUngTroi(); window.__goHieuUngTroi = null; }
    };
    const henXet = function(){
      if (choXet) return;
      choXet = true;
      requestAnimationFrame(xet);
    };

    window.addEventListener('scroll', henXet, { passive: true });
    window.addEventListener('resize', henXet);
    window.__goHieuUngTroi = function(){
      window.removeEventListener('scroll', henXet);
      window.removeEventListener('resize', henXet);
    };
    xet();   // xét ngay lần đầu: thẻ nào đã nằm trong tầm nhìn thì chạy luôn
  }

  // ------------------------------------------------ THÔNG BÁO MỨC GIẢM GIÁ
  //
  // Nhảy ra giữa màn hình, đứng im một giây rồi trôi xuống đáy và biến mất.
  // Luôn báo TỔNG mức giảm hiện tại, kể cả khi vừa bỏ chọn hoặc vừa chọn một
  // sản phẩm không được cộng giảm — để con số trên thông báo và trên thanh báo
  // giá không bao giờ nói hai điều khác nhau.

  // maSanPham: bấm chọn/bỏ chọn MỘT sản phẩm thì thông báo bật ra ngay tại thẻ
  // đó — rộng bằng thẻ, mép trên trùng mép trên thẻ — để mắt khỏi phải chạy đi
  // đâu tìm. Bỏ trống (bấm "Chọn tất cả") thì vẫn hiện giữa màn hình như cũ,
  // vì lúc đó thông báo nói về cả lưới chứ không riêng thẻ nào.
  //
  // Dùng position:fixed rồi đặt toạ độ theo thẻ, KHÔNG đặt thông báo vào bên
  // trong thẻ: thẻ có overflow:hidden nên đặt vào trong sẽ bị cắt ngang thân
  // lúc trôi xuống.
  function hienThongBaoGiam(maSanPham){
    const cu = document.getElementById('thong-bao-giam');
    if (cu) cu.remove();
    const el = document.createElement('div');
    el.id = 'thong-bao-giam';
    el.className = 'thong-bao-giam';
    el.setAttribute('role', 'status');
    el.textContent = 'Giảm thêm ' + tinhTien().phanTramGiam + '%';

    const the = maSanPham
      ? document.querySelector('.the-sanpham[data-ma="' + maSanPham + '"]')
      : null;
    if (the) {
      const o = the.getBoundingClientRect();
      el.classList.add('tai-the');
      el.style.left = o.left + 'px';
      el.style.top = o.top + 'px';
      el.style.width = o.width + 'px';
    }

    document.body.appendChild(el);
    el.addEventListener('animationend', function(){ el.remove(); });
  }

  // ----------------------------------------------------- CHỌN / BỎ CHỌN HÀNG

  // Cập nhật TẠI CHỖ đúng một thẻ thay vì vẽ lại cả trang: giữ nguyên hiệu ứng
  // trôi của những thẻ khác đang chạy dở, và không làm nhấp nháy cả lưới.
  function capNhatTheSanPham(ma){
    const the = document.querySelector('.the-sanpham[data-ma="' + ma + '"]');
    if (!the) return;
    const daChon = dangChon(ma);
    the.classList.toggle('da-chon', daChon);
    const nut = the.querySelector('[data-hanh-dong="chon-san-pham"].nut');
    if (nut) {
      nut.className = 'nut nut-rong ' + (daChon ? 'nut-chinh' : 'nut-chua-chon');
      nut.setAttribute('aria-pressed', daChon ? 'true' : 'false');
      nut.textContent = daChon ? '✓ Đã chọn — bấm để bỏ' : 'Chọn sản phẩm này';
    }
  }

  function capNhatThanhBaoGia(){
    const cu = document.querySelector('.thanh-bao-gia');
    if (!cu) return;
    const tam = document.createElement('div');
    tam.innerHTML = veThanhBaoGia();
    cu.replaceWith(tam.firstChild);
    doChoThanhDay();
  }

  // Thanh báo giá neo đáy che mất phần cuối trang nếu khoảng chừa nhỏ hơn chính
  // nó. Chiều cao thanh KHÔNG cố định — trên điện thoại nút Mua hàng xuống hẳn
  // một dòng riêng, cỡ chữ hệ thống to nhỏ cũng làm nó đổi — nên đo thật rồi
  // ghi vào biến --cao-thanh-day thay vì đoán một con số.
  function doChoThanhDay(){
    const thanh = document.querySelector('.thanh-bao-gia');
    if (!thanh || !document.documentElement) return;
    const cao = Math.ceil(thanh.getBoundingClientRect().height);
    if (cao > 0) document.documentElement.style.setProperty('--cao-thanh-day', cao + 'px');
  }

  function chonSanPham(ma){
    if (!timSanPham(ma)) return;
    doiChon(ma);
    capNhatTheSanPham(ma);
    capNhatThanhBaoGia();
    hienThongBaoGiam(ma);
  }

  // Bấm "Chọn sản phẩm này" trong bảng chi tiết: đóng bảng, sản phẩm được CHỌN
  // (không phải đảo trạng thái — bấm nút mang chữ "chọn" mà lại bị bỏ chọn thì
  // vô lý), rồi hiện thông báo mức giảm y như khi bấm ngoài lưới.
  function chonTuBangChiTiet(ma){
    dongModal();
    if (!timSanPham(ma)) return;
    if (!dangChon(ma)) doiChon(ma);
    capNhatTheSanPham(ma);
    capNhatThanhBaoGia();
    hienThongBaoGiam(ma);
  }

  // Bấm "Vào học ngay" trong bảng chi tiết hai bộ khoá học: đóng hết bảng phụ
  // rồi chuyển thẳng sang module khoá học tương ứng.
  function vaoHocNgay(maModule){
    dongHetModal();
    moModule(maModule);
  }

  // Bấm "Chọn tất cả": đang sáng thì bỏ chọn sạch, chưa sáng thì chọn hết.
  function chonTatCa(){
    if (dangChonHet()) state.daChon = [];
    else state.daChon = SAN_PHAM.map(function(sp){ return sp.ma; });
    SAN_PHAM.forEach(function(sp){ capNhatTheSanPham(sp.ma); });
    capNhatThanhBaoGia();
    hienThongBaoGiam();
  }
