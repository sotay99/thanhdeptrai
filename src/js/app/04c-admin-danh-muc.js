
  /* ===========================================================================
     PHẦN 04C — MODULE "DANH MỤC SẢN PHẨM" TRONG TRANG QUẢN TRỊ

     Đây là chỗ chủ shop khai: mỗi sản phẩm lấy hàng từ đâu, gồm những tệp nào,
     và khách nhìn thấy tên gì.

     HAI NGUỒN HÀNG, KHÁC NHAU HẲN VỀ MỨC BẢO VỆ:

       'r2'    — tệp nằm trong kho riêng trên Cloudflare R2. Máy chủ cấp phát
                 mới biết đường tải thật, và nó chỉ trả về khi mã nhận hàng hợp
                 lệ. Khoá được theo thiết bị, thu hồi được.

       'drive' — một đường dẫn Google Drive đặt ở chế độ "ai có link cũng tải
                 được". Tiện, không tốn dung lượng R2, nhưng KHÔNG khoá được
                 thiết bị và KHÔNG thu hồi được: khách chuyển link cho ai thì
                 người đó tải được. Trang quản trị nói thẳng điều này ngay tại
                 chỗ chọn, để không ai chọn nhầm vì tưởng hai nguồn như nhau.

     Hai khoá học (sp4, sp5) không có mặt ở đây: chúng là module học trên web,
     không có tệp nào để giao.
     =========================================================================== */

  const NGUON_HANG = {
    r2:    { ten: 'Kho riêng (Cloudflare R2)', mo: 'Khoá được theo thiết bị, thu hồi được.' },
    drive: { ten: 'Google Drive (link công khai)', mo: 'Ai có link cũng tải được — không khoá thiết bị, không thu hồi được.' }
  };

  // Sản phẩm nào có hàng để giao. Hai khoá học đứng ngoài.
  function sanPhamCoHang(){
    return SAN_PHAM.filter(function(sp){ return !MODULE_KHOA_HOC[sp.ma]; });
  }

  // Bản nháp đang sửa. Chỉ ghi xuống Firebase khi bấm Lưu, nên bấm nhầm rồi
  // rời đi không làm hỏng dữ liệu đang chạy ngoài web.
  function nhapDanhMuc(maSP){
    const a = state.admin;
    a.danhMucNhap = a.danhMucNhap || {};
    if (!a.danhMucNhap[maSP]) {
      const goc = (a.duLieu['danh-muc'] || {})[maSP] || {};
      a.danhMucNhap[maSP] = {
        nguon: goc.nguon || 'r2',
        link: goc.link || '',
        file: (goc.file || []).map(function(f){
          return { tep: String(f && f.tep || ''), ten: String(f && f.ten || '') };
        })
      };
    }
    return a.danhMucNhap[maSP];
  }

  function veAdminDanhMuc(){
    const the = sanPhamCoHang().map(veTheDanhMuc).join('');
    return '<header class="admin-dau">' +
        '<h2>Danh mục sản phẩm</h2>' +
        '<p>Khai mỗi sản phẩm lấy hàng từ đâu và khách nhìn thấy tên gì. ' +
          'Tên tệp phải trùng KHÍT với tên trong kho — sai một chữ là khách bấm tải rồi nhận lỗi.</p>' +
      '</header>' +
      '<div class="admin-danh-muc">' + the + '</div>';
  }

  function veTheDanhMuc(sp){
    const n = nhapDanhMuc(sp.ma);
    const laDrive = n.nguon === 'drive';
    const dangLuu = state.admin.dangLuu === 'dm:' + sp.ma;
    const vuaLuu = state.admin.vuaLuu === 'dm:' + sp.ma;

    const chonNguon = Object.keys(NGUON_HANG).map(function(khoa){
      const chon = n.nguon === khoa;
      return '<button type="button" class="admin-chon-nguon' + (chon ? ' dang-chon' : '') +
        '" data-hanh-dong="admin-doi-nguon" data-ma="' + escapeHtml(sp.ma) + '" data-nguon="' + khoa + '"' +
        ' aria-pressed="' + (chon ? 'true' : 'false') + '">' +
        '<span class="ten">' + escapeHtml(NGUON_HANG[khoa].ten) + '</span>' +
        '<span class="mo">' + escapeHtml(NGUON_HANG[khoa].mo) + '</span>' +
        '</button>';
    }).join('');

    return '' +
      '<article class="admin-the-dm" data-the-dm="' + escapeHtml(sp.ma) + '">' +
        '<header class="dau-dm">' +
          '<span class="ma-sp">' + escapeHtml(sp.ma) + '</span>' +
          '<h3>' + escapeHtml(sp.ten) + '</h3>' +
        '</header>' +
        '<div class="hang-nguon">' + chonNguon + '</div>' +
        (laDrive ? veKhoiDrive(sp, n) : veKhoiTep(sp, n)) +
        '<div class="day-dm">' +
          '<button type="button" class="nut nut-nho nut-chinh" data-hanh-dong="admin-luu-dm" data-ma="' +
            escapeHtml(sp.ma) + '"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu ' + escapeHtml(sp.ma)) + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</article>';
  }

  function veKhoiDrive(sp, n){
    return '' +
      '<div class="khoi-drive">' +
        '<p class="canh-bao-drive"><span aria-hidden="true">⚠️</span> ' +
          'Đường dẫn Drive công khai <strong>không khoá được theo thiết bị</strong> và ' +
          '<strong>không thu hồi được</strong>. Khách chuyển link cho ai thì người đó tải được. ' +
          'Chỉ dùng cho những món bạn chấp nhận điều đó.</p>' +
        '<label class="admin-nhan" for="dm-link-' + escapeHtml(sp.ma) + '">Đường dẫn Google Drive</label>' +
        '<input type="text" id="dm-link-' + escapeHtml(sp.ma) + '" class="admin-nhap"' +
          ' data-dm-link="' + escapeHtml(sp.ma) + '" autocomplete="off" spellcheck="false"' +
          ' placeholder="https://drive.google.com/drive/folders/..."' +
          ' value="' + escapeHtml(n.link) + '">' +
      '</div>';
  }

  function veKhoiTep(sp, n){
    const dong = n.file.map(function(f, i){
      return '' +
        '<div class="dong-tep" data-dong="' + i + '">' +
          '<span class="so-dong">' + (i + 1) + '</span>' +
          '<input type="text" class="admin-nhap o-tep" data-dm-tep="' + escapeHtml(sp.ma) + ':' + i + '"' +
            ' autocomplete="off" spellcheck="false" placeholder="tên tệp trong kho, ví dụ ' +
            escapeHtml(sp.ma) + '/01-ten-file.zip" value="' + escapeHtml(f.tep) + '">' +
          '<input type="text" class="admin-nhap o-ten" data-dm-ten="' + escapeHtml(sp.ma) + ':' + i + '"' +
            ' autocomplete="off" placeholder="tên khách nhìn thấy" value="' + escapeHtml(f.ten) + '">' +
          '<button type="button" class="nut nut-nho nut-vien nut-xoa-dong" data-hanh-dong="admin-xoa-tep"' +
            ' data-ma="' + escapeHtml(sp.ma) + '" data-dong="' + i + '" aria-label="Xoá dòng ' + (i + 1) + '">✕</button>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="khoi-tep">' +
        '<div class="dau-bang-tep">' +
          '<span>Tên tệp trong kho</span><span>Tên khách nhìn thấy</span>' +
        '</div>' +
        (dong || '<p class="chua-co-tep">Chưa khai tệp nào. Bấm “Thêm tệp” bên dưới.</p>') +
        '<button type="button" class="nut nut-nho nut-vien nut-them-tep" data-hanh-dong="admin-them-tep"' +
          ' data-ma="' + escapeHtml(sp.ma) + '">+ Thêm tệp</button>' +
        '<p class="goi-y-tep">Tệp tên bắt đầu bằng <strong>00-</strong> được coi là gói trọn bộ và ' +
          'hiện thành nút riêng trên đầu danh sách của khách.</p>' +
      '</div>';
  }

  // Vẽ lại đúng MỘT thẻ sản phẩm, giữ nguyên phần còn lại của trang.
  function capNhatTheDanhMuc(maSP){
    if (state.trang !== 'admin' || state.admin.module !== 'danh-muc') return;
    const cu = document.querySelector('[data-the-dm="' + maSP + '"]');
    if (!cu) return;
    const sp = timSanPham(maSP);
    if (!sp) return;
    const tam = document.createElement('div');
    tam.innerHTML = veTheDanhMuc(sp);
    cu.parentNode.replaceChild(tam.firstChild, cu);
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminDoiNguon(maSP, nguon){
    if (!NGUON_HANG[nguon]) return;
    nhapDanhMuc(maSP).nguon = nguon;
    capNhatTheDanhMuc(maSP);
  }

  function adminThemTep(maSP){
    nhapDanhMuc(maSP).file.push({ tep: '', ten: '' });
    capNhatTheDanhMuc(maSP);
  }

  function adminXoaTep(maSP, chiSo){
    const n = nhapDanhMuc(maSP);
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || i < 0 || i >= n.file.length) return;
    n.file.splice(i, 1);
    capNhatTheDanhMuc(maSP);
  }

  // Gõ vào ô nào thì ghi thẳng vào bản nháp, KHÔNG vẽ lại — vẽ lại là con trỏ
  // nhập nhảy về đầu.
  function adminGoDanhMuc(dich){
    const oTep = dich.getAttribute('data-dm-tep');
    const oTen = dich.getAttribute('data-dm-ten');
    const oLink = dich.getAttribute('data-dm-link');
    if (oLink) { nhapDanhMuc(oLink).link = dich.value; return true; }
    if (oTep || oTen) {
      const phan = String(oTep || oTen).split(':');
      const n = nhapDanhMuc(phan[0]);
      const i = parseInt(phan[1], 10);
      if (!n.file[i]) return true;
      if (oTep) n.file[i].tep = dich.value;
      else n.file[i].ten = dich.value;
      return true;
    }
    return false;
  }

  function adminLuuDanhMuc(maSP){
    if (!firebaseSanSang || !rtdb) return;
    const n = nhapDanhMuc(maSP);
    const nut = 'dm:' + maSP;

    let duLieu;
    if (n.nguon === 'drive') {
      let link = String(n.link || '').trim();
      if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
      if (!link) { alert('Chưa dán đường dẫn Google Drive cho ' + maSP + '.'); return; }
      duLieu = { nguon: 'drive', link: link };
    } else {
      // Bỏ dòng trống, và gọt khoảng trắng thừa ở tên tệp — dấu cách lọt vào
      // tên tệp là khách bấm tải rồi nhận lỗi "không tìm thấy".
      const file = n.file
        .map(function(f){ return { tep: String(f.tep || '').trim(), ten: String(f.ten || '').trim() }; })
        .filter(function(f){ return f.tep; });
      if (!file.length) { alert('Chưa khai tệp nào cho ' + maSP + '.'); return; }
      const thieuTen = file.filter(function(f){ return !f.ten; });
      if (thieuTen.length) {
        alert('Còn ' + thieuTen.length + ' tệp chưa đặt tên hiển thị cho khách.');
        return;
      }
      duLieu = { nguon: 'r2', file: file };
    }

    state.admin.dangLuu = nut;
    capNhatTheDanhMuc(maSP);
    rtdb.ref('danhmuc/' + maSP).set(duLieu).then(function(){
      state.admin.duLieu['danh-muc'] = state.admin.duLieu['danh-muc'] || {};
      state.admin.duLieu['danh-muc'][maSP] = duLieu;
      state.admin.dangLuu = '';
      state.admin.vuaLuu = nut;
      capNhatTheDanhMuc(maSP);
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== nut) return;
        state.admin.vuaLuu = '';
        capNhatTheDanhMuc(maSP);
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được danh mục ' + maSP + ':', e);
      state.admin.dangLuu = '';
      capNhatTheDanhMuc(maSP);
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.');
    });
  }
