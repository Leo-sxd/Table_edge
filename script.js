/**
 * ============================================
 * 背景特效系统 - 简化优化版
 * ============================================
 * 特性：
 * - 三种粒子特效：静止星星、运动流星、彩色粒子
 * - 滑块控制数量（0=关闭）
 * - 设置持久化到localStorage
 * - 性能优化，最小CPU占用
 */

(function() {
    'use strict';

    // ============================================
    // 全局配置
    // ============================================
    
    /**
     * 特效配置对象
     * 所有数量参数：0表示关闭，>0表示开启并指定粒子数量
     */
    const CONFIG = {
        // 静止闪烁星星
        staticStarCount: 50,        // 数量 (0-100)
        staticStarMinSize: 2,       // 最小大小(像素)
        staticStarMaxSize: 4,       // 最大大小(像素)
        
        // 运动拖尾流星
        meteorCount: 15,            // 数量 (0-30)
        meteorMinSize: 3,           // 最小大小(像素)
        meteorMaxSize: 6,           // 最大大小(像素)
        meteorSpeed: 1.5,           // 基础速度
        
        // 彩色布朗粒子
        colorParticleCount: 5,      // 数量 (0-100)
        colorParticleSize: 3,       // 粒子大小(像素)
        colorParticleSpeed: 0.8,    // 运动速度
        
        // 粒子连线
        connectionCount: 10,        // 最大连线数 (0-30)
        connectionDistance: 100,    // 连线最大距离(像素)
        
        // 性能优化
        targetFPS: 30               // 目标帧率，降低CPU占用
    };

    // ============================================
    // 工具函数
    // ============================================
    
    /**
     * 获取随机数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机数
     */
    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * 获取视口尺寸
     * @returns {object} {width, height}
     */
    function getViewport() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    // ============================================
    // 粒子类定义
    // ============================================
    
    /**
     * 静止闪烁星星类
     * 特性：固定位置，周期性透明度变化模拟闪烁
     */
    class StaticStar {
        constructor(canvasWidth, canvasHeight) {
            this.x = random(0, canvasWidth);
            this.y = random(0, canvasHeight);
            this.size = random(CONFIG.staticStarMinSize, CONFIG.staticStarMaxSize);
            this.baseOpacity = random(0.3, 0.8);
            this.twinkleSpeed = random(0.02, 0.05);
            this.phase = random(0, Math.PI * 2);
        }

        /**
         * 更新星星状态
         * @param {number} time - 当前时间戳
         */
        update(time) {
            // 使用正弦波计算闪烁透明度
            const twinkle = Math.sin(time * this.twinkleSpeed + this.phase);
            this.opacity = this.baseOpacity + twinkle * 0.2;
            // 限制透明度范围
            this.opacity = Math.max(0.1, Math.min(1, this.opacity));
        }

        /**
         * 绘制星星
         * @param {CanvasRenderingContext2D} ctx - Canvas上下文
         */
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    /**
     * 运动拖尾流星类
     * 特性：从屏幕边缘进入，带拖尾效果移动
     */
    class Meteor {
        constructor(canvasWidth, canvasHeight) {
            this.reset(canvasWidth, canvasHeight);
        }

        /**
         * 重置流星位置和属性
         * @param {number} w - 画布宽度
         * @param {number} h - 画布高度
         */
        reset(w, h) {
            // 随机选择入场边：上、左、右
            const side = Math.random();
            
            if (side < 0.33) {
                // 从顶部进入
                this.x = random(0, w);
                this.y = -20;
                this.vx = random(-0.5, 0.5);
                this.vy = random(0.5, 2);
            } else if (side < 0.66) {
                // 从左侧进入
                this.x = -20;
                this.y = random(0, h * 0.5);
                this.vx = random(0.5, 2);
                this.vy = random(0.2, 1);
            } else {
                // 从右侧进入
                this.x = w + 20;
                this.y = random(0, h * 0.5);
                this.vx = random(-2, -0.5);
                this.vy = random(0.2, 1);
            }

            this.size = random(CONFIG.meteorMinSize, CONFIG.meteorMaxSize);
            this.opacity = random(0.4, 0.8);
            this.trail = [];  // 拖尾点数组
            this.maxTrailLength = 10;
        }

        /**
         * 更新流星位置
         * @param {number} w - 画布宽度
         * @param {number} h - 画布高度
         */
         update(w, h) {
            // 保存当前位置到拖尾
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // 更新位置
            this.x += this.vx * CONFIG.meteorSpeed;
            this.y += this.vy * CONFIG.meteorSpeed;

            // 检查是否飞出屏幕
            if (this.x < -50 || this.x > w + 50 || this.y > h + 50) {
                this.reset(w, h);
            }
        }

        /**
         * 绘制流星及拖尾
         * @param {CanvasRenderingContext2D} ctx - Canvas上下文
         */
        draw(ctx) {
            // 绘制拖尾
            if (this.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.5})`;
                ctx.lineWidth = this.size * 0.5;
                ctx.stroke();
            }

            // 绘制流星本体
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.fill();
        }
    }

    /**
     * 彩色布朗粒子类
     * 特性：随机布朗运动，彩色显示
     */
    class ColorParticle {
        constructor(canvasWidth, canvasHeight) {
            this.x = random(0, canvasWidth);
            this.y = random(canvasHeight * 0.5, canvasHeight);  // 只在下半部分
            this.size = CONFIG.colorParticleSize;
            this.hue = random(0, 360);  // 随机色相
            this.vx = 0;
            this.vy = 0;
        }

        /**
         * 更新粒子位置（布朗运动）
         * @param {number} w - 画布宽度
         * @param {number} h - 画布高度
         */
        update(w, h) {
            // 随机速度变化（布朗运动）
            this.vx += random(-0.2, 0.2);
            this.vy += random(-0.2, 0.2);

            // 限制最大速度
            const maxSpeed = CONFIG.colorParticleSpeed;
            this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));
            this.vy = Math.max(-maxSpeed, Math.min(maxSpeed, this.vy));

            // 更新位置
            this.x += this.vx;
            this.y += this.vy;

            // 边界反弹
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < h * 0.5 || this.y > h) this.vy *= -1;

            // 限制在屏幕内
            this.x = Math.max(0, Math.min(w, this.x));
            this.y = Math.max(h * 0.5, Math.min(h, this.y));
        }

        /**
         * 绘制彩色粒子
         * @param {CanvasRenderingContext2D} ctx - Canvas上下文
         */
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, 0.9)`;
            ctx.fill();
        }
    }

    // ============================================
    // 粒子系统管理器
    // ============================================
    
    class ParticleSystem {
        constructor() {
            // 初始化画布
            this.initCanvas();
            
            // 粒子数组
            this.staticStars = [];
            this.meteors = [];
            this.colorParticles = [];
            
            // 动画控制
            this.isRunning = false;
            this.animationId = null;
            this.lastFrameTime = 0;
            this.frameInterval = 1000 / CONFIG.targetFPS;
            
            // 初始化粒子
            this.updateParticles();
            
            // 绑定事件
            this.bindEvents();
            
            // 开始动画
            this.start();
        }

        /**
         * 初始化画布
         */
        initCanvas() {
            const viewport = getViewport();
            
            // 创建静止星星画布（底层）
            this.staticCanvas = document.createElement('canvas');
            this.staticCanvas.id = 'static-stars-canvas';
            this.staticCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
            this.staticCtx = this.staticCanvas.getContext('2d');
            this.staticCanvas.width = viewport.width;
            this.staticCanvas.height = viewport.height;
            document.body.appendChild(this.staticCanvas);
            
            // 创建流星画布（中层）
            this.meteorCanvas = document.createElement('canvas');
            this.meteorCanvas.id = 'meteor-canvas';
            this.meteorCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
            this.meteorCtx = this.meteorCanvas.getContext('2d');
            this.meteorCanvas.width = viewport.width;
            this.meteorCanvas.height = viewport.height;
            document.body.appendChild(this.meteorCanvas);
            
            // 创建彩色粒子画布（顶层）
            this.colorCanvas = document.createElement('canvas');
            this.colorCanvas.id = 'color-particles-canvas';
            this.colorCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;';
            this.colorCtx = this.colorCanvas.getContext('2d');
            this.colorCanvas.width = viewport.width;
            this.colorCanvas.height = viewport.height;
            document.body.appendChild(this.colorCanvas);
        }

        /**
         * 更新所有粒子（根据配置数量）
         */
        updateParticles() {
            const viewport = getViewport();
            
            // 更新静止星星
            this.updateArray(this.staticStars, CONFIG.staticStarCount, 
                () => new StaticStar(viewport.width, viewport.height));
            
            // 更新流星
            this.updateArray(this.meteors, CONFIG.meteorCount,
                () => new Meteor(viewport.width, viewport.height));
            
            // 更新彩色粒子
            this.updateArray(this.colorParticles, CONFIG.colorParticleCount,
                () => new ColorParticle(viewport.width, viewport.height));
        }

        /**
         * 更新粒子数组（通用方法）
         * @param {Array} array - 粒子数组
         * @param {number} targetCount - 目标数量
         * @param {Function} factory - 粒子工厂函数
         */
        updateArray(array, targetCount, factory) {
            // 数量减少到目标值
            while (array.length > targetCount) {
                array.pop();
            }
            // 数量增加到目标值
            while (array.length < targetCount) {
                array.push(factory());
            }
        }

        /**
         * 绑定窗口事件
         */
        bindEvents() {
            // 窗口大小改变时重新调整画布
            window.addEventListener('resize', () => {
                const viewport = getViewport();
                this.staticCanvas.width = viewport.width;
                this.staticCanvas.height = viewport.height;
                this.meteorCanvas.width = viewport.width;
                this.meteorCanvas.height = viewport.height;
                this.colorCanvas.width = viewport.width;
                this.colorCanvas.height = viewport.height;
                // 重新创建粒子以适应新尺寸
                this.updateParticles();
            });
        }

        /**
         * 开始动画循环
         */
        start() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.animate(0);
            }
        }

        /**
         * 停止动画循环
         */
        stop() {
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }

        /**
         * 动画循环（带帧率控制）
         * @param {number} timestamp - 当前时间戳
         */
        animate(timestamp) {
            if (!this.isRunning) return;

            // 帧率控制
            const elapsed = timestamp - this.lastFrameTime;
            if (elapsed < this.frameInterval) {
                this.animationId = requestAnimationFrame((t) => this.animate(t));
                return;
            }
            this.lastFrameTime = timestamp - (elapsed % this.frameInterval);

            const viewport = getViewport();

            // 绘制静止星星
            this.drawParticles(this.staticCtx, this.staticStars, viewport, (star) => {
                star.update(timestamp);
            });

            // 绘制流星
            this.drawParticles(this.meteorCtx, this.meteors, viewport, (meteor) => {
                meteor.update(viewport.width, viewport.height);
            });

            // 绘制彩色粒子
            this.drawParticles(this.colorCtx, this.colorParticles, viewport, (particle) => {
                particle.update(viewport.width, viewport.height);
            });

            // 绘制连线（如果启用）
            if (CONFIG.connectionCount > 0 && this.colorParticles.length > 0) {
                this.drawConnections();
            }

            this.animationId = requestAnimationFrame((t) => this.animate(t));
        }

        /**
         * 绘制粒子（通用方法）
         * @param {CanvasRenderingContext2D} ctx - Canvas上下文
         * @param {Array} particles - 粒子数组
         * @param {object} viewport - 视口尺寸
         * @param {Function} updateFn - 更新函数
         */
        drawParticles(ctx, particles, viewport, updateFn) {
            // 清空画布
            ctx.clearRect(0, 0, viewport.width, viewport.height);
            
            // 更新并绘制每个粒子
            particles.forEach(particle => {
                updateFn(particle);
                particle.draw(ctx);
            });
        }

        /**
         * 绘制粒子连线
         */
        drawConnections() {
            const ctx = this.colorCtx;
            const particles = this.colorParticles;
            const maxConnections = Math.min(CONFIG.connectionCount, 10);
            let connectionCount = 0;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;

            for (let i = 0; i < particles.length && connectionCount < maxConnections; i++) {
                for (let j = i + 1; j < particles.length && connectionCount < maxConnections; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONFIG.connectionDistance) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        connectionCount++;
                    }
                }
            }
        }
    }

    // ============================================
    // 设置管理器
    // ============================================
    
    class SettingsManager {
        constructor() {
            // 加载保存的设置
            this.loadSettings();
            
            // 绑定UI事件
            this.bindUI();
        }

        /**
         * 从localStorage加载设置
         */
        loadSettings() {
            try {
                const saved = localStorage.getItem('backgroundEffectSettings');
                if (saved) {
                    const settings = JSON.parse(saved);
                    // 应用到CONFIG
                    CONFIG.staticStarCount = settings.staticStarCount ?? 50;
                    CONFIG.meteorCount = settings.meteorCount ?? 15;
                    CONFIG.colorParticleCount = settings.colorParticleCount ?? 5;
                    CONFIG.connectionCount = settings.connectionCount ?? 10;
                }
            } catch (e) {
                console.log('加载设置失败，使用默认值');
            }
        }

        /**
         * 保存设置到localStorage
         */
        saveSettings() {
            try {
                const settings = {
                    staticStarCount: CONFIG.staticStarCount,
                    meteorCount: CONFIG.meteorCount,
                    colorParticleCount: CONFIG.colorParticleCount,
                    connectionCount: CONFIG.connectionCount
                };
                localStorage.setItem('backgroundEffectSettings', JSON.stringify(settings));
            } catch (e) {
                console.log('保存设置失败');
            }
        }

        /**
         * 绑定UI控件事件
         */
        bindUI() {
            // 滑块配置
            const sliders = [
                { id: 'static-stars-slider', config: 'staticStarCount', valueId: 'static-stars-value' },
                { id: 'meteor-slider', config: 'meteorCount', valueId: 'meteor-value' },
                { id: 'particles-slider', config: 'colorParticleCount', valueId: 'particles-value' },
                { id: 'connections-slider', config: 'connectionCount', valueId: 'connections-value' }
            ];

            sliders.forEach(({ id, config, valueId }) => {
                const slider = document.getElementById(id);
                const valueDisplay = document.getElementById(valueId);

                if (slider) {
                    // 设置初始值
                    slider.value = CONFIG[config];
                    if (valueDisplay) valueDisplay.textContent = CONFIG[config];

                    // 绑定input事件
                    slider.addEventListener('input', (e) => {
                        const value = parseInt(e.target.value) || 0;
                        CONFIG[config] = value;
                        if (valueDisplay) valueDisplay.textContent = value;
                        
                        // 更新粒子系统
                        if (window.particleSystem) {
                            window.particleSystem.updateParticles();
                        }
                        
                        // 保存设置
                        this.saveSettings();
                    });
                }
            });
        }
    }

    // ============================================
    // 初始化
    // ============================================
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // 创建粒子系统
        window.particleSystem = new ParticleSystem();
        
        // 创建设置管理器
        window.settingsManager = new SettingsManager();
        
        console.log('背景特效系统初始化完成');
    }

})();


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

// ==================== 设置面板控制 ====================
class SettingsManager {
    constructor() {
        // 从localStorage加载设置，或使用默认值
        this.settings = this.loadSettings();
        this.init();
    }
    
    // 默认设置 - 只保留4个数值参数（0表示关闭）
    getDefaultSettings() {
        return {
            staticStarCount: 50,    // 静止闪烁星星数量
            meteorCount: 15,        // 运动拖尾流星数量
            colorParticleCount: 5,  // 彩色布朗粒子数量
            connectionCount: 10     // 粒子连线最大数量
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
        this.settingsBtn = document.getElementById('settings-btn');
        this.modalOverlay = document.getElementById('settings-modal-overlay');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.closeBtn = document.getElementById('close-settings');
        
        // 获取开关和滑块元素
        this.controls = {
            staticStars: {
                slider: document.getElementById('static-stars-slider'),
                value: document.getElementById('static-stars-value')
            },
            meteor: {
                slider: document.getElementById('meteor-slider'),
                value: document.getElementById('meteor-value')
            },
            particles: {
                slider: document.getElementById('particles-slider'),
                value: document.getElementById('particles-value')
            },
            connections: {
                slider: document.getElementById('connections-slider'),
                value: document.getElementById('connections-value')
            }
        };
        
        // 初始化UI状态
        this.initUI();
        
        // 绑定事件
        this.bindEvents();
        
        // 应用初始设置
        this.applySettings();
    }
    
    initUI() {
        // 设置滑块的初始值
        const mapping = {
            'staticStars': 'staticStarCount',
            'meteor': 'meteorCount',
            'particles': 'colorParticleCount',
            'connections': 'connectionCount'
        };
        
        Object.keys(this.controls).forEach(key => {
            const control = this.controls[key];
            const settingKey = mapping[key];
            const value = this.settings[settingKey];
            
            if (control.slider) control.slider.value = value;
            if (control.value) control.value.textContent = value;
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
        this.bindEffectControl('staticStars', 'staticStars');
        this.bindEffectControl('meteor', 'meteor');
        this.bindEffectControl('particles', 'particles');
        this.bindEffectControl('connections', 'connections');
    }
    
    bindEffectControl(controlKey, settingKey) {
        const control = this.controls[controlKey];
        
        // 滑块input事件 - 实时更新
        if (control.slider) {
            control.slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (control.value) control.value.textContent = value;
                this.updateParticleCount(settingKey, value);
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
    
applySettings() {
        // 直接更新EFFECT_CONFIG
        EFFECT_CONFIG.staticStarCount = this.settings.staticStarCount;
        EFFECT_CONFIG.meteorCount = this.settings.meteorCount;
        EFFECT_CONFIG.colorParticleCount = this.settings.colorParticleCount;
        EFFECT_CONFIG.connectionCount = this.settings.connectionCount;
        
        console.log('【应用设置】', EFFECT_CONFIG);
        
        // 应用到粒子系统
        if (window.particleSystem) {
            // 根据数量决定是否重新创建粒子
            window.particleSystem.createStaticStars();
            window.particleSystem.createParticles();
            window.particleSystem.createMouseFollowParticles();
            
            console.log('【粒子数量】', {
                静止星星: window.particleSystem.staticStars.length,
                流星: window.particleSystem.particles.length,
                彩色粒子: window.particleSystem.mouseFollowParticles.length
            });
        }
    }
    
    // 更新粒子数量（滑块实时预览）
    updateParticleCount(effectType, count) {
        // 确保数量不小于0
        count = Math.max(0, parseInt(count) || 0);
        
        // 更新设置
        this.settings[effectType] = count;
        
        // 更新EFFECT_CONFIG
        switch(effectType) {
            case 'staticStarCount':
                EFFECT_CONFIG.staticStarCount = count;
                if (window.particleSystem) {
                    window.particleSystem.createStaticStars();
                }
                break;
            case 'meteorCount':
                EFFECT_CONFIG.meteorCount = count;
                if (window.particleSystem) {
                    window.particleSystem.createParticles();
                }
                break;
            case 'colorParticleCount':
                EFFECT_CONFIG.colorParticleCount = count;
                if (window.particleSystem) {
                    window.particleSystem.createMouseFollowParticles();
                }
                break;
            case 'connectionCount':
                EFFECT_CONFIG.connectionCount = count;
                break;
        }
        
        // 保存到localStorage
        this.saveSettings();
        
        console.log(`【数量更新】${effectType}: ${count}`);
    }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

