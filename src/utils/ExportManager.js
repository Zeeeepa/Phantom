/**
 * export管理器 - 负责resultexport功能
 */
class ExportManager {
    constructor(srcMiner) {
        this.srcMiner = srcMiner;
    }
    
    exportResults() {
        if (Object.keys(this.srcMiner.results).length === 0) {
            alert('withoutdata可export');
            return;
        }
        
        this.showExportModal();
    }
    
    showExportModal() {
        const modal = document.getElementById('exportModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // addeventlistener（if还withoutadd）
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
        // 关闭button
        const closeBtn = document.getElementById('closeExportModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideExportModal());
        }
        
        // JSONexportbutton
        const jsonBtn = document.getElementById('exportJSON');
        if (jsonBtn) {
            jsonBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToJSON();
            });
        }
        
        // XLSexportbutton
        const xlsBtn = document.getElementById('exportCSV');
        if (xlsBtn) {
            xlsBtn.addEventListener('click', async () => {
                this.hideExportModal();
                await this.exportToXLS();
            });
        }
        
        // clickpopup外部关闭
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
        // generateHTML表格formatXLS文件（Excel可以directlyopen）
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

        // 为每个分classcreate工作表
        const categories = Object.keys(this.srcMiner.results);
        let hasData = false;

        // getDisplayManager实例以usegetItemLocationInfo方法
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

                // 为每个项目get位置information
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    let locationInfo = {
                        sourceUrl: '未知来源',
                        pageTitle: '未知page面',
                        extractedAt: new Date().toISOString()
                    };

                    // 尝试get位置information
                    try {
                        if (displayManager && typeof displayManager.getItemLocationInfo === 'function') {
                            locationInfo = await displayManager.getItemLocationInfo(category, item);
                        } else {
                            // ifDisplayManagernot可for，尝试directlyfromitemgetinformation
                            if (typeof item === 'object' && item !== null) {
                                locationInfo = {
                                    sourceUrl: item.sourceUrl || '未知来源',
                                    pageTitle: item.pageTitle || '未知page面',
                                    extractedAt: item.extractedAt || new Date().toISOString()
                                };
                            }
                        }
                    } catch (error) {
                        console.warn(`[ExportManager] get项目位置informationfailed:`, error);
                    }

                    // get项目显示内容
                    const itemContent = typeof item === 'object' && item !== null ? 
                        (item.value || item.text || item.content || JSON.stringify(item)) : 
                        String(item);

                    // format化extract时间
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

        // ifwithoutdata，create一个空工作表
        if (!hasData) {
            xlsContent += `
 <Worksheet ss:Name="无data">
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

        // createanddownload文件
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

    // 清理工作表名称（Excel工作表名称有special字符限制）
    sanitizeSheetName(name) {
        // 移除or替换Excelnot允许字符
        let sanitized = name.replace(/[\\\/\?\*\[\]:]/g, '_');
        // 限制长度（Excel工作表名称最大31个字符）
        if (sanitized.length > 31) {
            sanitized = sanitized.substring(0, 28) + '...';
        }
        return sanitized || '未命名';
    }

    // generate文件名：domain__random数
    async generateFileName() {
        let domain = 'unknown';
        
        try {
            // usechrome.tabs APIget当before活动标签pagedomain
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, resolve);
            });
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                domain = url.hostname;
                //console.log('gettodomain:', domain);
            }
        } catch (e) {
            //console.log('getdomainfailed，use备选方案:', e);
            // 尝试fromDOMgetdomaininformation作为备选方案
            try {
                const domainElement = document.getElementById('currentDomain');
                if (domainElement && domainElement.textContent) {
                    const domainText = domainElement.textContent;
                    // extractdomain部分，match protocol://domain:port format
                    const match = domainText.match(/https?:\/\/([^\/\s:]+)/);
                    if (match && match[1]) {
                        domain = match[1];
                        //console.log('fromDOMgettodomain:', domain);
                    }
                }
            } catch (domError) {
                //console.log('fromDOMgetdomain也failed:', domError);
            }
        }
        
        // if仍然是unknown，use时间戳作为标识
        if (domain === 'unknown') {
            domain = `scan_${Date.now()}`;
        }
        
        // 清理domain，移除special字符
        domain = domain.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        // generaterandom数（6位）
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        
        return `${domain}__${randomNum}`;
    }

    // XMLconvert义
    escapeXml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}