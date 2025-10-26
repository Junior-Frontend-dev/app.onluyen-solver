(async function() {
    // --- CONFIGURATION ---
    const MAX_RETRIES = 10;
    const WAIT_FOR_NEW_QUESTION_TIMEOUT = 12000;

    // --- STATE ---
    let state = {
        allResults: "",
        stopRequested: false,
        lastID: "",
        questionCount: 0,
        retryCount: 0,
        geminiApiKey: null,
        selectedModel: 'gemini-1.5-flash-latest',
        isAiSolving: false,
    };

    // --- UI ELEMENTS ---
    const ui = { container: null };

    // --- CORE LOGIC ---

    async function init() {
        console.log("🚀 Initializing OnLuyen Scraper V2...");
        state.geminiApiKey = await window.electronAPI.getApiKey();
        state.selectedModel = await window.electronAPI.getGeminiModel() || state.selectedModel;

        if (!state.geminiApiKey) {
            const key = prompt("Không tìm thấy API Key. Vui lòng nhập Gemini API Key của bạn:");
            if (key) {
                await window.electronAPI.saveApiKey(key);
                state.geminiApiKey = key;
            } else {
                alert("Chức năng giải AI bị vô hiệu hóa.");
            }
        }

        createMainUI();
        console.log("🚀 Starting scrape...");
        mainLoop();
    }

    async function mainLoop() {
        updateProgress('Bắt đầu lấy câu hỏi...');
        while (!state.stopRequested) {
            const question = await extractQuestion();

            if (question && question.id !== state.lastID) {
                // Found a new question, process it
                state.allResults += question.text;
                state.lastID = question.id;
                state.questionCount++;
                console.log(`📝 Added question: ${question.id} (Total: ${state.questionCount})`);
                updateProgress(`Đã lấy ${state.questionCount} câu. Đang tìm câu tiếp theo...`);
            }

            // New, more robust button finding logic
            let nextButton = null;
            const allButtons = Array.from(document.querySelectorAll('button'));
            nextButton = allButtons.find(btn => btn.innerText.trim().includes('Câu tiếp theo') || btn.innerText.trim().includes('Bỏ qua'));

            if (!nextButton) {
                nextButton = document.querySelector('button.btn-gray'); // Fallback to old selector
            }

            if (nextButton && !nextButton.disabled) {
                nextButton.click();
                await sleep(1200); // Wait for page to transition
            } else {
                // No next button found, assume end of exam
                console.log('Không tìm thấy nút "Câu tiếp theo" hoặc "Bỏ qua", cho rằng đã hết bài.');
                state.stopRequested = true;
            }
        }
        finishScraping();
    }

    function finishScraping() {
        console.log("✅ Scraping finished!");
        if (state.geminiApiKey && state.allResults) {
            state.isAiSolving = true;
            updateProgress("Đang gửi câu hỏi đến Gemini AI...");
            sendToGeminiAI(state.allResults, document.getElementById('ai-content'));
        } else {
            updateProgress("Hoàn thành!", true);
        }
    }

    // --- UI MANAGEMENT ---

    function createMainUI() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { to { transform: rotate(360deg); } }
            .solver-container { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #2c3e50, #465a70); color: white; padding: 15px 25px; border-radius: 12px; z-index: 10001; display: flex; align-items: center; gap: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: fadeIn 0.5s ease; font-family: 'Segoe UI', sans-serif; }
            .solver-status { display: flex; align-items: center; gap: 10px; }
            .solver-spinner { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
            .solver-text { font-size: 14px; font-weight: 500; }
            .solver-button { background: #ff6b6b; color: white; border: none; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s ease; }
            .solver-button:hover { background: #e55a5a; }
            .solver-results-button { background: #4a90e2; }
            .solver-results-button:hover { background: #357abd; }
            .solver-ai-content { white-space: pre-wrap; font-size: 14px; line-height: 1.6; font-family: monospace; background: rgba(0,0,0,0.1); padding: 15px; border-radius: 8px; margin-top: 10px; max-height: 300px; overflow-y: auto; }
        `;
        document.head.appendChild(style);

        ui.container = document.createElement('div');
        ui.container.className = 'solver-container';
        ui.container.innerHTML = `
            <div class="solver-status">
                <div class="solver-spinner"></div>
                <span id="solver-text" class="solver-text">Đang khởi động...</span>
            </div>
            <button id="solver-stop-btn" class="solver-button">Dừng</button>
        `;
        document.body.appendChild(ui.container);

        document.getElementById('solver-stop-btn').onclick = handleStopClick;
    }

    function updateProgress(text, isFinished = false) {
        const textElem = document.getElementById('solver-text');
        const spinnerElem = ui.container.querySelector('.solver-spinner');
        if (textElem) textElem.textContent = text;
        if (isFinished && spinnerElem) spinnerElem.style.display = 'none';
    }

    function handleStopClick() {
        if (state.isAiSolving) {
            // If AI is solving, the button should close the whole thing
            if (ui.container) ui.container.remove();
        } else {
            state.stopRequested = true;
            updateProgress("Đang dừng...");
            document.getElementById('solver-stop-btn').disabled = true;
        }
    }

    function showFinalResultUI() {
        const stopBtn = document.getElementById('solver-stop-btn');
        stopBtn.textContent = 'Đóng';
        stopBtn.className = 'solver-button solver-results-button';
        stopBtn.onclick = () => { if (ui.container) ui.container.remove(); };

        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'CopyCâu Hỏi';
        copyBtn.className = 'solver-button';
        copyBtn.style.marginLeft = '10px';
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(state.allResults);
                copyBtn.textContent = 'Đã Copy!';
                setTimeout(() => copyBtn.textContent = 'CopyCâu Hỏi', 2000);
            } catch (err) { console.error('Copy failed:', err); }
        };
        ui.container.appendChild(copyBtn);

        if (state.geminiApiKey && state.allResults) {
            const aiContentDiv = document.createElement('div');
            aiContentDiv.id = 'ai-content';
            aiContentDiv.className = 'solver-ai-content';
            ui.container.querySelector('.solver-status').appendChild(aiContentDiv);
        }
    }

    // --- DATA EXTRACTION & AI ---
    // (Keeping the extraction logic from the previous version as it is the core functionality)
    async function extractQuestion() {
        try {
            const numDiv = document.querySelector('.num');
            const cauText = numDiv ? extractIntelligentText(numDiv) : `Câu ${state.questionCount + 1}`;
            const trueFalseData = await extractTrueFalseQuestion(cauText);
            if (trueFalseData) return trueFalseData;
            const fillInData = await extractFillInQuestion(cauText);
            if (fillInData) return fillInData;
            const multipleChoiceData = await extractMultipleChoiceQuestion(cauText);
            if (multipleChoiceData) return multipleChoiceData;
            return null;
        } catch (error) {
            console.error("❌ Error extracting question:", error);
            return null;
        }
    }

    async function extractTrueFalseQuestion(cauText) {
        const titleStatic = document.querySelector('.title-static');
        if (!titleStatic || !document.querySelector('.true-false')) return null;
        await sleep(500); // Wait for content to be stable
        const content = extractIntelligentText(document.querySelector('.question-name .content'));
        const items = Array.from(document.querySelectorAll('.options .child-content, .child-content'));
        let text = `
${cauText} - ĐÚNG/SAI
────────────────────
`;
        if (extractIntelligentText(titleStatic)) text += `Hướng dẫn: ${extractIntelligentText(titleStatic)}
`;
        if (content) text += `Nội dung: ${content}
`;
        text += `Các ý:
`;
        items.forEach((item, i) => {
            text += `${String.fromCharCode(97 + i)}) ${extractIntelligentText(item.querySelector('.fadein, .option-text'))}
`;
        });
        return { text: text + '\n', id: cauText };
    }

    async function extractFillInQuestion(cauText) {
        const qName = document.querySelector('.question-name');
        const title = extractIntelligentText(qName?.querySelector('.title'));
        const content = extractIntelligentText(qName?.querySelector('.content'));
        if (!title && !content) return null;
        if (title.includes('điền') || content.includes('điền') || document.querySelector('input[type="text"], input[type="number"]')) {
            let text = `
${cauText} - ĐIỀN ĐÁP ÁN
────────────────────
`;
            if (title) text += `Đề bài: ${title}
`;
            if (content) text += `Câu hỏi: ${content}
`;
            return { text: text + '\n', id: cauText };
        }
        return null;
    }

    async function extractMultipleChoiceQuestion(cauText) {
        const deBai = extractIntelligentText(document.querySelector('.pl-3 p'));
        const cauHoi = extractIntelligentText(document.querySelector('.question-name p'));
        if (!cauHoi && !deBai) return null;
        await sleep(500); // Wait for options to render
        const options = document.querySelectorAll('.question-option');
        let text = `
${cauText} - TRẮC NGHIỆM
────────────────────
`;
        if (deBai) text += `Đề bài: ${deBai}
`;
        if (cauHoi) text += `Câu hỏi: ${cauHoi}
`;
        if (options.length > 0) {
            text += `Lựa chọn:
`;
            options.forEach(opt => {
                const label = extractIntelligentText(opt.querySelector('.question-option-label'));
                const content = extractIntelligentText(opt.querySelector('.question-option-content p'));
                if (content.trim()) text += `${label}. ${content}\n`;
            });
        }
        return { text: text + '\n', id: cauText };
    }

    function extractIntelligentText(element) {
        if (!element) return '';
        return (element.innerText || '').replace(/\s+/g, ' ').trim();
    }



    async function sendToGeminiAI(content, aiResponseEl) {
        console.log("🤖 Sending to Gemini AI...");
        showFinalResultUI(); // Show the results UI now
        updateProgress("Đang nhận đáp án từ AI...", false);

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${state.selectedModel}:generateContent?key=${state.geminiApiKey}&alt=sse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `You are an expert in solving academic questions. Provide only the final, concise answer based on the question type, without explanations. For multiple choice, give the letter (e.g., 'A'). For fill-in-the-blank, give the value (e.g., '4,5 cm'). For true/false, give the sequence (e.g., 'Đ S Đ S'). Your final output must only contain the answers, numbered for each question. Here are the questions:\n\n${content}` }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            aiResponseEl.parentElement.style.display = 'block';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonObj = JSON.parse(line.substring(6));
                            fullResponse += jsonObj.candidates[0].content.parts[0].text;
                            aiResponseEl.textContent = fullResponse.trim();
                        } catch (e) { /* Ignore */ }
                    }
                }
            }
            updateProgress("Hoàn thành!", true);
        } catch (error) {
            console.error("❌ Error calling Gemini AI:", error);
            aiResponseEl.textContent = `❌ Lỗi: ${error.message}`;
            updateProgress("Lỗi AI!", true);
        }
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // --- SCRIPT ENTRY POINT ---
    init();

})();