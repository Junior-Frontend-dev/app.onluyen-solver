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
let antiTrackingEnabled = false;
let fakeEventEnabled = false;
let webviewReady = false;
let pendingInjections = [];

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
    if (appSettings.disableNotifications) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type]}</span>
        <span class="notification-message">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm inject script an toàn
async function safeInjectScript(script, description = 'script') {
    if (!webviewReady) {
        console.log(`Webview not ready, queuing ${description}`);
        pendingInjections.push({ script, description });
        return false;
    }
    
    try {
        const webview = document.getElementById('onluyen-webview');
        if (!webview) {
            console.error('Webview element not found');
            return false;
        }
        
        // Wrap script trong try-catch
        const safeScript = `
            (function() {
                try {
                    ${script}
                } catch(error) {
                    console.error('Script injection error:', error);
                    return { success: false, error: error.message };
                }
                return { success: true };
            })();
        `;
        
        const result = await webview.executeJavaScript(safeScript);
        if (result && result.success) {
            console.log(`✅ Successfully injected ${description}`);
            return true;
        } else {
            console.error(`Failed to inject ${description}:`, result?.error);
            return false;
        }
    } catch (error) {
        console.error(`Error injecting ${description}:`, error);
        return false;
    }
}

// Xử lý pending injections
async function processPendingInjections() {
    if (pendingInjections.length === 0) return;
    
    console.log(`Processing ${pendingInjections.length} pending injections...`);
    const pending = [...pendingInjections];
    pendingInjections = [];
    
    for (const { script, description } of pending) {
        await safeInjectScript(script, description);
        await sleep(100); // Small delay between injections
    }
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

    // Anti-tracking elements
    const antiTrackingToggle = document.getElementById('anti-tracking-toggle');
    const activityLevelSelect = document.getElementById('activity-level');

    // Fake Event elements
    const fakeEventToggle = document.getElementById('fake-event-toggle');
    const fakeEventUsername = document.getElementById('fake-event-username');
    const fakeEventInterval = document.getElementById('fake-event-interval');
    const fakeEventAutoMode = document.getElementById('fake-event-auto-mode');
    const toggleAdvancedBtn = document.getElementById('toggle-fake-event-advanced');
    const fakeEventAdvanced = document.getElementById('fake-event-advanced');
    const fakeEventTestId = document.getElementById('fake-event-test-id');
    const fakeEventExamId = document.getElementById('fake-event-exam-id');
    const fakeEventUserId = document.getElementById('fake-event-user-id');

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

    // Performance Indicator
    const perfIndicator = document.getElementById('performance-indicator');
    const closePerfIndicatorBtn = document.getElementById('close-perf-indicator');
    const condensedPerfIndicator = document.getElementById('perf-indicator-condensed');

    // Knowledge Base
    const kbQuestionInput = document.getElementById('kb-question');
    const kbAnswerInput = document.getElementById('kb-answer');
    const saveKnowledgeBtn = document.getElementById('save-knowledge-btn');
    const ragQueryInput = document.getElementById('rag-query-input');
    const ragQueryBtn = document.getElementById('rag-query-btn');
    const ragResponseDiv = document.getElementById('rag-response');

    // Settings initialization
    loadSettings();

    // ============= ANTI-TRACKING CONTROL =============
    
    function loadAntiTrackingState() {
        const savedState = localStorage.getItem('antiTrackingEnabled');
        const savedLevel = localStorage.getItem('antiTrackingLevel');
        
        if (savedState !== null) {
            antiTrackingEnabled = savedState === 'true';
            antiTrackingToggle.checked = antiTrackingEnabled;
        }
        
        if (savedLevel) {
            activityLevelSelect.value = savedLevel;
        }
    }

    async function enableAntiTracking() {
        const activityLevel = activityLevelSelect.value;
        
        try {
            const scriptResult = await window.electronAPI.readAntiTrackingScript();
            
            if (!scriptResult.success) {
                throw new Error(scriptResult.error);
            }
            
            // Inject script an toàn
            const injected = await safeInjectScript(scriptResult.script, 'anti-tracking');
            
            if (injected) {
                // Set activity level
                const configScript = `
                    if (typeof window.__antiTracking !== 'undefined' && window.__antiTracking) {
                        window.__antiTracking.setActivityLevel('${activityLevel}');
                        true;
                    } else {
                        console.warn('Anti-tracking not initialized');
                        false;
                    }
                `;
                
                await safeInjectScript(configScript, 'anti-tracking config');
                
                showNotification('🛡️ Chế độ Không Theo Dõi đã được kích hoạt', 'success');
                antiTrackingEnabled = true;
                localStorage.setItem('antiTrackingEnabled', 'true');
                window.electronAPI.updateAntiTracking({ enabled: true, activityLevel });
            } else {
                throw new Error('Failed to inject anti-tracking script');
            }
        } catch (err) {
            console.error('Failed to enable anti-tracking:', err);
            showNotification('❌ Lỗi khi kích hoạt chế độ Không Theo Dõi', 'error');
            antiTrackingToggle.checked = false;
        }
    }

    async function disableAntiTracking() {
        const disableScript = `
            if (typeof window.__antiTracking !== 'undefined' && window.__antiTracking) {
                window.__antiTracking.stop();
                window.__antiTrackingActive = false;
                true;
            } else {
                false;
            }
        `;
        
        const disabled = await safeInjectScript(disableScript, 'disable anti-tracking');
        
        if (disabled) {
            console.log('✅ Anti-tracking disabled');
            showNotification('🛡️ Chế độ Không Theo Dõi đã tắt', 'info');
        }
        
        antiTrackingEnabled = false;
        localStorage.setItem('antiTrackingEnabled', 'false');
        window.electronAPI.updateAntiTracking({ enabled: false });
    }

    antiTrackingToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
            await enableAntiTracking();
        } else {
            await disableAntiTracking();
        }
    });

    activityLevelSelect.addEventListener('change', async (e) => {
        localStorage.setItem('antiTrackingLevel', e.target.value);
        
        if (antiTrackingEnabled && webviewReady) {
            const script = `
                if (typeof window.__antiTracking !== 'undefined' && window.__antiTracking) {
                    window.__antiTracking.setActivityLevel('${e.target.value}');
                    true;
                } else {
                    false;
                }
            `;
            
            const updated = await safeInjectScript(script, 'update activity level');
            if (updated) {
                showNotification(`📊 Mức độ hoạt động: ${e.target.options[e.target.selectedIndex].text}`, 'info');
                window.electronAPI.updateAntiTracking({ 
                    enabled: true, 
                    activityLevel: e.target.value 
                });
            }
        }
    });

    loadAntiTrackingState();

    // ============= FAKE EVENT CONTROL =============
    
    function loadFakeEventState() {
        const savedState = localStorage.getItem('fakeEventEnabled');
        const savedUsername = localStorage.getItem('fakeEventUsername');
        const savedInterval = localStorage.getItem('fakeEventInterval');
        const savedAutoMode = localStorage.getItem('fakeEventAutoMode');
        const savedTestId = localStorage.getItem('fakeEventTestId');
        const savedExamId = localStorage.getItem('fakeEventExamId');
        const savedUserId = localStorage.getItem('fakeEventUserId');
        
        if (savedState !== null) {
            fakeEventEnabled = savedState === 'true';
            fakeEventToggle.checked = fakeEventEnabled;
        }
        
        if (savedUsername) {
            fakeEventUsername.value = savedUsername;
            validateUsername(savedUsername);
        }
        
        if (savedInterval) {
            fakeEventInterval.value = savedInterval;
        }
        
        if (savedAutoMode !== null) {
            fakeEventAutoMode.checked = savedAutoMode === 'true';
        }
        
        if (savedTestId) fakeEventTestId.value = savedTestId;
        if (savedExamId) fakeEventExamId.value = savedExamId;
        if (savedUserId) fakeEventUserId.value = savedUserId;
    }

    function validateUsername(username) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const eduVnRegex = /@.*\.edu\.vn$/;
        
        if (!username) {
            fakeEventUsername.classList.remove('valid', 'invalid');
            return false;
        }
        
        if (emailRegex.test(username)) {
            fakeEventUsername.classList.add('valid');
            fakeEventUsername.classList.remove('invalid');
            
            if (!eduVnRegex.test(username)) {
                showNotification('⚠️ Khuyến nghị sử dụng email .edu.vn', 'warning');
            }
            return true;
        } else {
            fakeEventUsername.classList.add('invalid');
            fakeEventUsername.classList.remove('valid');
            return false;
        }
    }

    async function enableFakeEvents() {
        const username = fakeEventUsername.value.trim();
        
        if (!username) {
            showNotification('❌ Vui lòng nhập email người dùng', 'error');
            fakeEventToggle.checked = false;
            fakeEventUsername.focus();
            return;
        }
        
        if (!validateUsername(username)) {
            showNotification('❌ Email không hợp lệ', 'error');
            fakeEventToggle.checked = false;
            return;
        }
        
        const interval = parseInt(fakeEventInterval.value);
        const autoMode = fakeEventAutoMode.checked;
        const testId = fakeEventTestId.value.trim();
        const examId = fakeEventExamId.value.trim();
        const userId = fakeEventUserId.value.trim();
        
        try {
            const scriptResult = await window.electronAPI.readFakeEventScript();
            
            if (!scriptResult.success) {
                throw new Error(scriptResult.error);
            }
            
            // Inject script an toàn
            const injected = await safeInjectScript(scriptResult.script, 'fake-event');
            
            if (injected) {
                // Configure fake events
                const config = {
                    enabled: true,
                    userName: username,
                    interval: interval,
                    autoMode: autoMode,
                    testId: testId,
                    examId: examId,
                    userId: userId,
                    keyExam: examId ? `${examId}_false` : ''
                };
                
                const configScript = `
                    if (typeof window.__fakeEvent !== 'undefined' && window.__fakeEvent) {
                        window.__fakeEvent.updateConfig(${JSON.stringify(config)});
                        true;
                    } else {
                        console.warn('Fake event not initialized');
                        false;
                    }
                `;
                
                await safeInjectScript(configScript, 'fake-event config');
                
                showNotification(`🎭 Fake Event đã bật cho: ${username}`, 'success');
                const intervalText = fakeEventInterval.options[fakeEventInterval.selectedIndex].text;
                showNotification(`⏰ Gửi event ${intervalText.toLowerCase()}`, 'info');
                
                fakeEventEnabled = true;
                localStorage.setItem('fakeEventEnabled', 'true');
                localStorage.setItem('fakeEventUsername', username);
                localStorage.setItem('fakeEventInterval', interval);
                localStorage.setItem('fakeEventAutoMode', autoMode);
                localStorage.setItem('fakeEventTestId', testId);
                localStorage.setItem('fakeEventExamId', examId);
                localStorage.setItem('fakeEventUserId', userId);
            } else {
                throw new Error('Failed to inject fake-event script');
            }
        } catch (err) {
            console.error('Failed to enable fake events:', err);
            showNotification('❌ Lỗi khi kích hoạt Fake Event', 'error');
            fakeEventToggle.checked = false;
        }
    }

    async function disableFakeEvents() {
        const disableScript = `
            if (typeof window.__fakeEvent !== 'undefined' && window.__fakeEvent) {
                window.__fakeEvent.disable();
                true;
            } else {
                false;
            }
        `;
        
        const disabled = await safeInjectScript(disableScript, 'disable fake-event');
        
        if (disabled) {
            console.log('✅ Fake events disabled');
            showNotification('🎭 Fake Event đã tắt', 'info');
        }
        
        fakeEventEnabled = false;
        localStorage.setItem('fakeEventEnabled', 'false');
    }

    fakeEventToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
            await enableFakeEvents();
        } else {
            await disableFakeEvents();
        }
    });

    fakeEventUsername.addEventListener('input', (e) => {
        validateUsername(e.target.value);
    });

    fakeEventUsername.addEventListener('blur', (e) => {
        const username = e.target.value.trim();
        
        if (username && !username.includes('@')) {
            const autoUsername = username + '@haiphong.edu.vn';
            e.target.value = autoUsername;
            validateUsername(autoUsername);
            showNotification(`📧 Tự động thêm domain: ${autoUsername}`, 'info');
        }
    });

    fakeEventInterval.addEventListener('change', async (e) => {
        const interval = parseInt(e.target.value);
        localStorage.setItem('fakeEventInterval', interval);
        
        if (fakeEventEnabled && webviewReady) {
            const script = `
                if (typeof window.__fakeEvent !== 'undefined' && window.__fakeEvent) {
                    window.__fakeEvent.setInterval(${interval});
                    true;
                } else {
                    false;
                }
            `;
            
            const updated = await safeInjectScript(script, 'update fake event interval');
            if (updated) {
                const intervalText = e.target.options[e.target.selectedIndex].text;
                showNotification(`⏰ Đã đổi interval: ${intervalText.toLowerCase()}`, 'info');
            }
        }
    });

    fakeEventAutoMode.addEventListener('change', async (e) => {
        const autoMode = e.target.checked;
        localStorage.setItem('fakeEventAutoMode', autoMode);
        
        if (fakeEventEnabled && webviewReady) {
            const script = `
                if (typeof window.__fakeEvent !== 'undefined' && window.__fakeEvent) {
                    window.__fakeEvent.setAutoMode(${autoMode});
                    true;
                } else {
                    false;
                }
            `;
            
            const updated = await safeInjectScript(script, 'update fake event auto mode');
            if (updated) {
                showNotification(`🤖 Auto mode: ${autoMode ? 'BẬT' : 'TẮT'}`, 'info');
            }
        }
    });

    toggleAdvancedBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isHidden = fakeEventAdvanced.style.display === 'none';
        fakeEventAdvanced.style.display = isHidden ? 'block' : 'none';
        toggleAdvancedBtn.textContent = isHidden ? '⚙️ Ẩn cài đặt nâng cao' : '⚙️ Cài đặt nâng cao';
    });

    [fakeEventTestId, fakeEventExamId, fakeEventUserId].forEach(input => {
        input.addEventListener('change', async () => {
            const testId = fakeEventTestId.value.trim();
            const examId = fakeEventExamId.value.trim();
            const userId = fakeEventUserId.value.trim();
            
            localStorage.setItem('fakeEventTestId', testId);
            localStorage.setItem('fakeEventExamId', examId);
            localStorage.setItem('fakeEventUserId', userId);
            
            if (fakeEventEnabled && webviewReady) {
                const script = `
                    if (typeof window.__fakeEvent !== 'undefined' && window.__fakeEvent) {
                        window.__fakeEvent.setIds('${testId}', '${examId}', '${userId}');
                        true;
                    } else {
                        false;
                    }
                `;
                
                const updated = await safeInjectScript(script, 'update fake event IDs');
                if (updated) {
                    showNotification('📝 Đã cập nhật IDs', 'info');
                }
            }
        });
    });

    loadFakeEventState();

    // ============= POP OUT FUNCTIONALITY =============
    popOutBtn.addEventListener('click', () => {
        window.electronAPI.openPopupWindow();
    });

    window.electronAPI.onSetControlPanelMode(() => {
        console.log('Setting control panel only mode');
        const webviewContainer = document.querySelector('.webview-container');
        const sidebar = document.querySelector('.sidebar');
        
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
        if (sidebar) sidebar.classList.add('hidden');
        if (settingsBtn) settingsBtn.style.display = 'none';
    });

    window.electronAPI.onShowSidebar(() => {
        console.log('Showing sidebar');
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('hidden');
        if (settingsBtn) settingsBtn.style.display = 'flex';
    });

    // ============= API KEY MANAGEMENT =============
    let apiKeys = [];
    let currentApiKeyIndex = 0;
    let isApiKeyVisible = false;
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
                const legacyKeys = localStorage.getItem('gemini_api_key') || '';
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
        
        captureAndSendBtn.innerHTML = '🔄 Auto Mode Active... (Click để dừng)';
        captureAndSendBtn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        
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
        
        captureAndSendBtn.innerHTML = '📸 Chụp và Gửi AI';
        captureAndSendBtn.style.background = '';
    }

    async function performAutoModeCycle() {
        if (!isAutoModeActive) return;
        
        try {
            showLoading(true);
            
            console.log('🔄 Auto Mode: Chụp màn hình...');
            const screenshotResult = await window.electronAPI.captureScreenshot();
            
            if (!screenshotResult.success) {
                throw new Error(screenshotResult.error || 'Không thể chụp màn hình');
            }
            
            currentScreenshot = screenshotResult.data;
            screenshotDimensions = screenshotResult.dimensions;
            currentDomSnapshot = screenshotResult.domSnapshot;
            displayScreenshot(screenshotResult.data);
            
            console.log('🤖 Auto Mode: Gửi tới AI để phân tích...');
            const model = aiModelSelect.value;
            
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
            
            const actions = parseActionsFromResponse(aiResult.data);
            
            if (actions && actions.length > 0) {
                console.log(`✅ Auto Mode: Tìm thấy ${actions.length} hành động`);
                currentActions = actions;
                displayActions(actions);
                
                await executeAllActionsAuto();
                
                await sleep(2000);
                
                if (isAutoModeActive) {
                    console.log('🔄 Auto Mode: Tiếp tục chu kỳ mới...');
                    await performAutoModeCycle();
                }
            } else {
                console.log('ℹ️ Auto Mode: Không tìm thấy hành động nào');
                
                await window.electronAPI.performScroll(300);
                await sleep(1000);
                
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
            await sleep(appSettings.autoDelay || 500);
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

    // ============= MODE SELECTION =============
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'auto') {
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

    // ============= WEBVIEW NAVIGATION =============
    
    webview.addEventListener('dom-ready', async () => {
        console.log('Webview DOM ready');
        
        // Đợi thêm một chút để đảm bảo webview thực sự ready
        await sleep(500);
        
        // Kiểm tra webview có thực sự ready không
        try {
            const testScript = `
                (function() {
                    return { 
                        ready: true, 
                        url: window.location.href,
                        title: document.title
                    };
                })();
            `;
            
            const testResult = await webview.executeJavaScript(testScript);
            
            if (testResult && testResult.ready) {
                console.log('✅ Webview verified ready:', testResult);
                webviewReady = true;
                
                // Register webview
                window.electronAPI.registerWebview(webview.getWebContentsId());
                captureAndSendBtn.disabled = false;
                
                // Update navigation
                updateNavigationButtons();
                urlBar.value = testResult.url || webview.getURL();
                
                // Process any pending injections
                await processPendingInjections();
                
                // Auto-inject features if enabled
                if (antiTrackingEnabled) {
                    console.log('Auto-enabling anti-tracking...');
                    await enableAntiTracking();
                }
                
                if (fakeEventEnabled && fakeEventUsername.value) {
                    console.log('Auto-enabling fake events...');
                    await enableFakeEvents();
                }
                
                showNotification('Ứng dụng đã sẵn sàng! AI Assistant có thể điều khiển trang web.', 'success');
            } else {
                console.warn('Webview test failed, retrying...');
                setTimeout(() => {
                    webview.dispatchEvent(new Event('dom-ready'));
                }, 1000);
            }
        } catch (error) {
            console.error('Error verifying webview ready:', error);
            webviewReady = false;
            
            // Retry after delay
            setTimeout(() => {
                webview.dispatchEvent(new Event('dom-ready'));
            }, 1000);
        }
    });

    webview.addEventListener('did-start-loading', () => {
        console.log('Webview started loading');
        webviewReady = false;
    });

    webview.addEventListener('did-stop-loading', () => {
        console.log('Webview stopped loading');
    });

    webview.addEventListener('crashed', () => {
        console.error('Webview crashed!');
        webviewReady = false;
        showNotification('❌ Webview crashed! Please reload.', 'error');
    });

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

    function updateNavigationButtons() {
        backBtn.disabled = !webview.canGoBack();
        forwardBtn.disabled = !webview.canGoForward();
    }

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

    webview.addEventListener('did-fail-load', (errorCode, errorDescription) => {
        console.error('Lỗi khi tải trang:', errorDescription);
        showNotification('Không thể tải trang web. Vui lòng kiểm tra kết nối mạng.', 'error');
    });

    // ============= CAPTURE AND SEND =============
    captureAndSendBtn.addEventListener('click', async () => {
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
                geminiResult.innerHTML = `
                    <div class="error">
                        <strong>❌ Lỗi:</strong> ${result.error}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Lỗi trong quá trình chụp và gửi:', error);
            showNotification('Có lỗi nghiêm trọng xảy ra.', 'error');
        } finally {
            showLoading(false);
            captureAndSendBtn.disabled = false;
        }
    });

    window.electronAPI.onApiKeyUpdated((newIndex) => {
        if (appSettings.debugMode) {
            console.log(`Switching to API key index: ${newIndex}`);
        }
        currentApiKeyIndex = newIndex;
        const data = { keys: apiKeys, index: currentApiKeyIndex };
        localStorage.setItem('gemini_api_keys_data', JSON.stringify(data));
        updateApiKeyStatus();
    });

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

    // ============= ACTION EXECUTION =============
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

            html += `
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
            `;
        });

        actionsList.innerHTML = html;
    }

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

            await sleep(appSettings.autoDelay || 800);
        }

        isExecuting = false;
        executeAllBtn.disabled = false;
        executeStepBtn.disabled = false;

        if (currentActionIndex >= currentActions.length) {
            showNotification('Đã thực hiện xong tất cả hành động!', 'success');
            currentActionIndex = 0;
        }
    });

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

    stopBtn.addEventListener('click', () => {
        isExecuting = false;
        isAutoModeActive = false;
        stopAutoMode();
        showNotification('Đã dừng thực hiện', 'info');
    });

    async function executeAction(action) {
        console.log('Thực hiện action:', action);

        try {
            let result;
            let x, y;

            if (action.ai_id !== undefined) {
                if (!currentDomSnapshot) {
                    showNotification('Lỗi: Thiếu DOM snapshot để thực hiện hành động.', 'error');
                    return;
                }
                const element = currentDomSnapshot.find(el => el.ai_id === action.ai_id);
                if (element) {
                    x = element.rect.centerX || (element.rect.x + element.rect.width / 2);
                    y = element.rect.centerY || (element.rect.y + element.rect.height / 2);
                    console.log(`Element ${action.ai_id} found at center (${x}, ${y})`);
                } else {
                    showNotification(`Lỗi: Không tìm thấy phần tử với ai_id: ${action.ai_id}`, 'error');
                    return;
                }
            }

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

    function showClickPosition(x, y, type = 'click') {
        clickOverlay.style.left = `${x}px`;
        clickOverlay.style.top = `${y}px`;
        clickOverlay.className = `click-overlay ${type}`;
        clickOverlay.classList.remove('hidden');
    }

    function hideClickPosition() {
        clickOverlay.classList.add('hidden');
    }

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

    // ============= DISPLAY FUNCTIONS =============
    function displayScreenshot(imageData) {
        screenshotContainer.innerHTML = `
            <img src="${imageData}" alt="Screenshot" />
            <div class="screenshot-info">
                <small>✓ Đã chụp lúc: ${new Date().toLocaleTimeString('vi-VN')}</small>
                ${screenshotDimensions ? `<small>Kích thước: ${screenshotDimensions.width}x${screenshotDimensions.height}</small>` : ''}
            </div>
        `;
    }

    function displayGeminiResult(text) {
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        geminiResult.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    <span class="badge badge-success">✓ Phân tích thành công</span>
                    <small>${new Date().toLocaleTimeString('vi-VN')}</small>
                </div>
                <div class="result-body">
                    ${formattedText}
                </div>
            </div>
        `;
    }

    function showLoading(show) {
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    // ============= PERFORMANCE INDICATOR =============
    perfIndicator.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', null);
        e.target.style.opacity = '0.5';
    });

    perfIndicator.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
        perfIndicator.style.left = `${e.clientX}px`;
        perfIndicator.style.top = `${e.clientY}px`;
    });

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
        if (appSettings.reduceAnimation) {
            document.body.classList.add('reduce-animations');
        } else {
            document.body.classList.remove('reduce-animations');
        }
    }

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

    // ============= PERFORMANCE STATS =============
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

    setInterval(() => {
        const memory = window.performance.memory;
        if (memory) {
            const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            ramUsageEl.textContent = `${usedMB} MB`;
        }

        const elapsedMinutes = (Date.now() - monitoringStartTime) / 60000;
        if (elapsedMinutes > 0) {
            const actionsPerMin = (executedActionsCount / elapsedMinutes).toFixed(1);
            actionsPerMinEl.textContent = actionsPerMin;
        }

        const cacheSize = new TextEncoder().encode(JSON.stringify([...apiResponseCache])).length;
        const cacheSizeKB = (cacheSize / 1024).toFixed(1);
        cacheSizeEl.textContent = `${cacheSizeKB} KB`;
    }, 2000);

    // ============= KNOWLEDGE BASE =============
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

    // ============= KEYBOARD SHORTCUTS =============
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (!captureAndSendBtn.disabled) {
                captureAndSendBtn.click();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!captureAndSendBtn.disabled) {
                captureAndSendBtn.click();
            }
        }
        
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
        
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            if (!backBtn.disabled) {
                backBtn.click();
            }
        }
        
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            if (!forwardBtn.disabled) {
                forwardBtn.click();
            }
        }
        
        if (e.key === ' ' && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (!executeStepBtn.disabled && currentActions.length > 0) {
                executeStepBtn.click();
            }
        }
    });
});