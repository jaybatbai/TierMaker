// ==========================================
// P2P DATA SYNC ENGINE (PEERJS)
// ==========================================

let peer = null;
let peerConn = null;

function openSyncModal() {
    const modal = document.getElementById('sync-modal-overlay');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeSyncModal() {
    const modal = document.getElementById('sync-modal-overlay');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Dọn dẹp kết nối P2P để giải phóng bộ nhớ & RAM
    if (peer) {
        peer.destroy();
        peer = null;
    }
    
    const msgEl = document.getElementById('sync-wait-msg');
    if (msgEl) msgEl.style.display = 'none';
    
    const displayEl = document.getElementById('sync-code-display');
    if (displayEl) displayEl.innerText = '----';
    
    const inputEl = document.getElementById('sync-code-input');
    if (inputEl) inputEl.value = '';
}

function generateSyncCode() {
    if (typeof showLoading === 'function') showLoading("Đang khởi tạo mã P2P...");
    
    // Tạo ngẫu nhiên PIN 4 chữ số
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const peerId = 'tiermaker-p2p-' + pin;
    
    if (peer) peer.destroy();
    
    peer = new Peer(peerId);
    
    peer.on('open', (id) => {
        if (typeof hideLoading === 'function') hideLoading();
        
        const displayEl = document.getElementById('sync-code-display');
        if (displayEl) displayEl.innerText = pin;
        
        const msgEl = document.getElementById('sync-wait-msg');
        if (msgEl) {
            msgEl.innerText = "⏳ Đang chờ thiết bị nhận kết nối...";
            msgEl.style.display = 'block';
        }
        
        if (typeof showToast === 'function') showToast("Mã PIN P2P đã sẵn sàng!");
    });
    
    peer.on('connection', (conn) => {
        peerConn = conn;
        const msgEl = document.getElementById('sync-wait-msg');
        if (msgEl) msgEl.innerText = "⚡ Đang truyền dữ liệu...";
        
        // Đọc dữ liệu từ IndexedDB an toàn để truyền đi
        if (db) {
            try {
                const tx = db.transaction(['lists'], 'readonly');
                const store = tx.objectStore('lists');
                const req = store.getAll();
                
                req.onsuccess = (e) => {
                    const allLists = e.target.result;
                    peerConn.send({ type: 'SYNC_ALL_DATA', payload: allLists });
                    
                    if (typeof showToast === 'function') showToast("Đã đồng bộ dữ liệu sang thiết bị nhận!");
                    setTimeout(() => closeSyncModal(), 1200);
                };
                
                req.onerror = () => {
                    if (typeof showToast === 'function') showToast("Lỗi đọc Database để đồng bộ!", true);
                };
            } catch (err) {
                if (typeof showToast === 'function') showToast("Lỗi kết nối Database!", true);
            }
        }
    });
    
    peer.on('error', (err) => {
        if (typeof hideLoading === 'function') hideLoading();
        console.error("PeerJS Host Error:", err);
        
        if (err.type === 'unavailable-id') {
            // Trùng ID PIN thì tự động thử tạo lại PIN mới
            generateSyncCode();
        } else {
            if (typeof showToast === 'function') showToast("Lỗi khởi tạo P2P: " + err.type, true);
        }
    });
}

function receiveSyncData() {
    const pinInput = document.getElementById('sync-code-input');
    if (!pinInput) return;
    
    const pin = pinInput.value.trim();
    
    if (pin.length !== 4 || isNaN(pin)) {
        if (typeof showToast === 'function') showToast("Vui lòng nhập đúng 4 chữ số PIN!", true);
        return;
    }
    
    if (typeof showLoading === 'function') showLoading("Đang tìm thiết bị Host...");
    const targetPeerId = 'tiermaker-p2p-' + pin;
    
    if (peer) peer.destroy();
    peer = new Peer();
    
    peer.on('open', () => {
        const conn = peer.connect(targetPeerId);
        
        conn.on('open', () => {
            if (typeof showLoading === 'function') showLoading("Đang nhận & ghi dữ liệu...");
        });
        
        conn.on('data', (data) => {
            if (data && data.type === 'SYNC_ALL_DATA' && Array.isArray(data.payload)) {
                try {
                    const tx = db.transaction(['lists'], 'readwrite');
                    const store = tx.objectStore('lists');
                    
                    data.payload.forEach(item => store.put(item));
                    
                    tx.oncomplete = () => {
                        if (typeof hideLoading === 'function') hideLoading();
                        if (typeof showToast === 'function') showToast("Đồng bộ dữ liệu thành công!");
                        if (typeof loadMenu === 'function') loadMenu();
                        closeSyncModal();
                    };
                    
                    tx.onerror = () => {
                        if (typeof hideLoading === 'function') hideLoading();
                        if (typeof showToast === 'function') showToast("Lỗi khi lưu dữ liệu đồng bộ!", true);
                    };
                } catch (e) {
                    if (typeof hideLoading === 'function') hideLoading();
                    if (typeof showToast === 'function') showToast("Dữ liệu nhận được bị hỏng!", true);
                }
            }
        });
        
        conn.on('error', (err) => {
            if (typeof hideLoading === 'function') hideLoading();
            if (typeof showToast === 'function') showToast("Không thể kết nối tới Host!", true);
        });
    });
    
    peer.on('error', (err) => {
        if (typeof hideLoading === 'function') hideLoading();
        console.error("PeerJS Receiver Error:", err);
        if (typeof showToast === 'function') showToast("Không tìm thấy thiết bị mang mã PIN này!", true);
    });
}
