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
let saveTimeout, toastTimeout, autoSaveTimer;
let confirmAction = null, confirmCancelAction = null;
let isDirty = false;

// Cài đặt Ngôn ngữ & Chế độ
let currentLang = localStorage.getItem('app_lang') || 'vi';
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
// 2. DICTIONARY (TỪ ĐIỂN SONG NGỮ ANH - VIỆT)
// ==========================================
const TRANSLATIONS = {
    en: {
        app_title: "Tier",
        app_subtitle: "Maker",
        create_template: "Create New Template",
        p2p_sync: "P2P Sync (AirDrop)",
        files_backup: "Files & Local Backup",
        empty_board_msg: "You don't have any tier lists yet.<br>Click <b>+ Create New Template</b> above!",
        
        menu: "Menu",
        name_off: "Name: OFF",
        name_on: "Name: ON",
        score_off: "Score: OFF",
        score_on: "Score: ON",
        status_off: "Status: OFF",
        status_on: "Status: ON",
        lock_off: "Lock: OFF",
        lock_on: "Lock: ON",
        select_off: "Select: OFF",
        select_on: "Select: ON",
        drag_on: "Drag: ON",
        scroll_on: "Scroll: ON",
        
        add_row: "Add Row",
        settings: "Settings",
        to_dock: "To Dock",
        clear_images: "Clear Images",
        
        image_dock: "Image Dock",
        clear_dock: "Dock",
        sort_by: "⇅ Sort By...",
        newest: "🕒 Newest Added",
        name_az: "🔤 Name (A-Z)",
        name_za: "🔤 Name (Z-A)",
        shuffle: "🎲 Shuffle",
        search_placeholder: "🔍 Search images...",
        all_status: "🔖 All Statuses",
        has_status: "✨ Has Status",
        status_reading: "📖 Reading",
        status_completed: "✅ Completed",
        status_on_hold: "⏸️ On-Hold",
        status_dropped: "⛔ Dropped",
        status_plan: "⏰ Plan to Read",
        
        save_image: "Save Image",
        add_url: "Add URL",
        add_images: "Add Images",
        
        selected: "Selected",
        select_all: "Select All",
        deselect_all: "Deselect All",
        change_status: "🔖 Change Status",
        remove_status: "Remove Status",
        toggle_lock: "Toggle Lock",
        delete: "Delete",
        
        confirm_title: "Confirm",
        confirm_btn: "Confirm",
        cancel_btn: "Cancel",
        are_you_sure: "Are you sure?",
        
        board_settings: "Board Settings",
        section_actions: "Functions & Actions",
        section_style: "Style & Font",
        section_export: "Export & Data",
        show_header: "Show Board Header",
        show_filename: "Show File Name on Click",
        manga_mode: "Manga / Anime Mode",
        copy_format: "Copy Name Format",
        main_all_alt: "Main + All Alt Names",
        main_only: "Main Name Only",
        main_n_alt: "Main + N Alt Names",
        num_alt_names: "Number of Alt Names (N)",
        image_shape: "Image Shape",
        shape_auto: "Auto (Default)",
        shape_square: "Square (1:1)",
        shape_portrait: "Portrait (2:3)",
        shape_circle: "Circle",
        font_family: "Font Family",
        score_precision: "Score Precision",
        board_bg: "Board Background",
        upload_img: "Upload Image",
        download_zip: "Download All Images (ZIP)",
        close: "Close",
        
        rename_image: "Rename Image",
        add_alt_names_desc: "Add as many alternative names as you need for this image.",
        add_another_name: "Add Another Name",
        save_names: "Save Names",
        
        create_new_board: "Create New Board",
        board_name_placeholder: "Enter board name...",
        tier_list_type: "Tier List Type:",
        manga_tier_type: "📖 Manga / Anime Tier List",
        standard_tier_type: "⬛ Standard Tier List",
        choose_preset: "Choose Template Preset:",
        create_board_btn: "Create Board",
        
        edit_row: "Edit Row",
        row_label: "Row Label",
        min_score: "Min Score",
        max_score: "Max Score",
        row_color: "Row Color",
        move_up: "Move Up",
        move_down: "Move Down",
        save_changes: "Save Changes",
        delete_row: "Delete Row",
        
        add_note: "Add Image Note",
        note_placeholder: "Type a note or caption to display under this image...",
        save_note: "Save Note",
        
        shortcuts_title: "Keyboard Shortcuts",
        shortcut_undo: "Undo",
        shortcut_redo: "Redo",
        shortcut_save: "Manual Save",
        shortcut_del: "Delete Selected Image",
        shortcut_esc: "Deselect / Close Modal",
        got_it: "Got it!",

        files_backup_title: "Files & Backup",
        backup_desc: "Backup all your data to a JSON file for safe keeping or transferring to another device.",
        export_data: "Export All Data (JSON)",
        import_data: "Import Data",
        wipe_all_data: "Wipe All Data",

        p2p_title: "P2P Data Sync",
        p2p_desc: "Sync data directly between 2 devices (PC <-> Mobile) via network.",
        host_send: "Host (Send Data)",
        gen_pin: "Generate PIN",
        recv_receive: "Receiver (Receive Data)",
        enter_pin: "Enter 4-digit PIN...",
        connect_receive: "Connect & Receive",

        search_manga: "Search: Manga",
        search_anime: "Search: Anime",

        export_report_title: "Text Report & Copy All",
        export_report_btn: "Export Report & Copy All",
        inc_tier_group: "Group by Tier",
        inc_scores: "Include Scores",
        inc_chapters: "Include Chapters",
        inc_statuses: "Include Statuses",
        scope_target: "Include Images From:",
        scope_both: "Board & Dock",
        scope_board_only: "Board Only",
        scope_dock_only: "Dock Only",
        copy_report_btn: "📋 Copy Full Report",
        copy_names_only_btn: "🔤 Copy Names Only",
        download_txt_btn: "📥 Download .TXT",
        report_preview: "Live Preview:",

        toast_locked: "🔒 Board is locked! Turn off Lock to move images.",
        toast_locked_arrange: "🔒 Board is locked! Cannot auto arrange.",
        toast_locked_sort: "🔒 Board is locked! Cannot sort Dock.",
        toast_locked_board: "🔒 Board is locked! Images cannot be moved.",
        toast_unlocked_board: "🔓 Board unlocked.",
        toast_saved: "Saved manually!",
        toast_copied: "Copied: ",
        toast_copied_all_names: "Copied all names to clipboard!",
        toast_copied_report: "Copied report to clipboard!",
        toast_no_name: "Image has no name!",
        toast_names_saved: "Names saved!",
        toast_names_cleared: "All names cleared!"
    },
    vi: {
        app_title: "Tier",
        app_subtitle: "Maker",
        create_template: "Tạo Template Mới",
        p2p_sync: "Đồng Bộ P2P (AirDrop)",
        files_backup: "Tệp & Sao Lưu Cục Bộ",
        empty_board_msg: "Bạn chưa có bảng Tier List nào.<br>Bấm <b>+ Tạo Template Mới</b> ở trên!",
        
        menu: "Menu",
        name_off: "Tên: TẮT",
        name_on: "Tên: BẬT",
        score_off: "Điểm: TẮT",
        score_on: "Điểm: BẬT",
        status_off: "Trạng thái: TẮT",
        status_on: "Trạng thái: BẬT",
        lock_off: "Khóa: TẮT",
        lock_on: "Khóa: BẬT",
        select_off: "Chọn: TẮT",
        select_on: "Chọn: BẬT",
        drag_on: "Kéo: BẬT",
        scroll_on: "Cuộn: BẬT",
        
        add_row: "Thêm Dòng",
        settings: "Cài Đặt",
        to_dock: "Về Dock",
        clear_images: "Xóa Tất Cả Ảnh",
        
        image_dock: "Khay Ảnh",
        clear_dock: "Xóa Dock",
        sort_by: "⇅ Sắp Xếp Theo...",
        newest: "🕒 Mới Thêm",
        name_az: "🔤 Tên (A-Z)",
        name_za: "🔤 Tên (Z-A)",
        shuffle: "🎲 Ngẫu Nhiên",
        search_placeholder: "🔍 Tìm kiếm ảnh...",
        all_status: "🔖 Tất cả Trạng thái",
        has_status: "✨ Có Trạng thái",
        status_reading: "📖 Đang đọc",
        status_completed: "✅ Đã xong",
        status_on_hold: "⏸️ Tạm ngưng",
        status_dropped: "⛔ Đã bỏ",
        status_plan: "⏰ Dự định",
        
        save_image: "Lưu Ảnh",
        add_url: "Thêm URL",
        add_images: "Thêm Ảnh",
        
        selected: "Đã chọn",
        select_all: "Chọn Tất Cả",
        deselect_all: "Bỏ Chọn Tất Cả",
        change_status: "🔖 Đổi Trạng Thái",
        remove_status: "Xóa Trạng Thái",
        toggle_lock: "Đổi Khóa",
        delete: "Xóa",
        
        confirm_title: "Xác Nhận",
        confirm_btn: "Xác Nhận",
        cancel_btn: "Hủy",
        are_you_sure: "Bạn có chắc chắn không?",
        
        board_settings: "Cài Đặt Bảng",
        section_actions: "Chức năng & Thao tác",
        section_style: "Kiểu dáng & Phông chữ",
        section_export: "Xuất Báo Cáo & Dữ Liệu",
        show_header: "Hiện Tiêu Đề Bảng",
        show_filename: "Hiện Tên File Khi Bấm Vào Ảnh",
        manga_mode: "Chế Độ Truyện / Anime",
        copy_format: "Định Dạng Copy Tên",
        main_all_alt: "Tên Chính + Tất Cả Tên Phụ",
        main_only: "Chỉ Tên Chính",
        main_n_alt: "Tên Chính + N Tên Phụ",
        num_alt_names: "Số Lượng Tên Phụ (N)",
        image_shape: "Hình Dạng Ảnh",
        shape_auto: "Mặc định (Tự động)",
        shape_square: "Vuông (1:1)",
        shape_portrait: "Dọc (2:3)",
        shape_circle: "Tròn",
        font_family: "Phông Chữ",
        score_precision: "Độ Chính Xác Điểm Số",
        board_bg: "Hình Nền Bảng",
        upload_img: "Tải Ảnh Lên",
        download_zip: "Tải Toàn Bộ Ảnh (ZIP)",
        close: "Đóng",
        
        rename_image: "Đổi Tên Ảnh",
        add_alt_names_desc: "Thêm nhiều tên phụ cho bức ảnh này nếu cần.",
        add_another_name: "Thêm Tên Phụ Khác",
        save_names: "Lưu Tên",
        
        create_new_board: "Tạo Bảng Mới",
        board_name_placeholder: "Nhập tên bảng...",
        tier_list_type: "Loại Tier List:",
        manga_tier_type: "📖 Manga / Anime Tier List",
        standard_tier_type: "⬛ Standard Tier List",
        choose_preset: "Chọn Mẫu Template:",
        create_board_btn: "Tạo Bảng",
        
        edit_row: "Sửa Dòng Tier",
        row_label: "Tên Dòng",
        min_score: "Điểm Tối Thiểu",
        max_score: "Điểm Tối Đa",
        row_color: "Màu Dòng",
        move_up: "Di Chuyển Lên",
        move_down: "Di Chuyển Xuống",
        save_changes: "Lưu Thay Đổi",
        delete_row: "Xóa Dòng",
        
        add_note: "Thêm Ghi Chú Cho Ảnh",
        note_placeholder: "Nhập ghi chú hoặc phụ đề hiển thị dưới ảnh...",
        save_note: "Lưu Ghi Chú",
        
        shortcuts_title: "Phím Tắt",
        shortcut_undo: "Hoàn tác (Undo)",
        shortcut_redo: "Làm lại (Redo)",
        shortcut_save: "Lưu thủ công",
        shortcut_del: "Xóa ảnh đang chọn",
        shortcut_esc: "Bỏ chọn / Đóng Cửa Sổ",
        got_it: "Đã hiểu!",

        files_backup_title: "Tệp & Sao Lưu",
        backup_desc: "Sao lưu toàn bộ dữ liệu ra tệp JSON để lưu trữ an toàn hoặc chuyển sang thiết bị khác.",
        export_data: "Xuất Dữ Liệu (JSON)",
        import_data: "Nhập Dữ Liệu",
        wipe_all_data: "Xóa Sạch Dữ Liệu",

        p2p_title: "Đồng Bộ Dữ Liệu P2P",
        p2p_desc: "Trực tiếp truyền dữ liệu giữa 2 thiết bị (Máy tính <-> Điện thoại) qua mạng.",
        host_send: "Máy Gửi (Host)",
        gen_pin: "Tạo Mã PIN",
        recv_receive: "Máy Nhận (Receiver)",
        enter_pin: "Nhập mã PIN 4 số...",
        connect_receive: "Kết Nối & Nhận",

        search_manga: "Tìm: Manga",
        search_anime: "Tìm: Anime",

        export_report_title: "Xuất Báo Cáo & Copy Tất Cả Tên",
        export_report_btn: "Xuất Báo Cáo & Copy Tất Cả Tên",
        inc_tier_group: "Gom nhóm theo Tier",
        inc_scores: "Kèm theo Điểm số",
        inc_chapters: "Kèm theo Chapter",
        inc_statuses: "Kèm theo Trạng thái",
        scope_target: "Phạm vi ảnh xuất:",
        scope_both: "Cả Bảng & Dock",
        scope_board_only: "Chỉ ảnh trên Bảng",
        scope_dock_only: "Chỉ ảnh trong Dock",
        copy_report_btn: "📋 Copy Báo Cáo Đầy Đủ",
        copy_names_only_btn: "🔤 Chỉ Copy Danh Sách Tên",
        download_txt_btn: "📥 Tải File .TXT",
        report_preview: "Xem trước văn bản:",

        toast_locked: "🔒 Bảng đang khóa! Tắt Lock để di chuyển ảnh.",
        toast_locked_arrange: "🔒 Bảng đang khóa! Không thể tự động sắp xếp.",
        toast_locked_sort: "🔒 Bảng đang khóa! Không thể sắp xếp lại Dock.",
        toast_locked_board: "🔒 Đã khóa toàn bộ Bảng! Không thể di chuyển ảnh.",
        toast_unlocked_board: "🔓 Đã mở khóa Bảng.",
        toast_saved: "Đã lưu thủ công!",
        toast_copied: "Đã copy: ",
        toast_copied_all_names: "Đã copy toàn bộ danh sách tên!",
        toast_copied_report: "Đã copy toàn bộ báo cáo!",
        toast_no_name: "Ảnh chưa có tên!",
        toast_names_saved: "Đã lưu tên!",
        toast_names_cleared: "Đã xóa toàn bộ tên!"
    }
};

function t(key, fallback = '') {
    if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
        return TRANSLATIONS[currentLang][key];
    }
    return fallback || key;
}

function toggleLanguage() {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('app_lang', currentLang);
    if (typeof updateDOMTranslations === 'function') updateDOMTranslations();
    if (typeof renderBoard === 'function' && currentListData) renderBoard();
    if (typeof loadMenu === 'function' && document.getElementById('editor-screen').classList.contains('hidden')) loadMenu();
    if (typeof showToast === 'function') showToast(currentLang === 'vi' ? "Đã chuyển sang Tiếng Việt 🇻🇳" : "Switched to English 🇬🇧");
}

function updateDOMTranslations() {
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
        btn.innerHTML = `<i class="ph ph-globe"></i> ${currentLang.toUpperCase()}`;
    });

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (translated) {
            if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
                el.placeholder = translated;
            } else {
                el.innerHTML = translated;
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = t(key);
        if (translated) el.placeholder = translated;
    });
}

// ==========================================
// 3. DATABASE & HISTORY
// ==========================================
function markDirty() {
  isDirty = true;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (isDirty && currentListData) {
      saveListSilent(currentListData);
      isDirty = false;
    }
  }, 3000);
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
  } catch (e) {
    updateSaveStatus('error');
    console.error("Database Write Error:", e);
  }
}

function updateSaveStatus(status) {
  const el = document.getElementById('save-status');
  if (!el) return;
  if (status === 'saving') {
    el.innerHTML = '<i class="ph ph-spinner spin"></i> ' + (currentLang === 'vi' ? 'Đang lưu...' : 'Saving...');
    el.style.color = 'var(--text-muted)';
  } else if (status === 'saved') {
    el.innerHTML = '<i class="ph ph-cloud-check"></i> ' + (currentLang === 'vi' ? 'Đã lưu' : 'Saved');
    el.style.color = 'var(--primary)';
    setTimeout(() => { if (el.innerHTML.includes('lưu') || el.innerHTML.includes('Saved')) el.innerHTML = ''; }, 2500);
  } else if (status === 'error') {
    el.innerHTML = '<i class="ph ph-warning-circle"></i> ' + (currentLang === 'vi' ? 'Lỗi lưu!' : 'Save Error!');
    el.style.color = 'var(--danger)';
  }
}

function commitChange() {
  pushHistory();
  if (typeof renderBoard === 'function') renderBoard();
  markDirty();
}

function commitChangeSilent() {
  pushHistory();
  markDirty();
}

function pushHistory() {
  try {
    const s = JSON.stringify(currentListData);
    if (stateHistory[historyIndex] !== s) {
      stateHistory = stateHistory.slice(0, historyIndex + 1);
      stateHistory.push(s);
      historyIndex++;
      
      if (stateHistory.length > 10) {
        stateHistory.shift();
        historyIndex--;
      }
    }
  } catch (e) {
    console.warn("Lịch sử không thể lưu thêm do đạt giới hạn RAM.");
  }
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    currentListData = JSON.parse(stateHistory[historyIndex]);
    if (typeof renderBoard === 'function') renderBoard();
    markDirty();
    if (typeof showToast === 'function') showToast(currentLang === 'vi' ? "Đã Undo" : "Undone");
  }
}

function redo() {
  if (historyIndex < stateHistory.length - 1) {
    historyIndex++;
    currentListData = JSON.parse(stateHistory[historyIndex]);
    if (typeof renderBoard === 'function') renderBoard();
    markDirty();
    if (typeof showToast === 'function') showToast(currentLang === 'vi' ? "Đã Redo" : "Redone");
  }
}

function pushMenuAction(action) {
  menuUndoStack.push(action);
  if (menuUndoStack.length > 20) menuUndoStack.shift();
  document.getElementById('btn-menu-undo').style.display = 'flex';
}

function escapeHTML(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' } [tag] || tag));
}

function isValidTierData(data) {
  try {
    if (!Array.isArray(data)) return false;
    return data.every(l => l.id && typeof l.name === 'string' && Array.isArray(l.tiers) && Array.isArray(l.dock));
  } catch (e) { return false; }
}

// BÁO CÁO VĂN BẢN
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
    URL.revokeObjectURL(a.href);
    showToast(currentLang === 'vi' ? "Đã tải file .TXT báo cáo!" : "Report .TXT downloaded!");
}
