
  /* ===========================================================================
     PHẦN 04L — MODULE "HUẤN LUYỆN AI" TRONG TRANG QUẢN TRỊ

     Cây "thư mục → trường" mà máy chủ Cloud Run (07-ai-chat.js gọi tới) đọc
     để ghép vào system prompt — đây chính là NGUỒN KIẾN THỨC #2 trong 3 nguồn
     trả lời của chat bot AI "Shop" (2 nguồn còn lại: lịch sử trò chuyện của
     khách, và kiến thức tổng quát sẵn có của mô hình).

     KIẾN TRÚC Y HỆT PHẦN 04E (Khoá học Lightroom mobile) — một MẢNG có thứ
     tự, vị trí quyết định trường nào thuộc thư mục nào: một "trường" thuộc về
     THƯ MỤC GẦN NHẤT đứng phía trên nó trong mảng. Kéo một trường lên/xuống
     qua ranh giới thư mục là CHUYỂN nó sang thư mục khác luôn — không cần cơ
     chế "di chuyển" riêng. Bản nháp, một nút "Lưu tất cả" duy nhất, giống hệt
     quy ước khoá học.

     Dữ liệu lưu ở nhánh Firebase 'aiKienThuc/muc' (xem NHANH_ADMIN ở PHẦN
     04B và database.rules.json) — đọc CÔNG KHAI (để Cloud Run đọc được mà
     không cần khoá riêng), chỉ admin ghi được.
     =========================================================================== */

  const NHANH_AI_KIEN_THUC = 'aiKienThuc/muc';

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ sau đó chỉ sửa mảng này.
  // taoIdKhoaHoc() tái dùng NGUYÊN từ PHẦN 04E — chỉ là hàm sinh id ngẫu
  // nhiên chung, không có gì riêng của khoá học.
  function aiKtNhap(){
    const a = state.admin;
    if (!a.aiKtNhap) {
      const goc = (a.duLieu['ai-kien-thuc'] || {}).muc;
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      a.aiKtNhap = mang.map(function(m){
        return { id: m.id || taoIdKhoaHoc(), loai: m.loai === 'thu-muc' ? 'thu-muc' : 'truong',
          ten: m.ten || '', noiDung: m.noiDung || '' };
      });
    }
    return a.aiKtNhap;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminAiKienThuc(){
    const n = aiKtNhap();
    const dangLuu = state.admin.dangLuu === 'aikt:tat-ca';
    const vuaLuu = state.admin.vuaLuu === 'aikt:tat-ca';
    return '' +
      '<header class="admin-dau">' +
        '<h2>Huấn luyện AI</h2>' +
        '<p>Nội dung ở đây được chat bot AI "Shop" đọc để trả lời khách — gộp vào mỗi lần có khách hỏi, ' +
          'không cần deploy lại gì cả, lưu xong là có hiệu lực ngay. Sắp vào thư mục cho gọn (ví dụ "Văn ' +
          'phong & lưu ý", "Thông tin shop", "Giao hàng", "Mặt hàng có phí/miễn phí", "Câu hỏi thường ' +
          'gặp"...). Một TRƯỜNG thuộc về THƯ MỤC GẦN NHẤT đứng phía trên nó — kéo một trường lên/xuống qua ' +
          'ranh giới thư mục là chuyển nó sang thư mục khác luôn, không cần thao tác gì thêm. Trường bỏ ' +
          'trống thì AI bỏ qua, không đưa vào.</p>' +
        '<div class="hang-luu-kh">' +
          '<button type="button" class="nut nut-chinh" data-hanh-dong="aikt-luu-tat-ca"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu tất cả') + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="quan-ly-ai-kt" data-quan-ly-aikt>' + veDanhSachAiKt(n) + '</div>';
  }

  function veDanhSachAiKt(n){
    const dong = n.map(function(m, i){ return veDongAiKt(m, i, n.length); }).join('');
    return '' +
      (dong || '<p class="chua-co-tep">Chưa có thư mục hay trường nào. Bấm "+ Thêm thư mục" bên dưới để bắt đầu.</p>') +
      '<div class="hang-them-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="aikt-them-thu-muc">+ Thêm thư mục</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="aikt-them-truong">+ Thêm trường</button>' +
      '</div>';
  }

  function veDongAiKt(m, i, tongSo){
    const lenDuoc = i > 0;
    const xuongDuoc = i < tongSo - 1;
    const nutDoiCho = '' +
      '<div class="cot-nut-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="aikt-len" data-dong="' + i + '"' +
          (lenDuoc ? '' : ' disabled') + ' aria-label="Đưa lên trên">▲</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="aikt-xuong" data-dong="' + i + '"' +
          (xuongDuoc ? '' : ' disabled') + ' aria-label="Đưa xuống dưới">▼</button>' +
      '</div>' +
      '<button type="button" class="nut nut-nho nut-vien nut-xoa-dong" data-hanh-dong="aikt-xoa" data-dong="' + i +
        '" aria-label="Xoá dòng ' + (i + 1) + '">✕</button>';

    if (m.loai === 'thu-muc') {
      return '' +
        '<div class="dong-khoa-hoc dong-chuong-kh" data-dong-aikt="' + i + '">' +
          '<span class="nhan-dong-kh">📁 Thư mục</span>' +
          '<input type="text" class="admin-nhap" data-aikt-ten="' + i + '" autocomplete="off"' +
            ' placeholder="Tên thư mục" value="' + escapeHtml(m.ten) + '">' +
          nutDoiCho +
        '</div>';
    }

    return '' +
      '<div class="dong-khoa-hoc dong-truong-aikt" data-dong-aikt="' + i + '">' +
        '<span class="nhan-dong-kh">📝 Trường</span>' +
        '<input type="text" class="admin-nhap" data-aikt-ten="' + i + '" autocomplete="off"' +
          ' placeholder="Tên trường (chỉ để admin dễ nhận biết)" value="' + escapeHtml(m.ten) + '">' +
        '<textarea class="admin-nhap admin-nhap-van-ban" data-aikt-noi-dung="' + i + '" rows="4" spellcheck="false"' +
          ' placeholder="Nội dung AI sẽ đọc...">' + escapeHtml(m.noiDung) + '</textarea>' +
        nutDoiCho +
      '</div>';
  }

  // Vẽ lại đúng khối danh sách, không dựng lại cả trang — gõ chữ vào ô nào
  // thì con trỏ nhập không bị nhảy về đầu.
  function capNhatQuanLyAiKt(){
    if (state.trang !== 'admin' || state.admin.module !== 'ai-kien-thuc') return;
    const khung = document.querySelector('[data-quan-ly-aikt]');
    if (!khung) { render(); return; }
    khung.innerHTML = veDanhSachAiKt(aiKtNhap());
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  function adminAiKtThemThuMuc(){
    aiKtNhap().push({ id: taoIdKhoaHoc(), loai: 'thu-muc', ten: '', noiDung: '' });
    capNhatQuanLyAiKt();
  }

  function adminAiKtThemTruong(){
    aiKtNhap().push({ id: taoIdKhoaHoc(), loai: 'truong', ten: '', noiDung: '' });
    capNhatQuanLyAiKt();
  }

  function adminAiKtXoaDong(chiSo){
    const n = aiKtNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || i < 0 || i >= n.length) return;
    const m = n[i];
    const nhan = m.loai === 'thu-muc' ? 'thư mục' : 'trường';
    const canhBao = m.loai === 'thu-muc'
      ? ' (các trường bên dưới KHÔNG bị xoá theo — chúng sẽ thuộc về thư mục gần nhất còn lại phía trên)'
      : '';
    if (!window.confirm('Xoá ' + nhan + ' "' + (m.ten || '(chưa đặt tên)') + '"?' + canhBao)) return;
    n.splice(i, 1);
    capNhatQuanLyAiKt();
  }

  function adminAiKtDoiCho(chiSo, huong){
    const n = aiKtNhap();
    const i = parseInt(chiSo, 10);
    const j = i + huong;
    if (isNaN(i) || j < 0 || j >= n.length) return;
    const tam = n[i];
    n[i] = n[j];
    n[j] = tam;
    capNhatQuanLyAiKt();
  }

  // Gõ vào ô nào thì ghi thẳng vào bản nháp, KHÔNG vẽ lại.
  function adminGoAiKt(dich){
    const oTen = dich.getAttribute('data-aikt-ten');
    const oNoiDung = dich.getAttribute('data-aikt-noi-dung');
    if (oTen == null && oNoiDung == null) return false;
    const i = parseInt(oTen != null ? oTen : oNoiDung, 10);
    const n = aiKtNhap();
    if (isNaN(i) || !n[i]) return true;
    if (oTen != null) n[i].ten = dich.value;
    else n[i].noiDung = dich.value;
    return true;
  }

  function adminAiKtLuuTatCa(){
    if (!firebaseSanSang || !rtdb) return;
    const n = aiKtNhap();
    const goi = n.map(function(m){
      const item = { id: m.id, loai: m.loai, ten: m.ten };
      if (m.loai === 'truong') item.noiDung = m.noiDung;
      return item;
    });
    state.admin.dangLuu = 'aikt:tat-ca';
    render();
    rtdb.ref(NHANH_AI_KIEN_THUC).set(goi).then(function(){
      state.admin.duLieu['ai-kien-thuc'] = { muc: goi };
      state.admin.aiKtNhap = null;   // đọc lại đúng dữ liệu vừa lưu, tránh lệch id
      state.admin.dangLuu = '';
      state.admin.vuaLuu = 'aikt:tat-ca';
      render();
      window.setTimeout(function(){
        if (state.admin.vuaLuu !== 'aikt:tat-ca') return;
        state.admin.vuaLuu = '';
        capNhatQuanLyAiKt();
      }, GIAY_HIEN_DA_LUU * 1000);
    }).catch(function(e){
      console.error('Không lưu được nội dung huấn luyện AI:', e);
      state.admin.dangLuu = '';
      render();
      alert('Không lưu được. Firebase từ chối hoặc mất mạng.');
    });
  }
