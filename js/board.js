// ==========================================
// STARTUP INITIALIZATION
// ==========================================
window.onload = () => { 
    if(typeof initTheme === 'function') initTheme();
    const req = indexedDB.open(DB_NAME, 1); 
    req.onupgradeneeded = e => { e.target.result.createObjectStore('lists', {keyPath:'id'}); };
    req.onsuccess = e => { 
        db = e.target.result; 
        if(typeof loadMenu === 'function') loadMenu(); 
        
        const style = document.createElement('style');
        style.innerHTML = `body.show-status-mode .chapter-badge { display: flex !important; } .chapter-badge { display: none; }`;
        document.head.appendChild(style);

        if (!isShowScoreMode) document.body.classList.add('hide-scores');

        if (typeof initGlobalFileDrop === 'function') initGlobalFileDrop(); 
        if (typeof initGlobalClickAndDrop === 'function') initGlobalClickAndDrop(); 
        initKeyboardShortcuts(); 
        if (typeof updateSearchTypeUI === 'function') updateSearchTypeUI();

        // TỐI ƯU UX: Thay vì tắt Toolbar, giờ đây nó sẽ "trôi" bám theo tấm ảnh khi cuộn!
        document.getElementById('main-capture-wrap').addEventListener('scroll', () => {
            if (selectedImgObj) updateFloatingToolbarPosition(selectedImgObj.dom);
        });
    };
    req.onerror = e => {
        document.getElementById('list-container').innerHTML = `<div style="text-align:center; color:var(--danger); padding:40px;"><b>Browser Error:</b> Offline storage is blocked.</div>`;
        if (typeof hideLoading === 'function') hideLoading();
    }
};

// ==========================================
// CORE RENDER ENGINE
// ==========================================
function getStatusIcon(status) {
    if (status === 'completed') return '<i class="ph-fill ph-seal-check"></i>'; 
    if (status === 'reading') return '<i class="ph-bold ph-book-open"></i>'; 
    if (status === 'on-hold') return '<i class="ph-bold ph-pause"></i>'; 
    if (status === 'dropped') return '<i class="ph-bold ph-x"></i>'; 
    if (status === 'plan') return '<i class="ph-bold ph-bookmark-simple"></i>'; 
    return '';
}

// Hàm này sẽ áp dụng các thay đổi về giao diện tùy thuộc vào chế độ (Story vs Normal)
function applyStoryModeUI() {
    const isStory = !!currentListData.isStoryMode;
    
    // Top bar: Ẩn/hiện nút bật tắt Status
    const topStatusBtn = document.getElementById('btn-status-toggle');
    if(topStatusBtn) topStatusBtn.style.display = isStory ? 'flex' : 'none';
    
    // Floating Toolbar: Ẩn/hiện Chọn Trạng thái và Ô nhập Chap
    const floatStatus = document.getElementById('float-status');
    if(floatStatus) floatStatus.style.display = isStory ? 'inline-block' : 'none';
    const floatChapWrap = document.getElementById('float-chapter-wrap');
    
    // Float More Menu: Ẩn/hiện cột Tra Cứu (Manga/Anime)
    const searchCol = document.getElementById('menu-col-search');
    if(searchCol) searchCol.style.display = isStory ? 'flex' : 'none';
    
    // Bulk Menu: Ẩn/hiện Đổi trạng thái hàng loạt
    const bulkStatus = document.getElementById('bulk-status-select');
    if(bulkStatus) bulkStatus.style.display = isStory ? 'inline-block' : 'none';
    
    // Nếu chuyển về Normal Mode, mặc định tự tắt giao diện Status Mode trên toàn trang
    if(!isStory && isShowStatusMode) toggleStatusMode();
}

function renderBoard() {
    if (selectedImgObj) deselectImg(); 

    try {
        // Cập nhật giao diện tùy chọn theo Loại Board trước khi render
        applyStoryModeUI();

        if(currentListData.showFilename) { document.body.classList.add('show-filename-on-click'); } 
        else { document.body.classList.remove('show-filename-on-click'); }

        const editorScreen = document.getElementById('editor-screen');
        editorScreen.classList.remove('shape-square', 'shape-circle', 'shape-portrait');
        if(currentListData.shape === 'square') { editorScreen.classList.add('shape-square'); }
        else if(currentListData.shape === 'circle') { editorScreen.classList.add('shape-circle'); }
        else if(currentListData.shape === 'portrait') { editorScreen.classList.add('shape-portrait'); }

        const fIdx = currentListData.fontIndex || 0;
        const currentFontFamily = fontsArr[fIdx];

        const board = document.getElementById('tier-board'); board.innerHTML = '';
        const hEl = document.getElementById('tier-header'); 
        hEl.innerText = currentListData.name; 
        hEl.style.display = currentListData.headerVisible === false ? 'none' : 'block';
        hEl.style.fontFamily = currentFontFamily;

        const captureArea = document.getElementById('capture-area');
        if (currentListData.background) {
            captureArea.style.background = currentListData.background;
            captureArea.style.backgroundSize = 'cover';
            captureArea.style.backgroundPosition = 'center';
            hEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
            board.style.backgroundColor = 'transparent';
            board.style.borderTop = 'none';
        } else {
            captureArea.style.background = '#000';
            hEl.style.backgroundColor = '#000';
            board.style.backgroundColor = 'transparent';
            board.style.borderTop = '1px solid #000';
        }

        currentListData.tiers.forEach((t, i) => {
            const row = document.createElement('div'); row.className = 'tier-row'; 
            row.style.backgroundColor = 'transparent'; 
            row.draggable = false; 
            
            row.ondragover = e => { 
                if (isDragMode && draggedRowIdx !== null) { 
                    e.preventDefault(); e.stopPropagation(); 
                    e.currentTarget.style.borderTop = "3px solid #10b981"; 
                } 
            };
            row.ondragleave = e => { if (isDragMode && draggedRowIdx !== null) e.currentTarget.style.borderTop = ""; };
            row.ondrop = e => { 
                if (isDragMode && draggedRowIdx !== null) { 
                    e.preventDefault(); e.stopPropagation(); 
                    e.currentTarget.style.borderTop = ""; 
                    const tmp = currentListData.tiers.splice(draggedRowIdx, 1)[0]; 
                    currentListData.tiers.splice(i, 0, tmp); 
                    draggedRowIdx = null; 
                    commitChange(); 
                } 
            };
            
            const labelWrap = document.createElement('div'); labelWrap.className = 'tier-label-wrap';
            labelWrap.style.backgroundColor = t.color; 
            labelWrap.title = "Drag to reorder row. Click to edit.";
            labelWrap.onclick = () => { if(typeof openEditModal === 'function') openEditModal(i); };
            
            if(isDragMode) labelWrap.draggable = true; 
            else labelWrap.style.cursor = 'pointer';

            labelWrap.ondragstart = e => { 
                if(!isDragMode) return; 
                draggedRowIdx = i; draggedItem = null; e.dataTransfer.effectAllowed = 'move'; 
            }; 
            
            const label = document.createElement('div'); label.className = 'tier-label'; label.innerText = t.name; 
            label.style.fontFamily = currentFontFamily;
            labelWrap.appendChild(label);

            const content = document.createElement('div'); content.className = 'tier-content';
            content.dataset.tierIndex = i; 
            content.style.backgroundColor = currentListData.background ? 'rgba(0,0,0,0.65)' : '#1a1a1a';
            
            content.ondragover = e => { 
                e.preventDefault(); 
                if (isDragMode && draggedItem && draggedItem.type !== 'row') { 
                    e.dataTransfer.dropEffect = 'move'; 
                    if (currentPlaceholder && typeof getInsertionNode === 'function') {
                        const afterElement = getInsertionNode(content, e.clientX, e.clientY);
                        if (afterElement !== currentPlaceholder.nextElementSibling) {
                            if (afterElement) content.insertBefore(currentPlaceholder, afterElement);
                            else content.appendChild(currentPlaceholder);
                        }
                    }
                } 
            };
            
            content.ondrop = e => { 
                e.preventDefault(); e.stopPropagation(); 
                try {
                    if (isDragMode && draggedItem && draggedItem.type !== 'row' && draggedItem.data) { 
                        let dropIndex = currentListData.tiers[i].items.length;
                        if (currentPlaceholder && currentPlaceholder.parentNode === content) {
                            const elements = [...content.querySelectorAll('.img-wrap:not(.dragging)')];
                            dropIndex = elements.indexOf(currentPlaceholder);
                        }
                        let oldArray = (draggedItem.type === 'tier') ? currentListData.tiers[draggedItem.r].items : currentListData.dock;
                        let newArray = currentListData.tiers[i].items;

                        let oldIdx = oldArray.indexOf(draggedItem.data);
                        if (oldArray === newArray && oldIdx !== -1 && oldIdx < dropIndex) dropIndex--;
                        if (oldIdx !== -1) oldArray.splice(oldIdx, 1);
                        
                        newArray.splice(dropIndex, 0, draggedItem.data);
                        
                        let maxS = currentListData.tiers[i].maxScore !== undefined ? currentListData.tiers[i].maxScore : 10;
                        let minS = currentListData.tiers[i].minScore !== undefined ? currentListData.tiers[i].minScore : 0;
                        
                        if (!draggedItem.data.locked) {
                            let prevItem = newArray[dropIndex - 1];
                            let nextItem = newArray[dropIndex + 1];
                            let prevScore = (prevItem && prevItem.score !== undefined) ? parseFloat(prevItem.score) : parseFloat(maxS);
                            let nextScore = (nextItem && nextItem.score !== undefined) ? parseFloat(nextItem.score) : parseFloat(minS);
                            let newScore = (prevScore + nextScore) / 2;
                            let p = currentListData.scorePrecision || 2;
                            let factor = Math.pow(10, p);
                            newScore = Math.round(newScore * factor) / factor;
                            draggedItem.data.score = Math.max(minS, Math.min(maxS, newScore));
                        }
                        lastDroppedData = draggedItem.data; setTimeout(() => lastDroppedData = null, 500);
                        commitChange(); 
                    } 
                } catch(err) { if(typeof showToast === 'function') showToast("Lỗi thả vào hàng Tier", true); console.error(err); }
            };
            
            t.items.forEach((img, idx) => content.appendChild(createImg(img, 'tier', i, idx)));
            row.appendChild(labelWrap); row.appendChild(content); board.appendChild(row);
        });
        
        const dock = document.getElementById('dock'); dock.innerHTML = '';
        document.getElementById('dock-count').innerText = currentListData.dock.length;
        
        dock.ondragover = e => { 
            e.preventDefault(); 
            if(isDragMode && draggedItem && draggedItem.type !== 'row') {
                e.dataTransfer.dropEffect = 'move'; 
                if (currentPlaceholder && typeof getInsertionNode === 'function') {
                    const afterElement = getInsertionNode(dock, e.clientX, e.clientY);
                    if (afterElement !== currentPlaceholder.nextElementSibling) {
                        if (afterElement) dock.insertBefore(currentPlaceholder, afterElement);
                        else dock.appendChild(currentPlaceholder);
                    }
                }
            }
        };
        dock.ondrop = e => { 
            e.preventDefault(); e.stopPropagation(); 
            try {
                if (isDragMode && draggedItem && draggedItem.type !== 'row' && draggedItem.data) { 
                    let dropIndex = currentListData.dock.length;
                    if (currentPlaceholder && currentPlaceholder.parentNode === dock) {
                        const elements = [...dock.querySelectorAll('.img-wrap:not(.dragging)')];
                        dropIndex = elements.indexOf(currentPlaceholder);
                    }
                    let oldArray = (draggedItem.type === 'tier') ? currentListData.tiers[draggedItem.r].items : currentListData.dock;
                    let newArray = currentListData.dock;
                    
                    let oldIdx = oldArray.indexOf(draggedItem.data);
                    if (oldArray === newArray && oldIdx !== -1 && oldIdx < dropIndex) dropIndex--;
                    if (oldIdx !== -1) oldArray.splice(oldIdx, 1);
                    
                    newArray.splice(dropIndex, 0, draggedItem.data);
                    
                    lastDroppedData = draggedItem.data;
                    setTimeout(() => lastDroppedData = null, 500);

                    commitChange(); 
                } 
            } catch(err) { if(typeof showToast === 'function') showToast("Lỗi thả Dock", true); console.error(err); }
        };
        
        currentListData.dock.forEach((img, idx) => dock.appendChild(createImg(img, 'dock', null, idx)));
        if (typeof filterDock === 'function') filterDock();
    } catch (err) { if(typeof showToast === 'function') showToast("Lỗi Render Giao Diện", true); console.error(err); }
}

function refreshFloatImageTitle() {
    const titleEl = document.getElementById('float-image-title');
    if (titleEl && selectedImgObj) {
        if (currentListData.showFilename) {
            let rName = selectedImgObj.data.name || 'Chưa có tên';
            let p = currentListData.scorePrecision || 2;
            let sStr = selectedImgObj.data.score !== undefined ? selectedImgObj.data.score.toFixed(p) : '-';
            
            let cStr = (selectedImgObj.data.chapter && currentListData.isStoryMode) 
                ? `&nbsp;&nbsp;<i class="ph-bold ph-bookmark-simple"></i> ${selectedImgObj.data.chapter}` 
                : '';
                
            titleEl.innerHTML = `${escapeHTML(rName)} <span style="color:var(--warning); margin-left: 8px;"><i class="ph-fill ph-star"></i> ${sStr}</span><span style="color:var(--accent)">${cStr}</span>`;
            titleEl.style.opacity = '1';
        } else {
            titleEl.style.opacity = '0';
        }
    }
}

function createImg(data, type, r, i) {
    const wrap = document.createElement('div'); wrap.className = 'img-wrap'; 
    wrap.style.height = (type==='tier' ? data.h : 85) + 'px';
    wrap.dataset.name = (data.name || '').toLowerCase();
    
    if (data.locked) wrap.setAttribute('data-locked', 'true');
    // Chỉ set status nếu đang ở Story Mode
    if(currentListData.isStoryMode) {
        wrap.setAttribute('data-status', data.readStatus || 'none');
    }

    let rawName = data.name || '';
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(rawName)) rawName = rawName.replace(/\.[^/.]+$/, "");
    wrap.setAttribute('data-raw-name', rawName);
    
    let p = currentListData.scorePrecision || 2;
    let scoreStr = data.score !== undefined ? data.score.toFixed(p) : '-';
    wrap.setAttribute('data-score', scoreStr);

    let chapterStr = (data.chapter && currentListData.isStoryMode) ? `\n🔖 Chap: ${data.chapter}` : '';
    let tooltipName = rawName ? rawName : "Chưa có tên";
    wrap.setAttribute('data-name-tooltip', `${tooltipName}\n⭐ ${scoreStr}${chapterStr}`); 
    
    if(isDragMode) wrap.draggable = true; else wrap.style.cursor = 'pointer';
    
    const img = document.createElement('img'); img.src = data.src; img.className = 'img-item'; 
    wrap.appendChild(img);

    // Chỉ kết xuất Huy hiệu Status nếu là Story Mode
    if(currentListData.isStoryMode) {
        const statusBadge = document.createElement('div');
        statusBadge.className = 'status-badge';
        statusBadge.innerHTML = getStatusIcon(data.readStatus);
        wrap.appendChild(statusBadge);
    }

    if (data.chapter && currentListData.isStoryMode) {
        const chapBadge = document.createElement('div');
        chapBadge.className = 'status-badge chapter-badge';
        chapBadge.style.right = 'auto'; 
        chapBadge.style.left = '5px'; 
        chapBadge.style.width = 'auto';
        chapBadge.style.padding = '0 6px';
        chapBadge.style.borderRadius = '6px';
        chapBadge.style.background = 'rgba(59, 130, 246, 0.9)';
        chapBadge.style.fontSize = '11px';
        chapBadge.innerHTML = `<i class="ph-bold ph-bookmark-simple" style="margin-right:3px"></i> ${data.chapter}`;
        wrap.appendChild(chapBadge);
    }

    if (data.score !== undefined) {
        const scoreBadge = document.createElement('div');
        scoreBadge.className = 'score-badge';
        scoreBadge.innerHTML = `<i class="ph-fill ph-star"></i> ${scoreStr}`;
        wrap.appendChild(scoreBadge);
    }

    if (data.caption) { const c = document.createElement('div'); c.className = 'img-caption'; c.innerText = data.caption; wrap.appendChild(c); }
    
    let foundObj = multiSelectImages.find(obj => obj.data === data);
    if (foundObj) {
        wrap.classList.add('multi-selected');
        foundObj.dom = wrap; foundObj.r = r; foundObj.i = i; foundObj.type = type; 
    }

    if (lastDroppedData && data === lastDroppedData) wrap.classList.add('drop-bounce');

    wrap.onclick = e => { 
        e.stopPropagation(); 
        
        if (isNameCopyMode) {
            let nameToCopy = wrap.getAttribute('data-raw-name') || '';
            if (nameToCopy) {
                navigator.clipboard.writeText(nameToCopy).then(() => {
                    if(typeof showToast === 'function') showToast(`Đã copy: ${nameToCopy}`);
                }).catch(() => { if(typeof showToast === 'function') showToast("Không thể copy!", true); });
            } else { if(typeof showToast === 'function') showToast("Ảnh này chưa có tên!", true); }
            if (selectedImgObj && selectedImgObj.dom !== wrap && typeof deselectImg === 'function') deselectImg();
        }
        
        if (isLockScoreMode) {
            data.locked = !data.locked;
            if (data.locked) wrap.setAttribute('data-locked', 'true'); else wrap.removeAttribute('data-locked');
            commitChangeSilent(); return;
        }

        if (isMultiSelectMode) {
            if (wrap.classList.contains('multi-selected')) {
                wrap.classList.remove('multi-selected');
                multiSelectImages = multiSelectImages.filter(obj => obj.data !== data);
            } else {
                wrap.classList.add('multi-selected');
                multiSelectImages.push({dom: wrap, data, type, r, i});
            }
            if(typeof updateBulkUI === 'function') updateBulkUI(); return;
        }

        if (!selectedImgObj) { 
            selectedImgObj = {dom: wrap, data, type, r, i}; 
            wrap.classList.add('selected'); 
            
            const tb = document.getElementById('floating-toolbar');
            tb.style.display = 'flex';
            
            refreshFloatImageTitle();

            document.getElementById('float-size-val').innerText = data.h + 'px'; 
            document.getElementById('float-status').value = data.readStatus || 'none';
            
            // XỬ LÝ ẨN/HIỆN Ô NHẬP CHAP TRÊN TOOLBAR
            const chapterWrap = document.getElementById('float-chapter-wrap');
            if (chapterWrap) {
                if (currentListData.isStoryMode) {
                    chapterWrap.style.display = 'block';
                    document.getElementById('float-chapter').value = data.chapter || '';
                } else {
                    chapterWrap.style.display = 'none';
                }
            }
            
            let initialScore = 5.0; 
            if (data.score !== undefined) {
                initialScore = data.score;
            } else if (type === 'tier' && currentListData.tiers.length > 1) {
                let t = currentListData.tiers[r];
                if (t.minScore !== undefined && t.maxScore !== undefined) initialScore = (t.minScore + t.maxScore) / 2;
                else { let maxIndex = currentListData.tiers.length - 1; initialScore = 10 - (r / maxIndex) * 10; }
            }
            initialScore = Math.max(0, Math.min(10, initialScore));
            document.getElementById('float-score').value = (Math.round(initialScore * Math.pow(10, p)) / Math.pow(10, p)).toFixed(p);
            
            if(typeof updateFloatingToolbarPosition === 'function') updateFloatingToolbarPosition(wrap);
        } else if (selectedImgObj.dom === wrap) { 
            if(typeof deselectImg === 'function') deselectImg(); 
        } else {
            let sourceData = selectedImgObj.data;
            let targetData = data;
            
            let sourceArray = null, sourceIndex = -1;
            let targetArray = null, targetIndex = -1;

            if (currentListData.dock.includes(sourceData)) { sourceArray = currentListData.dock; sourceIndex = currentListData.dock.indexOf(sourceData); }
            else {
                for (let tier of currentListData.tiers) {
                    if (tier.items.includes(sourceData)) { sourceArray = tier.items; sourceIndex = tier.items.indexOf(sourceData); break; }
                }
            }

            if (currentListData.dock.includes(targetData)) { targetArray = currentListData.dock; targetIndex = currentListData.dock.indexOf(targetData); }
            else {
                for (let tier of currentListData.tiers) {
                    if (tier.items.includes(targetData)) { targetArray = tier.items; targetIndex = tier.items.indexOf(targetData); break; }
                }
            }

            if (sourceArray && targetArray && sourceIndex !== -1 && targetIndex !== -1) {
                let tempScoreSource = sourceData.score;
                let tempScoreTarget = targetData.score;
                if (!sourceData.locked) sourceData.score = tempScoreTarget;
                if (!targetData.locked) targetData.score = tempScoreSource;

                sourceArray[sourceIndex] = targetData;
                targetArray[targetIndex] = sourceData;
            }
            if(typeof deselectImg === 'function') deselectImg(); 
            commitChange();
        }
    };
    
    wrap.ondragstart = e => { 
        if(!isDragMode || isMultiSelectMode || isLockScoreMode) return; 
        e.stopPropagation(); 
        draggedItem = {data, type, r, i}; 
        e.dataTransfer.effectAllowed = 'move'; 
        const tz = document.getElementById('trash-zone'); tz.style.display='flex'; tz.classList.remove('hover');
        
        setTimeout(() => {
            wrap.classList.add('dragging'); 
            currentPlaceholder = wrap.cloneNode(true);
            currentPlaceholder.classList.remove('dragging', 'selected', 'multi-selected', 'drop-bounce');
            currentPlaceholder.classList.add('drag-placeholder');
            wrap.parentNode.insertBefore(currentPlaceholder, wrap); 
        }, 0); 
    };
    
    wrap.ondragend = () => { 
        draggedItem = null; 
        document.getElementById('trash-zone').style.display='none'; 
        wrap.classList.remove('dragging'); 
        if (currentPlaceholder && currentPlaceholder.parentNode) currentPlaceholder.parentNode.removeChild(currentPlaceholder); 
        currentPlaceholder = null;
    };
    return wrap;
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
function initKeyboardShortcuts() { 
    window.addEventListener('keydown', e => { 
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return; 
        if (e.ctrlKey || e.metaKey) { 
            if (e.key.toLowerCase() === 'z') { e.preventDefault(); if (!document.getElementById('editor-screen').classList.contains('hidden')) { undo(); } else { if(typeof undoMenuAction === 'function') undoMenuAction(); } } 
            if (e.key.toLowerCase() === 'y') { e.preventDefault(); if (!document.getElementById('editor-screen').classList.contains('hidden')) redo(); } 
            if (e.key.toLowerCase() === 's') { e.preventDefault(); if (currentListData) { saveListSilent(currentListData); if(typeof showToast==='function') showToast('Đã lưu thủ công'); isDirty = false; } } 
        } 
        if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedImgObj) { e.preventDefault(); deleteSelected(); } } 
        if (e.key === 'Escape') { 
            if (selectedImgObj) deselectImg(); 
            if (isMultiSelectMode) toggleMultiSelectMode();
            if (isNameCopyMode) toggleNameCopyMode();
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); 
        } 
    }); 
}

// ==========================================
// TOOLBAR & MODES TOGGLE
// ==========================================
function toggleDragMode() {
    isDragMode = !isDragMode;
    const btn = document.getElementById('btn-drag-toggle');
    if (isDragMode) {
        btn.innerHTML = '<i class="ph ph-hand-grabbing"></i> Drag: ON';
        btn.className = 'btn-icon active';
        document.body.classList.remove('scroll-mode');
        document.querySelectorAll('.img-wrap, .tier-row').forEach(el => {
            if(el.classList.contains('tier-row')) el.removeAttribute('draggable');
            else { el.setAttribute('draggable', 'true'); el.style.cursor = 'grab'; }
        });
        document.querySelectorAll('.tier-label-wrap').forEach(el => { el.setAttribute('draggable', 'true'); el.style.cursor = 'grab'; });
    } else {
        btn.innerHTML = '<i class="ph ph-arrows-out-line-vertical"></i> Scroll: ON';
        btn.className = 'btn-icon';
        document.body.classList.add('scroll-mode');
        document.querySelectorAll('.img-wrap, .tier-row, .tier-label-wrap').forEach(el => { el.removeAttribute('draggable'); el.style.cursor = 'pointer'; });
    }
}

function toggleLockScoreMode() {
    isLockScoreMode = !isLockScoreMode;
    const btn = document.getElementById('btn-lock-score');
    if (isLockScoreMode) {
        btn.innerHTML = '<i class="ph ph-lock-key"></i> Lock: ON';
        btn.className = 'btn-icon active';
        btn.style.background = 'rgba(239, 68, 68, 0.1)'; btn.style.color = 'var(--danger)'; btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        document.body.classList.add('lock-score-mode'); if(typeof deselectImg==='function') deselectImg();
    } else {
        btn.innerHTML = '<i class="ph ph-lock-key-open"></i> Lock: OFF';
        btn.className = 'btn-icon';
        btn.style.background = 'var(--bg-elevated)'; btn.style.color = 'var(--text-main)'; btn.style.borderColor = 'var(--border-color)';
        document.body.classList.remove('lock-score-mode');
    }
}

function toggleNameCopyMode() {
    isNameCopyMode = !isNameCopyMode;
    const btn = document.getElementById('btn-name-copy');
    if (isNameCopyMode) {
        btn.innerHTML = '<i class="ph ph-text-t"></i> Name: ON';
        btn.className = 'btn-icon active';
        btn.style.background = 'rgba(59, 130, 246, 0.1)'; btn.style.color = 'var(--accent)'; btn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        document.body.classList.add('name-copy-mode'); if(typeof deselectImg==='function') deselectImg(); 
        if(typeof showToast==='function') showToast("Click vào ảnh để Copy tên!");
    } else {
        btn.innerHTML = '<i class="ph ph-text-t"></i> Name: OFF';
        btn.className = 'btn-icon';
        btn.style.background = 'var(--bg-elevated)'; btn.style.color = 'var(--text-main)'; btn.style.borderColor = 'var(--border-color)';
        document.body.classList.remove('name-copy-mode');
    }
}

function toggleScoreMode() {
    isShowScoreMode = !isShowScoreMode;
    const btn = document.getElementById('btn-score-toggle');
    if (isShowScoreMode) {
        btn.innerHTML = '<i class="ph ph-star"></i> Score: ON';
        btn.classList.add('active');
        btn.style.background = 'rgba(245, 158, 11, 0.1)';
        btn.style.color = 'var(--warning)';
        btn.style.borderColor = 'rgba(245, 158, 11, 0.3)';
        document.body.classList.remove('hide-scores');
    } else {
        btn.innerHTML = '<i class="ph ph-star"></i> Score: OFF';
        btn.classList.remove('active');
        btn.style.background = 'var(--bg-elevated)';
        btn.style.color = 'var(--text-main)';
        btn.style.borderColor = 'var(--border-color)';
        document.body.classList.add('hide-scores');
    }
}

function toggleStatusMode() {
    isShowStatusMode = !isShowStatusMode;
    const btn = document.getElementById('btn-status-toggle');
    if (isShowStatusMode) {
        btn.innerHTML = '<i class="ph ph-bookmark"></i> Status: ON';
        btn.classList.add('active');
        btn.style.background = 'rgba(59, 130, 246, 0.1)';
        btn.style.color = 'var(--accent)';
        btn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        document.body.classList.add('show-status-mode');
    } else {
        btn.innerHTML = '<i class="ph ph-bookmark"></i> Status: OFF';
        btn.classList.remove('active');
        btn.style.background = 'var(--bg-elevated)';
        btn.style.color = 'var(--text-main)';
        btn.style.borderColor = 'var(--border-color)';
        document.body.classList.remove('show-status-mode');
    }
}

function toggleDock() {
    const dock = document.getElementById('dock');
    const caret = document.getElementById('dock-caret');
    if (dock.classList.contains('collapsed')) {
        dock.classList.remove('collapsed'); caret.classList.replace('ph-caret-right', 'ph-caret-down');
    } else {
        dock.classList.add('collapsed'); caret.classList.replace('ph-caret-down', 'ph-caret-right');
    }
}

function sortDock(type) {
    if (!currentListData || type === '') return;
    if (type === 'az') currentListData.dock.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (type === 'za') currentListData.dock.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    else if (type === 'random') currentListData.dock.sort(() => Math.random() - 0.5);
    else if (type === 'newest') currentListData.dock.reverse();
    document.getElementById('dock-sort-select').value = ''; commitChange(); 
    if(typeof showToast==='function') showToast("Dock Sorted!");
}

function filterDock() {
    const query = document.getElementById('dock-search').value.toLowerCase();
    const dockItems = document.getElementById('dock').querySelectorAll('.img-wrap');
    dockItems.forEach(wrap => { wrap.style.display = (wrap.dataset.name || '').includes(query) ? 'flex' : 'none'; });
}

// ==========================================
// BULK ACTION (MULTI-SELECT)
// ==========================================
function toggleMultiSelectMode() {
    if (!currentListData) return;
    isMultiSelectMode = !isMultiSelectMode;
    const btn = document.getElementById('btn-multi-select');
    
    if (isMultiSelectMode) {
        btn.innerHTML = '<i class="ph ph-check-square"></i> Select: ON'; btn.classList.add('active');
        if(typeof deselectImg === 'function') deselectImg(); 
        updateBulkUI(); 
        if(typeof showToast==='function') showToast("Multi-select ON. Click images to select.");
    } else {
        btn.innerHTML = '<i class="ph ph-check-square"></i> Select: OFF'; btn.classList.remove('active');
        multiSelectImages = []; renderBoard(); updateBulkUI();
    }
}

function selectAllImages() {
    if (!currentListData) return;
    let totalImages = currentListData.dock.length;
    currentListData.tiers.forEach(t => totalImages += t.items.length);
    
    if (multiSelectImages.length < totalImages) {
        multiSelectImages = [];
        currentListData.dock.forEach((data, i) => multiSelectImages.push({ data, type: 'dock', r: null, i }));
        currentListData.tiers.forEach((t, r) => t.items.forEach((data, i) => multiSelectImages.push({ data, type: 'tier', r, i })));
    } else { multiSelectImages = []; }
    renderBoard(); updateBulkUI();
}

function updateBulkUI() {
    const bar = document.getElementById('bulk-action-bar');
    const count = document.getElementById('bulk-count');
    const btnSelectAll = document.getElementById('btn-bulk-select-all');
    
    if (isMultiSelectMode) {
        bar.classList.add('show');
        count.innerHTML = `<i class="ph ph-check-square"></i> ${multiSelectImages.length} Selected`;
        document.getElementById('main-bottom-toolbar').style.transform = 'translateX(-50%) translateY(150px)';
    } else {
        bar.classList.remove('show');
        document.getElementById('main-bottom-toolbar').style.transform = 'translateX(-50%) translateY(0)';
    }

    let totalImages = 0;
    if (currentListData) { totalImages = currentListData.dock.length; currentListData.tiers.forEach(t => totalImages += t.items.length); }
    if (btnSelectAll) btnSelectAll.innerHTML = (multiSelectImages.length === totalImages && totalImages > 0) ? '<i class="ph ph-x-square"></i> Deselect All' : '<i class="ph ph-check-square-offset"></i> Select All';
}

function bulkToggleLock() {
    if (multiSelectImages.length === 0) return;
    const newState = !multiSelectImages.every(obj => obj.data.locked);
    multiSelectImages.forEach(obj => obj.data.locked = newState);
    commitChangeSilent(); renderBoard(); 
    if(typeof showToast==='function') showToast(newState ? "Locked selected images!" : "Unlocked selected images!");
}

function bulkMoveToDock() {
    if (multiSelectImages.length === 0) return;
    multiSelectImages.forEach(obj => { if (obj.type === 'tier') currentListData.dock.push(obj.data); });
    currentListData.tiers.forEach(t => t.items = t.items.filter(item => !multiSelectImages.some(sel => sel.data === item)));
    multiSelectImages = []; toggleMultiSelectMode(); commitChange();
}

function bulkDelete() {
    if (multiSelectImages.length === 0) return;
    if(typeof openConfirm === 'function') {
        openConfirm("Bulk Delete", `Delete ${multiSelectImages.length} selected images?`, () => {
            currentListData.dock = currentListData.dock.filter(item => !multiSelectImages.some(sel => sel.data === item));
            currentListData.tiers.forEach(t => t.items = t.items.filter(item => !multiSelectImages.some(sel => sel.data === item)));
            multiSelectImages = []; toggleMultiSelectMode(); commitChange();
        });
    }
}

function bulkChangeStatus(val) {
    if (multiSelectImages.length === 0 || !val) return;
    multiSelectImages.forEach(obj => { obj.data.readStatus = val === 'none' ? 'none' : val; });
    commitChangeSilent(); renderBoard(); 
    if(typeof showToast==='function') showToast("Cập nhật trạng thái hàng loạt thành công!");
    document.getElementById('bulk-status-select').value = ''; 
}

// ==========================================
// FLOATING TOOLBAR & DATA ACTIONS
// ==========================================
function updateFloatingToolbarPosition(wrap) {
    const tb = document.getElementById('floating-toolbar');
    const rect = wrap.getBoundingClientRect();
    let tbHeight = tb.offsetHeight || 52;
    let tbWidth = tb.offsetWidth || 300;
    
    let topPos = rect.top - tbHeight - 15; 
    let isFlipped = false;
    
    if (topPos < 80) { 
        topPos = rect.bottom + 15; 
        isFlipped = true; 
    }
    
    let leftPos = rect.left + (rect.width / 2);
    const safePadding = 15;
    if (leftPos - (tbWidth / 2) < safePadding) leftPos = (tbWidth / 2) + safePadding;
    if (leftPos + (tbWidth / 2) > window.innerWidth - safePadding) leftPos = window.innerWidth - (tbWidth / 2) - safePadding;

    tb.style.top = topPos + 'px'; tb.style.left = leftPos + 'px';
    
    const titleEl = document.getElementById('float-image-title');
    if (isFlipped) { 
        tb.classList.add('menu-down'); 
        if(titleEl) { titleEl.style.top = 'auto'; titleEl.style.bottom = '-40px'; }
    } else { 
        tb.classList.remove('menu-down'); 
        if(titleEl) { titleEl.style.bottom = 'auto'; titleEl.style.top = '-40px'; }
    }
}

function toggleFloatMore(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('float-more-menu');
    const btn = document.getElementById('btn-float-more');
    if(menu.style.display === 'flex') { menu.style.display = 'none'; btn.style.background = 'transparent'; } 
    else { menu.style.display = 'flex'; btn.style.background = 'var(--bg-elevated)'; }
}

function deselectImg() { 
    if (selectedImgObj) { 
        selectedImgObj.dom.classList.remove('selected'); 
        selectedImgObj = null; 
        document.getElementById('floating-toolbar').style.display = 'none';
        document.getElementById('float-more-menu').style.display = 'none';
        document.getElementById('btn-float-more').style.background = 'transparent';
    } 
}

function resizeSelectedImg(h) { 
    if (selectedImgObj) { 
        h = parseInt(h); if(isNaN(h)) return; h = Math.max(40, Math.min(300, h));
        selectedImgObj.data.h = h; selectedImgObj.dom.style.height = h+'px'; 
        document.getElementById('float-size-val').innerText = h + 'px'; updateFloatingToolbarPosition(selectedImgObj.dom);
    } 
}

function adjustSize(d) { if (selectedImgObj) { let newH = selectedImgObj.data.h + d; resizeSelectedImg(newH); markDirty(); } }
function applyToAll() { 
    if (!selectedImgObj) return; const h = selectedImgObj.data.h; 
    currentListData.tiers.forEach(t => t.items.forEach(i => i.h = h)); currentListData.dock.forEach(i => i.h = h); 
    deselectImg(); commitChange(); 
}

function downloadSelectedImage() {
    if (!selectedImgObj) return;
    const a = document.createElement('a'); a.href = selectedImgObj.data.src;
    let fileName = selectedImgObj.data.name || 'tiermaker_image';
    if (!fileName.includes('.')) fileName += '.png'; 
    a.download = fileName; a.click(); 
    if(typeof showToast === 'function') showToast("Downloading..."); 
    deselectImg(); 
}

function openRenameModal() {
    if (!selectedImgObj) return;
    document.getElementById('rename-input').value = selectedImgObj.dom.getAttribute('data-raw-name') || '';
    document.getElementById('rename-modal-overlay').style.display='flex';
    document.getElementById('rename-input').focus(); toggleFloatMore();
}

function saveRename() {
    if (!selectedImgObj) return;
    let newName = document.getElementById('rename-input').value.trim();
    selectedImgObj.data.name = newName; 
    
    selectedImgObj.dom.setAttribute('data-raw-name', newName);
    selectedImgObj.dom.dataset.name = newName.toLowerCase();
    
    let scoreStr = selectedImgObj.dom.getAttribute('data-score') || '-';
    let chapterStr = (selectedImgObj.data.chapter && currentListData.isStoryMode) ? `\n🔖 Chap: ${selectedImgObj.data.chapter}` : '';
    let tooltipName = newName ? newName : "Chưa có tên";
    selectedImgObj.dom.setAttribute('data-name-tooltip', `${tooltipName}\n⭐ ${scoreStr}${chapterStr}`);

    if(typeof closeModal==='function') closeModal('rename-modal-overlay'); 
    deselectImg(); commitChange(); 
    if(typeof showToast==='function') showToast("Đã lưu tên!");
}

async function copyImageName() {
    if (!selectedImgObj) return;
    let currentRawName = selectedImgObj.dom.getAttribute('data-raw-name') || '';
    if (!currentRawName) { if(typeof showToast==='function') showToast("Image has no name!", true); return; }
    try { await navigator.clipboard.writeText(currentRawName); if(typeof showToast==='function') showToast("Name copied!"); } 
    catch (err) { if(typeof showToast==='function') showToast("Failed to copy!", true); }
}

function clearImageName() { 
    if (!selectedImgObj) return; 
    selectedImgObj.data.name = ""; 
    
    selectedImgObj.dom.setAttribute('data-raw-name', "");
    selectedImgObj.dom.dataset.name = "";
    let scoreStr = selectedImgObj.dom.getAttribute('data-score') || '-';
    let chapterStr = (selectedImgObj.data.chapter && currentListData.isStoryMode) ? `\n🔖 Chap: ${selectedImgObj.data.chapter}` : '';
    selectedImgObj.dom.setAttribute('data-name-tooltip', `Chưa có tên\n⭐ ${scoreStr}${chapterStr}`);

    deselectImg(); commitChange(); 
    if(typeof showToast==='function') showToast("Đã xóa tên!"); 
}

function changeReadStatus(val) { 
    if (!selectedImgObj) return; 
    selectedImgObj.data.readStatus = val; 
    selectedImgObj.dom.setAttribute('data-status', val); 
    
    const badge = selectedImgObj.dom.querySelector('.status-badge:not(.chapter-badge)');
    if(badge) badge.innerHTML = getStatusIcon(val);

    commitChangeSilent(); 
}

function applyChapter(val) {
    if (!selectedImgObj) return;
    selectedImgObj.data.chapter = val.trim();
    
    let rawName = selectedImgObj.dom.getAttribute('data-raw-name') || '';
    let tooltipName = rawName ? rawName : "Chưa có tên";
    let scoreStr = selectedImgObj.dom.getAttribute('data-score') || '-';
    let chapterStr = (selectedImgObj.data.chapter && currentListData.isStoryMode) ? `\n🔖 Chap: ${selectedImgObj.data.chapter}` : '';
    selectedImgObj.dom.setAttribute('data-name-tooltip', `${tooltipName}\n⭐ ${scoreStr}${chapterStr}`);

    let oldBadge = selectedImgObj.dom.querySelector('.chapter-badge');
    if (oldBadge) oldBadge.remove();
    
    if (selectedImgObj.data.chapter && currentListData.isStoryMode) {
        const chapBadge = document.createElement('div');
        chapBadge.className = 'status-badge chapter-badge';
        chapBadge.style.right = 'auto'; 
        chapBadge.style.left = '5px'; 
        chapBadge.style.width = 'auto';
        chapBadge.style.padding = '0 6px';
        chapBadge.style.borderRadius = '6px';
        chapBadge.style.background = 'rgba(59, 130, 246, 0.9)';
        chapBadge.style.fontSize = '11px';
        chapBadge.innerHTML = `<i class="ph-bold ph-bookmark-simple" style="margin-right:3px"></i> ${selectedImgObj.data.chapter}`;
        selectedImgObj.dom.appendChild(chapBadge);
    }
    
    refreshFloatImageTitle(); 
    commitChangeSilent();
}

// ==========================================
// SEARCH ENGINE
// ==========================================
function updateSearchTypeUI() {
    const btn = document.getElementById('btn-search-type');
    if (!btn) return;
    if (searchType === 'manga') {
        btn.innerHTML = '<i class="ph ph-book-open"></i> Đang tìm: Manga';
        btn.style.color = 'var(--accent)';
    } else {
        btn.innerHTML = '<i class="ph ph-television"></i> Đang tìm: Anime';
        btn.style.color = 'var(--warning)';
    }
}

function toggleSearchType(e) {
    if (e) e.stopPropagation(); 
    searchType = searchType === 'manga' ? 'anime' : 'manga';
    localStorage.setItem('searchType', searchType);
    updateSearchTypeUI();
}

function searchAnime(site) {
    if (!selectedImgObj) return;
    let currentRawName = selectedImgObj.dom.getAttribute('data-raw-name') || '';
    if (!currentRawName) { if(typeof showToast==='function') showToast("Chưa có tên để tra cứu!", true); return; }
    
    const q = encodeURIComponent(currentRawName);
    let url = '';
    
    switch(site) {
        case 'mal': url = searchType === 'manga' ? `https://myanimelist.net/manga.php?q=${q}&cat=manga` : `https://myanimelist.net/anime.php?q=${q}&cat=anime`; break;
        case 'anilist': url = `https://anilist.co/search/${searchType}?search=${q}`; break;
        case 'animeplanet': url = `https://www.anime-planet.com/${searchType}/all?name=${q}`; break;
        default: url = `https://www.google.com/search?q=${searchType}+${q}`;
    }
    
    window.open(url, '_blank');
    toggleFloatMore();
}

// ==========================================
// SCORE, MOVE & AUTO-ARRANGE ACTIONS
// ==========================================
function getTierIndexByScore(score) {
    if (!currentListData || !currentListData.tiers || currentListData.tiers.length === 0) return -1;
    
    score = parseFloat(score);
    for (let i = 0; i < currentListData.tiers.length; i++) {
        let t = currentListData.tiers[i];
        if (t.minScore !== undefined && t.maxScore !== undefined) {
            if (score >= t.minScore && score <= t.maxScore) return i; 
        }
    }
    let tempTiers = currentListData.tiers.map((t, idx) => ({ min: t.minScore !== undefined ? t.minScore : 0, index: idx }));
    tempTiers.sort((a, b) => b.min - a.min); 
    for (let t of tempTiers) { if (score >= t.min) return t.index; }
    return tempTiers[tempTiers.length - 1].index;
}

function applyScoreMove(score) {
    if (!selectedImgObj || !currentListData || currentListData.tiers.length === 0) return;
    let parsedScore = parseFloat(score);
    if(isNaN(parsedScore) || parsedScore < 0 || parsedScore > 10) parsedScore = 5.0;
    parsedScore = Math.max(0, Math.min(10, parsedScore));
    let p = currentListData.scorePrecision || 2;
    parsedScore = Math.round(parsedScore * Math.pow(10, p)) / Math.pow(10, p);

    let targetIndex = getTierIndexByScore(parsedScore);
    
    if (targetIndex === -1) {
        if(typeof showToast === 'function') showToast("Bảng chưa có hàng (Tier) nào để nhận điểm!", true);
        return;
    }

    let sourceArray = (selectedImgObj.type === 'tier') ? currentListData.tiers[selectedImgObj.r].items : currentListData.dock;
    let oldIdx = sourceArray.indexOf(selectedImgObj.data);
    if(oldIdx !== -1) sourceArray.splice(oldIdx, 1);
    
    selectedImgObj.data.score = parsedScore;
    currentListData.tiers[targetIndex].items.push(selectedImgObj.data);
    currentListData.tiers[targetIndex].items.sort((a, b) => (b.score !== undefined ? b.score : -1) - (a.score !== undefined ? a.score : -1));

    if(typeof showToast === 'function') showToast(`Đã chuyển tới ${currentListData.tiers[targetIndex].name}`); 
    deselectImg(); commitChange(); 
}

function deleteSelected() { 
    let oldArray = (selectedImgObj.type === 'tier') ? currentListData.tiers[selectedImgObj.r].items : currentListData.dock; 
    let oldIdx = oldArray.indexOf(selectedImgObj.data);
    if(oldIdx !== -1) oldArray.splice(oldIdx, 1);
    commitChange(); deselectImg(); 
}
function moveToDock() { 
    let oldArray = (selectedImgObj.type === 'tier') ? currentListData.tiers[selectedImgObj.r].items : currentListData.dock; 
    let oldIdx = oldArray.indexOf(selectedImgObj.data);
    if(oldIdx !== -1) oldArray.splice(oldIdx, 1); 
    currentListData.dock.push(selectedImgObj.data); 
    commitChange(); deselectImg(); 
}

function sortTierItems(type) {
    if(typeof openConfirm === 'function') {
        openConfirm("Auto Arrange", `Sort images by ${type.toUpperCase()}?`, () => {
            currentListData.tiers.forEach(t => {
                t.items.sort((a, b) => {
                    if (type === 'az') return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
                    else if (type === 'score') return (b.score !== undefined ? b.score : -1) - (a.score !== undefined ? a.score : -1);
                    else if (type === 'random') return Math.random() - 0.5;
                    return 0;
                });
            });
            commitChange(); if(typeof showToast === 'function') showToast("Auto Arranged!");
        });
    }
}
