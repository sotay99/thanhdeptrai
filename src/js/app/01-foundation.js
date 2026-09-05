(function(){
  'use strict';

  /* ===========================================================================
     PHẦN 01 — NỀN MÓNG
     Hàm bọc (IIFE) MỞ tại đây và ĐÓNG ở cuối phần cuối cùng trong manifest.json.
     Mọi phần đều nằm trong hàm bọc này nên dùng chung state, render, escapeHtml.
     Thêm phần mới vào cuối manifest thì phải chuyển khối boot() cùng dấu "})();"
     xuống cuối phần đó — scripts/validate-bundle-scope.js canh đúng lỗi này.
     =========================================================================== */

  // --------------------------------------------------------------- HẰNG SỐ

  // GIẢM GIÁ LẦN HAI — cứ chọn thêm một sản phẩm là được giảm thêm 10% trên
  // tổng tiền. Bốn sản phẩm KHÔNG tính vào mức giảm này (chọn chúng thì phần
  // trăm giảm đứng yên): hai Bộ Khoá học đang tặng miễn phí (sp4, sp5) và hai
  // gói tài nguyên đã bán dưới giá vốn (sp8, sp9).
  const GIAM_MOI_SAN_PHAM = 10;
  const KHONG_TINH_GIAM_LAN_HAI = ['sp4', 'sp5', 'sp8', 'sp9'];

  // Chín sản phẩm của module "Trọn bộ sản phẩm VIP cho Lightroom, Photoshop và Thiết kế". Mã module
  // vẫn là 'goi-vip' — ĐỪNG đổi, đó là địa chỉ #hash mà khách đã lưu và đã chia
  // sẻ. Tên giữ nguyên văn theo yêu cầu
  // của chủ shop — sửa chữ hoặc sửa giá sẽ làm
  // scripts/validate-shop-contract.js đỏ.
  //
  //   giaGoc  — giá niêm yết, hiện mờ ở đầu dòng giá
  //   giaChot — số tiền khách thật sự trả cho sản phẩm đó
  // Phần trăm giảm KHÔNG khai ở đây mà tính ra từ hai con số trên, nên không
  // bao giờ có chuyện phần trăm nói một đằng giá tính một nẻo.
  const SAN_PHAM = [
    { ma: 'sp1', ten: 'App Lightroom cho điện thoại Android - đã có bản quyền trọn đời', giaGoc: 299000, giaChot: 99000 },
    { ma: 'sp2', ten: 'Bộ Preset 10.000 màu cao cấp cài sẵn cho Lightroom điện thoại', giaGoc: 99000, giaChot: 79000 },
    { ma: 'sp3', ten: 'Bộ Preset 650 màu cao cấp cài sẵn cho Lightroom Máy tính và photoshop máy tính', giaGoc: 359000, giaChot: 125000 },
    { ma: 'sp4', ten: 'Khoá học chỉnh màu Lightroom điện thoại', giaGoc: 199000, giaChot: 0 },
    { ma: 'sp5', ten: 'Khoá học Lightroom máy tính PC', giaGoc: 199000, giaChot: 0 },
    { ma: 'sp6', ten: 'Phần mềm Lightroom classic dành cho máy tính Win - bản quyền trọn đời', giaGoc: 599000, giaChot: 179000 },
    { ma: 'sp7', ten: 'Phần mềm Photoshop dành cho máy tính Win - bản quyền trọn đời', giaGoc: 599000, giaChot: 179000 },
    { ma: 'sp8', ten: 'Kho tài nguyên thiết kế (1000+ ảnh RAW, file Mockup, file PSD,...)', giaGoc: 159000, giaChot: 39000 },
    { ma: 'sp9', ten: '1000+ font chữ Việt Hoá cao cấp cho máy tính', giaGoc: 159000, giaChot: 39000 }
  ];

  // Danh sách module trong menu bên trái.
  //   kieu 'trang'  — mở ra một trang nội dung, đổi địa chỉ #hash
  //   kieu 'modal'  — không đổi trang, chỉ bật một bảng phụ lên
  const MODULE = [
    { ma: 'trang-chu',        ten: 'Trang chủ',                        bieuTuong: '⌂', kieu: 'trang', sanSang: false },
    { ma: 'goi-vip',          ten: 'Trọn bộ sản phẩm VIP cho Lightroom, Photoshop và Thiết kế', bieuTuong: '★', kieu: 'trang', sanSang: true  },
    { ma: 'qua-tang-android', ten: 'Quà tặng cho người dùng điện thoại android', bieuTuong: '🎁', kieu: 'trang', sanSang: false },
    { ma: 'khoa-hoc-mobile',  ten: 'Khoá học chỉnh màu Lightroom điện thoại (miễn phí)', bieuTuong: '▤', kieu: 'trang', sanSang: false },
    { ma: 'khoa-hoc-may-tinh',ten: 'Khoá học Lightroom máy tính PC (miễn phí)', bieuTuong: '▣', kieu: 'trang', sanSang: false },
    { ma: 'khoa-photoshop',   ten: 'Khoá Photoshop bằng điện thoại của bạn (miễn phí)', bieuTuong: '✦', kieu: 'trang', sanSang: false },
    { ma: 'dac-quyen',        ten: 'Đặc quyền dành cho khách hàng đã từng mua hàng của shop', bieuTuong: '👑', kieu: 'modal', sanSang: true  },
    { ma: 'video-ngan',       ten: 'Xem video ngắn',                   bieuTuong: '▶', kieu: 'trang', sanSang: false },
    { ma: 'lien-he',          ten: 'Liên hệ và Thông tin về Shop',     bieuTuong: '☎', kieu: 'modal', sanSang: false },
    { ma: 'cong-nhan',        ten: 'Sự công nhận của khách hàng',      bieuTuong: '★', kieu: 'modal', sanSang: false },
    { ma: 'hoan-tien',        ten: 'Yêu cầu hoàn tiền',                bieuTuong: '↩', kieu: 'modal', sanSang: false },
    { ma: 'dieu-khoan',       ten: 'Điều khoản sử dụng và điều kiện',  bieuTuong: '§', kieu: 'modal', sanSang: false },
    { ma: 'bao-mat',          ten: 'Bảo mật và quyền riêng tư',        bieuTuong: '☗', kieu: 'modal', sanSang: false }
  ];

  const MODULE_MAC_DINH = 'goi-vip';

  // Bản dự phòng khi CHƯA đọc được thông tin chuyển khoản từ Firebase (mất
  // mạng, hoặc chưa dán firebaseConfig). Cố ý KHÔNG chứa số tài khoản thật —
  // số thật chỉ nằm trong Firebase, không nằm trong mã nguồn trên GitHub.
  const THONG_TIN_CK_DU_PHONG = {
    nganHang: 'Đang tải…',
    maNganHang: '',
    soTaiKhoan: 'Đang tải…',
    tenChuTaiKhoan: 'Đang tải…'
  };

  // ------------------------------------------------------------ TRẠNG THÁI

  const state = {
    module: MODULE_MAC_DINH,     // module đang xem
    menuMo: false,               // thanh menu bên trái đang mở hay không
    daChon: [],                  // mảng mã sản phẩm khách đã chọn
    khachHang: { email: '', zalo: '', dienThoai: '' },
    // Ghi nhớ trường nào đang được TỰ ĐỘNG điền theo trường kia. Khách tự gõ
    // vào trường nào thì trường đó thoát khỏi cơ chế đồng bộ.
    tuDongDien: { zalo: false, dienThoai: false },
    thongTinCK: Object.assign({}, THONG_TIN_CK_DU_PHONG),
    daTaiThongTinCK: false,
    // Số Zalo của shop — GIỐNG HỆT số tài khoản, nó KHÔNG nằm trong mã nguồn
    // mà đọc từ Realtime Database lúc chạy. Xem chú thích ở nút "Liên hệ Zalo".
    zaloShop: '',
    maDonHienTai: null,
    // Bật khi VỪA vào module bán hàng, để 7 thẻ sản phẩm trôi lên. Tắt ngay sau
    // khi hiệu ứng được gắn, nên bấm chọn/bỏ chọn sản phẩm (cũng vẽ lại trang)
    // không làm cả lưới nhấp nháy trôi lại từ đầu.
    hieuUngVaoModule: false,
    modal: []                    // chồng modal đang mở, phần tử cuối là modal trên cùng
  };

  // ---------------------------------------------------------- TIỆN ÍCH CHUNG

  // Chặn HTML lọt vào chuỗi hiển thị. MỌI dữ liệu do khách nhập đều phải đi
  // qua hàm này trước khi ghép vào innerHTML.
  function escapeHtml(giaTri){
    return String(giaTri == null ? '' : giaTri)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 299000 -> "299.000 ₫"
  function dinhDangTien(so){
    const n = Number(so) || 0;
    return n.toLocaleString('vi-VN') + ' ₫';
  }

  function timSanPham(ma){
    return SAN_PHAM.find(function(sp){ return sp.ma === ma; }) || null;
  }

  function sanPhamDaChon(){
    return state.daChon.map(timSanPham).filter(Boolean);
  }

  // Phần trăm giảm của RIÊNG một sản phẩm, tính ra từ giá gốc và giá chốt.
  function phanTramGiamSanPham(sp){
    if (!sp || !sp.giaGoc) return 0;
    return Math.round((sp.giaGoc - sp.giaChot) / sp.giaGoc * 100);
  }

  // Tính tiền một chỗ duy nhất — thanh neo đáy, modal đơn hàng và modal thanh
  // toán đều gọi hàm này nên ba nơi không bao giờ lệch số.
  //
  //   tongTien   = cộng GIÁ CHỐT của các sản phẩm đã chọn
  //   phanTramGiam = 10% cho mỗi sản phẩm đã chọn, KHÔNG kể sp4 và sp5
  //   thanhTien  = tongTien trừ đi phần giảm ấy, rồi làm tròn XUỐNG hàng nghìn
  //                cho số tiền đẹp (làm tròn xuống chứ không lên — chênh lệch
  //                luôn nghiêng về phía có lợi cho khách).
  function tinhTien(){
    const chon = sanPhamDaChon();
    const tongTien = chon.reduce(function(tong, sp){ return tong + sp.giaChot; }, 0);
    const soTinhGiam = chon.filter(function(sp){ return KHONG_TINH_GIAM_LAN_HAI.indexOf(sp.ma) === -1; }).length;
    const phanTramGiam = soTinhGiam * GIAM_MOI_SAN_PHAM;
    const tienGiam = Math.round(tongTien * phanTramGiam / 100);
    const thanhTien = Math.floor((tongTien - tienGiam) / 1000) * 1000;
    return {
      soLuong: chon.length,
      tongTien: tongTien,
      phanTramGiam: phanTramGiam,
      tienGiam: tienGiam,
      thanhTien: thanhTien
    };
  }

  function dangChon(ma){
    return state.daChon.indexOf(ma) !== -1;
  }

  function doiChon(ma){
    const viTri = state.daChon.indexOf(ma);
    if (viTri === -1) state.daChon.push(ma);
    else state.daChon.splice(viTri, 1);
  }

  function timModule(ma){
    return MODULE.find(function(m){ return m.ma === ma; }) || null;
  }

  // ------------------------------------------------------- ĐỊNH TUYẾN #hash

  // Chỉ module kiểu 'trang' mới có địa chỉ riêng. Địa chỉ lạ thì về mặc định.
  function docHash(){
    const ma = String(window.location.hash || '').replace(/^#\/?/, '').trim();
    const m = timModule(ma);
    return (m && m.kieu === 'trang') ? m.ma : MODULE_MAC_DINH;
  }

  function datHash(ma){
    if (docHash() === ma) return;
    window.location.hash = '#/' + ma;
  }
