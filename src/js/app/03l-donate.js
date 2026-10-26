
  /* ===========================================================================
     PHẦN 03L — "DONATE CẢM ƠN - ỦNG HỘ TÁC GIẢ" (hai khoá học miễn phí)

     Đứng cuối module "Khoá học chỉnh màu Lightroom điện thoại" (PHẦN 03C) và
     "Khoá Photoshop - edit ảnh bằng điện thoại" (PHẦN 03H) — lời cảm ơn khách
     đã học khoá miễn phí, mời donate tuỳ tâm cho giảng viên.

     BA BƯỚC, BA MODAL XẾP CHỒNG (moModal() stack — "Quay lại bước trước" chỉ
     là dong-modal thường, lộ lại đúng modal bên dưới với dữ liệu vẫn còn,
     KHÔNG dựng lại từ đầu, xem PHẦN 02):
       1. Nhập số tiền + nội dung chuyển khoản.
       2. Hiện mã QR — TÁI DÙNG nguyên cơ chế VietQR + tải ảnh thành data URI
          của bảng thanh toán đơn hàng (PHẦN 05), chỉ đổi số tiền/nội dung.
       3. "Tâm thư" cảm ơn sau khi khách tự báo đã chuyển khoản.

     KHÔNG ghi gì vào Firebase — khác hẳn luồng mua hàng (PHẦN 05): đây chỉ là
     lời mời tuỳ tâm, không có đơn, không có xác nhận, không có gửi hàng.
     =========================================================================== */

  // Tên khoá học hiển thị CÓ DẤU — boDauTiengViet() (PHẦN 01) tự chuyển khi
  // ghép vào nội dung chuyển khoản mặc định, một nguồn duy nhất không lệch.
  const TEN_KHOA_HOC_DONATE = {
    'khoa-hoc-mobile': 'Lightroom điện thoại',
    'khoa-photoshop': 'Photoshop điện thoại'
  };

  const DOAN_CAM_ON_DONATE = '' +
    'Khoá Học này được Giảng viên Thành Đẹp Trai mất nhiều thời gian để nghiên cứu và xây dựng, đóng gói.<br>' +
    'Giá trị ban đầu của Khoá học là 199k, tuy nhiên để cho mọi người ai cũng Học được, nên admin quyết định ' +
    'Miễn Phí 100% Khoá học này (Đặc quyền chỉ có tại thanhdeptrai.vn).<br>' +
    'Để Khoá học Này luôn luôn Miễn Phí, và để cảm ơn công sức cũng như ủng hộ tác giả ra thêm sản phẩm mới, ' +
    'Duy trì Website, Bạn có thể donate Cho Giảng Viên vài đồng uống cà phê, Bao nhiêu cũng quý, Cảm ơn bạn ' +
    'rất nhiều!';

  // Câu NGẮN HƠN, đứng riêng trong modal bước 1 (không lặp lại hai đoạn đầu
  // về giá trị khoá học — khách vừa đọc xong ở cuối trang rồi).
  const DOAN_MOI_DONATE_BUOC1 = '' +
    'Để Khoá học Này luôn luôn Miễn Phí, và để cảm ơn công sức cũng như ủng hộ tác giả ra thêm sản phẩm mới, ' +
    'Duy trì Website, Bạn có thể donate Cho Giảng Viên vài đồng uống cà phê, Bao nhiêu cũng quý, Cảm ơn bạn ' +
    'rất nhiều!';

  // Đứng ở CUỐI module — sau chương/bài cuối cùng, trước thẻ đóng </div> của
  // module. maModule: 'khoa-hoc-mobile' hoặc 'khoa-photoshop'.
  function veKhoiDonateKhoaHoc(maModule){
    return '' +
      '<div class="khoi-mo-ta khoi-noi-bat khoi-donate-loi">' +
        '<p>' + DOAN_CAM_ON_DONATE + '</p>' +
      '</div>' +
      '<button type="button" class="nut nut-la nut-rong" data-hanh-dong="mo-donate" data-module="' +
        escapeHtml(maModule) + '">💛 Donate Cảm ơn - Ủng hộ Tác giả</button>';
  }

  // Nội dung chuyển khoản MẶC ĐỊNH — tối đa ~44 ký tự (còn dư so với trần 50
  // mà khách tự sửa được), tên khoá học rút gọn để chắc chắn không bao giờ
  // chạm trần dù khoá nào.
  function macDinhNoiDungDonate(maModule){
    const ten = TEN_KHOA_HOC_DONATE[maModule] || '';
    return boDauTiengViet('Donate Cam on Khoa hoc ' + ten).slice(0, 50);
  }

  // -------------------------------------------------------------- BƯỚC 1

  function veThanDonateBuoc1(){
    const d = state.donate;
    const coXemTruoc = !!d.soTien;
    return '' +
      '<p>' + DOAN_MOI_DONATE_BUOC1 + '</p>' +
      '<div class="truong">' +
        '<label for="o-donate-so-tien">Số tiền muốn donate (VNĐ)</label>' +
        '<p class="xem-truoc-tien-donate" data-xem-truoc-tien-donate' + (coXemTruoc ? '' : ' style="display:none"') + '>' +
          (coXemTruoc ? escapeHtml('= ' + nhomBaChuSo(d.soTien) + ' đ') : '') +
        '</p>' +
        '<input id="o-donate-so-tien" type="text" inputmode="numeric" data-donate-so-tien autocomplete="off"' +
          ' placeholder="Ví dụ: 20000" value="' + escapeHtml(d.soTien) + '">' +
      '</div>' +
      '<div class="truong">' +
        '<label for="o-donate-noi-dung">Nội dung chuyển khoản</label>' +
        '<input id="o-donate-noi-dung" type="text" maxlength="50" data-donate-noi-dung autocomplete="off"' +
          ' value="' + escapeHtml(d.noiDung) + '">' +
        '<p class="goi-y">Tối đa 50 ký tự, sửa thoải mái — để trống cũng được.</p>' +
      '</div>';
  }

  function moModalDonateBuoc1(maModule){
    if (!TEN_KHOA_HOC_DONATE[maModule]) return;
    const d = state.donate;
    // Mới donate lần đầu, hoặc đổi sang khoá KHÁC — đặt lại nội dung mặc định.
    // Vẫn ở đúng khoá cũ (vd khách "Quay lại bước trước" rồi mở lại) thì giữ
    // nguyên số tiền/nội dung đang gõ dở.
    if (d.module !== maModule) {
      d.module = maModule;
      d.soTien = '';
      d.noiDung = macDinhNoiDungDonate(maModule);
    }
    moModal({
      ma: 'donate-buoc1',
      tieuDe: 'Bạn muốn Donate Cảm ơn - ủng hộ Tác giả bao nhiêu Tiền',
      than: veThanDonateBuoc1(),
      day: '<button type="button" class="nut nut-la" data-hanh-dong="donate-tiep-tuc">Tiếp Tục quá trình Donate</button>'
    });
  }

  // Gõ số tiền: lọc chỉ còn chữ số, trần 11 chữ số (dưới 100 tỷ — đúng yêu
  // cầu "không có 12 con số"), rồi đồng bộ dòng xem trước ngay lập tức.
  function goDonateSoTien(dich){
    const so = dich.value.replace(/\D/g, '').slice(0, 11);
    if (dich.value !== so) dich.value = so;
    state.donate.soTien = so;
    const xemTruoc = document.querySelector('[data-xem-truoc-tien-donate]');
    if (!xemTruoc) return;
    if (!so) { xemTruoc.style.display = 'none'; xemTruoc.textContent = ''; return; }
    xemTruoc.style.display = 'block';
    xemTruoc.textContent = '= ' + nhomBaChuSo(so) + ' đ';
  }

  // Bấm "Quay lại bước trước" ở bảng QR (bước 2) → bước 1.
  //
  // KHÔNG dùng dong-modal thường: modal.than là CHUỖI HTML đông cứng tại thời
  // điểm moModal() được gọi (xem veChongModal(), PHẦN 02) — modal bước 1 vẫn
  // còn nằm DƯỚI bảng QR trong stack, nhưng với giá trị ô nhập ĐÚNG LÚC VỪA
  // MỞ (trước khi khách gõ gì). Lộ lại nó theo cách thường sẽ xoá sạch số
  // tiền/nội dung khách vừa gõ. Bỏ cả hai lớp cũ rồi dựng lại modal bước 1
  // MỚI — state.donate.soTien/noiDung vẫn còn nguyên (cập nhật trực tiếp mỗi
  // lần gõ, không phụ thuộc modal), nên bản dựng lại này đúng với lần gõ gần
  // nhất của khách.
  function donateQuayLaiBuoc1(){
    if (state.modal.length >= 2) {
      state.modal.pop();   // bảng QR
      state.modal.pop();   // bảng bước 1 cũ (đã đông cứng, bỏ đi)
    }
    moModalDonateBuoc1(state.donate.module);
  }

  function donateTiepTuc(){
    if (!state.donate.soTien || Number(state.donate.soTien) <= 0) {
      alert('Vui lòng nhập số tiền muốn donate.');
      return;
    }
    moModalDonateQR();
  }

  // -------------------------------------------------------------- BƯỚC 2

  // Nội dung chuyển khoản THẬT SỰ đưa vào mã QR — LUÔN bỏ dấu + lọc sạch ký
  // tự đặc biệt (kể cả khi khách tự gõ tiếng Việt có dấu vào ô ở bước 1),
  // ngân hàng không chấp nhận những ký tự đó. Trống thì dùng lại mặc định.
  function noiDungDonateSach(){
    const goc = String(state.donate.noiDung || '').trim() || macDinhNoiDungDonate(state.donate.module);
    return boDauTiengViet(goc).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
  }

  function duongDanQRDonate(){
    const tt = state.thongTinCK;
    if (!tt.maNganHang || !tt.soTaiKhoan) return '';
    return 'https://img.vietqr.io/image/' +
      encodeURIComponent(tt.maNganHang) + '-' + encodeURIComponent(tt.soTaiKhoan) + '-compact2.png' +
      '?amount=' + encodeURIComponent(state.donate.soTien) +
      '&addInfo=' + encodeURIComponent(noiDungDonateSach()) +
      '&accountName=' + encodeURIComponent(tt.tenChuTaiKhoan);
  }

  // Y HỆT napAnhQR() (PHẦN 05) — tải ảnh về dạng data URI rồi mới gắn vào
  // trang, tránh ảnh "nhiễm" nguồn gốc khác tên miền. Tách riêng selector
  // (data-o-qr-donate) để không đụng vào mã QR của bảng thanh toán đơn hàng.
  function napAnhQRDonate(){
    const o = document.querySelector('[data-o-qr-donate]');
    if (!o) return;
    const duongDan = duongDanQRDonate();
    if (!duongDan) {
      o.classList.add('trong');
      o.innerHTML = '<div class="dang-tai">Chưa lấy được thông tin ngân hàng nên chưa tạo được mã QR. Bạn vui lòng chuyển khoản thủ công theo các dòng bên dưới.</div>';
      return;
    }
    fetch(duongDan, { mode: 'cors', cache: 'no-store' })
      .then(function(res){
        if (!res.ok) throw new Error('VietQR trả về mã ' + res.status);
        return res.blob();
      })
      .then(function(blob){
        return new Promise(function(thanhCong, thatBai){
          const doc = new FileReader();
          doc.onload = function(){ thanhCong(doc.result); };
          doc.onerror = function(){ thatBai(new Error('Không đọc được ảnh QR')); };
          doc.readAsDataURL(blob);
        });
      })
      .then(function(dataUri){
        const oHienTai = document.querySelector('[data-o-qr-donate]');
        if (!oHienTai) return;
        oHienTai.classList.remove('trong');
        oHienTai.innerHTML = '<img src="' + dataUri + '" alt="Mã QR donate">';
      })
      .catch(function(e){
        console.error('Không tải được ảnh QR donate:', e);
        const oHienTai = document.querySelector('[data-o-qr-donate]');
        if (!oHienTai) return;
        oHienTai.classList.add('trong');
        oHienTai.innerHTML = '<div class="dang-tai">Không tải được mã QR — bạn vui lòng chuyển khoản thủ công theo các dòng bên dưới.</div>';
      });
  }

  function moModalDonateQR(){
    const tt = state.thongTinCK;
    const noiDung = noiDungDonateSach();
    moModal({
      ma: 'donate-qr',
      tieuDe: 'Chuyển khoản Donate',
      than: '' +
        '<div class="khung-qr trong" data-o-qr-donate>' +
          '<div class="dang-tai">Đang tạo mã QR…</div>' +
        '</div>' +
        '<div class="bang-ck">' +
          veDongCK('Ngân hàng', tt.nganHang || 'Chưa lấy được', tt.nganHang, '') +
          veDongCK('Số tài khoản', tt.soTaiKhoan || 'Chưa lấy được', tt.soTaiKhoan, '') +
          veDongCK('Tên chủ tài khoản', tt.tenChuTaiKhoan || 'Chưa lấy được', tt.tenChuTaiKhoan, '') +
          veDongCK('Số tiền', dinhDangTien(Number(state.donate.soTien) || 0), state.donate.soTien, 'tien') +
          veDongCK('Nội dung', noiDung, noiDung, '') +
        '</div>' +
        '<p class="huong-dan-ck">Quét mã QR hoặc chuyển khoản thủ công theo đúng các dòng trên.</p>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="donate-quay-lai-buoc1">Quay lại bước trước</button>' +
        '<button type="button" class="nut nut-la" data-hanh-dong="donate-xac-nhan">Xác nhận đã chuyển khoản Donate xong</button>',
      khiVe: function(){ napAnhQRDonate(); }
    });
  }

  // -------------------------------------------------------------- BƯỚC 3

  // "Tâm thư" cảm ơn — xem thêm ở lời chào cuối, ký tên đúng chất giọng tự
  // xưng "Thành đẹp trai" mà web dùng xuyên suốt (PHẦN "Thông tin giảng viên").
  const TAM_THU_CAM_ON_DONATE = [
    'Mình là Thành — người đứng sau mọi khoá học và sản phẩm trên trang này. Nhận được một khoản donate từ ' +
      'bạn, dù nhiều hay ít, với mình đều là một lời động viên rất thật, giữa hàng chục giờ ngồi quay, dựng, ' +
      'viết bài mà nhiều lúc chẳng biết có ai xem tới cuối hay không.',
    'Bạn vừa giúp mình có thêm một ly cà phê để tỉnh táo làm tiếp, và quan trọng hơn — giúp mình tin rằng ' +
      'những khoá học miễn phí này đang thật sự đến được với người cần nó. Đó là lý do lớn nhất khiến mình ' +
      'giữ chúng miễn phí từ đầu tới giờ, và sẽ tiếp tục giữ như vậy.',
    'Cảm ơn bạn đã dành thời gian học, đã tin tưởng, và giờ là đã nghĩ tới mình theo cách này. Chúc bạn ' +
      'chỉnh được thật nhiều tấm ảnh ưng ý — hẹn gặp bạn ở những bài học tiếp theo.',
    'Thân mến,<br>Thành Đẹp Trai'
  ];

  function donateXacNhan(){
    moModal({
      ma: 'donate-cam-on',
      tieuDe: 'Cảm ơn bạn rất nhiều! 💛',
      than: '<div class="khung-xac-nhan">' +
        TAM_THU_CAM_ON_DONATE.map(function(doan){ return '<p>' + doan + '</p>'; }).join('') +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Quay lại bước trước</button>' +
        '<button type="button" class="nut nut-la" data-hanh-dong="donate-hoan-tat">Hoàn Tất</button>'
    });
  }

  function donateHoanTat(){
    dongHetModal();
    state.donate = { module: '', soTien: '', noiDung: '' };
  }
