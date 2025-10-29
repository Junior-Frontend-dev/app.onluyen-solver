
// Renderer process script
let webview, urlInput, goBtn, backBtn, forwardBtn, reloadBtn, homeBtn, blockNetworkBtn, statusText, statusDot, scrapeBtn, settingsBtn, apiKeyModal, closeModalBtn, saveApiKeyBtn, apiKeyInput, modelSelect, visionModelSelect, deepReasoningToggle, fastModeToggle, googleSearchToggle, chatBtn, chatPopup, chatPopupHeader, chatPopupCloseBtn, chatMessages, chatPromptInput, chatSendBtn, chatScreenshotBtn, advancedNetworkToggleBtn, advancedNetworkPanel, requestCounter, clearRequestsBtn, requestList, screenshotBtn;
let lsRefreshBtn, lsAddBtn, lsDeleteBtn, lsKeySelect, lsKeyInput, lsValueInput, lsSaveBtn;

let isNetworkBlocked = false;
const HOME_URL = 'https://app.onluyen.vn/';
let autoBypassCheatToggle, autoClickIntervalId, autoClickObserver;

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
    visionModelSelect = document.getElementById('vision-model-select');
    deepReasoningToggle = document.getElementById('deep-reasoning-toggle');
    fastModeToggle = document.getElementById('fast-mode-toggle');
    googleSearchToggle = document.getElementById('google-search-toggle');
    autoBypassCheatToggle = document.getElementById('auto-bypass-cheat-toggle');
    chatBtn = document.getElementById('chat-btn');
    const proChatBtn = document.getElementById('pro-chat-btn');
    proChatBtn.addEventListener('click', () => {
        window.electronAPI.openProChatWindow();
    });
    chatPopup = document.getElementById('chat-popup');
    chatPopupHeader = document.getElementById('chat-popup-header');
    chatPopupCloseBtn = document.getElementById('chat-popup-close-btn');
    chatMessages = document.getElementById('chat-messages');
    chatPromptInput = document.getElementById('chat-prompt-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatScreenshotBtn = document.getElementById('chat-screenshot-btn');
    advancedNetworkToggleBtn = document.getElementById('advanced-network-toggle-btn');
    advancedNetworkPanel = document.getElementById('advanced-network-panel');
    requestCounter = document.getElementById('request-counter');
    clearRequestsBtn = document.getElementById('clear-requests-btn');
    requestList = document.getElementById('request-list');
    lsRefreshBtn = document.getElementById('ls-refresh-btn');
    lsAddBtn = document.getElementById('ls-add-btn');
    lsDeleteBtn = document.getElementById('ls-delete-btn');
    lsKeySelect = document.getElementById('ls-key-select');
    lsKeyInput = document.getElementById('ls-key-input');
    lsValueInput = document.getElementById('ls-value-input');
    lsSaveBtn = document.getElementById('ls-save-btn');
    screenshotBtn = document.getElementById('screenshot-btn');

    const preloadPath = await window.electronAPI.getPreloadPath();
    webview.setAttribute('preload', preloadPath);
    webview.setAttribute('src', HOME_URL);
    
    webview.addEventListener('dom-ready', () => {
        console.log('Webview DOM is ready');
        initializeWebview();
        // Initial load of auto-bypass cheat state after webview DOM is ready
        window.electronAPI.getAutoBypassCheatState().then(isEnabled => {
            toggleAutoBypassCheat(isEnabled);
        });
    });
    initializeControls();
});

function initializeWebview() {
    window.electronAPI.getBlockingStatus();
    
    webview.addEventListener('did-start-loading', () => {
        scrapeBtn.classList.add('loading');
        updateNavigationButtons();
    });
    webview.addEventListener('did-stop-loading', () => {
        scrapeBtn.classList.remove('loading');
        updateNavigationButtons();
    });
    webview.addEventListener('did-fail-load', (e) => {
        scrapeBtn.classList.remove('loading');
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

    chatBtn.addEventListener('click', () => {
        chatPopup.classList.toggle('visible');
    });

    chatPopupCloseBtn.addEventListener('click', () => {
        chatPopup.classList.remove('visible');
    });

    chatSendBtn.addEventListener('click', handleChatSend);
    chatPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSend();
    });

    chatScreenshotBtn.addEventListener('click', handleChatScreenshot);

    // Make chat popup draggable
    let isDragging = false;
    let offsetX, offsetY;

    chatPopupHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        const rect = chatPopup.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        chatPopup.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        chatPopup.style.left = `${e.clientX - offsetX}px`;
        chatPopup.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        chatPopup.style.cursor = 'grab';
    });

    scrapeBtn.addEventListener('click', async () => {
        try {
            const scriptContent = await window.electronAPI.getScrapeScript();
            if (scriptContent) await webview.executeJavaScript(scriptContent);
        } catch (error) {
            console.error('Failed to execute scrape script:', error);
        }
    });

    settingsBtn.addEventListener('click', async () => {
        const [apiKey, savedModel, savedVisionModel, deepReasoningState, fastModeState, googleSearchState, autoBypassCheatState] = await Promise.all([
            window.electronAPI.getApiKey(),
            window.electronAPI.getGeminiModel(),
            window.electronAPI.getVisionGeminiModel(),
            window.electronAPI.getDeepReasoningState(),
            window.electronAPI.getFastModeState(),
            window.electronAPI.getGoogleSearchState(),
            window.electronAPI.getAutoBypassCheatState()
        ]);
        apiKeyInput.value = apiKey || '';
        if (savedModel) modelSelect.value = savedModel;
        if (savedVisionModel) visionModelSelect.value = savedVisionModel;
        deepReasoningToggle.checked = deepReasoningState;
        fastModeToggle.checked = fastModeState;
        googleSearchToggle.checked = googleSearchState;
        autoBypassCheatToggle.checked = autoBypassCheatState;
        apiKeyModal.classList.add('visible');
    });

    closeModalBtn.addEventListener('click', () => apiKeyModal.classList.remove('visible'));

    saveApiKeyBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const selectedModel = modelSelect.value;
        const selectedVisionModel = visionModelSelect.value;
        const isDeepReasoningEnabled = deepReasoningToggle.checked;
        const isFastModeEnabled = fastModeToggle.checked;
        const isGoogleSearchEnabled = googleSearchToggle.checked;
        const isAutoBypassCheatEnabled = autoBypassCheatToggle.checked;

        const results = await Promise.all([
            window.electronAPI.saveApiKey(apiKey),
            window.electronAPI.saveGeminiModel(selectedModel),
            window.electronAPI.saveVisionGeminiModel(selectedVisionModel),
            window.electronAPI.saveDeepReasoningState(isDeepReasoningEnabled),
            window.electronAPI.saveFastModeState(isFastModeEnabled),
            window.electronAPI.saveGoogleSearchState(isGoogleSearchEnabled),
            window.electronAPI.saveAutoBypassCheatState(isAutoBypassCheatEnabled)
        ]);

        if (results.every(res => res.success)) {
            apiKeyModal.classList.remove('visible');
            toggleAutoBypassCheat(isAutoBypassCheatEnabled); // Apply the setting immediately
        } else {
            console.error('Failed to save one or more settings');
        }
    });

        apiKeyModal.addEventListener('click', (e) => {
            if (e.target === apiKeyModal) apiKeyModal.classList.remove('visible');
        });
        
        // Local Storage Editor Event Listeners
        lsRefreshBtn.addEventListener('click', updateLocalStorageEditor);
        lsAddBtn.addEventListener('click', () => {
            lsKeyInput.value = '';
            lsValueInput.value = '';
            lsKeyInput.disabled = false;
            lsDeleteBtn.disabled = true;
            lsKeySelect.selectedIndex = -1; // Deselect any item
        });
        lsDeleteBtn.addEventListener('click', () => {
            const selectedKey = lsKeySelect.value;
            if (selectedKey) {
                localStorage.removeItem(selectedKey);
                updateLocalStorageEditor();
            }
        });
        lsSaveBtn.addEventListener('click', () => {
            const key = lsKeyInput.value.trim();
            const value = lsValueInput.value;
            if (key) {
                localStorage.setItem(key, value);
                updateLocalStorageEditor();
            }
        });
        lsKeySelect.addEventListener('change', () => {
            const selectedKey = lsKeySelect.value;
            if (selectedKey) {
                lsKeyInput.value = selectedKey;
                lsValueInput.value = localStorage.getItem(selectedKey);
                lsKeyInput.disabled = true; // Key cannot be edited once selected
                lsDeleteBtn.disabled = false;
            } else {
                lsKeyInput.value = '';
                lsValueInput.value = '';
                lsKeyInput.disabled = false;
                lsDeleteBtn.disabled = true;
            }
        });
    
        // Initial update of local storage editor when panel is shown
        advancedNetworkToggleBtn.addEventListener('click', () => {
            if (advancedNetworkPanel.classList.contains('visible')) {
                updateLocalStorageEditor();
            }
        });
    
        window.electronAPI.onOpenWebviewDevtools(() => {
            if (webview) {
                webview.openDevTools();
            }
        });
    window.electronAPI.onNetworkBlockingStatus(status => {
        isNetworkBlocked = status;
        updateBlockingUI();
        if (!isNetworkBlocked) {
            // Network re-enabled, run smart clean
            smartCleanStorage();
        }
    });

    window.electronAPI.onNetworkQueueUpdated(queue => {
        updateRequestList(queue);
    });
}

function updateLocalStorageEditor() {
    lsKeySelect.innerHTML = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key;
        lsKeySelect.appendChild(option);
    }
    lsKeyInput.value = '';
    lsValueInput.value = '';
    lsKeyInput.disabled = false;
    lsDeleteBtn.disabled = true;
}

function toggleAutoBypassCheat(isEnabled) {
    if (isEnabled) {
        if (!autoClickObserver) {
            autoClickObserver = new MutationObserver((mutationsList, observer) => {
                if (clickConfirmButton()) {
                    // Optionally, disconnect observer after clicking if the button only appears once
                    // observer.disconnect();
                }
            });
            // Start observing the webview's contentDocument body for childList and subtree changes
            // Ensure webview.contentDocument is available before observing
            if (webview && webview.contentDocument) {
                autoClickObserver.observe(webview.contentDocument.body, { childList: true, subtree: true });
                console.log('Auto bypass cheat enabled. Observer started.');
            } else {
                console.warn('Webview contentDocument not ready, cannot start observer.');
            }
        }
    } else {
        if (autoClickObserver) {
            autoClickObserver.disconnect();
            autoClickObserver = null;
            console.log('Auto bypass cheat disabled. Observer stopped.');
        }
    }
}

// Hàm kiểm tra và bấm nút
function clickConfirmButton() {
    // Ensure webview.contentDocument is available
    if (!webview || !webview.contentDocument) {
        return false;
    }
    const btn = Array.from(webview.contentDocument.querySelectorAll('button.btn.btn-danger'))
                     .find(b => b.textContent.trim() === 'Xác nhận để tiếp tục làm bài');
    if (btn) {
        btn.click();
        console.log('Đã bấm nút!');
        return true;
    }
    return false;
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

function smartCleanStorage() {
  const keepPatterns = [
    "token", "access_token", "refresh_token", "auth", "login", "user",
    "answer", "answers", "exam", "question", "test", "result", "progress"
  ];

  function shouldKeep(key) {
    return keepPatterns.some(pattern => key.toLowerCase().includes(pattern));
  }

  let removed = 0;

  console.log("🧩 Bắt đầu dọn localStorage & sessionStorage...");
  console.group("🧹 Các key bị xoá:");

  // 🧹 LocalStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!shouldKeep(key)) {
      localStorage.removeItem(key);
      removed++;
      console.log(`🗑️ localStorage: ${key}`);
      i--;
    }
  }

  // 🧹 SessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!shouldKeep(key)) {
      sessionStorage.removeItem(key);
      removed++;
      console.log(`🗑️ sessionStorage: ${key}`);
      i--;
    }
  }

  console.groupEnd();
  console.log(`✅ Đã xoá ${removed} key không cần thiết.`);
  console.log("🔐 Giữ lại các key có từ khoá:", keepPatterns);
}

let currentChatImage = null;
let streamingAIMessage = null;

function addMessageToChat(sender, { text, image, isTyping = false }) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender);

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');

    if (image) {
        const imageElement = document.createElement('div');
        imageElement.classList.add('message-image');
        imageElement.innerHTML = `<img src="${image}" alt="screenshot">`;
        contentElement.appendChild(imageElement);
    }

    if (text) {
        const textElement = document.createElement('div');
        textElement.innerHTML = text;
        contentElement.appendChild(textElement);
    }

    if (isTyping) {
        const typingIndicatorElement = document.createElement('div');
        typingIndicatorElement.classList.add('typing-indicator');
        typingIndicatorElement.innerHTML = '<span></span><span></span><span></span>';
        contentElement.appendChild(typingIndicatorElement);
    }
    
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
}

async function handleChatScreenshot() {
    try {
        const image = await webview.capturePage();
        currentChatImage = image.toDataURL();
        addMessageToChat('user', { image: currentChatImage });
    } catch (error) {
        console.error('Failed to capture page for chat:', error);
    }
}

async function handleChatSend() {
    const promptText = chatPromptInput.value.trim();
    if (!currentChatImage && !promptText) return;

    addMessageToChat('user', { text: promptText });
    chatPromptInput.value = '';

    // Disable buttons and show typing indicator
    chatSendBtn.disabled = true;
    chatScreenshotBtn.disabled = true;
    streamingAIMessage = addMessageToChat('ai', { text: '', isTyping: true });

    window.electronAPI.streamVisionGemini({ image: currentChatImage, prompt: promptText });
    currentChatImage = null; // Reset image after sending
}

window.electronAPI.onVisionStreamChunk(({ text }) => {
    if (streamingAIMessage) {
        const contentElement = streamingAIMessage.querySelector('.message-content');
        if (contentElement) {
            // Remove typing indicator if present
            const typingIndicator = contentElement.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }

            // Append new text and re-render markdown
            const rawText = (contentElement.dataset.rawText || '') + text;
            contentElement.dataset.rawText = rawText;
            if (typeof marked !== 'undefined') {
                contentElement.innerHTML = marked.parse(rawText);
            } else {
                contentElement.textContent = rawText;
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
});

window.electronAPI.onVisionStreamEnd(() => {
    console.log('Chat stream finished.');
    // Re-enable buttons and remove typing indicator
    chatSendBtn.disabled = false;
    chatScreenshotBtn.disabled = false;
    if (streamingAIMessage) {
        const typingIndicator = streamingAIMessage.querySelector('.typing-indicator');
        if(typingIndicator) {
            typingIndicator.remove();
        }
        streamingAIMessage = null;
    }
});



function addMessageToChat(sender, { text, image, isTyping = false }) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', sender);

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');

    if (image) {
        const imageElement = document.createElement('div');
        imageElement.classList.add('message-image');
        imageElement.innerHTML = `<img src="${image}" alt="screenshot">`;
        contentElement.appendChild(imageElement);
    }

    if (text) {
        const textElement = document.createElement('div');
        textElement.innerHTML = text;
        contentElement.appendChild(textElement);
    }

    if (isTyping) {
        const typingIndicatorElement = document.createElement('div');
        typingIndicatorElement.classList.add('typing-indicator');
        typingIndicatorElement.innerHTML = '<span></span><span></span><span></span>';
        contentElement.appendChild(typingIndicatorElement);
    }
    
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
}

async function handleChatScreenshot() {
    try {
        const image = await webview.capturePage();
        currentChatImage = image.toDataURL();
        addMessageToChat('user', { image: currentChatImage });
    } catch (error) {
        console.error('Failed to capture page for chat:', error);
    }
}

async function handleChatSend() {
    const promptText = chatPromptInput.value.trim();
    if (!currentChatImage && !promptText) return;

    addMessageToChat('user', { text: promptText });
    chatPromptInput.value = '';

    // Disable buttons and show typing indicator
    chatSendBtn.disabled = true;
    chatScreenshotBtn.disabled = true;
    streamingAIMessage = addMessageToChat('ai', { text: '', isTyping: true });

    window.electronAPI.streamVisionGemini({ image: currentChatImage, prompt: promptText });
    currentChatImage = null; // Reset image after sending
}

window.electronAPI.onVisionStreamChunk(({ text }) => {
    if (streamingAIMessage) {
        const contentElement = streamingAIMessage.querySelector('.message-content');
        if (contentElement) {
            // Remove typing indicator if present
            const typingIndicator = contentElement.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }

            // Append new text and re-render markdown
            const rawText = (contentElement.dataset.rawText || '') + text;
            contentElement.dataset.rawText = rawText;
            if (typeof marked !== 'undefined') {
                contentElement.innerHTML = marked.parse(rawText);
            } else {
                contentElement.textContent = rawText;
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }
});

window.electronAPI.onVisionStreamEnd(() => {
    console.log('Chat stream finished.');
    // Re-enable buttons and remove typing indicator
    chatSendBtn.disabled = false;
    chatScreenshotBtn.disabled = false;
    if (streamingAIMessage) {
        const typingIndicator = streamingAIMessage.querySelector('.typing-indicator');
        if(typingIndicator) {
            typingIndicator.remove();
        }
        streamingAIMessage = null;
    }
});

window.electronAPI.onVisionStreamError(({ message }) => {
    if (streamingAIMessage) {
        const contentElement = streamingAIMessage.querySelector('.message-content');
        if (contentElement) {
            const typingIndicator = contentElement.querySelector('.typing-indicator');
            if(typingIndicator) {
                typingIndicator.remove();
            }
            contentElement.innerHTML = `Lỗi: ${message}`;
        }
    }
    // Re-enable buttons
    chatSendBtn.disabled = false;
    chatScreenshotBtn.disabled = false;
    streamingAIMessage = null;
});


