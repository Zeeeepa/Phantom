/**
 * export manage 器 - 负责 result   export feature
 */
class ExportManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    exportResults() {
        if (Object.keys(this.srcMiner.results).length === 0) {
            alert('没有 data can export');
            return;
        }
        
        this.showExportModal();
    }
    
    showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // add event listener（如果还没有 add）
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
        // close button
        const closeBtn = document.getElementById('closeExportModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExportModal());
        }
        
        // JSON export button
        const jsonBtn = document.getElementById('exportJSON');
        if (jsonBtn) {
            jsonBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToJSON();
            });
        }
        
        // XLS export button
        const xlsBtn = document.getElementById('exportCSV');
        if (xlsBtn) {
            xlsBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToXLS();
            });
        }
        
        // 点击popup外部 close
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
        // 生成HTML table format  XLS file（Excel可以directly open）
        let xlsContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>phantom工具</Author>
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

        // to每个分类创建工作表
        const categories = Object.keys(this.srcMiner.results);
        let hasData = false;

        // 获取DisplayManager实例以usegetItemLocationInfo method
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
    <Cell ss:StyleID="Header"><Data ss:Type="String">result来源</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">extract时间</Data></Cell>
   </Row>`;

                // to每个项目获取位置 information
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    let locationInfo = {
                        sourceUrl: '未知来源',
                        pageTitle: '未知 page',
                        extractedAt: new Date().toISOString()
                    };

                    // 尝试获取位置 information
                    try {
                        if (displayManager && typeof displayManager.getItemLocationInfo === 'function') {
                            locationInfo = await displayManager.getItemLocationInfo(category, item);
                        } else {
                            // 如果DisplayManagerdo not可用，尝试directlyfromitem获取 information
                            if (typeof item === 'object' && item !== null) {
                                locationInfo = {
                                    sourceUrl: item.sourceUrl || '未知来源',
                                    pageTitle: item.pageTitle || '未知 page',
                                    extractedAt: item.extractedAt || new Date().toISOString()
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`[ExportManager] 获取项目位置 information failed:`, error);
                    }

                    // 获取项目  display content
                    const itemContent = typeof item === 'object' && item !== null ? 
                        (item.value || item.text || item.content || JSON.stringify(item)) : 
                        String(item);

                    // format 化 extract 时间
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

        // 如果没有 data，创建一个 empty  工作表
        if (!hasData) {
            xlsContent += `
 <Worksheet ss:Name="无 data">
  <Table>
   <Column ss:Width="200"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">提示</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Data"><Data ss:Type="String">没有找到任何data</Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
        }

        xlsContent += `
</Workbook>`;

        // 创建并 download file
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

    // cleanup 工作表名称（Excel工作表名称有特殊字符 limit）
    sanitizeSheetName(name) {
        // remove or replace Exceldo not允许 字符
        let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
        // limit length（Excel工作表名称 maximum 31 items字符）
        if (sanitized.length > 31) {
            sanitized = sanitized.substring(0, 28) + '...';
        }
        return sanitized || '未命名';
    }

    // 生成 file 名：domain __随机数
    async generateFileName() {
        let domain = 'unknown';
        
        try {
            // usechrome.tabs API获取 current 活动 tab 页  domain
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, resolve);
            });
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                domain = url.hostname;
                //console.log('获取到 domain:', domain);
            }
        } catch (e) {
            //console.log('获取 domain failed，use备选方案:', e);
            // 尝试fromDOM获取 domain information 作to备选方案
            try {
                const domainElement = document.getElementById('currentDomain');
                if (domainElement && domainElement.textContent) {
                    const domainText = domainElement.textContent;
                    // extract domain partial，match protocol://domain:port format
                    const match = domainText.match(/https?:\/\/([^\/\s:]+)/);
                    if (match && match[1]) {
                        domain = match[1];
                        //console.log('fromDOM获取到 domain:', domain);
                    }
                }
            } catch (domError) {
                //console.log('fromDOM获取 domain 也 failed:', domError);
            }
        }
        
        // 如果仍然是unknown，use时间戳作to标识
        if (domain === 'unknown') {
            domain = `scan_${Date.now()}`;
        }
        
        // cleanup domain，remove 特殊字符
        domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // 生成随机数（6-digit）
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