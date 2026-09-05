
  /* ===========================================================================
     PHẦN 01B — NỘI DUNG MÔ TẢ CHI TIẾT TỪNG SẢN PHẨM

     Đây là phần CHỮ NGHĨA thuần tuý, tách khỏi mã điều khiển để sửa lời văn
     không đụng vào logic. Mỗi sản phẩm là một mảng "khối"; khối nào cũng có
     một trong các kiểu dưới đây, và phần 02 sẽ dựng chúng thành các thẻ trôi
     từ phải qua trái, lần lượt từ trên xuống.

       { kieu: 'khau-hieu', chu }            — câu mở đầu, khung viền xanh
       { kieu: 'noi-bat',  chu }             — dải nhấn, nền xanh nhạt
       { kieu: 'doan',     chu }             — một đoạn văn thường
       { kieu: 'muc',      tieuDe, y: [] }   — khối gạch đầu dòng có tiêu đề
       { kieu: 'cam-ket',  tieuDe, y: [] }   — khối cam kết, tông xanh lá

     KHÔNG viết chết chuỗi giá tiền ở đây — giá luôn lấy từ SAN_PHAM để một
     chỗ sửa là mọi nơi đổi theo.
     =========================================================================== */

  // Cam kết dán ở CUỐI mô tả của MỌI sản phẩm, không trừ sản phẩm nào.
  // Ảnh minh hoạ vuông 1:1 của từng sản phẩm. Đường dẫn viết TRẦN ở đây; lúc
  // build, scripts/build-static.js thay bằng tên có vân tay rồi mới băm bản
  // nối, nên đổi ảnh là trình duyệt nhận bản mới ngay mà vẫn cache vĩnh viễn.
  const ANH_SAN_PHAM = {
    sp1: '/assets/anh/sp1.jpg',
    sp2: '/assets/anh/sp2.jpg',
    sp3: '/assets/anh/sp3.jpg',
    sp4: '/assets/anh/sp4.jpg',
    sp5: '/assets/anh/sp5.jpg',
    sp6: '/assets/anh/sp6.jpg',
    sp7: '/assets/anh/sp7.jpg',
    sp8: '/assets/anh/sp8.jpg',
    sp9: '/assets/anh/sp9.jpg'
  };

  // Ảnh minh hoạ kho khoá học, dùng cho bảng "Đặc quyền".
  const ANH_DAC_QUYEN = '/assets/anh/dac-quyen.jpg';

  // Ảnh ĐẠI DIỆN vuông 1:1 hiện ở đầu mỗi thẻ trong lưới sản phẩm — khác với
  // ANH_SAN_PHAM ở trên (ảnh lớn trong bảng mô tả chi tiết). Mã nào chưa khai
  // thì thẻ dựng khung rỗng giữ chỗ, không vỡ bố cục.
  const ANH_DAI_DIEN = {};

  const CAM_KET_CHUNG = [
    '⚡ <strong>Giao hàng tức thì, không có thời gian chờ:</strong> ngay khi shop nhận được tiền thanh toán, hệ thống tự động gửi hàng tới bạn qua <strong>email</strong> — hoặc qua <strong>Zalo</strong>, hoặc <strong>tin nhắn SMS</strong>, tuỳ cách bạn để lại liên hệ. Không hẹn ngày, không xếp hàng chờ, không phải nhắc.',
    '📘 <strong>Hướng dẫn tận tay:</strong> ngay sau khi mua, bạn nhận bộ hướng dẫn cụ thể — chi tiết từng bước, có hình ảnh và video minh hoạ, làm theo là chạy, không cần biết kỹ thuật.',
    '💯 <strong>Hoàn tiền 100% nếu không hài lòng</strong> trong vòng <strong>15 ngày đầu sử dụng</strong>. Không hỏi lý do dài dòng — bạn chỉ cần bấm mục <strong>“Yêu cầu hoàn tiền”</strong> ở thanh menu bên trái.',
    '🛟 <strong>Hỗ trợ trực tiếp từ shop</strong> qua Zalo trong suốt quá trình cài đặt và sử dụng, kể cả khi bạn đổi máy hay cài lại.',
    '♾️ <strong>Dùng trọn đời</strong> — trả tiền một lần, không phí duy trì, không gia hạn hằng tháng.',
    '🔒 <strong>Riêng tư tuyệt đối:</strong> thông tin bạn để lại chỉ dùng để giao sản phẩm và hỗ trợ, shop không chia sẻ cho bất kỳ bên nào.'
  ];

  const MO_TA_SAN_PHAM = {

    /* ------------------------------------------------------------------ SP1 */
    sp1: {
      khauHieu: '<span class="dong-dau">Lightroom Tiếng Việt dễ sử dụng - Premium</span>' +
        'Mở toàn bộ kho vũ khí của Lightroom ngay trên chiếc điện thoại bạn đang cầm trong tay — một lần duy nhất, dùng mãi mãi. 📱✨',
      khoi: [
        { kieu: 'luu-y', tieuDe: '⚠️ Lưu ý trước khi mua', y: [
          '🤖 App <strong>chỉ dành cho điện thoại chạy hệ điều hành Android</strong> — <strong>không dành cho iPhone</strong>. Vui lòng kiểm tra máy của bạn trước khi đặt hàng.',
          '🔑 Chỉ có thể <strong>đăng nhập bằng tài khoản Adobe</strong>. Nếu bạn chưa có, tạo được ngay trong app chỉ trong một phút — shop hướng dẫn từng bước.',
          '🚫 <strong>Không đăng nhập được bằng Google</strong>, kể cả khi app hiện sẵn nút đó.'
        ] },
        { kieu: 'doan', chu: 'Bạn đã bao giờ mở Lightroom, chạm vào một công cụ hay ho rồi thấy hiện lên chữ <em>Premium</em> chưa? Cảm giác hụt hẫng đó dừng lại ở đây. Gói này cấp cho bạn quyền truy cập <strong>toàn bộ tính năng nâng cao</strong> của Lightroom trên điện thoại — thứ mà đại đa số người dùng phải trả tiền hằng tháng mới có.' },
        { kieu: 'noi-bat', chu: '🎁 Suất ưu đãi có giới hạn — kèm hướng dẫn đăng nhập và kích hoạt Premium từ A đến Z, shop cầm tay chỉ việc.' },
        { kieu: 'muc', tieuDe: '🔓 Những tính năng cao cấp được mở khoá', y: [
          '🎬 <strong>Chỉnh màu cho Video</strong> — kéo thông số như chỉnh ảnh, clip đăng mạng xã hội lên màu điện ảnh trong vài phút.',
          '🖼️ <strong>Xử lý ảnh thô (RAW) ngay trên điện thoại</strong> — giữ trọn dải sáng và chi tiết mà file JPG đã vứt bỏ.',
          '⚡ <strong>Chỉnh màu hàng loạt</strong> — chép công thức màu từ một tấm sang cả trăm tấm chỉ bằng một cú chạm.',
          '🩹 <strong>Công cụ Xoá</strong> — bay sạch người lạ, dây điện, vết rác trong khung hình.',
          '🎭 <strong>Công cụ Mặt nạ (Masking)</strong> — tách riêng bầu trời, chủ thể, hậu cảnh để chỉnh từng vùng độc lập.',
          '📐 <strong>Phối cảnh (Perspective)</strong> — kéo thẳng nhà nghiêng, đường chân trời lệch.',
          '🎨 <strong>Dùng preset màu cao cấp</strong> và <strong>nhập preset hàng loạt</strong> — cả nghìn màu nạp một lượt, không phải thêm từng cái.',
          '🚀 <strong>Chỉnh sửa nhanh</strong> — bộ thao tác rút gọn cho lúc cần ảnh gấp.',
          '🤖 <strong>Chỉnh bằng trí tuệ nhân tạo</strong> — máy tự nhận diện chủ thể, tự đề xuất hướng xử lý.',
          '☁️ <strong>Chỉnh bầu trời</strong> — trời trắng bệch thành trời xanh trong, hoàng hôn rực rỡ.',
          '💆 <strong>Xoá nhám da mặt</strong> — da mịn tự nhiên, vẫn còn lỗ chân lông, không bị “nhựa”.'
        ] },
        { kieu: 'doan', chu: 'Cùng một tấm ảnh, cùng một con mắt thẩm mỹ — nhưng có đủ công cụ trong tay thì kết quả cách nhau cả một trời một vực. Đây là khoản đầu tư <strong>rẻ nhất</strong> mà bạn có thể bỏ ra để nâng hẳn chất lượng mọi bức ảnh mình chụp từ nay về sau.' }
      ]
    },

    /* ------------------------------------------------------------------ SP2 */
    sp2: {
      khauHieu: '10.000 màu cao cấp, cài sẵn thẳng vào tài khoản của bạn. Mở app lên là có, không phải nhập tay tấm nào. 🎨',
      khoi: [
        { kieu: 'doan', chu: 'Preset trôi nổi trên mạng thì nhiều, nhưng phần lớn là màu rác: nạp vào ảnh cháy sáng, da người xám ngoét, hoặc lỗi không hiện. Bộ này <strong>được tuyển chọn kỹ từng bộ một</strong> và <strong>đã test thành công</strong> trước khi giao cho bạn.' },
        { kieu: 'muc', tieuDe: '💎 Vì sao bộ màu này khác', y: [
          '🔍 <strong>Tuyển chọn kỹ lưỡng:</strong> mỗi bộ màu đều được kiểm thử trên ảnh thật, loại thẳng những màu hỏng, màu trùng, màu vô dụng.',
          '📦 <strong>Cài trực tiếp vào tài khoản cá nhân của bạn</strong> — không phải mò import từng file, mở Lightroom là màu đã nằm sẵn trong danh sách.',
          '🛡️ <strong>An toàn và riêng tư:</strong> thao tác trên chính tài khoản của bạn, shop không giữ, không dùng chung, không đụng vào ảnh của bạn.',
          '♾️ <strong>Sử dụng trọn đời:</strong> màu nằm trong tài khoản, đổi điện thoại vẫn còn nguyên.',
          '💻 <strong>Dùng được cả trên máy tính:</strong> các bộ màu này cũng cài được vào <strong>Lightroom máy tính</strong> và <strong>Photoshop máy tính</strong> — mua một lần, xài cả ba nơi.'
        ] },
        { kieu: 'noi-bat', chu: '⏱️ Làm phép tính nhanh: mỗi tấm ảnh bạn dò màu mất 5 phút. Có sẵn 10.000 màu, bạn chỉ lướt và chọn — 30 giây là xong. Một buổi chụp 100 tấm tiết kiệm gần 8 tiếng ngồi máy.' },
        { kieu: 'doan', chu: 'Từ tông phim hoài cổ, tông Hàn Quốc trong trẻo, tông cưới sang trọng, tông du lịch rực nắng cho tới tông đường phố xám lạnh — bạn luôn có sẵn một dải màu để bắt đầu, thay vì ngồi trước tấm ảnh thô và không biết kéo thanh nào trước.' }
      ]
    },

    /* ------------------------------------------------------------------ SP3 */
    sp3: {
      khauHieu: '650 màu cao cấp dành riêng cho dân làm nghề — chuẩn thương mại, dùng được cho cả Lightroom lẫn Photoshop trên máy tính. 🖥️',
      khoi: [
        { kieu: 'doan', chu: 'Nếu sản phẩm 10.000 màu là kho đạn dồi dào cho người chơi ảnh, thì bộ 650 màu này là <strong>hộp đồ nghề tinh gọn của thợ chính</strong>: ít hơn về số lượng, nhưng mỗi màu đều được dựng để chịu được yêu cầu khắt khe của khách hàng trả tiền.' },
        { kieu: 'muc', tieuDe: '🏆 Dành cho ai', y: [
          '📸 <strong>Nhiếp ảnh gia</strong> nhận job cưới, kỷ yếu, sự kiện — cần màu ổn định, đồng nhất trên cả bộ ảnh hàng trăm tấm.',
          '💼 <strong>Người làm nghề thương mại</strong> — ảnh sản phẩm, ảnh quảng cáo, ảnh thương hiệu, nơi màu sai một chút là khách trả về.',
          '🎓 <strong>Người mới lên máy tính</strong> — có sẵn điểm xuất phát tốt để học cách một màu đẹp được dựng lên từ những thông số nào.'
        ] },
        { kieu: 'muc', tieuDe: '⚙️ Bạn nhận được gì', y: [
          '🎨 <strong>650 preset màu cao cấp</strong>, tối ưu cho ảnh RAW độ phân giải lớn, không vỡ màu khi in ấn.',
          '🔁 <strong>Cài được cho cả Lightroom máy tính và Photoshop (Camera Raw)</strong> — một bộ file, hai phần mềm.',
          '📱 <strong>Chuyển sang Lightroom điện thoại dễ dàng</strong> — shop hướng dẫn cách đồng bộ, đi đâu cũng có màu quen thuộc trong túi.',
          '🗂️ <strong>Phân nhóm rõ ràng theo chủ đề</strong> — tìm màu trong vài giây thay vì cuộn mỏi tay.'
        ] },
        { kieu: 'noi-bat', chu: '💡 Màu đẹp không chỉ để ảnh đẹp hơn — nó là thứ khiến khách nhận ra ảnh của bạn giữa hàng trăm người khác, và là lý do họ quay lại đặt tiếp.' }
      ]
    },

    /* ------------------------------------------------------------------ SP4 */
    sp4: {
      khauHieu: 'Khoá học biến chiếc điện thoại thành phòng lab màu chuyên nghiệp — và rèn cho bạn đôi mắt biết nhìn ra màu đúng. 🎓📱',
      khoi: [
        { kieu: 'doan', chu: 'Công cụ ai cũng mua được, preset ai cũng tải được. Thứ không mua được là <strong>con mắt</strong> — khả năng nhìn một tấm ảnh và biết ngay nó đang thừa gì, thiếu gì, phải kéo thanh nào. Khoá học này sinh ra để rèn đúng thứ đó.' },
        { kieu: 'muc', tieuDe: '🤝 Admin cam kết với bạn', y: [
          '👁️ <strong>Rèn luyện đôi mắt của bạn</strong> để tự đánh giá và thẩm định màu sắc của từng bức ảnh, biết blend màu cho từng kiểu ảnh khác nhau.',
          '🤖 <strong>Kết hợp Lightroom với chỉnh màu bằng AI</strong> (trí tuệ nhân tạo) để cho ra bức ảnh đúng màu sắc và nhanh chóng nhất.',
          '🎚️ <strong>Hiểu biết và cảm nhận sâu sắc</strong> mọi thông số ánh sáng, màu sắc, hiệu ứng, chi tiết… trên app Lightroom điện thoại — không còn kéo mò.',
          '🔓 <strong>Hướng dẫn mở khoá tính năng cao cấp</strong> trong Lightroom, và cách bắt tay Lightroom với Photoshop.',
          '💻 <strong>Nắm vững cả Lightroom MÁY TÍNH và Camera Raw của Photoshop</strong> — học một khoá, làm chủ ba mặt trận.'
        ] },
        { kieu: 'doan', chu: 'Kiến thức trong khoá này áp dụng được ngay để <strong>chỉnh màu chuyên nghiệp bằng Lightroom trên điện thoại</strong>, trên <strong>máy tính PC / Laptop</strong>, hoặc bằng <strong>công cụ Camera Raw của Photoshop</strong>. Học một lần, dùng ở mọi thiết bị bạn chạm tay tới.' },
        { kieu: 'muc', tieuDe: '🛠️ Hỗ trợ sử dụng các tính năng cao cấp', y: [
          '🎭 <strong>Masking (Mặt nạ)</strong> — chỉnh riêng từng vùng, không đụng phần còn lại.',
          '🧽 <strong>Xoá vật thể</strong> — dọn sạch khung hình khỏi những thứ không mời mà đến.',
          '🌫️ <strong>Làm mờ hậu cảnh</strong> — tách chủ thể nổi bật như chụp bằng ống kính xoá phông.',
          '📚 <strong>Chỉnh sửa hàng loạt</strong> — xử lý cả buổi chụp trong thời gian trước đây chỉ đủ làm vài tấm.',
          '✨ <strong>Và RẤT RẤT nhiều tính năng cao cấp khác</strong> được mở ra dần qua từng bài học.'
        ] },
        { kieu: 'muc', tieuDe: '🎓 Bạn sẽ học được gì trong khoá học này?', y: [
          '✅ Rèn luyện <strong>“đôi mắt thần sầu”</strong> để đánh giá và thẩm định màu sắc.',
          '✅ Kết hợp sức mạnh <strong>AI (Trí tuệ nhân tạo)</strong> để chỉnh màu siêu tốc.',
          '✅ Hiểu sâu sắc mọi thông số <strong>ánh sáng, màu sắc, hiệu ứng, chi tiết</strong> trong Lightroom.',
          '✅ <strong>Tự tạo phong cách màu và preset riêng</strong> cho bản thân — dấu vân tay của riêng bạn.',
          '✅ Nắm vững kỹ thuật <strong>chỉnh ảnh RAW chuyên nghiệp</strong> trên cả điện thoại lẫn máy tính.'
        ] },
        { kieu: 'noi-bat', chu: '🚀 Hết khoá học, bạn không còn là người đi xin preset của người khác nữa — bạn là người tự làm ra chúng.' }
      ]
    },

    /* ------------------------------------------------------------------ SP5 */
    sp5: {
      khauHieu: 'Từ người biết dùng Lightroom máy tính, thành người làm chủ nó — có quy trình, có tốc độ, có phong cách riêng. 🖥️🎓',
      khoi: [
        { kieu: 'doan', chu: 'Lightroom trên máy tính không khó, nhưng nó rộng. Người tự mò thường chỉ dùng đi dùng lại đúng năm bảy thanh trượt quen tay, còn tám mươi phần trăm sức mạnh còn lại thì nằm im. Khoá học này dẫn bạn đi hết phần còn lại đó — theo <strong>một quy trình làm việc rõ ràng</strong>, không phải một đống mẹo vặt rời rạc.' },
        { kieu: 'muc', tieuDe: '🗺️ Lộ trình học', y: [
          '📥 <strong>Nhập và quản lý thư viện ảnh</strong> — catalog, thư mục, gắn cờ, gắn sao, từ khoá. Buổi chụp nghìn tấm vẫn tìm ra tấm cần trong mười giây.',
          '🌡️ <strong>Nền tảng ánh sáng và màu sắc</strong> — histogram, phơi sáng, tương phản, vùng sáng, vùng tối, trắng, đen. Hiểu bản chất rồi thì mọi ảnh đều xử lý được.',
          '🎨 <strong>Làm chủ màu sắc</strong> — HSL, Color Grading, Calibration, đường cong Tone Curve. Đây là nơi phong cách của bạn thực sự hình thành.',
          '🎭 <strong>Mặt nạ nâng cao</strong> — chọn chủ thể, chọn bầu trời, chọn người, chọn nền; giao và trừ vùng chọn để chỉnh chính xác đến từng chi tiết.',
          '🩹 <strong>Sửa chữa và làm sạch</strong> — xoá vật thể, khử nhiễu, làm nét, sửa quang sai và méo ống kính.',
          '⚡ <strong>Chỉnh sửa hàng loạt và tự động hoá</strong> — đồng bộ, preset, profile, xuất file theo lô cho nhiều mục đích khác nhau.',
          '🔗 <strong>Bắt tay với Photoshop</strong> — khi nào nên chuyển sang Photoshop, chuyển thế nào để không mất chất lượng, rồi quay về Lightroom ra sao.',
          '🖨️ <strong>Xuất file đúng chuẩn</strong> — file cho khách, file đăng mạng xã hội, file đem in; mỗi đích đến một thiết lập riêng.'
        ] },
        { kieu: 'muc', tieuDe: '🎯 Bạn đạt được gì sau khoá học', y: [
          '✅ Có <strong>quy trình xử lý ảnh của riêng mình</strong>, làm nhanh gấp nhiều lần hiện tại.',
          '✅ <strong>Đồng nhất màu</strong> trên cả bộ ảnh — dấu hiệu rõ nhất của người làm nghề thật sự.',
          '✅ <strong>Tự dựng preset</strong> mang phong cách riêng, thay vì đi mượn màu của người khác.',
          '✅ Xử lý được cả những <strong>file khó</strong>: ngược sáng, thiếu sáng, ánh sáng đèn màu lộn xộn.',
          '✅ Đủ tự tin <strong>nhận job và giao ảnh đúng hẹn</strong>.'
        ] },
        { kieu: 'noi-bat', chu: '⏳ Học lỏm trên mạng thì miễn phí, nhưng bạn trả bằng thời gian — thường là vài năm loay hoay. Khoá học rút quãng đường đó xuống còn vài tuần.' }
      ]
    },

    /* ------------------------------------------------------------------ SP6 */
    sp6: {
      khauHieu: 'Lightroom Classic bản quyền trọn đời cho máy tính Windows — cài một lần, chạy êm, không lo hết hạn. 🖥️♾️',
      khoi: [
        { kieu: 'muc', tieuDe: '⚙️ Điểm mạnh của gói này', y: [
          '🚀 <strong>Hỗ trợ thiết lập nhanh</strong> — shop đồng hành từ lúc tải về đến khi mở phần mềm lên chỉnh được tấm ảnh đầu tiên.',
          '🎟️ <strong>Suất đăng nhập ưu đãi từ nhà sản xuất</strong>, số lượng có hạn.',
          '🪶 <strong>Hoạt động mượt mà</strong>, <strong>phù hợp với mọi cấu hình PC từ thấp đến cao</strong> — máy đời cũ vẫn chạy được, không giật, không treo giữa chừng.',
          '🔬 <strong>Phiên bản tinh chỉnh tối ưu</strong>, đã <strong>kiểm thử thành công trên hơn 1.000 máy tính</strong> trước khi đem bán.',
          '🎬 <strong>Có video hướng dẫn chi tiết</strong> — vừa xem vừa làm theo, không cần biết kỹ thuật.',
          '🏷️ <strong>Phiên bản chuẩn định danh: Lightroom Classic V10.0</strong>.'
        ] },
        { kieu: 'doan', chu: 'Đây là bản <strong>Classic</strong> — bản mà giới nhiếp ảnh chuyên nghiệp trên toàn thế giới vẫn dùng để xử lý những bộ ảnh nặng nhất: catalog quản lý hàng chục nghìn tấm, chỉnh sửa hàng loạt, xuất file theo lô, kiểm soát màu đến từng chi tiết nhỏ.' },
        { kieu: 'noi-bat', chu: '💰 So với việc trả phí thuê bao hằng tháng năm này qua năm khác, bạn chỉ trả một lần duy nhất tại đây — và dùng mãi.' }
      ]
    },

    /* ------------------------------------------------------------------ SP7 */
    sp7: {
      khauHieu: 'Photoshop bản quyền trọn đời cho máy tính Windows — công cụ mạnh nhất ngành hình ảnh, nằm gọn trong máy bạn. 🖥️🎨',
      khoi: [
        { kieu: 'muc', tieuDe: '⚙️ Điểm mạnh của gói này', y: [
          '🚀 <strong>Hỗ trợ thiết lập nhanh</strong> — cài đặt xong xuôi rồi mới tính là hoàn thành.',
          '🎟️ <strong>Suất đăng nhập ưu đãi từ nhà sản xuất</strong>, số lượng có hạn.',
          '🪶 <strong>Hoạt động mượt mà</strong>, <strong>phù hợp với mọi cấu hình PC từ thấp đến cao</strong>.',
          '🔬 <strong>Phiên bản tinh chỉnh tối ưu</strong>, đã <strong>kiểm thử thành công trên hơn 1.000 máy tính</strong>.',
          '🎬 <strong>Có video hướng dẫn chi tiết</strong> từng bước.',
          '🏷️ <strong>Phiên bản chuẩn định danh: Photoshop 2021 v22.0.0.35 x64</strong>.'
        ] },
        { kieu: 'muc', tieuDe: '💪 Photoshop mở ra cho bạn những gì', y: [
          '🖌️ <strong>Ghép ảnh và chỉnh sửa sâu</strong> — thay nền, ghép người, dựng cảnh không có thật mà nhìn vẫn thật.',
          '💄 <strong>Retouch chân dung chuyên nghiệp</strong> — làm mịn da giữ nguyên kết cấu, tạo khối gương mặt, chỉnh dáng.',
          '📐 <strong>Thiết kế đồ hoạ</strong> — poster, banner, bìa sách, bao bì, nhận diện thương hiệu.',
          '🧩 <strong>Camera Raw ngay trong Photoshop</strong> — dùng chung được toàn bộ preset màu bạn đang có.',
          '🏭 <strong>Action và xử lý theo lô</strong> — thao tác lặp đi lặp lại giao hết cho máy làm.'
        ] },
        { kieu: 'noi-bat', chu: '🤝 Lightroom lo màu, Photoshop lo chi tiết. Có cả hai trong tay, gần như không còn yêu cầu nào của khách khiến bạn phải từ chối.' }
      ]
    },

    /* ------------------------------------------------------------------ SP8 */
    sp8: {
      khauHieu: 'Một kho tài nguyên khổng lồ để bạn luyện tay và làm nghề — ảnh RAW thật, Mockup thật, file PSD mở ra chỉnh được ngay. 🗃️',
      khoi: [
        { kieu: 'muc', tieuDe: '📷 Bộ 100 ảnh RAW chất lượng cao', y: [
          '🗂️ Đủ định dạng gốc <strong>DNG, NEF, CR2…</strong> — đúng file máy ảnh xuất ra, không phải JPG chuyển ngược.',
          '💍 Đa dạng thể loại: <strong>ảnh cưới, ảnh người mẫu, mẫu điện ảnh, phong cảnh, film, du lịch, kỷ yếu…</strong>',
          '🏋️ Dùng để <strong>luyện chỉnh sửa như ảnh thật</strong> — bạn tập trên chính loại file mà khách hàng sẽ đưa cho bạn.'
        ] },
        { kieu: 'muc', tieuDe: '🧊 Bộ 1000+ file Mockup', y: [
          '🪧 <strong>Bảng hiệu</strong>, <strong>bộ nhận diện thương hiệu</strong>, <strong>book</strong>, <strong>card</strong>, <strong>catalogue</strong>, <strong>chai lọ</strong>, <strong>cốc</strong>… và rất nhiều chủng loại khác.',
          '⚡ Chỉ cần thả thiết kế của bạn vào là ra ngay ảnh sản phẩm như chụp thật — khách gật đầu nhanh hơn hẳn.'
        ] },
        { kieu: 'muc', tieuDe: '🎨 Bộ 1000+ file PSD đa dạng mọi chủ đề', y: [
          '🧧 <strong>Chủ đề Tết</strong>, <strong>chủ đề du lịch</strong> và hàng loạt chủ đề khác quanh năm.',
          '🧱 File nhiều lớp, mở ra <strong>sửa được ngay</strong>: đổi chữ, đổi ảnh, đổi màu, xuất bài — có việc gấp cũng kịp.'
        ] },
        { kieu: 'noi-bat', chu: '⏱️ Người mới có tài nguyên để luyện tập không cần đi xin. Người làm nghề có sẵn kho vật liệu, rút thời gian mỗi job xuống còn một phần mấy.' }
      ]
    },

    /* ------------------------------------------------------------------ SP9 */
    sp9: {
      khauHieu: 'Hơn 1.000 font chữ Việt hoá cao cấp — gõ tiếng Việt có dấu chuẩn đẹp, không lỗi, không vỡ dấu. ✍️',
      khoi: [
        { kieu: 'doan', chu: 'Ai từng thiết kế bằng font nước ngoài đều biết nỗi khổ: chữ thì đẹp, nhưng gõ tiếng Việt vào là dấu bay mất, dấu chồng lên chữ, hoặc biến thành ô vuông. Bộ font này <strong>đã Việt hoá hoàn chỉnh</strong> nên bạn gõ thoải mái, dấu nào ra dấu nấy.' },
        { kieu: 'muc', tieuDe: '🗂️ Trong bộ font có gì', y: [
          '🖋️ <strong>Chữ thư pháp</strong> — bay bổng, hợp thiệp cưới, câu đối, ấn phẩm Tết.',
          '➖ <strong>Chữ mảnh</strong> — thanh thoát, hiện đại, hợp thương hiệu cao cấp và mỹ phẩm.',
          '⬆️ <strong>Chữ cao hẹp</strong> — mạnh mẽ, tiết kiệm chỗ, hợp tiêu đề và poster.',
          '✍️ <strong>Chữ viết tay</strong> — gần gũi, ấm áp, hợp nội dung đời thường và quà tặng.',
          '⬛ <strong>Chữ vuông</strong> — chắc chắn, dứt khoát, hợp thể thao và công nghệ.',
          '➕ Và nhiều nhóm phong cách khác, <strong>tuyển chọn đầy đủ, bắt mắt, không lỗi gõ dấu</strong>.'
        ] },
        { kieu: 'noi-bat', chu: '🎯 Font chữ là thứ người xem đọc trước cả khi họ kịp nhìn thiết kế. Chọn đúng font, bài của bạn sang lên trông thấy mà chẳng tốn thêm công nào.' }
      ]
    }
  };

  /* ------------------------------------------- ĐẶC QUYỀN CỦA KHÁCH ĐÃ MUA HÀNG

     Dùng CHUNG bộ khối và chung hiệu ứng với mô tả sản phẩm, chỉ khác tiêu đề,
     nội dung và nút ở đáy bảng.                                              */

  const NOI_DUNG_DAC_QUYEN = [
    { kieu: 'khau-hieu', chu: 'Đã từng mua hàng của Shop? Vậy thì bạn còn một món nữa chưa nhận:' +
      '<span class="chu-nhan-xanh">học thêm khoá thiết kế bạn thích, hoàn toàn miễn phí. 👑</span>' },
    { kieu: 'muc', tieuDe: '🎁 Yêu cầu học thêm các khoá học về thiết kế một cách miễn phí', y: [
      '🛒 <strong>Điều kiện duy nhất:</strong> bạn đã từng mua <strong>bất kỳ sản phẩm nào</strong> của Shop — dù là gói lớn nhất hay món nhỏ nhất, đều được tính.',
      '💬 <strong>Cách nhận:</strong> nhắn tin riêng cho shop qua Zalo và nói tên khoá học bạn muốn. Chỉ vậy thôi.',
      '💸 <strong>Chi phí:</strong> không thêm một đồng nào. Đây là lời cảm ơn của shop dành cho khách đã tin tưởng.',
      '☝️ <strong>Xin lưu ý:</strong> mỗi khách được yêu cầu <strong>không quá 2 khoá học</strong>.'
    ] },
    { kieu: 'muc', tieuDe: '📚 Kho khoá học bạn được chọn', y: [
      '🎨 <strong>Chỉnh ảnh và màu sắc:</strong> Lightroom, Photoshop, Nhiếp ảnh.',
      '🖌️ <strong>Thiết kế đồ hoạ:</strong> Adobe Illustrator, CorelDRAW, InDesign, Thiết kế banner, Tư duy thiết kế.',
      '🎬 <strong>Dựng phim và chuyển động:</strong> After Effects, Premiere Pro, Quay dựng phim.',
      '🏛️ <strong>Không gian ba chiều:</strong> 3DS MAX.',
      '📱 <strong>Thiết kế giao diện:</strong> UX / UI.',
      '🤖 <strong>Công nghệ mới:</strong> cách tạo video hàng loạt bằng AI.',
      '➕ Và nhiều khoá khác nữa — cứ hỏi, có là shop gửi.'
    ] },
    { kieu: 'noi-bat', chu: '⏳ Đặc quyền này không có hạn dùng, nhưng kho khoá học thì đổi mới liên tục. Nhắn cho shop sớm để chọn được đúng khoá bạn đang cần nhất.' },
    { kieu: 'cam-ket', tieuDe: '🤝 Shop cam kết', y: [
      '⚡ <strong>Phản hồi nhanh:</strong> shop trả lời tin nhắn Zalo trong thời gian sớm nhất có thể.',
      '📦 <strong>Gửi trọn bộ:</strong> khoá học giao đầy đủ, không cắt xén, không khoá phần nào.',
      '🛟 <strong>Hỗ trợ trong lúc học:</strong> vướng ở đâu cứ nhắn, shop chỉ tiếp.',
      '🔒 <strong>Riêng tư:</strong> shop không chia sẻ thông tin liên hệ của bạn cho bất kỳ ai.'
    ] }
  ];

  // Dựng ô ảnh vuông dùng chung cho bảng mô tả sản phẩm lẫn bảng Đặc quyền.
  // width/height khai đúng 1:1 để trình duyệt chừa sẵn chỗ, trang không giật
  // khi ảnh tải xong; loading="lazy" nên ảnh chỉ tải lúc bảng mở ra.
  function veOAnh(duongDan, moTa){
    return '' +
      '<figure class="anh-san-pham">' +
        '<img src="' + duongDan + '" width="640" height="640" loading="lazy" decoding="async"' +
          ' alt="' + escapeHtml(moTa) + '">' +
      '</figure>';
  }

  function veNoiDungDacQuyen(){
    // Gọi qua hàm bọc chứ KHÔNG truyền thẳng veKhoiMoTa vào map: map đưa cả
    // mảng vào tham số thứ ba, rơi đúng chỗ cờ trongHang và tắt mất hiệu ứng.
    // Khối đầu tiên ghép ngang hàng với ảnh kho khoá học, y như bảng mô tả
    // sản phẩm — kể cả nhịp trượt chậm gấp năm của khung ảnh.
    return '' +
      '<div class="hang-anh-chu troi-ngang" style="animation-delay:0s">' +
        veOAnh(ANH_DAC_QUYEN, 'Ảnh minh hoạ: kho khoá học thiết kế của shop') +
        veKhoiMoTa(NOI_DUNG_DAC_QUYEN[0], 0, true) +
      '</div>' +
      NOI_DUNG_DAC_QUYEN.slice(1).map(function(k, i){ return veKhoiMoTa(k, i + 1); }).join('');
  }

  /* --------------------------------------------------------------- DỰNG HTML

     Lời văn ở trên CỐ Ý chứa vài thẻ <strong>/<em> nên KHÔNG chạy qua
     escapeHtml — đây là nội dung tĩnh do chính shop viết, không phải chữ do
     khách nhập. Mọi thứ đến từ người dùng vẫn phải escape như cũ.

     Mỗi khối nhận một số thứ tự để CSS trễ hiệu ứng dần: khối trên hiện
     trước, khối dưới trôi từ phải qua sau đó — cả trang tự chạy hết, khách
     không phải cuộn xuống mới thấy.                                        */

  // Giây, khoảng cách giữa hai khối liền nhau. Nhịp cũ 0,11 giây khiến cả bảng
  // chạy vụt qua trước khi mắt kịp bám vào khối nào; giãn gấp ba cho từng khối
  // có chỗ đứng riêng. Đổi đúng một hằng số này là mọi bảng mô tả giãn theo.
  const TRE_MOI_KHOI_MO_TA = 0.33;

  // trongHang: khối đang nằm trong hàng ngang cùng ảnh, nên KHÔNG tự chạy hiệu
  // ứng nữa — cả hàng trôi vào như một, ảnh và chữ không tách nhau ra.
  function veKhoiMoTa(khoi, thuTu, trongHang){
    const tre = trongHang ? '' : ' style="animation-delay:' + (thuTu * TRE_MOI_KHOI_MO_TA).toFixed(2) + 's"';
    const dau = '<section class="khoi-mo-ta khoi-' + khoi.kieu + (trongHang ? '' : ' troi-ngang') + '"' + tre + '>';
    let than = '';
    if (khoi.tieuDe) than += '<h4>' + khoi.tieuDe + '</h4>';
    if (khoi.chu) than += '<p>' + khoi.chu + '</p>';
    if (khoi.y && khoi.y.length) {
      than += '<ul>' + khoi.y.map(function(dong){ return '<li>' + dong + '</li>'; }).join('') + '</ul>';
    }
    return dau + than + '</section>';
  }

  // Trả về toàn bộ phần mô tả của một sản phẩm, LUÔN kết thúc bằng khối cam kết.
  //
  // Khối ĐẦU TIÊN được ghép NGANG HÀNG với ảnh sản phẩm: ảnh bên trái, khối chữ
  // bên phải. Trên màn hình hẹp thì CSS cho chúng xuống dòng, ảnh nằm trên.
  // Cả cặp dùng chung một số thứ tự nên trôi vào cùng lúc, không lệch nhịp.
  function veMoTaSanPham(sp){
    const mt = MO_TA_SAN_PHAM[sp.ma];
    const danhSach = [];
    if (mt && mt.khauHieu) danhSach.push({ kieu: 'khau-hieu', chu: mt.khauHieu });
    if (mt && mt.khoi) mt.khoi.forEach(function(k){ danhSach.push(k); });
    danhSach.push({ kieu: 'cam-ket', tieuDe: '🤝 Cam kết của shop dành cho bạn', y: CAM_KET_CHUNG });

    const anh = ANH_SAN_PHAM[sp.ma];
    if (!anh || !danhSach.length) return danhSach.map(function(k, i){ return veKhoiMoTa(k, i); }).join('');

    return '' +
      '<div class="hang-anh-chu troi-ngang" style="animation-delay:0s">' +
        veOAnh(anh, 'Ảnh minh hoạ: ' + sp.ten) + veKhoiMoTa(danhSach[0], 0, true) +
      '</div>' +
      danhSach.slice(1).map(function(k, i){ return veKhoiMoTa(k, i + 1); }).join('');
  }
