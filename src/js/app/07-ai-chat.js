
  /* ===========================================================================
     PHẦN 07 — TRỢ LÝ AI "SHOP": nút nổi mở kênh chat với AI, chỉ có mặt ở giao
     diện khách mua hàng (không hiện ở trang quản trị).

     KIẾN TRÚC:
     - Nút nổi + bảng chat chỉ chèn MỘT LẦN lúc boot(), không đi qua render()
       của module nên chuyển module không làm mất cuộc trò chuyện đang gõ.
     - Lịch sử trò chuyện giữ trong biến JS thường (KHÔNG localStorage/
       sessionStorage thật — nhưng dùng sessionStorage để sống sót qua việc
       chuyển module, mất khi F5 theo đúng yêu cầu).
     - Gửi tin khi AI đang trả lời: HUỶ luồng cũ (AbortController) rồi gọi lại
       với TOÀN BỘ lịch sử (đã có đủ các tin nhắn người dùng chưa được trả lời
       nằm sẵn trong đó) — AI tự nhiên trả lời gộp một lần cho tất cả, không
       cần một hàng đợi riêng.
     - Khoá API KHÔNG nằm ở đây: hàm goiAIChatBot() gọi tới một địa chỉ Cloud
       Run (project thanhdeptrai-shop, dịch vụ "ai-chat-shop", dùng Gemini),
       không gọi trực tiếp tới hãng AI nào từ trình duyệt.

     CHỐNG LẠM DỤNG (vá lỗ hổng tốn tiền API) — lớp thật sự chặn được nằm ở
     SERVER (Cloud Run index.js), những gì ở ĐÂY chỉ là tiện cho khách dùng
     bình thường, không phải hàng rào bảo mật:
       - maxlength trên ô nhập + cắt bớt phòng hờ trong aiChatGuiTinNhan().
       - Mã thiết bị (aiChatThietBiId, lưu localStorage) gửi kèm mỗi lần gọi
         để server đếm số ký tự/ngày — DỄ GIẢ MẠO (xoá localStorage là có mã
         mới), chỉ chặn được người dùng thường, không chặn được kẻ cố tình.
       - Token Firebase App Check (nếu đã điền AI_CHAT_RECAPTCHA_SITE_KEY) —
         đây mới là lớp chặn THẬT kẻ gọi thẳng API bằng script/curl, vì phải
         vượt qua reCAPTCHA thật gắn với đúng trang web này.
     =========================================================================== */

  const AI_CHAT_DIA_CHI_MAY_CHU = 'https://ai-chat-shop-588471551838.asia-southeast1.run.app';
  const AI_CHAT_KHOA_LUU_TRU = 'aiChatLichSu';
  const AI_CHAT_KHOA_VI_TRI = 'aiChatFabTop';
  const AI_CHAT_KHOA_THIET_BI = 'aiChatThietBiId';
  const AI_CHAT_GIOI_HAN_KY_TU = 500;

  // Site key reCAPTCHA v3 của Firebase App Check — để TRỐNG thì chat vẫn
  // chạy bình thường, chỉ là không gửi kèm token App Check (server khi đó
  // cũng phải để APP_CHECK_ENFORCE=false thì mới không chặn nhầm khách
  // thật). Điền vào sau khi bật App Check trong Firebase Console > App
  // Check > Apps > thêm reCAPTCHA v3 cho đúng web app này, rồi build lại.
  const AI_CHAT_RECAPTCHA_SITE_KEY = '';
  const AI_CHAT_APP_CHECK_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check-compat.js';
  let aiChatAppCheckSanSang = false;

  const aiChatState = {
    lichSu: [],          // [{ vai: 'nguoi'|'ai', noiDung: '...' }]
    dangGui: false,
    dieuKhien: null,      // AbortController của luồng đang chạy, nếu có
    daMoLanDau: false
  };

  function aiChatDocLichSuPhien(){
    try {
      const tho = window.sessionStorage.getItem(AI_CHAT_KHOA_LUU_TRU);
      if (tho) aiChatState.lichSu = JSON.parse(tho);
    } catch (loi) { /* phiên trống hoặc dữ liệu hỏng — bỏ qua, bắt đầu lại */ }
  }

  function aiChatLuuLichSuPhien(){
    try { window.sessionStorage.setItem(AI_CHAT_KHOA_LUU_TRU, JSON.stringify(aiChatState.lichSu)); }
    catch (loi) { /* sessionStorage đầy hoặc bị chặn — không sao, chỉ mất khi đổi tab */ }
  }

  // Mã ngẫu nhiên riêng cho thiết bị này, sống qua F5 (localStorage, khác
  // lịch sử trò chuyện) — server dùng để đếm số ký tự khách nhắn mỗi ngày.
  // taoIdKhoaHoc() tái dùng NGUYÊN từ PHẦN 04E, chỉ là hàm sinh chuỗi ngẫu
  // nhiên chung, dùng làm phương án dự phòng khi trình duyệt không có
  // crypto.randomUUID (Safari cũ, trình duyệt trong webview cũ...).
  function aiChatThietBiId(){
    try {
      let id = window.localStorage.getItem(AI_CHAT_KHOA_THIET_BI);
      if (!id) {
        id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : taoIdKhoaHoc();
        window.localStorage.setItem(AI_CHAT_KHOA_THIET_BI, id);
      }
      return id;
    } catch (loi) { return ''; }
  }

  // Bật Firebase App Check một lần lúc trang tải xong — KHÔNG chặn gì nếu
  // chưa điền site key hoặc nạp lỗi, chat vẫn dùng được bình thường (server
  // tự quyết định có đòi token hay không qua biến môi trường
  // APP_CHECK_ENFORCE, không phụ thuộc vào việc client có gửi được hay không).
  function aiChatChuanBiAppCheck(){
    if (!AI_CHAT_RECAPTCHA_SITE_KEY || !firebaseSanSang) return;
    napMotLan(AI_CHAT_APP_CHECK_SDK, 'js').then(function(){
      firebase.appCheck().activate(AI_CHAT_RECAPTCHA_SITE_KEY, true);
      aiChatAppCheckSanSang = true;
    }).catch(function(e){ console.error('Không bật được Firebase App Check:', e); });
  }

  function aiChatLayAppCheckToken(){
    if (!aiChatAppCheckSanSang) return Promise.resolve('');
    return firebase.appCheck().getToken(false).then(function(kq){ return kq.token; })
      .catch(function(){ return ''; });
  }

  // --------------------------------------------------------------- NÚT NỔI

  function aiChatChenNutNoi(){
    if (document.getElementById('fab-chat-ai')) return;
    const nut = document.createElement('button');
    nut.type = 'button';
    nut.id = 'fab-chat-ai';
    nut.className = 'fab-chat-ai';
    nut.setAttribute('aria-label', 'Trò chuyện với Shop');
    nut.setAttribute('data-hanh-dong', 'ai-chat-mo');
    nut.innerHTML = '💬';
    document.body.appendChild(nut);

    // Vị trí mặc định: góc dưới bên phải. Nếu khách đã kéo lần trước thì nhớ
    // lại qua localStorage (sống qua cả F5, khác với lịch sử trò chuyện).
    let viTriTop = null;
    try { viTriTop = window.localStorage.getItem(AI_CHAT_KHOA_VI_TRI); } catch (loi) { /* bỏ qua */ }
    if (viTriTop) {
      nut.style.top = viTriTop;
    } else {
      nut.style.top = (window.innerHeight - 96) + 'px';
    }

    keoThaNhom([{ el: nut }]);
    // keoThaNhom() chỉ kéo-thả, không tự lưu vị trí — lưu lại mỗi khi khách
    // thả tay, để lần sau mở trang nút vẫn ở đúng chỗ khách để.
    const luuViTri = function(){
      try { window.localStorage.setItem(AI_CHAT_KHOA_VI_TRI, nut.style.top); } catch (loi) { /* bỏ qua */ }
    };
    nut.addEventListener('mouseup', luuViTri);
    nut.addEventListener('touchend', luuViTri);

    window.addEventListener('resize', function(){
      const traMax = window.innerHeight - nut.offsetHeight - 4;
      const hienTai = parseFloat(nut.style.top) || 0;
      if (hienTai > traMax) nut.style.top = Math.max(4, traMax) + 'px';
    });
  }

  // ------------------------------------------------------------- BẢNG CHAT

  // Dịch Markdown CƠ BẢN mà AI hay trả về (***đậm nghiêng***, **đậm**,
  // *nghiêng*, `code`, # tiêu đề, dòng bắt đầu bằng "- "/"* " là danh sách)
  // sang HTML — CHỈ dùng cho bong bóng AI. Bong bóng người dùng giữ nguyên
  // văn bản thô (còn phải sửa được tại chỗ), không qua hàm này.
  //
  // Văn bản đã escapeHtml() trước nên các ký tự Markdown (*, #, -, `) không
  // đụng hàng với ký tự HTML đặc biệt (&, <, >, ") — an toàn áp regex sau đó.
  function aiChatDinhDangMarkdown(chu){
    function dinhDangTrongDong(s){
      return s
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/`([^`]+?)`/g, '<code>$1</code>');
    }
    const dongList = escapeHtml(chu).split('\n');
    let html = '';
    let dangMoList = false;
    dongList.forEach(function(dong){
      const moTieuDe = dong.match(/^(#{1,6})\s+(.*)$/);
      const moDanhSach = dong.match(/^[-*]\s+(.*)$/);
      if (moTieuDe) {
        if (dangMoList) { html += '</ul>'; dangMoList = false; }
        const cap = Math.min(moTieuDe[1].length + 2, 6);
        html += '<h' + cap + ' class="ai-chat-tieu-de">' + dinhDangTrongDong(moTieuDe[2]) + '</h' + cap + '>';
        return;
      }
      if (moDanhSach) {
        if (!dangMoList) { html += '<ul>'; dangMoList = true; }
        html += '<li>' + dinhDangTrongDong(moDanhSach[1]) + '</li>';
        return;
      }
      if (dangMoList) { html += '</ul>'; dangMoList = false; }
      if (dong.trim() === '') { html += '<br>'; return; }
      html += '<p>' + dinhDangTrongDong(dong) + '</p>';
    });
    if (dangMoList) html += '</ul>';
    return html;
  }

  function aiChatVeMotDong(tin){
    if (tin.vai === 'nguoi') {
      const noiDungAn = escapeHtml(tin.noiDung).replace(/\n/g, '<br>');
      return '<div class="ai-chat-dong nguoi"><div class="ai-chat-bong nguoi" contenteditable="true" spellcheck="false">' +
        noiDungAn + '</div></div>';
    }
    return '<div class="ai-chat-dong ai"><div class="ai-chat-bong ai">' + aiChatDinhDangMarkdown(tin.noiDung) + '</div></div>';
  }

  function aiChatVeThan(){
    const dong = aiChatState.lichSu.map(aiChatVeMotDong).join('');
    return '' +
      '<div class="ai-chat-doan" id="ai-chat-doan">' + dong + '</div>' +
      '<div class="ai-chat-nhap">' +
        '<textarea id="ai-chat-o-nhap" class="ai-chat-textarea" rows="1" maxlength="' + AI_CHAT_GIOI_HAN_KY_TU + '" ' +
          'placeholder="Nhắn với Shop... (Enter xuống dòng, Ctrl+Enter để gửi, tối đa ' + AI_CHAT_GIOI_HAN_KY_TU + ' ký tự)"></textarea>' +
        '<button type="button" class="nut nut-chinh nut-nho" data-hanh-dong="ai-chat-gui">Gửi</button>' +
      '</div>';
  }

  function aiChatCuonXuongCuoi(){
    const doan = document.getElementById('ai-chat-doan');
    if (doan) doan.scrollTop = doan.scrollHeight;
  }

  function aiChatMo(){
    aiChatDocLichSuPhien();
    moModal({
      ma: 'ai-chat',
      tieuDe: 'Nhắn tin với Shop - giải đáp thắc mắc',
      than: aiChatVeThan(),
      day: '',
      khiVe: function(){
        aiChatCuonXuongCuoi();
        const o = document.getElementById('ai-chat-o-nhap');
        if (o) {
          o.focus();
          o.addEventListener('keydown', function(su){
            if (su.key === 'Enter' && (su.ctrlKey || su.metaKey)) {
              su.preventDefault();
              aiChatGuiTinNhan();
            }
            // Enter thường: để trình duyệt tự xuống dòng trong textarea, không chặn.
          });
        }
      }
    });
  }

  // Bong bóng của người dùng cho phép sửa trực tiếp (contenteditable) — sửa
  // xong bấm ra ngoài là lưu lại đúng câu đã sửa vào lịch sử của phiên.
  function aiChatSuaBong(bong){
    const dong = Array.prototype.indexOf.call(
      document.querySelectorAll('#ai-chat-doan .ai-chat-bong.nguoi'), bong
    );
    if (dong < 0) return;
    // Tìm đúng tin nhắn "người" thứ `dong` trong lịch sử (AI không sửa được).
    let dem = -1, viTri = -1;
    aiChatState.lichSu.forEach(function(tin, i){
      if (tin.vai === 'nguoi') { dem++; if (dem === dong) viTri = i; }
    });
    if (viTri < 0) return;
    const chuMoi = bong.textContent.trim();
    if (chuMoi) aiChatState.lichSu[viTri].noiDung = chuMoi;
    aiChatLuuLichSuPhien();
  }

  function aiChatThemDongVaoManHinh(tin){
    const doan = document.getElementById('ai-chat-doan');
    if (!doan) return null;
    const vo = document.createElement('div');
    vo.innerHTML = aiChatVeMotDong(tin);
    const dong = vo.firstElementChild;
    doan.appendChild(dong);
    aiChatCuonXuongCuoi();
    return dong;
  }

  // Gộp mọi tin nhắn người dùng CHƯA được AI trả lời (kể cả gửi liên tiếp khi
  // AI đang viết) vào MỘT lần gọi: vì luôn gửi nguyên lịch sử, chỉ cần huỷ
  // luồng cũ và gọi lại là tự nhiên có hiệu ứng "đọc hết rồi trả lời gộp".
  function aiChatGuiTinNhan(){
    const o = document.getElementById('ai-chat-o-nhap');
    if (!o) return;
    let chu = o.value.trim();
    if (!chu) return;
    // maxlength trên ô nhập đã chặn gõ/dán quá dài, đây chỉ là phòng hờ nếu
    // giá trị bị đặt bằng cách khác — giới hạn THẬT nằm ở server.
    if (chu.length > AI_CHAT_GIOI_HAN_KY_TU) chu = chu.slice(0, AI_CHAT_GIOI_HAN_KY_TU);
    o.value = '';

    const tinNguoi = { vai: 'nguoi', noiDung: chu };
    aiChatState.lichSu.push(tinNguoi);
    aiChatLuuLichSuPhien();
    aiChatThemDongVaoManHinh(tinNguoi);

    if (aiChatState.dieuKhien) {
      // AI đang trả lời tin trước — dừng ngay, bong bóng dở sẽ bị xoá trong
      // goiAIChatBot() (nhánh bắt lỗi AbortError) rồi gọi lại với đủ cả tin mới.
      aiChatState.dieuKhien.abort();
    }
    aiChatBatDauTraLoi();
  }

  function aiChatBatDauTraLoi(){
    const dieuKhien = new AbortController();
    aiChatState.dieuKhien = dieuKhien;
    aiChatState.dangGui = true;

    const tinAi = { vai: 'ai', noiDung: '' };
    const dongAi = aiChatThemDongVaoManHinh(tinAi);
    const bongAi = dongAi ? dongAi.querySelector('.ai-chat-bong') : null;

    goiAIChatBot(aiChatState.lichSu.slice(), dieuKhien.signal, function(doanMoi){
      tinAi.noiDung += doanMoi;
      if (bongAi) {
        bongAi.innerHTML = aiChatDinhDangMarkdown(tinAi.noiDung);
        aiChatCuonXuongCuoi();
      }
    }).then(function(){
      if (aiChatState.dieuKhien !== dieuKhien) return; // đã bị luồng mới hơn thay chỗ
      aiChatState.dangGui = false;
      aiChatState.dieuKhien = null;
      if (tinAi.noiDung) {
        aiChatState.lichSu.push(tinAi);
        aiChatLuuLichSuPhien();
      } else if (dongAi) {
        dongAi.remove();
      }
    }).catch(function(loi){
      if (loi && loi.name === 'AbortError') {
        // Bị tin nhắn mới hơn huỷ ngang — bỏ bong bóng dở, KHÔNG lưu vào lịch
        // sử (đã có luồng kế tiếp xử lý đủ các tin chưa trả lời).
        if (dongAi) dongAi.remove();
        return;
      }
      if (bongAi) {
        // Lỗi giới hạn (400/429 từ server — vượt ký tự/ngày, tin nhắn quá dài...)
        // có sẵn lời nhắn rõ ràng cho khách, không phải lỗi kỹ thuật chung chung.
        bongAi.textContent = (loi && loi.laLoiGioiHan && loi.message)
          ? loi.message
          : 'Xin lỗi, Shop chưa trả lời được lúc này. Bạn thử gửi lại sau nhé.';
      }
      aiChatState.dangGui = false;
      aiChatState.dieuKhien = null;
    });
  }

  // Gọi máy chủ Cloud Run (chưa gắn địa chỉ — xem AI_CHAT_DIA_CHI_MAY_CHU ở
  // trên). Máy chủ đó giữ khoá API và tự gộp 3 nguồn kiến thức (lịch sử cuộc
  // trò chuyện, kiến thức admin đã huấn luyện, kiến thức tổng quát) rồi trả
  // lời theo luồng (stream) — ở đây chỉ đọc luồng đó và báo dần qua onDelta.
  function goiAIChatBot(lichSu, signal, onDelta){
    if (!AI_CHAT_DIA_CHI_MAY_CHU) {
      return Promise.resolve().then(function(){
        onDelta('Shop chưa kết nối máy chủ AI — phần này sẽ gắn sau.');
      });
    }
    return aiChatLayAppCheckToken().then(function(token){
      const tieuDe = { 'Content-Type': 'application/json' };
      if (token) tieuDe['X-Firebase-AppCheck'] = token;
      return fetch(AI_CHAT_DIA_CHI_MAY_CHU, {
        method: 'POST',
        headers: tieuDe,
        body: JSON.stringify({ tinNhan: lichSu, thietBiId: aiChatThietBiId() }),
        signal: signal
      });
    }).then(function(phanHoi){
      if (!phanHoi.ok) {
        return phanHoi.text().then(function(vanBan){
          const loi = new Error(vanBan || ('Máy chủ AI trả lỗi ' + phanHoi.status));
          // 400 (tin nhắn/ cuộc trò chuyện không hợp lệ) và 429 (vượt giới hạn
          // ký tự/ngày) đều có sẵn lời nhắn tiếng Việt rõ ràng từ server —
          // hiện thẳng cho khách thay vì câu lỗi chung chung.
          loi.laLoiGioiHan = phanHoi.status === 400 || phanHoi.status === 429;
          throw loi;
        });
      }
      if (!phanHoi.body) throw new Error('Máy chủ AI trả lỗi — không có nội dung.');
      const doc = phanHoi.body.getReader();
      const giaiMa = new TextDecoder('utf-8');
      function doc1Doan(){
        return doc.read().then(function(ketQua){
          if (ketQua.done) return;
          onDelta(giaiMa.decode(ketQua.value, { stream: true }));
          return doc1Doan();
        });
      }
      return doc1Doan();
    });
  }

  function aiChatGanSuKien(){
    document.addEventListener('click', function(su){
      const dich = su.target;
      if (!dich || !dich.closest) return;
      const nut = dich.closest('[data-hanh-dong]');
      if (!nut) return;
      const hanhDong = nut.getAttribute('data-hanh-dong');
      if (hanhDong === 'ai-chat-mo') { aiChatMo(); return; }
      if (hanhDong === 'ai-chat-gui') { aiChatGuiTinNhan(); return; }
    });
    // Lưu lại câu đã sửa khi khách bấm ra ngoài bong bóng người dùng.
    document.addEventListener('focusout', function(su){
      const dich = su.target;
      if (dich && dich.classList && dich.classList.contains('ai-chat-bong') && dich.classList.contains('nguoi')) {
        aiChatSuaBong(dich);
      }
    });
  }

  function initAiChat(){
    // Trang quản trị không cần trợ lý AI của khách mua hàng.
    if (state.trang === 'admin') return;
    aiChatChenNutNoi();
    aiChatGanSuKien();
    aiChatChuanBiAppCheck();
  }

  function boot(){
    ganFavicon();
    state.trang = docDuongDan();
    state.nhanHang.maNhanHang = docMaNhanHangTrenDuongDan();
    state.module = docHash();
    state.hieuUngVaoModule = true;   // lần mở trang đầu tiên cũng có hiệu ứng trôi
    if (state.module === 'image-editor-pro') hienCanhBaoImageEditorPro();
    ganSuKien();
    theoDoiNutCuonModal();   // mọi bảng phụ, kể cả bảng viết sau này, tự có 2 nút cuộn
    render();
    doChoThanhDay();
    // Nạp trước thông tin chuyển khoản để lúc khách mở modal thanh toán là có
    // sẵn. Hỏng thì bỏ qua — modal vẫn mở được, chỉ báo chưa lấy được thông tin.
    taiThongTinCK();
    taiThongTinLienHe();
    // Nạp trước link Remini/XingTu (nhánh quaTangAndroid) — cần ở CẢ trang
    // /sanpham (quà tặng kèm theo sp1, PHẦN 03B) lẫn module "Quà tặng
    // Android" (PHẦN 03F), nên nạp chung một lần ở đây thay vì đợi vào đúng
    // module kia mới nạp.
    taiLinkQuaTangAndroid();
    // Địa chỉ máy chủ cấp phát chỉ cần ở trang nhận hàng — trang bán hàng
    // không hỏi tới nên không phải tải.
    if (state.trang === 'sanpham') moTrangNhanHang();
    // Trang quản trị nạp SDK đăng nhập và CSS riêng của nó — chỉ ở đây, để
    // khách mua hàng không phải tải một byte nào của phần quản trị.
    if (state.trang === 'admin') chuanBiAdmin();
    initAiChat();
  }

  boot();
})();
