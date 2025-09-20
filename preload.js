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

  // Gửi ảnh tới Gemini API
  sendToGemini: async (payload) => {
    return await ipcRenderer.invoke('send-to-gemini', payload);
  },

  // Gửi ảnh tới Gemini với yêu cầu actions và DOM
  sendToGeminiWithActions: async (payload) => {
    return await ipcRenderer.invoke('send-to-gemini-with-actions', payload);
  },

  // Read anti-tracking script
  readAntiTrackingScript: async () => {
    return await ipcRenderer.invoke('read-anti-tracking-script');
  },

  // Read fake event script
  readFakeEventScript: async () => {
    return await ipcRenderer.invoke('read-fake-event-script');
  },

  // Send anti-tracking config
  updateAntiTracking: (config) => {
    ipcRenderer.send('update-anti-tracking', config);
  },

  // Send fake event config
  updateFakeEvent: (config) => {
    ipcRenderer.send('update-fake-event', config);
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
  },

  getSettings: () => ipcRenderer.invoke('get-settings'),

  // Lắng nghe sự kiện key được cập nhật
  onApiKeyUpdated: (callback) => {
    ipcRenderer.on('api-key-updated', (event, newIndex) => callback(newIndex));
  }
});