
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
  // Ô nhập tự giãn chiều cao theo nội dung, nhưng không vượt quá mức này
  // (px) — sau đó tự cuộn bên trong ô thay vì giãn mãi đẩy nút Gửi ra ngoài.
  const AI_CHAT_O_NHAP_CAO_TOI_DA = 120;

  // Site key reCAPTCHA v3 của Firebase App Check — để TRỐNG thì chat vẫn
  // chạy bình thường, chỉ là không gửi kèm token App Check (server khi đó
  // cũng phải để APP_CHECK_ENFORCE=false thì mới không chặn nhầm khách
  // thật). Điền vào sau khi bật App Check trong Firebase Console > App
  // Check > Apps > thêm reCAPTCHA v3 cho đúng web app này, rồi build lại.
  const AI_CHAT_RECAPTCHA_SITE_KEY = '';
  const AI_CHAT_APP_CHECK_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check-compat.js';
  let aiChatAppCheckSanSang = false;

  // Cụm chào mừng khi khung chat còn TRỐNG (chưa có tin nhắn nào) — 2
  // hoạt hình đứng cạnh nhau (mèo gõ chữ bên phải, các icon chat bên
  // trái) + bong bóng thoại y kiểu dáng "mở bằng trình duyệt web"
  // (PHẦN 08), xem aiChatVeChaoTrong()/aiChatChayChaoTrong() bên dưới.
  // Đồng bộ thời lượng theo hoạt hình DÀI HƠN (mèo gõ chữ, loop:false) —
  // hoạt hình ngắn hơn (icon, loop:true) tự lặp cho tới lúc đó. Cả cụm tự
  // mờ dần biến mất khi hoạt hình dài hơn báo 'complete'.
  const AI_CHAT_CHAO_TYPING_DU_LIEU =
{"nm":"Untitled file","ddd":0,"h":500,"w":500,"meta":{"g":"@lottiefiles/creator 1.2.0"},"layers":[{"ty":4,"nm":"Shape Layer - SVG","sr":1,"st":0,"op":150,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[26.500015169382095,23.40270033478737]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[357,306]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"nm":"Group 1","it":[{"ty":"el","bm":0,"hd":false,"nm":"Ellipse 1","d":1,"p":{"a":0,"k":[45.4286,13.0778]},"s":{"a":0,"k":[15.14286,15.14286]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,0.5569,0.9294]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 2","it":[{"ty":"el","bm":0,"hd":false,"nm":"Ellipse 2","d":1,"p":{"a":0,"k":[26.8441,7.57143]},"s":{"a":0,"k":[15.14286,15.14286]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,0.5569,0.9294]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 3","it":[{"ty":"el","bm":0,"hd":false,"nm":"Ellipse 3","d":1,"p":{"a":0,"k":[7.57143,13.0778]},"s":{"a":0,"k":[15.14286,15.14286]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,0.5569,0.9294]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 4","it":[{"ty":"el","bm":0,"hd":false,"nm":"Ellipse 4","d":1,"p":{"a":0,"k":[26.5,32.0067]},"s":{"a":0,"k":[37.8572,29.5974]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,0.5569,0.9294]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":1},{"ty":4,"nm":"laptop","sr":1,"st":0,"op":150,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[127.5,65.5]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[307,318]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"nm":"Group 1","it":[{"ty":"rc","bm":0,"hd":false,"nm":"Rectangle 1","d":1,"p":{"a":0,"k":[175.5,54]},"r":{"a":0,"k":15},"s":{"a":0,"k":[159,108]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[0.9255,0.3176,0.9373]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 2","it":[{"ty":"rc","bm":0,"hd":false,"nm":"Rectangle 2","d":1,"p":{"a":0,"k":[54.5,119.5]},"r":{"a":0,"k":11.5},"s":{"a":0,"k":[109,23]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[0.9255,0.3176,0.9373]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 3","it":[{"ty":"rc","bm":0,"hd":false,"nm":"Rectangle 3","d":1,"p":{"a":0,"k":[161.5,119.5]},"r":{"a":0,"k":11.5},"s":{"a":0,"k":[187,23]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,0.5569,0.9294]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":2},{"ty":4,"nm":"cat hand -left","sr":1,"st":0,"op":150,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[12,40.5]},"s":{"a":1,"k":[{"o":{"x":0,"y":0},"i":{"x":0.36,"y":1},"s":[100,50],"t":0},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,100],"t":18},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[100,50],"t":36},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,100],"t":54},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[100,50],"t":72},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,100],"t":90},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[100,50],"t":108},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,100],"t":126},{"s":[100,50],"t":144}]},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0,"y":0},"i":{"x":0.36,"y":1},"s":[210,360.5],"t":0},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[210,321],"t":18},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[210,360.5],"t":36},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[210,321],"t":54},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[210,360.5],"t":72},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[210,321],"t":90},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[210,360.5],"t":108},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[210,321],"t":126},{"s":[210,360.5],"t":144}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"nm":"Group 1","it":[{"ty":"rc","bm":0,"hd":false,"nm":"Rectangle 1","d":1,"p":{"a":0,"k":[12,20]},"r":{"a":0,"k":12},"s":{"a":0,"k":[24,40]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,1,1]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":3},{"ty":4,"nm":"cat hands","sr":1,"st":0,"op":150,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[12,40.5]},"s":{"a":1,"k":[{"o":{"x":0,"y":0},"i":{"x":0.36,"y":1},"s":[100,100],"t":0},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,56],"t":18},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[100,100],"t":36},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,56],"t":54},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[100,100],"t":72},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,56],"t":90},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[100,100],"t":108},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[100,56],"t":126},{"s":[100,100],"t":144}]},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0,"y":0},"i":{"x":0.36,"y":1},"s":[250,321.5],"t":0},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[250,361],"t":18},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[250,321.5],"t":36},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[250,361],"t":54},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[250,321.5],"t":72},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[250,361],"t":90},{"o":{"x":0.65,"y":0},"i":{"x":1,"y":1},"s":[250,321.5],"t":108},{"o":{"x":0.65,"y":0},"i":{"x":0.36,"y":1},"s":[250,361],"t":126},{"s":[250,321.5],"t":144}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"nm":"Group 1","it":[{"ty":"rc","bm":0,"hd":false,"nm":"Rectangle 1","d":1,"p":{"a":0,"k":[12,20]},"r":{"a":0,"k":12},"s":{"a":0,"k":[24,40]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,1,1]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":4},{"ty":4,"nm":"face","sr":1,"st":0,"op":150,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[35,27.829100109636784]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[229,217],"t":0},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[242,218],"t":30},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[242,218],"t":60},{"s":[229,217],"t":90}]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"nm":"Group 1","it":[{"ty":"sh","bm":0,"hd":false,"nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[-0.4958999999999989,-0.6589999999999989],[0,0],[-0.3903000000000034,0.5556999999999981],[0,0],[0.8096999999999994,0]],"o":[[0,0],[-0.8247999999999998,0],[0,0],[0.408299999999997,0.5427],[0,0],[0.46529999999999916,-0.662700000000001],[0,0]],"v":[[41.0759,22],[29.0038,22],[28.2047,23.6012],[34.4489,31.9008],[36.0664,31.8743],[41.8943,23.5747],[41.0759,22]]}}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[0.9255,0.3176,0.9373]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 2","it":[{"ty":"sh","bm":0,"hd":false,"nm":"Path 2","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[5.6631,0],[0,9.388800000000003],[-11.32184,0],[-3.7101000000000006,-3.078500000000002],[-5.6631,0],[0,-9.3888],[11.321800000000003,0],[3.710099999999997,3.0784999999999982]],"o":[[-3.7101000000000006,3.0784999999999982],[-11.32184,0],[0,-9.3888],[5.6631,0],[3.710099999999997,-3.078500000000002],[11.321800000000003,0],[0,9.388800000000003],[-5.6631,0],[0,0]],"v":[[35,50.0172],[20.5,55],[0,38],[20.5,21],[35,25.9828],[49.5,21],[70,38],[49.5,55],[35,50.0172]]}}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,1,1]},"r":2,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 3","it":[{"ty":"el","bm":0,"hd":false,"nm":"Ellipse 1","d":1,"p":{"a":0,"k":[19.4169,7.07509]},"s":{"a":0,"k":[12.83378,12.83378]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,1,1]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[19.41689968109131,7.075089909136295]},"s":{"a":1,"k":[{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":0},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,14],"t":12},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":24},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":60},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,14],"t":72},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":84},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":120},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,14],"t":132},{"s":[100,100],"t":144}]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[19.41689968109131,7.075089909136295]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 4","it":[{"ty":"el","bm":0,"hd":false,"nm":"Ellipse 2","d":1,"p":{"a":0,"k":[48.4169,7.07509]},"s":{"a":0,"k":[12.83378,12.83378]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[1,1,1]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[48.416900634765625,7.075089909136295]},"s":{"a":1,"k":[{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":0},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,14],"t":12},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":24},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":60},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,14],"t":72},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":84},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,100],"t":120},{"o":{"x":0.167,"y":0.167},"i":{"x":0.833,"y":0.833},"s":[100,14],"t":132},{"s":[100,100],"t":144}]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[48.416900634765625,7.075089909136295]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":5},{"ty":4,"nm":"body","sr":1,"st":0,"op":150,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[147.72282302379608,133.54600262641907]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[205,251]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"nm":"Group 1","it":[{"ty":"sh","bm":0,"hd":false,"nm":"Path 1","d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[0,0],[0,0],[0,0],[-7.207999999999998,-5.405999999999999],[0,0],[0,0]],"o":[[0,0],[0,0],[0,0],[34.59899999999999,-12.974399999999996],[0,0],[0,0],[0,0]],"v":[[293.52,265.092],[48.4471,265.092],[116.923,2],[138.547,54.2581],[203.419,54.2581],[230.449,2],[293.52,265.092]]}}},{"ty":"st","bm":0,"hd":false,"nm":"Stroke","lc":1,"lj":1,"ml":4,"o":{"a":0,"k":100},"w":{"a":0,"k":0.901002},"c":{"a":0,"k":[0,0,0]}},{"ty":"fl","bm":0,"hd":false,"nm":"Fill","c":{"a":0,"k":[0,0,0]},"r":1,"o":{"a":0,"k":100}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]},{"ty":"gr","bm":0,"hd":false,"nm":"Group 2","it":[{"ty":"sh","bm":0,"hd":false,"nm":"Path 2","d":1,"ks":{"a":0,"k":{"c":false,"i":[[0,0],[-22.274,61.25399999999999]],"o":[[2.1392999999999915,-47.138000000000005],[0,0]],"v":[[82.9628,242],[16.5182,166]]}}},{"ty":"st","bm":0,"hd":false,"nm":"Stroke","lc":2,"lj":1,"ml":4,"o":{"a":0,"k":100},"w":{"a":0,"k":25.2665},"c":{"a":0,"k":[0,0,0]}},{"ty":"tr","a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0]},"r":{"a":0,"k":0},"sa":{"a":0,"k":0},"o":{"a":0,"k":100}}]}],"ind":6}],"v":"5.7.0","fr":30,"op":150,"ip":0,"assets":[]};
  const AI_CHAT_CHAO_ICON_DU_LIEU =
{"nm":"Chat","ddd":0,"h":500,"w":500,"meta":{"g":"@lottiefiles/toolkit-js 0.33.2"},"layers":[{"ty":4,"nm":"Dot Blue 2","sr":1,"st":50,"op":350,"ip":50,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[271.453,275.959,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0,0],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":0,"k":100,"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 1","ix":1,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[323.015,275.959],"t":50,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[323.015,255.959],"t":60,"ti":[0,0],"to":[0,0]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[323.015,275.959],"t":70,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[323.015,255.959],"t":80,"ti":[0,-3.333],"to":[0,0]},{"s":[323.015,275.959],"t":90}],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 2","ix":2,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[271.453,275.959],"t":48,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[271.453,255.959],"t":58,"ti":[0,0],"to":[0,0]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[271.453,275.959],"t":68,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[271.453,255.959],"t":78,"ti":[0,-3.333],"to":[0,0]},{"s":[271.453,275.959],"t":88}],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 3","ix":3,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[219.891,275.959],"t":46,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[219.891,255.959],"t":56,"ti":[0,0],"to":[0,0]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[219.891,275.959],"t":66,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[219.891,255.959],"t":76,"ti":[0,-3.333],"to":[0,0]},{"s":[219.891,275.959],"t":86}],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":1,"parent":2},{"ty":4,"nm":"Chat Box Blue 2","sr":1,"st":50,"op":350,"ip":50,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[107.287,102.946,0],"ix":1},"s":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[0,0,100],"t":50},{"s":[100,100,100],"t":60}],"ix":6},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[378.74,378.905,0],"t":100,"ti":[0,8.333,0],"to":[0,-8.333,0]},{"s":[378.74,328.905,0],"t":110}],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":0,"k":100,"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Chat Box White","ix":1,"cix":2,"np":2,"it":[{"ty":"sh","bm":0,"hd":false,"mn":"ADBE Vector Shape - Group","nm":"Path 1","ix":1,"d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[3.108,-1.738],[19.156,0.073],[0,56.877],[-59.24,0],[0,-56.898],[8.235,-14.792],[-0.984,-3.35],[0,0],[2.269,-0.696],[0.871,0.311]],"o":[[-3.343,-1.225],[-16.643,9.485],[-59.24,0],[0,-56.877],[59.24,0],[0.016,16.93],[-1.736,3.029],[0,0],[0.696,2.269],[-0.884,0.271],[0,0]],"v":[[64.8,87.773],[54.638,88.581],[0,102.945],[-107.287,0.002],[0,-102.946],[107.287,0.002],[94.753,48.375],[93.576,58.361],[104.748,94.764],[101.899,100.131],[99.196,100.07]]},"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[0.1059,0.2471,0.8941],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[0,0],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":2},{"ty":4,"nm":"White Dot 2","sr":1,"st":0,"op":300,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[228.618,224.219,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0.135,0,0],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":0,"k":100,"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 1","ix":1,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[280.18,224.219],"t":0,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[280.18,204.219],"t":10,"ti":[0,0],"to":[0,0]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[280.18,224.219],"t":20,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[280.18,204.219],"t":30,"ti":[0,0],"to":[0,0]},{"s":[280.18,224.219],"t":40}],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 2","ix":2,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[228.618,224.219],"t":-2,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[228.618,204.219],"t":8,"ti":[0,0],"to":[0,0]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[228.618,224.219],"t":18,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[228.618,204.219],"t":28,"ti":[0,0],"to":[0,0]},{"s":[228.618,224.219],"t":38}],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 3","ix":3,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[177.056,224.219],"t":-4,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[177.056,204.219],"t":6,"ti":[0,0],"to":[0,0]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[177.056,224.219],"t":16,"ti":[0,0],"to":[0,-3.333]},{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[177.056,204.219],"t":26,"ti":[0,0],"to":[0,0]},{"s":[177.056,224.219],"t":36}],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":3,"parent":4},{"ty":4,"nm":"White Chat Box 2","sr":1,"st":0,"op":300,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[-107.285,103.124,0],"ix":1},"s":{"a":1,"k":[{"o":{"x":0.167,"y":0},"i":{"x":0.833,"y":1},"s":[0,0,100],"t":0},{"s":[100,100,100],"t":10}],"ix":6},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.833,"y":1},"s":[121.198,377.343,0],"t":50,"ti":[0,8.333,0],"to":[0,-8.333,0]},{"s":[121.198,327.343,0],"t":60}],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":0,"k":100,"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Blue Chat Box","ix":1,"cix":2,"np":2,"it":[{"ty":"sh","bm":0,"hd":false,"mn":"ADBE Vector Shape - Group","nm":"Path 1","ix":1,"d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[-3.112,-1.744],[-19.157,0.073],[0,56.976],[59.236,0],[0,-56.98],[-8.24,-14.821],[0.982,-3.347],[0,0],[-2.269,-0.697],[-0.873,0.312]],"o":[[3.348,-1.232],[16.637,9.498],[59.236,0],[0,-56.976],[-59.236,0],[-0.018,16.958],[1.731,3.028],[0,0],[-0.697,2.269],[0.886,0.272],[0,0]],"v":[[-64.811,87.93],[-54.632,88.737],[0.002,103.123],[107.285,0],[0.002,-103.124],[-107.285,0],[-94.747,48.459],[-93.574,58.436],[-104.771,94.929],[-101.925,100.298],[-99.215,100.236]]},"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[0.8353,0.8627,0.8784],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[0,0],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":4},{"ty":4,"nm":"Dot Blue","sr":1,"st":0,"op":51,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[271.453,275.959,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0,0,0],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[100],"t":50},{"s":[0],"t":60}],"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 1","ix":1,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[323.015,275.959],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 2","ix":2,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[271.453,275.959],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 3","ix":3,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[219.891,275.959],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":5,"parent":6},{"ty":4,"nm":"Chat Box Blue","sr":1,"st":0,"op":51,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[107.287,102.946,0],"ix":1},"s":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[100,100,100],"t":0},{"s":[100,100,100],"t":10}],"ix":6},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[378.74,378.905,0],"t":0,"ti":[0,8.333,0],"to":[0,-8.333,0]},{"s":[378.74,328.905,0],"t":10}],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[100],"t":50},{"s":[0],"t":60}],"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Chat Box White","ix":1,"cix":2,"np":2,"it":[{"ty":"sh","bm":0,"hd":false,"mn":"ADBE Vector Shape - Group","nm":"Path 1","ix":1,"d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[3.108,-1.738],[19.156,0.073],[0,56.877],[-59.24,0],[0,-56.898],[8.235,-14.792],[-0.984,-3.35],[0,0],[2.269,-0.696],[0.871,0.311]],"o":[[-3.343,-1.225],[-16.643,9.485],[-59.24,0],[0,-56.877],[59.24,0],[0.016,16.93],[-1.736,3.029],[0,0],[0.696,2.269],[-0.884,0.271],[0,0]],"v":[[64.8,87.773],[54.638,88.581],[0,102.945],[-107.287,0.002],[0,-102.946],[107.287,0.002],[94.753,48.375],[93.576,58.361],[104.748,94.764],[101.899,100.131],[99.196,100.07]]},"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[0.1059,0.2471,0.8941],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[0,0],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":6},{"ty":4,"nm":"White Dot","sr":1,"st":0,"op":11,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[228.618,224.219,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6},"sk":{"a":0,"k":0},"p":{"a":0,"k":[0.135,0,0],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[100],"t":0},{"s":[0],"t":10}],"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 1","ix":1,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[280.18,224.219],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 2","ix":2,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[228.618,224.219],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]},{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Group 3","ix":3,"cix":2,"np":2,"it":[{"ty":"el","bm":0,"hd":false,"mn":"ADBE Vector Shape - Ellipse","nm":"Ellipse Path 1","d":1,"p":{"a":0,"k":[0,0],"ix":3},"s":{"a":0,"k":[34.374,34.374],"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[1,1,1],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[177.056,224.219],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":7,"parent":8},{"ty":4,"nm":"White Chat Box","sr":1,"st":0,"op":11,"ip":0,"hd":false,"ddd":0,"bm":0,"hasMask":false,"ao":0,"ks":{"a":{"a":0,"k":[-107.285,103.124,0],"ix":1},"s":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[100,100,100],"t":0},{"s":[100,100,100],"t":10}],"ix":6},"sk":{"a":0,"k":0},"p":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[121.198,327.343,0],"t":0,"ti":[0,8.333,0],"to":[0,-8.333,0]},{"s":[121.198,277.343,0],"t":10}],"ix":2},"r":{"a":0,"k":0,"ix":10},"sa":{"a":0,"k":0},"o":{"a":1,"k":[{"o":{"x":0.333,"y":0},"i":{"x":0.667,"y":1},"s":[100],"t":0},{"s":[0],"t":10}],"ix":11}},"ef":[],"shapes":[{"ty":"gr","bm":0,"hd":false,"mn":"ADBE Vector Group","nm":"Blue Chat Box","ix":1,"cix":2,"np":2,"it":[{"ty":"sh","bm":0,"hd":false,"mn":"ADBE Vector Shape - Group","nm":"Path 1","ix":1,"d":1,"ks":{"a":0,"k":{"c":true,"i":[[0,0],[-3.112,-1.744],[-19.157,0.073],[0,56.976],[59.236,0],[0,-56.98],[-8.24,-14.821],[0.982,-3.347],[0,0],[-2.269,-0.697],[-0.873,0.312]],"o":[[3.348,-1.232],[16.637,9.498],[59.236,0],[0,-56.976],[-59.236,0],[-0.018,16.958],[1.731,3.028],[0,0],[-0.697,2.269],[0.886,0.272],[0,0]],"v":[[-64.811,87.93],[-54.632,88.737],[0.002,103.123],[107.285,0],[0.002,-103.124],[-107.285,0],[-94.747,48.459],[-93.574,58.436],[-104.771,94.929],[-101.925,100.298],[-99.215,100.236]]},"ix":2}},{"ty":"fl","bm":0,"hd":false,"mn":"ADBE Vector Graphic - Fill","nm":"Fill 1","c":{"a":0,"k":[0.8353,0.8627,0.8784],"ix":4},"r":1,"o":{"a":0,"k":100,"ix":5}},{"ty":"tr","a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"sk":{"a":0,"k":0,"ix":4},"p":{"a":0,"k":[0,0],"ix":2},"r":{"a":0,"k":0,"ix":6},"sa":{"a":0,"k":0,"ix":5},"o":{"a":0,"k":100,"ix":7}}]}],"ind":8}],"v":"5.8.1","fr":30,"op":101,"ip":0,"assets":[]};

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

  // Hiện lúc AI chưa trả về chữ nào — biến mất ngay khi đoạn đầu tiên tới
  // (xem aiChatBatDauTraLoi(), onDelta ghi đè innerHTML là mất luôn).
  const AI_CHAT_DANG_SOAN_HTML = '' +
    '<span class="ai-chat-dang-soan">' +
      '<span class="ai-chat-dang-soan-chu">Shop đang soạn</span>' +
      '<span class="ai-chat-cham"></span><span class="ai-chat-cham"></span><span class="ai-chat-cham"></span>' +
    '</span>';

  function aiChatVeMotDong(tin){
    if (tin.vai === 'nguoi') {
      const noiDungAn = escapeHtml(tin.noiDung).replace(/\n/g, '<br>');
      return '<div class="ai-chat-dong nguoi"><div class="ai-chat-bong nguoi" contenteditable="true" spellcheck="false">' +
        noiDungAn + '</div></div>';
    }
    const than = tin.noiDung ? aiChatDinhDangMarkdown(tin.noiDung) : AI_CHAT_DANG_SOAN_HTML;
    return '<div class="ai-chat-dong ai"><div class="ai-chat-bong ai">' + than + '</div></div>';
  }

  // Dòng gợi mở — chỉ hiện khi CHƯA có cuộc trò chuyện nào (lịch sử rỗng),
  // mất ngay khi gửi tin đầu tiên, hiện lại khi xoá sạch trò chuyện.
  const AI_CHAT_GOI_Y_DAU = 'Bạn cứ hỏi thoải mái, đừng ngại! Shop sẽ trả lời liền tay, không chờ đợi';

  function aiChatVeGoiYDau(){
    return aiChatState.lichSu.length ? '' :
      '<p class="ai-chat-goi-y-dau">' + escapeHtml(AI_CHAT_GOI_Y_DAU) + '</p>';
  }

  // Cụm "mèo chào + bong bóng thoại" khi khung chat còn trống — xem
  // aiChatChayChaoTrong() bên dưới (khởi tạo 2 hoạt hình, đồng bộ thời
  // lượng theo cái DÀI HƠN). choHienChaoTrong=true (PHẦN aiChatVeThan() dưới
  // đây) thì KHÔNG vẽ dòng gợi mở ngay — nó chỉ quay lại sau khi cụm chào
  // trống tự ẩn, xem aiChatKetThucChaoTrong().
  function aiChatVeChaoTrong(){
    return '' +
      '<div class="ai-chat-chao-trong" id="ai-chat-chao-trong">' +
        '<div class="ai-chat-chao-bong-thoai">' + escapeHtml(AI_CHAT_GOI_Y_DAU) + '</div>' +
        '<div class="ai-chat-chao-doi-ban">' +
          '<div class="ai-chat-chao-icon" id="ai-chat-chao-icon"></div>' +
          '<div class="ai-chat-chao-typing" id="ai-chat-chao-typing"></div>' +
        '</div>' +
      '</div>';
  }

  function aiChatChayChaoTrong(){
    dongHoatHinhNoiKhac();
    dangKyHoatHinhNoi(aiChatKetThucChaoTrong);
    napMotLan(LOTTIE_CHAO_SDK, 'js').then(function(){
      const bao = document.getElementById('ai-chat-chao-trong');
      if (!window.lottie || !bao) { aiChatKetThucChaoTrong(); return; }
      const oIcon = document.getElementById('ai-chat-chao-icon');
      const oTyping = document.getElementById('ai-chat-chao-typing');
      window.lottie.loadAnimation({
        container: oIcon, renderer: 'svg', loop: true, autoplay: true,
        animationData: AI_CHAT_CHAO_ICON_DU_LIEU
      });
      const hhTyping = window.lottie.loadAnimation({
        container: oTyping, renderer: 'svg', loop: false, autoplay: true,
        animationData: AI_CHAT_CHAO_TYPING_DU_LIEU
      });
      // Hoạt hình mèo gõ chữ DÀI HƠN (5s) làm mốc chung — icon chat (3,37s,
      // đang loop:true tự lặp) chỉ cần dừng theo khi mốc đó báo xong.
      hhTyping.addEventListener('complete', aiChatKetThucChaoTrong);
    }).catch(aiChatKetThucChaoTrong);
  }

  function aiChatKetThucChaoTrong(){
    const bao = document.getElementById('ai-chat-chao-trong');
    if (!bao || bao.dataset.dangAn) return;
    bao.dataset.dangAn = '1';
    huyDangKyHoatHinhNoi(aiChatKetThucChaoTrong);
    bao.classList.add('ai-chat-chao-trong-an-di');
    setTimeout(function(){
      const b = document.getElementById('ai-chat-chao-trong');
      if (b) b.remove();
      // Chỉ hiện dòng gợi mở lại nếu LÚC NÀY vẫn chưa có tin nhắn nào —
      // khách có thể đã gõ xong và gửi ngay trong lúc cụm chào đang chạy.
      const doan = document.getElementById('ai-chat-doan');
      if (doan && aiChatState.lichSu.length === 0 && !document.querySelector('.ai-chat-goi-y-dau')) {
        doan.insertAdjacentHTML('beforebegin', aiChatVeGoiYDau());
      }
    }, 400);
  }

  function aiChatVeThan(choHienChaoTrong){
    const dong = aiChatState.lichSu.map(aiChatVeMotDong).join('');
    return '' +
      (choHienChaoTrong ? aiChatVeChaoTrong() : aiChatVeGoiYDau()) +
      '<div class="ai-chat-doan" id="ai-chat-doan">' + dong + '</div>' +
      '<div class="ai-chat-nhap">' +
        '<textarea id="ai-chat-o-nhap" class="ai-chat-textarea" rows="1" maxlength="' + AI_CHAT_GIOI_HAN_KY_TU + '" ' +
          'placeholder="Nhắn với Shop... (Enter xuống dòng, Ctrl+Enter để gửi, tối đa ' + AI_CHAT_GIOI_HAN_KY_TU + ' ký tự)"></textarea>' +
        '<button type="button" class="nut nut-chinh nut-nho" data-hanh-dong="ai-chat-gui">Gửi</button>' +
      '</div>';
  }

  // Ô nhập tự giãn chiều cao theo nội dung đang soạn, tới một trần nhất định
  // (AI_CHAT_O_NHAP_CAO_TOI_DA) rồi tự cuộn bên trong thay vì giãn mãi, tránh
  // đẩy khung nhập/nút Gửi ra ngoài màn hình.
  function aiChatTuGianOnhap(o){
    o.style.height = 'auto';
    const caoToiDa = AI_CHAT_O_NHAP_CAO_TOI_DA;
    const caoCanDung = Math.min(o.scrollHeight, caoToiDa);
    o.style.height = caoCanDung + 'px';
    o.style.overflowY = o.scrollHeight > caoToiDa ? 'auto' : 'hidden';
  }

  function aiChatCuonXuongCuoi(){
    const doan = document.getElementById('ai-chat-doan');
    if (doan) doan.scrollTop = doan.scrollHeight;
  }

  function aiChatMo(){
    aiChatDocLichSuPhien();
    // Chốt NGAY lúc mở, trước khi bất cứ gì khác có thể đổi lịch sử — khách
    // mới hoặc vừa xoá sạch trò chuyện (PHẦN "ai-chat-xoa-lich-su") đều rỗng.
    const lichSuRongLucMo = aiChatState.lichSu.length === 0;
    moModal({
      ma: 'ai-chat',
      tieuDe: 'Nhắn tin với Shop - giải đáp thắc mắc',
      than: aiChatVeThan(lichSuRongLucMo),
      day: '',
      khiVe: function(){
        if (lichSuRongLucMo) {
          aiChatChayChaoTrong();
        }
        aiChatCuonXuongCuoi();
        const o = document.getElementById('ai-chat-o-nhap');
        if (o) {
          // KHÔNG tự focus lúc mở modal — khách bấm vào ô nhập mới hiện con
          // trỏ nhấp nháy, theo đúng yêu cầu.
          o.addEventListener('keydown', function(su){
            if (su.key === 'Enter' && (su.ctrlKey || su.metaKey)) {
              su.preventDefault();
              aiChatGuiTinNhan();
            }
            // Enter thường: để trình duyệt tự xuống dòng trong textarea, không chặn.
          });
          o.addEventListener('input', function(){ aiChatTuGianOnhap(o); });
          aiChatTuGianOnhap(o);
        }
        // Nút xoá toàn bộ trò chuyện — đặt đối xứng với nút X (PHẦN chung,
        // 02-shell-nav.js) ở góc trên bên trái, chèn thẳng vào DOM vì moModal()
        // dùng chung không có chỗ khai riêng cho nút phụ ở đầu bảng.
        const khungModal = document.querySelector('.modal-lop[data-ma-modal="ai-chat"] .modal');
        if (khungModal && !khungModal.querySelector('.ai-chat-nut-xoa')) {
          const nutXoa = document.createElement('button');
          nutXoa.type = 'button';
          nutXoa.className = 'ai-chat-nut-xoa';
          nutXoa.setAttribute('data-hanh-dong', 'ai-chat-xoa-lich-su');
          nutXoa.setAttribute('aria-label', 'Xoá toàn bộ trò chuyện');
          nutXoa.innerHTML = '🗑';
          khungModal.insertBefore(nutXoa, khungModal.firstChild);
        }
      }
    });
  }

  // Xoá sạch lịch sử trò chuyện — cả màn hình (bong bóng) lẫn sessionStorage.
  // AI mất hết ngữ cảnh cũ, coi như cuộc trò chuyện mới hoàn toàn vì lần gọi
  // kế tiếp gửi lên server một mảng lịch sử RỖNG.
  function aiChatXoaLichSu(){
    if (!aiChatState.lichSu.length) return; // không có gì để xoá, khỏi hỏi
    if (!window.confirm('Xoá toàn bộ cuộc trò chuyện này? AI sẽ không còn nhớ gì đã nói trước đó.')) return;
    if (aiChatState.dieuKhien) { aiChatState.dieuKhien.abort(); aiChatState.dieuKhien = null; }
    aiChatState.dangGui = false;
    aiChatState.lichSu = [];
    aiChatLuuLichSuPhien();
    const doan = document.getElementById('ai-chat-doan');
    if (doan) doan.innerHTML = '';
    if (doan && !document.querySelector('.ai-chat-goi-y-dau')) {
      doan.insertAdjacentHTML('beforebegin', aiChatVeGoiYDau());
    }
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
    aiChatTuGianOnhap(o);

    const goiYDauTruoc = document.querySelector('.ai-chat-goi-y-dau');
    if (goiYDauTruoc) goiYDauTruoc.remove();

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
      if (hanhDong === 'ai-chat-xoa-lich-su') { aiChatXoaLichSu(); return; }
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

