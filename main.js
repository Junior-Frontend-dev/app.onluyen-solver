const { app, BrowserWindow, ipcMain, session, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { GoogleGenerativeAI, GoogleSearchRetriever } = require("@google/generative-ai");

// --- PATHS ---
const userDataPath = app.getPath('userData');
const apiKeyPath = path.join(userDataPath, 'gemini-api-key.txt');
const modelPath = path.join(userDataPath, 'gemini-model.txt');
const visionModelPath = path.join(userDataPath, 'gemini-vision-model.txt');

const deepReasoningStatePath = path.join(userDataPath, 'deep-reasoning-state.txt');
const fastModeStatePath = path.join(userDataPath, 'fast-mode-state.txt');
const googleSearchStatePath = path.join(userDataPath, 'google-search-state.txt');
const autoBypassCheatStatePath = path.join(userDataPath, 'auto-bypass-cheat-state.txt');
const blockStatePath = path.join(userDataPath, 'network-block-state.json');

function dataUriToGenerativePart(dataUri) {
    const [metadata, base64Data] = dataUri.split(',');
    const mimeType = metadata.match(/data:(.*?);/)[1];
    return {
        inlineData: {
            data: base64Data,
            mimeType
        },
    };
}



// --- STATE ---
let mainWindow;
let isBlockingNetwork = false;
let requestQueue = [];

// --- GEMINI API HANDLER ---
ipcMain.on('stream-gemini', async (event, { content, model }) => {
    console.log(`[Gemini] Received request for model: ${model}`);
    try {
        const apiKey = await fs.readFile(apiKeyPath, 'utf-8');
        if (!apiKey) {
            throw new Error("Gemini API Key is not set.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Read settings
        const isDeepReasoning = await fs.readFile(deepReasoningStatePath, 'utf-8').then(d => d === 'true').catch(() => false);
        const isFastMode = await fs.readFile(fastModeStatePath, 'utf-8').then(d => d === 'true').catch(() => false);
        const useGoogleSearch = await fs.readFile(googleSearchStatePath, 'utf-8').then(d => d === 'true').catch(() => false);

        // Configure model
        const modelConfig = { model };
        if (useGoogleSearch) {
            console.log('[Gemini] Google Search enabled.');
            modelConfig.tools = [new GoogleSearchRetriever()];
        }
        const generativeModel = genAI.getGenerativeModel(modelConfig);

        // Determine prompt
        let prompt;
        if (isFastMode) {
            console.log('[Gemini] Using Fast Mode prompt.');
            prompt = `You are a high-speed academic problem solver optimized for low latency. Do not reveal your reasoning, steps, or notes. For each question, output only the final answers in the required format.

Final output rules (the only content you show):
- Output answers only, numbered in the same order as the questions: "1) ...", "2) ...", etc.
- No explanations, no headings, no code fences, no extra text or symbols.
- Multiple choice: output only the uppercase letter (e.g., A).
- Fill-in-the-blank / numeric: output only the value with the exact unit requested. Use decimal comma for Vietnamese context (e.g., 4,5 cm).
- True/False: use 'Đ' for true and 'S' for false, separated by a single space, preserving order (e.g., Đ S Đ S).
- If a question is unsolvable, output 'Không đủ dữ liệu'.

Here are the questions:

${content}`;
        } else if (isDeepReasoning) {
            console.log('[Gemini] Using Deep Reasoning prompt.');
            prompt = `You are a world-class reasoning engine. For the following questions, you MUST perform deep, rigorous, first-principles reasoning. First, show your exhaustive, detailed, and logical breakdown of the problem inside <thinking> tags. Explore different angles, identify underlying principles, and show your work clearly. After the <thinking> block, provide only the final, concise answer.

Final output rules (after the thinking block):
- Output answers only, numbered in the same order as the questions: "1) ...", "2) ...", etc.
- No explanations, no headings, no code fences, no extra text or symbols.
- Multiple choice: output only the uppercase letter (e.g., A).
- Fill-in-the-blank / numeric: output only the value with the exact unit requested. Use decimal comma for Vietnamese context (e.g., 4,5 cm).
- True/False: use 'Đ' for true and 'S' for false, separated by a single space, preserving order (e.g., Đ S Đ S).
- If a question is unsolvable, answer: 'Không đủ dữ liệu'.

Here are the questions:

${content}`;
        } else {
            console.log('[Gemini] Using Standard (Expert) prompt.');
            prompt = `You are an expert at solving academic questions. First, think step-by-step with clear, methodical reasoning inside <thinking> tags, but do not reveal it. After the <thinking> block, provide only the final answer in the required format.

Final output rules (strict):
- Output answers only, numbered in order: "1) ...", "2) ...", etc. No explanations or extra text.
- Multiple choice: only the uppercase letter (e.g., A).
- Fill-in-the-blank / numeric: only the value with the exact unit requested. Use decimal comma in Vietnamese context (e.g., 4,5 cm).
- True/False: 'Đ' for true, 'S' for false, separated by a single space (e.g., S Đ S).
- If the problem is unsolvable, answer: 'Không đủ dữ liệu'.

Here are the questions:

${content}`;
        }


        const result = await generativeModel.generateContentStream([prompt]);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            // Send chunk to the specific webview that requested it
            event.sender.send('gemini-stream-chunk', { text: chunkText });
        }
        
        event.sender.send('gemini-stream-end');
        console.log('[Gemini] Stream finished successfully.');

    } catch (error) {
        console.error("[Gemini] Error during streaming:", error);
        event.sender.send('gemini-stream-error', { message: error.message });
    }
});


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
ipcMain.handle('get-gemini-model', () => fs.readFile(modelPath, 'utf-8').catch(() => 'gemini-2.5-flash'));
ipcMain.handle('save-gemini-model', (event, model) => fs.writeFile(modelPath, model, 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));
ipcMain.handle('get-vision-gemini-model', () => fs.readFile(visionModelPath, 'utf-8').catch(() => 'gemini-2.5-flash'));
ipcMain.handle('save-vision-gemini-model', (event, model) => fs.writeFile(visionModelPath, model, 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));


// Deep Reasoning Handlers
ipcMain.handle('get-deep-reasoning-state', () => fs.readFile(deepReasoningStatePath, 'utf-8').then(d => d === 'true').catch(() => false));
ipcMain.handle('save-deep-reasoning-state', (event, isEnabled) => fs.writeFile(deepReasoningStatePath, String(isEnabled), 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));

// Fast Mode Handlers
ipcMain.handle('get-fast-mode-state', () => fs.readFile(fastModeStatePath, 'utf-8').then(d => d === 'true').catch(() => false));
ipcMain.handle('save-fast-mode-state', (event, isEnabled) => fs.writeFile(fastModeStatePath, String(isEnabled), 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));

// Google Search Handlers
ipcMain.handle('get-google-search-state', () => fs.readFile(googleSearchStatePath, 'utf-8').then(d => d === 'true').catch(() => false));
ipcMain.handle('save-google-search-state', (event, isEnabled) => fs.writeFile(googleSearchStatePath, String(isEnabled), 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));

// Auto Bypass Cheat Handlers
ipcMain.handle('get-auto-bypass-cheat-state', () => fs.readFile(autoBypassCheatStatePath, 'utf-8').then(d => d === 'true').catch(() => false));
ipcMain.handle('save-auto-bypass-cheat-state', (event, isEnabled) => fs.writeFile(autoBypassCheatStatePath, String(isEnabled), 'utf-8').then(() => ({ success: true })).catch(e => ({ success: false, error: e.message })));

// Vision Search Handler
ipcMain.on('stream-vision-gemini', async (event, { image, prompt }) => {
    console.log('[Gemini Vision] Received request.');
    try {
        const apiKey = await fs.readFile(apiKeyPath, 'utf-8');
        if (!apiKey) {
            throw new Error("Gemini API Key is not set.");
        }

        const visionModel = await fs.readFile(visionModelPath, 'utf-8').catch(() => 'gemini-2.5-flash');
        const genAI = new GoogleGenerativeAI(apiKey);
        const generativeModel = genAI.getGenerativeModel({ model: visionModel });

        const content = [];
        if (image) {
            const imagePart = dataUriToGenerativePart(image);
            content.push(imagePart);
        }
        if (prompt) {
            const textPart = { text: prompt };
            content.push(textPart);
        }

        if (content.length === 0) {
            return;
        }

        console.log('[Gemini Vision] Calling generateContentStream...');
        const stream = await generativeModel.generateContentStream(content);

        for await (const chunk of stream.stream) {
            const chunkText = chunk.text();
            event.sender.send('vision-stream-chunk', { text: chunkText });
        }

        event.sender.send('vision-stream-end');
        console.log('[Gemini Vision] Stream finished successfully.');

    } catch (error) {
        console.error("[Gemini Vision] Error during streaming:", error);
        event.sender.send('vision-stream-error', { message: error.message });
    }
});

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';