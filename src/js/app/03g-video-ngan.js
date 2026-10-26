  /* ===========================================================================
     PHẦN 03G — MODULE "XEM VIDEO NGẮN"

     Y HỆT kiến trúc module "Khoá học chỉnh màu Lightroom điện thoại" (PHẦN
     03C): một mảng có thứ tự đọc công khai từ Realtime Database
     (videoNgan/muc), admin quản lý ở /admin bằng cơ chế "bản nháp, một nút
     Lưu" (PHẦN 04G), khách bấm vào mở modal xem video dọc 9:16 + nút
     chuyển video trước/sau — tái dùng NGUYÊN veKhungVideo/initKhungVideo
     (PHẦN 03B) và veTheBaiHoc (PHẦN 03C).

     KHÁC module khoá học ở ba điểm:
       1. Mảng CHỈ TOÀN mục "bai" — KHÔNG BAO GIỜ có "chuong". soThuTuKhoaHoc()
          (PHẦN 03C) vẫn dùng được nguyên vẹn vì nó chỉ đếm theo loai, không
          quan tâm có chuong hay không — kết quả là đánh số 1, 2, 3… liên tục,
          đúng ý "Video 1, Video 2…", nên module này không cần hàm xếp
          chương/sổ-ra (xepKhoaHoc) — chỉ cần vẽ thẳng một danh sách phẳng.
       2. KHÔNG có nút "Xem chi tiết thông tin khoá học này" — module này
          không phải một khoá học có mã sản phẩm, không có bảng mô tả riêng
          để dẫn tới.
       3. Modal xem video dùng mã 'bai-hoc-vn-' + id (vẫn khớp CSS chọn theo
          tiền tố [data-ma-modal^="bai-hoc-"], giống cách module khoá học máy
          tính PHẦN 03D dùng tiền tố 'bai-hoc-pc-') và hành động riêng
          ('mo-video-ngan' / 'video-ngan-chuyen') vì đọc dữ liệu từ một nhánh
          Firebase khác hẳn, không thể dùng chung hành động với PHẦN 03C/03D.
     =========================================================================== */

  function taiVideoNgan(){
    const vn = state.videoNgan;
    if (vn.daTai || vn.dangTai) return Promise.resolve(true);
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    vn.dangTai = true;
    return rtdb.ref('videoNgan/muc').once('value').then(function(anh){
      const gia = anh && anh.val();
      vn.muc = Array.isArray(gia) ? gia : (gia ? Object.keys(gia).map(function(k){ return gia[k]; }) : []);
      vn.daTai = true;
      vn.dangTai = false;
      if (state.trang === 'chinh' && state.module === 'video-ngan') render();
      return true;
    }).catch(function(e){
      console.error('Không đọc được danh sách video ngắn:', e);
      vn.dangTai = false;
      vn.daTai = true;   // coi như đã tải xong (rỗng) — không hỏi lại vô hạn
      return false;
    });
  }

  // Câu dẫn nhập — giới thiệu nhanh "kênh" video ngắn, đứng ngay dưới tiêu đề.
  const DAN_NHAP_VIDEO_NGAN = '' +
    '🎬 <strong>Kênh video ngắn của Thànhđẹptrai</strong> — gom lại mọi mẹo chỉnh màu, chỉnh ảnh, ghép ảnh ' +
    'hay ho làm được ngay trên điện thoại, không cần học bài bản, không cần ngồi máy tính. Mỗi video một ' +
    'mẹo, xem là làm theo được liền — cuộn xuống, bấm vào video bất kỳ, xem dọc màn hình y như đang lướt TikTok.';

  // ------------------------------------------------------------------ VẼ

  // Video 1 và Video 2 — theo đúng yêu cầu — xem được NGAY tại trang chính
  // của module, không phải bấm vào tên mới mở modal như các video còn lại:
  // chèn thẳng khung trình chiếu (veKhungVideo, PHẦN 03B) ngay dưới nút tên
  // video, dùng NGUYÊN khung đó nên initKhungVideo() nhận diện và canh tỷ lệ
  // được luôn (xem render(), PHẦN 02, nơi gọi initKhungVideo() cho module này).
  function veModuleVideoNgan(){
    const vn = state.videoNgan;
    if (!vn.daTai && !vn.dangTai) taiVideoNgan();
    const so = soThuTuKhoaHoc(vn.muc);
    const dsHtml = vn.muc.map(function(m, i){
      const the = veTheBaiHoc(Object.assign({}, m, { soThuTu: so[i] }), 'mo-video-ngan', 'Video');
      if (i >= 2) return the;
      return the + '<div class="video-ngan-xem-ngay">' + veKhungVideo(m.linkVideo, 'doc') + '</div>';
    }).join('');
    return '' +
      '<div class="khoa-hoc-mobile video-ngan">' +
        '<header class="khoa-hoc-dau">' +
          '<h2>Xem video ngắn</h2>' +
          '<div class="khoa-hoc-khung-dan-nhap">' +
            '<img class="khoa-hoc-anh-dai-dien" src="/assets/anh/dd-video-ngan.svg" width="140" height="140"' +
              ' loading="lazy" decoding="async" alt="Ảnh đại diện kênh video ngắn">' +
            '<p class="khoa-hoc-dan-nhap">' + DAN_NHAP_VIDEO_NGAN + '</p>' +
          '</div>' +
        '</header>' +
        (vn.muc.length
          ? '<div class="danh-sach-chuong">' + dsHtml + '</div>'
          : veVideoNganDangCapNhat(vn)) +
      '</div>';
  }

  function veVideoNganDangCapNhat(vn){
    if (vn.dangTai || !vn.daTai) return '<p class="loi-nhan-hang">Đang tải danh sách video…</p>';
    return '<p class="loi-nhan-hang">Danh sách video đang được cập nhật, xin quay lại sau nhé.</p>';
  }

  // -------------------------------------------------------- MODAL XEM VIDEO

  function moModalVideoNgan(id){
    const vn = state.videoNgan;
    const so = soThuTuKhoaHoc(vn.muc);
    const idx = vn.muc.findIndex(function(m){ return m.id === id; });
    if (idx === -1) return;
    const vid = Object.assign({}, vn.muc[idx], { soThuTu: so[idx] });
    vn.baiDangMo = id;
    moModal({
      ma: 'bai-hoc-vn-' + id,
      tieuDe: 'Video ' + vid.soThuTu + ': ' + (vid.ten || '(chưa đặt tên)'),
      than: '<div class="noi-dung-bai-hoc">' + veKhungVideo(vid.linkVideo, 'doc') + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="video-ngan-chuyen" data-id="' + escapeHtml(id) +
          '" data-huong="-1"' + (idx <= 0 ? ' disabled' : '') + '>← Video trước</button>' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="video-ngan-chuyen" data-id="' + escapeHtml(id) +
          '" data-huong="1"' + (idx >= vn.muc.length - 1 ? ' disabled' : '') + '>Video tiếp theo →</button>' +
        veNutGhimVideo() +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>',
      khiVe: function(){ initKhungVideo(); apDungGhimVideo(); }
    });
  }

  function chuyenVideoNgan(id, huong){
    const vn = state.videoNgan;
    const idx = vn.muc.findIndex(function(m){ return m.id === id; });
    if (idx === -1) return;
    const idxMoi = idx + (parseInt(huong, 10) || 0);
    if (idxMoi < 0 || idxMoi >= vn.muc.length) return;
    dongModal();
    moModalVideoNgan(vn.muc[idxMoi].id);
  }
