  /* ===========================================================================
     PHẦN 04I — MODULE "SỰ CÔNG NHẬN CỦA KHÁCH HÀNG" TRONG TRANG QUẢN TRỊ

     Quản lý danh sách ảnh của module "Sự công nhận của khách hàng" ở trang
     bán hàng (PHẦN 03I). Y HỆT cơ chế "bản nháp, một nút Lưu duy nhất" của
     PHẦN 04G (Video ngắn) — mỗi dòng chỉ có MỘT ô link (không có tên, không
     có chương/bài), admin dán link rồi bấm "Lưu tất cả".
     =========================================================================== */

  const NHANH_CONG_NHAN = 'congNhan';

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ sau đó chỉ sửa mảng này.
  function congNhanNhap(){
    const a = state.admin;
    if (!a.congNhanNhap) {
      const goc = a.duLieu['cong-nhan'];
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      a.congNhanNhap = mang.map(function(m){
        return { id: m.id || taoIdKhoaHoc(), link: m.link || '' };
      });
    }
    return a.congNhanNhap;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminCongNhan(){
    const n = congNhanNhap();
    const dangLuu = state.admin.dangLuu === 'cn:tat-ca';
    const vuaLuu = state.admin.vuaLuu === 'cn:tat-ca';
    return '' +
      '<header class="admin-dau">' +
        '<h2>Sự công nhận của khách hàng</h2>' +
        '<p>Quản lý danh sách ảnh (giao dịch, đoạn chat, lời cảm ơn của khách) ở module "Sự công nhận của khách ' +
          'hàng" trên trang bán hàng. Dán link Google Drive hoặc link ảnh trực tiếp đều được — web tự nhận diện.</p>' +
        '<div class="hang-luu-kh">' +
          '<button type="button" class="nut nut-chinh" data-hanh-dong="cn-luu-tat-ca"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu tất cả') + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="quan-ly-khoa-hoc" data-quan-ly-cn>' + veDanhSachCongNhan(n) + '</div>';
  }

  function veDanhSachCongNhan(n){
    const dong = n.map(function(m, i){ return veDongCongNhan(m, i, n.length); }).join('');
    return '' +
      (dong || '<p class="chua-co-tep">Chưa có ảnh nào. Bấm "+ Thêm ảnh" bên dưới.</p>') +
      '<div class="hang-them-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="cn-them-anh">+ Thêm ảnh</button>' +
      '</div>';
  }

  function veDongCongNhan(m, i, tongSo){
    const lenDuoc = i > 0;
    const xuongDuoc = i < tongSo - 1;
    const nutDoiCho = '' +
      '<div class="cot-nut-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="cn-len" data-dong="' + i + '"' +
          (lenDuoc ? '' : ' disabled') + ' aria-label="Đưa lên trên">▲</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="cn-xuong" data-dong="' + i + '"' +
          (xuongDuoc ? '' : ' disabled') + ' aria-label="Đưa xuống dưới">▼</button>' +
      '</div>' +
      '<button type="button" class="nut nut-nho nut-vien nut-xoa-dong" data-hanh-dong="cn-xoa" data-dong="' + i +
        '" aria-label="Xoá dòng ' + (i + 1) + '">✕</button>';

    return '' +
      '<div class="dong-khoa-hoc dong-bai-kh" data-dong-kh="' + i + '">' +
        '<span class="nhan-dong-kh">Ảnh ' + (i + 1) + '</span>' +
        '<input type="text" class="admin-nhap" data-cn-link="' + i + '" autocomplete="off" spellcheck="false"' +
          ' placeholder="https://drive.google.com/file/d/... hoặc link ảnh trực tiếp" value="' + escapeHtml(m.link) + '">' +
        nutDoiCho +
      '</div>';
  }

  // Vẽ lại đúng khối danh sách, không dựng lại cả trang — gõ chữ vào ô nào
  // thì con trỏ nhập không bị nhảy về đầu.
  function capNhatQuanLyCongNhan(){
    if (state.trang !== 'admin' || state.admin.module !== 'cong-nhan') return;
    const khung = document.querySelector('[data-quan-ly-cn]');
    if (!khung) { render(); return; }
    khung.innerHTML = veDanhSachCongNhan(congNhanNhap());
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminCnThemAnh(){
    congNhanNhap().push({ id: taoIdKhoaHoc(), link: '' });
    capNhatQuanLyCongNhan();
  }

  function adminCnXoaDong(chiSo){
    const n = congNhanNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || i < 0 || i >= n.length) return;
    if (!window.confirm('Xoá ảnh này?')) return;
    n.splice(i, 1);
    capNhatQuanLyCongNhan();
  }

  function adminCnDoiCho(chiSo, huong){
    const n = congNhanNhap();
    const i = parseInt(chiSo, 10);
    const j = i + huong;
    if (isNaN(i) || j < 0 || j >= n.length) return;
    const tam = n[i];
    n[i] = n[j];
    n[j] = tam;
    capNhatQuanLyCongNhan();
  }

  // Gõ vào ô nào thì ghi thẳng vào bản nháp, KHÔNG vẽ lại.
  function adminGoCongNhan(dich){
    const oLink = dich.getAttribute('data-cn-link');
    if (oLink == null) return false;
    const i = parseInt(oLink, 10);
    const n = congNhanNhap();
    if (isNaN(i) || !n[i]) return true;
    n[i].link = dich.value;
    return true;
  }

  function adminCnLuuTatCa(){
    if (!firebaseSanSang || !rtdb) return;
    const n = congNhanNhap();
    const thieuLink = n.filter(function(m){ return !String(m.link || '').trim(); });
    if (thieuLink.length) {
      alert('Còn ' + thieuLink.length + ' dòng chưa dán link ảnh — dán xong mới lưu được.');
      return;
    }
    const goi = n.map(function(m){
      let link = String(m.link || '').trim();
      if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
      return { id: m.id, link: link };
    });
    state.admin.dangLuu = 'cn:tat-ca';
    render();
    rtdb.ref(NHANH_CONG_NHAN).set(goi).then(function(){
      state.admin.duLieu['cong-nhan'] = goi;
      state.admin.congNhanNhap = null;   // đọc lại đúng dữ liệu vừa lưu, tránh lệch id
      state.admin.dangLuu = '';
      state.admin.vuaLuu = 'cn:tat-ca';
      render();
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== 'cn:tat-ca') return;
        state.admin.vuaLuu = '';
        capNhatQuanLyCongNhan();
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được danh sách ảnh công nhận khách hàng:', e);
      state.admin.dangLuu = '';
      render();
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.');
    });
  }
