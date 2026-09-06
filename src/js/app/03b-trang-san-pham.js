
  /* ===========================================================================
     PHẦN 03B — TRANG NHẬN HÀNG "/sanpham"

     Đây là địa chỉ shop gửi cho khách sau khi tiền về (trong email tự động và
     trong mẩu tin nhắn Zalo). MỖI KHÁCH MỘT ĐƯỜNG DẪN RIÊNG: mã nhận hàng nằm
     ngay trong đường dẫn, nên khách KHÔNG phải gõ mã kích hoạt vào đâu cả —
     bấm link, bấm sản phẩm, tải về.

     BA ĐIỀU KHÔNG ĐƯỢC PHÁ:

     1. Đường dẫn tải sản phẩm TUYỆT ĐỐI không nằm trong mã nguồn. Người tải cả
        kho mã về máy vẫn không đọc ra được file nằm ở đâu. Đường dẫn chỉ do máy
        chủ cấp phát trả về, và chỉ trả khi mã nhận hàng hợp lệ.
     2. Ngay cả địa chỉ của máy chủ cấp phát cũng không nằm trong mã nguồn — nó
        đọc từ nhánh /thongtinkho của Realtime Database lúc chạy, hệt cách giấu
        số tài khoản và số Zalo.
     3. Nút tải xuống chỉ được dựng SAU KHI máy chủ trả lời là được phép. Không
        dựng sẵn rồi ẩn đi bằng CSS — ẩn bằng CSS thì mở F12 là thấy.
     =========================================================================== */

  // Mã nhận hàng dùng đúng bảng ký tự của mã đơn (đã bỏ 0 O 1 I L) nên khách
  // đọc lại trong email không bao giờ phân vân số 0 hay chữ O.
  const DAI_MA_NHAN_HANG_TOI_DA = 24;

  function chuanHoaMaNhanHang(chuoi){
    return String(chuoi == null ? '' : chuoi)
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .slice(0, DAI_MA_NHAN_HANG_TOI_DA);
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

  // Hỏi máy chủ cấp phát: đường dẫn này có được phép tải món này không?
  //
  // Máy chủ trả về { duoc: true, duongDan: '...' } khi hợp lệ, hoặc
  // { duoc: false, lyDo: '...' } khi không. Đường dẫn trả về dùng MỘT LẦN và
  // hết hạn sau ít phút — chép ra dán cho người khác cũng không dùng được.
  //
  // Chính lượt hỏi này là lúc máy chủ GHI NHỚ THIẾT BỊ của khách cho món đó.
  // Vì thế nó chỉ được gọi sau khi khách đã đọc lời cảnh báo và tự bấm nút xác
  // nhận, chứ không gọi tự động lúc mở bảng.
  function xinDuongDanTai(maSanPham, maNhanHang){
    if (!state.mayChuKho) {
      return taiThongTinKho().then(function(duoc){
        if (!duoc) return { duoc: false, lyDo: 'chua-san-sang' };
        return goiMayChuKho(maSanPham, maNhanHang);
      });
    }
    return goiMayChuKho(maSanPham, maNhanHang);
  }

  function goiMayChuKho(maSanPham, maNhanHang){
    return fetch(state.mayChuKho + '/cap-phat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sanPham: maSanPham, ma: maNhanHang })
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
    if (lyDo === 'thieu-ma') {
      return 'Đường dẫn bạn đang mở thiếu mã nhận hàng. Hãy bấm đúng đường dẫn ' +
        'shop đã gửi trong email hoặc trong tin nhắn, đừng gõ tay địa chỉ.';
    }
    if (lyDo === 'chua-san-sang') {
      return 'Hệ thống nhận hàng đang được hoàn thiện. Bạn nhắn cho shop qua Zalo, ' +
        'shop gửi sản phẩm tận tay ngay.';
    }
    if (lyDo === 'mat-mang') {
      return 'Không kết nối được máy chủ. Bạn kiểm tra lại mạng rồi bấm lại giúp shop.';
    }
    if (lyDo === 'sai-ma') {
      return 'Đường dẫn này không dùng được cho sản phẩm bạn vừa chọn. Bạn xem lại ' +
        'xem mình đã mua món nào, hoặc nhắn cho shop.';
    }
    if (lyDo === 'da-dung-thiet-bi-khac') {
      return 'Sản phẩm này đã được tải trên một thiết bị khác. Mỗi sản phẩm chỉ mở ' +
        'khoá được trên MỘT thiết bị. Nếu bạn đổi máy, nhắn cho shop để được cấp ' +
        'quyền lại.';
    }
    return 'Chưa mở khoá được. Bạn nhắn cho shop kèm đường dẫn bạn đang mở, shop xử lý ngay.';
  }

  // ------------------------------------------------------- VẼ TRANG NHẬN HÀNG

  function veTrangNhanHang(){
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Nhận sản phẩm bạn đã mua</h2>' +
        '<p>Bấm đúng sản phẩm bạn đã mua là tải về được ngay — không cần nhập mã nào cả.</p>' +
        '<div class="bang-luu-y-thiet-bi">' +
          '<span aria-hidden="true">⚠️</span> <strong>Mỗi sản phẩm chỉ tải được trên MỘT thiết bị.</strong> ' +
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

  // ------------------------------------------------------- BẢNG NHẬN SẢN PHẨM

  function moModalNhanHang(maSanPham){
    const sp = timSanPham(maSanPham);
    if (!sp) return;

    // Hai khoá học không phải file để tải mà là module học ngay trên web, nên
    // chúng đi một đường riêng hẳn.
    const maKhoaHoc = MODULE_KHOA_HOC[sp.ma];
    if (maKhoaHoc) { moModalKhoaHoc(sp, maKhoaHoc); return; }

    state.nhanHang.maSanPham = sp.ma;
    state.nhanHang.ketQua = null;
    state.nhanHang.dangHoi = false;

    moModal({
      ma: 'nhan-hang',
      tieuDe: 'Nhận sản phẩm',
      than: veThanNhanHang(sp),
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-chinh nut-xac-nhan-tai" data-hanh-dong="xac-nhan-tai">' +
          'Tôi chắc chắn — tải xuống</button>',
      khiDong: function(){
        state.nhanHang.ketQua = null;
        state.nhanHang.dangHoi = false;
      }
    });
  }

  function veThanNhanHang(sp){
    return '' +
      '<div class="khung-nhan-hang">' +
        '<p class="ten-mon">Bạn đang nhận: <strong>' + escapeHtml(sp.ten) + '</strong></p>' +
        '<div class="canh-bao-thiet-bi">' +
          '<span aria-hidden="true">⚠️</span> ' +
          '<span>Sản phẩm này <strong>chỉ tải được trên MỘT thiết bị</strong>. Bấm tải ở máy nào ' +
          'là hệ thống ghi nhớ máy đó. Hãy chắc chắn đây là chiếc máy bạn sẽ dùng sản phẩm ' +
          'rồi mới bấm nút bên dưới.</span>' +
        '</div>' +
        '<div class="ket-qua-nhan-hang" data-vung="ket-qua-nhan-hang">' + veKetQuaNhanHang() + '</div>' +
      '</div>';
  }

  // Vùng kết quả: rỗng khi khách chưa bấm xác nhận, "đang hỏi" khi đang chờ máy
  // chủ, câu báo lý do khi không được, và CHỈ KHI ĐƯỢC mới dựng ra nút tải.
  function veKetQuaNhanHang(){
    if (state.nhanHang.dangHoi) {
      return '<p class="dang-hoi">Đang chuẩn bị sản phẩm cho bạn…</p>';
    }
    const kq = state.nhanHang.ketQua;
    if (!kq) return '';
    if (!kq.duoc) {
      return '<p class="loi-nhan-hang">' + escapeHtml(chuLyDo(kq.lyDo)) + '</p>';
    }
    // Đường dẫn tải chỉ tồn tại từ giây phút này, trong bộ nhớ của trình duyệt
    // khách. Nó KHÔNG có trong mã nguồn và cũng không được ghi vào bất cứ đâu.
    return '' +
      '<p class="duoc-nhan-hang">✅ Sản phẩm đã sẵn sàng. Bấm nút bên dưới để tải về.</p>' +
      '<a class="nut nut-la nut-tai-ve" href="' + escapeHtml(kq.duongDan) + '" ' +
        'rel="noopener noreferrer" download>⬇ Tải sản phẩm về máy</a>' +
      '<p class="nhac-tai">Đường dẫn này chỉ dùng được trong ít phút và chỉ trên máy này. ' +
        'Tải xong nhớ lưu lại file cho chắc.</p>';
  }

  // Vẽ lại RIÊNG vùng kết quả, không dựng lại cả bảng.
  function capNhatKetQuaNhanHang(){
    const vung = document.querySelector('[data-vung="ket-qua-nhan-hang"]');
    if (vung) vung.innerHTML = veKetQuaNhanHang();
    const nut = document.querySelector('.nut-xac-nhan-tai');
    if (nut) {
      const xong = !!(state.nhanHang.ketQua && state.nhanHang.ketQua.duoc);
      nut.disabled = state.nhanHang.dangHoi || xong;
    }
  }

  function xacNhanTai(){
    const nh = state.nhanHang;
    if (nh.dangHoi || !nh.maSanPham) return;
    if (nh.ketQua && nh.ketQua.duoc) return;   // đã lấy được rồi thì thôi
    // Không có mã trong đường dẫn thì khỏi làm phiền máy chủ — báo ngay cho
    // khách biết họ đang mở một địa chỉ không phải địa chỉ shop gửi riêng.
    if (!nh.maNhanHang) {
      nh.ketQua = { duoc: false, lyDo: 'thieu-ma' };
      capNhatKetQuaNhanHang();
      return;
    }
    nh.dangHoi = true;
    nh.ketQua = null;
    capNhatKetQuaNhanHang();
    xinDuongDanTai(nh.maSanPham, nh.maNhanHang).then(function(kq){
      nh.dangHoi = false;
      nh.ketQua = kq || { duoc: false, lyDo: '' };
      capNhatKetQuaNhanHang();
    });
  }

  // ------------------------------------------------------ BẢNG HAI KHOÁ HỌC
  //
  // Sản phẩm 4 và 5 không có file để tải: chúng là module học ngay trên web.
  // Bấm nút là RỜI trang nhận hàng, nên phải nói trước cho khách biết chuyện gì
  // sắp xảy ra và cách quay lại — không thì họ tưởng mất trang.

  function moModalKhoaHoc(sp, maModule){
    const m = timModule(maModule);
    const tenKhoa = m ? m.ten : sp.ten;
    moModal({
      ma: 'nhan-khoa-hoc',
      tieuDe: 'Vào học ngay',
      than: '' +
        '<div class="khung-nhan-hang">' +
          '<p class="ten-mon">Bạn đang mở: <strong>' + escapeHtml(sp.ten) + '</strong></p>' +
          '<div class="ghi-chu-chuyen-huong">' +
            '<p>Đây là khoá học xem ngay trên web, <strong>không có file để tải về</strong>.</p>' +
            '<p>Nếu bạn bấm nút <strong>“Vào module ' + escapeHtml(tenKhoa) + '”</strong> bên dưới, ' +
              'bạn sẽ được chuyển tới <strong>thanhdeptrai.vn</strong> và vào thẳng module ' +
              '<strong>' + escapeHtml(tenKhoa) + '</strong> để học ngay.</p>' +
            '<p class="cach-quay-lai">Muốn quay lại trang nhận sản phẩm này thì bấm <strong>nút quay lại</strong> ' +
              'trên thiết bị hoặc trên trình duyệt của bạn.</p>' +
          '</div>' +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-la nut-vao-khoa-hoc" data-hanh-dong="vao-hoc-ngay" data-module="' +
          escapeHtml(maModule) + '">Vào module ' + escapeHtml(tenKhoa) + '</button>'
    });
  }
