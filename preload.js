const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('electronAPI', {
    // New, reliable scraping method provided by the user
    extractTests: () => {
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
            } catch (e) {}
        }
        return result;
    },

    // All other existing APIs
    captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
    sendToGemini: (payload) => ipcRenderer.invoke('send-to-gemini', payload),
    sendToGeminiWithActions: (payload) => ipcRenderer.invoke('send-to-gemini-with-actions', payload),
    performClick: (x, y) => ipcRenderer.invoke('perform-click', x, y),
    performType: (text, x, y) => ipcRenderer.invoke('perform-type', text, x, y),
    performClear: (x, y) => ipcRenderer.invoke('perform-clear', x, y),
    performMove: (x, y) => ipcRenderer.invoke('perform-move', x, y),
    performScroll: (deltaY) => ipcRenderer.invoke('perform-scroll', deltaY),
    performKey: (key) => ipcRenderer.invoke('perform-key', key),
    performWait: (ms) => ipcRenderer.invoke('perform-wait', ms),
    performDoubleClick: (x, y) => ipcRenderer.invoke('perform-double-click', x, y),
    performHover: (x, y) => ipcRenderer.invoke('perform-hover', x, y),
    performSelectOption: (ai_id, value) => ipcRenderer.invoke('perform-select-option', ai_id, value),
    performDragAndDrop: (source, target) => ipcRenderer.invoke('perform-drag-and-drop', source, target),
    performRunScript: (script) => ipcRenderer.invoke('perform-run-script', script),
    performReload: () => ipcRenderer.invoke('perform-reload'),
    performGoBack: () => ipcRenderer.invoke('perform-go-back'),
    performScrollToElement: (ai_id) => ipcRenderer.invoke('perform-scroll-to-element', ai_id),
    performFocus: (ai_id) => ipcRenderer.invoke('perform-focus', ai_id),
    openPopupWindow: () => ipcRenderer.send('open-popup-window'),
    updateSettings: (settings) => ipcRenderer.send('update-settings', settings),
    registerWebview: (id) => ipcRenderer.send('register-webview', id),
    readAntiTrackingScript: () => ipcRenderer.invoke('read-anti-tracking-script'),
    readFakeEventScript: () => ipcRenderer.invoke('read-fake-event-script'),
    updateAntiTracking: (config) => ipcRenderer.send('update-anti-tracking', config),
    updateFakeEvent: (config) => ipcRenderer.send('update-fake-event', config),
    saveKnowledge: (question, answer) => ipcRenderer.invoke('save-knowledge', question, answer),
    getKnowledge: () => ipcRenderer.invoke('get-knowledge'),
    searchKnowledge: (query) => ipcRenderer.invoke('search-knowledge', query),
    ragQuery: (query) => ipcRenderer.invoke('rag-query', query),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    onSetControlPanelMode: (callback) => ipcRenderer.on('set-control-panel-mode', callback),
    onSetWebviewOnlyMode: (callback) => ipcRenderer.on('set-webview-only-mode', callback),
    onShowSidebar: (callback) => ipcRenderer.on('show-sidebar', callback),
    onApiKeyUpdated: (callback) => ipcRenderer.on('api-key-updated', (_event, index) => callback(index))
});
