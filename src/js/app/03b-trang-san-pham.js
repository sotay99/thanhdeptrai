
  /* ===========================================================================
     PHẦN 03B — TRANG NHẬN HÀNG "/sanpham"

     Đây là địa chỉ shop gửi cho khách sau khi tiền về (trong email tự động và
     trong mẩu tin nhắn Zalo). Khách vào đây, chọn đúng món mình đã mua, nhập mã
     kích hoạt, rồi mới hiện ra nút tải xuống.

     BA ĐIỀU KHÔNG ĐƯỢC PHÁ:

     1. Đường dẫn tải sản phẩm TUYỆT ĐỐI không nằm trong mã nguồn. Người tải cả
        kho mã về máy vẫn không đọc ra được file nằm ở đâu. Đường dẫn chỉ do máy
        chủ cấp phát trả về, và chỉ trả khi mã kích hoạt đúng.
     2. Ngay cả địa chỉ của máy chủ cấp phát cũng không nằm trong mã nguồn — nó
        đọc từ nhánh /thongtinkho của Realtime Database lúc chạy, hệt cách giấu
        số tài khoản và số Zalo.
     3. Nút tải xuống chỉ được dựng SAU KHI máy chủ trả lời mã đúng. Không dựng
        sẵn rồi ẩn đi bằng CSS — ẩn bằng CSS thì mở F12 là thấy.
     =========================================================================== */

  // Mã kích hoạt dùng đúng bảng ký tự của mã đơn (đã bỏ 0 O 1 I L) nên khách
  // không bao giờ phải phân vân số 0 hay chữ O. Gõ thường cũng được, ở đây tự
  // viết hoa lên.
  const DAI_MA_KICH_HOAT_TOI_DA = 24;

  function chuanHoaMaKichHoat(chuoi){
    return String(chuoi == null ? '' : chuoi)
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, DAI_MA_KICH_HOAT_TOI_DA);
  }

  // ------------------------------------------------- ĐỊA CHỈ MÁY CHỦ CẤP PHÁT
  //
  // Giống hệt cách giấu số tài khoản: web đọc lúc chạy từ Realtime Database.
  // Chưa dán dữ liệu vào Firebase thì trang vẫn mở bình thường, chỉ báo là hệ
  // thống nhận hàng chưa sẵn sàng.

  function taiThongTinKho(){
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    return rtdb.ref('thongtinkho').once('value').then(function(anh){
      const du = anh && anh.val();
      if (!du || !du.mayChu) return false;
      state.mayChuKho = String(du.mayChu || '').replace(/\/+$/, '');
      return !!state.mayChuKho;
    }).catch(function(e){
      console.error('Không đọc được địa chỉ kho sản phẩm từ Firebase:', e);
      return false;
    });
  }

  // Hỏi máy chủ cấp phát: mã này có được phép tải món này không?
  //
  // Máy chủ trả về { duoc: true, duongDan: '...', hetHan: <mốc thời gian> } khi
  // hợp lệ, hoặc { duoc: false, lyDo: '...' } khi không. Đường dẫn trả về là
  // đường dẫn dùng MỘT LẦN, hết hạn sau ít phút — chép ra dán cho người khác
  // cũng không dùng được.
  function xinDuongDanTai(maSanPham, maKichHoat){
    if (!state.mayChuKho) {
      return taiThongTinKho().then(function(duoc){
        if (!duoc) {
          return { duoc: false, lyDo: 'chua-san-sang' };
        }
        return goiMayChuKho(maSanPham, maKichHoat);
      });
    }
    return goiMayChuKho(maSanPham, maKichHoat);
  }

  function goiMayChuKho(maSanPham, maKichHoat){
    const dia = state.mayChuKho + '/cap-phat';
    return fetch(dia, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sanPham: maSanPham, ma: maKichHoat })
    }).then(function(tra){
      if (!tra.ok) return { duoc: false, lyDo: 'may-chu-tu-choi' };
      return tra.json();
    }).catch(function(e){
      console.error('Không hỏi được máy chủ cấp phát:', e);
      return { duoc: false, lyDo: 'mat-mang' };
    });
  }

  // Đổi lý do máy trả về thành câu tiếng Việt cho khách đọc.
  function chuLyDo(lyDo){
    if (lyDo === 'chua-san-sang') {
      return 'Hệ thống nhận hàng đang được hoàn thiện. Bạn nhắn cho shop qua Zalo, ' +
        'shop gửi sản phẩm tận tay ngay.';
    }
    if (lyDo === 'mat-mang') {
      return 'Không kết nối được máy chủ. Bạn kiểm tra lại mạng rồi bấm lại giúp shop.';
    }
    if (lyDo === 'sai-ma') {
      return 'Mã kích hoạt không đúng cho sản phẩm này. Bạn xem lại mã trong email ' +
        'hoặc trong tin nhắn shop đã gửi.';
    }
    if (lyDo === 'da-dung-thiet-bi-khac') {
      return 'Mã này đã được dùng trên một thiết bị khác. Mỗi mã chỉ mở khoá được ' +
        'trên MỘT thiết bị. Nếu bạn đổi máy, nhắn cho shop để được cấp quyền lại.';
    }
    return 'Chưa mở khoá được. Bạn nhắn cho shop kèm mã kích hoạt, shop xử lý ngay.';
  }

  // ------------------------------------------------------- VẼ TRANG NHẬN HÀNG

  function veTrangNhanHang(){
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Nhận sản phẩm bạn đã mua</h2>' +
        '<p>Bấm đúng sản phẩm bạn đã mua, nhập mã kích hoạt shop gửi cho bạn, rồi tải về.</p>' +
        '<div class="bang-luu-y-thiet-bi">' +
          '<span aria-hidden="true">⚠️</span> <strong>Mỗi mã chỉ mở khoá được trên MỘT thiết bị.</strong> ' +
          'Hãy chắc chắn bạn đang ở đúng chiếc máy sẽ dùng sản phẩm rồi mới bấm tải. ' +
          'Lỡ mở nhầm máy thì nhắn cho shop, shop cấp quyền lại cho bạn.' +
        '</div>' +
      '</section>' +
      '<div class="luoi-sanpham">' +
        SAN_PHAM.map(function(sp, i){ return veTheSanPham(sp, i, 'nhan-hang'); }).join('') +
      '</div>' +
      '<button type="button" class="nut nut-rong nut-ve-mua-hang" data-hanh-dong="ve-trang-mua-hang">' +
        '<span aria-hidden="true">🛒</span> Về trang mua hàng của shop</button>';
  }

  // --------------------------------------------------- BẢNG NHẬP MÃ KÍCH HOẠT

  function moModalKichHoat(maSanPham){
    const sp = timSanPham(maSanPham);
    if (!sp) return;
    state.nhanHang.maSanPham = sp.ma;
    state.nhanHang.ketQua = null;
    state.nhanHang.dangHoi = false;
    // Mã đi kèm trong đường dẫn thì điền sẵn — khách bấm link trong email là
    // ô nhập đã có mã, chỉ việc bấm nút.
    if (!state.nhanHang.maKichHoat) state.nhanHang.maKichHoat = docMaKichHoatTrenDuongDan();

    moModal({
      ma: 'kich-hoat',
      tieuDe: 'Nhận sản phẩm',
      than: veThanKichHoat(sp),
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-chinh nut-mo-khoa" data-hanh-dong="mo-khoa-tai">Mở khoá tải xuống</button>',
      khiDong: function(){
        state.nhanHang.ketQua = null;
        state.nhanHang.dangHoi = false;
      }
    });
  }

  function veThanKichHoat(sp){
    const ma = state.nhanHang.maKichHoat;
    return '' +
      '<div class="khung-kich-hoat">' +
        '<p class="ten-mon">Bạn đang nhận: <strong>' + escapeHtml(sp.ten) + '</strong></p>' +
        '<div class="canh-bao-thiet-bi">' +
          '<span aria-hidden="true">⚠️</span> ' +
          '<span>Mã này <strong>chỉ dùng được trên MỘT thiết bị</strong>. Bấm mở khoá ở máy nào ' +
          'là mã gắn với máy đó. Hãy chắc chắn đây là chiếc máy bạn sẽ dùng sản phẩm.</span>' +
        '</div>' +
        '<label class="o-nhap-kich-hoat">' +
          '<span class="nhan">Mã kích hoạt</span>' +
          '<input type="text" class="o-ma-kich-hoat" data-truong-kich-hoat="ma" ' +
            'inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" ' +
            'placeholder="Chép mã trong email hoặc tin nhắn của shop" ' +
            'value="' + escapeHtml(ma) + '">' +
        '</label>' +
        '<div class="ket-qua-kich-hoat" data-vung="ket-qua-kich-hoat">' + veKetQuaKichHoat() + '</div>' +
      '</div>';
  }

  // Vùng kết quả: rỗng khi chưa bấm, "đang hỏi" khi đang chờ máy chủ, câu báo
  // lỗi khi không được, và CHỈ KHI ĐƯỢC mới dựng ra nút tải xuống.
  function veKetQuaKichHoat(){
    if (state.nhanHang.dangHoi) {
      return '<p class="dang-hoi">Đang kiểm tra mã…</p>';
    }
    const kq = state.nhanHang.ketQua;
    if (!kq) return '';
    if (!kq.duoc) {
      return '<p class="loi-kich-hoat">' + escapeHtml(chuLyDo(kq.lyDo)) + '</p>';
    }
    // Đường dẫn tải chỉ tồn tại từ giây phút này, trong bộ nhớ của trình duyệt
    // khách. Nó KHÔNG có trong mã nguồn và cũng không được ghi vào bất cứ đâu.
    return '' +
      '<p class="duoc-kich-hoat">✅ Mã đúng. Sản phẩm đã sẵn sàng cho bạn tải về.</p>' +
      '<a class="nut nut-la nut-tai-ve" href="' + escapeHtml(kq.duongDan) + '" ' +
        'rel="noopener noreferrer" download>⬇ Tải sản phẩm về máy</a>' +
      '<p class="nhac-tai">Đường dẫn này chỉ dùng được trong ít phút và chỉ trên máy này. ' +
        'Tải xong nhớ lưu lại file cho chắc.</p>';
  }

  // Vẽ lại RIÊNG vùng kết quả, không đụng tới ô nhập — vẽ lại cả bảng thì con
  // trỏ nhập nhảy về đầu và mã khách đang gõ dở bị mất.
  function capNhatKetQuaKichHoat(){
    const vung = document.querySelector('[data-vung="ket-qua-kich-hoat"]');
    if (vung) vung.innerHTML = veKetQuaKichHoat();
    const nut = document.querySelector('.nut-mo-khoa');
    if (nut) nut.disabled = state.nhanHang.dangHoi || !state.nhanHang.maKichHoat;
  }

  function goMaKichHoat(giaTri){
    state.nhanHang.maKichHoat = chuanHoaMaKichHoat(giaTri);
    const o = document.querySelector('[data-truong-kich-hoat="ma"]');
    if (o && o.value !== state.nhanHang.maKichHoat) o.value = state.nhanHang.maKichHoat;
    // Gõ lại mã thì xoá câu báo lỗi của lần trước đi, khỏi gây hiểu nhầm.
    if (state.nhanHang.ketQua && !state.nhanHang.ketQua.duoc) state.nhanHang.ketQua = null;
    capNhatKetQuaKichHoat();
  }

  function moKhoaTai(){
    const nh = state.nhanHang;
    if (nh.dangHoi || !nh.maSanPham || !nh.maKichHoat) return;
    nh.dangHoi = true;
    nh.ketQua = null;
    capNhatKetQuaKichHoat();
    xinDuongDanTai(nh.maSanPham, nh.maKichHoat).then(function(kq){
      nh.dangHoi = false;
      nh.ketQua = kq || { duoc: false, lyDo: '' };
      capNhatKetQuaKichHoat();
    });
  }
