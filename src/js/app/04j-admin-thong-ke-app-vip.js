  /* ===========================================================================
     PHẦN 04J — MỤC "THỐNG KÊ ĐẶT MUA APP VIP" TRONG TRANG QUẢN TRỊ

     Đếm xem có bao nhiêu THIẾT BỊ đã từng bấm "Tiếp tục đặt mua hàng" ở modal
     thông báo của module "Mua App VIP Pro giá rẻ" (PHẦN 03E), và mỗi thiết bị
     đã từng đặt những app nào.

     GHI ở phía khách là PUSH THÔ, không gộp (xem ghiThongKeDatMuaAppVip ở
     PHẦN 03E) — mỗi lượt bấm là một dòng mới {thietBi, dsApp, taoLuc}, không
     cần cấp quyền ĐỌC công khai cho ai, khách chỉ cần quyền GHI. Việc GỘP
     "một thiết bị một dòng, app trùng thì không thêm nữa" làm ở ĐÂY, lúc
     admin tải danh sách lên để xem — đọc hết một lần (không cần giữ realtime)
     rồi gộp bằng JavaScript thường.
     =========================================================================== */

  function taiThongKeAppVip(){
    const tk = state.admin.thongKeAppVip;
    if (tk.daTai || tk.dangTai) return;
    if (!firebaseSanSang || !rtdb) return;
    tk.dangTai = true;
    render();
    rtdb.ref('thongKeDatMuaApp').once('value').then(function(anh){
      const du = (anh && anh.val()) || {};
      tk.hang = gopThongKeAppVip(du);
      tk.daTai = true;
      tk.dangTai = false;
      if (state.trang === 'admin' && state.admin.module === 'thong-ke-app-vip') render();
    }).catch(function(e){
      console.error('Không đọc được thống kê đặt mua App VIP:', e);
      tk.dangTai = false;
      tk.daTai = true;
      if (state.trang === 'admin' && state.admin.module === 'thong-ke-app-vip') render();
    });
  }

  // Gộp mọi dòng push-thô thành MỘT dòng mỗi thiết bị — dsApp hợp lại không
  // trùng (giữ đúng thứ tự lần đầu xuất hiện), lanDau/lanCuoi tính từ taoLuc.
  function gopThongKeAppVip(du){
    const theoThietBi = {};
    const thuTu = [];
    Object.keys(du).forEach(function(key){
      const dong = du[key] || {};
      const thietBi = String(dong.thietBi || '').trim();
      if (!thietBi) return;
      const dsApp = Array.isArray(dong.dsApp) ? dong.dsApp
        : (dong.dsApp ? Object.keys(dong.dsApp).map(function(k){ return dong.dsApp[k]; }) : []);
      const taoLuc = Number(dong.taoLuc) || 0;
      if (!theoThietBi[thietBi]) {
        theoThietBi[thietBi] = { thietBi: thietBi, dsApp: [], lanDau: taoLuc, lanCuoi: taoLuc };
        thuTu.push(thietBi);
      }
      const d = theoThietBi[thietBi];
      dsApp.forEach(function(ma){ if (d.dsApp.indexOf(ma) === -1) d.dsApp.push(ma); });
      if (taoLuc && (!d.lanDau || taoLuc < d.lanDau)) d.lanDau = taoLuc;
      if (taoLuc > d.lanCuoi) d.lanCuoi = taoLuc;
    });
    // Thiết bị vừa đặt mua gần đây nhất lên đầu — chủ shop quan tâm khách mới nhất trước.
    return thuTu.map(function(tb){ return theoThietBi[tb]; })
      .sort(function(a, b){ return b.lanCuoi - a.lanCuoi; });
  }

  function tenAppVip(ma){
    const a = APP_VIP_PRO.filter(function(x){ return x.ma === ma; })[0];
    return a ? a.ten : ma;
  }

  // ------------------------------------------------------------------ VẼ

  function veAdminThongKeAppVip(){
    const tk = state.admin.thongKeAppVip;
    return '' +
      '<header class="admin-dau">' +
        '<h2>Thống kê đặt mua App VIP</h2>' +
        '<p>Mỗi dòng là một thiết bị đã bấm "Tiếp tục đặt mua hàng" ở module "Mua App VIP Pro giá rẻ" — gộp lại ' +
          'tất cả app đã từng đặt, không đếm trùng. Mã thiết bị là mã ngẫu nhiên lưu trong trình duyệt của khách, ' +
          'không phải thông tin cá nhân.</p>' +
        '<button type="button" class="nut nut-vien nut-nho" data-hanh-dong="tk-app-vip-tai-lai"' +
          (tk.dangTai ? ' disabled' : '') + '>' + (tk.dangTai ? 'Đang tải…' : 'Tải lại') + '</button>' +
      '</header>' +
      veNoiDungThongKeAppVip(tk)
    ;
  }

  function veNoiDungThongKeAppVip(tk){
    if (tk.dangTai || !tk.daTai) return '<p class="loi-nhan-hang">Đang tải thống kê…</p>';
    if (!tk.hang.length) return '<p class="loi-nhan-hang">Chưa có thiết bị nào bấm "Tiếp tục đặt mua hàng".</p>';
    return '' +
      '<div class="admin-bang-trang-thai">' +
        tk.hang.map(function(h){
          return '' +
            '<div class="admin-dong-trang-thai">' +
              '<span class="ten">' + escapeHtml(h.thietBi.slice(0, 10)) + '…</span>' +
              '<span class="tri">' + h.dsApp.map(tenAppVip).map(escapeHtml).join(', ') + '</span>' +
            '</div>';
        }).join('') +
      '</div>';
  }

  function adminThongKeAppVipTaiLai(){
    state.admin.thongKeAppVip = { daTai: false, dangTai: false, hang: [] };
    taiThongKeAppVip();
  }
