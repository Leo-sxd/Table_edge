/**
 * 星星粒子效果 - 轻量级 Canvas 实现（优化版 + 精确拖尾效果 + 静态闪烁星星）
 * 特性：
 * - 2.4-6像素大小的星星形状（放大20%）
 * - 30%-70%透明度
 * - 随机漂浮动画（移动流星效果）
 * - 精确控制拖尾长度：星星本体宽度的8-12倍
 * - 静态闪烁星星效果：在页面80%高度范围内随机位置闪烁
 * - 性能优化：requestAnimationFrame
 * - 移动端优化：解决初始加载边缘聚集问题
 */

(function() {
    'use strict';

    // 粒子系统配置
    const CONFIG = {
        // 移动流星（Particle）配置
        particleCount: 7,        // 粒子数量（适中，不影响性能）
        minSize: 4,             // 最小粒子大小（像素）- 放大20%
        maxSize: 8,               // 最大粒子大小（像素）- 放大20%
        minOpacity: 0.3,          // 最小透明度（30%）
        maxOpacity: 0.7,          // 最大透明度（70%）
        // 速度配置：随机速度范围
        // 原2cm/s ≈ 1.3像素/帧作为中等速度参考
        // 最慢速度：0.5cm/s (约0.3像素/帧) - 显著慢于普通速度
        // 最快速度：5cm/s (约3.2像素/帧) - 明显快于普通速度
        minSpeed: 0.3,            // 最慢速度（像素/帧）
        maxSpeed: 3.2,            // 最快速度（像素/帧）
        speedVariation: 0.3,      // 速度变化范围（±30%，用于动态调整）
        rotationSpeed: 0.02,      // 旋转速度
        connectionDistance: 100,  // 连线距离（可选功能）
        color: '255, 255, 255',   // 白色粒子
        trailOpacity: 0.5,        // 拖尾透明度（增加以更明显）
        trailWidth: 2,            // 拖尾基础宽度
        trailLengthMin: 8,        // 拖尾长度倍数（最小）
        trailLengthMax: 12,       // 拖尾长度倍数（最大）
        spawnMargin: 100,         // 屏幕外生成边距
        
        // 静态闪烁星星（StaticStar）配置
        staticStarCount: 50,      // 静态星星数量
        staticStarMinSize: 3,   // 静态星星最小大小
        staticStarMaxSize: 6,   // 静态星星最大大小
        staticStarMinOpacity: 0.1,// 静态星星最小透明度
        staticStarMaxOpacity: 0.8,// 静态星星最大透明度
        staticStarHeightPercent: 0.8, // 出现范围：页面高度的80%
        staticStarTwinkleMin: 0.01,   // 最小闪烁速度
        staticStarTwinkleMax: 0.03,   // 最大闪烁速度
        staticStarColor: '255, 255, 255' // 静态星星颜色
    };

    // 获取准确的视口尺寸（兼容移动端）
    function getViewportSize() {
        const width = Math.max(
            document.documentElement.clientWidth || 0,
            window.innerWidth || 0
        );
        const height = Math.max(
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0
        );
        return { width, height };
    }

    // ==================== 移动流星类（增强版）====================
    class Particle {
        constructor(canvasWidth, canvasHeight) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.reset(true);
        }

        reset(initial = false) {
            const viewport = getViewportSize();
            
            // 星星大小（外半径）
            this.size = Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize;
            this.opacity = Math.random() * (CONFIG.maxOpacity - CONFIG.minOpacity) + CONFIG.minOpacity;

            // 星星本体宽度（直径）= size * 2
            const bodyWidth = this.size * 2;
            
            // 计算拖尾目标长度：本体宽度的8-12倍
            const trailLengthMultiplier = Math.random() * 
                (CONFIG.trailLengthMax - CONFIG.trailLengthMin) + CONFIG.trailLengthMin;
            this.targetTrailLength = bodyWidth * trailLengthMultiplier;
            
            // 设置移动速度：在minSpeed和maxSpeed之间随机取值
            // 使用线性随机确保速度分布均匀
            this.speed = Math.random() * (CONFIG.maxSpeed - CONFIG.minSpeed) + CONFIG.minSpeed;
            
            // 随机选择从哪条边进入（0:上, 1:右, 2:下, 3:左）
            const edge = Math.floor(Math.random() * 4);
            
            // 计算进入角度（指向屏幕内）
            let entryAngle;
            switch(edge) {
                case 0: // 从上边进入，向下移动
                    this.x = Math.random() * (viewport.width + 2 * CONFIG.spawnMargin) - CONFIG.spawnMargin;
                    this.y = -CONFIG.spawnMargin;
                    entryAngle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
                    break;
                case 1: // 从右边进入，向左移动
                    this.x = viewport.width + CONFIG.spawnMargin;
                    this.y = Math.random() * (viewport.height + 2 * CONFIG.spawnMargin) - CONFIG.spawnMargin;
                    entryAngle = Math.PI + (Math.random() - 0.5) * Math.PI / 3;
                    break;
                case 2: // 从下边进入，向上移动
                    this.x = Math.random() * (viewport.width + 2 * CONFIG.spawnMargin) - CONFIG.spawnMargin;
                    this.y = viewport.height + CONFIG.spawnMargin;
                    entryAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
                    break;
                case 3: // 从左边进入，向右移动
                    this.x = -CONFIG.spawnMargin;
                    this.y = Math.random() * (viewport.height + 2 * CONFIG.spawnMargin) - CONFIG.spawnMargin;
                    entryAngle = (Math.random() - 0.5) * Math.PI / 3;
                    break;
            }
            
            // 设置速度向量
            this.vx = Math.cos(entryAngle) * this.speed;
            this.vy = Math.sin(entryAngle) * this.speed;

            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * CONFIG.rotationSpeed;

            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinklePhase = Math.random() * Math.PI * 2;

            // 拖尾相关属性
            this.trail = []; // 存储拖尾位置点
            this.currentTrailLength = 0; // 当前拖尾长度（像素）
            this.isActive = true; // 是否活跃
        }

        update(canvasWidth, canvasHeight) {
            if (!this.isActive) return;

            // 保存当前位置到拖尾数组
            this.trail.push({
                x: this.x,
                y: this.y,
                angle: this.angle,
                opacity: this.opacity
            });

            // 计算当前拖尾长度
            this.currentTrailLength = this.calculateTrailLength();
            
            // 限制拖尾长度在目标范围内
            while (this.currentTrailLength > this.targetTrailLength && this.trail.length > 2) {
                this.trail.shift();
                this.currentTrailLength = this.calculateTrailLength();
            }

            // 更新位置
            this.x += this.vx;
            this.y += this.vy;

            this.angle += this.rotationSpeed;
            this.twinklePhase += this.twinkleSpeed;

            // 检查是否完全飞出屏幕（包括边距）
            const margin = CONFIG.spawnMargin;
            if (this.x < -margin || this.x > canvasWidth + margin ||
                this.y < -margin || this.y > canvasHeight + margin) {
                // 完全飞出屏幕，重新生成
                this.reset();
            }
        }

        // 计算拖尾的实际像素长度
        calculateTrailLength() {
            if (this.trail.length < 2) return 0;
            
            let length = 0;
            for (let i = 1; i < this.trail.length; i++) {
                const dx = this.trail[i].x - this.trail[i-1].x;
                const dy = this.trail[i].y - this.trail[i-1].y;
                length += Math.sqrt(dx * dx + dy * dy);
            }
            return length;
        }

        draw(ctx) {
            if (!this.isActive) return;
            
            // 先绘制拖尾（在星星后面）
            this.drawTrail(ctx);

            // 绘制星星主体
            const twinkle = Math.sin(this.twinklePhase) * 0.2;
            const currentOpacity = Math.max(0.1, Math.min(1, this.opacity + twinkle));

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            this.drawStar(ctx, 0, 0, this.size, currentOpacity);
            ctx.restore();
        }

        drawTrail(ctx) {
            if (this.trail.length < 2) return;

            // 绘制拖尾主体 - 从头部（连接星星处）到尾部逐渐变淡
            ctx.save();
            
            // 创建从头部到尾部的渐变效果
            // trail[trail.length-1] 是头部（最新位置，连接星星）
            // trail[0] 是尾部（最旧位置）
            for (let i = this.trail.length - 2; i >= 0; i--) {
                const currentPoint = this.trail[i];
                const nextPoint = this.trail[i + 1];
                
                // 计算位置比例（1 = 头部连接星星处，0 = 尾部末端）
                const positionRatio = (i + 1) / (this.trail.length - 1);
                
                // 宽度渐变：头部最粗，尾部最细
                const widthRatio = 0.2 + positionRatio * 0.8;
                const lineWidth = CONFIG.trailWidth * widthRatio;
                
                // 透明度渐变：头部最亮（1.0），尾部最暗（0.0）
                // 使用指数函数使渐变更自然
                const alpha = Math.pow(positionRatio, 0.7) * CONFIG.trailOpacity;

                ctx.beginPath();
                ctx.moveTo(currentPoint.x, currentPoint.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                
                ctx.strokeStyle = `rgba(${CONFIG.color}, ${alpha})`;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // 添加整体发光效果（主要在头部）
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.6})`;
            
            // 重新绘制头部部分以应用发光
            const headStart = Math.max(0, this.trail.length - 5);
            ctx.beginPath();
            ctx.moveTo(this.trail[headStart].x, this.trail[headStart].y);
            for (let i = headStart + 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.4})`;
            ctx.lineWidth = CONFIG.trailWidth * 0.8;
            ctx.stroke();

            ctx.restore();

            // 绘制拖尾末端的淡出光点
            if (this.trail.length > 3) {
                const endPoint = this.trail[0];
                ctx.save();
                ctx.beginPath();
                ctx.arc(endPoint.x, endPoint.y, this.size * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.2})`;
                ctx.shadowBlur = 4;
                ctx.shadowColor = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.3})`;
                ctx.fill();
                ctx.restore();
            }
        }

        drawStar(ctx, cx, cy, size, opacity) {
            const spikes = 4;
            const outerRadius = size;
            const innerRadius = size * 0.4;

            ctx.beginPath();
            ctx.fillStyle = `rgba(${CONFIG.color}, ${opacity})`;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.closePath();
            ctx.fill();

            // 添加发光效果
            ctx.shadowBlur = size * 2;
            ctx.shadowColor = `rgba(${CONFIG.color}, ${opacity * 0.5})`;
        }
    }

    // ==================== 静态闪烁星星类（保持不变）====================
    class StaticStar {
        constructor(canvasWidth, canvasHeight) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.reset();
        }

        reset() {
            const viewport = getViewportSize();
            
            this.x = Math.random() * viewport.width;
            const maxHeight = viewport.height * CONFIG.staticStarHeightPercent;
            this.y = Math.random() * maxHeight;

            this.size = Math.random() * 
                (CONFIG.staticStarMaxSize - CONFIG.staticStarMinSize) + 
                CONFIG.staticStarMinSize;

            this.baseOpacity = Math.random() * 
                (CONFIG.staticStarMaxOpacity - CONFIG.staticStarMinOpacity) + 
                CONFIG.staticStarMinOpacity;

            this.twinkleSpeed = Math.random() * 
                (CONFIG.staticStarTwinkleMax - CONFIG.staticStarTwinkleMin) + 
                CONFIG.staticStarTwinkleMin;
            this.twinklePhase = Math.random() * Math.PI * 2;
            
            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.005;

            this.lifeTime = 0;
            this.maxLifeTime = Math.random() * 300 + 200;
            this.fadeState = 'alive';
            this.fadeProgress = 0;
        }

        update() {
            this.twinklePhase += this.twinkleSpeed;
            this.angle += this.rotationSpeed;

            this.lifeTime++;
            
            if (this.fadeState === 'alive' && this.lifeTime > this.maxLifeTime) {
                this.fadeState = 'fading';
                this.fadeProgress = 0;
            } else if (this.fadeState === 'fading') {
                this.fadeProgress += 0.02;
                if (this.fadeProgress >= 1) {
                    this.fadeState = 'respawning';
                    this.fadeProgress = 0;
                    const viewport = getViewportSize();
                    this.x = Math.random() * viewport.width;
                    const maxHeight = viewport.height * CONFIG.staticStarHeightPercent;
                    this.y = Math.random() * maxHeight;
                }
            } else if (this.fadeState === 'respawning') {
                this.fadeProgress += 0.02;
                if (this.fadeProgress >= 1) {
                    this.fadeState = 'alive';
                    this.lifeTime = 0;
                    this.maxLifeTime = Math.random() * 300 + 200;
                }
            }
        }

        draw(ctx) {
            const twinkle = Math.sin(this.twinklePhase) * 0.3;
            let currentOpacity = this.baseOpacity + twinkle;
            
            if (this.fadeState === 'fading') {
                currentOpacity *= (1 - this.fadeProgress);
            } else if (this.fadeState === 'respawning') {
                currentOpacity *= this.fadeProgress;
            }
            
            currentOpacity = Math.max(0, Math.min(1, currentOpacity));

            if (currentOpacity <= 0.01) return;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            this.drawStar(ctx, 0, 0, this.size, currentOpacity);
            ctx.restore();
        }

        drawStar(ctx, cx, cy, size, opacity) {
            const spikes = 4;
            const outerRadius = size;
            const innerRadius = size * 0.4;

            ctx.beginPath();
            ctx.fillStyle = `rgba(${CONFIG.staticStarColor}, ${opacity})`;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = size * 1.5;
            ctx.shadowColor = `rgba(${CONFIG.staticStarColor}, ${opacity * 0.6})`;
        }
    }

    // ==================== 粒子系统管理器（增强版）====================
    class ParticleSystem {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.staticStars = [];
            this.animationId = null;
            this.isActive = false;
            this.isInitialized = false;
            this.resizeTimeout = null;
        }

        init() {
            if (this.isInitialized) return;

            this.canvas = document.createElement('canvas');
            this.canvas.id = 'particles-canvas';
            this.ctx = this.canvas.getContext('2d');

            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 9999;
            `;

            document.body.insertBefore(this.canvas, document.body.firstChild);
            this.waitForStableViewport();

            window.addEventListener('resize', () => this.handleResize());
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.handleResize(), 300);
            });

            this.isInitialized = true;
        }

        waitForStableViewport() {
            let stableCount = 0;
            let lastWidth = 0;
            let lastHeight = 0;
            
            const checkStability = () => {
                const viewport = getViewportSize();
                
                if (viewport.width === lastWidth && viewport.height === lastHeight) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastWidth = viewport.width;
                    lastHeight = viewport.height;
                }
                
                if (stableCount >= 3) {
                    this.setCanvasSize(viewport.width, viewport.height);
                    this.createParticles();
                    this.createStaticStars();
                    this.start();
                    console.log('✨ 粒子效果已启动（增强版流星 + 静态闪烁星星）');
                } else {
                    setTimeout(checkStability, 100);
                }
            };
            
            checkStability();
        }

        handleResize() {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            this.resizeTimeout = setTimeout(() => {
                const viewport = getViewportSize();
                this.setCanvasSize(viewport.width, viewport.height);
                // 窗口大小改变时，让所有流星重新生成以适应新边界
                this.createParticles();
                this.redistributeStaticStars();
            }, 250);
        }

        redistributeStaticStars() {
            const viewport = getViewportSize();
            this.staticStars.forEach(star => {
                star.x = (star.x / star.canvasWidth) * viewport.width;
                const maxHeight = viewport.height * CONFIG.staticStarHeightPercent;
                const currentMaxHeight = star.canvasHeight * CONFIG.staticStarHeightPercent;
                star.y = (star.y / currentMaxHeight) * maxHeight;
                star.canvasWidth = viewport.width;
                star.canvasHeight = viewport.height;
            });
        }

        setCanvasSize(width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        createParticles() {
            const viewport = getViewportSize();
            this.particles = [];
            for (let i = 0; i < CONFIG.particleCount; i++) {
                this.particles.push(new Particle(viewport.width, viewport.height));
            }
        }

        createStaticStars() {
            const viewport = getViewportSize();
            this.staticStars = [];
            for (let i = 0; i < CONFIG.staticStarCount; i++) {
                this.staticStars.push(new StaticStar(viewport.width, viewport.height));
            }
        }

        start() {
            if (this.isActive) return;
            this.isActive = true;
            this.animate();
        }

        stop() {
            this.isActive = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }

        animate() {
            if (!this.isActive) return;

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 先绘制静态闪烁星星（作为背景层）
            this.staticStars.forEach(star => {
                star.update();
                star.draw(this.ctx);
            });

            // 再绘制移动流星（作为前景层）
            this.particles.forEach(particle => {
                particle.update(this.canvas.width, this.canvas.height);
                particle.draw(this.ctx);
            });

            this.animationId = requestAnimationFrame(() => this.animate());
        }

        setParticleCount(count) {
            CONFIG.particleCount = count;
            this.createParticles();
        }

        setStaticStarCount(count) {
            CONFIG.staticStarCount = count;
            this.createStaticStars();
        }

        setOpacityRange(min, max) {
            CONFIG.minOpacity = min;
            CONFIG.maxOpacity = max;
            this.createParticles();
        }

        setSpeed(factor) {
            // factor: 速度倍数，调整最小和最大速度
            const baseMin = 0.3;  // 原始最慢速度
            const baseMax = 3.2;  // 原始最快速度
            CONFIG.minSpeed = baseMin * factor;
            CONFIG.maxSpeed = baseMax * factor;
            this.createParticles(); // 重新生成以应用新速度
        }
    }

    function initParticles() {
        if (document.getElementById('particles-canvas')) {
            console.log('粒子效果已存在');
            return;
        }

        const system = new ParticleSystem();
        system.init();
        window.particleSystem = system;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initParticles);
    } else {
        initParticles();
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ParticleSystem, Particle, StaticStar, CONFIG };
    }
})();
