
  /* ===========================================================================
     PHẦN 03D — MODULE "KHOÁ HỌC LIGHTROOM MÁY TÍNH" (miễn phí)

     Module này gộp BA khoá học:
       1. Khoá học nhúng danh sách phát YouTube — kênh Tự học đồ hoạ
       2. Khoá học nhúng danh sách phát YouTube — kênh Tú Thanh Blog
       3. "HỌC LIGHTROOM MÁY TÍNH CƠ BẢN ĐẾN NÂNG CAO" — Y CHANG PHẦN 03C (khoá
          học điện thoại): chương/bài tự đánh số theo vị trí thật trong mảng,
          modal xem video toàn màn hình, chủ shop quản lý ở /admin (PHẦN 04F).
          CHỈ KHÁC MỘT CHỖ so với khoá điện thoại: video bài học nằm NGANG
          16:9 (như YouTube) thay vì dọc 9:16, vì khoá này quay lại màn hình
          máy tính.

     Dữ liệu ở nhánh khoahoc/lrPC — tách hẳn khỏi khoahoc/lrMobile của khoá
     điện thoại. Ba trường con: playlist1, playlist2 (đường dẫn danh sách
     phát của khoá 1 và 2, chủ shop dán ở /admin) và muc (mảng chương/bài của
     khoá 3, cùng cơ chế với khoá điện thoại). Các hàm chỉ nhận vào MỘT MẢNG
     và không quan tâm mảng đó của khoá nào (soThuTuKhoaHoc, xepKhoaHoc,
     danhSachBaiPhang, veTheBaiHoc, veKhungVideo/initKhungVideo) được TÁI DÙNG
     NGUYÊN từ PHẦN 03C/03B — xem chú thích đầy đủ ở đó.
     =========================================================================== */

  // Đọc công khai — giống hệt khoá học điện thoại, không cần đăng nhập. Đọc
  // NGUYÊN nhánh khoahoc/lrPC (không chỉ /muc) vì còn cần playlist1/playlist2.
  function taiKhoaHocMayTinh(){
    const kh = state.khoaHocMayTinh;
    if (kh.daTai || kh.dangTai) return Promise.resolve(true);
    if (!firebaseSanSang || !rtdb) return Promise.resolve(false);
    kh.dangTai = true;
    return rtdb.ref('khoahoc/lrPC').once('value').then(function(anh){
      const gia = (anh && anh.val()) || {};
      const goc = gia.muc;
      kh.muc = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      kh.playlist1 = gia.playlist1 || '';
      kh.playlist2 = gia.playlist2 || '';
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

  // Tách mã danh sách phát ra khỏi mọi kiểu link YouTube thường gặp:
  // .../playlist?list=XXX hoặc .../watch?v=...&list=XXX.
  function idPlaylistTuLink(link){
    const m = String(link || '').match(/[?&]list=([A-Za-z0-9_-]+)/);
    return m ? m[1] : '';
  }

  // Khung nhúng danh sách phát — hộp tỉ lệ 16:9 tiêu chuẩn, KHÔNG cần mẹo
  // "phóng to ảo rồi scale xuống" như video Google Drive: iframe YouTube tự
  // co giãn đúng theo khung chứa.
  function veKhungPlaylistYoutube(link){
    const id = idPlaylistTuLink(link);
    if (!id) return '<p class="loi-nhan-hang">Danh sách phát đang được cập nhật, xin quay lại sau nhé.</p>';
    return '' +
      '<div class="khung-playlist-yt">' +
        '<iframe src="https://www.youtube.com/embed/videoseries?list=' + escapeHtml(id) + '"' +
          ' title="Danh sách phát YouTube" loading="lazy" allowfullscreen' +
          ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share">' +
        '</iframe>' +
      '</div>';
  }

  function veKhoiPlaylist(tieuDe, link, maModal){
    return '' +
      '<div class="khoi-playlist-yt">' +
        '<h3 class="ten-khoa-hoc-con">' + escapeHtml(tieuDe) + '</h3>' +
        '<button type="button" class="nut nut-vien nut-nho" data-hanh-dong="mo-mo-ta-kh-pc" data-ma-mo-ta="' +
          maModal + '">Xem mô tả khoá học</button>' +
        veKhungPlaylistYoutube(link) +
      '</div>';
  }

  // Biến văn bản thô (nhiều dòng, có link trần) thành HTML an toàn: link bấm
  // được thật sự (href đầy đủ), chữ hiển thị rút gọn nếu link quá dài, xuống
  // dòng giữ nguyên, phần chữ thường vẫn escapeHtml như mọi nơi khác.
  function moTaCoLinkAn(vanBan){
    const RE_LINK = /https?:\/\/[^\s]+/g;
    const chuoi = String(vanBan || '');
    let ketQua = '';
    let viTri = 0;
    let m;
    while ((m = RE_LINK.exec(chuoi))) {
      ketQua += escapeHtml(chuoi.slice(viTri, m.index)).replace(/\n/g, '<br>');
      let link = m[0];
      let duoi = '';
      // Bỏ dấu câu bám đuôi (kết thúc câu) không thật sự thuộc về URL.
      while (link && /[.,;:!?)\]]$/.test(link)) { duoi = link.slice(-1) + duoi; link = link.slice(0, -1); }
      const hienThi = link.length > 60 ? link.slice(0, 42) + '…' + link.slice(-12) : link;
      ketQua += '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(hienThi) + '</a>' + escapeHtml(duoi);
      viTri = m.index + m[0].length;
    }
    ketQua += escapeHtml(chuoi.slice(viTri)).replace(/\n/g, '<br>');
    return ketQua;
  }

  function moModalMoTaKhoaHocPC(ma){
    const noiDung = ma === 'mo-ta-kh-pc-1' ? MO_TA_KHOA_HOC_PC_1 : MO_TA_KHOA_HOC_PC_2;
    moModal({
      ma: ma,
      tieuDe: 'Mô tả khoá học',
      than: '<div class="mo-ta-khoa-hoc-yt">' + moTaCoLinkAn(noiDung) + '</div>',
      day: '<button type="button" class="nut nut-chinh" data-hanh-dong="dong-modal">Đóng bảng</button>'
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
        '<div class="khoi-khoa-hoc-yt">' +
          veKhoiPlaylist('KHOÁ HỌC TỰ HỌC LIGHTROOM CẤP TỐC TRÊN YOUTUBE (KÊNH: TỰ HỌC ĐỒ HOẠ)',
            kh.playlist1, 'mo-ta-kh-pc-1') +
          veKhoiPlaylist('HỌC CHỈNH ẢNH VỚI ADOBE LIGHTROOM TRONG 60 PHÚT TRÊN YOUTUBE (KÊNH: TÚ THANH BLOG)',
            kh.playlist2, 'mo-ta-kh-pc-2') +
        '</div>' +
        '<div class="khoa-hoc-con">' +
          '<h3 class="ten-khoa-hoc-con">HỌC LIGHTROOM MÁY TÍNH CƠ BẢN ĐẾN NÂNG CAO</h3>' +
          (coNoiDung
            ? '<div class="danh-sach-chuong">' + phan.map(vePhanKhoaHocMayTinh).join('') + '</div>'
            : veKhoaHocDangCapNhat(kh)) +
        '</div>' +
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

  // Mô tả gốc của hai khoá học nhúng từ YouTube — nguyên văn shop cung cấp,
  // hiển thị qua moTaCoLinkAn() (link trần trong này tự biến thành link bấm
  // được, link quá dài tự rút gọn phần chữ hiển thị).
  const MO_TA_KHOA_HOC_PC_1 = `KHOÁ HỌC TỰ HỌC LIGHTROOM CẤP TỐC TRÊN YOUTUBE (KÊNH: TỰ HỌC ĐỒ HOẠ)
6 thg 11, 2021 - HOA XỨ THANH AUDIO  #quanghuyphoto
Link tải tài liệu: https://www.youtube.com/redirect?event=video_description&redir_token=QUM4Zm9rU1BhM1FrdHVPcUdfMndxWW1vRHNMU3xBTl9pYzRjaTBNZktSNFVfOE5DRkJzTXQ5UnY2WUx5a1NqTTRWYWQ0TTAydmZWVWJ3VHIwT2o1N19UcFlTXzhOcmRaOVBBQkVkdk9yNzFyWlZxR0JzVE5ULVFnZVVkcFFBS3dW&q=https%3A%2F%2Fdrive.google.com%2Fdrive%2Ffolders%2F17HCllmVv9tjtUDnE-WOxNa71aGO7rYY7%3Fusp%3Dsharing&v=rQ_7QJrbC0A
Đây là một trong những video hướng dẫn học Lightroom theo giáo trình từ căn bản đến nâng cao về Tự Học Nhiếp ảnh:
Trong video này, tôi sẽ giới thiệu cho các bạn về Lightroom là gì? cách sử dụng chúng ra sao. các vấn đề như giao diện làm việc của Lightroom, các khái niệm và tương tác với công cụ trong Lightroom, những lưu ý cơ bản về bảng điều khiển, thanh điều khiển, và cách chúng ta ẩn hiện và sắp xếp chúng như thế nào.
Trong video chúng ta còn được học về các mở một file làm việc trong Lightroom, một khái niệm cực kì quan trọng là layer trong PS, Cách các bạn quản lý layer của mình hợp lí. qua video các bạn sẽ có thêm những hiểu biết và cách nhìn nhận thực tế hơn về phần mềm chỉnh sửa ảnh chuyên nghiệp hàng đầu thế giới này.
Chúng tôi sẽ giới thiệu đế các bạn một loạt video  hướng dẫn các bạn học và tự học Lightroom theo bộ giáo trình chọn lọc và đầy đủ giúp các bạn có thể tiếp cận nhanh và hiệu quả hơn, giúp các bạn có những giờ học Lightroom online thú vị. sau khóa học các bạn có thể nắm bắt đầy đủ các kiến thức cơ bản, nền tảng về Lightroom, có thể thực hành và tạo ra được những sản phẩm độc đáo cho riêng mình, mang màu sắc cá nhân.
Những kiến thức về Lightroom căn bản này thực sự hữu ích giúp cho các bạn hiểu sâu, hiểu cặn kẽ về bản chất và cách sử dụng từng công cụ một trong phần mềm, Chúng tôi không có lời khuyên nào khác cho các bạn khi tự học Lightroom nói riêng và học các phần mềm khác nói chung, đó là cần phải có sự kiên chì nỗ lực không ngừng mới có những thành quả tốt đẹp, các bạn cần học những kiến thức căn bản, những giáo trình đầy đủ, và thực hành liên tục giúp mình tốt hơn. chúc các bạn thành công.`;

  const MO_TA_KHOA_HOC_PC_2 = `HỌC CHỈNH ẢNH VỚI ADOBE LIGHTROOM TRONG 60 PHÚT TRÊN YOUTUBE (KÊNH: Tú Thanh Blog)
Cùng Tú Thanh Blog học chỉnh ảnh bằng Adobe Lightroom CC2021 trong 60 phút. Học chỉnh ảnh cơ bản cùng Tú Thanh
🔥Tham gia khóa học Quay Dựng video cơ bản với Tú Thanh tại Hà Nội: https://tinyurl.com/r3v3rk29
🔥Links khóa học Lightroom: http://www.tuthanhblog.com/2021/09/ho... - https://www.youtube.com/redirect?event=video_description&redir_token=QUM4Zm9rU1Nyd3RmcXVUdkVhRTI4azlROVQzNHxBTl9pYzRlVkFYQ0JoRlB5eXpMNWI4c0tZemZlcEJLTHZMYXM3NUJCS2NneENHaUUyOTdmUEdZbExRdk9kLUlEaEdYZlBSMFdCdDdiSXBQaWt3eHVoc2lXdjl6bXdsaUpqVnF1&q=http%3A%2F%2Fwww.tuthanhblog.com%2F2021%2F09%2Fhoc-chinh-anh-bang-adobe-lightroom.html&v=A9GZncqZPCo

➡Source: https://tinyurl.com/5dtewt3c
➡Học dựng video cơ bản trong 60 phút:    • Học dựng phim bằng Adobe Premiere Pro CC 2...  ​ - https://www.youtube.com/watch?v=GBnIOTzkBiA

0:00 Giới thiệu
0:33 Những câu hỏi thường gặp
4:20 Giao diện của Adobe Lightroom Classic
8:00 Hướng dẫn Import File vào Lightroom
11:14 Cách Import Preset vào Lightroom
14:09 Các công cụ chỉnh ảnh cơ bản trong Lightroom
20:30 Chỉnh sửa ảnh cơ bản trong Lightroom
27:30 Curve trong Lightroom
30:31 Chỉnh màu với HSL
34:45 Chỉnh màu với Color Grading
40:00 Cách làm ảnh nét hơn trong Lightroom
42:48 Cách tạo Vignette và Noise
46:35 Chỉnh sửa ảnh với Brush Tool
51:08 Xuất file ảnh trong Lightroom
55:03 Một số thủ thuật nhỏ khi dùng Lightroom

=========
✌️My Gear:✌️
➡Sony a6300
➡Sony A7
➡Sony A7III
➡Sony 90 2.8G Macro
➡Sony 70 - 200 F2.8 GM
➡Sony 24 1.4 GM
➡Sony 16-50 kit lens
➡Rokinon 12 F2.0
➡GoPro Hero 7 Black
➡Mavic Pro 2
➡Mavic Air
➡Rode Pro Mic
➡Ronin S
➡Ronin RS2

=========
✌️Follow team Tú Thanh✌️
➡Youtube: http://bit.ly/35P7pIn
➡Fanpage: http://bit.ly/38Zp6XU
➡Cộng đồng After Effects Việt Nam: https://tinyurl.com/y749cvyj
➡Học dựng phim với Adobe Premiere: http://bit.ly/3pjLza6
➡Học nhiếp ảnh và chỉnh ảnh với Lightroom: http://bit.ly/3nR3zZg

=========
✌️Liên hệ hợp tác✌️
➡ Facebook:   / vientuthanh  - https://www.youtube.com/redirect?event=video_description&redir_token=QUM4Zm9rUVBpQWdIeXZkZkt6UnZlNC1XQ1BHZXxBTl9pYzRkR0lQZjB4YUFjV0pHM19YRE5XRk83a3JHUmFVLXVHNzhrYlR3MHFneGZ5TTczOXE2OHBPTDVISjFnbDM4RHdhenpSQ0phQXF4LWVndm1MLUU2ZFhmWHVqNFdTWjFi&q=https%3A%2F%2Fwww.facebook.com%2Fvientuthanh&v=A9GZncqZPCo

#tuthanhblog #lightroom #lightroomcc

=========
© Bản quyền thuộc về Tú Thanh Blog
© Copyright by Tú Thanh Blog ☞ Do not Reup`;
