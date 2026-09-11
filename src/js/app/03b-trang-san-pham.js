
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

  // Danh mục do chủ shop khai ở trang /admin: mỗi sản phẩm lấy hàng từ đâu,
  // gồm những tệp nào, khách nhìn thấy tên gì. Đọc công khai được — nó không
  // chứa đường tải, chỉ chứa TÊN tệp.
  function taiDanhMuc(){
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    return rtdb.ref('danhmuc').once('value').then(function(anh){
      state.danhMuc = (anh && anh.val()) || {};
      return true;
    }).catch(function(e){
      console.error('Không đọc được danh mục sản phẩm:', e);
      return false;
    });
  }

  function danhMucCua(maSP){
    return (state.danhMuc || {})[maSP] || null;
  }

  // Tệp tên bắt đầu bằng "00-" là gói trọn bộ: nó lên đầu danh sách và mang
  // kiểu dáng riêng, để khách muốn lấy hết chỉ bấm một nút.
  function laTronBo(tep){
    return /(^|\/)00-/.test(String(tep || ''));
  }

  // ------------------------------------------------------------- MÃ THIẾT BỊ
  //
  // Máy chủ khoá mỗi sản phẩm vào MỘT thiết bị, nên phải có cách nhận ra "cùng
  // một máy". Không có cách nào chắc chắn tuyệt đối trên web, nên dùng cách
  // thật thà nhất: trang tự sinh một mã ngẫu nhiên và cất trong bộ nhớ của
  // trình duyệt. Cùng trình duyệt thì cùng mã.
  //
  // NÓI THẲNG GIỚI HẠN: khách xoá dữ liệu duyệt web, đổi trình duyệt, hay mở
  // cửa sổ ẩn danh thì mã đổi, và họ bị coi là máy khác. Đó chính là lý do phải
  // có luồng cấp quyền lại cho chủ shop — không phải chuyện hiếm gặp.
  const KHOA_THIET_BI = 'tdt-thiet-bi';

  function maThietBi(){
    let ma = '';
    try {
      ma = window.localStorage.getItem(KHOA_THIET_BI) || '';
    } catch (e) {
      // Trình duyệt chặn lưu trữ (ẩn danh, khoá cookie): vẫn cấp một mã dùng
      // trong phiên này để khách tải được, chỉ là lần sau vào lại sẽ là máy mới.
      ma = '';
    }
    if (!ma) {
      const so = new Uint8Array(16);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(so);
      else for (let i = 0; i < so.length; i++) so[i] = Math.floor(Math.random() * 256);
      ma = Array.prototype.map.call(so, function(b){
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
      try { window.localStorage.setItem(KHOA_THIET_BI, ma); } catch (e) { /* không lưu được thì thôi */ }
    }
    return ma;
  }

  // ---------------------------------------------------- ĐƠN CỦA KHÁCH LÀ GÌ
  //
  // Trang cần biết khách đã mua món nào để làm mờ những món chưa mua. Khách
  // KHÔNG được phép đọc nhánh donhang (đọc được là thấy email, số điện thoại
  // của mọi khách khác), nên máy chủ cấp phát trả lời hộ, và chỉ trả đúng danh
  // sách mã sản phẩm.
  //
  // ĐÂY CHỈ LÀ LỚP GIAO DIỆN. Người mở console sửa danh sách này vẫn không tải
  // được gì — cửa thật nằm ở máy chủ. Vì thế khi CHƯA biết (chưa hỏi xong, mất
  // mạng, đường dẫn không có mã) thì cứ để nút bình thường: thà để khách bấm
  // rồi nhận lời giải thích rõ ràng, còn hơn làm mờ hết rồi họ tưởng mình mua
  // hụt.
  function taiDonCuaToi(){
    const ma = state.nhanHang.maNhanHang;
    if (!ma) {
      state.trangThaiDon = 'thieu-ma';
      return Promise.resolve(false);
    }
    if (!state.mayChuKho) {
      return taiThongTinKho().then(function(duoc){
        return duoc ? hoiDon(ma) : false;
      });
    }
    return hoiDon(ma);
  }

  function hoiDon(ma){
    return fetch(state.mayChuKho + '/don', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ma: ma })
    }).then(function(tra){
      if (!tra.ok) return null;
      return tra.json();
    }).then(function(kq){
      if (kq && kq.duoc && kq.maSanPham) {
        state.donCuaToi = kq.maSanPham;
        state.trangThaiDon = 'co-don';
        return true;
      }
      // Máy chủ nói thẳng là mã này không ứng với đơn nào. Khác hẳn với "không
      // hỏi được" — ở đây mình BIẾT CHẮC đường dẫn sai, nên phải nói ra.
      if (kq && kq.lyDo === 'sai-ma') state.trangThaiDon = 'sai-ma';
      else state.trangThaiDon = 'khong-hoi-duoc';
      return false;
    }).catch(function(e){
      console.error('Không hỏi được đơn của khách:', e);
      state.trangThaiDon = 'khong-hoi-duoc';
      return false;
    });
  }

  // Món này khách có quyền dùng không?
  //
  //   - Chưa biết đơn  → cho hết, để khách bấm rồi máy chủ trả lời.
  //   - Hai khoá học   → luôn cho, chúng miễn phí và không đi qua máy chủ.
  //   - Còn lại        → phải có trong đơn.
  function duocDung(maSP){
    if (MODULE_KHOA_HOC[maSP]) return true;
    // Đường dẫn sai hẳn: khoá mọi món, vì chắc chắn không món nào là của họ.
    if (state.trangThaiDon === 'sai-ma' || state.trangThaiDon === 'thieu-ma') return false;
    if (!state.donCuaToi) return true;
    return state.donCuaToi.indexOf(maSP) !== -1;
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
  function xinDuongDanTai(maSanPham, maNhanHang, tep){
    if (!state.mayChuKho) {
      return taiThongTinKho().then(function(duoc){
        if (!duoc) return { duoc: false, lyDo: 'chua-san-sang' };
        return goiMayChuKho(maSanPham, maNhanHang, tep);
      });
    }
    return goiMayChuKho(maSanPham, maNhanHang, tep);
  }

  function goiMayChuKho(maSanPham, maNhanHang, tep){
    return fetch(state.mayChuKho + '/cap-phat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sanPham: maSanPham,
        ma: maNhanHang,
        tep: tep,
        thietBi: maThietBi()
      })
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
    if (lyDo === 'chua-khai') {
      return 'Sản phẩm này chưa được shop khai vào danh mục. Bạn nhắn cho shop, ' +
        'shop bổ sung ngay.';
    }
    if (lyDo === 'chua-san-sang') {
      return 'Hệ thống nhận hàng đang được hoàn thiện. Bạn nhắn cho shop qua Zalo, ' +
        'shop gửi sản phẩm tận tay ngay.';
    }
    if (lyDo === 'mat-mang') {
      return 'Không kết nối được máy chủ. Bạn kiểm tra lại mạng rồi bấm lại giúp shop.';
    }
    if (lyDo === 'don-hong') {
      return 'Đơn hàng của bạn đang có chỗ ghi chưa đúng nên hệ thống không đọc được. ' +
        'Bạn nhắn cho shop kèm đường dẫn bạn đang mở, shop sửa ngay.';
    }
    if (lyDo === 'khong-co-trong-don') {
      return 'Sản phẩm này không có trong đơn hàng của bạn. Nếu bạn tin là có nhầm lẫn, ' +
        'nhắn cho shop kèm đường dẫn bạn đang mở.';
    }
    if (lyDo === 'thieu-thiet-bi') {
      return 'Trình duyệt của bạn đang chặn lưu trữ nên hệ thống không nhận ra được máy. ' +
        'Bạn thử tắt chế độ ẩn danh, hoặc mở bằng trình duyệt khác.';
    }
    if (lyDo === 'yeu-cau-hong') {
      return 'Yêu cầu không hợp lệ. Bạn tải lại trang rồi bấm lại giúp shop.';
    }
    if (lyDo === 'sai-ma') {
      return 'Đường dẫn này không dùng được cho sản phẩm bạn vừa chọn. Bạn xem lại ' +
        'xem mình đã mua món nào, hoặc nhắn cho shop.';
    }
    if (lyDo === 'da-dung-thiet-bi-khac') {
      // Nói rõ "khác trình duyệt" vì đó mới là ca hay gặp nhất: khách mở link
      // trong Zalo lần đầu, sau đó mở lại bằng Chrome. Cùng một cái máy, nhưng
      // mã thiết bị nằm ở localStorage nên hai trình duyệt là hai máy khác nhau.
      // Không nói ra thì khách tưởng hệ thống hỏng và mất lòng tin.
      return 'Sản phẩm này đã được tải trên một thiết bị khác (hoặc cùng một thiết bị ' +
        'nhưng KHÁC Trình duyệt web). Mỗi sản phẩm chỉ mở khoá được trên MỘT thiết bị ' +
        '(và một trình duyệt). Nếu bạn đổi máy, nhắn cho shop để được cấp quyền lại.';
    }
    return 'Chưa mở khoá được. Bạn nhắn cho shop kèm đường dẫn bạn đang mở, shop xử lý ngay.';
  }

  // Vào trang nhận hàng: đọc danh mục và hỏi đơn của khách, xong cái nào vẽ lại
  // cái đó. Hai việc chạy song song vì chúng không phụ thuộc nhau.
  function moTrangNhanHang(){
    taiThongTinKho();
    taiDanhMuc().then(function(){ if (state.trang === 'sanpham') render(); });
    taiDonCuaToi().then(function(){ if (state.trang === 'sanpham') render(); });
  }

  // ------------------------------------------------------- VẼ TRANG NHẬN HÀNG

  function veTrangNhanHang(){
    return '' +
      '<section class="gioi-thieu">' +
        '<h2>Nhận sản phẩm bạn đã mua</h2>' +
        '<p>Bấm đúng sản phẩm bạn đã mua là tải về được ngay — không cần nhập mã nào cả.</p>' +
        // Dải xanh này đứng NGOÀI trang chứ không nằm trong bảng từng sản phẩm,
        // và đứng TRÊN cảnh báo thiết bị: khách phải đọc nó TRƯỚC khi bấm bất cứ
        // món nào. Mở đường dẫn ngay trong Zalo hay ứng dụng thư thì trình duyệt
        // nhúng của các app đó hay chặn hoặc làm hỏng cú tải — mà mỗi sản phẩm
        // chỉ mở khoá được một trình duyệt, hỏng lần đầu là phải xin cấp quyền
        // lại. Nằm trong bảng thì khách đọc được nó khi đã muộn.
        '<div class="canh-bao-trinh-duyet">' +
          '<span aria-hidden="true">🌐</span> ' +
          '<span class="chu">Hãy Truy cập trang này bằng <strong>Trình duyệt web</strong> ' +
          '(Chrome, hoặc Safari, Cốc Cốc, Firefox,… hoặc trình duyệt web mặc định của thiết bị) ' +
          'để có trải nghiệm tải sản phẩm về một cách tốt nhất ' +
          '(không nên truy cập trang này ngay bên trong app zalo hoặc email, hoặc bên trong app nào đó)</span>' +
        '</div>' +
        '<div class="bang-luu-y-thiet-bi">' +
          '<span aria-hidden="true">⚠️</span> <strong>Mỗi sản phẩm chỉ tải được trên MỘT thiết bị ' +
          '(trên MỘT trình duyệt web).</strong> ' +
          'Hãy chắc chắn bạn đang ở đúng chiếc máy sẽ dùng sản phẩm rồi mới bấm tải. ' +
          'Lỡ mở nhầm máy thì nhắn cho shop, shop cấp quyền lại cho máy của bạn.' +
        '</div>' +
      '</section>' +
      veBaoDuongDanSai() +
      '<div class="luoi-sanpham">' +
        SAN_PHAM.map(function(sp, i){ return veTheSanPham(sp, i, 'nhan-hang'); }).join('') +
      '</div>' +
      '<button type="button" class="nut nut-rong nut-ve-mua-hang" data-hanh-dong="ve-trang-mua-hang">' +
        '<span aria-hidden="true">🛒</span> Về trang mua hàng của shop</button>';
  }

  // Đường dẫn sai thì phải nói ngay ở đầu trang, đừng để khách bấm hết món này
  // tới món kia rồi mới hiểu ra. Hai khoá học vẫn mở nên trang không vô dụng.
  function veBaoDuongDanSai(){
    const tt = state.trangThaiDon;
    if (tt !== 'sai-ma' && tt !== 'thieu-ma') return '';
    const vi = tt === 'thieu-ma'
      ? 'Địa chỉ bạn đang mở <strong>thiếu mã nhận hàng</strong>.'
      : 'Mã nhận hàng trong địa chỉ bạn đang mở <strong>không đúng</strong>.';
    return '' +
      '<div class="bao-duong-dan-sai">' +
        '<span class="dau" aria-hidden="true">⚠️</span>' +
        '<div class="chu">' +
          '<p>' + vi + ' Vui lòng bấm <strong>đúng đường dẫn shop đã gửi</strong> ' +
            'trong email hoặc trong tin nhắn — đừng gõ tay địa chỉ.</p>' +
          '<p class="phu">Hai khoá học miễn phí bên dưới vẫn xem được bình thường. ' +
            'Nếu bạn tin là có nhầm lẫn, nhắn cho shop.</p>' +
        '</div>' +
      '</div>';
  }

  // ------------------------------------------------------- BẢNG NHẬN SẢN PHẨM

  function moModalNhanHang(maSanPham){
    const sp = timSanPham(maSanPham);
    if (!sp) return;
    // Chặn lần hai, ngay tại cửa mở bảng. Lớp thứ nhất là không gắn hành động
    // vào thẻ; lớp này để phòng ngày nào đó ai đó gắn lại mà quên mất vì sao.
    // Với sp8/sp9 thì bảng mở ra là lộ nguyên đường dẫn Google Drive.
    if (!duocDung(sp.ma)) return;

    // Hai khoá học không phải file để tải mà là module học ngay trên web, nên
    // chúng đi một đường riêng hẳn.
    const maKhoaHoc = MODULE_KHOA_HOC[sp.ma];
    if (maKhoaHoc) { moModalKhoaHoc(sp, maKhoaHoc); return; }

    const dm = danhMucCua(sp.ma);
    if (dm && dm.nguon === 'drive') { moModalDrive(sp, dm); return; }

    state.nhanHang.maSanPham = sp.ma;
    state.nhanHang.ketQuaTep = {};
    state.nhanHang.dangHoiTep = '';
    state.nhanHang.tep = xepTep(dm);

    moModal({
      ma: 'nhan-hang',
      tieuDe: 'Nhận sản phẩm',
      than: veThanNhanHang(sp),
      day: '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>',
      khiDong: function(){
        state.nhanHang.ketQuaTep = {};
        state.nhanHang.dangHoiTep = '';
        state.nhanHang.tep = [];
      }
    });
  }

  // Gói trọn bộ luôn đứng đầu, dù chủ shop khai nó ở dòng nào.
  function xepTep(dm){
    const tep = (dm && dm.nguon === 'r2' && dm.file) ? dm.file.slice() : [];
    tep.sort(function(a, b){
      return (laTronBo(b.tep) ? 1 : 0) - (laTronBo(a.tep) ? 1 : 0);
    });
    return tep;
  }

  function veThanNhanHang(sp){
    const tep = state.nhanHang.tep || [];
    return '' +
      '<div class="khung-nhan-hang">' +
        '<p class="ten-mon">Bạn đang nhận: <strong>' + escapeHtml(sp.ten) + '</strong></p>' +
        '<div class="canh-bao-thiet-bi">' +
          '<span aria-hidden="true">⚠️</span> ' +
          '<span>Mỗi nút <strong>“Tải xuống”</strong> là một sản phẩm riêng lẻ, và mỗi sản phẩm ' +
          'riêng lẻ <strong>chỉ tải được trên MỘT thiết bị (một trình duyệt)</strong>. Bấm tải ở ' +
          'máy nào là hệ thống ghi nhớ máy đó gắn với sản phẩm riêng lẻ đó. Hãy chắc chắn đây là ' +
          'chiếc máy bạn sẽ dùng sản phẩm rồi mới bấm nút “Tải xuống” ở bên dưới.</span>' +
        '</div>' +
        veNutHuongDan(sp.ma) +
        (tep.length
          ? '<div class="danh-sach-tep">' + tep.map(veDongTep).join('') + '</div>'
          : '<p class="loi-nhan-hang">' + escapeHtml(chuLyDo('chua-khai')) + '</p>') +
      '</div>';
  }

  // ------------------------------------------------ HƯỚNG DẪN SỬ DỤNG

  // Chỉ năm sản phẩm có tệp thật (không phải hai khoá học, không phải hai món
  // để trên Drive) mới có bảng hướng dẫn — khách cần biết CÀI thế nào, không
  // chỉ tải về.
  const SP_CO_HUONG_DAN = { sp1: true, sp2: true, sp3: true, sp6: true, sp7: true };

  // Nút đứng NGAY TRÊN danh sách tệp: khách đọc hướng dẫn trước khi tải, không
  // phải tải xong rồi loay hoay không biết cài ra sao.
  function veNutHuongDan(maSP){
    if (!SP_CO_HUONG_DAN[maSP]) return '';
    return '<button type="button" class="nut nut-vien nut-huong-dan" data-hanh-dong="xem-huong-dan"' +
      ' data-ma="' + escapeHtml(maSP) + '">📖 Xem hướng dẫn sử dụng</button>';
  }

  // -------------------------------------------- KHUNG VIDEO GOOGLE DRIVE
  //
  // Không tự dựng trình phát: iframe /preview của chính Google Drive ĐÃ có đủ
  // play/tạm dừng, kéo thanh tiến trình, âm lượng, bánh răng chọn tốc độ và
  // chất lượng, và nút toàn màn hình riêng của nó — đúng những gì khách thấy
  // khi mở video ngay trong app Drive. Việc của web chỉ là bọc nó đúng khung
  // hình (dọc 9:16 hay ngang 16:9) và thêm một nút phóng to bọc ngoài cho dễ
  // bấm trên điện thoại.
  function idDriveTuLink(link){
    const s = String(link || '');
    let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];
    return '';
  }

  function veKhungVideo(link, kieu){
    const id = idDriveTuLink(link);
    if (!id) {
      return '<p class="loi-nhan-hang">Video hướng dẫn đang được cập nhật, xin quay lại bảng này sau nhé.</p>';
    }
    const src = 'https://drive.google.com/file/d/' + id + '/preview';
    return '' +
      '<div class="khung-video ' + (kieu === 'doc' ? 'video-doc' : 'video-ngang') +
        '" data-khung-video="' + escapeHtml(id) + '">' +
        '<iframe src="' + escapeHtml(src) + '" allow="autoplay; fullscreen" allowfullscreen loading="lazy"' +
          ' title="Video hướng dẫn"></iframe>' +
        veNutPlayTo() +
      '</div>' +
      '<button type="button" class="nut nut-nho nut-vien nut-video-to" data-hanh-dong="video-toan-man-hinh"' +
        ' data-khung="' + escapeHtml(id) + '">⛶ Xem toàn màn hình</button>';
  }

  // Chỉ để MẮT NHÌN THẤY đây là video bấm được — trình phát thật của Drive
  // nằm ngay dưới, tự lo việc play/tạm dừng. Bấm vào nút này chỉ ẩn nó đi để
  // lộ nút play thật của Drive bên dưới (không có cách nào bấm hộ được vào
  // trong iframe khác gốc), nên khách bấm thêm một cái nữa là video chạy.
  function veNutPlayTo(){
    return '<div class="nut-play-to" data-nut-play aria-hidden="true"></div>';
  }

  function moModalHuongDan(maSP){
    const sp = timSanPham(maSP);
    const dung = HUONG_DAN_SU_DUNG[maSP];
    if (!sp || !dung) return;
    const dm = danhMucCua(maSP);
    moModal({
      ma: 'huong-dan-' + maSP,
      tieuDe: 'Hướng dẫn sử dụng',
      than: '<div class="noi-dung-huong-dan">' + dung(dm) + '</div>',
      day: '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>',
      khiVe: function(){ initKhungVideo(); hienMuiTenTruot(); }
    });
  }

  // ---------------------------------------- MŨI TÊN NHẮC LƯỚT XUỐNG
  //
  // Mở bảng hướng dẫn là hiện chữ dài, khách hay tưởng đã hết bài rồi đóng
  // bảng luôn. Mũi tên bật ra giữa màn hình, đứng im rồi trượt xuống biến
  // mất — lặp đúng hai lần rồi thôi hẳn, không làm phiền thêm.
  function hienMuiTenTruot(){
    const cu = document.querySelector('.mui-ten-truot');
    if (cu) cu.remove();
    const el = document.createElement('div');
    el.className = 'mui-ten-truot';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    const don = function(){ if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener('animationend', don);
    // Lưới an toàn phòng khi animationend không bắn (tab chạy nền…) — phải
    // dài hơn TOÀN BỘ animation thật (2 vòng × 2,4 giây = 4,8 giây, xem
    // muiTenTruotXuong trong app.css), không thì mũi tên bị xoá giữa chừng.
    window.setTimeout(don, 5200);
  }

  function videoToanManHinh(khung){
    const el = document.querySelector('[data-khung-video="' + khung + '"]');
    if (!el) return;
    const yeuCau = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (yeuCau) yeuCau.call(el);
  }

  // ------------------------------------------ BỘ CÔNG CỤ CỦA TRÌNH PHÁT DRIVE
  //
  // Bộ nút play/tua/âm lượng/chất lượng của Google Drive tự xếp lại theo bề
  // ngang thật của khung chứa nó — dưới một ngưỡng nào đó (khung dọc 9:16 hẹp
  // ngang, hoặc màn điện thoại nhỏ) nó dồn cục, chữ đè lên nút, nhìn vỡ. Mẹo:
  // luôn bảo iframe rằng nó đang rộng ÍT NHẤT NGUONG_RONG_VIDEO (đủ để Drive
  // tự xếp bộ nút đầy đủ như trên máy tính), rồi dùng transform: scale() thu
  // nhỏ lại cho vừa khung thật — y hệt cách trình duyệt zoom out một trang
  // web mà chữ không vỡ dòng. Lúc khung đã đủ rộng sẵn (ví dụ khi bấm xem
  // toàn màn hình) thì hệ số co = 1, ảnh nét nguyên gốc, không phóng to giả.
  const NGUONG_RONG_VIDEO = 640;

  function ganTyLeKhungVideo(khung){
    const iframe = khung.querySelector('iframe');
    const rongThuc = khung.clientWidth;
    if (!iframe || !rongThuc) return;
    const doc = khung.classList.contains('video-doc');
    const rongThietKe = Math.max(rongThuc, NGUONG_RONG_VIDEO);
    const caoThietKe = Math.round(doc ? rongThietKe * 16 / 9 : rongThietKe * 9 / 16);
    const tiLe = rongThuc / rongThietKe;
    iframe.style.width = rongThietKe + 'px';
    iframe.style.height = caoThietKe + 'px';
    iframe.style.transform = 'scale(' + tiLe + ')';
  }

  // Gọi sau khi bảng chứa .khung-video vừa được chèn vào trang (modal hướng
  // dẫn của khách, hoặc khối "Xem trước link" ở /admin). Theo dõi luôn bằng
  // ResizeObserver để khi xoay máy, đổi bề ngang trình duyệt, hay bấm toàn
  // màn hình thì tính lại ngay, không cần tải lại trang.
  function initKhungVideo(goc){
    const ds = (goc || document).querySelectorAll('.khung-video');
    for (let i = 0; i < ds.length; i++) {
      const khung = ds[i];
      if (khung.__daCanhChinh) continue;
      khung.__daCanhChinh = true;
      ganTyLeKhungVideo(khung);
      if (typeof ResizeObserver === 'function') {
        new ResizeObserver(function(){ ganTyLeKhungVideo(khung); }).observe(khung);
      } else {
        window.addEventListener('resize', function(){ ganTyLeKhungVideo(khung); });
      }
      const nutPlay = khung.querySelector('[data-nut-play]');
      if (nutPlay) {
        nutPlay.addEventListener('click', function(){ nutPlay.classList.add('da-an'); }, { once: true });
      }
    }
  }

  // Mỗi hàm nhận nhánh danh mục của đúng sản phẩm đó (để lấy linkHuongDan nếu
  // có) và trả về HTML thân bảng. Viết đủ chi tiết để khách làm theo được mà
  // không cần hỏi lại shop.
  const HUONG_DAN_SU_DUNG = {

    // ---------------------------------------------------------------- SP1
    sp1: function(){
      return '' +
        '<p class="hd-mo-dau">App Lightroom bản đầy đủ cài theo cách này chỉ mất khoảng ' +
          '2–3 phút. Làm đúng theo thứ tự bên dưới là xong, không cần rành công nghệ.</p>' +

        '<h4 class="hd-buoc">Bước 1 — Gỡ Lightroom cũ (nếu máy đã cài sẵn)</h4>' +
        '<p>Nếu điện thoại bạn đã có sẵn Lightroom tải từ CH Play, hãy <strong>gỡ nó ra trước</strong> ' +
          '(giữ icon app → Gỡ cài đặt / Uninstall). Đây là bước rất quan trọng: hai bản Lightroom ' +
          'cùng tồn tại, hoặc bản CH Play tự động cập nhật đè lên, sẽ làm app báo lỗi hoặc mất bản quyền ' +
          'vừa cài. Preset và ảnh bạn đã chỉnh trước đó không mất, vì chúng đồng bộ trên tài khoản Adobe.</p>' +

        '<h4 class="hd-buoc">Bước 2 — Cho phép điện thoại cài app ngoài CH Play</h4>' +
        '<p>Android mặc định chỉ cho cài app từ CH Play. Vì file bạn tải về có đuôi ' +
          '<strong>.apk</strong> (cài trực tiếp, không qua CH Play) nên cần bật quyền một lần duy nhất:</p>' +
        '<p>Vào <strong>Cài đặt → An toàn và bảo mật (Bảo mật)</strong>, tìm dòng ' +
          '<strong>“Không rõ nguồn gốc” / “Cài đặt ứng dụng không rõ nguồn gốc”</strong> rồi bật lên, ' +
          'như hình dưới:</p>' +
        '<img class="hd-anh" src="/assets/anh/hd-sp1-b1.jpg" alt="Bật cho phép cài ứng dụng không rõ nguồn gốc trong Cài đặt">' +
        '<p class="hd-ghi-chu">Một số dòng máy (Samsung, Xiaomi, Oppo…) đặt mục này ở tên hơi khác nhau, ' +
          'hoặc chỉ hỏi đúng lúc bạn mở file cài ở Bước 3 — gặp vậy thì cứ bấm <strong>Cho phép / Allow</strong> ' +
          'khi máy hỏi.</p>' +

        '<h4 class="hd-buoc">Bước 3 — Mở file .apk vừa tải và cài đặt</h4>' +
        '<p>Vào ứng dụng <strong>Quản lý tệp / Files / Trình tải xuống (Downloads)</strong>, tìm đúng file ' +
          'vừa tải (đuôi .apk), bấm vào nó. Nếu máy hỏi “Mở bằng”, chọn <strong>Trình cài đặt</strong> ' +
          '(Package Installer) như hình dưới, rồi bấm <strong>Cài đặt</strong>:</p>' +
        '<img class="hd-anh" src="/assets/anh/hd-sp1-b2.jpg" alt="Mở file APK bằng Trình cài đặt">' +

        '<h4 class="hd-buoc">Bước 4 — Nếu Google Play Protect chặn lại</h4>' +
        '<p>App không tải từ CH Play nên đôi khi Google Play Protect sẽ hiện cảnh báo ' +
          '<strong>“Đã chặn ứng dụng để bảo vệ thiết bị của bạn”</strong>. Đây là lời cảnh báo tự động cho ' +
          'MỌI app cài ngoài, không riêng gì app này — app đã được shop kiểm tra kỹ, hoàn toàn sạch. ' +
          'Bấm vào <strong>“Chi tiết khác”</strong> để mở rộng, sẽ hiện thêm nút cho cài tiếp, như hình dưới:</p>' +
        '<img class="hd-anh" src="/assets/anh/hd-sp1-b3.jpg" alt="Bấm Chi tiết khác khi Play Protect cảnh báo">' +
        '<p>Bấm <strong>“Chi tiết khác”</strong> rồi bấm nút <strong>“Vẫn cài đặt” / “Cài đặt bằng mọi cách”</strong> ' +
          'vừa hiện ra là app cài xong ngay sau đó.</p>' +

        '<h4 class="hd-buoc">Xong rồi!</h4>' +
        '<p>Mở app Lightroom lên, đăng nhập (hoặc dùng luôn không cần đăng nhập) là dùng được bản đầy đủ, ' +
          'không giới hạn tính năng. Có trục trặc gì cứ nhắn shop, shop hỗ trợ tận nơi.</p>';
    },

    // ---------------------------------------------------------------- SP2
    sp2: function(dm){
      return '' +
        veKhungVideo(dm && dm.linkHuongDan, 'doc') +
        '<h4 class="hd-buoc">Bộ preset này gồm những gì?</h4>' +
        '<p>Đây là <strong>gói 9.500 preset Lightroom Mobile</strong> tổng hợp, nhưng để máy yếu vẫn nhập ' +
          'được mượt mà, shop đã <strong>chia nhỏ thành nhiều gói con</strong> — mỗi gói đúng 1.000 preset ' +
          '(gói 1: preset số 1–1.000, gói 2: preset số 1.001–2.000, gói 3: preset số 2.001–3.000, cứ thế ' +
          'nối tiếp cho tới hết).</p>' +
        '<h4 class="hd-buoc">Nên cài gói nào?</h4>' +
        '<p>· Điện thoại <strong>cấu hình yếu hoặc đời cũ</strong>: cài <strong>từng gói nhỏ một</strong> ' +
          '(1.000 preset/lần) để máy xử lý nhẹ nhàng, không bị đơ hay treo giữa chừng.</p>' +
        '<p>· Điện thoại <strong>đời mới, cấu hình mạnh, hoặc iPhone</strong>: cứ mạnh dạn cài luôn ' +
          '<strong>gói tổng hợp 9.500 preset</strong> — cài một lần là xong hết, khỏi lặp lại nhiều lần.</p>' +
        '<h4 class="hd-buoc">Các bước cài đặt chi tiết</h4>' +
        '<p>1. Tải (các) file <strong>.zip</strong> preset về máy điện thoại từ danh sách bên dưới.</p>' +
        '<p>2. Mở app <strong>Lightroom</strong> → bấm vào <strong>Thiết đặt sẵn (Presets)</strong> ở thanh dưới.</p>' +
        '<p>3. Chọn mục <strong>“Của bạn” (Yours)</strong>.</p>' +
        '<p>4. Nhìn lên góc trên bên phải màn hình, bấm vào dấu ba chấm dọc <strong>“⋮”</strong>.</p>' +
        '<p>5. Chọn <strong>“Nhập thiết đặt sẵn” (Import Presets)</strong>.</p>' +
        '<p>6. Bấm <strong>“Tải file lên”</strong>, rồi chọn đúng file <strong>.zip</strong> preset vừa tải.</p>' +
        '<p>7. Ngồi chờ vài chục giây để Lightroom tải preset lên và tự đồng bộ vào bộ nhớ đám mây Adobe ' +
          'của bạn — xong là preset xuất hiện ngay trong mục “Của bạn”, dùng được cho mọi tấm ảnh.</p>' +
        '<p class="hd-ghi-chu">Muốn cài thêm gói khác thì lặp lại đúng các bước 4–7 với file .zip của gói đó, ' +
          'preset các gói không đè lên nhau.</p>';
    },

    // ---------------------------------------------------------------- SP3
    sp3: function(dm){
      return '' +
        '<h4 class="hd-tieu-de-video">Hướng dẫn thêm preset vào Photoshop Camera Raw</h4>' +
        veKhungVideo(dm && dm.linkHuongDan, 'ngang') +
        '<h4 class="hd-buoc">Cài vào Lightroom Classic (máy tính)</h4>' +
        '<p>1. Tải file <strong>.zip</strong> preset về máy tính rồi giải nén ra một thư mục.</p>' +
        '<p>2. Mở <strong>Lightroom Classic</strong>, vào khu vực <strong>Develop (Chỉnh sửa)</strong>.</p>' +
        '<p>3. Ở bảng bên trái, tìm mục <strong>Presets</strong>, bấm dấu <strong>“+”</strong> ở đầu mục ' +
          '→ chọn <strong>“Import Presets…”</strong>.</p>' +
        '<p>4. Trỏ tới thư mục vừa giải nén, chọn hết các file preset (đuôi <strong>.xmp</strong> hoặc ' +
          '<strong>.lrtemplate</strong>) rồi bấm <strong>Import</strong>.</p>' +
        '<p>5. Preset xuất hiện ngay trong bảng Presets, mở bất kỳ tấm ảnh RAW nào ra là áp dụng được.</p>' +
        '<h4 class="hd-buoc">Cài vào Photoshop (bộ lọc Camera Raw)</h4>' +
        '<p>1. Mở một tấm ảnh trong Photoshop, vào <strong>Filter → Camera Raw Filter</strong> ' +
          '(hoặc mở trực tiếp file RAW để Camera Raw tự bật lên).</p>' +
        '<p>2. Ở cột bên phải, chọn tab <strong>Presets</strong> (biểu tượng hai vòng tròn chồng nhau).</p>' +
        '<p>3. Bấm dấu <strong>“…”</strong> hoặc icon <strong>“+”</strong> ở góc bảng Presets → chọn ' +
          '<strong>“Import Presets…”</strong>.</p>' +
        '<p>4. Trỏ tới thư mục đã giải nén, chọn các file preset rồi bấm <strong>Import</strong> — xong là ' +
          'preset nằm sẵn trong danh sách, chỉ việc bấm chọn để áp màu cho ảnh.</p>' +
        '<p class="hd-ghi-chu">Camera Raw dùng chung một kho preset cho cả Photoshop lẫn Bridge, nên nhập ' +
          'một lần là dùng được ở cả hai nơi.</p>';
    },

    // ---------------------------------------------------------------- SP6
    sp6: function(dm){
      return '' +
        '<h4 class="hd-buoc">Cài đặt phần mềm</h4>' +
        '<p>Tải file cài đặt về máy tính Windows, bấm chạy rồi làm theo hướng dẫn trên màn hình như cài ' +
          'bất kỳ phần mềm nào khác — bấm <strong>Next</strong> tới khi thấy <strong>Install</strong>, đợi ' +
          'thanh chạy đầy là xong. Phần lớn máy cài trót lọt ngay lần đầu, không cần xử lý gì thêm.</p>' +
        '<div class="hd-canh-bao">' +
          '<span aria-hidden="true">🔥</span> ' +
          '<span><strong>Video sẽ hướng dẫn bạn tắt Tường lửa của Windows trước khi cài Phần mềm</strong> — ' +
          'chỉ xem khi quá trình cài đặt báo lỗi hoặc bị chặn giữa chừng.</span>' +
        '</div>' +
        veKhungVideo(dm && dm.linkHuongDan, 'ngang');
    },

    // ---------------------------------------------------------------- SP7
    sp7: function(dm){
      return '' +
        '<div class="hd-canh-bao">' +
          '<span aria-hidden="true">🔥</span> ' +
          '<span><strong>Video sẽ hướng dẫn bạn tắt Tường lửa của Windows trước khi cài Phần mềm.</strong></span>' +
        '</div>' +
        veKhungVideo(dm && dm.linkHuongDan, 'ngang');
    }
  };

  // Mỗi dòng mang CHỈ SỐ chứ không mang tên tệp. Tên tệp trong kho nằm lại
  // trong bộ nhớ của trang, không in ra HTML — biết tên tệp thì cũng không tải
  // được gì, nhưng không cho không người tò mò một manh mối nào.
  function veDongTep(f, i){
    const tron = laTronBo(f.tep);
    return '' +
      '<div class="dong-tep-nhan' + (tron ? ' tron-bo' : '') + '" data-dong-tep="' + i + '">' +
        '<div class="ten-tep">' +
          (tron ? '<span class="nhan-tron">Trọn bộ</span>' : '') +
          '<span class="chu">' + escapeHtml(f.ten || 'Tệp ' + (i + 1)) + '</span>' +
        '</div>' +
        '<div class="vung-tep" data-vung-tep="' + i + '">' + veKetQuaTep(i) + '</div>' +
      '</div>';
  }

  // Một dòng tệp có ba trạng thái: chưa bấm (nút xác nhận), đang hỏi máy chủ,
  // và đã được phép (nút tải thật).
  function veKetQuaTep(i){
    if (state.nhanHang.dangHoiTep === String(i)) {
      return '<p class="dang-hoi">Đang chuẩn bị…</p>';
    }
    const kq = (state.nhanHang.ketQuaTep || {})[i];
    if (!kq) {
      return '<button type="button" class="nut nut-nho nut-chinh nut-xac-nhan-tai" ' +
        'data-hanh-dong="xac-nhan-tai" data-dong="' + i + '">Tôi chắc chắn — tải xuống</button>';
    }
    return veKetQuaNhanHang(kq);
  }

  // Nơi DUY NHẤT được dựng nút tải xuống. Nhánh từ chối phải chặn TRƯỚC, không
  // thì đường dẫn tải lọt ra ngoài khi máy chủ chưa cho phép.
  function veKetQuaNhanHang(kq){
    if (!kq.duoc) {
      return '<p class="loi-nhan-hang">' + escapeHtml(chuLyDo(kq.lyDo)) + '</p>';
    }
    // Đường dẫn tải chỉ tồn tại từ giây phút này, trong bộ nhớ của trình duyệt
    // khách. Nó KHÔNG có trong mã nguồn và cũng không được ghi vào bất cứ đâu.
    return '' +
      '<a class="nut nut-nho nut-la nut-tai-ve" href="' + escapeHtml(kq.duongDan) + '" ' +
        'rel="noopener noreferrer" download>⬇ Tải xuống</a>' +
      '<span class="nhac-tai">Chỉ dùng được ít phút, chỉ trên máy này.</span>';
  }

  // Vẽ lại RIÊNG vùng của một tệp, không dựng lại cả bảng.
  function capNhatVungTep(i){
    const vung = document.querySelector('[data-vung-tep="' + i + '"]');
    if (vung) vung.innerHTML = veKetQuaTep(i);
  }

  function xacNhanTai(chiSo){
    const nh = state.nhanHang;
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || nh.dangHoiTep || !nh.maSanPham) return;
    const f = (nh.tep || [])[i];
    if (!f) return;
    if (nh.ketQuaTep[i] && nh.ketQuaTep[i].duoc) return;   // đã lấy được rồi
    // Không có mã trong đường dẫn thì khỏi làm phiền máy chủ — báo ngay cho
    // khách biết họ đang mở một địa chỉ không phải địa chỉ shop gửi riêng.
    if (!nh.maNhanHang) {
      nh.ketQuaTep[i] = { duoc: false, lyDo: 'thieu-ma' };
      capNhatVungTep(i);
      return;
    }
    nh.dangHoiTep = String(i);
    capNhatVungTep(i);
    xinDuongDanTai(nh.maSanPham, nh.maNhanHang, f.tep).then(function(kq){
      nh.dangHoiTep = '';
      nh.ketQuaTep[i] = kq || { duoc: false, lyDo: '' };
      capNhatVungTep(i);
    });
  }

  // ------------------------------------------------------ BẢNG GOOGLE DRIVE
  //
  // Vài sản phẩm nặng quá thì chủ shop để trên Google Drive công khai. Nói
  // thẳng với khách rằng đây là thư mục dùng chung, để họ hiểu vì sao món này
  // không có bước khoá thiết bị như các món khác.

  function moModalDrive(sp, dm){
    moModal({
      ma: 'nhan-drive',
      tieuDe: 'Nhận sản phẩm',
      than: '' +
        '<div class="khung-nhan-hang">' +
          '<p class="ten-mon">Bạn đang nhận: <strong>' + escapeHtml(sp.ten) + '</strong></p>' +
          '<div class="ghi-chu-chuyen-huong">' +
            '<p>Bấm nút bên dưới là mở thư mục chứa toàn bộ tệp của sản phẩm.</p>' +
            '<p class="cach-quay-lai">Trong thư mục đó bạn tải từng tệp mình cần, hoặc tải tất cả một lượt. ' +
              'Muốn quay lại trang này thì bấm <strong>nút quay lại</strong> trên thiết bị hoặc trình duyệt.</p>' +
          '</div>' +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<a class="nut nut-la nut-mo-drive" href="' + escapeHtml(dm.link) + '" ' +
          'target="_blank" rel="noopener noreferrer">Mở thư mục và tải file về</a>'
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
