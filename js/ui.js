// ==========================================
// UI UTILS: TOAST, LOADING, CONFIRM
// ==========================================
function showToast(msg, isError = false) { 
    const toast = document.getElementById('toast'); 
    const icon = isError ? 'ph-warning-circle' : 'ph-check-circle';
    
    if (isError) toast.classList.add('error');
    else toast.classList.remove('error');
    
    toast.innerHTML = `<i class="ph-fill ${icon}"></i> ${msg}`; 
    toast.classList.add('show'); 
    clearTimeout(toastTimeout); 
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000); 
}

function showLoading(text) { 
    document.getElementById('loading-text').innerText = text; 
    document.getElementById('loading-overlay').style.display='flex'; 
}

function hideLoading() { 
    document.getElementById('loading-overlay').style.display='none'; 
}

function openConfirm(title, desc, onConfirm, onCancel = null) { 
    document.getElementById('confirm-title').innerText = title; 
    document.getElementById('confirm-desc').innerText = desc; 
    confirmAction = onConfirm; 
    confirmCancelAction = onCancel; 
    document.getElementById('confirm-modal').style.display = 'flex'; 
}

function execConfirm() { if (confirmAction) confirmAction(); closeModal('confirm-modal'); }
function execCancel() { if (confirmCancelAction) confirmCancelAction(); closeModal('confirm-modal'); }
function closeModal(id) { document.getElementById(id).style.display='none'; }

// ==========================================
// THEME MANAGEMENT
// ==========================================
function initTheme() { 
    const savedTheme = localStorage.getItem('theme') || 'dark'; 
    document.documentElement.setAttribute('data-theme', savedTheme); 
    updateThemeIcon(savedTheme); 
}

function toggleTheme() { 
    const current = document.documentElement.getAttribute('data-theme'); 
    const target = current === 'dark' ? 'light' : 'dark'; 
    document.documentElement.setAttribute('data-theme', target); 
    localStorage.setItem('theme', target); 
    updateThemeIcon(target); 
}

function updateThemeIcon(theme) { 
    const btn = document.querySelector('.theme-toggle'); 
    if (btn) btn.innerHTML = theme === 'dark' ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun"></i>'; 
    document.getElementById('meta-theme-color').content = theme === 'dark' ? '#09090b' : '#f4f4f5'; 
}

// ==========================================
// MAIN MENU (HOME SCREEN)
// ==========================================
function loadMenu() { 
    const container = document.getElementById('list-container');
    try { 
        const req = db.transaction(['lists']).objectStore('lists').getAll();
        req.onsuccess = e => { 
            try {
                const list = e.target.result; 
                if (!list || list.length === 0) { 
                    container.innerHTML = '<div style="text-align:center; padding: 60px 20px; color: var(--text-muted); grid-column: 1/-1; font-size: 1.1rem;"><i class="ph ph-folder-open" style="font-size: 3rem"></i><br><br>You don\'t have any tier lists yet.<br>Click <b>+ Create New Template</b> above!</div>'; 
                    return; 
                }
                let html = ''; 
                list.forEach((l, index) => { 
                    const safeName = escapeHTML(l.name || 'Untitled'); 
                    const delay = index * 0.05; 
                    html += `<div class="list-item" style="animation-delay: ${delay}s" tabindex="0" aria-label="Board ${safeName}" onclick="openList('${l.id}')" onkeypress="if(event.key==='Enter') openList('${l.id}')">
                                <div class="list-actions-overlay">
                                    <button class="btn-list-action copy" title="Duplicate Board" onclick="duplicateList(event, '${l.id}')"><i class="ph ph-copy"></i></button>
                                    <button class="btn-list-action delete" title="Delete Board" onclick="deleteSingleList(event, '${l.id}', '${safeName}')"><i class="ph ph-trash"></i></button>
                                </div>
                                <img src="${l.thumbnail || ''}" alt="Thumbnail" style="width:100%; height:180px; object-fit:cover; object-position:top; background:#000;">
                                <div class="list-info-wrap"><h3 style="margin:0; font-size:1rem; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</h3></div>
                             </div>`; 
                }); 
                container.innerHTML = html; 
            } catch (err) {
                container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:40px;"><b>Render Error:</b> Data is stuck!<br><br><button onclick="wipeAllDataV2()" style="padding:10px; background:red; color:white; border:none; border-radius:5px;">Reset Data</button></div>`;
            }
        }; 
        req.onerror = e => { container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:40px;"><b>Database Error</b><br>Cannot fetch from storage.</div>`; }
    } catch (err) { container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:40px;"><b>System Error</b><br>Please refresh or clear cache.</div>`; } 
}

function openList(id) { 
    showLoading('Opening...'); 
    try { 
        db.transaction(['lists']).objectStore('lists').get(id).onsuccess = e => { 
            currentListData = e.target.result; 
            stateHistory = [JSON.stringify(currentListData)]; 
            historyIndex = 0; 
            isDirty = false; 
            document.getElementById('menu-screen').classList.add('hidden'); 
            document.getElementById('editor-screen').classList.remove('hidden'); 
            document.getElementById('list-name').value = currentListData.name; 
            if (typeof renderBoard === 'function') renderBoard(); 
            hideLoading(); 
        }; 
    } catch (err) { 
        hideLoading(); 
        showToast("Lỗi khi mở Tier List!", true);
    } 
}

async function backToMenu() { 
    document.getElementById('dock-search').value = ''; 
    if (typeof deselectImg === 'function') deselectImg(); 
    if (isNameCopyMode && typeof toggleNameCopyMode === 'function') toggleNameCopyMode(); 
    
    showLoading('Saving board...'); 
    try { 
        if (isDirty) saveListSilent(currentListData); 
        const canvas = await html2canvas(document.getElementById('capture-area'), { scale: 1, backgroundColor: '#000', useCORS: true }); 
        currentListData.thumbnail = canvas.toDataURL('image/jpeg', 0.6); 
        saveListSilent(currentListData); 
    } catch (err) {
        showToast("Lưu thumbnail bị lỗi, nhưng dữ liệu vẫn an toàn.", true);
    } finally { 
        currentListData = null; selectedImgObj = null; isMultiSelectMode = false; multiSelectImages = []; 
        document.getElementById('bulk-action-bar').classList.remove('show'); 
        document.getElementById('main-bottom-toolbar').style.transform = 'translateX(-50%) translateY(0)'; 
    } 
    hideLoading(); 
    document.getElementById('editor-screen').classList.add('hidden'); 
    document.getElementById('menu-screen').classList.remove('hidden'); 
    loadMenu(); 
}

function duplicateList(e, id) {
    e.stopPropagation();
    showLoading("Duplicating...");
    db.transaction(['lists']).objectStore('lists').get(id).onsuccess = e => { 
        let data = e.target.result;
        if(!data) return hideLoading();
        let clone = JSON.parse(JSON.stringify(data));
        clone.id = 'list_' + Date.now();
        clone.name = clone.name + " (Copy)";
        clone.updatedAt = new Date().toISOString();
        let tx = db.transaction(['lists'], 'readwrite');
        tx.objectStore('lists').put(clone);
        tx.oncomplete = () => { 
            pushMenuAction({type: 'DUPLICATE', id: clone.id});
            hideLoading(); showToast("Board duplicated!"); loadMenu(); 
        }
    };
}

function deleteSingleList(e, id, name) { 
    e.stopPropagation(); 
    openConfirm("Delete Board", `Are you sure you want to delete the board "${name}"?`, () => { 
        db.transaction(['lists']).objectStore('lists').get(id).onsuccess = ev => {
            const boardData = ev.target.result;
            if(boardData) pushMenuAction({type: 'DELETE', data: boardData});
            const tx = db.transaction(['lists'], 'readwrite'); 
            tx.objectStore('lists').delete(id); 
            tx.oncomplete = () => loadMenu(); 
        }
    }); 
}

function openCreateModal() { 
    document.getElementById('create-modal-overlay').style.display='flex'; 
    document.getElementById('new-template-name').focus(); 
    document.getElementById('new-board-type').value = 'story'; 
}

function confirmCreateList() { 
    const name = document.getElementById('new-template-name').value.trim() || 'New Board'; 
    const presetVal = document.getElementById('new-template-preset').value;
    const boardType = document.getElementById('new-board-type').value;
    const isStoryMode = (boardType === 'story');
    
    try { 
        db.transaction(['lists']).objectStore('lists').getAll().onsuccess = e => { 
            const list = e.target.result; 
            if (list.some(l => l.name.toLowerCase() === name.toLowerCase())) { 
                showToast('Tên Board đã tồn tại!', true); 
                return; 
            } 
            showLoading("Creating..."); 
            
            setTimeout(() => { 
                let newTiers = [];
                if (presetVal === 'gaming') {
                    newTiers = [
                        {name:'God Tier', color:'#FF7F7F', items:[], minScore: 9, maxScore: 10},
                        {name:'Epic', color:'#FFBF7F', items:[], minScore: 7, maxScore: 8.99},
                        {name:'Good', color:'#FFFF7F', items:[], minScore: 5, maxScore: 6.99},
                        {name:'Mid', color:'#BFFF7F', items:[], minScore: 3, maxScore: 4.99},
                        {name:'Trash', color:'#7F7FFF', items:[], minScore: 0, maxScore: 2.99}
                    ];
                } else if (presetVal === 'rating') {
                    newTiers = [
                        {name:'⭐⭐⭐⭐⭐', color:'#FF7F7F', items:[], minScore: 9, maxScore: 10},
                        {name:'⭐⭐⭐⭐', color:'#FFBF7F', items:[], minScore: 7, maxScore: 8.99},
                        {name:'⭐⭐⭐', color:'#FFFF7F', items:[], minScore: 5, maxScore: 6.99},
                        {name:'⭐⭐', color:'#BFFF7F', items:[], minScore: 3, maxScore: 4.99},
                        {name:'⭐', color:'#7F7FFF', items:[], minScore: 0, maxScore: 2.99}
                    ];
                } else {
                    newTiers = [
                        {name:'S', color:'#FF7F7F', items:[], minScore: 9, maxScore: 10},
                        {name:'A', color:'#FFBF7F', items:[], minScore: 8, maxScore: 8.99},
                        {name:'B', color:'#FFDF7F', items:[], minScore: 6, maxScore: 7.99},
                        {name:'C', color:'#FFFF7F', items:[], minScore: 4, maxScore: 5.99},
                        {name:'D', color:'#BFFF7F', items:[], minScore: 2, maxScore: 3.99},
                        {name:'F', color:'#7F7FFF', items:[], minScore: 0, maxScore: 1.99}
                    ];
                }

                const newList = { 
                    id: 'list_'+Date.now(), name: name, tiers: newTiers, dock: [],
                    shape: 'auto', background: null, fontIndex: 0, showFilename: false, scorePrecision: 2,
                    isStoryMode: isStoryMode 
                }; 
                saveListSilent(newList); 
                pushMenuAction({type: 'CREATE', id: newList.id});
                loadMenu(); closeModal('create-modal-overlay'); document.getElementById('new-template-name').value = ''; hideLoading(); 
            }, 300); 
        }; 
    } catch (err) {} 
}

function openSettingsModal() { 
    document.getElementById('setting-header-toggle').checked = (currentListData.headerVisible !== false);
    document.getElementById('setting-name-toggle').checked = !!currentListData.showFilename;
    document.getElementById('setting-story-toggle').checked = !!currentListData.isStoryMode;
    document.getElementById('setting-shape-select').value = currentListData.shape || 'auto';
    document.getElementById('setting-font-select').value = currentListData.fontIndex || 0;
    document.getElementById('setting-precision-select').value = currentListData.scorePrecision || 2;
    document.getElementById('settings-modal-overlay').style.display='flex'; 
}

function toggleHeaderSetting(isChecked) { currentListData.headerVisible = isChecked; commitChange(); }
function toggleFilenameSetting(isChecked) { currentListData.showFilename = isChecked; commitChange(); }
function toggleStoryModeSetting(isChecked) { 
    currentListData.isStoryMode = isChecked; 
    commitChange(); 
    if (selectedImgObj) deselectImg(); 
}

function changeImageShapeSetting(val) { currentListData.shape = val; commitChange(); }
function changeFontSetting(val) { currentListData.fontIndex = parseInt(val); commitChange(); }
function changeScorePrecisionSetting(val) {
    currentListData.scorePrecision = parseInt(val);
    let step = val == 1 ? "0.1" : "0.01";
    document.getElementById('float-score').setAttribute('step', step);
    document.getElementById('edit-min-score').setAttribute('step', step);
    document.getElementById('edit-max-score').setAttribute('step', step);
    commitChange();
}
function setBgColor(val) { currentListData.background = val; commitChange(); }
function resetBackground() { currentListData.background = null; commitChange(); }

function debounceSaveName() { 
    clearTimeout(saveTimeout); 
    saveTimeout = setTimeout(() => { 
        currentListData.name = document.getElementById('list-name').value; 
        commitChangeSilent(); 
        document.getElementById('tier-header').innerText = currentListData.name; 
    }, 500); 
}
function openHeaderModal() { const inputName = document.getElementById('list-name'); inputName.focus(); inputName.select(); }
function openHelpModal() { document.getElementById('help-modal').style.display='flex'; }
function toggleHeader() { currentListData.headerVisible = currentListData.headerVisible === false ? true : false; commitChange(); }

function openEditModal(i) { 
    editingTierIndex = i; 
    const t = currentListData.tiers[i]; 
    document.getElementById('edit-name').value = t.name; 
    document.getElementById('edit-color-picker').value = t.color; 
    
    let p = currentListData.scorePrecision || 2;
    let step = p === 1 ? "0.1" : "0.01";
    document.getElementById('float-score').setAttribute('step', step);
    document.getElementById('edit-min-score').setAttribute('step', step);
    document.getElementById('edit-max-score').setAttribute('step', step);
    
    document.getElementById('edit-min-score').value = t.minScore !== undefined ? t.minScore : 0;
    document.getElementById('edit-max-score').value = t.maxScore !== undefined ? t.maxScore : 10;
    
    document.getElementById('modal-overlay').style.display='flex'; 
    document.getElementById('edit-name').focus(); 
}

function setTierColor(color) { document.getElementById('edit-color-picker').value = color; }

function saveTierEdit() { 
    currentListData.tiers[editingTierIndex].name = document.getElementById('edit-name').value; 
    currentListData.tiers[editingTierIndex].color = document.getElementById('edit-color-picker').value; 
    let minVal = parseFloat(document.getElementById('edit-min-score').value);
    currentListData.tiers[editingTierIndex].minScore = isNaN(minVal) ? 0 : minVal;
    let maxVal = parseFloat(document.getElementById('edit-max-score').value);
    currentListData.tiers[editingTierIndex].maxScore = isNaN(maxVal) ? 10 : maxVal;
    
    closeModal('modal-overlay'); commitChange(); 
}

function moveTierUp() { if (editingTierIndex > 0) { const tmp = currentListData.tiers[editingTierIndex]; currentListData.tiers[editingTierIndex] = currentListData.tiers[editingTierIndex - 1]; currentListData.tiers[editingTierIndex - 1] = tmp; editingTierIndex--; commitChange(); } }
function moveTierDown() { if (editingTierIndex < currentListData.tiers.length - 1) { const tmp = currentListData.tiers[editingTierIndex]; currentListData.tiers[editingTierIndex] = currentListData.tiers[editingTierIndex + 1]; currentListData.tiers[editingTierIndex + 1] = tmp; editingTierIndex++; commitChange(); } }
function addNewTier() { currentListData.tiers.push({name:'NEW', color:'#1a1a1a', items:[], minScore: 0, maxScore: 0}); commitChange(); }
function deleteTier() { closeModal('modal-overlay'); openConfirm("Delete Row", "Delete this row? Images in this row (if any) will also be deleted.", () => { currentListData.tiers.splice(editingTierIndex, 1); commitChange(); }); }
function resetBoard() { openConfirm("Reset", "Return all images to the Dock?", () => { currentListData.tiers.forEach(t => { currentListData.dock.push(...t.items); t.items = []; }); commitChange(); }); }

function clearAllImages() {
    openConfirm("Clear All Images", "Xóa toàn bộ ảnh trên bảng và trong Dock? Hành động này không thể hoàn tác!", () => {
        currentListData.dock = [];
        currentListData.tiers.forEach(t => t.items = []);
        
        if (typeof deselectImg === 'function') deselectImg();
        if (isMultiSelectMode) { multiSelectImages = []; if(typeof updateBulkUI==='function') updateBulkUI(); }
        
        commitChange();
        showToast("Đã dọn sạch toàn bộ ảnh!");
    });
}

// Xóa riêng Dock
function clearDock() {
    openConfirm("Clear Dock", "Xóa toàn bộ ảnh đang chờ trong Dock? Hành động này không thể hoàn tác!", () => {
        currentListData.dock = [];
        
        if (typeof deselectImg === 'function') deselectImg();
        if (isMultiSelectMode) { multiSelectImages = []; if(typeof updateBulkUI==='function') updateBulkUI(); }
        
        commitChange();
        showToast("Đã dọn sạch ảnh trong Dock!");
    });
}

function openCaptionModal() { 
    if (selectedImgObj) { 
        document.getElementById('caption-input').value = selectedImgObj.data.caption || ''; 
        document.getElementById('caption-modal-overlay').style.display='flex'; 
        document.getElementById('caption-input').focus(); 
        document.getElementById('float-more-menu').style.display = 'none';
        document.getElementById('btn-float-more').style.background = 'transparent';
    } 
}

function saveCaption() { 
    if (!selectedImgObj) return;
    selectedImgObj.data.caption = document.getElementById('caption-input').value; 
    closeModal('caption-modal-overlay'); 
    deselectImg(); 
    commitChange(); 
}

// ==========================================
// BYPASS CACHE: HỆ THỐNG BACKUP V2 MỚI
// Cụm này sẽ lách qua file files.js cũ kỹ bị lỗi của bạn
// ==========================================
function openBackupModalV2() { 
    document.getElementById('backup-modal-overlay').style.display='flex'; 
}

function exportDataV2() { 
    try { 
        db.transaction(['lists']).objectStore('lists').getAll().onsuccess = e => { 
            const data = JSON.stringify(e.target.result); 
            const blob = new Blob([data], {type: "application/json"}); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement('a'); 
            a.href = url; a.download = `TierMaker_Backup_${Date.now()}.json`; a.click(); 
            setTimeout(() => URL.revokeObjectURL(url), 1000); 
        }; 
    } catch (err) { showToast("Lỗi khi Backup!", true); } 
}

function importDataV2(e) { 
    const file = e.target.files[0]; 
    if (!file) return; 
    
    showLoading("Đang đọc và sửa lỗi định dạng file...");

    const reader = new FileReader(); 
    reader.onload = ev => { 
        // Delay 1 chút để màn hình loading kịp hiện
        setTimeout(() => {
            try { 
                let data = JSON.parse(ev.target.result); 
                
                // Tự động sửa file cấu trúc siêu cũ thành chuẩn mới
                if (!Array.isArray(data) && typeof data === 'object') data = [data];
                
                data = data.map((item, index) => {
                    if (!item.id) item.id = 'list_imported_' + Date.now() + '_' + index;
                    if (typeof item.name !== 'string') item.name = item.name ? String(item.name) : 'Old Imported Board';
                    if (!Array.isArray(item.tiers)) item.tiers = [];
                    if (!Array.isArray(item.dock)) item.dock = [];
                    return item;
                });
                
                const tx = db.transaction(['lists'], 'readwrite'); 
                const store = tx.objectStore('lists'); 
                
                data.forEach(item => store.put(item)); 
                
                tx.oncomplete = () => { 
                    hideLoading();
                    showToast('Nhập dữ liệu thành công!'); 
                    loadMenu(); 
                    closeModal('backup-modal-overlay'); 
                }; 
                tx.onerror = () => {
                    hideLoading();
                    showToast('Lỗi Database!', true);
                };
            } catch(err) { 
                console.error(err);
                hideLoading();
                showToast('File hỏng hoặc không phải file Backup chuẩn!', true); 
            } 
        }, 150);
    }; 
    reader.readAsText(file); 
    e.target.value = ''; 
}

function wipeAllDataV2() { 
    openConfirm("WARNING", "Xóa sạch MỌI THỨ? Dữ liệu không thể khôi phục nếu chưa backup.", () => { 
        try {
            db.transaction(['lists'], 'readwrite').objectStore('lists').clear().onsuccess = () => {
                showToast("Đã dọn sạch database!"); loadMenu(); closeModal('backup-modal-overlay');
            };
        } catch (e) { showToast("Lỗi khi xóa dữ liệu!", true); }
    }); 
}
