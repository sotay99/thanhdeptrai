  /* ===========================================================================
     PHẦN 04M — MỤC "THỐNG KÊ TRUY CẬP" TRONG TRANG QUẢN TRỊ

     Đếm xem MỘT NGÀY có bao nhiêu THIẾT BỊ đã vào web, tên/gợi ý từng thiết
     bị, và mỗi thiết bị đã vào bao nhiêu lần NGÀY ĐÓ — kèm thêm tổng số lần
     truy cập của thiết bị đó MỌI THỜI ĐIỂM (không tính riêng theo ngày).

     GHI ở phía khách là PUSH THÔ (xem ghiNhanTruyCap, PHẦN 08) — mỗi lượt
     tải trang là một dòng mới {thietBi, ngay, td, luc}, khách chỉ cần quyền
     GHI, không cần quyền ĐỌC công khai nhánh thongKeTruyCap. Việc GỘP theo
     ngày/theo thiết bị làm ở ĐÂY, lúc admin tải danh sách lên để xem — đọc
     hết MỘT LẦN (không cần giữ realtime) rồi gộp bằng JavaScript thường,
     giống hệt cách làm của "Thống kê đặt mua App VIP" (PHẦN 04J).
     =========================================================================== */

  function taiThongKeTruyCap(){
    const tk = state.admin.thongKeTruyCap;
    if (tk.daTai || tk.dangTai) return;
    if (!firebaseSanSang || !rtdb) return;
    tk.dangTai = true;
    render();
    rtdb.ref('thongKeTruyCap/luot').once('value').then(function(anh){
      const du = (anh && anh.val()) || {};
      tk.luot = Object.keys(du).map(function(k){ return du[k] || {}; });
      tk.daTai = true;
      tk.dangTai = false;
      if (state.trang === 'admin' && state.admin.module === 'thong-ke-truy-cap') render();
    }).catch(function(e){
      console.error('Không đọc được thống kê truy cập:', e);
      tk.dangTai = false;
      tk.daTai = true;
      if (state.trang === 'admin' && state.admin.module === 'thong-ke-truy-cap') render();
    });
  }

  function adminThongKeTruyCapTaiLai(){
    const ngayDangXem = state.admin.thongKeTruyCap.ngayChon;
    state.admin.thongKeTruyCap = { daTai: false, dangTai: false, luot: [], ngayChon: ngayDangXem };
    taiThongKeTruyCap();
  }

  function adminThongKeTruyCapDoiNgay(ngay){
    if (!ngay) return;
    state.admin.thongKeTruyCap.ngayChon = ngay;
    render();
  }

  // Một thiết bị có thể xuất hiện ở NHIỀU ngày — tongSoLan cộng dồn khắp mọi
  // dòng (không lọc theo ngayChon), soLanNgayChon chỉ đếm riêng ngày đang xem.
  function gopThongKeTruyCap(luot, ngayChon){
    const tongTheoThietBi = {};
    const homNayTheoThietBi = {};
    const trinhDuyetTheoThietBi = {};
    luot.forEach(function(dong){
      const tb = String((dong && dong.thietBi) || '').trim();
      if (!tb) return;
      tongTheoThietBi[tb] = (tongTheoThietBi[tb] || 0) + 1;
      if (dong.td) trinhDuyetTheoThietBi[tb] = dong.td;
      if (dong.ngay === ngayChon) {
        homNayTheoThietBi[tb] = (homNayTheoThietBi[tb] || 0) + 1;
      }
    });
    const ds = Object.keys(homNayTheoThietBi).map(function(tb){
      return {
        thietBi: tb,
        soLanNgayChon: homNayTheoThietBi[tb],
        tongSoLan: tongTheoThietBi[tb] || 0,
        trinhDuyet: trinhDuyetTheoThietBi[tb] || ''
      };
    });
    // Thiết bị vào nhiều lần nhất trong ngày đang xem lên đầu.
    ds.sort(function(a, b){ return b.soLanNgayChon - a.soLanNgayChon; });
    return ds;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminThongKeTruyCap(){
    const tk = state.admin.thongKeTruyCap;
    return '' +
      '<header class="admin-dau">' +
        '<h2>Thống kê truy cập</h2>' +
        '<p>Mỗi lượt tải trang (toàn bộ web, không riêng /admin) ghi một dòng kèm mã thiết bị — mã ngẫu nhiên lưu ' +
          'trong trình duyệt của khách (dùng chung với "Thống kê đặt mua App VIP"), không phải thông tin cá nhân, ' +
          'kèm gợi ý hệ điều hành/trình duyệt để dễ nhận ra hơn. Chọn một ngày để xem thiết bị nào đã vào NGÀY ĐÓ ' +
          'và vào mấy lần; cột "tổng số lần" cộng dồn MỌI THỜI ĐIỂM, không tính riêng theo ngày.</p>' +
        '<div class="hang-luu-kh">' +
          '<input type="date" class="admin-nhap" style="max-width:170px" data-tk-truy-cap-ngay="1"' +
            ' value="' + escapeHtml(tk.ngayChon) + '">' +
          '<button type="button" class="nut nut-vien nut-nho" data-hanh-dong="tk-truy-cap-tai-lai"' +
            (tk.dangTai ? ' disabled' : '') + '>' + (tk.dangTai ? 'Đang tải…' : 'Tải lại') + '</button>' +
        '</div>' +
      '</header>' +
      veNoiDungThongKeTruyCap(tk)
    ;
  }

  function veNoiDungThongKeTruyCap(tk){
    if (tk.dangTai || !tk.daTai) return '<p class="loi-nhan-hang">Đang tải thống kê…</p>';
    const ds = gopThongKeTruyCap(tk.luot, tk.ngayChon);
    if (!ds.length) {
      return '<p class="loi-nhan-hang">Ngày ' + escapeHtml(tk.ngayChon) + ' chưa có thiết bị nào truy cập.</p>';
    }
    return '' +
      '<p class="admin-ghi-chu">Ngày ' + escapeHtml(tk.ngayChon) + ' có <strong>' + ds.length +
        '</strong> thiết bị truy cập.</p>' +
      '<div class="admin-bang-trang-thai">' +
        ds.map(function(h){
          return '' +
            '<div class="admin-dong-trang-thai">' +
              '<span class="ten">' + escapeHtml(h.thietBi.slice(0, 10)) + '…' +
                (h.trinhDuyet ? ' · ' + escapeHtml(h.trinhDuyet) : '') + '</span>' +
              '<span class="tri">' + h.soLanNgayChon + ' lần ngày này · ' + h.tongSoLan +
                ' lần tổng (mọi thời điểm)</span>' +
            '</div>';
        }).join('') +
      '</div>';
  }
