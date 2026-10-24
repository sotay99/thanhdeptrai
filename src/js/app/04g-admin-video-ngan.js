  /* ===========================================================================
     PHẦN 04G — MODULE "VIDEO NGẮN" TRONG TRANG QUẢN TRỊ

     Quản lý danh sách video của module "Xem video ngắn" ở trang bán hàng
     (PHẦN 03G). Y HỆT cơ chế "bản nháp, một nút Lưu duy nhất" của PHẦN 04E
     (khoá học Lightroom mobile) — xem chú thích đầy đủ ở đầu 04E — nhưng mảng
     ở đây CHỈ TOÀN mục "bai", KHÔNG có "+ Thêm chương" vì module này không có
     khái niệm chương/bài, chỉ có "Video 1, Video 2…".
     =========================================================================== */

  const NHANH_VIDEO_NGAN = 'videoNgan/muc';

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ sau đó chỉ sửa mảng này.
  function videoNganNhap(){
    const a = state.admin;
    if (!a.videoNganNhap) {
      const goc = (a.duLieu['video-ngan'] || {}).muc;
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      a.videoNganNhap = mang.map(function(m){
        return { id: m.id || taoIdKhoaHoc(), loai: 'bai', ten: m.ten || '', linkVideo: m.linkVideo || '' };
      });
    }
    return a.videoNganNhap;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminVideoNgan(){
    const n = videoNganNhap();
    const dangLuu = state.admin.dangLuu === 'vn:tat-ca';
    const vuaLuu = state.admin.vuaLuu === 'vn:tat-ca';
    return '' +
      '<header class="admin-dau">' +
        '<h2>Video ngắn</h2>' +
        '<p>Quản lý danh sách video của module "Xem video ngắn" ở trang bán hàng. Mỗi dòng là một video, ' +
          'số thứ tự tự tính theo vị trí — kéo lên/xuống là số đổi ngay.</p>' +
        '<div class="hang-luu-kh">' +
          '<button type="button" class="nut nut-chinh" data-hanh-dong="vn-luu-tat-ca"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu tất cả') + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="quan-ly-khoa-hoc" data-quan-ly-vn>' + veDanhSachVideoNgan(n) + '</div>';
  }

  function veDanhSachVideoNgan(n){
    const dong = n.map(function(m, i){ return veDongVideoNgan(m, i, i + 1, n.length); }).join('');
    return '' +
      (dong || '<p class="chua-co-tep">Chưa có video nào. Bấm "+ Thêm video" bên dưới.</p>') +
      '<div class="hang-them-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="vn-them-video">+ Thêm video</button>' +
      '</div>';
  }

  function veDongVideoNgan(m, i, soThuTu, tongSo){
    const lenDuoc = i > 0;
    const xuongDuoc = i < tongSo - 1;
    const nutDoiCho = '' +
      '<div class="cot-nut-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="vn-len" data-dong="' + i + '"' +
          (lenDuoc ? '' : ' disabled') + ' aria-label="Đưa lên trên">▲</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="vn-xuong" data-dong="' + i + '"' +
          (xuongDuoc ? '' : ' disabled') + ' aria-label="Đưa xuống dưới">▼</button>' +
      '</div>' +
      '<button type="button" class="nut nut-nho nut-vien nut-xoa-dong" data-hanh-dong="vn-xoa" data-dong="' + i +
        '" aria-label="Xoá dòng ' + (i + 1) + '">✕</button>';

    const dangXemTruoc = state.admin.xemTruocBaiHoc === m.id;
    return '' +
      '<div class="dong-khoa-hoc dong-bai-kh" data-dong-kh="' + i + '">' +
        '<span class="nhan-dong-kh">Video ' + soThuTu + '</span>' +
        '<input type="text" class="admin-nhap" data-vn-ten="' + i + '" autocomplete="off"' +
          ' placeholder="Tên video" value="' + escapeHtml(m.ten) + '">' +
        '<div class="hang-video-hd">' +
          '<input type="text" class="admin-nhap" data-vn-video="' + i + '" autocomplete="off" spellcheck="false"' +
            ' placeholder="https://drive.google.com/file/d/..." value="' + escapeHtml(m.linkVideo) + '">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="vn-xem-truoc" data-id="' +
            escapeHtml(m.id) + '">Xem trước link</button>' +
        '</div>' +
        (dangXemTruoc ? veXemTruocVideo(m.linkVideo) : '') +
        nutDoiCho +
      '</div>';
  }

  // Vẽ lại đúng khối danh sách, không dựng lại cả trang — gõ chữ vào ô nào
  // thì con trỏ nhập không bị nhảy về đầu.
  function capNhatQuanLyVideoNgan(){
    if (state.trang !== 'admin' || state.admin.module !== 'video-ngan') return;
    const khung = document.querySelector('[data-quan-ly-vn]');
    if (!khung) { render(); return; }
    khung.innerHTML = veDanhSachVideoNgan(videoNganNhap());
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminVnThemVideo(){
    videoNganNhap().push({ id: taoIdKhoaHoc(), loai: 'bai', ten: '', linkVideo: '' });
    capNhatQuanLyVideoNgan();
  }

  function adminVnXoaDong(chiSo){
    const n = videoNganNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || i < 0 || i >= n.length) return;
    const m = n[i];
    if (!window.confirm('Xoá video "' + (m.ten || '(chưa đặt tên)') + '"?')) return;
    n.splice(i, 1);
    if (state.admin.xemTruocBaiHoc === m.id) state.admin.xemTruocBaiHoc = '';
    capNhatQuanLyVideoNgan();
  }

  function adminVnDoiCho(chiSo, huong){
    const n = videoNganNhap();
    const i = parseInt(chiSo, 10);
    const j = i + huong;
    if (isNaN(i) || j < 0 || j >= n.length) return;
    const tam = n[i];
    n[i] = n[j];
    n[j] = tam;
    capNhatQuanLyVideoNgan();
  }

  function adminVnXemTruocVideo(id){
    state.admin.xemTruocBaiHoc = id;
    capNhatQuanLyVideoNgan();
    const dong = document.querySelector('[data-quan-ly-vn]');
    if (dong) initKhungVideo(dong);
    const n = videoNganNhap();
    const m = n.filter(function(x){ return x.id === id; })[0];
    const idDrive = m ? idDriveTuLink(m.linkVideo) : '';
    if (idDrive) adminTaiMoTaVideo(idDrive);
  }

  // Gõ vào ô nào thì ghi thẳng vào bản nháp, KHÔNG vẽ lại.
  function adminGoVideoNgan(dich){
    const oTen = dich.getAttribute('data-vn-ten');
    const oVideo = dich.getAttribute('data-vn-video');
    if (oTen == null && oVideo == null) return false;
    const i = parseInt(oTen != null ? oTen : oVideo, 10);
    const n = videoNganNhap();
    if (isNaN(i) || !n[i]) return true;
    if (oTen != null) n[i].ten = dich.value;
    else n[i].linkVideo = dich.value;
    return true;
  }

  function adminVnLuuTatCa(){
    if (!firebaseSanSang || !rtdb) return;
    const n = videoNganNhap();
    const thieuTen = n.filter(function(m){ return !String(m.ten || '').trim(); });
    if (thieuTen.length) {
      alert('Còn ' + thieuTen.length + ' dòng chưa đặt tên — đặt tên xong mới lưu được.');
      return;
    }
    const goi = n.map(function(m){
      let video = String(m.linkVideo || '').trim();
      if (video && !/^https?:\/\//i.test(video)) video = 'https://' + video;
      return { id: m.id, loai: 'bai', ten: m.ten, linkVideo: video };
    });
    state.admin.dangLuu = 'vn:tat-ca';
    render();
    rtdb.ref(NHANH_VIDEO_NGAN).set(goi).then(function(){
      state.admin.duLieu['video-ngan'] = { muc: goi };
      state.admin.videoNganNhap = null;   // đọc lại đúng dữ liệu vừa lưu, tránh lệch id
      state.admin.dangLuu = '';
      state.admin.vuaLuu = 'vn:tat-ca';
      render();
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== 'vn:tat-ca') return;
        state.admin.vuaLuu = '';
        capNhatQuanLyVideoNgan();
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được danh sách video ngắn:', e);
      state.admin.dangLuu = '';
      render();
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.');
    });
  }
