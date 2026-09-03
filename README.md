# Shop Thànhđẹptrai.vn

Website bán sản phẩm số Lightroom. Web tĩnh chạy trên Firebase Hosting, khách
hàng **không cần đăng nhập**.

## Chạy thử tại máy

```sh
node scripts/build-static.js
python3 scripts/serve-static.py --directory public 3111
# mở http://127.0.0.1:3111/
```

## Cấu trúc

| Đường dẫn | Vai trò |
|---|---|
| `index.html` | Khung trang, giữ mỏng — chỉ meta và 4 thẻ tài nguyên có vân tay |
| `src/css/base.css` | Bảng màu (tone Lightroom), chữ, reset |
| `src/css/app.css` | Bố cục vỏ trang, menu, sản phẩm, thanh neo đáy, modal |
| `src/js/firebase-init.js` | Cấu hình Firebase — **cần dán config dự án vào đây** |
| `src/js/app/01-foundation.js` | Danh sách sản phẩm, mức giảm giá, state, định tuyến |
| `src/js/app/02-shell-nav.js` | Nút nổi, menu bên trái, khung modal dùng chung |
| `src/js/app/03-goi-vip.js` | Module "Gói hàng VIP Lightroom" + thanh báo giá neo đáy |
| `src/js/app/04-thong-tin-khach.js` | Modal "Xác nhận đơn hàng", quy tắc nhập, đồng bộ Zalo ↔ SĐT |
| `src/js/app/05-thanh-toan.js` | Modal thanh toán, mã QR, sao chép, lưu đơn, khởi động |
| `database.rules.json` | Quyền đọc/ghi Realtime Database |
| `scripts/` | Build tĩnh và 3 script kiểm tra |

## Bốn việc cần làm trong Firebase / GitHub

1. **Dán cấu hình.** Firebase Console → Project settings → Your apps → Config,
   chép khối `firebaseConfig` vào `src/js/firebase-init.js`. Đặt tên dự án vào
   `.firebaserc`. Chưa dán thì web vẫn chạy, chỉ không lưu đơn và không lấy
   được thông tin chuyển khoản.

2. **Nạp thông tin chuyển khoản.** Realtime Database → nhập vào nhánh
   `thongtinthanhtoan`:

   ```json
   {
     "nganHang": "<tên ngân hàng>",
     "maNganHang": "<mã BIN 6 số của ngân hàng, dùng để sinh mã QR>",
     "soTaiKhoan": "<số tài khoản>",
     "tenChuTaiKhoan": "<TÊN CHỦ TÀI KHOẢN VIẾT HOA KHÔNG DẤU>"
   }
   ```

   Số tài khoản **không nằm trong kho mã nguồn** — đổi số chỉ cần sửa ở đây,
   không phải deploy lại. Nhớ nạp cả `database.rules.json` lên
   (`firebase deploy --only database`) để nhánh này chỉ đọc được, không ghi được.

3. **Thêm secret cho GitHub Actions.** Repo → Settings → Secrets and variables
   → Actions → thêm `FIREBASE_SERVICE_ACCOUNT` là khoá JSON của tài khoản dịch
   vụ. Thiếu secret này thì workflow deploy và bản xem trước sẽ đỏ.

4. **Trỏ tên miền.** Firebase Hosting → Add custom domain → `thanhdeptrai.vn`,
   rồi thêm bản ghi DNS mà Firebase đưa ra vào trang quản trị tên miền.

## Đơn hàng lưu ở đâu

Nhánh `donhang` của Realtime Database, mỗi đơn một mã. Ghi khi khách bấm
"Tiến hành thanh toán", và gắn `daXacNhan: true` khi khách bấm "Xác nhận đã
thanh toán thành công". Theo `database.rules.json`, trình duyệt chỉ ghi được
chứ không đọc lại được — xem đơn trong Firebase Console.
