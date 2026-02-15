/**
 * 星星粒子效果 - 轻量级 Canvas 实现（优化版 + 精确拖尾效果）
 * 特性：
 * - 2.4-6像素大小的星星形状（放大20%）
 * - 30%-70%透明度
 * - 随机漂浮动画
 * - 精确控制拖尾长度：星星本体宽度的8-12倍
 * - 性能优化：requestAnimationFrame
 * - 移动端优化：解决初始加载边缘聚集问题
 */

(function() {
    'use strict';

    // 粒子系统配置
    const CONFIG = {
        particleCount: 25,        // 粒子数量（适中，不影响性能）
        minSize: 2.4,             // 最小粒子大小（像素）- 放大20%
        maxSize: 6,               // 最大粒子大小（像素）- 放大20%
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
        trailLengthMax: 12        // 拖尾长度倍数（最大）
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

    // 粒子类
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

    // 粒子系统管理器
    class ParticleSystem {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
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
                z-index: 0;
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
                    this.start();
                    console.log('✨ 粒子效果已启动（精确拖尾长度控制：本体宽度8-12倍）');
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
        module.exports = { ParticleSystem, Particle, CONFIG };
    }
})();
