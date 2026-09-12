
  /* ===========================================================================
     PHẦN 05 — MODAL THANH TOÁN (mã QR + thông tin chuyển khoản), lưu đơn hàng,
     gắn sự kiện toàn trang và khởi động. Đây là phần CUỐI CÙNG của manifest
     nên hàm bọc (IIFE) đóng ở cuối tệp này.
     =========================================================================== */

  const HTML2CANVAS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const GIAY_DOI_NUT_SAO_CHEP = 4;   // nút "Đã sao chép" giữ màu xanh lá 4 giây

  // ------------------------------------------------- NỘI DUNG CHUYỂN KHOẢN
  //
  // "lr" là ký hiệu để chủ shop tra cứu biến động số dư.
  // Email hiển thị đầy đủ nhưng dấu "@" đổi thành DẤU CÁCH (nhiều ngân hàng
  // không cho ký tự "@" trong nội dung chuyển khoản).
  // Zalo trùng số điện thoại thì chỉ ghi một lần; trường trống thì bỏ qua.

  // Nội dung chuyển khoản = LR21 + dấu cách + mã đơn, viết hoa, đúng 11 ký tự.
  //
  // Trước đây nội dung ghép từ email và số điện thoại của khách nên dài lê thê;
  // ngân hàng cắt bớt là hỏng khâu đối chiếu. Nay chỉ còn một mã ngắn: khách gõ
  // nhanh, ngân hàng không cắt, và máy đọc biến động số dư khớp được chính xác
  // một đơn duy nhất.
  //
  // TIỀN TỐ NÀY PHẢI KHỚP BA NƠI, đổi một nơi mà quên hai nơi kia là đơn của
  // khách rơi vào im lặng:
  //   1. đây — thứ khách chép vào ô nội dung chuyển khoản
  //   2. docMaDonTrongNoiDung() trong apps-script/gui-hang.gs — thứ đọc nó ra
  //   3. ô Keyword của app Checkout (checkout.vn) — bộ lọc quyết định tin nhắn
  //      nào được đẩy sang script. Để 'LR' ở đó vẫn khớp 'LR21' vì nó so khớp
  //      chuỗi con, nên không bắt buộc sửa; nhưng biết là nó có ở đó.
  // Hợp đồng regex canh mục 1 và 2 luôn cùng một chuỗi.
  function taoNoiDungCK(){
    return TIEN_TO_CK + ' ' + (state.maDonNgan || '');
  }

  // Vân tay của đơn: đổi món hoặc đổi thông tin liên hệ thì đây là đơn khác,
  // phải mang mã khác. Bấm tới bấm lui mà không sửa gì thì vẫn là đơn cũ.
  function chuKyDon(){
    const kh = state.khachHang;
    return sanPhamDaChon().map(function(sp){ return sp.ma; }).join(',') +
      '|' + kh.email + '|' + kh.zalo + '|' + kh.dienThoai +
      '|' + kh.whatsapp + '|' + kh.telegram + '|' + tinhTien().thanhTien;
  }

  // ------------------------------------------- ĐỌC THÔNG TIN CHUYỂN KHOẢN
  //
  // Số tài khoản KHÔNG nằm trong mã nguồn: web đọc từ nhánh /thongtinthanhtoan
  // của Realtime Database lúc chạy. Đọc hỏng thì vẫn hiện modal, chỉ báo là
  // chưa lấy được thông tin.

  function taiThongTinCK(){
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    return rtdb.ref('thongtinthanhtoan').once('value').then(function(anh){
      const du = anh && anh.val();
      if (!du) return false;
      state.thongTinCK = {
        nganHang: String(du.nganHang || ''),
        maNganHang: String(du.maNganHang || ''),
        soTaiKhoan: String(du.soTaiKhoan || ''),
        tenChuTaiKhoan: String(du.tenChuTaiKhoan || '')
      };
      state.daTaiThongTinCK = true;
      return true;
    }).catch(function(e){
      console.error('Không đọc được thông tin chuyển khoản từ Firebase:', e);
      return false;
    });
  }

  // Số Zalo của shop nằm ở nhánh /thongtinlienhe trong Realtime Database, KHÔNG
  // nằm trong mã nguồn — hệt cách giấu số tài khoản. Người tải mã nguồn về máy
  // sẽ chỉ thấy tên nhánh, không thấy con số.
  function taiThongTinLienHe(){
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    return rtdb.ref('thongtinlienhe').once('value').then(function(anh){
      const du = anh && anh.val();
      if (!du) return false;
      state.zaloShop = String(du.zalo || '').replace(/\D/g, '');
      return !!state.zaloShop;
    }).catch(function(e){
      console.error('Không đọc được thông tin liên hệ từ Firebase:', e);
      return false;
    });
  }

  // Bấm "Liên hệ Zalo": dựng địa chỉ NGAY LÚC BẤM từ con số vừa đọc được, rồi
  // mở tab mới. Không dựng sẵn thẻ <a href> vì làm vậy là in thẳng số Zalo vào
  // HTML của trang.
  function moZaloShop(){
    const so = String(state.zaloShop || '').replace(/\D/g, '');
    if (!so) {
      // Chưa đọc được (mất mạng, hoặc chưa dán dữ liệu vào Firebase): thử lại
      // một lần rồi mới báo, thay vì im lặng không làm gì.
      taiThongTinLienHe().then(function(duoc){
        if (duoc) moZaloShop();
        else alert('Chưa lấy được thông tin liên hệ. Vui lòng kiểm tra kết nối mạng rồi thử lại.');
      });
      return;
    }
    window.open('https://zalo.me/' + so, '_blank', 'noopener,noreferrer');
  }

  // ------------------------------------------------------------ LƯU ĐƠN HÀNG

  function luuDonHang(){
    if (!firebaseSanSang || !rtdb) return Promise.resolve(null);
    const t = tinhTien();
    const kh = state.khachHang;
    const ref = rtdb.ref('donhang').push();
    return ref.set({
      sanPham: sanPhamDaChon().map(function(sp){ return sp.ten + ' — ' + dinhDangTien(sp.giaChot); }),
      // Mã sản phẩm để máy đọc. Chuỗi 'sanPham' ở trên là để NGƯỜI đọc; khâu
      // gửi hàng tự động cần đúng mã mới tra ra được đường tải của từng món.
      maSanPham: sanPhamDaChon().map(function(sp){ return sp.ma; }),
      // Trạng thái là thứ khâu gửi hàng tự động lọc theo, nên chỉ có một giá trị
      // tại một thời điểm:
      //   'moi'        — khách vừa bấm Tiến hành thanh toán, chưa nói gì thêm
      //   'khachBao'   — khách tự bấm "Đã thanh toán". LỜI KHAI, không phải
      //                  bằng chứng. Bộ gửi hàng KHÔNG đụng tới trạng thái này.
      //   'daXacNhan'  — ngân hàng đã báo có đủ tiền. CHỈ hàm nhận báo có trong
      //                  apps-script/gui-hang.gs được đặt trạng thái này.
      //   'daGui'      — đã gửi hàng cho khách
      //   'canXemTay'  — không gửi tự động được, chủ shop phải xử lý
      // Nhờ vậy hàng chờ gửi luôn là một danh sách NGẮN, không phải quét cả kho.
      trangThai: 'moi',
      tongTien: t.tongTien,
      phanTramGiam: t.phanTramGiam,
      thanhTien: t.thanhTien,
      email: kh.email,
      zalo: kh.zalo,
      dienThoai: kh.dienThoai,
      whatsapp: kh.whatsapp,
      telegram: kh.telegram,
      noiDungCK: taoNoiDungCK(),
      maDon: state.maDonNgan,
      taoLuc: Date.now(),
      daXacNhan: false
    }).then(function(){
      state.maDonHienTai = ref.key;
      return ref.key;
    }).catch(function(e){
      console.error('Không lưu được đơn hàng (khách vẫn thanh toán bình thường):', e);
      return null;
    });
  }

  // Khách bấm "Đã thanh toán thành công" thì đơn sang 'khachBao', KHÔNG phải
  // 'daXacNhan'.
  //
  // ĐÂY LÀ RANH GIỚI GIỮ CẢ KHO HÀNG. Bộ gửi hàng tự động chỉ quét đúng trạng
  // thái 'daXacNhan', và chỉ MỘT nơi được phép đặt trạng thái đó: hàm nhận báo
  // có từ ngân hàng trong apps-script/gui-hang.gs. Nếu cú bấm của khách cũng
  // đặt 'daXacNhan' — như mã cũ từng làm — thì bất kỳ ai mở trang, chọn hàng,
  // bấm "đã thanh toán" mà không chuyển một đồng nào cũng nhận được sản phẩm
  // trong vòng một phút.
  //
  // Cú bấm này chỉ là lời khách tự khai, để chủ shop dễ tra khi đối chiếu.
  function danhDauDaThanhToan(){
    if (!firebaseSanSang || !rtdb || !state.maDonHienTai) return Promise.resolve();
    return rtdb.ref('donhang/' + state.maDonHienTai)
      .update({ daXacNhan: true, trangThai: 'khachBao', xacNhanLuc: Date.now() })
      .catch(function(e){ console.error('Không cập nhật được trạng thái đơn hàng:', e); });
  }

  // ----------------------------------------------------------------- MÃ QR
  //
  // Dùng dịch vụ VietQR: mã QR đã nhúng sẵn số tiền và nội dung chuyển khoản
  // nên khách quét là ra đúng số, không phải gõ tay.

  function duongDanQR(){
    const tt = state.thongTinCK;
    if (!tt.maNganHang || !tt.soTaiKhoan) return '';
    const t = tinhTien();
    return 'https://img.vietqr.io/image/' +
      encodeURIComponent(tt.maNganHang) + '-' + encodeURIComponent(tt.soTaiKhoan) + '-compact2.png' +
      '?amount=' + encodeURIComponent(String(t.thanhTien)) +
      '&addInfo=' + encodeURIComponent(taoNoiDungCK()) +
      '&accountName=' + encodeURIComponent(tt.tenChuTaiKhoan);
  }

  // Ô cảnh báo trong modal thanh toán để trống và ẩn hẳn cho tới khi có việc
  // cần báo — tránh chừa một khung rỗng giữa modal.
  function hienCanhBaoQR(loiNhan){
    const o = document.querySelector('[data-loi-qr]');
    if (!o) return;
    o.textContent = loiNhan;
    o.style.display = loiNhan ? 'block' : 'none';
  }

  // Tải ảnh QR về dạng dữ liệu nhúng (data URI) rồi mới gắn vào trang. Làm vậy
  // để nút "Tải mã QR" chụp được cả modal: ảnh lấy thẳng từ tên miền khác sẽ
  // "nhiễm" canvas và trình duyệt từ chối xuất ảnh.
  function napAnhQR(){
    const o = document.querySelector('[data-o-qr]');
    if (!o) return;
    const duongDan = duongDanQR();
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
        const oHienTai = document.querySelector('[data-o-qr]');
        if (!oHienTai) return;
        oHienTai.classList.remove('trong');
        oHienTai.innerHTML = '<img src="' + dataUri + '" alt="Mã QR chuyển khoản">';
      })
      .catch(function(e){
        console.error('Không nạp được mã QR:', e);
        const oHienTai = document.querySelector('[data-o-qr]');
        if (!oHienTai) return;
        // Vẫn hiện được mã QR bằng cách trỏ thẳng tới ảnh; chỉ mất khả năng
        // chụp ảnh cả modal, nên báo trước cho khách biết.
        oHienTai.classList.remove('trong');
        oHienTai.innerHTML = '<img src="' + escapeHtml(duongDanQR()) + '" alt="Mã QR chuyển khoản" crossorigin="anonymous">';
        hienCanhBaoQR('Mã QR tải theo cách dự phòng — nếu nút tải ảnh không chạy, bạn hãy chụp màn hình giúp shop.');
      });
  }

  // ------------------------------------------------------------- SAO CHÉP

  function saoChep(chuoi){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(chuoi);
    }
    // Dự phòng cho trình duyệt cũ hoặc trang không chạy trên HTTPS.
    return new Promise(function(thanhCong, thatBai){
      try {
        const o = document.createElement('textarea');
        o.value = chuoi;
        o.setAttribute('readonly', '');
        o.style.position = 'fixed';
        o.style.left = '-9999px';
        document.body.appendChild(o);
        o.select();
        document.execCommand('copy');
        document.body.removeChild(o);
        thanhCong();
      } catch (e) {
        thatBai(e);
      }
    });
  }

  function xuLySaoChep(nut){
    const chuoi = nut.getAttribute('data-chuoi') || '';
    if (!chuoi) return;
    saoChep(chuoi).then(function(){
      if (nut.getAttribute('data-dang-doi') === '1') return;
      const chuGoc = nut.textContent;
      nut.setAttribute('data-dang-doi', '1');
      nut.textContent = 'Đã sao chép';
      nut.classList.add('da-chep');
      setTimeout(function(){
        nut.textContent = chuGoc;
        nut.classList.remove('da-chep');
        nut.removeAttribute('data-dang-doi');
      }, GIAY_DOI_NUT_SAO_CHEP * 1000);
    }).catch(function(e){
      console.error('Không sao chép được:', e);
      nut.textContent = 'Hãy chép tay';
    });
  }

  // --------------------------------------------- TẢI ẢNH TOÀN BỘ MODAL VỀ MÁY

  function napHtml2Canvas(){
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise(function(thanhCong, thatBai){
      const the = document.createElement('script');
      the.src = HTML2CANVAS_CDN;
      the.onload = function(){
        if (window.html2canvas) thanhCong(window.html2canvas);
        else thatBai(new Error('html2canvas nạp xong nhưng không dùng được'));
      };
      the.onerror = function(){ thatBai(new Error('Không tải được html2canvas')); };
      document.head.appendChild(the);
    });
  }

  // Yêu cầu: bấm "Tải mã QR" thì chụp ẢNH TOÀN BỘ MODAL này về máy, chứ không
  // riêng ô mã QR — để khách có luôn cả số tài khoản, số tiền và nội dung.
  // Dựng một tấm phiếu RIÊNG để chụp, thay vì chụp thẳng bảng đang hiện.
  // Cách này lấy theo đúng lối làm ở biên lai Sổ tay Hội Nông dân, và hơn hẳn
  // việc chụp nguyên bảng: nền trắng nên in ra hoặc gửi Zalo đều rõ, không dính
  // các nút bấm vô nghĩa trong ảnh, và bề ngang cố định nên ảnh trên điện thoại
  // với trên máy tính giống hệt nhau.
  function dungPhieuDeChup(){
    const t = tinhTien();
    const tt = state.thongTinCK;
    const noiDung = taoNoiDungCK();
    const anhQR = document.querySelector('[data-o-qr] img');

    const dong = function(nhan, giaTri, dam){
      return '<tr>' +
        '<td style="padding:7px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top">' + escapeHtml(nhan) + '</td>' +
        '<td style="padding:7px 0 7px 14px;color:#111;font-size:13px;font-weight:' + (dam ? '800' : '600') +
          ';text-align:right;word-break:break-word' + (dam ? ';color:#b35c00' : '') + '">' + escapeHtml(giaTri) + '</td>' +
        '</tr>';
    };

    const phieu = document.createElement('div');
    phieu.style.cssText = 'position:fixed; left:-9999px; top:0; width:440px; padding:22px 24px; ' +
      'background:#fff; color:#111; font-family:inherit;';
    phieu.innerHTML =
      '<div style="font-size:17px;font-weight:800;color:#111">Shop Thànhđẹptrai.vn</div>' +
      '<div style="height:2px;width:44px;background:#1473e6;border-radius:1px;margin:7px 0 14px"></div>' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:12px">Thông tin thanh toán đơn hàng</div>' +
      (anhQR ? '<img src="' + anhQR.getAttribute('src') + '" alt="" style="width:200px;height:200px;display:block;margin:0 auto 14px">' : '') +
      '<table style="width:100%;border-collapse:collapse;border-top:1px solid #e3e6ea">' +
        dong('Ngân hàng', tt.nganHang || '—') +
        dong('Số tài khoản', tt.soTaiKhoan || '—') +
        dong('Tên chủ tài khoản', tt.tenChuTaiKhoan || '—') +
        dong('Số tiền', dinhDangTien(t.thanhTien), true) +
        dong('Nội dung', noiDung) +
      '</table>' +
      '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #e3e6ea;font-size:11.5px;color:#666;line-height:1.5">' +
        'Giữ nguyên phần Nội dung khi chuyển khoản để shop đối chiếu và giao hàng nhanh nhất.' +
      '</div>';
    return phieu;
  }

  function taiAnhModalThanhToan(nut){
    const chuGoc = nut.textContent;
    nut.textContent = 'Đang tạo ảnh…';
    nut.disabled = true;
    let phieu = null;
    napHtml2Canvas().then(function(html2canvas){
      phieu = dungPhieuDeChup();
      document.body.appendChild(phieu);
      return html2canvas(phieu, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    }).then(function(canvas){
      const lien = document.createElement('a');
      lien.href = canvas.toDataURL('image/png');
      lien.download = 'thanh-toan-thanhdeptrai-' + Date.now() + '.png';
      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);
      if (phieu) phieu.remove();
      nut.textContent = chuGoc;
      nut.disabled = false;
    }).catch(function(e){
      console.error('Không tạo được ảnh:', e);
      if (phieu) phieu.remove();
      nut.textContent = chuGoc;
      nut.disabled = false;
      hienCanhBaoQR('Không tạo được ảnh trên thiết bị này — bạn vui lòng chụp màn hình giúp shop.');
    });
  }

  // ------------------------------------------------- MODAL THANH TOÁN (VẼ)

  function veDongCK(nhan, giaTri, chuoiChep, lopThem){
    const coChuoi = !!chuoiChep;
    return '' +
      '<div class="dong-ck">' +
        '<div class="noi-dung-dong">' +
          '<span class="nhan">' + escapeHtml(nhan) + '</span>' +
          '<span class="tri' + (lopThem ? ' ' + lopThem : '') + '">' + escapeHtml(giaTri) + '</span>' +
        '</div>' +
        (coChuoi
          ? '<button type="button" class="nut nut-nho nut-vien nut-sao-chep" data-hanh-dong="sao-chep" data-chuoi="' + escapeHtml(chuoiChep) + '">Sao chép</button>'
          : '') +
      '</div>';
  }

  function veThanThanhToan(){
    const t = tinhTien();
    const tt = state.thongTinCK;
    const noiDung = taoNoiDungCK();
    return '' +
      '<div class="khung-qr trong" data-o-qr>' +
        '<div class="dang-tai">Đang tạo mã QR…</div>' +
      '</div>' +
      '<button type="button" class="nut nut-vien nut-tai-qr" data-hanh-dong="tai-anh-qr">⬇ Tải ảnh QR về máy</button>' +
      '<div class="bang-ck">' +
        veDongCK('Ngân hàng', tt.nganHang || 'Chưa lấy được', tt.nganHang, '') +
        veDongCK('Số tài khoản', tt.soTaiKhoan || 'Chưa lấy được', tt.soTaiKhoan, '') +
        veDongCK('Tên chủ tài khoản', tt.tenChuTaiKhoan || 'Chưa lấy được', tt.tenChuTaiKhoan, '') +
        veDongCK('Số tiền', dinhDangTien(t.thanhTien), String(t.thanhTien), 'tien') +
        veDongCK('Nội dung', noiDung, noiDung, '') +
      '</div>' +
      '<p class="loi-nhe" data-loi-qr style="display:none"></p>' +
      '<p class="huong-dan-ck">Quét mã QR hoặc chuyển khoản thủ công theo đúng các dòng trên. ' +
        'Giữ nguyên phần <strong>Nội dung</strong> để shop đối chiếu và giao hàng nhanh nhất.</p>';
  }

  function moModalThanhToan(){
    const ketQua = kiemTraKhachHang();
    if (!ketQua.hopLe || !state.daChon.length) return;

    // Sinh mã đơn TRƯỚC khi dựng bảng: cả nội dung chuyển khoản lẫn mã QR đều
    // lấy từ nó, mà hai thứ đó phải có ngay chứ không đợi được Firebase trả lời.
    //
    // Nhưng chỉ sinh mã MỚI khi đơn thật sự khác đơn vừa rồi. Khách hay bấm
    // "Quay lại bước trước" để xem lại rồi bấm tiếp; nếu lần nào cũng sinh mã
    // mới thì Firebase đầy đơn trùng, và tệ hơn: người đã kịp quét mã QR cũ sẽ
    // chuyển tiền với nội dung không còn khớp đơn nào.
    const chuKy = chuKyDon();
    if (!state.maDonNgan || state.chuKyDon !== chuKy) {
      state.maDonNgan = sinhMaDon();
      state.chuKyDon = chuKy;
      state.maDonHienTai = null;
      luuDonHang();
    }

    moModal({
      ma: 'thanh-toan',
      tieuDe: 'Thanh toán đơn hàng',
      than: veThanThanhToan(),
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Quay lại bước trước</button>' +
        '<button type="button" class="nut nut-la" data-hanh-dong="xac-nhan-thanh-toan">Xác nhận đã thanh toán thành công</button>',
      khiVe: function(){ napAnhQR(); }
    });
  }

  // Bấm "Xác nhận đã thanh toán thành công" ở bảng QR: mở thêm một bảng nữa.
  //
  // ĐỌC KỸ CHỖ NÀY — nó hay bị hiểu nhầm:
  // Bảng này KHÔNG phải cái công tắc gửi hàng. Đơn hàng đã được tạo từ lúc mã QR
  // hiện ra lần đầu và đang nằm chờ trong hệ thống. Thứ thật sự kích hoạt gửi
  // hàng là app đọc biến động số dư báo về rằng TIỀN ĐÃ VÀO TÀI KHOẢN — khách
  // không bấm nút nào thì vẫn nhận được hàng.
  //
  // Vậy bảng này để làm gì? Để khách biết điều gì sắp xảy ra và bằng đường nào,
  // thay vì bấm xong rồi ngồi đoán. Đó là lý do lời văn ở đây nói về việc "khi
  // shop nhận được tiền" chứ không nói "sau khi bạn bấm".
  // Những kênh khách THẬT SỰ để lại, kèm tên gọi khách hiểu được. Trước đây
  // chỗ này chỉ biết Zalo và điện thoại, nên khách chỉ điền WhatsApp là câu
  // trấn an in ra "nhắn tới số " rồi bỏ lửng — vừa sai vừa làm khách hoang mang
  // đúng lúc họ vừa chuyển tiền xong.
  //
  // Điện thoại trùng số Zalo thì chỉ kể một lần: hai dòng cùng một con số làm
  // khách tưởng mình gõ nhầm ở đâu đó.
  function kenhLienHeCuaKhach(kh){
    const kenh = [];
    if (kh.zalo) kenh.push({ ten: 'Zalo', so: kh.zalo });
    if (kh.dienThoai && kh.dienThoai !== kh.zalo) kenh.push({ ten: 'tin nhắn SMS', so: kh.dienThoai });
    if (kh.whatsapp) kenh.push({ ten: 'WhatsApp', so: kh.whatsapp });
    if (kh.telegram) kenh.push({ ten: 'Telegram', so: kh.telegram });
    return kenh;
  }

  // "Zalo 090…", "Zalo 090… và WhatsApp 091…", "Zalo 090…, WhatsApp 091… và
  // Telegram 092…" — dấu phẩy cho các mục giữa, chữ "và" cho mục cuối.
  function keTenKenh(kenh){
    const chu = kenh.map(function(k){
      return '<strong>' + escapeHtml(k.ten) + '</strong> ' + escapeHtml(k.so);
    });
    if (chu.length === 1) return chu[0];
    return chu.slice(0, -1).join(', ') + ' và ' + chu[chu.length - 1];
  }

  function xacNhanThanhToan(){
    const kh = state.khachHang;
    const kenh = kenhLienHeCuaKhach(kh);
    moModal({
      ma: 'xac-nhan-lan-hai',
      tieuDe: 'Đơn hàng đã được ghi nhận',
      than: '' +
        '<div class="khung-xac-nhan">' +
          '<p class="cau-hoi">Đơn của bạn <strong>đã nằm trong hệ thống</strong> và đang chờ tiền về. ' +
            'Bạn không cần làm gì thêm.</p>' +
          '<div class="dong-ma-don">' +
            '<span class="nhan">Nội dung chuyển khoản của đơn này</span>' +
            '<span class="ma">' + escapeHtml(taoNoiDungCK()) + '</span>' +
          '</div>' +
          '<p class="ghi-chu-gui">' +
            '⚡ <strong>Ngay khi shop nhận được tiền</strong>, hệ thống tự động gửi sản phẩm cho bạn' +
            (kh.email
              ? ' qua email <strong>' + escapeHtml(kh.email) + '</strong> — thường chỉ trong ít phút. ' +
                'Nếu chưa thấy thư, xin xem cả hộp thư rác.'
              : '.') +
          '</p>' +
          (kh.email
            ? (kenh.length
                ? '<p class="ghi-chu-gui">📱 Nếu email trục trặc, shop vẫn tìm bạn bằng ' +
                  '<strong>mọi cách bạn đã để lại</strong>: ' + keTenKenh(kenh) +
                  '. Bạn sẽ không bị bỏ sót.</p>'
                : '<p class="ghi-chu-gui">📧 Bạn để lại email nên sản phẩm sẽ tới thẳng hộp thư đó. ' +
                  'Nếu quá lâu chưa thấy, nhắn cho shop kèm nội dung chuyển khoản ở trên.</p>')
            : (kenh.length
                ? '<p class="ghi-chu-gui canh-bao">⚠️ Bạn <strong>chưa để lại email</strong> nên hệ thống ' +
                  'không gửi tự động được. Shop sẽ chủ động nhắn cho bạn qua ' + keTenKenh(kenh) +
                  ' để giao sản phẩm, xin chờ ít phút.</p>'
                : '<p class="ghi-chu-gui canh-bao">⚠️ Shop chưa có cách nào liên hệ với bạn. ' +
                  'Hãy nhắn cho shop kèm nội dung chuyển khoản ở trên để nhận sản phẩm.</p>')) +
          // Câu này LUÔN LUÔN xuất hiện, bất kể khách để lại kênh nào — trấn
          // an rằng dù mọi cách khác trục trặc, vẫn còn một cửa cuối cùng.
          '<p class="ghi-chu-gui">☎️ Nếu vẫn chưa liên lạc được, shop sẽ nhắn tin SMS qua số điện thoại ' +
            '(cách liên hệ cuối cùng).</p>' +
          '<p class="nhac-nho">Nếu chuyển tiền rồi mà quá lâu chưa thấy hồi âm, nhắn cho shop kèm ' +
            'nội dung chuyển khoản ở trên — shop tra ra đơn ngay.</p>' +
          // Đường thoát cho khách đang sốt ruột. Mở đúng bảng "Liên hệ và
          // Thông tin về Shop" ở menu trái, chồng lên bảng này — đóng nó ra là
          // khách trở lại đúng chỗ đang đứng, không mất nội dung chuyển khoản.
          '<button type="button" class="nut nut-vien nut-rong nut-goi-shop" ' +
            'data-hanh-dong="mo-module" data-module="lien-he">' +
            'Nếu bạn Gặp trục trặc hoặc muốn nhận sản phẩm ngay lập tức: ' +
            'Bấm vào đây để liên hệ với shop</button>' +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="dong-modal">Quay lại mã QR</button>' +
        '<button type="button" class="nut nut-la" data-hanh-dong="chot-don">Tôi đã hiểu</button>'
    });
  }

  // Bấm "Tôi đã hiểu": đánh dấu là khách tự báo đã chuyển tiền, rồi đóng hết
  // bảng. Đây chỉ là ghi chú cho chủ shop dễ tra, KHÔNG phải bằng chứng tiền đã
  // về — chuyện đó do app đọc biến động số dư xác nhận.
  function chotDon(){
    danhDauDaThanhToan();
    dongHetModal();
    state.maDonHienTai = null;
    state.maDonNgan = '';
    state.chuKyDon = '';
  }

  // ------------------------------------------------------- GẮN SỰ KIỆN CHUNG

  function xuLyBamChuot(su){
    const dich = su.target;
    if (!dich || !dich.closest) return;

    const nutHanhDong = dich.closest('[data-hanh-dong]');
    if (!nutHanhDong) return;
    const hanhDong = nutHanhDong.getAttribute('data-hanh-dong');

    // Lớp phủ của menu: bấm ra ngoài menu thì menu tự ẩn.
    if (hanhDong === 'dong-menu') { dongMenu(); return; }

    if (hanhDong === 'doi-menu') { doiMenu(); return; }
    if (hanhDong === 'mo-module') { moModule(nutHanhDong.getAttribute('data-module')); return; }
    if (hanhDong === 'chon-san-pham') { chonSanPham(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'xem-chi-tiet') { moModalChiTietSanPham(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'chon-tu-chi-tiet') { chonTuBangChiTiet(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'vao-hoc-ngay') { vaoHocNgay(nutHanhDong.getAttribute('data-module')); return; }
    if (hanhDong === 'lien-he-zalo') { moZaloShop(); return; }
    if (hanhDong === 'chon-tat-ca') { chonTatCa(); return; }
    if (hanhDong === 'xuong-qua-tang') { xuongKhuQuaTang(); return; }
    if (hanhDong === 'cuon-len-dau') { cuonLenDauTrang(); return; }
    if (hanhDong === 'mua-hang') { moModalDonHang(); return; }
    if (hanhDong === 'dong-modal') { dongModal(); return; }
    if (hanhDong === 'tien-hanh-thanh-toan') { moModalThanhToan(); return; }
    if (hanhDong === 'sao-chep') { xuLySaoChep(nutHanhDong); return; }
    if (hanhDong === 'tai-anh-qr') { taiAnhModalThanhToan(nutHanhDong); return; }
    if (hanhDong === 'xac-nhan-thanh-toan') { xacNhanThanhToan(); return; }
    if (hanhDong === 'chot-don') { chotDon(); return; }
    if (hanhDong === 'su-dung-san-pham') { moModalNhanHang(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'xem-huong-dan') { moModalHuongDan(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'video-toan-man-hinh') { videoToanManHinh(nutHanhDong.getAttribute('data-khung')); return; }
    if (hanhDong === 'admin-xem-truoc-video') { adminXemTruocVideo(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'xac-nhan-tai') { xacNhanTai(nutHanhDong.getAttribute('data-dong')); return; }
    if (hanhDong === 've-trang-mua-hang') { veTrangChinh(); render(); return; }
    if (hanhDong === 'admin-dang-nhap') { dangNhapGoogle(); return; }
    if (hanhDong === 'admin-dang-xuat') { dangXuat(); return; }
    if (hanhDong === 'admin-mo-module') { adminMoModule(nutHanhDong.getAttribute('data-module')); return; }
    if (hanhDong === 'admin-doi-menu') { doiMenuAdmin(); return; }
    if (hanhDong === 'admin-dong-menu') { dongMenuAdmin(); return; }
    if (hanhDong === 'admin-hien-bi-mat') { adminHienBiMat(nutHanhDong.getAttribute('data-o')); return; }
    if (hanhDong === 'admin-luu-o') { adminLuuO(nutHanhDong.getAttribute('data-o')); return; }
    if (hanhDong === 'admin-doi-nguon') {
      adminDoiNguon(nutHanhDong.getAttribute('data-ma'), nutHanhDong.getAttribute('data-nguon'));
      return;
    }
    if (hanhDong === 'admin-them-tep') { adminThemTep(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'admin-xoa-tep') {
      adminXoaTep(nutHanhDong.getAttribute('data-ma'), nutHanhDong.getAttribute('data-dong'));
      return;
    }
    if (hanhDong === 'admin-luu-dm') { adminLuuDanhMuc(nutHanhDong.getAttribute('data-ma')); return; }
    if (hanhDong === 'chuong-doi') { doiChuongKhoaHoc(nutHanhDong.getAttribute('data-id')); return; }
    if (hanhDong === 'mo-bai-hoc') { moModalBaiHoc(nutHanhDong.getAttribute('data-id')); return; }
    if (hanhDong === 'bai-hoc-chuyen') {
      chuyenBaiHoc(nutHanhDong.getAttribute('data-id'), nutHanhDong.getAttribute('data-huong'));
      return;
    }
    if (hanhDong === 'kh-them-bai') { adminKhThemBai(); return; }
    if (hanhDong === 'kh-them-chuong') { adminKhThemChuong(); return; }
    if (hanhDong === 'kh-xoa') { adminKhXoaDong(nutHanhDong.getAttribute('data-dong')); return; }
    if (hanhDong === 'kh-len') { adminKhDoiCho(nutHanhDong.getAttribute('data-dong'), -1); return; }
    if (hanhDong === 'kh-xuong') { adminKhDoiCho(nutHanhDong.getAttribute('data-dong'), 1); return; }
    if (hanhDong === 'kh-xem-truoc') { adminKhXemTruocVideo(nutHanhDong.getAttribute('data-id')); return; }
    if (hanhDong === 'kh-luu-tat-ca') { adminKhLuuTatCa(); return; }
    if (hanhDong === 'chuong-doi-pc') { doiChuongKhoaHocMayTinh(nutHanhDong.getAttribute('data-id')); return; }
    if (hanhDong === 'mo-bai-hoc-pc') { moModalBaiHocMayTinh(nutHanhDong.getAttribute('data-id')); return; }
    if (hanhDong === 'bai-hoc-chuyen-pc') {
      chuyenBaiHocMayTinh(nutHanhDong.getAttribute('data-id'), nutHanhDong.getAttribute('data-huong'));
      return;
    }
    if (hanhDong === 'khpc-them-bai') { adminKhpcThemBai(); return; }
    if (hanhDong === 'khpc-them-chuong') { adminKhpcThemChuong(); return; }
    if (hanhDong === 'khpc-xoa') { adminKhpcXoaDong(nutHanhDong.getAttribute('data-dong')); return; }
    if (hanhDong === 'khpc-len') { adminKhpcDoiCho(nutHanhDong.getAttribute('data-dong'), -1); return; }
    if (hanhDong === 'khpc-xuong') { adminKhpcDoiCho(nutHanhDong.getAttribute('data-dong'), 1); return; }
    if (hanhDong === 'khpc-xem-truoc') { adminKhpcXemTruocVideo(nutHanhDong.getAttribute('data-id')); return; }
    if (hanhDong === 'khpc-luu-tat-ca') { adminKhpcLuuTatCa(); return; }
    if (hanhDong === 'admin-don-loc') { adminDonDoiLoc(nutHanhDong.getAttribute('data-loc')); return; }
    if (hanhDong === 'admin-don-tai-lai') { adminDonTaiLai(); return; }
    if (hanhDong === 'admin-don-trang-thai') {
      adminDonDoiTrangThai(nutHanhDong.getAttribute('data-khoa'), nutHanhDong.getAttribute('data-tri'));
      return;
    }
    if (hanhDong === 'admin-don-tao-ma') { adminDonTaoMa(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-xoa') { adminDonXoa(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-gui-email') { adminDonGuiEmail(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-mau-tin') { adminDonXemMauTin(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-phe-duyet') { adminDonPheDuyet(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-thiet-bi') { adminDonXemThietBi(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-dong-thiet-bi') { adminDonDongThietBi(nutHanhDong.getAttribute('data-khoa')); return; }
    if (hanhDong === 'admin-don-mo-khoa') {
      adminDonMoKhoa(nutHanhDong.getAttribute('data-khoa'), nutHanhDong.getAttribute('data-sp'));
      return;
    }
  }

  function xuLyGoPhim(su){
    const dich = su.target;
    if (!dich || !dich.getAttribute) return;
    if (adminGoDanhMuc(dich)) return;
    if (adminGoKhoaHoc(dich)) return;
    if (adminGoKhoaHocMayTinh(dich)) return;
    if (adminDonGoTim(dich)) return;
    const ten = dich.getAttribute('data-truong');
    if (!ten) return;
    capNhatTruong(ten, dich.value);
  }

  function xuLyPhimEsc(su){
    if (su.key !== 'Escape') return;
    if (state.modal.length) dongModal();
    else if (state.menuMo) dongMenu();
    else if (state.admin.menuMo) dongMenuAdmin();
  }

  function ganSuKien(){
    document.addEventListener('click', xuLyBamChuot);
    document.addEventListener('input', xuLyGoPhim);
    document.addEventListener('keydown', xuLyPhimEsc);
    // Xoay ngang máy hay đổi cỡ cửa sổ làm thanh neo đáy cao thấp khác đi —
    // đo lại để phần cuối trang không bị thanh che.
    window.addEventListener('resize', doChoThanhDay);
    window.addEventListener('hashchange', function(){
      if (state.trang !== 'chinh') return;
      const ma = docHash();
      if (ma === state.module) return;
      state.module = ma;
      state.hieuUngVaoModule = true;   // quay lại bằng nút Back cũng trôi lại
      render();
    });
    // Nút Back / Forward của trình duyệt: đường dẫn đổi thì trang đổi theo.
    // Có nút này thì khách từ trang nhận hàng bấm vào một module rồi bấm Back
    // là quay đúng về "/sanpham", chứ không mắc kẹt ở trang bán hàng.
    //
    // CHỈ xử lý khi ĐƯỜNG DẪN thật sự đổi. Chrome bắn popstate cả khi chỉ có
    // #hash đổi, mà việc đó đã có hashchange lo rồi — vẽ lại lần thứ hai là
    // xoá sạch hiệu ứng trôi vừa mới gắn xong, cả lưới đứng im.
    window.addEventListener('popstate', function(){
      const trang = docDuongDan();
      if (trang === state.trang) return;
      state.trang = trang;
      state.module = docHash();
      state.hieuUngVaoModule = true;
      dongHetModal();
      render();
      if (trang === 'admin') chuanBiAdmin();
      if (trang === 'sanpham') moTrangNhanHang();
    });
  }

  // ------------------------------------------------------------- KHỞI ĐỘNG

  function boot(){
    state.trang = docDuongDan();
    state.nhanHang.maNhanHang = docMaNhanHangTrenDuongDan();
    state.module = docHash();
    state.hieuUngVaoModule = true;   // lần mở trang đầu tiên cũng có hiệu ứng trôi
    ganSuKien();
    theoDoiNutCuonModal();   // mọi bảng phụ, kể cả bảng viết sau này, tự có 2 nút cuộn
    render();
    doChoThanhDay();
    // Nạp trước thông tin chuyển khoản để lúc khách mở modal thanh toán là có
    // sẵn. Hỏng thì bỏ qua — modal vẫn mở được, chỉ báo chưa lấy được thông tin.
    taiThongTinCK();
    taiThongTinLienHe();
    // Địa chỉ máy chủ cấp phát chỉ cần ở trang nhận hàng — trang bán hàng
    // không hỏi tới nên không phải tải.
    if (state.trang === 'sanpham') moTrangNhanHang();
    // Trang quản trị nạp SDK đăng nhập và CSS riêng của nó — chỉ ở đây, để
    // khách mua hàng không phải tải một byte nào của phần quản trị.
    if (state.trang === 'admin') chuanBiAdmin();
  }

