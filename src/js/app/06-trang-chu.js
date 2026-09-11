
  /* ===========================================================================
     PHẦN 06 — MODULE "TRANG CHỦ": trình chỉnh sửa ảnh AI Image Editor Pro
     (mang nguyên khối từ kho thu-nghiem-01, nhánh gon-panel-layer, sang đây).

     Đây là PHẦN CUỐI CÙNG trong manifest — hàm bọc chung của cả app đóng ở
     cuối chính tệp này (boot() + "})();"), không còn ở 05-thanh-toan.js như
     trước. scripts/validate-bundle-scope.js canh đúng việc này; thêm phần
     mới vào sau phần này thì phải chuyển khối boot()/"})();" xuống cuối phần
     mới đó.

     CSS riêng (src/css/trang-chu.css) và mã JS của trình chỉnh sửa
     (src/js/trang-chu-editor.js) đều nạp ĐỘNG — chỉ khi khách mở module
     "Trang chủ" — hệt cách admin.css/firebase-auth-compat.js chỉ nạp ở
     "/admin" (xem napMotLan() ở 04b-admin.js, dùng lại tại đây vì cùng nằm
     trong hàm bọc chung). Khách vào thẳng module mặc định "Trọn bộ sản phẩm
     VIP..." không tải một byte nào của trình chỉnh sửa này.

     Bootstrap KHÔNG được nạp lại dù bản gốc có gọi: khảo sát cho thấy trình
     chỉnh sửa không dùng class Bootstrap thật nào (chỉ trùng tên ngẫu nhiên
     kiểu "main-container", không phải ".container"/".row" của Bootstrap) —
     bỏ hẳn để đỡ một CDN và đỡ nguy cơ Bootstrap đè lên CSS của shop.

     src/css/trang-chu.css nạp CHUNG một trang với CSS của shop (không có gì
     cô lập kiểu iframe) — hai rủi ro lớn nhất của CSS bản gốc, chọn "*" và
     "body" trần, đã được bó lại thành ".trang-chu-editor, .trang-chu-editor
     *" và ".trang-chu-editor" ngay trong tệp CSS nguồn. ĐỪNG thêm rule chọn
     "*"/"body"/"html" trần vào src/css/trang-chu.css — mọi thứ phải nằm
     trong ".trang-chu-editor ...".

     Trình chỉnh sửa dùng biến toàn cục thật (canvas, layers, layerGroups...)
     — không bọc IIFE riêng — vì HTML của nó gọi hàng chục onclick="..." tới
     các hàm đó bằng tên trần (window.tenHam). Việc này KHÔNG đụng tới
     state/render/escapeHtml của shop (khác tên hoàn toàn), nhưng nếu sau
     này thêm mã dùng chung, nhớ tên biến toàn cục của trình chỉnh sửa vẫn
     chiếm chỗ trên window suốt phiên, kể cả sau khi khách rời module.
     =========================================================================== */

  const FONT_AWESOME_CSS_TRANG_CHU = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
  const FABRIC_JS_TRANG_CHU = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
  const CSS_TRANG_CHU = '/assets/css/trang-chu.css';
  const JS_TRANG_CHU_EDITOR = '/assets/js/trang-chu-editor.js';

  // Nội dung HTML của module — mang nguyên từ thu-nghiem-01, chỉ bọc thêm
  // ngoài cùng bởi ".trang-chu-editor" (neo cho CSS đã cô lập ở trên).
  const TRANG_CHU_HTML = `<div class="trang-chu-editor">
    <!-- HEADER -->
    <div class="header">
        <h1>
            <i class="fas fa-wand-magic-sparkles"></i>
            AI Image Editor Pro - Layers
        </h1>
        <div class="header-actions">
            <button class="btn-header sidebar-toggle-btn" onclick="toggleToolsPanel()" title="Công cụ">
                <i class="fas fa-toolbox"></i>
            </button>
            <button class="btn-header sidebar-toggle-btn" onclick="toggleLayersPanel()" title="Lớp">
                <i class="fas fa-layer-group"></i>
            </button>
            <button class="btn-header" onclick="showKeyboardShortcuts()" title="Xem phím tắt (?)">
                <i class="fas fa-keyboard"></i> ⌨️
            </button>
            <button class="btn-header" onclick="showUploadModal()">
                <i class="fas fa-upload"></i> Tải Ảnh
            </button>
            <button class="btn-header" onclick="downloadImage()">
                <i class="fas fa-download"></i> Tải Xuống
            </button>
            <button class="btn-header" onclick="toggleFullscreen()">
                <i class="fas fa-expand"></i>
            </button>
        </div>
    </div>

    <!-- MAIN CONTAINER -->
    <div class="sidebar-backdrop" onclick="closeSidePanels()"></div>

    <div class="main-container">
        <!-- LEFT SIDEBAR -->
        <div class="sidebar-left">
            <!-- BASIC TOOLS -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">
                    <i class="fas fa-toolbox"></i> Công Cụ
                    <button class="sidebar-panel-close" onclick="closeSidePanels()" title="Đóng">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <button class="tool-btn" onclick="addText()">
                    <i class="fas fa-font"></i> Thêm Text
                </button>
                <button class="tool-btn" onclick="addShape()">
                    <i class="fas fa-shapes"></i> Hình Dạng
                </button>
                <button class="tool-btn" onclick="cropImage()">
                    <i class="fas fa-crop"></i> Cắt
                </button>
                <button class="tool-btn" onclick="rotateImage()">
                    <i class="fas fa-rotate-right"></i> Xoay
                </button>
                <button class="tool-btn" onclick="flipImageHorizontal()">
                    <i class="fas fa-arrows-alt-h"></i> Lật
                </button>
            </div>

            <!-- AI FEATURES -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">
                    <i class="fas fa-brain"></i> AI Features
                </div>
                <button class="tool-btn ai-feature" onclick="removeBackground()">
                    <i class="fas fa-eraser"></i> Xoá Nền
                </button>
                <button class="tool-btn ai-feature" onclick="showInpaintModal()">
                    <i class="fas fa-paint-brush"></i> Sửa Vùng
                </button>
                <button class="tool-btn ai-feature" onclick="upscaleImage()">
                    <i class="fas fa-arrow-up"></i> Nâng Cấp
                </button>
            </div>

            <!-- FILTERS -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">
                    <i class="fas fa-filter"></i> Bộ Lọc
                </div>
                <button class="tool-btn" onclick="applyFilter('grayscale')">
                    <i class="fas fa-image"></i> Đen Trắng
                </button>
                <button class="tool-btn" onclick="applyFilter('sepia')">
                    <i class="fas fa-image"></i> Sepia
                </button>
                <button class="tool-btn" onclick="applyFilter('blur')">
                    <i class="fas fa-image"></i> Mờ
                </button>
            </div>

            <!-- HISTORY -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">
                    <i class="fas fa-history"></i> Lịch Sử
                </div>
                <button class="tool-btn" onclick="undo()">
                    <i class="fas fa-undo"></i> Hoàn Tác
                </button>
                <button class="tool-btn" onclick="redo()">
                    <i class="fas fa-redo"></i> Làm Lại
                </button>
            </div>

            <!-- MÀU TÔ + THÔNG TIN ẢNH (chuyển từ khung bên phải xuống cuối
                 khung Công Cụ để khung Lớp bên phải có thêm chỗ) -->
            <div class="sidebar-section">
                <div class="sidebar-section-title">
                    <i class="fas fa-palette"></i> Màu Tô
                </div>
                <div class="property-group">
                    <div class="color-picker-group">
                        <input type="color" id="fillColor" value="#000000" class="color-input">
                    </div>
                </div>

                <div class="divider"></div>

                <button class="tool-btn" onclick="showImageInfo()">
                    <i class="fas fa-info-circle"></i> Thông Tin Ảnh
                </button>
            </div>
        </div>

        <!-- CANVAS AREA -->
        <div class="canvas-container">
            <div class="canvas-toolbar">
                <span style="font-weight: 600; color: var(--current-layer-color);">Zoom:</span>
                <button class="canvas-toolbar-item" onclick="zoomOut()">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="canvas-toolbar-item" style="cursor: default; flex: 1; justify-content: center;">
                    <span id="zoomLevel">100%</span>
                </span>
                <button class="canvas-toolbar-item" onclick="zoomIn()">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="canvas-toolbar-item" onclick="resetZoom()">
                    <i class="fas fa-compress"></i> Phù Hợp
                </button>
            </div>
            <div class="canvas-workspace">
                <div class="canvas-empty">
                    <i class="fas fa-image"></i>
                    <p>Tải một ảnh để bắt đầu</p>
                    <button class="btn-modal-primary" onclick="showUploadModal()">
                        <i class="fas fa-upload"></i> Chọn Ảnh
                    </button>
                </div>
            </div>
            <div class="canvas-layer-border" id="layerBorder"></div>
        </div>

        <!-- RIGHT SIDEBAR -->
        <div class="sidebar-right">
            <!-- ADJUSTMENTS -->
            <div class="adjustments-section">
                <div class="sidebar-section-title">
                    <i class="fas fa-sliders-h"></i> Điều Chỉnh
                    <button class="sidebar-panel-close" onclick="closeSidePanels()" title="Đóng">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="property-group">
                    <label class="property-label">Độ Sáng</label>
                    <div class="slider-container">
                        <input type="range" id="brightness" min="0" max="200" value="100" 
                               onchange="updateBrightness(this.value)">
                        <span class="slider-value" id="brightnessValue">100%</span>
                    </div>
                </div>

                <div class="property-group">
                    <label class="property-label">Độ Tương Phản</label>
                    <div class="slider-container">
                        <input type="range" id="contrast" min="0" max="200" value="100" 
                               onchange="updateContrast(this.value)">
                        <span class="slider-value" id="contrastValue">100%</span>
                    </div>
                </div>

                <div class="property-group">
                    <label class="property-label">Bão Hòa</label>
                    <div class="slider-container">
                        <input type="range" id="saturation" min="0" max="200" value="100" 
                               onchange="updateSaturation(this.value)">
                        <span class="slider-value" id="saturationValue">100%</span>
                    </div>
                </div>

            </div>

            <!-- LAYERS PANEL -->
            <div class="layers-panel">
                <div class="layers-panel-header">
                    <div class="layers-panel-title">
                        <i class="fas fa-layer-group"></i> Layers
                    </div>
                    <button class="layer-btn" style="width: 28px; height: 28px; font-size: 0.9rem;" onclick="toggleBlendOpacityPanel()" title="Blend & Opacity (🎨)">
                        <i class="fas fa-palette"></i>
                    </button>
                </div>
                <div class="layers-list" id="layersList">
                    <!-- Layers will be added here -->
                </div>
                
                <!-- BLEND MODE & OPACITY PANEL -->
                <div class="blend-opacity-panel" id="blendOpacityPanel">
                    <div class="panel-section">
                        <div class="panel-section-title">🎨 Chế độ Hòa Trộn</div>
                        <div class="blend-mode-grid" id="blendModeGrid">
                            <!-- Blend modes will be generated here -->
                        </div>
                    </div>
                    
                    <div class="panel-section">
                        <div class="panel-section-title">👁️ Độ Mờ (Opacity)</div>
                        <div class="opacity-control">
                            <input type="range" class="opacity-slider" id="opacitySlider" 
                                   min="0" max="100" value="100" 
                                   oninput="updateOpacity(this.value)">
                            <div class="opacity-value" id="opacityValue">100%</div>
                        </div>
                    </div>

                    <div class="blend-opacity-buttons">
                        <button onclick="resetBlendOpacity()">
                            <i class="fas fa-redo"></i> Đặt Lại
                        </button>
                        <button onclick="applyBlendOpacity()" class="success">
                            <i class="fas fa-check"></i> Áp Dụng
                        </button>
                    </div>
                </div>
                
                <div style="display: flex; gap: 5px; margin-top: 10px;">
                    <button class="add-layer-btn" style="flex: 1;" onclick="createNewLayer()">
                        <i class="fas fa-plus"></i> Layer Mới
                    </button>
                    <button class="add-layer-btn" style="flex: 1; background: #667eea;" onclick="startMergeLayers()">
                        <i class="fas fa-compress"></i> Gộp
                    </button>
                    <button class="add-layer-btn" style="flex: 1; background: #764ba2;" onclick="startGroupLayers()">
                        <i class="fas fa-object-group"></i> Nhóm
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- IMAGE INFO MODAL -->
    <div class="modal-overlay" id="imageInfoModal">
        <div class="modal-content">
            <button class="modal-close" onclick="hideImageInfo()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">Thông Tin Ảnh</div>
            <div class="info-row">
                <span class="info-label">Kích Thước:</span>
                <span class="info-value" id="modalImageSize">Chưa có ảnh</span>
            </div>
            <div class="info-row">
                <span class="info-label">Định Dạng:</span>
                <span class="info-value" id="modalImageFormat">Chưa có ảnh</span>
            </div>
            <div class="info-row">
                <span class="info-label">Số Layers:</span>
                <span class="info-value" id="layerCount">0</span>
            </div>
            <div class="info-row">
                <span class="info-label">Layer Hiện Tại:</span>
                <span class="info-value" id="currentLayerInfo">Không có</span>
            </div>
        </div>
    </div>

    <!-- UPLOAD MODAL -->
    <div class="modal-overlay" id="uploadModal">
        <div class="modal-content">
            <button class="modal-close" onclick="hideUploadModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">Tải Ảnh Lên</div>
            <div style="border: 2px dashed var(--current-layer-color); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: #f8f9ff;" onclick="document.getElementById('fileInput').click()">
                <input type="file" id="fileInput" style="display: none;" accept="image/*" 
                       onchange="handleImageUpload(event)">
                <i class="fas fa-cloud-upload-alt" style="font-size: 2.5rem; color: var(--current-layer-color); margin-bottom: 10px; display: block;"></i>
                <p style="margin: 0; font-size: 1rem;">Bấm để chọn hoặc kéo thả ảnh tại đây</p>
            </div>
        </div>
    </div>

    <!-- GROUP LAYERS MODAL -->
    <div class="modal-overlay" id="groupModal">
        <div class="modal-content" style="max-width: 450px;">
            <button class="modal-close" onclick="hideGroupModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">Nhóm Lớp</div>
            
            <div class="property-group" id="groupStatusMessage" style="background: #fff3cd; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 15px; display: none;">
                <p style="margin: 0; color: #856404; font-size: 0.9rem;">
                    ⚠️ Vui lòng tích chọn các lớp trước khi nhóm
                </p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <label class="property-label" style="margin: 0;">Chọn Lớp Cần Nhóm</label>
                <button style="background: #764ba2; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" onclick="selectAllLayersForGroup()">
                    ☑️ Tất Cả
                </button>
            </div>

            <div id="groupLayersList" style="border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; max-height: 300px; overflow-y: auto; margin-bottom: 15px; background: #f8f9fa;">
                <!-- Layers checkboxes will be added here -->
            </div>

            <div class="property-group">
                <label class="property-label">Tên Nhóm</label>
                <input type="text" id="groupNameInput" class="property-input" placeholder="Ví dụ: Effects, Text Elements...">
            </div>

            <div style="display: flex; gap: 10px;">
                <button class="btn-modal-primary" style="flex: 1; padding: 10px; background: #764ba2; border-color: #764ba2;" onclick="executeGroupLayers()">
                    <i class="fas fa-check"></i> Bắt Đầu Nhóm
                </button>
                <button class="btn-modal-secondary" style="flex: 1; padding: 10px;" onclick="hideGroupModal()">
                    <i class="fas fa-times"></i> Hủy Nhóm
                </button>
            </div>
        </div>
    </div>

    <!-- MERGE LAYERS MODAL -->
    <div class="modal-overlay" id="mergeModal">
        <div class="modal-content" style="max-width: 450px;">
            <button class="modal-close" onclick="hideMergeModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">Gộp Lớp</div>
            
            <div class="property-group" id="mergeStatusMessage" style="background: #fff3cd; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107; margin-bottom: 15px; display: none;">
                <p style="margin: 0; color: #856404; font-size: 0.9rem;">
                    ⚠️ Vui lòng tích chọn các lớp trước khi gộp
                </p>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <label class="property-label" style="margin: 0;">Chọn Lớp Cần Gộp</label>
                <button style="background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" onclick="selectAllLayersForMerge()">
                    ☑️ Tất Cả
                </button>
            </div>

            <div id="mergeLayersList" style="border: 1px solid #dee2e6; border-radius: 6px; padding: 10px; max-height: 300px; overflow-y: auto; margin-bottom: 15px; background: #f8f9fa;">
                <!-- Layers checkboxes will be added here -->
            </div>

            <div style="display: flex; gap: 10px;">
                <button class="btn-modal-primary" style="flex: 1; padding: 10px; background: #28a745; border-color: #28a745;" onclick="executeMergeLayers()">
                    <i class="fas fa-check"></i> Bắt Đầu Gộp
                </button>
                <button class="btn-modal-secondary" style="flex: 1; padding: 10px;" onclick="hideMergeModal()">
                    <i class="fas fa-times"></i> Hủy Gộp
                </button>
            </div>
        </div>
    </div>

    <!-- MULTI-SELECT CONTEXT MENU -->
    <div class="multi-select-menu" id="multiSelectMenu">
        <div class="multi-select-menu-item" onclick="event.stopPropagation(); showMultiSelected(); closeMultiSelectMenu()">
            <i class="fas fa-eye"></i> Hiển Thị
        </div>
        <div class="multi-select-menu-item" onclick="event.stopPropagation(); hideMultiSelected(); closeMultiSelectMenu()">
            <i class="fas fa-eye-slash"></i> Ẩn
        </div>
        <div class="multi-select-menu-item" onclick="event.stopPropagation(); duplicateMultiSelected(); closeMultiSelectMenu()">
            <i class="fas fa-copy"></i> Nhân Đôi
        </div>
        <div class="multi-select-menu-item" onclick="event.stopPropagation(); groupMultiSelected(); closeMultiSelectMenu()">
            <i class="fas fa-folder-plus"></i> Tạo Nhóm
        </div>
        <div class="multi-select-menu-separator"></div>
        <div class="multi-select-menu-item" onclick="event.stopPropagation(); clearMultiSelection(); closeMultiSelectMenu()">
            <i class="fas fa-times"></i> Bỏ Chọn
        </div>
        <div class="multi-select-menu-item danger" onclick="event.stopPropagation(); deleteMultiSelected(); closeMultiSelectMenu()">
            <i class="fas fa-trash"></i> Xoá
        </div>
    </div>

    <!-- KEYBOARD SHORTCUTS MODAL -->
    <div class="modal-overlay" id="shortcutsModal">
        <div class="modal-content" style="max-width: 550px; max-height: 80vh; overflow-y: auto;">
            <button class="modal-close" onclick="hideKeyboardShortcuts()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">⌨️ Keyboard Shortcuts</div>
            
            <div style="padding: 15px;">
                <h4 style="margin-top: 0; color: #667eea;">Layer Management</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>↑ / ↓</kbd></td>
                        <td style="padding: 8px;">Select layer above/below</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>D</kbd></td>
                        <td style="padding: 8px;">Duplicate layer</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>R</kbd></td>
                        <td style="padding: 8px;">Rename layer</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>H</kbd></td>
                        <td style="padding: 8px;">Toggle visibility (hide/show)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Delete</kbd></td>
                        <td style="padding: 8px;">Delete selected layer</td>
                    </tr>
                </table>

                <h4 style="margin-top: 15px; color: #667eea;">Groups</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>← / →</kbd></td>
                        <td style="padding: 8px;">Collapse/Expand group</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+G</kbd></td>
                        <td style="padding: 8px;">Create group</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+M</kbd></td>
                        <td style="padding: 8px;">Merge layers</td>
                    </tr>
                </table>

                <h4 style="margin-top: 15px; color: #667eea;">Editing</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+N</kbd></td>
                        <td style="padding: 8px;">New layer</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+S</kbd></td>
                        <td style="padding: 8px;">Save/Download image</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+Z</kbd></td>
                        <td style="padding: 8px;">Undo (partial support)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+Y</kbd></td>
                        <td style="padding: 8px;">Redo (partial support)</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+Shift+↑</kbd></td>
                        <td style="padding: 8px;">Move layer up</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Ctrl+Shift+↓</kbd></td>
                        <td style="padding: 8px;">Move layer down</td>
                    </tr>
                </table>

                <h4 style="margin-top: 15px; color: #667eea;">Modals</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Enter</kbd></td>
                        <td style="padding: 8px;">Confirm (in rename modal)</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; font-family: monospace; color: #666;"><kbd>Escape</kbd></td>
                        <td style="padding: 8px;">Close modal</td>
                    </tr>
                </table>

                <div style="background: #f0f7ff; border-left: 4px solid #667eea; padding: 10px; margin-top: 15px; border-radius: 4px; font-size: 0.85rem; color: #333;">
                    <strong>💡 Tips:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        <li>Shortcuts work when no modal is open</li>
                        <li>Don't trigger shortcuts while typing in inputs</li>
                        <li>Ctrl = Windows/Linux, Cmd = Mac</li>
                        <li>Press <kbd>?</kbd> to show this help again</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- RENAME LAYER MODAL -->
    <div class="modal-overlay" id="renameModal">
        <div class="modal-content" style="max-width: 350px;">
            <button class="modal-close" onclick="hideRenameModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">Đổi Tên Lớp</div>
            
            <div class="property-group">
                <label class="property-label">Tên Lớp Mới</label>
                <input type="text" id="renameInput" class="property-input" placeholder="Nhập tên mới...">
            </div>

            <div style="display: flex; gap: 10px;">
                <button class="btn-modal-primary" style="flex: 1; padding: 10px;" onclick="confirmRenameLayer()">
                    <i class="fas fa-check"></i> Xác Nhận
                </button>
                <button class="btn-modal-secondary" style="flex: 1; padding: 10px;" onclick="hideRenameModal()">
                    <i class="fas fa-times"></i> Hủy
                </button>
            </div>
        </div>
    </div>

    <!-- INPAINT MODAL -->
    <div class="modal-overlay" id="inpaintModal">
        <div class="modal-content">
            <button class="modal-close" onclick="hideInpaintModal()">
                <i class="fas fa-times"></i>
            </button>
            <div class="modal-header">Sửa Vùng (AI Inpainting)</div>
            <div class="property-group">
                <label class="property-label">Mô Tả Vùng Cần Sửa</label>
                <textarea id="inpaintPrompt" class="property-input" rows="4" 
                    placeholder="Ví dụ: bầu trời xanh, hoa hồng..."></textarea>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn-modal-primary" style="flex: 1; padding: 10px;" onclick="executeInpaint()">
                    <i class="fas fa-check"></i> Thực Hiện
                </button>
                <button class="btn-modal-secondary" style="flex: 1; padding: 10px;" onclick="hideInpaintModal()">
                    <i class="fas fa-times"></i> Hủy
                </button>
            </div>
        </div>
    </div>

    <!-- LOADING SPINNER -->
    <div class="loading" id="loadingSpinner">
        <div class="spinner"></div>
        <div style="color: var(--current-layer-color); font-weight: 500;" id="loadingText">Đang xử lý...</div>
    </div>

    <!-- TOAST CONTAINER -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- SCRIPTS -->
    
    
</div>`;

  function chuanBiTrangChu(){
    Promise.all([
      napMotLan(FONT_AWESOME_CSS_TRANG_CHU, 'css'),
      napMotLan(CSS_TRANG_CHU, 'css'),
      napMotLan(FABRIC_JS_TRANG_CHU, 'js'),
    ]).then(function(){
      return napMotLan(JS_TRANG_CHU_EDITOR, 'js');
    }).then(function(){
      if (typeof window.initTrangChuEditor === 'function') {
        window.initTrangChuEditor();
      }
    }).catch(function(e){
      console.error('Không nạp được trình chỉnh sửa ảnh:', e);
    });
  }

  function veModuleTrangChu(){
    // render() chèn xong innerHTML của <main> rồi mới trả quyền điều khiển
    // (đồng bộ); chuanBiTrangChu() chạy bất đồng bộ (Promise) nên
    // initTrangChuEditor() luôn được gọi SAU khi HTML này đã thật sự nằm
    // trong DOM — không cần setTimeout/hàng đợi gì thêm.
    chuanBiTrangChu();
    return TRANG_CHU_HTML;
  }

  // ------------------------------------------------------------- KHỞI ĐỘNG

  function boot(){
    state.trang = docDuongDan();
    state.nhanHang.maNhanHang = docMaNhanHangTrenDuongDan();
    state.module = docHash();
    state.hieuUngVaoModule = true;   // lần mở trang đầu tiên cũng có hiệu ứng trôi
    ganSuKien();
    theoDoiNutCuonModal();   // mọi bảng phụ, kể cả bảng viết sau này, tự có 2 nút cuộn
    render();
    doChoThanhDay();
    // Nạp trước thông tin chuyển khoản để lúc khách mở modal thanh toán là có
    // sẵn. Hỏng thì bỏ qua — modal vẫn mở được, chỉ báo chưa lấy được thông tin.
    taiThongTinCK();
    taiThongTinLienHe();
    // Địa chỉ máy chủ cấp phát chỉ cần ở trang nhận hàng — trang bán hàng
    // không hỏi tới nên không phải tải.
    if (state.trang === 'sanpham') moTrangNhanHang();
    // Trang quản trị nạp SDK đăng nhập và CSS riêng của nó — chỉ ở đây, để
    // khách mua hàng không phải tải một byte nào của phần quản trị.
    if (state.trang === 'admin') chuanBiAdmin();
  }

  boot();
})();
