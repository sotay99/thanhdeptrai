
  /* ===========================================================================
     PHẦN 03D — MODULE "KHOÁ HỌC CHỈNH MÀU LIGHTROOM MÁY TÍNH" (miễn phí)

     Y CHANG PHẦN 03C (khoá học điện thoại): chương/bài tự đánh số theo vị trí
     thật trong mảng, modal xem video toàn màn hình, chủ shop quản lý ở /admin
     (PHẦN 04F). CHỈ KHÁC MỘT CHỖ: video bài học nằm NGANG 16:9 (như YouTube)
     thay vì dọc 9:16, vì khoá này quay lại màn hình máy tính.

     Dữ liệu ở nhánh khoahoc/lrPC/muc — tách hẳn khỏi khoahoc/lrMobile/muc của
     khoá điện thoại, hai khoá không đụng nhau. Các hàm chỉ nhận vào MỘT MẢNG
     và không quan tâm mảng đó của khoá nào (soThuTuKhoaHoc, xepKhoaHoc,
     danhSachBaiPhang, veTheBaiHoc, veKhungVideo/initKhungVideo) được TÁI DÙNG
     NGUYÊN từ PHẦN 03C/03B — xem chú thích đầy đủ ở đó.
     =========================================================================== */

  // Đọc công khai — giống hệt khoá học điện thoại, không cần đăng nhập.
  function taiKhoaHocMayTinh(){
    const kh = state.khoaHocMayTinh;
    if (kh.daTai || kh.dangTai) return Promise.resolve(true);
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    kh.dangTai = true;
    return rtdb.ref('khoahoc/lrPC/muc').once('value').then(function(anh){
      const gia = anh && anh.val();
      kh.muc = Array.isArray(gia) ? gia : (gia ? Object.keys(gia).map(function(k){ return gia[k]; }) : []);
      kh.daTai = true;
      kh.dangTai = false;
      if (state.trang === 'chinh' && state.module === 'khoa-hoc-may-tinh') render();
      return true;
    }).catch(function(e){
      console.error('Không đọc được khoá học Lightroom máy tính:', e);
      kh.dangTai = false;
      kh.daTai = true;   // coi như đã tải xong (rỗng) — không hỏi lại vô hạn
      return false;
    });
  }

  // ------------------------------------------------------------------ VẼ

  function veModuleKhoaHocMayTinh(){
    const kh = state.khoaHocMayTinh;
    if (!kh.daTai && !kh.dangTai) taiKhoaHocMayTinh();
    const phan = xepKhoaHoc(kh.muc);
    const coNoiDung = phan.some(function(p){ return p.chuong || p.baiHoc.length; });
    return '' +
      '<div class="khoa-hoc-mobile">' +
        '<header class="khoa-hoc-dau">' +
          '<h2>Khoá học chỉnh màu Lightroom máy tính (miễn phí)</h2>' +
          '<div class="khoa-hoc-khung-dan-nhap">' +
            '<img class="khoa-hoc-anh-dai-dien" src="/assets/anh/dd-sp5.svg" width="140" height="140"' +
              ' loading="lazy" decoding="async" alt="Ảnh đại diện khoá học chỉnh màu Lightroom máy tính">' +
            '<p class="khoa-hoc-dan-nhap">' + DAN_NHAP_KHOA_HOC_MAY_TINH + '</p>' +
          '</div>' +
          '<button type="button" class="nut nut-vien nut-rong" data-hanh-dong="xem-chi-tiet" data-ma="sp5">' +
            'Xem chi tiết thông tin khoá học này</button>' +
        '</header>' +
        (coNoiDung
          ? '<div class="danh-sach-chuong">' + phan.map(vePhanKhoaHocMayTinh).join('') + '</div>'
          : veKhoaHocDangCapNhat(kh)) +
      '</div>';
  }

  function vePhanKhoaHocMayTinh(p){
    const baiHtml = p.baiHoc.map(function(b){ return veTheBaiHoc(b, 'mo-bai-hoc-pc'); }).join('');
    if (!p.chuong) {
      // Bài đứng trước chương đầu tiên: hiện thẳng ra, không bọc trong khối
      // sổ ra vì không có tên chương nào để làm tiêu đề.
      return baiHtml;
    }
    const c = p.chuong;
    const dangMo = !!kh_chuongDangMoMayTinh(c.id);
    return '' +
      '<div class="khoi-chuong' + (dangMo ? ' mo' : '') + '" data-khoi-chuong="' + escapeHtml(c.id) + '">' +
        '<button type="button" class="the-chuong" data-hanh-dong="chuong-doi-pc" data-id="' + escapeHtml(c.id) + '"' +
          ' aria-expanded="' + (dangMo ? 'true' : 'false') + '">' +
          '<span class="ten-chuong">Chương ' + c.soThuTu + ': ' + escapeHtml(c.ten || '(chưa đặt tên)') + '</span>' +
          '<span class="mui-ten-xo" aria-hidden="true">' + (dangMo ? '▲' : '▼') + '</span>' +
        '</button>' +
        '<div class="danh-sach-bai-trong-chuong">' +
          (baiHtml || '<p class="chua-co-bai">Chương này chưa có bài học nào.</p>') +
        '</div>' +
      '</div>';
  }

  function kh_chuongDangMoMayTinh(id){
    return !!state.khoaHocMayTinh.chuongMo[id];
  }

  // Đổi trạng thái sổ ra / khép lại của MỘT chương — chỉ vẽ lại đúng khối đó,
  // không dựng lại cả trang.
  function doiChuongKhoaHocMayTinh(id){
    const kh = state.khoaHocMayTinh;
    if (kh.chuongMo[id]) delete kh.chuongMo[id];
    else kh.chuongMo[id] = true;
    const khoi = document.querySelector('[data-khoi-chuong="' + id + '"]');
    if (!khoi) { render(); return; }
    const phan = xepKhoaHoc(kh.muc).filter(function(p){ return p.chuong && p.chuong.id === id; })[0];
    if (!phan) { render(); return; }
    const tam = document.createElement('div');
    tam.innerHTML = vePhanKhoaHocMayTinh(phan);
    khoi.parentNode.replaceChild(tam.firstChild, khoi);
  }

  // -------------------------------------------------------- MODAL BÀI HỌC
  //
  // Bao TRỌN màn hình (xem CSS [data-ma-modal^="bai-hoc-"]), video NGANG 16:9
  // — khác duy nhất với khoá điện thoại (video dọc 9:16). Hai nút chuyển bài
  // đứng bên trái nút Đóng bảng; bài đầu thì liệt nút "Bài trước", bài cuối
  // thì liệt nút "Bài tiếp theo".

  function moModalBaiHocMayTinh(id){
    const flat = danhSachBaiPhang(state.khoaHocMayTinh.muc);
    const idx = flat.findIndex(function(b){ return b.id === id; });
    if (idx === -1) return;
    const bai = flat[idx];
    state.khoaHocMayTinh.baiDangMo = id;
    moModal({
      ma: 'bai-hoc-pc-' + id,
      tieuDe: 'Bài ' + bai.soThuTu + ': ' + (bai.ten || '(chưa đặt tên)'),
      than: '<div class="noi-dung-bai-hoc">' + veKhungVideo(bai.linkVideo, 'ngang') + '</div>',
      day: '' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="bai-hoc-chuyen-pc" data-id="' + escapeHtml(id) +
          '" data-huong="-1"' + (idx <= 0 ? ' disabled' : '') + '>← Bài trước</button>' +
        '<button type="button" class="nut nut-vien" data-hanh-dong="bai-hoc-chuyen-pc" data-id="' + escapeHtml(id) +
          '" data-huong="1"' + (idx >= flat.length - 1 ? ' disabled' : '') + '>Bài tiếp theo →</button>' +
        '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>',
      khiVe: function(){ initKhungVideo(); }
    });
  }

  function chuyenBaiHocMayTinh(id, huong){
    const flat = danhSachBaiPhang(state.khoaHocMayTinh.muc);
    const idx = flat.findIndex(function(b){ return b.id === id; });
    if (idx === -1) return;
    const idxMoi = idx + (parseInt(huong, 10) || 0);
    if (idxMoi < 0 || idxMoi >= flat.length) return;
    dongModal();
    moModalBaiHocMayTinh(flat[idxMoi].id);
  }

  // Câu dẫn nhập — giới thiệu nhanh khoá học, đứng ngay dưới tiêu đề module.
  const DAN_NHAP_KHOA_HOC_MAY_TINH = '' +
    'Trên máy tính, Lightroom cho bạn nhiều nút kéo hơn hẳn bản điện thoại — và cũng dễ ' +
    'kéo lung tung hơn hẳn. Khoá học này rèn <strong>con mắt biết nhìn ra một tấm ảnh đang thừa ' +
    'gì, thiếu gì</strong> ngay trên giao diện máy tính, hoàn toàn miễn phí. Từng bài là một video ' +
    'ngắn quay lại đúng màn hình thao tác: nhìn thông số, kéo đúng thanh, và hiểu VÌ SAO mình ' +
    'kéo như vậy — chứ không phải học thuộc lòng một công thức rồi áp vào mọi tấm ảnh. Nội dung ' +
    'được chia thành từng chương theo chủ đề, mỗi chương gồm vài bài ngắn gọn, học lúc nào cũng ' +
    'được, dừng giữa chừng rồi quay lại vẫn nhớ đang ở bài nào. Học xong khoá này, bạn không còn ' +
    'là người đi xin preset của người khác nữa — bạn là người tự hiểu và tự làm ra màu của riêng ' +
    'mình, dù là trên điện thoại hay máy tính.';
