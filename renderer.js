// renderer.js - Xử lý logic UI trong Renderer Process (FULL VERSION)

// ============= GLOBAL VARIABLES =============
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
let webviewElement = null; // Store webview element globally
let apiKeys = [];
let currentApiKeyIndex = 0;
let isApiKeyVisible = false;
let executedActionsCount = 0;
let monitoringStartTime = Date.now();

let scrapingInterval = null;

// ============= DEFAULT SETTINGS =============
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

// ============= HELPER FUNCTIONS =============
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

// ============= SCRIPT INJECTION FUNCTIONS =============
async function safeInjectScript(script, description = 'script') {
    // Get webview element if not already stored
    if (!webviewElement) {
        webviewElement = document.getElementById('onluyen-webview');
    }
    
    if (!webviewElement) {
        console.error('Webview element not found');
        return false;
    }
    
    // Check if webview is ready
    if (!webviewReady) {
        console.log(`Webview not ready, queuing ${description}`);
        pendingInjections.push({ script, description });
        return false;
    }

    try {
        // Small delay to ensure webview is really ready
        await sleep(100);
        
        // Wrap script in try-catch and IIFE
        const safeScript = `
            (function() {
                try {
                    ${script}
                    return { success: true };
                } catch(error) {
                    console.error('Script injection error in ${description}:', error);
                    return { success: false, error: error.message };
                }
            })();
        `;
        
        // Execute script with timeout
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve({ success: false, error: 'Timeout after 5s' }), 5000);
        });
        
        const executePromise = webviewElement.executeJavaScript(safeScript);
        const result = await Promise.race([executePromise, timeoutPromise]);
        
        if (result && result.success) {
            console.log(`✅ Successfully injected ${description}`);
            return true;
        } else {
            console.error(`Failed to inject ${description}:`, result?.error || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error(`Error injecting ${description}:`, error);
        return false;
    }
}

async function processPendingInjections() {
    if (pendingInjections.length === 0) return;
    
    console.log(`Processing ${pendingInjections.length} pending injections...`);
    const pending = [...pendingInjections];
    pendingInjections = [];
    
    for (const { script, description } of pending) {
        await safeInjectScript(script, description);
        await sleep(200); // Delay between injections
    }
}

async function waitForWebviewReady(maxRetries = 10) {
    for (let i = 0; i < maxRetries; i++) {
        if (webviewReady) return true;
        console.log(`Waiting for webview... attempt ${i + 1}/${maxRetries}`);
        await sleep(1000);
    }
    return false;
}

// ============= ANTI-TRACKING FUNCTIONS =============
function loadAntiTrackingState() {
    const savedState = localStorage.getItem('antiTrackingEnabled');
    const savedLevel = localStorage.getItem('antiTrackingLevel');
    
    if (savedState !== null) {
        antiTrackingEnabled = savedState === 'true';
        const toggle = document.getElementById('anti-tracking-toggle');
        if (toggle) toggle.checked = antiTrackingEnabled;
    }
    
    if (savedLevel) {
        const levelSelect = document.getElementById('activity-level');
        if (levelSelect) levelSelect.value = savedLevel;
    }
}

async function enableAntiTracking() {
    const activityLevelSelect = document.getElementById('activity-level');
    const activityLevel = activityLevelSelect ? activityLevelSelect.value : 'normal';
    
    try {
        const scriptResult = await window.electronAPI.readAntiTrackingScript();
        
        if (!scriptResult.success) {
            throw new Error(scriptResult.error);
        }
        
        // Wait for webview if needed
        if (!webviewReady) {
            const ready = await waitForWebviewReady(5);
            if (!ready) {
                throw new Error('Webview not ready after waiting');
            }
        }
        
        // Inject script safely
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
        const toggle = document.getElementById('anti-tracking-toggle');
        if (toggle) toggle.checked = false;
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

// ============= FAKE EVENT FUNCTIONS =============
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
        const toggle = document.getElementById('fake-event-toggle');
        if (toggle) toggle.checked = fakeEventEnabled;
    }
    
    const usernameInput = document.getElementById('fake-event-username');
    if (savedUsername && usernameInput) {
        usernameInput.value = savedUsername;
        validateUsername(savedUsername);
    }
    
    const intervalSelect = document.getElementById('fake-event-interval');
    if (savedInterval && intervalSelect) {
        intervalSelect.value = savedInterval;
    }
    
    const autoModeCheck = document.getElementById('fake-event-auto-mode');
    if (savedAutoMode !== null && autoModeCheck) {
        autoModeCheck.checked = savedAutoMode === 'true';
    }
    
    const testIdInput = document.getElementById('fake-event-test-id');
    const examIdInput = document.getElementById('fake-event-exam-id');
    const userIdInput = document.getElementById('fake-event-user-id');
    
    if (savedTestId && testIdInput) testIdInput.value = savedTestId;
    if (savedExamId && examIdInput) examIdInput.value = savedExamId;
    if (savedUserId && userIdInput) userIdInput.value = savedUserId;
}

function validateUsername(username) {
    const usernameInput = document.getElementById('fake-event-username');
    if (!usernameInput) return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const eduVnRegex = /@.*\.edu\.vn$/;
    
    if (!username) {
        usernameInput.classList.remove('valid', 'invalid');
        return false;
    }
    
    if (emailRegex.test(username)) {
        usernameInput.classList.add('valid');
        usernameInput.classList.remove('invalid');
        
        if (!eduVnRegex.test(username)) {
            showNotification('⚠️ Khuyến nghị sử dụng email .edu.vn', 'warning');
        }
        return true;
    } else {
        usernameInput.classList.add('invalid');
        usernameInput.classList.remove('valid');
        return false;
    }
}

async function enableFakeEvents() {
    const usernameInput = document.getElementById('fake-event-username');
    if (!usernameInput) return;
    
    const username = usernameInput.value.trim();
    
    if (!username) {
        showNotification('❌ Vui lòng nhập email người dùng', 'error');
        const toggle = document.getElementById('fake-event-toggle');
        if (toggle) toggle.checked = false;
        usernameInput.focus();
        return;
    }
    
    if (!validateUsername(username)) {
        showNotification('❌ Email không hợp lệ', 'error');
        const toggle = document.getElementById('fake-event-toggle');
        if (toggle) toggle.checked = false;
        return;
    }
    
    // Check if webview is ready, wait if needed
    if (!webviewReady) {
        showNotification('⏳ Đang chờ webview sẵn sàng...', 'warning');
        
        const ready = await waitForWebviewReady(5);
        if (!ready) {
            showNotification('❌ Webview không sẵn sàng sau 5 giây', 'error');
            const toggle = document.getElementById('fake-event-toggle');
            if (toggle) toggle.checked = false;
            return;
        }
    }
    
    const intervalSelect = document.getElementById('fake-event-interval');
    const autoModeCheck = document.getElementById('fake-event-auto-mode');
    const testIdInput = document.getElementById('fake-event-test-id');
    const examIdInput = document.getElementById('fake-event-exam-id');
    const userIdInput = document.getElementById('fake-event-user-id');
    
    const interval = parseInt(intervalSelect ? intervalSelect.value : 30000);
    const autoMode = autoModeCheck ? autoModeCheck.checked : false;
    const testId = testIdInput ? testIdInput.value.trim() : '';
    const examId = examIdInput ? examIdInput.value.trim() : '';
    const userId = userIdInput ? userIdInput.value.trim() : '';
    
    try {
        const scriptResult = await window.electronAPI.readFakeEventScript();
        
        if (!scriptResult.success) {
            throw new Error(scriptResult.error || 'Failed to read script');
        }
        
        // Inject script with retry
        let injected = false;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!injected && retryCount < maxRetries) {
            injected = await safeInjectScript(scriptResult.script, 'fake-event');
            if (!injected) {
                retryCount++;
                console.log(`Retry ${retryCount}/${maxRetries} for fake-event injection...`);
                await sleep(1000 * retryCount); // Exponential backoff
            }
        }
        
        if (!injected) {
            throw new Error('Failed to inject fake-event script after retries');
        }
        
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
                console.warn('Fake event not initialized yet');
                false;
            }
        `;
        
        const configured = await safeInjectScript(configScript, 'fake-event config');
        
        if (configured) {
            showNotification(`🎭 Fake Event đã bật cho: ${username}`, 'success');
            if (intervalSelect) {
                const intervalText = intervalSelect.options[intervalSelect.selectedIndex].text;
                showNotification(`⏰ Gửi event ${intervalText.toLowerCase()}`, 'info');
            }
            
            fakeEventEnabled = true;
            localStorage.setItem('fakeEventEnabled', 'true');
            localStorage.setItem('fakeEventUsername', username);
            localStorage.setItem('fakeEventInterval', interval);
            localStorage.setItem('fakeEventAutoMode', autoMode);
            localStorage.setItem('fakeEventTestId', testId);
            localStorage.setItem('fakeEventExamId', examId);
            localStorage.setItem('fakeEventUserId', userId);
        } else {
            throw new Error('Failed to configure fake events');
        }
    } catch (err) {
        console.error('Failed to enable fake events:', err);
        showNotification(`❌ Lỗi: ${err.message}`, 'error');
        const toggle = document.getElementById('fake-event-toggle');
        if (toggle) toggle.checked = false;
        fakeEventEnabled = false;
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

// ============= API KEY MANAGEMENT =============
function updateApiKeyStatus() {
    const apiKeyStatus = document.getElementById('api-key-status');
    if (!apiKeyStatus) return;
    
    if (apiKeys.length > 0) {
        apiKeyStatus.textContent = `🔑 Key ${currentApiKeyIndex + 1} / ${apiKeys.length} đang hoạt động`;
        apiKeyStatus.style.color = '#27ae60';
    } else {
        apiKeyStatus.textContent = '⚠️ Chưa có API key nào';
        apiKeyStatus.style.color = '#e67e22';
    }
}

function updateApiKeyVisibility() {
    const apiKeyInput = document.getElementById('api-key');
    if (!apiKeyInput) return;
    
    const iconEye = document.querySelector('.icon-eye');
    const iconEyeOff = document.querySelector('.icon-eye-off');
    
    if (isApiKeyVisible) {
        apiKeyInput.value = apiKeys.join('\n');
        apiKeyInput.style.webkitTextSecurity = 'none';
        if (iconEye) iconEye.classList.add('hidden');
        if (iconEyeOff) iconEyeOff.classList.remove('hidden');
    } else {
        apiKeyInput.value = apiKeys.map((key, index) => `•••••••••••••••••••••••• (Key ${index + 1})`).join('\n');
        apiKeyInput.style.webkitTextSecurity = 'disc';
        if (iconEye) iconEye.classList.remove('hidden');
        if (iconEyeOff) iconEyeOff.classList.add('hidden');
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
    const apiKeyInput = document.getElementById('api-key');
    if (isApiKeyVisible && apiKeyInput) {
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

// ============= AUTO MODE FUNCTIONS =============
async function startAutoMode() {
    if (apiKeys.length === 0) {
        showNotification('Vui lòng nhập API Key để sử dụng chế độ tự động!', 'warning');
        return;
    }
    
    isAutoModeActive = true;
    showNotification('🤖 Chế độ TỰ ĐỘNG đã bật - AI sẽ tự động giải mọi câu hỏi!', 'success');
    
    const captureAndSendBtn = document.getElementById('capture-and-send-btn');
    if (captureAndSendBtn) {
        captureAndSendBtn.innerHTML = '🔄 Auto Mode Active... (Click để dừng)';
        captureAndSendBtn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    }
    
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
    
    const captureAndSendBtn = document.getElementById('capture-and-send-btn');
    if (captureAndSendBtn) {
        captureAndSendBtn.innerHTML = '📸 Chụp và Gửi AI';
        captureAndSendBtn.style.background = '';
    }
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
        const aiModelSelect = document.getElementById('ai-model');
        const model = aiModelSelect ? aiModelSelect.value : 'gemini-1.5-flash';
        
        const autoPrompt = `Chế độ TỰ ĐỘNG GIẢI BÀI TẬP:
Tìm TẤT CẢ câu hỏi trắc nghiệm và tự luận trên màn hình
Với MỖI câu hỏi:
- Câu trắc nghiệm: Click vào đáp án ĐÚNG
- Câu điền từ/số: Nhập đáp án vào ô input
- Câu tự luận: Nhập câu trả lời vào textarea
Tạo NHIỀU actions nếu cần (click + type cho mỗi câu)
Nếu có nút "Câu tiếp theo", "Next", "Tiếp tục":
- Thêm action click vào nút đó SAU KHI đã làm xong
Nếu có nút "Nộp bài", "Submit" và đã làm xong:
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

// ============= ACTION EXECUTION =============
async function executeAction(action) {
    console.log('Thực hiện action:', action);
    
    // This function now throws an error on failure, to be caught by the caller.
    let result;
    let element, sourceEl, targetEl;

    // Helper to find element and coordinates from the local snapshot
    const findElement = (ai_id) => {
        if (ai_id === undefined) {
            throw new Error("Hành động thiếu 'ai_id'.");
        }
        if (!currentDomSnapshot) {
            throw new Error('Thiếu DOM snapshot để tìm phần tử.');
        }
        const el = currentDomSnapshot.find(e => e.ai_id === ai_id);
        if (!el) {
            // This is the error the user reported. We throw an error to be caught by the execution loop.
            throw new Error(`Không tìm thấy phần tử với ai_id: ${ai_id}. DOM có thể đã thay đổi.`);
        }
        return el;
    };

    switch (action.type) {
        // === Existing Actions (now more robust) ===
        case 'click':
            element = findElement(action.ai_id);
            showClickPosition(element.rect.centerX, element.rect.centerY);
            result = await window.electronAPI.performClick(element.rect.centerX, element.rect.centerY);
            await sleep(500);
            hideClickPosition();
            break;
            
        case 'type':
            element = findElement(action.ai_id);
            if (action.text === undefined) throw new Error('Hành động type thiếu "text".');
            showClickPosition(element.rect.centerX, element.rect.centerY, 'type');
            result = await window.electronAPI.performType(action.text, element.rect.centerX, element.rect.centerY);
            await sleep(500);
            hideClickPosition();
            break;
            
        case 'clear':
            element = findElement(action.ai_id);
            showClickPosition(element.rect.centerX, element.rect.centerY, 'clear');
            result = await window.electronAPI.performClear(element.rect.centerX, element.rect.centerY);
            await sleep(500);
            hideClickPosition();
            break;
            
        case 'scroll':
            result = await window.electronAPI.performScroll(action.deltaY || 300);
            break;
            
        case 'key':
            if (!action.key) throw new Error('Hành động key thiếu "key".');
            result = await window.electronAPI.performKey(action.key);
            break;

        // === New Actions ===
        case 'wait':
            if (!action.ms) throw new Error('Hành động wait thiếu "ms".');
            await sleep(action.ms);
            result = { success: true };
            break;

        case 'doubleClick':
            element = findElement(action.ai_id);
            showClickPosition(element.rect.centerX, element.rect.centerY);
            result = await window.electronAPI.performDoubleClick(element.rect.centerX, element.rect.centerY);
            await sleep(500);
            hideClickPosition();
            break;

        case 'hover':
            element = findElement(action.ai_id);
            showClickPosition(element.rect.centerX, element.rect.centerY, 'hover');
            result = await window.electronAPI.performHover(element.rect.centerX, element.rect.centerY);
            await sleep(500);
            hideClickPosition();
            break;

        case 'selectOption':
            element = findElement(action.ai_id); // The <select> element
            if (action.value === undefined) throw new Error('Hành động selectOption thiếu "value".');
            result = await window.electronAPI.performSelectOption(action.ai_id, action.value);
            break;

        case 'dragAndDrop':
            sourceEl = findElement(action.source_ai_id);
            targetEl = findElement(action.target_ai_id);
            const sourceCoords = { x: sourceEl.rect.centerX, y: sourceEl.rect.centerY };
            const targetCoords = { x: targetEl.rect.centerX, y: targetEl.rect.centerY };
            result = await window.electronAPI.performDragAndDrop(sourceCoords, targetCoords);
            break;

        case 'runScript':
            if (!action.script) throw new Error('Hành động runScript thiếu "script".');
            result = await window.electronAPI.performRunScript(action.script);
            break;

        case 'reload':
            result = await window.electronAPI.performReload();
            break;

        case 'goBack':
            result = await window.electronAPI.performGoBack();
            break;

        case 'scrollToElement':
            element = findElement(action.ai_id);
            result = await window.electronAPI.performScrollToElement(action.ai_id);
            break;

        case 'focus':
            element = findElement(action.ai_id);
            result = await window.electronAPI.performFocus(action.ai_id);
            break;
            
        case 'move': // This was skipped before, now it's an alias for hover
            element = findElement(action.ai_id);
            showClickPosition(element.rect.centerX, element.rect.centerY, 'hover');
            result = await window.electronAPI.performHover(element.rect.centerX, element.rect.centerY);
            await sleep(500);
            hideClickPosition();
            break;
            
        default:
            throw new Error(`Unknown action type: '${action.type}'`);
    }
    
    executedActionsCount++;
    
    if (result && !result.success) {
        // The error from main.js will be propagated here
        throw new Error(result.error || `Hành động '${action.type}' thất bại.`);
    }
}

function displayActions(actions) {
    const actionsList = document.getElementById('actions-list');
    if (!actionsList) return;
    
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

function showClickPosition(x, y, type = 'click') {
    const clickOverlay = document.getElementById('click-overlay');
    if (!clickOverlay) return;
    clickOverlay.style.left = `${x}px`;
    clickOverlay.style.top = `${y}px`;
    clickOverlay.className = `click-overlay ${type}`;
    clickOverlay.classList.remove('hidden');
}

function hideClickPosition() {
    const clickOverlay = document.getElementById('click-overlay');
    if (clickOverlay) clickOverlay.classList.add('hidden');
}

// ============= DISPLAY FUNCTIONS =============
function displayScreenshot(imageData) {
    const screenshotContainer = document.getElementById('screenshot-container');
    if (!screenshotContainer) return;
    screenshotContainer.innerHTML = `
        <img src="${imageData}" alt="Screenshot" />
        <div class="screenshot-info">
            <small>✓ Đã chụp lúc: ${new Date().toLocaleTimeString('vi-VN')}</small>
            ${screenshotDimensions ? `<small>Kích thước: ${screenshotDimensions.width}x${screenshotDimensions.height}</small>` : ''}
        </div>
    `;
}

function displayGeminiResult(text) {
    const geminiResult = document.getElementById('gemini-result');
    if (!geminiResult) return;
    
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
    const loading = document.getElementById('loading');
    if (!loading) return;
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// ============= SETTINGS FUNCTIONS =============
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
    const outputLanguageEl = document.getElementById('output-language');
    
    if (qualitySlider) {
        qualitySlider.value = appSettings.screenshotQuality;
        if (qualityValue) qualityValue.textContent = `${appSettings.screenshotQuality}%`;
    }
    if (autoDevConsoleSwitch) autoDevConsoleSwitch.checked = appSettings.autoDevConsole;
    if (domLimitSlider) {
        domLimitSlider.value = appSettings.domLimit;
        if (domValue) domValue.textContent = appSettings.domLimit;
    }
    if (lazyLoadSwitch) lazyLoadSwitch.checked = appSettings.lazyLoad;
    if (reduceAnimationSwitch) reduceAnimationSwitch.checked = appSettings.reduceAnimation;
    if (autoDelaySlider) {
        autoDelaySlider.value = appSettings.autoDelay;
        if (delayValue) delayValue.textContent = `${appSettings.autoDelay}ms`;
    }
    if (enableCacheSwitch) enableCacheSwitch.checked = appSettings.enableCache;
    if (debugModeSwitch) debugModeSwitch.checked = appSettings.debugMode;
    if (disableNotificationsSwitch) disableNotificationsSwitch.checked = appSettings.disableNotifications;
    if (outputLanguageEl) outputLanguageEl.value = appSettings.outputLanguage || 'Tiếng Việt';
}

function applySettings() {
    if (appSettings.reduceAnimation) {
        document.body.classList.add('reduce-animations');
    } else {
        document.body.classList.remove('reduce-animations');
    }
}

// ============= NAVIGATION FUNCTIONS =============
function updateNavigationButtons() {
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    
    if (!webviewElement) return;
    if (backBtn) backBtn.disabled = !webviewElement.canGoBack();
    if (forwardBtn) forwardBtn.disabled = !webviewElement.canGoForward();
}

function navigateToUrl() {
    const urlBar = document.getElementById('url-bar');
    if (!urlBar || !webviewElement) return;
    
    let url = urlBar.value.trim();
    if (!url) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        const urlObj = new URL(url);
        webviewElement.loadURL(urlObj.href);
    } catch (e) {
        showNotification('URL không hợp lệ', 'error');
    }
}

// ============= CAPTURE AND SEND =============
async function captureAndSend() {
    if (isAutoModeActive) {
        stopAutoMode();
        return;
    }
    
    if (apiKeys.length === 0) {
        showNotification('Vui lòng nhập và lưu ít nhất một API Key!', 'warning');
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) apiKeyInput.focus();
        return;
    }
    
    const captureAndSendBtn = document.getElementById('capture-and-send-btn');
    const geminiResult = document.getElementById('gemini-result');
    const aiModelSelect = document.getElementById('ai-model');
    const customPromptInput = document.getElementById('custom-prompt');
    
    try {
        showLoading(true);
        if (captureAndSendBtn) captureAndSendBtn.disabled = true;
        if (geminiResult) geminiResult.innerHTML = '<p class="placeholder">Đang chụp màn hình...</p>';
        
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
        if (geminiResult) geminiResult.innerHTML = '<p class="placeholder">Đang gửi yêu cầu tới Gemini AI...</p>';
        
        const mode = document.querySelector('input[name="ai-mode"]:checked')?.value || 'analyze';
        const model = aiModelSelect ? aiModelSelect.value : 'gemini-1.5-flash';
        const customPrompt = customPromptInput ? customPromptInput.value.trim() : '';
        
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
            if (geminiResult) {
                geminiResult.innerHTML = `
                    <div class="error">
                        <strong>❌ Lỗi:</strong> ${result.error}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Lỗi trong quá trình chụp và gửi:', error);
        showNotification('Có lỗi nghiêm trọng xảy ra.', 'error');
    } finally {
        showLoading(false);
        if (captureAndSendBtn) captureAndSendBtn.disabled = false;
    }
}

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
                
                const executeAllBtn = document.getElementById('execute-all-btn');
                const executeStepBtn = document.getElementById('execute-step-btn');
                if (executeAllBtn) executeAllBtn.disabled = false;
                if (executeStepBtn) executeStepBtn.disabled = false;
                
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

// ============= PERFORMANCE MONITORING =============
const apiResponseCache = new Map();
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

function updateFps() {
    const now = performance.now();
    frameCount++;
    if (now - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
        const fpsCounterEl = document.getElementById('fps-counter');
        if (fpsCounterEl) fpsCounterEl.textContent = fps;
    }
    requestAnimationFrame(updateFps);
}

function updatePerformanceStats() {
    const ramUsageEl = document.getElementById('ram-usage');
    const actionsPerMinEl = document.getElementById('actions-per-min');
    const cacheSizeEl = document.getElementById('cache-size');
    
    const memory = window.performance.memory;
    if (memory && ramUsageEl) {
        const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
        ramUsageEl.textContent = `${usedMB} MB`;
    }
    
    const elapsedMinutes = (Date.now() - monitoringStartTime) / 60000;
    if (elapsedMinutes > 0 && actionsPerMinEl) {
        const actionsPerMin = (executedActionsCount / elapsedMinutes).toFixed(1);
        actionsPerMinEl.textContent = actionsPerMin;
    }
    
    const cacheSize = new TextEncoder().encode(JSON.stringify([...apiResponseCache])).length;
    const cacheSizeKB = (cacheSize / 1024).toFixed(1);
    if (cacheSizeEl) cacheSizeEl.textContent = `${cacheSizeKB} KB`;
}

// ============= LOCALSTORAGE EXTRACTION =============
async function extractLocalStorageData() {
    if (!webviewReady || !webviewElement) return;
    if (!webviewElement.getURL().includes('app.onluyen.vn')) return;

    const extractionScript = `
(function() {
  const result = [];

  for (const [k, v] of Object.entries(localStorage)) {
    try {
      const obj = JSON.parse(v);

      if (obj && (obj.testId || obj.examId)) {
        result.push({
          key: k,
          testId: obj.testId || null,
          examId: obj.examId || null,
          userId: obj.userId || null,
          userName: obj.userName || null,
          classId: obj.classId || null,
          schoolId: obj.schoolId || null,
          logId: obj.logId || null,
          keyExam: obj.key_exam || null,

          type: obj.type || null,
          status: obj.status || null,
          startTime: obj.startTime || obj.timeStart || null,
          endTime: obj.endTime || obj.timeEnd || null,
          duration: obj.duration || obj.timeDoing || null,
          score: obj.score || obj.point || null,

          answers: Array.isArray(obj.data) ? obj.data.map(d => ({
            stepId: d.stepId,
            questionId: d.questionId || null,
            optionId: d.dataOptionId || null,
            optionText: d.dataOptionText || null,
            isCorrect: d.isCorrect ?? null
          })) : null,

          raw: obj
        });
      }
    } catch(e){}
  }
  return result;
})();
    `;

    try {
        const data = await webviewElement.executeJavaScript(extractionScript);
        console.log('Extracted data from webview localStorage:', data);

        const userNameEl = document.getElementById('user-name');
        const userIdEl = document.getElementById('user-id');
        const testIdEl = document.getElementById('test-id');
        const examIdEl = document.getElementById('exam-id');
        const keyExamEl = document.getElementById('key-exam');

        if (data && data.length > 0) {
            const info = data[0];
            if (userNameEl) userNameEl.textContent = info.userName || 'N/A';
            if (userIdEl) userIdEl.textContent = info.userId || 'N/A';
            if (testIdEl) testIdEl.textContent = info.testId || 'N/A';
            if (examIdEl) examIdEl.textContent = info.examId || 'N/A';
            if (keyExamEl) keyExamEl.textContent = info.keyExam || 'N/A';
        } else {
            if (userNameEl) userNameEl.textContent = '...';
            if (userIdEl) userIdEl.textContent = '...';
            if (testIdEl) testIdEl.textContent = '...';
            if (examIdEl) examIdEl.textContent = '...';
            if (keyExamEl) keyExamEl.textContent = '...';
        }

    } catch (e) {
        console.error('Error during webview localStorage extraction:', e);
    }
}

    // ============= MAIN INITIALIZATION =============
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing app...');
    
    // Get webview element first
    webviewElement = document.getElementById('onluyen-webview');
    
    if (!webviewElement) {
        console.error('Critical error: Webview element not found!');
        showNotification('❌ Lỗi nghiêm trọng: Không tìm thấy webview', 'error');
        return;
    }

    
    // Initialize settings
    loadSettings();
    
    // Initialize API keys
    loadApiKeys();
    
    // Initialize states
    loadAntiTrackingState();
    loadFakeEventState();
    
    // Setup performance monitoring
    requestAnimationFrame(updateFps);
    setInterval(updatePerformanceStats, 2000);
    
    // ============= EVENT LISTENERS =============
    
    // Capture and Send button
    const captureAndSendBtn = document.getElementById('capture-and-send-btn');
    if (captureAndSendBtn) {
        captureAndSendBtn.addEventListener('click', captureAndSend);
    }
    
    // API Key Management
    const saveApiKeyBtn = document.getElementById('save-api-key');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveApiKeys();
        });
    }
    
    const toggleApiKeyVisibilityBtn = document.getElementById('toggle-api-key-visibility-btn');
    if (toggleApiKeyVisibilityBtn) {
        toggleApiKeyVisibilityBtn.addEventListener('click', () => {
            isApiKeyVisible = !isApiKeyVisible;
            updateApiKeyVisibility();
        });
    }
    
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', () => {
            if (isApiKeyVisible) {
                apiKeys = apiKeyInput.value.split('\n').map(k => k.trim()).filter(k => k.length > 0);
            }
        });
    }
    
    // Mode Selection
    const modeRadios = document.querySelectorAll('input[name="ai-mode"]');
    if (modeRadios) {
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const actionControls = document.getElementById('action-controls');
                if (e.target.value === 'auto') {
                    if (actionControls) actionControls.classList.remove('hidden');
                    startAutoMode();
                } else if (e.target.value === 'action') {
                    if (actionControls) actionControls.classList.remove('hidden');
                    stopAutoMode();
                } else {
                    if (actionControls) actionControls.classList.add('hidden');
                    stopAutoMode();
                }
            });
        });
    }
    
    // Action Execution
    const executeAllBtn = document.getElementById('execute-all-btn');
    if (executeAllBtn) {
        executeAllBtn.addEventListener('click', async () => {
            if (currentActions.length === 0) return;
            
            isExecuting = true;
            executeAllBtn.disabled = true;
            const executeStepBtn = document.getElementById('execute-step-btn');
            if (executeStepBtn) executeStepBtn.disabled = true;
            
            for (let i = currentActionIndex; i < currentActions.length; i++) {
                if (!isExecuting) break;
                
                currentActionIndex = i;
                updateActionDisplay();
                await executeAction(currentActions[i]);
                
                await sleep(appSettings.autoDelay || 800);
            }
            
            isExecuting = false;
            executeAllBtn.disabled = false;
            if (executeStepBtn) executeStepBtn.disabled = false;
            
            if (currentActionIndex >= currentActions.length) {
                showNotification('Đã thực hiện xong tất cả hành động!', 'success');
                currentActionIndex = 0;
            }
        });
    }
    
    const executeStepBtn = document.getElementById('execute-step-btn');
    if (executeStepBtn) {
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
    }
    
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            isExecuting = false;
            isAutoModeActive = false;
            stopAutoMode();
            showNotification('Đã dừng thực hiện', 'info');
        });
    }
    
    // Anti-tracking
    const antiTrackingToggle = document.getElementById('anti-tracking-toggle');
    if (antiTrackingToggle) {
        antiTrackingToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                await enableAntiTracking();
            } else {
                await disableAntiTracking();
            }
        });
    }
    
    const activityLevelSelect = document.getElementById('activity-level');
    if (activityLevelSelect) {
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
    }
    
    // Fake Events
    const fakeEventToggle = document.getElementById('fake-event-toggle');
    if (fakeEventToggle) {
        fakeEventToggle.addEventListener('change', async (e) => {
            if (e.target.checked) {
                await enableFakeEvents();
            } else {
                await disableFakeEvents();
            }
        });
    }
    
    const fakeEventUsername = document.getElementById('fake-event-username');
    if (fakeEventUsername) {
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
    }
    
    const fakeEventInterval = document.getElementById('fake-event-interval');
    if (fakeEventInterval) {
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
    }
    
    const fakeEventAutoMode = document.getElementById('fake-event-auto-mode');
    if (fakeEventAutoMode) {
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
    }
    
    const toggleAdvancedBtn = document.getElementById('toggle-fake-event-advanced');
    const fakeEventAdvanced = document.getElementById('fake-event-advanced');
    if (toggleAdvancedBtn && fakeEventAdvanced) {
        toggleAdvancedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const isHidden = fakeEventAdvanced.style.display === 'none';
            fakeEventAdvanced.style.display = isHidden ? 'block' : 'none';
            toggleAdvancedBtn.textContent = isHidden ? '⚙️ Ẩn cài đặt nâng cao' : '⚙️ Cài đặt nâng cao';
        });
    }
    
    // Navigation
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (webviewElement && webviewElement.canGoBack()) {
                webviewElement.goBack();
            }
        });
    }
    
    const forwardBtn = document.getElementById('forward-btn');
    if (forwardBtn) {
        forwardBtn.addEventListener('click', () => {
            if (webviewElement && webviewElement.canGoForward()) {
                webviewElement.goForward();
            }
        });
    }
    
    const reloadBtn = document.getElementById('reload-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            if (webviewElement) webviewElement.reload();
        });
    }
    
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            if (webviewElement) webviewElement.loadURL('https://app.onluyen.vn/');
        });
    }
    
    const goBtn = document.getElementById('go-btn');
    if (goBtn) {
        goBtn.addEventListener('click', navigateToUrl);
    }
    
    const urlBar = document.getElementById('url-bar');
    if (urlBar) {
        urlBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                navigateToUrl();
            }
        });
    }
    
    // Pop Out
    const popOutBtn = document.getElementById('pop-out-btn');
    if (popOutBtn) {
        popOutBtn.addEventListener('click', () => {
            window.electronAPI.openPopupWindow();
        });
    }
    
    // Settings
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    const saveSettingsBtn = document.getElementById('save-settings');
    const resetSettingsBtn = document.getElementById('reset-settings');
    
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }
    
    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }
    
    if (modalBackdrop && settingsModal) {
        modalBackdrop.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }
    
    if (saveSettingsBtn && settingsModal) {
        saveSettingsBtn.addEventListener('click', () => {
            saveSettings();
            settingsModal.classList.add('hidden');
        });
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', () => {
            appSettings = { ...defaultSettings };
            updateSettingsUI();
            applySettings();
            saveSettings();
        });
    }
    
    // Settings Sliders
    const qualitySlider = document.getElementById('screenshot-quality');
    const qualityValue = document.getElementById('quality-value');
    if (qualitySlider) {
        qualitySlider.addEventListener('input', (e) => {
            appSettings.screenshotQuality = parseInt(e.target.value, 10);
            if (qualityValue) qualityValue.textContent = `${appSettings.screenshotQuality}%`;
        });
    }
    
    const domLimitSlider = document.getElementById('dom-limit');
    const domValue = document.getElementById('dom-value');
    if (domLimitSlider) {
        domLimitSlider.addEventListener('input', (e) => {
            appSettings.domLimit = parseInt(e.target.value, 10);
            if (domValue) domValue.textContent = appSettings.domLimit;
        });
    }
    
    const autoDelaySlider = document.getElementById('auto-delay');
    const delayValue = document.getElementById('delay-value');
    if (autoDelaySlider) {
        autoDelaySlider.addEventListener('input', (e) => {
            appSettings.autoDelay = parseInt(e.target.value, 10);
            if (delayValue) delayValue.textContent = `${appSettings.autoDelay}ms`;
        });
    }
    
    // Performance Indicator
    const perfIndicator = document.getElementById('performance-indicator');
    const closePerfIndicatorBtn = document.getElementById('close-perf-indicator');
    const condensedPerfIndicator = document.getElementById('perf-indicator-condensed');
    
    function setPerfIndicatorVisibility(visible) {
        if (visible) {
            if (perfIndicator) perfIndicator.classList.remove('hidden');
            if (condensedPerfIndicator) condensedPerfIndicator.classList.add('hidden');
            localStorage.setItem('perfIndicatorVisible', 'true');
        } else {
            if (perfIndicator) perfIndicator.classList.add('hidden');
            if (condensedPerfIndicator) condensedPerfIndicator.classList.remove('hidden');
            localStorage.setItem('perfIndicatorVisible', 'false');
        }
    }
    
    if (closePerfIndicatorBtn) {
        closePerfIndicatorBtn.addEventListener('click', () => setPerfIndicatorVisibility(false));
    }
    
    if (condensedPerfIndicator) {
        condensedPerfIndicator.addEventListener('click', () => setPerfIndicatorVisibility(true));
    }
    
    const isPerfIndicatorVisible = localStorage.getItem('perfIndicatorVisible') !== 'false';
    setPerfIndicatorVisibility(isPerfIndicatorVisible);
    
    // Knowledge Base
    const saveKnowledgeBtn = document.getElementById('save-knowledge-btn');
    if (saveKnowledgeBtn) {
        saveKnowledgeBtn.addEventListener('click', async () => {
            const kbQuestionInput = document.getElementById('kb-question');
            const kbAnswerInput = document.getElementById('kb-answer');
            
            if (!kbQuestionInput || !kbAnswerInput) return;
            
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
    }
    
    // ============= WEBVIEW EVENT LISTENERS =============
    
    webviewElement.addEventListener('dom-ready', async () => {
        console.log('Webview DOM ready event fired');
        
        // Wait a bit to ensure webview is really ready
        await sleep(1000);
        
        // Check if webview is truly ready
        try {
            const testScript = `
                (function() {
                    return { 
                        ready: true, 
                        url: window.location.href,
                        title: document.title || 'Untitled',
                        timestamp: Date.now()
                    };
                })();
            `;
            
            const testResult = await webviewElement.executeJavaScript(testScript);
            
            if (testResult && testResult.ready) {
                console.log('✅ Webview verified ready:', testResult);
                webviewReady = true;
                
                // Register webview
                window.electronAPI.registerWebview(webviewElement.getWebContentsId());
                
                // Enable capture button
                if (captureAndSendBtn) {
                    captureAndSendBtn.disabled = false;
                }
                
                // Update navigation
                updateNavigationButtons();
                if (urlBar) {
                    urlBar.value = testResult.url || webviewElement.getURL();
                }
                
                // Process any pending injections
                await processPendingInjections();
                
                // Auto-inject features if enabled
                if (antiTrackingEnabled) {
                    console.log('Auto-enabling anti-tracking...');
                    await enableAntiTracking();
                }
                
                if (fakeEventEnabled && fakeEventUsername && fakeEventUsername.value) {
                    console.log('Auto-enabling fake events...');
                    await enableFakeEvents();
                }

                // Start a 5-second interval for continuous scraping
                if (scrapingInterval) clearInterval(scrapingInterval);
                scrapingInterval = setInterval(extractLocalStorageData, 5000);
            } else {
                console.warn('Webview test failed, will retry...');
                webviewReady = false;
                
                // Retry after delay
                setTimeout(() => {
                    webviewElement.dispatchEvent(new Event('dom-ready'));
                }, 2000);
            }
        } catch (error) {
            console.error('Error verifying webview ready:', error);
            webviewReady = false;
            
            // Retry after delay
            setTimeout(() => {
                webviewElement.dispatchEvent(new Event('dom-ready'));
            }, 2000);
        }
    });
    
    webviewElement.addEventListener('did-start-loading', () => {
        console.log('Webview started loading');
        if (scrapingInterval) {
            clearInterval(scrapingInterval);
            scrapingInterval = null;
        }
        webviewReady = false;
        pendingInjections = []; // Clear pending injections when loading new page
    });
    
    webviewElement.addEventListener('did-stop-loading', () => {
        console.log('Webview stopped loading');
        // Trigger dom-ready to check again
        setTimeout(() => {
            webviewElement.dispatchEvent(new Event('dom-ready'));
        }, 500);
    });
    
    webviewElement.addEventListener('crashed', () => {
        console.error('Webview crashed!');
        webviewReady = false;
        showNotification('❌ Webview crashed! Please reload.', 'error');
    });
    
    webviewElement.addEventListener('did-navigate', (e) => {
        if (urlBar) urlBar.value = e.url;
        updateNavigationButtons();
    });
    
    webviewElement.addEventListener('did-navigate-in-page', (e) => {
        if (e.isMainFrame && urlBar) {
            urlBar.value = e.url;
            updateNavigationButtons();
        }
    });
    
    webviewElement.addEventListener('did-fail-load', (errorCode, errorDescription) => {
        console.error('Failed to load page:', errorDescription);
        if (errorDescription && !errorDescription.includes('ERR_ABORTED')) {
            showNotification('⚠️ Lỗi tải trang', 'warning');
        }
    });
    
    // ============= WINDOW EVENT LISTENERS =============
    
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
    
    window.electronAPI.onApiKeyUpdated((newIndex) => {
        if (appSettings.debugMode) {
            console.log(`Switching to API key index: ${newIndex}`);
        }
        currentApiKeyIndex = newIndex;
        const data = { keys: apiKeys, index: currentApiKeyIndex };
        localStorage.setItem('gemini_api_keys_data', JSON.stringify(data));
        updateApiKeyStatus();
    });


    
    // ============= KEYBOARD SHORTCUTS =============
    
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (captureAndSendBtn && !captureAndSendBtn.disabled) {
                captureAndSendBtn.click();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (captureAndSendBtn && !captureAndSendBtn.disabled) {
                captureAndSendBtn.click();
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            const autoRadio = document.querySelector('input[name="ai-mode"][value="auto"]');
            if (isAutoModeActive) {
                stopAutoMode();
                const analyzeRadio = document.querySelector('input[name="ai-mode"][value="analyze"]');
                if (analyzeRadio) analyzeRadio.checked = true;
            } else {
                if (autoRadio) {
                    autoRadio.checked = true;
                    autoRadio.dispatchEvent(new Event('change'));
                }
            }
        }
        
        if (e.altKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            if (backBtn && !backBtn.disabled) {
                backBtn.click();
            }
        }
        
        if (e.altKey && e.key === 'ArrowRight') {
            e.preventDefault();
            if (forwardBtn && !forwardBtn.disabled) {
                forwardBtn.click();
            }
        }
        
        if (e.key === ' ' && 
            document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (executeStepBtn && !executeStepBtn.disabled && currentActions.length > 0) {
                executeStepBtn.click();
            }
        }
    });
});