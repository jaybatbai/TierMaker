console.log("🚀 files.js loaded successfully!");

// ==========================================
// API BỔ TRỢ: TỰ ĐỘNG TẢI DỮ LIỆU TỪ MYANIMELIST
// ==========================================
async function fetchJikanMetadata(query, type = 'manga') {
    if (!query) return null;
    try {
        const res = await fetch(`https://api.jikan.moe/v4/${type}?q=${encodeURIComponent(query)}&limit=1`);
        if (!res.ok) return null;
        const json = await res.json();
        if (!json.data || json.data.length === 0) return null;
        
        const item = json.data[0];
        const fetchedNames = new Set();
        
        if (item.title) fetchedNames.add(item.title);
        if (item.title_english) fetchedNames.add(item.title_english);
        if (item.title_japanese) fetchedNames.add(item.title_japanese);
        if (Array.isArray(item.titles)) {
            item.titles.forEach(tObj => {
                if (tObj.title) fetchedNames.add(tObj.title);
            });
        }
        
        return {
            names: Array.from(fetchedNames),
            score: item.score || null,
            chapters: item.chapters || null,
            coverUrl: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || null
        };
    } catch (e) {
        console.error("Fetch metadata error:", e);
        return null;
    }
}

// ==========================================
// FILE UPLOADING & IMAGE EXPORT ENGINE
// ==========================================

function handleBgImage(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if(typeof showLoading === 'function') showLoading("Processing background...");
    const r = new FileReader();
    r.onload = ev => {
        const i = new Image(); i.src = ev.target.result;
        i.onload = () => {
            try {
                const c = document.createElement('canvas'); const x = c.getContext('2d');
                const M = 1920; let w = i.width; let h = i.height;
                if (w > M) { h *= (M/w); w = M; }
                c.width = w; c.height = h; x.drawImage(i, 0, 0, w, h);
                currentListData.background = `url(${c.toDataURL('image/webp', 0.85)})`;
                commitChange();
            } catch(err) { if(typeof showToast === 'function') showToast("Lỗi khi load Background!", true); } 
            finally { if(typeof hideLoading === 'function') hideLoading(); document.getElementById('bg-img-input').value = ''; }
        }; 
        i.onerror = () => { if(typeof hideLoading === 'function') hideLoading(); document.getElementById('bg-img-input').value = ''; if(typeof showToast === 'function') showToast("File ảnh bị lỗi!", true); }
    }; r.readAsDataURL(file);
}

function saveImage() { 
    if(typeof deselectImg === 'function') deselectImg(); 
    if(typeof showLoading === 'function') showLoading('Đang xuất ảnh chất lượng cao (PNG)...'); 
    
    setTimeout(() => {
        const captureArea = document.getElementById('capture-area') || document.getElementById('main-capture-wrap');
        document.body.classList.add('exporting');

        html2canvas(captureArea, {
            useCORS: true, 
            scale: 2, 
            backgroundColor: null 
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `TierList_${new Date().getTime()}.png`; 
            link.href = canvas.toDataURL('image/png', 1.0); 
            link.click();
            
            document.body.classList.remove('exporting');
            if(typeof hideLoading === 'function') hideLoading();
            if(typeof showToast === 'function') showToast("Đã tải ảnh thành công!");
        }).catch(err => {
            console.error("Lỗi xuất ảnh:", err);
            document.body.classList.remove('exporting');
            if(typeof hideLoading === 'function') hideLoading();
            if(typeof showToast === 'function') showToast("Lỗi: Hình ảnh chứa URL bị chặn CORS không thể xuất.", true);
        });
    }, 300); 
}

function processFilesArray(filesToProcess) { 
    if (filesToProcess.length === 0) { document.getElementById('imgInput').value = ''; return; } 
    if(typeof showLoading === 'function') showLoading("Processing images..."); 
    let processed = 0; 
    let errorCount = 0;

    filesToProcess.forEach(f => { 
        const r = new FileReader(); 
        r.onload = ev => { 
            const i = new Image(); i.src = ev.target.result; 
            i.onload = () => { 
                try { 
                    const c = document.createElement('canvas'); const x = c.getContext('2d'); 
                    let w = i.width; let h = i.height; if (w > 1500) { h *= (1500/w); w = 1500; } 
                    c.width = w; c.height = h; x.drawImage(i, 0, 0, w, h); 
                    
                    let cleanName = f.name.replace(/\.[^/.]+$/, "");
                    currentListData.dock.push({ src: c.toDataURL('image/webp', 0.85), h: 85, names: [cleanName] }); 
                } catch(err) { errorCount++; } 
                finally { 
                    processed++; 
                    if (processed === filesToProcess.length) { 
                        commitChange(); if(typeof hideLoading === 'function') hideLoading(); 
                        if(errorCount > 0 && typeof showToast === 'function') showToast(`${errorCount} ảnh bị lỗi!`, true);
                    } 
                } 
            }; 
            i.onerror = () => { 
                processed++; errorCount++;
                if (processed === filesToProcess.length) { commitChange(); if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast(`${errorCount} ảnh bị lỗi!`, true); } 
            } 
        }; 
        r.onerror = () => {
            processed++; errorCount++;
            if (processed === filesToProcess.length) { commitChange(); if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast(`Đọc file thất bại!`, true); } 
        }
        r.readAsDataURL(f); 
    }); 
    document.getElementById('imgInput').value = ''; 
}

function handleFiles(e) { 
    try {
        const files = Array.from(e.target.files).filter(f => { 
            if (!f.type.startsWith('image/')) { if(typeof showToast === 'function') showToast(`❌ File "${escapeHTML(f.name)}" không phải ảnh.`, true); return false; } 
            if (f.size > 8 * 1024 * 1024) { if(typeof showToast === 'function') showToast(`❌ Ảnh "${escapeHTML(f.name)}" quá lớn (>8MB).`, true); return false; }
            return true; 
        }); 
        
        if (files.length === 0) { e.target.value = ''; return; } 
        
        const existingNames = new Set(); 
        if (currentListData) { 
            currentListData.dock.forEach(img => { if(img.names && img.names[0]) existingNames.add(img.names[0]); }); 
            currentListData.tiers.forEach(t => { t.items.forEach(img => { if(img.names && img.names[0]) existingNames.add(img.names[0]); }); }); 
        } 
        
        const newFiles = []; const duplicateFiles = []; 
        files.forEach(f => { if (existingNames.has(f.name.replace(/\.[^/.]+$/, ""))) duplicateFiles.push(f); else newFiles.push(f); }); 
        
        if (duplicateFiles.length > 0) { 
            const msg = `Phát hiện ${duplicateFiles.length} ảnh trùng tên. Bạn có muốn tải lên cả những ảnh bị trùng không?`; 
            if(typeof openConfirm === 'function') openConfirm("Trùng Lặp", msg, () => processFilesArray([...newFiles, ...duplicateFiles]), () => processFilesArray(newFiles) ); 
        } else processFilesArray(newFiles); 
    } catch (err) {
        if(typeof showToast === 'function') showToast("Lỗi khi tải file!", true);
    }
}

// TỐI ƯU CẢI TIẾN: THÊM ẢNH TỪ URL + TỰ TẢI THÔNG TIN TÊN CHÍNH CHỦ
async function importImageFromURL() {
    if (!currentListData) return;
    const url = prompt(currentLang === 'vi' ? "Dán URL ảnh vào đây:\n(Ví dụ: https://example.com/image.png)" : "Paste Image URL here:\n(e.g., https://example.com/image.png)");
    if (!url) return;

    let searchPrompt = prompt(currentLang === 'vi' ? "Nhập tên Anime/Manga để tự động tải tất cả tên phụ (hoặc để trống):" : "Enter Anime/Manga name to auto-fetch all titles (optional):");
    
    if(typeof showLoading === 'function') showLoading("Downloading & Fetching Info...");
    
    try {
        let meta = null;
        if (searchPrompt && searchPrompt.trim()) {
            meta = await fetchJikanMetadata(searchPrompt.trim(), searchType || 'manga');
        }

        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
        let res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Network error with primary proxy");
        
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = ev => {
            const i = new Image(); i.src = ev.target.result;
            i.onload = () => {
                try {
                    const c = document.createElement('canvas'); const x = c.getContext('2d');
                    const M = 1500; let w = i.width; let h = i.height;
                    if (w > M) { h *= (M/w); w = M; }
                    c.width = w; c.height = h; x.drawImage(i, 0, 0, w, h);
                    
                    let names = meta && meta.names.length > 0 ? meta.names : [];
                    if (names.length === 0) {
                        let cleanName = url.split('/').pop().split('?')[0].replace(/\.[^/.]+$/, "");
                        names = [cleanName || "web_image"];
                    }
                    
                    currentListData.dock.push({ 
                        src: c.toDataURL('image/webp', 0.85), 
                        h: 85, 
                        names: names 
                    });

                    commitChange(); 
                    if(typeof hideLoading === 'function') hideLoading(); 
                    if(typeof showToast === 'function') showToast(currentLang === 'vi' ? "Đã nhập ảnh và tải xong danh sách tên!" : "Image imported with official names!");
                } catch(e) { if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast("⚠️ Không thể đọc dữ liệu ảnh.", true); }
            };
            i.onerror = () => { if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast("Invalid image URL.", true); }
        };
        reader.readAsDataURL(blob);
    } catch (err) {
        if(typeof hideLoading === 'function') hideLoading();
        if(typeof showToast === 'function') showToast("❌ Không thể tải ảnh (Bị chặn CORS).", true);
    }
}

async function downloadAllImagesAsZip() {
    if (!currentListData) return;
    if (typeof JSZip === 'undefined') { if(typeof showToast === 'function') showToast("JSZip library đang tải, thử lại sau!", true); return; }
    if(typeof showLoading === 'function') showLoading("Zipping images...\nPlease wait.");
    try {
        const zip = new JSZip();
        let count = 0;
        const nameTally = {}; 
        const processItem = (item) => {
            if (!item.src) return;
            let name = item.names && item.names.length > 0 ? item.names[0] : "image";
            if (nameTally[name] !== undefined) { nameTally[name]++; name = `${name} (${nameTally[name]})`; } 
            else { nameTally[name] = 0; }
            const filename = name + ".webp"; 
            const base64Data = item.src.split(',')[1];
            if (base64Data) { zip.file(filename, base64Data, {base64: true}); count++; }
        };
        currentListData.tiers.forEach(t => t.items.forEach(processItem));
        currentListData.dock.forEach(processItem);
        if (count === 0) { if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast("⚠️ Không có ảnh để nén!", true); return; }
        
        const content = await zip.generateAsync({type: "blob"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        const safeBoardName = currentListData.name ? currentListData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : "tierlist";
        a.download = `${safeBoardName}_images.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast(`Đã tải xuống ${count} ảnh!`); if(typeof closeModal === 'function') closeModal('settings-modal-overlay');
    } catch (err) { if(typeof hideLoading === 'function') hideLoading(); if(typeof showToast === 'function') showToast("Lỗi tạo file ZIP!", true); }
}

window.openBackupMenu = function() { 
    const modal = document.getElementById('backup-modal-overlay');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        alert("❌ Lỗi: Không tìm thấy giao diện Backup Modal!");
    }
}

function exportData() { 
    try { 
        db.transaction(['lists']).objectStore('lists').getAll().onsuccess = e => { 
            const data = JSON.stringify(e.target.result); 
            const blob = new Blob([data], {type: "application/json"}); 
            const url = URL.createObjectURL(blob); 
            const a = document.createElement('a'); 
            a.href = url; a.download = `TierMaker_Backup_${Date.now()}.json`; a.click(); 
            setTimeout(() => URL.revokeObjectURL(url), 1000); 
        }; 
    } catch (err) { if(typeof showToast === 'function') showToast("Lỗi khi Backup!", true); } 
}

function importData(e) { 
    const file = e.target.files[0]; 
    if (!file) return; 
    
    if(typeof showLoading === 'function') showLoading("Đang đọc file Backup...");

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

                if (typeof isValidTierData === 'function' && !isValidTierData(data)) throw new Error("Dữ liệu không hợp lệ"); 
                
                const tx = db.transaction(['lists'], 'readwrite'); 
                const store = tx.objectStore('lists'); 
                data.forEach(item => store.put(item)); 
                
                tx.oncomplete = () => { 
                    if(typeof hideLoading === 'function') hideLoading();
                    if(typeof showToast === 'function') showToast('Phục hồi dữ liệu thành công!'); 
                    if(typeof loadMenu === 'function') loadMenu(); 
                    if(typeof closeModal === 'function') closeModal('backup-modal-overlay'); 
                }; 
                tx.onerror = () => {
                    if(typeof hideLoading === 'function') hideLoading();
                    if(typeof showToast === 'function') showToast('Lỗi khi ghi vào Database!', true);
                };
            } catch(err) { 
                console.error("Import Error:", err);
                if(typeof hideLoading === 'function') hideLoading();
                if(typeof showToast === 'function') showToast('File bị hỏng hoặc không đúng chuẩn!', true); 
            } 
        }, 150);
    }; 
    reader.readAsText(file); e.target.value = ''; 
}

function wipeAllData() { 
    if(typeof openConfirm === 'function') {
        openConfirm("WARNING", "Wipe ALL data? All boards will be deleted.", () => { 
            try {
                db.transaction(['lists']).objectStore('lists').getAll().onsuccess = ev => {
                    const allData = ev.target.result;
                    if(allData && allData.length > 0 && typeof pushMenuAction === 'function') pushMenuAction({type: 'WIPE', data: allData});
                    
                    db.transaction(['lists'], 'readwrite').objectStore('lists').clear().onsuccess = () => {
                        if(typeof showToast === 'function') showToast("All data wiped!"); 
                        if(typeof loadMenu === 'function') loadMenu();
                    };
                };
            } catch (e) { if(typeof showToast === 'function') showToast("Lỗi xóa dữ liệu!", true); }
        }); 
    }
}
