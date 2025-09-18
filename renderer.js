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

// Đợi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
    // Get all DOM elements
    const webview = document.getElementById('onluyen-webview');
    const captureAndSendBtn = document.getElementById('capture-and-send-btn');
    const apiKeyInput = document.getElementById('api-key');
    const aiModelSelect = document.getElementById('ai-model');
    const customPromptInput = document.getElementById('custom-prompt');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
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
    
    // Navigation elements
    const backBtn = document.getElementById('back-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const reloadBtn = document.getElementById('reload-btn');
    const homeBtn = document.getElementById('home-btn');
    const urlBar = document.getElementById('url-bar');
    const goBtn = document.getElementById('go-btn');

    // ============= API KEY MANAGEMENT =============
    
    // Load saved API key on startup
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        showNotification('API Key đã được tải từ bộ nhớ', 'success');
    }
    
    // Save API key
    saveApiKeyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('gemini_api_key', apiKey);
            showNotification('API Key đã được lưu thành công!', 'success');
        } else {
            showNotification('Vui lòng nhập API Key trước khi lưu', 'warning');
        }
    });

    // Toggle hiện/ẩn API key
    toggleApiKeyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyBtn.textContent = 'Ẩn';
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyBtn.textContent = 'Hiện';
        }
    });

    // ============= AUTO MODE FUNCTIONS =============
    
    async function startAutoMode() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
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
                throw new Error('Không thể chụp màn hình');
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

            const aiResult = await window.electronAPI.sendToGeminiWithActions(
                currentScreenshot, 
                apiKeyInput.value.trim(), 
                model, 
                autoPrompt, 
                screenshotDimensions, 
                currentDomSnapshot
            );
            
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

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showNotification('Vui lòng nhập API Key!', 'warning');
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

            let result;
            if (mode === 'action' || mode === 'auto') {
                result = await window.electronAPI.sendToGeminiWithActions(
                    currentScreenshot,
                    apiKey,
                    model,
                    customPrompt,
                    screenshotDimensions,
                    currentDomSnapshot
                );
            } else {
                result = await window.electronAPI.sendToGemini(
                    currentScreenshot,
                    apiKey,
                    model,
                    customPrompt
                );
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

    // ============= SETTINGS MODAL =============
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const modalBackdrop = document.querySelector('.modal-backdrop');

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    modalBackdrop.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    // ============= END SETTINGS MODAL =============

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
});


// Knowledge Base & RAG functionality
document.addEventListener('DOMContentLoaded', () => {
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

    // Helper function for notifications (local to this scope)
    function showNotification(message, type = 'info') {
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
});