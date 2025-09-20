// anti-tracking.js - Ultra Advanced Anti-Tracking & Human Simulation System
(() => {
    'use strict';
    
    // Check if already initialized
    if (window.__antiTrackingActive) return;
    window.__antiTrackingActive = true;

    console.log('🛡️ Anti-Tracking System v2.0 Activated');

    // ===== IPC Renderer Support =====
    let ipcRenderer = null;
    try { 
        ipcRenderer = require('electron').ipcRenderer; 
    } catch(e) {
        console.log('Running in non-Electron environment');
    }

    // ===== 1. TAB ALWAYS ACTIVE & VISIBILITY SPOOFING =====
    const fakeDocument = {
        hidden: false,
        visibilityState: 'visible',
        hasFocus: () => true,
        webkitHidden: false,
        mozHidden: false,
        msHidden: false
    };
    
    Object.keys(fakeDocument).forEach(prop => {
        try {
            if (typeof fakeDocument[prop] === 'function') {
                document[prop] = fakeDocument[prop];
            } else {
                Object.defineProperty(document, prop, {
                    get: () => fakeDocument[prop],
                    configurable: true
                });
            }
        } catch(e) {}
    });

    // Window focus state
    window.onblur = null;
    window.onfocus = null;
    Object.defineProperty(window, 'onblur', { value: null, writable: false });
    Object.defineProperty(window, 'onfocus', { value: null, writable: false });

    // ===== 2. BLOCK TRACKING EVENTS =====
    const blockEvents = [
        'visibilitychange', 'webkitvisibilitychange', 'mozvisibilitychange', 'msvisibilitychange',
        'blur', 'focus', 'focusin', 'focusout',
        'mouseleave', 'mouseenter', 'mouseout', 'mouseover',
        'pagehide', 'pageshow', 'beforeunload', 'unload'
    ];

    blockEvents.forEach(eventName => {
        document.addEventListener(eventName, e => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
        }, true);
        
        window.addEventListener(eventName, e => {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
        }, true);
    });

    // ===== 3. FAKE HEARTBEAT & ACTIVITY SIGNALS =====
    const sendHeartbeat = () => {
        const data = {
            time: Date.now(),
            active: true,
            focused: true,
            visibility: 'visible'
        };
        
        if (ipcRenderer) {
            ipcRenderer.send('user-alive', data);
        } else {
            // Try multiple endpoints
            ['heartbeat', 'ping', 'alive', 'status'].forEach(endpoint => {
                fetch(`/${endpoint}`, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' }
                }).catch(() => {});
            });
        }
    };
    
    setInterval(sendHeartbeat, 1500 + Math.random() * 1000);

    // ===== 4. ADVANCED RANDOM UTILITIES =====
    const rand = (min, max) => min + Math.random() * (max - min);
    const randInt = (min, max) => Math.floor(rand(min, max));
    const chance = (probability) => Math.random() < probability;

    // ===== 5. HUMAN-LIKE MOUSE MOVEMENT WITH PHYSICS =====
    class MouseSimulator {
        constructor() {
            this.lastX = rand(100, window.innerWidth - 100);
            this.lastY = rand(100, window.innerHeight - 100);
            this.velocity = { x: 0, y: 0 };
            this.acceleration = 0.2;
            this.friction = 0.95;
        }

        simulate() {
            // Generate target with intelligent positioning
            const targetX = this.getIntelligentTarget('x');
            const targetY = this.getIntelligentTarget('y');
            
            // Bezier curve control points
            const cp1X = (this.lastX + targetX) / 2 + rand(-100, 100);
            const cp1Y = (this.lastY + targetY) / 2 + rand(-100, 100);
            const cp2X = (this.lastX + targetX) / 2 + rand(-80, 80);
            const cp2Y = (this.lastY + targetY) / 2 + rand(-80, 80);
            
            const steps = randInt(30, 60);
            const baseSpeed = rand(5, 15);
            
            for (let i = 0; i <= steps; i++) {
                setTimeout(() => {
                    let t = i / steps;
                    // Easing function for natural acceleration
                    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    
                    // Cubic Bezier interpolation
                    const x = Math.pow(1-t, 3) * this.lastX + 
                             3 * Math.pow(1-t, 2) * t * cp1X + 
                             3 * (1-t) * t * t * cp2X + 
                             t * t * t * targetX;
                    
                    const y = Math.pow(1-t, 3) * this.lastY + 
                             3 * Math.pow(1-t, 2) * t * cp1Y + 
                             3 * (1-t) * t * t * cp2Y + 
                             t * t * t * targetY;
                    
                    // Add micro jitter for realism
                    const jitterX = x + rand(-0.5, 0.5);
                    const jitterY = y + rand(-0.5, 0.5);
                    
                    this.dispatchMouseEvent(jitterX, jitterY);
                    
                    // Random micro-pauses (human hesitation)
                    if (chance(0.05)) {
                        setTimeout(() => {
                            this.dispatchMouseEvent(jitterX + rand(-2, 2), jitterY + rand(-2, 2));
                        }, rand(50, 150));
                    }
                    
                    if (i === steps) {
                        this.lastX = targetX;
                        this.lastY = targetY;
                    }
                }, i * baseSpeed + rand(-2, 2));
            }
        }

        getIntelligentTarget(axis) {
            const max = axis === 'x' ? window.innerWidth : window.innerHeight;
            const current = axis === 'x' ? this.lastX : this.lastY;
            
            // Bias towards center and interactive areas
            const center = max / 2;
            const distFromCenter = Math.abs(current - center);
            
            if (distFromCenter > max * 0.3 && chance(0.6)) {
                // Move towards center
                return center + rand(-100, 100);
            } else {
                // Random movement
                return rand(50, max - 50);
            }
        }

        dispatchMouseEvent(x, y) {
            const event = new MouseEvent('mousemove', {
                clientX: x,
                clientY: y,
                screenX: x,
                screenY: y,
                bubbles: true,
                cancelable: true,
                view: window
            });
            document.dispatchEvent(event);
        }
    }

    // ===== 6. INTELLIGENT SCROLL SIMULATION =====
    class ScrollSimulator {
        constructor() {
            this.currentY = 0;
            this.maxScroll = document.body.scrollHeight - window.innerHeight;
        }

        simulate() {
            if (this.maxScroll <= 0) return;
            
            const direction = this.currentY > this.maxScroll * 0.7 ? -1 : 
                            this.currentY < this.maxScroll * 0.3 ? 1 : 
                            (Math.random() > 0.5 ? 1 : -1);
            
            const distance = rand(50, 300) * direction;
            const targetY = Math.max(0, Math.min(this.maxScroll, this.currentY + distance));
            const steps = randInt(10, 20);
            const duration = rand(300, 600);
            
            for (let i = 0; i <= steps; i++) {
                setTimeout(() => {
                    const progress = i / steps;
                    const eased = progress < 0.5 
                        ? 2 * progress * progress 
                        : -1 + (4 - 2 * progress) * progress;
                    
                    const y = this.currentY + (targetY - this.currentY) * eased;
                    window.scrollTo({
                        top: y,
                        behavior: 'auto'
                    });
                    
                    if (i === steps) {
                        this.currentY = targetY;
                    }
                }, (duration / steps) * i);
            }
        }
    }

    // ===== 7. INTELLIGENT CLICK SIMULATION =====
    class ClickSimulator {
        constructor() {
            this.clickableSelectors = [
                'a', 'button', 'input', 'select', 'textarea',
                '[role="button"]', '[onclick]', '.btn', '.link',
                '[class*="click"]', '[class*="button"]'
            ];
        }

        simulate() {
            if (!chance(0.02)) return;
            
            const elements = document.querySelectorAll(this.clickableSelectors.join(','));
            const visibleElements = Array.from(elements).filter(el => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return rect.width > 0 && rect.height > 0 && 
                       style.display !== 'none' && 
                       style.visibility !== 'hidden' &&
                       rect.top >= 0 && rect.top < window.innerHeight;
            });
            
            if (visibleElements.length > 0) {
                const target = visibleElements[randInt(0, visibleElements.length)];
                const rect = target.getBoundingClientRect();
                const x = rect.left + rect.width / 2 + rand(-5, 5);
                const y = rect.top + rect.height / 2 + rand(-5, 5);
                
                // Hover before click
                this.dispatchEvent('mouseover', x, y, target);
                
                setTimeout(() => {
                    this.dispatchEvent('mousedown', x, y, target);
                    setTimeout(() => {
                        this.dispatchEvent('mouseup', x, y, target);
                        this.dispatchEvent('click', x, y, target);
                    }, rand(50, 150));
                }, rand(100, 300));
            }
        }

        dispatchEvent(type, x, y, target) {
            const event = new MouseEvent(type, {
                clientX: x,
                clientY: y,
                bubbles: true,
                cancelable: true,
                view: window
            });
            target.dispatchEvent(event);
        }
    }

    // ===== 8. KEYBOARD SIMULATION =====
    class KeyboardSimulator {
        constructor() {
            this.commonKeys = [
                'Tab', 'Enter', 'Space', 'Escape',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Home', 'End', 'PageUp', 'PageDown'
            ];
            this.typingKeys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
        }

        simulate() {
            if (!chance(0.01)) return;
            
            const activeElement = document.activeElement;
            const isTyping = activeElement && 
                            (activeElement.tagName === 'INPUT' || 
                             activeElement.tagName === 'TEXTAREA');
            
            if (isTyping && chance(0.7)) {
                // Type random characters
                this.simulateTyping(activeElement);
            } else {
                // Press navigation keys
                this.simulateNavigation();
            }
        }

        simulateTyping(element) {
            const text = this.generateRealisticText();
            for (let i = 0; i < text.length; i++) {
                setTimeout(() => {
                    this.dispatchKeyEvent('keydown', text[i]);
                    element.value += text[i];
                    this.dispatchKeyEvent('keyup', text[i]);
                }, i * rand(50, 200));
            }
        }

        simulateNavigation() {
            const key = this.commonKeys[randInt(0, this.commonKeys.length)];
            this.dispatchKeyEvent('keydown', key);
            setTimeout(() => {
                this.dispatchKeyEvent('keyup', key);
            }, rand(50, 150));
        }

        generateRealisticText() {
            const words = ['test', 'hello', 'data', 'user', 'admin', 'login'];
            return words[randInt(0, words.length)];
        }

        dispatchKeyEvent(type, key) {
            const event = new KeyboardEvent(type, {
                key: key,
                code: key,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }
    }

    // ===== 9. MAIN SIMULATION CONTROLLER =====
    class HumanSimulator {
        constructor() {
            this.mouse = new MouseSimulator();
            this.scroll = new ScrollSimulator();
            this.click = new ClickSimulator();
            this.keyboard = new KeyboardSimulator();
            this.activityLevel = 'normal'; // low, normal, high
            this.isActive = true;
        }

        start() {
            this.scheduleNextAction();
        }

        stop() {
            this.isActive = false;
        }

        scheduleNextAction() {
            if (!this.isActive) return;
            
            const delays = {
                low: [2000, 5000],
                normal: [800, 2500],
                high: [300, 1000]
            };
            
            const [min, max] = delays[this.activityLevel];
            
            setTimeout(() => {
                this.performRandomAction();
                this.scheduleNextAction();
            }, rand(min, max));
        }

        performRandomAction() {
            const weights = {
                mouse: 0.5,
                scroll: 0.25,
                click: 0.15,
                keyboard: 0.1
            };
            
            const random = Math.random();
            let cumulative = 0;
            
            for (const [action, weight] of Object.entries(weights)) {
                cumulative += weight;
                if (random < cumulative) {
                    this[action].simulate();
                    break;
                }
            }
        }

        setActivityLevel(level) {
            if (['low', 'normal', 'high'].includes(level)) {
                this.activityLevel = level;
                console.log(`Activity level set to: ${level}`);
            }
        }
    }

    // ===== 10. FINGERPRINT PROTECTION =====
    const protectFingerprint = () => {
        // Random Canvas fingerprint
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillText(Math.random().toString(), 0, 0);
            return originalToDataURL.apply(this, arguments);
        };

        // Random WebGL fingerprint
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter.apply(this, arguments);
        };

        // Random Audio fingerprint
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const originalCreateOscillator = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function() {
                const oscillator = originalCreateOscillator.apply(this, arguments);
                oscillator.frequency.value = oscillator.frequency.value * (1 + Math.random() * 0.0001);
                return oscillator;
            };
        }
    };

    // ===== 11. TIMEZONE & LOCALE SPOOFING =====
    const spoofTimezone = () => {
        const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
        const randomTimezone = timezones[randInt(0, timezones.length)];
        
        Date.prototype.getTimezoneOffset = function() {
            const offsets = { 
                'America/New_York': 300,
                'Europe/London': 0,
                'Asia/Tokyo': -540,
                'Australia/Sydney': -660
            };
            return offsets[randomTimezone] || 0;
        };
    };

    // ===== 12. NETWORK REQUEST INTERCEPTOR =====
    const interceptRequests = () => {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            
            // Block tracking endpoints
            const trackingPatterns = [
                /analytics/i, /tracking/i, /telemetry/i, /metrics/i,
                /google-analytics/i, /facebook\.com\/tr/i, /doubleclick/i
            ];
            
            if (trackingPatterns.some(pattern => pattern.test(url))) {
                console.log(`🚫 Blocked tracking request: ${url}`);
                return Promise.resolve(new Response('', { status: 204 }));
            }
            
            return originalFetch.apply(this, args);
        };

        // Also intercept XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            const trackingPatterns = [
                /analytics/i, /tracking/i, /telemetry/i, /metrics/i
            ];
            
            if (trackingPatterns.some(pattern => pattern.test(url))) {
                console.log(`🚫 Blocked XHR tracking request: ${url}`);
                this.abort();
                return;
            }
            
            return originalOpen.apply(this, arguments);
        };
    };

    // ===== 13. INITIALIZE AND START =====
    const initialize = () => {
        protectFingerprint();
        spoofTimezone();
        interceptRequests();
        
        const simulator = new HumanSimulator();
        simulator.start();
        
        // Expose control methods to window for external control
        window.__antiTracking = {
            simulator: simulator,
            setActivityLevel: (level) => simulator.setActivityLevel(level),
            stop: () => {
                simulator.stop();
                window.__antiTrackingActive = false;
                console.log('🛡️ Anti-Tracking System Deactivated');
            },
            restart: () => {
                simulator.isActive = true;
                simulator.start();
                console.log('🛡️ Anti-Tracking System Reactivated');
            }
        };
        
        // Listen for configuration updates from main process
        if (ipcRenderer) {
            ipcRenderer.on('update-anti-tracking', (event, config) => {
                if (config.activityLevel) {
                    simulator.setActivityLevel(config.activityLevel);
                }
                if (config.enabled === false) {
                    window.__antiTracking.stop();
                } else if (config.enabled === true) {
                    window.__antiTracking.restart();
                }
            });
        }
        
        console.log('✅ All anti-tracking measures active');
        console.log('📊 Features: Tab Spoofing | Human Simulation | Fingerprint Protection | Request Blocking');
    };

    // Start the system
    initialize();
})();