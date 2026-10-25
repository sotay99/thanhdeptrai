
  /* ===========================================================================
     PHẦN 04L — MODULE "HUẤN LUYỆN AI" TRONG TRANG QUẢN TRỊ

     Cây "thư mục → trường" (nhiều cấp, thư mục trong thư mục được) mà máy chủ
     Cloud Run (07-ai-chat.js gọi tới) đọc để ghép vào system prompt — đây
     chính là NGUỒN KIẾN THỨC #2 trong 3 nguồn trả lời của chat bot AI "Shop"
     (2 nguồn còn lại: lịch sử trò chuyện của khách, và kiến thức tổng quát
     sẵn có của mô hình).

     KIẾN TRÚC: một MẢNG PHẲNG, mỗi phần tử tự giữ "cha" — id của thư mục chứa
     nó (rỗng/null nghĩa là nằm ở gốc). Giao diện chỉ hiện CÁC CON TRỰC TIẾP
     của thư mục đang mở (giống trình quản lý tệp) — bấm "Mở ▸" vào sâu một
     cấp, bấm vào một mẩu trong "đường dẫn" (breadcrumb) ở đầu danh sách để
     quay lại đúng cấp đó. Nút lên/xuống/xoá chỉ tác động trong phạm vi ANH EM
     cùng cha — không ảnh hưởng thư mục khác. Xoá một thư mục thì xoá đệ quy
     luôn mọi thứ bên trong nó (có cảnh báo rõ số lượng trước khi xoá).

     Bản nháp, một nút "Lưu tất cả" duy nhất — gõ/thêm/xoá/đổi chỗ/mở thư mục
     chỉ sửa state.admin.aiKtNhap trong bộ nhớ, KHÔNG có gì ghi xuống Firebase
     cho tới khi admin tự bấm nút đó.

     Dữ liệu lưu ở nhánh Firebase 'aiKienThuc/muc' (xem NHANH_ADMIN ở PHẦN
     04B và database.rules.json) — đọc CÔNG KHAI (để Cloud Run đọc được mà
     không cần khoá riêng), chỉ admin ghi được.
     =========================================================================== */

  const NHANH_AI_KIEN_THUC = 'aiKienThuc/muc';

  // Khung thư mục + nội dung gợi ý lúc nhánh Firebase CÒN TRỐNG HOÀN TOÀN
  // (chưa ai lưu gì bao giờ). Admin xem, sửa/xoá thoải mái ngay trên bản
  // nháp — KHÔNG có gì ghi xuống Firebase cho tới khi bấm "Lưu tất cả". Id
  // ở đây là chuỗi cố định (để "cha" tham chiếu được ngay trong mảng này),
  // khi lưu thật thì vẫn giữ nguyên các id này — không sao, Firebase không
  // quan tâm id "đẹp" hay ngẫu nhiên.
  const AI_KT_KHUNG_GOI_Y = [
    { id: 'vanphong', loai: 'thu-muc', ten: 'Văn phong & lưu ý' },
    { id: 'vanphong-1', cha: 'vanphong', loai: 'truong', ten: 'Văn phong trả lời', noiDung:
      'Xưng là "Shop", gọi khách là "bạn". Luôn trả lời bằng tiếng Việt (trừ khi khách chủ động dùng ' +
      'ngôn ngữ khác). Giọng điệu thân thiện, gần gũi, ngắn gọn, đi thẳng vào vấn đề — không dài dòng, ' +
      'không rao giảng, không lặp lại câu hỏi của khách. Dùng câu đơn giản, dễ hiểu, hạn chế thuật ngữ kỹ ' +
      'thuật trừ khi khách hỏi chuyên sâu. Có thể dùng 1-2 emoji nhẹ nhàng (😊, 👍) nếu hợp ngữ cảnh, không ' +
      'lạm dụng.' },
    { id: 'vanphong-2', cha: 'vanphong', loai: 'truong', ten: 'Lưu ý trước khi trả lời', noiDung:
      'Không bịa thông tin về giá, chính sách hay tình trạng đơn hàng nếu không chắc — thà nói "Shop sẽ ' +
      'kiểm tra lại giúp bạn" còn hơn trả lời sai. Không hứa thời gian giao hàng cụ thể ngoài đúng quy ' +
      'trình thật của web: khách nhận link/file ngay sau khi xác nhận thanh toán, qua trang nhận hàng ' +
      '(/sanpham), không phải đợi admin gửi email thủ công. Không tiết lộ thông tin nội bộ, không bàn về ' +
      'đối thủ cạnh tranh. Không tự ý cam kết hoàn tiền, đổi trả hay khuyến mãi nào ngoài nội dung đã có ' +
      'trong các thư mục kiến thức khác. Gặp câu hỏi ngoài phạm vi sản phẩm/dịch vụ của shop, hoặc câu hỏi ' +
      'nhạy cảm cần người thật xử lý, trả lời ngắn gọn rồi mời khách bấm nút "Liên hệ Zalo" trên web.' },

    { id: 'tongquan', loai: 'thu-muc', ten: 'Tổng quan về trang web' },
    { id: 'tongquan-1', cha: 'tongquan', loai: 'truong', ten: 'Bố cục và UI/UX', noiDung:
      'thanhdeptrai.vn là một ứng dụng một trang (SPA) — chuyển module bằng #hash trên URL, không tải lại ' +
      'trang. Bố cục chung: góc trên bên trái là nút ba gạch (☰) mở/đóng menu — menu liệt kê toàn bộ module ' +
      'của web; giữa đầu trang là thanh tiêu đề "Shop Thànhđẹptrai.vn", bấm vào đưa về Trang chủ; thân trang ' +
      'là nội dung module đang mở; góc dưới bên phải là nút nổi hình bong bóng chat 💬 (bồng bềnh, chớp mờ-rõ) ' +
      '— chính là nút mở cuộc trò chuyện với AI "Shop" (chatbot này), khách kéo được nút này lên/xuống dọc ' +
      'mép phải màn hình. Riêng hai module "Trọn bộ sản phẩm VIP" và "Mua App VIP Pro" có thêm thanh neo đáy ' +
      'màn hình hiện số sản phẩm đã chọn/giá và nút "Mua hàng".' },
    { id: 'tongquan-2', cha: 'tongquan', loai: 'truong', ten: 'Danh sách module', noiDung:
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
    { id: 'tongquan-3', cha: 'tongquan', loai: 'truong', ten: 'Hai trang riêng ngoài hệ thống module', noiDung:
      'Trang nhận hàng (địa chỉ /sanpham): KHÔNG phải nơi bán hàng — đây là địa chỉ riêng gửi cho khách qua ' +
      'email/Zalo SAU KHI đã mua, nơi khách bấm nhận link/file sản phẩm thật. Trang quản trị (địa chỉ /admin): ' +
      'chỉ chủ shop đăng nhập Google mới vào được, dùng để sửa thông tin liên hệ, giá, danh mục sản phẩm, đơn ' +
      'hàng, nội dung khoá học và chính mục "Huấn luyện AI" này — khách mua hàng không có quyền vào trang này.' },

    { id: 'thongtinshop', loai: 'thu-muc', ten: 'Thông tin shop' },
    { id: 'thongtinshop-1', cha: 'thongtinshop', loai: 'truong', ten: 'Giới thiệu chung', noiDung:
      'Thànhđẹptrai.vn là shop bán sản phẩm số: preset/phần mềm chỉnh ảnh Lightroom, Photoshop, các khoá học ' +
      'chỉnh ảnh (Lightroom điện thoại, Lightroom máy tính, Photoshop), các gói "Trọn bộ sản phẩm VIP" và ' +
      '"App VIP Pro giá rẻ". Ngoài ra còn có quà tặng hoàn toàn miễn phí cho người dùng Android (Remini, ' +
      'XingTu, PicsArt, SnapEdit). Khách muốn liên hệ shop (email, Zalo, Telegram, WhatsApp, Fanpage...) thì ' +
      'bấm vào nút "☎ Liên hệ và Thông tin về Shop" ở thanh menu bên trái của web — ở đó có đầy đủ thông tin ' +
      'liên hệ thật của shop. AI không tự đưa ra số điện thoại/email cụ thể, luôn hướng khách bấm đúng nút đó.' },

    { id: 'giaohang', loai: 'thu-muc', ten: 'Giao hàng' },
    { id: 'giaohang-1', cha: 'giaohang', loai: 'truong', ten: 'Luồng nhận hàng thật', noiDung:
      'Mọi sản phẩm đều là sản phẩm số, giao HOÀN TOÀN TỰ ĐỘNG, không qua email thủ công của admin. Luồng ' +
      'thật: khách chọn sản phẩm → bấm "Mua hàng" → xác nhận đã chuyển khoản (quét mã QR) → đơn được ghi ' +
      'nhận, chờ shop xác nhận đã nhận được tiền → NGAY KHI xác nhận, hệ thống tự động gửi link trang nhận ' +
      'hàng (/sanpham?ma=...) qua email (và Zalo/SMS nếu khách có để lại) — khách bấm vào link đó, trang tự ' +
      'nhận diện đúng đơn và cho tải file/nhận link sản phẩm thật, không cần đăng nhập hay nhớ mật khẩu gì. ' +
      'Thời gian xử lý: thường chỉ trong ít phút sau khi shop xác nhận tiền đã về, không hẹn ngày giao như ' +
      'hàng vật lý.' },

    { id: 'mathangcophi', loai: 'thu-muc', ten: 'Mặt hàng có phí' },
    { id: 'mathangmienphi', loai: 'thu-muc', ten: 'Mặt hàng miễn phí' },

    { id: 'faq', loai: 'thu-muc', ten: 'Câu hỏi thường gặp' },
    { id: 'faq-1', cha: 'faq', loai: 'truong', ten: 'Mua xong bao lâu có hàng?', noiDung:
      'Ngay khi shop nhận được tiền chuyển khoản, hệ thống tự động gửi sản phẩm — thường chỉ trong ít phút, ' +
      'qua email (và cả Zalo/SMS nếu khách có để lại) dẫn tới trang nhận hàng để lấy link/file thật. Không ' +
      'cần đợi admin xử lý thủ công.' },
    { id: 'faq-2', cha: 'faq', loai: 'truong', ten: 'Sản phẩm có bảo hành không?', noiDung:
      'Có — shop hỗ trợ trong suốt quá trình sử dụng, vướng mắc gì cứ liên hệ. Ngoài ra còn có chính sách ' +
      'hoàn tiền 100% trong 15 ngày đầu nếu khách không hài lòng (xem thư mục "Chính sách hoàn tiền / bảo ' +
      'hành").' },
    { id: 'faq-3', cha: 'faq', loai: 'truong', ten: 'Muốn đổi trả hoặc hoàn tiền thì làm sao?', noiDung:
      'Khách bấm mục "Yêu cầu hoàn tiền" ở menu bên trái, điền đủ: họ tên, tên sản phẩm đã mua, số tiền muốn ' +
      'nhận lại, lý do, mã sản phẩm (hoặc link sản phẩm), và số tài khoản kèm tên ngân hàng để nhận tiền hoàn ' +
      '— áp dụng trong 15 ngày kể từ ngày mua.' },

    { id: 'hoantien', loai: 'thu-muc', ten: 'Chính sách hoàn tiền / bảo hành' },
    { id: 'hoantien-1', cha: 'hoantien', loai: 'truong', ten: 'Tóm tắt chính sách', noiDung:
      'Shop hoàn tiền 100% nếu khách yêu cầu KHÔNG QUÁ 15 ngày kể từ ngày mua sản phẩm, không hỏi lý do dài ' +
      'dòng. Khách gửi yêu cầu qua mục "Yêu cầu hoàn tiền" ở menu bên trái, điền đủ: họ và tên, tên sản phẩm ' +
      'đã mua, số tiền muốn nhận lại, lý do muốn hoàn tiền, mã sản phẩm (hoặc link sản phẩm — có thể xem lại ' +
      'trong email/tin nhắn shop đã gửi), và số tài khoản kèm tên ngân hàng để nhận tiền hoàn. Đây cũng chính ' +
      'là hình thức "bảo hành" của shop với sản phẩm số — không có bảo hành phần cứng vì sản phẩm là preset/' +
      'phần mềm/khoá học.' },

    { id: 'dieukhoan', loai: 'thu-muc', ten: 'Điều khoản sử dụng và điều kiện' },
    { id: 'dieukhoan-1', cha: 'dieukhoan', loai: 'truong', ten: 'Nội dung điều khoản', noiDung:
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

    { id: 'baomat', loai: 'thu-muc', ten: 'Bảo mật và quyền riêng tư' },
    { id: 'baomat-1', cha: 'baomat', loai: 'truong', ten: 'Nội dung chính sách bảo mật', noiDung:
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

    { id: 'khuyenmai', loai: 'thu-muc', ten: 'Khuyến mãi đang chạy' },
    { id: 'khuyenmai-1', cha: 'khuyenmai', loai: 'truong', ten: 'Khuyến mãi hiện tại', noiDung:
      'Mua App Lightroom VIP Pro (sản phẩm Lightroom) được TẶNG KÈM 2 app VIP: Remini VIP (xoá nhiễu, nâng ' +
      'cấp chất lượng ảnh) và XingTu VIP đã Việt hoá — chỉ áp dụng cho thiết bị Android, mở khoá tự động ngay ' +
      'trên trang nhận hàng sau khi khách đã tải thành công ít nhất một tệp của Lightroom.\n' +
      'Ngoài ra, mua BẤT KỲ sản phẩm nào của shop (dù gói lớn hay món nhỏ) đều được tặng thêm: quyền yêu cầu ' +
      'học MIỄN PHÍ tối đa 2 khoá học thiết kế bất kỳ (Lightroom, Photoshop, Nhiếp ảnh, Illustrator, ' +
      'CorelDRAW, InDesign, thiết kế banner, After Effects, Premiere Pro, quay dựng phim, 3DS MAX, UX/UI, tạo ' +
      'video hàng loạt bằng AI...) — khách chỉ cần nhắn Zalo cho shop nói tên khoá học muốn học, không mất ' +
      'thêm phí (xem chi tiết ở mục "Đặc quyền dành cho khách hàng đã từng mua hàng của shop").' }
  ];

  // Bản nháp lấy từ nhánh đã đọc sẵn lúc vào trang admin (xem NHANH_ADMIN ở
  // 04B). Chỉ dựng MỘT LẦN — gõ/thêm/xoá/đổi chỗ/mở thư mục sau đó chỉ sửa
  // mảng này. taoIdKhoaHoc() tái dùng NGUYÊN từ PHẦN 04E — chỉ là hàm sinh id
  // ngẫu nhiên chung, không có gì riêng của khoá học.
  function aiKtNhap(){
    const a = state.admin;
    if (!a.aiKtNhap) {
      const goc = (a.duLieu['ai-kien-thuc'] || {}).muc;
      const mang = Array.isArray(goc) ? goc : (goc ? Object.keys(goc).map(function(k){ return goc[k]; }) : []);
      const nguon = mang.length ? mang : AI_KT_KHUNG_GOI_Y;
      a.aiKtNhap = nguon.map(function(m){
        return { id: m.id || taoIdKhoaHoc(), loai: m.loai === 'thu-muc' ? 'thu-muc' : 'truong',
          ten: m.ten || '', noiDung: m.noiDung || '', cha: m.cha || null };
      });
      a.aiKtMoThuMuc = null;   // mỗi lần vào mục này lại bắt đầu từ gốc
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
          'không cần deploy lại gì cả, lưu xong là có hiệu lực ngay. Sắp vào thư mục cho gọn — thư mục có thể ' +
          'chứa thư mục con bên trong. Bấm "Mở ▸" để vào xem bên trong một thư mục, bấm vào một mẩu trong ' +
          '"đường dẫn" phía trên danh sách để quay lại cấp đó. Trường bỏ trống thì AI bỏ qua, không đưa vào. ' +
          'Danh sách đang là KHUNG GỢI Ý (nếu chưa từng lưu gì) — sửa tên, sửa nội dung, hoặc xoá thoải mái, ' +
          'chỉ thật sự áp dụng khi bấm "Lưu tất cả".</p>' +
        '<div class="hang-luu-kh">' +
          '<button type="button" class="nut nut-chinh" data-hanh-dong="aikt-luu-tat-ca"' + (dangLuu ? ' disabled' : '') + '>' +
            (dangLuu ? 'Đang lưu…' : 'Lưu tất cả') + '</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="quan-ly-ai-kt" data-quan-ly-aikt>' + veDanhSachAiKt(n, state.admin.aiKtMoThuMuc || null) + '</div>';
  }

  // Tìm đường đi từ gốc tới đúng thư mục đang mở, để vẽ breadcrumb.
  function aiKtDuongDan(n, id){
    const duong = [];
    let hienTai = id;
    let an = 0; // chặn vòng lặp vô hạn nếu lỡ có cha trỏ vòng
    while (hienTai && an < 50) {
      const nut = n.filter(function(x){ return x.id === hienTai; })[0];
      if (!nut) break;
      duong.unshift(nut);
      hienTai = nut.cha || null;
      an++;
    }
    return duong;
  }

  function veDuongDanAiKt(n, moId){
    const duong = aiKtDuongDan(n, moId);
    let html = '<nav class="aikt-duong-dan">' +
      '<button type="button" class="aikt-mau-duong-dan" data-hanh-dong="aikt-mo-thu-muc" data-id="">🧠 Gốc</button>';
    duong.forEach(function(nut){
      html += '<span class="aikt-ngan-cach" aria-hidden="true">›</span>' +
        '<button type="button" class="aikt-mau-duong-dan" data-hanh-dong="aikt-mo-thu-muc" data-id="' +
          escapeHtml(nut.id) + '">' + escapeHtml(nut.ten || '(chưa đặt tên)') + '</button>';
    });
    return html + '</nav>';
  }

  function veDanhSachAiKt(n, moId){
    const con = [];
    n.forEach(function(m, i){ if ((m.cha || null) === (moId || null)) con.push(i); });
    const dong = con.map(function(i){ return veDongAiKt(n, i, con); }).join('');
    return '' +
      veDuongDanAiKt(n, moId) +
      (dong || '<p class="chua-co-tep">Thư mục này đang trống. Bấm "+ Thêm thư mục" hoặc "+ Thêm trường" bên dưới.</p>') +
      '<div class="hang-them-kh">' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="aikt-them-thu-muc">+ Thêm thư mục</button>' +
        '<button type="button" class="nut nut-nho nut-vien" data-hanh-dong="aikt-them-truong">+ Thêm trường</button>' +
      '</div>';
  }

  function veDongAiKt(n, i, anhEmChiSo){
    const m = n[i];
    const viTri = anhEmChiSo.indexOf(i);
    const lenDuoc = viTri > 0;
    const xuongDuoc = viTri < anhEmChiSo.length - 1;
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
      const soCon = n.filter(function(x){ return (x.cha || null) === m.id; }).length;
      return '' +
        '<div class="dong-khoa-hoc dong-chuong-kh" data-dong-aikt="' + i + '">' +
          '<span class="nhan-dong-kh">📁 Thư mục</span>' +
          '<input type="text" class="admin-nhap" data-aikt-ten="' + i + '" autocomplete="off"' +
            ' placeholder="Tên thư mục" value="' + escapeHtml(m.ten) + '">' +
          '<button type="button" class="nut nut-nho nut-chinh nut-mo-thu-muc-aikt" data-hanh-dong="aikt-mo-thu-muc"' +
            ' data-id="' + escapeHtml(m.id) + '">Mở ▸' + (soCon ? ' (' + soCon + ')' : '') + '</button>' +
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
    khung.innerHTML = veDanhSachAiKt(aiKtNhap(), state.admin.aiKtMoThuMuc || null);
  }

  // ---------------------------------------------------------------- HÀNH ĐỘNG

  // Mở xem bên trong một thư mục (id rỗng = quay về gốc). Thư mục/trường
  // thêm mới sau đó sẽ là CON của đúng thư mục đang mở này.
  function adminAiKtMoThuMuc(id){
    state.admin.aiKtMoThuMuc = id || null;
    capNhatQuanLyAiKt();
  }

  function adminAiKtThemThuMuc(){
    aiKtNhap().push({ id: taoIdKhoaHoc(), loai: 'thu-muc', ten: '', noiDung: '', cha: state.admin.aiKtMoThuMuc || null });
    capNhatQuanLyAiKt();
  }

  function adminAiKtThemTruong(){
    aiKtNhap().push({ id: taoIdKhoaHoc(), loai: 'truong', ten: '', noiDung: '', cha: state.admin.aiKtMoThuMuc || null });
    capNhatQuanLyAiKt();
  }

  // Đếm đệ quy số hậu duệ (thư mục con + trường) của một thư mục — chỉ để
  // cảnh báo rõ trước khi xoá, KHÔNG dùng để giới hạn gì.
  function aiKtDemHauDue(n, id){
    let dem = 0;
    n.forEach(function(x){
      if ((x.cha || null) === id) dem += 1 + aiKtDemHauDue(n, x.id);
    });
    return dem;
  }

  function adminAiKtXoaDong(chiSo){
    const n = aiKtNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || !n[i]) return;
    const m = n[i];
    const soHauDue = m.loai === 'thu-muc' ? aiKtDemHauDue(n, m.id) : 0;
    const nhan = m.loai === 'thu-muc' ? 'thư mục' : 'trường';
    const canhBao = soHauDue
      ? (' — XOÁ LUÔN CẢ ' + soHauDue + ' mục bên trong nó (thư mục con lẫn trường)')
      : '';
    if (!window.confirm('Xoá ' + nhan + ' "' + (m.ten || '(chưa đặt tên)') + '"?' + canhBao)) return;

    const idXoa = {}; idXoa[m.id] = true;
    (function gomHauDue(idCha){
      n.forEach(function(x){
        if ((x.cha || null) === idCha && !idXoa[x.id]) { idXoa[x.id] = true; gomHauDue(x.id); }
      });
    })(m.id);

    state.admin.aiKtNhap = n.filter(function(x){ return !idXoa[x.id]; });
    capNhatQuanLyAiKt();
  }

  // Chỉ đổi chỗ trong phạm vi ANH EM cùng cha — không đụng tới mục ở thư mục
  // khác dù chúng đứng gần nhau trong mảng phẳng.
  function adminAiKtDoiCho(chiSo, huong){
    const n = aiKtNhap();
    const i = parseInt(chiSo, 10);
    if (isNaN(i) || !n[i]) return;
    const chaId = n[i].cha || null;
    const anhEm = [];
    n.forEach(function(m, idx){ if ((m.cha || null) === chaId) anhEm.push(idx); });
    const viTri = anhEm.indexOf(i);
    const viTriMoi = viTri + huong;
    if (viTriMoi < 0 || viTriMoi >= anhEm.length) return;
    const j = anhEm[viTriMoi];
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
      const item = { id: m.id, loai: m.loai, ten: m.ten, cha: m.cha || null };
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
