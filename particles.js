/**
 * 星星粒子效果 - 轻量级 Canvas 实现（优化版）
 * 特性：
 * - 2.4-6像素大小的星星形状（放大20%）
 * - 30%-70%透明度
 * - 随机漂浮动画
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
        speedFactor: 0.3,         // 移动速度因子
        rotationSpeed: 0.02,      // 旋转速度
        connectionDistance: 100,  // 连线距离（可选功能）
        color: '255, 255, 255'    // 白色粒子
    };

    // 获取准确的视口尺寸（兼容移动端）
    function getViewportSize() {
        // 使用 document.documentElement 获取更准确的尺寸
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
            // 使用传入的准确尺寸
            const viewport = getViewportSize();
            
            // 随机位置 - 确保均匀分布在整个视口
            // 使用 Math.random() 确保均匀分布
            this.x = Math.random() * viewport.width;
            this.y = Math.random() * viewport.height;

            // 随机大小（2.4-6像素）- 放大20%
            this.size = Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize;

            // 随机透明度（0.3-0.7）
            this.opacity = Math.random() * (CONFIG.maxOpacity - CONFIG.minOpacity) + CONFIG.minOpacity;

            // 随机速度（缓慢移动）
            this.vx = (Math.random() - 0.5) * CONFIG.speedFactor;
            this.vy = (Math.random() - 0.5) * CONFIG.speedFactor;

            // 旋转角度和速度
            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * CONFIG.rotationSpeed;

            // 闪烁效果
            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinklePhase = Math.random() * Math.PI * 2;
        }

        update(canvasWidth, canvasHeight) {
            // 更新位置
            this.x += this.vx;
            this.y += this.vy;

            // 更新旋转角度
            this.angle += this.rotationSpeed;

            // 更新闪烁相位
            this.twinklePhase += this.twinkleSpeed;

            // 边界检查 - 循环移动
            const margin = this.size * 2;
            if (this.x < -margin) this.x = canvasWidth + margin;
            if (this.x > canvasWidth + margin) this.x = -margin;
            if (this.y < -margin) this.y = canvasHeight + margin;
            if (this.y > canvasHeight + margin) this.y = -margin;
        }

        draw(ctx) {
            // 计算闪烁透明度
            const twinkle = Math.sin(this.twinklePhase) * 0.2;
            const currentOpacity = Math.max(0.1, Math.min(1, this.opacity + twinkle));

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // 绘制星星形状
            this.drawStar(ctx, 0, 0, this.size, currentOpacity);

            ctx.restore();
        }

        drawStar(ctx, cx, cy, size, opacity) {
            const spikes = 4;  // 4角星
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
            // 防止重复初始化
            if (this.isInitialized) return;

            // 创建 canvas 元素
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'particles-canvas';
            this.ctx = this.canvas.getContext('2d');

            // 设置 canvas 样式
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 0;
            `;

            // 插入到 body 开头
            document.body.insertBefore(this.canvas, document.body.firstChild);

            // 等待页面完全加载后再设置尺寸和创建粒子
            this.waitForStableViewport();

            // 绑定事件 - 使用防抖处理resize
            window.addEventListener('resize', () => this.handleResize());
            
            // 监听方向变化（移动端）
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.handleResize(), 300);
            });

            this.isInitialized = true;
        }

        // 等待视口稳定（解决移动端初始加载问题）
        waitForStableViewport() {
            let stableCount = 0;
            let lastWidth = 0;
            let lastHeight = 0;
            
            const checkStability = () => {
                const viewport = getViewportSize();
                
                // 检查尺寸是否稳定
                if (viewport.width === lastWidth && viewport.height === lastHeight) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastWidth = viewport.width;
                    lastHeight = viewport.height;
                }
                
                // 连续3次检测尺寸相同，认为视口已稳定
                if (stableCount >= 3) {
                    this.setCanvasSize(viewport.width, viewport.height);
                    this.createParticles();
                    this.start();
                    console.log('✨ 粒子效果已启动（星星尺寸已放大20%，视口稳定）');
                } else {
                    // 继续检测
                    setTimeout(checkStability, 100);
                }
            };
            
            // 开始检测
            checkStability();
        }

        // 防抖处理 resize
        handleResize() {
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            this.resizeTimeout = setTimeout(() => {
                const viewport = getViewportSize();
                this.setCanvasSize(viewport.width, viewport.height);
                // 重新分布粒子
                this.redistributeParticles();
            }, 250);
        }

        // 重新分布粒子（resize时使用）
        redistributeParticles() {
            const viewport = getViewportSize();
            this.particles.forEach(particle => {
                // 按比例调整位置
                particle.x = (particle.x / particle.canvasWidth) * viewport.width;
                particle.y = (particle.y / particle.canvasHeight) * viewport.height;
                particle.canvasWidth = viewport.width;
                particle.canvasHeight = viewport.height;
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

            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // 更新和绘制所有粒子
            this.particles.forEach(particle => {
                particle.update(this.canvas.width, this.canvas.height);
                particle.draw(this.ctx);
            });

            // 继续动画
            this.animationId = requestAnimationFrame(() => this.animate());
        }

        // 公共方法：调整粒子数量
        setParticleCount(count) {
            CONFIG.particleCount = count;
            this.createParticles();
        }

        // 公共方法：调整透明度范围
        setOpacityRange(min, max) {
            CONFIG.minOpacity = min;
            CONFIG.maxOpacity = max;
            this.createParticles();
        }

        // 公共方法：调整速度
        setSpeed(factor) {
            CONFIG.speedFactor = factor;
            this.particles.forEach(p => {
                p.vx = (Math.random() - 0.5) * factor;
                p.vy = (Math.random() - 0.5) * factor;
            });
        }
    }

    // 初始化粒子系统
    function initParticles() {
        // 检查是否已存在
        if (document.getElementById('particles-canvas')) {
            console.log('粒子效果已存在');
            return;
        }

        const system = new ParticleSystem();
        system.init();

        // 暴露到全局，方便调试
        window.particleSystem = system;
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initParticles);
    } else {
        initParticles();
    }

    // 支持模块导出
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ParticleSystem, Particle, CONFIG };
    }
})();
