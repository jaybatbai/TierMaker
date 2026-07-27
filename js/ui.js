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
    if (typeof updateDOMTranslations === 'function') updateDOMTranslations();
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
    if (typeof updateDOMTranslations === 'function') updateDOMTranslations();

    try { 
        const req = db.transaction(['lists']).objectStore('lists').getAll();
        req.onsuccess = e => { 
            try {
                const list = e.target.result; 
                if (!list || list.length === 0) { 
                    container.innerHTML = `<div style="text-align:center; padding: 60px 20px; color: var(--text-muted); grid-column: 1/-1; font-size: 1.1rem;"><i class="ph ph-folder-open" style="font-size: 3rem"></i><br><br>${t('empty_board_msg')}</div>`; 
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
    showLoading(t('processing', 'Processing...')); 
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
        showToast("Error opening Tier List!", true);
    } 
}

async function backToMenu() { 
    const searchInput = document.getElementById('dock-search');
    if (searchInput) searchInput.value = ''; 
    const statusSelect = document.getElementById('dock-status-filter');
    if (statusSelect) statusSelect.value = '';

    if (typeof deselectImg === 'function') deselectImg(); 
    if (isNameCopyMode && typeof toggleNameCopyMode === 'function') toggleNameCopyMode(); 
    
    showLoading(t('processing', 'Processing...')); 
    try { 
        if (isDirty) saveListSilent(currentListData); 
        const canvas = await html2canvas(document.getElementById('capture-area'), { scale: 1, backgroundColor: '#000', useCORS: true }); 
        currentListData.thumbnail = canvas.toDataURL('image/jpeg', 0.6); 
        saveListSilent(currentListData); 
    } catch (err) {
        showToast("Thumbnail save error, but data is safe.", true);
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
    showLoading(t('processing', 'Processing...'));
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
            hideLoading(); showToast(currentLang === 'vi' ? "Đã sao chép bảng!" : "Board duplicated!"); loadMenu(); 
        }
    };
}

function deleteSingleList(e, id, name) { 
    e.stopPropagation(); 
    openConfirm(t('confirm_title'), `${t('are_you_sure')} "${name}"?`, () => { 
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
                showToast(currentLang === 'vi' ? 'Tên bảng đã tồn tại!' : 'Board name already exists!', true); 
                return; 
            } 
            showLoading(t('processing', 'Processing...')); 
            
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
                    isStoryMode: isStoryMode, copyNameMode: 'all', copyNameCount: 1 
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
    
    const copySelect = document.getElementById('setting-copy-mode-select');
    if (copySelect) copySelect.value = currentListData.copyNameMode || (currentListData.copyIncludesAlt === false ? 'first' : 'all');
    
    const copyCountInp = document.getElementById('setting-copy-count-input');
    if (copyCountInp) copyCountInp.value = currentListData.copyNameCount || 1;
    
    toggleCopyCountVisibility();

    document.getElementById('setting-shape-select').value = currentListData.shape || 'auto';
    document.getElementById('setting-font-select').value = currentListData.fontIndex || 0;
    document.getElementById('setting-precision-select').value = currentListData.scorePrecision || 2;
    document.getElementById('settings-modal-overlay').style.display='flex'; 
}

function toggleHeaderSetting(isChecked) { currentListData.headerVisible = isChecked; commitChange(); }
function toggleFilenameSetting(isChecked) { currentListData.showFilename = isChecked; commitChange(); }

function changeCopyModeSetting(val) { 
    currentListData.copyNameMode = val; 
    toggleCopyCountVisibility();
    commitChangeSilent(); 
}

function changeCopyCountSetting(val) { 
    let count = parseInt(val) || 1;
    currentListData.copyNameCount = Math.max(1, count); 
    commitChangeSilent(); 
}

function toggleCopyCountVisibility() {
    const mode = currentListData.copyNameMode || 'all';
    const row = document.getElementById('setting-copy-count-row');
    if (row) {
        row.style.display = (mode === 'first_n') ? 'flex' : 'none';
    }
}

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
function deleteTier() { closeModal('modal-overlay'); openConfirm(t('confirm_title'), currentLang==='vi'?'Xóa dòng này? Ảnh trong dòng cũng sẽ bị xóa.':'Delete this row? Images in this row will also be deleted.', () => { currentListData.tiers.splice(editingTierIndex, 1); commitChange(); }); }
function resetBoard() { openConfirm(t('confirm_title'), currentLang==='vi'?'Đưa toàn bộ ảnh trên bảng về Khay Dock?':'Return all images on the board to the Dock?', () => { currentListData.tiers.forEach(t => { currentListData.dock.push(...t.items); t.items = []; }); commitChange(); }); }

function clearAllImages() {
    openConfirm(t('confirm_title'), currentLang==='vi'?'Xóa toàn bộ ảnh trên bảng và Dock? Thao tác này không thể hoàn tác!':'Delete all images from the board and Dock? This cannot be undone!', () => {
        currentListData.dock = [];
        currentListData.tiers.forEach(t => t.items = []);
        
        if (typeof deselectImg === 'function') deselectImg();
        if (isMultiSelectMode) { multiSelectImages = []; if(typeof updateBulkUI==='function') updateBulkUI(); }
        
        commitChange();
        showToast(currentLang==='vi'?'Đã xóa tất cả ảnh!':'All images cleared!');
    });
}

function clearDock() {
    openConfirm(t('confirm_title'), currentLang==='vi'?'Xóa toàn bộ ảnh trong Dock?':'Delete all images waiting in the Dock?', () => {
        currentListData.dock = [];
        
        if (typeof deselectImg === 'function') deselectImg();
        if (isMultiSelectMode) { multiSelectImages = []; if(typeof updateBulkUI==='function') updateBulkUI(); }
        
        commitChange();
        showToast(currentLang==='vi'?'Đã xóa Dock!':'Dock cleared!');
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
// TÍNH NĂNG MỚI: TẠO BÁO CÁO VĂN BẢN & COPY TẤT CẢ TÊN
// ==========================================
function openExportReportModal() {
    if (!currentListData) return;
    
    closeModal('settings-modal-overlay');
    const floatMenu = document.getElementById('float-more-menu');
    if (floatMenu) floatMenu.style.display = 'none';

    document.getElementById('export-report-modal-overlay').style.display = 'flex';
    generateReportText();
}

function generateReportText() {
    if (!currentListData) return '';

    const incTier = document.getElementById('report-opt-tier')?.checked ?? true;
    const incScore = document.getElementById('report-opt-score')?.checked ?? true;
    const incChap = document.getElementById('report-opt-chap')?.checked ?? true;
    const incStatus = document.getElementById('report-opt-status')?.checked ?? true;
    const scope = document.getElementById('report-opt-scope')?.value || 'both';

    let lines = [];
    lines.push(`📋 ${currentListData.name.toUpperCase()} - ${currentLang === 'vi' ? 'BÁO CÁO THỐNG KÊ' : 'STATISTICS REPORT'}`);
    lines.push(`📅 ${new Date().toLocaleDateString()}`);
    lines.push(`----------------------------------------\n`);

    const formatItem = (item) => {
        let nameStr = typeof getFormattedCopyName === 'function' ? getFormattedCopyName(item) : (item.names?.[0] || 'Untitled');
        if (!nameStr) nameStr = currentLang === 'vi' ? 'Chưa đặt tên' : 'Untitled';
        
        let details = [];
        let p = currentListData.scorePrecision || 2;

        if (incScore && item.score !== undefined) {
            details.push(`⭐ ${item.score.toFixed(p)}`);
        }
        if (incChap && item.chapter && currentListData.isStoryMode) {
            details.push(`🔖 Chap ${item.chapter}`);
        }
        if (incStatus && item.readStatus && item.readStatus !== 'none' && currentListData.isStoryMode) {
            let statusMap = {
                'reading': currentLang === 'vi' ? 'Đang đọc' : 'Reading',
                'completed': currentLang === 'vi' ? 'Đã xong' : 'Completed',
                'on-hold': currentLang === 'vi' ? 'Tạm ngưng' : 'On-Hold',
                'dropped': currentLang === 'vi' ? 'Đã bỏ' : 'Dropped',
                'plan': currentLang === 'vi' ? 'Dự định' : 'Plan'
            };
            details.push(`[${statusMap[item.readStatus] || item.readStatus}]`);
        }

        let detailStr = details.length > 0 ? ` (${details.join(' | ')})` : '';
        return `- ${nameStr}${detailStr}`;
    };

    if (scope === 'board' || scope === 'both') {
        if (incTier) {
            currentListData.tiers.forEach(tier => {
                if (tier.items.length > 0) {
                    lines.push(`=== ${tier.name} (${tier.items.length}) ===`);
                    tier.items.forEach(item => lines.push(formatItem(item)));
                    lines.push('');
                }
            });
        } else {
            lines.push(`=== ${currentLang === 'vi' ? 'TẤT CẢ ẢNH TRÊN BẢNG' : 'ALL BOARD IMAGES'} ===`);
            currentListData.tiers.forEach(tier => {
                tier.items.forEach(item => lines.push(formatItem(item)));
            });
            lines.push('');
        }
    }

    if (scope === 'dock' || scope === 'both') {
        if (currentListData.dock.length > 0) {
            lines.push(`=== ${currentLang === 'vi' ? 'KHAY DOCK' : 'DOCK'} (${currentListData.dock.length}) ===`);
            currentListData.dock.forEach(item => lines.push(formatItem(item)));
            lines.push('');
        }
    }

    const finalText = lines.join('\n').trim();
    const textarea = document.getElementById('report-preview-textarea');
    if (textarea) textarea.value = finalText;
    return finalText;
}

async function copyFullReport() {
    const text = generateReportText();
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        showToast(t('toast_copied_report'));
    } catch (e) {
        showToast("Failed to copy!", true);
    }
}

async function copyAllNamesOnly() {
    if (!currentListData) return;
    const scope = document.getElementById('report-opt-scope')?.value || 'both';
    let names = [];

    const processItem = (item) => {
        let nameStr = typeof getFormattedCopyName === 'function' ? getFormattedCopyName(item) : (item.names?.[0] || '');
        if (nameStr) names.push(nameStr);
    };

    if (scope === 'board' || scope === 'both') {
        currentListData.tiers.forEach(t => t.items.forEach(processItem));
    }
    if (scope === 'dock' || scope === 'both') {
        currentListData.dock.forEach(processItem);
    }

    if (names.length === 0) {
        showToast(t('toast_no_name'), true);
        return;
    }

    const finalText = names.join('\n');
    try {
        await navigator.clipboard.writeText(finalText);
        showToast(t('toast_copied_all_names'));
    } catch (e) {
        showToast("Failed to copy!", true);
    }
}

function downloadReportTxt() {
    const text = generateReportText();
    if (!text) return;
    
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = currentListData.name ? currentListData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : "tierlist";
    a.download = `${safeName}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(currentLang === 'vi' ? "Đã tải file .TXT báo cáo!" : "Report .TXT downloaded!");
}

// ==========================================
// BACKUP SYSTEM V2
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
    } catch (err) { showToast("Backup error!", true); } 
}

function importDataV2(e) { 
    const file = e.target.files[0]; 
    if (!file) return; 
    
    showLoading(t('processing', 'Processing...'));

    const reader = new FileReader(); 
    reader.onload = ev => { 
        setTimeout(() => {
            try { 
                let data = JSON.parse(ev.target.result); 
                
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
                    showToast(currentLang==='vi'?'Phục hồi dữ liệu thành công!':'Data imported successfully!'); 
                    loadMenu(); 
                    closeModal('backup-modal-overlay'); 
                }; 
                tx.onerror = () => {
                    hideLoading();
                    showToast('Database Error!', true);
                };
            } catch(err) { 
                console.error(err);
                hideLoading();
                showToast('File is corrupted or invalid!', true); 
            } 
        }, 150);
    }; 
    reader.readAsText(file); 
    e.target.value = ''; 
}

function wipeAllDataV2() { 
    openConfirm(t('confirm_title'), currentLang==='vi'?'Xóa SẠCH toàn bộ dữ liệu? Không thể khôi phục!':'Wipe ALL data? Unrecoverable without backup.', () => { 
        try {
            db.transaction(['lists'], 'readwrite').objectStore('lists').clear().onsuccess = () => {
                showToast(currentLang==='vi'?'Đã xóa sạch bộ nhớ!':'Database wiped clean!'); loadMenu(); closeModal('backup-modal-overlay');
            };
        } catch (e) { showToast("Error wiping data!", true); }
    }); 
}
