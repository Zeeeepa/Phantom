/**
 * 导出管理器 - 负责结果的导出功能
 */
class ExportManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    exportResults() {
        if (Object.keys(this.srcMiner.results).length === 0) {
            alert('没有数据可导出');
            return;
        }
        
        this.showExportModal();
    }
    
    showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // 添加事件监听器（如果还没有添加）
            if (!this.modalListenersAdded) {
                this.addModalListeners();
                this.modalListenersAdded = true;
            }
        }
    }
    
    hideExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    addModalListeners() {
        // 关闭按钮
        const closeBtn = document.getElementById('closeExportModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExportModal());
        }
        
        // JSON导出按钮
        const jsonBtn = document.getElementById('exportJSON');
        if (jsonBtn) {
            jsonBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToJSON();
            });
        }
        
        // XLS导出按钮
        const xlsBtn = document.getElementById('exportCSV');
        if (xlsBtn) {
            xlsBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToXLS();
            });
        }
        
        // 点击弹窗外部关闭
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'exportModal') {
                    this.hideExportModal();
                }
            });
        }
    }
    
    async exportToJSON() {
        const dataStr = JSON.stringify(this.srcMiner.results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const fileName = await this.generateFileName();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    async exportToXLS() {
        // 生成HTML表格格式的XLS文件（Excel可以直接打开）
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>幻影工具</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#D4EDF9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="Data">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="URL">
   <Font ss:Color="#0066CC" ss:Underline="Single"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>`;

        // 为每个分类创建工作表
        const categories = Object.keys(this.srcMiner.results);
        let hasData = false;

        // 获取DisplayManager实例以使用getItemLocationInfo方法
        const displayManager = this.srcMiner.displayManager;

        for (const category of categories) {
            const items = this.srcMiner.results[category];
            if (Array.isArray(items) && items.length > 0) {
                hasData = true;
                const sheetName = this.sanitizeSheetName(category);
                
                xlsContent += `
 <Worksheet ss:Name="${this.escapeXml(sheetName)}">
  <Table>
   <Column ss:Width="50"/>
   <Column ss:Width="400"/>
   <Column ss:Width="120"/>
   <Column ss:Width="350"/>
   <Column ss:Width="200"/>
   <Column ss:Width="150"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">序号</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">内容</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">分类</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">来源URL</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">结果来源</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提取时间</Data></Cell>
   </Row>`;

                // 为每个项目获取位置信息
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    let locationInfo = {
                        sourceUrl: '未知来源',
                        pageTitle: '未知页面',
                        extractedAt: new Date().toISOString()
                    };

                    // 尝试获取位置信息
                    try {
                        if (displayManager && typeof displayManager.getItemLocationInfo === 'function') {
                            locationInfo = await displayManager.getItemLocationInfo(category, item);
                        } else {
                            // 如果DisplayManager不可用，尝试直接从item获取信息
                            if (typeof item === 'object' && item !== null) {
                                locationInfo = {
                                    sourceUrl: item.sourceUrl || '未知来源',
                                    pageTitle: item.pageTitle || '未知页面',
                                    extractedAt: item.extractedAt || new Date().toISOString()
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`[ExportManager] 获取项目位置信息失败:`, error);
                    }

                    // 获取项目的显示内容
                    const itemContent = typeof item === 'object' && item !== null ? 
                        (item.value || item.text || item.content || JSON.stringify(item)) : 
                        String(item);

                    // 格式化提取时间
                    const extractedTime = locationInfo.extractedAt ? 
                        new Date(locationInfo.extractedAt).toLocaleString('zh-CN') : 
                        '未知时间';

                    xlsContent += `
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(itemContent)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(category)}</Data></Cell>
    <Cell ss:StyleID="URL"><Data ss:Type="String">${this.escapeXml(locationInfo.sourceUrl)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(locationInfo.pageTitle)}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${this.escapeXml(extractedTime)}</Data></Cell>
   </Row>`;
                }

                xlsContent += `
  </Table>
 </Worksheet>`;
            }
        }

        // 如果没有数据，创建一个空的工作表
        if (!hasData) {
            xlsContent += `
 <Worksheet ss:Name="无数据">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提示</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">没有找到任何数据</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // 创建并下载文件
        const blob = new Blob([xlsContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        const url = URL.createObjectURL(blob);
        
        const fileName = await this.generateFileName();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.xls`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // 清理工作表名称（Excel工作表名称有特殊字符限制）
    sanitizeSheetName(name) {
        // 移除或替换Excel不允许的字符
        let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
        // 限制长度（Excel工作表名称最大31个字符）
        if (sanitized.length > 31) {
            sanitized = sanitized.substring(0, 28) + '...';
        }
        return sanitized || '未命名';
    }

    // 生成文件名：域名__随机数
    async generateFileName() {
        let domain = 'unknown';
        
        try {
            // 使用chrome.tabs API获取当前活动标签页的域名
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, resolve);
            });
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                domain = url.hostname;
                //console.log('获取到域名:', domain);
            }
        } catch (e) {
            //console.log('获取域名失败，使用备选方案:', e);
            // 尝试从DOM获取域名信息作为备选方案
            try {
                const domainElement = document.getElementById('currentDomain');
                if (domainElement && domainElement.textContent) {
                    const domainText = domainElement.textContent;
                    // 提取域名部分，匹配 protocol://domain:port 格式
                    const match = domainText.match(/https?:\/\/([^\/\s:]+)/);
                    if (match && match[1]) {
                        domain = match[1];
                        //console.log('从DOM获取到域名:', domain);
                    }
                }
            } catch (domError) {
                //console.log('从DOM获取域名也失败:', domError);
            }
        }
        
        // 如果仍然是unknown，使用时间戳作为标识
        if (domain === 'unknown') {
            domain = `scan_${Date.now()}`;
        }
        
        // 清理域名，移除特殊字符
        domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // 生成随机数（6位）
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        
        return `${domain}__${randomNum}`;
    }

    // XML转义
    escapeXml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}