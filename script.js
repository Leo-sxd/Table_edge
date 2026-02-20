/**
 * ============================================
 * 整合后的JavaScript文件 - script.js
 * 包含：粒子效果 + 主脚本 + 诗句模块
 * ============================================
 */
// ==================== 语音输入提示音管理器 ====================
class VoiceSoundManager {
    constructor() {
        this.audioContext = null;
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('[VoiceSound] 浏览器不支持Web Audio API');
        }
    }
    
    // 恢复音频上下文（处理浏览器自动播放策略）
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    // 播放开启提示音（上升音调，表示开始）
    playStartSound() {
        this.resumeContext().then(() => {
            setTimeout(() => {
                this.generateTone(880, 0.4, 'sine', 0.7); // A5音符，0.4秒，正弦波，音量0.7
                setTimeout(() => {
                    this.generateTone(1100, 0.3, 'sine', 0.7); // 更高音调，形成上升效果
                }, 100);
            }, 500); // 延迟0.5秒播放
        });
    }
    
    // 播放关闭提示音（下降音调，表示结束）
    playStopSound() {
        this.resumeContext().then(() => {
            setTimeout(() => {
                this.generateTone(1100, 0.4, 'sine', 0.7); // 高音开始
                setTimeout(() => {
                    this.generateTone(880, 0.3, 'sine', 0.7); // 下降到低音
                }, 100);
            }, 500); // 延迟0.5秒播放
        });
    }
    
    // 生成音调
    generateTone(frequency, duration, type = 'sine', volume = 0.7) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        // 设置音量（0.7约等于70%音量，在60-80分贝范围内）
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
}

// 创建全局实例
window.voiceSoundManager = new VoiceSoundManager();

// ==================== AI网站控制功能 ====================
class AIWebsiteController {
    constructor() {
        this.pendingCode = null;
        this.isInitialized = false;
        
        // 如果DOM已加载，立即初始化
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            this.init();
        } else {
            // 否则等待DOM加载完成
            document.addEventListener('DOMContentLoaded', () => this.init());
        }
    }
    
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        console.log('[AIControl] 开始初始化...');
        
        const input = document.getElementById('ai-control-input');
        const sendBtn = document.getElementById('ai-control-send');
        const examples = document.querySelectorAll('.example-tag');
        
        console.log('[AIControl] 元素检查:', { input: !!input, sendBtn: !!sendBtn, examples: examples.length });
        
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[AIControl] 发送按钮被点击');
                this.handleControl();
            });
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('[AIControl] 回车键被按下');
                    this.handleControl();
                }
            });
        }
        
        // 提示标签仅显示提示，不触发操作
        // 用户直接在输入框中输入指令
        
        // 语音输入按钮
        this.voiceBtn = document.getElementById('ai-control-voice-btn');
        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        }
        
        // 初始化语音识别
        this.initSpeechRecognition();
        
        // 加载语音设置
        this.loadVoiceSettings();
        
        console.log('[AIControl] 初始化完成');
    }
    
    // 初始化语音识别
    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('[AIControl] 浏览器不支持语音识别');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN';
        
        this.recognition.onstart = () => {
            console.log('[AIControl] 语音识别已启动');
            this.isRecording = true;
            this.updateVoiceButtonState(true);
            // 播放开启提示音
            if (window.voiceSoundManager) {
                window.voiceSoundManager.playStartSound();
            }
            // 非一键常开模式下启动静音检测（给用户3秒时间开始说话）
            if (!this.voiceAlwaysOn) {
                this.clearSilenceTimer();
                this.silenceTimer = setTimeout(() => {
                    if (this.isRecording && !this.voiceAlwaysOn) {
                        console.log('[AIControl] 用户未说话，自动停止录音');
                        this.stopVoiceInput();
                    }
                }, 3000); // 3秒后开始检测
            }
        };
        
        this.recognition.onend = () => {
            console.log('[AIControl] 语音识别已结束');
            this.isRecording = false;
            this.updateVoiceButtonState(false);
            
            if (this.voiceAlwaysOn && !this.isPaused) {
                setTimeout(() => {
                    if (this.voiceAlwaysOn && !this.isRecording) {
                        this.startVoiceInput().catch(err => {
                            console.error('[AIControl] 自动重启失败:', err);
                        });
                    }
                }, 500);
            }
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            const input = document.getElementById('ai-control-input');
            if (input) {
                if (finalTranscript) {
                    input.value = finalTranscript;
                    // 不再立即关闭，让1.5秒静音检测计时器来控制关闭
                } else if (interimTranscript) {
                    input.value = interimTranscript;
                }
            }
            
            // 重置静音检测计时器
            this.resetSilenceTimer();
        };
        
        this.recognition.onerror = (event) => {
            console.error('[AIControl] 语音识别错误:', event.error);
            this.isRecording = false;
            this.updateVoiceButtonState(false);
        };
    }
    
    toggleVoiceInput() {
        if (!this.recognition) {
            alert('您的浏览器不支持语音识别功能');
            return;
        }
        if (this.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    startVoiceInput() {
        if (!this.recognition) return Promise.reject('不支持语音识别');
        if (this.isRecording) return Promise.resolve();
        return new Promise((resolve, reject) => {
            try {
                this.recognition.start();
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }
    
    stopVoiceInput() {
        if (!this.recognition || !this.isRecording) return;
        this.recognition.stop();
        this.isPaused = true;
        // 清除静音检测计时器
        this.clearSilenceTimer();
        setTimeout(() => { this.isPaused = false; }, 3000);
    }
    
    // 重置静音检测计时器
    resetSilenceTimer() {
        // 清除之前的计时器
        this.clearSilenceTimer();
        
        // 非一键常开模式下才需要静音检测
        if (this.voiceAlwaysOn) {
            console.log('[AIControl] 一键常开模式，跳过静音检测');
            return;
        }
        
        console.log('[AIControl] 重置静音检测计时器（1.5秒后自动关闭）');
        
        // 设置新的计时器：1.5秒静音后自动停止
        this.silenceTimer = setTimeout(() => {
            console.log('[AIControl] 计时器触发，检查状态...');
            console.log('[AIControl] isRecording:', this.isRecording, 'voiceAlwaysOn:', this.voiceAlwaysOn);
            if (this.isRecording && !this.voiceAlwaysOn) {
                console.log('[AIControl] 检测到说话结束，自动停止录音');
                this.stopVoiceInput();
                // 如果有内容，执行控制命令
                const input = document.getElementById('ai-control-input');
                if (input && input.value.trim()) {
                    this.handleControl();
                }
            }
        }, 1500); // 1.5秒静音后停止
    }
    
    // 清除静音检测计时器
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    updateVoiceButtonState(isRecording) {
        if (this.voiceBtn) {
            if (isRecording) {
                this.voiceBtn.classList.add('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            } else {
                this.voiceBtn.classList.remove('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }
    
    loadVoiceSettings() {
        const alwaysOn = localStorage.getItem('aiControlVoiceAlwaysOn') === 'true';
        this.voiceAlwaysOn = alwaysOn;
        const toggle = document.getElementById('ai-control-voice-toggle');
        if (toggle) toggle.checked = alwaysOn;
        
        this.voiceShortcut = localStorage.getItem('aiControlVoiceShortcut') || '';
        const shortcutInput = document.getElementById('ai-control-voice-shortcut');
        if (shortcutInput) shortcutInput.value = this.voiceShortcut;
        
        this.bindVoiceSettingsEvents();
    }
    
    bindVoiceSettingsEvents() {
        const toggle = document.getElementById('ai-control-voice-toggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.voiceAlwaysOn = e.target.checked;
                localStorage.setItem('aiControlVoiceAlwaysOn', this.voiceAlwaysOn);
                this.showStatus(this.voiceAlwaysOn ? 'AI控制语音输入一键常开已启用' : 'AI控制语音输入一键常开已关闭', 'success');
            });
        }
        
        const shortcutInput = document.getElementById('ai-control-voice-shortcut');
        if (shortcutInput) {
            shortcutInput.addEventListener('keydown', (e) => {
                e.preventDefault();
                const keys = [];
                if (e.ctrlKey) keys.push('Ctrl');
                if (e.altKey) keys.push('Alt');
                if (e.shiftKey) keys.push('Shift');
                if (e.metaKey) keys.push('Meta');
                if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                    keys.push(e.key.toUpperCase());
                }
                if (keys.length > 0) {
                    const shortcut = keys.join('+');
                    this.voiceShortcut = shortcut;
                    shortcutInput.value = shortcut;
                    localStorage.setItem('aiControlVoiceShortcut', shortcut);
                }
            });
        }
        
        const clearBtn = document.getElementById('clear-ai-control-voice-shortcut');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.voiceShortcut = '';
                if (shortcutInput) shortcutInput.value = '';
                localStorage.removeItem('aiControlVoiceShortcut');
            });
        }
    }
    
    handleVoiceShortcut(e) {
        if (!this.voiceShortcut) return false;
        const keys = this.voiceShortcut.split('+');
        const hasCtrl = keys.includes('Ctrl');
        const hasAlt = keys.includes('Alt');
        const hasShift = keys.includes('Shift');
        const hasMeta = keys.includes('Meta');
        const mainKey = keys.find(k => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(k));
        
        if (e.ctrlKey === hasCtrl && e.altKey === hasAlt && 
            e.shiftKey === hasShift && e.metaKey === hasMeta && 
            e.key.toUpperCase() === mainKey) {
            e.preventDefault();
            
            // 强制停止正在进行的朗读（无论当前状态如何）
            if (window.voiceManager) {
                console.log('[AIControl] 强制停止当前朗读');
                window.voiceManager.stop();
            }
            
            this.toggleVoiceInput();
            return true;
        }
        return false;
    }
    
    async handleControl() {
        try {
            const input = document.getElementById('ai-control-input');
            if (!input) {
                console.error('[AIControl] 找不到输入框元素');
                return;
            }
            
            const command = input.value.trim();
            
            if (!command) {
                console.log('[AIControl] 输入为空');
                return;
            }
            
            console.log('[AIControl] 收到指令:', command);
            
            const localResult = this.parseLocalCommand(command);
            if (localResult) {
                console.log('[AIControl] 本地解析成功，直接执行:', localResult);
                this.executeCode(localResult, command);
                return;
            }
            
            console.log('[AIControl] 本地无法解析，调用AI...');
            
            try {
                const code = await this.callAIForCode(command);
                if (code) {
                    this.executeCode(code, command);
                } else {
                    this.showStatus('AI无法解析该指令', 'error');
                }
            } catch (error) {
                console.error('[AIControl] API调用失败:', error);
                this.showStatus('AI解析失败: ' + error.message, 'error');
            }
        } catch (e) {
            console.error('[AIControl] handleControl错误:', e);
            this.showStatus('处理指令时出错: ' + e.message, 'error');
        }
    }
    
    // 直接执行代码
    executeCode(code, originalCommand) {
        try {
            console.log('[AIControl] 执行代码:', code);
            const func = new Function(code);
            func();
            
            // 显示成功状态
            this.showStatus('指令已执行: ' + originalCommand, 'success');
            
            // 清空输入
            const input = document.getElementById('ai-control-input');
            if (input) input.value = '';
            
        } catch (error) {
            console.error('[AIControl] 执行失败:', error);
            this.showStatus('执行失败: ' + error.message, 'error');
        }
    }
    
    // 显示状态提示
    showStatus(message, type = 'success') {
        const toast = document.getElementById('ai-status-toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = 'ai-status-toast show ' + type;
        
        // 3秒后自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    parseLocalCommand(command) {
        const cmd = command.toLowerCase();
        
        // 背景图片设置
        const backgrounds = {
            '晨露之森': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920',
            '森林': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920',
            '沧浪之水': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
            '水': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
            '海': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920',
            '自然之桥': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920',
            '自然': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920',
            '精骛八极': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920',
            '太空': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920',
            '星空': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920',
        };
        
        for (const [name, url] of Object.entries(backgrounds)) {
            if (cmd.includes(name)) {
                return `document.body.style.backgroundImage = 'url(${url})'; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center';`;
            }
        }
        
        // 背景颜色设置
        if (cmd.includes('背景') || cmd.includes('底色') || cmd.includes('换肤') || cmd.includes('纯色')) {
            const colors = {
                '蓝': '#1a1a2e', '深蓝': '#1a1a2e', '黑': '#0f0f1e',
                '紫': '#2d1b4e', '绿': '#1a2e1a', '红': '#2e1a1a', '灰': '#2a2a3a',
                '白': '#f0f0f5', '黄': '#2e2e1a', '橙': '#2e251a'
            };
            
            for (const [name, color] of Object.entries(colors)) {
                if (cmd.includes(name)) {
                    return `document.body.style.background = 'linear-gradient(135deg, ${color} 0%, #16213e 100%)'; document.body.style.backgroundImage = '';`;
                }
            }
        }
        
        // 鼠标拖尾/视觉防疲劳效果
        if (cmd.includes('鼠标') || cmd.includes('拖尾') || cmd.includes('防疲劳') || cmd.includes('视觉')) {
            if (cmd.includes('开') || cmd.includes('启')) {
                return `if(window.mouseTrailEffect) window.mouseTrailEffect.setEnabled(true); if(window.settingsManager && window.settingsManager.mouseTrailToggle) window.settingsManager.mouseTrailToggle.checked = true;`;
            }
            if (cmd.includes('关') || cmd.includes('停')) {
                return `if(window.mouseTrailEffect) window.mouseTrailEffect.setEnabled(false); if(window.settingsManager && window.settingsManager.mouseTrailToggle) window.settingsManager.mouseTrailToggle.checked = false;`;
            }
        }
        
        // 屏保控制
        if (cmd.includes('屏保') || cmd.includes('屏幕保护')) {
            if (cmd.includes('开') || cmd.includes('启')) {
                return `if(window.screenSaver) window.screenSaver.setEnabled(true); if(window.settingsManager && window.settingsManager.screenSaverToggle) window.settingsManager.screenSaverToggle.checked = true; if(window.settingsManager && window.settingsManager.screenSaverTimeControl) window.settingsManager.screenSaverTimeControl.style.display = 'block';`;
            }
            if (cmd.includes('关') || cmd.includes('停')) {
                return `if(window.screenSaver) { window.screenSaver.setEnabled(false); window.screenSaver.deactivate(); } if(window.settingsManager && window.settingsManager.screenSaverToggle) window.settingsManager.screenSaverToggle.checked = false; if(window.settingsManager && window.settingsManager.screenSaverTimeControl) window.settingsManager.screenSaverTimeControl.style.display = 'none';`;
            }
            // 设置屏保时间
            const timeMatch = cmd.match(/(\d+)/);
            if (timeMatch) {
                const seconds = timeMatch[1];
                return `if(window.screenSaver) window.screenSaver.setTimeout(${seconds}); if(window.settingsManager && window.settingsManager.screenSaverTimeSlider) window.settingsManager.screenSaverTimeSlider.value = ${seconds}; if(window.settingsManager && window.settingsManager.screenSaverTimeInput) window.settingsManager.screenSaverTimeInput.value = ${seconds};`;
            }
        }
        
        // 粒子效果
        if (cmd.includes('粒子') || cmd.includes('特效')) {
            if (cmd.includes('开') || cmd.includes('启')) {
                return "if(window.particleSystem && window.particleSystem.start) window.particleSystem.start();";
            }
            if (cmd.includes('关') || cmd.includes('停')) {
                return "if(window.particleSystem && window.particleSystem.stop) window.particleSystem.stop();";
            }
        }
        
        // 字体大小
        if (cmd.includes('字体') || cmd.includes('字')) {
            if (cmd.includes('大')) {
                return "document.documentElement.style.fontSize = '18px';";
            }
            if (cmd.includes('小')) {
                return "document.documentElement.style.fontSize = '14px';";
            }
            if (cmd.includes('正常') || cmd.includes('默认')) {
                return "document.documentElement.style.fontSize = '16px';";
            }
        }
        
        // 恢复默认背景
        if (cmd.includes('恢复默认') || cmd.includes('默认背景')) {
            return `document.body.style.backgroundImage = 'url(https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1920)'; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center';`;
        }
        
        return null;
    }
    
    // 初始化语音识别
    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('[AIControl] 浏览器不支持语音识别');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'zh-CN';
        
        this.recognition.onstart = () => {
            console.log('[AIControl] 语音识别已启动');
            this.isRecording = true;
            this.updateVoiceButtonState(true);
            // 播放开启提示音
            if (window.voiceSoundManager) {
                window.voiceSoundManager.playStartSound();
            }
            // 非一键常开模式下启动静音检测（给用户3秒时间开始说话）
            if (!this.voiceAlwaysOn) {
                this.clearSilenceTimer();
                this.silenceTimer = setTimeout(() => {
                    if (this.isRecording && !this.voiceAlwaysOn) {
                        console.log('[AIControl] 用户未说话，自动停止录音');
                        this.stopVoiceInput();
                    }
                }, 3000); // 3秒后开始检测
            }
        };
        
        this.recognition.onend = () => {
            console.log('[AIControl] 语音识别已结束');
            this.isRecording = false;
            this.updateVoiceButtonState(false);
            
            // 播放关闭提示音（如果不是自动重启）
            if (window.voiceSoundManager && (!this.voiceAlwaysOn || this.isPaused)) {
                window.voiceSoundManager.playStopSound();
            }
            
            // 如果一键常开模式开启，自动重启
            if (this.voiceAlwaysOn && !this.isPaused) {
                setTimeout(() => {
                    if (this.voiceAlwaysOn && !this.isRecording) {
                        this.startVoiceInput().catch(err => {
                            console.error('[AIControl] 自动重启失败:', err);
                        });
                    }
                }, 500);
            }
        };
        
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // 更新输入框
            const input = document.getElementById('ai-control-input');
            if (input) {
                if (finalTranscript) {
                    input.value = finalTranscript;
                    // 如果不是一键常开模式，自动执行
                    if (!this.voiceAlwaysOn) {
                        this.handleControl();
                    }
                } else if (interimTranscript) {
                    input.value = interimTranscript;
                }
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('[AIControl] 语音识别错误:', event.error);
            this.isRecording = false;
            this.updateVoiceButtonState(false);
        };
    }
    
    // 切换语音输入
    toggleVoiceInput() {
        if (!this.recognition) {
            alert('您的浏览器不支持语音识别功能');
            return;
        }
        
        // 强制停止正在进行的朗读（无论当前状态如何）
        if (window.voiceManager) {
            console.log('[AIControl] 强制停止当前朗读');
            window.voiceManager.stop();
        }
        
        if (this.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    // 启动语音输入
    startVoiceInput() {
        if (!this.recognition) {
            return Promise.reject('不支持语音识别');
        }
        
        if (this.isRecording) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            try {
                this.recognition.start();
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }
    
    // 停止语音输入
    stopVoiceInput() {
        if (!this.recognition || !this.isRecording) {
            return;
        }
        
        this.recognition.stop();
        this.isPaused = true;
        
        // 3秒后恢复自动重启
        setTimeout(() => {
            this.isPaused = false;
        }, 3000);
    }
    
    // 更新语音按钮状态
    updateVoiceButtonState(isRecording) {
        if (this.voiceBtn) {
            if (isRecording) {
                this.voiceBtn.classList.add('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            } else {
                this.voiceBtn.classList.remove('recording');
                this.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }
    
    // 加载语音设置
    loadVoiceSettings() {
        // 一键常开模式
        const alwaysOn = localStorage.getItem('aiControlVoiceAlwaysOn') === 'true';
        this.voiceAlwaysOn = alwaysOn;
        
        const toggle = document.getElementById('ai-control-voice-toggle');
        if (toggle) {
            toggle.checked = alwaysOn;
        }
        
        // 快捷键
        this.voiceShortcut = localStorage.getItem('aiControlVoiceShortcut') || '';
        const shortcutInput = document.getElementById('ai-control-voice-shortcut');
        if (shortcutInput) {
            shortcutInput.value = this.voiceShortcut;
        }
        
        // 绑定设置事件
        this.bindVoiceSettingsEvents();
    }
    
    // 绑定语音设置事件
    bindVoiceSettingsEvents() {
        // 一键常开开关
        const toggle = document.getElementById('ai-control-voice-toggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.voiceAlwaysOn = e.target.checked;
                localStorage.setItem('aiControlVoiceAlwaysOn', this.voiceAlwaysOn);
                this.showStatus(this.voiceAlwaysOn ? 'AI控制语音输入一键常开已启用' : 'AI控制语音输入一键常开已关闭', 'success');
            });
        }
        
        // 快捷键设置
        const shortcutInput = document.getElementById('ai-control-voice-shortcut');
        if (shortcutInput) {
            shortcutInput.addEventListener('keydown', (e) => {
                e.preventDefault();
                const keys = [];
                if (e.ctrlKey) keys.push('Ctrl');
                if (e.altKey) keys.push('Alt');
                if (e.shiftKey) keys.push('Shift');
                if (e.metaKey) keys.push('Meta');
                if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                    keys.push(e.key.toUpperCase());
                }
                
                if (keys.length > 0) {
                    const shortcut = keys.join('+');
                    this.voiceShortcut = shortcut;
                    shortcutInput.value = shortcut;
                    localStorage.setItem('aiControlVoiceShortcut', shortcut);
                }
            });
        }
        
        // 清除快捷键
        const clearBtn = document.getElementById('clear-ai-control-voice-shortcut');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.voiceShortcut = '';
                if (shortcutInput) shortcutInput.value = '';
                localStorage.removeItem('aiControlVoiceShortcut');
            });
        }
    }
    
    // 处理语音快捷键
    handleVoiceShortcut(e) {
        if (!this.voiceShortcut) return false;
        
        const keys = this.voiceShortcut.split('+');
        const hasCtrl = keys.includes('Ctrl');
        const hasAlt = keys.includes('Alt');
        const hasShift = keys.includes('Shift');
        const hasMeta = keys.includes('Meta');
        const mainKey = keys.find(k => !['Ctrl', 'Alt', 'Shift', 'Meta'].includes(k));
        
        if (e.ctrlKey === hasCtrl && 
            e.altKey === hasAlt && 
            e.shiftKey === hasShift && 
            e.metaKey === hasMeta && 
            e.key.toUpperCase() === mainKey) {
            e.preventDefault();
            this.toggleVoiceInput();
            return true;
        }
        return false;
    }
    
    async callAIForCode(command) {
        const apiKey = localStorage.getItem('doubao_api_key');
        if (!apiKey) {
            throw new Error('请先配置API密钥');
        }
        
        const prompt = `你是一个网站控制代码生成器。用户的指令是："${command}"

请根据指令生成可直接执行的JavaScript代码。要求：
1. 只返回代码，不要任何解释
2. 代码必须安全，只能操作DOM和样式
3. 使用document.querySelector等标准API
4. 如果指令不明确，返回空字符串

请生成代码：`;

        const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'doubao-seed-2-0-pro-260215',
                input: [{
                    role: 'user',
                    content: [{ type: 'input_text', text: prompt }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        let code = '';
        if (data.output && data.output[0] && data.output[0].content) {
            const content = data.output[0].content;
            if (Array.isArray(content)) {
                code = content.map(c => c.text || '').join('');
            } else {
                code = content;
            }
        }
        
code = code.replace(/```javascript\s*/g, '').replace(/```\s*/g, '').trim(); 
        
        return code;
    }
    
    showConfirmModal(code, source) {
        this.pendingCode = code;
        const modal = document.getElementById('code-confirm-modal');
        const preview = document.getElementById('code-preview');
        
        if (preview) {
            preview.textContent = `// 来源: ${source}
${code}`;
        }
        
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    hideConfirmModal() {
        const modal = document.getElementById('code-confirm-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.pendingCode = null;
    }
    
    executeConfirmedCode() {
        if (!this.pendingCode) return;
        
        try {
            console.log('[AIControl] 执行代码:', this.pendingCode);
            const func = new Function(this.pendingCode);
            func();
            
            if (window.doubaoAI) {
                window.doubaoAI.addMessage('system', '网站控制指令已执行');
            }
            
            const input = document.getElementById('ai-control-input');
            if (input) input.value = '';
            
        } catch (error) {
            console.error('[AIControl] 执行失败:', error);
            alert('执行失败: ' + error.message);
        }
        
        this.hideConfirmModal();
    }
}

// ==================== 初始化AI控制 ====================

// ==================== 设置面板控制 ====================
class SettingsManager {
    constructor() {
        // 从localStorage加载设置，或使用默认值
        this.settings = this.loadSettings();
        this.init();
    }
    
    // 默认设置
    getDefaultSettings() {
        return {
            mouseTrail: { enabled: false },
            screenSaver: { enabled: false, timeout: 60 }
        };
    }
    
    // 从localStorage加载设置
    loadSettings() {
        try {
            const saved = localStorage.getItem('backgroundEffectSettings');
            if (saved) {
                return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('加载设置失败:', e);
        }
        return this.getDefaultSettings();
    }
    
    // 保存设置到localStorage
    saveSettings() {
        try {
            localStorage.setItem('backgroundEffectSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('保存设置失败:', e);
        }
    }
    
    init() {
        // 获取DOM元素
        this.mouseTrailToggle = document.getElementById('mouse-trail-toggle');
        this.screenSaverToggle = document.getElementById('screensaver-toggle');
        this.screenSaverTimeSlider = document.getElementById('screensaver-time-slider');
        this.screenSaverTimeInput = document.getElementById('screensaver-time-input');
        this.screenSaverTimeControl = document.getElementById('screensaver-time-control');
        this.settingsBtn = document.getElementById('settings-btn');
        this.modalOverlay = document.getElementById('settings-modal-overlay');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.closeBtn = document.getElementById('close-settings');
        
        // 获取开关和滑块元素
        this.controls = {




        };
        
        // 初始化UI状态
        this.initUI();
        
        // 绑定事件
        this.bindEvents();
        
        // 应用初始设置
        this.applySettings();
    }
    
    initUI() {
        // 设置开关和滑块的初始值
        Object.keys(this.controls).forEach(key => {
            const control = this.controls[key];
            const setting = this.settings[key];
            
            if (control.toggle) control.toggle.checked = setting.enabled;
            if (control.slider) control.slider.value = setting.count;
            if (control.value) control.value.textContent = setting.count;
        });
    }
    
    bindEvents() {
        // 打开/关闭面板
        this.settingsBtn.addEventListener('click', () => this.togglePanel());
        this.closeBtn.addEventListener('click', () => this.closePanel());
        
        // 点击遮罩层关闭
        this.modalBackdrop.addEventListener('click', () => this.closePanel());
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('show')) {
                this.closePanel();
            }
        });
        
        // 绑定各特效控制事件
        
        // 鼠标拖尾开关事件绑定
        if (this.mouseTrailToggle) {
            console.log('Binding mouse trail toggle event');
            // Initialize checkbox state
            if (this.settings.mouseTrail) {
                this.mouseTrailToggle.checked = this.settings.mouseTrail.enabled;
            }
            
            this.mouseTrailToggle.addEventListener('change', (e) => {
                console.log('Mouse trail toggle changed:', e.target.checked);
                if (!this.settings.mouseTrail) {
                    this.settings.mouseTrail = { enabled: false };
                }
                this.settings.mouseTrail.enabled = e.target.checked;
                this.saveSettings();
                
                // Enable/disable mouse trail effect
                if (window.mouseTrailEffect) {
                    window.mouseTrailEffect.setEnabled(e.target.checked);
                    console.log('Mouse trail effect set to:', e.target.checked);
                } else {
                    console.error('mouseTrailEffect not found!');
                }
            });
        } else {
            console.error('mouseTrailToggle element not found!');
        }
        
        // 屏幕保护开关事件绑定
        console.log('Binding screen saver toggle event');
        if (this.screenSaverToggle) {
            console.log('Found screen saver toggle');
            
            // 确保settings中有screenSaver
            if (!this.settings.screenSaver) {
                this.settings.screenSaver = { enabled: false, timeout: 60 };
            }
            
            // 设置初始状态
            this.screenSaverToggle.checked = this.settings.screenSaver.enabled;
            
            // 根据初始状态显示/隐藏时间滑块
            if (this.screenSaverTimeControl) {
                this.screenSaverTimeControl.style.display = 
                    this.settings.screenSaver.enabled ? 'block' : 'none';
                console.log('Time control display:', this.screenSaverTimeControl.style.display);
            }
            
            // 设置时间滑块初始值
            if (this.screenSaverTimeSlider && this.screenSaverTimeValue) {
                this.screenSaverTimeSlider.value = this.settings.screenSaver.timeout;
                this.screenSaverTimeValue.textContent = this.settings.screenSaver.timeout;
            }
            
            // 绑定开关事件
            this.screenSaverToggle.addEventListener('change', (e) => {
                console.log('Screen saver toggle changed:', e.target.checked);
                this.settings.screenSaver.enabled = e.target.checked;
                this.saveSettings();
                
                // 显示/隐藏时间滑块
                if (this.screenSaverTimeControl) {
                    this.screenSaverTimeControl.style.display = 
                        e.target.checked ? 'block' : 'none';
                    console.log('Time control visibility changed to:', 
                        e.target.checked ? 'block' : 'none');
                }
                
                // 启用/禁用屏幕保护
                if (window.screenSaver) {
                    window.screenSaver.setEnabled(e.target.checked);
                }
            });
            
            // 绑定时间滑块和输入框事件
            if (this.screenSaverTimeSlider && this.screenSaverTimeInput) {
                // 初始化值
                this.screenSaverTimeSlider.value = this.settings.screenSaver.timeout;
                this.screenSaverTimeInput.value = this.settings.screenSaver.timeout;
                
                // 滑块事件
                this.screenSaverTimeSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.screenSaverTimeInput.value = value;
                    this.settings.screenSaver.timeout = value;
                    this.saveSettings();
                    
                    if (window.screenSaver) {
                        window.screenSaver.setTimeout(value);
                    }
                });
                
                // 输入框事件
                this.screenSaverTimeInput.addEventListener('input', (e) => {
                    let value = parseInt(e.target.value);
                    
                    // 限制范围
                    if (isNaN(value)) value = 60;
                    if (value < 10) value = 10;
                    if (value > 900) value = 900;
                    
                    // 同步到滑块
                    this.screenSaverTimeSlider.value = value;
                    this.settings.screenSaver.timeout = value;
                    this.saveSettings();
                    
                    if (window.screenSaver) {
                        window.screenSaver.setTimeout(value);
                    }
                });
                
                // 输入框失去焦点时确保值在范围内
                this.screenSaverTimeInput.addEventListener('blur', (e) => {
                    let value = parseInt(e.target.value);
                    if (isNaN(value) || value < 10) value = 10;
                    if (value > 900) value = 900;
                    
                    e.target.value = value;
                    this.screenSaverTimeSlider.value = value;
                    this.settings.screenSaver.timeout = value;
                    this.saveSettings();
                    
                    if (window.screenSaver) {
                        window.screenSaver.setTimeout(value);
                    }
                });
            }
        } else {
            console.error('screenSaverToggle element not found!');
        }
    }
    
    bindEffectControl(controlKey, settingKey) {
        const control = this.controls[controlKey];
        
        // 开关事件
        if (control.toggle) {
            control.toggle.addEventListener('change', (e) => {
                this.settings[settingKey].enabled = e.target.checked;
                this.saveSettings();
                this.applySettings();
                // 显示切换提示
                this.showToggleNotification(settingKey, e.target.checked);
            });
        }
        
        // 滑块事件
        if (control.slider) {
            control.slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings[settingKey].count = value;
                if (control.value) control.value.textContent = value;
                // 实时更新粒子数量（预览效果）
                this.updateParticleCount(settingKey, value);
            });
            
            control.slider.addEventListener('change', (e) => {
                this.saveSettings();
            });
        }
    }
    
    togglePanel() {
        const isOpen = this.modalOverlay.classList.contains('show');
        if (isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }
    
    openPanel() {
        this.modalOverlay.classList.add('show');
        this.modalBackdrop.classList.add('show');
        document.body.classList.add('modal-open');
    }
    
    closePanel() {
        this.modalOverlay.classList.remove('show');
        this.modalBackdrop.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
    
    // 显示切换提示
    showToggleNotification(effectType, enabled) {
        const names = {




        };
        const status = enabled ? '已开启' : '已关闭';
        console.log(`${names[effectType]} ${status}`);
    }
    
    applySettings() {
        // 更新CONFIG值



        
        // 应用到粒子系统
        if (window.particleSystem) {

            

            
            // 彩色粒子 - 控制显示/隐藏和重新生成

            

        }
    }
    
    // 单独更新粒子数量（用于滑块实时预览）
    updateParticleCount(effectType, count) {
        switch(effectType) {



        }
    }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SettingsManager] Initializing...');
    window.settingsManager = new SettingsManager();
    console.log('[SettingsManager] Initialized, settings:', window.settingsManager.settings);
});

// ==================== 移动端/电脑版视图切换功能 ====================
    const viewSwitchContainer = document.getElementById('view-switch-container');
    const viewSwitchBtn = document.getElementById('view-switch-btn');
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    
    // 检测是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
               || window.innerWidth <= 768;
    }
    
    // 切换到电脑版视图
    function switchToDesktop() {
        document.body.classList.add('desktop-mode');
        // 修改viewport为桌面版
        viewportMeta.setAttribute('content', 'width=1200, initial-scale=0.3, maximum-scale=2.0, user-scalable=yes');
        
        // 更新按钮文本
        viewSwitchBtn.innerHTML = '<i class="fas fa-mobile-alt"></i><span>手机版</span>';
        viewSwitchBtn.title = '切换回手机版';
        
        // 保存用户选择
        localStorage.setItem('viewMode', 'desktop');
        
        // 重新加载地图以适应新尺寸
        if (window.map) {
            setTimeout(() => {
                window.map.resize();
            }, 300);
        }
    }
    
    // 切换到手机版视图
    function switchToMobile() {
        document.body.classList.remove('desktop-mode');
        // 恢复移动端viewport
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        
        // 更新按钮文本
        viewSwitchBtn.innerHTML = '<i class="fas fa-desktop"></i><span>电脑版</span>';
        viewSwitchBtn.title = '切换至电脑版';
        
        // 保存用户选择
        localStorage.setItem('viewMode', 'mobile');
        
        // 重新加载地图以适应新尺寸
        if (window.map) {
            setTimeout(() => {
                window.map.resize();
            }, 300);
        }
    }
    
    // 切换按钮点击事件
    if (viewSwitchBtn) {
        viewSwitchBtn.addEventListener('click', function() {
            if (document.body.classList.contains('desktop-mode')) {
                switchToMobile();
            } else {
                switchToDesktop();
            }
        });
    }
    
    // 页面加载时检查用户之前的视图选择
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode === 'desktop' && isMobileDevice()) {
        switchToDesktop();
    }
    
    // ==================== 1. 时间和日期更新 ====================
    function updateDateTime() {
        const now = new Date();
        
        // 格式化时间
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;
        document.getElementById('current-time').textContent = timeString;
        
        // 格式化日期
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekday = weekdays[now.getDay()];
        const dateString = `${year}年${month}月${day}日 ${weekday}`;
        document.getElementById('current-date').textContent = dateString;
        
        // 更新最后更新时间
        document.getElementById('last-update-time').textContent = timeString;
        
        // 检查待办事项的时间
        checkTodoDeadlines();
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // ==================== 2. 地理位置和天气信息 ====================
    const locationText = document.getElementById('location-text');
    const temperature = document.getElementById('temperature');
    const weatherDesc = document.getElementById('weather-description');
    const cityName = document.getElementById('city-name');
    const districtName = document.getElementById('district-name');
    const weatherIcon = document.getElementById('weather-icon');
    
    // 存储当前位置信息
    let currentPosition = { lat: 39.9042, lon: 116.4074 };
    
    // 获取地理位置和天气
    async function getGeolocationAndWeather() {
        // 首先尝试从本地存储获取位置
        const savedLocation = localStorage.getItem('userLocation');
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    currentPosition = { lat, lon };
                    
                    // 更新位置显示
                    locationText.textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                    cityName.textContent = '位置获取中';
                    
                    // 保存位置
                    localStorage.setItem('userLocation', JSON.stringify({
                        lat: lat,
                        lon: lon,
                        timestamp: Date.now()
                    }));
                    
                    // 获取天气信息
                    await getWeather(lat, lon);
                    
                    // 使用高德地图逆地理编码获取城市和区域信息
                    await getLocationInfoFromAMap(lon, lat);
                    
                    // 初始化地图中心点
                    if (window.map) {
                        window.map.setCenter([lon, lat]);
                        addUserMarker(lon, lat);
                    }
                },
                (error) => {
                    console.log('获取位置失败，使用默认位置:', error);
                    // 使用默认位置（北京）
                    const defaultLat = 39.9042;
                    const defaultLon = 116.4074;
                    currentPosition = { lat: defaultLat, lon: defaultLon };
                    
                    locationText.textContent = `纬度: ${defaultLat.toFixed(2)}, 经度: ${defaultLon.toFixed(2)} (默认)`;
                    getWeather(defaultLat, defaultLon);
                    
                    // 使用默认位置获取城市信息
                    getLocationInfoFromAMap(defaultLon, defaultLat);
                    
                    if (window.map) {
                        window.map.setCenter([defaultLon, defaultLat]);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            // 浏览器不支持地理定位
            locationText.textContent = '浏览器不支持地理定位';
            getWeather(39.9042, 116.4074); // 默认北京
            getLocationInfoFromAMap(116.4074, 39.9042);
        }
    }
    
    // 使用高德地图逆地理编码获取城市和区域信息
    async function getLocationInfoFromAMap(lng, lat) {
        try {
            // 等待AMap加载完成
            if (typeof AMap === 'undefined') {
                console.log('AMap未加载，等待中...');
                setTimeout(() => getLocationInfoFromAMap(lng, lat), 1000);
                return;
            }
            
            // 加载逆地理编码插件
            AMap.plugin(['AMap.Geocoder'], function() {
                const geocoder = new AMap.Geocoder({
                    radius: 1000,
                    extensions: 'all'
                });
                
                geocoder.getAddress([lng, lat], function(status, result) {
                    if (status === 'complete' && result.regeocode) {
                        const addressComponent = result.regeocode.addressComponent;
                        const province = addressComponent.province || '';
                        const city = addressComponent.city || addressComponent.province || '未知城市';
                        const district = addressComponent.district || '';
                        const street = addressComponent.street || '';
                        const streetNumber = addressComponent.streetNumber || '';
                        
                        // 更新城市名称
                        cityName.textContent = city;
                        
                        // 更新区域名称
                        if (district) {
                            districtName.textContent = district;
                            districtName.style.display = 'block';
                        } else {
                            districtName.style.display = 'none';
                        }
                        
                        // 更新位置显示
                        const locationDetail = `${province} ${city} ${district} ${street}${streetNumber}`.trim();
                        locationText.textContent = locationDetail || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        
                        console.log('位置信息:', { province, city, district, street, streetNumber });
                    } else {
                        console.log('逆地理编码失败:', status, result);
                        cityName.textContent = '位置获取失败';
                        districtName.style.display = 'none';
                    }
                });
            });
        } catch (error) {
            console.error('获取位置信息失败:', error);
            cityName.textContent = '位置获取失败';
            districtName.style.display = 'none';
        }
    }
    
    // 获取天气和城市信息
    async function getWeather(lat, lon) {
        try {
            // 使用Open-Meteo作为天气API（免费无需密钥）
            const openMeteoResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
            );
            
            if (!openMeteoResponse.ok) {
                throw new Error('天气API请求失败');
            }
            
            const openMeteoData = await openMeteoResponse.json();
            if (openMeteoData.current) {
                const temp = Math.round(openMeteoData.current.temperature_2m);
                const weatherCode = openMeteoData.current.weather_code;
                
                temperature.textContent = `${temp}°C`;
                const { description, icon } = getWeatherInfo(weatherCode);
                weatherDesc.textContent = description;
                weatherIcon.className = `fas ${icon}`;
            }
        } catch (error) {
            console.error('获取天气信息失败:', error);
            // 使用模拟数据作为最终后备
            temperature.textContent = '25°C';
            weatherDesc.textContent = '晴朗';
            weatherIcon.className = 'fas fa-sun';
        }
    }
    
    // 根据天气代码获取描述和图标
    function getWeatherInfo(code) {
        const weatherMap = {
            0: { description: '晴朗', icon: 'fa-sun' },
            1: { description: '大部分晴朗', icon: 'fa-sun' },
            2: { description: '部分多云', icon: 'fa-cloud-sun' },
            3: { description: '多云', icon: 'fa-cloud' },
            45: { description: '雾', icon: 'fa-smog' },
            48: { description: '雾', icon: 'fa-smog' },
            51: { description: '小雨', icon: 'fa-cloud-rain' },
            53: { description: '中雨', icon: 'fa-cloud-rain' },
            55: { description: '大雨', icon: 'fa-cloud-showers-heavy' },
            61: { description: '小雨', icon: 'fa-cloud-rain' },
            63: { description: '中雨', icon: 'fa-cloud-rain' },
            65: { description: '大雨', icon: 'fa-cloud-showers-heavy' },
            71: { description: '小雪', icon: 'fa-snowflake' },
            73: { description: '中雪', icon: 'fa-snowflake' },
            75: { description: '大雪', icon: 'fa-snowflake' },
            80: { description: '阵雨', icon: 'fa-cloud-rain' },
            81: { description: '强阵雨', icon: 'fa-cloud-showers-heavy' },
            82: { description: '暴雨', icon: 'fa-poo-storm' },
            85: { description: '阵雪', icon: 'fa-snowflake' },
            86: { description: '强阵雪', icon: 'fa-snowflake' },
            95: { description: '雷雨', icon: 'fa-bolt' },
            96: { description: '雷暴雨', icon: 'fa-bolt' },
            99: { description: '强雷暴雨', icon: 'fa-bolt' }
        };
        
        return weatherMap[code] || { description: '未知', icon: 'fa-question' };
    }
    
    // 初始化地理位置和天气
    getGeolocationAndWeather();
    
    // ==================== 3. 背景图片切换 ====================
    const bgUpload = document.getElementById('bg-upload');
    const settingsPanel = document.getElementById('settings-panel');
    
    // 修改背景切换函数，确保使用正确的CSS属性
    function changeBackgroundImage(imageUrl) {
        document.body.style.backgroundImage = `url(${imageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        localStorage.setItem('selectedBackground', imageUrl);
    }

    // 新的背景选项事件绑定（使用事件委托）
    document.addEventListener('click', function(e) {
        const bgOption = e.target.closest('.bg-option-item');
        if (bgOption && bgOption.getAttribute('data-bg') !== 'custom') {
            const bgType = bgOption.getAttribute('data-bg');
            const bgImages = {
                'nature1': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
                'nature2': 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
                'nature3': 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'
            };
            
            changeBackgroundImage(bgImages[bgType]);
            // 关闭设置面板
            if (settingsPanel) {
                settingsPanel.classList.remove('show');
            }
            const settingsBtn = document.getElementById('settings-btn');
            if (settingsBtn) {
                settingsBtn.classList.remove('active');
            }
        }
    });
    
    // 自定义背景上传
    document.addEventListener('click', function(e) {
        const customBtn = e.target.closest('#custom-bg-btn');
        if (customBtn && bgUpload) {
            bgUpload.click();
        }
    });
    
    if (bgUpload) {
        bgUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    changeBackgroundImage(event.target.result);
                    // 关闭设置面板
                    if (settingsPanel) {
                        settingsPanel.classList.remove('show');
                    }
                    const settingsBtn = document.getElementById('settings-btn');
                    if (settingsBtn) {
                        settingsBtn.classList.remove('active');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // 加载保存的背景
    function loadSavedBackground() {
        const savedBackground = localStorage.getItem('selectedBackground');
        if (savedBackground) {
            changeBackgroundImage(savedBackground);
        } else {
            // 设置默认背景
            changeBackgroundImage('https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');
        }
    }

    // 在DOM加载完成后调用
    loadSavedBackground();
    
    // ==================== 4. 待办事项功能 ====================
    const todoInput = document.getElementById('todo-input');
    const todoSubmit = document.getElementById('todo-submit');
    const todoCancel = document.getElementById('todo-cancel');
    const todoList = document.getElementById('todo-list');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoInputArea = document.getElementById('todo-input-area');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    // 设置默认时间
    function setDefaultTimes() {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        startTimeInput.value = formatDateTimeLocal(now);
        endTimeInput.value = formatDateTimeLocal(oneHourLater);
    }
    
    function formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // 加载待办事项
    function loadTodos() {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        todoList.innerHTML = '';
        
        // 应用当前筛选
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        
        todos.forEach(todo => {
            if (shouldShowTodo(todo, activeFilter)) {
                addTodoToDOM(todo);
            }
        });
        
        updateTodoCounts();
    }
    
    // 判断是否显示待办事项
    function shouldShowTodo(todo, filter) {
        const isCompleted = todo.completed;
        const isUrgent = isTodoUrgent(todo);
        
        switch(filter) {
            case 'all':
                return true;
            case 'pending':
                return !isCompleted;
            case 'completed':
                return isCompleted;
            case 'urgent':
                return isUrgent;
            default:
                return true;
        }
    }
    
    // 判断是否为紧急任务
    function isTodoUrgent(todo) {
        if (!todo.endTime || todo.completed) return false;
        
        const endTime = new Date(todo.endTime);
        const now = new Date();
        const diffHours = (endTime - now) / (1000 * 60 * 60);
        
        return diffHours < 24 && diffHours > 0;
    }
    
    // 获取剩余时间文本
    function getRemainingTimeText(endTime) {
        const end = new Date(endTime);
        const now = new Date();
        const diffMs = end - now;
        
        if (diffMs <= 0) return '已过期';
        
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffDays > 0) {
            return `${diffDays}天后到期`;
        } else if (diffHours > 0) {
            return `${diffHours}小时后到期`;
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes}分钟后到期`;
        }
    }
    
    // 添加待办事项到DOM
    function addTodoToDOM(todo) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isTodoUrgent(todo) ? 'urgent' : ''}`;
        li.dataset.id = todo.id;
        
        const startTimeText = todo.startTime ? 
            new Date(todo.startTime).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '未设置';
            
        const endTimeText = todo.endTime ? 
            new Date(todo.endTime).toLocaleString('zh-CN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '未设置';
            
        const remainingText = todo.endTime ? getRemainingTimeText(todo.endTime) : '';
        
        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="todo-content">
                <div class="todo-title">${todo.text}</div>
                <div class="todo-time">
                    <span>开始: ${startTimeText}</span>
                    <span> | 截止: <span class="todo-deadline">${endTimeText}</span></span>
                    ${remainingText ? `<span> | ${remainingText}</span>` : ''}
                </div>
            </div>
            <button class="delete-todo" title="删除">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // 事件监听器
        const checkbox = li.querySelector('.todo-checkbox');
        const deleteBtn = li.querySelector('.delete-todo');
        
        checkbox.addEventListener('change', function() {
            li.classList.toggle('completed');
            updateTodoStatus(todo.id, this.checked);
            
            if (this.checked) {
                li.style.transform = 'translateX(5px) scale(0.98)';
                setTimeout(() => {
                    li.style.transform = '';
                }, 300);
            }
            
            // 重新加载以更新筛选
            loadTodos();
        });
        
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            li.style.transform = 'translateX(100px)';
            li.style.opacity = '0';
            
            setTimeout(() => {
                removeTodoFromStorage(todo.id);
                loadTodos();
            }, 300);
        });
        
        // 点击待办事项进行编辑
        li.addEventListener('click', function(e) {
            if (e.target !== checkbox && e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
                editTodo(todo);
            }
        });
        
        todoList.appendChild(li);
    }
    
    // 编辑待办事项
    function editTodo(todo) {
        todoInput.value = todo.text;
        
        if (todo.startTime) {
            startTimeInput.value = formatDateTimeLocal(new Date(todo.startTime));
        }
        
        if (todo.endTime) {
            endTimeInput.value = formatDateTimeLocal(new Date(todo.endTime));
        }
        
        todoInputArea.style.display = 'block';
        todoInput.focus();
        
        // 移除原有的待办事项
        removeTodoFromStorage(todo.id);
        loadTodos();
    }
    
    // 更新待办事项状态
    function updateTodoStatus(id, completed) {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const todoIndex = todos.findIndex(todo => todo.id === id);
        
        if (todoIndex !== -1) {
            todos[todoIndex].completed = completed;
            todos[todoIndex].completedAt = completed ? new Date().toISOString() : null;
            localStorage.setItem('todos', JSON.stringify(todos));
            updateTodoCounts();
        }
    }
    
    // 从存储中移除
    function removeTodoFromStorage(id) {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const filteredTodos = todos.filter(todo => todo.id !== id);
        localStorage.setItem('todos', JSON.stringify(filteredTodos));
        updateTodoCounts();
    }
    
    // 更新待办事项计数
    function updateTodoCounts() {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const pending = todos.filter(t => !t.completed).length;
        const completed = todos.filter(t => t.completed).length;
        const urgent = todos.filter(t => isTodoUrgent(t)).length;
        
        document.querySelector('[data-filter="all"]').textContent = `全部 (${todos.length})`;
        document.querySelector('[data-filter="pending"]').textContent = `未完成 (${pending})`;
        document.querySelector('[data-filter="completed"]').textContent = `已完成 (${completed})`;
        document.querySelector('[data-filter="urgent"]').textContent = `紧急 (${urgent})`;
    }
    
    // 检查待办事项截止时间
    function checkTodoDeadlines() {
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        const now = new Date();
        
        todos.forEach(todo => {
            if (!todo.completed && todo.endTime) {
                const endTime = new Date(todo.endTime);
                const diffHours = (endTime - now) / (1000 * 60 * 60);
                
                // 1小时内即将过期的任务添加闪烁效果
                if (diffHours > 0 && diffHours < 1) {
                    const todoElement = document.querySelector(`.todo-item[data-id="${todo.id}"]`);
                    if (todoElement) {
                        todoElement.classList.add('urgent');
                        todoElement.style.animation = 'blink 1s infinite';
                    }
                }
            }
        });
    }
    
    // 添加待办事项
    function addTodo() {
        const text = todoInput.value.trim();
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;
        
        if (!text) {
            alert('请输入待办事项内容');
            return;
        }
        
        const todo = {
            id: Date.now(),
            text: text,
            startTime: startTime ? new Date(startTime).toISOString() : null,
            endTime: endTime ? new Date(endTime).toISOString() : null,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        // 保存到本地存储
        const todos = JSON.parse(localStorage.getItem('todos')) || [];
        todos.push(todo);
        localStorage.setItem('todos', JSON.stringify(todos));
        
        // 重置表单
        todoInput.value = '';
        setDefaultTimes();
        todoInputArea.style.display = 'none';
        
        // 重新加载待办事项
        loadTodos();
    }
    
    // 事件监听器
    todoSubmit.addEventListener('click', addTodo);
    
    addTodoBtn.addEventListener('click', function() {
        todoInputArea.style.display = todoInputArea.style.display === 'block' ? 'none' : 'block';
        if (todoInputArea.style.display === 'block') {
            todoInput.focus();
            setDefaultTimes();
        }
    });
    
    todoCancel.addEventListener('click', function() {
        todoInputArea.style.display = 'none';
        todoInput.value = '';
        setDefaultTimes();
    });
    
    todoInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // 筛选功能
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadTodos();
        });
    });
    
    // 初始加载
    setDefaultTimes();
    loadTodos();
    
    // ==================== 5. 高德地图功能 ====================
    let map = null;
    let userMarker = null;
    let trafficLayer = null;
    
    // 显示地图错误信息
    function showMapError(message) {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%); border-radius: 10px; padding: 30px; color: white;">
                    <i class="fas fa-map-marked-alt" style="font-size: 64px; margin-bottom: 20px; opacity: 0.9;"></i>
                    <h3 style="margin-bottom: 15px; font-size: 1.5rem;">地图服务暂时不可用</h3>
                    <p style="text-align: center; margin-bottom: 20px; font-size: 1rem; opacity: 0.9;">${message}</p>
                    
                    <div style="background: rgba(255, 255, 255, 0.15); padding: 20px; border-radius: 10px; backdrop-filter: blur(10px); max-width: 500px; width: 100%;">
                        <h4 style="margin-bottom: 15px; font-size: 1.1rem;">配置指南：</h4>
                        <ol style="text-align: left; margin-left: 20px; font-size: 0.9rem; line-height: 1.6;">
                            <li style="margin-bottom: 10px;">
                                <strong>获取API密钥：</strong><br>
                                访问 <a href="https://lbs.amap.com/" target="_blank" style="color: #a8c5ff; text-decoration: underline;">高德开放平台</a> 
                                注册账号  控制台  创建新应用  添加Key
                            </li>
                            <li style="margin-bottom: 10px;">
                                <strong>配置密钥：</strong><br>
                                在 <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">index.html</code> 中<br>
                                替换 <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">YOUR_SECURITY_CODE_HERE</code> 为你的安全密钥
                            </li>
                            <li style="margin-bottom: 10px;">
                                <strong>Key配置：</strong><br>
                                在JS代码中替换 <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">YOUR_AMAP_KEY_HERE</code> 为你的应用Key
                            </li>
                            <li>
                                <strong>服务类型：</strong><br>
                                创建应用时选择 "Web端(JS API)"
                            </li>
                        </ol>
                    </div>
                    
                    <button onclick="location.reload()" style="margin-top: 25px; padding: 10px 25px; background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.3); color: white; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s;">
                        <i class="fas fa-redo" style="margin-right: 8px;"></i>重新加载地图
                    </button>
                </div>
            `;
        }
    }
    
    // 添加用户标记
    function addUserMarker(lng, lat) {
        if (!window.map) return;
        
        if (userMarker) {
            window.map.remove(userMarker);
        }
        
        userMarker = new AMap.Marker({
            position: [lng, lat],
            title: '我的位置',
            icon: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
            zIndex: 1000
        });
        
        window.map.add(userMarker);
        
        // 信息窗口
        const infoWindow = new AMap.InfoWindow({
            content: `<div style="padding: 10px; min-width: 200px;">
                <h4 style="margin: 0 0 5px 0;">我的位置</h4>
                <p style="margin: 0; font-size: 12px; color: #666;">经度: ${lng.toFixed(6)}</p>
                <p style="margin: 0; font-size: 12px; color: #666;">纬度: ${lat.toFixed(6)}</p>
            </div>`,
            offset: new AMap.Pixel(0, -30)
        });
        
        infoWindow.open(window.map, [lng, lat]);
    }
    
    // 搜索地点
    function searchPlace() {
        if (!window.map) return;
        
        const keyword = document.getElementById('map-search-input').value.trim();
        if (!keyword) {
            alert('请输入搜索关键词');
            return;
        }
        
        // 清除之前的标记
        if (userMarker) {
            window.map.remove(userMarker);
            userMarker = null;
        }
        
        // 使用插件方式加载PlaceSearch
        AMap.plugin(['AMap.PlaceSearch'], function() {
            const placeSearch = new AMap.PlaceSearch({
                pageSize: 10,
                pageIndex: 1,
                city: '全国',
                map: window.map
            });
            
            placeSearch.search(keyword, function(status, result) {
                if (status === 'complete' && result.info === 'OK') {
                    const pois = result.poiList.pois;
                    if (pois.length > 0) {
                        const poi = pois[0];
                        
                        // 添加标记
                        userMarker = new AMap.Marker({
                            position: [poi.location.lng, poi.location.lat],
                            title: poi.name,
                            icon: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_red.png'
                        });
                        
                        window.map.add(userMarker);
                        window.map.setCenter([poi.location.lng, poi.location.lat]);
                        window.map.setZoom(15);
                        
                        // 信息窗口
                        const infoWindow = new AMap.InfoWindow({
                            content: `<div style="padding: 10px; min-width: 200px;">
                                <h4 style="margin: 0 0 5px 0;">${poi.name}</h4>
                                <p style="margin: 0; font-size: 12px; color: #666;">${poi.address || '地址未提供'}</p>
                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">${poi.tel || '电话未提供'}</p>
                            </div>`,
                            offset: new AMap.Pixel(0, -30)
                        });
                        
                        infoWindow.open(window.map, userMarker.getPosition());
                    }
                } else {
                    alert('未找到相关地点');
                }
            });
        });
    }
    
    // 初始化地图 - 使用JS API Loader
    function initMap() {
        // 检查AMapLoader是否可用
        if (typeof AMapLoader === 'undefined') {
            showMapError('高德地图加载器未加载，请检查网络连接');
            return;
        }
        
        // 使用JS API Loader加载地图
        AMapLoader.load({
            key: "9e661689052df99b5468cfbabfa35824", // 申请好的Web端开发者 Key，调用 load 时必填
            version: "2.0", //指定要加载的 JS API 的版本，缺省时默认为 1.4.15
            plugins: ['AMap.PlaceSearch', 'AMap.TileLayer.Traffic', 'AMap.Geocoder'] // 需要使用的插件列表
        })
        .then((AMap) => {
            // 初始化地图 - 使用用户位置或默认位置
            const savedLocation = localStorage.getItem('userLocation');
            let center = [116.397428, 39.90923]; // 北京默认
            
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation);
                    center = [location.lon || location.lng || 116.397428, location.lat || 39.90923];
                } catch (e) {
                    console.error('解析保存的位置失败:', e);
                }
            }
            
            // 创建地图实例 - JS API 2.0 默认自带缩放控件，无需手动添加
            window.map = new AMap.Map('map', {
                zoom: 13,
                center: center,
                viewMode: '2D'
            });
            
            console.log('高德地图初始化成功');
            
            // 如果已有用户位置，添加标记并获取位置信息
            if (savedLocation) {
                try {
                    const location = JSON.parse(savedLocation);
                    addUserMarker(location.lon || location.lng, location.lat);
                    // 获取位置信息
                    getLocationInfoFromAMap(location.lon || location.lng, location.lat);
                } catch (e) {
                    console.error('添加用户标记失败:', e);
                }
            }
            
            // 定位按钮
            document.getElementById('locate-me').addEventListener('click', function() {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function(position) {
                        const lng = position.coords.longitude;
                        const lat = position.coords.latitude;
                        currentPosition = { lat, lon: lng };
                        
                        // 更新地图中心
                        window.map.setCenter([lng, lat]);
                        window.map.setZoom(15);
                        
                        // 添加标记
                        addUserMarker(lng, lat);
                        
                        // 更新位置显示
                        locationText.textContent = `纬度: ${lat.toFixed(2)}, 经度: ${lng.toFixed(2)}`;
                        
                        // 获取天气信息
                        getWeather(lat, lng);
                        
                        // 获取城市和区域信息
                        getLocationInfoFromAMap(lng, lat);
                        
                        // 保存位置
                        localStorage.setItem('userLocation', JSON.stringify({
                            lat: lat,
                            lon: lng,
                            timestamp: Date.now()
                        }));
                        
                    }, function(error) {
                        alert('无法获取您的位置: ' + error.message);
                    });
                } else {
                    alert('您的浏览器不支持地理定位功能');
                }
            });
            
            // 实时路况切换
            document.getElementById('traffic-toggle').addEventListener('click', function() {
                if (!trafficLayer) {
                    trafficLayer = new AMap.TileLayer.Traffic({
                        zIndex: 10
                    });
                    window.map.add(trafficLayer);
                    this.style.backgroundColor = '#4a6fa5';
                    this.style.color = 'white';
                } else {
                    window.map.remove(trafficLayer);
                    trafficLayer = null;
                    this.style.backgroundColor = '';
                    this.style.color = '';
                }
            });
            
            // 搜索功能
            document.getElementById('map-search-btn').addEventListener('click', searchPlace);
            document.getElementById('map-search-input').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchPlace();
                }
            });
        })
        .catch((e) => {
            console.error('高德地图加载失败:', e);
            showMapError('高德地图加载失败: ' + (e.message || '请检查Key和安全密钥配置'));
        });
    }
    
    // 延迟初始化地图，确保页面完全加载
    setTimeout(initMap, 500);
    
    // ==================== 6. DeepSeek AI 集成 ====================
    const assistantInput = document.getElementById('assistant-input');
    const assistantSend = document.getElementById('assistant-send');
    const assistantMessages = document.getElementById('assistant-messages');
    const statusDot = document.getElementById('assistant-status-dot');
    const statusText = document.getElementById('assistant-status-text');
    const apiKeyInput = document.getElementById('deepseek-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    
    // 加载保存的API密钥
    const savedApiKey = localStorage.getItem('deepseekApiKey') || '';
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        updateAssistantStatus(true);
    }
    
    // 保存API密钥
    saveApiKeyBtn.addEventListener('click', function() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('deepseekApiKey', apiKey);
            alert('API密钥已保存到本地');
            updateAssistantStatus(true);
        } else {
            alert('请输入API密钥');
        }
    });
    
    // 更新助手状态
    function updateAssistantStatus(connected) {
        if (connected) {
            statusDot.classList.add('online');
            statusText.textContent = '在线';
            statusText.style.color = '#8c00ff';
        } else {
            statusDot.classList.remove('online');
            statusText.textContent = '离线';
            statusText.style.color = '#e74c3c';
        }
    }
    
    // 添加消息到对话
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        
        const avatarIcon = isUser ? 'fas fa-user' : 'fas fa-robot';
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="avatar">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="content">
                <p>${content}</p>
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        assistantMessages.appendChild(messageDiv);
        assistantMessages.scrollTop = assistantMessages.scrollHeight;
        
        // 添加动画
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = isUser ? 'translateX(20px)' : 'translateX(-20px)';
        
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateX(0)';
        }, 10);
        
        return messageDiv;
    }
    
    // 调用DeepSeek API
    async function callDeepseekAPI(userMessage, apiKey) {
        // 如果没有API密钥，使用模拟响应
        if (!apiKey) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const responses = [
                        `您的问题是："${userMessage}"。这是一个很有价值的问题，让我为您详细解答。目前我使用的是模拟响应，请配置API密钥以获取真实AI响应。`,
                        `关于"${userMessage}"，我建议您从以下几个方面考虑：首先明确目标，然后制定计划，最后执行并评估结果。`,
                        `"${userMessage}"是一个有趣的话题，我可以为您提供一些见解。不过要获取更准确的信息，建议您配置API密钥。`,
                        `感谢您的问题！关于"${userMessage}"，我认为重要的是保持开放的心态，多角度思考问题。`
                    ];
                    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                    resolve(randomResponse);
                }, 1000);
            });
        }
        
        try {
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个智能助手，帮助用户解答问题。'
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API调用失败:', error);
            return `抱歉，API调用失败：${error.message}。请检查API密钥是否正确。`;
        }
    }
    
    // 发送消息
    async function sendMessage() {
        const message = assistantInput.value.trim();
        if (!message) return;
        
        // 添加用户消息
        addMessage(message, true);
        assistantInput.value = '';
        
        // 获取API密钥
        const apiKey = localStorage.getItem('deepseekApiKey') || '';
        
        // 显示正在输入
        const typingIndicator = addMessage('正在输入...');
        
        try {
            // 调用API
            const response = await callDeepseekAPI(message, apiKey);
            
            // 移除正在输入指示器
            typingIndicator.remove();
            
            // 添加助手回复
            addMessage(response);
        } catch (error) {
            console.error('发送消息失败:', error);
            typingIndicator.remove();
            addMessage('抱歉，发送消息失败，请稍后重试。');
        }
    }
    
    // 事件监听器
    assistantSend.addEventListener('click', sendMessage);
    
    assistantInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

(function() {
    'use strict';

    // 诗句模块配置
    const POEM_CONFIG = {
        storageKey: 'user_custom_poem',
        defaultText: '点击编辑您的专属诗句...',
        maxLength: 100
    };

    // DOM元素引用
    let poemDisplay, poemText, poemInputArea, poemInput, 
        poemSubmit, poemCancel;

    /**
     * 初始化诗句模块
     */
    function initPoemModule() {
        // 获取DOM元素
        poemDisplay = document.getElementById('poem-display');
        poemText = document.getElementById('poem-text');
        poemInputArea = document.getElementById('poem-input-area');
        poemInput = document.getElementById('poem-input');
        poemSubmit = document.getElementById('poem-submit');
        poemCancel = document.getElementById('poem-cancel');

        if (!poemDisplay || !poemText) {
            console.log('诗句模块元素未找到，跳过初始化');
            return;
        }

        // 加载保存的诗句
        loadPoem();

        // 绑定事件
        bindEvents();

        console.log('诗句模块初始化完成');
    }

    /**
     * 绑定事件处理
     */
    function bindEvents() {
        // 点击显示区域进入编辑模式
        poemDisplay.addEventListener('click', enterEditMode);

        // 保存按钮
        poemSubmit.addEventListener('click', savePoem);

        // 取消按钮
        poemCancel.addEventListener('click', cancelEdit);

        // 输入框回车保存（Ctrl+Enter）
        poemInput.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                savePoem();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });

        // 输入框实时字符计数
        poemInput.addEventListener('input', function() {
            const currentLength = this.value.length;
            if (currentLength >= POEM_CONFIG.maxLength) {
                this.style.borderColor = '#ff6b6b';
            } else {
                this.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }
        });
    }

    /**
     * 进入编辑模式
     */
    function enterEditMode() {
        const currentText = poemText.textContent;
        
        // 如果显示的是默认文本，输入框留空
        if (currentText === POEM_CONFIG.defaultText) {
            poemInput.value = '';
        } else {
            poemInput.value = currentText;
        }

        // 切换显示
        poemDisplay.style.display = 'none';
        poemInputArea.style.display = 'flex';

        // 聚焦输入框
        setTimeout(() => {
            poemInput.focus();
            poemInput.select();
        }, 10);
    }

    /**
     * 保存诗句
     */
    function savePoem() {
        const text = poemInput.value.trim();

        // 输入验证
        if (!text) {
            // 空内容，显示提示
            poemInput.style.borderColor = '#ff6b6b';
            poemInput.placeholder = '请输入内容后再保存...';
            
            // 3秒后恢复
            setTimeout(() => {
                poemInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                poemInput.placeholder = '请输入您的诗句...';
            }, 3000);
            return;
        }

        // 长度验证
        if (text.length > POEM_CONFIG.maxLength) {
            alert('诗句长度不能超过' + POEM_CONFIG.maxLength + '个字符');
            return;
        }

        // 保存到localStorage
        try {
            localStorage.setItem(POEM_CONFIG.storageKey, text);
            console.log('诗句已保存');
        } catch (e) {
            console.warn('localStorage不可用，诗句仅在当前会话有效');
        }

        // 更新显示
        poemText.textContent = text;

        // 切换回显示模式
        exitEditMode();

        // 显示保存成功动画
        showSaveAnimation();
    }

    /**
     * 取消编辑
     */
    function cancelEdit() {
        exitEditMode();
    }

    /**
     * 退出编辑模式
     */
    function exitEditMode() {
        poemInputArea.style.display = 'none';
        poemDisplay.style.display = 'block';
    }

    /**
     * 加载保存的诗句
     */
    function loadPoem() {
        let savedPoem = null;

        try {
            savedPoem = localStorage.getItem(POEM_CONFIG.storageKey);
        } catch (e) {
            console.warn('无法访问localStorage');
        }

        if (savedPoem && savedPoem.trim()) {
            poemText.textContent = savedPoem;
        } else {
            poemText.textContent = POEM_CONFIG.defaultText;
        }
    }

    /**
     * 显示保存成功动画
     */
    function showSaveAnimation() {
        poemText.style.transition = 'all 0.3s ease';
        poemText.style.textShadow = '0 0 20px rgba(102, 126, 234, 0.8)';
        
        setTimeout(() => {
            poemText.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        }, 1000);
    }

    /**
     * 公共API - 供外部调用
     */
    window.PoemModule = {
        /**
         * 获取当前诗句
         * @returns {string} 当前诗句内容
         */
        getPoem: function() {
            const text = poemText.textContent;
            return text === POEM_CONFIG.defaultText ? '' : text;
        },

        /**
         * 设置诗句
         * @param {string} text - 诗句内容
         */
        setPoem: function(text) {
            if (text && text.trim()) {
                poemText.textContent = text.trim();
                try {
                    localStorage.setItem(POEM_CONFIG.storageKey, text.trim());
                } catch (e) {
                    console.warn('无法保存到localStorage');
                }
            }
        },

        /**
         * 清除诗句
         */
        clearPoem: function() {
            poemText.textContent = POEM_CONFIG.defaultText;
            try {
                localStorage.removeItem(POEM_CONFIG.storageKey);
            } catch (e) {
                console.warn('无法清除localStorage');
            }
        },

        /**
         * 进入编辑模式
         */
        edit: function() {
            enterEditMode();
        }
    };

    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPoemModule);
    } else {
        initPoemModule();
    }

})();





// ==================== 视觉防疲劳效果 ====================
class MouseTrailEffect {
    constructor() {
        this.enabled = false;
        this.canvas = null;
        this.ctx = null;
        this.points = [];
        this.maxPoints = 100;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastTime = Date.now();
        this.speedThreshold = 600; // 速度阈值：600px/s
        
        this.init();
    }
    
    init() {
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'mouse-trail-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '999999';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 绑定事件
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // 开始动画循环
        this.animate();
        
        console.log('鼠标拖尾效果初始化完成');
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    onMouseMove(e) {
        if (!this.enabled) return;
        
        const currentTime = Date.now();
        const dt = currentTime - this.lastTime;
        
        let speed = 0;
        if (dt > 0) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            speed = distance / dt * 1000;
        }
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.lastTime = currentTime;
        
        // 添加轨迹点
        this.points.push({
            x: e.clientX,
            y: e.clientY,
            speed: speed,
            time: currentTime
        });
        
        // 限制轨迹点数量
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('鼠标拖尾效果:', enabled ? '开启' : '关闭');
        if (!enabled) {
            this.points = [];
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.enabled || !this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 如果没有足够点形成线条，直接返回
        if (this.points.length < 2) return;
        
        const currentTime = Date.now();
        
        // 计算当前平均速度
        let avgSpeed = 0;
        if (this.points.length > 0) {
            const recentPoints = this.points.slice(-3);
            avgSpeed = recentPoints.reduce((sum, p) => sum + p.speed, 0) / recentPoints.length;
        }
        
        // 创建渐变线条 - 使用连续路径而不是分段线段
        ctx.beginPath();
        
        // 从尾部（最旧的点）开始移动到第一个点
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        // 使用贝塞尔曲线连接所有点，形成平滑曲线
        for (let i = 1; i < this.points.length - 1; i++) {
            const point = this.points[i];
            const nextPoint = this.points[i + 1];
            
            // 计算控制点（中点）
            const cpX = (point.x + nextPoint.x) / 2;
            const cpY = (point.y + nextPoint.y) / 2;
            
            // 使用二次贝塞尔曲线
            ctx.quadraticCurveTo(point.x, point.y, cpX, cpY);
        }
        
        // 连接到头部（最新的点）
        const lastPoint = this.points[this.points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
        
        // 创建线性渐变 - 从尾部到头部
        // 尾部透明度 0.05，头部透明度 0.9
        const firstPoint = this.points[0];
        const gradient = ctx.createLinearGradient(
            firstPoint.x, firstPoint.y,
            lastPoint.x, lastPoint.y
        );
        
        // 根据速度决定颜色
        if (avgSpeed < this.speedThreshold) {
            // 低速：半透明白色渐变
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');   // 尾部
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');    // 头部
        } else {
            // 高速：半透明彩色渐变
            const hue = (Date.now() / 15) % 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.05)`);  // 尾部
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.9)`);   // 头部
        }
        
        // 设置线条样式
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // 移除过期的点（400ms）
        this.points = this.points.filter(p => currentTime - p.time < 400);
    }
}

// 初始化鼠标拖尾效果
document.addEventListener('DOMContentLoaded', () => {
    console.log('[MouseTrail] Initializing...');
    
    // Create global instance
    window.mouseTrailEffect = new MouseTrailEffect();
    console.log('[MouseTrail] Instance created');
    
    // Apply saved settings after a delay to ensure SettingsManager is ready
    setTimeout(() => {
        console.log('[MouseTrail] Checking saved settings...');
        
        if (window.settingsManager && window.settingsManager.settings) {
            const trailSettings = window.settingsManager.settings.mouseTrail;
            console.log('[MouseTrail] Settings found:', trailSettings);
            
            if (trailSettings && trailSettings.enabled) {
                console.log('[MouseTrail] Enabling from saved settings');
                window.mouseTrailEffect.setEnabled(true);
                
                // Sync toggle state
                const toggle = document.getElementById('mouse-trail-toggle');
                if (toggle) {
                    toggle.checked = true;
                    console.log('[MouseTrail] Toggle synced to ON');
                }
            } else {
                console.log('[MouseTrail] Saved setting is disabled or not found');
            }
        } else {
            console.log('[MouseTrail] SettingsManager not ready yet');
        }
    }, 800);
});

// ==================== 屏幕保护功能 ====================
class ScreenSaver {
    constructor() {
        this.enabled = false;
        this.timeout = 60000; // 默认60秒
        this.timer = null;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.particleCount = 10;
        this.particleSize = 6;
        this.isActive = false;
        this.isFadingOut = false;
        this.isPaused = false;
        this.opacity = 0;
        this.fadeStartTime = 0;
        this.fadeDuration = 5000; // 5秒淡入淡出
        this.lastActivity = Date.now();
        
        this.init();
    }
    
    init() {
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'screensaver-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 999999;
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 绑定事件
        window.addEventListener('resize', () => this.resize());
        this.bindActivityEvents();
        this.bindVisibilityEvents();
        
        console.log('[ScreenSaver] 初始化完成');
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    bindActivityEvents() {
        // 监听鼠标移动和键盘事件
        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.onActivity();
            }, { passive: true });
        });
    }
    
    onActivity() {
        this.lastActivity = Date.now();
        
        // 如果屏幕保护正在运行，开始淡出
        if (this.isActive && !this.isFadingOut) {
            this.startFadeOut();
        }
        
        // 重置计时器
        this.resetTimer();
    }
    
    resetTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        // 如果页面被隐藏，不启动计时器
        if (this.enabled && !this.isPaused && !document.hidden) {
            this.timer = setTimeout(() => {
                this.activate();
            }, this.timeout);
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('[ScreenSaver] 屏幕保护:', enabled ? '开启' : '关闭');
        
        if (enabled) {
            this.resetTimer();
        } else {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            if (this.isActive) {
                this.startFadeOut();
            }
        }
    }
    
    setTimeout(seconds) {
        this.timeout = seconds * 1000;
        console.log('[ScreenSaver] 触发时间设置为:', seconds, '秒');
        
        if (this.enabled) {
            this.resetTimer();
        }
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                hue: Math.random() * 360,
                hueSpeed: (Math.random() - 0.5) * 2
            });
        }
    }
    
    activate() {
        if (!this.enabled || this.isActive) return;
        
        console.log('[ScreenSaver] 激活屏幕保护，开始淡入');
        this.isActive = true;
        this.isFadingOut = false;
        this.opacity = 0;
        this.fadeStartTime = Date.now();
        this.canvas.style.display = 'block';
        
        // 初始化粒子
        this.initParticles();
        
        // 开始动画
        this.animate();
    }
    
    startFadeOut() {
        console.log('[ScreenSaver] 开始淡出');
        this.isFadingOut = true;
        this.fadeStartTime = Date.now();
    }
    
    bindVisibilityEvents() {
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // 页面隐藏，暂停屏保
                console.log('[ScreenSaver] 页面隐藏，暂停屏保');
                this.pause();
            } else {
                // 页面显示，恢复屏保
                console.log('[ScreenSaver] 页面显示，恢复屏保');
                this.resume();
            }
        });
    }
    
    pause() {
        // 暂停屏保（页面隐藏时）
        this.isPaused = true;
        
        // 如果正在运行，淡出并停止
        if (this.isActive && !this.isFadingOut) {
            this.startFadeOut();
        }
        
        // 清除计时器
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        // 记录暂停时间
        this.pauseTime = Date.now();
    }
    
    resume() {
        // 恢复屏保（页面显示时）
        this.isPaused = false;
        
        // 重置活动计时
        this.lastActivity = Date.now();
        
        // 如果启用了屏保，重新开始计时
        if (this.enabled) {
            this.resetTimer();
        }
    }
    
    deactivate() {
        console.log('[ScreenSaver] 关闭屏幕保护');
        this.isActive = false;
        this.isFadingOut = false;
        this.isPaused = false;
        this.opacity = 0;
        this.canvas.style.display = 'none';
        
        // 停止动画
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const now = Date.now();
        
        // 计算透明度
        if (this.isFadingOut) {
            // 淡出：从0.95到0
            const elapsed = now - this.fadeStartTime;
            const progress = Math.min(elapsed / this.fadeDuration, 1);
            this.opacity = 0.95 * (1 - progress);
            
            // 淡出完成，停止渲染
            if (progress >= 1) {
                this.deactivate();
                return;
            }
        } else {
            // 淡入：从0到0.95
            const elapsed = now - this.fadeStartTime;
            const progress = Math.min(elapsed / this.fadeDuration, 1);
            this.opacity = 0.95 * progress;
        }
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 如果透明度为0，不绘制
        if (this.opacity <= 0) return;
        
        // 更新和绘制粒子
        this.particles.forEach(particle => {
            // 布朗运动 - 随机改变速度
            particle.vx += (Math.random() - 0.5) * 0.5;
            particle.vy += (Math.random() - 0.5) * 0.5;
            
            // 限制速度
            const maxSpeed = 3;
            particle.vx = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vx));
            particle.vy = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vy));
            
            // 更新位置
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 边界反弹
            if (particle.x < 0 || particle.x > width) {
                particle.vx *= -1;
                particle.x = Math.max(0, Math.min(width, particle.x));
            }
            if (particle.y < 0 || particle.y > height) {
                particle.vy *= -1;
                particle.y = Math.max(0, Math.min(height, particle.y));
            }
            
            // 更新颜色
            particle.hue += particle.hueSpeed;
            if (particle.hue < 0) particle.hue += 360;
            if (particle.hue > 360) particle.hue -= 360;
            
            // 绘制粒子（应用全局透明度）
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, this.particleSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${particle.hue}, 80%, 60%, ${this.opacity})`;
            ctx.fill();
            
            // 添加发光效果
            ctx.shadowBlur = 10 * this.opacity;
            ctx.shadowColor = `hsla(${particle.hue}, 80%, 60%, ${this.opacity})`;
        });
        
        // 重置阴影
        ctx.shadowBlur = 0;
    }
}

// 初始化屏幕保护
document.addEventListener('DOMContentLoaded', () => {
    window.screenSaver = new ScreenSaver();
    
    // 从设置中恢复状态
    setTimeout(() => {
        if (window.settingsManager && window.settingsManager.settings) {
            const saverSettings = window.settingsManager.settings.screenSaver;
            if (saverSettings) {
                window.screenSaver.setEnabled(saverSettings.enabled);
                window.screenSaver.setTimeout(saverSettings.timeout);
            }
        }
    }, 500);
});

// ==================== AI语音功能 ====================
class DoubaoAI {
    constructor() {
        this.apiKey = localStorage.getItem('doubao_api_key') || '';
        this.messages = [];
        this.isOnline = false;
        this.currentImage = null; // 存储当前上传的图片
        this.currentFiles = []; // 存储当前上传的文件列表
        this.deepThinkEnabled = false; // 深度思考模式开关
        this.webSearchEnabled = false; // 联网搜索开关
        this.codeRunEnabled = false; // 代码执行开关
        this.conversationHistory = []; // 对话历史上下文
        
        this.init();
    }
    
    init() {
        // 获取DOM元素
        this.apiKeyInput = document.getElementById('doubao-api-key');
        this.saveApiKeyBtn = document.getElementById('save-doubao-api-key');
        this.messagesContainer = document.getElementById('doubao-messages');
        this.inputField = document.getElementById('doubao-input');
        this.sendBtn = document.getElementById('doubao-send');
        this.statusDot = document.getElementById('doubao-status-dot');
        this.statusText = document.getElementById('doubao-status-text');
        this.imageInput = document.getElementById('doubao-image-input');
        this.attachBtn = document.getElementById('doubao-attach');
        this.imagePreviewArea = document.getElementById('image-preview-area');
        this.previewImg = document.getElementById('preview-img');
        this.removeImageBtn = document.getElementById('remove-image-btn');
        
        // 如果有保存的API密钥，显示在输入框
        if (this.apiKey) {
            this.apiKeyInput.value = this.apiKey;
            this.updateStatus(true);
        }
        
        // 绑定事件
        this.bindEvents();
        
        console.log('[DoubaoAI] 初始化完成');
    }
    
    bindEvents() {
        // 保存API密钥
        this.saveApiKeyBtn.addEventListener('click', () => {
            this.saveApiKey();
        });
        
        // 发送消息
        this.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // 回车发送
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // 深度思考按钮
        this.deepThinkBtn = document.getElementById('doubao-deep-think');
        if (this.deepThinkBtn) {
            this.deepThinkBtn.addEventListener('click', () => {
                this.toggleDeepThink();
            });
        }
        
        // 文件上传按钮
        this.fileInput = document.getElementById('doubao-file-input');
        this.fileUploadBtn = document.getElementById('doubao-file-upload');
        this.filePreviewArea = document.getElementById('file-preview-area');
        this.filePreviewList = document.getElementById('file-preview-list');
        
        if (this.fileUploadBtn) {
            this.fileUploadBtn.addEventListener('click', () => {
                this.fileInput.click();
            });
        }
        
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        }
        
        // 联网搜索按钮
        this.webSearchBtn = document.getElementById('doubao-web-search');
        if (this.webSearchBtn) {
            this.webSearchBtn.addEventListener('click', () => {
                this.toggleWebSearch();
            });
        }
        
        // 代码执行按钮
        this.codeRunBtn = document.getElementById('doubao-code-run');
        if (this.codeRunBtn) {
            this.codeRunBtn.addEventListener('click', () => {
                this.toggleCodeRun();
            });
        }
        
        // 清除上下文按钮
        this.clearContextBtn = document.getElementById('doubao-clear-context');
        if (this.clearContextBtn) {
            this.clearContextBtn.addEventListener('click', () => {
                this.clearConversationHistory();
            });
        }
        
        // API设置面板切换
        const apiToggleBtn = document.getElementById('api-toggle-btn');
        const apiPanel = document.getElementById('api-panel');
        if (apiToggleBtn && apiPanel) {
            apiToggleBtn.addEventListener('click', () => {
                const isVisible = apiPanel.style.display !== 'none';
                apiPanel.style.display = isVisible ? 'none' : 'block';
            });
        }
        
        // 功能快捷按钮
        document.querySelectorAll('.feature-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.inputField.value = prompt;
                this.inputField.focus();
            });
        });
        
        // 图片上传
        this.attachBtn.addEventListener('click', () => {
            this.imageInput.click();
        });
        
        this.imageInput.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });
        
        // 移除图片
        this.removeImageBtn.addEventListener('click', () => {
            this.removeImage();
        });
    }
    
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }
        
        // 检查文件大小（最大5MB）
        if (file.size > 5 * 1024 * 1024) {
            alert('图片大小不能超过5MB');
            return;
        }
        
        // 读取图片并预览
        const reader = new FileReader();
        reader.onload = (event) => {
            this.currentImage = event.target.result;
            this.previewImg.src = this.currentImage;
            this.imagePreviewArea.style.display = 'block';
            console.log('[DoubaoAI] 图片已上传');
        };
        reader.readAsDataURL(file);
    }
    
    removeImage() {
        this.currentImage = null;
        this.imageInput.value = '';
        this.imagePreviewArea.style.display = 'none';
        this.previewImg.src = '';
        console.log('[DoubaoAI] 图片已移除');
    }
    
    // 处理文件上传
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        files.forEach(file => {
            // 检查文件大小（最大10MB）
            if (file.size > 10 * 1024 * 1024) {
                alert(`文件 ${file.name} 超过10MB限制`);
                return;
            }
            
            // 读取文件内容
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: event.target.result
                };
                this.currentFiles.push(fileData);
                this.updateFilePreview();
                console.log('[DoubaoAI] 文件已上传:', file.name);
            };
            
            // 根据文件类型选择读取方式
            if (file.type.startsWith('text/') || file.name.match(/\.(txt|csv|json|js|py|html|css|md)$/i)) {
                reader.readAsText(file);
            } else {
                reader.readAsDataURL(file);
            }
        });
        
        // 清空input以便可以重复选择相同文件
        this.fileInput.value = '';
    }
    
    // 更新文件预览
    updateFilePreview() {
        if (this.currentFiles.length === 0) {
            this.filePreviewArea.style.display = 'none';
            return;
        }
        
        this.filePreviewArea.style.display = 'block';
        this.filePreviewList.innerHTML = this.currentFiles.map((file, index) => `
            <div class="file-preview-item">
                <i class="fas fa-file"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                <button class="remove-file-btn" onclick="window.doubaoAI.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    // 移除文件
    removeFile(index) {
        this.currentFiles.splice(index, 1);
        this.updateFilePreview();
        console.log('[DoubaoAI] 文件已移除');
    }
    
    // 切换联网搜索
    toggleWebSearch() {
        this.webSearchEnabled = !this.webSearchEnabled;
        if (this.webSearchBtn) {
            this.webSearchBtn.classList.toggle('active', this.webSearchEnabled);
        }
        console.log('[DoubaoAI] 联网搜索:', this.webSearchEnabled ? '开启' : '关闭');
        this.addMessage('system', `联网搜索已${this.webSearchEnabled ? '开启' : '关闭'}`);
    }
    
    // 切换代码执行
    toggleCodeRun() {
        this.codeRunEnabled = !this.codeRunEnabled;
        if (this.codeRunBtn) {
            this.codeRunBtn.classList.toggle('active', this.codeRunEnabled);
        }
        console.log('[DoubaoAI] 代码执行:', this.codeRunEnabled ? '开启' : '关闭');
        this.addMessage('system', `代码执行已${this.codeRunEnabled ? '开启' : '关闭'}`);
    }
    
    // 清除对话历史
    clearConversationHistory() {
        this.conversationHistory = [];
        // 保留欢迎消息，清除其他消息
        const messagesContainer = document.getElementById('doubao-messages');
        const welcomeMsg = messagesContainer.querySelector('.doubao-welcome');
        messagesContainer.innerHTML = '';
        if (welcomeMsg) {
            messagesContainer.appendChild(welcomeMsg);
        }
        console.log('[DoubaoAI] 对话历史已清除');
        this.addMessage('system', '对话历史已清除');
    }
    
    saveApiKey() {
        const key = this.apiKeyInput.value.trim();
        if (!key) {
            alert('请输入API密钥');
            return;
        }
        
        this.apiKey = key;
        localStorage.setItem('doubao_api_key', key);
        this.updateStatus(true);
        
        // 显示成功提示
        this.addMessage('system', 'API密钥已保存，可以开始对话了！');
        
        console.log('[DoubaoAI] API密钥已保存');
    }
    
    updateStatus(online) {
        this.isOnline = online;
        if (online) {
            this.statusDot.classList.add('online');
            this.statusText.textContent = '准备就绪';
        } else {
            this.statusDot.classList.remove('online');
            this.statusText.textContent = '离线';
        }
    }
    
    async sendMessage() {
        const message = this.inputField.value.trim();
        if (!message && !this.currentImage) return;
        
        if (!this.apiKey) {
            alert('请先输入并保存API密钥');
            return;
        }
        
        // 构建显示内容
        let displayContent = message;
        if (this.currentImage) {
            displayContent = message + (message ? '<br>' : '') + `<img src="${this.currentImage}" class="message-image">`;
        }
        
        // 添加用户消息到界面
        this.addMessage('user', displayContent, true);
        this.inputField.value = '';
        
        // 显示加载状态
        this.sendBtn.disabled = true;
        
        try {
            // 调用豆包API（新格式）
            const response = await this.callDoubaoAPI(message, this.currentImage);
            
            // 添加AI回复到界面
            // response可以是字符串或{thinking, text}对象
            this.addMessage('assistant', response);
            
            // 保存对话历史
            // 构建用户消息内容
            const userContent = [];
            if (this.currentImage) {
                userContent.push({ type: 'input_image', image_url: this.currentImage });
            }
            if (this.currentFiles && this.currentFiles.length > 0) {
                this.currentFiles.forEach(file => {
                    if (file.content.startsWith('data:')) {
                        userContent.push({ type: 'input_file', file_url: file.content, file_name: file.name });
                    } else {
                        userContent.push({ type: 'input_text', text: file.content.substring(0, 5000) });
                    }
                });
            }
            if (message) {
                userContent.push({ type: 'input_text', text: message });
            }
            
            this.conversationHistory.push({
                role: 'user',
                content: userContent
            });
            
            const assistantContent = typeof response === 'object' ? response.text : response;
            this.conversationHistory.push({
                role: 'assistant',
                content: assistantContent
            });
            
            // 限制历史记录长度
            if (this.conversationHistory.length > 40) {
                this.conversationHistory = this.conversationHistory.slice(-40);
            }
            
            // 清除图片和文件
            this.removeImage();
            this.currentFiles = [];
            this.updateFilePreview();
            
        } catch (error) {
            console.error('[DoubaoAI] API调用失败:', error);
            console.error('[DoubaoAI] 错误堆栈:', error.stack);
            
            let errorMsg = error.message;
            if (error.message.includes('Unauthorized') || error.message.includes('AuthenticationError')) {
                errorMsg = 'API密钥无效或未授权，请检查：\n1. API密钥是否正确\n2. 模型是否已开通\n3. 密钥是否有调用权限';
            } else if (error.message.includes('404')) {
                errorMsg = '模型不存在，请检查模型ID是否正确';
            } else if (error.message.includes('429')) {
                errorMsg = '请求过于频繁，请稍后再试';
            }
            
            this.addMessage('system', '请求失败：' + errorMsg);
            this.updateStatus(false);
        } finally {
            this.sendBtn.disabled = false;
        }
    }
    
    async callDoubaoAPI(text, imageData) {
        console.log('[DoubaoAI] 开始调用API...');
        console.log('[DoubaoAI] API密钥前10位:', this.apiKey.substring(0, 10) + '...');
        console.log('[DoubaoAI] 是否有图片:', !!imageData);
        console.log('[DoubaoAI] 文本长度:', text ? text.length : 0);
        
        // 构建content数组
        const content = [];
        
        // 如果有图片，先添加图片
        if (imageData) {
            content.push({
                type: 'input_image',
                image_url: imageData
            });
            console.log('[DoubaoAI] 已添加图片到请求');
        }
        
        // 如果有文件，添加文件内容
        if (this.currentFiles && this.currentFiles.length > 0) {
            this.currentFiles.forEach(file => {
                if (file.content.startsWith('data:')) {
                    // 二进制文件
                    content.push({
                        type: 'input_file',
                        file_url: file.content,
                        file_name: file.name
                    });
                } else {
                    // 文本文件，作为文本内容添加
                    content.push({
                        type: 'input_text',
                        text: `【文件: ${file.name}】\n\n${file.content.substring(0, 50000)}` // 限制大小
                    });
                }
            });
            console.log('[DoubaoAI] 已添加', this.currentFiles.length, '个文件到请求');
        }
        
        // 添加文本
        if (text) {
            content.push({
                type: 'input_text',
                text: text
            });
        }
        
        // 构建消息列表（包含历史上下文）
        const messages = [];
        
        // 添加系统提示
        messages.push({
            role: 'system',
            content: '你是豆包AI助手，一个强大的多模态AI。你可以处理文本、图片、文档，执行代码，进行联网搜索等任务。'
        });
        
        // 添加历史对话（最多保留10轮）
        const recentHistory = this.conversationHistory.slice(-20);
        messages.push(...recentHistory);
        
        // 添加当前消息
        messages.push({
            role: 'user',
            content: content
        });
        
        // 构建请求体
        const requestBody = {
            model: 'doubao-seed-2-0-pro-260215',
            input: messages
        };
        
        // 如果启用了深度思考，添加相关参数
        if (this.deepThinkEnabled) {
            requestBody.reasoning = {
                type: 'thinking'
            };
            console.log('[DoubaoAI] 已启用深度思考模式');
        }
        
        // 如果启用了联网搜索，在系统提示中添加说明
        if (this.webSearchEnabled) {
            // 在第一条系统消息中添加联网搜索能力说明
            if (messages.length > 0 && messages[0].role === 'system') {
                messages[0].content += '\n\n你可以进行联网搜索获取最新信息。当用户需要最新信息时，请主动搜索。';
            }
            console.log('[DoubaoAI] 已启用联网搜索');
        }
        
        // 如果启用了代码执行，在系统提示中添加说明
        if (this.codeRunEnabled) {
            if (messages.length > 0 && messages[0].role === 'system') {
                messages[0].content += '\n\n你可以执行Python代码来解决复杂问题。当需要计算或编程时，请主动执行代码。';
            }
            console.log('[DoubaoAI] 已启用代码执行');
        }
        
        console.log('[DoubaoAI] 请求体:', JSON.stringify(requestBody, null, 2));
        
        try {
            // 新API格式（/api/v3/responses）
            console.log('[DoubaoAI] 发送请求到: https://ark.cn-beijing.volces.com/api/v3/responses');
            
            const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('[DoubaoAI] 响应状态:', response.status, response.statusText);
            
            // 获取响应文本
            const responseText = await response.text();
            console.log('[DoubaoAI] 原始响应:', responseText.substring(0, 500));
            
            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                    console.error('[DoubaoAI] 错误详情:', errorData);
                } catch (e) {
                    console.error('[DoubaoAI] 解析错误响应失败:', e);
                }
                throw new Error(errorMessage);
            }
            
            // 解析成功响应
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('[DoubaoAI] 解析后的数据:', data);
            } catch (e) {
                console.error('[DoubaoAI] 解析响应JSON失败:', e);
                throw new Error('无法解析API响应');
            }
            
            // 解析响应 - 提取实际回复文本和思考内容
            let result = this.extractTextFromResponse(data);
            // 检查结果：可以是字符串或包含thinking/text的对象
            if (result && (typeof result === 'object' || (typeof result === 'string' && result !== '抱歉，无法解析API响应。'))) {
                if (typeof result === 'object') {
                    console.log('[DoubaoAI] 成功获取回复(含思考内容):', result.text ? result.text.substring(0, 100) : '无文本');
                } else {
                    console.log('[DoubaoAI] 成功获取回复:', result.substring(0, 100) + '...');
                }
                return result;
            } else {
                console.warn('[DoubaoAI] 无法从响应中提取文本，返回原始数据');
                // 如果解析失败，尝试直接返回整个响应的字符串形式
                try {
                    if (typeof data === 'object') {
                        // 尝试找到任何可能的文本字段
                        const jsonStr = JSON.stringify(data);
                        // 如果包含text字段，尝试提取
                        const textMatch = jsonStr.match(/"text":\s*"([^"]+)"/);
                        if (textMatch) {
                            return textMatch[1];
                        }
                    }
                } catch (e) {
                    console.error('[DoubaoAI] 尝试提取文本失败:', e);
                }
                return '抱歉，无法解析API响应。请检查控制台日志了解详情。';
            }
        } catch (error) {
            console.error('[DoubaoAI] 请求异常:', error);
            throw error;
        }
    }
    
    addMessage(type, content, isHtml = false) {
        // 隐藏欢迎消息
        const welcomeMsg = this.messagesContainer.querySelector('.doubao-welcome');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'none';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type === 'user' ? 'user-message' : 'assistant-message'}`;
        
        const avatar = type === 'user' 
            ? '<i class="fas fa-user"></i>' 
            : (type === 'system' ? '<i class="fas fa-info-circle"></i>' : '<i class="fas fa-brain"></i>');
        
        let contentHtml;
        let textToSpeak = ''; // 用于朗读的文本
        
        // 处理包含思考内容的对象
        if (typeof content === 'object' && content !== null && (content.thinking || content.text)) {
            let html = '';
            console.log('[DoubaoAI] addMessage收到对象:', 'thinking长度:', content.thinking ? content.thinking.length : 0, 'text长度:', content.text ? content.text.length : 0);
            // 添加思考部分（如果有）
            if (content.thinking && content.thinking.trim()) {
                const processedThinking = this.processAiText(content.thinking);
                console.log('[DoubaoAI] 添加思考部分到界面');
                html += `<div class="thinking-content"><div class="thinking-label"><i class="fas fa-brain"></i> 思考过程</div><p>${processedThinking}</p></div>`;
            }
            // 添加回复部分（如果有）
            if (content.text && content.text.trim()) {
                const processedText = this.processAiText(content.text);
                textToSpeak = content.text; // 保存原文用于朗读
                console.log('[DoubaoAI] 添加回复部分到界面');
                html += `<div class="response-content"><p>${processedText}</p></div>`;
            }
            contentHtml = html;
        } else if (isHtml) {
            contentHtml = content;
            // 从HTML中提取文本用于朗读
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            textToSpeak = tempDiv.textContent || tempDiv.innerText || '';
        } else {
            // 对AI回复特殊处理转义字符
            const processedContent = this.processAiText(content);
            contentHtml = `<p>${processedContent}</p>`;
            textToSpeak = content;
        }
        
        // 为AI回复添加消息头部（包含朗读按钮）
        const showTTS = type === 'assistant' && textToSpeak && window.voiceManager;
        const headerHtml = showTTS ? `
            <div class="message-header">
                <span></span>
                <div class="message-actions">
                    <button class="tts-btn" title="朗读" onclick="window.voiceManager.speak(this.closest('.message').dataset.text, this.closest('.message')); this.classList.toggle('playing');">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
        ` : '';
        
        // 根据消息类型调整HTML结构顺序
        // AI消息：头像在左，内容在右
        // 用户消息：内容在左，头像在右
        if (type === 'user') {
            messageDiv.innerHTML = `
                <div class="content">
                    ${headerHtml}
                    ${contentHtml}
                </div>
                <div class="avatar">
                    ${avatar}
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="avatar">
                    ${avatar}
                </div>
                <div class="content">
                    ${headerHtml}
                    ${contentHtml}
                </div>
            `;
        }
        
        // 保存文本数据用于朗读
        if (textToSpeak) {
            messageDiv.dataset.text = textToSpeak;
            console.log('[DoubaoAI] 消息文本已保存到dataset');
        }
        
        // 如果开启了自动朗读，朗读AI回复
        if (type === 'assistant' && textToSpeak && this.autoTtsEnabled && window.voiceManager) {
            console.log('[DoubaoAI] 自动朗读已启用，开始朗读');
            setTimeout(() => {
                window.voiceManager.speak(textToSpeak);
            }, 500);
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    extractTextFromResponse(data) {
        console.log('[DoubaoAI] 开始解析响应:', typeof data);
        console.log('[DoubaoAI] 响应数据:', JSON.stringify(data, null, 2).substring(0, 5000));
        
        // 尝试多种可能的响应格式，提取文本内容和思考内容
        let thinkingText = null;
        let responseText = null;
        
        // 火山引擎Responses API格式: data.output数组
        // 思考内容: type="reasoning", 内容在content数组中
        // 回复内容: type="message", 内容在content数组中
        if (data.output && Array.isArray(data.output)) {
            console.log('[DoubaoAI] 检测到output数组，长度:', data.output.length);
            
            for (let i = 0; i < data.output.length; i++) {
                let item = data.output[i];
                console.log('[DoubaoAI] 检查output[', i, ']: type=', item.type, 'role=', item.role);
                console.log('[DoubaoAI] item内容:', JSON.stringify(item).substring(0, 500));
                
                // 提取思考内容 (type="reasoning")
                // 根据火山引擎文档，reasoning类型的内容在summary数组中
                if (item.type === 'reasoning') {
                    console.log('[DoubaoAI] 找到reasoning类型output');
                    console.log('[DoubaoAI] reasoning完整内容:', JSON.stringify(item).substring(0, 1000));
                    
                    // 首先尝试从summary数组中提取
                    if (item.summary && Array.isArray(item.summary)) {
                        console.log('[DoubaoAI] reasoning summary数组长度:', item.summary.length);
                        for (let j = 0; j < item.summary.length; j++) {
                            let summary = item.summary[j];
                            console.log('[DoubaoAI] 检查reasoning summary[', j, ']:', summary);
                            if (summary.type === 'summary_text' && summary.text) {
                                thinkingText = summary.text;
                                console.log('[DoubaoAI] 从summary提取到思考内容长度:', thinkingText.length);
                                console.log('[DoubaoAI] 思考内容前100字:', thinkingText.substring(0, 100));
                            } else if (summary.text) {
                                thinkingText = summary.text;
                                console.log('[DoubaoAI] 从summary提取到思考内容(备用)长度:', thinkingText.length);
                            }
                        }
                    }
                    
                    // 如果没有summary，尝试content数组（备用）
                    if (!thinkingText && item.content && Array.isArray(item.content)) {
                        console.log('[DoubaoAI] reasoning content数组长度:', item.content.length);
                        for (let j = 0; j < item.content.length; j++) {
                            let content = item.content[j];
                            console.log('[DoubaoAI] 检查reasoning content[', j, ']:', content);
                            if (content.type === 'output_text' && content.text) {
                                thinkingText = content.text;
                                console.log('[DoubaoAI] 从content提取到思考内容长度:', thinkingText.length);
                                console.log('[DoubaoAI] 思考内容前100字:', thinkingText.substring(0, 100));
                            } else if (content.text) {
                                thinkingText = content.text;
                                console.log('[DoubaoAI] 从content提取到思考内容(备用)长度:', thinkingText.length);
                            }
                        }
                    }
                    
                    if (!thinkingText) {
                        console.log('[DoubaoAI] reasoning没有summary或content数组');
                    }
                }
                
                // 提取回复内容 (type="message")
                if (item.type === 'message') {
                    console.log('[DoubaoAI] 找到message类型output');
                    if (item.content && Array.isArray(item.content)) {
                        console.log('[DoubaoAI] message content数组长度:', item.content.length);
                        for (let j = 0; j < item.content.length; j++) {
                            let content = item.content[j];
                            console.log('[DoubaoAI] 检查message content[', j, ']:', content);
                            if (content.type === 'output_text' && content.text) {
                                responseText = content.text;
                                console.log('[DoubaoAI] 提取到回复内容长度:', responseText.length);
                                console.log('[DoubaoAI] 回复内容前100字:', responseText.substring(0, 100));
                            }
                        }
                    } else {
                        console.log('[DoubaoAI] message没有content数组:', item.content);
                    }
                }
            }
        }
        
        // 如果找到了思考内容或回复内容，返回组合对象
        if (thinkingText || responseText) {
            console.log('[DoubaoAI] 成功提取 - 思考长度:', thinkingText ? thinkingText.length : 0, '回复长度:', responseText ? responseText.length : 0);
            return {
                thinking: thinkingText,
                text: responseText
            };
        }
        
        // 格式2: choices[0].message.content (OpenAI兼容格式)
        if (data.choices && data.choices[0] && data.choices[0].message) {
            console.log('[DoubaoAI] 使用choices格式');
            return data.choices[0].message.content;
        }
        
        // 格式3: 直接返回content字段
        if (data.content && typeof data.content === 'string') {
            console.log('[DoubaoAI] 使用content字段');
            return data.content;
        }
        
        // 格式4: text字段
        if (data.text && typeof data.text === 'string') {
            console.log('[DoubaoAI] 使用text字段');
            return data.text;
        }
        
        // 格式5: response字段
        if (data.response && typeof data.response === 'string') {
            console.log('[DoubaoAI] 使用response字段');
            return data.response;
        }
        
        // 格式6: 如果data本身就是字符串
        if (typeof data === 'string') {
            console.log('[DoubaoAI] 响应本身就是字符串');
            return data;
        }
        
        // 如果都没找到，返回null
        console.warn('[DoubaoAI] 无法识别的响应格式');
        return null;
    }
    
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text);
        }
        // 先将\n转换为实际换行符，再进行HTML转义
        let processed = text
            .replace(/\\n/g, '<br>')      // 将字符串\n转为HTML换行符
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')      // 将字符串\t转为制表符
            .replace(/\\/g, '\\');    // 处理\\转义
        
        const div = document.createElement('div');
        div.textContent = processed;
        return div.innerHTML;
    }
    
    // 处理AI回复文本，将转义字符转换为HTML格式
    processAiText(text) {
        if (typeof text !== 'string') {
            return String(text);
        }
        // 将\n转换为<br>标签实现换行
        return text
            .replace(/\\n/g, '<br>')     // 将\n转为HTML换行
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')  // 将\t转为空格
            .replace(/\\/g, '\\')     // 处理反斜杠转义
            .replace(/\"/g, '"')       
            .replace(/\'/g, "'");       
    }
}

// 语音功能类
class VoiceManager {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isRecording = false;
        this.currentUtterance = null;
        this.init();
    }
    
    init() {
        // 初始化语音识别
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'zh-CN';
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                // 播放开启提示音
                if (window.voiceSoundManager) {
                    window.voiceSoundManager.playStartSound();
                }
                this.updateVoiceButtonState(true);
                console.log('[Voice] 语音识别已启动');
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                // 播放关闭提示音
                if (window.voiceSoundManager && !this.voiceInputActive) {
                    window.voiceSoundManager.playStopSound();
                }
                this.updateVoiceButtonState(false);
                console.log('[Voice] 语音识别已结束');
                
                // 检查是否是一键常开模式且应该继续保持监听
                const isAlwaysOn = window.doubaoVoiceSettings && 
                                   window.doubaoVoiceSettings.voiceInputToggle && 
                                   window.doubaoVoiceSettings.voiceInputToggle.checked;
                
                if (isAlwaysOn && window.doubaoVoiceSettings && window.doubaoVoiceSettings.voiceInputActive) {
                    console.log('[Voice] 一键常开模式：准备自动重启...');
                    // 短暂延迟后自动重新启动
                    setTimeout(() => {
                        if (window.doubaoVoiceSettings && window.doubaoVoiceSettings.voiceInputActive) {
                            console.log('[Voice] 自动重新启动语音识别');
                            this.startVoiceInput().catch(err => {
                                console.error('[Voice] 自动重启失败:', err);
                                // 如果重启失败，停止一键常开模式
                                window.doubaoVoiceSettings.stopVoiceInput();
                            });
                        }
                    }, 500);
                }
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // 更新输入框
                const inputField = document.getElementById('doubao-input');
                if (inputField) {
                    if (finalTranscript) {
                        inputField.value = finalTranscript;
                        // 自动发送
                        setTimeout(() => {
                            if (window.doubaoAI) {
                                window.doubaoAI.sendMessage();
                            }
                        }, 500);
                    } else if (interimTranscript) {
                        inputField.value = interimTranscript;
                    }
                }
                
                // 重置静音检测计时器（单次模式下）
                if (window.doubaoVoiceSettings && !window.doubaoVoiceSettings.voiceInputToggle.checked) {
                    window.doubaoVoiceSettings.resetVoiceSilenceTimer();
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('[Voice] 语音识别错误:', event.error);
                
                // 检查是否是一键常开模式
                const isAlwaysOn = window.doubaoVoiceSettings && 
                                   window.doubaoVoiceSettings.voiceInputToggle && 
                                   window.doubaoVoiceSettings.voiceInputToggle.checked;
                
                // 清空输入栏
                const inputField = document.getElementById('doubao-input');
                if (inputField) {
                    inputField.value = '';
                }
                
                switch(event.error) {
                    case 'no-speech':
                        // 未检测到语音，不显示提示，静默处理
                        console.log('[Voice] 未检测到语音，已清空输入栏');
                        // 如果是一键常开模式且长时间未检测到语音，保持监听状态
                        if (isAlwaysOn && window.doubaoVoiceSettings && window.doubaoVoiceSettings.voiceInputActive) {
                            console.log('[Voice] 一键常开模式：继续保持监听');
                            // 3秒后自动重新启动（如果需要）
                            setTimeout(() => {
                                if (window.doubaoVoiceSettings && window.doubaoVoiceSettings.voiceInputActive && !this.isRecording) {
                                    console.log('[Voice] 自动重新启动语音识别');
                                    this.startVoiceInput().catch(err => console.error('[Voice] 自动重启失败:', err));
                                }
                            }, 3000);
                        }
                        break;
                    case 'audio-capture':
                        this.isRecording = false;
                        this.updateVoiceButtonState(false);
                        if (window.doubaoAI) {
                            window.doubaoAI.addMessage('system', '无法访问麦克风');
                        }
                        break;
                    case 'not-allowed':
                        this.isRecording = false;
                        this.updateVoiceButtonState(false);
                        if (window.doubaoAI) {
                            window.doubaoAI.addMessage('system', '麦克风权限被拒绝');
                        }
                        break;
                    default:
                        this.isRecording = false;
                        this.updateVoiceButtonState(false);
                        if (window.doubaoAI) {
                            window.doubaoAI.addMessage('system', '语音识别出错: ' + event.error);
                        }
                }
            };
        } else {
            console.warn('[Voice] 浏览器不支持语音识别');
        }
        
        this.bindEvents();
    }
    
    bindEvents() {
        // 绑定语音输入按钮
        const voiceBtn = document.getElementById('doubao-voice-input');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceInput();
            });
        }
    }
    
    toggleVoiceInput() {
        if (!this.recognition) {
            alert('您的浏览器不支持语音识别功能');
            return;
        }
        
        // 强制停止正在进行的朗读（无论当前状态如何）
        console.log('[VoiceManager] 强制停止当前朗读');
        this.stop();
        
        if (this.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }
    
    // 启动语音输入
    startVoiceInput() {
        if (!this.recognition) {
            console.error('[Voice] 浏览器不支持语音识别');
            return Promise.reject('不支持语音识别');
        }
        
        if (this.isRecording) {
            console.log('[Voice] 已经在录音中');
            return Promise.resolve();
        }
        
        console.log('[Voice] 请求麦克风权限...');
        
        // 请求麦克风权限并启动
        return navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                console.log('[Voice] 麦克风权限已获取，启动语音识别...');
                this.recognition.start();
                return Promise.resolve();
            })
            .catch((err) => {
                console.error('[Voice] 麦克风权限错误:', err);
                throw err;
            });
    }
    
    // 停止语音输入
    stopVoiceInput() {
        if (!this.recognition) {
            console.error('[Voice] 浏览器不支持语音识别');
            return;
        }
        
        if (!this.isRecording) {
            console.log('[Voice] 没有正在进行的录音');
            return;
        }
        
        console.log('[Voice] 停止语音识别...');
        this.recognition.stop();
    }
    
    updateVoiceButtonState(isRecording) {
        const voiceBtn = document.getElementById('doubao-voice-input');
        if (voiceBtn) {
            if (isRecording) {
                voiceBtn.classList.add('recording');
                voiceBtn.innerHTML = `
                    <i class="fas fa-stop"></i>
                    <span class="voice-status">
                        正在聆听
                        <span class="voice-wave">
                            <span></span><span></span><span></span><span></span>
                        </span>
                    </span>
                `;
            } else {
                voiceBtn.classList.remove('recording');
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }
    
    // 朗读文本
    speak(text, messageElement = null) {
        if (!this.synthesis) {
            console.warn('[Voice] 浏览器不支持语音合成');
            return;
        }
        
        // 停止当前播放
        this.stop();
        
        // 创建语音实例
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.lang = 'zh-CN';
        this.currentUtterance.rate = 1.0;
        this.currentUtterance.pitch = 1.0;
        
        // 查找中文语音
        const voices = this.synthesis.getVoices();
        const chineseVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
        if (chineseVoice) {
            this.currentUtterance.voice = chineseVoice;
        }
        
        // 更新按钮状态
        if (messageElement) {
            const ttsBtn = messageElement.querySelector('.tts-btn');
            if (ttsBtn) {
                ttsBtn.classList.add('playing');
                ttsBtn.innerHTML = '<i class="fas fa-stop"></i>';
            }
        }
        
        this.currentUtterance.onend = () => {
            this.currentUtterance = null;
            if (messageElement) {
                const ttsBtn = messageElement.querySelector('.tts-btn');
                if (ttsBtn) {
                    ttsBtn.classList.remove('playing');
                    ttsBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                }
            }
        };
        
        this.currentUtterance.onerror = (event) => {
            console.error('[Voice] 语音合成错误:', event);
            this.currentUtterance = null;
            if (messageElement) {
                const ttsBtn = messageElement.querySelector('.tts-btn');
                if (ttsBtn) {
                    ttsBtn.classList.remove('playing');
                    ttsBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                }
            }
        };
        
        this.synthesis.speak(this.currentUtterance);
    }
    
    stop() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        this.currentUtterance = null;
    }
    
    // 为消息添加朗读按钮
    addTTSButton(messageElement, text) {
        const contentDiv = messageElement.querySelector('.content');
        if (!contentDiv) return;
        
        // 检查是否已存在朗读按钮
        if (contentDiv.querySelector('.tts-btn')) return;
        
        const ttsBtn = document.createElement('button');
        ttsBtn.className = 'tts-btn';
        ttsBtn.title = '朗读';
        ttsBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        
        ttsBtn.addEventListener('click', () => {
            if (ttsBtn.classList.contains('playing')) {
                this.stop();
                ttsBtn.classList.remove('playing');
                ttsBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else {
                this.speak(text, messageElement);
            }
        });
        
        // 添加到消息头部或内容区域
        const messageHeader = contentDiv.querySelector('.message-header');
        if (messageHeader) {
            const actionsDiv = messageHeader.querySelector('.message-actions') || document.createElement('div');
            actionsDiv.className = 'message-actions';
            actionsDiv.appendChild(ttsBtn);
            if (!messageHeader.querySelector('.message-actions')) {
                messageHeader.appendChild(actionsDiv);
            }
        } else {
            contentDiv.appendChild(ttsBtn);
        }
    }
}

// 初始化豆包AI
document.addEventListener('DOMContentLoaded', () => {
    window.doubaoAI = new DoubaoAI();
    window.voiceManager = new VoiceManager();
    window.aiController = new AIWebsiteController();
});

// ==================== 豆包AI语音设置 ====================
class DoubaoVoiceSettings {
    constructor() {
        this.voiceInputToggle = document.getElementById('doubao-voice-input-toggle');
        this.ttsToggle = document.getElementById('doubao-tts-toggle');
        this.voiceShortcutInput = document.getElementById('voice-input-shortcut');
        this.ttsShortcutInput = document.getElementById('tts-shortcut');
        this.clearVoiceShortcutBtn = document.getElementById('clear-voice-shortcut');
        this.clearTtsShortcutBtn = document.getElementById('clear-tts-shortcut');
        
        this.voiceShortcut = null;
        this.ttsShortcut = null;
        this.recordingShortcut = null;
        
        // 状态跟踪
        this.voiceInputActive = false;  // 语音输入当前是否激活
        this.ttsActive = false;         // 朗读模式当前是否激活
        
        this.init();
    }
    
    init() {
        console.log('[VoiceSettings] 初始化语音设置...');
        // 加载保存的设置
        this.loadSettings();
        
        // 绑定事件
        this.bindEvents();
        
        // 绑定全局键盘事件
        this.bindGlobalShortcuts();
        
        console.log('[VoiceSettings] 初始化完成');
    }
    
    bindEvents() {
        // 语音输入开关 - 只控制是否自动启动，不影响快捷键
        if (this.voiceInputToggle) {
            this.voiceInputToggle.addEventListener('change', (e) => {
                this.saveSetting('doubaoVoiceInputEnabled', e.target.checked);
                this.showNotification(e.target.checked ? '语音输入一键常开已启用' : '语音输入一键常开已关闭');
            });
        }
        
        // 朗读模式开关 - 只控制是否自动朗读，不影响快捷键
        if (this.ttsToggle) {
            this.ttsToggle.addEventListener('change', (e) => {
                this.saveSetting('doubaoTtsEnabled', e.target.checked);
                this.ttsActive = e.target.checked;
                this.showNotification(e.target.checked ? '朗读模式一键常开已启用' : '朗读模式一键常开已关闭');
            });
        }
        
        // 语音输入快捷键设置
        if (this.voiceShortcutInput) {
            this.voiceShortcutInput.addEventListener('click', () => {
                this.startRecordingShortcut('voice');
            });
            
            this.voiceShortcutInput.addEventListener('keydown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.recordingShortcut === 'voice') {
                    const shortcut = this.getShortcutString(e);
                    if (shortcut) {
                        this.voiceShortcut = shortcut;
                        this.voiceShortcutInput.value = shortcut;
                        this.saveSetting('voiceInputShortcut', shortcut);
                        this.stopRecordingShortcut();
                        this.showNotification(`语音输入快捷键已设置为: ${shortcut}`);
                    }
                }
            });
        }
        
        // 朗读模式快捷键设置
        if (this.ttsShortcutInput) {
            this.ttsShortcutInput.addEventListener('click', () => {
                this.startRecordingShortcut('tts');
            });
            
            this.ttsShortcutInput.addEventListener('keydown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.recordingShortcut === 'tts') {
                    const shortcut = this.getShortcutString(e);
                    if (shortcut) {
                        this.ttsShortcut = shortcut;
                        this.ttsShortcutInput.value = shortcut;
                        this.saveSetting('ttsShortcut', shortcut);
                        this.stopRecordingShortcut();
                        this.showNotification(`朗读模式快捷键已设置为: ${shortcut}`);
                    }
                }
            });
        }
        
        // 清除快捷键按钮
        if (this.clearVoiceShortcutBtn) {
            this.clearVoiceShortcutBtn.addEventListener('click', () => {
                this.voiceShortcut = null;
                this.voiceShortcutInput.value = '';
                this.saveSetting('voiceInputShortcut', null);
                this.showNotification('语音输入快捷键已清除');
            });
        }
        
        if (this.clearTtsShortcutBtn) {
            this.clearTtsShortcutBtn.addEventListener('click', () => {
                this.ttsShortcut = null;
                this.ttsShortcutInput.value = '';
                this.saveSetting('ttsShortcut', null);
                this.showNotification('朗读模式快捷键已清除');
            });
        }
    }
    
    startRecordingShortcut(type) {
        this.recordingShortcut = type;
        const input = type === 'voice' ? this.voiceShortcutInput : this.ttsShortcutInput;
        input.value = '请按组合键...';
        input.classList.add('recording');
        
        // 5秒后自动取消
        setTimeout(() => {
            if (this.recordingShortcut === type) {
                this.stopRecordingShortcut();
                const savedShortcut = type === 'voice' ? this.voiceShortcut : this.ttsShortcut;
                input.value = savedShortcut || '';
            }
        }, 5000);
    }
    
    stopRecordingShortcut() {
        if (this.voiceShortcutInput) {
            this.voiceShortcutInput.classList.remove('recording');
        }
        if (this.ttsShortcutInput) {
            this.ttsShortcutInput.classList.remove('recording');
        }
        this.recordingShortcut = null;
    }
    
    getShortcutString(e) {
        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.metaKey) keys.push('Meta');
        
        // 获取按键名称
        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1) key = key.toUpperCase();
        
        // 忽略单独的修饰键
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            return null;
        }
        
        keys.push(key);
        return keys.join('+');
    }
    
    bindGlobalShortcuts() {
        console.log('[VoiceSettings] 绑定全局快捷键...');
        
        // 使用keydown事件，确保在捕获阶段处理
        document.addEventListener('keydown', (e) => {
            // 如果正在设置快捷键，不触发功能
            if (this.recordingShortcut) return;
            
            const shortcut = this.getShortcutString(e);
            if (!shortcut) return;
            
            // 语音输入快捷键
            if (shortcut === this.voiceShortcut) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[VoiceSettings] 语音输入快捷键触发:', shortcut);
                this.handleVoiceInputShortcut();
            }
            
            // AI控制语音快捷键
            if (window.aiController && window.aiController.handleVoiceShortcut(e)) {
                return;
            }
            
            // 朗读模式快捷键
            if (shortcut === this.ttsShortcut) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[VoiceSettings] 朗读模式快捷键触发:', shortcut);
                this.handleTtsShortcut();
            }
        }, true); // 使用捕获阶段
    }
    
    handleVoiceInputShortcut() {
        console.log('[VoiceSettings] 处理语音输入快捷键，当前状态:', this.voiceInputActive);
        
        // 强制停止正在进行的朗读（无论当前状态如何）
        if (window.voiceManager) {
            console.log('[VoiceSettings] 强制停止当前朗读');
            window.voiceManager.stop();
        }
        
        const isAlwaysOn = this.voiceInputToggle && this.voiceInputToggle.checked;
        
        // 当语音输入一键常开功能开启时，自动关闭朗读模式
        if (isAlwaysOn && !this.voiceInputActive) {
            console.log('[VoiceSettings] 语音输入一键常开模式开启，自动关闭朗读模式');
            if (this.ttsActive) {
                this.ttsActive = false;
                if (window.doubaoAI) {
                    window.doubaoAI.autoTtsEnabled = false;
                }
                // 更新朗读模式开关UI
                if (this.ttsToggle) {
                    this.ttsToggle.checked = false;
                    this.saveSetting('doubaoTtsEnabled', false);
                }
                this.showNotification('朗读模式已自动关闭（语音输入优先）');
            }
        }
        
        if (isAlwaysOn) {
            // 一键常开模式：切换持续监听状态
            if (this.voiceInputActive) {
                // 当前已激活，关闭
                this.stopVoiceInput();
                this.showNotification('语音输入已关闭');
            } else {
                // 当前未激活，开启
                this.startVoiceInput();
                this.showNotification('语音输入已开启（一键常开模式）');
            }
        } else {
            // 单次模式：触发一次语音输入，超时后自动关闭
            if (this.voiceInputActive) {
                // 如果已经在运行，先停止
                this.stopVoiceInput();
                this.showNotification('语音输入已停止');
            } else {
                // 启动单次模式
                this.startVoiceInputSingle();
                this.showNotification('语音输入已启动（单次模式，10秒后自动关闭）');
            }
        }
    }
    
    handleTtsShortcut() {
        console.log('[VoiceSettings] 处理朗读模式快捷键，当前状态:', this.ttsActive);
        
        const isAlwaysOn = this.ttsToggle && this.ttsToggle.checked;
        
        if (isAlwaysOn) {
            // 一键常开模式：切换自动朗读状态
            if (this.ttsActive) {
                // 当前已激活，关闭
                this.ttsActive = false;
                if (window.doubaoAI) {
                    window.doubaoAI.autoTtsEnabled = false;
                }
                this.showNotification('朗读模式已关闭');
            } else {
                // 当前未激活，开启
                this.ttsActive = true;
                if (window.doubaoAI) {
                    window.doubaoAI.autoTtsEnabled = true;
                }
                this.showNotification('朗读模式已开启（一键常开模式）');
                
                // 立即朗读最后一条消息作为演示
                if (window.doubaoAI) {
                    setTimeout(() => {
                        window.doubaoAI.speakLastMessage();
                    }, 500);
                }
            }
        } else {
            // 单次模式：朗读最后一条消息
            if (window.doubaoAI) {
                window.doubaoAI.speakLastMessage();
                this.showNotification('正在朗读最后一条消息');
            } else {
                this.showNotification('朗读功能未就绪');
            }
        }
    }
    
    startVoiceInput() {
        console.log('[VoiceSettings] 启动语音输入...');
        
        if (!window.voiceManager) {
            this.showNotification('语音功能未初始化，请刷新页面重试');
            console.error('[VoiceSettings] voiceManager未初始化');
            return;
        }
        
        if (!window.voiceManager.recognition) {
            this.showNotification('浏览器不支持语音识别');
            console.error('[VoiceSettings] 浏览器不支持语音识别');
            return;
        }
        
        this.voiceInputActive = true;
        
        // 立即启动语音识别
        window.voiceManager.startVoiceInput()
            .then(() => {
                console.log('[VoiceSettings] 语音识别已启动');
            })
            .catch((err) => {
                console.error('[VoiceSettings] 启动语音识别失败:', err);
                this.showNotification('启动语音识别失败: ' + err.message);
                this.voiceInputActive = false;
            });
        
        // 保存状态到localStorage
        this.saveSetting('voiceInputActive', 'true');
        
        // 启动持续监听循环
        const keepListening = () => {
            if (!this.voiceInputActive) {
                console.log('[VoiceSettings] 语音输入已停止，退出监听循环');
                return;
            }
            
            // 如果不在录音状态，重新启动
            if (!window.voiceManager.isRecording) {
                console.log('[VoiceSettings] 检测到录音停止，重新启动...');
                window.voiceManager.startVoiceInput()
                    .catch((err) => {
                        console.error('[VoiceSettings] 重新启动语音识别失败:', err);
                    });
            }
            
            // 每3秒检查一次
            setTimeout(keepListening, 3000);
        };
        
        // 延迟启动监听循环，避免与初始启动冲突
        setTimeout(keepListening, 1000);
    }
    
    stopVoiceInput() {
        console.log('[VoiceSettings] 停止语音输入...');
        
        // 清除静音检测计时器
        this.clearVoiceSilenceTimer();
        
        this.voiceInputActive = false;
        
        if (window.voiceManager) {
            try {
                window.voiceManager.stopVoiceInput();
                console.log('[VoiceSettings] 语音识别已停止');
            } catch (err) {
                console.error('[VoiceSettings] 停止语音识别失败:', err);
            }
        }
        
        this.saveSetting('voiceInputActive', 'false');
    }
    
    startVoiceInputSingle() {
        console.log('[VoiceSettings] 启动单次语音输入...');
        
        if (!window.voiceManager) {
            this.showNotification('语音功能未初始化');
            return;
        }
        
        if (!window.voiceManager.recognition) {
            this.showNotification('浏览器不支持语音识别');
            return;
        }
        
        this.voiceInputActive = true;
        
        // 清除之前的静音计时器
        this.clearVoiceSilenceTimer();
        
        // 启动单次监听
        window.voiceManager.startVoiceInput()
            .then(() => {
                console.log('[VoiceSettings] 单次语音识别已启动');
            })
            .catch((err) => {
                console.error('[VoiceSettings] 启动单次语音识别失败:', err);
                this.showNotification('启动失败: ' + err.message);
                this.voiceInputActive = false;
            });
    }
    
    // 重置静音检测计时器（豆包AI）
    resetVoiceSilenceTimer() {
        this.clearVoiceSilenceTimer();
        
        // 1.5秒静音后自动停止
        this.voiceSilenceTimer = setTimeout(() => {
            if (this.voiceInputActive && !this.voiceInputToggle.checked) {
                console.log('[VoiceSettings] 检测到说话结束，自动停止录音');
                this.stopVoiceInput();
                
                // 如果没有检测到语音，清空输入栏
                const inputField = document.getElementById('doubao-input');
                if (inputField && !inputField.value.trim()) {
                    inputField.value = '';
                }
                
                this.showNotification('语音输入已自动关闭');
            }
        }, 1500); // 1.5秒静音后停止（已确认）
    }
    
    // 清除静音检测计时器（豆包AI）
    clearVoiceSilenceTimer() {
        if (this.voiceSilenceTimer) {
            clearTimeout(this.voiceSilenceTimer);
            this.voiceSilenceTimer = null;
        }
    }
    
    showNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'voice-settings-notification';
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
        
        // 样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    loadSettings() {
        // 加载语音输入开关
        const voiceInputEnabled = localStorage.getItem('doubaoVoiceInputEnabled') === 'true';
        if (this.voiceInputToggle) {
            this.voiceInputToggle.checked = voiceInputEnabled;
        }
        
        // 加载朗读模式开关
        const ttsEnabled = localStorage.getItem('doubaoTtsEnabled') === 'true';
        if (this.ttsToggle) {
            this.ttsToggle.checked = ttsEnabled;
        }
        this.ttsActive = ttsEnabled;
        
        // 加载快捷键
        this.voiceShortcut = localStorage.getItem('voiceInputShortcut');
        if (this.voiceShortcutInput && this.voiceShortcut) {
            this.voiceShortcutInput.value = this.voiceShortcut;
        }
        
        this.ttsShortcut = localStorage.getItem('ttsShortcut');
        if (this.ttsShortcutInput && this.ttsShortcut) {
            this.ttsShortcutInput.value = this.ttsShortcut;
        }
        
        // 恢复语音输入状态（如果之前是开启的）
        const voiceInputActive = localStorage.getItem('voiceInputActive') === 'true';
        if (voiceInputActive && voiceInputEnabled) {
            this.startVoiceInput();
        }
        
        console.log('[VoiceSettings] 设置已加载:', {
            voiceInputEnabled,
            ttsEnabled,
            voiceShortcut: this.voiceShortcut,
            ttsShortcut: this.ttsShortcut
        });
    }
    
    saveSetting(key, value) {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, value);
        }
    }
}

// 初始化豆包AI语音设置
document.addEventListener('DOMContentLoaded', () => {
    window.doubaoVoiceSettings = new DoubaoVoiceSettings();
});