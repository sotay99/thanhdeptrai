# Dựng máy chủ cấp phát trên Cloudflare

Làm một lần, sau đó không phải đụng tới nữa.

Toàn bộ làm được trên máy tính bảng, ngay trong trình duyệt.

---

## Bước 1 — Lấy Database secret của Firebase

Worker cần đọc đơn hàng và ghi nhớ thiết bị. Nó dùng một khoá riêng, không đi
qua rules.

1. https://console.firebase.google.com → dự án **thanhdeptraishop**
2. Bánh răng ⚙ cạnh **Project Overview** → **Project settings**
3. Tab **Service accounts** → mục **Database secrets**
4. Nếu chưa có secret nào, bấm **Add secret**. Bấm **Show** rồi chép nó ra.

> Firebase gọi đây là tính năng cũ và có thể hiện lời nhắc dùng cách mới. Với
> quy mô của shop thì cách này vừa đủ và đơn giản hơn hẳn. Khoá này mở được
> TOÀN BỘ cơ sở dữ liệu, nên chỉ dán vào Worker, không dán đi đâu khác.

## Bước 2 — Tự nghĩ một chuỗi ký tự để ký token

Chuỗi này Worker dùng để đóng dấu lên đường dẫn tải. Ai biết nó thì tự làm ra
được đường dẫn tải hợp lệ, nên **không cho ai biết, kể cả tôi**.

Gõ đại khoảng 40–60 ký tự lẫn lộn chữ và số. Ví dụ kiểu:
`k7Qm2xR9pLv4Nz8TbW3sHy6JdF1gAe5UoCiX0rMkQ2`

Đừng dùng đúng ví dụ trên — nghĩ chuỗi của riêng anh.

## Bước 3 — Tạo Worker

1. Cloudflare → **Compute → Workers & Pages** → **Create** → **Start with Hello World**
2. Tên: `kho-thanhdeptrai`
3. **Deploy** (cứ deploy bản mẫu, mình thay mã ở bước sau)
4. Xong, bấm **Edit code** hoặc **Continue to project → Edit code**

## Bước 4 — Dán mã

Trong trình soạn mã, **xoá sạch** nội dung `worker.js` rồi dán toàn bộ nội dung
tệp `worker/kho-worker.js` vào. Bấm **Deploy**.

## Bước 5 — Khai bốn biến và một binding

Vào Worker vừa tạo → **Settings**.

**Variables and Secrets** — thêm bốn mục. Ba mục đầu chọn kiểu **Secret** (che
đi), mục cuối để **Text**:

| Tên | Kiểu | Giá trị |
|---|---|---|
| `FIREBASE_DB_URL` | Text | `https://thanhdeptraishop-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `FIREBASE_SECRET` | Secret | khoá lấy ở Bước 1 |
| `KY_TOKEN` | Secret | chuỗi nghĩ ra ở Bước 2 |
| `GOC_CHO_PHEP` | Text | xem bên dưới |

`GOC_CHO_PHEP` là danh sách địa chỉ web được phép gọi vào, ngăn nhau bằng dấu
phẩy. Khai cả trang thật lẫn bản xem trước:

```
https://thanhdeptrai.vn,https://thanhdeptraishop--claude-lightroom-ecommerce-website-m-6pbjhlfk.web.app
```

Không có `https://` ở đầu, hoặc thừa dấu `/` ở cuối, là Worker từ chối — chép
nguyên dòng trên cho chắc.

**Bindings** → **Add** → **R2 bucket**:

| Variable name | Bucket |
|---|---|
| `KHO` | `thanhdeptrai-sanpham` |

Tên biến phải đúng chữ `KHO` viết hoa.

Khai xong nhớ **Deploy** lại một lần nữa — biến mới chỉ có hiệu lực sau khi
deploy.

## Bước 6 — Thử

Mở địa chỉ Worker trong trình duyệt (dạng
`https://kho-thanhdeptrai.<tên-tài-khoản>.workers.dev`).

Thấy dòng chữ **"Máy chủ cấp phát đang chạy."** là xong.

## Bước 7 — Khai địa chỉ Worker vào Firebase

Việc cuối. Trang `/sanpham` phải biết hỏi ai.

Vào Realtime Database, thêm nhánh `thongtinkho` với một trường `mayChu` bằng
đúng địa chỉ Worker của anh (thay `<tên-tài-khoản>` bằng phần Cloudflare cấp,
và không có dấu `/` ở cuối):

```json
{
  "thongtinkho": {
    "mayChu": "https://kho-thanhdeptrai.<tên-tài-khoản>.workers.dev"
  }
}
```

Xong bước này là trang nhận hàng chạy thật.

---

## Kiểm lại

Vào `/admin` → **Tổng quan**. Dòng **Máy chủ kho (Worker)** phải chuyển sang
**"Đã khai"** màu xanh.

## Khi khách đổi máy

Khách xoá dữ liệu duyệt web hoặc đổi điện thoại là hệ thống coi họ như máy mới
và chặn. Mở khoá lại: vào Realtime Database, tìm `thietbi/<mã nhận hàng của
khách>/<mã sản phẩm>` rồi **xoá nhánh đó đi**. Lần tải sau họ mở khoá lại được
trên máy mới.

Chuyện này xảy ra thường xuyên hơn anh nghĩ, nên module Đơn hàng trong `/admin`
sẽ có nút làm việc đó cho gọn.
