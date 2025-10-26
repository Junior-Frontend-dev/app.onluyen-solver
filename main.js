const { app, BrowserWindow, ipcMain, session, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// --- PATHS ---
const userDataPath = app.getPath('userData');
const apiKeyPath = path.join(userDataPath, 'gemini-api-key.txt');
const modelPath = path.join(userDataPath, 'gemini-model.txt');
const blockStatePath = path.join(userDataPath, 'network-block-state.json');

// --- STATE ---
let mainWindow;
let isBlockingNetwork = false;
let requestQueue = [];

// --- CORE FUNCTIONS ---

async function saveBlockingState() {
    try {
        await fs.writeFile(blockStatePath, JSON.stringify({ isBlocking: isBlockingNetwork }));
    } catch (error) {
        console.error("Couldn't save network block state:", error);
    }
}

async function loadBlockingState() {
    try {
        const data = await fs.readFile(blockStatePath, 'utf-8');
        const state = JSON.parse(data);
        if (typeof state.isBlocking === 'boolean') {
            // Set the initial state but don't apply the block yet, wait for the window to be ready
            isBlockingNetwork = state.isBlocking;
        }
    } catch (error) {
        // File might not exist on first run, which is fine
        console.log("No network block state file found, starting with default.");
    }
}

async function applyNetworkBlock() {
    const sessionsToBlock = [
        session.defaultSession,
        session.fromPartition('persist:webview')
    ];

    const blockProxyConfig = {
        proxyRules: 'http=127.0.0.1:1;https=127.0.0.1:1', // Non-existent proxy
        proxyBypassRules: '<local>', // Bypass for local files
    };

    const unblockProxyConfig = {
        proxyRules: undefined, // Use system default
    };

    for (const ses of sessionsToBlock) {
        if (isBlockingNetwork) {
            await ses.setProxy(blockProxyConfig);
            console.log(`[Proxy Block] Network blocking enabled for session: ${ses === session.defaultSession ? 'default' : 'webview'}`);
        } else {
            await ses.setProxy(unblockProxyConfig);
            console.log(`[Proxy Block] Network blocking disabled for session: ${ses === session.defaultSession ? 'default' : 'webview'}`);
        }
    }

    // With proxy blocking, we can't inspect individual requests, so the queue is cleared.
    if (requestQueue.length > 0) {
        requestQueue = [];
        sendQueueToRenderer();
    }

    if (mainWindow) {
        mainWindow.webContents.send('network-blocking-status', isBlockingNetwork);
    }
}

async function toggleNetworkBlocking(shouldBlock) {
    isBlockingNetwork = typeof shouldBlock === 'boolean' ? shouldBlock : !isBlockingNetwork;
    await applyNetworkBlock();
    saveBlockingState();
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true,
            webSecurity: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile('index.html');
    
    // Apply the loaded blocking state once the window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        applyNetworkBlock();
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// --- APP LIFECYCLE ---

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
    await loadBlockingState();

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    globalShortcut.register('Control+B', () => toggleNetworkBlocking());

    // Add F12 shortcut to open DevTools
    globalShortcut.register('F12', () => {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            focusedWindow.webContents.toggleDevTools();
        }
    });

    // Add F11 shortcut to open DevTools for the webview
    globalShortcut.register('F11', () => {
        if (mainWindow) {
            mainWindow.webContents.send('open-webview-devtools');
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC HANDLERS ---

function sendQueueToRenderer() {
    if (mainWindow) {
        mainWindow.webContents.send('network-queue-updated', requestQueue);
    }
}

ipcMain.on('toggle-network-blocking', (event, shouldBlock) => {
    toggleNetworkBlocking(shouldBlock);
});

ipcMain.on('get-blocking-status', (event) => {
    event.reply('network-blocking-status', isBlockingNetwork);
    sendQueueToRenderer();
});

ipcMain.on('clear-request-queue', () => {
    requestQueue = [];
    console.log('Request queue cleared.');
    sendQueueToRenderer();
});

ipcMain.on('save-screenshot', async (event, dataUrl) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Screenshot',
        defaultPath: `onluyen-screenshot-${Date.now()}.png`,
        filters: [{ name: 'PNG Images', extensions: ['png'] }]
    });

    if (!canceled && filePath) {
        const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
        try {
            await fs.writeFile(filePath, buffer);
        } catch (error) {
            console.error('Failed to save screenshot:', error);
        }
    }
});

ipcMain.handle('get-scrape-script', () => fs.readFile(path.join(__dirname, 'onluyen.js'), 'utf-8'));
ipcMain.handle('get-preload-path', () => path.join(__dirname, 'preload.js'));

// API Key and Model Handlers
ipcMain.handle('get-api-key', () => fs.readFile(apiKeyPath, 'utf-8').catch(() => null));
ipcMain.handle('save-api-key', (event, key) => fs.writeFile(apiKeyPath, key, 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));
ipcMain.handle('get-gemini-model', () => fs.readFile(modelPath, 'utf-8').catch(() => 'gemini-1.5-flash-latest'));
ipcMain.handle('save-gemini-model', (event, model) => fs.writeFile(modelPath, model, 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';