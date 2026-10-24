  /* ===========================================================================
     PHẦN 04K — MỤC "YÊU CẦU TƯ VẤN" TRONG TRANG QUẢN TRỊ

     Đọc nhánh yeuCauTuVan (xem PHẦN 03K) một lần lúc mở mục, hiện ĐẦY ĐỦ
     thông tin liên lạc + sản phẩm của TỪNG yêu cầu — khác mục "Thống kê đặt
     mua App VIP" (PHẦN 04J), nơi cố ý chỉ gộp theo mã thiết bị ẩn danh, không
     bao giờ lộ thông tin liên lạc thật. Ở đây khách TỰ NGUYỆN để lại thông tin
     liên lạc để được tư vấn, nên admin cần xem đầy đủ mới liên hệ lại được.
     =========================================================================== */

  function taiYeuCauTuVan(){
    const tv = state.admin.yeuCauTuVan;
    if (tv.daTai || tv.dangTai) return;
    if (!firebaseSanSang || !rtdb) return;
    tv.dangTai = true;
    render();
    rtdb.ref('yeuCauTuVan').once('value').then(function(anh){
      const du = (anh && anh.val()) || {};
      tv.ds = Object.keys(du).map(function(ma){
        const d = du[ma] || {};
        const dsSanPham = Array.isArray(d.dsSanPham) ? d.dsSanPham
          : (d.dsSanPham ? Object.keys(d.dsSanPham).map(function(k){ return d.dsSanPham[k]; }) : []);
        return {
          ma: ma,
          email: d.email || '', zalo: d.zalo || '', dienThoai: d.dienThoai || '',
          whatsapp: d.whatsapp || '', telegram: d.telegram || '',
          dsSanPham: dsSanPham, taoLuc: Number(d.taoLuc) || 0
        };
      }).sort(function(a, b){ return b.taoLuc - a.taoLuc; });
      tv.daTai = true;
      tv.dangTai = false;
      if (state.trang === 'admin' && state.admin.module === 'yeu-cau-tu-van') render();
    }).catch(function(e){
      console.error('Không đọc được yêu cầu tư vấn:', e);
      tv.dangTai = false;
      tv.daTai = true;
      if (state.trang === 'admin' && state.admin.module === 'yeu-cau-tu-van') render();
    });
  }

  function tenSanPhamTuVan(ma){
    const sp = timSanPham(ma);
    return sp ? sp.ten : ma;
  }

  function veAdminYeuCauTuVan(){
    const tv = state.admin.yeuCauTuVan;
    return '' +
      '<header class="admin-dau">' +
        '<h2>Yêu cầu tư vấn</h2>' +
        '<p>Mỗi dòng là một lượt khách bấm "Tôi cần được Tư vấn thêm" và để lại thông tin liên lạc, kèm sản phẩm ' +
          'họ cần được tư vấn.</p>' +
        '<button type="button" class="nut nut-vien nut-nho" data-hanh-dong="tv-tai-lai"' +
          (tv.dangTai ? ' disabled' : '') + '>' + (tv.dangTai ? 'Đang tải…' : 'Tải lại') + '</button>' +
      '</header>' +
      veNoiDungYeuCauTuVan(tv)
    ;
  }

  function veNoiDungYeuCauTuVan(tv){
    if (tv.dangTai || !tv.daTai) return '<p class="loi-nhan-hang">Đang tải danh sách…</p>';
    if (!tv.ds.length) return '<p class="loi-nhan-hang">Chưa có yêu cầu tư vấn nào.</p>';
    return '' +
      '<div class="admin-bang-trang-thai">' +
        tv.ds.map(function(y){
          const lienLac = ['email', 'zalo', 'dienThoai', 'whatsapp', 'telegram']
            .filter(function(t){ return y[t]; })
            .map(function(t){ return escapeHtml(t) + ': ' + escapeHtml(y[t]); })
            .join(' · ');
          return '' +
            '<div class="admin-dong-trang-thai">' +
              '<span class="ten">' + (y.taoLuc ? new Date(y.taoLuc).toLocaleString('vi-VN') : '') + '</span>' +
              '<span class="tri">' + (lienLac || '(không có thông tin liên lạc)') + ' — ' +
                y.dsSanPham.map(tenSanPhamTuVan).map(escapeHtml).join(', ') +
              '</span>' +
            '</div>';
        }).join('') +
      '</div>';
  }

  function adminTuVanTaiLai(){
    state.admin.yeuCauTuVan = { daTai: false, dangTai: false, ds: [] };
    taiYeuCauTuVan();
  }
