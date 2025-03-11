let currentDate = new Date();
let selectedDate = null;
let workData = {};

/**
 * 获取当前周的日期范围（周一到周五）
 * @returns {Date[]} 返回包含本周日期的数组
 */
function getCurrentWeekDates() {
    const today = new Date();
    const currentDay = today.getDay() || 7; // 将周日的0转换为7
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay - 1)); // 计算本周一的日期
    
    const dates = [];
    for (let i = 0; i < 5; i++) { // 只获取周一到周五
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// 格式化日期
function formatDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 页面初始化
 * 加载数据库并渲染日历和周报列表
 */
async function initPage() {
    await DB.init(); // 初始化数据库
    await loadMonthWorkData(currentDate.getFullYear(), currentDate.getMonth()); // 加载当前月份的工作数据
    renderCalendar(); // 渲染日历
}

/**
 * 渲染日历
 * 显示当前月份的日历，并标记有工作内容的日期
 */
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 设置月份标题
    document.getElementById('currentMonth').textContent = 
        `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1); // 本月第一天
    const lastDay = new Date(year, month + 1, 0); // 本月最后一天
    const startDay = firstDay.getDay() || 7; // 本月第一天是星期几
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    // 添加星期头部
    ['一', '二', '三', '四', '五', '六', '日'].forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-weekday';
        dayElement.textContent = day;
        calendarGrid.appendChild(dayElement);
    });
    
    // 添加空白天数，对齐日历
    for (let i = 1; i < startDay; i++) {
        calendarGrid.appendChild(document.createElement('div'));
    }
    
    // 添加日期格子
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date;
        
        // 检查该日期是否有工作内容
        const currentDateStr = formatDateKey(new Date(year, month, date));
        if (workData[currentDateStr]) {
            dayElement.classList.add('has-content');
        }
        
        // 标记今天的日期
        if (isToday(year, month, date)) {
            dayElement.classList.add('today');
        }
        
        // 添加点击事件
        dayElement.onclick = () => openDayModal(new Date(year, month, date));
        calendarGrid.appendChild(dayElement);
    }
}

// 判断是否是今天
function isToday(year, month, date) {
    const today = new Date();
    return year === today.getFullYear() &&
           month === today.getMonth() &&
           date === today.getDate();
}

// 上个月
async function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    await loadMonthWorkData(currentDate.getFullYear(), currentDate.getMonth());
    renderCalendar();
}

// 下个月
async function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    await loadMonthWorkData(currentDate.getFullYear(), currentDate.getMonth());
    renderCalendar();
}

/**
 * 打开日期输入框
 * @param {Date} date 选中的日期
 */
async function openDayModal(date) {
    selectedDate = date;
    const dateStr = formatDate(date);
    // 设置标题
    document.getElementById('inputDate').textContent = 
        `${date.getFullYear()}年${dateStr} `;
    
    // 获取并填充已有的工作内容
    const data = await DB.getDailyWork(formatDateKey(date));
    document.getElementById('basicWork').value = data.basic || '';
    document.getElementById('valueWork').value = data.valueAdded || '';
    document.getElementById('improveWork').value = data.improvement || '';
    document.getElementById('urgentWork').value = data.urgent || '';
    
    // 显示输入面板，隐藏周报内容
    document.getElementById('inputPanel').style.display = 'block';
    document.getElementById('reportContent').style.display = 'none';
}

/**
 * 保存工作内容
 * 保存当天的工作内容并更新周报
 */
async function saveWorkContent() {
    const dateKey = formatDateKey(selectedDate);
    // 获取所有输入框的内容
    const workContent = {
        basic: document.getElementById('basicWork').value.trim(),
        valueAdded: document.getElementById('valueWork').value.trim(),
        improvement: document.getElementById('improveWork').value.trim(),
        urgent: document.getElementById('urgentWork').value.trim()
    };
    
    // 保存工作内容到数据库
    await DB.saveDailyWork(dateKey, workContent);
    
    // 隐藏输入面板并刷新显示
    document.getElementById('inputPanel').style.display = 'none';
    await loadMonthWorkData(currentDate.getFullYear(), currentDate.getMonth());
    renderCalendar();
}

// 获取周数
function getWeekNumber(date) {
    // 获取该年1月4日所在的周一
    const year = date.getFullYear();
    const jan4th = new Date(year, 0, 4);
    const jan4thDay = jan4th.getDay() || 7;
    const firstMonday = new Date(year, 0, 4 - (jan4thDay - 1));
    
    // 计算给定日期到第一周周一的天数差
    const daysDiff = Math.floor((date - firstMonday) / (24 * 60 * 60 * 1000));
    
    return Math.floor(daysDiff / 7) + 1;
}

// 格式化日期键值
function formatDateKey(date) {
    // 确保月份和日期是两位数
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

// 页面加载时初始化
window.onload = function() {
    initTheme();
    initPage();
};

// 加载指定月份的工作数据
async function loadMonthWorkData(year, month) {
    workData = {};
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const currentDate = new Date(year, month, date);
        const dateKey = formatDateKey(currentDate);
        const data = await DB.getDailyWork(dateKey);
        if (Object.keys(data).length > 0) {
            workData[dateKey] = data;
        }
    }
}

/**
 * 根据年份和周数获取该周的日期范围
 * @param {number} year 年份
 * @param {number} weekNumber 周数
 * @returns {Date[]} 该周的日期数组
 */
function getWeekDatesByWeekNumber(year, weekNumber) {
    // 获取该年1月4日（第一周必包含1月4日）
    const jan4th = new Date(year, 0, 4);
    // 获取1月4日是周几
    const jan4thDay = jan4th.getDay() || 7;
    // 计算第一周的周一日期
    const firstMonday = new Date(year, 0, 4 - (jan4thDay - 1));
    // 计算目标周的周一日期
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
    
    const dates = [];
    // 生成周一到周日的日期
    for (let i = 0; i < 7; i++) {
        const date = new Date(targetMonday);
        date.setDate(targetMonday.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// 确保body元素可以接收焦点
document.body.tabIndex = -1;

// 主题切换功能
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

/**
 * 导出周报为文本文件
 */
function exportReport() {
    const reportContent = document.getElementById('reportContent');
    const report = reportContent.dataset.currentReport;
    if (!report) return;
    
    // 创建下载链接
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // 设置文件名为：年份第X周工作日志.txt
    const firstLine = report.split('\n')[0];
    const match = firstLine.match(/(\d{4})年第(\d+)周/);
    const fileName = match ? `${match[1]}年第${match[2]}周工作日志.txt` : '工作日志.txt';
    
    a.href = url;
    a.download = fileName;
    a.click();
    
    // 清理URL对象
    window.URL.revokeObjectURL(url);
}

async function deleteWorkContent() {
    const selectedDate = document.getElementById('inputDate').innerText;
    if (selectedDate && confirm(`确定要删除 ${selectedDate} 的工作内容吗？`)) {
        await removeWorkContent(selectedDate);
        
        // 更新UI显示
        document.getElementById('inputPanel').style.display = 'none';
        
        // 重新加载日历数据以更新标记
        loadCalendarData();
    }
}

async function removeCurrentReport() {
    const currentWeekStart = document.querySelector('#reportText .report-title')?.dataset?.startDate;
    if (currentWeekStart && confirm('确定要删除当前周报吗？')) {
        await removeReport(currentWeekStart);
        
        // 更新UI显示
        document.getElementById('reportContent').style.display = 'none';
    }
}

// 在生成周列表时为每个周报项添加data-start-date属性
function createWeekItem(weekData) {
    const weekItem = document.createElement('div');
    weekItem.className = 'week-item';
    weekItem.innerHTML = `
        <div class="week-item-header">
            <span class="week-item-title">${weekData.title}</span>
            <span class="week-item-time">${weekData.startDate}</span>
        </div>
    `;
    weekItem.addEventListener('click', () => showReport(weekData));
    return weekItem;
}

// 修改showReport函数以添加startDate属性
function showReport(weekData) {
    const reportContent = document.getElementById('reportContent');
    const reportText = document.getElementById('reportText');
    
    reportText.innerHTML = `
        <div class="report-title" data-start-date="${weekData.startDate}">
            ${weekData.title}
        </div>
        <pre>${weekData.content}</pre>
    `;
    
    reportContent.style.display = 'block';
    document.getElementById('inputPanel').style.display = 'none';
}

function removeWorkContent(date) {
    // 从数据库中删除指定日期的工作内容
    deleteFromDatabase(date);
    // 更新界面
    document.getElementById('inputPanel').style.display = 'none';
    alert(`已删除 ${date} 的工作内容`);
}

function removeCurrentReport() {
    // 获取当前周报的日期范围
    const reportDateRange = document.getElementById('reportText').dataset.dateRange;
    // 从数据库中删除指定日期范围的周报
    deleteReportFromDatabase(reportDateRange);
    // 更新界面
    document.getElementById('reportContent').style.display = 'none';
    alert('已删除当前周报');
}

function deleteFromDatabase(date) {
    // 实现删除数据库中指定日期的工作内容的逻辑
    // ...implementation...
}

function deleteReportFromDatabase(dateRange) {
    // 实现删除数据库中指定日期范围的周报的逻辑
    // ...implementation...
}

/**
 * 生成统计报表
 */
async function generateStatsReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('请选择开始和结束日期');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('开始日期不能晚于结束日期');
        return;
    }

    // 获取日期范围内的所有工作数据
    const stats = await generateStats(startDate, endDate);
    
    // 生成报表内容
    const reportContent = generateStatsContent(stats, startDate, endDate);
    
    // 显示报表
    showStatsReport(reportContent);
}

/**
 * 获取指定日期范围内的统计数据
 */
async function generateStats(startDate, endDate) {
    const stats = {
        basic: [],
        valueAdded: [],
        improvement: [],
        urgent: []
    };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(d);
        const dayWork = await DB.getDailyWork(dateKey);
        
        if (dayWork.basic) stats.basic.push({ date: formatDate(d), content: dayWork.basic });
        if (dayWork.valueAdded) stats.valueAdded.push({ date: formatDate(d), content: dayWork.valueAdded });
        if (dayWork.improvement) stats.improvement.push({ date: formatDate(d), content: dayWork.improvement });
        if (dayWork.urgent) stats.urgent.push({ date: formatDate(d), content: dayWork.urgent });
    }
    
    return stats;
}

/**
 * 生成统计报表内容
 */
function generateStatsContent(stats, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let content = `工作统计报告（${formatDate(start)} - ${formatDate(end)}）\n\n`;
    
    const categories = [
        { title: '基础性工作', data: stats.basic },
        { title: '增值性工作', data: stats.valueAdded },
        { title: '提升性工作', data: stats.improvement },
        { title: '紧急性工作', data: stats.urgent }
    ];
    
    categories.forEach(category => {
        if (category.data.length > 0) {
            content += `${category.title}：\n`;
            category.data.forEach(item => {
                content += `- ${item.date}：${item.content}\n`;
            });
            content += '\n';
        }
    });
    
    return content;
}

/**
 * 显示统计报表
 */
function showStatsReport(content) {
    // 检查是否已存在统计报告面板，如果不存在则创建
    let statsPanel = document.getElementById('statsReportPanel');
    if (!statsPanel) {
        statsPanel = document.createElement('div');
        statsPanel.id = 'statsReportPanel';
        statsPanel.className = 'input-panel';
        document.querySelector('.right-panel').appendChild(statsPanel);
    }

    // 更新统计报告内容
    statsPanel.innerHTML = `
        <div class="panel-header">
            <h3>统计报告</h3>
            <button onclick="closeStatsReport()" style="float: right;">关闭</button>
        </div>
        <pre class="stats-report">${content}</pre>
        <div class="input-actions">
            <button onclick="saveStatsReport()">导出</button>
        </div>
    `;
    
    // 显示统计报告面板
    statsPanel.style.display = 'block';
}

/**
 * 关闭统计报告
 */
function closeStatsReport() {
    const statsPanel = document.getElementById('statsReportPanel');
    if (statsPanel) {
        statsPanel.style.display = 'none';
    }
}

/**
 * 导出统计报表
 */
function saveStatsReport() {
    const content = document.querySelector('.stats-report').textContent;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const fileName = `工作统计报告_${start}_${end}.txt`;
    
    a.href = url;
    a.download = fileName;
    a.click();
    
    window.URL.revokeObjectURL(url);
}

function openModal() {
    // 显示模态框
    document.getElementById("myModal").style.display = "block";
    // 防止滚动
    document.body.style.overflow = 'hidden';
    
    // 更新内容
    document.getElementById("readmeContent").innerHTML = `
        <div class="about-content">
            <p>一个简单易用的工作日志管理工具，帮助您轻松管理和生成工作报告。</p>
            <h3>功能特点</h3>
            <ul>
                <li>📅 日历式界面，直观选择日期</li>
                <li>📝 分类记录每日工作内容
                    <ul>
                        <li>基础性工作</li>
                        <li>增值性工作</li>
                        <li>提升性工作</li>
                        <li>紧急性工作</li>
                    </ul>
                </li>
                <li>📊 选择起止日期生成标准格式工作报告</li>
                <li>🌓 支持明暗主题切换</li>
                <li>💾 本地数据存储，保护隐私</li>
            </ul>
            <h3>使用方法</h3>
            <ol>
                <li>点击日历中的日期，输入当天的工作内容</li>
                <li>工作内容分为四类：
                    <ul>
                        <li>基础性工作：常规项目交付管理实施进展情况</li>
                        <li>增值性工作：创新、复盘沉淀、新商机等</li>
                        <li>提升性工作：学习新技术、新能力，考取证书</li>
                        <li>紧急性工作：临时紧急任务</li>
                    </ul>
                </li>
                <li>选择起止日期，点击生成报告，生成标准格式工作报告</li>
                <li>点击导出，导出已生成的报告，以文本文件格式保存。</li>
            </ol>
        </div>
    `;
}

function closeModal() {
    document.getElementById("myModal").style.display = "none";
    // 恢复滚动
    document.body.style.overflow = 'auto';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById("myModal");
    if (event.target === modal) {
        closeModal();
    }
}