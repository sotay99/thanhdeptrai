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
node scripts/thu-worker.mjs
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

Số tài khoản, tên chủ tài khoản, tên ngân hàng và SỐ ZALO của shop tuyệt đối
không được nằm trong mã nguồn. Chúng ở trong Realtime Database
(`/thongtinthanhtoan` và `/thongtinlienhe`), đọc lúc chạy.
`validate-shop-contract.js` quét cả kho để chặn. Nút "Liên hệ Zalo" vì thế là
`<button>` chứ không phải `<a href>` — địa chỉ dựng lúc bấm.


## Gửi hàng tự động — apps-script/

`apps-script/gui-hang.gs` chạy trên Google Apps Script (miễn phí, không cần
Blaze). Mỗi phút nó lọc đơn `trangThai = 'daXacNhan'` trong Realtime Database,
gửi email kèm đường tải rồi đổi sang `'daGui'`, hoặc `'canXemTay'` khi khách
không để lại email.

Vòng đời một đơn: `moi` → `daXacNhan` → `daGui` | `canXemTay`. Trường
`trangThai` là thứ Apps Script lọc theo (`.indexOn` trong `database.rules.json`),
nên hàng chờ gửi luôn ngắn. Đổi tên các giá trị này thì phải đổi ở CẢ HAI nơi:
`05-thanh-toan.js` và `gui-hang.gs`.

Có HAI tệp: `gui-hang.gs` là bản người viết (tiếng Việt đọc thoải mái), còn
`gui-hang.ascii.gs` do `scripts/build-apps-script.js` sinh ra — mọi chuỗi hiển
thị viết bằng dãy `\uXXXX` nên tệp là ASCII thuần. **Luôn dán bản `.ascii.gs`
vào Google Apps Script**: chép mã qua trình duyệt hay trình soạn thảo có lúc
làm hỏng ký tự có dấu, và lỗi chỉ lộ ra khi khách nhận email đầy chữ
"Ä Ă£ gá»­i". Sửa nội dung thì sửa bản gốc rồi chạy lại script sinh.

Thư gửi đi luôn đi qua `guiThu()` — nó bọc thân thư trong tài liệu HTML có
`<meta charset="utf-8">` và dùng `GmailApp` (khai bảng mã cho cả tiêu đề).

Tệp `.gs` KHÔNG chứa bí mật: khoá cơ sở dữ liệu và các đường tải sản phẩm nằm
trong Script Properties của dự án Apps Script.

Script chỉ biết khách đã bấm nút xác nhận, KHÔNG biết tiền đã về hay chưa —
khâu đối soát vẫn thủ công cho tới khi nối cổng thanh toán vào `doPost()`.

## Trang nhận hàng `/sanpham`

Đây là địa chỉ shop gửi cho khách sau khi tiền về — nó nằm trong email tự động
và trong mẩu tin nhắn Zalo đã gửi đi rồi, nên **KHÔNG được đổi**.

Trang này có đường dẫn thật (không phải `#hash`): `docDuongDan()` trong
`01-foundation.js` đọc `location.pathname`, `state.trang` giữ kết quả, và
Firebase Hosting trả `index.html` cho mọi đường dẫn (rewrite `**` trong
`firebase.json`). `scripts/serve-static.py` bắt chước đúng cách đó khi xem tại
chỗ.

**Khách KHÔNG bao giờ phải gõ mã.** Mỗi khách một đường dẫn riêng:
`/sanpham?ma=<16 ký tự>`. Apps Script sinh mã đó lúc gửi hàng
(`sinhMaNhanHang()`), lưu vào đơn ở trường `maNhanHang`, rồi ghép vào cả email
lẫn mẩu tin Zalo. Đơn đã có mã thì giữ nguyên mã cũ — khách có thể đã cầm đường
dẫn cũ trong tay.

Luật xương sống, hợp đồng mục 15 canh bằng regex:

- Đường dẫn tới file sản phẩm **không nằm trong mã nguồn, và cũng không nằm
  trong email**. Thư gửi khách chỉ mang đường dẫn riêng; máy chủ cấp phát giữ
  đường tải thật. (Thư từng liệt kê thẳng link tải — ai chuyển tiếp lá thư đó đi
  là mất hàng mà shop không biết.)
- Ngay cả **địa chỉ máy chủ cấp phát** cũng không nằm trong mã nguồn — nó đọc
  từ nhánh `/thongtinkho` của Realtime Database lúc chạy, hệt cách giấu số tài
  khoản và số Zalo.
- **Nút tải xuống chỉ được dựng SAU KHI máy chủ trả lời là được phép** (nhánh
  cuối của `veKetQuaNhanHang()`). Dựng sẵn rồi ẩn bằng CSS là hỏng cả cơ chế —
  mở F12 lên là thấy.

Mỗi sản phẩm chỉ tải được trên MỘT thiết bị. Lời cảnh báo đó xuất hiện hai lần
(đầu trang và trong bảng nhận sản phẩm), cố ý — và khách phải tự bấm nút xác
nhận thì máy chủ mới ghi nhớ thiết bị.

Hai khoá học (sp4, sp5) đi nhánh riêng: chúng không có file để tải mà là module
học trên web, nên bảng của chúng chỉ dặn đường và cho một nút
"Vào module ..." (`moModalKhoaHoc()`).

## Còn nợ: nối app Checkout

App đọc biến động số dư (Checkout) **chưa được nối**. Khi làm, phải hướng dẫn
người dùng từng bước một, thật chi tiết. Lưu ý: proxy của môi trường chặn
`help.checkout.vn`, nên tài liệu chính thức không đọc trực tiếp được — phải dựa
vào ảnh chụp màn hình người dùng gửi và nói rõ chỗ nào là suy đoán.

## Trang quản trị `/admin`

Chỉ hai email của chủ shop vào được. **Quyền THẬT nằm ở `database.rules.json`**,
không ở giao diện — `EMAIL_CHU_SHOP` trong `04b-admin.js` chỉ để ẩn nút và hiện
lời từ chối cho lịch sự. Hai nơi phải luôn khớp nhau; hợp đồng mục 16 canh việc
đó, và canh cả `email_verified`.

**Khoá API của AI không bao giờ đi qua trình duyệt khách.** Nhánh `/admin` cấm
đọc công khai. Chatbot sau này hỏi Worker, Worker mới giữ khoá và gọi AI. Hợp
đồng chặn mọi lời gọi thẳng tới `api.anthropic.com`, `api.openai.com`,
`generativelanguage.googleapis.com` trong mã web.

Ô khoá API hiện dạng che khi trang vừa mở, và bấm Lưu lúc còn che thì bị chặn —
nếu không, một cú bấm nhầm ghi đè khoá thật bằng chuỗi dấu chấm.

### `database.rules.json` KHÔNG được có khoá `"//"`

Firebase hiểu `//` là dấu mở **chú thích**, nên một khoá JSON tên `"//"` làm
hỏng cả bộ luật — Console từ chối với `Expected '{'`. Lỗi này đã xảy ra thật khi
dán bộ luật vào Console. Chú thích của từng nhánh để ở đây, đừng để trong tệp:

| Nhánh | Ai đọc | Ai ghi |
|---|---|---|
| `thongtinthanhtoan` | công khai (web khách dựng mã QR) | chỉ chủ shop |
| `thongtinlienhe` | công khai (nút Zalo, link mạng xã hội) | chỉ chủ shop |
| `thongtinkho` | công khai (trang `/sanpham` hỏi máy chủ cấp phát) | chỉ chủ shop |
| `danhmuc` | công khai (tên hiển thị của sản phẩm và file) | chỉ chủ shop |
| `admin` | **CHỈ chủ shop** — khoá API của AI nằm đây | chỉ chủ shop |
| `donhang` | chỉ chủ shop | ai cũng TẠO được, không ai đọc được đơn người khác |

Hợp đồng mục 16 canh cả sáu dòng này, và chặn hẳn khoá `"//"` mọc lại.

### Danh mục sản phẩm — hai nguồn hàng KHÔNG ngang nhau

Module "Danh mục sản phẩm" trong `/admin` cho chủ shop khai mỗi sản phẩm lấy
hàng từ đâu. Hai nguồn khác hẳn nhau về mức bảo vệ, và giao diện phải nói thẳng
điều đó ngay tại chỗ chọn:

| Nguồn | Khoá thiết bị | Thu hồi được | Dùng khi |
|---|---|---|---|
| `r2` — kho riêng Cloudflare | có | có | mặc định |
| `drive` — link Google Drive công khai | **không** | **không** | món quá nặng, chấp nhận đánh đổi |

Dữ liệu ở nhánh `/danhmuc`, mỗi sản phẩm một mục:

```
danhmuc/sp2 = { nguon: 'r2', file: [ { tep: 'sp2/00-tron-bo.zip', ten: 'Trọn bộ preset' }, … ] }
danhmuc/sp8 = { nguon: 'drive', link: 'https://drive.google.com/…' }
```

`tep` là tên thật trong kho (máy đọc), `ten` là tên khách nhìn thấy (người đọc).
Tệp tên bắt đầu bằng `00-` được coi là gói trọn bộ: nó tự lên đầu danh sách và
mang nhãn riêng. Hai khoá học (sp4, sp5) **không có** trong danh mục —
`sanPhamCoHang()` loại chúng ra, vì chúng học trên web chứ không có tệp nào.

Ở trang `/sanpham`, mỗi dòng tệp mang **chỉ số**, không mang tên tệp — tên thật
nằm lại trong bộ nhớ trang, không in ra HTML.

### Apps Script không còn giữ đường tải

Script Property `LINK_TAI` đã bị bỏ. Trước đây nó chứa bảng "mã sản phẩm →
đường tải" và thư gửi khách in thẳng những đường đó ra: ai chuyển tiếp lá thư đi
là mất hàng mà shop không biết. Nay script chỉ đọc `/danhmuc` để **kiểm tra**
xem chủ shop đã khai đủ chưa. Hợp đồng chặn `LINK_TAI` và `bangDuongTai` mọc lại.

### CSS và SDK nạp động

`src/css/admin.css` và `firebase-auth-compat.js` chỉ được nạp khi có người mở
`/admin`. Khách mua hàng không tải một byte nào của phần quản trị, và
`index.html` vẫn mỏng.

`admin.css` đi qua cơ chế vân tay hệt như ảnh: mã JS viết đường dẫn trần
`/assets/css/admin.css`, `build-static.js` thay bằng tên có vân tay trước khi
băm bản nối. `validate-static.js` kiểm cả ba điều: tệp trong `public/` khớp
nguồn, bản nối không còn đường dẫn trần, và có mã nào đó thật sự nạp nó.

### Thử trang quản trị tại chỗ

Proxy của môi trường chặn `www.gstatic.com` nên Firebase SDK thật không tải
được khi chạy thử. Bộ thử dựng một bản Firebase giả bằng `addInitScript` và
chặn mọi yêu cầu tới gstatic bằng `page.route`, nhờ vậy thử được trọn luồng:
email lạ bị từ chối, hai email chủ shop vào được, ô cài đặt ghi ra đúng nhánh.

## Máy chủ cấp phát — `worker/kho-worker.js`

Cloudflare Worker gác cổng kho R2. Đây là **thứ duy nhất biết đường tới tệp
thật**: web của khách không biết, mã nguồn trên GitHub không biết, email gửi
khách cũng không biết.

Hai đường: `POST /cap-phat` kiểm tra rồi cấp một đường dẫn dùng một lần;
`GET /tai?t=…` mở chữ ký rồi rót tệp từ binding R2. Tách làm hai vì khâu kiểm
tra cần gọi Firebase (chậm), còn khâu rót tệp thì chỉ việc mở chữ ký — quan
trọng với tệp 2,8 GB tải đứt giữa chừng.

Token là **chữ ký HMAC tự mang đủ thông tin** (tệp nào, hết hạn lúc nào, cho
thiết bị nào), không lưu ở đâu cả nên không có gì để dọn. Sống 15 phút.

**Bốn cửa trong `/cap-phat`** — thiếu một cửa là thủng kho:

1. Mã nhận hàng có ứng với một đơn thật không (`sai-ma`)
2. Sản phẩm có nằm trong đơn của họ không (`khong-co-trong-don`) — chặn khách
   mua một món rồi dùng đường dẫn của mình đi lấy món khác
3. Tệp có đúng là tệp của sản phẩm đó theo `/danhmuc` không — chặn khách tự gõ
   tên tệp
4. Thiết bị: khoá theo **từng sản phẩm**, ghi ở `/thietbi/<mã>/<sp>`

Hợp đồng mục 18 kiểm cả **thứ tự**: bốn cửa phải chạy trước `taoToken`. Đảo thứ
tự là cấp trước rồi mới hỏi.

`scripts/thu-worker.mjs` **chạy thật** Worker trong Node với Firebase và R2 giả
lập — 25 mục. Nó nằm trong predeploy của `firebase.json`, nên không deploy được
khi kho hàng đang thủng.

### Mã thiết bị

Trang `/sanpham` sinh một mã ngẫu nhiên và cất trong `localStorage`. Khách xoá
dữ liệu duyệt web, đổi trình duyệt hay mở ẩn danh thì mã đổi và họ bị coi là
máy khác — **đó là chuyện sẽ xảy ra thường xuyên**, nên luồng cấp quyền lại cho
chủ shop không phải tính năng phụ. Xoá `/thietbi/<mã>/<sp>` là mở khoá lại.

### Món khách chưa mua

Trang `/sanpham` hỏi máy chủ (`POST /don`) xem đơn gồm những món nào, rồi biến
nút "Sử dụng sản phẩm này" của những món chưa mua thành một **khung chữ không
bấm được**. Cố ý không dùng `disabled`: một cái nút xám vẫn là nút, khách cứ bấm
rồi ngồi đoán vì sao không có gì xảy ra.

`state.donCuaToi` có ba trạng thái, đừng gộp hai cái đầu:

| Giá trị | Nghĩa | Trang làm gì |
|---|---|---|
| `null` | **chưa biết** (chưa hỏi xong, mất mạng, đường dẫn không có mã) | không làm mờ nút nào |
| `[]` | biết chắc chưa mua gì | mờ hết trừ hai khoá học |
| `['sp3']` | mua sp3 | mờ mọi món khác |

Hai khoá học (sp4, sp5) **luôn** bấm được, kể cả khách không mua — chúng miễn phí.

Đây chỉ là lớp giao diện. Người mở console sửa `state.donCuaToi` vẫn không tải
được gì: cửa thật là cửa thứ hai trong `/cap-phat` của Worker.

`POST /don` chỉ trả về **danh sách mã sản phẩm**, không email, không số tiền,
không mã đơn — khách không được phép đọc nhánh `donhang` vì đọc được là thấy
thông tin của mọi khách khác.
