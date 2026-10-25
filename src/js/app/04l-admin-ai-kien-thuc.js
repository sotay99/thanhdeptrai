
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

    // Mặt hàng có phí — mỗi sản phẩm một THƯ MỤC CON riêng (y như nút "Xem
    // chi tiết sản phẩm" + nút "Hướng dẫn sử dụng" ở từng thẻ sản phẩm trên
    // trang chính, PHẦN 01B/03B) — giá lấy đúng SAN_PHAM (PHẦN 01). Hai sản
    // phẩm miễn phí sp4/sp5 trong SAN_PHAM (hai khoá học) KHÔNG để ở đây —
    // chúng là quà tặng, thuộc thư mục "Mặt hàng miễn phí" bên dưới.
    { id: 'mathangcophi', loai: 'thu-muc', ten: 'Mặt hàng có phí' },

    { id: 'sp1', cha: 'mathangcophi', loai: 'thu-muc', ten: 'App Lightroom điện thoại Android - bản quyền trọn đời (299.000đ, giá bán 99.000đ)' },
    { id: 'sp1-1', cha: 'sp1', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Lightroom Tiếng Việt dễ sử dụng - Premium. Mở toàn bộ kho vũ khí của Lightroom ngay trên điện thoại ' +
      '— mua một lần, dùng mãi mãi.\n' +
      'LƯU Ý TRƯỚC KHI MUA: app chỉ dành cho điện thoại Android, KHÔNG dành cho iPhone. Chỉ đăng nhập được ' +
      'bằng tài khoản Adobe (tạo được ngay trong app, shop hướng dẫn từng bước) — KHÔNG đăng nhập được bằng ' +
      'Google dù app có hiện nút đó.\n' +
      'Gói này mở khoá toàn bộ tính năng nâng cao của Lightroom trên điện thoại — thứ đa số người dùng phải ' +
      'trả phí hằng tháng mới có. Những tính năng được mở khoá: chỉnh màu cho Video, xử lý ảnh RAW ngay trên ' +
      'điện thoại, chỉnh màu hàng loạt (chép công thức màu từ 1 tấm sang hàng trăm tấm), công cụ Xoá (xoá ' +
      'người lạ/dây điện/vết rác trong ảnh), công cụ Mặt nạ — Masking (tách vùng để chỉnh riêng bầu trời/chủ ' +
      'thể/hậu cảnh), Phối cảnh (kéo thẳng nhà nghiêng/đường chân trời lệch), dùng và nhập preset màu cao cấp ' +
      'hàng loạt, chỉnh sửa nhanh, chỉnh bằng AI, chỉnh bầu trời, xoá nhám da mặt tự nhiên. Kèm hướng dẫn ' +
      'đăng nhập và kích hoạt Premium từ A-Z.' },
    { id: 'sp1-2', cha: 'sp1', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Cài đặt chỉ mất khoảng 2-3 phút.\n' +
      'Bước 1 — nếu máy đã có Lightroom tải từ CH Play thì gỡ nó ra trước (preset/ảnh không mất vì đồng bộ ' +
      'trên tài khoản Adobe).\n' +
      'Bước 2 (có thể bỏ qua, chỉ cần khi Bước 3 trục trặc) — vào Cài đặt → An toàn và bảo mật, bật "Không ' +
      'rõ nguồn gốc" / "Cài đặt ứng dụng không rõ nguồn gốc" để cho phép cài file .apk ngoài CH Play.\n' +
      'Bước 3 — mở file .apk vừa tải trong Quản lý tệp/Downloads, chọn "Mở bằng" → Trình cài đặt → Cài đặt.\n' +
      'Bước 4 — nếu Google Play Protect cảnh báo "Đã chặn ứng dụng để bảo vệ thiết bị của bạn" (cảnh báo tự ' +
      'động cho MỌI app cài ngoài, không phải app lỗi) thì bấm "Chi tiết khác" → "Vẫn cài đặt"/"Cài đặt bằng ' +
      'mọi cách".\n' +
      'Xong: mở Lightroom, đăng nhập (hoặc dùng luôn không cần đăng nhập) là có bản đầy đủ, không giới hạn ' +
      'tính năng.' },

    { id: 'sp2', cha: 'mathangcophi', loai: 'thu-muc', ten: 'Bộ Preset 10.000 màu cao cấp cho Lightroom điện thoại (99.000đ, giá bán 79.000đ)' },
    { id: 'sp2-1', cha: 'sp2', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      '10.000 màu cao cấp cài sẵn thẳng vào tài khoản Adobe của khách — mở app lên là có, không phải nhập ' +
      'tay từng tấm. Mỗi bộ màu được tuyển chọn và test kỹ trên ảnh thật, loại bỏ màu hỏng/trùng/vô dụng. ' +
      'Cài trực tiếp vào tài khoản cá nhân khách (không phải import từng file thủ công). An toàn, riêng tư ' +
      '— shop không giữ, không đụng vào ảnh của khách. Dùng trọn đời, đổi điện thoại vẫn còn nguyên trong ' +
      'tài khoản. Dùng được cả trên Lightroom máy tính và Photoshop máy tính — mua 1 lần xài cả 3 nơi. Đủ ' +
      'tông: phim hoài cổ, Hàn Quốc trong trẻo, cưới sang trọng, du lịch rực nắng, đường phố xám lạnh...' },
    { id: 'sp2-2', cha: 'sp2', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Bộ 9.500 preset được chia nhỏ thành nhiều gói con, mỗi gói 1.000 preset (gói 1: preset 1-1.000, gói ' +
      '2: 1.001-2.000, cứ thế nối tiếp). Máy yếu/đời cũ: nên cài từng gói nhỏ một lần. Máy mạnh/đời mới/' +
      'iPhone: cài luôn gói tổng hợp 9.500 preset.\n' +
      'Các bước: 1) Tải file .zip preset về điện thoại. 2) Mở app Lightroom → Thiết đặt sẵn (Presets). ' +
      '3) Chọn "Của bạn" (Yours). 4) Bấm dấu ba chấm dọc (⋮) góc trên phải. 5) Chọn "Nhập thiết đặt sẵn" ' +
      '(Import Presets). 6) Bấm "Tải file lên", chọn đúng file .zip vừa tải. 7) Đợi vài chục giây để ' +
      'Lightroom tải lên và tự đồng bộ vào tài khoản Adobe — xong preset hiện ngay trong mục "Của bạn". ' +
      'Muốn cài thêm gói khác thì lặp lại bước 4-7 với file .zip của gói đó, preset các gói không đè nhau.' },

    { id: 'sp3', cha: 'mathangcophi', loai: 'thu-muc', ten: 'Bộ Preset 650 màu cao cấp cho Lightroom và Photoshop máy tính (359.000đ, giá bán 125.000đ)' },
    { id: 'sp3-1', cha: 'sp3', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Dành cho dân làm nghề — chuẩn thương mại. Ít hơn về số lượng so với bộ 10.000 màu nhưng mỗi màu được ' +
      'dựng để chịu được yêu cầu khắt khe của khách trả tiền.\n' +
      'Dành cho: nhiếp ảnh gia nhận job cưới/kỷ yếu/sự kiện (cần màu ổn định đồng nhất cả bộ ảnh), người làm ' +
      'nghề thương mại (ảnh sản phẩm/quảng cáo/thương hiệu), người mới lên máy tính (có điểm xuất phát tốt ' +
      'để học cách dựng màu).\n' +
      'Nhận được: 650 preset màu cao cấp tối ưu cho ảnh RAW độ phân giải lớn, không vỡ màu khi in; cài được ' +
      'cho cả Lightroom máy tính và Photoshop/Camera Raw — 1 bộ file dùng 2 phần mềm; chuyển sang Lightroom ' +
      'điện thoại dễ dàng (shop hướng dẫn đồng bộ); phân nhóm rõ theo chủ đề, tìm màu nhanh.' },
    { id: 'sp3-2', cha: 'sp3', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Cài vào Lightroom Classic (máy tính): 1) Tải file .zip preset về máy tính, giải nén ra một thư mục. ' +
      '2) Mở Lightroom Classic, vào khu vực Develop (Chỉnh sửa). 3) Bảng bên trái, mục Presets, bấm dấu "+" ' +
      '→ "Import Presets…". 4) Trỏ tới thư mục đã giải nén, chọn hết file preset (.zip/.xmp/.lrtemplate), ' +
      'bấm Import. 5) Preset xuất hiện ngay trong bảng Presets, áp dụng được cho mọi ảnh RAW.\n' +
      'Cài vào Photoshop (Camera Raw): 1) Mở một ảnh trong Photoshop, vào Filter → Camera Raw Filter (hoặc ' +
      'mở trực tiếp file RAW). 2) Cột bên phải, chọn tab Presets. 3) Bấm "…" hoặc "+" góc bảng Presets → ' +
      '"Import Presets…". 4) Trỏ tới thư mục đã giải nén, chọn file preset, bấm Import. Camera Raw dùng ' +
      'chung kho preset cho cả Photoshop lẫn Bridge, nhập 1 lần dùng được cả hai nơi.' },

    { id: 'sp6', cha: 'mathangcophi', loai: 'thu-muc', ten: 'Phần mềm Lightroom Classic Windows - bản quyền trọn đời (599.000đ, giá bán 179.000đ)' },
    { id: 'sp6-1', cha: 'sp6', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Phần mềm Lightroom Classic dành cho máy tính Windows - bản quyền trọn đời. Cài một lần, chạy êm, ' +
      'không lo hết hạn.\n' +
      'Điểm mạnh: hỗ trợ thiết lập nhanh (shop đồng hành từ lúc tải tới khi chỉnh được tấm ảnh đầu tiên); ' +
      'suất đăng nhập ưu đãi từ nhà sản xuất, số lượng có hạn; hoạt động mượt mà, phù hợp mọi cấu hình PC từ ' +
      'thấp đến cao; phiên bản đã kiểm thử thành công trên hơn 1.000 máy tính; có video hướng dẫn chi tiết; ' +
      'phiên bản chuẩn định danh Lightroom Classic V10.0.\n' +
      'Đây là bản Classic — bản giới nhiếp ảnh chuyên nghiệp toàn thế giới vẫn dùng để xử lý bộ ảnh nặng ' +
      'nhất: catalog hàng chục nghìn tấm, chỉnh sửa hàng loạt, xuất file theo lô, kiểm soát màu chi tiết. ' +
      'Trả 1 lần duy nhất, dùng mãi, không như thuê bao hằng tháng.' },
    { id: 'sp6-2', cha: 'sp6', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Tải file cài đặt về máy tính Windows, chạy file, bấm Next tới khi thấy Install, đợi thanh chạy đầy ' +
      'là xong — phần lớn máy cài trót lọt ngay lần đầu, không cần xử lý gì thêm. Lưu ý: nếu quá trình cài ' +
      'bị lỗi/chặn giữa chừng thì xem video hướng dẫn tắt Tường lửa (Firewall) của Windows trước khi cài lại.' },

    { id: 'sp7', cha: 'mathangcophi', loai: 'thu-muc', ten: 'Phần mềm Photoshop Windows - bản quyền trọn đời (599.000đ, giá bán 179.000đ)' },
    { id: 'sp7-1', cha: 'sp7', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Phần mềm Photoshop dành cho máy tính Windows - bản quyền trọn đời. Công cụ mạnh nhất ngành hình ảnh.\n' +
      'Điểm mạnh: hỗ trợ thiết lập nhanh; suất đăng nhập ưu đãi từ nhà sản xuất, số lượng có hạn; hoạt động ' +
      'mượt mà, phù hợp mọi cấu hình PC; có video hướng dẫn chi tiết từng bước; phiên bản chuẩn định danh ' +
      'Photoshop 2021 v22.0.0.35 x64.\n' +
      'Photoshop mở ra: ghép ảnh và chỉnh sửa sâu (thay nền, ghép người, dựng cảnh không có thật mà nhìn vẫn ' +
      'thật); retouch chân dung chuyên nghiệp (làm mịn da giữ kết cấu, tạo khối gương mặt, chỉnh dáng); ' +
      'thiết kế đồ hoạ (poster, banner, bìa sách, bao bì, nhận diện thương hiệu); Camera Raw ngay trong ' +
      'Photoshop (dùng chung được preset màu đang có); action và xử lý theo lô. Lightroom lo màu, Photoshop ' +
      'lo chi tiết — có cả hai gần như không còn yêu cầu nào của khách khiến phải từ chối.' },
    { id: 'sp7-2', cha: 'sp7', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Giống cách cài sp6: tải file cài đặt về máy tính Windows, chạy và làm theo hướng dẫn trên màn hình — ' +
      'bấm Next tới khi thấy Install. Lưu ý: video hướng dẫn sẽ chỉ cách tắt Tường lửa (Firewall) của ' +
      'Windows trước khi cài phần mềm nếu quá trình cài bị chặn.' },

    { id: 'sp8', cha: 'mathangcophi', loai: 'thu-muc', ten: 'Kho tài nguyên thiết kế - 1000+ ảnh RAW, Mockup, PSD (159.000đ, giá bán 39.000đ)' },
    { id: 'sp8-1', cha: 'sp8', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Gồm 3 phần:\n' +
      '1) Bộ 100 ảnh RAW chất lượng cao — đủ định dạng gốc DNG/NEF/CR2 (đúng file máy ảnh xuất ra, không ' +
      'phải JPG chuyển ngược), đa dạng thể loại (cưới, người mẫu, mẫu điện ảnh, phong cảnh, film, du lịch, ' +
      'kỷ yếu) — dùng để luyện chỉnh sửa như ảnh thật.\n' +
      '2) Bộ 1000+ file Mockup — bảng hiệu, bộ nhận diện thương hiệu, book, card, catalogue, chai lọ, cốc... ' +
      'chỉ cần thả thiết kế vào là ra ảnh sản phẩm như chụp thật.\n' +
      '3) Bộ 1000+ file PSD đa dạng chủ đề (Tết, du lịch và nhiều chủ đề khác quanh năm) — file nhiều lớp, ' +
      'mở ra sửa được ngay (đổi chữ/ảnh/màu, xuất bài kịp việc gấp).' },
    { id: 'sp8-2', cha: 'sp8', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Không có hướng dẫn cài đặt riêng trên web — đây là file tải về dùng trực tiếp: ảnh RAW mở bằng ' +
      'Lightroom/Camera Raw như ảnh chụp bình thường; file Mockup và PSD mở bằng Photoshop (PSD có nhiều ' +
      'lớp, sửa trực tiếp được ngay). Cách dùng quen thuộc với người đã biết Lightroom/Photoshop, không cần ' +
      'bước cài đặt đặc biệt nào.' },

    { id: 'sp9', cha: 'mathangcophi', loai: 'thu-muc', ten: '1000+ font chữ Việt hoá cao cấp cho máy tính (159.000đ, giá bán 39.000đ)' },
    { id: 'sp9-1', cha: 'sp9', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Đã Việt hoá hoàn chỉnh — gõ tiếng Việt có dấu chuẩn đẹp, không lỗi, không vỡ dấu, không biến thành ô ' +
      'vuông (khác với font nước ngoài thông thường).\n' +
      'Trong bộ font có: chữ thư pháp (hợp thiệp cưới, câu đối, ấn phẩm Tết), chữ mảnh (thanh thoát, hợp ' +
      'thương hiệu cao cấp/mỹ phẩm), chữ cao hẹp (mạnh mẽ, hợp tiêu đề/poster), chữ viết tay (gần gũi, hợp ' +
      'nội dung đời thường/quà tặng), chữ vuông (chắc chắn, hợp thể thao/công nghệ), và nhiều nhóm phong ' +
      'cách khác — tuyển chọn đầy đủ, bắt mắt, không lỗi gõ dấu.' },
    { id: 'sp9-2', cha: 'sp9', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Không có hướng dẫn cài đặt riêng trên web — font tải về cài như font Windows thông thường (copy vào ' +
      'thư mục Fonts, hoặc bấm đúp vào file font rồi bấm Install), dùng được ngay trong mọi phần mềm thiết ' +
      'kế (Photoshop, Illustrator, Word...).' },

    // Mặt hàng miễn phí — module "Quà tặng dành cho thiết bị Android" (PHẦN
    // 03F) + 3 khoá học miễn phí. Remini/XingTu KHÔNG còn tải trực tiếp được
    // nữa (MA_CHAN_TAI_QUA_TANG, PHẦN 03F) — chỉ tặng kèm khi mua Lightroom
    // (sp1), nên mỗi app có riêng trường "Điều kiện mở khoá" nói rõ điều đó.
    { id: 'mathangmienphi', loai: 'thu-muc', ten: 'Mặt hàng miễn phí' },

    { id: 'preset500', cha: 'mathangmienphi', loai: 'thu-muc', ten: 'Bộ Preset 500 màu cao cấp (Android & iPhone) - MIỄN PHÍ' },
    { id: 'preset500-1', cha: 'preset500', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      '500 màu cao cấp, cài sẵn thẳng vào tài khoản Adobe của khách — mở app Lightroom lên là có, không phải ' +
      'nhập tay tấm nào. Dành cho CẢ điện thoại Android lẫn iPhone (preset lưu trong tài khoản Adobe, đồng ' +
      'bộ qua đám mây nên dùng được trên bất kỳ thiết bị nào có cài app Lightroom, không phân biệt hệ điều ' +
      'hành).\n' +
      'Mỗi bộ màu được tuyển chọn kỹ và test thành công trên ảnh thật trước khi giao, loại bỏ màu hỏng/trùng/' +
      'vô dụng. Cài trực tiếp vào tài khoản cá nhân — không phải import từng file. An toàn, riêng tư: thao ' +
      'tác trên chính tài khoản của khách, shop không giữ, không đụng ảnh. Dùng trọn đời, đổi điện thoại vẫn ' +
      'còn nguyên. Đủ tông: phim hoài cổ, Hàn Quốc trong trẻo, cưới sang trọng, du lịch rực nắng, đường phố ' +
      'xám lạnh.\n' +
      'Đây là bản quà TẶNG MIỄN PHÍ 500 màu của sản phẩm trả phí "Bộ Preset 10.000 màu" — không có mã sản ' +
      'phẩm riêng, không giá, không đơn hàng, tải trực tiếp ngay tại module "Quà tặng dành cho thiết bị ' +
      'Android", không điều kiện gì.' },
    { id: 'preset500-2', cha: 'preset500', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'KHÁC cách cài APK của 4 app bên dưới — đây là NHẬP PRESET vào Lightroom, không phải cài ứng dụng:\n' +
      '1. Tải file .zip preset về máy (nút "Tải Preset về máy"). 2. Mở app Lightroom → bấm "Thiết đặt sẵn" ' +
      '(Presets) ở thanh dưới. 3. Chọn mục "Của bạn" (Yours). 4. Bấm dấu ba chấm dọc (⋮) góc trên phải. ' +
      '5. Chọn "Nhập thiết đặt sẵn" (Import Presets). 6. Bấm "Tải file lên", chọn đúng file .zip vừa tải. ' +
      '7. Đợi vài chục giây để Lightroom tải lên và đồng bộ vào tài khoản Adobe — preset hiện ngay trong mục ' +
      '"Của bạn", dùng được cho mọi tấm ảnh. Chỉ cần cài 1 lần duy nhất.' },

    { id: 'qtpicsart', cha: 'mathangmienphi', loai: 'thu-muc', ten: 'PicsArt VIP (bản quyền trọn đời) - MIỄN PHÍ' },
    { id: 'qtpicsart-1', cha: 'qtpicsart', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Studio chỉnh ảnh AI mạnh nhất trong túi bạn — không quảng cáo, không watermark, không giới hạn.\n' +
      'Tính năng VIP mở khoá: xoá sạch quảng cáo và watermark khi xuất ảnh; bộ công cụ AI cao cấp (xoá/thay ' +
      'thế vật thể bằng AI - Magic Replace, mở rộng khung ảnh bằng AI - Magic Expand, tạo phông nền bằng AI); ' +
      'tách nền tự động không giới hạn lượt, độ chính xác cao; mở khoá toàn bộ kho sticker/phông nền/font ' +
      'chữ cao cấp (hàng chục nghìn mẫu); xuất ảnh độ phân giải gốc, không nén.\n' +
      'Miễn phí hoàn toàn, tải trực tiếp ngay tại module "Quà tặng dành cho thiết bị Android", không điều ' +
      'kiện gì.' },

    { id: 'qtremini', cha: 'mathangmienphi', loai: 'thu-muc', ten: 'Remini VIP (bản quyền trọn đời) - MIỄN PHÍ (kèm điều kiện)' },
    { id: 'qtremini-1', cha: 'qtremini', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Phục chế ảnh mờ, cũ, vỡ nét thành ảnh sắc nét như chụp bằng máy ảnh chuyên nghiệp, chỉ trong một chạm.\n' +
      'Tính năng VIP mở khoá: xoá sạch quảng cáo và watermark trên mọi ảnh/video xuất ra; nâng cấp chất ' +
      'lượng ảnh bằng AI (AI Photo Enhancer) không giới hạn lượt, không chờ quảng cáo; Video Enhancer AI ' +
      '(làm nét video cũ/mờ/vỡ khung hình); mở khoá toàn bộ bộ lọc AI cao cấp (AI Avatar, Hollywood Filter, ' +
      'AI Filter thế hệ mới); xuất ảnh/video độ phân giải tối đa.' },
    { id: 'qtremini-2', cha: 'qtremini', loai: 'truong', ten: 'Điều kiện mở khoá (QUAN TRỌNG)', noiDung:
      'Remini VIP KHÔNG còn tải trực tiếp được từ module "Quà tặng dành cho thiết bị Android" nữa. App này ' +
      'giờ CHỈ được tặng kèm khi khách mua "App Lightroom VIP Pro" (sản phẩm Lightroom). Nếu khách bấm nút ' +
      'tải Remini ở module Quà tặng Android, web hiện đúng thông báo: "Sản phẩm miễn phí này được đính kèm ' +
      'khi mua sản phẩm App Lightroom VIP Pro, nếu bạn đã mua sản phẩm APP Lightroom, hãy vào link sản phẩm ' +
      'mà Shop đã bàn giao cho bạn, bấm vào sản phẩm app Lightroom, ở đó có đính kèm App Remini và XingTu ' +
      'Việt hoá Vip Pro được tặng kèm theo". Nếu khách hỏi cách lấy Remini mà CHƯA mua Lightroom, hãy hướng ' +
      'dẫn khách mua App Lightroom VIP Pro trước (99.000đ) — Remini tự mở khoá trên trang nhận hàng ngay sau ' +
      'khi khách tải Lightroom thành công.' },

    { id: 'qtsnapedit', cha: 'mathangmienphi', loai: 'thu-muc', ten: 'SnapEdit VIP (bản quyền trọn đời) - MIỄN PHÍ' },
    { id: 'qtsnapedit-1', cha: 'qtsnapedit', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'Xoá nền, xoá người thừa, chỉnh ảnh bằng AI chỉ trong vài giây, không cần biết Photoshop.\n' +
      'Tính năng VIP mở khoá: xoá sạch quảng cáo và watermark khi xuất ảnh; xoá nền ảnh (Remove Background) ' +
      'không giới hạn lượt, độ chính xác cao, tách cả tóc và chi tiết nhỏ; công cụ AI xoá vật thể/người lạ/ ' +
      'rác trong ảnh (Remove Object) không giới hạn; AI Photo Enhancer nâng cấp ảnh mờ/cũ; xuất ảnh full độ ' +
      'phân giải gốc, không giới hạn số lượt mỗi ngày.\n' +
      'Miễn phí hoàn toàn, tải trực tiếp ngay tại module "Quà tặng dành cho thiết bị Android", không điều ' +
      'kiện gì.' },

    { id: 'qtxingtu', cha: 'mathangmienphi', loai: 'thu-muc', ten: 'XingTu VIP Việt hoá (bản quyền trọn đời) - MIỄN PHÍ (kèm điều kiện)' },
    { id: 'qtxingtu-1', cha: 'qtxingtu', loai: 'truong', ten: 'Mô tả chi tiết', noiDung:
      'App làm đẹp ảnh chân dung hàng đầu Trung Quốc (cùng nhà phát triển với CapCut) — bản Việt hoá đầy đủ, ' +
      'dễ dùng. Lưu ý: đây là phiên bản đã ra mắt được một thời gian (không phải bản mới nhất) nhưng vẫn ' +
      'dùng ổn định cho mọi nhu cầu chỉnh sửa quen thuộc, app chạy mượt, không lỗi vặt.\n' +
      'Tính năng VIP mở khoá: trang điểm AI (tô son, kẻ mắt, làm mịn da tự nhiên); chỉnh dáng người - ' +
      'Bodyedit (thon gọn, cao ráo, chỉnh tỷ lệ cơ thể tự nhiên, không méo nền); chỉnh mặt chi tiết (mắt to ' +
      'hơn, mũi cao hơn, cằm V-line...); mở khoá kho filter/phông nền/bộ lọc thời trang cao cấp cập nhật ' +
      'liên tục; xoá quảng cáo, mở khoá toàn bộ công cụ chỉnh sửa nâng cao.' },
    { id: 'qtxingtu-2', cha: 'qtxingtu', loai: 'truong', ten: 'Điều kiện mở khoá (QUAN TRỌNG)', noiDung:
      'Giống hệt Remini: XingTu VIP KHÔNG còn tải trực tiếp được từ module "Quà tặng dành cho thiết bị ' +
      'Android" nữa, CHỈ được tặng kèm khi khách mua "App Lightroom VIP Pro" (sản phẩm Lightroom). Hướng dẫn ' +
      'khách giống hệt Remini: mua Lightroom trước, XingTu sẽ tự mở khoá trên trang nhận hàng ngay sau khi ' +
      'khách tải Lightroom thành công.' },

    { id: 'qthuongdanchung', cha: 'mathangmienphi', loai: 'thu-muc', ten: 'Hướng dẫn sử dụng chung (PicsArt / Remini / SnapEdit / XingTu)' },
    { id: 'qthuongdanchung-1', cha: 'qthuongdanchung', loai: 'truong', ten: 'Cách cài đặt (giống nhau cho cả 4 app)', noiDung:
      'Cả 4 app (PicsArt, Remini, SnapEdit, XingTu) đều là file .apk cài ngoài CH Play, các bước giống hệt ' +
      'nhau, chỉ đổi tên app, mất khoảng 2-3 phút:\n' +
      'Bước 1 — nếu máy đã có sẵn một bản khác của app đó thì gỡ ra trước (giữ icon app → Gỡ cài đặt) để ' +
      'tránh xung đột.\n' +
      'Bước 2 (có thể bỏ qua, chỉ cần khi Bước 3 trục trặc) — vào Cài đặt → An toàn và bảo mật, bật "Không ' +
      'rõ nguồn gốc" / "Cài đặt ứng dụng không rõ nguồn gốc".\n' +
      'Bước 3 — mở file .apk vừa tải trong Quản lý tệp/Downloads, chọn "Mở bằng" → Trình cài đặt → Cài đặt.\n' +
      'Bước 4 — nếu Google Play Protect cảnh báo thì bấm "Chi tiết khác" → "Vẫn cài đặt"/"Cài đặt bằng mọi ' +
      'cách" (cảnh báo tự động cho mọi app cài ngoài CH Play, không phải app lỗi).\n' +
      'Riêng Bộ Preset 500 màu KHÔNG theo cách này — xem hướng dẫn riêng ở thư mục preset (đó là nhập preset ' +
      'vào Lightroom, không phải cài app).' },

    { id: 'khoahocmienphi', cha: 'mathangmienphi', loai: 'thu-muc', ten: '3 khoá học miễn phí' },

    { id: 'khoasp4', cha: 'khoahocmienphi', loai: 'thu-muc', ten: 'Khoá học Lightroom điện thoại (sp4) - MIỄN PHÍ' },
    { id: 'khoasp4-1', cha: 'khoasp4', loai: 'truong', ten: 'Nội dung khoá học', noiDung:
      'Khoá học biến chiếc điện thoại thành phòng lab màu chuyên nghiệp — rèn cho bạn đôi mắt biết nhìn ra ' +
      'màu đúng.\n' +
      'Admin cam kết: rèn luyện đôi mắt để tự đánh giá và thẩm định màu sắc từng bức ảnh, biết blend màu cho ' +
      'từng kiểu ảnh; kết hợp Lightroom với chỉnh màu bằng AI để ra ảnh đúng màu và nhanh nhất; hiểu sâu mọi ' +
      'thông số ánh sáng/màu sắc/hiệu ứng/chi tiết trên Lightroom điện thoại; hướng dẫn mở khoá tính năng cao ' +
      'cấp trong Lightroom và cách bắt tay Lightroom với Photoshop; nắm vững cả Lightroom MÁY TÍNH và Camera ' +
      'Raw của Photoshop — học 1 khoá làm chủ 3 mặt trận.\n' +
      'Hỗ trợ sử dụng tính năng cao cấp: Masking (mặt nạ - chỉnh riêng từng vùng), xoá vật thể, làm mờ hậu ' +
      'cảnh, chỉnh sửa hàng loạt, và nhiều tính năng khác mở ra dần qua từng bài học.\n' +
      'Học được: rèn "đôi mắt thần sầu" đánh giá màu sắc; kết hợp AI chỉnh màu siêu tốc; hiểu sâu mọi thông ' +
      'số trong Lightroom; tự tạo phong cách màu và preset riêng; nắm vững kỹ thuật chỉnh ảnh RAW chuyên ' +
      'nghiệp trên cả điện thoại lẫn máy tính. Hoàn toàn miễn phí.' },
    { id: 'khoasp4-2', cha: 'khoasp4', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Chỉ cần vào đúng module "Khoá học Lightroom điện thoại" ở menu bên trái và học theo từng bài — không ' +
      'cần cài đặt hay tải gì thêm, xem video bài học ngay trong trang.' },

    { id: 'khoasp5', cha: 'khoahocmienphi', loai: 'thu-muc', ten: 'Khoá học Lightroom máy tính PC (sp5) - MIỄN PHÍ' },
    { id: 'khoasp5-1', cha: 'khoasp5', loai: 'truong', ten: 'Nội dung khoá học', noiDung:
      'Từ người biết dùng Lightroom máy tính, thành người làm chủ nó — có quy trình, có tốc độ, có phong ' +
      'cách riêng.\n' +
      'Lộ trình học: nhập và quản lý thư viện ảnh (catalog, thư mục, gắn cờ/sao, từ khoá); nền tảng ánh sáng ' +
      'và màu sắc (histogram, phơi sáng, tương phản, vùng sáng/tối, trắng/đen); làm chủ màu sắc (HSL, Color ' +
      'Grading, Calibration, Tone Curve); mặt nạ nâng cao (chọn chủ thể/bầu trời/người/nền, giao-trừ vùng ' +
      'chọn); sửa chữa và làm sạch (xoá vật thể, khử nhiễu, làm nét, sửa quang sai/méo ống kính); chỉnh sửa ' +
      'hàng loạt và tự động hoá (đồng bộ, preset, profile, xuất file theo lô); bắt tay với Photoshop (khi ' +
      'nào chuyển sang, cách chuyển không mất chất lượng); xuất file đúng chuẩn cho từng mục đích (khách, ' +
      'mạng xã hội, in ấn).\n' +
      'Đạt được sau khoá học: có quy trình xử lý ảnh riêng, nhanh gấp nhiều lần; đồng nhất màu trên cả bộ ' +
      'ảnh; tự dựng preset mang phong cách riêng; xử lý được cả file khó (ngược sáng, thiếu sáng, ánh sáng ' +
      'đèn màu lộn xộn); đủ tự tin nhận job và giao ảnh đúng hẹn. Hoàn toàn miễn phí.' },
    { id: 'khoasp5-2', cha: 'khoasp5', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Chỉ cần vào đúng module "Khoá học Lightroom máy tính PC" ở menu bên trái và học theo từng bài — không ' +
      'cần cài đặt hay tải gì thêm.' },

    { id: 'khoaphotoshop', cha: 'khoahocmienphi', loai: 'thu-muc', ten: 'Khoá Photoshop - edit ảnh bằng điện thoại - MIỄN PHÍ' },
    { id: 'khoaphotoshop-1', cha: 'khoaphotoshop', loai: 'truong', ten: 'Nội dung khoá học', noiDung:
      'Kết hợp Photoshop với chỉnh màu bằng AI để cho ra bức ảnh đúng ý muốn và nhanh nhất — học và làm ngay ' +
      'trên điện thoại, hoàn toàn miễn phí.\n' +
      'Học được: ghép ảnh bằng công cụ Photoshop trên điện thoại; cách cài đặt miễn phí ứng dụng edit hình ' +
      'ảnh và Photoshop trên điện thoại (hướng dẫn cụ thể ngay trong khoá); tương thích mọi hệ điều hành, ' +
      'mọi cấu hình điện thoại kể cả máy yếu; biến ảnh chụp điện thoại trở nên lung linh; đầy đủ kỹ năng ' +
      'Photoshop (công cụ, filter, adjustments, transform, vùng chọn, chỉnh màu, Blending Option...); chỉnh ' +
      'màu chuyên nghiệp ngay trên điện thoại.\n' +
      'Lưu ý: đây KHÔNG phải bán ứng dụng — đây là khoá học, phù hợp người chưa am hiểu Photoshop muốn thao ' +
      'tác ngay trên điện thoại. Người đang dùng Photoshop máy tính nên tiếp tục dùng máy tính (nhanh hơn vì ' +
      'có bàn phím), vẫn áp dụng được kiến thức khoá này.' },
    { id: 'khoaphotoshop-2', cha: 'khoaphotoshop', loai: 'truong', ten: 'Hướng dẫn sử dụng', noiDung:
      'Chỉ cần vào đúng module "Khoá Photoshop - edit ảnh bằng điện thoại" ở menu bên trái và học theo từng ' +
      'bài — không cần cài đặt hay tải gì thêm.' },

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
          '<button type="button" class="nut nut-vien" data-hanh-dong="aikt-nap-khung-goi-y">' +
            'Nạp khung gợi ý mới nhất</button>' +
          '<span class="admin-bao' + (vuaLuu ? ' hien' : '') + '">' + (vuaLuu ? '✓ Đã lưu' : '') + '</span>' +
        '</div>' +
        '<p class="admin-ghi-chu" style="margin-top:6px">Nút "Nạp khung gợi ý mới nhất" thay TOÀN BỘ bản nháp ' +
          'đang xem bằng khung đề xuất mới nhất (dùng khi Claude vừa soạn thêm nội dung nhưng bạn đã lưu dữ ' +
          'liệu cũ từ trước nên không tự hiện) — KHÔNG đụng gì tới dữ liệu thật trên Firebase cho tới khi bạn ' +
          'tự bấm "Lưu tất cả" lần nữa. Bấm nhầm thì cứ tải lại trang là về đúng dữ liệu đã lưu.</p>' +
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

  // Nạp khung gợi ý mới nhất ĐÈ LÊN bản nháp đang xem — dùng khi admin đã
  // "Lưu tất cả" một lần với khung cũ trước đó nên khung gợi ý mới (Claude
  // vừa soạn thêm) không tự hiện nữa (aiKtNhap() chỉ dùng khung gợi ý lúc
  // Firebase CÒN TRỐNG). KHÔNG ghi gì xuống Firebase — chỉ thay bản nháp
  // trong bộ nhớ, admin vẫn phải tự bấm "Lưu tất cả" mới áp dụng thật.
  function adminAiKtNapKhungGoiY(){
    if (!window.confirm('Thay TOÀN BỘ bản nháp đang xem bằng khung gợi ý mới nhất? ' +
      'Chưa lưu gì xuống Firebase — chỉ áp dụng thật khi bạn bấm "Lưu tất cả" sau đó.')) return;
    state.admin.aiKtNhap = AI_KT_KHUNG_GOI_Y.map(function(m){
      return { id: m.id || taoIdKhoaHoc(), loai: m.loai === 'thu-muc' ? 'thu-muc' : 'truong',
        ten: m.ten || '', noiDung: m.noiDung || '', cha: m.cha || null };
    });
    state.admin.aiKtMoThuMuc = null;
    capNhatQuanLyAiKt();
  }

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
