// main.js - Main Process với Error Handling và Cache Fix (FULL VERSION)
const { app, BrowserWindow, ipcMain, Menu, session, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Disable security warnings for development
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// Clear cache on startup to prevent corruption
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('aggressive-cache-discard');
app.commandLine.appendSwitch('enable-webview-tag');

// Import database functions with error handling
let initializeDatabase, saveKnowledge, getKnowledge, searchKnowledge;
try {
    const db = require('./database');
    initializeDatabase = db.initializeDatabase;
    saveKnowledge = db.saveKnowledge;
    getKnowledge = db.getKnowledge;
    searchKnowledge = db.searchKnowledge;
} catch (error) {
    console.warn('Database module not found, using mock functions');
    initializeDatabase = async () => console.log('Mock: Database initialized');
    saveKnowledge = async (q, a) => ({ question: q, answer: a, id: Date.now() });
    getKnowledge = async () => [];
    searchKnowledge = async (q) => [];
}

// Disable GPU acceleration để tránh lỗi GPU
app.disableHardwareAcceleration();

// Clear old cache data
async function clearCacheData() {
    try {
        const cachePath = path.join(app.getPath('userData'), 'Cache');
        const gpuCachePath = path.join(app.getPath('userData'), 'GPUCache');
        const codeCachePath = path.join(app.getPath('userData'), 'Code Cache');

        // Remove cache directories if they exist
        const pathsToClean = [cachePath, gpuCachePath, codeCachePath];
        
        for (const dir of pathsToClean) {
            if (fs.existsSync(dir)) {
                try {
                    fs.rmSync(dir, { recursive: true, force: true });
                    console.log(`Cleared cache directory: ${dir}`);
                } catch (err) {
                    console.error(`Failed to clear ${dir}:`, err);
                }
            }
        }
        
        // Clear session cache
        if (session.defaultSession) {
            await session.defaultSession.clearCache();
            await session.defaultSession.clearStorageData({
                storages: ['cachestorage', 'shadercache', 'websql', 'serviceworkers']
            });
            console.log('Cleared session cache');
        }
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

let mainWindow;
let devWindow;
let popupWindow;
let mainWebviewContents;

// Settings Management
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let mainSettings = {
    autoOpenDevConsole: false,
    screenshotQuality: 70,
    domLimit: 100,
    debugMode: false,
    outputLanguage: 'Tiếng Việt'
};

function saveMainSettings() {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(mainSettings, null, 2));
    } catch (error) {
        console.error('Failed to save main settings:', error);
    }
}

function loadMainSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const savedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            mainSettings = { ...mainSettings, ...savedSettings };
        }
    } catch (error) {
        console.error('Failed to load main settings:', error);
    }
}

ipcMain.on('update-settings', (event, settings) => {
    if (mainSettings.debugMode) console.log("Received settings update from renderer:", settings);
    mainSettings = { ...mainSettings, ...settings };
    saveMainSettings();
});

// Tạo cửa sổ Dev Console
function createDevConsole() {
    if (devWindow && !devWindow.isDestroyed()) {
        devWindow.focus();
        return;
    }

    devWindow = new BrowserWindow({
        width: 800,
        height: 600,
        x: 50,
        y: 50,
        title: 'Dev Console',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        autoHideMenuBar: true,
        alwaysOnTop: false
    });

    // Create dev-console.html if it doesn't exist
    const devConsoleHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Dev Console</title>
    <style>
        body { 
            background: #1e1e1e; 
            color: #d4d4d4; 
            font-family: 'Consolas', 'Monaco', monospace; 
            margin: 0; 
            padding: 10px; 
            overflow-y: auto; 
        }
        #logs { 
            white-space: pre-wrap; 
            word-wrap: break-word; 
        }
        .log-entry { 
            margin: 2px 0; 
            padding: 4px 8px; 
            border-left: 3px solid #555; 
            font-size: 13px; 
            line-height: 1.4; 
        }
        .log-success { border-left-color: #4caf50; color: #4caf50; }
        .log-error { border-left-color: #f44336; color: #f44336; }
        .log-warning { border-left-color: #ff9800; color: #ff9800; }
        .log-info { border-left-color: #2196f3; color: #2196f3; }
        .controls { 
            position: sticky; 
            top: 0; 
            background: #1e1e1e; 
            padding: 10px 0; 
            border-bottom: 1px solid #555; 
            margin-bottom: 10px; 
        }
        button { 
            background: #333; 
            color: #fff; 
            border: 1px solid #555; 
            padding: 5px 15px; 
            margin-right: 10px; 
            cursor: pointer; 
            border-radius: 3px; 
        }
        button:hover { background: #444; }
    </style>
</head>
<body>
    <div class="controls">
        <button onclick="clearLogs()">Clear Logs</button>
        <button onclick="saveLogsToFile()">Save to File</button>
    </div>
    <h2 style="color: #4caf50;">Developer Console</h2>
    <div id="logs"></div>
    <script>
        const { ipcRenderer } = require('electron');
        const fs = require('fs');
        const path = require('path');
        const logsDiv = document.getElementById('logs');
        let allLogs = [];

        ipcRenderer.on('dev-log', (event, data) => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry log-' + data.type;
            logEntry.textContent = data.message;
            logsDiv.appendChild(logEntry);
            logsDiv.scrollTop = logsDiv.scrollHeight;
            allLogs.push(data);
        });
        
        function clearLogs() {
            logsDiv.innerHTML = '';
            allLogs = [];
        }
        
        function saveLogsToFile() {
            const logText = allLogs.map(log => log.message).join('\\n');
            const desktopPath = path.join(require('os').homedir(), 'Desktop');
            const filePath = path.join(desktopPath, 'dev-logs-' + Date.now() + '.txt');
            fs.writeFileSync(filePath, logText);
            alert('Logs saved to: ' + filePath);
        }
    </script>
</body>
</html>`;

    const devConsoleFile = path.join(__dirname, 'dev-console.html');
    if (!fs.existsSync(devConsoleFile)) {
        fs.writeFileSync(devConsoleFile, devConsoleHtml);
    }

    devWindow.loadFile('dev-console.html').catch(err => {
        console.error('Failed to load dev console:', err);
        devWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(devConsoleHtml));
    });

    devWindow.on('closed', () => {
        devWindow = null;
    });
}

// Gửi log tới Dev Console
function devLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const logMessage = `[${timestamp}] ${message}`;

    if (mainSettings.debugMode) {
        try {
            console.log(logMessage);
        } catch (e) {
            // Ignore encoding errors
        }
    }

    if (devWindow && !devWindow.isDestroyed()) {
        devWindow.webContents.send('dev-log', {
            message: logMessage,
            type: type
        });
    }
}

// Xử lý mở cửa sổ pop-up
ipcMain.on('open-popup-window', (event) => {
    if (popupWindow) {
        popupWindow.focus();
        return;
    }

    popupWindow = new BrowserWindow({
        width: 500,
        height: 800,
        parent: mainWindow,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            webSecurity: false,
            partition: 'persist:popup'
        },
        autoHideMenuBar: true,
    });

    popupWindow.loadFile('index.html');

    popupWindow.webContents.once('dom-ready', () => {
        popupWindow.webContents.send('set-control-panel-mode');
    });

    mainWindow.webContents.send('set-webview-only-mode');

    popupWindow.on('closed', () => {
        popupWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('show-sidebar');
        }
    });
});

// Register custom protocol
function registerProtocols() {
    protocol.registerFileProtocol('safe-file', (request, callback) => {
        const url = request.url.replace('safe-file://', '');
        const decodedUrl = decodeURIComponent(url);
        callback({ path: path.normalize(decodedUrl) });
    });
}

// Tạo cửa sổ chính của ứng dụng
function createWindow() {
    // Clear partition data to prevent cache issues
    const partition = 'persist:main';
    session.fromPartition(partition).clearCache();

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            webSecurity: false,
            partition: partition,
            allowRunningInsecureContent: true,
            experimentalFeatures: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png') // Add if you have an icon
    });

    mainWindow.loadFile('index.html');

    const template = [
        {
            label: 'Developer',
            submenu: [
                {
                    label: 'Toggle Dev Console',
                    accelerator: 'F12',
                    click: () => {
                        if (devWindow && !devWindow.isDestroyed()) {
                            devWindow.close();
                        } else {
                            createDevConsole();
                        }
                    }
                },
                {
                    label: 'Toggle DevTools',
                    accelerator: 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                },
                {
                    label: 'Reload',
                    accelerator: 'Ctrl+R',
                    click: () => {
                        mainWindow.reload();
                    }
                },
                {
                    label: 'Force Reload',
                    accelerator: 'Ctrl+Shift+R',
                    click: () => {
                        mainWindow.webContents.reloadIgnoringCache();
                    }
                },
                {
                    label: 'Clear Cache and Reload',
                    click: async () => {
                        await clearCacheData();
                        mainWindow.reload();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Zoom In',
                    accelerator: 'Ctrl+=',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom + 1);
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'Ctrl+-',
                    click: () => {
                        const currentZoom = mainWindow.webContents.getZoomLevel();
                        mainWindow.webContents.setZoomLevel(currentZoom - 1);
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'Ctrl+0',
                    click: () => {
                        mainWindow.webContents.setZoomLevel(0);
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (devWindow && !devWindow.isDestroyed()) {
            devWindow.close();
        }
        if (popupWindow && !popupWindow.isDestroyed()) {
            popupWindow.close();
        }
    });

    // Handle certificate errors
    mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
        event.preventDefault();
        callback(true); // Ignore certificate errors for development
    });

    // Handle new window requests
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return { action: 'deny' };
    });

    if (mainSettings.autoOpenDevConsole) {
        setTimeout(() => createDevConsole(), 1000);
    }

    devLog('🚀 Ứng dụng đã khởi động thành công!', 'success');
}

// Khởi động ứng dụng
app.whenReady().then(async () => {
    // Clear cache on startup
    await clearCacheData();

    // Register protocols
    registerProtocols();

    loadMainSettings();
    await initializeDatabase();
    createWindow();

    // Handle certificate errors globally
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
        event.preventDefault();
        callback(true);
    });

    // Database handlers
    ipcMain.handle('save-knowledge', async (event, question, answer) => {
        try {
            const result = await saveKnowledge(question, answer);
            devLog(`✅ Saved knowledge: ${question}`, 'success');
            return result;
        } catch (error) {
            devLog(`❌ Error saving knowledge: ${error.message}`, 'error');
            throw error;
        }
    });

    ipcMain.handle('get-knowledge', async () => {
        try {
            const result = await getKnowledge();
            devLog(`✅ Retrieved ${result.length} knowledge items`, 'success');
            return result;
        } catch (error) {
            devLog(`❌ Error getting knowledge: ${error.message}`, 'error');
            throw error;
        }
    });

    ipcMain.handle('search-knowledge', async (event, query) => {
        try {
            const result = await searchKnowledge(query);
            devLog(`✅ Found ${result.length} matching knowledge items`, 'success');
            return result;
        } catch (error) {
            devLog(`❌ Error searching knowledge: ${error.message}`, 'error');
            throw error;
        }
    });

    ipcMain.handle('get-settings', () => mainSettings);

    // RAG query handler
    ipcMain.handle('rag-query', async (event, userQuery) => {
        try {
            const relevantKnowledge = await searchKnowledge(userQuery);
            let prompt = `User query: "${userQuery}"\n\n`;
            if (relevantKnowledge && relevantKnowledge.length > 0) {
                prompt += "Context from your knowledge base:\n";
                relevantKnowledge.forEach((item, index) => {
                    prompt += `\nKnowledge ${index + 1}:\nQuestion: ${item.question}\nAnswer: ${item.answer}\n`;
                });
                prompt += "\nBased on the user query and the provided context, please generate a comprehensive answer.\n";
            } else {
                prompt += "No specific context found in your knowledge base. Please answer based on general knowledge.\n";
            }
            devLog(`✅ Generated RAG prompt for query: ${userQuery}`, 'success');
            return `(Mock Gemini Response based on RAG)\n\n${prompt}\n\n(End of Mock Response)`;
        } catch (error) {
            devLog(`❌ Error in RAG query: ${error.message}`, 'error');
            throw error;
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Clear cache before quit
app.on('before-quit', async (event) => {
    event.preventDefault();
    await clearCacheData();
    app.exit(0);
});

// Register webview
ipcMain.on('register-webview', (event, webContentsId) => {
    try {
        const senderWindow = BrowserWindow.fromWebContents(event.sender);
        if (senderWindow === mainWindow || senderWindow === popupWindow) {
            const { webContents } = require('electron');
            mainWebviewContents = webContents.fromId(webContentsId);
            devLog(`✅ Webview chính đã được đăng ký với ID: ${webContentsId}`, 'success');
        }
    } catch (error) {
        devLog(`❌ Error registering webview: ${error.message}`, 'error');
    }
});

// Anti-tracking configuration handler
ipcMain.on('update-anti-tracking', (event, config) => {
    devLog(`🛡️ Anti-tracking config updated: ${JSON.stringify(config)}`, 'info');

    if (mainWebviewContents && !mainWebviewContents.isDestroyed()) {
        mainWebviewContents.send('update-anti-tracking', config);
    }
});

// Fake event configuration handler
ipcMain.on('update-fake-event', (event, config) => {
    devLog(`🎭 Fake event config updated: ${JSON.stringify(config)}`, 'info');

    if (mainWebviewContents && !mainWebviewContents.isDestroyed()) {
        mainWebviewContents.send('update-fake-event', config);
    }
});

// Read anti-tracking script
ipcMain.handle('read-anti-tracking-script', async () => {
    try {
        const scriptPath = path.join(__dirname, 'anti-tracking.js');
        if (!fs.existsSync(scriptPath)) {
            devLog('⚠️ Anti-tracking script not found', 'warning');
            return { success: false, error: 'Anti-tracking script not found' };
        }
        const script = fs.readFileSync(scriptPath, 'utf8');
        devLog('✅ Anti-tracking script loaded successfully', 'success');
        return { success: true, script };
    } catch (error) {
        devLog(`❌ Error reading anti-tracking script: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Read fake event script
ipcMain.handle('read-fake-event-script', async () => {
    try {
        const scriptPath = path.join(__dirname, 'fake-event.js');
        if (!fs.existsSync(scriptPath)) {
            devLog('⚠️ Fake event script not found', 'warning');
            return { success: false, error: 'Fake event script not found' };
        }
        const script = fs.readFileSync(scriptPath, 'utf8');
        devLog('✅ Fake event script loaded successfully', 'success');
        return { success: true, script };
    } catch (error) {
        devLog(`❌ Error reading fake event script: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Capture screenshot
ipcMain.handle('capture-screenshot', async () => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }

        const getDomSnapshotScript = `(() => { 
            try { 
                const elements = []; 
                let idCounter = 0; 
                
                function getCleanText(el) { 
                    let text = ''; 
                    try { 
                        if (el.innerText) text = el.innerText.trim(); 
                        else if (el.textContent) text = el.textContent.trim(); 
                        if (el.value) text = el.value; 
                        if (el.placeholder && !text) text = el.placeholder; 
                    } catch(e) {} 
                    return text.substring(0, 200); 
                } 
                
                function isClickable(el) { 
                    const tag = el.tagName.toLowerCase(); 
                    const clickableTags = ['a', 'button', 'input', 'textarea', 'select']; 
                    const hasClickHandler = el.onclick || el.getAttribute('onclick'); 
                    const isInteractive = el.hasAttribute('role') && ['button', 'link', 'checkbox', 'radio'].includes(el.getAttribute('role')); 
                    const hasPointer = window.getComputedStyle(el).cursor === 'pointer'; 
                    return clickableTags.includes(tag) || hasClickHandler || isInteractive || hasPointer; 
                } 
                
                const selector = 'a, button, input, textarea, select, label, [role="button"], [onclick], .option, .answer, [class*="answer"], [class*="option"], [class*="choice"], [class*="radio"], [class*="checkbox"], div[class*="select"], span[class*="select"]'; 
                
                document.querySelectorAll(selector).forEach(el => { 
                    try { 
                        const rect = el.getBoundingClientRect(); 
                        const styles = window.getComputedStyle(el); 
                        if (rect.width > 0 && rect.height > 0 && 
                            styles.display !== 'none' && 
                            styles.visibility !== 'hidden' && 
                            styles.opacity !== '0') { 
                            
                            const scrollX = window.pageXOffset || 0; 
                            const scrollY = window.pageYOffset || 0; 
                            
                            elements.push({ 
                                ai_id: idCounter++, 
                                tagName: el.tagName.toLowerCase(), 
                                rect: { 
                                    x: rect.x, 
                                    y: rect.y, 
                                    width: rect.width, 
                                    height: rect.height, 
                                    centerX: rect.x + rect.width / 2, 
                                    centerY: rect.y + rect.height / 2 
                                }, 
                                pageRect: { 
                                    x: rect.x + scrollX, 
                                    y: rect.y + scrollY, 
                                    centerX: rect.x + scrollX + rect.width / 2, 
                                    centerY: rect.y + scrollY + rect.height / 2 
                                }, 
                                text: getCleanText(el), 
                                className: el.className || '', 
                                id: el.id || '', 
                                name: el.name || '', 
                                type: el.type || '', 
                                checked: el.checked || false, 
                                selected: el.selected || false, 
                                value: el.value || '', 
                                href: el.href || '', 
                                ariaLabel: el.getAttribute('aria-label') || '', 
                                isClickable: isClickable(el) 
                            }); 
                        } 
                    } catch(e) {} 
                }); 
                
                elements.sort((a, b) => { 
                    if (Math.abs(a.rect.y - b.rect.y) > 10) return a.rect.y - b.rect.y; 
                    return a.rect.x - b.rect.x; 
                }); 
                
                return { 
                    elements: elements.slice(0, ${mainSettings.domLimit || 100}), 
                    viewport: { 
                        width: window.innerWidth, 
                        height: window.innerHeight, 
                        scrollX: window.pageXOffset || 0, 
                        scrollY: window.pageYOffset || 0 
                    }, 
                    documentInfo: { 
                        title: document.title || '', 
                        url: window.location.href || '' 
                    } 
                }; 
            } catch(e) { 
                return { elements: [], viewport: {}, documentInfo: {} }; 
            } 
        })();`;
        
        const [nativeImage, domData] = await Promise.all([
            mainWebviewContents.capturePage(),
            mainWebviewContents.executeJavaScript(getDomSnapshotScript)
        ]);
        
        const jpegBuffer = nativeImage.toJPEG(mainSettings.screenshotQuality);
        const screenshot = 'data:image/jpeg;base64,' + jpegBuffer.toString('base64');
        const bounds = nativeImage.getSize();
        
        devLog(`✅ Chụp màn hình thành công: ${bounds.width}x${bounds.height}, DOM elements: ${domData?.elements?.length || 0}`, 'success');
        
        return {
            success: true,
            data: screenshot,
            dimensions: bounds,
            domSnapshot: domData?.elements || [],
            domData: domData || { elements: [], viewport: {}, documentInfo: {} }
        };
    } catch (error) {
        devLog(`❌ Lỗi khi chụp màn hình: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Send to Gemini (Analyze mode)
ipcMain.handle('send-to-gemini', async (event, payload) => {
    const { apiKeys, startIndex, model, customPrompt, imageBase64 } = payload;
    if (!apiKeys || apiKeys.length === 0) {
        return { success: false, error: 'Không có API Key nào được cung cấp.' };
    }
    const totalKeys = apiKeys.length;

    for (let i = 0; i < totalKeys; i++) {
        const currentIndex = (startIndex + i) % totalKeys;
        const currentApiKey = apiKeys[currentIndex];

        try {
            devLog(`📤 Gửi request tới Gemini (Analyze) với Key #${currentIndex + 1}`, 'info');
            const base64Data = imageBase64.replace(/^data:image\/[\w]+;base64,/, '');
            
            const systemPrompt = `Bạn là một trợ lý AI chuyên giải bài tập và hỗ trợ học tập trên nền tảng OnLuyen.vn. 
                FORMAT TRẢ LỜI: 
                📌 **Đáp án đúng: [Chữ cái hoặc đáp án]** 
                📝 **Giải thích:** [Giải thích chi tiết]. 
                Luôn trả lời bằng ngôn ngữ: ${mainSettings.outputLanguage || 'Tiếng Việt'}`;
            
            const userPrompt = customPrompt || 'Hãy phân tích và giải quyết bài tập trong ảnh này.';
            const fullPrompt = `${systemPrompt}\n\n---\n\n**YÊU CẦU HIỆN TẠI:**\n${userPrompt}`;
            
            const requestPayload = {
                contents: [{
                    parts: [
                        { text: fullPrompt },
                        { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4096
                }
            };
            
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentApiKey}`,
                requestPayload,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                }
            );

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                devLog(`✅ Nhận phản hồi từ Key #${currentIndex + 1} thành công`, 'success');
                event.sender.send('api-key-updated', currentIndex);
                return { success: true, data: response.data.candidates[0].content.parts[0].text };
            } else {
                throw new Error('Response không hợp lệ từ Gemini API');
            }
        } catch (error) {
            const isQuotaError = error.response && error.response.status === 429;
            devLog(`❌ Lỗi với Key #${currentIndex + 1}: ${error.message}`, 'error');
            
            if (isQuotaError && i < totalKeys - 1) {
                devLog(`🔑 Key #${currentIndex + 1} đã hết hạn mức. Thử key tiếp theo...`, 'warning');
                continue;
            } else {
                return {
                    success: false,
                    error: `Tất cả ${totalKeys} key đều lỗi. Lỗi cuối cùng (Key #${currentIndex + 1}): ${error.response?.data?.error?.message || error.message}`
                };
            }
        }
    }
});

// Send to Gemini with Actions
ipcMain.handle('send-to-gemini-with-actions', async (event, payload) => {
    const { apiKeys, startIndex, model, customPrompt, imageBase64, dimensions, domSnapshot } = payload;
    if (!apiKeys || apiKeys.length === 0) {
        return { success: false, error: 'Không có API Key nào được cung cấp.' };
    }
    const totalKeys = apiKeys.length;

    for (let i = 0; i < totalKeys; i++) {
        const currentIndex = (startIndex + i) % totalKeys;
        const currentApiKey = apiKeys[currentIndex];

        try {
            devLog(`📤 Gửi request tới Gemini (Action) với Key #${currentIndex + 1}`, 'info');
            const base64Data = imageBase64.replace(/^data:image\/[\w]+;base64,/, '');
            const userPrompt = customPrompt ? `**Yêu cầu từ người dùng:** ${customPrompt}\n\n---\n\n` : '';
            const safeDomSnapshot = Array.isArray(domSnapshot) ? domSnapshot : [];
            const limitedSnapshot = safeDomSnapshot.slice(0, mainSettings.domLimit);
            
            const actionPrompt = `${userPrompt}Bạn là một AI trợ lý giải bài tập trên OnLuyen.vn.
BỐI CẢNH:
- Ảnh màn hình: ${dimensions?.width || 0}x${dimensions?.height || 0} pixels
- DOM elements (${limitedSnapshot.length} elements):
${JSON.stringify(limitedSnapshot, null, 2)}

NHIỆM VỤ:
Phân tích và tạo actions để giải bài tập.

QUAN TRỌNG - TRẢ VỀ JSON ĐÚNG FORMAT:
{
    "analysis": "Mô tả phân tích (bằng ngôn ngữ ${mainSettings.outputLanguage || 'Tiếng Việt'})",
    "actions": [ { "type": "click", "ai_id": [number], "description": "..." } ]
}`;

            const requestPayload = {
                contents: [{
                    parts: [
                        { text: actionPrompt },
                        { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 4096
                }
            };
            
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentApiKey}`,
                requestPayload,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000
                }
            );

            if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                devLog(`✅ Nhận phản hồi (Action) từ Key #${currentIndex + 1} thành công`, 'success');
                event.sender.send('api-key-updated', currentIndex);
                return { success: true, data: response.data.candidates[0].content.parts[0].text };
            } else {
                throw new Error('Response không hợp lệ từ Gemini API');
            }
        } catch (error) {
            const isQuotaError = error.response && error.response.status === 429;
            devLog(`❌ Lỗi với Key #${currentIndex + 1} (Action): ${error.message}`, 'error');
            
            if (isQuotaError && i < totalKeys - 1) {
                devLog(`🔑 Key #${currentIndex + 1} đã hết hạn mức. Thử key tiếp theo...`, 'warning');
                continue;
            } else {
                return {
                    success: false,
                    error: `Tất cả ${totalKeys} key đều lỗi. Lỗi cuối cùng (Key #${currentIndex + 1}): ${error.response?.data?.error?.message || error.message}`
                };
            }
        }
    }
});

// Perform click action
ipcMain.handle('perform-click', async (event, x, y) => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }
        devLog(`🖱️ Click tại vị trí (${x}, ${y})`, 'info');

        mainWebviewContents.sendInputEvent({
            type: 'mouseDown',
            x: Math.round(x),
            y: Math.round(y),
            button: 'left',
            clickCount: 1
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        mainWebviewContents.sendInputEvent({
            type: 'mouseUp',
            x: Math.round(x),
            y: Math.round(y),
            button: 'left'
        });
        
        return { success: true };
    } catch (error) {
        devLog(`❌ Lỗi khi click: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Perform type action
ipcMain.handle('perform-type', async (event, text, x, y) => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }
        if (!text) throw new Error('Không có text để nhập');

        devLog(`⌨️ Nhập text "${text}" tại (${x}, ${y})`, 'info');
        
        // Click vào vị trí nếu có tọa độ
        if (x !== undefined && y !== undefined) {
            mainWebviewContents.sendInputEvent({
                type: 'mouseDown',
                x: Math.round(x),
                y: Math.round(y),
                button: 'left',
                clickCount: 1
            });
            await new Promise(resolve => setTimeout(resolve, 50));
            mainWebviewContents.sendInputEvent({
                type: 'mouseUp',
                x: Math.round(x),
                y: Math.round(y),
                button: 'left'
            });
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // Clear existing text
        mainWebviewContents.sendInputEvent({
            type: 'keyDown',
            keyCode: 'a',
            modifiers: ['control']
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        mainWebviewContents.sendInputEvent({
            type: 'keyUp',
            keyCode: 'a',
            modifiers: ['control']
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        
        mainWebviewContents.sendInputEvent({
            type: 'keyDown',
            keyCode: 'Delete'
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        mainWebviewContents.sendInputEvent({
            type: 'keyUp',
            keyCode: 'Delete'
        });
        await new Promise(resolve => setTimeout(resolve, 50));

        // Type new text
        mainWebviewContents.insertText(text.toString());
        await new Promise(resolve => setTimeout(resolve, 20));
        
        devLog(`✅ Đã nhập xong: "${text}"`, 'success');
        return { success: true };
    } catch (error) {
        devLog(`❌ Lỗi khi nhập text: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Perform clear action
ipcMain.handle('perform-clear', async (event, x, y) => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }
        devLog(`🗑️ Xóa nội dung tại (${x}, ${y})`, 'info');

        mainWebviewContents.sendInputEvent({
            type: 'mouseDown',
            x: Math.round(x),
            y: Math.round(y),
            button: 'left',
            clickCount: 3
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        mainWebviewContents.sendInputEvent({
            type: 'keyDown',
            keyCode: 'Delete'
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        mainWebviewContents.sendInputEvent({
            type: 'keyUp',
            keyCode: 'Delete'
        });
        
        return { success: true };
    } catch (error) {
        devLog(`❌ Lỗi khi xóa nội dung: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Perform move action
ipcMain.handle('perform-move', async (event, x, y) => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }
        mainWebviewContents.sendInputEvent({
            type: 'mouseMove',
            x: Math.round(x),
            y: Math.round(y)
        });
        devLog(`🖱️ Di chuyển chuột tới (${x}, ${y})`, 'info');
        return { success: true };
    } catch (error) {
        devLog(`❌ Lỗi khi di chuyển chuột: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Perform scroll action
ipcMain.handle('perform-scroll', async (event, deltaY) => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }
        const scrollAmount = deltaY || 300;
        mainWebviewContents.sendInputEvent({
            type: 'mouseWheel',
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: scrollAmount
        });
        devLog(`📜 Cuộn trang: ${scrollAmount}`, 'info');
        return { success: true };
    } catch (error) {
        devLog(`❌ Lỗi khi cuộn trang: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Perform key press action
ipcMain.handle('perform-key', async (event, key) => {
    try {
        if (!mainWebviewContents || mainWebviewContents.isDestroyed()) {
            throw new Error('Webview chưa sẵn sàng');
        }
        const keyMap = {
            'Enter': 'Return',
            'Tab': 'Tab',
            'Escape': 'Escape',
            'Backspace': 'Backspace',
            'Delete': 'Delete',
            'ArrowUp': 'Up',
            'ArrowDown': 'Down',
            'ArrowLeft': 'Left',
            'ArrowRight': 'Right',
            'Space': 'Space',
            'Home': 'Home',
            'End': 'End',
            'PageUp': 'PageUp',
            'PageDown': 'PageDown'
        };
        const keyCode = keyMap[key] || key;

        mainWebviewContents.sendInputEvent({
            type: 'keyDown',
            keyCode: keyCode
        });
        await new Promise(resolve => setTimeout(resolve, 50));
        mainWebviewContents.sendInputEvent({
            type: 'keyUp',
            keyCode: keyCode
        });
        
        devLog(`⌨️ Nhấn phím: ${key}`, 'info');
        return { success: true };
    } catch (error) {
        devLog(`❌ Lỗi khi nhấn phím: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
});

// Handle app errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    devLog(`❌ Uncaught Exception: ${error.message}`, 'error');

    // Try to recover
    if (error.message.includes('cache') || error.message.includes('backend_impl')) {
        clearCacheData().then(() => {
            console.log('Cache cleared due to error');
        });
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    devLog(`❌ Unhandled Rejection: ${reason}`, 'error');
});