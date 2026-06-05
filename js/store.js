// ==========================================
// 1. GLOBAL STATE & CONSTANTS
// ==========================================
const DB_NAME = 'TierMaker_V26_Pro'; 
let db;
let currentListData = null;
let selectedImgObj = null;
let editingTierIndex = -1;
let draggedItem = null;
let draggedRowIdx = null;
let currentPlaceholder = null; 
let stateHistory = [];
let historyIndex = -1;
let saveTimeout, toastTimeout, autoSaveTimer; // Đã thêm biến autoSaveTimer
let confirmAction = null, confirmCancelAction = null;
let isDirty = false;

// Cài đặt
let searchType = localStorage.getItem('searchType') || 'manga';
let isDragMode = true;
let isLockScoreMode = false;
let isNameCopyMode = false;
let isMultiSelectMode = false;
let isShowScoreMode = false; 
let isShowStatusMode = false;

let multiSelectImages = []; 
let lastDroppedData = null; 
let menuUndoStack = [];

const fontsArr = ['Arial, Helvetica, sans-serif', "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif", "Impact, Charcoal, sans-serif", "'Courier New', Courier, monospace", "Georgia, serif"];

// ==========================================
// 2. DATABASE & HISTORY (OPTIMIZED RAM & AUTO-SAVE)
// ==========================================

// TỐI ƯU UX: Chuyển sang cơ chế Debounce thay vì setInterval mù quáng
function markDirty() { 
    isDirty = true; 
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        if (isDirty && currentListData) { 
            saveListSilent(currentListData); 
            isDirty = false; 
        }
    }, 3000); // Tự động lưu mượt mà sau 3s không có thao tác
}

function saveListSilent(d) { 
    try { 
        updateSaveStatus('saving');
        d.updatedAt = new Date().toISOString(); 
        const tx = db.transaction(['lists'], 'readwrite');
        tx.objectStore('lists').put(d); 
        
        tx.oncomplete = () => {
            setTimeout(() => updateSaveStatus('saved'), 600); 
        };
        tx.onerror = () => {
            updateSaveStatus('error');
        };
    } catch(e) {
        updateSaveStatus('error');
        console.error("Database Write Error:", e);
    } 
}

function updateSaveStatus(status) {
    const el = document.getElementById('save-status');
    if(!el) return;
    if (status === 'saving') {
        el.innerHTML = '<i class="ph ph-spinner spin"></i> Đang lưu...';
        el.style.color = 'var(--text-muted)';
    } else if (status === 'saved') {
        el.innerHTML = '<i class="ph ph-cloud-check"></i> Đã lưu';
        el.style.color = 'var(--primary)';
        setTimeout(() => { if(el.innerHTML.includes('Đã lưu')) el.innerHTML = ''; }, 2500);
    } else if (status === 'error') {
        el.innerHTML = '<i class="ph ph-warning-circle"></i> Lỗi lưu!';
        el.style.color = 'var(--danger)';
    }
}

function commitChange() { 
    pushHistory(); 
    if (typeof renderBoard === 'function') renderBoard(); 
    markDirty(); // Chủ động gọi lưu thông minh
}

function commitChangeSilent() { 
    pushHistory(); 
    markDirty(); 
}

function pushHistory() { 
    try {
        const s = JSON.stringify(currentListData); 
        if (stateHistory[historyIndex] !== s) { 
            stateHistory = stateHistory.slice(0, historyIndex+1); 
            stateHistory.push(s); 
            historyIndex++; 
            
            // TỐI ƯU RAM: Ép giới hạn xuống 10 bước để chống Crash trên mobile
            if (stateHistory.length > 10) { 
                stateHistory.shift(); 
                historyIndex--; 
            } 
        } 
    } catch (e) {
        console.warn("Lịch sử không thể lưu thêm do đạt giới hạn RAM của trình duyệt.");
    }
}

function undo() { 
    if (historyIndex > 0) { 
        historyIndex--; 
        currentListData = JSON.parse(stateHistory[historyIndex]); 
        if (typeof renderBoard === 'function') renderBoard(); 
        markDirty();
        if(typeof showToast === 'function') showToast("Đã Undo"); 
    } 
}

function redo() { 
    if (historyIndex < stateHistory.length-1) { 
        historyIndex++; 
        currentListData = JSON.parse(stateHistory[historyIndex]); 
        if (typeof renderBoard === 'function') renderBoard(); 
        markDirty(); 
        if(typeof showToast === 'function') showToast("Đã Redo"); 
    } 
}

function pushMenuAction(action) {
    menuUndoStack.push(action);
    if(menuUndoStack.length > 20) menuUndoStack.shift(); 
    document.getElementById('btn-menu-undo').style.display = 'flex';
}

function escapeHTML(str) { 
    if (!str && str !== 0) return ''; 
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); 
}

function isValidTierData(data) { 
    try { 
        if (!Array.isArray(data)) return false; 
        return data.every(l => l.id && typeof l.name === 'string' && Array.isArray(l.tiers) && Array.isArray(l.dock)); 
    } catch (e) { return false; } 
}
