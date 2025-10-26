
// Renderer process script
let webview, urlInput, goBtn, backBtn, forwardBtn, reloadBtn, homeBtn, blockNetworkBtn, statusText, statusDot, scrapeBtn, settingsBtn, apiKeyModal, closeModalBtn, saveApiKeyBtn, apiKeyInput, modelSelect, advancedNetworkToggleBtn, advancedNetworkPanel, requestCounter, clearRequestsBtn, requestList, screenshotBtn;

let isNetworkBlocked = false;
const HOME_URL = 'https://app.onluyen.vn/';

document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    webview = document.getElementById('webview');
    urlInput = document.getElementById('url-input');
    goBtn = document.getElementById('go-btn');
    backBtn = document.getElementById('back-btn');
    forwardBtn = document.getElementById('forward-btn');
    reloadBtn = document.getElementById('reload-btn');
    homeBtn = document.getElementById('home-btn');
    blockNetworkBtn = document.getElementById('block-network-btn');
    statusText = document.getElementById('status-text');
    statusDot = document.getElementById('status-dot');
    scrapeBtn = document.getElementById('scrape-btn');
    settingsBtn = document.getElementById('settings-btn');
    apiKeyModal = document.getElementById('api-key-modal');
    closeModalBtn = document.getElementById('close-modal-btn');
    saveApiKeyBtn = document.getElementById('save-api-key-btn');
    apiKeyInput = document.getElementById('api-key-input');
    modelSelect = document.getElementById('model-select');
    advancedNetworkToggleBtn = document.getElementById('advanced-network-toggle-btn');
    advancedNetworkPanel = document.getElementById('advanced-network-panel');
    requestCounter = document.getElementById('request-counter');
    clearRequestsBtn = document.getElementById('clear-requests-btn');
    requestList = document.getElementById('request-list');
    screenshotBtn = document.getElementById('screenshot-btn');

    const preloadPath = await window.electronAPI.getPreloadPath();
    webview.setAttribute('preload', preloadPath);
    webview.setAttribute('src', HOME_URL);
    
    webview.addEventListener('dom-ready', () => {
        console.log('Webview DOM is ready');
        initializeWebview();
    });
    
    initializeControls();
});

function initializeWebview() {
    window.electronAPI.getBlockingStatus();
    
    webview.addEventListener('did-start-loading', () => updateNavigationButtons());
    webview.addEventListener('did-stop-loading', () => updateNavigationButtons());
    webview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode !== -3) { /* -3 is ABORTED */
            console.error('Webview failed to load:', e);
        }
    });
    webview.addEventListener('did-navigate', (e) => {
        urlInput.value = e.url;
        updateNavigationButtons();
    });
    webview.addEventListener('did-navigate-in-page', (e) => {
        urlInput.value = e.url;
        updateNavigationButtons();
    });
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        webview.loadURL(e.url);
    });
    webview.addEventListener('page-title-updated', (e) => {
        document.title = e.title + ' - OnLuyen Solver';
    });
    
    updateNavigationButtons();
}

function initializeControls() {
    backBtn.addEventListener('click', () => webview.goBack());
    forwardBtn.addEventListener('click', () => webview.goForward());
    reloadBtn.addEventListener('click', () => webview.reload());
    homeBtn.addEventListener('click', () => webview.loadURL(HOME_URL));
    
    goBtn.addEventListener('click', navigateToUrl);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') navigateToUrl();
    });
    
    blockNetworkBtn.addEventListener('click', () => window.electronAPI.toggleNetworkBlocking());

    advancedNetworkToggleBtn.addEventListener('click', () => {
        advancedNetworkPanel.classList.toggle('visible');
        advancedNetworkToggleBtn.classList.toggle('active');
    });

    clearRequestsBtn.addEventListener('click', () => {
        window.electronAPI.clearRequestQueue();
    });

    // NOTE: You need to add a button with id="screenshot-btn" to your index.html file for this to work.
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', async () => {
            try {
                const image = await webview.capturePage();
                window.electronAPI.saveScreenshot(image.toDataURL());
            } catch (error) {
                console.error('Failed to capture page:', error);
            }
        });
    }

    scrapeBtn.addEventListener('click', async () => {
        try {
            const scriptContent = await window.electronAPI.getScrapeScript();
            if (scriptContent) await webview.executeJavaScript(scriptContent);
        } catch (error) {
            console.error('Failed to execute scrape script:', error);
        }
    });

    settingsBtn.addEventListener('click', async () => {
        const [apiKey, savedModel] = await Promise.all([
            window.electronAPI.getApiKey(),
            window.electronAPI.getGeminiModel()
        ]);
        apiKeyInput.value = apiKey || '';
        if (savedModel) modelSelect.value = savedModel;
        apiKeyModal.classList.add('visible');
    });

    closeModalBtn.addEventListener('click', () => apiKeyModal.classList.remove('visible'));

    saveApiKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;

        const [apiKeyResult, modelResult] = await Promise.all([
            window.electronAPI.saveApiKey(apiKey),
            window.electronAPI.saveGeminiModel(selectedModel)
        ]);

        if (apiKeyResult.success && modelResult.success) {
            apiKeyModal.classList.remove('visible');
        } else {
            console.error('Failed to save settings');
        }
    });

    apiKeyModal.addEventListener('click', (e) => {
        if (e.target === apiKeyModal) apiKeyModal.classList.remove('visible');
    });
    
    window.electronAPI.onOpenWebviewDevtools(() => {
        if (webview) {
            webview.openDevTools();
        }
    });

    window.electronAPI.onNetworkBlockingStatus(status => {
        isNetworkBlocked = status;
        updateBlockingUI();
    });

    window.electronAPI.onNetworkQueueUpdated(queue => {
        updateRequestList(queue);
    });
}

function navigateToUrl() {
    let url = urlInput.value.trim();
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    webview.loadURL(url);
}

function updateBlockingUI() {
    blockNetworkBtn.classList.toggle('active', isNetworkBlocked);
    statusText.textContent = isNetworkBlocked ? 'Mạng đã chặn' : 'Bình thường';
    statusDot.classList.toggle('blocked', isNetworkBlocked);
}

function updateNavigationButtons() {
    if (!webview) return;
    try {
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    } catch (e) { /* Ignore */ }
}

function updateRequestList(queue) {
    requestCounter.textContent = `Blocked Requests: ${queue.length}`;
    requestList.innerHTML = '';
    queue.forEach(req => {
        const li = document.createElement('li');
        li.textContent = `[${req.method}] ${req.url}`;
        li.title = `${req.url} (${new Date(req.timestamp).toLocaleTimeString()})`;
        requestList.appendChild(li);
    });
}
