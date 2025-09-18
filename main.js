// main.js - Main Process với Error Handling đầy đủ
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const { initializeDatabase, saveKnowledge, getKnowledge, searchKnowledge } = require('./database');

// Disable GPU acceleration để tránh lỗi GPU
app.disableHardwareAcceleration();

let mainWindow;
let devWindow;
let popupWindow; // Cửa sổ cho control panel
let mainWebviewContents; // Webview của cửa sổ chính

// Tạo cửa sổ Dev Console
function createDevConsole() {
  devWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: 50,
    y: 50,
    title: 'Dev Console',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    alwaysOnTop: false
  });

  devWindow.loadFile('dev-console.html');
  
  devWindow.on('closed', () => {
    devWindow = null;
  });
}

// Gửi log tới Dev Console
function devLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const logMessage = `[${timestamp}] ${message}`;
  
  try {
    console.log(logMessage);
  } catch (e) {
    // Ignore encoding errors
  }
  
  if (devWindow && !devWindow.isDestroyed()) {
    devWindow.webContents.send('dev-log', {
      message: logMessage,
      type: type
    });
  }
}

// Xử lý mở cửa sổ pop-up
ipcMain.on('open-popup-window', (event) => {
  if (popupWindow) {
    popupWindow.focus();
    return;
  }

  popupWindow = new BrowserWindow({
    width: 500,
    height: 800,
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    },
    autoHideMenuBar: true,
  });

  popupWindow.loadFile('index.html');

  // Gửi tin nhắn để chuyển sang chế độ control panel khi cửa sổ sẵn sàng
  popupWindow.webContents.once('dom-ready', () => {
    popupWindow.webContents.send('set-control-panel-mode');
  });

  // Gửi tin nhắn cho cửa sổ chính để ẩn sidebar
  mainWindow.webContents.send('set-webview-only-mode');

  popupWindow.on('closed', () => {
    popupWindow = null;
    // Khi pop-up đóng, đóng cả cửa sổ chính
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });
});

// Tạo cửa sổ chính của ứng dụng
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  mainWindow.loadFile('index.html');

  // Tạo menu
  const template = [
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Toggle Dev Console',
          accelerator: 'F12',
          click: () => {
            if (devWindow && !devWindow.isDestroyed()) {
              devWindow.close();
            } else {
              createDevConsole();
            }
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (devWindow && !devWindow.isDestroyed()) {
      devWindow.close();
    }
    // Khi cửa sổ chính đóng, đóng cả pop-up
    if (popupWindow && !popupWindow.isDestroyed()) {
      popupWindow.close();
    }
  });

  // Auto open dev console on start
  createDevConsole();
  devLog('🚀 Ứng dụng đã khởi động thành công!', 'success');
}

// Khởi động ứng dụng
app.whenReady().then(async () => {
  await initializeDatabase();
  createWindow();

  // Set up IPC handlers for database operations
  ipcMain.handle('save-knowledge', async (event, question, answer) => {
    return await saveKnowledge(question, answer);
  });

  ipcMain.handle('get-knowledge', async () => {
    return await getKnowledge();
  });

  ipcMain.handle('search-knowledge', async (event, query) => {
    return await searchKnowledge(query);
  });

  ipcMain.handle('rag-query', async (event, userQuery) => {
    console.log('Received RAG query:', userQuery);
    const relevantKnowledge = await searchKnowledge(userQuery);
    console.log('Relevant knowledge retrieved:', relevantKnowledge);

    let prompt = `User query: "${userQuery}"\n\n`;
    if (relevantKnowledge && relevantKnowledge.length > 0) {
      prompt += "Context from your knowledge base:\n";
      relevantKnowledge.forEach((item, index) => {
        prompt += `\nKnowledge ${index + 1}:\nQuestion: ${item.question}\nAnswer: ${item.answer}\n`;
      });
      prompt += "\nBased on the user query and the provided context, please generate a comprehensive answer.\n";
    } else {
      prompt += "No specific context found in your knowledge base. Please answer based on general knowledge.\n";
    }

    const mockGeminiResponse = `(Mock Gemini Response based on RAG)\n\n${prompt}\n\n(End of Mock Response)`;
    return mockGeminiResponse;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Lưu reference tới webview contents
ipcMain.on('register-webview', (event, webContentsId) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  // Chỉ đăng ký webview từ cửa sổ chính
  if (senderWindow === mainWindow) {
    const { webContents } = require('electron');
    mainWebviewContents = webContents.fromId(webContentsId);
    devLog(`✅ Webview chính đã được đăng ký với ID: ${webContentsId}`, 'success');
  }
});

// Xử lý chụp màn hình từ webview - FIXED
ipcMain.handle('capture-screenshot', async () => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng. Vui lòng đợi trang web tải xong.');
    }

    const getDomSnapshotScript = `
      (() => {
        try {
          const elements = [];
          let idCounter = 0;
          
          function getCleanText(el) {
            let text = '';
            try {
              if (el.innerText) text = el.innerText.trim();
              else if (el.textContent) text = el.textContent.trim();
              if (el.value) text = el.value;
              if (el.placeholder && !text) text = el.placeholder;
            } catch(e) {}
            return text.substring(0, 200);
          }
          
          function isClickable(el) {
            const tag = el.tagName.toLowerCase();
            const clickableTags = ['a', 'button', 'input', 'textarea', 'select'];
            const hasClickHandler = el.onclick || el.getAttribute('onclick');
            const isInteractive = el.hasAttribute('role') && ['button', 'link', 'checkbox', 'radio'].includes(el.getAttribute('role'));
            const hasPointer = window.getComputedStyle(el).cursor === 'pointer';
            
            return clickableTags.includes(tag) || hasClickHandler || isInteractive || hasPointer;
          }
          
          const selector = 'a, button, input, textarea, select, label, [role="button"], [onclick], .option, .answer, [class*="answer"], [class*="option"], [class*="choice"], [class*="radio"], [class*="checkbox"], div[class*="select"], span[class*="select"]';
          
          document.querySelectorAll(selector).forEach(el => {
            try {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              
              if (rect.width > 0 && rect.height > 0 && 
                  styles.display !== 'none' && 
                  styles.visibility !== 'hidden' &&
                  styles.opacity !== '0') {
                
                const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
                const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
                
                elements.push({
                  ai_id: idCounter++,
                  tagName: el.tagName.toLowerCase(),
                  rect: { 
                    x: rect.x, 
                    y: rect.y, 
                    width: rect.width, 
                    height: rect.height,
                    centerX: rect.x + rect.width / 2,
                    centerY: rect.y + rect.height / 2
                  },
                  pageRect: {
                    x: rect.x + scrollX,
                    y: rect.y + scrollY,
                    centerX: rect.x + scrollX + rect.width / 2,
                    centerY: rect.y + scrollY + rect.height / 2
                  },
                  text: getCleanText(el),
                  className: el.className || '',
                  id: el.id || '',
                  name: el.name || '',
                  type: el.type || '',
                  checked: el.checked || false,
                  selected: el.selected || false,
                  value: el.value || '',
                  href: el.href || '',
                  ariaLabel: el.getAttribute('aria-label') || '',
                  isClickable: isClickable(el)
                });
              }
            } catch(e) {}
          });
          
          elements.sort((a, b) => {
            if (Math.abs(a.rect.y - b.rect.y) > 10) {
              return a.rect.y - b.rect.y;
            }
            return a.rect.x - b.rect.x;
          });
          
          return {
            elements: elements || [],
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
              scrollX: window.pageXOffset || 0,
              scrollY: window.pageYOffset || 0
            },
            documentInfo: {
              title: document.title || '',
              url: window.location.href || ''
            }
          };
        } catch(e) {
          return {
            elements: [],
            viewport: {},
            documentInfo: {}
          };
        }
      })();
    `;

    const [image, domData] = await Promise.all([
        mainWebviewContents.capturePage(),
        mainWebviewContents.executeJavaScript(getDomSnapshotScript)
    ]);

    const screenshot = image.toDataURL();
    const bounds = image.getSize();
    
    devLog(`✅ Chụp màn hình thành công: ${bounds.width}x${bounds.height}, DOM elements: ${domData?.elements?.length || 0}`, 'success');
    
    return { 
      success: true, 
      data: screenshot,
      dimensions: bounds,
      domSnapshot: domData?.elements || [],
      domData: domData || { elements: [], viewport: {}, documentInfo: {} }
    };
  } catch (error) {
    devLog(`❌ Lỗi khi chụp màn hình: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

// Xử lý gửi ảnh tới Gemini API - FIXED
ipcMain.handle('send-to-gemini', async (event, imageBase64, apiKey, model, customPrompt) => {
  try {
    devLog(`📤 Gửi request tới Gemini API (mode: analyze, model: ${model})`, 'info');
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const systemPrompt = `Bạn là một trợ lý AI chuyên giải bài tập và hỗ trợ học tập trên nền tảng OnLuyen.vn.

**VAI TRÒ CỦA BẠN:**
1. Phân tích và giải quyết các câu hỏi, bài tập trong ảnh
2. Xác định đáp án đúng cho câu hỏi trắc nghiệm
3. Giải thích chi tiết lý do chọn đáp án
4. Cung cấp kiến thức bổ sung liên quan

**FORMAT TRẢ LỜI:**
📌 **Đáp án đúng: [Chữ cái hoặc đáp án]**
📝 **Giải thích:**
[Giải thích chi tiết]

💡 **Kiến thức bổ sung:**
[Thông tin thêm nếu cần]`;

    const userPrompt = customPrompt || 'Hãy phân tích và giải quyết bài tập trong ảnh này.';
    const fullPrompt = `${systemPrompt}\n\n---\n\n**YÊU CẦU HIỆN TẠI:**\n${userPrompt}`;

    const payload = {
      contents: [{
        parts: [
          {
            text: fullPrompt
          },
          {
            inline_data: {
              mime_type: "image/png",
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    // FIXED: Safe access to response data
    if (!response?.data?.candidates || !Array.isArray(response.data.candidates) || response.data.candidates.length === 0) {
      throw new Error('Không có response từ Gemini API');
    }

    const candidate = response.data.candidates[0];
    if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      throw new Error('Response không có nội dung');
    }

    const result = candidate.content.parts[0]?.text || 'Không có nội dung';
    
    devLog('✅ Nhận phản hồi từ Gemini API thành công', 'success');
    return { success: true, data: result };
  } catch (error) {
    devLog(`❌ Lỗi khi gọi Gemini API: ${error.message}`, 'error');
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    };
  }
});

// Xử lý gửi với actions - FIXED
ipcMain.handle('send-to-gemini-with-actions', async (event, imageBase64, apiKey, model, customPrompt, dimensions, domSnapshot) => {
  try {
    devLog(`📤 Gửi request tới Gemini API (mode: action, model: ${model})`, 'info');
    
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const userPrompt = customPrompt ? `**Yêu cầu từ người dùng:** ${customPrompt}\n\n---\n\n` : '';

    // Ensure domSnapshot is array
    const safeDomSnapshot = Array.isArray(domSnapshot) ? domSnapshot : [];
    const limitedSnapshot = safeDomSnapshot.slice(0, 100);

    const actionPrompt = `${userPrompt}Bạn là một AI trợ lý giải bài tập trên OnLuyen.vn.

**BỐI CẢNH:**
1. Ảnh màn hình: ${dimensions?.width || 0}x${dimensions?.height || 0} pixels
2. DOM elements (${limitedSnapshot.length} elements):
${JSON.stringify(limitedSnapshot, null, 2)}

**NHIỆM VỤ:**
Phân tích và tạo actions để giải bài tập.

**QUAN TRỌNG - TRẢ VỀ JSON ĐÚNG FORMAT:**
{
  "analysis": "Mô tả phân tích",
  "actions": [
    {
      "type": "click",
      "ai_id": [number],
      "description": "Mô tả action"
    },
    {
      "type": "type",
      "ai_id": [number],
      "text": "text cần nhập",
      "description": "Mô tả action"
    }
  ]
}

Nếu không tìm thấy câu hỏi, trả về:
{
  "analysis": "Không tìm thấy câu hỏi",
  "actions": []
}`;

    const payload = {
      contents: [{
        parts: [
          { text: actionPrompt },
          { inline_data: { mime_type: "image/png", data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      payload,
      { 
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    // FIXED: Safe access to response
    if (!response?.data?.candidates || !Array.isArray(response.data.candidates) || response.data.candidates.length === 0) {
      throw new Error('Không có response từ Gemini API');
    }

    const candidate = response.data.candidates[0];
    if (!candidate?.content?.parts || !Array.isArray(candidate.content.parts) || candidate.content.parts.length === 0) {
      throw new Error('Response không có nội dung');
    }

    const result = candidate.content.parts[0]?.text || '{"analysis": "Không có nội dung", "actions": []}';
    
    devLog('✅ Nhận phản hồi từ Gemini API với actions thành công', 'success');
    return { success: true, data: result };
  } catch (error) {
    devLog(`❌ Lỗi khi gọi Gemini API: ${error.message}`, 'error');
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    };
  }
});

// Xử lý click chuột - FIXED
ipcMain.handle('perform-click', async (event, x, y) => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng');
    }

    devLog(`🖱️ Click tại vị trí (${x}, ${y})`, 'info');

    mainWebviewContents.sendInputEvent({
      type: 'mouseDown',
      x: Math.round(x),
      y: Math.round(y),
      button: 'left',
      clickCount: 1
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    mainWebviewContents.sendInputEvent({
      type: 'mouseUp',
      x: Math.round(x),
      y: Math.round(y),
      button: 'left'
    });

    return { success: true };
  } catch (error) {
    devLog(`❌ Lỗi khi click: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

// Xử lý nhập text - FIXED
ipcMain.handle('perform-type', async (event, text, x, y) => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng');
    }

    if (!text) {
      throw new Error('Không có text để nhập');
    }

    devLog(`⌨️ Nhập text "${text}" tại (${x}, ${y})`, 'info');

    // Click vào vị trí trước
    if (x !== undefined && y !== undefined) {
      mainWebviewContents.sendInputEvent({
        type: 'mouseDown',
        x: Math.round(x),
        y: Math.round(y),
        button: 'left',
        clickCount: 1
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      mainWebviewContents.sendInputEvent({
        type: 'mouseUp',
        x: Math.round(x),
        y: Math.round(y),
        button: 'left'
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Clear existing text
    mainWebviewContents.sendInputEvent({
      type: 'keyDown',
      keyCode: 'a',
      modifiers: ['control']
    });
    await new Promise(resolve => setTimeout(resolve, 50));

    mainWebviewContents.sendInputEvent({
      type: 'keyDown',
      keyCode: 'Delete'
    });
    await new Promise(resolve => setTimeout(resolve, 50));

    // Type new text
    for (const char of text.toString()) {
      mainWebviewContents.sendInputEvent({
        type: 'char',
        keyCode: char
      });
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    devLog(`✅ Đã nhập xong: "${text}"`, 'success');
    return { success: true };
  } catch (error) {
    devLog(`❌ Lỗi khi nhập text: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

// Các handlers khác giữ nguyên...
ipcMain.handle('perform-clear', async (event, x, y) => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng');
    }

    devLog(`🗑️ Xóa nội dung tại (${x}, ${y})`, 'info');

    mainWebviewContents.sendInputEvent({
      type: 'mouseDown',
      x: Math.round(x),
      y: Math.round(y),
      button: 'left',
      clickCount: 3
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    mainWebviewContents.sendInputEvent({
      type: 'keyDown',
      keyCode: 'Delete'
    });

    return { success: true };
  } catch (error) {
    devLog(`❌ Lỗi khi xóa nội dung: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-move', async (event, x, y) => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng');
    }

    mainWebviewContents.sendInputEvent({
      type: 'mouseMove',
      x: Math.round(x),
      y: Math.round(y)
    });

    devLog(`🖱️ Di chuyển chuột tới (${x}, ${y})`, 'info');
    return { success: true };
  } catch (error) {
    devLog(`❌ Lỗi khi di chuyển chuột: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-scroll', async (event, deltaY) => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng');
    }

    const scrollAmount = deltaY || 300;
    
    mainWebviewContents.sendInputEvent({
      type: 'mouseWheel',
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: scrollAmount
    });

    devLog(`📜 Cuộn trang: ${scrollAmount}`, 'info');
    return { success: true };
  } catch (error) {
    devLog(`❌ Lỗi khi cuộn trang: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});

ipcMain.handle('perform-key', async (event, key) => {
  try {
    if (!mainWebviewContents) {
      throw new Error('Webview chưa sẵn sàng');
    }

    const keyMap = {
      'Enter': 'Return',
      'Tab': 'Tab',
      'Escape': 'Escape',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right'
    };

    const keyCode = keyMap[key] || key;

    mainWebviewContents.sendInputEvent({
      type: 'keyDown',
      keyCode: keyCode
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    mainWebviewContents.sendInputEvent({
      type: 'keyUp',
      keyCode: keyCode
    });

    devLog(`⌨️ Nhấn phím: ${key}`, 'info');
    return { success: true };
  } catch (error) {
    devLog(`❌ Lỗi khi nhấn phím: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
});