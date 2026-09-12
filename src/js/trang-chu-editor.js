
        // ===== GLOBAL STATE =====
        let canvas = null;
        let layers = [];
        let layerGroups = []; // Array of group objects
        let activeLayerIndex = 0;
        let activeGroupIndex = -1; // -1 means no group selected
        let selectedLayerIndices = new Set(); // For multi-select within group
        let multiSelectedIndices = new Set(); // NEW: For Ctrl+Click multi-select
        let currentZoom = 1;
        let currentGroupRenameId = null; // For group rename modal
        const API_BASE_URL = 'http://localhost:8000/api';

        // Layer color palette
        const LAYER_COLORS = [
            '#000000', // Black
            '#FF6B6B', // Red
            '#4ECDC4', // Teal
            '#FFD93D', // Yellow
            '#6BCB77', // Green
            '#4D96FF', // Blue
            '#9D84B7', // Purple
            '#FF9F43'  // Orange
        ];

        // ===== KHỞI TẠO =====
        // Module này được gắn/gỡ khỏi trang nhiều lần trong CÙNG một phiên (mỗi
        // lần khách chuyển sang module khác rồi quay lại "Trang chủ", render()
        // của shop xoá sạch #root — kể cả thẻ <canvas> — rồi chèn HTML module
        // mới tinh). Vì vậy KHÔNG dùng DOMContentLoaded (chỉ chạy một lần khi
        // tệp này được nạp) mà tách thành initTrangChuEditor() — shop gọi hàm
        // này mỗi lần mở module. Biến trạng thái (layers, layerGroups...) ở
        // trên vẫn giữ nguyên qua các lần gọi (chỉ được gán MỘT lần lúc tệp
        // nạp), nên việc khách đang làm dở không mất khi họ ghé module khác
        // rồi quay lại — chỉ cần dựng lại canvas mới rồi vẽ lại đúng state cũ.
        let __trangChuResizeBound = false;

        function initTrangChuEditor() {
            const workspace = document.querySelector('.trang-chu-editor .canvas-workspace');
            if (!workspace) return; // HTML của module chưa có trong trang

            const canvasElement = document.createElement('canvas');
            canvasElement.id = 'canvas';
            canvasElement.width = 800;
            canvasElement.height = 600;
            workspace.innerHTML = '';
            workspace.appendChild(canvasElement);

            canvas = new fabric.Canvas('canvas', {
                backgroundColor: '#ffffff',
                fireRightClick: true,
                stopContextMenu: true,
            });

            // Fabric tự vẽ một khung chọn RIÊNG (viền mờ + 8 chấm bo góc) mỗi
            // khi một object được click — khung này chồng lên #layerBorder
            // (khung màu tự vẽ ở updateLayerBorder(), có đủ nút xoá/nhân
            // đôi/xoay/điểm kéo cạnh riêng). Người dùng kéo object thì khung
            // mờ của Fabric mới là khung thật sự bám theo con trỏ, còn khung
            // màu chỉ đứng yên tới lần updateLayerBorder() kế tiếp — nhìn như
            // hai khung lồng nhau. Tắt hẳn viền + tay cầm gốc của Fabric ở
            // đây (mặc định cho MỌI object mới tạo): việc kéo-di-chuyển object
            // không phụ thuộc hasControls/hasBorders — vẫn kéo được bình
            // thường — chỉ mất đi khung/tay cầm hiển thị thừa. #layerBorder
            // vẫn tự vẽ lại theo object khi object di chuyển (đã có sẵn qua
            // canvas.on('object:moving', updateLayerBorder) ở bindCanvasEvents()).
            fabric.Object.prototype.hasControls = false;
            fabric.Object.prototype.hasBorders = false;

            setupDragAndDrop();
            bindCanvasEvents();
            fitCanvasToWorkspace();
            if (!__trangChuResizeBound) {
                window.addEventListener('resize', fitCanvasToWorkspace);
                __trangChuResizeBound = true;
            }

            if (layers.length === 0) {
                // Lần đầu mở module trong phiên này.
                createBackgroundLayer();
                showToast('Sẵn sàng! Tải ảnh để bắt đầu', 'success');
            } else {
                // Quay lại module — canvas cũ vừa bị shop xoá, dựng canvas mới
                // rồi vẽ lại đúng state cũ, không mất việc khách đang làm dở.
                updateLayersUI();
                renderAllLayers();
                updateCurrentLayerColor();
                showToast('Đã quay lại — tiếp tục chỉnh sửa', 'success');
            }
        }

        // Shop gọi hàm này (qua window) sau khi HTML module đã nằm trong
        // trang và tệp này đã nạp xong — xem 06-trang-chu.js.
        window.initTrangChuEditor = initTrangChuEditor;

        // Lỗi cũ: canvas luôn có kích thước PIXEL NỘI BỘ cố định 800x600 —
        // fabric.js bọc nó (cùng canvas phụ upper-canvas) trong 1 <div
        // class="canvas-container"> với width/height CSS đặt cứng 800px/
        // 600px (không phải max-width:100%), nên trên màn hình hẹp hơn
        // 800px, khối đó luôn tràn ra khỏi khung — đẩy cả trang cuộn
        // ngang. Không thể sửa bằng CSS thường (max-width không thắng nổi
        // width cố định của các canvas con bên trong); phải tự co khối đó
        // lại bằng transform: scale(), rồi bù lại layout box bằng margin
        // âm để phần thu nhỏ không để lại khoảng trống thừa.
        function fitCanvasToWorkspace() {
            if (!canvas || !canvas.wrapperEl) return;
            const workspace = document.querySelector('.canvas-workspace');
            if (!workspace) return;

            const padding = 20;
            const availableWidth = Math.max(50, workspace.clientWidth - padding);
            const availableHeight = Math.max(50, workspace.clientHeight - padding);
            const nativeWidth = canvas.getWidth();
            const nativeHeight = canvas.getHeight();
            const scale = Math.min(1, availableWidth / nativeWidth, availableHeight / nativeHeight);

            canvas.wrapperEl.style.transform = `scale(${scale})`;
            canvas.wrapperEl.style.transformOrigin = 'top left';
            // transform không thay đổi kích thước box bố cục thật (vẫn
            // chiếm 800x600), nên dùng margin âm kéo phần hụt do thu nhỏ
            // lại để .canvas-workspace không phải cuộn/tràn theo kích
            // thước GỐC chưa thu nhỏ.
            canvas.wrapperEl.style.marginRight = (nativeWidth * (scale - 1)) + 'px';
            canvas.wrapperEl.style.marginBottom = (nativeHeight * (scale - 1)) + 'px';

            updateLayerBorder();
        }

        // ===== LAYER MANAGEMENT =====
        function createBackgroundLayer() {
            const layer = {
                id: Date.now(),
                name: 'Background',
                color: LAYER_COLORS[0],
                visible: true,
                objects: [],
                opacity: 1
            };
            layers.push(layer);
            activeLayerIndex = 0;
            updateLayersUI();
            updateCurrentLayerColor();
        }

        function createNewLayer(fromInpaint = false) {
            const layerNumber = layers.length;
            const colorIndex = layerNumber % LAYER_COLORS.length;
            
            const layer = {
                id: Date.now(),
                name: `Lớp ${layerNumber}`,
                color: LAYER_COLORS[colorIndex],
                visible: true,
                objects: [],
                opacity: 1,
                blendMode: 'normal',  // NEW: Blend mode
                fromInpaint: fromInpaint
            };
            layers.push(layer);
            activeLayerIndex = layers.length - 1;
            updateLayersUI();
            updateCurrentLayerColor();
            showToast(`Tạo layer mới: ${layer.name}`, 'success');
        }

        function selectLayer(index, ctrlKey = false, shiftKey = false) {
            if (index >= 0 && index < layers.length) {
                const layer = layers[index];
                
                // Handle range select (Shift+Click)
                if (shiftKey && multiSelectedIndices.size > 0) {
                    const selectedArray = Array.from(multiSelectedIndices).sort((a, b) => a - b);
                    const minIndex = Math.min(...selectedArray, index);
                    const maxIndex = Math.max(...selectedArray, index);
                    
                    // Clear and select range
                    multiSelectedIndices.clear();
                    for (let i = minIndex; i <= maxIndex; i++) {
                        multiSelectedIndices.add(i);
                    }
                    
                    activeLayerIndex = index;
                    updateLayersUI();
                    updateCurrentLayerColor();
                    updateLayerBorder();
                    showToast(`✓ Đã chọn từ lớp ${minIndex} đến ${maxIndex} (${multiSelectedIndices.size} lớp)`, 'info');
                    return;
                }

                // Handle multi-select (Ctrl+Click)
                if (ctrlKey) {
                    if (multiSelectedIndices.has(index)) {
                        // Deselect
                        multiSelectedIndices.delete(index);
                        showToast(`⊘ Bỏ chọn: ${layer.name}`, 'info');
                    } else {
                        // Add to selection
                        multiSelectedIndices.add(index);
                        showToast(`✓ Thêm chọn: ${layer.name}`, 'info');
                    }

                    // Keep track of primary selection
                    activeLayerIndex = index;
                    updateLayersUI();
                    updateCurrentLayerColor();
                    updateLayerBorder();
                    return;
                }

                // Normal single selection (no Ctrl, no Shift)
                multiSelectedIndices.clear(); // Clear multi-select
                activeLayerIndex = index;

                // If selecting a group, mark it as active group
                if (layer.isGroup) {
                    const group = layerGroups.find(g => g.id === layer.groupId);
                    if (group) {
                        activeGroupIndex = layerGroups.indexOf(group);
                        selectedLayerIndices.clear(); // Clear multi-select
                        updateLayersUI();
                        updateCurrentLayerColor();
                        updateLayerBorder();
                        showToast(`📁 Chọn Nhóm: ${layer.name}`, 'success');
                    }
                } else {
                    // Regular layer selection
                    activeGroupIndex = -1; // No group selected
                    selectedLayerIndices.clear(); // Clear multi-select
                    updateLayersUI();
                    updateCurrentLayerColor();
                    updateLayerBorder();
                    showToast(`Chọn: ${layer.name}`, 'success');
                }
            }
        }

        function deleteLayer(index) {
            if (layers.length <= 1) {
                showToast('Không thể xoá layer cuối cùng!', 'error');
                return;
            }
            const layer = layers[index];
            // Xoá 1 nhóm (kể cả nhóm lồng bên trong nó) phải dọn luôn khỏi
            // layerGroups, không thì nhóm "hồn ma" vẫn hiện trong "Di Chuyển
            // Sang Nhóm..." — xem removeGroupAndDescendantsFromRegistry().
            const confirmMsg = layer.isGroup ? `Xoá cả nhóm "${layer.name}" và mọi lớp bên trong?` : `Xoá layer "${layer.name}"?`;
            if (confirm(confirmMsg)) {
                if (layer.isGroup) {
                    removeGroupAndDescendantsFromRegistry(layer.groupId);
                }
                layers.splice(index, 1);
                if (activeLayerIndex >= layers.length) {
                    activeLayerIndex = layers.length - 1;
                }
                updateLayersUI();
                updateCurrentLayerColor();
                renderAllLayers();
                showToast('Đã xoá layer', 'success');
            }
        }

        // Lỗi cũ: "objects: [...original.objects]" chỉ chép lại THAM CHIẾU
        // tới đúng những object fabric đang có trên canvas — layer mới và
        // layer cũ vì vậy cùng trỏ tới MỘT ảnh vật lý; kéo/xoay/co giãn bên
        // này thì bên kia cũng đổi theo (không phải 2 layer độc lập), và
        // renderAllLayers() sẽ add cùng 1 object 2 lần lên canvas. Phải NHÂN
        // BẢN THẬT từng object (obj.clone(), callback-based trong Fabric vì
        // ảnh cần tải lại) rồi mới gán cho layer mới.
        function duplicateLayer(index) {
            const original = layers[index];
            if (!original.objects || original.objects.length === 0) {
                showToast('Layer trống, không có gì để nhân bản!', 'error');
                return;
            }

            const layerId = Date.now();
            const cloneOne = (obj) => new Promise((resolve) => obj.clone((cloned) => resolve(cloned)));

            Promise.all(original.objects.map(cloneOne)).then((clonedObjects) => {
                // Màu chủ đạo của layer mới: khác màu layer GỐC là bắt buộc;
                // ưu tiên thêm một màu CHƯA ai dùng trong toàn bộ layer hiện
                // có, nếu hết màu trống (đã tạo nhiều hơn LAYER_COLORS.length
                // layer) thì đành chấp nhận trùng với MỘT layer nào đó khác,
                // nhưng tuyệt đối không được trùng màu layer gốc.
                const mauDaDung = new Set(layers.filter(l => !l.isGroup).map(l => l.color));
                const mauMoi = LAYER_COLORS.find(c => c !== original.color && !mauDaDung.has(c))
                    || LAYER_COLORS.find(c => c !== original.color)
                    || original.color;

                const duplicate = {
                    ...original,
                    id: layerId,
                    name: `${original.name} (Bản Sao)`,
                    color: mauMoi,
                    objects: clonedObjects,
                };
                layers.splice(index + 1, 0, duplicate);

                // Layer mới lập tức được chọn để thao tác — layer cũ (và
                // khung viền/thẻ của nó) không còn active nữa.
                activeLayerIndex = index + 1;
                activeGroupIndex = -1;
                multiSelectedIndices.clear();

                // HIỆU ỨNG "ra đời": bản sao hiện ra ở NGAY GIỮA canvas trước
                // (giữ nguyên kích cỡ/góc xoay/độ giãn nở — chỉ dịch chuyển vị
                // trí, không đổi gì khác), đứng yên ở đó 0,25s cho người dùng
                // kịp thấy, rồi tự bay về ĐÚNG vị trí của layer gốc — khớp
                // khít 100% lên trên layer gốc (vì vốn dĩ nó là bản sao y hệt
                // layer gốc, chỉ tạm dịch chuyển đi rồi dịch chuyển về).
                // Chỉ dịch left/top (không đụng angle/scale) nên không cần lo
                // vấn đề "left/top là điểm neo chứ không phải tâm" như ở nút
                // xoay — dịch chuyển thuần tuý (translate) đúng với MỌI góc
                // xoay, không cần quy đổi qua getCenterPoint().
                const diemDich = clonedObjects.map((obj) => ({ obj, left: obj.left, top: obj.top }));
                const tamGoc = tinhTamNhomObject(clonedObjects);
                const tamCanvas = { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 };
                const dx = tamCanvas.x - tamGoc.x;
                const dy = tamCanvas.y - tamGoc.y;
                clonedObjects.forEach((obj) => {
                    obj.left += dx;
                    obj.top += dy;
                    obj.setCoords();
                });

                // Đưa object mới lên canvas SAU KHI mô hình dữ liệu (layers,
                // activeLayerIndex...) đã nhất quán — 'object:added' tự bắn
                // updateLayerBorder(), tránh chạy giữa lúc dữ liệu còn dở.
                clonedObjects.forEach((obj) => canvas.add(obj));

                updateLayersUI();
                updateCurrentLayerColor();
                updateLayerBorder();
                showToast(`Nhân đôi: ${duplicate.name}`, 'success');

                setTimeout(() => {
                    baySangViTri(diemDich, 300);
                }, 250);
            });
        }

        // Tâm hình học (hộp bao thẳng trục) của một nhóm object bất kỳ —
        // dùng khi chỉ cần 1 điểm tâm để DỊCH CHUYỂN (translate) cả nhóm,
        // không cần quan tâm góc xoay riêng của từng object (khác với
        // tinhKhungXoayLayer(), vốn đòi các object phải CÙNG 1 góc mới vẽ
        // được khung xoay khít).
        function tinhTamNhomObject(danhSachObject) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            danhSachObject.forEach((obj) => {
                const b = obj.getBoundingRect(false, true);
                minX = Math.min(minX, b.left);
                minY = Math.min(minY, b.top);
                maxX = Math.max(maxX, b.left + b.width);
                maxY = Math.max(maxY, b.top + b.height);
            });
            return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }

        // Hoạt ảnh "bay về đúng vị trí" dùng cho hiệu ứng nhân đôi layer ở
        // trên — tween tuyến tính left/top của từng object về đúng toạ độ
        // đích ghi sẵn trong `diemDich` ({obj, left, top}[]), có làm mượt
        // (ease-out) cho tự nhiên, vẽ lại canvas + khung viền mỗi khung hình.
        function baySangViTri(diemDich, thoiGianMs) {
            const batDau = performance.now();
            const trangThaiBatDau = diemDich.map(({ obj, left, top }) => ({
                obj, tuLeft: obj.left, tuTop: obj.top, denLeft: left, denTop: top,
            }));

            function easeOutCubic(t) {
                return 1 - Math.pow(1 - t, 3);
            }

            function buoc(now) {
                const t = Math.min(1, (now - batDau) / thoiGianMs);
                const e = easeOutCubic(t);
                trangThaiBatDau.forEach(({ obj, tuLeft, tuTop, denLeft, denTop }) => {
                    obj.left = tuLeft + (denLeft - tuLeft) * e;
                    obj.top = tuTop + (denTop - tuTop) * e;
                    obj.setCoords();
                });
                canvas.renderAll();
                updateLayerBorder();
                if (t < 1) {
                    requestAnimationFrame(buoc);
                }
            }
            requestAnimationFrame(buoc);
        }

        function renameLayer(index, newName) {
            if (newName.trim()) {
                layers[index].name = newName;
                updateLayersUI();
                updateCurrentLayerColor();
            }
        }

        // ===== MERGE LAYERS FUNCTIONALITY =====
        let layersToMerge = new Set();
        let currentRenameIndex = -1;

        function startMergeLayers() {
            layersToMerge.clear();
            document.getElementById('mergeStatusMessage').style.display = 'block';
            document.getElementById('mergeLayersList').innerHTML = '';
            
            layers.forEach((layer, index) => {
                const item = document.createElement('div');
                item.className = 'merge-layer-item';
                item.innerHTML = `
                    <input type="checkbox" id="merge-${index}" value="${index}" 
                           onchange="toggleMergeLayer(${index})">
                    <div class="merge-layer-indicator" style="background: ${layer.color};"></div>
                    <label for="merge-${index}" class="merge-layer-name">${layer.name}</label>
                `;
                document.getElementById('mergeLayersList').appendChild(item);
            });
            
            document.getElementById('mergeModal').classList.add('active');
        }

        function hideMergeModal() {
            document.getElementById('mergeModal').classList.remove('active');
            layersToMerge.clear();
        }

        function toggleMergeLayer(index) {
            const checkbox = document.getElementById(`merge-${index}`);
            if (checkbox.checked) {
                layersToMerge.add(index);
                document.getElementById('mergeStatusMessage').style.display = 'none';
            } else {
                layersToMerge.delete(index);
                if (layersToMerge.size === 0) {
                    document.getElementById('mergeStatusMessage').style.display = 'block';
                }
            }
        }

        function selectAllLayersForMerge() {
            const checkboxes = document.querySelectorAll('#mergeLayersList input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = !allChecked;
                if (!allChecked) {
                    layersToMerge.add(index);
                } else {
                    layersToMerge.delete(index);
                }
            });
            
            if (layersToMerge.size === 0) {
                document.getElementById('mergeStatusMessage').style.display = 'block';
            } else {
                document.getElementById('mergeStatusMessage').style.display = 'none';
            }
        }

        function executeMergeLayers() {
            if (layersToMerge.size < 2) {
                showToast('❌ Vui lòng chọn ít nhất 2 lớp để gộp!', 'error');
                return;
            }

            if (Array.from(layersToMerge).some(index => layers[index] && layers[index].isGroup)) {
                showToast('❌ Không thể gộp một nhóm lớp! Hãy bỏ nhóm hoặc chỉ chọn các lớp thường.', 'error');
                return;
            }

            const indicesToMerge = Array.from(layersToMerge).sort((a, b) => b - a);
            const mergedObjects = [];
            const mergedNames = [];
            const baseIndex = Math.min(...indicesToMerge);
            
            // Collect all objects from selected layers
            indicesToMerge.forEach(index => {
                mergedObjects.push(...layers[index].objects);
                mergedNames.push(layers[index].name);
            });
            
            // Remove layers (from highest index first to avoid index shift)
            indicesToMerge.forEach(index => {
                if (index !== baseIndex) {
                    layers.splice(index, 1);
                }
            });
            
            // Create merged layer name
            const mergedLayerName = 'Layer gộp ' + mergedNames.join(', ');
            
            // Auto assign color to merged layer (cycle through palette)
            const mergedColorIndex = layers.length % LAYER_COLORS.length;
            const mergedColor = LAYER_COLORS[mergedColorIndex];
            
            // Add merged objects to base layer
            layers[baseIndex].objects = mergedObjects;
            layers[baseIndex].name = mergedLayerName;
            layers[baseIndex].color = mergedColor; // Set new color
            
            layersToMerge.clear();
            updateLayersUI();
            updateCurrentLayerColor();
            renderAllLayers();
            hideMergeModal();
            
            showToast(`✅ Gộp thành công! Layer mới: "${mergedLayerName}" (${mergedColor})`, 'success');
        }

        // ===== RENAME LAYER MODAL =====
        let currentRenameLayerId = null; // Đổi tên lớp nằm trong 1 nhóm (theo id)

        function openRenameModal(index) {
            currentRenameIndex = index;
            currentRenameLayerId = null;
            document.getElementById('renameInput').value = layers[index].name;
            document.getElementById('renameModal').classList.add('active');
            setTimeout(() => document.getElementById('renameInput').focus(), 100);
        }

        // Đổi tên 1 lớp/nhóm con nằm bên trong 1 nhóm — không thể dùng
        // openRenameModal(index) vì lớp con không có vị trí trong mảng layers.
        function openRenameModalById(id) {
            const ref = resolveLayerRef(id);
            if (!ref) return;
            currentRenameIndex = -1;
            currentRenameLayerId = id;
            window.currentGroupRenameId = null;
            document.getElementById('renameInput').value = ref.container[ref.index].name;
            document.getElementById('renameModal').classList.add('active');
            setTimeout(() => document.getElementById('renameInput').focus(), 100);
        }

        function hideRenameModal() {
            document.getElementById('renameModal').classList.remove('active');
            currentRenameIndex = -1;
            currentRenameLayerId = null;
        }

        function confirmRenameLayer() {
            if (window.currentGroupRenameId) {
                // Rename group
                const newName = document.getElementById('renameInput').value.trim();
                if (newName) {
                    renameGroup(window.currentGroupRenameId, newName);
                    hideRenameModal();
                    showToast(`✏️ Đổi tên nhóm thành: "${newName}"`, 'success');
                } else {
                    showToast('❌ Vui lòng nhập tên!', 'error');
                }
                window.currentGroupRenameId = null;
            } else if (currentRenameLayerId != null) {
                // Rename lớp/nhóm con nằm trong 1 nhóm
                const newName = document.getElementById('renameInput').value.trim();
                if (newName) {
                    renameLayerById(currentRenameLayerId, newName);
                    hideRenameModal();
                    showToast(`✏️ Đổi tên thành: "${newName}"`, 'success');
                } else {
                    showToast('❌ Vui lòng nhập tên lớp!', 'error');
                }
            } else if (currentRenameIndex >= 0) {
                // Rename regular layer
                const newName = document.getElementById('renameInput').value.trim();
                if (newName) {
                    renameLayer(currentRenameIndex, newName);
                    hideRenameModal();
                    showToast(`✏️ Đổi tên thành: "${newName}"`, 'success');
                } else {
                    showToast('❌ Vui lòng nhập tên lớp!', 'error');
                }
            }
        }

        function openGroupMenu(layerIndex, groupId) {
            alert(`Tùy chọn nhóm:\n1. Đổi tên\n2. Bỏ nhóm\n(Tính năng menu thả xuống sắp ra mắt)\n\nBỏ nhóm ngay: ${confirm('Bỏ nhóm này?') ? ungroupLayers(groupId) : 'Hủy'}`);
        }

        // Support Enter key in rename modal
        // ===== KEYBOARD SHORTCUTS =====
        document.addEventListener('keydown', function(e) {
            // Lỗi cũ khi ghép vào trang shop: các lệnh document.addEventListener
            // này chạy MỘT LẦN lúc tệp nạp và KHÔNG BAO GIỜ gỡ, nên nếu không
            // chặn lại thì phím tắt (và các nghe-sự-kiện khác bên dưới) vẫn
            // hoạt động ở MỌI module khác của shop sau khi khách đã ghé qua
            // "Trang chủ" một lần — ví dụ khách gõ Ctrl+Z ở ô nhập email lại bị
            // trình chỉnh sửa nuốt mất. Chỉ chạy khi module này đang thật sự
            // hiện trên trang.
            if (!document.querySelector('.trang-chu-editor')) return;

            // Don't trigger shortcuts while typing in input fields
            const isInputActive = document.activeElement.tagName === 'INPUT' ||
                                 document.activeElement.tagName === 'TEXTAREA';

            // Modal checks
            const renameModalActive = document.getElementById('renameModal')?.classList.contains('active');
            const mergeModalActive = document.getElementById('mergeModal')?.classList.contains('active');
            const groupModalActive = document.getElementById('groupModal')?.classList.contains('active');
            const inpaintModalActive = document.getElementById('inpaintModal')?.classList.contains('active');
            
            // Handle modal shortcuts
            if (renameModalActive) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmRenameLayer();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideRenameModal();
                    return;
                }
            }
            
            if (mergeModalActive) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideMergeModal();
                    return;
                }
            }
            
            if (groupModalActive) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideGroupModal();
                    return;
                }
            }
            
            if (inpaintModalActive) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    hideInpaintModal();
                    return;
                }
            }
            
            // Global shortcuts (no modal active, not typing in input)
            if (!isInputActive && !renameModalActive && !mergeModalActive && !groupModalActive && !inpaintModalActive) {
                // Ctrl/Cmd + Z: Undo
                if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                    e.preventDefault();
                    showToast('↶ Undo chưa được hỗ trợ đầy đủ', 'info');
                    return;
                }
                
                // Ctrl/Cmd + Y: Redo
                if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                    e.preventDefault();
                    showToast('↷ Redo chưa được hỗ trợ đầy đủ', 'info');
                    return;
                }
                
                // Ctrl/Cmd + S: Download/Save
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    downloadImage();
                    return;
                }
                
                // Ctrl/Cmd + N: New Layer
                if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                    e.preventDefault();
                    createNewLayer();
                    return;
                }
                
                // Ctrl/Cmd + G: Group Layers
                if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                    e.preventDefault();
                    startGroupLayers();
                    return;
                }
                
                // Ctrl/Cmd + M: Merge Layers
                if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                    e.preventDefault();
                    startMergeLayers();
                    return;
                }
                
                // Ctrl/Cmd + Shift + Up: Move Layer Up
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveLayerUp(activeLayerIndex);
                    return;
                }
                
                // Ctrl/Cmd + Shift + Down: Move Layer Down
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveLayerDown(activeLayerIndex);
                    return;
                }
                
                // Delete: Remove selected layer
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    deleteLayer(activeLayerIndex);
                    return;
                }
                
                // D: Duplicate layer
                if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    duplicateLayer(activeLayerIndex);
                    return;
                }
                
                // R: Rename layer (open rename modal)
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    openRenameModal(activeLayerIndex);
                    return;
                }
                
                // H: Toggle visibility/Hide
                if (e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    toggleLayerVisibility(activeLayerIndex);
                    return;
                }
                
                // Up Arrow: Select layer above
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (activeLayerIndex < layers.length - 1) {
                        selectLayer(activeLayerIndex + 1);
                    }
                    return;
                }
                
                // Down Arrow: Select layer below
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (activeLayerIndex > 0) {
                        selectLayer(activeLayerIndex - 1);
                    }
                    return;
                }
                
                // Right Arrow: Expand group
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const layer = layers[activeLayerIndex];
                    if (layer.isGroup) {
                        const group = layerGroups.find(g => g.id === layer.groupId);
                        if (group && group.collapsed) {
                            toggleGroupExpanded(layer.groupId);
                        }
                    }
                    return;
                }
                
                // Left Arrow: Collapse group
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const layer = layers[activeLayerIndex];
                    if (layer.isGroup) {
                        const group = layerGroups.find(g => g.id === layer.groupId);
                        if (group && !group.collapsed) {
                            toggleGroupExpanded(layer.groupId);
                        }
                    }
                    return;
                }
                
                // Ctrl/Cmd + D: Deselect (select background/first layer)
                if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
                    e.preventDefault();
                    selectLayer(layers.length - 1); // Background
                    return;
                }
                
                // ?: Show help/shortcuts
                if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                    e.preventDefault();
                    showKeyboardShortcuts();
                    return;
                }
                
                // Ctrl+A: Select all visible layers
                if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                    e.preventDefault();
                    layers.forEach((_, index) => {
                        multiSelectedIndices.add(index);
                    });
                    updateLayersUI();
                    showToast(`✓ Đã chọn tất cả ${layers.length} lớp!`, 'success');
                    return;
                }
                
                // Escape: Clear multi-selection
                if (e.key === 'Escape' && multiSelectedIndices.size > 0) {
                    e.preventDefault();
                    multiSelectedIndices.clear();
                    updateLayersUI();
                    showToast('🔄 Bỏ chọn tất cả', 'info');
                    return;
                }
            }
        });

        // ===== LAYER GROUPS FUNCTIONALITY =====
        let layersToGroup = new Set();

        function startGroupLayers() {
            layersToGroup.clear();
            document.getElementById('groupStatusMessage').style.display = 'block';
            document.getElementById('groupLayersList').innerHTML = '';
            document.getElementById('groupNameInput').value = '';
            
            layers.forEach((layer, index) => {
                const item = document.createElement('div');
                item.className = 'merge-layer-item';
                item.innerHTML = `
                    <input type="checkbox" id="group-${index}" value="${index}" 
                           onchange="toggleGroupLayer(${index})">
                    <div class="merge-layer-indicator" style="background: ${layer.color};"></div>
                    <label for="group-${index}" class="merge-layer-name">${layer.name}</label>
                `;
                document.getElementById('groupLayersList').appendChild(item);
            });
            
            document.getElementById('groupModal').classList.add('active');
        }

        function hideGroupModal() {
            document.getElementById('groupModal').classList.remove('active');
            layersToGroup.clear();
        }

        function toggleGroupLayer(index) {
            const checkbox = document.getElementById(`group-${index}`);
            if (checkbox.checked) {
                layersToGroup.add(index);
                document.getElementById('groupStatusMessage').style.display = 'none';
            } else {
                layersToGroup.delete(index);
                if (layersToGroup.size === 0) {
                    document.getElementById('groupStatusMessage').style.display = 'block';
                }
            }
        }

        function selectAllLayersForGroup() {
            const checkboxes = document.querySelectorAll('#groupLayersList input[type="checkbox"]');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            
            checkboxes.forEach((checkbox, index) => {
                checkbox.checked = !allChecked;
                if (!allChecked) {
                    layersToGroup.add(index);
                } else {
                    layersToGroup.delete(index);
                }
            });
            
            if (layersToGroup.size === 0) {
                document.getElementById('groupStatusMessage').style.display = 'block';
            } else {
                document.getElementById('groupStatusMessage').style.display = 'none';
            }
        }

        function executeGroupLayers() {
            if (layersToGroup.size < 1) {
                showToast('❌ Vui lòng chọn ít nhất 1 lớp để nhóm!', 'error');
                return;
            }

            const groupName = document.getElementById('groupNameInput').value.trim() || 'Nhóm mới';
            const indicesToGroup = Array.from(layersToGroup).sort((a, b) => a - b);
            const groupedLayers = [];
            
            // Collect layers to group
            indicesToGroup.forEach(index => {
                groupedLayers.push(layers[index]);
            });
            
            // Create group object
            const newGroup = {
                id: Date.now(),
                name: groupName,
                color: '#000000', // Group name is always black
                visible: true,
                children: groupedLayers,
                isGroup: true,
                collapsed: false
            };
            
            // Add group to layerGroups array
            layerGroups.push(newGroup);
            
            // Remove original layers (from highest index first)
            indicesToGroup.reverse().forEach(index => {
                layers.splice(index, 1);
            });
            
            // Add group reference to layers (as a special layer)
            layers.push({
                id: newGroup.id,
                name: groupName,
                color: '#000000',
                visible: true,
                isGroup: true,
                groupId: newGroup.id
            });
            
            layersToGroup.clear();
            updateLayersUI();
            updateCurrentLayerColor();
            renderAllLayers();
            hideGroupModal();
            
            showToast(`✅ Nhóm lớp thành công! Nhóm: "${groupName}"`, 'success');
        }

        function ungroupLayers(groupId) {
            const groupIndex = layerGroups.findIndex(g => g.id === groupId);
            if (groupIndex === -1) return;
            
            const group = layerGroups[groupIndex];
            const groupLayerIndex = layers.findIndex(l => l.isGroup && l.groupId === groupId);
            
            // Remove group from layers array
            if (groupLayerIndex !== -1) {
                layers.splice(groupLayerIndex, 1);
            }
            
            // Add group children back to layers array at the same position
            group.children.forEach((child, i) => {
                layers.splice(groupLayerIndex + i, 0, child);
            });
            
            // Remove from groups array
            layerGroups.splice(groupIndex, 1);
            
            updateLayersUI();
            updateCurrentLayerColor();
            renderAllLayers();
            showToast(`✅ Bỏ nhóm thành công! "${group.name}" đã được mở ra`, 'success');
        }

        function renameGroup(groupId, newName) {
            const group = layerGroups.find(g => g.id === groupId);
            if (group && newName.trim()) {
                group.name = newName.trim();
                const groupLayer = layers.find(l => l.isGroup && l.groupId === groupId);
                if (groupLayer) {
                    groupLayer.name = newName.trim();
                }
                updateLayersUI();
            }
        }

        // ===== DROPDOWN MENU FUNCTIONS =====
        // Lỗi cũ: menu được appendChild ngay vào .layer-item (position:
        // relative), mà .layer-item nằm trong .layers-list/.sidebar-right
        // (overflow-y: auto) — menu bị khung panel cắt mất, chỉ thấy vài
        // nút đầu. Nay MỌI menu/submenu được đưa thẳng ra <body> với
        // position: fixed, tính toạ độ theo đúng vị trí hàng đã bấm, nên
        // không nằm trong bất kỳ khung nào có overflow để bị đè/cắt nữa.
        let currentOpenMenu = null;
        let openMenuElements = [];

        function closeAllMenus() {
            openMenuElements.forEach(el => el.remove());
            openMenuElements = [];
            currentOpenMenu = null;
        }

        // Gắn 1 menu/submenu vào body, đặt vị trí ngay cạnh anchorEl (hàng
        // lớp hoặc nút "..." vừa bấm) — tự lật lên trên nếu không đủ chỗ ở
        // dưới, và không bao giờ tràn ra ngoài màn hình theo chiều ngang.
        function attachDropdownMenu(menu, anchorEl, options = {}) {
            document.body.appendChild(menu);
            openMenuElements.push(menu);

            const rect = anchorEl.getBoundingClientRect();
            menu.style.position = 'fixed';
            menu.style.margin = '0';
            menu.style.right = 'auto';

            const menuHeight = menu.offsetHeight;
            const menuWidth = menu.offsetWidth;
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;

            let top;
            if (options.preferSide === 'right') {
                // Submenu "Chọn Nhóm": mở sang phải cạnh nút vừa bấm, không
                // đẩy lên trên như menu chính.
                top = Math.min(window.innerHeight - menuHeight - 8, Math.max(8, rect.top));
                let left = rect.right + 4;
                if (left + menuWidth > window.innerWidth - 8) left = rect.left - menuWidth - 4;
                if (left < 8) left = 8;
                menu.style.left = left + 'px';
            } else {
                top = (menuHeight <= spaceAbove || spaceAbove >= spaceBelow)
                    ? Math.max(8, rect.top - menuHeight)
                    : Math.min(window.innerHeight - menuHeight - 8, rect.bottom);
                let left = rect.left;
                if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
                if (left < 8) left = 8;
                menu.style.left = left + 'px';
            }
            menu.style.top = top + 'px';
            menu.style.bottom = 'auto';

            return menu;
        }

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.layer-item') && !e.target.closest('.layer-dropdown-menu')) {
                closeAllMenus();
            }
        });

        function showLayerMenu(layerIndex, event) {
            closeAllMenus();
            event.stopPropagation();
            
            const layer = layers[layerIndex];
            const layerItem = event.currentTarget.closest('.layer-item');

            const menu = document.createElement('div');
            menu.className = 'layer-dropdown-menu';

            let menuHTML = `
                <div class="dropdown-menu-header">
                    <span class="dropdown-menu-header-name">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${layer.color}; flex-shrink: 0;"></span>
                        <span>${escapeHtmlText(layer.name)}</span>
                    </span>
                    <button class="dropdown-close-btn" onclick="event.stopPropagation(); closeAllMenus()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="dropdown-menu-subtitle">
                    🎨 ${layer.blendMode || 'normal'} • 👁️ ${Math.round((layer.opacity || 1) * 100)}%
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); openRenameModal(${layerIndex})">
                    <i class="fas fa-edit"></i> Đổi Tên
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); toggleLayerVisibility(${layerIndex})">
                    <i class="fas ${layer.visible ? 'fa-eye-slash' : 'fa-eye'}"></i> ${layer.visible ? 'Ẩn Lớp' : 'Hiện Lớp'}
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); duplicateLayer(${layerIndex})">
                    <i class="fas fa-copy"></i> Nhân Đôi
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerUp(${layerIndex})">
                    <i class="fas fa-chevron-up"></i> Lên Trên
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerDown(${layerIndex})">
                    <i class="fas fa-chevron-down"></i> Xuống Dưới
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); revealDragHandle(${layerIndex})">
                    <i class="fas fa-arrows-up-down"></i> Kéo Để Sắp Xếp
                </div>
            `;

            // Add "Move to Group" if there are groups
            if (layerGroups.length > 0) {
                menuHTML += `
                    <div class="dropdown-menu-item" onclick="event.stopPropagation(); showMoveToGroupSubmenu(${layerIndex}, event)">
                        <i class="fas fa-arrow-right"></i> Di Chuyển Sang Nhóm...
                        <i class="fas fa-chevron-right" style="margin-left: auto; font-size: 0.75rem;"></i>
                    </div>
                `;
            }

            menuHTML += `
                <div class="dropdown-menu-item danger" onclick="event.stopPropagation(); closeAllMenus(); deleteLayer(${layerIndex})">
                    <i class="fas fa-trash"></i> Xoá Lớp
                </div>
            `;

            menu.innerHTML = menuHTML;
            attachDropdownMenu(menu, layerItem);
            currentOpenMenu = menu;
        }

        // Menu cho 1 lớp thường nằm bên trong 1 nhóm — bản rút gọn của
        // showLayerMenu ("Di chuyển sang nhóm..." của lớp con cần chọn cả
        // nhóm đang chứa nó lẫn nhóm đích, để lại cho lần sau).
        function showNestedLayerMenu(id, event) {
            closeAllMenus();
            event.stopPropagation();

            const layer = resolveLayerRef(id)?.container[resolveLayerRef(id).index];
            if (!layer) return;
            const layerItem = event.currentTarget.closest('.layer-item');

            const menu = document.createElement('div');
            menu.className = 'layer-dropdown-menu';

            menu.innerHTML = `
                <div class="dropdown-menu-header">
                    <span class="dropdown-menu-header-name">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${layer.color}; flex-shrink: 0;"></span>
                        <span>${escapeHtmlText(layer.name)}</span>
                    </span>
                    <button class="dropdown-close-btn" onclick="event.stopPropagation(); closeAllMenus()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="dropdown-menu-subtitle">
                    🎨 ${layer.blendMode || 'normal'} • 👁️ ${Math.round((layer.opacity || 1) * 100)}%
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); openRenameModalById(${id})">
                    <i class="fas fa-edit"></i> Đổi Tên
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); toggleLayerVisibilityById(${id})">
                    <i class="fas ${layer.visible ? 'fa-eye-slash' : 'fa-eye'}"></i> ${layer.visible ? 'Ẩn Lớp' : 'Hiện Lớp'}
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); duplicateLayerById(${id})">
                    <i class="fas fa-copy"></i> Nhân Đôi
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerUpById(${id})">
                    <i class="fas fa-chevron-up"></i> Lên Trên
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerDownById(${id})">
                    <i class="fas fa-chevron-down"></i> Xuống Dưới
                </div>
                <div class="dropdown-menu-item danger" onclick="event.stopPropagation(); closeAllMenus(); deleteLayerById(${id})">
                    <i class="fas fa-trash"></i> Xoá Lớp
                </div>
            `;

            attachDropdownMenu(menu, layerItem);
            currentOpenMenu = menu;
        }

        // Menu cho 1 nhóm con nằm lồng bên trong 1 nhóm khác — bản rút gọn
        // của showGroupMenu, vẫn có cây thư mục + nút rút gọn.
        // Ghi chú: nhóm lồng bên trong 1 nhóm khác dùng thẳng showGroupMenu()
        // ở trên (gọi với layerIndex = -1) — layerIndex không được dùng để
        // đánh chỉ số thật ở bất kỳ đâu trong showGroupMenu/openGroupRenameModal/
        // showMoveGroupSubmenu, nên tái dùng an toàn cho cả nhóm lồng nhau.

        // Thoát chuỗi trước khi chèn vào innerHTML (tên lớp/nhóm là do người
        // dùng gõ tự do).
        function escapeHtmlText(str) {
            const div = document.createElement('div');
            div.textContent = str == null ? '' : String(str);
            return div.innerHTML;
        }

        // Vẽ cây thư mục thật cho nội dung 1 nhóm — đi sâu vào nhóm lồng
        // nhóm, mỗi cấp thụt vào để người dùng thấy rõ cha/con.
        function buildGroupContentsTree(group, depth = 0) {
            if (!group || group.children.length === 0) {
                return `<div style="padding: 8px 12px; padding-left: ${12 + depth * 16}px; font-size: 0.82rem; color: #999;">(Trống)</div>`;
            }
            return group.children.map(child => {
                const indent = 12 + depth * 16;
                if (child.isGroup) {
                    const childGroup = layerGroups.find(g => g.id === child.groupId);
                    return `
                        <div style="padding: 6px 12px; padding-left: ${indent}px; font-size: 0.85rem; font-weight: 600; color: #000;">
                            📁 ${escapeHtmlText(child.name)} <span style="font-weight: 400; color: #999;">(${childGroup ? childGroup.children.length : 0})</span>
                        </div>
                        ${childGroup ? buildGroupContentsTree(childGroup, depth + 1) : ''}
                    `;
                }
                return `
                    <div style="padding: 6px 12px; padding-left: ${indent}px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${child.color}; flex-shrink: 0;"></span>
                        <span style="color: ${child.color}; overflow-wrap: anywhere;">${escapeHtmlText(child.name)}</span>
                    </div>
                `;
            }).join('');
        }

        function showGroupMenu(layerIndex, groupId, event) {
            closeAllMenus();
            event.stopPropagation();

            const group = layerGroups.find(g => g.id === groupId);
            const layerItem = event.currentTarget.closest('.layer-item');

            const menu = document.createElement('div');
            menu.className = 'layer-dropdown-menu';
            menu.dataset.groupId = groupId;

            const contentsLabel = group && group.contentsShown ? 'Xem Ở Chế Độ Rút Gọn' : 'Xem Thành Phần Bên Trong';
            const contentsIcon = group && group.contentsShown ? 'fa-compress' : 'fa-eye';
            // layer.id === layer.groupId cho mọi lớp nhóm (xem executeGroupLayers)
            // nên groupId dùng được luôn cho các hàm *ById(), dù nhóm ở cấp cao
            // nhất hay lồng trong nhóm khác.
            const groupRef = resolveLayerRef(groupId);
            const groupLayer = groupRef ? groupRef.container[groupRef.index] : null;

            const isExpanded = group ? !group.collapsed : true;
            const expandIcon = isExpanded ? 'fa-angle-up' : 'fa-angle-down';
            const expandLabel = isExpanded ? 'Ẩn Danh Sách Lớp Con' : 'Hiện Danh Sách Lớp Con';
            const childCount = group ? group.children.length : 0;

            let menuHTML = `
                <div class="dropdown-menu-header">
                    <span class="dropdown-menu-header-name">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: #000000; flex-shrink: 0;"></span>
                        <span>${escapeHtmlText(groupLayer ? groupLayer.name : '')}</span>
                    </span>
                    <button class="dropdown-close-btn" onclick="event.stopPropagation(); closeAllMenus()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="dropdown-menu-subtitle">
                    🎨 ${groupLayer ? (groupLayer.blendMode || 'normal') : 'normal'} • 👁️ ${Math.round(((groupLayer && groupLayer.opacity) || 1) * 100)}%
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); openGroupRenameModal(${layerIndex}, ${groupId})">
                    <i class="fas fa-edit"></i> Đổi Tên
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); toggleLayerVisibilityById(${groupId})">
                    <i class="fas ${groupLayer && groupLayer.visible ? 'fa-eye-slash' : 'fa-eye'}"></i> ${groupLayer && groupLayer.visible ? 'Ẩn Nhóm' : 'Hiện Nhóm'}
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerUpById(${groupId})">
                    <i class="fas fa-chevron-up"></i> Lên Trên
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerDownById(${groupId})">
                    <i class="fas fa-chevron-down"></i> Xuống Dưới
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); toggleGroupExpanded(${groupId})">
                    <i class="fas ${expandIcon}"></i> ${expandLabel} (${childCount})
                </div>
                <div class="dropdown-menu-item" onclick="event.stopPropagation(); toggleGroupContentsShown(${groupId}, ${layerIndex}, event)">
                    <i class="fas ${contentsIcon}"></i> ${contentsLabel}
                </div>
            `;

            // Nhóm lồng bên trong 1 nhóm khác (layerIndex === -1) không thể
            // kéo-thả (không có drag listener) — chỉ hiện cho nhóm cấp cao nhất.
            if (layerIndex !== -1) {
                menuHTML += `
                    <div class="dropdown-menu-item" onclick="event.stopPropagation(); closeAllMenus(); revealDragHandle(${layerIndex})">
                        <i class="fas fa-arrows-up-down"></i> Kéo Để Sắp Xếp
                    </div>
                `;
            }

            // Add "Move to Group" if there are other groups
            const otherGroups = layerGroups.filter(g => g.id !== groupId);
            if (otherGroups.length > 0) {
                menuHTML += `
                    <div class="dropdown-menu-item" onclick="event.stopPropagation(); showMoveGroupSubmenu(${layerIndex}, ${groupId}, event)">
                        <i class="fas fa-arrow-right"></i> Di Chuyển Sang Nhóm...
                        <i class="fas fa-chevron-right" style="margin-left: auto; font-size: 0.75rem;"></i>
                    </div>
                `;
            }

            menuHTML += `
                <div class="dropdown-menu-item danger" onclick="event.stopPropagation(); closeAllMenus(); ungroupLayers(${groupId})">
                    <i class="fas fa-unlink"></i> Bỏ Nhóm
                </div>
                <div class="dropdown-menu-item danger" onclick="event.stopPropagation(); closeAllMenus(); deleteLayerById(${groupId})">
                    <i class="fas fa-trash"></i> Xoá Cả Nhóm
                </div>
            `;

            if (group && group.contentsShown) {
                menuHTML += buildGroupContentsTree(group, 0);
            }

            menu.innerHTML = menuHTML;
            attachDropdownMenu(menu, layerItem);
            currentOpenMenu = menu;
        }

        // Bấm "Xem Thành Phần" lần đầu -> mở cây thư mục ngay trong menu.
        // Bấm lại tên nhóm trong khi cây đang mở (xem showGroupMenu) hoặc
        // bấm "Xem Ở Chế Độ Rút Gọn" -> đóng cây lại.
        function toggleGroupContentsShown(groupId, layerIndex, event) {
            const group = layerGroups.find(g => g.id === groupId);
            if (!group) return;
            group.contentsShown = !group.contentsShown;
            // Lấy .layer-item TRƯỚC khi showGroupMenu tự đóng (xoá) menu hiện
            // tại — closeAllMenus() gỡ menu (chứa chính nút vừa bấm) khỏi DOM,
            // nên event.currentTarget.closest(...) sau đó sẽ luôn ra null.
            const layerItem = event.currentTarget.closest('.layer-item');
            showGroupMenu(layerIndex, groupId, { stopPropagation(){}, preventDefault(){}, currentTarget: layerItem });
        }

        function showMoveToGroupSubmenu(layerIndex, event) {
            const anchor = event.currentTarget;
            const submenu = document.createElement('div');
            submenu.className = 'layer-dropdown-menu';

            let html = `
                <div class="dropdown-menu-header">
                    Chọn Nhóm
                    <button class="dropdown-close-btn" onclick="event.stopPropagation(); closeAllMenus()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="dropdown-submenu">
            `;

            layerGroups.forEach((group, i) => {
                html += `
                    <div class="dropdown-submenu-item" onclick="event.stopPropagation(); closeAllMenus(); moveLayerToGroup(${layerIndex}, ${i})">
                        <i class="fas fa-folder"></i> ${group.name}
                    </div>
                `;
            });

            html += '</div>';
            submenu.innerHTML = html;
            attachDropdownMenu(submenu, anchor, { preferSide: 'right' });
        }

        function showMoveGroupSubmenu(layerIndex, groupId, event) {
            const anchor = event.currentTarget;
            const submenu = document.createElement('div');
            submenu.className = 'layer-dropdown-menu';

            let html = `
                <div class="dropdown-menu-header">
                    Chọn Nhóm
                    <button class="dropdown-close-btn" onclick="event.stopPropagation(); closeAllMenus()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="dropdown-submenu">
            `;

            layerGroups.forEach((group) => {
                if (group.id !== groupId) {
                    html += `
                        <div class="dropdown-submenu-item" onclick="event.stopPropagation(); closeAllMenus(); moveGroupToGroup(${groupId}, ${group.id})">
                            <i class="fas fa-folder"></i> ${group.name}
                        </div>
                    `;
                }
            });

            html += '</div>';
            submenu.innerHTML = html;
            attachDropdownMenu(submenu, anchor, { preferSide: 'right' });
        }

        function moveLayerToGroup(layerIndex, groupIndex) {
            const layer = layers[layerIndex];
            const group = layerGroups[groupIndex];
            
            if (!layer || !group) return;
            
            // Remove layer from main array
            layers.splice(layerIndex, 1);
            
            // Add to group's children
            group.children.push(layer);
            
            updateLayersUI();
            renderAllLayers();
            showToast(`✅ Di chuyển "${layer.name}" vào nhóm "${group.name}"`, 'success');
        }

        function moveGroupToGroup(groupId, targetGroupId) {
            const sourceGroup = layerGroups.find(g => g.id === groupId);
            const targetGroup = layerGroups.find(g => g.id === targetGroupId);
            
            if (!sourceGroup || !targetGroup) return;
            
            // Prevent moving group to itself
            if (groupId === targetGroupId) {
                showToast('❌ Không thể di chuyển nhóm vào chính nó!', 'error');
                return;
            }
            
            // Remove source group from main layers array
            const sourceLayerIndex = layers.findIndex(l => l.isGroup && l.groupId === groupId);
            if (sourceLayerIndex !== -1) {
                layers.splice(sourceLayerIndex, 1);
            }
            
            // Remove from layerGroups array
            const sourceGroupIndex = layerGroups.findIndex(g => g.id === groupId);
            layerGroups.splice(sourceGroupIndex, 1);
            
            // Add to target group's children as a nested group
            targetGroup.children.push(sourceGroup);
            
            updateLayersUI();
            renderAllLayers();
            showToast(`✅ Di chuyển nhóm "${sourceGroup.name}" vào "${targetGroup.name}"`, 'success');
        }

        function openGroupRenameModal(layerIndex, groupId) {
            const group = layerGroups.find(g => g.id === groupId);
            if (group) {
                currentRenameIndex = -1; // Mark as group rename
                currentRenameLayerId = null;
                document.getElementById('renameInput').value = group.name;
                document.getElementById('renameModal').classList.add('active');

                // Override confirmRenameLayer behavior for groups
                window.currentGroupRenameId = groupId;
            }
        }

        function toggleLayerVisibility(index) {
            layers[index].visible = !layers[index].visible;
            updateLayersUI();
            renderAllLayers();
            showToast(`Layer "${layers[index].name}" ${layers[index].visible ? 'hiển thị' : 'ẩn'}`, 'success');
        }

        // Trả về danh sách "lớp thật" (có objects) nằm trong một danh sách lớp,
        // đi sâu vào bên trong các nhóm (kể cả nhóm lồng nhóm), cộng dồn
        // opacity/ẩn-hiện của nhóm cha vào từng lớp con.
        function flattenLayersForRender(layerList, inheritedOpacity = 1, inheritedVisible = true) {
            let result = [];
            layerList.forEach(layer => {
                const visible = inheritedVisible && layer.visible;
                const opacity = inheritedOpacity * (layer.opacity != null ? layer.opacity : 1);

                if (layer.isGroup) {
                    const group = layerGroups.find(g => g.id === layer.groupId);
                    if (group) {
                        result = result.concat(flattenLayersForRender(group.children, opacity, visible));
                    }
                } else {
                    result.push({ layer, visible, opacity });
                }
            });
            return result;
        }

        // canvas.clear() phát ra sự kiện 'object:removed' cho từng đối tượng,
        // mà sự kiện đó lại gọi renderAllLayers() (xem bindCanvasEvents) — nếu
        // không chặn, mỗi lần render sẽ tự gọi lại chính nó và tràn stack.
        let isRenderingLayers = false;

        function renderAllLayers() {
            if (isRenderingLayers) return;
            isRenderingLayers = true;

            canvas.clear();

            // Render tất cả lớp (kể cả lớp nằm trong nhóm) từ dưới lên trên
            flattenLayersForRender(layers).forEach(({ layer, visible, opacity }) => {
                if (visible && layer.objects && layer.objects.length > 0) {
                    layer.objects.forEach(obj => {
                        // Áp opacity và blend mode (đã cộng dồn cả opacity của nhóm cha)
                        obj.opacity = opacity;

                        if (layer.blendMode && layer.blendMode !== 'normal') {
                            obj.globalCompositeOperation = layer.blendMode;
                        }

                        canvas.add(obj);
                    });
                }
            });

            canvas.renderAll();
            isRenderingLayers = false;
            updateLayerBorder();
        }

        function moveLayerUp(index) {
            if (index < layers.length - 1) {
                [layers[index], layers[index + 1]] = [layers[index + 1], layers[index]];
                activeLayerIndex = index + 1;
                updateLayersUI();
                updateCurrentLayerColor();
            }
        }

        function moveLayerDown(index) {
            if (index > 0) {
                [layers[index], layers[index - 1]] = [layers[index - 1], layers[index]];
                activeLayerIndex = index - 1;
                updateLayersUI();
                updateCurrentLayerColor();
            }
        }

        // ===== THAO TÁC VỚI LỚP/NHÓM NẰM BÊN TRONG 1 NHÓM (định danh theo id) =====
        // Lỗi cũ: bảng lớp tính globalIndex = layers.indexOf(layer), luôn ra -1
        // với lớp nằm trong group.children (không có trong mảng layers cấp cao
        // nhất) — nên nút xoá/di chuyển/ẩn-hiện/đổi tên của các dòng lớp con
        // không trỏ đúng lớp nào cả. Các hàm dưới đây tìm lớp theo id, dù nó ở
        // đâu (cấp cao nhất hay lồng trong nhóm nào), rồi thao tác lên đúng
        // mảng đang thực sự chứa nó.
        function resolveLayerRef(id) {
            function search(container, parentGroup) {
                for (let i = 0; i < container.length; i++) {
                    if (container[i].id === id) {
                        return { container, index: i, parentGroup };
                    }
                    if (container[i].isGroup) {
                        const g = layerGroups.find(gr => gr.id === container[i].groupId);
                        if (g) {
                            const found = search(g.children, g);
                            if (found) return found;
                        }
                    }
                }
                return null;
            }
            return search(layers, null);
        }

        // Xoá 1 nhóm phải dọn luôn mục của nó (và mọi nhóm lồng bên trong)
        // khỏi layerGroups — nếu không, nhóm "hồn ma" đó vẫn còn được liệt
        // kê ở "Di Chuyển Sang Nhóm...", và di chuyển 1 lớp vào đó coi như
        // làm mất lớp vĩnh viễn (không placeholder nào trỏ tới nó để vẽ ra).
        function removeGroupAndDescendantsFromRegistry(groupId) {
            const idx = layerGroups.findIndex(g => g.id === groupId);
            if (idx === -1) return;
            layerGroups[idx].children.forEach(child => {
                if (child.isGroup) removeGroupAndDescendantsFromRegistry(child.groupId);
            });
            layerGroups.splice(idx, 1);
        }

        function deleteLayerById(id) {
            const ref = resolveLayerRef(id);
            if (!ref) return;
            if (ref.container === layers && layers.length <= 1) {
                showToast('Không thể xoá layer cuối cùng!', 'error');
                return;
            }
            const layer = ref.container[ref.index];
            const confirmMsg = layer.isGroup ? `Xoá cả nhóm "${layer.name}" và mọi lớp bên trong?` : `Xoá layer "${layer.name}"?`;
            if (confirm(confirmMsg)) {
                if (layer.isGroup) {
                    removeGroupAndDescendantsFromRegistry(layer.groupId);
                }
                ref.container.splice(ref.index, 1);
                if (activeLayerIndex >= layers.length) {
                    activeLayerIndex = Math.max(0, layers.length - 1);
                }
                updateLayersUI();
                updateCurrentLayerColor();
                renderAllLayers();
                showToast('Đã xoá layer', 'success');
            }
        }

        function duplicateLayerById(id) {
            const ref = resolveLayerRef(id);
            if (!ref) return;
            const original = ref.container[ref.index];
            const duplicate = {
                ...original,
                id: Date.now(),
                name: `${original.name} (Bản Sao)`,
                objects: original.objects ? [...original.objects] : undefined
            };
            ref.container.splice(ref.index + 1, 0, duplicate);
            updateLayersUI();
            updateCurrentLayerColor();
            renderAllLayers();
            showToast(`Nhân đôi: ${duplicate.name}`, 'success');
        }

        function toggleLayerVisibilityById(id) {
            const ref = resolveLayerRef(id);
            if (!ref) return;
            const layer = ref.container[ref.index];
            layer.visible = !layer.visible;
            updateLayersUI();
            renderAllLayers();
            showToast(`Layer "${layer.name}" ${layer.visible ? 'hiển thị' : 'ẩn'}`, 'success');
        }

        function renameLayerById(id, newName) {
            const ref = resolveLayerRef(id);
            if (!ref || !newName.trim()) return;
            ref.container[ref.index].name = newName;
            updateLayersUI();
            updateCurrentLayerColor();
        }

        function moveLayerUpById(id) {
            const ref = resolveLayerRef(id);
            if (!ref || ref.index >= ref.container.length - 1) return;
            [ref.container[ref.index], ref.container[ref.index + 1]] = [ref.container[ref.index + 1], ref.container[ref.index]];
            updateLayersUI();
            renderAllLayers();
        }

        function moveLayerDownById(id) {
            const ref = resolveLayerRef(id);
            if (!ref || ref.index <= 0) return;
            [ref.container[ref.index], ref.container[ref.index - 1]] = [ref.container[ref.index - 1], ref.container[ref.index]];
            updateLayersUI();
            renderAllLayers();
        }

        // Bấm vào 1 lớp/nhóm con nằm bên trong 1 nhóm: mô hình sửa ảnh hiện tại
        // (xoay/lật/lọc/AI...) chỉ thao tác trên lớp cấp cao nhất đang chọn —
        // muốn chỉnh riêng lớp con thì phải bỏ nhóm trước. Vì vậy bấm vào tên
        // lớp con sẽ chọn nhóm cha ngoài cùng làm lớp đang thao tác (đúng như
        // khi bấm nút bất kỳ trong khi đang ở nhóm), kèm lời nhắc rõ ràng thay
        // vì im lặng không làm gì hoặc trỏ sai lớp.
        function selectNestedLayer(id) {
            const ref = resolveLayerRef(id);
            const layer = ref ? ref.container[ref.index] : null;
            // Tìm nhóm cấp cao nhất (top-level) đang chứa lớp này
            const topIndex = layers.findIndex(l => {
                if (!l.isGroup) return false;
                const g = layerGroups.find(gr => gr.id === l.groupId);
                return g && resolveLayerRefWithin(g, id);
            });
            if (topIndex !== -1) {
                selectLayer(topIndex, false, false);
                showToast(`📁 Lớp "${layer ? layer.name : ''}" nằm trong nhóm "${layers[topIndex].name}" — bỏ nhóm để chỉnh riêng lớp này`, 'info');
            }
        }

        function resolveLayerRefWithin(group, id) {
            for (const child of group.children) {
                if (child.id === id) return true;
                if (child.isGroup) {
                    const g = layerGroups.find(gr => gr.id === child.groupId);
                    if (g && resolveLayerRefWithin(g, id)) return true;
                }
            }
            return false;
        }

        function updateLayersUI() {
            const layersList = document.getElementById('layersList');
            layersList.innerHTML = '';

            // Helper function to render layers with tree structure
            function renderLayerTree(parentElement, layersArray, depth = 0) {
                // renderAllLayers() vẽ mảng layers/group.children theo ĐÚNG
                // thứ tự của nó — phần tử đứng SAU được vẽ SAU nên đè lên
                // phần tử đứng trước (giống fabric/canvas: add() sau = nổi
                // lên trên). Bảng lớp vì vậy phải hiện NGƯỢC lại (phần tử
                // cuối mảng — nổi trên cùng — lên ĐẦU danh sách), để "lớp ở
                // trên trong danh sách" khớp với "lớp đè lên trên màn hình".
                [...layersArray].reverse().forEach((layer, index) => {
                    // globalIndex chỉ có nghĩa (khớp vị trí thật trong mảng
                    // layers) khi depth === 0. Với depth > 0 (lớp/nhóm nằm
                    // trong 1 nhóm), layers.indexOf luôn ra -1 vì phần tử đó
                    // không nằm ở mảng cấp cao nhất — mọi nút bấm của dòng
                    // này vì vậy dùng các hàm *ById() thao tác theo layer.id.
                    const globalIndex = layers.indexOf(layer);
                    const isNested = depth > 0;
                    const isActive = !isNested && globalIndex === activeLayerIndex;

                    // Create layer item wrapper
                    const layerWrapper = document.createElement('div');
                    layerWrapper.style.marginLeft = (depth * 20) + 'px';

                    if (layer.isGroup) {
                        // GROUP LAYER
                        const group = layerGroups.find(g => g.id === layer.groupId);
                        if (!group) return;

                        const isMultiSelected = !isNested && multiSelectedIndices.has(globalIndex);
                        const groupEl = document.createElement('div');
                        groupEl.className = `layer-item ${isActive ? 'active' : ''} ${isNested ? 'layer-item-nested' : ''} ${isMultiSelected ? 'multi-selected' : ''}`;
                        groupEl.style.position = 'relative';
                        groupEl.draggable = !isNested;
                        groupEl.dataset.layerIndex = globalIndex;

                        const isExpanded = !group.collapsed;
                        // layer.id === layer.groupId cho mọi lớp nhóm (xem
                        // executeGroupLayers) — dùng luôn *ById() cho ẩn/hiện
                        // dù nhóm nằm ở cấp cao nhất hay lồng trong nhóm khác.
                        const visibilityAction = `toggleLayerVisibilityById(${layer.id})`;
                        const menuAction = isNested ? `showGroupMenu(-1, ${layer.groupId}, event)` : `showGroupMenu(${globalIndex}, ${layer.groupId}, event)`;
                        const showDragHandle = !isNested && globalIndex === dragRevealIndex;

                        // Thẻ tối giản hết mức: chỉ mắt ẩn/hiện (sát trái),
                        // tên (📁 + số lớp con), và nút mở menu (sát phải).
                        // Mọi thao tác khác (đổi tên, lên/xuống, xoá, xem
                        // thành phần, mở/thu gọn danh sách con, bỏ nhóm...)
                        // đều nằm trong menu đó — xem showGroupMenu().
                        groupEl.innerHTML = `
                            <div class="layer-visibility" onclick="event.stopPropagation(); ${visibilityAction}">
                                <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                            </div>
                            ${showDragHandle ? `<div class="drag-handle drag-handle-visible" title="Kéo để sắp xếp lại">⋮⋮</div>` : ''}
                            <span class="layer-name-text" style="color: #000000;">📁 ${escapeHtmlText(layer.name)} <span class="layer-count-badge">(${group.children.length})</span></span>
                            <button class="layer-menu-trigger" onclick="event.stopPropagation(); ${menuAction}" title="Tuỳ chọn">
                                <i class="fas fa-ellipsis-vertical"></i>
                            </button>
                            <div class="group-mode-indicator">👥</div>
                            <div class="multi-select-badge">${multiSelectedIndices.size}</div>
                        `;

                        if (isNested) {
                            groupEl.onclick = () => selectNestedLayer(layer.id);
                        } else {
                            groupEl.onclick = (e) => selectLayer(globalIndex, e.ctrlKey || e.metaKey, e.shiftKey);
                            groupEl.oncontextmenu = (e) => showMultiSelectMenu(e, globalIndex);
                            // Add drag event listeners (chỉ áp dụng cho hàng cấp cao nhất)
                            groupEl.addEventListener('dragstart', (e) => handleLayerDragStart(e, globalIndex));
                            groupEl.addEventListener('dragover', (e) => handleLayerDragOver(e));
                            groupEl.addEventListener('drop', (e) => handleLayerDrop(e, globalIndex));
                            groupEl.addEventListener('dragleave', (e) => handleLayerDragLeave(e));
                            groupEl.addEventListener('dragend', (e) => handleLayerDragEnd(e));
                        }
                        groupEl.classList.add('group-selected'); // Add group-selected class

                        layerWrapper.appendChild(groupEl);

                        // Add children container
                        if (group.children.length > 0 && isExpanded) {
                            const childrenContainer = document.createElement('div');
                            childrenContainer.style.borderLeft = '2px solid #e0e0e0';
                            renderLayerTree(childrenContainer, group.children, depth + 1);
                            layerWrapper.appendChild(childrenContainer);
                        }

                    } else {
                        // REGULAR LAYER
                        const isMultiSelected = !isNested && multiSelectedIndices.has(globalIndex);
                        const layerEl = document.createElement('div');
                        layerEl.className = `layer-item ${isActive ? 'active' : ''} ${isNested ? 'layer-item-nested' : ''} ${isMultiSelected ? 'multi-selected' : ''}`;
                        layerEl.style.position = 'relative';
                        layerEl.draggable = !isNested;
                        layerEl.dataset.layerIndex = globalIndex;

                        const visibilityAction = isNested ? `toggleLayerVisibilityById(${layer.id})` : `toggleLayerVisibility(${globalIndex})`;
                        const menuAction = isNested ? `showNestedLayerMenu(${layer.id}, event)` : `showLayerMenu(${globalIndex}, event)`;
                        const showDragHandle = !isNested && globalIndex === dragRevealIndex;

                        // Thẻ tối giản hết mức: chỉ mắt ẩn/hiện (sát trái),
                        // tên, và nút mở menu (sát phải) — không còn bấm vào
                        // tên để đổi tên trực tiếp nữa, phải qua menu ("Đổi
                        // Tên"). Nhân đôi/lên/xuống/xoá/di chuyển sang nhóm...
                        // đều nằm trong menu đó — xem showLayerMenu().
                        layerEl.innerHTML = `
                            <div class="layer-visibility" onclick="event.stopPropagation(); ${visibilityAction}">
                                <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                            </div>
                            ${showDragHandle ? `<div class="drag-handle drag-handle-visible" title="Kéo để sắp xếp lại">⋮⋮</div>` : ''}
                            <span class="layer-name-text" style="color: ${layer.color};">${escapeHtmlText(layer.name)}</span>
                            <button class="layer-menu-trigger" onclick="event.stopPropagation(); ${menuAction}" title="Tuỳ chọn">
                                <i class="fas fa-ellipsis-vertical"></i>
                            </button>
                            <div class="multi-select-badge">${multiSelectedIndices.size}</div>
                        `;

                        if (isNested) {
                            layerEl.onclick = () => selectNestedLayer(layer.id);
                        } else {
                            // Add drag event listeners (chỉ áp dụng cho hàng cấp cao nhất)
                            layerEl.addEventListener('dragstart', (e) => handleLayerDragStart(e, globalIndex));
                            layerEl.addEventListener('dragover', (e) => handleLayerDragOver(e));
                            layerEl.addEventListener('drop', (e) => handleLayerDrop(e, globalIndex));
                            layerEl.addEventListener('dragleave', (e) => handleLayerDragLeave(e));
                            layerEl.addEventListener('dragend', (e) => handleLayerDragEnd(e));

                            layerEl.onclick = (e) => selectLayer(globalIndex, e.ctrlKey || e.metaKey, e.shiftKey);
                            layerEl.oncontextmenu = (e) => showMultiSelectMenu(e, globalIndex);
                        }
                        layerWrapper.appendChild(layerEl);
                    }

                    parentElement.appendChild(layerWrapper);
                });
            }
            
            // Render tree structure
            renderLayerTree(layersList, layers, 0);

            document.getElementById('layerCount').textContent = layers.length;
            document.getElementById('currentLayerInfo').textContent = layers[activeLayerIndex]?.name || 'Không có';
        }

        function updateCurrentLayerColor() {
            const currentLayer = layers[activeLayerIndex];
            if (currentLayer) {
                // For groups, always use BLACK
                if (currentLayer.isGroup) {
                    document.documentElement.style.setProperty('--current-layer-color', '#000000');
                    
                    // Add visual indicator in header
                    const header = document.querySelector('.left-sidebar h3');
                    if (header) {
                        header.textContent = `🖤 Nhóm: ${currentLayer.name}`;
                    }
                } else {
                    const color = currentLayer.color;
                    document.documentElement.style.setProperty('--current-layer-color', color);
                    
                    // Show normal layer info
                    const header = document.querySelector('.left-sidebar h3');
                    if (header) {
                        header.textContent = `Layer: ${currentLayer.name}`;
                    }
                }
            }
        }

        function toggleGroupExpanded(groupId) {
            const group = layerGroups.find(g => g.id === groupId);
            if (group) {
                group.collapsed = !group.collapsed;
                updateLayersUI();
                showToast(`${group.collapsed ? '▶' : '▼'} Nhóm "${group.name}"`, 'info');
            }
        }

        // ===== KEYBOARD SHORTCUTS FUNCTIONS =====
        function showKeyboardShortcuts() {
            document.getElementById('shortcutsModal').classList.add('active');
            showToast('⌨️ Xem danh sách phím tắt', 'info');
        }

        function hideKeyboardShortcuts() {
            document.getElementById('shortcutsModal').classList.remove('active');
        }

        // Close shortcuts modal when clicking outside
        document.getElementById('shortcutsModal')?.addEventListener('click', function(e) {
            if (e.target === this) {
                hideKeyboardShortcuts();
            }
        });

        // ===== DRAG-AND-DROP FUNCTIONS =====
        let draggedLayerIndex = -1;
        let draggedOverIndex = -1;
        // Tay cầm kéo-thả (⋮⋮) mặc định ẩn, chỉ hiện lại cho ĐÚNG 1 hàng sau
        // khi bấm "Kéo Để Sắp Xếp" trong menu của hàng đó — xem revealDragHandle()
        // và handleLayerDragEnd() (nơi nó tự ẩn lại khi thao tác kéo kết thúc).
        let dragRevealIndex = -1;

        function revealDragHandle(index) {
            dragRevealIndex = index;
            updateLayersUI();
            showToast('🔀 Kéo biểu tượng ⋮⋮ để sắp xếp lại — bỏ tay ra là xong', 'info');
        }

        function handleLayerDragStart(e, layerIndex) {
            draggedLayerIndex = layerIndex;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target.innerHTML);
            showToast(`🎯 Đang kéo: ${layers[layerIndex].name}`, 'info');
        }

        function handleLayerDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (e.target.closest('.layer-item')) {
                const layerItem = e.target.closest('.layer-item');
                const rect = layerItem.getBoundingClientRect();
                const midpoint = rect.height / 2;
                const offsetY = e.clientY - rect.top;
                
                // Remove previous drag-over classes
                document.querySelectorAll('.layer-item').forEach(el => {
                    el.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside');
                });
                
                // Add drag-over visual feedback
                if (offsetY < midpoint) {
                    layerItem.classList.add('drag-over-before');
                } else {
                    layerItem.classList.add('drag-over-after');
                }
            }
        }

        function handleLayerDrop(e, targetIndex) {
            e.preventDefault();
            
            // Remove drag-over classes
            document.querySelectorAll('.layer-item').forEach(el => {
                el.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside');
            });
            
            if (draggedLayerIndex !== -1 && draggedLayerIndex !== targetIndex) {
                const draggedLayer = layers[draggedLayerIndex];
                const targetLayer = layers[targetIndex];
                
                // Determine insert position
                const rect = e.target.closest('.layer-item').getBoundingClientRect();
                const midpoint = rect.height / 2;
                const offsetY = e.clientY - rect.top;
                
                // Remove dragged layer
                layers.splice(draggedLayerIndex, 1);
                
                // Recalculate target index after removal
                let newTargetIndex = layers.indexOf(targetLayer);
                
                // Insert at new position
                if (offsetY < midpoint && draggedLayerIndex < targetIndex) {
                    // Dragging up
                    layers.splice(newTargetIndex, 0, draggedLayer);
                } else if (offsetY >= midpoint && draggedLayerIndex > targetIndex) {
                    // Dragging down
                    layers.splice(newTargetIndex + 1, 0, draggedLayer);
                } else if (draggedLayerIndex < targetIndex) {
                    // Dragging down
                    layers.splice(newTargetIndex + 1, 0, draggedLayer);
                } else {
                    // Dragging up
                    layers.splice(newTargetIndex, 0, draggedLayer);
                }
                
                // Update active layer index if needed
                if (activeLayerIndex === draggedLayerIndex) {
                    activeLayerIndex = layers.indexOf(draggedLayer);
                }
                
                updateLayersUI();
                renderAllLayers();
                
                showToast(`✅ "${draggedLayer.name}" được di chuyển thành công!`, 'success');
            }
            
            draggedLayerIndex = -1;
        }

        function handleLayerDragLeave(e) {
            if (!e.target.closest('.layer-item').contains(e.relatedTarget)) {
                document.querySelectorAll('.layer-item').forEach(el => {
                    el.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside');
                });
            }
        }

        function handleLayerDragEnd(e) {
            e.target.classList.remove('dragging');
            document.querySelectorAll('.layer-item').forEach(el => {
                el.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-inside', 'dragging');
            });
            draggedLayerIndex = -1;
            // Kéo xong (thả thành công hay huỷ đều bắn dragend) — ẩn lại tay
            // cầm kéo-thả, không hiện thường trực nữa.
            if (dragRevealIndex !== -1) {
                dragRevealIndex = -1;
                updateLayersUI();
            }
        }

        // ===== MULTI-SELECT BATCH OPERATIONS =====
        function clearMultiSelection() {
            multiSelectedIndices.clear();
            updateLayersUI();
            showToast('🔄 Bỏ chọn tất cả', 'info');
        }

        function deleteMultiSelected() {
            if (multiSelectedIndices.size === 0) {
                showToast('❌ Không có lớp nào được chọn!', 'error');
                return;
            }

            const names = Array.from(multiSelectedIndices).map(i => layers[i].name).join(', ');
            if (confirm(`Xoá ${multiSelectedIndices.size} lớp: ${names}?`)) {
                // Delete in reverse order to avoid index shifting
                const indicesToDelete = Array.from(multiSelectedIndices).sort((a, b) => b - a);
                indicesToDelete.forEach(index => {
                    if (layers.length > 1) {
                        layers.splice(index, 1);
                    }
                });
                
                multiSelectedIndices.clear();
                activeLayerIndex = Math.min(activeLayerIndex, layers.length - 1);
                updateLayersUI();
                renderAllLayers();
                showToast(`✅ Đã xoá ${indicesToDelete.length} lớp!`, 'success');
            }
        }

        function hideMultiSelected() {
            if (multiSelectedIndices.size === 0) {
                showToast('❌ Không có lớp nào được chọn!', 'error');
                return;
            }

            multiSelectedIndices.forEach(index => {
                layers[index].visible = false;
            });
            
            updateLayersUI();
            renderAllLayers();
            showToast(`👁️ Ẩn ${multiSelectedIndices.size} lớp`, 'success');
        }

        function showMultiSelected() {
            if (multiSelectedIndices.size === 0) {
                showToast('❌ Không có lớp nào được chọn!', 'error');
                return;
            }

            multiSelectedIndices.forEach(index => {
                layers[index].visible = true;
            });
            
            updateLayersUI();
            renderAllLayers();
            showToast(`👁️ Hiển thị ${multiSelectedIndices.size} lớp`, 'success');
        }

        function groupMultiSelected() {
            if (multiSelectedIndices.size < 1) {
                showToast('❌ Chọn ít nhất 1 lớp để tạo nhóm!', 'error');
                return;
            }

            // Open group modal with pre-selected layers
            const selectedLayersArray = Array.from(multiSelectedIndices);
            layersToGroup = new Set(selectedLayersArray);
            startGroupLayers();
        }

        function duplicateMultiSelected() {
            if (multiSelectedIndices.size === 0) {
                showToast('❌ Không có lớp nào được chọn!', 'error');
                return;
            }

            const indicesToDuplicate = Array.from(multiSelectedIndices).sort((a, b) => b - a);
            let newIndices = new Set();

            indicesToDuplicate.forEach(index => {
                const layer = layers[index];
                const duplicatedLayer = JSON.parse(JSON.stringify(layer));
                duplicatedLayer.id = Date.now() + Math.random();
                duplicatedLayer.objects = layer.objects.map(obj => JSON.parse(JSON.stringify(obj)));
                
                layers.splice(index + 1, 0, duplicatedLayer);
                newIndices.add(index + 1);
            });

            multiSelectedIndices = newIndices;
            updateLayersUI();
            renderAllLayers();
            showToast(`📋 Nhân đôi ${indicesToDuplicate.length} lớp!`, 'success');
        }

        // ===== MULTI-SELECT CONTEXT MENU HANDLERS =====
        function showMultiSelectMenu(e, layerIndex) {
            e.preventDefault();
            e.stopPropagation();

            if (multiSelectedIndices.size === 0) {
                showToast('💡 Ctrl+Click để chọn nhiều lớp', 'info');
                return;
            }

            const menu = document.getElementById('multiSelectMenu');
            menu.classList.add('active');
            
            // Position menu at cursor
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';

            showToast(`🎯 Đã chọn ${multiSelectedIndices.size} lớp - Click chuột phải để xem tùy chọn`, 'info');
        }

        function closeMultiSelectMenu() {
            // Lắng nghe click/contextmenu ở document nên vẫn chạy khi khách
            // đã rời module "Trang chủ" (không gỡ được listener một khi đã
            // gắn) — lúc đó #multiSelectMenu không còn trong trang nữa.
            const menu = document.getElementById('multiSelectMenu');
            if (!menu) return;
            menu.classList.remove('active');
        }

        // Close menu when clicking outside
        document.addEventListener('click', function() {
            closeMultiSelectMenu();
        });

        document.addEventListener('contextmenu', function() {
            closeMultiSelectMenu();
        });

        // ===== BLEND MODE & OPACITY MANAGEMENT =====
        
        // Tất cả các blend modes Photoshop
        const BLEND_MODES = [
            { name: 'normal', label: 'Bình Thường', css: 'normal' },
            { name: 'multiply', label: 'Nhân', css: 'multiply' },
            { name: 'screen', label: 'Màn Hình', css: 'screen' },
            { name: 'overlay', label: 'Phủ', css: 'overlay' },
            { name: 'darken', label: 'Làm Tối', css: 'darken' },
            { name: 'lighten', label: 'Làm Sáng', css: 'lighten' },
            { name: 'color-dodge', label: 'Color Dodge', css: 'color-dodge' },
            { name: 'color-burn', label: 'Color Burn', css: 'color-burn' },
            { name: 'hard-light', label: 'Hard Light', css: 'hard-light' },
            { name: 'soft-light', label: 'Soft Light', css: 'soft-light' },
            { name: 'difference', label: 'Chênh Lệch', css: 'difference' },
            { name: 'exclusion', label: 'Loại Trừ', css: 'exclusion' },
            { name: 'hue', label: 'Sắc Thái', css: 'hue' },
            { name: 'saturation', label: 'Độ Bão Hòa', css: 'saturation' },
            { name: 'color', label: 'Màu', css: 'color' },
            { name: 'luminosity', label: 'Độ Sáng', css: 'luminosity' },
            { name: 'add', label: 'Cộng', css: 'lighten' },
            { name: 'subtract', label: 'Trừ', css: 'darken' },
            { name: 'divide', label: 'Chia', css: 'screen' }
        ];

        let tempBlendMode = 'normal';
        let tempOpacity = 1;

        // Initialize blend mode panel
        function initBlendModePanel() {
            const grid = document.getElementById('blendModeGrid');
            if (!grid) return;
            
            grid.innerHTML = '';
            BLEND_MODES.forEach(mode => {
                const btn = document.createElement('button');
                btn.className = 'blend-mode-btn';
                btn.textContent = mode.label;
                btn.onclick = () => selectBlendMode(mode.name, mode.css);
                grid.appendChild(btn);
            });
        }

        function toggleBlendOpacityPanel() {
            const panel = document.getElementById('blendOpacityPanel');
            panel.classList.toggle('active');
            
            if (panel.classList.contains('active')) {
                updateBlendOpacityPanel();
                initBlendModePanel();
                showToast('🎨 Mở bảng điều chỉnh Blend & Opacity', 'info');
            } else {
                showToast('🎨 Đóng bảng điều chỉnh', 'info');
            }
        }

        function updateBlendOpacityPanel() {
            if (multiSelectedIndices.size > 0) {
                // Get values from first selected layer
                const firstIndex = Array.from(multiSelectedIndices)[0];
                const layer = layers[firstIndex];
                tempBlendMode = layer.blendMode || 'normal';
                tempOpacity = (layer.opacity || 1) * 100;
            } else if (activeLayerIndex >= 0 && layers[activeLayerIndex]) {
                // Get values from active layer
                const layer = layers[activeLayerIndex];
                tempBlendMode = layer.blendMode || 'normal';
                tempOpacity = (layer.opacity || 1) * 100;
            }

            // Update slider and value display
            document.getElementById('opacitySlider').value = Math.round(tempOpacity);
            document.getElementById('opacityValue').textContent = Math.round(tempOpacity) + '%';

            // Update active blend mode button
            document.querySelectorAll('.blend-mode-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.toLowerCase().includes(tempBlendMode.toLowerCase()) || 
                    (tempBlendMode === 'normal' && btn.textContent === 'Bình Thường')) {
                    btn.classList.add('active');
                }
            });
        }

        function selectBlendMode(modeName, cssMode) {
            tempBlendMode = modeName;
            
            // Update visual feedback
            document.querySelectorAll('.blend-mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            showToast(`🎨 Chế độ hòa trộn: ${event.target.textContent}`, 'info');
        }

        function updateOpacity(value) {
            tempOpacity = parseInt(value);
            document.getElementById('opacityValue').textContent = tempOpacity + '%';
        }

        function applyBlendOpacity() {
            if (multiSelectedIndices.size > 0) {
                // Apply to all multi-selected layers
                let count = 0;
                multiSelectedIndices.forEach(index => {
                    if (layers[index]) {
                        layers[index].blendMode = tempBlendMode;
                        layers[index].opacity = tempOpacity / 100;
                        count++;
                    }
                });
                showToast(`✅ Áp dụng cho ${count} lớp!`, 'success');
            } else if (activeLayerIndex >= 0 && layers[activeLayerIndex]) {
                // Apply to single active layer
                layers[activeLayerIndex].blendMode = tempBlendMode;
                layers[activeLayerIndex].opacity = tempOpacity / 100;
                showToast('✅ Áp dụng thành công!', 'success');
            }

            updateLayersUI();
            renderAllLayers();
        }

        function resetBlendOpacity() {
            tempBlendMode = 'normal';
            tempOpacity = 100;
            document.getElementById('opacitySlider').value = 100;
            document.getElementById('opacityValue').textContent = '100%';
            updateBlendOpacityPanel();
            showToast('🔄 Đặt lại thành mặc định', 'info');
        }

        // ===== UPLOAD & CANVAS FUNCTIONS =====
        function showUploadModal() {
            document.getElementById('uploadModal').classList.add('active');
        }

        function hideUploadModal() {
            document.getElementById('uploadModal').classList.remove('active');
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                fabric.Image.fromURL(e.target.result, function(img) {
                    const maxWidth = 800;
                    const maxHeight = 600;
                    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
                    
                    img.scale(scale);
                    img.set({
                        left: (canvas.width - img.width * scale) / 2,
                        top: (canvas.height - img.height * scale) / 2,
                    });

                    // Add to current layer
                    const currentLayer = layers[activeLayerIndex];
                    currentLayer.objects.push(img);
                    
                    canvas.clear();
                    
                    // Render all visible layers
                    layers.forEach(layer => {
                        if (layer.visible) {
                            layer.objects.forEach(obj => canvas.add(obj));
                        }
                    });
                    
                    canvas.renderAll();
                    hideUploadModal();
                    showToast('Ảnh đã được tải lên layer: ' + currentLayer.name, 'success');
                });
            };
            reader.readAsDataURL(file);
        }

        // initTrangChuEditor() gọi lại hàm này mỗi lần khách quay lại module —
        // gắn cờ để không cộng dồn thêm nghe-sự-kiện mỗi lần, và cả hai nghe-
        // sự-kiện đều tự bỏ qua khi module không còn hiện trên trang (khách
        // đã sang module khác — không được cướp việc kéo-thả file ở đó).
        let __trangChuDragDropBound = false;
        function setupDragAndDrop() {
            if (__trangChuDragDropBound) return;
            __trangChuDragDropBound = true;

            document.addEventListener('dragover', (e) => {
                if (!document.querySelector('.trang-chu-editor')) return;
                e.preventDefault();
            });

            document.addEventListener('drop', (e) => {
                if (!document.querySelector('.trang-chu-editor')) return;
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const event = { target: { files: files } };
                    handleImageUpload(event);
                }
            });
        }

        // ===== TOOLS =====
        function addText() {
            createNewLayer();
            const layer = layers[activeLayerIndex];
            
            const text = new fabric.Text('Nhập text', {
                left: canvas.width / 2,
                top: canvas.height / 2,
                fontSize: 24,
                fill: layer.color,
                originX: 'center',
                originY: 'center',
            });
            layer.objects.push(text);
            canvas.add(text);
            canvas.setActiveObject(text);
            canvas.renderAll();
            updateLayerBorder();
            showToast(`✏️ Thêm text vào layer mới: "${layer.name}"`, 'success');
        }

        // Trả về danh sách "lớp thật" (có objects) bên trong 1 lớp — nếu là
        // lớp thường thì trả về chính nó, nếu là nhóm thì đi sâu vào mọi lớp
        // con (kể cả nhóm lồng nhóm) để thao tác tác động cho cả nhóm.
        function getLeafLayers(layer) {
            if (!layer) return [];
            if (!layer.isGroup) return [layer];
            const group = layerGroups.find(g => g.id === layer.groupId);
            if (!group) return [];
            let result = [];
            group.children.forEach(child => {
                result = result.concat(getLeafLayers(child));
            });
            return result;
        }

        function addShape() {
            createNewLayer();
            const layer = layers[activeLayerIndex];

            const shape = new fabric.Circle({
                left: canvas.width / 2 - 50,
                top: canvas.height / 2 - 50,
                radius: 50,
                fill: layer.color,
                stroke: layer.color,
                strokeWidth: 2,
            });
            layer.objects.push(shape);
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
            updateLayerBorder();
            showToast(`✨ Thêm hình vào layer mới: "${layer.name}"`, 'success');
        }

        function rotateImage() {
            const layer = layers[activeLayerIndex];
            const targetLayers = getLeafLayers(layer);
            const hasObjects = targetLayers.some(l => l.objects.length > 0);
            if (!hasObjects) {
                showToast('Layer trống! Thêm ảnh trước', 'error');
                return;
            }

            const obj = !layer.isGroup ? canvas.getActiveObject() : null;
            if (!obj) {
                // Xoay mọi đối tượng của lớp (hoặc mọi lớp trong nhóm)
                targetLayers.forEach(l => {
                    l.objects.forEach(o => o.rotate((o.angle || 0) + 15));
                });
            } else {
                obj.rotate((obj.angle || 0) + 15);
            }

            canvas.renderAll();
            updateLayerBorder();
            showToast(`🔄 Xoay trên ${layer.name}`, 'success');
        }

        function flipImageHorizontal() {
            const layer = layers[activeLayerIndex];
            const targetLayers = getLeafLayers(layer);
            const hasObjects = targetLayers.some(l => l.objects.length > 0);
            if (!hasObjects) {
                showToast('Layer trống! Thêm ảnh trước', 'error');
                return;
            }

            const obj = !layer.isGroup ? canvas.getActiveObject() : null;
            if (!obj) {
                // Lật mọi đối tượng của lớp (hoặc mọi lớp trong nhóm)
                targetLayers.forEach(l => {
                    l.objects.forEach(o => { o.flipX = !o.flipX; });
                });
            } else {
                obj.flipX = !obj.flipX;
            }

            canvas.renderAll();
            updateLayerBorder();
            showToast(`↔️ Lật ngang trên ${layer.name}`, 'success');
        }

        // ===== CẮT ẢNH (CROP) =====
        // Cắt trên đúng lớp đang chọn: kéo khung để chọn vùng giữ lại rồi
        // bấm "Xác nhận cắt". Chỉ áp dụng cho ảnh chưa xoay (angle = 0) để
        // tránh sai lệch toạ độ khi tính khung cắt.
        let cropOverlayRect = null;
        let cropTargetImage = null;

        function cropImage() {
            const layer = layers[activeLayerIndex];
            if (!layer || layer.isGroup) {
                showToast('❌ Không thể cắt cả nhóm lớp! Vui lòng chọn một lớp riêng lẻ.', 'error');
                return;
            }
            if (cropOverlayRect) {
                showToast('Đang cắt dở, hãy Xác nhận hoặc Huỷ trước', 'info');
                return;
            }

            const obj = layer.objects.find(o => o.isType && o.isType('image'));
            if (!obj) {
                showToast('Không tìm thấy ảnh trong layer', 'error');
                return;
            }
            if (obj.angle) {
                showToast('Vui lòng đưa ảnh về góc xoay 0° trước khi cắt', 'error');
                return;
            }

            cropTargetImage = obj;
            const bounds = obj.getBoundingRect();

            cropOverlayRect = new fabric.Rect({
                left: bounds.left + bounds.width * 0.1,
                top: bounds.top + bounds.height * 0.1,
                width: bounds.width * 0.8,
                height: bounds.height * 0.8,
                fill: 'rgba(0,0,0,0.15)',
                stroke: layer.color,
                strokeWidth: 2,
                strokeDashArray: [6, 4],
                cornerColor: layer.color,
                transparentCorners: false,
                lockRotation: true,
                // Khung cắt là ngoại lệ DUY NHẤT còn cần tay cầm/viền thật
                // của Fabric — nó không có khung màu + nút riêng như layer
                // thường, người dùng phải kéo trực tiếp tay cầm bo góc để
                // chỉnh vùng cắt.
                hasControls: true,
                hasBorders: true,
            });
            cropOverlayRect.setControlsVisibility({ mtr: false });
            canvas.add(cropOverlayRect);
            canvas.setActiveObject(cropOverlayRect);
            canvas.renderAll();

            showCropConfirmBar(layer.color);
            showToast('🖼️ Kéo khung để chọn vùng cắt, rồi bấm Xác nhận cắt', 'info');
        }

        function showCropConfirmBar(color) {
            hideCropConfirmBar();
            const bar = document.createElement('div');
            bar.id = 'cropConfirmBar';
            bar.style.cssText = `
                position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
                background: #fff; border: 2px solid ${color}; border-radius: 8px;
                padding: 10px 16px; display: flex; gap: 10px; z-index: 5000;
                box-shadow: 0 4px 14px rgba(0,0,0,0.2);
            `;
            bar.innerHTML = `
                <button class="btn-modal-secondary" style="color:${color}; border-color:${color};" onclick="confirmCrop()">
                    <i class="fas fa-check"></i> Xác nhận cắt
                </button>
                <button class="btn-modal-secondary" onclick="cancelCrop()">
                    <i class="fas fa-times"></i> Huỷ cắt
                </button>
            `;
            document.body.appendChild(bar);
        }

        function hideCropConfirmBar() {
            const bar = document.getElementById('cropConfirmBar');
            if (bar) bar.remove();
        }

        function cancelCrop() {
            if (cropOverlayRect) {
                canvas.remove(cropOverlayRect);
                cropOverlayRect = null;
                cropTargetImage = null;
                canvas.renderAll();
            }
            hideCropConfirmBar();
        }

        function confirmCrop() {
            if (!cropOverlayRect || !cropTargetImage) return;

            const rectBounds = cropOverlayRect.getBoundingRect();
            const imgBounds = cropTargetImage.getBoundingRect();

            // Giao của khung cắt với ảnh, quy về hệ toạ độ chưa scale của ảnh
            const scaleX = cropTargetImage.scaleX || 1;
            const scaleY = cropTargetImage.scaleY || 1;

            const left = Math.max(rectBounds.left, imgBounds.left);
            const top = Math.max(rectBounds.top, imgBounds.top);
            const right = Math.min(rectBounds.left + rectBounds.width, imgBounds.left + imgBounds.width);
            const bottom = Math.min(rectBounds.top + rectBounds.height, imgBounds.top + imgBounds.height);

            if (right <= left || bottom <= top) {
                showToast('❌ Khung cắt nằm ngoài ảnh', 'error');
                return;
            }

            cropTargetImage.set({
                cropX: (left - imgBounds.left) / scaleX,
                cropY: (top - imgBounds.top) / scaleY,
                width: (right - left) / scaleX,
                height: (bottom - top) / scaleY,
                left: left,
                top: top,
            });
            cropTargetImage.setCoords();

            canvas.remove(cropOverlayRect);
            cropOverlayRect = null;
            cropTargetImage = null;
            hideCropConfirmBar();
            canvas.renderAll();
            updateLayerBorder();
            showToast('✅ Đã cắt ảnh', 'success');
        }

        // ===== FILTERS =====
        function applyFilter(filterType) {
            const layer = layers[activeLayerIndex];
            if (layer.isGroup) {
                showToast('❌ Không thể lọc cả nhóm lớp! Vui lòng chọn một lớp riêng lẻ.', 'error');
                return;
            }
            if (layer.objects.length === 0) {
                showToast('Layer trống! Thêm ảnh trước', 'error');
                return;
            }

            const obj = layer.objects.find(o => o.isType && o.isType('image'));
            if (!obj) {
                showToast('Không tìm thấy ảnh trong layer', 'error');
                return;
            }

            switch(filterType) {
                case 'grayscale':
                    obj.filters = [new fabric.Image.filters.Grayscale()];
                    break;
                case 'sepia':
                    obj.filters = [new fabric.Image.filters.Sepia()];
                    break;
                case 'blur':
                    obj.filters = [new fabric.Image.filters.Blur()];
                    break;
            }

            obj.applyFilters();
            canvas.renderAll();
            showToast(`Áp dụng ${filterType} trên ${layer.name}`, 'success');
        }

        // ===== ADJUSTMENTS =====
        function updateBrightness(value) {
            document.getElementById('brightnessValue').textContent = value + '%';
            const layer = layers[activeLayerIndex];
            if (!layer || layer.isGroup) return;
            const obj = layer.objects.find(o => o.isType && o.isType('image'));
            if (obj) {
                obj.filters = [new fabric.Image.filters.Brightness({ brightness: value / 100 })];
                obj.applyFilters();
                canvas.renderAll();
            }
        }

        function updateContrast(value) {
            document.getElementById('contrastValue').textContent = value + '%';
            const layer = layers[activeLayerIndex];
            if (!layer || layer.isGroup) return;
            const obj = layer.objects.find(o => o.isType && o.isType('image'));
            if (obj) {
                obj.filters = [new fabric.Image.filters.Contrast({ contrast: value / 100 })];
                obj.applyFilters();
                canvas.renderAll();
            }
        }

        function updateSaturation(value) {
            document.getElementById('saturationValue').textContent = value + '%';
            const layer = layers[activeLayerIndex];
            if (!layer || layer.isGroup) return;
            const obj = layer.objects.find(o => o.isType && o.isType('image'));
            if (obj) {
                obj.filters = [new fabric.Image.filters.Saturation({ saturation: value / 100 })];
                obj.applyFilters();
                canvas.renderAll();
            }
        }

        // ===== AI FEATURES =====
        function removeBackground() {
            const layer = layers[activeLayerIndex];
            
            // Check if group is selected
            if (layer.isGroup) {
                showToast('❌ Không thể sử dụng tính năng này cho nhóm lớp! Vui lòng chọn một lớp riêng lẻ.', 'error');
                return;
            }
            
            showLoading('Đang xoá nền trên ' + layer.name + '...');
            setTimeout(() => {
                hideLoading();
                showToast('API chưa kết nối. Thêm bước sửa trong vùng chọn...', 'info');
            }, 1500);
        }

        function showInpaintModal() {
            const layer = layers[activeLayerIndex];
            
            // Check if group is selected
            if (layer.isGroup) {
                showToast('❌ Không thể sử dụng tính năng này cho nhóm lớp! Vui lòng chọn một lớp riêng lẻ.', 'error');
                return;
            }
            
            document.getElementById('inpaintModal').classList.add('active');
        }

        function hideInpaintModal() {
            document.getElementById('inpaintModal').classList.remove('active');
        }

        function executeInpaint() {
            const layer = layers[activeLayerIndex];
            
            // Check if group is selected
            if (layer.isGroup) {
                showToast('❌ Không thể sử dụng tính năng này cho nhóm lớp! Vui lòng chọn một lớp riêng lẻ.', 'error');
                hideInpaintModal();
                return;
            }
            
            const prompt = document.getElementById('inpaintPrompt').value;
            if (!prompt) {
                showToast('Nhập mô tả vùng cần sửa', 'error');
                return;
            }

            const currentLayerIndex = activeLayerIndex;
            const currentLayerName = layers[currentLayerIndex].name;
            showLoading(`Đang sửa vùng trên ${currentLayerName}...`);
            hideInpaintModal();

            // Simulate inpainting API call
            setTimeout(() => {
                hideLoading();
                
                // Create new layer for inpaint result (but don't select it)
                const newLayer = {
                    id: Date.now(),
                    name: `Sửa từ ${currentLayerName}`,
                    color: LAYER_COLORS[(layers.length) % LAYER_COLORS.length],
                    visible: true,
                    objects: [],
                    opacity: 1,
                    fromInpaint: true
                };
                layers.push(newLayer);
                
                // Keep current layer selected
                activeLayerIndex = currentLayerIndex;
                updateLayersUI();
                updateCurrentLayerColor();
                
                showToast(`✅ Sửa xong! Layer mới: "${newLayer.name}"\n💡 Layer hiện tại vẫn là: ${currentLayerName}\n📝 Có thể bấm "Sửa Vùng" lại để thêm nhiều lần!`, 'success');
            }, 2000);
        }

        function upscaleImage() {
            const layer = layers[activeLayerIndex];
            
            // Check if group is selected
            if (layer.isGroup) {
                showToast('❌ Không thể sử dụng tính năng này cho nhóm lớp! Vui lòng chọn một lớp riêng lẻ.', 'error');
                return;
            }
            
            showLoading('Đang nâng cấp độ phân giải trên ' + layer.name + '...');
            setTimeout(() => {
                hideLoading();
                showToast('API chưa kết nối', 'info');
            }, 1500);
        }

        // ===== LAYER SELECTION BORDER & CONTROLS =====
        // Lỗi cũ: khung viền lệch khỏi ảnh của layer, càng lệch rõ khi
        // phóng to/thu nhỏ. Có 2 nguyên nhân cộng lại:
        // 1) obj.getBoundingRect() (không truyền absolute=true) đã TỰ áp
        //    dụng viewportTransform của canvas — tức đã NHÂN sẵn currentZoom
        //    rồi. Nhân thêm currentZoom lần nữa ở đây là nhân đúp.
        // 2) Thẻ #layerBorder định vị absolute theo .canvas-container, còn
        //    canvas thật lại nằm lệch bên trong đó (có thanh công cụ phía
        //    trên + canh giữa flexbox), và kích thước canvas HIỂN THỊ (CSS,
        //    do max-width/max-height: 100%) khác kích thước PIXEL NỘI BỘ
        //    của nó (thuộc tính width/height, 800x600) — toạ độ fabric trả
        //    về tính theo pixel nội bộ, phải quy đổi sang đúng tỉ lệ đang
        //    hiển thị mới khớp ảnh thật trên màn hình.
        // Trả về danh sách "lớp thật" (có objects) cần vẽ khung viền quanh
        // ảnh của chúng trên canvas, ứng với lựa chọn hiện tại ở panel Layer:
        // - Chọn 1 lớp thường: đúng lớp đó (1 khung, có đủ nút điều khiển).
        // - Chọn 1 NHÓM: TẤT CẢ lớp con của nhóm (đệ quy, kể cả nhóm lồng
        //   trong nhóm) — mỗi lớp một khung riêng theo đúng màu của nó, để
        //   người dùng thấy ngay những ảnh nào thuộc nhóm và bấm chọn từng
        //   ảnh trên canvas. Các khung này KHÔNG có nút điều khiển riêng —
        //   mô hình thao tác hiện tại của toàn bộ ứng dụng coi "nhóm" là một
        //   khối, muốn chỉnh riêng 1 lớp con vẫn phải bỏ nhóm trước (xem
        //   selectNestedLayer()); khung ở đây chỉ để NHẬN DIỆN, không phải
        //   để chỉnh.
        function layTargetKhungVienLayer() {
            const layer = layers[activeLayerIndex];
            if (!layer) return [];
            if (layer.isGroup) {
                const group = layerGroups.find(g => g.id === layer.groupId);
                if (!group) return [];
                return flattenLayersForRender(group.children)
                    .map(({ layer: l }) => l)
                    .filter(l => l.objects && l.objects.length > 0);
            }
            return layer.objects && layer.objects.length > 0 ? [layer] : [];
        }

        // Trả về hình chữ nhật (đã xoay) khít bao quanh mọi object của layer,
        // theo đúng góc xoay CHUNG của chúng — dùng để khung viền màu xoay
        // đồng bộ y hệt ảnh thay vì luôn nằm ngang (trường hợp phổ biến nhất:
        // layer chỉ có 1 object, luôn có "góc chung" = góc của chính nó).
        // Trả về null nếu các object trong layer có góc xoay KHÁC nhau (không
        // có 1 góc chung để xoay khung theo) — khi đó updateLayerBorder() tự
        // quay lại cách tính hộp bao thẳng trục (AABB) như trước.
        function tinhKhungXoayLayer(layer) {
            if (!layer.objects || layer.objects.length === 0) return null;
            const theta = layer.objects[0].angle || 0;
            const cungGoc = layer.objects.every(o => Math.abs((o.angle || 0) - theta) < 0.01);
            if (!cungGoc) return null;

            // Lỗi cũ: dùng "obj.left + w/2, obj.top + h/2" làm tâm object —
            // SAI khi object đã xoay. Fabric mặc định originX/Y='left'/'top'
            // nghĩa là left/top neo một điểm CỐ ĐỊNH không đổi theo góc xoay,
            // còn tâm hình học THẬT lại quay quanh điểm neo đó theo góc —
            // "left + w/2" chỉ đúng khi angle=0. Phải dùng obj.getCenterPoint()
            // (API chính thức của Fabric, tự xử lý đúng phép xoay quanh gốc
            // originX/Y) để ra đúng tâm thật ở MỌI góc xoay.
            //
            // Đưa tâm THẬT của từng object về hệ trục "đã xoay ngược -theta"
            // — trong hệ này mọi object nằm thẳng trục (vì góc riêng của nó
            // đã bị trừ hết), hộp bao của cả layer trong hệ này là 1 AABB
            // bình thường quanh các tâm đã xoay.
            const rad = -theta * Math.PI / 180;
            const cosT = Math.cos(rad), sinT = Math.sin(rad);
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            layer.objects.forEach(obj => {
                const center = obj.getCenterPoint();
                const w = obj.getScaledWidth();
                const h = obj.getScaledHeight();
                const localCx = center.x * cosT - center.y * sinT;
                const localCy = center.x * sinT + center.y * cosT;
                minX = Math.min(minX, localCx - w / 2);
                minY = Math.min(minY, localCy - h / 2);
                maxX = Math.max(maxX, localCx + w / 2);
                maxY = Math.max(maxY, localCy + h / 2);
            });
            if (!isFinite(minX)) return null;

            const localCenterX = (minX + maxX) / 2;
            const localCenterY = (minY + maxY) / 2;
            // Xoay tâm đã gộp NGƯỢC LẠI (+theta) để ra đúng toạ độ THẬT trên canvas.
            const rad2 = theta * Math.PI / 180;
            const cos2 = Math.cos(rad2), sin2 = Math.sin(rad2);
            const cx = localCenterX * cos2 - localCenterY * sin2;
            const cy = localCenterX * sin2 + localCenterY * cos2;

            return { theta, cx, cy, width: maxX - minX, height: maxY - minY };
        }

        function updateLayerBorder() {
            const container = document.querySelector('.trang-chu-editor .canvas-container');
            if (!container || !canvas) return;

            const targets = layTargetKhungVienLayer();
            const targetIds = new Set(targets.map(l => String(l.id)));

            // Khung của lớp không còn liên quan (đổi lựa chọn, hoặc lớp/nhóm
            // đó vừa bị xoá) — dọn khỏi DOM thay vì chỉ ẩn, vì số khung cần
            // hiện thay đổi tuỳ theo đang chọn 1 lớp hay cả 1 nhóm.
            container.querySelectorAll('.canvas-layer-border').forEach(el => {
                if (!targetIds.has(el.dataset.layerId)) el.remove();
            });

            if (targets.length === 0) return;

            const canvasEl = canvas.getElement();
            const canvasRect = canvasEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const cssScaleX = canvasRect.width / canvas.getWidth();
            const cssScaleY = canvasRect.height / canvas.getHeight();
            const offsetX = canvasRect.left - containerRect.left;
            const offsetY = canvasRect.top - containerRect.top;

            // Chỉ lớp ĐANG là activeLayerIndex thật sự (không phải một lớp
            // con được "kéo theo" vì nằm trong nhóm đang chọn) mới là khung
            // "chính" — được gắn đủ nút xoá/nhân đôi/xoay/tay cầm resize.
            const layerDangChonThat = layers[activeLayerIndex];

            targets.forEach(layer => {
                // Ưu tiên hộp bao ĐÃ XOAY theo góc chung của layer (nếu có)
                // — khung viền màu xoay đồng bộ y hệt ảnh. Không có góc
                // chung (các object trong layer xoay khác nhau — hiếm gặp)
                // thì quay lại hộp bao thẳng trục (AABB) như trước, theta=0.
                const khungXoay = tinhKhungXoayLayer(layer);
                let cx, cy, boxWidth, boxHeight, theta;
                if (khungXoay) {
                    ({ cx, cy, width: boxWidth, height: boxHeight, theta } = khungXoay);
                    // tinhKhungXoayLayer() dùng getCenterPoint()/getScaledWidth()
                    // — toạ độ OBJECT-SPACE, không hề biết tới canvas.setZoom()
                    // (khác obj.getBoundingRect() ở nhánh else bên dưới, tự
                    // ÁP SẴN viewportTransform/zoom). Bấm nút phóng to/thu nhỏ
                    // (canvas.setZoom()) chỉ đổi CÁCH VẼ, không đổi left/top/
                    // scale thật của object — nên centerPoint vẫn nguyên như
                    // cũ, phải tự nhân thêm zoom ở đây để khớp lại đúng pixel
                    // đang hiển thị, nếu không khung sẽ lệch hẳn ngay khi zoom
                    // khác 100%.
                    const zoom = canvas.getZoom();
                    cx *= zoom; cy *= zoom; boxWidth *= zoom; boxHeight *= zoom;
                } else {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    layer.objects.forEach(obj => {
                        // getBoundingRect(absolute, calculate) — calculate=false
                        // (mặc định) trả về toạ độ CACHE (oCoords/aCoords), CHỈ
                        // được Fabric tự cập nhật ở vài mốc nhất định (ví dụ lúc
                        // thả chuột/'object:modified'), KHÔNG cập nhật liên tục
                        // trong lúc đang kéo — dù obj.left/top đã đổi từng khung
                        // hình. Truyền calculate=true để ép tính lại theo vị trí
                        // THẬT ngay tại thời điểm gọi — khớp với updateLayerBorder()
                        // giờ chạy liên tục trong object:moving/scaling/rotating.
                        const bounds = obj.getBoundingRect(false, true);
                        minX = Math.min(minX, bounds.left);
                        minY = Math.min(minY, bounds.top);
                        maxX = Math.max(maxX, bounds.left + bounds.width);
                        maxY = Math.max(maxY, bounds.top + bounds.height);
                    });
                    if (!isFinite(minX)) return;
                    cx = (minX + maxX) / 2;
                    cy = (minY + maxY) / 2;
                    boxWidth = maxX - minX;
                    boxHeight = maxY - minY;
                    theta = 0;
                }

                const layerId = String(layer.id);
                let border = container.querySelector(`.canvas-layer-border[data-layer-id="${layerId}"]`);
                if (!border) {
                    border = document.createElement('div');
                    border.className = 'canvas-layer-border';
                    border.dataset.layerId = layerId;
                    container.appendChild(border);
                }

                const screenWidth = boxWidth * cssScaleX;
                const screenHeight = boxHeight * cssScaleY;
                const screenCenterX = offsetX + cx * cssScaleX;
                const screenCenterY = offsetY + cy * cssScaleY;
                border.style.left = (screenCenterX - screenWidth / 2) + 'px';
                border.style.top = (screenCenterY - screenHeight / 2) + 'px';
                border.style.width = screenWidth + 'px';
                border.style.height = screenHeight + 'px';
                // transform-origin mặc định là tâm phần tử (50% 50%) — khớp
                // đúng tâm layer vừa tính, nên chỉ cần rotate() quanh chính nó.
                border.style.transform = theta ? `rotate(${theta}deg)` : '';
                border.style.borderColor = layer.color;
                border.classList.add('visible');

                const laKhungChinh = layer === layerDangChonThat;
                border.classList.toggle('canvas-layer-border-chinh', laKhungChinh);

                if (laKhungChinh) {
                    // Chỉ dựng lại nút góc + tay cầm khi ĐỔI lớp (hoặc lần
                    // đầu hiện khung) — updateLayerBorder() giờ còn chạy liên
                    // tục lúc kéo/co giãn/xoay object, dựng lại DOM nút mỗi
                    // khung hình sẽ giật và làm gãy thao tác đang kéo dở.
                    if (border.dataset.hasControls !== '1') {
                        addLayerControlButtons(border, layer.color);
                        border.dataset.hasControls = '1';
                    }
                    // Khung xoay theo layer, nhưng 4 nút góc phải LUÔN đứng
                    // thẳng — xoay ngược lại đúng góc đó (quanh tâm CHÍNH nó,
                    // transform-origin mặc định), để phần icon bên trong
                    // không bị nghiêng theo dù vị trí của nút vẫn di chuyển
                    // theo khung cha (do nằm trong phần tử border đã xoay).
                    // Cập nhật mỗi lần gọi (kể cả lúc đang kéo xoay), không
                    // chỉ lúc dựng nút — góc đổi liên tục trong khi kéo.
                    border.querySelectorAll('.layer-control-btn').forEach(btn => {
                        btn.style.transform = theta ? `rotate(${-theta}deg)` : '';
                    });
                    // Con trỏ chuột của 4 tay cầm kéo cạnh: mũi tên 2 đầu
                    // luôn chỉ đúng hướng về phía điểm neo ĐỐI DIỆN — trục
                    // ngang cục bộ (tay cầm trái/phải) nằm dọc theo góc theta,
                    // trục dọc cục bộ (tay cầm trên/dưới) lệch thêm 90°. Cập
                    // nhật mỗi lần gọi (kể cả đang xoay dở) vì CSS cursor
                    // không tự xoay theo transform của phần tử — phải tự vẽ
                    // lại ảnh mũi tên đã xoay đúng góc.
                    border.querySelectorAll('.resize-handle').forEach(handle => {
                        const gocConTro = handle.dataset.axis === 'y' ? theta + 90 : theta;
                        handle.style.cursor = taoConTroMuiTenXoay(gocConTro);
                    });
                } else if (border.dataset.hasControls === '1') {
                    // Khung "kéo theo" (thuộc nhóm đang chọn nhưng không phải
                    // lớp chính) không có nút — dọn nút cũ nếu lớp này VỪA
                    // TỪ khung chính chuyển thành khung phụ (đổi lựa chọn
                    // trong cùng 1 nhóm).
                    border.querySelectorAll('.layer-control-btn, .resize-handle').forEach(el => el.remove());
                    border.dataset.hasControls = '0';
                }
            });
        }

        // CSS "cursor" KHÔNG tự xoay theo transform: rotate() của phần tử
        // đang hiển thị nó — con trỏ n-resize/e-resize... của trình duyệt
        // luôn đứng thẳng trên màn hình bất kể khung cha xoay bao nhiêu độ.
        // Muốn con trỏ "mũi tên 2 đầu" luôn chỉ đúng hướng điểm neo đối diện
        // (dù ảnh/khung xoay góc nào), phải TỰ VẼ một ảnh con trỏ đã xoay
        // sẵn đúng góc đó (SVG, nhúng thẳng qua data URI) — trình duyệt
        // không có cách nào "xoay hộ" một cursor tên có sẵn.
        function taoConTroMuiTenXoay(gocDo) {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
                `<g transform="rotate(${gocDo} 14 14)">` +
                `<line x1="3" y1="14" x2="25" y2="14" stroke="white" stroke-width="4" stroke-linecap="round"/>` +
                `<line x1="3" y1="14" x2="25" y2="14" stroke="black" stroke-width="1.6" stroke-linecap="round"/>` +
                `<polygon points="3,14 9,9 9,19" fill="black" stroke="white" stroke-width="1"/>` +
                `<polygon points="25,14 19,9 19,19" fill="black" stroke="white" stroke-width="1"/>` +
                `</g></svg>`;
            const daMaHoa = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
            return `url("data:image/svg+xml,${daMaHoa}") 14 14, pointer`;
        }

        function addLayerControlButtons(border, color) {
            // Xoá nút góc VÀ điểm kéo cạnh cũ trước khi vẽ lại — updateLayerBorder()
            // (gọi hàm này) chạy rất thường xuyên (mỗi lần object di chuyển/co
            // giãn/đổi zoom...); trước đây chỉ xoá '.layer-control-btn' mà bỏ sót
            // '.resize-handle', nên mỗi lần vẽ lại lại chồng thêm 4 điểm kéo mới —
            // các điểm chồng lên nhau khiến một thao tác kéo cộng dồn delta của
            // nhiều điểm cùng lúc (co giãn nhanh bất thường).
            document.querySelectorAll('.layer-control-btn').forEach(btn => btn.remove());
            document.querySelectorAll('.resize-handle').forEach(handle => handle.remove());

            const positions = {
                'delete': { top: '-16px', left: '-16px', icon: 'fa-trash' },
                'duplicate': { top: '-16px', right: '-16px', icon: 'fa-copy' },
                'rotate': { bottom: '-16px', left: '-16px', icon: 'fa-rotate-right' },
                // Mũi tên 2 đầu chéo, 1 đầu chĩa vào tâm — đúng biểu tượng
                // "kéo để phóng to/thu nhỏ" quen thuộc (không phải fa-expand,
                // vốn là 4 mũi tên rời góc, dễ hiểu lầm là "toàn màn hình").
                'scale': { bottom: '-16px', right: '-16px', icon: 'fa-up-right-and-down-left-from-center' }
            };

            Object.entries(positions).forEach(([action, pos]) => {
                const btn = document.createElement('button');
                btn.className = 'layer-control-btn layer-corner-btn';
                btn.style.borderColor = color;
                btn.style.color = color;
                btn.innerHTML = `<i class="fas ${pos.icon}"></i>`;

                if (pos.top) btn.style.top = pos.top;
                if (pos.bottom) btn.style.bottom = pos.bottom;
                if (pos.left) btn.style.left = pos.left;
                if (pos.right) btn.style.right = pos.right;

                if (action === 'scale') {
                    // Không phải một cú bấm — phải KÉO: giữ chuột trên nút
                    // rồi rê ra xa tâm ảnh để phóng to, rê vào gần tâm để
                    // thu nhỏ, đều tất cả các cạnh cùng lúc.
                    btn.style.cursor = 'nwse-resize';
                    btn.onmousedown = (e) => {
                        e.stopPropagation();
                        handleLayerScale(e);
                    };
                } else if (action === 'rotate') {
                    // Cũng là nút KÉO, không phải bấm: giữ chuột rồi xoay
                    // quanh tâm layer, ảnh xoay đồng bộ theo chuột.
                    btn.style.cursor = 'grab';
                    btn.onmousedown = (e) => {
                        e.stopPropagation();
                        handleLayerRotate(e);
                    };
                } else {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        handleLayerControlAction(action);
                    };
                }

                border.appendChild(btn);
            });

            // 4 tay cầm kéo cạnh — vị trí (n/s/e/w) chỉ còn quyết định NƠI
            // đặt trên khung, không còn quyết định "hướng kéo" nữa (xem
            // handleLayerResize()): 'n'/'s' cùng thao tác trên TRỤC DỌC cục
            // bộ của layer, 'e'/'w' cùng thao tác trên TRỤC NGANG cục bộ —
            // vì vậy cả 2 tay cầm cùng trục dùng CHUNG axis ('y' hoặc 'x'),
            // không còn phân biệt trái/phải/trên/dưới khi tính toán.
            const handlePositions = [
                { name: 'n', top: '-5px', left: '50%', axis: 'y' },
                { name: 's', bottom: '-5px', left: '50%', axis: 'y' },
                { name: 'w', top: '50%', left: '-5px', axis: 'x' },
                { name: 'e', top: '50%', right: '-5px', axis: 'x' },
            ];

            handlePositions.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.dataset.axis = pos.axis;
                handle.style.borderColor = color;
                handle.style.background = color;

                if (pos.top) handle.style.top = pos.top;
                if (pos.bottom) handle.style.bottom = pos.bottom;
                if (pos.left) handle.style.left = pos.left;
                if (pos.right) handle.style.right = pos.right;

                handle.style.transform = 'translate(-50%, -50%)';

                handle.onmousedown = (e) => {
                    e.stopPropagation();
                    handleLayerResize(e, pos.axis);
                };

                border.appendChild(handle);
            });
        }

        function handleLayerControlAction(action) {
            const layerIndex = activeLayerIndex;

            switch(action) {
                case 'delete':
                    deleteLayer(layerIndex);
                    break;
                case 'duplicate':
                    duplicateLayer(layerIndex);
                    break;
            }
        }

        // Nút xoay — kéo (không bấm): giữ chuột trên nút rồi rê quanh tâm
        // layer, mọi object trong layer xoay đồng bộ theo góc con trỏ vừa
        // quét được (CHỈ xoay, không đổi kích thước). Cùng cách tính tâm
        // dùng chung như handleLayerScale() (tâm khung bao TOÀN BỘ layer),
        // và cùng xoay các object quanh tâm đó như 1 khối cứng — vị trí
        // tương đối giữa chúng không đổi, khớp với cách khung viền màu vẫn
        // luôn bao quanh cả layer chứ không phải từng object riêng lẻ.
        function handleLayerRotate(e) {
            const layer = layers[activeLayerIndex];
            if (!layer || !layer.objects || layer.objects.length === 0) {
                showToast('Layer trống!', 'error');
                return;
            }

            // Tâm xoay chung: ưu tiên tâm khung ĐÃ XOAY (tinhKhungXoayLayer,
            // dùng getCenterPoint() thật của Fabric — xem chú thích ở đó vì
            // sao "left+w/2" sai khi object đã xoay); không có góc chung thì
            // quay lại AABB thẳng trục như trước.
            const khungXoayGoc = tinhKhungXoayLayer(layer);
            let centerX, centerY;
            if (khungXoayGoc) {
                centerX = khungXoayGoc.cx;
                centerY = khungXoayGoc.cy;
            } else {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                layer.objects.forEach(obj => {
                    const b = obj.getBoundingRect(false, true);
                    minX = Math.min(minX, b.left);
                    minY = Math.min(minY, b.top);
                    maxX = Math.max(maxX, b.left + b.width);
                    maxY = Math.max(maxY, b.top + b.height);
                });
                centerX = (minX + maxX) / 2;
                centerY = (minY + maxY) / 2;
            }

            // Chụp lại TÂM THẬT (getCenterPoint(), không phải left/top) và
            // góc gốc của từng object — mọi phép xoay bên dưới tính từ đây,
            // không cộng dồn từng khung hình.
            const trangThaiGoc = layer.objects.map(obj => {
                const c = obj.getCenterPoint();
                return { obj, centerX: c.x, centerY: c.y, angle: obj.angle || 0 };
            });

            const canvasRectGoc = canvas.getElement().getBoundingClientRect();
            const cssScaleXGoc = canvasRectGoc.width / canvas.getWidth();
            const cssScaleYGoc = canvasRectGoc.height / canvas.getHeight();
            // Chia thêm cho canvas.getZoom(): (clientX-canvasRect.left)/cssScale
            // ra toạ độ PIXEL đang hiển thị trên canvas (đã gồm zoom bấm nút +/-
            // ở thanh công cụ trên cùng), còn centerX/centerY (từ getCenterPoint())
            // lại là toạ độ OBJECT-SPACE — không hề đổi theo zoom đó. Thiếu bước
            // quy đổi này thì mọi phép tính góc/khoảng cách sai lệch ngay khi
            // zoom khác 100%.
            const zoomGoc = canvas.getZoom();
            const startCanvasX = (e.clientX - canvasRectGoc.left) / cssScaleXGoc / zoomGoc;
            const startCanvasY = (e.clientY - canvasRectGoc.top) / cssScaleYGoc / zoomGoc;
            // Góc BAN ĐẦU từ tâm tới con trỏ — mọi lần di chuyển sau đó chỉ
            // cần trừ đi góc này để ra đúng phần góc đã xoay THÊM, rồi cộng
            // thẳng vào góc GỐC của từng object (không cộng dồn từng khung
            // hình, tránh lỗi delta cộng dồn đã từng gặp ở tay cầm cạnh).
            const startAngle = Math.atan2(startCanvasY - centerY, startCanvasX - centerX) * 180 / Math.PI;

            const onMouseMove = (moveEvent) => {
                const canvasRect = canvas.getElement().getBoundingClientRect();
                const cssScaleX = canvasRect.width / canvas.getWidth();
                const cssScaleY = canvasRect.height / canvas.getHeight();
                const zoom = canvas.getZoom();
                const curX = (moveEvent.clientX - canvasRect.left) / cssScaleX / zoom;
                const curY = (moveEvent.clientY - canvasRect.top) / cssScaleY / zoom;
                const curAngle = Math.atan2(curY - centerY, curX - centerX) * 180 / Math.PI;
                const deltaDeg = curAngle - startAngle;
                const rad = deltaDeg * Math.PI / 180;
                const cosD = Math.cos(rad), sinD = Math.sin(rad);

                trangThaiGoc.forEach(({ obj, centerX: ocx, centerY: ocy, angle }) => {
                    // Xoay TÂM THẬT của object quanh tâm chung layer (quỹ
                    // đạo), cộng với xoay CHÍNH object đó cùng 1 góc (spin
                    // tại chỗ) — cả layer xoay như 1 khối cứng duy nhất.
                    const relX = ocx - centerX;
                    const relY = ocy - centerY;
                    const newCenterX = centerX + (relX * cosD - relY * sinD);
                    const newCenterY = centerY + (relX * sinD + relY * cosD);
                    // Đặt góc TRƯỚC rồi mới setPositionByOrigin() — hàm đó
                    // dùng chính obj.angle hiện tại để tính lại left/top cho
                    // đúng tâm mong muốn (xem chú thích ở tinhKhungXoayLayer
                    // về lý do không thể tự gán left/top bằng tay).
                    obj.angle = angle + deltaDeg;
                    obj.setPositionByOrigin(new fabric.Point(newCenterX, newCenterY), 'center', 'center');
                    obj.setCoords();
                });
                canvas.renderAll();
                updateLayerBorder();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                showToast('Đã xoay layer', 'success');
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        // Thiết kế lại hoàn toàn (bản cũ coi 4 tay cầm là 4 hướng màn hình
        // n/s/e/w riêng biệt, tính bằng deltaX/deltaY thô — sai hẳn khi ảnh
        // đã xoay, vì "sang phải trên màn hình" không còn là "theo trục
        // ngang của ảnh" nữa). Logic mới:
        //
        // - Không còn phân biệt trái/phải/trên/dưới — chỉ còn 2 TRỤC CỤC BỘ
        //   của layer (trục ngang cho tay cầm trái/phải, trục dọc cho tay
        //   cầm trên/dưới), lấy nguyên từ tinhKhungXoayLayer() (đã tính đúng
        //   góc theta chung của layer). Tay cầm bên NÀO không quan trọng —
        //   "điểm neo đối diện" (đầu kia của trục) luôn đứng yên, còn cạnh
        //   đang kéo bám theo hình chiếu của con trỏ LÊN đúng trục đó.
        // - Độ dài mới dọc trục = khoảng cách (có dấu) từ điểm neo đối diện
        //   tới con trỏ. Âm nghĩa là con trỏ đã vượt QUA điểm neo đối diện
        //   sang phía bên kia — tự nhiên cho ra scale ÂM, tức ẢNH BỊ LẬT
        //   (Fabric hỗ trợ scale âm = lật ảnh sẵn), không cần code riêng.
        // - Nén tối thiểu: |độ dài mới| bị chặn dưới ở một ngưỡng px rất nhỏ
        //   (không bao giờ về 0). Hệ quả tự nhiên của việc CHẶN DƯỚI một đại
        //   lượng CÓ DẤU ngay tại lúc dấu đổi: ảnh nén dần tới ngưỡng đó rồi
        //   đứng yên (không nén thêm được), con trỏ đi tiếp qua khỏi điểm
        //   neo thì NGAY LẬP TỨC nhảy sang ngưỡng đối xứng bên kia (lật), rồi
        //   giãn tiếp bình thường — đúng ý muốn, không cần if/else riêng cho
        //   "lúc nào thì lật".
        function handleLayerResize(e, axis) {
            const layer = layers[activeLayerIndex];
            if (!layer || !layer.objects || layer.objects.length === 0) return;

            // Khung tham chiếu (tâm + kích thước THEO GÓC XOAY chung của cả
            // layer) — không có góc chung (hiếm) thì quay lại AABB thẳng
            // trục (theta=0) như logic cũ, coi như layer chưa xoay.
            const khungXoay = tinhKhungXoayLayer(layer);
            let theta, tamX, tamY, rongGoc, caoGoc;
            if (khungXoay) {
                ({ theta, cx: tamX, cy: tamY, width: rongGoc, height: caoGoc } = khungXoay);
            } else {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                layer.objects.forEach(obj => {
                    const b = obj.getBoundingRect(false, true);
                    minX = Math.min(minX, b.left); minY = Math.min(minY, b.top);
                    maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height);
                });
                theta = 0; tamX = (minX + maxX) / 2; tamY = (minY + maxY) / 2;
                rongGoc = maxX - minX; caoGoc = maxY - minY;
            }

            const rad = theta * Math.PI / 180;
            // Vector đơn vị của trục NGANG cục bộ (ex) và trục DỌC cục bộ
            // (ey) trong hệ toạ độ THẾ GIỚI — chính là trục x/y gốc của
            // layer sau khi xoay theta độ.
            const ex = { x: Math.cos(rad), y: Math.sin(rad) };
            const ey = { x: -Math.sin(rad), y: Math.cos(rad) };
            const truc = axis === 'y' ? ey : ex; // trục ĐANG co giãn
            const trucVuongGoc = axis === 'y' ? ex : ey; // trục còn lại, giữ nguyên
            const doDaiGoc = axis === 'y' ? caoGoc : rongGoc;

            // Điểm neo = đầu kia của trục (phía ÂM), luôn đứng yên trong
            // suốt thao tác — không phải "cạnh trái" hay "cạnh trên" cụ thể,
            // mà là "đầu đối diện với hướng con trỏ đang kéo ra".
            const diemNeo = {
                x: tamX - truc.x * doDaiGoc / 2,
                y: tamY - truc.y * doDaiGoc / 2,
            };

            // NGƯỠNG NÉN TỐI THIỂU: quy ra px NỘI BỘ canvas, càng nhỏ càng
            // cho phép nén càng hẹp (theo đúng yêu cầu "mức nén càng hẹp
            // càng tốt") — 4px là còn nhìn thấy được, không về 0 tuyệt đối
            // (0 sẽ làm scale chia cho 0 / vô nghĩa hình học).
            const NGUONG_NEN_PX = 4;

            // Chụp lại trạng thái GỐC của từng object — mọi phép tính trong
            // lúc kéo đều tính lại từ đây (nhân theo TỈ LỆ hiện tại), không
            // cộng dồn từng khung hình.
            const trangThaiGoc = layer.objects.map((obj) => {
                const c = obj.getCenterPoint();
                return {
                    obj, centerX: c.x, centerY: c.y,
                    scaleX: obj.scaleX, scaleY: obj.scaleY,
                };
            });

            const onMouseMove = (moveEvent) => {
                const canvasRect = canvas.getElement().getBoundingClientRect();
                const cssScaleX = canvasRect.width / canvas.getWidth();
                const cssScaleY = canvasRect.height / canvas.getHeight();
                // Chia thêm cho canvas.getZoom() để quy đổi từ toạ độ PIXEL
                // đang hiển thị (đã gồm zoom bấm nút +/-) về đúng OBJECT-SPACE
                // — cùng hệ toạ độ với diemNeo/tamX/tamY (từ getCenterPoint()),
                // vốn không đổi theo zoom.
                const zoom = canvas.getZoom();
                const mouseX = (moveEvent.clientX - canvasRect.left) / cssScaleX / zoom;
                const mouseY = (moveEvent.clientY - canvasRect.top) / cssScaleY / zoom;

                // Chiếu vector (điểm neo -> con trỏ) lên trục cục bộ — đây
                // chính là "độ dài mới dọc trục", CÓ DẤU: dương là con trỏ
                // còn ở đúng phía cũ (chưa lật), âm là đã vượt qua điểm neo
                // sang phía đối diện (đã lật).
                let doDaiMoi = (mouseX - diemNeo.x) * truc.x + (mouseY - diemNeo.y) * truc.y;
                if (Math.abs(doDaiMoi) < NGUONG_NEN_PX) {
                    doDaiMoi = (doDaiMoi < 0 ? -1 : 1) * NGUONG_NEN_PX;
                }
                const ti_le = doDaiMoi / doDaiGoc;

                trangThaiGoc.forEach(({ obj, centerX: ocx, centerY: ocy, scaleX, scaleY }) => {
                    // Toạ độ tâm object, biểu diễn theo (khoảng cách dọc trục
                    // ĐANG co giãn, khoảng cách dọc trục VUÔNG GÓC) tính từ
                    // điểm neo — trục vuông góc GIỮ NGUYÊN (không đụng tới),
                    // chỉ trục đang kéo co giãn theo ti_le.
                    const relX = ocx - diemNeo.x;
                    const relY = ocy - diemNeo.y;
                    const docTruc = relX * truc.x + relY * truc.y;
                    const vuongGoc = relX * trucVuongGoc.x + relY * trucVuongGoc.y;
                    const docTrucMoi = docTruc * ti_le;

                    const newCenterX = diemNeo.x + docTrucMoi * truc.x + vuongGoc * trucVuongGoc.x;
                    const newCenterY = diemNeo.y + docTrucMoi * truc.y + vuongGoc * trucVuongGoc.y;

                    if (axis === 'y') {
                        obj.scaleY = scaleY * ti_le;
                    } else {
                        obj.scaleX = scaleX * ti_le;
                    }
                    obj.setPositionByOrigin(new fabric.Point(newCenterX, newCenterY), 'center', 'center');
                    obj.setCoords();
                });
                canvas.renderAll();
                updateLayerBorder();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                showToast('Đã điều chỉnh kích thước layer', 'success');
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        // Nút "zoom" ở góc khung viền (icon mũi tên 2 đầu chéo) — kéo RA xa
        // tâm ảnh để phóng to, kéo VÀO gần tâm để thu nhỏ, đều tất cả các
        // cạnh cùng lúc (khác 4 tay cầm ở giữa cạnh — handleLayerResize —
        // vốn chỉ co giãn 1 chiều và neo cạnh đối diện đứng im).
        function handleLayerScale(e) {
            const layer = layers[activeLayerIndex];
            if (!layer || !layer.objects || layer.objects.length === 0) {
                showToast('Layer trống!', 'error');
                return;
            }

            // Tâm co giãn = tâm khung bao TOÀN BỘ layer (không phải tâm
            // riêng từng object) — layer có nhiều object thì cả khối co
            // giãn quanh 1 tâm chung, giữ nguyên bố cục tương đối giữa
            // chúng, giống hệt cách khung viền màu bao quanh cả layer. Dùng
            // lại CHÍNH khung đã xoay (tinhKhungXoayLayer) nếu có, để tâm và
            // "nửa đường chéo" khớp đúng khung màu đang hiển thị (đã xoay);
            // ảnh KHÔNG xoay thì hàm đó vẫn ra đúng kết quả như AABB cũ.
            const khungXoay = tinhKhungXoayLayer(layer);
            let centerX, centerY, startDist;
            if (khungXoay) {
                centerX = khungXoay.cx;
                centerY = khungXoay.cy;
                // Khoảng cách tâm→góc không đổi khi xoay (xoay không đổi
                // khoảng cách tới tâm) — dùng nửa đường chéo của khung CHƯA
                // xoay là chính xác cho MỌI góc theta, không cần biết góc.
                startDist = Math.hypot(khungXoay.width / 2, khungXoay.height / 2) || 1;
            } else {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                layer.objects.forEach(obj => {
                    const b = obj.getBoundingRect(false, true);
                    minX = Math.min(minX, b.left);
                    minY = Math.min(minY, b.top);
                    maxX = Math.max(maxX, b.left + b.width);
                    maxY = Math.max(maxY, b.top + b.height);
                });
                centerX = (minX + maxX) / 2;
                centerY = (minY + maxY) / 2;
                startDist = Math.hypot(maxX - centerX, maxY - centerY) || 1;
            }

            // Chụp lại trạng thái BAN ĐẦU của từng object — mọi phép tính
            // trong lúc kéo đều dựa trên trạng thái gốc này (nhân với TỈ LỆ
            // hiện tại), không cộng dồn từng khung hình, tránh đúng lỗi
            // "cộng dồn delta" đã từng gặp ở tay cầm cạnh.
            const trangThaiGoc = layer.objects.map(obj => ({
                obj, left: obj.left, top: obj.top, scaleX: obj.scaleX, scaleY: obj.scaleY,
            }));

            const onMouseMove = (moveEvent) => {
                const canvasRect = canvas.getElement().getBoundingClientRect();
                const cssScaleX = canvasRect.width / canvas.getWidth();
                const cssScaleY = canvasRect.height / canvas.getHeight();

                // Quy đổi vị trí con trỏ (px màn hình) sang px NỘI BỘ canvas
                // — cùng cách updateLayerBorder()/handleLayerResize() đã làm
                // — rồi so khoảng cách tới tâm NGAY LÚC NÀY với khoảng cách
                // LÚC BẮT ĐẦU kéo (startDist tính sẵn ở trên — độc lập với
                // góc xoay, xem chú thích chỗ tính khungXoay). Nhờ dùng
                // khoảng cách tới TÂM thay vì so trực tiếp toạ độ nút, việc
                // xác định "đang phóng to hay thu nhỏ" đúng bất kể khung có
                // đang xoay ở góc nào — kéo ra xa tâm luôn là phóng to, kéo
                // vào gần tâm luôn là thu nhỏ.
                // Chia thêm cho canvas.getZoom() để về đúng OBJECT-SPACE —
                // cùng hệ toạ độ với centerX/centerY (từ getCenterPoint()),
                // không đổi theo zoom bấm nút +/- ở thanh công cụ trên cùng.
                const zoom = canvas.getZoom();
                const curX = (moveEvent.clientX - canvasRect.left) / cssScaleX / zoom;
                const curY = (moveEvent.clientY - canvasRect.top) / cssScaleY / zoom;
                const curDist = Math.hypot(curX - centerX, curY - centerY);
                const ratio = Math.max(0.05, curDist / startDist);

                trangThaiGoc.forEach(({ obj, left, top, scaleX, scaleY }) => {
                    obj.scaleX = scaleX * ratio;
                    obj.scaleY = scaleY * ratio;
                    obj.left = centerX + (left - centerX) * ratio;
                    obj.top = centerY + (top - centerY) * ratio;
                    obj.setCoords();
                });
                canvas.renderAll();
                updateLayerBorder();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                showToast('Đã điều chỉnh kích thước layer', 'success');
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        // ===== ZOOM =====
        function zoomIn() {
            currentZoom += 0.1;
            canvas.setZoom(currentZoom);
            updateZoomLevel();
            updateLayerBorder();
        }

        function zoomOut() {
            currentZoom = Math.max(0.1, currentZoom - 0.1);
            canvas.setZoom(currentZoom);
            updateZoomLevel();
            updateLayerBorder();
        }

        function resetZoom() {
            currentZoom = 1;
            canvas.setZoom(currentZoom);
            updateZoomLevel();
            updateLayerBorder();
        }

        function updateZoomLevel() {
            document.getElementById('zoomLevel').textContent = Math.round(currentZoom * 100) + '%';
        }

        // ===== CANVAS EVENT LISTENERS =====
        // Lỗi cũ: khối này từng nằm ở cấp cao nhất của <script>, chạy trước
        // khi DOMContentLoaded gán biến `canvas`, nên canvas luôn là null và
        // toàn bộ trang báo lỗi ngay khi tải — không có sự kiện nào được gắn.
        // Nay gọi trong bindCanvasEvents() ngay sau khi canvas được tạo.
        function bindCanvasEvents() {
            canvas.on('selection:created', () => {
                syncActiveLayerToObject(canvas.getActiveObject());
                updateLayerBorder();
                const obj = canvas.getActiveObject();
                if (obj) {
                    showToast(`Chọn: ${obj.name || 'Đối tượng'}`, 'info');
                }
            });

            canvas.on('selection:updated', () => {
                syncActiveLayerToObject(canvas.getActiveObject());
                updateLayerBorder();
            });

            canvas.on('selection:cleared', () => {
                updateLayerBorder();
            });

            // Lỗi cũ: khung màu #layerBorder chỉ được vẽ lại lúc THẢ chuột
            // (object:modified) — trong lúc đang kéo/co giãn/xoay, khung đứng
            // yên tại chỗ cũ, tạo cảm giác "khung không chịu đi theo ảnh".
            // 3 sự kiện dưới đây bắn liên tục trong suốt thao tác, không chỉ
            // lúc thả chuột — nhờ vậy khung bám sát object theo thời gian
            // thực, giống hệt cách nó đã bám đúng theo zoom (fitCanvasToWorkspace
            // gọi updateLayerBorder() mỗi khi đổi tỉ lệ hiển thị).
            canvas.on('object:moving', updateLayerBorder);
            canvas.on('object:scaling', updateLayerBorder);
            canvas.on('object:rotating', updateLayerBorder);

            canvas.on('object:modified', () => {
                updateLayerBorder();
                renderAllLayers();
            });

            canvas.on('object:added', updateLayerBorder);

            canvas.on('object:removed', () => {
                updateLayerBorder();
                renderAllLayers();
            });
        }

        // Bấm/kéo THẲNG vào object trên canvas (không qua danh sách layer bên
        // trái) là cách chọn tự nhiên nhất, nhưng Fabric chỉ biết object nào
        // được chọn — không tự biết object đó thuộc layer nào trong mô hình
        // của ứng dụng. Không đồng bộ lại activeLayerIndex thì #layerBorder
        // (luôn vẽ theo layers[activeLayerIndex]) tiếp tục bám lớp đang chọn
        // TRƯỚC ĐÓ trong khi người dùng đang thao tác trên một object khác —
        // trông y như "khung không theo ảnh".
        function syncActiveLayerToObject(obj) {
            if (!obj) return;

            const topIndex = layers.findIndex(l => !l.isGroup && l.objects && l.objects.includes(obj));
            if (topIndex !== -1) {
                if (activeLayerIndex !== topIndex) selectLayer(topIndex, false, false);
                return;
            }

            // Object nằm trong 1 nhóm — chọn nhóm ngoài cùng, giống cách
            // selectNestedLayer() xử lý khi bấm tên 1 lớp con trong panel.
            const groupTopIndex = layers.findIndex(l => {
                if (!l.isGroup) return false;
                const group = layerGroups.find(g => g.id === l.groupId);
                return group && flattenLayersForRender(group.children).some(({ layer }) => layer.objects && layer.objects.includes(obj));
            });
            if (groupTopIndex !== -1 && activeLayerIndex !== groupTopIndex) {
                selectLayer(groupTopIndex, false, false);
            }
        }

        // ===== UNDO/REDO =====
        function undo() {
            showToast('Undo chưa implement', 'info');
        }

        function redo() {
            showToast('Redo chưa implement', 'info');
        }

        // ===== DOWNLOAD =====
        function downloadImage() {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'edited-image.png';
            link.click();
            showToast('Ảnh đã được tải xuống', 'success');
        }

        // ===== IMAGE INFO =====
        function showImageInfo() {
            document.getElementById('imageInfoModal').classList.add('active');
            updateImageInfoModal();
        }

        function hideImageInfo() {
            document.getElementById('imageInfoModal').classList.remove('active');
        }

        function updateImageInfoModal() {
            const layer = layers[activeLayerIndex];
            document.getElementById('modalImageSize').textContent = canvas.width + ' × ' + canvas.height + ' px';
            document.getElementById('modalImageFormat').textContent = 'PNG/JPEG';
            document.getElementById('currentLayerInfo').textContent = layer.name + ' (' + layer.color + ')';
        }

        // ===== LOADING & TOAST =====
        function showLoading(text = 'Đang xử lý...') {
            document.getElementById('loadingText').textContent = text;
            document.getElementById('loadingSpinner').classList.add('active');
        }

        function hideLoading() {
            document.getElementById('loadingSpinner').classList.remove('active');
        }

        function showToast(message, type = 'info') {
            const toastContainer = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            `;
            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }, 2500);
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }

        // ===== KHUNG CÔNG CỤ / LỚP TRƯỢT RA-VÀO (MÀN HÌNH HẸP) =====
        // Trên máy tính, sidebar-left/sidebar-right luôn hiện cố định hai
        // bên. Dưới 992px chúng biến thành khung trượt (CSS ở trên) — chỉ
        // hiện khi bấm nút tương ứng trên thanh tiêu đề, đóng lại khi bấm
        // lần nữa, bấm nút X, hay bấm ra ngoài (lớp phủ mờ).
        function toggleToolsPanel() {
            const opening = !document.body.classList.contains('tools-panel-open');
            document.body.classList.remove('layers-panel-open');
            document.body.classList.toggle('tools-panel-open', opening);
        }

        function toggleLayersPanel() {
            const opening = !document.body.classList.contains('layers-panel-open');
            document.body.classList.remove('tools-panel-open');
            document.body.classList.toggle('layers-panel-open', opening);
        }

        function closeSidePanels() {
            document.body.classList.remove('tools-panel-open', 'layers-panel-open');
        }

        // ===== KEYBOARD SHORTCUTS =====
        document.addEventListener('keydown', (e) => {
            // Chỉ hoạt động khi module "Trang chủ" đang thật sự hiện trên
            // trang — xem chú thích ở khối addEventListener('keydown') phía
            // trên (dòng ~449).
            if (!document.querySelector('.trang-chu-editor')) return;
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        undo();
                        break;
                    case 'y':
                        e.preventDefault();
                        redo();
                        break;
                    case 's':
                        e.preventDefault();
                        downloadImage();
                        break;
                    case 'n':
                        e.preventDefault();
                        createNewLayer();
                        break;
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                const obj = canvas.getActiveObject();
                if (obj) {
                    const layer = layers[activeLayerIndex];
                    const index = layer.objects.indexOf(obj);
                    if (index > -1) {
                        layer.objects.splice(index, 1);
                        canvas.remove(obj);
                        canvas.renderAll();
                        renderAllLayers();
                        updateLayerBorder();
                        showToast('🗑️ Đã xoá đối tượng', 'success');
                    }
                }
            } else if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                moveLayerUp(activeLayerIndex);
            } else if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                moveLayerDown(activeLayerIndex);
            }
        });

        // ===== LAYER OPACITY CONTROL =====
        function setLayerOpacity(index, opacity) {
            layers[index].opacity = opacity;
            const layer = layers[index];
            layer.objects.forEach(obj => {
                obj.opacity = opacity;
            });
            renderAllLayers();
        }

        // ===== MERGE LAYERS =====
        function mergeLayers(index1, index2) {
            if (index1 === index2) {
                showToast('Chọn 2 layer khác nhau để merge', 'error');
                return;
            }

            const layer1 = layers[Math.min(index1, index2)];
            const layer2 = layers[Math.max(index1, index2)];

            layer1.objects = layer1.objects.concat(layer2.objects);
            layer1.name = layer1.name + ' + ' + layer2.name;

            layers.splice(Math.max(index1, index2), 1);
            activeLayerIndex = Math.min(index1, index2);
            updateLayersUI();
            updateCurrentLayerColor();
            renderAllLayers();
            showToast('✅ Merge layers thành công!', 'success');
        }

        // ===== FLATTEN IMAGE (Merge all visible layers) =====
        function flattenImage() {
            if (confirm('Flatten sẽ gộp tất cả các layer hiển thị. Tiếp tục?')) {
                const flatLayer = {
                    id: Date.now(),
                    name: 'Flattened',
                    color: '#000000',
                    visible: true,
                    objects: [],
                    opacity: 1
                };

                layers.forEach(layer => {
                    if (layer.visible) {
                        flatLayer.objects = flatLayer.objects.concat(layer.objects);
                    }
                });

                layers = [flatLayer];
                activeLayerIndex = 0;
                updateLayersUI();
                updateCurrentLayerColor();
                renderAllLayers();
                showToast('✅ Flatten thành công!', 'success');
            }
        }

        // ===== SELECT LAYER BY KEYBOARD =====
        function selectLayerByNumber(num) {
            if (num > 0 && num <= layers.length) {
                selectLayer(num - 1);
            }
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideOut {
                to {
                    transform: translateX(110%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    
