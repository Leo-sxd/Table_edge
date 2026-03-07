/**
 * ============================================
 * 课程表核心模块 - Schedule Module
 * 参考开源项目设计思路：
 * 1. 数据驱动渲染
 * 2. 模块化架构
 * 3. 事件委托绑定
 * 4. 本地存储持久化
 * ============================================
 */

class ScheduleManager {
    constructor() {
        // 初始化数据
        this.courses = [];
        this.exams = [];
        this.currentWeek = 1;
        this.maxWeek = 20;
        
        // 时间段配置
        // 默认单节课时间配置（默认8节课，可从localStorage加载用户自定义配置）
        this.periods = this.loadPeriodsConfig() || this.generateDefaultPeriods(8);
        
        // 每天最大节数（可配置，默认8节，范围1-24）
        this.maxPeriodsPerDay = this.loadMaxPeriodsConfig() || 8;
        
        // 每节课的高度（像素）
        this.periodHeight = 60;
        
        // 星期配置
        this.days = [
            { id: 1, name: '周一' },
            { id: 2, name: '周二' },
            { id: 3, name: '周三' },
            { id: 4, name: '周四' },
            { id: 5, name: '周五' },
            { id: 6, name: '周六' },
            { id: 7, name: '周日' }
        ];
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.bindEvents();
        this.render();
        console.log('[ScheduleManager] 初始化完成');
    }
    
    // 加载节次时间配置
    loadPeriodsConfig() {
        const config = localStorage.getItem('schedule_periods_config');
        return config ? JSON.parse(config) : null;
    }
    
    // 保存节次时间配置
    savePeriodsConfig(periods) {
        this.periods = periods;
        localStorage.setItem('schedule_periods_config', JSON.stringify(periods));
    }
    
    // 加载每天最大节数配置
    loadMaxPeriodsConfig() {
        const config = localStorage.getItem('schedule_max_periods_config');
        return config ? parseInt(config) : null;
    }
    
    // 保存每天最大节数配置
    saveMaxPeriodsConfig(maxPeriods) {
        this.maxPeriodsPerDay = maxPeriods;
        localStorage.setItem('schedule_max_periods_config', maxPeriods.toString());
    }
    
    // 生成默认时间段配置
    generateDefaultPeriods(count) {
        const periods = [];
        // 默认时间安排：上午4节，下午4节，晚上可选
        const defaultTimes = [
            { start: '08:00', end: '08:50' },   // 第1节
            { start: '08:55', end: '09:45' },   // 第2节
            { start: '10:00', end: '10:50' },   // 第3节
            { start: '10:55', end: '11:45' },   // 第4节
            { start: '14:00', end: '14:50' },   // 第5节
            { start: '14:55', end: '15:45' },   // 第6节
            { start: '16:00', end: '16:50' },   // 第7节
            { start: '16:55', end: '17:45' },   // 第8节
            { start: '19:00', end: '19:50' },   // 第9节
            { start: '19:55', end: '20:45' },   // 第10节
            { start: '20:50', end: '21:40' },   // 第11节
            { start: '21:45', end: '22:35' },   // 第12节
        ];
        
        for (let i = 1; i <= count; i++) {
            const time = defaultTimes[i - 1] || { start: '09:00', end: '09:50' };
            periods.push({
                id: i,
                name: `第${i}节`,
                startTime: time.start,
                endTime: time.end
            });
        }
        return periods;
    }
    
    // 验证时间格式 HH:MM
    validateTimeFormat(timeStr) {
        const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        return regex.test(timeStr);
    }
    
    // 将时间字符串转换为分钟数
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    // 验证时间段是否有冲突
    validateTimeConflicts(periods) {
        const errors = [];
        
        for (let i = 0; i < periods.length; i++) {
            const current = periods[i];
            
            // 验证时间格式
            if (!this.validateTimeFormat(current.startTime)) {
                errors.push(`第${current.id}节开始时间格式错误`);
            }
            if (!this.validateTimeFormat(current.endTime)) {
                errors.push(`第${current.id}节结束时间格式错误`);
            }
            
            // 验证结束时间是否晚于开始时间
            const startMins = this.timeToMinutes(current.startTime);
            const endMins = this.timeToMinutes(current.endTime);
            
            if (startMins >= endMins) {
                errors.push(`第${current.id}节结束时间必须晚于开始时间`);
            }
            
            // 验证与相邻课程的时间冲突
            if (i > 0) {
                const prev = periods[i - 1];
                const prevEndMins = this.timeToMinutes(prev.endTime);
                
                if (startMins < prevEndMins) {
                    errors.push(`第${current.id}节与第${prev.id}节时间重叠`);
                }
            }
        }
        
        return errors;
    }
    
    // 从localStorage加载数据
    loadData() {
        try {
            const savedCourses = localStorage.getItem('schedule_courses');
            const savedExams = localStorage.getItem('schedule_exams');
            const savedWeek = localStorage.getItem('schedule_current_week');
            
            if (savedCourses) this.courses = JSON.parse(savedCourses);
            if (savedExams) this.exams = JSON.parse(savedExams);
            if (savedWeek) this.currentWeek = parseInt(savedWeek);
            
            console.log('[ScheduleManager] 数据加载完成:', {
                courses: this.courses.length,
                exams: this.exams.length,
                currentWeek: this.currentWeek
            });
        } catch (e) {
            console.error('[ScheduleManager] 数据加载失败:', e);
        }
    }
    
    // 保存数据到localStorage
    saveData() {
        try {
            localStorage.setItem('schedule_courses', JSON.stringify(this.courses));
            localStorage.setItem('schedule_exams', JSON.stringify(this.exams));
            localStorage.setItem('schedule_current_week', this.currentWeek);
            console.log('[ScheduleManager] 数据已保存');
        } catch (e) {
            console.error('[ScheduleManager] 数据保存失败:', e);
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 使用事件委托绑定按钮事件
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button, .course-item, .course-cell');
            if (!target) return;
            
            // 导入课程按钮
            if (target.id === 'import-schedule-btn' || target.closest('#import-schedule-btn')) {
                this.openImportModal();
            }
            // 添加课程按钮
            else if (target.id === 'add-course-btn' || target.closest('#add-course-btn')) {
                this.openAddCourseModal();
            }
            // 添加考试按钮
            else if (target.id === 'add-exam-btn' || target.closest('#add-exam-btn')) {
                this.openAddExamModal();
            }
            // 课程设置按钮
            else if (target.id === 'time-settings-btn' || target.closest('#time-settings-btn')) {
                this.openSettingsModal();
            }
            // 清空按钮
            else if (target.id === 'clear-schedule-btn' || target.closest('#clear-schedule-btn')) {
                this.clearAll();
            }
            // 关闭弹窗按钮
            else if (target.classList.contains('modal-close') || target.closest('.modal-close')) {
                this.closeAllModals();
            }
            // 本周按钮
            else if (target.id === 'current-week-btn' || target.closest('#current-week-btn')) {
                this.setCurrentWeek(1);
            }
            // 下周按钮
            else if (target.id === 'next-week-btn' || target.closest('#next-week-btn')) {
                this.changeWeek(1);
            }
            // 上周按钮
            else if (target.id === 'prev-week-btn' || target.closest('#prev-week-btn')) {
                this.changeWeek(-1);
            }
            // 考试按钮
            else if (target.id === 'exam-btn' || target.closest('#exam-btn')) {
                this.toggleExamView();
            }
            // 点击课程格子
            else if (target.classList.contains('course-cell')) {
                const day = target.dataset.day;
                const time = target.dataset.time;
                if (day && time) {
                    this.openAddCourseModal({ day: parseInt(day), time: parseInt(time) });
                }
            }
        });
        
        // 文件上传事件
        const fileInput = document.getElementById('html-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // 解析按钮事件
        const parseBtn = document.getElementById('parse-schedule-btn');
        if (parseBtn) {
            parseBtn.addEventListener('click', () => this.parseManualInput());
        }
        
        // 保存课程按钮
        const saveCourseBtn = document.getElementById('save-course-btn');
        if (saveCourseBtn) {
            saveCourseBtn.addEventListener('click', () => this.saveCourse());
        }
        
        // 保存考试按钮
        const saveExamBtn = document.getElementById('save-exam-btn');
        if (saveExamBtn) {
            saveExamBtn.addEventListener('click', () => this.saveExam());
        }
        
        console.log('[ScheduleManager] 事件绑定完成');
    }
    
    // 渲染课程表
    render() {
        this.renderWeekInfo();
        this.renderTimeColumn();
        this.renderCourses();
        this.renderExams();
    }
    
    // 渲染时间列
    renderTimeColumn() {
        const container = document.getElementById('time-slots-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 根据maxPeriodsPerDay生成时间段
        for (let i = 1; i <= this.maxPeriodsPerDay; i++) {
            const period = this.periods.find(p => p.id === i);
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot-item';
            
            if (period) {
                timeSlot.innerHTML = `
                    <span class="period-num">${i}</span>
                    <span class="period-time">${period.startTime}-${period.endTime}</span>
                `;
            } else {
                timeSlot.innerHTML = `
                    <span class="period-num">${i}</span>
                    <span class="period-time">--:--</span>
                `;
            }
            
            container.appendChild(timeSlot);
        }
        
        // 设置时间列和天列的高度
        const totalHeight = this.maxPeriodsPerDay * this.periodHeight;
        document.querySelectorAll('.time-slots-container, .day-content').forEach(el => {
            el.style.height = `${totalHeight}px`;
        });
    }
    
    // 渲染周次信息
    renderWeekInfo() {
        const weekDisplay = document.getElementById('current-week-display');
        if (weekDisplay) {
            weekDisplay.textContent = `第${this.currentWeek}周`;
        }
        
        // 填充周次选择下拉菜单
        const weekSelect = document.getElementById('week-select');
        if (weekSelect) {
            // 保存当前选中的值
            const currentValue = weekSelect.value;
            
            // 清空并重新生成选项
            weekSelect.innerHTML = '<option value="">选择周次</option>';
            
            for (let i = 1; i <= this.maxWeek; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `第${i}周`;
                if (i === this.currentWeek) {
                    option.selected = true;
                }
                weekSelect.appendChild(option);
            }
        }
    }
    
    // 渲染课程
    renderCourses() {
        // 清空所有day-content中的课程块
        document.querySelectorAll('.day-content').forEach(content => {
            const courses = content.querySelectorAll('.course-block');
            courses.forEach(c => c.remove());
        });
        
        // 过滤当前周的课程
        const currentWeekCourses = this.courses.filter(course => {
            return this.currentWeek >= course.startWeek && 
                   this.currentWeek <= course.endWeek &&
                   (course.weekType === '' || 
                    (course.weekType === '单周' && this.currentWeek % 2 === 1) ||
                    (course.weekType === '双周' && this.currentWeek % 2 === 0));
        });
        
        console.log('[Render] 准备渲染课程:', currentWeekCourses.length);
        console.log('[Render] 课程数据:', currentWeekCourses.map(c => `${c.name}(第${c.startPeriod}节,持续${c.duration}节)`));
        
        // 渲染每门课程
        currentWeekCourses.forEach(course => {
            // 找到对应的星期列
            const dayColumn = document.querySelector(`.day-column[data-day="${course.day}"]`);
            if (!dayColumn) {
                console.warn(`[Render] 找不到星期${course.day}的列，课程: ${course.name}`);
                return;
            }
            
            // 找到day-content容器
            const dayContent = dayColumn.querySelector('.day-content');
            if (!dayContent) {
                console.warn(`[Render] 找不到day-content，课程: ${course.name}`);
                return;
            }
            
            // 创建课程块
            const courseEl = document.createElement('div');
            courseEl.className = 'course-block';
            
            // 计算位置和高度
            const startPeriod = parseInt(course.startPeriod) || 1;
            const duration = parseInt(course.duration) || 2;
            const endPeriod = startPeriod + duration - 1;
            
            // 根据开始节次计算top位置
            const top = (startPeriod - 1) * this.periodHeight;
            // 根据持续节数计算高度
            const height = duration * this.periodHeight - 5; // 减去间距
            
            courseEl.style.top = `${top}px`;
            courseEl.style.height = `${height}px`;
            
            // 获取时间显示
            const startTime = this.getPeriodTime(startPeriod);
            const endTime = this.getPeriodTime(endPeriod, true);
            const timeText = startTime && endTime ? `${startTime}-${endTime}` : `${startPeriod}-${endPeriod}节`;
            
            courseEl.innerHTML = `
                <div class="course-name">${course.name}</div>
                <div class="course-time">${timeText}</div>
                ${course.location ? `<div class="course-location">${course.location}</div>` : ''}
                ${course.startWeek !== 1 || course.endWeek !== 20 ? 
                    `<div class="course-weeks">${course.startWeek}-${course.endWeek}周</div>` : ''}
            `;
            
            courseEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editCourse(course);
            });
            
            dayContent.appendChild(courseEl);
            console.log(`[Render] 已渲染: ${course.name} 星期${course.day} 第${startPeriod}节 高${height}px`);
        });
        
        console.log('[ScheduleManager] 课程渲染完成:', currentWeekCourses.length);
    }
    
    // 获取节次对应的时间
    getPeriodTime(period, isEnd = false) {
        const periodConfig = this.periods.find(p => p.id === period);
        if (!periodConfig) return null;
        return isEnd ? periodConfig.endTime : periodConfig.startTime;
    }
    
    // 渲染考试
    renderExams() {
        const examList = document.getElementById('exam-list');
        if (!examList) return;
        
        examList.innerHTML = '';
        
        this.exams.forEach((exam, index) => {
            const examEl = document.createElement('div');
            examEl.className = 'exam-item';
            examEl.innerHTML = `
                <div class="exam-info">
                    <div class="exam-name">${exam.name}</div>
                    <div class="exam-detail">
                        <span><i class="fas fa-calendar"></i> ${exam.date}</span>
                        <span><i class="fas fa-clock"></i> ${exam.time}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${exam.location}</span>
                    </div>
                </div>
                <div class="exam-actions">
                    <button class="btn-edit" data-index="${index}"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" data-index="${index}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            examList.appendChild(examEl);
        });
    }
    
    // 打开导入弹窗
    openImportModal() {
        const modal = document.getElementById('import-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    // 打开添加课程弹窗
    openAddCourseModal(prefill = {}) {
        const modal = document.getElementById('add-course-modal');
        if (!modal) return;
        
        // 重置表单
        const form = document.getElementById('add-course-form');
        if (form) form.reset();
        
        // 预填充数据
        if (prefill.day) {
            const daySelect = document.getElementById('course-day');
            if (daySelect) daySelect.value = prefill.day;
        }
        if (prefill.time) {
            const timeSelect = document.getElementById('course-time');
            if (timeSelect) timeSelect.value = prefill.time;
        }
        
        // 清除编辑状态
        modal.dataset.editIndex = '';
        
        modal.style.display = 'block';
    }
    
    // 打开添加考试弹窗
    openAddExamModal() {
        const modal = document.getElementById('add-exam-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    // 打开设置弹窗
    openSettingsModal() {
        alert('课程设置功能开发中...');
    }
    
    // 关闭所有弹窗
    closeAllModals() {
        document.querySelectorAll('.schedule-modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
    
    // 处理文件上传
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('[ScheduleManager] 上传文件:', file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(event.target.result, 'text/html');
                const courses = this.parseHTMLSchedule(doc);
                
                if (courses.length > 0) {
                    this.courses = [...this.courses, ...courses];
                    this.saveData();
                    this.render();
                    this.closeAllModals();
                    alert(`成功导入 ${courses.length} 门课程！`);
                } else {
                    alert('未识别到课程数据，请检查文件是否正确');
                }
            } catch (err) {
                console.error('[ScheduleManager] 解析失败:', err);
                alert('文件解析失败: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
    
    // 解析HTML课表 - 使用高精度解析器
    parseHTMLSchedule(doc) {
        const parser = new ZhengfangScheduleParser();
        try {
            const courses = parser.parse(doc);
            console.log(`[ScheduleManager] 成功解析 ${courses.length} 门课程`);
            return courses;
        } catch (err) {
            console.error('[ScheduleManager] 解析失败:', err);
            return [];
        }
    }
    
    // 解析手动输入
    parseManualInput() {
        const textarea = document.getElementById('import-textarea');
        if (!textarea) return;
        
        const text = textarea.value.trim();
        if (!text) {
            alert('请输入课程信息');
            return;
        }
        
        const lines = text.split('\n');
        const newCourses = [];
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // 解析格式：课程名 周几 第几节 地点 周数
            const parts = line.split(/\s+/);
            if (parts.length < 3) {
                return;
            }
            
            const name = parts[0];
            const dayMap = { '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7 };
            const day = dayMap[parts[1]] || parseInt(parts[1]);
            
            const timeMatch = parts[2].match(/第?(\d+)(?:-\d+)?节/);
            const time = timeMatch ? Math.ceil(parseInt(timeMatch[1]) / 2) : parseInt(parts[2]);
            
            const location = parts[3] || '';
            
            let startWeek = 1, endWeek = 20, weekType = '';
            if (parts[4]) {
                const weekMatch = parts[4].match(/(\d+)-(\d+)周/);
                if (weekMatch) {
                    startWeek = parseInt(weekMatch[1]);
                    endWeek = parseInt(weekMatch[2]);
                }
                if (parts[4].includes('单')) weekType = '单周';
                else if (parts[4].includes('双')) weekType = '双周';
            }
            
            if (name && day && time) {
                newCourses.push({ name, day, time, location, startWeek, endWeek, weekType });
            }
        });
        
        if (newCourses.length > 0) {
            this.courses = [...this.courses, ...newCourses];
            this.saveData();
            this.render();
            this.closeAllModals();
            alert(`成功添加 ${newCourses.length} 门课程！`);
        } else {
            alert('未能解析任何课程，请检查格式');
        }
    }
    
    // 保存课程
    saveCourse() {
        const name = document.getElementById('course-name')?.value.trim();
        const day = parseInt(document.getElementById('course-day')?.value);
        const time = parseInt(document.getElementById('course-time')?.value);
        const location = document.getElementById('course-location')?.value.trim();
        const startWeek = parseInt(document.getElementById('course-start-week')?.value) || 1;
        const endWeek = parseInt(document.getElementById('course-end-week')?.value) || 20;
        const weekType = document.getElementById('course-week-type')?.value || '';
        
        if (!name || !day || !time) {
            alert('请填写完整的课程信息');
            return;
        }
        
        const modal = document.getElementById('add-course-modal');
        const editIndex = modal?.dataset.editIndex;
        
        const course = { name, day, time, location, startWeek, endWeek, weekType };
        
        if (editIndex !== undefined && editIndex !== '') {
            // 编辑模式
            this.courses[parseInt(editIndex)] = course;
        } else {
            // 添加模式
            this.courses.push(course);
        }
        
        this.saveData();
        this.render();
        this.closeAllModals();
    }
    
    // 编辑课程
    editCourse(course) {
        const index = this.courses.indexOf(course);
        if (index === -1) return;
        
        const modal = document.getElementById('add-course-modal');
        if (!modal) return;
        
        // 填充表单
        document.getElementById('course-name').value = course.name;
        document.getElementById('course-day').value = course.day;
        document.getElementById('course-time').value = course.time;
        document.getElementById('course-location').value = course.location || '';
        document.getElementById('course-start-week').value = course.startWeek;
        document.getElementById('course-end-week').value = course.endWeek;
        document.getElementById('course-week-type').value = course.weekType;
        
        // 设置编辑状态
        modal.dataset.editIndex = index;
        
        modal.style.display = 'block';
    }
    
    // 保存考试
    saveExam() {
        const name = document.getElementById('exam-name')?.value.trim();
        const date = document.getElementById('exam-date')?.value;
        const time = document.getElementById('exam-time')?.value;
        const location = document.getElementById('exam-location')?.value.trim();
        
        if (!name || !date || !time) {
            alert('请填写完整的考试信息');
            return;
        }
        
        this.exams.push({ name, date, time, location });
        this.saveData();
        this.render();
        this.closeAllModals();
    }
    
    // 切换周次
    changeWeek(delta) {
        this.currentWeek += delta;
        if (this.currentWeek < 1) this.currentWeek = 1;
        if (this.currentWeek > this.maxWeek) this.currentWeek = this.maxWeek;
        this.saveData();
        this.render();
    }
    
    // 设置当前周
    setCurrentWeek(week) {
        this.currentWeek = week;
        this.saveData();
        this.render();
    }
    
    // 切换考试视图
    toggleExamView() {
        const examContainer = document.getElementById('exam-list-container');
        const scheduleContainer = document.querySelector('.schedule-container');
        
        if (examContainer && scheduleContainer) {
            const isHidden = examContainer.style.display === 'none';
            examContainer.style.display = isHidden ? 'block' : 'none';
            scheduleContainer.style.display = isHidden ? 'none' : 'block';
        }
    }
    
    // 清空所有数据
    clearAll() {
        if (confirm('确定要清空所有课程和考试吗？此操作不可恢复。')) {
            this.courses = [];
            this.exams = [];
            this.saveData();
            this.render();
        }
    }
}



/**
 * ============================================
 * 高精度正方教务系统课表解析器
 * ============================================
 */
class ZhengfangScheduleParser {
    constructor() {
        this.periodToSlot = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5 };
        this.colToDay = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    }
    
    parse(doc) {
        const table = doc.querySelector('#kbgrid_table_0');
        if (!table) throw new Error('未找到课表表格');
        
        // 只使用基于ID的解析，更准确
        const courses = this.parseByCellId(table);
        
        console.log(`[Parser] 解析完成，共${courses.length}门课程`);
        return courses;
    }
    
    parseByCellId(table) {
        const courses = [];
        const cells = table.querySelectorAll('td[id^="1-"], td[id^="2-"], td[id^="3-"], td[id^="4-"], td[id^="5-"], td[id^="6-"], td[id^="7-"]');
        
        cells.forEach(cell => {
            const match = cell.id.match(/^(\d+)-(\d+)$/);
            if (!match) return;
            
            const day = parseInt(match[1]);
            const period = parseInt(match[2]);
            const timeSlot = this.periodToSlot[period];
            
            if (timeSlot) {
                courses.push(...this.parseCellContent(cell, day, timeSlot));
            }
        });
        
        return courses;
    }
    
    parseByRows(table) {
        const courses = [];
        const rows = table.querySelectorAll('tr');
        const rowspanTracker = {};
        
        for (let rowIdx = 2; rowIdx < rows.length; rowIdx++) {
            const cells = Array.from(rows[rowIdx].querySelectorAll('td, th'));
            if (cells.length < 3) continue;
            
            const periodMatch = cells[1]?.textContent.trim().match(/^(\d+)$/);
            if (!periodMatch) continue;
            
            const timeSlot = this.periodToSlot[parseInt(periodMatch[1])];
            if (!timeSlot) continue;
            
            const processedCells = this.processRowspan(cells, rowspanTracker);
            
            for (let colIdx = 2; colIdx <= 8 && colIdx < processedCells.length; colIdx++) {
                const day = this.colToDay[colIdx];
                if (!day) continue;
                
                const cellData = processedCells[colIdx];
                if (!cellData || cellData.isRowspan) continue;
                
                const cell = cellData.element;
                const cellCourses = this.parseCellContent(cell, day, timeSlot);
                
                cellCourses.forEach(course => {
                    if (course) {
                        courses.push(course);
                        const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
                        if (rowspan > 1) {
                            rowspanTracker[colIdx] = { remaining: rowspan - 1 };
                        }
                    }
                });
            }
        }
        
        return courses;
    }
    
    processRowspan(cells, rowspanTracker) {
        const processed = [];
        let cellIdx = 0;
        
        for (let colIdx = 0; colIdx < 9; colIdx++) {
            if (rowspanTracker[colIdx]?.remaining > 0) {
                processed.push({ isRowspan: true });
                rowspanTracker[colIdx].remaining--;
            } else if (cellIdx < cells.length) {
                processed.push({ isRowspan: false, element: cells[cellIdx] });
                cellIdx++;
            } else {
                processed.push(null);
            }
        }
        
        return processed;
    }
    
    parseCellContent(cell, day, timeSlot) {
        const courses = [];
        const courseDivs = cell.querySelectorAll('div.timetable_con');
        
        if (courseDivs.length > 0) {
            courseDivs.forEach(div => {
                const course = this.parseCourseDiv(div, day, timeSlot);
                if (course) courses.push(course);
            });
        } else {
            const text = cell.textContent.trim();
            if (text?.length > 5) {
                courses.push(...this.parseCourseText(text, day, timeSlot));
            }
        }
        
        return courses;
    }
    
    parseCourseDiv(div, day, timeSlot) {
        const titleSpan = div.querySelector('span.title');
        let name = titleSpan ? titleSpan.textContent.trim() : div.textContent.trim().split(/\s+/)[0];
        
        name = name.replace(/[★☆〇■◆]/g, '').trim();
        
        if (!name || name.length < 2 || !/[\u4e00-\u9fa5]/.test(name)) return null;
        if (['骊山校园', '雁塔校园', '秦汉校园', '上午', '下午', '晚上'].includes(name)) return null;
        
        const text = div.textContent;
        let startWeek = 1, endWeek = 20, weekType = '';
        
        const weekMatch = text.match(/\(\d+-\d+节\)(\d+)-(\d+)周(?:\((单|双)\))?/) ||
                         text.match(/(\d+)-(\d+)周(?:\((单|双)\))?/);
        
        if (weekMatch) {
            startWeek = parseInt(weekMatch[1]);
            endWeek = parseInt(weekMatch[2]);
            if (weekMatch[3]) weekType = weekMatch[3] === '单' ? '单周' : '双周';
        }
        
        let location = '';
        const fullLocMatch = text.match(/(骊山|雁塔|秦汉)校园\s+(\d+-\d+-\d+|\d+-机房|体育馆|未排地点)/);
        if (fullLocMatch) {
            location = `${fullLocMatch[1]}校园 ${fullLocMatch[2]}`;
        } else {
            const locMatch = text.match(/(\d+-\d+-\d+|\d+-机房|体育馆|未排地点)/);
            if (locMatch) {
                const campusMatch = text.match(/(骊山|雁塔|秦汉)校园/);
                location = campusMatch ? `${campusMatch[0]} ${locMatch[1]}` : locMatch[1];
            }
        }
        
        return { name, day, time: timeSlot, location, startWeek, endWeek, weekType };
    }
    
    parseCourseText(text, day, timeSlot) {
        const courses = [];
        const markers = ['★', '☆', '〇', '■', '◆'];
        const parts = text.split(new RegExp(`(${markers.map(m => '\\' + m).join('|')})`, 'g'));
        
        const blocks = [];
        let current = '';
        
        parts.forEach(part => {
            if (markers.includes(part)) {
                if (current.trim()) blocks.push(current.trim());
                current = part;
            } else {
                current += part;
            }
        });
        if (current.trim()) blocks.push(current.trim());
        
        blocks.forEach(block => {
            const course = this.parseCourseBlock(block, day, timeSlot);
            if (course) courses.push(course);
        });
        
        return courses;
    }
    
    parseCourseBlock(block, day, timeSlot) {
        let clean = block.replace(/[★☆〇■◆]/g, '').trim();
        if (!clean) return null;
        
        const parts = clean.split(/\s+/);
        if (!parts.length) return null;
        
        const name = parts[0];
        if (!/[\u4e00-\u9fa5]/.test(name)) return null;
        if (['骊山校园', '雁塔校园', '秦汉校园', '上午', '下午', '晚上'].includes(name)) return null;
        
        // 提取课程节次信息（关键：提取startPeriod和duration）
        let startPeriod = 1;
        let duration = 2;
        const periodMatch = clean.match(/(\d+)-(\d+)节/);
        if (periodMatch) {
            startPeriod = parseInt(periodMatch[1]);
            const endPeriod = parseInt(periodMatch[2]);
            duration = endPeriod - startPeriod + 1;
            console.log(`[Parser] ${name}: 第${startPeriod}-${endPeriod}节, 持续${duration}节`);
        }
        
        let startWeek = 1, endWeek = 20, weekType = '';
        const weekMatch = clean.match(/(\d+)-(\d+)周(?:\((单|双)\))?/);
        if (weekMatch) {
            startWeek = parseInt(weekMatch[1]);
            endWeek = parseInt(weekMatch[2]);
            if (weekMatch[3]) weekType = weekMatch[3] === '单' ? '双周' : '单周';
        }
        
        let location = '';
        const fullLocMatch = clean.match(/(骊山|雁塔|秦汉)校园\s+(\d+-\d+-\d+|\d+-机房|体育馆|未排地点)/);
        if (fullLocMatch) {
            location = `${fullLocMatch[1]}校园 ${fullLocMatch[2]}`;
        } else {
            const locMatch = clean.match(/(\d+-\d+-\d+|\d+-机房|体育馆|未排地点)/);
            if (locMatch) {
                const campusMatch = clean.match(/(骊山|雁塔|秦汉)校园/);
                location = campusMatch ? `${campusMatch[0]} ${locMatch[1]}` : locMatch[1];
            }
        }
        
        // 关键：返回startPeriod和duration，不再使用timeSlot
        return { name, day, startPeriod, duration, location, startWeek, endWeek, weekType };
    }
}

// 初始化课程表管理器
document.addEventListener('DOMContentLoaded', () => {
    window.scheduleManager = new ScheduleManager();
});
