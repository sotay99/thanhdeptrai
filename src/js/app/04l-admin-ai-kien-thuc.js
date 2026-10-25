
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

  // Khung thư mục gợi ý lúc nhánh Firebase CÒN TRỐNG HOÀN TOÀN (chưa ai lưu
  // gì bao giờ) — chỉ để admin đỡ phải tự gõ tên từng thư mục, không phải dữ
  // liệu thật. Mới viết nội dung cho "Văn phong & lưu ý"; các thư mục khác cố
  // ý để trống, viết dần sau. Admin sửa/xoá thoải mái ngay trên bản nháp này
  // — KHÔNG có gì ghi xuống Firebase cho tới khi admin tự bấm "Lưu tất cả".
  const AI_KT_KHUNG_GOI_Y = [
    { loai: 'thu-muc', ten: 'Văn phong & lưu ý' },
    { loai: 'truong', ten: 'Văn phong trả lời', noiDung:
      'Xưng là "Shop", gọi khách là "bạn". Luôn trả lời bằng tiếng Việt (trừ khi khách chủ động dùng ' +
      'ngôn ngữ khác). Giọng điệu thân thiện, gần gũi, ngắn gọn, đi thẳng vào vấn đề — không dài dòng, ' +
      'không rao giảng, không lặp lại câu hỏi của khách. Dùng câu đơn giản, dễ hiểu, hạn chế thuật ngữ kỹ ' +
      'thuật trừ khi khách hỏi chuyên sâu. Có thể dùng 1-2 emoji nhẹ nhàng (😊, 👍) nếu hợp ngữ cảnh, không ' +
      'lạm dụng.' },
    { loai: 'truong', ten: 'Lưu ý trước khi trả lời', noiDung:
      'Không bịa thông tin về giá, chính sách hay tình trạng đơn hàng nếu không chắc — thà nói "Shop sẽ ' +
      'kiểm tra lại giúp bạn" còn hơn trả lời sai. Không hứa thời gian giao hàng cụ thể ngoài đúng quy ' +
      'trình thật của web: khách nhận link/file ngay sau khi xác nhận thanh toán, qua trang nhận hàng ' +
      '(/sanpham), không phải đợi admin gửi email thủ công. Không tiết lộ thông tin nội bộ, không bàn về ' +
      'đối thủ cạnh tranh. Không tự ý cam kết hoàn tiền, đổi trả hay khuyến mãi nào ngoài nội dung đã có ' +
      'trong các thư mục kiến thức khác. Gặp câu hỏi ngoài phạm vi sản phẩm/dịch vụ của shop, hoặc câu hỏi ' +
      'nhạy cảm cần người thật xử lý, trả lời ngắn gọn rồi mời khách bấm nút "Liên hệ Zalo" trên web.' },
    { loai: 'thu-muc', ten: 'Tổng quan về trang web' },
    { loai: 'truong', ten: 'Bố cục và UI/UX', noiDung:
      'thanhdeptrai.vn là một ứng dụng một trang (SPA) — chuyển module bằng #hash trên URL, không tải lại ' +
      'trang. Bố cục chung: góc trên bên trái là nút ba gạch (☰) mở/đóng menu — menu liệt kê toàn bộ module ' +
      'của web; giữa đầu trang là thanh tiêu đề "Shop Thànhđẹptrai.vn", bấm vào đưa về Trang chủ; thân trang ' +
      'là nội dung module đang mở; góc dưới bên phải là nút nổi hình bong bóng chat 💬 (bồng bềnh, chớp mờ-rõ) ' +
      '— chính là nút mở cuộc trò chuyện với AI "Shop" (chatbot này), khách kéo được nút này lên/xuống dọc ' +
      'mép phải màn hình. Riêng hai module "Trọn bộ sản phẩm VIP" và "Mua App VIP Pro" có thêm thanh neo đáy ' +
      'màn hình hiện số sản phẩm đã chọn/giá và nút "Mua hàng".' },
    { loai: 'truong', ten: 'Danh sách module', noiDung:
      'Module kiểu "trang" (chiếm cả màn hình, đổi hẳn nội dung): Trang chủ (landing page) · Trọn bộ sản phẩm ' +
      'VIP cho Lightroom, Photoshop và Thiết kế (lưới thẻ sản phẩm, chọn nhiều món mua gộp) · Mua App VIP Pro ' +
      'giá rẻ (chọn app, không qua giỏ hàng tính giá, mời khách tự nhắn Zalo) · Quà tặng cho người dùng ' +
      'Android (4 link tải app miễn phí: Remini, XingTu, PicsArt, SnapEdit) · Khoá học Lightroom điện thoại · ' +
      'Khoá học Lightroom máy tính · Khoá học Photoshop (đều miễn phí, xem video bài học qua modal) · Xem ' +
      'video ngắn (dạng TikTok, video 1 và 2 xem được ngay tại trang, các video sau phải bấm mở modal) · ' +
      'Image Editor Pro (công cụ chỉnh ảnh ngay trên web). Module kiểu "modal" (bấm vào hiện bảng nổi giữa ' +
      'màn hình, không rời trang đang xem): Liên hệ và Thông tin về Shop · Sự công nhận của khách hàng · Yêu ' +
      'cầu hoàn tiền · Đặc quyền dành cho khách đã từng mua hàng · Điều khoản sử dụng và điều kiện · Bảo mật ' +
      'và quyền riêng tư.' },
    { loai: 'truong', ten: 'Hai trang riêng ngoài hệ thống module', noiDung:
      'Trang nhận hàng (địa chỉ /sanpham): KHÔNG phải nơi bán hàng — đây là địa chỉ riêng gửi cho khách qua ' +
      'email/Zalo SAU KHI đã mua, nơi khách bấm nhận link/file sản phẩm thật. Trang quản trị (địa chỉ /admin): ' +
      'chỉ chủ shop đăng nhập Google mới vào được, dùng để sửa thông tin liên hệ, giá, danh mục sản phẩm, đơn ' +
      'hàng, nội dung khoá học và chính mục "Huấn luyện AI" này — khách mua hàng không có quyền vào trang này.' },
    { loai: 'thu-muc', ten: 'Thông tin shop' },
    { loai: 'truong', ten: 'Giới thiệu chung', noiDung:
      'Thànhđẹptrai.vn là shop bán sản phẩm số: preset/phần mềm chỉnh ảnh Lightroom, Photoshop, các khoá học ' +
      'chỉnh ảnh (Lightroom điện thoại, Lightroom máy tính, Photoshop), các gói "Trọn bộ sản phẩm VIP" và ' +
      '"App VIP Pro giá rẻ". Ngoài ra còn có quà tặng hoàn toàn miễn phí cho người dùng Android (Remini, ' +
      'XingTu, PicsArt, SnapEdit). Khách muốn liên hệ shop (email, Zalo, Telegram, WhatsApp, Fanpage...) thì ' +
      'bấm vào nút "☎ Liên hệ và Thông tin về Shop" ở thanh menu bên trái của web — ở đó có đầy đủ thông tin ' +
      'liên hệ thật của shop. AI không tự đưa ra số điện thoại/email cụ thể, luôn hướng khách bấm đúng nút đó.' },
    { loai: 'thu-muc', ten: 'Giao hàng' },
    { loai: 'thu-muc', ten: 'Mặt hàng có phí' },
    { loai: 'thu-muc', ten: 'Mặt hàng miễn phí' },
    { loai: 'thu-muc', ten: 'Câu hỏi thường gặp' },
    { loai: 'thu-muc', ten: 'Chính sách hoàn tiền / bảo hành' },
    { loai: 'thu-muc', ten: 'Điều khoản sử dụng và điều kiện' },
    { loai: 'truong', ten: 'Nội dung điều khoản', noiDung:
      'Việc khách truy cập và mua hàng tại thanhdeptrai.vn đồng nghĩa đã đọc, hiểu và đồng ý các điều khoản ' +
      'sau (đây là bản tóm tắt — bản đầy đủ luôn hiển thị tại mục "Điều khoản sử dụng và điều kiện" trên web):\n' +
      '1. Sản phẩm số và hình thức giao hàng — toàn bộ sản phẩm (preset, phần mềm, khoá học...) đều là sản ' +
      'phẩm số, giao tự động qua email ngay sau khi nhận được thanh toán, hoặc qua Zalo/SMS nếu khách không ' +
      'để lại email. Mỗi khách nhận một đường dẫn lấy hàng riêng, không dùng chung với ai khác.\n' +
      '2. Giá bán và thanh toán — giá hiển thị trên web là giá cuối cùng. Thanh toán qua chuyển khoản bằng mã ' +
      'QR; shop không lưu và không yêu cầu thông tin thẻ hay tài khoản ngân hàng của khách.\n' +
      '3. Chính sách hoàn tiền — hoàn 100% nếu khách không hài lòng trong 15 ngày đầu sử dụng, không hỏi lý ' +
      'do dài dòng. Khách gửi yêu cầu qua mục "Yêu cầu hoàn tiền" ở menu bên trái.\n' +
      '4. Quyền sử dụng sản phẩm — chỉ dùng cho mục đích cá nhân, tuyệt đối không chia sẻ, bán lại hay phân ' +
      'phối cho bên thứ ba.\n' +
      '5. Giới hạn trách nhiệm — một số sản phẩm liên quan phần mềm bên thứ ba (Adobe Lightroom, Photoshop...); ' +
      'shop không chịu trách nhiệm về lỗi phát sinh từ chính các ứng dụng gốc đó, chỉ chịu trách nhiệm về ' +
      'preset/khoá học do shop cung cấp.\n' +
      '6. Shop có quyền cập nhật điều khoản bất cứ lúc nào, bản mới nhất luôn hiển thị tại đúng mục đó trên web.' },
    { loai: 'thu-muc', ten: 'Bảo mật và quyền riêng tư' },
    { loai: 'truong', ten: 'Nội dung chính sách bảo mật', noiDung:
      'Shop tôn trọng quyền riêng tư của khách hàng (bản đầy đủ luôn hiển thị tại mục "Bảo mật và quyền riêng ' +
      'tư" trên web):\n' +
      '1. Thông tin thu thập — chỉ khi khách chủ động đặt mua hàng hoặc gửi yêu cầu hoàn tiền, shop mới ghi ' +
      'nhận: email, số Zalo/điện thoại, và nội dung khách tự nhập vào biểu mẫu. Trình duyệt khách tự sinh một ' +
      'mã thiết bị ngẫu nhiên (lưu cục bộ, không định danh cá nhân) để nhận đúng hàng đã mua. Shop không bao ' +
      'giờ thu thập mật khẩu hay thông tin thẻ/tài khoản ngân hàng của khách.\n' +
      '2. Mục đích sử dụng — chỉ dùng để giao sản phẩm, hỗ trợ và liên hệ khi cần thiết, không dùng vào mục ' +
      'đích nào khác.\n' +
      '3. Lưu trữ và bảo mật — dữ liệu lưu trên Firebase Realtime Database của Google, chỉ tài khoản đã xác ' +
      'thực của chủ shop mới truy cập được.\n' +
      '4. Chia sẻ với bên thứ ba — shop không bán, không chia sẻ thông tin khách cho bất kỳ bên nào, trừ khi ' +
      'pháp luật yêu cầu.\n' +
      '5. Quyền của khách hàng — khách có quyền yêu cầu xem, chỉnh sửa hoặc xoá thông tin của mình bất cứ lúc ' +
      'nào, chỉ cần liên hệ trực tiếp với shop.\n' +
      '6. Lưu trữ cục bộ trên trình duyệt — web chỉ lưu đúng một mã thiết bị ngẫu nhiên để nhận đúng sản phẩm ' +
      'đã mua, không phải cookie theo dõi quảng cáo hay thu thập hành vi duyệt web.' },
    { loai: 'thu-muc', ten: 'Khuyến mãi đang chạy' }
  ];

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ sau đó chỉ sửa mảng này.
  // taoIdKhoaHoc() tái dùng NGUYÊN từ PHẦN 04E — chỉ là hàm sinh id ngẫu
  // nhiên chung, không có gì riêng của khoá học.
  function aiKtNhap(){
    const a = state.admin;
    if (!a.aiKtNhap) {
      const goc = (a.duLieu['ai-kien-thuc'] || {}).muc;
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      const nguon = mang.length ? mang : AI_KT_KHUNG_GOI_Y;
      a.aiKtNhap = nguon.map(function(m){
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
          'trống thì AI bỏ qua, không đưa vào. Danh sách dưới đây đang là KHUNG GỢI Ý (nếu chưa từng lưu gì) ' +
          '— sửa tên, sửa nội dung, hoặc xoá thoải mái, chỉ thật sự áp dụng khi bấm "Lưu tất cả".</p>' +
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
