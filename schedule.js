/**
 * ============================================
 * 课程表模块 - Schedule Module
 * 功能：课程管理、时间设置、课前提醒、考试管理
 * ============================================
 */

class ScheduleModule {
    constructor() {
        // 默认时间段设置
        this.defaultTimeSlots = [
            { id: 1, name: '第1节', start: '08:00', end: '09:40' },
            { id: 2, name: '第2节', start: '10:00', end: '11:40' },
            { id: 3, name: '第3节', start: '14:00', end: '15:40' },
            { id: 4, name: '第4节', start: '16:00', end: '17:40' },
            { id: 5, name: '第5节', start: '19:00', end: '20:40' }
        ];
        
        // 星期映射
        this.dayNames = ['', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        // 数据存储键
        this.storageKeys = {
            courses: 'schedule_courses',
            exams: 'schedule_exams',
            timeSlots: 'schedule_time_slots',
            remindedClasses: 'schedule_reminded_classes'
        };
        
        // 初始化
        this.init();
    }
    
    // 初始化
    init() {
        this.loadTimeSlots();
        this.loadCourses();
        this.loadExams();
        this.bindEvents();
        this.renderSchedule();
        this.startReminderCheck();
        console.log('[Schedule] 课程表模块已初始化');
    }
    
    // ==================== 数据管理 ====================
    
    // 加载时间段设置
    loadTimeSlots() {
        const saved = localStorage.getItem(this.storageKeys.timeSlots);
        this.timeSlots = saved ? JSON.parse(saved) : [...this.defaultTimeSlots];
    }
    
    // 保存时间段设置
    saveTimeSlots() {
        localStorage.setItem(this.storageKeys.timeSlots, JSON.stringify(this.timeSlots));
    }
    
    // 加载课程数据
    loadCourses() {
        const saved = localStorage.getItem(this.storageKeys.courses);
        this.courses = saved ? JSON.parse(saved) : [];
    }
    
    // 保存课程数据
    saveCourses() {
        localStorage.setItem(this.storageKeys.courses, JSON.stringify(this.courses));
    }
    
    // 加载考试数据
    loadExams() {
        const saved = localStorage.getItem(this.storageKeys.exams);
        this.exams = saved ? JSON.parse(saved) : [];
    }
    
    // 保存考试数据
    saveExams() {
        localStorage.setItem(this.storageKeys.exams, JSON.stringify(this.exams));
    }
    
    // ==================== 事件绑定 ====================
    
    bindEvents() {
        // 标签切换
        document.querySelectorAll('.schedule-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 导入课程按钮
        const importBtn = document.getElementById('import-schedule-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.openImportModal());
        }
        
        // 添加课程按钮
        const addCourseBtn = document.getElementById('add-course-btn');
        if (addCourseBtn) {
            addCourseBtn.addEventListener('click', () => this.openAddCourseModal());
        }
        
        // 添加考试按钮
        const addExamBtn = document.getElementById('add-exam-btn');
        if (addExamBtn) {
            addExamBtn.addEventListener('click', () => this.openAddExamModal());
        }
        
        // 时间设置按钮
        const timeSettingsBtn = document.getElementById('time-settings-btn');
        if (timeSettingsBtn) {
            timeSettingsBtn.addEventListener('click', () => this.openTimeSettingsModal());
        }
        
        // 清空按钮
        const clearBtn = document.getElementById('clear-schedule-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllData());
        }
        
        // 关闭弹窗按钮
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.schedule-modal');
                if (modal) modal.classList.remove('active');
            });
        });
        
        // 点击弹窗外部关闭
        document.querySelectorAll('.schedule-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
        
        // 保存课程按钮
        const saveCourseBtn = document.getElementById('save-course-btn');
        if (saveCourseBtn) {
            saveCourseBtn.addEventListener('click', () => this.saveCourse());
        }
        
        // 取消添加课程按钮
        const cancelAddCourseBtn = document.getElementById('cancel-add-course-btn');
        if (cancelAddCourseBtn) {
            cancelAddCourseBtn.addEventListener('click', () => {
                document.getElementById('add-course-modal').classList.remove('active');
            });
        }
        
        // 解析导入按钮
        const parseScheduleBtn = document.getElementById('parse-schedule-btn');
        if (parseScheduleBtn) {
            parseScheduleBtn.addEventListener('click', () => this.parseImportedSchedule());
        }
        
        // 取消导入按钮
        const cancelImportBtn = document.getElementById('cancel-import-btn');
        if (cancelImportBtn) {
            cancelImportBtn.addEventListener('click', () => {
                document.getElementById('import-modal').classList.remove('active');
            });
        }
        
        // 保存考试按钮
        const saveExamBtn = document.getElementById('save-exam-btn');
        if (saveExamBtn) {
            saveExamBtn.addEventListener('click', () => this.saveExam());
        }
        
        // 取消添加考试按钮
        const cancelAddExamBtn = document.getElementById('cancel-add-exam-btn');
        if (cancelAddExamBtn) {
            cancelAddExamBtn.addEventListener('click', () => {
                document.getElementById('add-exam-modal').classList.remove('active');
            });
        }
        
        // 保存时间设置按钮
        const saveTimeSettingsBtn = document.getElementById('save-time-settings-btn');
        if (saveTimeSettingsBtn) {
            saveTimeSettingsBtn.addEventListener('click', () => this.saveTimeSettings());
        }
        
        // 恢复默认时间按钮
        const resetTimeSettingsBtn = document.getElementById('reset-time-settings-btn');
        if (resetTimeSettingsBtn) {
            resetTimeSettingsBtn.addEventListener('click', () => this.resetTimeSettings());
        }
        
        // 取消时间设置按钮
        const cancelTimeSettingsBtn = document.getElementById('cancel-time-settings-btn');
        if (cancelTimeSettingsBtn) {
            cancelTimeSettingsBtn.addEventListener('click', () => {
                document.getElementById('time-settings-modal').classList.remove('active');
            });
        }
        
        // 关闭提醒按钮
        const closeReminderBtn = document.getElementById('close-reminder-btn');
        if (closeReminderBtn) {
            closeReminderBtn.addEventListener('click', () => {
                document.getElementById('class-reminder-modal').classList.remove('active');
            });
        }
        
        // 课程单元格点击事件
        document.querySelectorAll('.course-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const day = parseInt(e.target.dataset.day);
                const time = parseInt(e.target.dataset.time);
                if (day && time) {
                    this.openAddCourseModal(day, time);
                }
            });
        });
    }
    
    // ==================== 标签切换 ====================
    
    switchTab(tab) {
        const scheduleGrid = document.getElementById('schedule-grid');
        const examContainer = document.getElementById('exam-list-container');
        
        if (tab === 'exam') {
            if (scheduleGrid) scheduleGrid.style.display = 'none';
            if (examContainer) {
                examContainer.style.display = 'block';
                this.renderExamList();
            }
        } else {
            if (scheduleGrid) scheduleGrid.style.display = 'grid';
            if (examContainer) examContainer.style.display = 'none';
            this.renderSchedule();
        }
    }
    
    // ==================== 课程表渲染 ====================
    
    renderSchedule() {
        // 清空所有课程单元格
        document.querySelectorAll('.course-cell').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('empty');
        });
        
        // 更新时间段显示
        this.updateTimeSlots();
        
        // 渲染课程
        this.courses.forEach(course => {
            const cell = document.querySelector(`.course-cell[data-day="${course.day}"][data-time="${course.time}"]`);
            if (cell) {
                cell.innerHTML = `
                    <div class="course-info">
                        <div class="course-name">${course.name}</div>
                        <div class="course-location">${course.location || ''}</div>
                        ${course.teacher ? `<div class="course-teacher">${course.teacher}</div>` : ''}
                    </div>
                `;
                cell.classList.add('has-course');
            }
        });
        
        // 标记空单元格
        document.querySelectorAll('.course-cell:not(.has-course)').forEach(cell => {
            cell.classList.add('empty');
        });
        
        // 高亮当前时间
        this.highlightCurrentTime();
    }
    
    // 更新时间段显示
    updateTimeSlots() {
        const timeSlotElements = document.querySelectorAll('.time-slot');
        timeSlotElements.forEach((el, index) => {
            if (this.timeSlots[index]) {
                el.textContent = `${this.timeSlots[index].start}-${this.timeSlots[index].end}`;
            }
        });
    }
    
    // 高亮当前时间
    highlightCurrentTime() {
        const now = new Date();
        const day = now.getDay(); // 0=周日, 1=周一...
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        // 移除之前的高亮
        document.querySelectorAll('.course-cell.current').forEach(cell => {
            cell.classList.remove('current');
        });
        
        // 如果不是周一到周六，不处理
        if (day < 1 || day > 6) return;
        
        // 找到当前时间段
        this.timeSlots.forEach((slot, index) => {
            const [startHour, startMin] = slot.start.split(':').map(Number);
            const [endHour, endMin] = slot.end.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            if (currentTime >= startMinutes && currentTime <= endMinutes) {
                const cell = document.querySelector(`.course-cell[data-day="${day}"][data-time="${index + 1}"]`);
                if (cell) cell.classList.add('current');
            }
        });
    }
    
    // ==================== 弹窗操作 ====================
    
    // 打开导入弹窗
    openImportModal() {
        document.getElementById('import-modal').classList.add('active');
        document.getElementById('import-textarea').value = '';
        document.getElementById('import-textarea').focus();
    }
    
    // 打开添加课程弹窗
    openAddCourseModal(day = null, time = null) {
        document.getElementById('add-course-modal').classList.add('active');
        document.getElementById('course-name').value = '';
        document.getElementById('course-location').value = '';
        document.getElementById('course-teacher').value = '';
        
        if (day) document.getElementById('course-day').value = day;
        if (time) document.getElementById('course-time').value = time;
        
        document.getElementById('course-name').focus();
    }
    
    // 打开添加考试弹窗
    openAddExamModal() {
        document.getElementById('add-exam-modal').classList.add('active');
        document.getElementById('exam-name').value = '';
        document.getElementById('exam-date').value = '';
        document.getElementById('exam-time').value = '';
        document.getElementById('exam-location').value = '';
        document.getElementById('exam-note').value = '';
        document.getElementById('exam-name').focus();
    }
    
    // 打开时间设置弹窗
    openTimeSettingsModal() {
        document.getElementById('time-settings-modal').classList.add('active');
        this.renderTimeSettings();
    }
    
    // ==================== 课程管理 ====================
    
    // 保存课程
    saveCourse() {
        const name = document.getElementById('course-name').value.trim();
        const day = parseInt(document.getElementById('course-day').value);
        const time = parseInt(document.getElementById('course-time').value);
        const location = document.getElementById('course-location').value.trim();
        const teacher = document.getElementById('course-teacher').value.trim();
        
        if (!name) {
            alert('请输入课程名称');
            return;
        }
        
        // 检查该时间段是否已有课程
        const existingIndex = this.courses.findIndex(c => c.day === day && c.time === time);
        if (existingIndex >= 0) {
            if (!confirm('该时间段已有课程，是否覆盖？')) return;
            this.courses[existingIndex] = { name, day, time, location, teacher };
        } else {
            this.courses.push({ name, day, time, location, teacher });
        }
        
        this.saveCourses();
        this.renderSchedule();
        document.getElementById('add-course-modal').classList.remove('active');
        this.showToast('课程保存成功');
    }
    
    // 解析导入的课程
    parseImportedSchedule() {
        const text = document.getElementById('import-textarea').value.trim();
        if (!text) {
            alert('请输入课程信息');
            return;
        }
        
        const lines = text.split('\n');
        let importedCount = 0;
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // 尝试解析多种格式
            // 格式1: 课程名 周一 08:00-09:40 教学楼A101 老师
            // 格式2: 高等数学 第1节 周一 教学楼A101
            
            const course = this.parseCourseLine(line);
            if (course) {
                // 检查是否已存在
                const existingIndex = this.courses.findIndex(c => 
                    c.day === course.day && c.time === course.time
                );
                if (existingIndex >= 0) {
                    this.courses[existingIndex] = course;
                } else {
                    this.courses.push(course);
                }
                importedCount++;
            }
        });
        
        if (importedCount > 0) {
            this.saveCourses();
            this.renderSchedule();
            document.getElementById('import-modal').classList.remove('active');
            this.showToast(`成功导入 ${importedCount} 门课程`);
        } else {
            alert('未能解析任何课程，请检查格式');
        }
    }
    
    // 解析单行课程信息
    parseCourseLine(line) {
        // 尝试匹配：课程名 + 星期 + 时间/节次 + 地点
        const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6 };
        const timeMap = { '第1节': 1, '第2节': 2, '第3节': 3, '第4节': 4, '第5节': 5 };
        
        let day = null;
        let time = null;
        let name = '';
        let location = '';
        let teacher = '';
        
        // 查找星期
        for (const [dayName, dayNum] of Object.entries(dayMap)) {
            if (line.includes(dayName)) {
                day = dayNum;
                break;
            }
        }
        
        // 查找节次
        for (const [timeName, timeNum] of Object.entries(timeMap)) {
            if (line.includes(timeName)) {
                time = timeNum;
                break;
            }
        }
        
        // 如果没有找到节次，尝试匹配时间格式 08:00-09:40
        if (!time) {
            const timeMatch = line.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
            if (timeMatch) {
                const startTime = `${timeMatch[1]}:${timeMatch[2]}`;
                // 找到匹配的时间段
                const slot = this.timeSlots.find(s => s.start === startTime);
                if (slot) time = slot.id;
            }
        }
        
        // 提取课程名（简单处理：取第一个空格前的内容，或整行如果找不到其他信息）
        const parts = line.split(/\s+/);
        if (parts.length > 0) {
            // 假设课程名是第一个不包含"第X节"、"周X"、时间格式的部分
            for (const part of parts) {
                if (!part.match(/第[\d一二三四五]节/) && 
                    !part.match(/周[一二三四五六日]/) &&
                    !part.match(/\d{2}:\d{2}/) &&
                    !part.match(/教学楼|教室|机房|实验室/)) {
                    name = part;
                    break;
                }
            }
            
            // 如果没找到，用第一部分
            if (!name) name = parts[0];
            
            // 查找地点（包含教学楼、教室等关键词）
            for (const part of parts) {
                if (part.match(/教学楼|教室|机房|实验室/)) {
                    location = part;
                    break;
                }
            }
        }
        
        if (name && day && time) {
            return { name, day, time, location, teacher };
        }
        
        return null;
    }
    
    // ==================== 考试管理 ====================
    
    // 保存考试
    saveExam() {
        const name = document.getElementById('exam-name').value.trim();
        const date = document.getElementById('exam-date').value;
        const time = document.getElementById('exam-time').value;
        const location = document.getElementById('exam-location').value.trim();
        const note = document.getElementById('exam-note').value.trim();
        
        if (!name || !date) {
            alert('请输入考试科目和日期');
            return;
        }
        
        this.exams.push({
            id: Date.now(),
            name,
            date,
            time,
            location,
            note
        });
        
        this.saveExams();
        document.getElementById('add-exam-modal').classList.remove('active');
        this.showToast('考试添加成功');
        
        // 如果在考试标签页，刷新列表
        const examTab = document.querySelector('.schedule-tab[data-tab="exam"]');
        if (examTab && examTab.classList.contains('active')) {
            this.renderExamList();
        }
    }
    
    // 渲染考试列表
    renderExamList() {
        const examList = document.getElementById('exam-list');
        if (!examList) return;
        
        // 按日期排序
        const sortedExams = [...this.exams].sort((a, b) => {
            return new Date(a.date + ' ' + (a.time || '00:00')) - new Date(b.date + ' ' + (b.time || '00:00'));
        });
        
        if (sortedExams.length === 0) {
            examList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>暂无考试安排</p>
                </div>
            `;
            return;
        }
        
        examList.innerHTML = sortedExams.map(exam => `
            <div class="exam-item" data-id="${exam.id}">
                <div class="exam-info">
                    <h4>${exam.name}</h4>
                    <p><i class="fas fa-calendar"></i> ${exam.date} ${exam.time || ''}</p>
                    ${exam.location ? `<p><i class="fas fa-map-marker-alt"></i> ${exam.location}</p>` : ''}
                    ${exam.note ? `<p><i class="fas fa-sticky-note"></i> ${exam.note}</p>` : ''}
                </div>
                <div class="exam-actions">
                    <button class="exam-delete" onclick="scheduleModule.deleteExam(${exam.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // 删除考试
    deleteExam(id) {
        if (!confirm('确定要删除这个考试吗？')) return;
        
        this.exams = this.exams.filter(e => e.id !== id);
        this.saveExams();
        this.renderExamList();
        this.showToast('考试已删除');
    }
    
    // ==================== 时间设置 ====================
    
    // 渲染时间设置
    renderTimeSettings() {
        const container = document.getElementById('time-slots-list');
        if (!container) return;
        
        container.innerHTML = this.timeSlots.map((slot, index) => `
            <div class="time-slot-item">
                <span>第${index + 1}节</span>
                <input type="time" id="time-start-${slot.id}" value="${slot.start}">
                <span>-</span>
                <input type="time" id="time-end-${slot.id}" value="${slot.end}">
            </div>
        `).join('');
    }
    
    // 保存时间设置
    saveTimeSettings() {
        this.timeSlots.forEach(slot => {
            const startInput = document.getElementById(`time-start-${slot.id}`);
            const endInput = document.getElementById(`time-end-${slot.id}`);
            
            if (startInput && endInput) {
                slot.start = startInput.value;
                slot.end = endInput.value;
            }
        });
        
        this.saveTimeSlots();
        this.renderSchedule();
        document.getElementById('time-settings-modal').classList.remove('active');
        this.showToast('时间设置已保存');
    }
    
    // 恢复默认时间设置
    resetTimeSettings() {
        if (!confirm('确定要恢复默认时间设置吗？')) return;
        
        this.timeSlots = [...this.defaultTimeSlots];
        this.saveTimeSlots();
        this.renderTimeSettings();
        this.showToast('已恢复默认设置');
    }
    
    // ==================== 课前提醒 ====================
    
    // 启动提醒检查
    startReminderCheck() {
        // 每分钟检查一次
        this.checkReminders();
        setInterval(() => this.checkReminders(), 60000);
    }
    
    // 检查提醒
    checkReminders() {
        const now = new Date();
        const day = now.getDay();
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTime = currentHour * 60 + currentMin;
        
        // 只检查周一到周六
        if (day < 1 || day > 6) return;
        
        // 获取今天已提醒的课程
        const remindedKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
        const remindedClasses = JSON.parse(localStorage.getItem(this.storageKeys.remindedClasses) || '{}');
        const todayReminded = remindedClasses[remindedKey] || [];
        
        this.courses.forEach(course => {
            if (course.day !== day) return;
            
            const slot = this.timeSlots.find(s => s.id === course.time);
            if (!slot) return;
            
            const [startHour, startMin] = slot.start.split(':').map(Number);
            const startTime = startHour * 60 + startMin;
            
            // 提前30分钟提醒
            const reminderTime = startTime - 30;
            
            // 如果当前时间在提醒时间±1分钟内，且今天还没有提醒过
            if (currentTime >= reminderTime && currentTime <= reminderTime + 1) {
                const courseKey = `${course.day}-${course.time}`;
                if (!todayReminded.includes(courseKey)) {
                    this.showClassReminder(course, slot);
                    todayReminded.push(courseKey);
                    remindedClasses[remindedKey] = todayReminded;
                    localStorage.setItem(this.storageKeys.remindedClasses, JSON.stringify(remindedClasses));
                }
            }
        });
    }
    
    // 显示课前提醒
    showClassReminder(course, slot) {
        const modal = document.getElementById('class-reminder-modal');
        const nameEl = document.getElementById('reminder-course-name');
        const timeEl = document.getElementById('reminder-course-time');
        const locationEl = document.getElementById('reminder-course-location');
        
        if (nameEl) nameEl.textContent = course.name;
        if (timeEl) timeEl.textContent = `${slot.start} - ${slot.end}`;
        if (locationEl) locationEl.textContent = course.location || '地点未设置';
        
        if (modal) modal.classList.add('active');
        
        // 播放提示音（如果浏览器支持）
        this.playNotificationSound();
    }
    
    // 播放提示音
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('[Schedule] 无法播放提示音');
        }
    }
    
    // ==================== 工具方法 ====================
    
    // 清空所有数据
    clearAllData() {
        if (!confirm('确定要清空所有课程和考试数据吗？此操作不可恢复！')) return;
        
        this.courses = [];
        this.exams = [];
        this.saveCourses();
        this.saveExams();
        this.renderSchedule();
        this.showToast('所有数据已清空');
    }
    
    // 显示提示
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(140, 0, 255, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 10002;
            animation: fadeIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// 初始化课程表模块
let scheduleModule;
document.addEventListener('DOMContentLoaded', () => {
    scheduleModule = new ScheduleModule();
});
