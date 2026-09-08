
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
          '<span>Sản phẩm này <strong>chỉ tải được trên MỘT thiết bị</strong>. Bấm tải ở máy nào ' +
          'là hệ thống ghi nhớ máy đó. Hãy chắc chắn đây là chiếc máy bạn sẽ dùng sản phẩm ' +
          'rồi mới bấm nút bên dưới.</span>' +
        '</div>' +
        (tep.length
          ? '<div class="danh-sach-tep">' + tep.map(veDongTep).join('') + '</div>'
          : '<p class="loi-nhan-hang">' + escapeHtml(chuLyDo('chua-khai')) + '</p>') +
      '</div>';
  }

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
            '<p>Sản phẩm này nặng nên shop để trên <strong>Google Drive</strong>. ' +
              'Bấm nút bên dưới là mở thư mục chứa toàn bộ tệp của sản phẩm.</p>' +
            '<p class="cach-quay-lai">Trong thư mục đó bạn tải từng tệp mình cần, hoặc tải tất cả một lượt. ' +
              'Muốn quay lại trang này thì bấm <strong>nút quay lại</strong> trên thiết bị hoặc trình duyệt.</p>' +
          '</div>' +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<a class="nut nut-la nut-mo-drive" href="' + escapeHtml(dm.link) + '" ' +
          'target="_blank" rel="noopener noreferrer">Mở thư mục Google Drive</a>'
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
