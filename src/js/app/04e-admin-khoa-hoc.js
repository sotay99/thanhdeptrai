
  /* ===========================================================================
     PHẦN 04E — MODULE "KHOÁ HỌC LIGHTROOM MOBILE" TRONG TRANG QUẢN TRỊ

     Quản lý danh sách chương/bài của module "Khoá học chỉnh màu Lightroom điện
     thoại" ở trang bán hàng (PHẦN 03C). Dữ liệu là MỘT MẢNG có thứ tự — vị trí
     trong mảng quyết định cả số thứ tự (chương 1, 2, 3…; bài 1, 2, 3… tính
     riêng) lẫn bài nào thuộc chương nào (thuộc chương gần nhất đứng trên nó).
     Xem chú thích đầy đủ về quy tắc này ở đầu 03C.

     BẢN NHÁP, MỘT NÚT LƯU DUY NHẤT: mọi việc thêm/xoá/đổi chỗ/sửa tên/sửa link
     chỉ sửa bản nháp trong bộ nhớ (state.admin.khoaHocNhap). Chỉ khi bấm
     "Lưu tất cả" mới ghi đè NGUYÊN mảng đó xuống Firebase — khác hẳn module
     Danh mục sản phẩm (mỗi sản phẩm một nút Lưu riêng), vì ở đây thứ tự và số
     thứ tự phụ thuộc lẫn nhau giữa mọi dòng, sửa xong phải lưu trọn gói.
     =========================================================================== */

  const NHANH_KHOA_HOC = 'khoahoc/lrMobile/muc';

  function taoIdKhoaHoc(){
    const so = new Uint8Array(10);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(so);
    else for (let i = 0; i < so.length; i++) so[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(so, function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ sau đó chỉ sửa mảng này.
  function khoaHocNhap(){
    const a = state.admin;
    if (!a.khoaHocNhap) {
      const goc = (a.duLieu['khoa-hoc'] || {}).muc;
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      a.khoaHocNhap = mang.map(function(m){
        return { id: m.id || taoIdKhoaHoc(), loai: m.loai === 'chuong' ? 'chuong' : 'bai',
          ten: m.ten || '', linkVideo: m.linkVideo || '' };
      });
    }
    return a.khoaHocNhap;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminKhoaHoc(){
    const n = khoaHocNhap();
    const dangLuu = state.admin.dangLuu === 'kh:tat-ca';
    const vuaLuu = state.admin.vuaLuu === 'kh:tat-ca';
    return '' +
      '<header class="admin-dau">' +
        '<h2>Khoá học Lightroom mobile</h2>' +
        '<p>Quản lý chương và bài học của module "Khoá học chỉnh màu Lightroom điện thoại" ở trang bán ' +
          'hàng. Số thứ tự chương/bài do hệ thống tự tính theo vị trí — kéo lên/xuống là số đổi ngay. ' +
          'Một bài học thuộc về CHƯƠNG GẦN NHẤT đứng phía trên nó.</p>' +
        '<div class="hang-luu-kh">' +
          '<button type="button" class="nut nut-chinh" data-hanh-dong="kh-luu-tat-ca"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu tất cả') + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="quan-ly-khoa-hoc" data-quan-ly-kh>' + veDanhSachKhoaHoc(n) + '</div>';
  }

  function veDanhSachKhoaHoc(n){
    const so = soThuTuKhoaHoc(n);
    const dong = n.map(function(m, i){ return veDongKhoaHoc(m, i, so[i], n.length); }).join('');
    return '' +
      (dong || '<p class="chua-co-tep">Chưa có chương hay bài học nào. Bấm "+ Thêm bài" hoặc "+ Thêm chương" bên dưới.</p>') +
      '<div class="hang-them-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="kh-them-bai">+ Thêm bài</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="kh-them-chuong">+ Thêm chương</button>' +
      '</div>';
  }

  function veDongKhoaHoc(m, i, soThuTu, tongSo){
    const lenDuoc = i > 0;
    const xuongDuoc = i < tongSo - 1;
    const nutDoiCho = '' +
      '<div class="cot-nut-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="kh-len" data-dong="' + i + '"' +
          (lenDuoc ? '' : ' disabled') + ' aria-label="Đưa lên trên">▲</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="kh-xuong" data-dong="' + i + '"' +
          (xuongDuoc ? '' : ' disabled') + ' aria-label="Đưa xuống dưới">▼</button>' +
      '</div>' +
      '<button type="button" class="nut nut-nho nut-vien nut-xoa-dong" data-hanh-dong="kh-xoa" data-dong="' + i +
        '" aria-label="Xoá dòng ' + (i + 1) + '">✕</button>';

    if (m.loai === 'chuong') {
      return '' +
        '<div class="dong-khoa-hoc dong-chuong-kh" data-dong-kh="' + i + '">' +
          '<span class="nhan-dong-kh">Chương ' + soThuTu + '</span>' +
          '<input type="text" class="admin-nhap" data-kh-ten="' + i + '" autocomplete="off"' +
            ' placeholder="Tên chương" value="' + escapeHtml(m.ten) + '">' +
          nutDoiCho +
        '</div>';
    }

    const dangXemTruoc = state.admin.xemTruocBaiHoc === m.id;
    return '' +
      '<div class="dong-khoa-hoc dong-bai-kh" data-dong-kh="' + i + '">' +
        '<span class="nhan-dong-kh">Bài ' + soThuTu + '</span>' +
        '<input type="text" class="admin-nhap" data-kh-ten="' + i + '" autocomplete="off"' +
          ' placeholder="Tên bài học" value="' + escapeHtml(m.ten) + '">' +
        '<div class="hang-video-hd">' +
          '<input type="text" class="admin-nhap" data-kh-video="' + i + '" autocomplete="off" spellcheck="false"' +
            ' placeholder="https://drive.google.com/file/d/..." value="' + escapeHtml(m.linkVideo) + '">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="kh-xem-truoc" data-id="' +
            escapeHtml(m.id) + '">Xem trước link</button>' +
        '</div>' +
        (dangXemTruoc ? veXemTruocVideo(m.linkVideo) : '') +
        nutDoiCho +
      '</div>';
  }

  // Vẽ lại đúng khối danh sách, không dựng lại cả trang — gõ chữ vào ô nào
  // thì con trỏ nhập không bị nhảy về đầu.
  function capNhatQuanLyKhoaHoc(){
    if (state.trang !== 'admin' || state.admin.module !== 'khoa-hoc') return;
    const khung = document.querySelector('[data-quan-ly-kh]');
    if (!khung) { render(); return; }
    khung.innerHTML = veDanhSachKhoaHoc(khoaHocNhap());
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminKhThemBai(){
    khoaHocNhap().push({ id: taoIdKhoaHoc(), loai: 'bai', ten: '', linkVideo: '' });
    capNhatQuanLyKhoaHoc();
  }

  function adminKhThemChuong(){
    khoaHocNhap().push({ id: taoIdKhoaHoc(), loai: 'chuong', ten: '', linkVideo: '' });
    capNhatQuanLyKhoaHoc();
  }

  function adminKhXoaDong(chiSo){
    const n = khoaHocNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || i < 0 || i >= n.length) return;
    const m = n[i];
    const nhan = m.loai === 'chuong' ? 'chương' : 'bài học';
    if (!window.confirm('Xoá ' + nhan + ' "' + (m.ten || '(chưa đặt tên)') + '"?')) return;
    n.splice(i, 1);
    if (state.admin.xemTruocBaiHoc === m.id) state.admin.xemTruocBaiHoc = '';
    capNhatQuanLyKhoaHoc();
  }

  function adminKhDoiCho(chiSo, huong){
    const n = khoaHocNhap();
    const i = parseInt(chiSo, 10);
    const j = i + huong;
    if (isNaN(i) || j < 0 || j >= n.length) return;
    const tam = n[i];
    n[i] = n[j];
    n[j] = tam;
    capNhatQuanLyKhoaHoc();
  }

  function adminKhXemTruocVideo(id){
    state.admin.xemTruocBaiHoc = id;
    capNhatQuanLyKhoaHoc();
    const dong = document.querySelector('[data-quan-ly-kh]');
    if (dong) initKhungVideo(dong);
    const n = khoaHocNhap();
    const m = n.filter(function(x){ return x.id === id; })[0];
    const idDrive = m ? idDriveTuLink(m.linkVideo) : '';
    if (idDrive) adminTaiMoTaVideo(idDrive);
  }

  // Gõ vào ô nào thì ghi thẳng vào bản nháp, KHÔNG vẽ lại.
  function adminGoKhoaHoc(dich){
    const oTen = dich.getAttribute('data-kh-ten');
    const oVideo = dich.getAttribute('data-kh-video');
    if (oTen == null && oVideo == null) return false;
    const i = parseInt(oTen != null ? oTen : oVideo, 10);
    const n = khoaHocNhap();
    if (isNaN(i) || !n[i]) return true;
    if (oTen != null) n[i].ten = dich.value;
    else n[i].linkVideo = dich.value;
    return true;
  }

  function adminKhLuuTatCa(){
    if (!firebaseSanSang || !rtdb) return;
    const n = khoaHocNhap();
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
    state.admin.dangLuu = 'kh:tat-ca';
    render();
    rtdb.ref(NHANH_KHOA_HOC).set(goi).then(function(){
      state.admin.duLieu['khoa-hoc'] = { muc: goi };
      state.admin.khoaHocNhap = null;   // đọc lại đúng dữ liệu vừa lưu, tránh lệch id
      state.admin.dangLuu = '';
      state.admin.vuaLuu = 'kh:tat-ca';
      render();
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== 'kh:tat-ca') return;
        state.admin.vuaLuu = '';
        capNhatQuanLyKhoaHoc();
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được khoá học Lightroom mobile:', e);
      state.admin.dangLuu = '';
      render();
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.');
    });
  }
