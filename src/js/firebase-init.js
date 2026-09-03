  /* =====================================================================
     CẤU HÌNH FIREBASE — THAY CÁC GIÁ TRỊ BÊN DƯỚI BẰNG THÔNG SỐ DỰ ÁN
     FIREBASE CỦA SHOP (Firebase Console > Project settings > General >
     Your apps > SDK setup and configuration > Config).

     Website này KHÔNG có đăng nhập. Firebase ở đây chỉ dùng hai việc:
       1) ĐỌC thông tin chuyển khoản tại nhánh /thongtinthanhtoan — nhờ vậy số
          tài khoản KHÔNG nằm trong mã nguồn trên GitHub, và đổi số tài khoản
          chỉ cần sửa trong Firebase Console, không phải deploy lại.
       2) GHI đơn hàng vào nhánh /donhang mỗi khi khách bấm "Tiến hành thanh
          toán", rồi đánh dấu đã xác nhận khi khách bấm nút xác nhận.

     Quyền đọc/ghi hai nhánh đó khai trong database.rules.json ở gốc kho.

     LƯU Ý THẬT THÀ VỀ BẢO MẬT: đây là web tĩnh, nên người mở tab Network của
     trình duyệt VẪN xem được thông tin chuyển khoản sau khi nó tải về. Cách
     làm này chặn được người soi mã nguồn trên GitHub, không phải một lớp mã
     hoá — đừng đặt bí mật thật sự (khoá API riêng tư, mật khẩu) vào đây.
  ===================================================================== */
  const firebaseConfig = {
    apiKey: "AIzaSyBv5d3iGzJncZZ-xTEsUzLblBSm1NkYnX4",
    authDomain: "thanhdeptraishop.firebaseapp.com",
    databaseURL: "https://thanhdeptraishop-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "thanhdeptraishop",
    storageBucket: "thanhdeptraishop.firebasestorage.app",
    messagingSenderId: "588471551838",
    appId: "1:588471551838:web:f87770ce5ed4ce94b231cf"
  };

  // Khi cấu hình còn trống (chưa dán config vào), KHÔNG khởi tạo Firebase —
  // nếu cứ khởi tạo, SDK sẽ ném lỗi và làm trắng cả trang. Web vẫn phải chạy
  // được: khách chọn hàng, nhập thông tin và xem mã QR bình thường, chỉ là
  // thông tin chuyển khoản lấy từ bản dự phòng và đơn hàng không lưu lại.
  var firebaseSanSang = false;
  var rtdb = null;
  try {
    if (firebaseConfig.databaseURL && firebaseConfig.projectId) {
      firebase.initializeApp(firebaseConfig);
      rtdb = firebase.database();
      firebaseSanSang = true;
    } else {
      console.warn('Chưa dán firebaseConfig vào src/js/firebase-init.js — website chạy ở chế độ không có cơ sở dữ liệu.');
    }
  } catch (e) {
    console.error('Không khởi tạo được Firebase (website vẫn chạy, chỉ không lưu được đơn hàng):', e);
  }
