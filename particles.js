/**
 * 星星粒子效果 - 轻量级 Canvas 实现
 * 特性：
 * - 2.4-6像素大小的星星形状（放大20%）
 * - 30%-70%透明度
 * - 随机漂浮动画
 * - 性能优化：requestAnimationFrame
 */

(function() {
    'use strict';

    // 粒子系统配置
    const CONFIG = {
        particleCount: 60,        // 粒子数量（适中，不影响性能）
        minSize: 4,             // 最小粒子大小（像素）- 放大20%
        maxSize: 8,               // 最大粒子大小（像素）- 放大20%
        minOpacity: 0.3,          // 最小透明度（30%）
        maxOpacity: 0.7,          // 最大透明度（70%）
        speedFactor: 0.3,         // 移动速度因子
        rotationSpeed: 0.02,      // 旋转速度
        connectionDistance: 100,  // 连线距离（可选功能）
        color: '255, 255, 255'    // 白色粒子
    };

    // 粒子类
    class Particle {
        constructor(canvas) {
            this.canvas = canvas;
            this.reset();
        }

        reset() {
            // 随机位置
            this.x = Math.random() * this.canvas.width;
            this.y = Math.random() * this.canvas.height;

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

        update() {
            // 更新位置
            this.x += this.vx;
            this.y += this.vy;

            // 更新旋转角度
            this.angle += this.rotationSpeed;

            // 更新闪烁相位
            this.twinklePhase += this.twinkleSpeed;

            // 边界检查 - 循环移动
            if (this.x < -this.size) this.x = this.canvas.width + this.size;
            if (this.x > this.canvas.width + this.size) this.x = -this.size;
            if (this.y < -this.size) this.y = this.canvas.height + this.size;
            if (this.y > this.canvas.height + this.size) this.y = -this.size;
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
        }

        init() {
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

            // 设置 canvas 尺寸
            this.resize();

            // 创建粒子
            this.createParticles();

            // 绑定事件
            window.addEventListener('resize', () => this.resize());

            // 开始动画
            this.start();

            console.log('✨ 粒子效果已启动（星星尺寸已放大20%）');
        }

        createParticles() {
            this.particles = [];
            for (let i = 0; i < CONFIG.particleCount; i++) {
                this.particles.push(new Particle(this.canvas));
            }
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
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
                particle.update();
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
