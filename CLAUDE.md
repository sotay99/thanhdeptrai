# Quy ước làm việc — Shop Thànhđẹptrai.vn

## Kiến trúc — đọc trước khi sửa

Toàn bộ mã ứng dụng nằm trong MỘT hàm bọc (IIFE): mở ở `01-foundation.js`,
đóng ở cuối phần CUỐI CÙNG trong `src/js/app/manifest.json`. Khi thêm phần
mới vào cuối manifest, phải chuyển khối khởi động `boot()` cùng dấu `})();`
xuống cuối phần đó. Bỏ qua bước này thì phần mới không truy cập được
`state`, `render`, `escapeHtml` và sẽ ném ReferenceError khi chạy.
`scripts/validate-bundle-scope.js` canh lỗi này.

Thư mục `public/` do build sinh ra, không được theo dõi trong git.

Ảnh sản phẩm nằm ở `src/anh/<mã sản phẩm>.jpg`. Mã JS gọi chúng bằng đường dẫn
TRẦN `/assets/anh/sp1.jpg`; `build-static.js` thay bằng tên có vân tay TRƯỚC khi
băm bản nối, nên đổi ảnh là vân tay của `app.js` cũng đổi theo. Gọi một ảnh
không có trong `src/anh/` sẽ làm build đỏ ngay, không để lọt ra trang thật.

## Giữ index.html mỏng

Mỗi lần thêm/sửa/xoá tính năng, hạn chế tối đa việc làm `index.html` phình ra.
Dồn thay đổi vào `src/css/`, `src/js/` và các tệp liên quan. Tệp gốc chỉ nên đổi
khi thật sự cần (vân tay tài nguyên do build sinh, thẻ meta, thẻ script/link).

## Thông tin ngân hàng KHÔNG bao giờ vào mã nguồn

Ngân hàng, số tài khoản và tên chủ tài khoản chỉ nằm ở nhánh
`/thongtinthanhtoan` của Realtime Database, web đọc lúc chạy.
`scripts/validate-shop-contract.js` quét cả kho và báo đỏ nếu chuỗi số tài
khoản, tên chủ tài khoản hay tên ngân hàng lọt vào bất kỳ tệp nào.

Nói thật với người dùng khi được hỏi: đây là web tĩnh nên người mở tab Network
của trình duyệt VẪN xem được thông tin sau khi nó tải về. Cách này chặn người
soi mã nguồn trên GitHub, không phải một lớp mã hoá.

## Tên tiếng Việt là bất di bất dịch

Tên sản phẩm, tên nút, tên modal, tên module, tên trường nhập giữ NGUYÊN VĂN
theo bản kế hoạch của chủ shop. Sửa câu chữ sẽ làm hợp đồng regex đỏ; khi đó
cập nhật lại mẫu trong chính tệp kiểm tra, đừng xoá mục đi cho xanh.

Mức giảm giá mặc định 50% khai đúng một chỗ: hằng `PHAN_TRAM_GIAM` ở
`01-foundation.js`. Không viết chết con số 50 ở nơi nào khác.

## Trước khi đẩy code

Chạy đủ và phải xanh hết:

```sh
node scripts/build-static.js
node scripts/validate-bundle-scope.js
node scripts/validate-static.js
node scripts/validate-shop-contract.js
```

`validate-shop-contract.js` là "hợp đồng bằng regex" — nó chỉ kiểm tra một
đoạn mã CÓ MẶT, không kiểm tra nó chạy đúng.

Xem tại chỗ: `python3 scripts/serve-static.py --directory public 3111`.

## Quy trình làm việc — QUAN TRỌNG

### Không bao giờ hỏi về gộp nhánh và deploy

Mặc định là **CHƯA ĐƯỢC PHÉP** gộp lên `main` và deploy. Không hỏi
"có gộp không?", không đề nghị, không nhắc. Người dùng sẽ chủ động nói khi
nào muốn gộp. Chỉ gộp khi họ nói ra bằng lời, trong đúng phiên đó.

Kết thúc một tính năng thì dừng ở nhánh phụ và đưa link xem trước. Không
kèm câu hỏi về việc gộp.

### Bản xem trước

Mỗi nhánh không phải `main` khi được đẩy lên sẽ tự sinh một Firebase Hosting
channel riêng (`.github/workflows/preview.yml`). Địa chỉ sinh ra từ tên nhánh
nên GIỮ NGUYÊN qua mọi lần đẩy của cùng nhánh đó; mỗi lần đẩy làm mới nội dung
và gia hạn thêm 7 ngày.

Mỗi nhánh chỉ chứa thay đổi của chính nó. Muốn xem nhiều tính năng cùng lúc
trên một trang thì phải tạo một nhánh gộp chứa cả chúng.

### Khi được cho phép gộp

Đẩy lên `main` là deploy thẳng ra trang thật cho khách hàng. Sau khi gộp,
theo dõi GitHub Actions tới khi có kết quả cuối và báo lại kết quả thật.

Nếu phát hiện lỗi sau khi deploy: `git revert` commit gộp rồi đẩy lên `main`,
Actions sẽ tự deploy lại bản cũ. Không dùng nút rollback trong Firebase Console
— nó chỉ đổi trang thật mà không đổi kho.

### Các điểm khác

- Không tạo Pull Request trừ khi được yêu cầu.
- Không tự kiểm chứng được trang thật: proxy của môi trường chặn
  `thanhdeptrai.vn`, `*.web.app` và cả `img.vietqr.io`. Việc bấm thử phải nhờ
  người dùng.

## Ngôn ngữ

Người dùng trao đổi bằng tiếng Việt; trả lời bằng tiếng Việt. Chú thích mã
nguồn và thông báo giao diện đều bằng tiếng Việt — giữ nguyên quy ước đó.
