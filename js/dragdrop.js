// ==========================================
// DRAG & DROP AND GLOBAL CLICK CONTROLS
// ==========================================

function getInsertionNode(container, clientX, clientY) {
    const elements = [...container.querySelectorAll('.img-wrap:not(.dragging):not(.drag-placeholder)')];
    for (let i = 0; i < elements.length; i++) {
        const box = elements[i].getBoundingClientRect();
        if (clientY >= box.top && clientY <= box.bottom) {
            if (clientX < box.left + box.width / 2) return elements[i];
        } else if (clientY < box.top) return elements[i]; 
    }
    return null;
}

function initGlobalClickAndDrop() {
    const handleOutsideClick = (e) => { 
        if (!document.getElementById('menu-screen').classList.contains('hidden')) return;

        const floatMenu = document.getElementById('float-more-menu');
        const btnFloatMore = document.getElementById('btn-float-more');
        if (floatMenu && floatMenu.style.display === 'flex' && !e.target.closest('#float-more-menu') && !e.target.closest('#btn-float-more')) {
            floatMenu.style.display = 'none'; btnFloatMore.style.background = 'transparent';
        }

        if (selectedImgObj) { 
            const isClickInsideControl = e.target.closest('#floating-toolbar'); 
            const isClickInsideModal = e.target.closest('.modal-overlay'); 
            if (isClickInsideControl || isClickInsideModal) return; 

            const clickedImageWrap = e.target.closest('.img-wrap');
            if (clickedImageWrap === selectedImgObj.dom) return; 

            const targetTier = e.target.closest('.tier-content');
            const targetDock = e.target.closest('.dock-container'); 

            if (targetTier && targetTier.dataset.tierIndex !== undefined && !clickedImageWrap) {
                e.preventDefault(); e.stopPropagation();
                try {
                    let sourceArray = (selectedImgObj.type === 'tier') ? currentListData.tiers[selectedImgObj.r].items : currentListData.dock;
                    
                    // Tối ưu UX/Defensive: Xóa dựa trên reference thực tế
                    let oldIdx = sourceArray.indexOf(selectedImgObj.data);
                    if(oldIdx !== -1) sourceArray.splice(oldIdx, 1);
                    
                    currentListData.tiers[parseInt(targetTier.dataset.tierIndex)].items.push(selectedImgObj.data);
                    
                    // Sửa lỗi văng null: Lưu data trước khi gọi deselectImg
                    let movedData = selectedImgObj.data;
                    if(typeof deselectImg === 'function') deselectImg(); 
                    lastDroppedData = movedData;
                    setTimeout(() => lastDroppedData = null, 500); 
                    commitChange();
                } catch(err) { showToast("Lỗi di chuyển ảnh!", true); console.error(err); } return;
            }

            if (targetDock && !clickedImageWrap) {
                e.preventDefault(); e.stopPropagation();
                try {
                    let sourceArray = (selectedImgObj.type === 'tier') ? currentListData.tiers[selectedImgObj.r].items : currentListData.dock;
                    
                    let oldIdx = sourceArray.indexOf(selectedImgObj.data);
                    if(oldIdx !== -1) sourceArray.splice(oldIdx, 1);
                    
                    currentListData.dock.push(selectedImgObj.data);
                    
                    // Tương tự, lưu data trước khi hủy selected
                    let movedData = selectedImgObj.data;
                    if(typeof deselectImg === 'function') deselectImg(); 
                    lastDroppedData = movedData;
                    setTimeout(() => lastDroppedData = null, 500); 
                    commitChange();
                } catch(err) { showToast("Lỗi đưa ảnh vào Dock!", true); console.error(err); } return;
            }
            if (!clickedImageWrap && typeof deselectImg === 'function') deselectImg(); 
        } 
    };
    
    document.addEventListener('mousedown', handleOutsideClick, true); 
    document.addEventListener('touchstart', handleOutsideClick, {passive: false, capture: true});

    const dockContainer = document.getElementById('dock-container-box');
    dockContainer.ondragover = e => { e.preventDefault(); if (isDragMode && draggedItem && draggedItem.type !== 'row') e.dataTransfer.dropEffect = 'move'; };
    dockContainer.ondrop = e => { 
        e.preventDefault(); 
        try {
            if (isDragMode && draggedItem && draggedItem.type !== 'row' && draggedItem.data) {
                let oldArray = (draggedItem.type === 'tier') ? currentListData.tiers[draggedItem.r].items : currentListData.dock;
                let dropIndex = currentListData.dock.length;
                if (currentPlaceholder && currentPlaceholder.parentNode === dockContainer.querySelector('#dock')) {
                    const elements = [...dockContainer.querySelectorAll('.img-wrap:not(.dragging)')];
                    dropIndex = elements.indexOf(currentPlaceholder);
                }
                
                // Tránh lỗi index ảo gây nhân bản hoặc sai vị trí
                let oldIdx = oldArray.indexOf(draggedItem.data);
                if(oldArray === currentListData.dock && oldIdx !== -1 && oldIdx < dropIndex) dropIndex--;
                if(oldIdx !== -1) oldArray.splice(oldIdx, 1);
                
                currentListData.dock.splice(dropIndex, 0, draggedItem.data);
                lastDroppedData = draggedItem.data; setTimeout(() => lastDroppedData = null, 500); commitChange();
            }
        } catch(err) { showToast("⚠️ Lỗi thả ảnh vào Dock", true); console.error(err); }
    };

    const tz = document.getElementById('trash-zone');
    tz.ondragover = e => { e.preventDefault(); if(isDragMode && draggedItem) { e.dataTransfer.dropEffect = 'move'; tz.classList.add('hover'); } };
    tz.ondragleave = () => tz.classList.remove('hover');
    tz.ondrop = () => { 
        try {
            if (isDragMode && draggedItem) { 
                let oldArray = (draggedItem.type === 'tier') ? currentListData.tiers[draggedItem.r].items : currentListData.dock; 
                let oldIdx = oldArray.indexOf(draggedItem.data);
                if(oldIdx !== -1) oldArray.splice(oldIdx, 1);
                commitChange(); tz.classList.remove('hover'); 
            } 
        } catch(err) { showToast("Lỗi xóa ảnh!", true); console.error(err); }
    };
}

function initGlobalFileDrop() { 
    const overlay = document.getElementById('drop-overlay'); 
    window.addEventListener('dragenter', e => { 
        if (draggedItem) return; 
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; overlay.style.display = 'flex'; } 
    }); 
    window.addEventListener('dragleave', e => { if (draggedItem) return; if (!e.relatedTarget) overlay.style.display = 'none'; }); 
    window.addEventListener('dragover', e => { e.preventDefault(); if (draggedItem) { e.dataTransfer.dropEffect = 'move'; return; } e.dataTransfer.dropEffect = 'copy'; });
    window.addEventListener('drop', e => { 
        if (draggedItem) return; 
        e.preventDefault(); e.stopPropagation(); overlay.style.display = 'none'; 
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { 
            if (!currentListData) { showToast("Hãy tạo/mở một Tier List trước khi kéo ảnh vào!", true); return; } 
            if (typeof handleFiles === 'function') handleFiles({target: {files: e.dataTransfer.files}}); 
        } 
    }, true); 
}
