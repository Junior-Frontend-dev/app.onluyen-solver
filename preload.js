
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Main to Renderer Communication ---
  onNetworkBlockingStatus: (callback) => ipcRenderer.on('network-blocking-status', (event, status) => callback(status)),
  onNetworkQueueUpdated: (callback) => ipcRenderer.on('network-queue-updated', (event, queue) => callback(queue)),
  onOpenWebviewDevtools: (callback) => ipcRenderer.on('open-webview-devtools', callback),

  // --- Renderer to Main Communication ---
  // Network Blocking
  toggleNetworkBlocking: (shouldBlock) => ipcRenderer.send('toggle-network-blocking', shouldBlock),
  getBlockingStatus: () => ipcRenderer.send('get-blocking-status'),
  clearRequestQueue: () => ipcRenderer.send('clear-request-queue'),
  saveScreenshot: (dataUrl) => ipcRenderer.send('save-screenshot', dataUrl),

  // Scripts and Paths
  getScrapeScript: () => ipcRenderer.invoke('get-scrape-script'),
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),

  // API Key and Model Settings
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  getGeminiModel: () => ipcRenderer.invoke('get-gemini-model'),
  saveGeminiModel: (model) => ipcRenderer.invoke('save-gemini-model', model)
});
