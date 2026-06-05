// ==========================================
// FILE UPLOADING & IMAGE EXPORT ENGINE
// ==========================================

function handleBgImage(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    showLoading("Processing background...");
    const r = new FileReader();
    r.onload = ev => {
        const i = new Image(); i.src = ev.target.result;
        i.onload = () => {
            try {
                const c = document.createElement('canvas'); const x = c.getContext('2d');
                const M = 1920; let w = i.width; let h = i.height;
                if (w > M) { h *= (M/w); w = M; }
                c.width = w; c.height = h; x.drawImage(i, 0, 0, w, h);
                // Đổi sang WebP để hỗ trợ ảnh nền trong suốt & giảm RAM
                currentListData.background = `url(${c.toDataURL('image/webp', 0.85)})`;
                commitChange();
            } catch(err) { showToast("Lỗi khi load Background!", true); } 
            finally { hideLoading(); document.getElementById('bg-img-input').value = ''; }
        }; 
        i.onerror = () => { hideLoading(); document.getElementById('bg-img-input').value = ''; showToast("File ảnh bị lỗi!", true); }
    }; r.readAsDataURL(file);
}

function saveImage() { 
    if(typeof deselectImg === 'function') deselectImg(); 
    showLoading('Đang xuất ảnh chất lượng cao (PNG)...'); 
    
    // Đợi 300ms để các UI thừa (như viền chọn ảnh) kịp biến mất trước khi chụp
    setTimeout(() => {
        // Hỗ trợ bắt ID capture-area gốc của bạn
        const captureArea = document.getElementById('capture-area') || document.getElementById('main-capture-wrap');
        
        // Thêm class tạm thời để dễ dàng ẩn các nút bấm/scrollbar bằng CSS (nếu cần)
        document.body.classList.add('exporting');

        html2canvas(captureArea, {
            useCORS: true, 
            scale: 2, // Scale x2 đủ nét và an toàn không gây lỗi trên điện thoại yếu
            backgroundColor: null 
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `TierList_${new Date().getTime()}.png`; 
            
            // Ép hệ thống xuất ra chuẩn ảnh PNG, chất lượng 100%
            link.href = canvas.toDataURL('image/png', 1.0); 
            link.click();
            
            document.body.classList.remove('exporting');
            hideLoading();
            if(typeof showToast === 'function') showToast("Đã tải ảnh thành công!");
        }).catch(err => {
            console.error("Lỗi xuất ảnh:", err);
            document.body.classList.remove('exporting');
            hideLoading();
            if(typeof showToast === 'function') showToast("Lỗi: Hình ảnh chứa URL bị chặn CORS không thể xuất.", true);
        });
    }, 300); 
}

function processFilesArray(filesToProcess) { 
    if (filesToProcess.length === 0) { document.getElementById('imgInput').value = ''; return; } 
    showLoading("Processing images..."); 
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
                    // Chuyển hàng loạt sang WebP 85%
                    currentListData.dock.push({ src: c.toDataURL('image/webp', 0.85), h: 85, name: f.name.replace(/\.[^/.]+$/, "") }); 
                } catch(err) { errorCount++; } 
                finally { 
                    processed++; 
                    if (processed === filesToProcess.length) { 
                        commitChange(); hideLoading(); 
                        if(errorCount > 0) showToast(`${errorCount} ảnh bị lỗi!`, true);
                    } 
                } 
            }; 
            i.onerror = () => { 
                processed++; errorCount++;
                if (processed === filesToProcess.length) { commitChange(); hideLoading(); showToast(`${errorCount} ảnh bị lỗi!`, true); } 
            } 
        }; 
        r.onerror = () => {
            processed++; errorCount++;
            if (processed === filesToProcess.length) { commitChange(); hideLoading(); showToast(`Đọc file thất bại!`, true); } 
        }
        r.readAsDataURL(f); 
    }); 
    document.getElementById('imgInput').value = ''; 
}

function handleFiles(e) { 
    try {
        const files = Array.from(e.target.files).filter(f => { 
            if (!f.type.startsWith('image/')) { showToast(`❌ File "${escapeHTML(f.name)}" không phải ảnh.`, true); return false; } 
            if (f.size > 8 * 1024 * 1024) { showToast(`❌ Ảnh "${escapeHTML(f.name)}" quá lớn (>8MB).`, true); return false; }
            return true; 
        }); 
        
        if (files.length === 0) { e.target.value = ''; return; } 
        
        const existingNames = new Set(); 
        if (currentListData) { 
            currentListData.dock.forEach(img => { if(img.name) existingNames.add(img.name); }); 
            currentListData.tiers.forEach(t => { t.items.forEach(img => { if(img.name) existingNames.add(img.name); }); }); 
        } 
        
        const newFiles = []; const duplicateFiles = []; 
        files.forEach(f => { if (existingNames.has(f.name.replace(/\.[^/.]+$/, ""))) duplicateFiles.push(f); else newFiles.push(f); }); 
        
        if (duplicateFiles.length > 0) { 
            const msg = `Phát hiện ${duplicateFiles.length} ảnh trùng tên. Bạn có muốn tải lên cả những ảnh bị trùng không?`; 
            openConfirm("Trùng Lặp", msg, () => processFilesArray([...newFiles, ...duplicateFiles]), () => processFilesArray(newFiles) ); 
        } else processFilesArray(newFiles); 
    } catch (err) {
        showToast("Lỗi khi tải file!", true);
    }
}

async function importImageFromURL() {
    if (!currentListData) return;
    const url = prompt("Paste Image URL here:\n(e.g., https://example.com/image.png)");
    if (!url) return;
    showLoading("Downloading image...");
    try {
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
                    
                    let cleanName = url.split('/').pop().split('?')[0].replace(/\.[^/.]+$/, "");
                    if(!cleanName) cleanName = "web_image";
                    
                    // WebP cho ảnh tải từ URL
                    currentListData.dock.push({ src: c.toDataURL('image/webp', 0.85), h: 85, name: cleanName });
                    commitChange(); hideLoading(); showToast("Image imported!");
                } catch(e) { hideLoading(); showToast("⚠️ Không thể đọc dữ liệu ảnh.", true); }
            };
            i.onerror = () => { hideLoading(); showToast("Invalid image URL.", true); }
        };
        reader.readAsDataURL(blob);
    } catch (err) {
        hideLoading();
        showToast("❌ Không thể tải ảnh (Bị chặn CORS).", true);
    }
}

async function downloadAllImagesAsZip() {
    if (!currentListData) return;
    if (typeof JSZip === 'undefined') { showToast("JSZip library đang tải, thử lại sau!", true); return; }
    showLoading("Zipping images...\nPlease wait.");
    try {
        const zip = new JSZip();
        let count = 0;
        const nameTally = {}; 
        const processItem = (item) => {
            if (!item.src) return;
            let name = item.name ? item.name.replace(/\.[^/.]+$/, "") : "image";
            if (nameTally[name] !== undefined) { nameTally[name]++; name = `${name} (${nameTally[name]})`; } 
            else { nameTally[name] = 0; }
            // Mặc dù lưu dạng WebP trong Data, khi Zip có thể để đuôi .webp hoặc .png tùy trình duyệt parse, nhưng đổi đuôi ảo ở đây không ảnh hưởng quá trình giải nén
            const filename = name + ".webp"; 
            const base64Data = item.src.split(',')[1];
            if (base64Data) { zip.file(filename, base64Data, {base64: true}); count++; }
        };
        currentListData.tiers.forEach(t => t.items.forEach(processItem));
        currentListData.dock.forEach(processItem);
        if (count === 0) { hideLoading(); showToast("⚠️ Không có ảnh để nén!", true); return; }
        
        const content = await zip.generateAsync({type: "blob"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(content);
        const safeBoardName = currentListData.name ? currentListData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : "tierlist";
        a.download = `${safeBoardName}_images.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        hideLoading(); showToast(`Đã tải xuống ${count} ảnh!`); closeModal('settings-modal-overlay');
    } catch (err) { hideLoading(); showToast("Lỗi tạo file ZIP!", true); }
}

function openBackupMenu() { document.getElementById('backup-modal-overlay').style.display='flex'; }
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
    } catch (err) { showToast("Lỗi khi Backup!", true); } 
}

function importData(e) { 
    const file = e.target.files[0]; 
    if (!file) return; 
    const reader = new FileReader(); 
    reader.onload = ev => { 
        try { 
            const data = JSON.parse(ev.target.result); 
            if (!isValidTierData(data)) throw new Error("Invalid JSON structure"); 
            const tx = db.transaction(['lists'], 'readwrite'); 
            const store = tx.objectStore('lists'); 
            data.forEach(item => store.put(item)); 
            tx.oncomplete = () => { showToast('Phục hồi dữ liệu thành công!'); loadMenu(); closeModal('backup-modal-overlay'); }; 
        } catch(err) { showToast('File định dạng bị lỗi!', true); } 
    }; 
    reader.readAsText(file); e.target.value = ''; 
}

function wipeAllData() { 
    openConfirm("WARNING", "Wipe ALL data? All boards will be deleted.", () => { 
        try {
            db.transaction(['lists']).objectStore('lists').getAll().onsuccess = ev => {
                const allData = ev.target.result;
                if(allData && allData.length > 0) pushMenuAction({type: 'WIPE', data: allData});
                
                db.transaction(['lists'], 'readwrite').objectStore('lists').clear().onsuccess = () => {
                    showToast("All data wiped!"); loadMenu();
                };
            };
        } catch (e) { showToast("Lỗi xóa dữ liệu!", true); }
    }); 
}
