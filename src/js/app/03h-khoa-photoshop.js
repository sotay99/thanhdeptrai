  /* ===========================================================================
     PHẦN 03H — MODULE "KHOÁ PHOTOSHOP - EDIT ẢNH BẰNG ĐIỆN THOẠI" (miễn phí)

     Y CHANG kiến trúc module "Khoá học chỉnh màu Lightroom điện thoại" (PHẦN
     03C) — một mảng chương/bài có thứ tự đọc công khai từ Realtime Database
     (khoahoc/photoshop/muc), chủ shop quản lý ở /admin (PHẦN 04H) bằng cơ chế
     "bản nháp, một nút Lưu duy nhất", khách bấm vào mở modal xem video dọc
     9:16 + nút chuyển bài trước/sau. Các hàm "trung lập" (soThuTuKhoaHoc,
     xepKhoaHoc, danhSachBaiPhang, veTheBaiHoc, veKhungVideo/initKhungVideo)
     TÁI DÙNG NGUYÊN từ PHẦN 03B/03C — xem chú thích đầy đủ ở đó.

     KHÁC khoá điện thoại đúng MỘT chỗ: KHÔNG có nút "Xem chi tiết thông tin
     khoá học này" — module này không gắn với mã sản phẩm nào trong SAN_PHAM,
     không có bảng mô tả riêng để dẫn tới.
     =========================================================================== */

  // Đọc công khai — giống hệt khoá học điện thoại, không cần đăng nhập.
  function taiKhoaPhotoshop(){
    const kh = state.khoaHocPhotoshop;
    if (kh.daTai || kh.dangTai) return Promise.resolve(true);
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    kh.dangTai = true;
    return rtdb.ref('khoahoc/photoshop/muc').once('value').then(function(anh){
      const gia = anh && anh.val();
      kh.muc = Array.isArray(gia) ? gia : (gia ? Object.keys(gia).map(function(k){ return gia[k]; }) : []);
      kh.daTai = true;
      kh.dangTai = false;
      if (state.trang === 'chinh' && state.module === 'khoa-photoshop') render();
      return true;
    }).catch(function(e){
      console.error('Không đọc được khoá Photoshop:', e);
      kh.dangTai = false;
      kh.daTai = true;   // coi như đã tải xong (rỗng) — không hỏi lại vô hạn
      return false;
    });
  }

  // Câu dẫn nhập — nguyên văn nội dung shop cung cấp, chỉ gói lại thành đoạn
  // mở đầu + danh sách "Bạn sẽ học được gì" + lưu ý cuối cho dễ đọc. Là HTML
  // có sẵn thẻ <p>/<ul> nên đứng trong một <div>, không bọc thêm <p> ngoài.
  const DAN_NHAP_KHOA_PHOTOSHOP = '' +
    '<p>Kết hợp <strong>Photoshop</strong> với <strong>chỉnh màu bằng AI (trí tuệ nhân tạo)</strong> để cho ra ' +
      'bức ảnh đúng theo ý muốn và nhanh chóng nhất — học và làm ngay trên điện thoại, hoàn toàn miễn phí.</p>' +
    '<p><strong>Bạn sẽ học được gì:</strong></p>' +
    '<ul>' +
      '<li>Ghép mọi bức ảnh của bạn bằng công cụ Photoshop trên điện thoại.</li>' +
      '<li>Biết cách cài đặt miễn phí ứng dụng edit hình ảnh và ứng dụng Photoshop trên điện thoại — hướng dẫn ' +
        'rất cụ thể ngay trong khoá học.</li>' +
      '<li>Tương thích với mọi hệ điều hành và mọi cấu hình điện thoại, kể cả điện thoại cấu hình yếu.</li>' +
      '<li>Biến bức ảnh chụp trên điện thoại của bạn trở nên lung linh và xinh đẹp.</li>' +
      '<li>Đầy đủ kỹ năng Photoshop: sử dụng đầy đủ các nhóm công cụ, các filter, adjustments, các lệnh ' +
        'transform, các cách tạo vùng chọn, chỉnh màu, Blending Option, v.v...</li>' +
      '<li>Chỉnh màu sắc chuyên nghiệp ngay trên điện thoại.</li>' +
    '</ul>' +
    '<p><strong>Lưu ý:</strong> đây KHÔNG phải là bán ứng dụng — đây là <strong>khoá học</strong>, rất phù hợp ' +
      'với bạn nào chưa am hiểu về Photoshop và muốn photoshop ngay trên điện thoại. Nếu bạn đang dùng Photoshop ' +
      'trên máy tính, hãy cân nhắc tiếp tục dùng máy tính (nhanh hơn vì có bàn phím) — bạn vẫn có thể áp dụng ' +
      'kiến thức trong khoá học này để photoshop chuyên nghiệp trên máy tính của mình.</p>';

  // ------------------------------------------------------------------ VẼ

  function veModuleKhoaPhotoshop(){
    const kh = state.khoaHocPhotoshop;
    if (!kh.daTai && !kh.dangTai) taiKhoaPhotoshop();
    const phan = xepKhoaHoc(kh.muc);
    const coNoiDung = phan.some(function(p){ return p.chuong || p.baiHoc.length; });
    // Bài 1 (đầu tiên theo đúng thứ tự thật, bất kể cô đơn hay nằm trong
    // chương nào) được xem NGAY tại đây — không cần bấm vào tên bài. Nếu nó
    // nằm trong một chương, chương đó cũng tự mở sẵn (xem vePhanKhoaPhotoshop)
    // để khung video không bị giấu sau cú bấm sổ-chương.
    const baiDau = danhSachBaiPhang(kh.muc)[0];
    return '' +
      '<div class="khoa-hoc-mobile">' +
        '<header class="khoa-hoc-dau">' +
          '<h2>Khoá Photoshop - edit ảnh bằng điện thoại (miễn phí)</h2>' +
          '<div class="khoa-hoc-khung-dan-nhap">' +
            '<img class="khoa-hoc-anh-dai-dien" src="/assets/anh/dd-khoa-photoshop.svg" width="140" height="140"' +
              ' loading="lazy" decoding="async" alt="Ảnh đại diện khoá Photoshop - edit ảnh bằng điện thoại">' +
            '<div class="khoa-hoc-dan-nhap">' + DAN_NHAP_KHOA_PHOTOSHOP + '</div>' +
          '</div>' +
        '</header>' +
        (coNoiDung
          ? '<div class="danh-sach-chuong">' +
              phan.map(function(p){ return vePhanKhoaPhotoshop(p, baiDau ? baiDau.id : null); }).join('') +
            '</div>'
          : veKhoaHocDangCapNhat(kh)) +
      '</div>';
  }

  // idBaiXemNgay: id của Bài 1 toàn khoá (hoặc null) — bài này được chèn
  // khung video NGAY sau tên bài, xem ngay tại trang mà không cần bấm vào.
  function vePhanKhoaPhotoshop(p, idBaiXemNgay){
    const baiHtml = p.baiHoc.map(function(b){
      const the = veTheBaiHoc(b, 'mo-bai-hoc-ps');
      if (!idBaiXemNgay || b.id !== idBaiXemNgay) return the;
      return the + '<div class="video-ngan-xem-ngay">' + veKhungVideo(b.linkVideo, 'doc') + '</div>';
    }).join('');
    if (!p.chuong) {
      // Bài đứng trước chương đầu tiên: hiện thẳng ra, không bọc trong khối
      // sổ ra vì không có tên chương nào để làm tiêu đề.
      return baiHtml;
    }
    const c = p.chuong;
    // Chương CHỨA Bài 1 tự mở sẵn — không thì khung video xem-ngay vừa chèn
    // ở trên bị giấu sau cú bấm sổ-chương, trái với yêu cầu "không cần bấm
    // vào tên". Vẫn cho khách tự đóng/mở tay bình thường sau đó.
    const macDinhMo = !!(idBaiXemNgay && p.baiHoc.some(function(b){ return b.id === idBaiXemNgay; }));
    const dangMo = kh_chuongDangMoPhotoshop(c.id, macDinhMo);
    return '' +
      '<div class="khoi-chuong' + (dangMo ? ' mo' : '') + '" data-khoi-chuong="' + escapeHtml(c.id) + '">' +
        '<button type="button" class="the-chuong" data-hanh-dong="chuong-doi-ps" data-id="' + escapeHtml(c.id) + '"' +
          ' aria-expanded="' + (dangMo ? 'true' : 'false') + '">' +
          '<span class="ten-chuong">Chương ' + c.soThuTu + ': ' + escapeHtml(c.ten || '(chưa đặt tên)') + '</span>' +
          '<span class="mui-ten-xo" aria-hidden="true">' + (dangMo ? '▲' : '▼') + '</span>' +
        '</button>' +
        '<div class="danh-sach-bai-trong-chuong">' +
          (baiHtml || '<p class="chua-co-bai">Chương này chưa có bài học nào.</p>') +
        '</div>' +
      '</div>';
  }

  // macDinh: trạng thái khi khách CHƯA từng tự bấm sổ/đóng chương này (map
  // chưa có khoá id) — cho vePhanKhoaPhotoshop tự mở sẵn đúng MỘT chương
  // (chương chứa Bài 1), mọi chương khác vẫn đóng như cũ. Đã bấm tay một lần
  // thì giữ đúng ý khách, không ép lại theo mặc định nữa.
  function kh_chuongDangMoPhotoshop(id, macDinh){
    const gia = state.khoaHocPhotoshop.chuongMo[id];
    return gia === undefined ? !!macDinh : !!gia;
  }

  // Đổi trạng thái sổ ra / khép lại của MỘT chương — chỉ vẽ lại đúng khối đó,
  // không dựng lại cả trang.
  function doiChuongKhoaPhotoshop(id){
    const kh = state.khoaHocPhotoshop;
    const khoi = document.querySelector('[data-khoi-chuong="' + id + '"]');
    // Đọc trạng thái ĐANG HIỆN THẬT SỰ trên màn hình (không phải chỉ dựa vào
    // map chuongMo) — chương chứa Bài 1 có thể đang mở do MẶC ĐỊNH (không có
    // khoá trong map) chứ không phải do khách từng bấm; đảo đúng cái đang
    // thấy rồi LƯU rõ ràng true/false, từ đây về sau khách tự quyết, không
    // bị mặc định ép lại nữa.
    const dangMoHienTai = khoi ? khoi.classList.contains('mo') : !!kh.chuongMo[id];
    kh.chuongMo[id] = !dangMoHienTai;
    if (!khoi) { render(); return; }
    const phan = xepKhoaHoc(kh.muc).filter(function(p){ return p.chuong && p.chuong.id === id; })[0];
    if (!phan) { render(); return; }
    const baiDau = danhSachBaiPhang(kh.muc)[0];
    const tam = document.createElement('div');
    tam.innerHTML = vePhanKhoaPhotoshop(phan, baiDau ? baiDau.id : null);
    khoi.parentNode.replaceChild(tam.firstChild, khoi);
    // replaceChild() không đi qua PHẦN 02 (nơi gọi initKhungVideo() sau mỗi
    // render() bình thường) — tự gọi lại nếu khung Bài 1 vừa được thay mới.
    if (baiDau && phan.baiHoc.some(function(b){ return b.id === baiDau.id; })) initKhungVideo();
  }

  // -------------------------------------------------------- MODAL BÀI HỌC
  //
  // Bao TRỌN màn hình (xem CSS [data-ma-modal^="bai-hoc-"]), video dọc 9:16 —
  // khoá học quay lại thao tác ngay trên điện thoại. Hai nút chuyển bài đứng
  // bên trái nút Đóng bảng; bài đầu thì liệt nút "Bài trước", bài cuối thì
  // liệt nút "Bài tiếp theo".

  function moModalBaiHocPhotoshop(id){
    const flat = danhSachBaiPhang(state.khoaHocPhotoshop.muc);
    const idx = flat.findIndex(function(b){ return b.id === id; });
    if (idx === -1) return;
    const bai = flat[idx];
    state.khoaHocPhotoshop.baiDangMo = id;
    moModal({
      ma: 'bai-hoc-ps-' + id,
      tieuDe: 'Bài ' + bai.soThuTu + ': ' + (bai.ten || '(chưa đặt tên)'),
      than: '<div class="noi-dung-bai-hoc">' + veKhungVideo(bai.linkVideo, 'doc') + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="bai-hoc-chuyen-ps" data-id="' + escapeHtml(id) +
          '" data-huong="-1"' + (idx <= 0 ? ' disabled' : '') + '>← Bài trước</button>' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="bai-hoc-chuyen-ps" data-id="' + escapeHtml(id) +
          '" data-huong="1"' + (idx >= flat.length - 1 ? ' disabled' : '') + '>Bài tiếp theo →</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>',
      khiVe: function(){ initKhungVideo(); }
    });
  }

  function chuyenBaiHocPhotoshop(id, huong){
    const flat = danhSachBaiPhang(state.khoaHocPhotoshop.muc);
    const idx = flat.findIndex(function(b){ return b.id === id; });
    if (idx === -1) return;
    const idxMoi = idx + (parseInt(huong, 10) || 0);
    if (idxMoi < 0 || idxMoi >= flat.length) return;
    dongModal();
    moModalBaiHocPhotoshop(flat[idxMoi].id);
  }
