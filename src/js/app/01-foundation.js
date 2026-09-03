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

  // Phần trăm giảm giá — khai đúng MỘT chỗ duy nhất trong toàn bộ mã nguồn.
  // Muốn đổi mức khuyến mãi thì sửa con số này, mọi nơi khác tự tính theo.
  const PHAN_TRAM_GIAM = 50;

  // Bảy sản phẩm của Gói hàng VIP Lightroom. Tên giữ nguyên văn theo yêu cầu
  // của chủ shop — sửa chữ ở đây sẽ làm scripts/validate-shop-contract.js đỏ.
  const SAN_PHAM = [
    { ma: 'sp1', ten: 'App Lightroom cho điện thoại Android - đã có bản quyền trọn đời', gia: 299000 },
    { ma: 'sp2', ten: 'Bộ Preset 10.000 màu cao cấp cài sẵn cho Lightroom điện thoại', gia: 99000 },
    { ma: 'sp3', ten: 'Bộ Preset 650 màu cao cấp cài sẵn cho Lightroom Máy tính và photoshop máy tính', gia: 359000 },
    { ma: 'sp4', ten: 'Bộ Khóa học dành cho Lightroom điện thoại', gia: 199000 },
    { ma: 'sp5', ten: 'Bộ Khóa học dành cho Lightroom máy tính', gia: 199000 },
    { ma: 'sp6', ten: 'Phần mềm Lightroom classic dành cho máy tính Win - bản quyền trọn đời', gia: 599000 },
    { ma: 'sp7', ten: 'Phần mềm Photoshop dành cho máy tính Win - bản quyền trọn đời', gia: 599000 }
  ];

  // Danh sách module trong menu bên trái.
  //   kieu 'trang'  — mở ra một trang nội dung, đổi địa chỉ #hash
  //   kieu 'modal'  — không đổi trang, chỉ bật một bảng phụ lên
  const MODULE = [
    { ma: 'trang-chu',        ten: 'Trang chủ',                        bieuTuong: '⌂', kieu: 'trang', sanSang: false },
    { ma: 'goi-vip',          ten: 'Gói hàng VIP Lightroom',           bieuTuong: '★', kieu: 'trang', sanSang: true  },
    { ma: 'khoa-hoc-mobile',  ten: 'Khoá học lightroom mobile',        bieuTuong: '▤', kieu: 'trang', sanSang: false },
    { ma: 'khoa-hoc-may-tinh',ten: 'Khóa học lightroom máy tính',      bieuTuong: '▣', kieu: 'trang', sanSang: false },
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
    maDonHienTai: null,
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

  // Tính tiền một chỗ duy nhất — thanh neo đáy, modal đơn hàng và modal thanh
  // toán đều gọi hàm này nên ba nơi không bao giờ lệch số.
  function tinhTien(){
    const chon = sanPhamDaChon();
    const tongTien = chon.reduce(function(tong, sp){ return tong + sp.gia; }, 0);
    const tienGiam = Math.round(tongTien * PHAN_TRAM_GIAM / 100);
    return {
      soLuong: chon.length,
      tongTien: tongTien,
      phanTramGiam: PHAN_TRAM_GIAM,
      tienGiam: tienGiam,
      thanhTien: tongTien - tienGiam
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
