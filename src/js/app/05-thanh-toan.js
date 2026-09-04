
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

  function taoNoiDungCK(){
    const kh = state.khachHang;
    const phan = ['lr'];
    if (kh.email) phan.push(kh.email.replace(/@/g, ' '));
    if (kh.zalo) phan.push(kh.zalo);
    if (kh.dienThoai && kh.dienThoai !== kh.zalo) phan.push(kh.dienThoai);
    return phan.join(' ');
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

  // ------------------------------------------------------------ LƯU ĐƠN HÀNG

  function luuDonHang(){
    if (!firebaseSanSang || !rtdb) return Promise.resolve(null);
    const t = tinhTien();
    const kh = state.khachHang;
    const ref = rtdb.ref('donhang').push();
    return ref.set({
      sanPham: sanPhamDaChon().map(function(sp){ return sp.ten + ' — ' + dinhDangTien(sp.giaChot); }),
      tongTien: t.tongTien,
      phanTramGiam: t.phanTramGiam,
      thanhTien: t.thanhTien,
      email: kh.email,
      zalo: kh.zalo,
      dienThoai: kh.dienThoai,
      noiDungCK: taoNoiDungCK(),
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

  function danhDauDaThanhToan(){
    if (!firebaseSanSang || !rtdb || !state.maDonHienTai) return Promise.resolve();
    return rtdb.ref('donhang/' + state.maDonHienTai)
      .update({ daXacNhan: true, xacNhanLuc: Date.now() })
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

    luuDonHang();

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

  // Bấm "Xác nhận đã thanh toán thành công": ghi nhận rồi ĐÓNG HẾT các bảng.
  function xacNhanThanhToan(){
    danhDauDaThanhToan();
    dongHetModal();
    state.maDonHienTai = null;
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
    if (hanhDong === 'chon-tat-ca') { chonTatCa(); return; }
    if (hanhDong === 'xuong-qua-tang') { xuongKhuQuaTang(); return; }
    if (hanhDong === 'cuon-len-dau') { cuonLenDauTrang(); return; }
    if (hanhDong === 'mua-hang') { moModalDonHang(); return; }
    if (hanhDong === 'dong-modal') { dongModal(); return; }
    if (hanhDong === 'tien-hanh-thanh-toan') { moModalThanhToan(); return; }
    if (hanhDong === 'sao-chep') { xuLySaoChep(nutHanhDong); return; }
    if (hanhDong === 'tai-anh-qr') { taiAnhModalThanhToan(nutHanhDong); return; }
    if (hanhDong === 'xac-nhan-thanh-toan') { xacNhanThanhToan(); return; }
  }

  function xuLyGoPhim(su){
    const dich = su.target;
    if (!dich || !dich.getAttribute) return;
    const ten = dich.getAttribute('data-truong');
    if (!ten) return;
    capNhatTruong(ten, dich.value);
  }

  function xuLyPhimEsc(su){
    if (su.key !== 'Escape') return;
    if (state.modal.length) dongModal();
    else if (state.menuMo) dongMenu();
  }

  function ganSuKien(){
    document.addEventListener('click', xuLyBamChuot);
    document.addEventListener('input', xuLyGoPhim);
    document.addEventListener('keydown', xuLyPhimEsc);
    // Xoay ngang máy hay đổi cỡ cửa sổ làm thanh neo đáy cao thấp khác đi —
    // đo lại để phần cuối trang không bị thanh che.
    window.addEventListener('resize', doChoThanhDay);
    window.addEventListener('hashchange', function(){
      const ma = docHash();
      if (ma === state.module) return;
      state.module = ma;
      state.hieuUngVaoModule = true;   // quay lại bằng nút Back cũng trôi lại
      render();
    });
  }

  // ------------------------------------------------------------- KHỞI ĐỘNG

  function boot(){
    state.module = docHash();
    state.hieuUngVaoModule = true;   // lần mở trang đầu tiên cũng có hiệu ứng trôi
    ganSuKien();
    theoDoiNutCuonModal();   // mọi bảng phụ, kể cả bảng viết sau này, tự có 2 nút cuộn
    render();
    doChoThanhDay();
    // Nạp trước thông tin chuyển khoản để lúc khách mở modal thanh toán là có
    // sẵn. Hỏng thì bỏ qua — modal vẫn mở được, chỉ báo chưa lấy được thông tin.
    taiThongTinCK();
  }

  boot();
})();
