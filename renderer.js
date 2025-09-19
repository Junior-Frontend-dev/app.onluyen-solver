// renderer.js - Xử lý logic UI trong Renderer Process

// Global variables
let currentScreenshot = null;
let currentDomSnapshot = null;
let currentActions = [];
let currentActionIndex = 0;
let isExecuting = false;
let screenshotDimensions = null;
let isAutoModeActive = false;
let autoModeInterval = null;

const defaultSettings = {
    screenshotQuality: 70,
    autoDevConsole: true,
    domLimit: 100,
    lazyLoad: true,
    reduceAnimation: false,
    autoDelay: 500,
    enableCache: true,
    debugMode: false,
    disableNotifications: false,
    outputLanguage: 'Tiếng Việt',
};

let appSettings = { ...defaultSettings };

function showNotification(message, type = 'info') {
    if (appSettings.disableNotifications) return; // Check if notifications are disabled

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = (
        `
        <span class="notification-icon">${icons[type]}</span>
        <span class="notification-message">${message}</span>
    `
    );
    
    document.body.appendChild(notification);
    
    // Auto remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Đợi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    const webview = document.getElementById('onluyen-webview');
    const captureAndSendBtn = document.getElementById('capture-and-send-btn');
    const apiKeyInput = document.getElementById('api-key');
    const aiModelSelect = document.getElementById('ai-model');
    const customPromptInput = document.getElementById('custom-prompt');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const apiKeyStatus = document.getElementById('api-key-status');
    const screenshotContainer = document.getElementById('screenshot-container');
    const geminiResult = document.getElementById('gemini-result');
    const loading = document.getElementById('loading');
    const modeRadios = document.querySelectorAll('input[name="ai-mode"]');
    const actionControls = document.getElementById('action-controls');
    const executeAllBtn = document.getElementById('execute-all-btn');
    const executeStepBtn = document.getElementById('execute-step-btn');
    const stopBtn = document.getElementById('stop-btn');
    const actionsList = document.getElementById('actions-list');
    const clickOverlay = document.getElementById('click-overlay');
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const reloadBtn = document.getElementById('reload-btn');
    const homeBtn = document.getElementById('home-btn');
    const urlBar = document.getElementById('url-bar');
    const goBtn = document.getElementById('go-btn');
    const popOutBtn = document.getElementById('pop-out-btn');

    // Setting Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    const qualitySlider = document.getElementById('screenshot-quality');
    const qualityValue = document.getElementById('quality-value');
    const autoDevConsoleSwitch = document.getElementById('auto-dev-console');
    const domLimitSlider = document.getElementById('dom-limit');
    const domValue = document.getElementById('dom-value');
    const lazyLoadSwitch = document.getElementById('lazy-load');
    const reduceAnimationSwitch = document.getElementById('reduce-animation');
    const autoDelaySlider = document.getElementById('auto-delay');
    const delayValue = document.getElementById('delay-value');
    const enableCacheSwitch = document.getElementById('enable-cache');
    const debugModeSwitch = document.getElementById('debug-mode');
    const disableNotificationsSwitch = document.getElementById('disable-notifications');

    // Stats Elements
    const ramUsageEl = document.getElementById('ram-usage');
    const fpsCounterEl = document.getElementById('fps-counter');
    const actionsPerMinEl = document.getElementById('actions-per-min');
    const cacheSizeEl = document.getElementById('cache-size');

    // --- SETTINGS INITIALIZATION ---
    // This must run before any function that might call showNotification()
    loadSettings();

    // ============= POP OUT FUNCTIONALITY =============
    popOutBtn.addEventListener('click', () => {
        window.electronAPI.openPopupWindow();
    });

    window.electronAPI.onSetControlPanelMode(() => {
        console.log('Setting control panel only mode');
        const webviewContainer = document.querySelector('.webview-container');
        const sidebar = document.querySelector('.sidebar');
        const settingsBtn = document.getElementById('settings-btn');
        const perfIndicator = document.getElementById('performance-indicator');
        
        if (webviewContainer) webviewContainer.classList.add('hidden');
        if (sidebar) {
            sidebar.style.width = '100%';
            sidebar.style.boxShadow = 'none';
        }
        if (popOutBtn) popOutBtn.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'none';
        if (perfIndicator) perfIndicator.style.display = 'none';
    });

    window.electronAPI.onSetWebviewOnlyMode(() => {
        console.log('Setting webview only mode');
        const sidebar = document.querySelector('.sidebar');
        const settingsBtn = document.getElementById('settings-btn');
        if (sidebar) sidebar.classList.add('hidden');
        // Optionally hide the settings button too
        if (settingsBtn) settingsBtn.style.display = 'none';
    });

    window.electronAPI.onShowSidebar(() => {
        console.log('Showing sidebar');
        const sidebar = document.querySelector('.sidebar');
        const settingsBtn = document.getElementById('settings-btn');
        if (sidebar) sidebar.classList.remove('hidden');
        if (settingsBtn) settingsBtn.style.display = 'flex';
    });

    // ============= API KEY MANAGEMENT =============
    let apiKeys = [];
    let currentApiKeyIndex = 0;
    let isApiKeyVisible = false; // Bắt đầu với key bị ẩn
    const toggleApiKeyVisibilityBtn = document.getElementById('toggle-api-key-visibility-btn');
    const iconEye = toggleApiKeyVisibilityBtn.querySelector('.icon-eye');
    const iconEyeOff = toggleApiKeyVisibilityBtn.querySelector('.icon-eye-off');

    function updateApiKeyStatus() {
        if (apiKeys.length > 0) {
            apiKeyStatus.textContent = `🔑 Key ${currentApiKeyIndex + 1} / ${apiKeys.length} đang hoạt động`;
            apiKeyStatus.style.color = '#27ae60';
        } else {
            apiKeyStatus.textContent = '⚠️ Chưa có API key nào';
            apiKeyStatus.style.color = '#e67e22';
        }
    }

    function updateApiKeyVisibility() {
        if (isApiKeyVisible) {
            apiKeyInput.value = apiKeys.join('\n');
            apiKeyInput.style.webkitTextSecurity = 'none';
            iconEye.classList.add('hidden');
            iconEyeOff.classList.remove('hidden');
        } else {
            apiKeyInput.value = apiKeys.map((key, index) => `•••••••••••••••••••••••• (Key ${index + 1})`).join('\n');
            apiKeyInput.style.webkitTextSecurity = 'disc';
            iconEye.classList.remove('hidden');
            iconEyeOff.classList.add('hidden');
        }
    }

    function loadApiKeys() {
        try {
            const saved = localStorage.getItem('gemini_api_keys_data');
            if (saved) {
                const data = JSON.parse(saved);
                apiKeys = data.keys || [];
                currentApiKeyIndex = data.index || 0;
            } else {
                 const legacyKeys = localStorage.getItem('gemini_api_key') || ''; // Legacy support
                 if (legacyKeys) apiKeys = legacyKeys.split('\n').map(k => k.trim()).filter(Boolean);
            }
        } catch (e) {
            console.error("Failed to load API keys:", e);
        }
        updateApiKeyVisibility();
        updateApiKeyStatus();
    }

    function saveApiKeys() {
        if (isApiKeyVisible) {
            const keysFromTextarea = apiKeyInput.value.split('\n').map(k => k.trim()).filter(k => k.length > 0);
            apiKeys = keysFromTextarea;
        }

        currentApiKeyIndex = 0;
        
        try {
            const data = { keys: apiKeys, index: currentApiKeyIndex };
            localStorage.setItem('gemini_api_keys_data', JSON.stringify(data));
            showNotification(`Đã lưu ${apiKeys.length} API key!`, 'success');
        } catch (e) {
            console.error("Failed to save API keys:", e);
            showNotification('Lỗi khi lưu API keys', 'error');
        }
        updateApiKeyStatus();
        if (!isApiKeyVisible) {
            updateApiKeyVisibility();
        }
    }

    // Initial load
    loadApiKeys();

    saveApiKeyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveApiKeys();
    });

    toggleApiKeyVisibilityBtn.addEventListener('click', () => {
        isApiKeyVisible = !isApiKeyVisible;
        updateApiKeyVisibility();
    });

    apiKeyInput.addEventListener('input', () => {
        if (isApiKeyVisible) {
            apiKeys = apiKeyInput.value.split('\n').map(k => k.trim()).filter(k => k.length > 0);
        }
    });

    // ============= AUTO MODE FUNCTIONS =============
    
    async function startAutoMode() {
        if (apiKeys.length === 0) {
            showNotification('Vui lòng nhập API Key để sử dụng chế độ tự động!', 'warning');
            return;
        }

        isAutoModeActive = true;
        showNotification('🤖 Chế độ TỰ ĐỘNG đã bật - AI sẽ tự động giải mọi câu hỏi!', 'success');
        
        // Thay đổi giao diện để hiển thị đang ở chế độ auto
        captureAndSendBtn.innerHTML = '🔄 Auto Mode Active... (Click để dừng)';
        captureAndSendBtn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        
        // Bắt đầu chu kỳ auto
        await performAutoModeCycle();
    }

    function stopAutoMode() {
        isAutoModeActive = false;
        isExecuting = false;
        if (autoModeInterval) {
            clearInterval(autoModeInterval);
            autoModeInterval = null;
        }
        
        showNotification('⏹️ Đã dừng chế độ tự động', 'info');
        
        // Khôi phục giao diện
        captureAndSendBtn.innerHTML = '📸 Chụp và Gửi AI';
        captureAndSendBtn.style.background = '';
    }

    async function performAutoModeCycle() {
        if (!isAutoModeActive) return;
        
        try {
            showLoading(true);
            
            // Bước 1: Chụp màn hình
            console.log('🔄 Auto Mode: Chụp màn hình...');
            const screenshotResult = await window.electronAPI.captureScreenshot();
            
            if (!screenshotResult.success) {
                throw new Error(screenshotResult.error || 'Không thể chụp màn hình');
            }
            
            currentScreenshot = screenshotResult.data;
            screenshotDimensions = screenshotResult.dimensions;
            currentDomSnapshot = screenshotResult.domSnapshot;
            displayScreenshot(screenshotResult.data);
            
            // Bước 2: Phân tích với AI
            console.log('🤖 Auto Mode: Gửi tới AI để phân tích...');
            const model = aiModelSelect.value;
            
            // Prompt tự động cho chế độ auto
            const autoPrompt = `Chế độ TỰ ĐỘNG GIẢI BÀI TẬP:

1. Tìm TẤT CẢ câu hỏi trắc nghiệm và tự luận trên màn hình
2. Với MỖI câu hỏi:
   - Câu trắc nghiệm: Click vào đáp án ĐÚNG
   - Câu điền từ/số: Nhập đáp án vào ô input
   - Câu tự luận: Nhập câu trả lời vào textarea
3. Tạo NHIỀU actions nếu cần (click + type cho mỗi câu)
4. Nếu có nút "Câu tiếp theo", "Next", "Tiếp tục":
   - Thêm action click vào nút đó SAU KHI đã làm xong
5. Nếu có nút "Nộp bài", "Submit" và đã làm xong:
   - Thêm action click nộp bài

QUAN TRỌNG: 
- Trả về TẤT CẢ actions cần thực hiện theo thứ tự
- Có thể trả về 10-20+ actions nếu nhiều câu
- Ưu tiên độ chính xác cao nhất
- Nếu không tìm thấy câu hỏi nào, trả về actions rỗng[]`;

            const payload = {
                apiKeys,
                startIndex: currentApiKeyIndex,
                model,
                customPrompt: autoPrompt,
                imageBase64: currentScreenshot,
                dimensions: screenshotDimensions,
                domSnapshot: currentDomSnapshot
            };

            const aiResult = await window.electronAPI.sendToGeminiWithActions(payload);
            
            if (!aiResult.success) {
                throw new Error(aiResult.error);
            }
            
            // Bước 3: Xử lý response và thực hiện actions
            const actions = parseActionsFromResponse(aiResult.data);
            
            if (actions && actions.length > 0) {
                console.log(`✅ Auto Mode: Tìm thấy ${actions.length} hành động`);
                currentActions = actions;
                displayActions(actions);
                
                // Thực hiện tất cả actions
                await executeAllActionsAuto();
                
                // Đợi một chút để trang load
                await sleep(2000);
                
                // Tiếp tục chu kỳ nếu vẫn ở chế độ auto
                if (isAutoModeActive) {
                    console.log('🔄 Auto Mode: Tiếp tục chu kỳ mới...');
                    await performAutoModeCycle();
                }
            } else {
                console.log('ℹ️ Auto Mode: Không tìm thấy hành động nào');
                
                // Thử scroll xuống để tìm câu hỏi mới
                await window.electronAPI.performScroll(300);
                await sleep(1000);
                
                // Thử lại nếu vẫn ở chế độ auto
                if (isAutoModeActive) {
                    await performAutoModeCycle();
                }
            }
            
        } catch (error) {
            console.error('❌ Auto Mode Error:', error);
            showNotification(`Lỗi Auto Mode: ${error.message}`, 'error');
            stopAutoMode();
        } finally {
            showLoading(false);
        }
    }

    async function executeAllActionsAuto() {
        for (let i = 0; i < currentActions.length; i++) {
            if (!isAutoModeActive) break;
            
            currentActionIndex = i;
            updateActionDisplay();
            await executeAction(currentActions[i]);
            await sleep(500); // Đợi giữa các action
        }
        currentActionIndex = 0;
    }

    function parseActionsFromResponse(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                
                if (data.analysis) {
                    displayGeminiResult(data.analysis);
                }
                
                return data.actions || [];
            }
        } catch (error) {
            console.error('Error parsing actions:', error);
        }
        return [];
    }

    // ============= END AUTO MODE =============

    // Xử lý thay đổi mode
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'auto') {
                // Kích hoạt chế độ auto
                actionControls.classList.remove('hidden');
                startAutoMode();
            } else if (e.target.value === 'action') {
                actionControls.classList.remove('hidden');
                stopAutoMode();
            } else {
                actionControls.classList.add('hidden');
                stopAutoMode();
            }
        });
    });

    // ============= WEBVIEWNAVIGATION =============
    
    // Đăng ký webview khi nó load xong
    webview.addEventListener('dom-ready', () => {
        console.log('Webview đã sẵn sàng');
        window.electronAPI.registerWebview(webview.getWebContentsId());
        captureAndSendBtn.disabled = false;
        
        // Update navigation buttons state
        updateNavigationButtons();
        
        // Update URL bar
        urlBar.value = webview.getURL();
        
        showNotification('Ứng dụng đã sẵn sàng! AI Assistant có thể điều khiển trang web.', 'success');
    });

    // Update URL bar khi navigate
    webview.addEventListener('did-navigate', (e) => {
        urlBar.value = e.url;
        updateNavigationButtons();
    });

    webview.addEventListener('did-navigate-in-page', (e) => {
        if (e.isMainFrame) {
            urlBar.value = e.url;
            updateNavigationButtons();
        }
    });

    // Update navigation buttons state
    function updateNavigationButtons() {
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    }

    // Navigation button handlers
    backBtn.addEventListener('click', () => {
        if (webview.canGoBack()) {
            webview.goBack();
        }
    });

    forwardBtn.addEventListener('click', () => {
        if (webview.canGoForward()) {
            webview.goForward();
        }
    });

    reloadBtn.addEventListener('click', () => {
        webview.reload();
    });

    homeBtn.addEventListener('click', () => {
        webview.loadURL('https://app.onluyen.vn/');
    });

    // URL bar navigation
    goBtn.addEventListener('click', () => {
        navigateToUrl();
    });

    urlBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            navigateToUrl();
        }
    });

    function navigateToUrl() {
        let url = urlBar.value.trim();
        if (!url) return;
        
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        try {
            const urlObj = new URL(url);
            webview.loadURL(urlObj.href);
        } catch (e) {
            showNotification('URL không hợp lệ', 'error');
        }
    }

    // ============= END WEBVIEW NAVIGATION =============

    // Xử lý lỗi khi load webview
    webview.addEventListener('did-fail-load', (errorCode, errorDescription) => {
        console.error('Lỗi khi tải trang:', errorDescription);
        showNotification('Không thể tải trang web. Vui lòng kiểm tra kết nối mạng.', 'error');
    });

    // Xử lý sự kiện chụp và gửi
    captureAndSendBtn.addEventListener('click', async () => {
        // Nếu đang ở auto mode thì dừng
        if (isAutoModeActive) {
            stopAutoMode();
            return;
        }

        if (apiKeys.length === 0) {
            showNotification('Vui lòng nhập và lưu ít nhất một API Key!', 'warning');
            apiKeyInput.focus();
            return;
        }

        try {
            showLoading(true);
            captureAndSendBtn.disabled = true;
            geminiResult.innerHTML = '<p class="placeholder">Đang chụp màn hình...</p>';

            // 1. Chụp màn hình
            const captureResult = await window.electronAPI.captureScreenshot();

            if (!captureResult.success) {
                showNotification(`Lỗi chụp màn hình: ${captureResult.error}`, 'error');
                return;
            }

            currentScreenshot = captureResult.data;
            screenshotDimensions = captureResult.dimensions;
            currentDomSnapshot = captureResult.domSnapshot;
            displayScreenshot(captureResult.data);
            showNotification('Chụp màn hình thành công! Đang gửi tới AI...', 'info');
            geminiResult.innerHTML = '<p class="placeholder">Đang gửi yêu cầu tới Gemini AI...</p>';

            // 2. Gửi tới Gemini
            const mode = document.querySelector('input[name="ai-mode"]:checked').value;
            const model = aiModelSelect.value;
            const customPrompt = customPromptInput.value.trim();

            const payload = {
                apiKeys,
                startIndex: currentApiKeyIndex,
                model,
                customPrompt,
                imageBase64: currentScreenshot,
                dimensions: screenshotDimensions,
                domSnapshot: currentDomSnapshot
            };

            let result;
            if (mode === 'action' || mode === 'auto') {
                result = await window.electronAPI.sendToGeminiWithActions(payload);
            } else {
                result = await window.electronAPI.sendToGemini(payload);
            }

            if (result.success) {
                if (mode === 'action' || mode === 'auto') {
                    processActionResponse(result.data);
                } else {
                    displayGeminiResult(result.data);
                }
                showNotification('Phân tích thành công!', 'success');
            } else {
                showNotification(`Lỗi API: ${result.error}`, 'error');
                geminiResult.innerHTML = (
                    `<div class="error">
                        <strong>❌ Lỗi:</strong> ${result.error}
                    </div>`
                );
            }
        } catch (error) {
            console.error('Lỗi trong quá trình chụp và gửi:', error);
            showNotification('Có lỗi nghiêm trọng xảy ra.', 'error');
        } finally {
            showLoading(false);
            captureAndSendBtn.disabled = false;
        }
    });

    // Listen for successful key updates from main process
    window.electronAPI.onApiKeyUpdated((newIndex) => {
        if (appSettings.debugMode) {
            console.log(`Switching to API key index: ${newIndex}`);
        }
        currentApiKeyIndex = newIndex;
        const data = { keys: apiKeys, index: currentApiKeyIndex };
        localStorage.setItem('gemini_api_keys_data', JSON.stringify(data));
        updateApiKeyStatus();
    });

    // Xử lý response có actions từ AI
    function processActionResponse(responseText) {
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                
                if (data.analysis) {
                    displayGeminiResult(data.analysis);
                }
                
                if (data.actions && data.actions.length > 0) {
                    currentActions = data.actions;
                    currentActionIndex = 0;
                    displayActions(data.actions);
                    
                    executeAllBtn.disabled = false;
                    executeStepBtn.disabled = false;
                    
                    // Nếu ở chế độ auto, tự động thực hiện
                    if (isAutoModeActive) {
                        executeAllActionsAuto();
                    }
                } else {
                    showNotification('AI không đề xuất hành động nào', 'info');
                }
            } else {
                displayGeminiResult(responseText);
            }
        } catch (error) {
            console.error('Lỗi parse response:', error);
            displayGeminiResult(responseText);
        }
    }

    // Hiển thị danh sách actions
    function displayActions(actions) {
        let html = '';
        actions.forEach((action, index) => {
            const statusClass = index < currentActionIndex ? 'completed' :
                index === currentActionIndex ? 'current' : 'pending';

            let detailsHtml = '';
            if (action.ai_id !== undefined) detailsHtml += `<span>ID: ${action.ai_id}</span>`;
            if (action.text) detailsHtml += `<span>Text: "${action.text}"</span>`;
            if (action.key) detailsHtml += `<span>Key: ${action.key}</span>`;
            if (action.deltaY !== undefined) detailsHtml += `<span>Scroll: ${action.deltaY}</span>`;

            html += (
                `
                <div class="action-item ${statusClass}" data-index="${index}">
                    <div class="action-header">
                        <span class="action-number">${index + 1}</span>
                        <span class="action-type ${action.type}">${action.type.toUpperCase()}</span>
                    </div>
                    <div class="action-details">
                        ${detailsHtml}
                    </div>
                    <div class="action-description">${action.description || ''}</div>
                </div>
            `
            );
        });

        actionsList.innerHTML = html;
    }

    // Thực hiện tất cả actions
    executeAllBtn.addEventListener('click', async () => {
        if (currentActions.length === 0) return;

        isExecuting = true;
        executeAllBtn.disabled = true;
        executeStepBtn.disabled = true;

        for (let i = currentActionIndex; i < currentActions.length; i++) {
            if (!isExecuting) break;

            currentActionIndex = i;
            updateActionDisplay();
            await executeAction(currentActions[i]);

            await sleep(800);
        }

        isExecuting = false;
        executeAllBtn.disabled = false;
        executeStepBtn.disabled = false;

        if (currentActionIndex >= currentActions.length) {
            showNotification('Đã thực hiện xong tất cả hành động!', 'success');
            currentActionIndex = 0;
        }
    });

    // Thực hiện từng action
    executeStepBtn.addEventListener('click', async () => {
        if (currentActionIndex >= currentActions.length) {
            currentActionIndex = 0;
            updateActionDisplay();
            return;
        }

        executeStepBtn.disabled = true;
        await executeAction(currentActions[currentActionIndex]);
        currentActionIndex++;
        updateActionDisplay();
        executeStepBtn.disabled = false;

        if (currentActionIndex >= currentActions.length) {
            showNotification('Đã thực hiện xong tất cả hành động!', 'success');
        }
    });

    // Dừng thực hiện
    stopBtn.addEventListener('click', () => {
        isExecuting = false;
        isAutoModeActive = false;
        stopAutoMode();
        showNotification('Đã dừng thực hiện', 'info');
    });

    // Thực hiện một action
    async function executeAction(action) {
        console.log('Thực hiện action:', action);

        try {
            let result;
            let x, y;

            // Lấy tọa độ từ ai_id nếu có
            if (action.ai_id !== undefined) {
                if (!currentDomSnapshot) {
                    showNotification('Lỗi: Thiếu DOM snapshot để thực hiện hành động.', 'error');
                    return;
                }
                const element = currentDomSnapshot.find(el => el.ai_id === action.ai_id);
                if (element) {
                    // Sử dụng centerX, centerY đã được tính sẵn
                    x = element.rect.centerX || (element.rect.x + element.rect.width / 2);
                    y = element.rect.centerY || (element.rect.y + element.rect.height / 2);
                    console.log(`Element ${action.ai_id} found at center (${x}, ${y})`);
                } else {
                    showNotification(`Lỗi: Không tìm thấy phần tử với ai_id: ${action.ai_id}`, 'error');
                    return;
                }
            }

            // Thực hiện action theo type
            switch (action.type) {
                case 'click':
                    if (x === undefined || y === undefined) {
                         showNotification(`Lỗi: Hành động click thiếu ai_id.`, 'error');
                         return;
                    }
                    showClickPosition(x, y);
                    result = await window.electronAPI.performClick(x, y);
                    await sleep(500);
                    hideClickPosition();
                    break;

                case 'type':
                     if (x === undefined || y === undefined) {
                         showNotification(`Lỗi: Hành động type thiếu ai_id.`, 'error');
                         return;
                    }
                    if (!action.text) {
                        showNotification(`Lỗi: Hành động type thiếu text.`, 'error');
                        return;
                    }
                    showClickPosition(x, y, 'type');
                    result = await window.electronAPI.performType(action.text, x, y);
                    await sleep(500);
                    hideClickPosition();
                    break;

                case 'clear':
                    if (x === undefined || y === undefined) {
                        showNotification(`Lỗi: Hành động clear thiếu ai_id.`, 'error');
                        return;
                    }
                    showClickPosition(x, y, 'clear');
                    result = await window.electronAPI.performClear(x, y);
                    await sleep(500);
                    hideClickPosition();
                    break;

                case 'scroll':
                    result = await window.electronAPI.performScroll(action.deltaY || 300);
                    break;

                case 'key':
                    result = await window.electronAPI.performKey(action.key || 'Enter');
                    break;

                case 'move':
                    // Skip move action for now
                    console.log('Move action skipped');
                    return;

                default:
                    console.warn('Unknown action type:', action.type);
                    return;
            }

            if (result && !result.success) {
                showNotification(`Lỗi khi thực hiện hành động: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Lỗi khi thực hiện action:', error);
            showNotification('Lỗi nghiêm trọng khi thực hiện hành động.', 'error');
        }
    }

    // Hiển thị vị trí click/move trên overlay
    function showClickPosition(x, y, type = 'click') {
        const webviewRect = webview.getBoundingClientRect();
        clickOverlay.style.left = `${x}px`;
        clickOverlay.style.top = `${y}px`;
        clickOverlay.className = `click-overlay ${type}`;
        clickOverlay.classList.remove('hidden');
    }

    function hideClickPosition() {
        clickOverlay.classList.add('hidden');
    }

    // Update hiển thị action đang thực hiện
    function updateActionDisplay() {
        const items = document.querySelectorAll('.action-item');
        items.forEach((item, index) => {
            item.classList.remove('completed', 'current', 'pending');
            if (index < currentActionIndex) {
                item.classList.add('completed');
            } else if (index === currentActionIndex) {
                item.classList.add('current');
            } else {
                item.classList.add('pending');
            }
        });
    }

    // Hiển thị ảnh screenshot
    function displayScreenshot(imageData) {
        screenshotContainer.innerHTML = (
            `
            <img src="${imageData}" alt="Screenshot" />
            <div class="screenshot-info">
                <small>✓ Đã chụp lúc: ${new Date().toLocaleTimeString('vi-VN')}</small>
                ${screenshotDimensions ? `<small>Kích thước: ${screenshotDimensions.width}x${screenshotDimensions.height}</small>` : ''}
            </div>
        `
        );
    }

    // Hiển thị kết quả từ Gemini
    function displayGeminiResult(text) {
        // Format text với markdown cơ bản
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        geminiResult.innerHTML = (
            `
            <div class="result-content">
                <div class="result-header">
                    <span class="badge badge-success">✓ Phân tích thành công</span>
                    <small>${new Date().toLocaleTimeString('vi-VN')}</small>
                </div>
                <div class="result-body">
                    ${formattedText}
                </div>
            </div>
        `
        );
    }

    // Utility functions
    function showLoading(show) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    function showNotification(message, type = 'info') {
        if (appSettings.disableNotifications) return; // Check if notifications are disabled

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        notification.innerHTML = (
            `
            <span class="notification-icon">${icons[type]}</span>
            <span class="notification-message">${message}</span>
        `
        );
        
        document.body.appendChild(notification);
        
        // Auto remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const perfIndicator = document.getElementById('performance-indicator');
    const closePerfIndicatorBtn = document.getElementById('close-perf-indicator');
    const condensedPerfIndicator = document.getElementById('perf-indicator-condensed');
    const condensedPerfDot = condensedPerfIndicator.querySelector('.perf-dot');

    // Make performance indicator draggable
    perfIndicator.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', null);
        e.target.style.opacity = '0.5';
    });

    perfIndicator.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
        perfIndicator.style.left = `${e.clientX}px`;
        perfIndicator.style.top = `${e.clientY}px`;
    });

    // --- Performance Indicator Visibility --- 
    function setPerfIndicatorVisibility(visible) {
        if (visible) {
            perfIndicator.classList.remove('hidden');
            condensedPerfIndicator.classList.add('hidden');
            localStorage.setItem('perfIndicatorVisible', 'true');
        } else {
            perfIndicator.classList.add('hidden');
            condensedPerfIndicator.classList.remove('hidden');
            localStorage.setItem('perfIndicatorVisible', 'false');
        }
    }

    closePerfIndicatorBtn.addEventListener('click', () => setPerfIndicatorVisibility(false));
    condensedPerfIndicator.addEventListener('click', () => setPerfIndicatorVisibility(true));

    // Load initial state
    const isPerfIndicatorVisible = localStorage.getItem('perfIndicatorVisible') !== 'false';
    setPerfIndicatorVisibility(isPerfIndicatorVisible);


    document.body.addEventListener("dragover", e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    // ============= SETTINGS MODAL =============

    function saveSettings() {
        try {
            localStorage.setItem('app_settings', JSON.stringify(appSettings));
            showNotification('Cài đặt đã được lưu!', 'success');
            // Inform the main process of settings that affect it
            window.electronAPI.updateSettings(appSettings);
        } catch (error) {
            console.error("Failed to save settings:", error);
            showNotification('Lỗi khi lưu cài đặt', 'error');
        }
    }

    function loadSettings() {
        try {
            const savedSettings = localStorage.getItem('app_settings');
            if (savedSettings) {
                appSettings = { ...defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
            appSettings = { ...defaultSettings };
        }
        updateSettingsUI();
        applySettings();
    }

    function updateSettingsUI() {
        qualitySlider.value = appSettings.screenshotQuality;
        qualityValue.textContent = `${appSettings.screenshotQuality}%`;
        autoDevConsoleSwitch.checked = appSettings.autoDevConsole;
        domLimitSlider.value = appSettings.domLimit;
        domValue.textContent = appSettings.domLimit;
        lazyLoadSwitch.checked = appSettings.lazyLoad;
        reduceAnimationSwitch.checked = appSettings.reduceAnimation;
        autoDelaySlider.value = appSettings.autoDelay;
        delayValue.textContent = `${appSettings.autoDelay}ms`;
        enableCacheSwitch.checked = appSettings.enableCache;
        debugModeSwitch.checked = appSettings.debugMode;
        disableNotificationsSwitch.checked = appSettings.disableNotifications;
        document.getElementById('output-language').value = appSettings.outputLanguage || 'Tiếng Việt';
    }

    function applySettings() {
        // Apply animation setting
        if (appSettings.reduceAnimation) {
            document.body.classList.add('reduce-animations');
        } else {
            document.body.classList.remove('reduce-animations');
        }
        // Other settings are applied on-the-fly where they are used
    }

    // Event Listeners for Settings
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    modalBackdrop.addEventListener('click', () => settingsModal.classList.add('hidden'));
    saveSettingsBtn.addEventListener('click', () => {
        saveSettings();
        settingsModal.classList.add('hidden');
    });

    resetSettingsBtn.addEventListener('click', () => {
        appSettings = { ...defaultSettings };
        updateSettingsUI();
        applySettings();
        saveSettings();
    });

    qualitySlider.addEventListener('input', (e) => {
        appSettings.screenshotQuality = parseInt(e.target.value, 10);
        qualityValue.textContent = `${appSettings.screenshotQuality}%`;
    });

    autoDevConsoleSwitch.addEventListener('change', (e) => {
        appSettings.autoDevConsole = e.target.checked;
    });

    domLimitSlider.addEventListener('input', (e) => {
        appSettings.domLimit = parseInt(e.target.value, 10);
        domValue.textContent = appSettings.domLimit;
    });

    lazyLoadSwitch.addEventListener('change', (e) => {
        appSettings.lazyLoad = e.target.checked;
        if(appSettings.lazyLoad) showNotification('Lazy Load (Conceptual): Components will load on demand.', 'info');
    });

    reduceAnimationSwitch.addEventListener('change', (e) => {
        appSettings.reduceAnimation = e.target.checked;
        applySettings();
    });

    autoDelaySlider.addEventListener('input', (e) => {
        appSettings.autoDelay = parseInt(e.target.value, 10);
        delayValue.textContent = `${appSettings.autoDelay}ms`;
    });

    enableCacheSwitch.addEventListener('change', (e) => {
        appSettings.enableCache = e.target.checked;
        if (!appSettings.enableCache) {
            // Clear cache if disabled
            // Will implement cache logic later
        }
    });

    debugModeSwitch.addEventListener('change', (e) => {
        appSettings.debugMode = e.target.checked;
        showNotification(`Chế độ Debug ${appSettings.debugMode ? 'đã bật' : 'đã tắt'}.`, 'info');
    });

    disableNotificationsSwitch.addEventListener('change', (e) => {
        appSettings.disableNotifications = e.target.checked;
    });

    document.getElementById('output-language').addEventListener('input', (e) => {
        appSettings.outputLanguage = e.target.value;
    });

    // Performance Stats Update
    setInterval(() => {
        // RAM Usage
        const memory = window.performance.memory;
        if (memory) {
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            ramUsageEl.textContent = `${usedMB} MB`;
        }

        // Will implement other stats later
    }, 2000);
    
    // Load settings on startup
    loadSettings();

    // ============= END SETTINGS MODAL =============

    // ============= CACHE & STATS =============
    const apiResponseCache = new Map();
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    let executedActionsCount = 0;
    let monitoringStartTime = Date.now();

    function updateFps() {
        const now = performance.now();
        frameCount++;
        if (now - lastFrameTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFrameTime = now;
            fpsCounterEl.textContent = fps;
        }
        requestAnimationFrame(updateFps);
    }
    requestAnimationFrame(updateFps);

    // Performance Stats Update Interval
    setInterval(() => {
        // RAM Usage
        const memory = window.performance.memory;
        if (memory) {
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            ramUsageEl.textContent = `${usedMB} MB`;
        }

        // Actions per minute
        const elapsedMinutes = (Date.now() - monitoringStartTime) / 60000;
        if (elapsedMinutes > 0) {
            const actionsPerMin = (executedActionsCount / elapsedMinutes).toFixed(1);
            actionsPerMinEl.textContent = actionsPerMin;
        }

        // Cache size
        const cacheSize = new TextEncoder().encode(JSON.stringify([...apiResponseCache])).length;
        const cacheSizeKB = (cacheSize / 1024).toFixed(1);
        cacheSizeEl.textContent = `${cacheSizeKB} KB`;

    }, 2000);


    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + S để chụp và gửi
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (!captureAndSendBtn.disabled) {
                captureAndSendBtn.click();
            }
        }
        
        // Ctrl/Cmd + Enter để gửi tới Gemini (giữ lại phím tắt này)
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!captureAndSendBtn.disabled) {
                captureAndSendBtn.click();
            }
        }
        
        // Ctrl/Cmd + A để bật/tắt Auto Mode
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            const autoRadio = document.querySelector('input[name="ai-mode"][value="auto"]');
            if (isAutoModeActive) {
                stopAutoMode();
                document.querySelector('input[name="ai-mode"][value="analyze"]').checked = true;
            } else {
                autoRadio.checked = true;
                autoRadio.dispatchEvent(new Event('change'));
            }
        }
        
        // Alt + Left Arrow để quay lại
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            if (!backBtn.disabled) {
                backBtn.click();
            }
        }
        
        // Alt + Right Arrow để tiến tới
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            if (!forwardBtn.disabled) {
                forwardBtn.click();
            }
        }
        
        // Space để thực hiện action tiếp theo (chỉ khi không focus vào INPUT hoặc TEXTAREA)
        if (e.key === ' ' && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (!executeStepBtn.disabled && currentActions.length > 0) {
                executeStepBtn.click();
            }
        }
    });

    // Knowledge Base & RAG functionality
    const kbQuestionInput = document.getElementById('kb-question');
    const kbAnswerInput = document.getElementById('kb-answer');
    const saveKnowledgeBtn = document.getElementById('save-knowledge-btn');
    const ragQueryInput = document.getElementById('rag-query-input');
    const ragQueryBtn = document.getElementById('rag-query-btn');
    const ragResponseDiv = document.getElementById('rag-response');

    // Save knowledge to database
    saveKnowledgeBtn.addEventListener('click', async () => {
        const question = kbQuestionInput.value.trim();
        const answer = kbAnswerInput.value.trim();

        if (question && answer) {
            try {
                const newKnowledge = await window.electronAPI.saveKnowledge(question, answer);
                showNotification('Đã lưu kiến thức thành công!', 'success');
                console.log('Saved knowledge:', newKnowledge);
                kbQuestionInput.value = '';
                kbAnswerInput.value = '';
            } catch (error) {
                console.error('Error saving knowledge:', error);
                showNotification('Lỗi khi lưu kiến thức', 'error');
            }
        } else {
            showNotification('Vui lòng nhập cả câu hỏi và câu trả lời', 'warning');
        }
    });

    // Query RAG system
    ragQueryBtn.addEventListener('click', async () => {
        const query = ragQueryInput.value.trim();
        if (query) {
            ragResponseDiv.innerHTML = '<p class="placeholder">Đang truy vấn RAG...</p>';
            try {
                const response = await window.electronAPI.ragQuery(query);
                ragResponseDiv.innerText = response;
            } catch (error) {
                console.error('Error performing RAG query:', error);
                ragResponseDiv.innerText = `Error: ${error.message}`;
            }
        } else {
            showNotification('Vui lòng nhập câu hỏi cho RAG', 'warning');
        }
    });
});