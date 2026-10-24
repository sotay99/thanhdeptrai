  /* ===========================================================================
     PHẦN 04H — MODULE "KHOÁ PHOTOSHOP" TRONG TRANG QUẢN TRỊ

     Y CHANG PHẦN 04E (khoá học Lightroom mobile) — chỉ khác nhánh Firebase
     (khoahoc/photoshop/muc thay vì khoahoc/lrMobile/muc) và tiền tố hành động
     (ps-… thay vì kh-…). Xem chú thích đầy đủ về "bản nháp, một nút Lưu duy
     nhất" ở đầu 04E.
     =========================================================================== */

  const NHANH_KHOA_PHOTOSHOP = 'khoahoc/photoshop/muc';

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ sau đó chỉ sửa mảng này.
  function khoaPhotoshopNhap(){
    const a = state.admin;
    if (!a.khoaPhotoshopNhap) {
      const goc = (a.duLieu['khoa-photoshop'] || {}).muc;
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      a.khoaPhotoshopNhap = mang.map(function(m){
        return { id: m.id || taoIdKhoaHoc(), loai: m.loai === 'chuong' ? 'chuong' : 'bai',
          ten: m.ten || '', linkVideo: m.linkVideo || '' };
      });
    }
    return a.khoaPhotoshopNhap;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminKhoaPhotoshop(){
    const n = khoaPhotoshopNhap();
    const dangLuu = state.admin.dangLuu === 'ps:tat-ca';
    const vuaLuu = state.admin.vuaLuu === 'ps:tat-ca';
    return '' +
      '<header class="admin-dau">' +
        '<h2>Khoá Photoshop</h2>' +
        '<p>Quản lý chương và bài học của module "Khoá Photoshop - edit ảnh bằng điện thoại" ở trang bán ' +
          'hàng. Số thứ tự chương/bài do hệ thống tự tính theo vị trí — kéo lên/xuống là số đổi ngay. ' +
          'Một bài học thuộc về CHƯƠNG GẦN NHẤT đứng phía trên nó.</p>' +
        '<div class="hang-luu-kh">' +
          '<button type="button" class="nut nut-chinh" data-hanh-dong="ps-luu-tat-ca"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu tất cả') + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="quan-ly-khoa-hoc" data-quan-ly-ps>' + veDanhSachKhoaPhotoshop(n) + '</div>';
  }

  function veDanhSachKhoaPhotoshop(n){
    const so = soThuTuKhoaHoc(n);
    const dong = n.map(function(m, i){ return veDongKhoaPhotoshop(m, i, so[i], n.length); }).join('');
    return '' +
      (dong || '<p class="chua-co-tep">Chưa có chương hay bài học nào. Bấm "+ Thêm bài" hoặc "+ Thêm chương" bên dưới.</p>') +
      '<div class="hang-them-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="ps-them-bai">+ Thêm bài</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="ps-them-chuong">+ Thêm chương</button>' +
      '</div>';
  }

  function veDongKhoaPhotoshop(m, i, soThuTu, tongSo){
    const lenDuoc = i > 0;
    const xuongDuoc = i < tongSo - 1;
    const nutDoiCho = '' +
      '<div class="cot-nut-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="ps-len" data-dong="' + i + '"' +
          (lenDuoc ? '' : ' disabled') + ' aria-label="Đưa lên trên">▲</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="ps-xuong" data-dong="' + i + '"' +
          (xuongDuoc ? '' : ' disabled') + ' aria-label="Đưa xuống dưới">▼</button>' +
      '</div>' +
      '<button type="button" class="nut nut-nho nut-vien nut-xoa-dong" data-hanh-dong="ps-xoa" data-dong="' + i +
        '" aria-label="Xoá dòng ' + (i + 1) + '">✕</button>';

    if (m.loai === 'chuong') {
      return '' +
        '<div class="dong-khoa-hoc dong-chuong-kh" data-dong-kh="' + i + '">' +
          '<span class="nhan-dong-kh">Chương ' + soThuTu + '</span>' +
          '<input type="text" class="admin-nhap" data-ps-ten="' + i + '" autocomplete="off"' +
            ' placeholder="Tên chương" value="' + escapeHtml(m.ten) + '">' +
          nutDoiCho +
        '</div>';
    }

    const dangXemTruoc = state.admin.xemTruocBaiHoc === m.id;
    return '' +
      '<div class="dong-khoa-hoc dong-bai-kh" data-dong-kh="' + i + '">' +
        '<span class="nhan-dong-kh">Bài ' + soThuTu + '</span>' +
        '<input type="text" class="admin-nhap" data-ps-ten="' + i + '" autocomplete="off"' +
          ' placeholder="Tên bài học" value="' + escapeHtml(m.ten) + '">' +
        '<div class="hang-video-hd">' +
          '<input type="text" class="admin-nhap" data-ps-video="' + i + '" autocomplete="off" spellcheck="false"' +
            ' placeholder="https://drive.google.com/file/d/..." value="' + escapeHtml(m.linkVideo) + '">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="ps-xem-truoc" data-id="' +
            escapeHtml(m.id) + '">Xem trước link</button>' +
        '</div>' +
        (dangXemTruoc ? veXemTruocVideo(m.linkVideo) : '') +
        nutDoiCho +
      '</div>';
  }

  // Vẽ lại đúng khối danh sách, không dựng lại cả trang — gõ chữ vào ô nào
  // thì con trỏ nhập không bị nhảy về đầu.
  function capNhatQuanLyKhoaPhotoshop(){
    if (state.trang !== 'admin' || state.admin.module !== 'khoa-photoshop') return;
    const khung = document.querySelector('[data-quan-ly-ps]');
    if (!khung) { render(); return; }
    khung.innerHTML = veDanhSachKhoaPhotoshop(khoaPhotoshopNhap());
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminPsThemBai(){
    khoaPhotoshopNhap().push({ id: taoIdKhoaHoc(), loai: 'bai', ten: '', linkVideo: '' });
    capNhatQuanLyKhoaPhotoshop();
  }

  function adminPsThemChuong(){
    khoaPhotoshopNhap().push({ id: taoIdKhoaHoc(), loai: 'chuong', ten: '', linkVideo: '' });
    capNhatQuanLyKhoaPhotoshop();
  }

  function adminPsXoaDong(chiSo){
    const n = khoaPhotoshopNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || i < 0 || i >= n.length) return;
    const m = n[i];
    const nhan = m.loai === 'chuong' ? 'chương' : 'bài học';
    if (!window.confirm('Xoá ' + nhan + ' "' + (m.ten || '(chưa đặt tên)') + '"?')) return;
    n.splice(i, 1);
    if (state.admin.xemTruocBaiHoc === m.id) state.admin.xemTruocBaiHoc = '';
    capNhatQuanLyKhoaPhotoshop();
  }

  function adminPsDoiCho(chiSo, huong){
    const n = khoaPhotoshopNhap();
    const i = parseInt(chiSo, 10);
    const j = i + huong;
    if (isNaN(i) || j < 0 || j >= n.length) return;
    const tam = n[i];
    n[i] = n[j];
    n[j] = tam;
    capNhatQuanLyKhoaPhotoshop();
  }

  function adminPsXemTruocVideo(id){
    state.admin.xemTruocBaiHoc = id;
    capNhatQuanLyKhoaPhotoshop();
    const dong = document.querySelector('[data-quan-ly-ps]');
    if (dong) initKhungVideo(dong);
    const n = khoaPhotoshopNhap();
    const m = n.filter(function(x){ return x.id === id; })[0];
    const idDrive = m ? idDriveTuLink(m.linkVideo) : '';
    if (idDrive) adminTaiMoTaVideo(idDrive);
  }

  // Gõ vào ô nào thì ghi thẳng vào bản nháp, KHÔNG vẽ lại.
  function adminGoKhoaPhotoshop(dich){
    const oTen = dich.getAttribute('data-ps-ten');
    const oVideo = dich.getAttribute('data-ps-video');
    if (oTen == null && oVideo == null) return false;
    const i = parseInt(oTen != null ? oTen : oVideo, 10);
    const n = khoaPhotoshopNhap();
    if (isNaN(i) || !n[i]) return true;
    if (oTen != null) n[i].ten = dich.value;
    else n[i].linkVideo = dich.value;
    return true;
  }

  function adminPsLuuTatCa(){
    if (!firebaseSanSang || !rtdb) return;
    const n = khoaPhotoshopNhap();
    const thieuTen = n.filter(function(m){ return !String(m.ten || '').trim(); });
    if (thieuTen.length) {
      alert('Còn ' + thieuTen.length + ' dòng chưa đặt tên — đặt tên xong mới lưu được.');
      return;
    }
    const goi = n.map(function(m){
      const item = { id: m.id, loai: m.loai, ten: m.ten };
      if (m.loai === 'bai') {
        let video = String(m.linkVideo || '').trim();
        if (video && !/^https?:\/\//i.test(video)) video = 'https://' + video;
        item.linkVideo = video;
      }
      return item;
    });
    state.admin.dangLuu = 'ps:tat-ca';
    render();
    rtdb.ref(NHANH_KHOA_PHOTOSHOP).set(goi).then(function(){
      state.admin.duLieu['khoa-photoshop'] = { muc: goi };
      state.admin.khoaPhotoshopNhap = null;   // đọc lại đúng dữ liệu vừa lưu, tránh lệch id
      state.admin.dangLuu = '';
      state.admin.vuaLuu = 'ps:tat-ca';
      render();
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== 'ps:tat-ca') return;
        state.admin.vuaLuu = '';
        capNhatQuanLyKhoaPhotoshop();
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được khoá Photoshop:', e);
      state.admin.dangLuu = '';
      render();
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.');
    });
  }
