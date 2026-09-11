
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

  // Bốn sản phẩm có bảng "Hướng dẫn sử dụng" chứa video: khai link Google
  // Drive của video ở đây, đọc công khai giống hệt tên tệp — video hướng dẫn
  // không phải bí mật, chỉ đường tải sản phẩm mới cần giấu.
  const SP_CO_VIDEO = { sp2: true, sp3: true, sp6: true, sp7: true };

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
        linkHuongDan: goc.linkHuongDan || '',
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
        (SP_CO_VIDEO[sp.ma] ? veKhoiVideoHuongDan(sp, n) : '') +
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

  // Link video hướng dẫn: một ô nhập, một nút Lưu (nút chung ở đáy thẻ), và
  // một nút "Xem trước link" tự đứng riêng — vì ĐÂY LÀ NƠI DUY NHẤT chủ shop
  // thấy được đúng thứ khách sẽ thấy TRƯỚC KHI lưu, giống hệt cách Zalo hiện
  // thẻ xem trước ngay khi dán link vào khung chat.
  function veKhoiVideoHuongDan(sp, n){
    const dangXemTruoc = state.admin.xemTruocVideo === sp.ma;
    return '' +
      '<div class="khoi-video-hd">' +
        '<label class="admin-nhan" for="dm-video-' + escapeHtml(sp.ma) + '">Link video hướng dẫn sử dụng</label>' +
        '<p class="admin-ghi-chu">Dán link Google Drive của video (đã bật chia sẻ "Bất kỳ ai có đường liên kết"). ' +
          'Hiện ở bảng "Xem hướng dẫn sử dụng" của khách. Để trống nếu chưa có video.</p>' +
        '<div class="hang-video-hd">' +
          '<input type="text" id="dm-video-' + escapeHtml(sp.ma) + '" class="admin-nhap"' +
            ' data-dm-video="' + escapeHtml(sp.ma) + '" autocomplete="off" spellcheck="false"' +
            ' placeholder="https://drive.google.com/file/d/..." value="' + escapeHtml(n.linkHuongDan) + '">' +
          '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="admin-xem-truoc-video"' +
            ' data-ma="' + escapeHtml(sp.ma) + '">Xem trước link</button>' +
        '</div>' +
        (dangXemTruoc ? veXemTruocVideo(n.linkHuongDan) : '') +
      '</div>';
  }

  // Nhúng thẳng iframe /preview của Drive cho kết quả THẬT: chủ shop thấy ĐÚNG
  // trình phát, ĐÚNG ảnh đại diện, phát thử được luôn. Riêng tên tệp và mô tả
  // thì trình phát không lộ ra ngoài iframe được (nội dung khác máy chủ, trang
  // không tự fetch() đọc được), nên nhờ máy chủ cấp phát (Worker) đọc hộ qua
  // đường /video-xem-truoc — CHỈ đọc og:title/og:description của ĐÚNG một
  // trang Drive tương ứng mã tệp đã dán, không phải trạm trung chuyển đọc
  // trang bất kỳ (xem chú thích ở videoXemTruoc() trong worker/kho-worker.js).
  function veXemTruocVideo(link){
    const id = idDriveTuLink(link);
    if (!link) {
      return '<p class="xem-truoc-video-trong">Ô nhập đang trống, chưa có gì để xem trước.</p>';
    }
    if (!id) {
      return '<div class="xem-truoc-video loi"><span aria-hidden="true">⚠️</span> Không đọc được đường dẫn này. ' +
        'Kiểm tra lại: phải là link TỆP video (không phải link thư mục), và tệp đã bật chia sẻ ' +
        '"Bất kỳ ai có đường liên kết".</div>';
    }
    const src = 'https://drive.google.com/file/d/' + id + '/preview';
    return '' +
      '<div class="xem-truoc-video">' +
        '<div class="khung-video video-ngang"><iframe src="' + escapeHtml(src) + '" allow="autoplay"' +
          ' loading="lazy" title="Xem trước video"></iframe>' +
          '<div class="nut-play-to" data-nut-play aria-hidden="true"></div></div>' +
        '<p class="mo-ta-video-xem-truoc" data-mo-ta-video="' + escapeHtml(id) + '">Đang tải tên và mô tả video…</p>' +
        '<p class="ghi-chu-xem-truoc">Đúng những gì khách sẽ thấy: ảnh đại diện, tên tệp và trình phát ' +
          'của Google Drive. Không phát được thì tệp chưa bật đúng quyền chia sẻ.</p>' +
      '</div>';
  }

  // Gọi Worker để lấy tên + mô tả rồi ghi thẳng vào đúng dòng chữ đang chờ —
  // KHÔNG vẽ lại cả thẻ sản phẩm, vì làm vậy sẽ dựng lại iframe từ đầu, video
  // đang phát thử dở sẽ bị tải lại từ đầu.
  function adminTaiMoTaVideo(id){
    const capNhatDong = function(html){
      const dong = document.querySelector('[data-mo-ta-video="' + id + '"]');
      if (dong) dong.innerHTML = html;
    };
    const chay = function(){
      if (!state.mayChuKho) {
        capNhatDong('<span class="mo-ta-video-loi">Chưa dựng được máy chủ kho nên chưa đọc được tên/mô tả tự động ' +
          '— video phía trên vẫn xem thử bình thường.</span>');
        return;
      }
      fetch(state.mayChuKho + '/video-xem-truoc?id=' + encodeURIComponent(id))
        .then(function(r){ return r.json(); })
        .then(function(kq){
          if (!kq || !kq.duoc) {
            console.error('Không đọc được tên/mô tả video:', kq && kq.lyDo);
            capNhatDong('<span class="mo-ta-video-loi">Không đọc được tên/mô tả tự động lúc này' +
              (kq && kq.lyDo ? ' (mã lỗi: ' + escapeHtml(kq.lyDo) + ')' : '') +
              ' — video phía trên vẫn xem thử bình thường. Mở Console (F12) xem chi tiết nếu cần báo lại cho thợ.</span>');
            return;
          }
          const phan = [];
          if (kq.ten) phan.push('<strong>Tên tệp:</strong> ' + escapeHtml(kq.ten));
          if (kq.moTa) phan.push('<strong>Mô tả:</strong> ' + escapeHtml(kq.moTa));
          capNhatDong(phan.length ? phan.join('<br>') :
            '<span class="mo-ta-video-loi">Tệp này chưa đặt tên hay mô tả riêng trên Drive.</span>');
        })
        .catch(function(e){
          console.error('Lỗi khi gọi /video-xem-truoc:', e);
          capNhatDong('<span class="mo-ta-video-loi">Không đọc được tên/mô tả tự động lúc này (lỗi mạng hoặc CORS) ' +
            '— video phía trên vẫn xem thử bình thường. Mở Console (F12) xem chi tiết nếu cần báo lại cho thợ.</span>');
        });
    };
    if (state.mayChuKho) { chay(); return; }
    taiThongTinKho().then(chay);
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
    const oVideo = dich.getAttribute('data-dm-video');
    if (oLink) { nhapDanhMuc(oLink).link = dich.value; return true; }
    if (oVideo) { nhapDanhMuc(oVideo).linkHuongDan = dich.value; return true; }
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

    // Link video hướng dẫn là một trường ĐỘC LẬP với nguồn hàng — sp2/3/6/7
    // đều lấy hàng từ R2 nhưng video hướng dẫn nằm ở nhánh khác của cùng đối
    // tượng danhmuc/<mã>, nên chỉ cần thêm vào duLieu trước khi .set() cả gói.
    if (SP_CO_VIDEO[maSP]) {
      let video = String(n.linkHuongDan || '').trim();
      if (video && !/^https?:\/\//i.test(video)) video = 'https://' + video;
      duLieu.linkHuongDan = video;
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

  // Bấm "Xem trước link" luôn (RE)MỞ bảng xem trước với giá trị MỚI NHẤT đang
  // gõ trong ô — không phải một công tắc ẩn/hiện. Sửa link rồi bấm lại là thấy
  // ngay video mới, không cần đóng bảng cũ trước.
  function adminXemTruocVideo(maSP){
    state.admin.xemTruocVideo = maSP;
    capNhatTheDanhMuc(maSP);
    const the = document.querySelector('[data-the-dm="' + maSP + '"]');
    if (the) initKhungVideo(the);
    const id = idDriveTuLink(nhapDanhMuc(maSP).linkHuongDan);
    if (id) adminTaiMoTaVideo(id);
  }
