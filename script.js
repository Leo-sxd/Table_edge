// script.js - 修复高德地图API加载问题

document.addEventListener('DOMContentLoaded', function() {
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
    const bgSelector = document.getElementById('bg-selector');
    const changeBgBtn = document.getElementById('change-bg-btn');
    const bgOptions = document.getElementById('bg-options');
    const customBgBtn = document.getElementById('custom-bg-btn');
    const bgUpload = document.getElementById('bg-upload');
    
    // 修复：添加点击展开/收起功能
    changeBgBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        bgSelector.classList.toggle('expanded');
    });
    
    // 点击其他地方收起
    document.addEventListener('click', function(e) {
        if (!bgSelector.contains(e.target)) {
            bgSelector.classList.remove('expanded');
        }
    });
    
    // 防止点击选项区域收起
    bgOptions.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    const bgPreviews = document.querySelectorAll('.bg-option:not([data-bg="custom"])');
    // 修改背景切换函数，确保使用正确的CSS属性
    function changeBackgroundImage(imageUrl) {
        document.body.style.backgroundImage = `url(${imageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        localStorage.setItem('selectedBackground', imageUrl);
    }

    bgPreviews.forEach(option => {
        option.addEventListener('click', function() {
            const bgType = this.getAttribute('data-bg');
            const bgImages = {
                'nature1': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
                'nature2': 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
                'nature3': 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'
            };
            
            changeBackgroundImage(bgImages[bgType]);
            bgSelector.classList.remove('expanded');
        });
    });
    
    // 自定义背景上传
    customBgBtn.addEventListener('click', function() {
        bgUpload.click();
    });
    
    bgUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                changeBackgroundImage(event.target.result);
                bgSelector.classList.remove('expanded');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 加载保存的背景
    // 修改加载保存的背景函数
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
    
    // ==================== 6. Deepseek AI 集成 ====================
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
            statusText.style.color = '#2ecc71';
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
    
    // 调用Deepseek API
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

