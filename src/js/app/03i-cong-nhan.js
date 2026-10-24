  /* ===========================================================================
     PHẦN 03I — MODULE "SỰ CÔNG NHẬN CỦA KHÁCH HÀNG"

     Lưới ảnh (giao dịch, đoạn chat, lời cảm ơn của khách) đọc công khai từ
     nhánh congNhan trong Realtime Database — mảng {id, link} có thứ tự, admin
     quản lý ở /admin (PHẦN 04I) bằng cơ chế "bản nháp, một nút Lưu" sẵn có.

     NHẬN DIỆN LINK ẢNH: admin dán link Google Drive (share link dạng
     .../file/d/...) thì KHÔNG tự hiện ra được như ảnh — phải tách mã file rồi
     dựng lại địa chỉ xem trước của Drive. Tái dùng NGUYÊN idDriveTuLink()
     (PHẦN 03B, vốn dùng để tách mã video) để tách mã ảnh; nếu không tách được
     (link không phải Drive) thì dùng NGUYÊN link đó làm src — admin tự đảm
     bảo đó là link ảnh trực tiếp (vd ảnh host nơi khác, đuôi .jpg/.png...).

     Bấm vào ảnh nào thì ảnh đó phóng to lấp đầy màn hình (modal dùng tiền tố
     'anh-cong-nhan-' — khớp CSS [data-ma-modal^="anh-cong-nhan-"], bao trọn
     màn hình y hệt modal xem video bài học), có hai nút "Ảnh trước / Ảnh
     tiếp theo" chuyển xem hết lượt không cần đóng bảng.
     =========================================================================== */

  // Đọc công khai — giống hệt khoá học/quà tặng, không cần đăng nhập.
  function taiCongNhan(){
    const cn = state.congNhan;
    if (cn.daTai || cn.dangTai) return Promise.resolve(true);
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    cn.dangTai = true;
    return rtdb.ref('congNhan').once('value').then(function(anh){
      const gia = anh && anh.val();
      cn.ds = Array.isArray(gia) ? gia : (gia ? Object.keys(gia).map(function(k){ return gia[k]; }) : []);
      cn.daTai = true;
      cn.dangTai = false;
      const dangMo = state.modal.some(function(x){ return x.ma === 'cong-nhan'; });
      if (dangMo) render();
      return true;
    }).catch(function(e){
      console.error('Không đọc được danh sách ảnh công nhận khách hàng:', e);
      cn.dangTai = false;
      cn.daTai = true;   // coi như đã tải xong (rỗng) — không hỏi lại vô hạn
      return false;
    });
  }

  // Dựng src ảnh thật từ link admin dán — xem chú thích đầu tệp.
  function srcAnhCongNhan(link){
    const id = idDriveTuLink(link);
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';
    return String(link || '');
  }

  // Câu giới thiệu — nhấn mạnh độ tin cậy (hơn 1.000 khách) và lời cam kết
  // riêng tư (đã xin phép khách trước khi đăng).
  const DAN_NHAP_CONG_NHAN = '' +
    '💬 <strong>Hơn 1.000 khách hàng đã tin tưởng chọn mua sản phẩm của Thànhđẹptrai.vn</strong> — đây là nơi lưu ' +
    'lại một phần những khoảnh khắc đó: ảnh giao dịch, đoạn chat trao đổi, và những lời cảm ơn chân thành mà ' +
    'khách đã gửi lại cho shop. Mỗi tấm ảnh dưới đây đều đã được <strong>xin phép khách hàng trước khi đăng</strong> ' +
    '— shop luôn tôn trọng và bảo mật thông tin riêng tư của người mua, chỉ chia sẻ những gì khách đồng ý. Xem ' +
    'qua để yên tâm hơn: bạn không phải là người đầu tiên, và chắc chắn không phải người cuối cùng tin tưởng ' +
    'chọn shop.';

  // ------------------------------------------------------------------ VẼ

  function moModalCongNhan(m){
    // Dữ liệu thường chưa tải (module này không đọc sẵn lúc boot như thông
    // tin liên hệ) — tải lúc mở bảng, vẽ lại ĐÚNG bảng này khi xong, chỉ khi
    // bảng vẫn còn đang mở.
    if (!state.congNhan.daTai && !state.congNhan.dangTai) {
      taiCongNhan().then(function(){
        const dangMo = state.modal.some(function(x){ return x.ma === 'cong-nhan'; });
        if (dangMo) { dongModal(); moModalCongNhan(m); }
      });
    }
    const cn = state.congNhan;
    const dangTai = cn.dangTai || !cn.daTai;
    moModal({
      ma: 'cong-nhan',
      tieuDe: m.ten,
      than: '' +
        '<p class="khoa-hoc-dan-nhap">' + DAN_NHAP_CONG_NHAN + '</p>' +
        (cn.ds.length
          ? '<div class="luoi-cong-nhan">' + cn.ds.map(veOAnhCongNhan).join('') + '</div>'
          : veCongNhanDangCapNhat(cn)),
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  function veCongNhanDangCapNhat(cn){
    if (cn.dangTai || !cn.daTai) return '<p class="loi-nhan-hang">Đang tải ảnh…</p>';
    return '<p class="loi-nhan-hang">Hình ảnh đang được cập nhật, xin quay lại sau nhé.</p>';
  }

  function veOAnhCongNhan(a){
    return '' +
      '<button type="button" class="o-anh-cong-nhan" data-hanh-dong="xem-anh-cong-nhan" data-id="' +
        escapeHtml(a.id) + '">' +
        '<img src="' + escapeHtml(srcAnhCongNhan(a.link)) + '" loading="lazy" decoding="async"' +
          ' alt="Ảnh giao dịch / lời cảm ơn của khách hàng">' +
      '</button>';
  }

  // -------------------------------------------------------- PHÓNG TO ẢNH

  function moModalXemAnhCongNhan(id){
    const ds = state.congNhan.ds;
    const idx = ds.findIndex(function(a){ return a.id === id; });
    if (idx === -1) return;
    state.congNhan.anhDangMo = id;
    moModal({
      ma: 'anh-cong-nhan-' + id,
      tieuDe: 'Ảnh ' + (idx + 1) + ' / ' + ds.length,
      than: '' +
        '<div class="anh-cong-nhan-to">' +
          '<img src="' + escapeHtml(srcAnhCongNhan(ds[idx].link)) + '" alt="Ảnh giao dịch / lời cảm ơn của khách hàng">' +
        '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="cong-nhan-chuyen" data-id="' + escapeHtml(id) +
          '" data-huong="-1"' + (idx <= 0 ? ' disabled' : '') + '>← Ảnh trước</button>' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="cong-nhan-chuyen" data-id="' + escapeHtml(id) +
          '" data-huong="1"' + (idx >= ds.length - 1 ? ' disabled' : '') + '>Ảnh tiếp theo →</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
    });
  }

  function chuyenAnhCongNhan(id, huong){
    const ds = state.congNhan.ds;
    const idx = ds.findIndex(function(a){ return a.id === id; });
    if (idx === -1) return;
    const idxMoi = idx + (parseInt(huong, 10) || 0);
    if (idxMoi < 0 || idxMoi >= ds.length) return;
    dongModal();
    moModalXemAnhCongNhan(ds[idxMoi].id);
  }
