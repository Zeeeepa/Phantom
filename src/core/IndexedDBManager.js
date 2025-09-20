/**
 * IndexedDB管理器 - 负责普通扫描结果的存储和读取
 */
class IndexedDBManager {
    constructor() {
        this.dbName = 'PhantomScanDB';
        this.dbVersion = 2; // 升级版本以支持JS脚本存储
        this.db = null;
        this.storeName = 'scanResults';
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.db) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ IndexedDB 打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                //console.log('✅ IndexedDB 初始化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('🔄 IndexedDB 升级中...');

                // 创建扫描结果对象存储
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // 创建索引
                    store.createIndex('domain', 'domain', { unique: false });
                    store.createIndex('url', 'url', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    //console.log('✅ 扫描结果对象存储和索引创建成功');
                }

                // 创建JS脚本对象存储
                if (!db.objectStoreNames.contains('jsScripts')) {
                    const jsStore = db.createObjectStore('jsScripts', { 
                        keyPath: 'id',
                        autoIncrement: false 
                    });
                    
                    // 创建索引
                    jsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    console.log('✅ JS脚本对象存储和索引创建成功');
                }
            };
        });
    }

    /**
     * 生成存储键
     */
    generateStorageKey(url) {
        try {
            const urlObj = new URL(url);
            // 只使用域名作为键，确保同一域名下的所有页面共享存储
            const key = urlObj.hostname;
            return key.replace(/[^a-zA-Z0-9._-]/g, '_');
        } catch (error) {
            console.error('生成存储键失败:', error);
            return url.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        }
    }

    /**
     * 保存扫描结果
     */
    async saveScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url);
            
            // 使用传入的sourceUrl，如果没有则使用url参数
            const actualSourceUrl = sourceUrl || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            const currentTime = new Date().toISOString();
            
            // 转换普通扫描结果格式，确保每个项目都有sourceUrl字段
            const transformedResults = {};
            
            if (results && typeof results === 'object') {
                for (const [key, value] of Object.entries(results)) {
                    if (Array.isArray(value)) {
                        // 将数组中的每个字符串转换为包含sourceUrl的对象
                        transformedResults[key] = value.map(item => {
                            if (typeof item === 'string') {
                                return {
                                    value: item,
                                    sourceUrl: actualSourceUrl,
                                    extractedAt: currentTime,
                                    pageTitle: actualPageTitle
                                };
                            } else if (typeof item === 'object' && item !== null) {
                                // 如果已经是对象，确保包含必要字段
                                return {
                                    ...item,
                                    sourceUrl: item.sourceUrl || actualSourceUrl,
                                    extractedAt: item.extractedAt || currentTime,
                                    pageTitle: item.pageTitle || actualPageTitle
                                };
                            }
                            return item;
                        });
                    } else {
                        // 非数组数据保持原样
                        transformedResults[key] = value;
                    }
                }
            } else {
                transformedResults = results;
            }
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: transformedResults,
                sourceUrl: actualSourceUrl,
                pageTitle: actualPageTitle,
                extractedAt: currentTime,
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ 扫描结果已保存到IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 保存扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB保存操作失败:', error);
            throw error;
        }
    }

    /**
     * 读取扫描结果
     */
    async loadScanResults(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url);
            const request = store.get(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        //console.log(`✅ 从IndexedDB加载扫描结果: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDB中未找到数据: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ 读取扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB读取操作失败:', error);
            throw error;
        }
    }

    /**
     * 删除扫描结果
     */
    async deleteScanResults(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url);
            const request = store.delete(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`✅ 已从IndexedDB删除扫描结果: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 删除扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB删除操作失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有扫描结果（用于数据管理）
     */
    async getAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const results = request.result || [];
                    console.log(`✅ 获取所有扫描结果，共 ${results.length} 条记录`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ 获取所有扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB获取所有数据操作失败:', error);
            throw error;
        }
    }

    /**
     * 按域名获取扫描结果
     */
    async getScanResultsByDomain(domain) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('domain');
            
            const request = index.getAll(domain);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const results = request.result || [];
                    console.log(`✅ 获取域名 ${domain} 的扫描结果，共 ${results.length} 条记录`);
                    resolve(results);
                };
                
                request.onerror = () => {
                    console.error('❌ 按域名获取扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB按域名查询操作失败:', error);
            throw error;
        }
    }

    /**
     * 清空所有扫描结果
     */
    async clearAllScanResults() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log('✅ 已清空所有IndexedDB扫描结果');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 清空扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB清空操作失败:', error);
            throw error;
        }
    }

    /**
     * 获取数据库统计信息
     */
    async getStats() {
        try {
            const allResults = await this.getAllScanResults();
            
            const stats = {
                totalRecords: allResults.length,
                domains: new Set(allResults.map(r => r.domain)).size,
                totalDataSize: 0,
                oldestRecord: null,
                newestRecord: null
            };

            if (allResults.length > 0) {
                // 计算数据大小（近似）
                stats.totalDataSize = allResults.reduce((size, record) => {
                    return size + JSON.stringify(record).length;
                }, 0);

                // 找到最老和最新的记录
                const timestamps = allResults.map(r => r.timestamp).sort((a, b) => a - b);
                stats.oldestRecord = new Date(timestamps[0]);
                stats.newestRecord = new Date(timestamps[timestamps.length - 1]);
            }

            return stats;
            
        } catch (error) {
            console.error('❌ 获取IndexedDB统计信息失败:', error);
            return {
                totalRecords: 0,
                domains: 0,
                totalDataSize: 0,
                oldestRecord: null,
                newestRecord: null
            };
        }
    }

    /**
     * 保存深度扫描结果
     */
    async saveDeepScanResults(url, results, sourceUrl = null, pageTitle = null) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__deep';
            
            // 获取源URL和页面标题 - 修复深度扫描显示"未知"的问题
            const actualSourceUrl = sourceUrl || window.location.href || url;
            const actualPageTitle = pageTitle || document.title || urlObj.hostname;
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                results: results,
                sourceUrl: actualSourceUrl,  // 添加源URL信息
                pageTitle: actualPageTitle,  // 添加页面标题信息
                extractedAt: new Date().toISOString(),  // 添加提取时间
                type: 'deepScan',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ 深度扫描结果已保存到IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    //console.error('❌ 保存深度扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB保存深度扫描结果失败:', error);
            throw error;
        }
    }

    /**
     * 读取深度扫描结果
     */
    async loadDeepScanResults(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url) + '__deep';
            const request = store.get(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        //console.log(`✅ 从IndexedDB加载深度扫描结果: ${storageKey}`);
                        resolve({
                            results: result.results || {},
                            timestamp: result.timestamp,
                            lastSave: result.lastSave
                        });
                    } else {
                        //console.log(`📭 IndexedDB中未找到深度扫描数据: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ 读取深度扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB读取深度扫描结果失败:', error);
            throw error;
        }
    }

    /**
     * 保存深度扫描状态
     */
    async saveDeepScanState(url, state) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const urlObj = new URL(url);
            const storageKey = this.generateStorageKey(url) + '__state';
            
            const data = {
                id: storageKey,
                domain: urlObj.hostname,
                url: url,
                state: state,
                type: 'deepScanState',
                timestamp: Date.now(),
                lastSave: Date.now()
            };

            const request = store.put(data);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    //console.log(`✅ 深度扫描状态已保存到IndexedDB: ${storageKey}`);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('❌ 保存深度扫描状态失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB保存深度扫描状态失败:', error);
            throw error;
        }
    }

    /**
     * 读取深度扫描状态
     */
    async loadDeepScanState(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const storageKey = this.generateStorageKey(url) + '__state';
            const request = store.get(storageKey);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        //console.log(`✅ 从IndexedDB加载深度扫描状态: ${storageKey}`);
                        resolve(result.state || {});
                    } else {
                        console.log(`📭 IndexedDB中未找到深度扫描状态: ${storageKey}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    //console.error('❌ 读取深度扫描状态失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ IndexedDB读取深度扫描状态失败:', error);
            throw error;
        }
    }

    /**
     * 删除深度扫描相关数据
     */
    async deleteDeepScanData(url) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const baseKey = this.generateStorageKey(url);
            const keysToDelete = [
                baseKey + '__deep',
                baseKey + '__state'
            ];

            const promises = keysToDelete.map(key => {
                return new Promise((resolve, reject) => {
                    const request = store.delete(key);
                    request.onsuccess = () => resolve(key);
                    request.onerror = () => reject(request.error);
                });
            });

            await Promise.all(promises);
            console.log(`✅ 已从IndexedDB删除深度扫描数据: ${baseKey}`);
            return true;
            
        } catch (error) {
            console.error('❌ IndexedDB删除深度扫描数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有深度扫描状态
     */
    async getAllDeepScanStates() {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const allData = request.result || [];
                    // 过滤出深度扫描状态（以__state结尾的键）
                    const deepScanStates = allData
                        .filter(item => item.id && item.id.endsWith('__state') && item.type === 'deepScanState')
                        .map(item => item.state)
                        .filter(state => state && state.baseUrl)
                        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // 按时间排序
                    
                    console.log(`📖 获取所有深度扫描状态: 找到 ${deepScanStates.length} 个配置`);
                    resolve(deepScanStates);
                };
                request.onerror = () => {
                    console.error('❌ 获取所有深度扫描状态失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ 获取所有深度扫描状态失败:', error);
            return [];
        }
    }

    // ==================== JS脚本存储相关方法 ====================
    
    /**
     * 保存JS脚本列表
     */
    async saveJSScripts(scripts) {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.put({
                    id: 'savedScripts',
                    scripts: scripts,
                    timestamp: Date.now()
                });
                
                request.onsuccess = () => {
                    console.log('✅ JS脚本保存成功，共', scripts.length, '个脚本');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JS脚本保存失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS脚本保存失败:', error);
            throw error;
        }
    }

    /**
     * 加载JS脚本列表
     */
    async loadJSScripts() {
        try {
            //console.log('[IndexedDBManager] 开始加载JS脚本...');
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readonly');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.get('savedScripts');
                
                request.onsuccess = () => {
                    const result = request.result;
                    //console.log('[IndexedDBManager] 原始查询结果:', result);
                    
                    if (result && result.scripts) {
                        //console.log('✅ JS脚本加载成功，共', result.scripts.length, '个脚本');
                        //console.log('[IndexedDBManager] 脚本详情:', result.scripts.map(s => ({ name: s.name, isPreset: s.isPreset, id: s.id })));
                        resolve(result.scripts);
                    } else {
                        console.log('📭 IndexedDB中未找到JS脚本数据，返回空数组');
                        resolve([]);
                    }
                };
                request.onerror = () => {
                    console.error('❌ JS脚本加载失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS脚本加载失败:', error);
            return [];
        }
    }

    /**
     * 删除所有JS脚本
     */
    async clearJSScripts() {
        try {
            await this.init();
            
            const transaction = this.db.transaction(['jsScripts'], 'readwrite');
            const store = transaction.objectStore('jsScripts');
            
            return new Promise((resolve, reject) => {
                const request = store.delete('savedScripts');
                
                request.onsuccess = () => {
                    console.log('✅ JS脚本清除成功');
                    resolve();
                };
                request.onerror = () => {
                    console.error('❌ JS脚本清除失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('❌ JS脚本清除失败:', error);
            throw error;
        }
    }

    /**
     * 获取最近的扫描结果
     */
    async getRecentScanResults(limit = 10) {
        try {
            await this.init();
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const results = request.result || [];
                    // 按时间戳排序，最新的在前
                    const sortedResults = results.sort((a, b) => {
                        const timeA = new Date(a.extractedAt || a.timestamp || 0).getTime();
                        const timeB = new Date(b.extractedAt || b.timestamp || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    // 限制返回数量
                    const limitedResults = sortedResults.slice(0, limit);
                    resolve(limitedResults);
                };
                
                request.onerror = () => {
                    console.error('❌ 获取最近扫描结果失败:', request.error);
                    reject(request.error);
                };
            });
            
        } catch (error) {
            console.error('❌ 获取最近扫描结果操作失败:', error);
            return [];
        }
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('✅ IndexedDB连接已关闭');
        }
    }
}

// 创建全局实例
const indexedDBManager = new IndexedDBManager();

// 导出实例，使其可以像静态方法一样调用
window.IndexedDBManager = indexedDBManager;