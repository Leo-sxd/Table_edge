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
        this.timeSlots = [
            { id: 1, name: '第1-2节', time: '08:00-09:35' },
            { id: 2, name: '第3-4节', time: '09:55-11:30' },
            { id: 3, name: '第5-6节', time: '14:00-15:35' },
            { id: 4, name: '第7-8节', time: '15:55-17:30' },
            { id: 5, name: '第9-10节', time: '19:00-20:35' }
        ];
        
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
        this.renderCourses();
        this.renderExams();
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
        
        // 渲染每门课程
        currentWeekCourses.forEach(course => {
            const cell = document.querySelector(
                `.course-cell[data-day="${course.day}"][data-time="${course.time}"]`
            );
            if (cell) {
                const courseEl = document.createElement('div');
                courseEl.className = 'course-item';
                courseEl.innerHTML = `
                    <div class="course-name">${course.name}</div>
                    ${course.location ? `<div class="course-location">${course.location}</div>` : ''}
                    ${course.startWeek !== 1 || course.endWeek !== 20 ? 
                        `<div class="course-weeks">${course.startWeek}-${course.endWeek}周</div>` : ''}
                `;
                courseEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editCourse(course);
                });
                cell.appendChild(courseEl);
                cell.classList.add('has-course');
            }
        });
        
        console.log('[ScheduleManager] 课程渲染完成:', currentWeekCourses.length);
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
    
    // 解析HTML课表
    parseHTMLSchedule(doc) {
        const courses = [];
        
        // 查找正方教务表格
        const table = doc.querySelector('#kbgrid_table_0') || doc.querySelector('#Table1');
        if (!table) {
            console.log('[ScheduleManager] 未找到课表表格');
            return courses;
        }
        
        const rows = table.querySelectorAll('tr');
        const colToDay = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
        
        for (let rowIdx = 2; rowIdx < rows.length; rowIdx++) {
            const row = rows[rowIdx];
            const cells = row.querySelectorAll('td, th');
            if (cells.length < 3) continue;
            
            // 提取节次
            const periodText = cells[1] ? cells[1].textContent.trim() : '';
            const periodMatch = periodText.match(/^(\d+)$/);
            if (!periodMatch) continue;
            
            const timeSlot = Math.ceil(parseInt(periodMatch[1]) / 2);
            
            // 遍历每一天
            for (let colIdx = 2; colIdx <= 8 && colIdx < cells.length; colIdx++) {
                const dayOfWeek = colToDay[colIdx];
                if (!dayOfWeek) continue;
                
                const cell = cells[colIdx];
                const content = cell.textContent.trim();
                if (!content || content === '\xa0') continue;
                
                // 解析课程块
                const blocks = content.split(/(?=[★☆〇■◆])/).filter(b => b.trim());
                
                for (const block of blocks) {
                    const course = this.parseCourseBlock(block, dayOfWeek, timeSlot);
                    if (course) courses.push(course);
                }
            }
        }
        
        return courses;
    }
    
    // 解析课程块
    parseCourseBlock(block, day, time) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return null;
        
        // 提取课程名
        let name = '';
        for (const line of lines) {
            if (line.includes('★') || line.includes('☆')) {
                name = line.replace(/[★☆〇■◆]/g, '').trim();
                break;
            }
        }
        if (!name) name = lines[0];
        
        // 验证课程名
        if (!name || name.length < 2) return null;
        if (!/[\u4e00-\u9fa5]/.test(name)) return null;
        if (/^(骊山|雁塔|秦汉)校园$/.test(name)) return null;
        
        const detailText = lines.slice(1).join(' ');
        
        // 提取地点
        const locationMatch = detailText.match(/(\d+-\d+-\d+|体育馆|2-机房|未排地点)/);
        const location = locationMatch ? locationMatch[1] : '';
        
        // 提取周次
        const weekMatch = detailText.match(/(\d+)-(\d+)周/);
        const startWeek = weekMatch ? parseInt(weekMatch[1]) : 1;
        const endWeek = weekMatch ? parseInt(weekMatch[2]) : 20;
        
        // 提取单双周
        let weekType = '';
        if (detailText.includes('单周')) weekType = '单周';
        else if (detailText.includes('双周')) weekType = '双周';
        
        return { name, day, time, location, startWeek, endWeek, weekType };
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
            if (parts.length < 3) return;
            
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

// 初始化课程表管理器
document.addEventListener('DOMContentLoaded', () => {
    window.scheduleManager = new ScheduleManager();
});
