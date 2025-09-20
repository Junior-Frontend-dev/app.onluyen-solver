// fake-event.js - Fake Out Screen Event System
(() => {
    'use strict';
    
    console.log('🎭 Fake Event System Initialized');

    // Configuration
    let config = {
        enabled: false,
        userName: '',
        interval: 30000, // Default 30 seconds
        autoMode: false,
        testId: '',
        examId: '',
        userId: '',
        keyExam: ''
    };

    // Generate device ID
    const localDevice = Date.now().toString();
    
    // Detect device type
    function getDeviceType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
            return 'webmobile';
        }
        return 'webdesktop';
    }

    // Extract IDs from current page
    function extractPageInfo() {
        try {
            // Try to extract from URL
            const url = window.location.href;
            const urlParams = new URLSearchParams(window.location.search);
            
            // Try to get from URL params
            const testId = urlParams.get('testId') || '';
            const examId = urlParams.get('examId') || '';
            const userId = urlParams.get('userId') || '';
            
            // Try to extract from page content or localStorage
            const storedData = {
                testId: localStorage.getItem('currentTestId') || testId,
                examId: localStorage.getItem('currentExamId') || examId,
                userId: localStorage.getItem('currentUserId') || userId,
                keyExam: localStorage.getItem('keyExam') || `${examId}_false`
            };
            
            // Try to extract from DOM if available
            const testElement = document.querySelector('[data-test-id]');
            const examElement = document.querySelector('[data-exam-id]');
            const userElement = document.querySelector('[data-user-id]');
            
            return {
                testId: config.testId || (testElement?.dataset.testId) || storedData.testId || '68cd32f9b427973233075b88',
                examId: config.examId || (examElement?.dataset.examId) || storedData.examId || '68ccb874422af6ec7417cef7',
                userId: config.userId || (userElement?.dataset.userId) || storedData.userId || '68b154746d4dfa29a54c39a2',
                keyExam: config.keyExam || storedData.keyExam || `${storedData.examId}_false`
            };
        } catch (e) {
            console.error('Error extracting page info:', e);
            return {
                testId: config.testId || '68cd32f9b427973233075b88',
                examId: config.examId || '68ccb874422af6ec7417cef7',
                userId: config.userId || '68b154746d4dfa29a54c39a2',
                keyExam: config.keyExam || '68ccb874422af6ec7417cef7_false'
            };
        }
    }

    // Send fake event
    async function sendFakeEvent(eventType = 'OUTSCREEN') {
        if (!config.enabled || !config.userName) {
            console.log('❌ Fake event disabled or no username');
            return;
        }

        const pageInfo = extractPageInfo();
        
        const payload = {
            action: eventType,
            testId: pageInfo.testId,
            userDevice: getDeviceType(),
            localDevice: localDevice,
            examId: pageInfo.examId,
            key_exam: pageInfo.keyExam,
            userId: pageInfo.userId,
            userName: config.userName,
            timeLocal: Math.floor(Date.now() / 1000)
        };

        console.log('📤 Sending fake event:', payload);

        try {
            // Try multiple endpoints
            const endpoints = [
                '/api/v1/track-event',
                '/api/track',
                '/track',
                '/api/exam/track-event',
                '/api/test/track-event',
                'https://app.onluyen.vn/api/v1/track-event'
            ];

            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload),
                        credentials: 'include'
                    });

                    if (response.ok) {
                        console.log(`✅ Event sent successfully to ${endpoint}`);
                        break;
                    }
                } catch (e) {
                    // Try next endpoint
                }
            }

            // Also try WebSocket if available
            if (window.WebSocket) {
                try {
                    const ws = new WebSocket('wss://app.onluyen.vn/ws');
                    ws.onopen = () => {
                        ws.send(JSON.stringify(payload));
                        ws.close();
                    };
                } catch (e) {
                    // WebSocket failed, ignore
                }
            }

        } catch (error) {
            console.error('❌ Error sending fake event:', error);
        }
    }

    // Simulate various events
    function simulateEvents() {
        const events = [
            'OUTSCREEN',
            'INSCREEN',
            'TAB_SWITCH',
            'WINDOW_BLUR',
            'WINDOW_FOCUS',
            'PAGE_VISIBLE',
            'PAGE_HIDDEN'
        ];

        if (config.autoMode) {
            // In auto mode, randomly send different events
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            sendFakeEvent(randomEvent);
        } else {
            // Default to OUTSCREEN event
            sendFakeEvent('OUTSCREEN');
        }
    }

    // Interval management
    let intervalId = null;

    function startFakeEvents() {
        if (!config.enabled) return;
        
        stopFakeEvents(); // Clear any existing interval
        
        // Send initial event
        simulateEvents();
        
        // Set up interval
        intervalId = setInterval(() => {
            simulateEvents();
        }, config.interval);
        
        console.log(`⏰ Fake events started with interval: ${config.interval}ms`);
    }

    function stopFakeEvents() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log('⏹️ Fake events stopped');
        }
    }

    // Update configuration
    function updateConfig(newConfig) {
        const wasEnabled = config.enabled;
        config = { ...config, ...newConfig };
        
        // Validate email format for userName
        if (config.userName && !config.userName.includes('@')) {
            // Auto-append domain if missing
            if (!config.userName.endsWith('.edu.vn')) {
                config.userName = config.userName + '@haiphong.edu.vn';
            }
        }
        
        // Save to localStorage
        localStorage.setItem('fakeEventConfig', JSON.stringify(config));
        
        // Restart if needed
        if (config.enabled && !wasEnabled) {
            startFakeEvents();
        } else if (!config.enabled && wasEnabled) {
            stopFakeEvents();
        } else if (config.enabled) {
            startFakeEvents(); // Restart with new settings
        }
        
        console.log('📝 Config updated:', config);
    }

    // Load saved configuration
    function loadConfig() {
        try {
            const saved = localStorage.getItem('fakeEventConfig');
            if (saved) {
                config = { ...config, ...JSON.parse(saved) };
                console.log('📂 Loaded saved config:', config);
            }
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }

    // Initialize
    loadConfig();

    // Expose API to window
    window.__fakeEvent = {
        updateConfig,
        sendFakeEvent,
        startFakeEvents,
        stopFakeEvents,
        getConfig: () => ({ ...config }),
        extractPageInfo,
        
        // Quick methods
        enable: (userName) => {
            updateConfig({ enabled: true, userName });
        },
        disable: () => {
            updateConfig({ enabled: false });
        },
        setInterval: (ms) => {
            updateConfig({ interval: ms });
        },
        setAutoMode: (enabled) => {
            updateConfig({ autoMode: enabled });
        },
        setIds: (testId, examId, userId) => {
            updateConfig({ testId, examId, userId });
        }
    };

    // Auto-start if previously enabled
    if (config.enabled && config.userName) {
        startFakeEvents();
    }

    console.log('✅ Fake Event System ready. Use window.__fakeEvent to control.');
})();