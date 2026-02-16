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

        // 绘制四角星（菱形）
        drawStar(ctx, cx, cy, outerRadius, opacity) {
            // 绘制四角星（菱形）
            ctx.beginPath();
            
            // 四角星的四个顶点
            // 0度（上）
            ctx.moveTo(cx, cy - outerRadius);
            // 90度（右）
            ctx.lineTo(cx + outerRadius, cy);
            // 180度（下）
            ctx.lineTo(cx, cy + outerRadius);
            // 270度（左）
            ctx.lineTo(cx - outerRadius, cy);
            
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
        }

        update() {
            this.twinklePhase += this.twinkleSpeed;
        }

        draw(ctx) {
            const twinkle = Math.sin(this.twinklePhase) * 0.3;
            const currentOpacity = Math.max(0.05, Math.min(1, this.baseOpacity + twinkle));

            ctx.save();
            
            // 绘制四角星（菱形）
            const size = this.size;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - size);
            ctx.lineTo(this.x + size, this.y);
            ctx.lineTo(this.x, this.y + size);
            ctx.lineTo(this.x - size, this.y);
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

    // ==================== 粒子系统管理器 ====================
    class ParticleSystem {
        constructor() {
            this.canvas = null;
            this.ctx = null;
            this.particles = [];
            this.staticStars = [];
            this.animationId = null;
            this.isActive = true;
            
            this.init();
        }

        init() {
            this.createCanvas();
            this.createParticles();
            this.createStaticStars();
            this.bindEvents();
            this.animate();
            
            console.log('粒子系统初始化完成');
        }

        createCanvas() {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'particles-canvas';
            this.ctx = this.canvas.getContext('2d');
            
            const viewport = getViewportSize();
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            // 设置Canvas样式
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
        }

        handleResize() {
            const viewport = getViewportSize();
            this.canvas.width = viewport.width;
            this.canvas.height = viewport.height;
            
            // 重新生成静态星星以适应新尺寸
            this.createStaticStars();
            
            // 移动流星会继续飞行并在飞出屏幕后重新生成
        }

        animate() {
            if (!this.isActive) return;

            const viewport = getViewportSize();
            
            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 先绘制静态星星（在最底层）
            this.staticStars.forEach(star => {
                star.update();
                star.draw(this.ctx);
            });
            
            // 再绘制移动流星
            this.particles.forEach(particle => {
                particle.update(viewport.width, viewport.height);
                particle.draw(this.ctx);
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
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
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
        if (document.getElementById('particles-canvas')) {
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


/* ========== script.js ========== */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 更新时间
    updateTime();
    setInterval(updateTime, 1000);
    
    // 更新最后更新时间
    document.getElementById('last-update-time').textContent = new Date().toLocaleString('zh-CN');
    
    // 初始化背景选择器
    initBackgroundSelector();
    
    // 初始化待办事项
    initTodoList();
    
    // 初始化地图
    initMap();
    
    // 初始化智能助手
    initAssistant();
    
    // 初始化视图切换
    initViewSwitch();
    
    // 初始化天气和位置
    initWeatherAndLocation();
});


// 待办事项功能
function initTodoList() {
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoInputArea = document.getElementById('todo-input-area');
    const todoSubmit = document.getElementById('todo-submit');
    const todoCancel = document.getElementById('todo-cancel');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    let currentFilter = 'all';
    
    // 显示/隐藏输入区域
    addTodoBtn.addEventListener('click', () => {
        todoInputArea.style.display = todoInputArea.style.display === 'none' ? 'block' : 'none';
        if (todoInputArea.style.display === 'block') {
            todoInput.focus();
        }
    });
    
    // 取消按钮
    todoCancel.addEventListener('click', () => {
        todoInputArea.style.display = 'none';
        clearTodoForm();
    });
    
    // 提交待办事项
    todoSubmit.addEventListener('click', addTodo);
    
    // 筛选按钮
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
    
    function addTodo() {
        const text = todoInput.value.trim();
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        
        if (!text) {
            alert('请输入待办事项内容');
            return;
        }
        
        const todo = {
            id: Date.now(),
            text: text,
            startTime: startTime,
            endTime: endTime,
            completed: false,
            urgent: false
        };
        
        todos.push(todo);
        saveTodos();
        renderTodos();
        clearTodoForm();
        todoInputArea.style.display = 'none';
    }
    
    function clearTodoForm() {
        todoInput.value = '';
        document.getElementById('start-time').value = '';
        document.getElementById('end-time').value = '';
    }
    
    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
        updateFilterCounts();
    }
    
    function renderTodos() {
        todoList.innerHTML = '';
        
        let filteredTodos = todos;
        if (currentFilter === 'pending') {
            filteredTodos = todos.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTodos = todos.filter(t => t.completed);
        } else if (currentFilter === 'urgent') {
            filteredTodos = todos.filter(t => t.urgent);
        }
        
        filteredTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item ${todo.urgent ? 'urgent' : ''} ${todo.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <div class="todo-content">
                    <div class="todo-title">${todo.text}</div>
                    <div class="todo-time">
                        ${todo.startTime ? '开始: ' + new Date(todo.startTime).toLocaleString('zh-CN') : ''}
                        ${todo.endTime ? '<br>截止: ' + new Date(todo.endTime).toLocaleString('zh-CN') : ''}
                    </div>
                </div>
                <button class="delete-todo"><i class="fas fa-trash"></i></button>
            `;
            
            // 复选框事件
            const checkbox = li.querySelector('.todo-checkbox');
            checkbox.addEventListener('change', () => {
                todo.completed = checkbox.checked;
                saveTodos();
                renderTodos();
            });
            
            // 删除按钮事件
            const deleteBtn = li.querySelector('.delete-todo');
            deleteBtn.addEventListener('click', () => {
                todos = todos.filter(t => t.id !== todo.id);
                saveTodos();
                renderTodos();
            });
            
            todoList.appendChild(li);
        });
    }
    
    function updateFilterCounts() {
        const all = todos.length;
        const pending = todos.filter(t => !t.completed).length;
        const completed = todos.filter(t => t.completed).length;
        const urgent = todos.filter(t => t.urgent).length;
        
        filterBtns[0].textContent = `全部 (${all})`;
        filterBtns[1].textContent = `未完成 (${pending})`;
        filterBtns[2].textContent = `已完成 (${completed})`;
        filterBtns[3].textContent = `紧急 (${urgent})`;
    }
    
    // 初始化渲染
    renderTodos();
    updateFilterCounts();
}

// 地图初始化
function initMap() {
    // 使用AMapLoader加载高德地图
    if (typeof AMapLoader !== 'undefined') {
        AMapLoader.load({
            key: '8fd12b82c18d08935bd8d829dcdb9135',
            version: '2.0',
            plugins: ['AMap.Geocoder', 'AMap.PlaceSearch', 'AMap.ToolBar', 'AMap.Scale']
        }).then((AMap) => {

// 更新时间函数
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('zh-CN', { hour12: false });
    const dateString = now.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        weekday: 'long' 
    });
    
    document.getElementById('current-time').textContent = timeString;
    document.getElementById('current-date').textContent = dateString;
}

// 背景选择器初始化
function initBackgroundSelector() {
    const bgSelector = document.getElementById('bg-selector');
    const changeBgBtn = document.getElementById('change-bg-btn');
    const bgOptions = document.querySelectorAll('.bg-option');
    const bgUpload = document.getElementById('bg-upload');
    const customBgBtn = document.getElementById('custom-bg-btn');
    
    // 切换背景选项显示
    changeBgBtn.addEventListener('click', () => {
        bgSelector.classList.toggle('expanded');
    });
    
    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (!bgSelector.contains(e.target)) {
            bgSelector.classList.remove('expanded');
        }
    });
    
    // 选择预设背景
    bgOptions.forEach(option => {
        option.addEventListener('click', () => {
            const bg = option.dataset.bg;
            if (bg === 'custom') {
                bgUpload.click();
            } else {
                setBackground(bg);
            }
            bgSelector.classList.remove('expanded');
        });
    });
    
    // 自定义背景上传
    bgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.body.style.backgroundImage = `url(${event.target.result})`;
                localStorage.setItem('customBackground', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 加载保存的自定义背景
    const savedBg = localStorage.getItem('customBackground');
    if (savedBg) {
        document.body.style.backgroundImage = `url(${savedBg})`;
    }
}

// 设置背景
function setBackground(bg) {
    const bgUrls = {
        nature1: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
        nature2: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
        nature3: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'
    };
    
    if (bgUrls[bg]) {
        document.body.style.backgroundImage = `url(${bgUrls[bg]})`;
        localStorage.removeItem('customBackground');
    }
}

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

function initAssistant() {
    const assistantInput = document.getElementById('assistant-input');
    const assistantSend = document.getElementById('assistant-send');
    const assistantMessages = document.getElementById('assistant-messages');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const apiKeyInput = document.getElementById('deepseek-api-key');
    
    // 加载保存的API密钥
    const savedApiKey = localStorage.getItem('deepseekApiKey');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
        updateStatus('在线', true);
    }
    
    // 保存API密钥
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('deepseekApiKey', apiKey);
            updateStatus('在线', true);
            alert('API密钥已保存');
        }
    });
    
    // 更新状态显示
    function updateStatus(text, isOnline) {
        const statusDot = document.getElementById('assistant-status-dot');
        const statusText = document.getElementById('assistant-status-text');
        
        if (statusDot && statusText) {
            statusDot.className = 'status-dot' + (isOnline ? ' online' : '');
            statusText.textContent = text;
        }
    }
    
    // 添加消息到聊天区域
    function addMessage(content, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
        messageDiv.innerHTML = `
            <div class="avatar">
                <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="content">
                <p>${content}</p>
                <div class="message-time">${new Date().toLocaleTimeString('zh-CN')}</div>
            </div>
        `;
        assistantMessages.appendChild(messageDiv);
        assistantMessages.scrollTop = assistantMessages.scrollHeight;
        return messageDiv;
    }
    
    // 调用Deepseek API
    async function callDeepseekAPI(userMessage, apiKey) {
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
        
        if (!apiKey) {
            addMessage('请先输入并保存Deepseek API密钥。');
            return;
        }
        
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
}

function initViewSwitch() {
    const viewSwitchBtn = document.getElementById('view-switch-btn');
    const viewSwitchContainer = document.getElementById('view-switch-container');
    
    if (viewSwitchBtn) {
        viewSwitchBtn.addEventListener('click', () => {
            document.body.classList.toggle('desktop-mode');
            const isDesktop = document.body.classList.contains('desktop-mode');
            viewSwitchBtn.innerHTML = isDesktop ? 
                '<i class="fas fa-mobile-alt"></i><span>手机版</span>' : 
                '<i class="fas fa-desktop"></i><span>电脑版</span>';
        });
    }
}

function initWeatherAndLocation() {
    // 获取位置信息
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // 更新位置显示
                updateLocationInfo(lat, lng);
                
                // 获取天气信息
                getWeatherInfo(lat, lng);
            },
            (error) => {
                console.error('定位失败:', error);
                document.getElementById('location-text').textContent = '定位失败';
                document.getElementById('city-name').textContent = '定位失败';
                
                // 使用默认位置（北京）获取天气
                getWeatherInfo(39.9042, 116.4074);
            }
        );
    } else {
        document.getElementById('location-text').textContent = '浏览器不支持定位';
        getWeatherInfo(39.9042, 116.4074);
    }
}

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