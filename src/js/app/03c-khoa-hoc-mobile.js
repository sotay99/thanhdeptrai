
  /* ===========================================================================
     PHẦN 03C — MODULE "KHOÁ HỌC CHỈNH MÀU LIGHTROOM ĐIỆN THOẠI" (miễn phí)

     Một khoá học video thật sự, ngay trên web: chia thành CHƯƠNG và BÀI, chủ
     shop quản lý ở /admin (phần 04E). Dữ liệu là MỘT MẢNG có thứ tự
     (khoahoc/lrMobile/muc), mỗi phần tử là một chương hoặc một bài — số thứ tự
     KHÔNG lưu trong dữ liệu, luôn được TÍNH LẠI từ đúng vị trí trong mảng mỗi
     lần vẽ, nên đảo vị trí một cái là số nhảy theo ngay, không bao giờ lệch.

     BÀI THUỘC CHƯƠNG NÀO: quét từ đầu mảng, cứ gặp một chương thì mọi bài
     SAU nó (tới khi gặp chương kế tiếp) đều thuộc chương đó. Bài đứng trước
     chương đầu tiên thì không thuộc chương nào — vẫn hiện bình thường, chỉ
     không nằm trong khối sổ ra.

     Video bài học TÁI DÙNG NGUYÊN component video ở PHẦN 03B
     (idDriveTuLink/veKhungVideo/veNutPlayTo/initKhungVideo/ganTyLeKhungVideo/
     videoToanManHinh) — cùng một khung dọc 9:16, cùng mẹo "phóng to ảo rồi
     scale xuống" để bộ nút của Drive luôn xếp đủ, không vỡ hình.
     =========================================================================== */

  // Đọc công khai — giống hệt danh mục sản phẩm, không cần đăng nhập.
  function taiKhoaHoc(){
    const kh = state.khoaHoc;
    if (kh.daTai || kh.dangTai) return Promise.resolve(true);
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    kh.dangTai = true;
    return rtdb.ref('khoahoc/lrMobile/muc').once('value').then(function(anh){
      const gia = anh && anh.val();
      kh.muc = Array.isArray(gia) ? gia : (gia ? Object.keys(gia).map(function(k){ return gia[k]; }) : []);
      kh.daTai = true;
      kh.dangTai = false;
      if (state.trang === 'chinh' && state.module === 'khoa-hoc-mobile') render();
      return true;
    }).catch(function(e){
      console.error('Không đọc được khoá học Lightroom mobile:', e);
      kh.dangTai = false;
      kh.daTai = true;   // coi như đã tải xong (rỗng) — không hỏi lại vô hạn
      return false;
    });
  }

  // Số thứ tự song song với mảng: soThuTuKhoaHoc(muc)[i] là số của muc[i]
  // (số chương nếu là chương, số bài nếu là bài) — dùng chung cho cả khách
  // lẫn /admin nên chỉ tính MỘT NƠI DUY NHẤT.
  function soThuTuKhoaHoc(muc){
    let soChuong = 0, soBai = 0;
    return (muc || []).map(function(m){
      if (m.loai === 'chuong') { soChuong++; return soChuong; }
      soBai++; return soBai;
    });
  }

  // Xếp mảng phẳng thành từng PHẦN để khách xem dạng sổ ra: mỗi phần có một
  // chương (hoặc không có chương — bài đứng trước chương đầu tiên) và danh
  // sách bài học thuộc phần đó.
  function xepKhoaHoc(muc){
    const so = soThuTuKhoaHoc(muc);
    const phan = [];
    let hienTai = null;
    let moCoc = null;   // gom các bài KHÔNG thuộc chương nào (đứng trước chương đầu tiên)
    (muc || []).forEach(function(m, i){
      if (m.loai === 'chuong') {
        hienTai = { chuong: Object.assign({}, m, { soThuTu: so[i] }), baiHoc: [] };
        phan.push(hienTai);
        return;
      }
      const bai = Object.assign({}, m, { soThuTu: so[i] });
      if (hienTai) {
        hienTai.baiHoc.push(bai);
      } else {
        if (!moCoc) { moCoc = { chuong: null, baiHoc: [] }; phan.unshift(moCoc); }
        moCoc.baiHoc.push(bai);
      }
    });
    return phan;
  }

  // Danh sách bài học theo ĐÚNG thứ tự thật, bỏ qua chương — dùng để chuyển
  // "Bài trước" / "Bài tiếp theo" trong modal xem video, xuyên suốt mọi
  // chương chứ không kẹt trong chương đang mở.
  function danhSachBaiPhang(muc){
    const so = soThuTuKhoaHoc(muc);
    const ra = [];
    (muc || []).forEach(function(m, i){
      if (m.loai === 'bai') ra.push(Object.assign({}, m, { soThuTu: so[i] }));
    });
    return ra;
  }

  // ------------------------------------------------------------------ VẼ

  function veModuleKhoaHocMobile(){
    const kh = state.khoaHoc;
    if (!kh.daTai && !kh.dangTai) taiKhoaHoc();
    const phan = xepKhoaHoc(kh.muc);
    const coNoiDung = phan.some(function(p){ return p.chuong || p.baiHoc.length; });
    return '' +
      '<div class="khoa-hoc-mobile">' +
        '<header class="khoa-hoc-dau">' +
          '<h2>Khoá học chỉnh màu Lightroom điện thoại (miễn phí)</h2>' +
          '<div class="khoa-hoc-khung-dan-nhap">' +
            '<img class="khoa-hoc-anh-dai-dien" src="/assets/anh/dd-sp4.svg" width="140" height="140"' +
              ' loading="lazy" decoding="async" alt="Ảnh đại diện khoá học chỉnh màu Lightroom điện thoại">' +
            '<p class="khoa-hoc-dan-nhap">' + DAN_NHAP_KHOA_HOC_MOBILE + '</p>' +
          '</div>' +
          '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="xem-chi-tiet" data-ma="sp4">' +
            'Xem chi tiết thông tin khoá học này</button>' +
        '</header>' +
        (coNoiDung
          ? '<div class="danh-sach-chuong">' + phan.map(vePhanKhoaHoc).join('') + '</div>'
          : veKhoaHocDangCapNhat(kh)) +
      '</div>';
  }

  function veKhoaHocDangCapNhat(kh){
    if (kh.dangTai || !kh.daTai) return '<p class="loi-nhan-hang">Đang tải nội dung khoá học…</p>';
    return '<p class="loi-nhan-hang">Nội dung khoá học đang được cập nhật, xin quay lại sau nhé.</p>';
  }

  function vePhanKhoaHoc(p){
    const baiHtml = p.baiHoc.map(veTheBaiHoc).join('');
    if (!p.chuong) {
      // Bài đứng trước chương đầu tiên: hiện thẳng ra, không bọc trong khối
      // sổ ra vì không có tên chương nào để làm tiêu đề.
      return baiHtml;
    }
    const c = p.chuong;
    const dangMo = !!kh_chuongDangMo(c.id);
    return '' +
      '<div class="khoi-chuong' + (dangMo ? ' mo' : '') + '" data-khoi-chuong="' + escapeHtml(c.id) + '">' +
        '<button type="button" class="the-chuong" data-hanh-dong="chuong-doi" data-id="' + escapeHtml(c.id) + '"' +
          ' aria-expanded="' + (dangMo ? 'true' : 'false') + '">' +
          '<span class="ten-chuong">Chương ' + c.soThuTu + ': ' + escapeHtml(c.ten || '(chưa đặt tên)') + '</span>' +
          '<span class="mui-ten-xo" aria-hidden="true">' + (dangMo ? '▲' : '▼') + '</span>' +
        '</button>' +
        '<div class="danh-sach-bai-trong-chuong">' +
          (baiHtml || '<p class="chua-co-bai">Chương này chưa có bài học nào.</p>') +
        '</div>' +
      '</div>';
  }

  function kh_chuongDangMo(id){
    return !!state.khoaHoc.chuongMo[id];
  }

  // hanhDong cho phép module "khoá học máy tính" (PHẦN 03D) tái dùng đúng thẻ
  // này nhưng gắn hành động riêng ("mo-bai-hoc-pc") — mỗi khoá đọc dữ liệu từ
  // một nhánh Firebase khác nhau nên không thể dùng chung MỘT hành động.
  function veTheBaiHoc(b, hanhDong){
    return '<button type="button" class="the-bai-hoc" data-hanh-dong="' + (hanhDong || 'mo-bai-hoc') +
      '" data-id="' + escapeHtml(b.id) + '">' +
      '<span class="so-bai" aria-hidden="true">▶</span>' +
      '<span class="ten-bai">Bài ' + b.soThuTu + ': ' + escapeHtml(b.ten || '(chưa đặt tên)') + '</span>' +
    '</button>';
  }

  // Đổi trạng thái sổ ra / khép lại của MỘT chương — chỉ vẽ lại đúng khối đó,
  // không dựng lại cả trang.
  function doiChuongKhoaHoc(id){
    const kh = state.khoaHoc;
    if (kh.chuongMo[id]) delete kh.chuongMo[id];
    else kh.chuongMo[id] = true;
    const khoi = document.querySelector('[data-khoi-chuong="' + id + '"]');
    if (!khoi) { render(); return; }
    const phan = xepKhoaHoc(kh.muc).filter(function(p){ return p.chuong && p.chuong.id === id; })[0];
    if (!phan) { render(); return; }
    const tam = document.createElement('div');
    tam.innerHTML = vePhanKhoaHoc(phan);
    khoi.parentNode.replaceChild(tam.firstChild, khoi);
  }

  // -------------------------------------------------------- MODAL BÀI HỌC
  //
  // Bao TRỌN màn hình (xem CSS [data-ma-modal^="bai-hoc-"]), video dọc 9:16
  // y hệt bảng "Xem hướng dẫn sử dụng" ở trang /sanpham. Hai nút chuyển bài
  // đứng bên trái nút Đóng bảng; bài đầu thì liệt nút "Bài trước", bài cuối
  // thì liệt nút "Bài tiếp theo".

  function moModalBaiHoc(id){
    const flat = danhSachBaiPhang(state.khoaHoc.muc);
    const idx = flat.findIndex(function(b){ return b.id === id; });
    if (idx === -1) return;
    const bai = flat[idx];
    state.khoaHoc.baiDangMo = id;
    moModal({
      ma: 'bai-hoc-' + id,
      tieuDe: 'Bài ' + bai.soThuTu + ': ' + (bai.ten || '(chưa đặt tên)'),
      than: '<div class="noi-dung-bai-hoc">' + veKhungVideo(bai.linkVideo, 'doc') + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="bai-hoc-chuyen" data-id="' + escapeHtml(id) +
          '" data-huong="-1"' + (idx <= 0 ? ' disabled' : '') + '>← Bài trước</button>' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="bai-hoc-chuyen" data-id="' + escapeHtml(id) +
          '" data-huong="1"' + (idx >= flat.length - 1 ? ' disabled' : '') + '>Bài tiếp theo →</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>',
      khiVe: function(){ initKhungVideo(); }
    });
  }

  function chuyenBaiHoc(id, huong){
    const flat = danhSachBaiPhang(state.khoaHoc.muc);
    const idx = flat.findIndex(function(b){ return b.id === id; });
    if (idx === -1) return;
    const idxMoi = idx + (parseInt(huong, 10) || 0);
    if (idxMoi < 0 || idxMoi >= flat.length) return;
    dongModal();
    moModalBaiHoc(flat[idxMoi].id);
  }

  // Câu dẫn nhập — giới thiệu nhanh khoá học, đứng ngay dưới tiêu đề module.
  const DAN_NHAP_KHOA_HOC_MOBILE = '' +
    'Công cụ thì ai cũng mua được, preset thì ai cũng tải được — thứ hiếm là ' +
    '<strong>con mắt biết nhìn ra một tấm ảnh đang thừa gì, thiếu gì</strong>. Khoá học này rèn đúng ' +
    'thứ đó, hoàn toàn miễn phí, học ngay trên điện thoại của bạn. Từng bài là một video ngắn, ' +
    'đi thẳng vào việc: nhìn thông số, kéo đúng thanh, và hiểu VÌ SAO mình kéo như vậy — chứ ' +
    'không phải học thuộc lòng một công thức rồi áp vào mọi tấm ảnh. Nội dung được chia thành ' +
    'từng chương theo chủ đề, mỗi chương gồm vài bài ngắn gọn, học lúc nào cũng được, dừng giữa ' +
    'chừng rồi quay lại vẫn nhớ đang ở bài nào. Học xong khoá này, bạn không còn là người đi xin ' +
    'preset của người khác nữa — bạn là người tự hiểu và tự làm ra màu của riêng mình.';
