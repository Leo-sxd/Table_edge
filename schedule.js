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
        
        // 一天课程节数配置（1-60节，默认5节，可从localStorage加载）
        this.periodsPerDay = this.loadPeriodsPerDayConfig() || 5;
        
        // 时间段配置（根据periodsPerDay动态生成）
        this.timeSlots = this.generateTimeSlots(this.periodsPerDay);
        
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
        this.migrateData();  // 数据迁移
        this.bindEvents();
        this.render();
        this.initExamReminders();  // 初始化考试提醒
        console.log('[ScheduleManager] 初始化完成');
    }
    
    // 数据迁移：修正旧数据的time属性
    migrateData() {
        let needsSave = false;
        
        this.courses.forEach(course => {
            // 检查是否需要迁移
            // 如果course有period但time不等于period，需要修正
            if (course.period && course.time !== course.period) {
                console.log(`[Migrate] 修正课程 "${course.name}" 的time: ${course.time} → ${course.period}`);
                course.time = course.period;
                needsSave = true;
            }
            // 如果course有startPeriod但没有period，使用startPeriod作为time
            else if (course.startPeriod && !course.period && course.time !== course.startPeriod) {
                console.log(`[Migrate] 修正课程 "${course.name}" 的time: ${course.time} → ${course.startPeriod}`);
                course.time = course.startPeriod;
                needsSave = true;
            }
        });
        
        if (needsSave) {
            this.saveData();
            console.log('[Migrate] 数据迁移完成，已保存');
        } else {
            console.log('[Migrate] 无需数据迁移');
        }
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
    
    // 加载一天课程节数配置
    loadPeriodsPerDayConfig() {
        const config = localStorage.getItem('schedule_periods_per_day');
        const value = config ? parseInt(config) : null;
        // 验证范围1-60
        if (value && value >= 1 && value <= 60) {
            return value;
        }
        return null;
    }
    
    // 保存一天课程节数配置
    savePeriodsPerDayConfig(count) {
        if (count >= 1 && count <= 60) {
            localStorage.setItem('schedule_periods_per_day', count.toString());
            this.periodsPerDay = count;
        }
    }
    
    // 根据节数生成时间段配置
    // 重要：每个slot对应一个节次（不再是每2节课一个slot）
    generateTimeSlots(count) {
        const slots = [];
        // 尝试加载自定义时间配置
        const customTimes = this.loadCustomTimeConfig();
        
        // 默认时间模板（每节课45分钟，课间休息根据时段调整）
        const defaultTimes = [
            { start: '08:00', end: '08:45' },   // 第1节
            { start: '08:50', end: '09:35' },   // 第2节
            { start: '09:55', end: '10:40' },   // 第3节
            { start: '10:45', end: '11:30' },   // 第4节
            { start: '11:35', end: '12:20' },   // 第5节
            { start: '14:00', end: '14:45' },   // 第6节
            { start: '14:50', end: '15:35' },   // 第7节
            { start: '15:55', end: '16:40' },   // 第8节
            { start: '16:45', end: '17:30' },   // 第9节
            { start: '17:35', end: '18:20' },   // 第10节
            { start: '19:00', end: '19:45' },   // 第11节
            { start: '19:50', end: '20:35' },   // 第12节
            { start: '20:40', end: '21:25' },   // 第13节
            { start: '21:30', end: '22:15' },   // 第14节
        ];
        
        for (let i = 1; i <= count; i++) {
            // 优先使用自定义时间，否则使用默认时间
            const time = (customTimes && customTimes[i - 1]) || defaultTimes[i - 1] || { 
                start: `${8 + Math.floor((i-1)/2)}:${(i%2===1)?'00':'30'}`, 
                end: `${8 + Math.floor((i-1)/2)}:${(i%2===1)?'45':'15'}` 
            };
            slots.push({
                id: i,
                name: `第${i}节`,
                time: `${time.start}-${time.end}`
            });
        }
        return slots;
    }
    
    // 加载自定义时间配置
    loadCustomTimeConfig() {
        try {
            const config = localStorage.getItem('schedule_custom_times');
            if (config) {
                return JSON.parse(config);
            }
        } catch (e) {
            console.error('[ScheduleManager] 加载自定义时间失败:', e);
        }
        return null;
    }
    
    // 保存自定义时间配置
    saveCustomTimeConfig(times) {
        try {
            localStorage.setItem('schedule_custom_times', JSON.stringify(times));
            console.log('[ScheduleManager] 自定义时间已保存');
        } catch (e) {
            console.error('[ScheduleManager] 保存自定义时间失败:', e);
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
            // 考试标签页按钮
            else if (target.classList.contains('schedule-tab') && target.dataset.tab === 'exam') {
                this.toggleExamView();
                // 更新标签页激活状态
                document.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
                target.classList.add('active');
            }
            // 本周标签页按钮
            else if (target.classList.contains('schedule-tab') && target.dataset.tab === 'current') {
                const examContainer = document.getElementById('exam-list-container');
                const scheduleContainer = document.querySelector('.schedule-container');
                if (examContainer && scheduleContainer) {
                    examContainer.style.display = 'none';
                    scheduleContainer.style.display = 'block';
                }
                // 更新标签页激活状态
                document.querySelectorAll('.schedule-tab').forEach(t => t.classList.remove('active'));
                target.classList.add('active');
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
        this.renderGrid();
        this.renderCourses();
        this.renderExams();
    }
    
    // 动态生成课程表格子
    renderGrid() {
        const grid = document.getElementById('schedule-grid');
        if (!grid) return;
        
        // 清空现有内容
        grid.innerHTML = '';
        
        // 生成表头
        grid.innerHTML += '<div class="schedule-header time-col">时间</div>';
        this.days.forEach(day => {
            grid.innerHTML += `<div class="schedule-header">${day.name}</div>`;
        });
        
        // 生成时间段和课程格子
        this.timeSlots.forEach(slot => {
            // 时间标签
            grid.innerHTML += `<div class="time-slot">${slot.time}<br><small>${slot.name}</small></div>`;
            
            // 7天的课程格子
            for (let day = 1; day <= 7; day++) {
                grid.innerHTML += `<div class="course-cell" data-day="${day}" data-time="${slot.id}"></div>`;
            }
        });
    }
    
    // 渲染周次信息
    renderWeekInfo() {
        const weekDisplay = document.getElementById('current-week-display');
        if (weekDisplay) {
            weekDisplay.textContent = `第${this.currentWeek}周`;
        }
    }
    
    // 渲染课程
    renderCourses() {
        // 清空所有课程格子
        document.querySelectorAll('.course-cell').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('has-course');
        });
        
        // 过滤当前周的课程
        const currentWeekCourses = this.courses.filter(course => {
            return this.currentWeek >= course.startWeek && 
                   this.currentWeek <= course.endWeek &&
                   (course.weekType === '' || 
                    (course.weekType === '单周' && this.currentWeek % 2 === 1) ||
                    (course.weekType === '双周' && this.currentWeek % 2 === 0));
        });
        
        console.log('[Renderer] 当前周课程:', currentWeekCourses.length, '个节次');
        console.log('[Renderer] 课程数据示例:', currentWeekCourses.slice(0, 3).map(c => 
            `${c.name}: day=${c.day}, time=${c.time}, period=${c.period}, startPeriod=${c.startPeriod}, endPeriod=${c.endPeriod}`
        ));
        
        // 按格子(星期-时间段)分组
        const cellMap = new Map();
        
        currentWeekCourses.forEach(course => {
            // 重要：确保time属性正确对应节次
            // 如果course有period属性，使用period作为time（每个节次一个slot）
            // 如果course有startPeriod和endPeriod但没有period，需要计算正确的time
            let correctTime = course.time;
            
            if (course.period) {
                // 有具体节次，使用节次作为time
                correctTime = course.period;
            } else if (course.startPeriod) {
                // 只有起始节，使用起始节作为time
                correctTime = course.startPeriod;
            }
            
            const cellKey = `${course.day}-${correctTime}`;
            
            if (!cellMap.has(cellKey)) {
                cellMap.set(cellKey, []);
            }
            
            // 检查这个格子是否已经有这个课程
            const existingCourses = cellMap.get(cellKey);
            const existingIndex = existingCourses.findIndex(c => c.name === course.name);
            
            if (existingIndex >= 0) {
                // 已存在，添加节次信息
                if (course.period && !existingCourses[existingIndex].periods.includes(course.period)) {
                    existingCourses[existingIndex].periods.push(course.period);
                }
            } else {
                // 新课程，添加到格子
                existingCourses.push({
                    ...course,
                    time: correctTime,  // 使用修正后的time
                    periods: course.period ? [course.period] : (course.startPeriod ? [course.startPeriod] : [])
                });
            }
        });
        
        console.log('[Renderer] 需要渲染的格子数:', cellMap.size);
        
        // 渲染每个格子
        cellMap.forEach((courses, cellKey) => {
            const [day, timeSlot] = cellKey.split('-').map(Number);
            
            const cell = document.querySelector(
                `.course-cell[data-day="${day}"][data-time="${timeSlot}"]`
            );
            
            if (!cell) {
                console.log(`[Renderer] ✗ 未找到单元格: 星期${day} 时间段${timeSlot}`);
                return;
            }
            
            // 渲染这个格子中的所有课程
            courses.forEach(course => {
                const courseEl = document.createElement('div');
                courseEl.className = 'course-item';
                
                // 排序并去重节次
                const sortedPeriods = [...new Set(course.periods)].sort((a, b) => a - b);
                
                // 显示节次信息 - 确保与左侧节次标签对应
                let periodText = '';
                if (sortedPeriods.length > 0) {
                    const minPeriod = sortedPeriods[0];
                    const maxPeriod = sortedPeriods[sortedPeriods.length - 1];
                    if (minPeriod === maxPeriod) {
                        periodText = `<div class="course-periods">第${minPeriod}节</div>`;
                    } else {
                        periodText = `<div class="course-periods">第${minPeriod}-${maxPeriod}节</div>`;
                    }
                } else if (course.startPeriod && course.endPeriod) {
                    // 使用startPeriod和endPeriod显示
                    if (course.startPeriod === course.endPeriod) {
                        periodText = `<div class="course-periods">第${course.startPeriod}节</div>`;
                    } else {
                        periodText = `<div class="course-periods">第${course.startPeriod}-${course.endPeriod}节</div>`;
                    }
                }
                
                courseEl.innerHTML = `
                    <div class="course-name">${course.name}</div>
                    ${course.location ? `<div class="course-location">${course.location}</div>` : ''}
                    ${periodText}
                    ${course.startWeek !== 1 || course.endWeek !== 20 ? 
                        `<div class="course-weeks">${course.startWeek}-${course.endWeek}周</div>` : ''}
                `;
                courseEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editCourse(course);
                });
                
                cell.appendChild(courseEl);
                cell.classList.add('has-course');
                
                console.log(`[Renderer] ✓ 渲染 "${course.name}" 在 星期${day} 第${timeSlot}节, 节次范围: ${sortedPeriods.join(',') || course.startPeriod + '-' + course.endPeriod}`);
            });
        });
        
        console.log('[ScheduleManager] 课程渲染完成');
    }
    
    // 渲染考试
    renderExams() {
        const examList = document.getElementById('exam-list');
        if (!examList) return;
        
        examList.innerHTML = '';
        
        // 按考试日期时间排序（最近的在前）
        const sortedExams = this.exams.map((exam, index) => ({...exam, originalIndex: index}))
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            });
        
        const now = new Date();
        const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        
        sortedExams.forEach((exam) => {
            const examDateTime = new Date(`${exam.date}T${exam.time}`);
            const isUrgent = examDateTime <= twoWeeksLater && examDateTime > now;
            const isPast = examDateTime < now;
            
            const examEl = document.createElement('div');
            examEl.className = `exam-item ${isUrgent ? 'urgent' : ''} ${isPast ? 'past' : ''}`;
            examEl.dataset.index = exam.originalIndex;
            
            // 计算剩余天数
            const daysLeft = Math.ceil((examDateTime - now) / (1000 * 60 * 60 * 24));
            let daysText = '';
            if (daysLeft > 0) {
                daysText = `还有${daysLeft}天`;
            } else if (daysLeft === 0) {
                daysText = '今天';
            } else {
                daysText = `已过期${Math.abs(daysLeft)}天`;
            }
            
            examEl.innerHTML = `
                <div class="exam-info">
                    <div class="exam-name" style="color: ${isUrgent ? '#ff4444' : '#ffffff'};">${exam.name}</div>
                    <div class="exam-detail" style="color: #ffffff;">
                        <span><i class="fas fa-calendar"></i> ${exam.date}</span>
                        <span><i class="fas fa-clock"></i> ${exam.time}</span>
                        ${exam.location ? `<span><i class="fas fa-map-marker-alt"></i> ${exam.location}</span>` : ''}
                        <span class="days-left" style="color: ${isUrgent ? '#ff4444' : '#ffffff'}; font-weight: bold;">${daysText}</span>
                    </div>
                    ${exam.note ? `<div class="exam-note" style="color: rgba(255,255,255,0.8); margin-top: 5px;"><i class="fas fa-sticky-note"></i> ${exam.note}</div>` : ''}
                </div>
                <div class="exam-actions">
                    <button class="btn-edit" data-index="${exam.originalIndex}" title="编辑"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" data-index="${exam.originalIndex}" title="删除"><i class="fas fa-trash"></i></button>
                </div>
            `;
            examList.appendChild(examEl);
        });
        
        // 绑定编辑和删除按钮事件
        examList.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.editExam(index);
            });
        });
        
        examList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.deleteExam(index);
            });
        });
    }
    
    // 编辑考试
    editExam(index) {
        const exam = this.exams[index];
        if (!exam) return;
        
        // 填充表单
        document.getElementById('exam-name').value = exam.name;
        document.getElementById('exam-date').value = exam.date;
        document.getElementById('exam-time').value = exam.time;
        document.getElementById('exam-location').value = exam.location || '';
        document.getElementById('exam-note').value = exam.note || '';
        
        // 设置提醒选项（如果有）
        const reminderTimeSelect = document.getElementById('exam-reminder-time');
        const reminderTypeSelect = document.getElementById('exam-reminder-type');
        if (reminderTimeSelect && exam.reminderTime !== undefined) {
            reminderTimeSelect.value = exam.reminderTime.toString();
        }
        if (reminderTypeSelect && exam.reminderType) {
            reminderTypeSelect.value = exam.reminderType;
        }
        
        // 打开弹窗
        const modal = document.getElementById('add-exam-modal');
        if (modal) {
            modal.style.display = 'block';
            // 修改保存按钮为更新模式
            const saveBtn = document.getElementById('save-exam-btn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> 更新';
                saveBtn.onclick = () => this.updateExam(index);
            }
        }
    }
    
    // 更新考试
    updateExam(index) {
        const name = document.getElementById('exam-name')?.value.trim();
        const date = document.getElementById('exam-date')?.value;
        const time = document.getElementById('exam-time')?.value;
        const location = document.getElementById('exam-location')?.value.trim();
        const note = document.getElementById('exam-note')?.value.trim();
        const reminderTime = document.getElementById('exam-reminder-time')?.value || '15';
        const reminderType = document.getElementById('exam-reminder-type')?.value || 'popup';
        
        if (!name || !date || !time) {
            alert('请填写完整的考试信息');
            return;
        }
        
        // 计算提醒时间
        const examDateTime = new Date(`${date}T${time}`);
        const reminderMinutes = parseInt(reminderTime);
        const reminderDateTime = new Date(examDateTime.getTime() - reminderMinutes * 60 * 1000);
        
        // 更新考试数据
        this.exams[index] = { 
            name, 
            date, 
            time, 
            location,
            note,
            reminderTime: reminderMinutes,
            reminderType,
            reminderDateTime: reminderDateTime.toISOString(),
            notified: false
        };
        
        this.saveData();
        this.render();
        this.closeAllModals();
        
        // 重新设置提醒
        this.scheduleExamReminder(this.exams[index]);
        
        // 恢复保存按钮
        const saveBtn = document.getElementById('save-exam-btn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> 保存';
            saveBtn.onclick = () => this.saveExam();
        }
        
        alert(`考试"${name}"已更新！`);
    }
    
    // 删除考试
    deleteExam(index) {
        if (confirm('确定要删除这个考试吗？')) {
            const examName = this.exams[index]?.name || '该考试';
            this.exams.splice(index, 1);
            this.saveData();
            this.render();
            alert(`考试"${examName}"已删除！`);
        }
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
        const choice = prompt(
            `课程设置菜单：\n` +
            `1. 设置一天课程节数（当前：${this.periodsPerDay}节）\n` +
            `2. 设置每节课时间\n` +
            `3. 恢复默认时间设置\n\n` +
            `请输入选项（1/2/3）：`
        );
        
        if (choice === null) return; // 用户取消
        
        switch(choice.trim()) {
            case '1':
                this.setPeriodsPerDay();
                break;
            case '2':
                this.openTimeSettings();
                break;
            case '3':
                this.resetTimeSettings();
                break;
            default:
                alert('无效的选项，请输入1、2或3');
        }
    }
    
    // 设置一天课程节数
    setPeriodsPerDay() {
        const count = prompt(`当前一天课程节数：${this.periodsPerDay}节\n请输入新的一天课程节数（1-60）：`, this.periodsPerDay);
        
        if (count === null) return; // 用户取消
        
        const newCount = parseInt(count);
        if (isNaN(newCount) || newCount < 1 || newCount > 60) {
            alert('请输入1-60之间的有效数字！');
            return;
        }
        
        if (newCount === this.periodsPerDay) {
            alert('课程节数未发生变化');
            return;
        }
        
        // 保存新配置
        this.savePeriodsPerDayConfig(newCount);
        this.timeSlots = this.generateTimeSlots(newCount);
        
        // 重新渲染课程表
        this.render();
        
        alert(`设置成功！一天课程节数已改为${newCount}节`);
    }
    
    // 打开时间设置界面
    openTimeSettings() {
        let html = `<div style="text-align:left;max-height:400px;overflow-y:auto;">`;
        html += `<h3 style="margin-bottom:15px;">设置每节课时间（24小时制）</h3>`;
        
        this.timeSlots.forEach((slot, index) => {
            const [start, end] = slot.time.split('-');
            html += `<div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">`;
            html += `<span style="width:60px;">${slot.name}</span>`;
            html += `<input type="time" id="time-start-${index}" value="${start}" style="padding:5px;">`;
            html += `<span>至</span>`;
            html += `<input type="time" id="time-end-${index}" value="${end}" style="padding:5px;">`;
            html += `</div>`;
        });
        
        html += `</div>`;
        
        // 创建自定义弹窗
        const modal = document.createElement('div');
        modal.id = 'time-settings-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                padding: 30px;
                border-radius: 15px;
                max-width: 500px;
                width: 90%;
                border: 1px solid rgba(140, 0, 255, 0.3);
                color: #fff;
            ">
                ${html}
                <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;">
                    <button id="cancel-time-btn" style="
                        padding: 10px 20px;
                        background: rgba(255,255,255,0.1);
                        border: 1px solid rgba(255,255,255,0.2);
                        color: #fff;
                        border-radius: 8px;
                        cursor: pointer;
                    ">取消</button>
                    <button id="save-time-btn" style="
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #8c00ff, #00c8ff);
                        border: none;
                        color: #fff;
                        border-radius: 8px;
                        cursor: pointer;
                    ">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 绑定事件
        document.getElementById('cancel-time-btn').onclick = () => {
            modal.remove();
        };
        
        document.getElementById('save-time-btn').onclick = () => {
            const customTimes = [];
            let hasError = false;
            
            this.timeSlots.forEach((slot, index) => {
                const start = document.getElementById(`time-start-${index}`).value;
                const end = document.getElementById(`time-end-${index}`).value;
                
                if (!start || !end) {
                    alert(`第${index + 1}节的时间不能为空！`);
                    hasError = true;
                    return;
                }
                
                // 验证结束时间是否晚于开始时间
                if (start >= end) {
                    alert(`第${index + 1}节的结束时间必须晚于开始时间！`);
                    hasError = true;
                    return;
                }
                
                customTimes.push({ start, end });
            });
            
            if (hasError) return;
            
            // 保存自定义时间
            this.saveCustomTimeConfig(customTimes);
            
            // 重新生成时间段
            this.timeSlots = this.generateTimeSlots(this.periodsPerDay);
            
            // 重新渲染
            this.render();
            
            modal.remove();
            alert('时间设置已保存！');
        };
        
        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
    }
    
    // 恢复默认时间设置
    resetTimeSettings() {
        if (!confirm('确定要恢复默认时间设置吗？这将清除所有自定义时间。')) {
            return;
        }
        
        localStorage.removeItem('schedule_custom_times');
        this.timeSlots = this.generateTimeSlots(this.periodsPerDay);
        this.render();
        
        alert('已恢复默认时间设置！');
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
        const note = document.getElementById('exam-note')?.value.trim();
        const reminderTime = document.getElementById('exam-reminder-time')?.value || '15';
        const reminderType = document.getElementById('exam-reminder-type')?.value || 'popup';
        
        if (!name || !date || !time) {
            alert('请填写完整的考试信息');
            return;
        }
        
        // 计算提醒时间
        const examDateTime = new Date(`${date}T${time}`);
        const reminderMinutes = parseInt(reminderTime);
        const reminderDateTime = new Date(examDateTime.getTime() - reminderMinutes * 60 * 1000);
        
        const exam = { 
            name, 
            date, 
            time, 
            location,
            note,
            reminderTime: reminderMinutes,
            reminderType,
            reminderDateTime: reminderDateTime.toISOString(),
            notified: false
        };
        
        this.exams.push(exam);
        this.saveData();
        this.render();
        this.closeAllModals();
        
        // 设置提醒
        this.scheduleExamReminder(exam);
        
        alert(`考试"${name}"已保存，将在${reminderMinutes > 0 ? reminderMinutes + '分钟前' : '开始时'}提醒您！`);
    }
    
    // 设置考试提醒
    scheduleExamReminder(exam) {
        const now = new Date();
        const reminderTime = new Date(exam.reminderDateTime);
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        
        if (timeUntilReminder > 0 && !exam.notified) {
            setTimeout(() => {
                this.showExamReminder(exam);
            }, timeUntilReminder);
            console.log(`[Exam Reminder] 已设置提醒："${exam.name}" 将在 ${reminderTime.toLocaleString()} 提醒`);
        }
    }
    
    // 显示考试提醒
    showExamReminder(exam) {
        const examDateTime = new Date(`${exam.date}T${exam.time}`);
        const timeString = examDateTime.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const reminderMessage = `考试提醒：${exam.name}\n时间：${timeString}\n地点：${exam.location || '未指定'}${exam.note ? '\n备注：' + exam.note : ''}`;
        
        if (exam.reminderType === 'popup' || exam.reminderType === 'both') {
            alert(reminderMessage);
        }
        
        if (exam.reminderType === 'notification' || exam.reminderType === 'both') {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('考试提醒', {
                    body: `${exam.name} - ${timeString}\n地点：${exam.location || '未指定'}`,
                    icon: '/favicon.ico'
                });
            } else {
                // 如果系统通知不可用，使用弹窗
                alert(reminderMessage);
            }
        }
        
        // 标记为已通知
        exam.notified = true;
        this.saveData();
    }
    
    // 初始化考试提醒（页面加载时调用）
    initExamReminders() {
        // 请求通知权限
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // 为所有未通知的考试设置提醒
        const now = new Date();
        this.exams.forEach(exam => {
            if (!exam.notified) {
                const reminderTime = new Date(exam.reminderDateTime);
                if (reminderTime > now) {
                    this.scheduleExamReminder(exam);
                } else {
                    // 如果提醒时间已过但考试还没开始，立即提醒
                    const examTime = new Date(`${exam.date}T${exam.time}`);
                    if (examTime > now) {
                        this.showExamReminder(exam);
                    }
                }
            }
        });
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
        this.periodToSlot = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6, 12: 6, 13: 7, 14: 7, 15: 8, 16: 8, 17: 9, 18: 9, 19: 10, 20: 10, 21: 11, 22: 11, 23: 12, 24: 12, 25: 13, 26: 13, 27: 14, 28: 14, 29: 15, 30: 15, 31: 16, 32: 16, 33: 17, 34: 17, 35: 18, 36: 18, 37: 19, 38: 19, 39: 20, 40: 20, 41: 21, 42: 21, 43: 22, 44: 22, 45: 23, 46: 23, 47: 24, 48: 24, 49: 25, 50: 25, 51: 26, 52: 26, 53: 27, 54: 27, 55: 28, 56: 28, 57: 29, 58: 29, 59: 30, 60: 30 };
        this.colToDay = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
    }
    
    // 从课程文本中提取节数信息
    // 支持格式："1-2节"、"3节"、"5-6节"、"(1-2节)"等
    extractPeriodInfo(text) {
        if (!text) return null;
        
        // 匹配各种节数格式
        const patterns = [
            /\((\d+)-(\d+)节\)/,      // (1-2节)
            /\((\d+)节\)/,             // (3节)
            /(\d+)-(\d+)节/,          // 1-2节
            /(\d+)节/,                // 3节
            /第(\d+)-(\d+)节/,        // 第1-2节
            /第(\d+)节/               // 第3节
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                if (match[2]) {
                    // 范围格式，如 1-2节
                    return {
                        startPeriod: parseInt(match[1]),
                        endPeriod: parseInt(match[2]),
                        isRange: true
                    };
                } else {
                    // 单节格式，如 3节
                    return {
                        startPeriod: parseInt(match[1]),
                        endPeriod: parseInt(match[1]),
                        isRange: false
                    };
                }
            }
        }
        
        return null;
    }
    
    // 根据节数计算对应的时间段slot
    // 根据用户设置的时间段配置，将节数映射到正确的slot
    calculateTimeSlot(periodInfo, scheduleManager) {
        if (!periodInfo) return null;
        
        // 获取用户设置的一天课程节数
        const periodsPerDay = scheduleManager ? scheduleManager.periodsPerDay : 5;
        
        // 根据开始节数确定slot
        // 例如：1-2节 → slot 1, 3-4节 → slot 2, 5-6节 → slot 3
        const startPeriod = periodInfo.startPeriod;
        
        // 计算slot：每2节课一个slot（向上取整）
        let timeSlot = Math.ceil(startPeriod / 2);
        
        // 确保不超过总slot数
        if (timeSlot > periodsPerDay) {
            timeSlot = periodsPerDay;
        }
        
        return {
            timeSlot: timeSlot,
            startPeriod: periodInfo.startPeriod,
            endPeriod: periodInfo.endPeriod,
            duration: periodInfo.endPeriod - periodInfo.startPeriod + 1  // 课程持续节数
        };
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
        // 获取所有以数字-数字格式ID的单元格
        const cells = table.querySelectorAll('td[id^="1-"], td[id^="2-"], td[id^="3-"], td[id^="4-"], td[id^="5-"], td[id^="6-"], td[id^="7-"]');
        
        console.log(`[Parser] 找到 ${cells.length} 个单元格`);
        
        cells.forEach(cell => {
            const match = cell.id.match(/^(\d+)-(\d+)$/);
            if (!match) return;
            
            const day = parseInt(match[1]);
            const cellPeriod = parseInt(match[2]);
            
            // 解析课程内容 - 每个节次对应一个独立的slot
            const cellCourses = this.parseCellContent(cell, day, cellPeriod);
            
            console.log(`[Parser] 单元格 ${cell.id} 解析出 ${cellCourses.length} 个课程`);
            
            // 处理每个课程，根据节数信息拆分为多个单节课程
            cellCourses.forEach(course => {
                if (course) {
                    // 优先使用 parseCourseDiv 中保存的节数信息
                    let periodInfo = course._periodInfo;
                    
                    // 如果没有保存的节数信息，尝试从课程名称提取
                    if (!periodInfo) {
                        periodInfo = this.extractPeriodInfoFromCourse(course);
                    }
                    
                    console.log(`[Parser] 课程 "${course.name}" 的节数信息:`, periodInfo);
                    
                    if (periodInfo && periodInfo.endPeriod > periodInfo.startPeriod) {
                        // 多节课程 - 为每个节次创建单独的课程对象
                        // 重要：每个节次对应一个独立的slot（不再是每2节课一个slot）
                        for (let p = periodInfo.startPeriod; p <= periodInfo.endPeriod; p++) {
                            // 每个节次对应一个独立的slot
                            const timeSlot = p;  // 第p节对应slot p
                            
                            // 创建课程副本，每个节次一个
                            const periodCourse = {
                                name: course.name,
                                day: course.day,
                                time: timeSlot,  // 每个节次一个独立的slot
                                location: course.location,
                                startWeek: course.startWeek,
                                endWeek: course.endWeek,
                                weekType: course.weekType,
                                period: p,  // 记录具体节次
                                startPeriod: periodInfo.startPeriod,
                                endPeriod: periodInfo.endPeriod,
                                isMultiPeriod: true
                            };
                            
                            courses.push(periodCourse);
                            console.log(`[Parser] ✓ 拆分课程 "${course.name}" 第${p}节 → 时间段${timeSlot}（独立slot）`);
                        }
                    } else if (periodInfo) {
                        // 单节课程 - 每个节次一个独立的slot
                        const timeSlot = periodInfo.startPeriod;  // 第p节对应slot p
                        const singleCourse = {
                            name: course.name,
                            day: course.day,
                            time: timeSlot,
                            location: course.location,
                            startWeek: course.startWeek,
                            endWeek: course.endWeek,
                            weekType: course.weekType,
                            period: periodInfo.startPeriod,
                            startPeriod: periodInfo.startPeriod,
                            endPeriod: periodInfo.endPeriod,
                            isMultiPeriod: false
                        };
                        courses.push(singleCourse);
                        console.log(`[Parser] ✓ 单节课程 "${course.name}" 第${periodInfo.startPeriod}节 → 时间段${timeSlot}（独立slot）`);
                    } else {
                        // 未识别到节数信息，使用默认位置
                        // 每个节次一个独立的slot
                        const courseWithSlot = {
                            ...course,
                            time: cellPeriod  // 使用单元格ID中的节次作为slot
                        };
                        courses.push(courseWithSlot);
                        console.log(`[Parser] ⚠ 课程 "${course.name}" 未识别节数，使用单元格位置 ${cellPeriod}`);
                    }
                }
            });
        });
        
        console.log(`[Parser] 总共解析 ${courses.length} 个课程节次`);
        return courses;
    }
    
    // 从课程对象中提取节数信息（用于重新计算位置）
    extractPeriodInfoFromCourse(course) {
        // 从课程名称或其他字段中查找节数信息
        // 检查课程名称是否包含节数信息
        const text = course.name || '';
        return this.extractPeriodInfo(text);
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
    
    parseCourseDiv(div, day, defaultTimeSlot) {
        const titleSpan = div.querySelector('span.title');
        let name = titleSpan ? titleSpan.textContent.trim() : div.textContent.trim().split(/\s+/)[0];
        
        name = name.replace(/[★☆〇■◆]/g, '').trim();
        
        if (!name || name.length < 2 || !/[\u4e00-\u9fa5]/.test(name)) return null;
        if (['骊山校园', '雁塔校园', '秦汉校园', '上午', '下午', '晚上'].includes(name)) return null;
        
        const text = div.textContent;
        
        // 提取节数信息
        const periodInfo = this.extractPeriodInfo(text);
        let timeSlot = defaultTimeSlot;
        let duration = 2; // 默认2节课
        
        console.log(`[parseCourseDiv] 解析课程 "${name}"，文本内容节数信息:`, periodInfo);
        
        // 如果提取到节数信息，保存起始节和结束节
        // 重要：每个节次对应一个独立的slot（不再是每2节课一个slot）
        if (periodInfo) {
            // 不再计算timeSlot，让parseByCellId来决定
            duration = periodInfo.endPeriod - periodInfo.startPeriod + 1;
            console.log(`[parseCourseDiv] 课程 "${name}" 节数 ${periodInfo.startPeriod}-${periodInfo.endPeriod}, 持续 ${duration} 节（每个节次独立slot）`);
        }
        
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
        
        // 保存原始文本和节数信息，以便后续拆分
        return { 
            name, 
            day, 
            time: timeSlot, 
            location, 
            startWeek, 
            endWeek, 
            weekType, 
            duration,
            _originalText: text,  // 保存原始文本
            _periodInfo: periodInfo  // 保存节数信息
        };
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
    
    parseCourseBlock(block, day, defaultTimeSlot) {
        let clean = block.replace(/[★☆〇■◆]/g, '').trim();
        if (!clean) return null;
        
        const parts = clean.split(/\s+/);
        if (!parts.length) return null;
        
        const name = parts[0];
        if (!/[\u4e00-\u9fa5]/.test(name)) return null;
        if (['骊山校园', '雁塔校园', '秦汉校园', '上午', '下午', '晚上'].includes(name)) return null;
        
        // 提取节数信息
        const periodInfo = this.extractPeriodInfo(clean);
        let timeSlot = defaultTimeSlot;
        let duration = 2; // 默认2节课
        
        // 如果提取到节数信息，计算正确的timeSlot
        if (periodInfo && window.scheduleManager) {
            const slotInfo = this.calculateTimeSlot(periodInfo, window.scheduleManager);
            if (slotInfo) {
                timeSlot = slotInfo.timeSlot;
                duration = slotInfo.duration;
            }
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
        
        return { 
            name, 
            day, 
            time: timeSlot, 
            location, 
            startWeek, 
            endWeek, 
            weekType, 
            duration,
            startPeriod,
            endPeriod
        };
    }
}

// 初始化课程表管理器
document.addEventListener('DOMContentLoaded', () => {
    window.scheduleManager = new ScheduleManager();
});
