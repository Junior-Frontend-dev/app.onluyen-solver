// preload.js - Bridge giữa Main và Renderer Process
const { contextBridge, ipcRenderer } = require('electron');

// Expose các API an toàn cho renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  saveKnowledge: (question, answer) => ipcRenderer.invoke('save-knowledge', question, answer),
  getKnowledge: () => ipcRenderer.invoke('get-knowledge'),
  searchKnowledge: (query) => ipcRenderer.invoke('search-knowledge', query),
  ragQuery: (userQuery) => ipcRenderer.invoke('rag-query', userQuery),
  
  // Đăng ký webview với main process
  registerWebview: (webContentsId) => {
    ipcRenderer.send('register-webview', webContentsId);
  },

  // Chụp màn hình
  captureScreenshot: async () => {
    return await ipcRenderer.invoke('capture-screenshot');
  },

  // Lấy DOM snapshot từ webview
  getDomSnapshot: async () => {
    return await ipcRenderer.invoke('get-dom-snapshot');
  },

  // Gửi ảnh tới Gemini API
  sendToGemini: async (imageBase64, apiKey, model, customPrompt) => {
    return await ipcRenderer.invoke('send-to-gemini', imageBase64, apiKey, model, customPrompt);
  },

  // Gửi ảnh tới Gemini với yêu cầu actions và DOM
  sendToGeminiWithActions: async (imageBase64, apiKey, model, customPrompt, dimensions, domSnapshot) => {
    return await ipcRenderer.invoke('send-to-gemini-with-actions', imageBase64, apiKey, model, customPrompt, dimensions, domSnapshot);
  },

  // Thực hiện click
  performClick: async (x, y) => {
    return await ipcRenderer.invoke('perform-click', x, y);
  },

  // Thực hiện nhập text (có thể có tọa độ)
  performType: async (text, x, y) => {
    return await ipcRenderer.invoke('perform-type', text, x, y);
  },

  // Xóa nội dung input
  performClear: async (x, y) => {
    return await ipcRenderer.invoke('perform-clear', x, y);
  },

  // Di chuyển chuột
  performMove: async (x, y) => {
    return await ipcRenderer.invoke('perform-move', x, y);
  },

  // Cuộn trang
  performScroll: async (deltaY) => {
    return await ipcRenderer.invoke('perform-scroll', deltaY);
  },

  // Nhấn phím
  performKey: async (key) => {
    return await ipcRenderer.invoke('perform-key', key);
  },

  // Mở cửa sổ pop-up
  openPopupWindow: () => {
    ipcRenderer.send('open-popup-window');
  },

  // Lắng nghe sự kiện để chuyển sang chế độ control panel
  onSetControlPanelMode: (callback) => {
    ipcRenderer.on('set-control-panel-mode', callback);
  },

  // Lắng nghe sự kiện để chuyển sang chế độ chỉ webview
  onSetWebviewOnlyMode: (callback) => {
    ipcRenderer.on('set-webview-only-mode', callback);
  },

  // Lắng nghe sự kiện để hiện lại sidebar
  onShowSidebar: (callback) => {
    ipcRenderer.on('show-sidebar', callback);
  },

  // Gửi cài đặt tới main process
  updateSettings: (settings) => {
    ipcRenderer.send('update-settings', settings);
  }
});