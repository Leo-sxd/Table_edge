/**
 * 星星粒子效果 - 轻量级 Canvas 实现（优化版 + 拖尾效果）
 * 特性：
 * - 2.4-6像素大小的星星形状（放大20%）
 * - 30%-70%透明度
 * - 随机漂浮动画
 * - 细长透明拖尾效果（增强版）
 * - 性能优化：requestAnimationFrame
 * - 移动端优化：解决初始加载边缘聚集问题
 */

(function() {
    'use strict';

    // 粒子系统配置
    const CONFIG = {
        particleCount: 60,        // 粒子数量（适中，不影响性能）
        minSize: 2.4,             // 最小粒子大小（像素）- 放大20%
        maxSize: 6,               // 最大粒子大小（像素）- 放大20%
        minOpacity: 0.3,          // 最小透明度（30%）
        maxOpacity: 0.7,          // 最大透明度（70%）
        speedFactor: 0.5,         // 移动速度因子（增加以产生更明显拖尾）
        rotationSpeed: 0.02,      // 旋转速度
        connectionDistance: 100,  // 连线距离（可选功能）
        color: '255, 255, 255',   // 白色粒子
        trailOpacity: 0.4,        // 拖尾透明度（增加以更明显）
        trailWidth: 2             // 拖尾基础宽度
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

            this.size = Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize;
            this.opacity = Math.random() * (CONFIG.maxOpacity - CONFIG.minOpacity) + CONFIG.minOpacity;

            // 增加速度使拖尾更明显
            this.vx = (Math.random() - 0.5) * CONFIG.speedFactor;
            this.vy = (Math.random() - 0.5) * CONFIG.speedFactor;

            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * CONFIG.rotationSpeed;

            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinklePhase = Math.random() * Math.PI * 2;

            // 拖尾相关属性 - 增加长度
            this.trail = [];
            this.maxTrailLength = Math.floor(Math.random() * 15 + 15); // 15-30个拖尾点
        }

        update(canvasWidth, canvasHeight) {
            // 保存当前位置到拖尾数组
            this.trail.push({
                x: this.x,
                y: this.y,
                angle: this.angle,
                opacity: this.opacity
            });

            // 限制拖尾长度
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }

            // 更新位置
            this.x += this.vx;
            this.y += this.vy;

            this.angle += this.rotationSpeed;
            this.twinklePhase += this.twinkleSpeed;

            // 边界检查
            const margin = this.size * 2;
            if (this.x < -margin) {
                this.x = canvasWidth + margin;
                this.trail = [];
            }
            if (this.x > canvasWidth + margin) {
                this.x = -margin;
                this.trail = [];
            }
            if (this.y < -margin) {
                this.y = canvasHeight + margin;
                this.trail = [];
            }
            if (this.y > canvasHeight + margin) {
                this.y = -margin;
                this.trail = [];
            }
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

            // 绘制拖尾线条
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            
            // 使用曲线连接拖尾点，使拖尾更流畅
            for (let i = 1; i < this.trail.length; i++) {
                const point = this.trail[i];
                ctx.lineTo(point.x, point.y);
            }

            // 创建拖尾渐变效果
            const lastPoint = this.trail[this.trail.length - 1];
            const firstPoint = this.trail[0];
            const gradient = ctx.createLinearGradient(
                firstPoint.x, firstPoint.y,
                lastPoint.x, lastPoint.y
            );

            // 渐变：从透明到半透明
            gradient.addColorStop(0, `rgba(${CONFIG.color}, 0)`);
            gradient.addColorStop(0.3, `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.3})`);
            gradient.addColorStop(0.7, `rgba(${CONFIG.color}, ${CONFIG.trailOpacity})`);
            gradient.addColorStop(1, `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.5})`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = CONFIG.trailWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // 添加发光效果
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity})`;
            ctx.stroke();

            ctx.restore();

            // 绘制拖尾末端的淡出点
            if (this.trail.length > 5) {
                const endPoint = this.trail[0];
                ctx.save();
                ctx.beginPath();
                ctx.arc(endPoint.x, endPoint.y, this.size * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.3})`;
                ctx.shadowBlur = 4;
                ctx.shadowColor = `rgba(${CONFIG.color}, ${CONFIG.trailOpacity * 0.5})`;
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
                    console.log('✨ 粒子效果已启动（带增强拖尾效果）');
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
            CONFIG.speedFactor = factor;
            this.particles.forEach(p => {
                p.vx = (Math.random() - 0.5) * factor;
                p.vy = (Math.random() - 0.5) * factor;
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
