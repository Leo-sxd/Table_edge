/**
 * ============================================
 * 整合后的JavaScript文件 - script.js
 * 包含：粒子效果 + 主脚本 + 诗句模块
 * ============================================
 */


/* ========== particles.js ========== */

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
        staticStarColor: '255, 255, 255', // 静态星星颜色
        
        // 彩色布朗运动粒子配置
        brownianParticleCount: 15,      // 布朗粒子数量
        brownianParticleSize: 3,        // 粒子大小（3像素）
        brownianParticleOpacity: 0.9,   // 粒子透明度（高透明度确保清晰可见）
        brownianMovementSpeed: 0.8,     // 布朗运动速度
        brownianAreaPercent: 0.5,       // 运动区域：屏幕下半50%
        brownianColors: [               // 彩色粒子颜色数组
            '255, 100, 100',   // 红色
            '100, 255, 100',   // 绿色
            '100, 100, 255',   // 蓝色
            '255, 255, 100',   // 黄色
            '255, 100, 255',   // 紫色
            '100, 255, 255',   // 青色
            '255, 200, 100',   // 橙色
            '200, 100, 255'    // 粉色
        ],
        
        // 鼠标轨迹配置
        mouseTrailEnabled: true,        // 启用鼠标轨迹
        mouseTrailColor: '255, 255, 255', // 白色
        mouseTrailOpacity: 0.3,         // 透明度0.3
        mouseTrailLength: 20,           // 轨迹点数量
        mouseTrailDecay: 0.05,          // 衰减速度
        
        // 增强彩色粒子配置
        enhancedParticleCount: 15,      // 粒子数量
        enhancedParticleSize: 4,        // 粒子大小
        enhancedParticleMinSpeed: 0.5,  // 最小速度
        enhancedParticleMaxSpeed: 2.0,  // 最大速度
        
        // 引力配置
        gravityStrength: 2.0,           // 引力强度
        gravityRadius: 240,             // 引力作用半径（px）
        gravityMinDistance: 10,         // 最小引力距离（防止除零）
        
        // 挣脱配置
        escapeAngleMin: 120,            // 挣脱角度最小值（度）
        escapeAngleMax: 150,            // 挣脱角度最大值（度）
        escapeSpeedMultiplier: 1.5,     // 挣脱速度倍数
        mouseSpeedThreshold: 15,        // 鼠标快速移动阈值（px/frame）
        
        // 布朗运动配置
        brownianForce: 0.3,             // 布朗运动力度
        friction: 0.98,                 // 摩擦力
        
        // 粒子连线配置
        connectionLineOpacity: 0.2,     // 连线透明度
        connectionLineColor: '255, 255, 255', // 连线颜色（白色）
        connectionLineWidth: 1,         // 连线宽度
        connectionReleaseDelay: 1000    // 挣脱后保持连线时间（毫秒）
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
            
            // 随机选择从哪条边进入（0:上, 1:右上, 2:左上）
            // 限制：仅允许从顶部和左右上2/3区域进入
            // 禁止从底部和左右下1/3区域进入
            const edge = Math.floor(Math.random() * 3);
            
            // 计算允许的最大Y坐标（距离顶部2/3高度）
            const maxAllowedY = viewport.height * (2 / 3);
            
            // 计算进入角度（指向屏幕内）
            let entryAngle;
            switch(edge) {
                case 0: // 从顶部进入，向下移动
                    this.x = Math.random() * (viewport.width + 2 * CONFIG.spawnMargin) - CONFIG.spawnMargin;
                    this.y = -CONFIG.spawnMargin;
                    entryAngle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
                    break;
                case 1: // 从右边上2/3区域进入，向左移动
                    this.x = viewport.width + CONFIG.spawnMargin;
                    // Y坐标限制在上2/3区域（0到maxAllowedY）
                    this.y = Math.random() * (maxAllowedY + CONFIG.spawnMargin) - CONFIG.spawnMargin;
                    entryAngle = Math.PI + (Math.random() - 0.5) * Math.PI / 3;
                    break;
                case 2: // 从左边上2/3区域进入，向右移动
                    this.x = -CONFIG.spawnMargin;
                    // Y坐标限制在上2/3区域（0到maxAllowedY）
                    this.y = Math.random() * (maxAllowedY + CONFIG.spawnMargin) - CONFIG.spawnMargin;
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

        // 绘制拖尾 - 优化版，实现从头部到尾部的透明度渐变
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
            
            // 在头部添加发光效果（连接星星处）
            const headPoint = this.trail[this.trail.length - 1];
            const headGradient = ctx.createRadialGradient(
                headPoint.x, headPoint.y, 0,
                headPoint.x, headPoint.y, this.size * 2
            );
            headGradient.addColorStop(0, `rgba(${CONFIG.color}, ${CONFIG.trailOpacity})`);
            headGradient.addColorStop(1, `rgba(${CONFIG.color}, 0)`);
            
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(headPoint.x, headPoint.y, this.size * 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }

        // 绘制四角星
        drawStar(ctx, cx, cy, outerRadius, opacity) {
            // 绘制四角星（十字星形）
            ctx.beginPath();
            
            // 四角星的8个顶点（外4个 + 内4个）
            const innerRadius = outerRadius * 0.4; // 内凹半径
            
            // 从顶部开始，顺时针绘制
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI / 4) - Math.PI / 2; // 从顶部开始
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.closePath();
            
            // 填充星星
            ctx.fillStyle = `rgba(${CONFIG.color}, ${opacity})`;
            ctx.fill();
            
            // 添加发光效果
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius * 2);
            gradient.addColorStop(0, `rgba(${CONFIG.color}, ${opacity * 0.5})`);
            gradient.addColorStop(1, `rgba(${CONFIG.color}, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, outerRadius * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ==================== 静态闪烁星星类 ====================
    class StaticStar {
        constructor(canvasWidth, canvasHeight) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.reset();
        }

        reset() {
            // 在页面80%高度范围内随机位置
            this.x = Math.random() * this.canvasWidth;
            this.y = Math.random() * (this.canvasHeight * CONFIG.staticStarHeightPercent);
            
            this.size = Math.random() * (CONFIG.staticStarMaxSize - CONFIG.staticStarMinSize) + CONFIG.staticStarMinSize;
            this.baseOpacity = Math.random() * (CONFIG.staticStarMaxOpacity - CONFIG.staticStarMinOpacity) + CONFIG.staticStarMinOpacity;
            
            this.twinkleSpeed = Math.random() * (CONFIG.staticStarTwinkleMax - CONFIG.staticStarTwinkleMin) + CONFIG.staticStarTwinkleMin;
            this.twinklePhase = Math.random() * Math.PI * 2;
            
            // 周期计数器：记录已完成的闪烁周期数
            this.cycleCount = 0;
        }

        update() {
            // 检测是否完成一个完整周期（相位跨越2π边界）
            const prevPhase = this.twinklePhase;
            this.twinklePhase += this.twinkleSpeed;
            
            // 当相位从大于2π变为小于2π时，表示完成了一个周期
            if (Math.floor(prevPhase / (Math.PI * 2)) !== Math.floor(this.twinklePhase / (Math.PI * 2))) {
                this.cycleCount++;
            }
        }
        
        /**
         * Check if star should reset (complete cycle at minimum brightness)
         * Ensures star completes full twinkling animation before disappearing
         */
        shouldReset() {
            // 只有当星星完成7个完整闪烁周期后才重置
            // 确保在最低亮度时执行，实现平滑过渡
            const twinkle = Math.sin(this.twinklePhase) * 0.3;
            const currentOpacity = this.baseOpacity + twinkle;
            
            // 完成7个周期且在最低亮度时重置
            return this.cycleCount >= 7 && currentOpacity < 0.15;
        }
        
        /**
         * Reset star with new random position
         * Called only when star has completed full animation cycle
         */
        resetWithNewPosition() {
            // Generate new random position (在80%高度范围内)
            this.x = Math.random() * this.canvasWidth;
            this.y = Math.random() * (this.canvasHeight * CONFIG.staticStarHeightPercent);
            
            // Reset phase to start of cycle with random offset for variety
            this.twinklePhase = Math.random() * Math.PI * 0.5;
            
            // Randomize other properties for variety
            this.size = Math.random() * (CONFIG.staticStarMaxSize - CONFIG.staticStarMinSize) + CONFIG.staticStarMinSize;
            this.baseOpacity = Math.random() * (CONFIG.staticStarMaxOpacity - CONFIG.staticStarMinOpacity) + CONFIG.staticStarMinOpacity;
            this.twinkleSpeed = Math.random() * (CONFIG.staticStarTwinkleMax - CONFIG.staticStarTwinkleMin) + CONFIG.staticStarTwinkleMin;
            
            // 重置周期计数器
            this.cycleCount = 0;
        }
        
        /**
         * Randomize star position within allowed area
         * Called during each twinkling cycle
         */
        randomizePosition() {
            // Generate new random position within bounds
            this.x = Math.random() * this.canvasWidth;
            this.y = Math.random() * (this.canvasHeight * CONFIG.staticStarHeightPercent);
        }

        draw(ctx) {
            const twinkle = Math.sin(this.twinklePhase) * 0.3;
            // Ensure minimum visibility to prevent sudden disappearance
            // Use higher minimum (0.15 instead of 0.05) to keep star always visible
            const currentOpacity = Math.max(0.15, Math.min(1, this.baseOpacity + twinkle));

            ctx.save();
            
            // 绘制四角星
            const size = this.size;
            const innerSize = size * 0.4; // 内凹半径
            ctx.beginPath();
            
            // 四角星的8个顶点（外4个 + 内4个）
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI / 4) - Math.PI / 2; // 从顶部开始
                const radius = i % 2 === 0 ? size : innerSize;
                const x = this.x + Math.cos(angle) * radius;
                const y = this.y + Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.closePath();
            
            ctx.fillStyle = `rgba(${CONFIG.staticStarColor}, ${currentOpacity})`;
            ctx.fill();
            
            // 添加发光效果
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, size * 3
            );
            gradient.addColorStop(0, `rgba(${CONFIG.staticStarColor}, ${currentOpacity * 0.5})`);
            gradient.addColorStop(0.3, `rgba(${CONFIG.staticStarColor}, ${currentOpacity * 0.2})`);
            gradient.addColorStop(1, `rgba(${CONFIG.staticStarColor}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, size * 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // ==================== 增强彩色粒子类 ====================
    class EnhancedParticle {
        constructor(w, h) {
            this.w = w;
            this.h = h;
            this.reset();
        }
        
        reset() {
            const m = CONFIG.enhancedParticleSize * 2;
            this.x = m + Math.random() * (this.w - m * 2);
            this.y = m + Math.random() * (this.h - m * 2);
            this.size = CONFIG.enhancedParticleSize;
            this.color = CONFIG.brownianColors[Math.floor(Math.random() * CONFIG.brownianColors.length)];
            this.vx = (Math.random() - 0.5) * CONFIG.enhancedParticleMaxSpeed;
            this.vy = (Math.random() - 0.5) * CONFIG.enhancedParticleMaxSpeed;
            this.isCaptured = false;
            this.captureStartTime = 0;
            this.captureReleaseTime = 0;
        }
        
        update(mx, my, mSpeed, mVx, mVy) {
            // 布朗运动
            this.vx += (Math.random() - 0.5) * CONFIG.brownianForce;
            this.vy += (Math.random() - 0.5) * CONFIG.brownianForce;
            
            // 鼠标引力
            const dx = mx - this.x, dy = my - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const wasCaptured = this.isCaptured;
            this.isCaptured = false;
            
            if (dist < CONFIG.gravityRadius && dist > CONFIG.gravityMinDistance) {
                const gFactor = (1 - dist / CONFIG.gravityRadius) ** 2;
                const angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * CONFIG.gravityStrength * gFactor;
                this.vy += Math.sin(angle) * CONFIG.gravityStrength * gFactor;
                this.isCaptured = true;
                if (!wasCaptured) this.captureStartTime = Date.now();
            } else if (wasCaptured) {
                this.captureReleaseTime = Date.now();
            }
            
            // 挣脱效果
            if (mSpeed > CONFIG.mouseSpeedThreshold && dist < CONFIG.gravityRadius) {
                const mAngle = Math.atan2(mVy, mVx);
                const escOffset = (CONFIG.escapeAngleMin + Math.random() * 
                    (CONFIG.escapeAngleMax - CONFIG.escapeAngleMin)) * Math.PI / 180;
                const escAngle = mAngle + (Math.random() > 0.5 ? escOffset : -escOffset);
                const escSpeed = mSpeed * CONFIG.escapeSpeedMultiplier * (1 + Math.random() * 0.5);
                this.vx += Math.cos(escAngle) * escSpeed;
                this.vy += Math.sin(escAngle) * escSpeed;
            }
            
            // 摩擦力与速度限制
            this.vx *= CONFIG.friction;
            this.vy *= CONFIG.friction;
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > CONFIG.enhancedParticleMaxSpeed) {
                const s = CONFIG.enhancedParticleMaxSpeed / speed;
                this.vx *= s;
                this.vy *= s;
            }
            
            // 更新位置与边界
            this.x += this.vx;
            this.y += this.vy;
            const m = this.size;
            if (this.x < m) { this.x = m; this.vx = Math.abs(this.vx) * 0.8; }
            else if (this.x > this.w - m) { this.x = this.w - m; this.vx = -Math.abs(this.vx) * 0.8; }
            if (this.y < m) { this.y = m; this.vy = Math.abs(this.vy) * 0.8; }
            else if (this.y > this.h - m) { this.y = this.h - m; this.vy = -Math.abs(this.vy) * 0.8; }
        }
        
        resolveCollision(o) {
            const dx = o.x - this.x, dy = o.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minD = this.size + o.size;
            if (dist < minD && dist > 0) {
                const angle = Math.atan2(dy, dx);
                const overlap = minD - dist;
                const sx = Math.cos(angle) * overlap * 0.5;
                const sy = Math.sin(angle) * overlap * 0.5;
                this.x -= sx; this.y -= sy;
                o.x += sx; o.y += sy;
                const nx = dx / dist, ny = dy / dist;
                const rvx = this.vx - o.vx, rvy = this.vy - o.vy;
                const velAlong = rvx * nx + rvy * ny;
                if (velAlong > 0) return;
                const imp = -(1 + 0.7) * velAlong / 2;
                const ix = imp * nx, iy = imp * ny;
                this.vx += ix; this.vy += iy;
                o.vx -= ix; o.vy -= iy;
            }
        }
        
        canConnect() {
            if (this.isCaptured) return Date.now() - this.captureStartTime >= CONFIG.minCaptureDuration;
            if (this.captureReleaseTime > 0) return Date.now() - this.captureReleaseTime < CONFIG.connectionReleaseDelay;
            return false;
        }
        
        draw(ctx) {
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
            g.addColorStop(0, `rgba(${this.color}, 0.48)`);
            g.addColorStop(0.5, `rgba(${this.color}, 0.16)`);
            g.addColorStop(1, `rgba(${this.color}, 0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(${this.color}, 0.8)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ==================== 鼠标轨迹效果类 ====================
    class MouseTrail {
        constructor() {
            this.points = [];  // 轨迹点数组
            this.maxLength = CONFIG.mouseTrailLength;
        }
        
        addPoint(x, y) {
            this.points.push({
                x: x,
                y: y,
                opacity: CONFIG.mouseTrailOpacity,
                life: 1.0  // 生命值，用于衰减
            });
            
            // 限制轨迹长度
            if (this.points.length > this.maxLength) {
                this.points.shift();
            }
        }
        
        update() {
            // 更新每个点的生命值和透明度
            for (let i = this.points.length - 1; i >= 0; i--) {
                const point = this.points[i];
                point.life -= CONFIG.mouseTrailDecay;
                point.opacity = point.life * CONFIG.mouseTrailOpacity;
                
                // 移除消失的点
                if (point.life <= 0) {
                    this.points.splice(i, 1);
                }
            }
        }
        
        draw(ctx) {
            if (this.points.length < 2) return;
            
            ctx.save();
            
            // 绘制轨迹线条
            for (let i = 1; i < this.points.length; i++) {
                const prevPoint = this.points[i - 1];
                const currPoint = this.points[i];
                
                ctx.beginPath();
                ctx.moveTo(prevPoint.x, prevPoint.y);
                ctx.lineTo(currPoint.x, currPoint.y);
                
                // 使用平均透明度
                const avgOpacity = (prevPoint.opacity + currPoint.opacity) / 2;
                ctx.strokeStyle = `rgba(${CONFIG.mouseTrailColor}, ${avgOpacity})`;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
            }
            
            ctx.restore();
        }
        
        clear() {
            this.points = [];
        }
    }

    // ==================== 粒子系统管理器 ====================
    class ParticleSystem {
        constructor() {
            this.staticCanvas = null;      // 静止星星canvas (底层)
            this.staticCtx = null;
            this.mouseCanvas = null;       // 鼠标效果canvas (中层)
            this.mouseCtx = null;
            this.particleCanvas = null;    // 移动星星canvas (顶层)
            this.particleCtx = null;
            this.particles = [];
            this.staticStars = [];
            this.mouseFollowParticles = []; // 鼠标跟随粒子数组
            this.mouseTrail = null;        // 鼠标轨迹
            this.mouseX = window.innerWidth / 2;  // 鼠标X位置
            this.mouseY = window.innerHeight / 2; // 鼠标Y位置
            this.lastMouseX = this.mouseX;        // 上一帧鼠标X
            this.lastMouseY = this.mouseY;        // 上一帧鼠标Y
            this.lastMouseTime = Date.now();      // 上一帧时间
            this.animationId = null;
            this.isActive = true;
            
            this.init();
        }

        init() {
            this.createCanvas();
            this.createParticles();
            this.createStaticStars();
            this.createMouseFollowParticles();
            this.mouseTrail = new MouseTrail();
            this.bindEvents();
            this.animate();
            
            console.log('粒子系统初始化完成');
        }

        createCanvas() {
            const viewport = getViewportSize();
            
            // 创建静止星星canvas (底层, z-index: 0)
            this.staticCanvas = document.createElement('canvas');
            this.staticCanvas.id = 'static-stars-canvas';
            this.staticCtx = this.staticCanvas.getContext('2d');
            this.staticCanvas.width = viewport.width;
            this.staticCanvas.height = viewport.height;
            
            this.staticCanvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 0;
            `;
            
            // 创建鼠标效果canvas (最底层, z-index: -1)
            this.mouseCanvas = document.createElement('canvas');
            this.mouseCanvas.id = 'mouse-effects-canvas';
            this.mouseCtx = this.mouseCanvas.getContext('2d');
            this.mouseCanvas.width = viewport.width;
            this.mouseCanvas.height = viewport.height;
            
            this.mouseCanvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: -1;
            `;
            
            // 创建移动星星canvas (顶层, z-index: 999999)
            this.particleCanvas = document.createElement('canvas');
            this.particleCanvas.id = 'particles-canvas';
            this.particleCtx = this.particleCanvas.getContext('2d');
            this.particleCanvas.width = viewport.width;
            this.particleCanvas.height = viewport.height;
            
            this.particleCanvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 999999;
            `;
            
            // 按顺序插入canvas：底层 -> 中层 -> 顶层
            document.body.insertBefore(this.staticCanvas, document.body.firstChild);
            document.body.insertBefore(this.mouseCanvas, document.body.firstChild);
            document.body.insertBefore(this.particleCanvas, document.body.firstChild);
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
        
        createMouseFollowParticles() {
            const viewport = getViewportSize();
            this.mouseFollowParticles = [];
            
            // 限制粒子数量，确保不超过配置值
            const particleCount = Math.min(CONFIG.enhancedParticleCount, 5);
            
            for (let i = 0; i < particleCount; i++) {
                this.mouseFollowParticles.push(new EnhancedParticle(
                    viewport.width, viewport.height
                ));
            }
        }

        bindEvents() {
            // 窗口大小改变时重新调整
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.handleResize();
                }, 250);
            });

            // 页面可见性改变时暂停/恢复动画
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pause();
                } else {
                    this.resume();
                }
            });

            // 移动端方向改变
            window.addEventListener('orientationchange', () => {
                setTimeout(() => this.handleResize(), 100);
            });
            
            // 鼠标移动监听
            document.addEventListener('mousemove', (e) => {
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
                
                // 添加轨迹点
                if (this.mouseTrail && CONFIG.mouseTrailEnabled) {
                    this.mouseTrail.addPoint(e.clientX, e.clientY);
                }
            });
            
            // 触摸移动监听（移动端）
            document.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) {
                    this.mouseX = e.touches[0].clientX;
                    this.mouseY = e.touches[0].clientY;
                    
                    if (this.mouseTrail && CONFIG.mouseTrailEnabled) {
                        this.mouseTrail.addPoint(this.mouseX, this.mouseY);
                    }
                }
            }, { passive: true });
        }

        handleResize() {
            const viewport = getViewportSize();
            
            // 调整三个canvas的大小
            this.staticCanvas.width = viewport.width;
            this.staticCanvas.height = viewport.height;
            this.mouseCanvas.width = viewport.width;
            this.mouseCanvas.height = viewport.height;
            this.particleCanvas.width = viewport.width;
            this.particleCanvas.height = viewport.height;
            
            // 重新生成静态星星以适应新尺寸
            this.createStaticStars();
            
            // 移动流星会继续飞行并在飞出屏幕后重新生成
        }

        animate() {
            if (!this.isActive) return;

            const viewport = getViewportSize();
            
            // 清空静态星星画布
            this.staticCtx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
            
            // 清空移动星星画布
            this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
            
            // 绘制静态星星到底层canvas
            // 确保始终有50颗星星，如果数量不足则补充
            while (this.staticStars.length < CONFIG.staticStarCount) {
                this.staticStars.push(new StaticStar(
                    this.staticCanvas.width, 
                    this.staticCanvas.height
                ));
            }
            
            this.staticStars.forEach(star => {
                star.update();
                // 检查是否完成7个周期，如果是则重置位置
                if (star.shouldReset()) {
                    star.resetWithNewPosition();
                }
                star.draw(this.staticCtx);
            });
            
            // 清空鼠标效果画布
            this.mouseCtx.clearRect(0, 0, this.mouseCanvas.width, this.mouseCanvas.height);
            
            // 更新和绘制鼠标轨迹
            if (this.mouseTrail && CONFIG.mouseTrailEnabled) {
                this.mouseTrail.update();
                this.mouseTrail.draw(this.mouseCtx);
            }
            
            // 计算鼠标速度
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastMouseTime;
            let mouseSpeed = 0;
            let mouseVx = 0;
            let mouseVy = 0;
            
            if (deltaTime > 0 && this.lastMouseX !== undefined) {
                mouseVx = (this.mouseX - this.lastMouseX) / deltaTime * 16; // 归一化到每帧
                mouseVy = (this.mouseY - this.lastMouseY) / deltaTime * 16;
                mouseSpeed = Math.sqrt(mouseVx * mouseVx + mouseVy * mouseVy);
            }
            
            this.lastMouseX = this.mouseX;
            this.lastMouseY = this.mouseY;
            this.lastMouseTime = currentTime;
            
            // 更新和绘制增强粒子
            // 先更新所有粒子位置
            this.mouseFollowParticles.forEach(particle => {
                particle.update(this.mouseX, this.mouseY, mouseSpeed, mouseVx, mouseVy);
            });
            
            // 处理粒子间碰撞
            for (let i = 0; i < this.mouseFollowParticles.length; i++) {
                for (let j = i + 1; j < this.mouseFollowParticles.length; j++) {
                    this.mouseFollowParticles[i].resolveCollision(this.mouseFollowParticles[j]);
                }
            }
            
            // 绘制被捕获粒子之间的连线
            this.drawParticleConnections();
            
            // 绘制所有粒子
            this.mouseFollowParticles.forEach(particle => {
                particle.draw(this.mouseCtx);
            });
            
            // 绘制移动流星到顶层canvas
            this.particles.forEach(particle => {
                particle.update(viewport.width, viewport.height);
                particle.draw(this.particleCtx);
            });

            this.animationId = requestAnimationFrame(() => this.animate());
        }

        pause() {
            this.isActive = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
        }

        resume() {
            if (!this.isActive) {
                this.isActive = true;
                this.animate();
            }
        }

        destroy() {
            this.pause();
            if (this.staticCanvas && this.staticCanvas.parentNode) {
                this.staticCanvas.parentNode.removeChild(this.staticCanvas);
            }
            if (this.mouseCanvas && this.mouseCanvas.parentNode) {
                this.mouseCanvas.parentNode.removeChild(this.mouseCanvas);
            }
            if (this.particleCanvas && this.particleCanvas.parentNode) {
                this.particleCanvas.parentNode.removeChild(this.particleCanvas);
            }
        }

        // 绘制粒子之间的连线
        drawParticleConnections() {
            const connectableParticles = this.mouseFollowParticles.filter(p => p.canConnect());
            
            if (connectableParticles.length < 2) return;
            
            // 收集所有可能的连线（带距离信息）
            const allPossibleConnections = [];
            
            for (let i = 0; i < connectableParticles.length; i++) {
                for (let j = i + 1; j < connectableParticles.length; j++) {
                    const p1 = connectableParticles[i];
                    const p2 = connectableParticles[j];
                    
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    allPossibleConnections.push({
                        p1Index: i,
                        p2Index: j,
                        p1: p1,
                        p2: p2,
                        distance: distance
                    });
                }
            }
            
            // 按距离排序
            allPossibleConnections.sort((a, b) => a.distance - b.distance);
            
            // 记录每个粒子的已连接数
            const connectionCounts = new Array(connectableParticles.length).fill(0);
            const selectedConnections = [];
            
            // 优先选择距离近的连线，同时满足两个限制：
            // 1. 单个粒子最多5条连线
            // 2. 全局最多10条连线
            for (const conn of allPossibleConnections) {
                // 检查全局限制
                if (selectedConnections.length >= CONFIG.maxTotalConnections) {
                    break;
                }
                
                // 检查单个粒子限制
                if (connectionCounts[conn.p1Index] >= CONFIG.maxConnectionsPerParticle) {
                    continue;
                }
                if (connectionCounts[conn.p2Index] >= CONFIG.maxConnectionsPerParticle) {
                    continue;
                }
                
                // 选择这条连线
                selectedConnections.push(conn);
                connectionCounts[conn.p1Index]++;
                connectionCounts[conn.p2Index]++;
            }
            
            // 绘制选中的连线
            this.mouseCtx.save();
            this.mouseCtx.strokeStyle = `rgba(${CONFIG.connectionLineColor}, ${CONFIG.connectionLineOpacity})`;
            this.mouseCtx.lineWidth = CONFIG.connectionLineWidth;
            this.mouseCtx.lineCap = 'round';
            
            for (const conn of selectedConnections) {
                this.mouseCtx.beginPath();
                this.mouseCtx.moveTo(conn.p1.x, conn.p1.y);
                this.mouseCtx.lineTo(conn.p2.x, conn.p2.y);
                this.mouseCtx.stroke();
            }
            
            this.mouseCtx.restore();
        }
        
        // 公共API
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
        if (document.getElementById('particles-canvas') || 
            document.getElementById('static-stars-canvas') ||
            document.getElementById('mouse-effects-canvas')) {
            console.log('粒子效果已存在');
            return;
        }
        
        // 延迟初始化，确保DOM完全加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new ParticleSystem();
            });
        } else {
            new ParticleSystem();
        }
    }

    // 自动初始化
    initParticles();

    // 暴露全局API
    window.ParticleSystem = ParticleSystem;
    window.initParticles = initParticles;

})();


// script.js - 修复高德地图API加载问题

document.addEventListener('DOMContentLoaded', function() {
    
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
            staticStars: { enabled: true, count: 50 },
            meteor: { enabled: true, count: 15 },
            particles: { enabled: true, count: 5 },
            connections: { enabled: true, count: 10 }
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
        this.settingsPanel = document.getElementById('settings-panel');
        this.closeBtn = document.getElementById('close-settings');
        
        // 获取开关和滑块元素
        this.controls = {
            staticStars: {
                toggle: document.getElementById('static-stars-toggle'),
                slider: document.getElementById('static-stars-slider'),
                value: document.getElementById('static-stars-value')
            },
            meteor: {
                toggle: document.getElementById('meteor-toggle'),
                slider: document.getElementById('meteor-slider'),
                value: document.getElementById('meteor-value')
            },
            particles: {
                toggle: document.getElementById('particles-toggle'),
                slider: document.getElementById('particles-slider'),
                value: document.getElementById('particles-value')
            },
            connections: {
                toggle: document.getElementById('connections-toggle'),
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
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!this.settingsBtn.contains(e.target) && 
                !this.settingsPanel.contains(e.target)) {
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
        
        // 开关事件
        if (control.toggle) {
            control.toggle.addEventListener('change', (e) => {
                this.settings[settingKey].enabled = e.target.checked;
                this.saveSettings();
                this.applySettings();
            });
        }
        
        // 滑块事件
        if (control.slider) {
            control.slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings[settingKey].count = value;
                if (control.value) control.value.textContent = value;
            });
            
            control.slider.addEventListener('change', (e) => {
                this.saveSettings();
                this.applySettings();
            });
        }
    }
    
    togglePanel() {
        this.settingsPanel.classList.toggle('show');
        this.settingsBtn.classList.toggle('active');
    }
    
    closePanel() {
        this.settingsPanel.classList.remove('show');
        this.settingsBtn.classList.remove('active');
    }
    
    applySettings() {
        // 更新CONFIG值
        CONFIG.staticStarCount = this.settings.staticStars.count;
        CONFIG.particleCount = this.settings.meteor.count;
        CONFIG.enhancedParticleCount = this.settings.particles.count;
        CONFIG.maxTotalConnections = this.settings.connections.count;
        
        // 应用到粒子系统
        if (window.particleSystem) {
            // 静止星星
            window.particleSystem.staticEnabled = this.settings.staticStars.enabled;
            if (this.settings.staticStars.enabled) {
                window.particleSystem.createStaticStars();
            }
            
            // 流星
            window.particleSystem.meteorEnabled = this.settings.meteor.enabled;
            if (this.settings.meteor.enabled) {
                window.particleSystem.createParticles();
            }
            
            // 彩色粒子
            window.particleSystem.particlesEnabled = this.settings.particles.enabled;
            const mouseCanvas = document.getElementById('mouse-effects-canvas');
            if (mouseCanvas) {
                mouseCanvas.style.display = this.settings.particles.enabled ? 'block' : 'none';
            }
            if (this.settings.particles.enabled) {
                window.particleSystem.createMouseFollowParticles();
            }
            
            // 连线
            window.particleSystem.connectionsEnabled = this.settings.connections.enabled;
        }
    }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

