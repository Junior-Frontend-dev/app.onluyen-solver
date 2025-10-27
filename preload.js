
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
  saveGeminiModel: (model) => ipcRenderer.invoke('save-gemini-model', model),
  getVisionGeminiModel: () => ipcRenderer.invoke('get-vision-gemini-model'),
  saveVisionGeminiModel: (model) => ipcRenderer.invoke('save-vision-gemini-model', model),

  // Deep Reasoning Mode
  getDeepReasoningState: () => ipcRenderer.invoke('get-deep-reasoning-state'),
  saveDeepReasoningState: (isEnabled) => ipcRenderer.invoke('save-deep-reasoning-state', isEnabled),

  // Fast Mode
  getFastModeState: () => ipcRenderer.invoke('get-fast-mode-state'),
  saveFastModeState: (isEnabled) => ipcRenderer.invoke('save-fast-mode-state', isEnabled),

  // Google Search
  getGoogleSearchState: () => ipcRenderer.invoke('get-google-search-state'),
  saveGoogleSearchState: (isEnabled) => ipcRenderer.invoke('save-google-search-state', isEnabled),

  // Auto Bypass Cheat
  getAutoBypassCheatState: () => ipcRenderer.invoke('get-auto-bypass-cheat-state'),
  saveAutoBypassCheatState: (isEnabled) => ipcRenderer.invoke('save-auto-bypass-cheat-state', isEnabled),

  // Gemini Streaming
  streamGemini: (args) => ipcRenderer.send('stream-gemini', args),
  onGeminiChunk: (callback) => ipcRenderer.on('gemini-stream-chunk', (_event, value) => callback(value)),
  onGeminiEnd: (callback) => ipcRenderer.on('gemini-stream-end', () => callback()),
  onGeminiError: (callback) => ipcRenderer.on('gemini-stream-error', (_event, value) => callback(value)),

  // Vision Search Streaming
  streamVisionGemini: (args) => ipcRenderer.send('stream-vision-gemini', args),
  onVisionStreamChunk: (callback) => ipcRenderer.on('vision-stream-chunk', (_event, value) => callback(value)),
  onVisionStreamEnd: (callback) => ipcRenderer.on('vision-stream-end', () => callback()),
  onVisionStreamError: (callback) => ipcRenderer.on('vision-stream-error', (_event, value) => callback(value)),


});
