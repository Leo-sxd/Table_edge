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
        // 速度配置：2cm/s ≈ 75.6像素/秒（基于96 PPI标准屏幕）
        // 60fps下：75.6 / 60 ≈ 1.26 像素/帧
        baseSpeed: 1.3,           // 基础速度：2cm/s对应的像素速度
        speedVariation: 0.3,      // 速度变化范围（±30%）
        rotationSpeed: 0.02,      // 旋转速度
        connectionDistance: 100,  // 连线距离（可选功能）
        color: '255, 255, 255',   // 白色粒子
        trailOpacity: 0.35,       // 拖尾透明度
        trailWidth: 1.5,          // 拖尾基础宽度
        trailLengthMin: 8,        // 拖尾长度倍数（最小）
        trailLengthMax: 12,       // 拖尾长度倍数（最大）
        
        // 静态闪烁星星（StaticStar）配置
        staticStarCount: 60,      // 静态星星数量
        staticStarMinSize: 3,   // 静态星星最小大小
        staticStarMaxSize: 6,   // 静态星星最大大小
        staticStarMinOpacity: 0.1,// 静态星星最小透明度
        staticStarMaxOpacity: 0.9,// 静态星星最大透明度
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

    // ==================== 移动流星类（原有效果，完全保留）====================
    class Particle {
        constructor(canvasWidth, canvasHeight) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.reset(true);
        }

        reset(initial = false) {
            const viewport = getViewportSize();
            
            this.x = Math.random() * viewport.width;
            this.y = Math.random() * viewport.height;

            // 星星大小（外半径）
            this.size = Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize;
            this.opacity = Math.random() * (CONFIG.maxOpacity - CONFIG.minOpacity) + CONFIG.minOpacity;

            // 星星本体宽度（直径）= size * 2
            const bodyWidth = this.size * 2;
            
            // 计算拖尾目标长度：本体宽度的8-12倍
            const trailLengthMultiplier = Math.random() * 
                (CONFIG.trailLengthMax - CONFIG.trailLengthMin) + CONFIG.trailLengthMin;
            this.targetTrailLength = bodyWidth * trailLengthMultiplier;
            
            // 设置移动速度：约2cm/s（75.6像素/秒，60fps下约1.3像素/帧）
            // 添加±30%的随机变化，使运动更自然
            const speedVariation = 1 + (Math.random() - 0.5) * CONFIG.speedVariation;
            const finalSpeed = CONFIG.baseSpeed * speedVariation;
            
            // 随机方向，保持恒定速度
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * finalSpeed;
            this.vy = Math.sin(angle) * finalSpeed;

            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * CONFIG.rotationSpeed;

            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinklePhase = Math.random() * Math.PI * 2;

            // 拖尾相关属性
            this.trail = []; // 存储拖尾位置点
            this.currentTrailLength = 0; // 当前拖尾长度（像素）
        }

        update(canvasWidth, canvasHeight) {
            // 保存当前位置到拖尾数组
            this.trail.push({
                x: this.x,
                y: this.y,
                angle: this.angle,
                opacity: this.opacity,
                timestamp: Date.now()
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

            // 边界检查 - 穿过边界时清除拖尾
            const margin = this.size * 2;
            let crossedBoundary = false;
            
            if (this.x < -margin) {
                this.x = canvasWidth + margin;
                crossedBoundary = true;
            }
            if (this.x > canvasWidth + margin) {
                this.x = -margin;
                crossedBoundary = true;
            }
            if (this.y < -margin) {
                this.y = canvasHeight + margin;
                crossedBoundary = true;
            }
            if (this.y > canvasHeight + margin) {
                this.y = -margin;
                crossedBoundary = true;
            }
            
            if (crossedBoundary) {
                this.trail = [];
                this.currentTrailLength = 0;
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

            const bodyWidth = this.size * 2;
            const actualTrailLength = this.calculateTrailLength();
            const lengthRatio = actualTrailLength / bodyWidth; // 拖尾长度与本体宽度的比例

            // 绘制拖尾主体
            ctx.save();
            
            // 使用多条线段绘制拖尾，实现宽度渐变
            for (let i = 0; i < this.trail.length - 1; i++) {
                const currentPoint = this.trail[i];
                const nextPoint = this.trail[i + 1];
                
                // 计算当前点在拖尾中的位置比例（0 = 末端，1 = 连接星星处）
                const positionRatio = i / (this.trail.length - 1);
                
                // 宽度渐变：从细到粗
                // 末端最细（0.3倍），连接处最粗（1.0倍）
                const widthRatio = 0.3 + positionRatio * 0.7;
                const lineWidth = CONFIG.trailWidth * widthRatio;
                
                // 透明度渐变：从透明到半透明再到透明
                // 创建更自然的渐变效果
                let alpha;
                if (positionRatio < 0.2) {
                    // 末端20%：从0渐变到0.3
                    alpha = (positionRatio / 0.2) * 0.3;
                } else if (positionRatio < 0.8) {
                    // 中间60%：保持较高透明度
                    alpha = 0.3 + (positionRatio - 0.2) / 0.6 * 0.4;
                } else {
                    // 靠近星星20%：逐渐减弱
                    alpha = 0.7 - (positionRatio - 0.8) / 0.2 * 0.3;
                }
                alpha *= CONFIG.trailOpacity;

                ctx.beginPath();
                ctx.moveTo(currentPoint.x, currentPoint.y);
                ctx.lineTo(nextPoint.x, nextPoint.y);
                
                ctx.strokeStyle = `rgba(${CONFIG.color}, ${alpha})`;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // 添加整体发光效果
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.5})`;
            
            // 重新绘制一次以应用发光
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.3})`;
            ctx.lineWidth = CONFIG.trailWidth * 0.5;
            ctx.stroke();

            ctx.restore();

            // 绘制拖尾末端的淡出光点
            if (this.trail.length > 3) {
                const endPoint = this.trail[0];
                ctx.save();
                ctx.beginPath();
                ctx.arc(endPoint.x, endPoint.y, this.size * 0.25, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.4})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.6})`;
                ctx.fill();
                ctx.restore();
            }

            // 调试用：绘制拖尾长度指示（可选，开发时使用）
            // this.drawDebugInfo(ctx, actualTrailLength, bodyWidth);
        }

        drawDebugInfo(ctx, trailLength, bodyWidth) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.font = '10px Arial';
            ctx.fillText(
                `${(trailLength/bodyWidth).toFixed(1)}x`, 
                this.x + this.size + 5, 
                this.y
            );
            ctx.restore();
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

    // ==================== 静态闪烁星星类（新增效果）====================
    /**
     * StaticStar - 静态闪烁星星类
     * 特性：
     * - 在页面80%高度范围内随机位置出现
     * - 仅呈现静态闪烁效果，无移动
     * - 若隐若现的呼吸式透明度变化
     */
    class StaticStar {
        constructor(canvasWidth, canvasHeight) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.reset();
        }

        reset() {
            const viewport = getViewportSize();
            
            // 在100%宽度范围内随机位置
            this.x = Math.random() * viewport.width;
            
            // 在80%高度范围内随机位置（从上到下80%）
            const maxHeight = viewport.height * CONFIG.staticStarHeightPercent;
            this.y = Math.random() * maxHeight;

            // 星星大小
            this.size = Math.random() * 
                (CONFIG.staticStarMaxSize - CONFIG.staticStarMinSize) + 
                CONFIG.staticStarMinSize;

            // 基础透明度
            this.baseOpacity = Math.random() * 
                (CONFIG.staticStarMaxOpacity - CONFIG.staticStarMinOpacity) + 
                CONFIG.staticStarMinOpacity;

            // 闪烁参数
            this.twinkleSpeed = Math.random() * 
                (CONFIG.staticStarTwinkleMax - CONFIG.staticStarTwinkleMin) + 
                CONFIG.staticStarTwinkleMin;
            this.twinklePhase = Math.random() * Math.PI * 2;
            
            // 旋转角度（静态星星也可以有轻微旋转）
            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.005; // 非常缓慢的旋转

            // 生命周期（可选：星星可以周期性消失重现）
            this.lifeTime = 0;
            this.maxLifeTime = Math.random() * 300 + 200; // 200-500帧的生命周期
            this.fadeState = 'alive'; // 'alive', 'fading', 'respawning'
            this.fadeProgress = 0;
        }

        update() {
            // 更新闪烁相位
            this.twinklePhase += this.twinkleSpeed;
            
            // 轻微旋转
            this.angle += this.rotationSpeed;

            // 生命周期管理
            this.lifeTime++;
            
            if (this.fadeState === 'alive' && this.lifeTime > this.maxLifeTime) {
                // 开始淡出
                this.fadeState = 'fading';
                this.fadeProgress = 0;
            } else if (this.fadeState === 'fading') {
                this.fadeProgress += 0.02;
                if (this.fadeProgress >= 1) {
                    // 完全消失，准备重生
                    this.fadeState = 'respawning';
                    this.fadeProgress = 0;
                    // 重新定位
                    const viewport = getViewportSize();
                    this.x = Math.random() * viewport.width;
                    const maxHeight = viewport.height * CONFIG.staticStarHeightPercent;
                    this.y = Math.random() * maxHeight;
                }
            } else if (this.fadeState === 'respawning') {
                this.fadeProgress += 0.02;
                if (this.fadeProgress >= 1) {
                    // 完全显现
                    this.fadeState = 'alive';
                    this.lifeTime = 0;
                    this.maxLifeTime = Math.random() * 300 + 200;
                }
            }
        }

        draw(ctx) {
            // 计算当前透明度（闪烁 + 生命周期淡入淡出）
            const twinkle = Math.sin(this.twinklePhase) * 0.3; // 闪烁幅度±30%
            let currentOpacity = this.baseOpacity + twinkle;
            
            // 应用生命周期淡入淡出
            if (this.fadeState === 'fading') {
                currentOpacity *= (1 - this.fadeProgress);
            } else if (this.fadeState === 'respawning') {
                currentOpacity *= this.fadeProgress;
            }
            
            // 限制透明度范围
            currentOpacity = Math.max(0, Math.min(1, currentOpacity));

            // 如果完全透明，不绘制
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

            // 添加柔和发光效果
            ctx.shadowBlur = size * 1.5;
            ctx.shadowColor = `rgba(${CONFIG.staticStarColor}, ${opacity * 0.6})`;
        }
    }

    // ==================== 粒子系统管理器（集成两种效果）====================
    class ParticleSystem {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            // 移动流星（原有效果）
            this.particles = [];
            // 静态闪烁星星（新增效果）
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
                    console.log('✨ 粒子效果已启动（移动流星 + 静态闪烁星星）');
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
                this.redistributeParticles();
                this.redistributeStaticStars();
            }, 250);
        }

        redistributeParticles() {
            const viewport = getViewportSize();
            this.particles.forEach(particle => {
                particle.x = (particle.x / particle.canvasWidth) * viewport.width;
                particle.y = (particle.y / particle.canvasHeight) * viewport.height;
                particle.canvasWidth = viewport.width;
                particle.canvasHeight = viewport.height;
                particle.trail = [];
                particle.currentTrailLength = 0;
            });
        }

        redistributeStaticStars() {
            const viewport = getViewportSize();
            this.staticStars.forEach(star => {
                // 保持相对位置比例
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

        // 创建移动流星（原有效果）
        createParticles() {
            const viewport = getViewportSize();
            this.particles = [];
            for (let i = 0; i < CONFIG.particleCount; i++) {
                this.particles.push(new Particle(viewport.width, viewport.height));
            }
        }

        // 创建静态闪烁星星（新增效果）
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

        // 设置移动流星数量
        setParticleCount(count) {
            CONFIG.particleCount = count;
            this.createParticles();
        }

        // 设置静态星星数量
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
            // factor: 相对于2cm/s的倍数（1.0 = 2cm/s）
            CONFIG.baseSpeed = 1.3 * factor;
            this.particles.forEach(p => {
                const speedVariation = 1 + (Math.random() - 0.5) * CONFIG.speedVariation;
                const finalSpeed = CONFIG.baseSpeed * speedVariation;
                const angle = Math.random() * Math.PI * 2;
                p.vx = Math.cos(angle) * finalSpeed;
                p.vy = Math.sin(angle) * finalSpeed;
            });
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
