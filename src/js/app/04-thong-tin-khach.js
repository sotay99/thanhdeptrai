
  /* ===========================================================================
     PHẦN 04 — MODAL "XÁC NHẬN ĐƠN HÀNG" (nhập thông tin khách hàng)
     =========================================================================== */

  const GIOI_HAN_EMAIL = 35;   // số ký tự tối đa của email
  const GIOI_HAN_SO = 12;      // số CHỮ SỐ tối đa của số Zalo / số điện thoại

  // ------------------------------------------------------- CHUẨN HOÁ & KIỂM

  // QUY TẮC CHUNG CHO CẢ BA TRƯỜNG: tuyệt đối KHÔNG có dấu cách bên trong ô
  // nhập — kể cả dấu cách ở giữa, ở đầu, ở cuối, hay dán từ nơi khác vào. Khách
  // hay dán số điện thoại kiểu "090 123 4567" hoặc email lẫn dấu cách thừa; gọt
  // ngay lúc gõ thì nội dung chuyển khoản và đơn hàng không bao giờ dính lỗi đó.
  function boDauCach(chuoi){
    return String(chuoi == null ? '' : chuoi).replace(/\s+/g, '');
  }

  // Số Zalo / số điện thoại: chỉ chữ số; nếu có dấu "+" thì đúng một dấu và
  // luôn đứng đầu; không quá 12 chữ số. Hàm này gọt thẳng chuỗi khách gõ nên
  // ký tự sai (dấu cách, chữ cái, ký hiệu) không bao giờ vào được ô nhập.
  function chuanHoaSo(chuoi){
    const raw = boDauCach(chuoi);
    const coCong = raw.charAt(0) === '+';
    const so = raw.replace(/\D/g, '').slice(0, GIOI_HAN_SO);
    return (coCong ? '+' : '') + so;
  }

  function chuanHoaEmail(chuoi){
    return boDauCach(chuoi).slice(0, GIOI_HAN_EMAIL);
  }

  // Email hợp lệ: không quá 35 ký tự, ĐÚNG MỘT dấu "@" và dấu đó không đứng
  // đầu cũng không đứng cuối, và có ít nhất một "." (cho phép nhiều dấu chấm).
  //
  // Vì sao đúng một: "a@b@c.com" là email không tồn tại, mà luật cũ (ít nhất
  // một "@") vẫn cho qua. Đơn ghi xuống với email hỏng thì khâu gửi hàng tự
  // động ném thư vào hư không — khách trả tiền rồi ngồi đợi, còn shop tưởng đã
  // giao xong. Vì sao không ở hai đầu: "@abc.com" và "abc.com@" cũng vậy.
  //
  // Ô nhập vẫn cho gõ thoải mái, chỉ viền đỏ và khoá nút thanh toán. Câu báo
  // cố ý nói chung chung "Email chưa đúng dạng" chứ không giảng giải từng luật
  // — khách chỉ cần biết mình gõ sai, không cần học quy tắc của shop.
  function loiEmail(email){
    if (!email) return '';
    if (email.length > GIOI_HAN_EMAIL) return 'Email không được quá ' + GIOI_HAN_EMAIL + ' ký tự.';
    const soCong = email.split('@').length - 1;
    if (soCong !== 1) return 'Email chưa đúng dạng.';
    const viTri = email.indexOf('@');
    if (viTri === 0 || viTri === email.length - 1) return 'Email chưa đúng dạng.';
    if (email.indexOf('.') === -1) return 'Email phải có ít nhất một dấu chấm “.”.';
    return '';
  }

  function loiSo(so, ten){
    if (!so) return '';
    const chiSo = so.replace(/\D/g, '');
    if (!chiSo) return ten + ' phải có chữ số.';
    if (chiSo.length > GIOI_HAN_SO) return ten + ' không được quá ' + GIOI_HAN_SO + ' số.';
    return '';
  }

  // Năm trường liên lạc, xếp đúng thứ tự chúng hiện trong bảng. Thêm trường mới
  // chỉ là thêm một dòng ở đây — phần kiểm, phần vẽ và phần cập nhật đều đọc
  // theo danh sách này nên không nơi nào bị bỏ sót.
  const TRUONG_LIEN_LAC = ['email', 'zalo', 'dienThoai', 'whatsapp', 'telegram'];

  function kiemTraKhachHang(){
    const kh = state.khachHang;
    const loi = {
      email: loiEmail(kh.email),
      zalo: loiSo(kh.zalo, 'Số zalo'),
      dienThoai: loiSo(kh.dienThoai, 'Số điện thoại'),
      whatsapp: loiSo(kh.whatsapp, 'Số WhatsApp'),
      telegram: loiSo(kh.telegram, 'Số Telegram')
    };
    const coItNhatMot = TRUONG_LIEN_LAC.some(function(t){ return !!kh[t]; });
    const khongLoi = TRUONG_LIEN_LAC.every(function(t){ return !loi[t]; });
    return { loi: loi, coItNhatMot: coItNhatMot, hopLe: coItNhatMot && khongLoi };
  }

  // ------------------------------------------------------- ĐỒNG BỘ ZALO ↔ SĐT
  //
  // Gõ số Zalo thì số điện thoại tự lấy theo — CHỈ KHI số điện thoại đang
  // trống, hoặc đang giữ đúng giá trị mà cơ chế này tự điền vào trước đó.
  // Khách sửa tay trường nào thì trường đó lập tức thoát đồng bộ, và cả ba
  // trường luôn sửa được thoải mái.

  function capNhatTruong(ten, giaTri){
    if (ten === 'email') {
      state.khachHang.email = chuanHoaEmail(giaTri);
    } else if (ten === 'zalo') {
      state.khachHang.zalo = chuanHoaSo(giaTri);
      state.tuDongDien.zalo = false;
      if (!state.khachHang.dienThoai || state.tuDongDien.dienThoai) {
        state.khachHang.dienThoai = state.khachHang.zalo;
        state.tuDongDien.dienThoai = state.khachHang.zalo !== '';
      }
    } else if (ten === 'dienThoai') {
      state.khachHang.dienThoai = chuanHoaSo(giaTri);
      state.tuDongDien.dienThoai = false;
      if (!state.khachHang.zalo || state.tuDongDien.zalo) {
        state.khachHang.zalo = state.khachHang.dienThoai;
        state.tuDongDien.zalo = state.khachHang.dienThoai !== '';
      }
    } else if (ten === 'whatsapp' || ten === 'telegram') {
      // Gọt ký tự y như số Zalo, nhưng KHÔNG đồng bộ với trường nào cả. Zalo và
      // điện thoại đi cặp vì ở Việt Nam chúng gần như luôn là một số; WhatsApp
      // và Telegram thì không — tự điền sang là đoán thay khách.
      state.khachHang[ten] = chuanHoaSo(giaTri);
    }
    capNhatFormKhachHang();
  }

  // Cập nhật TẠI CHỖ (không vẽ lại cả modal) để con trỏ nhập không bị nhảy.
  function capNhatFormKhachHang(){
    const ketQua = kiemTraKhachHang();
    TRUONG_LIEN_LAC.forEach(function(ten){
      const o = document.querySelector('[data-truong="' + ten + '"]');
      if (!o) return;
      // Chỉ ghi đè khi ô đang lệch với trạng thái — gán vô cớ sẽ đẩy con trỏ
      // nhập về cuối chuỗi giữa lúc khách đang gõ.
      if (o.value !== state.khachHang[ten]) o.value = state.khachHang[ten];
      const oLoi = document.querySelector('[data-loi="' + ten + '"]');
      if (oLoi) oLoi.textContent = ketQua.loi[ten] || '';
      if (ketQua.loi[ten]) o.classList.add('sai');
      else o.classList.remove('sai');
    });

    // Lời nhắc luôn hiện, chỉ đổi độ đậm: chưa ô nào có chữ thì nó là lý do nút
    // đang khoá, điền rồi thì lùi về làm ghi chú. Đổi CHỮ ở đây thì thành hai
    // câu nói cùng một việc, và khách phải đọc lại từ đầu mỗi lần gõ.
    const canhBao = document.querySelector('[data-loi="chung"]');
    if (canhBao) {
      if (ketQua.coItNhatMot) canhBao.classList.remove('dang-thieu');
      else canhBao.classList.add('dang-thieu');
    }
    const nut = document.querySelector('[data-hanh-dong="tien-hanh-thanh-toan"]');
    if (nut) nut.disabled = !ketQua.hopLe;
  }

  // ----------------------------------------------------------- VẼ NỘI DUNG

  function veTomTatDon(){
    const t = tinhTien();
    const dong = sanPhamDaChon().map(function(sp){
      return '<div class="dong-sp"><span class="ten">' + escapeHtml(sp.ten) + '</span>' +
        '<span class="gia">' + dinhDangTien(sp.giaChot) + '</span></div>';
    }).join('');
    return '' +
      '<div class="tom-tat-don">' +
        dong +
        '<div class="dong-tong"><span class="nhan">Tổng trị giá ' + t.soLuong + ' sản phẩm</span>' +
          '<span class="tri">' + dinhDangTien(t.tongTien) + '</span></div>' +
        '<div class="dong-tong"><span class="nhan">Giảm giá lần hai ' + t.phanTramGiam + '%</span>' +
          '<span class="tri" style="color:var(--la)">− ' + dinhDangTien(t.tienGiam) + '</span></div>' +
        '<div class="dong-tong chot"><span class="nhan">Số tiền cuối cùng</span>' +
          '<span class="tri">' + dinhDangTien(t.thanhTien) + '</span></div>' +
      '</div>';
  }

  // nhanPhu: câu mời thêm, hiện NGAY CẠNH tên trường và nổi bật hẳn lên. Dùng
  // cho ô Email — email là đường giao hàng tự động duy nhất, khách để lại email
  // là nhận hàng trong một phút, nên phải nói thẳng điều đó ngay chỗ khách gõ.
  function veOTruong(ten, nhan, giaTri, goiY, kieu, nhanPhu){
    return '' +
      '<div class="truong">' +
        '<label for="o-' + ten + '">' + escapeHtml(nhan) +
          (nhanPhu ? '<span class="nhan-phu">' + escapeHtml(nhanPhu) + '</span>' : '') +
        '</label>' +
        '<input id="o-' + ten + '" type="' + kieu + '" data-truong="' + ten + '" value="' + escapeHtml(giaTri) +
          '" autocomplete="off" inputmode="' + (kieu === 'email' ? 'email' : 'tel') + '">' +
        '<p class="goi-y">' + escapeHtml(goiY) + '</p>' +
        '<p class="loi" data-loi="' + ten + '"></p>' +
      '</div>';
  }

  function moModalDonHang(){
    if (!state.daChon.length) return;
    const kh = state.khachHang;
    moModal({
      ma: 'don-hang',
      tieuDe: 'Xác nhận đơn hàng',
      than: '' +
        veTomTatDon() +
        // Lời mời nhập liệu và lời cam kết giao hàng gộp vào MỘT khung đỏ nhạt
        // nổi bật, nhún nhảy để khách chắc chắn đọc trước khi gõ.
        '<div class="khung-cam-ket-giao">' +
          '<p>Vui lòng nhập <strong>ít nhất 1 trong 5 trường</strong> (khung nhập liệu) dưới đây để shop liên hệ giao sản phẩm.</p>' +
          '<p>Shop <strong>cam kết giao sản phẩm ngay lập tức</strong> khi vừa nhận được tiền thanh toán của bạn: ưu tiên giao qua <strong>email</strong> (thông qua hệ thống tự động), hoặc giao qua tin nhắn <strong>Zalo, WhatsApp, Telegram</strong> (nếu bạn chưa nhập email), hoặc <strong>tin nhắn SMS</strong> (nếu không thể liên hệ qua các cách trên).</p>' +
        '</div>' +
        veOTruong('email', 'Email', kh.email,
          'Tối đa ' + GIOI_HAN_EMAIL + ' ký tự, phải có “@” và dấu chấm, không có dấu cách.', 'email',
          '- khuyến khích nhập Email để nhận sản phẩm Nhanh chỉ trong 1 phút, bỏ qua nếu chưa có email') +
        veOTruong('zalo', 'Số zalo', kh.zalo, 'Chỉ nhập số, không dấu cách, tối đa ' + GIOI_HAN_SO + ' số, dấu “+” (nếu có) đứng đầu.', 'text') +
        veOTruong('dienThoai', 'Số điện thoại', kh.dienThoai, 'Tự lấy theo số zalo khi đang để trống, sửa lại được thoải mái.', 'text') +
        veOTruong('whatsapp', 'Số WhatsApp của bạn (nếu có)', kh.whatsapp,
          'Bỏ qua nếu bạn không dùng. Chỉ nhập số, tối đa ' + GIOI_HAN_SO + ' số, dấu “+” (nếu có) đứng đầu.', 'text') +
        veOTruong('telegram', 'Số Telegram của bạn (nếu có)', kh.telegram,
          'Bỏ qua nếu bạn không dùng. Chỉ nhập số, tối đa ' + GIOI_HAN_SO + ' số, dấu “+” (nếu có) đứng đầu.', 'text') +
        // Lời nhắc đứng CUỐI, sau cả năm ô, và luôn có mặt. Khách vừa gõ xong ô
        // cuối là mắt rơi đúng vào nó, ngay trước lúc với tay xuống nút thanh
        // toán. Nó đậm thêm khi chưa ô nào có chữ — lúc đó không còn là lời
        // nhắc nữa mà là lý do nút đang khoá.
        '<p class="loi loi-chung" data-loi="chung">' +
          'Vui lòng nhập thông tin vào ít nhất 1 trong 5 trường (khung nhập liệu) ở phía trên' +
        '</p>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Đóng bảng</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="tien-hanh-thanh-toan" disabled>Tiến hành thanh toán</button>',
      khiVe: function(){ capNhatFormKhachHang(); }
    });
  }
