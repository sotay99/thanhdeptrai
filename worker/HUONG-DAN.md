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

## Bước 5 — Khai năm biến và một binding

Vào Worker vừa tạo → **Settings**.

**Variables and Secrets** — thêm năm mục. Bốn mục đầu chọn kiểu **Secret** (che
đi), mục `GOC_CHO_PHEP` để **Text**:

| Tên | Kiểu | Giá trị |
|---|---|---|
| `FIREBASE_DB_URL` | Text | `https://thanhdeptraishop-default-rtdb.asia-southeast1.firebasedatabase.app` |
| `FIREBASE_SECRET` | Secret | khoá lấy ở Bước 1 |
| `KY_TOKEN` | Secret | chuỗi nghĩ ra ở Bước 2 |
| `GOC_CHO_PHEP` | Text | xem bên dưới |
| `DRIVE_API_KEY` | Secret | API key lấy ở mục "Đọc tên/mô tả video" bên dưới |

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

## Bước 6 — Lấy địa chỉ Worker và thử

**Đừng ghép địa chỉ bằng tay.** Phần `<tên-tài-khoản>` là tên miền phụ Cloudflare
tự cấp cho tài khoản — không phải email, không phải tên đăng nhập, mà là một
chữ Cloudflare sinh ra. Chép nguyên địa chỉ nó hiện sẵn:

**Workers & Pages** → bấm vào Worker `kho-thanhdeptrai`. Ngay trang đầu có địa
chỉ đầy đủ, thường kèm nút **Visit** hoặc biểu tượng chép.

Không thấy địa chỉ nào thì vào **Settings → Domains & Routes**, tìm mục
`workers.dev` và bấm **Enable**.

Dán địa chỉ vào trình duyệt. Thấy dòng chữ **"Máy chủ cấp phát đang chạy."**
là xong. Giữ địa chỉ đó lại, Bước 7 cần.

## Bước 7 — Khai địa chỉ Worker vào Firebase

Việc cuối. Trang `/sanpham` phải biết hỏi ai.

Vào Realtime Database, thêm nhánh `thongtinkho` với một trường tên **`mayChu`**
và giá trị là địa chỉ Worker chép được ở Bước 6.

> **Chữ C viết hoa: `mayChu`, không phải `maychu`.** Firebase phân biệt hoa
> thường, mã của web đi tìm đúng chữ `mayChu`. Gõ sai một chữ là web không thấy
> gì và vẫn báo "Hệ thống nhận hàng đang được hoàn thiện" — ngồi dò mãi không ra
> vì nhìn qua thì mọi thứ đều có vẻ đúng.

Cấu trúc phải thành ra thế này (địa chỉ thay bằng của anh, **không có dấu `/`
ở cuối**):

```json
{
  "thongtinkho": {
    "mayChu": "https://kho-thanhdeptrai.CHEP-DIA-CHI-THAT-VAO-DAY"
  }
}
```

Xong bước này là trang nhận hàng chạy thật.

---

## Kiểm lại

Vào `/admin` → **Tổng quan**. Dòng **Máy chủ kho (Worker)** phải chuyển sang
**"Đã khai"** màu xanh.

## Đọc tên/mô tả video — lấy DRIVE_API_KEY

Nút "Xem trước link" ở /admin → Danh mục sản phẩm cần đọc tên và mô tả video
từ Google Drive. Từng thử tự tải trang xem của Drive rồi bóc chữ ra đọc,
nhưng Google chặn máy chủ tự động làm việc đó — nay đổi sang gọi đúng cổng
chính thức của Google (Drive API), cần một API key.

1. https://console.cloud.google.com → **chọn đúng dự án `thanhdeptraishop`**
   ở góc trên (dự án này CHÍNH LÀ dự án Firebase, không phải dự án khác —
   Google Cloud và Firebase dùng chung một danh sách dự án).
2. Ô tìm kiếm trên cùng, gõ **"Google Drive API"** → bấm vào kết quả đầu tiên
   → bấm **Enable** (nếu đã bật sẵn thì bỏ qua bước này).
3. Menu bên trái: **APIs & Services → Credentials**.
4. **+ Create Credentials → API key**. Một chuỗi ký tự hiện ra — chép nó lại.
5. Bấm vào API key vừa tạo để đặt giới hạn cho nó (không bắt buộc nhưng nên
   làm — khoá này chỉ được lộ trong biến môi trường của Worker, không lộ ra
   web, song siết thêm vẫn hơn):
   - Mục **API restrictions** → chọn **Restrict key** → tích đúng
     **Google Drive API** → **Save**.
   - Mục **Application restrictions**: để nguyên **None**. Kiểu giới hạn
     "HTTP referrers" chỉ áp dụng cho lời gọi ĐI RA từ trình duyệt (kiểm tra
     trang nào gọi tới) — Worker gọi từ máy chủ Cloudflare, không có "trang
     web nào" để khai kiểu đó, khai vào là khoá luôn bị từ chối.
6. Dán chuỗi API key vào biến `DRIVE_API_KEY` ở Bước 5 (Worker → Settings →
   Variables and Secrets → kiểu **Secret**) → **Deploy** lại.

**Video phải bật chia sẻ "Bất kỳ ai có đường liên kết"** thì Drive API mới
đọc được tên/mô tả (đúng điều kiện đã ghi ở ô nhập link tại /admin) — tệp
riêng tư thì API trả về "không tìm thấy tệp", đúng như dự tính, không phải
lỗi cần sửa.

## Khi mã Worker được sửa (như đợt thêm "Xem trước link" ở /admin)

Mỗi lần tệp `worker/kho-worker.js` trong kho đổi, phải dán lại tay — nhánh
`main` trên GitHub deploy web tự động, nhưng KHÔNG đụng gì tới Worker cả.

1. Cloudflare → **Workers & Pages** → Worker `kho-thanhdeptrai` → **Edit code**
2. Xoá sạch nội dung cũ, dán nguyên nội dung MỚI của `worker/kho-worker.js`
3. **Deploy**

Không cần đụng lại bốn biến và binding ở Bước 5 — chúng vẫn giữ nguyên qua
mỗi lần dán mã mới.

## Khi khách đổi máy

Khách xoá dữ liệu duyệt web hoặc đổi điện thoại là hệ thống coi họ như máy mới
và chặn. Mở khoá lại: vào Realtime Database, tìm `thietbi/<mã nhận hàng của
khách>/<mã sản phẩm>` rồi **xoá nhánh đó đi**. Lần tải sau họ mở khoá lại được
trên máy mới.

Chuyện này xảy ra thường xuyên hơn anh nghĩ, nên module Đơn hàng trong `/admin`
sẽ có nút làm việc đó cho gọn.
