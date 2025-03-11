/**
 * 数据库管理模块
 */
const DB = {
    db: null,
    DB_NAME: 'WeeklyReportDB',
    DB_VERSION: 1,

    /**
     * 初始化数据库
     * @returns {Promise} 数据库初始化完成的Promise
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 只保留工作内容存储
                if (!db.objectStoreNames.contains('dailyWork')) {
                    const dailyWorkStore = db.createObjectStore('dailyWork', { keyPath: 'date' });
                    dailyWorkStore.createIndex('weekNumber', 'weekNumber', { unique: false });
                }
            };
        });
    },

    /**
     * 保存每日工作内容
     * @param {string} date 日期键值（YYYY-MM-DD格式）
     * @param {Object} data 工作内容数据
     */
    async saveDailyWork(date, data) {
        const workData = {
            date,
            ...data
        };

        const tx = this.db.transaction('dailyWork', 'readwrite');
        const store = tx.objectStore('dailyWork');
        
        return new Promise((resolve, reject) => {
            const request = store.put(workData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * 获取每日工作内容
     * @param {string} date 日期键值
     * @returns {Promise<Object>} 工作内容数据
     */
    async getDailyWork(date) {
        const tx = this.db.transaction('dailyWork', 'readonly');
        const store = tx.objectStore('dailyWork');
        
        return new Promise((resolve, reject) => {
            const request = store.get(date);
            request.onsuccess = () => resolve(request.result || {});
            request.onerror = () => reject(request.error);
        });
    }
};

async function removeWorkContent(dateStr) {
    try {
        const db = await openDB();
        const tx = db.transaction('workContents', 'readwrite');
        const store = tx.objectStore('workContents');
        await store.delete(dateStr);
        await tx.complete;
        
        // 重新加载日历和周报列表
        loadCalendarData();
        generateWeekList();
        
        // 清空输入面板
        clearInputPanel();
    } catch (error) {
        console.error('Error removing work content:', error);
    }
}

async function removeReport(startDate) {
    try {
        const db = await openDB();
        const tx = db.transaction('reports', 'readwrite');
        const store = tx.objectStore('reports');
        await store.delete(startDate);
        await tx.complete;
        
        // 重新加载周报列表
        generateWeekList();
        
        // 隐藏报告内容面板
        document.getElementById('reportContent').style.display = 'none';
    } catch (error) {
        console.error('Error removing report:', error);
    }
}

// 清空输入面板的辅助函数
function clearInputPanel() {
    document.getElementById('basicWork').value = '';
    document.getElementById('valueWork').value = '';
    document.getElementById('improveWork').value = '';
    document.getElementById('urgentWork').value = '';
    document.getElementById('inputPanel').style.display = 'none';
}