/**
 * ============================================
 * 整合后的JavaScript文件 - script.js
 * 包含：粒子效果 + 主脚本 + 诗句模块
 * ============================================
 */
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
            mouseTrail: { enabled: false },
            screenSaver: { enabled: false, timeout: 60 }
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
        this.mouseTrailToggle = document.getElementById('mouse-trail-toggle');
        this.screenSaverToggle = document.getElementById('screensaver-toggle');
        this.screenSaverTimeSlider = document.getElementById('screensaver-time-slider');
        this.screenSaverTimeValue = document.getElementById('screensaver-time-value');
        this.screenSaverTimeControl = document.getElementById('screensaver-time-control');
        this.settingsBtn = document.getElementById('settings-btn');
        this.modalOverlay = document.getElementById('settings-modal-overlay');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.closeBtn = document.getElementById('close-settings');
        
        // 获取开关和滑块元素
        this.controls = {




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
        
        // 点击遮罩层关闭
        this.modalBackdrop.addEventListener('click', () => this.closePanel());
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('show')) {
                this.closePanel();
            }
        });
        
        // 绑定各特效控制事件
        
        // 鼠标拖尾开关事件绑定
        if (this.mouseTrailToggle) {
            console.log('Binding mouse trail toggle event');
            // Initialize checkbox state
            if (this.settings.mouseTrail) {
                this.mouseTrailToggle.checked = this.settings.mouseTrail.enabled;
            }
            
            this.mouseTrailToggle.addEventListener('change', (e) => {
                console.log('Mouse trail toggle changed:', e.target.checked);
                if (!this.settings.mouseTrail) {
                    this.settings.mouseTrail = { enabled: false };
                }
                this.settings.mouseTrail.enabled = e.target.checked;
                this.saveSettings();
                
                // Enable/disable mouse trail effect
                if (window.mouseTrailEffect) {
                    window.mouseTrailEffect.setEnabled(e.target.checked);
                    console.log('Mouse trail effect set to:', e.target.checked);
                } else {
                    console.error('mouseTrailEffect not found!');
                }
            });
        } else {
            console.error('mouseTrailToggle element not found!');
        }
        
        // 屏幕保护开关事件绑定
        console.log('Binding screen saver toggle event');
        if (this.screenSaverToggle) {
            console.log('Found screen saver toggle');
            
            // 确保settings中有screenSaver
            if (!this.settings.screenSaver) {
                this.settings.screenSaver = { enabled: false, timeout: 60 };
            }
            
            // 设置初始状态
            this.screenSaverToggle.checked = this.settings.screenSaver.enabled;
            
            // 根据初始状态显示/隐藏时间滑块
            if (this.screenSaverTimeControl) {
                this.screenSaverTimeControl.style.display = 
                    this.settings.screenSaver.enabled ? 'block' : 'none';
                console.log('Time control display:', this.screenSaverTimeControl.style.display);
            }
            
            // 设置时间滑块初始值
            if (this.screenSaverTimeSlider && this.screenSaverTimeValue) {
                this.screenSaverTimeSlider.value = this.settings.screenSaver.timeout;
                this.screenSaverTimeValue.textContent = this.settings.screenSaver.timeout;
            }
            
            // 绑定开关事件
            this.screenSaverToggle.addEventListener('change', (e) => {
                console.log('Screen saver toggle changed:', e.target.checked);
                this.settings.screenSaver.enabled = e.target.checked;
                this.saveSettings();
                
                // 显示/隐藏时间滑块
                if (this.screenSaverTimeControl) {
                    this.screenSaverTimeControl.style.display = 
                        e.target.checked ? 'block' : 'none';
                    console.log('Time control visibility changed to:', 
                        e.target.checked ? 'block' : 'none');
                }
                
                // 启用/禁用屏幕保护
                if (window.screenSaver) {
                    window.screenSaver.setEnabled(e.target.checked);
                }
            });
            
            // 绑定时间滑块事件
            if (this.screenSaverTimeSlider && this.screenSaverTimeValue) {
                this.screenSaverTimeSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.screenSaverTimeValue.textContent = value;
                    this.settings.screenSaver.timeout = value;
                    this.saveSettings();
                    
                    if (window.screenSaver) {
                        window.screenSaver.setTimeout(value);
                    }
                });
            }
        } else {
            console.error('screenSaverToggle element not found!');
        }
    }
    
    bindEffectControl(controlKey, settingKey) {
        const control = this.controls[controlKey];
        
        // 开关事件
        if (control.toggle) {
            control.toggle.addEventListener('change', (e) => {
                this.settings[settingKey].enabled = e.target.checked;
                this.saveSettings();
                this.applySettings();
                // 显示切换提示
                this.showToggleNotification(settingKey, e.target.checked);
            });
        }
        
        // 滑块事件
        if (control.slider) {
            control.slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.settings[settingKey].count = value;
                if (control.value) control.value.textContent = value;
                // 实时更新粒子数量（预览效果）
                this.updateParticleCount(settingKey, value);
            });
            
            control.slider.addEventListener('change', (e) => {
                this.saveSettings();
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
    
    // 显示切换提示
    showToggleNotification(effectType, enabled) {
        const names = {




        };
        const status = enabled ? '已开启' : '已关闭';
        console.log(`${names[effectType]} ${status}`);
    }
    
    applySettings() {
        // 更新CONFIG值



        
        // 应用到粒子系统
        if (window.particleSystem) {

            

            
            // 彩色粒子 - 控制显示/隐藏和重新生成

            

        }
    }
    
    // 单独更新粒子数量（用于滑块实时预览）
    updateParticleCount(effectType, count) {
        switch(effectType) {



        }
    }
}

// 初始化设置管理器
document.addEventListener('DOMContentLoaded', () => {
    console.log('[SettingsManager] Initializing...');
    window.settingsManager = new SettingsManager();
    console.log('[SettingsManager] Initialized, settings:', window.settingsManager.settings);
});

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





// ==================== 视觉防疲劳效果 ====================
class MouseTrailEffect {
    constructor() {
        this.enabled = false;
        this.canvas = null;
        this.ctx = null;
        this.points = [];
        this.maxPoints = 100;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.lastTime = Date.now();
        this.speedThreshold = 600; // 速度阈值：600px/s
        
        this.init();
    }
    
    init() {
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'mouse-trail-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '999999';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 绑定事件
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // 开始动画循环
        this.animate();
        
        console.log('鼠标拖尾效果初始化完成');
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    onMouseMove(e) {
        if (!this.enabled) return;
        
        const currentTime = Date.now();
        const dt = currentTime - this.lastTime;
        
        let speed = 0;
        if (dt > 0) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            speed = distance / dt * 1000;
        }
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.lastTime = currentTime;
        
        // 添加轨迹点
        this.points.push({
            x: e.clientX,
            y: e.clientY,
            speed: speed,
            time: currentTime
        });
        
        // 限制轨迹点数量
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('鼠标拖尾效果:', enabled ? '开启' : '关闭');
        if (!enabled) {
            this.points = [];
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.enabled || !this.ctx) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 如果没有足够点形成线条，直接返回
        if (this.points.length < 2) return;
        
        const currentTime = Date.now();
        
        // 计算当前平均速度
        let avgSpeed = 0;
        if (this.points.length > 0) {
            const recentPoints = this.points.slice(-3);
            avgSpeed = recentPoints.reduce((sum, p) => sum + p.speed, 0) / recentPoints.length;
        }
        
        // 创建渐变线条 - 使用连续路径而不是分段线段
        ctx.beginPath();
        
        // 从尾部（最旧的点）开始移动到第一个点
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        // 使用贝塞尔曲线连接所有点，形成平滑曲线
        for (let i = 1; i < this.points.length - 1; i++) {
            const point = this.points[i];
            const nextPoint = this.points[i + 1];
            
            // 计算控制点（中点）
            const cpX = (point.x + nextPoint.x) / 2;
            const cpY = (point.y + nextPoint.y) / 2;
            
            // 使用二次贝塞尔曲线
            ctx.quadraticCurveTo(point.x, point.y, cpX, cpY);
        }
        
        // 连接到头部（最新的点）
        const lastPoint = this.points[this.points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
        
        // 创建线性渐变 - 从尾部到头部
        // 尾部透明度 0.05，头部透明度 0.9
        const firstPoint = this.points[0];
        const gradient = ctx.createLinearGradient(
            firstPoint.x, firstPoint.y,
            lastPoint.x, lastPoint.y
        );
        
        // 根据速度决定颜色
        if (avgSpeed < this.speedThreshold) {
            // 低速：半透明白色渐变
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');   // 尾部
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');    // 头部
        } else {
            // 高速：半透明彩色渐变
            const hue = (Date.now() / 15) % 360;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.05)`);  // 尾部
            gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.9)`);   // 头部
        }
        
        // 设置线条样式
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // 移除过期的点（400ms）
        this.points = this.points.filter(p => currentTime - p.time < 400);
    }
}

// 初始化鼠标拖尾效果
document.addEventListener('DOMContentLoaded', () => {
    console.log('[MouseTrail] Initializing...');
    
    // Create global instance
    window.mouseTrailEffect = new MouseTrailEffect();
    console.log('[MouseTrail] Instance created');
    
    // Apply saved settings after a delay to ensure SettingsManager is ready
    setTimeout(() => {
        console.log('[MouseTrail] Checking saved settings...');
        
        if (window.settingsManager && window.settingsManager.settings) {
            const trailSettings = window.settingsManager.settings.mouseTrail;
            console.log('[MouseTrail] Settings found:', trailSettings);
            
            if (trailSettings && trailSettings.enabled) {
                console.log('[MouseTrail] Enabling from saved settings');
                window.mouseTrailEffect.setEnabled(true);
                
                // Sync toggle state
                const toggle = document.getElementById('mouse-trail-toggle');
                if (toggle) {
                    toggle.checked = true;
                    console.log('[MouseTrail] Toggle synced to ON');
                }
            } else {
                console.log('[MouseTrail] Saved setting is disabled or not found');
            }
        } else {
            console.log('[MouseTrail] SettingsManager not ready yet');
        }
    }, 800);
});

// ==================== 屏幕保护功能 ====================
class ScreenSaver {
    constructor() {
        this.enabled = false;
        this.timeout = 60000; // 默认60秒
        this.timer = null;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.particleCount = 10;
        this.particleSize = 6;
        this.isActive = false;
        this.lastActivity = Date.now();
        
        this.init();
    }
    
    init() {
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'screensaver-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 999999;
            display: none;
            pointer-events: none;
        `;
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 绑定事件
        window.addEventListener('resize', () => this.resize());
        this.bindActivityEvents();
        
        // 初始化粒子
        this.initParticles();
        
        console.log('[ScreenSaver] 初始化完成');
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    bindActivityEvents() {
        // 监听鼠标移动和键盘事件
        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.onActivity();
            }, { passive: true });
        });
    }
    
    onActivity() {
        this.lastActivity = Date.now();
        
        // 如果屏幕保护正在运行，立即停止
        if (this.isActive) {
            this.deactivate();
        }
        
        // 重置计时器
        this.resetTimer();
    }
    
    resetTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        if (this.enabled) {
            this.timer = setTimeout(() => {
                this.activate();
            }, this.timeout);
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('[ScreenSaver] 屏幕保护:', enabled ? '开启' : '关闭');
        
        if (enabled) {
            this.resetTimer();
        } else {
            if (this.timer) {
                clearTimeout(this.timer);
            }
            if (this.isActive) {
                this.deactivate();
            }
        }
    }
    
    setTimeout(seconds) {
        this.timeout = seconds * 1000;
        console.log('[ScreenSaver] 触发时间设置为:', seconds, '秒');
        
        if (this.enabled) {
            this.resetTimer();
        }
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                hue: Math.random() * 360,
                hueSpeed: (Math.random() - 0.5) * 2
            });
        }
    }
    
    activate() {
        if (!this.enabled || this.isActive) return;
        
        console.log('[ScreenSaver] 激活屏幕保护');
        this.isActive = true;
        this.canvas.style.display = 'block';
        
        // 重新初始化粒子位置
        this.initParticles();
        
        // 开始动画
        this.animate();
    }
    
    deactivate() {
        console.log('[ScreenSaver] 关闭屏幕保护');
        this.isActive = false;
        this.canvas.style.display = 'none';
        
        // 停止动画
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 清空画布
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        // 更新和绘制粒子
        this.particles.forEach(particle => {
            // 布朗运动 - 随机改变速度
            particle.vx += (Math.random() - 0.5) * 0.5;
            particle.vy += (Math.random() - 0.5) * 0.5;
            
            // 限制速度
            const maxSpeed = 3;
            particle.vx = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vx));
            particle.vy = Math.max(-maxSpeed, Math.min(maxSpeed, particle.vy));
            
            // 更新位置
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // 边界反弹
            if (particle.x < 0 || particle.x > width) {
                particle.vx *= -1;
                particle.x = Math.max(0, Math.min(width, particle.x));
            }
            if (particle.y < 0 || particle.y > height) {
                particle.vy *= -1;
                particle.y = Math.max(0, Math.min(height, particle.y));
            }
            
            // 更新颜色
            particle.hue += particle.hueSpeed;
            if (particle.hue < 0) particle.hue += 360;
            if (particle.hue > 360) particle.hue -= 360;
            
            // 绘制粒子
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, this.particleSize, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${particle.hue}, 80%, 60%)`;
            ctx.fill();
            
            // 添加发光效果
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${particle.hue}, 80%, 60%)`;
        });
        
        // 重置阴影
        ctx.shadowBlur = 0;
    }
}

// 初始化屏幕保护
document.addEventListener('DOMContentLoaded', () => {
    window.screenSaver = new ScreenSaver();
    
    // 从设置中恢复状态
    setTimeout(() => {
        if (window.settingsManager && window.settingsManager.settings) {
            const saverSettings = window.settingsManager.settings.screenSaver;
            if (saverSettings) {
                window.screenSaver.setEnabled(saverSettings.enabled);
                window.screenSaver.setTimeout(saverSettings.timeout);
            }
        }
    }, 500);
});