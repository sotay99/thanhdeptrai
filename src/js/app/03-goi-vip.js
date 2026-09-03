
  /* ===========================================================================
     PHẦN 03 — MODULE "GÓI HÀNG VIP LIGHTROOM"
     Danh sách 7 sản phẩm + thanh báo giá luôn neo ở đáy màn hình.
     =========================================================================== */

  function veTheSanPham(sp, chiSo){
    const daChon = dangChon(sp.ma);
    const phanTram = phanTramGiamSanPham(sp);
    const choTroi = state.hieuUngVaoModule ? ' cho-troi-len' : '';
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
        // Dòng giá gồm ba phần trên cùng một hàng: giá gốc (cam, hơi mờ) →
        // phần trăm giảm (xanh lá đậm) → giá chốt (xanh của web, to rõ).
        '<div class="hang-gia">' +
          '<span class="gia-goc">' + dinhDangTien(sp.giaGoc) + '</span>' +
          '<span class="phan-tram">giảm giá ' + phanTram + '%</span>' +
          '<span class="chi-con">chỉ còn</span>' +
          '<span class="gia-chot">' + dinhDangTien(sp.giaChot) + '</span>' +
        '</div>' +
        '<button type="button" class="nut nut-rong ' + (daChon ? 'nut-chinh' : 'nut-chua-chon') +
          '" data-hanh-dong="chon-san-pham" data-ma="' + escapeHtml(sp.ma) + '"' +
          ' aria-pressed="' + (daChon ? 'true' : 'false') + '">' +
          (daChon ? '✓ Đã chọn — bấm để bỏ' : 'Chọn sản phẩm này') +
        '</button>' +
      '</article>';
  }

  function veModuleGoiVip(){
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Gói hàng VIP Lightroom</h2>' +
        '<p>Chọn những sản phẩm bạn cần, giá đã chốt hiện ngay ở thanh dưới đáy màn hình.</p>' +
        '<div class="bang-uu-dai"><span aria-hidden="true">🔥</span> Chọn càng nhiều càng rẻ: mỗi sản phẩm được giảm thêm ' +
          GIAM_MOI_SAN_PHAM + '% ở bước chốt đơn — riêng hai Bộ Khoá học (đang tặng miễn phí), ' +
          'Kho tài nguyên thiết kế và Bộ font chữ Việt Hoá thì không cộng vào mức giảm này</div>' +
      '</section>' +
      '<div class="luoi-sanpham">' +
        SAN_PHAM.map(veTheSanPham).join('') +
      '</div>';
  }

  // ------------------------------------------------- THANH BÁO GIÁ NEO ĐÁY
  // Thanh này dùng position:fixed nên luôn dính đáy màn hình dù trang cuộn lên
  // hay xuống. Phần cuối trang đã được chừa sẵn khoảng trống (--cao-thanh-day)
  // để thanh không che mất sản phẩm cuối cùng.

  function veThanhBaoGia(){
    const t = tinhTien();
    // Chốt đơn được khi đã chọn hàng VÀ số tiền cuối cùng lớn hơn 0 — chọn mỗi
    // hai Bộ Khoá học miễn phí thì không có gì để thanh toán.
    const chotDuoc = t.soLuong > 0 && t.thanhTien > 0;
    return '' +
      '<div class="thanh-bao-gia" role="region" aria-label="Bảng báo giá">' +
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

  // ------------------------------------------- HIỆU ỨNG TRÔI LÊN CỦA CÁC THẺ
  //
  // Mỗi thẻ nằm sẵn ở dưới đúng một chiều cao của chính nó, chờ lọt vào tầm
  // nhìn mới trôi lên. Nhờ vậy màn hình lướt tới đâu sản phẩm hiện ra tới đó,
  // thay vì cả 7 thẻ cùng chạy một lượt rồi thẻ dưới trôi xong lúc nào không ai
  // thấy. Dùng IntersectionObserver nên không phải nghe sự kiện cuộn liên tục.

  function ganHieuUngTroiLen(){
    const the = document.querySelectorAll('.the-sanpham.cho-troi-len');
    if (!the.length) return;

    // Trình duyệt quá cũ không có IntersectionObserver: hiện thẳng, không hiệu ứng.
    if (typeof IntersectionObserver !== 'function') {
      the.forEach(function(el){ el.classList.remove('cho-troi-len'); });
      state.hieuUngVaoModule = false;
      return;
    }

    if (window.__theoDoiTroiLen) window.__theoDoiTroiLen.disconnect();
    window.__theoDoiTroiLen = new IntersectionObserver(function(muc, boTheoDoi){
      muc.forEach(function(m){
        if (!m.isIntersecting) return;
        m.target.classList.add('dang-troi-len');
        boTheoDoi.unobserve(m.target);   // trôi xong là thôi, không lặp lại
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    the.forEach(function(el){ window.__theoDoiTroiLen.observe(el); });

    // Cờ đã dùng xong: những lần vẽ lại sau (bấm chọn sản phẩm) không trôi nữa.
    state.hieuUngVaoModule = false;
  }

  // Chọn / bỏ chọn một sản phẩm rồi vẽ lại — thanh báo giá tự cập nhật theo.
  function chonSanPham(ma){
    if (!timSanPham(ma)) return;
    doiChon(ma);
    render();
  }
