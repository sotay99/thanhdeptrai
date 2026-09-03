
  /* ===========================================================================
     PHẦN 03 — MODULE "GÓI HÀNG VIP LIGHTROOM"
     Danh sách 7 sản phẩm + thanh báo giá luôn neo ở đáy màn hình.
     =========================================================================== */

  function veTheSanPham(sp, chiSo){
    const daChon = dangChon(sp.ma);
    const giaSauGiam = sp.gia - Math.round(sp.gia * PHAN_TRAM_GIAM / 100);
    return '' +
      '<article class="the-sanpham' + (daChon ? ' da-chon' : '') + '">' +
        '<div class="so-thu-tu">SẢN PHẨM ' + (chiSo + 1) + '</div>' +
        '<h3 class="ten-sanpham">' + escapeHtml(sp.ten) + '</h3>' +
        '<div class="hang-gia">' +
          '<span class="gia">' + dinhDangTien(giaSauGiam) + '</span>' +
          '<span class="gia-goc">' + dinhDangTien(sp.gia) + '</span>' +
        '</div>' +
        '<button type="button" class="nut nut-rong ' + (daChon ? 'nut-chinh' : 'nut-vien') +
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
        '<div class="bang-uu-dai"><span aria-hidden="true">🔥</span> Đang giảm ' + PHAN_TRAM_GIAM + '% cho toàn bộ sản phẩm</div>' +
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
    const coHang = t.soLuong > 0;
    return '' +
      '<div class="thanh-bao-gia" role="region" aria-label="Bảng báo giá">' +
        '<div class="so-lieu">' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Đã chọn</span>' +
            '<span class="tri">' + t.soLuong + ' sản phẩm</span>' +
          '</div>' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Tổng trị giá</span>' +
            '<span class="tri gach">' + dinhDangTien(t.tongTien) + '</span>' +
          '</div>' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Giảm giá</span>' +
            '<span class="tri giam">' + t.phanTramGiam + '% (−' + dinhDangTien(t.tienGiam) + ')</span>' +
          '</div>' +
          '<div class="o-so-lieu">' +
            '<span class="nhan">Số tiền cuối cùng</span>' +
            '<span class="tri chot">' + dinhDangTien(t.thanhTien) + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="nut nut-chinh nut-mua-hang" data-hanh-dong="mua-hang"' + (coHang ? '' : ' disabled') + '>' +
          (coHang ? 'Mua hàng' : 'Hãy chọn sản phẩm') +
        '</button>' +
      '</div>';
  }

  // Chọn / bỏ chọn một sản phẩm rồi vẽ lại — thanh báo giá tự cập nhật theo.
  function chonSanPham(ma){
    if (!timSanPham(ma)) return;
    doiChon(ma);
    render();
  }
