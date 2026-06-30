// ==========================================
// P2P SYNC (AIRDROP) ENGINE
// ==========================================
let peer = null;
let syncConnection = null;

function openSyncModal() { document.getElementById('sync-modal-overlay').style.display = 'flex'; }

function closeSyncModal() {
    if (syncConnection) { syncConnection.close(); syncConnection = null; }
    if (peer) { peer.destroy(); peer = null; }
    document.getElementById('sync-modal-overlay').style.display = 'none';
    document.getElementById('sync-code-display').innerText = '----';
    document.getElementById('sync-wait-msg').style.display = 'none';
    document.getElementById('sync-code-input').value = '';
}

function generateSyncCode() {
    if (peer) peer.destroy();
    showLoading("Generating PIN...");
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const hostId = 'tm_sync_' + pin;
    peer = new Peer(hostId);
    
    peer.on('open', (id) => {
        hideLoading();
        document.getElementById('sync-code-display').innerText = pin;
        document.getElementById('sync-wait-msg').innerHTML = "<i class='ph ph-hourglass-medium'></i> Waiting for receiver to connect...";
        document.getElementById('sync-wait-msg').style.display = 'block';
    });
    
    peer.on('connection', (conn) => {
        syncConnection = conn;
        conn.on('open', () => {
            db.transaction(['lists']).objectStore('lists').getAll().onsuccess = e => {
                const allData = e.target.result;
                const strData = JSON.stringify(allData);
                const chunkSize = 64 * 1024; 
                const totalChunks = Math.ceil(strData.length / chunkSize);
                conn.send({ type: 'header', total: totalChunks });
                let currentChunk = 0;
                const msgUI = document.getElementById('sync-wait-msg');
                msgUI.style.color = "var(--primary)";
                
                function sendNextChunk() {
                    if (currentChunk >= totalChunks) {
                        msgUI.innerHTML = "<i class='ph ph-check-circle'></i> Sent successfully!";
                        setTimeout(() => closeSyncModal(), 2000);
                        return;
                    }
                    const start = currentChunk * chunkSize;
                    const end = Math.min(start + chunkSize, strData.length);
                    const chunkData = strData.slice(start, end);
                    conn.send({ type: 'chunk', index: currentChunk, data: chunkData });
                    currentChunk++;
                    let percent = Math.round((currentChunk / totalChunks) * 100);
                    msgUI.innerHTML = `<i class='ph ph-rocket'></i> Sending: ${percent}% ...`;
                    setTimeout(sendNextChunk, 25);
                }
                setTimeout(sendNextChunk, 500); 
            };
        });
    });
    peer.on('error', (err) => { hideLoading(); alert("Network Error: Connection failed."); closeSyncModal(); });
}

function receiveSyncData() {
    const pin = document.getElementById('sync-code-input').value.trim();
    if(pin.length !== 4) { alert("Please enter a valid 4-digit PIN."); return; }
    if (peer) peer.destroy();
    showLoading("Connecting to Host...");
    
    let receivedChunks = [];
    let expectedTotal = 0;
    let chunksCount = 0;
    peer = new Peer();
    
    peer.on('open', () => {
        const targetId = 'tm_sync_' + pin;
        const conn = peer.connect(targetId, { reliable: true });
        syncConnection = conn;
        
        conn.on('open', () => { showLoading("Connected! Waiting for data..."); });
        conn.on('data', (msg) => {
            if (msg.type === 'header') {
                expectedTotal = msg.total;
                receivedChunks = new Array(expectedTotal);
                showLoading("Receiving Data: 0%");
            } else if (msg.type === 'chunk') {
                receivedChunks[msg.index] = msg.data;
                chunksCount++;
                let percent = Math.round((chunksCount / expectedTotal) * 100);
                showLoading(`Receiving Data: ${percent}%`);
                
                if (chunksCount === expectedTotal) {
                    showLoading("Processing Data... Please wait.");
                    setTimeout(() => {
                        try {
                            const fullStr = receivedChunks.join('');
                            const parsedData = JSON.parse(fullStr);
                            if (!isValidTierData(parsedData)) throw new Error("Invalid format");
                            const tx = db.transaction(['lists'], 'readwrite');
                            const store = tx.objectStore('lists');
                            parsedData.forEach(item => store.put(item));
                            tx.oncomplete = () => {
                                hideLoading();
                                alert('🎉 Sync Complete! Your devices are now updated.');
                                closeSyncModal();
                                if (typeof loadMenu === 'function') loadMenu(); 
                            };
                        } catch(e) { hideLoading(); alert("❌ Failed to process received data."); }
                    }, 500); 
                }
            }
        });
        conn.on('error', () => { hideLoading(); alert("Lost connection to host."); });
    });
    peer.on('error', (err) => { hideLoading(); alert("Connection failed. Make sure the Host is waiting on the PIN screen."); });
}
