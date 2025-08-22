# <font style="background-color:rgba(255, 255, 255, 0);">幻影（Phantom）SRC漏洞挖掘辅助工具</font>
<font style="background-color:rgba(255, 255, 255, 0);">Tips：由于这个项目刚刚开始，所以可能会有一些bug，师傅们可以提Issues哦，我们都会尽快处理的~</font>

<font style="background-color:rgba(255, 255, 255, 0);">一款面向 SRC 场景的浏览器扩展），自动收集页面及相关资源中的敏感信息与可疑线索，支持基础扫描、深度递归扫描、批量 API 测试及结果导出与自定义正则配置。</font>

## <font style="background-color:rgba(255, 255, 255, 0);">特性概览</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">一键基础扫描：自动提取页面内的 API、URL、域名、邮箱、手机号、路径、参数、注释、多类 Token/Key 等</font>
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856171098-216b0f27-45f5-4234-ab67-d47d36097764.png)
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856190392-1d4b6033-eeda-4d67-b37b-59d35dde7b55.png)
+ <font style="background-color:rgba(255, 255, 255, 0);">深度递归扫描：多层链接/资源爬取，支持并发、超时配置，并在新窗口中运行，不阻塞当前操作</font>
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856217086-7079d830-9736-4ca6-9f8c-1c0472aa8be0.png)
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856238274-e1fdcc5c-5bfd-422a-8e6f-55538c127cc2.png)
+ <font style="background-color:rgba(255, 255, 255, 0);">批量 API 测试：对扫描到的分类条目进行 GET/POST 批测，并发与超时可配置，结果支持复制</font>
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856263728-39e2f9a1-c900-4db8-a9c7-1c3c221904b6.png)
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856293628-7e746690-0d2c-4325-a3d5-68b409126f2b.png)
+ <font style="background-color:rgba(255, 255, 255, 0);">导出能力：支持 JSON 与 Excel（.xls XML 格式）两种导出</font>
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856359165-db64aed3-d145-4154-ac77-85e3d0320c6c.png)
+ <font style="background-color:rgba(255, 255, 255, 0);">自定义正则：内置丰富默认规则，可在「设置」中按分类自定义正则并即时生效</font>
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856108718-5297beca-ea38-465c-a09b-57866dae115a.png)
+ <font style="background-color:rgba(255, 255, 255, 0);">Cookie 支持：可一键获取当前站点 Cookie 并保存，便于需要鉴权的请求场景</font>
+ ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856390631-c3102596-b1d8-431f-86d1-46ea883eacdf.png)
+ <font style="background-color:rgba(255, 255, 255, 0);">去重与过滤：内置增强过滤器（域名/邮箱/手机号/API），减少误报</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">自动与增量：页面加载、DOM 变化与定时策略触发静默扫描；深度扫描过程中分层/分批实时合并与展示</font>

## <font style="background-color:rgba(255, 255, 255, 0);">安装</font>
1. <font style="background-color:rgba(255, 255, 255, 0);">打开 Chrome/Edge 等 Chromium 内核浏览器，访问 扩展程序 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">Chrome：chrome://extensions</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">Edge：edge://extensions</font>
2. <font style="background-color:rgba(255, 255, 255, 0);">右上角开启「开发者模式」</font>
3. <font style="background-color:rgba(255, 255, 255, 0);">点击「加载已解压的扩展程序」</font>
4. <font style="background-color:rgba(255, 255, 255, 0);">选择本项目文件夹（包含 manifest.json 的目录）</font>

<font style="background-color:rgba(255, 255, 255, 0);">安装完成后，点击工具栏图标打开弹窗界面（popup.html）。</font>

## <font style="background-color:rgba(255, 255, 255, 0);">权限说明</font>
<font style="background-color:rgba(255, 255, 255, 0);">manifest_version: 3  
</font><font style="background-color:rgba(255, 255, 255, 0);">host_permissions: <all_urls></font>

+ <font style="background-color:rgba(255, 255, 255, 0);">activeTab / tabs / windows：读取当前页信息、打开深度扫描窗口</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">storage：保存扫描结果、深度扫描状态与自定义配置</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">cookies：获取并保存当前站点 Cookie（用于请求鉴权）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">offscreen：在需要时使用离屏文档执行任务（offscreen.html/offscreen.js）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">declarativeNetRequest / declarativeNetRequestWithHostAccess：保留/扩展能力（规则式网络处理）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">content_scripts：注入扫描逻辑（content.js 及扫描模块）</font>

<font style="background-color:rgba(255, 255, 255, 0);">所有数据默认保存在浏览器本地（chrome.storage.local），不对外发送。</font>

## <font style="background-color:rgba(255, 255, 255, 0);">快速上手</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">基础扫描</font>
    1. <font style="background-color:rgba(255, 255, 255, 0);">打开目标页面</font>
    2. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856406509-40692024-9516-4068-9d5b-caf3f4cc4b43.png)
    3. <font style="background-color:rgba(255, 255, 255, 0);">点击扩展图标打开弹窗，默认会显示当前域</font>
    4. <font style="background-color:rgba(255, 255, 255, 0);">点击「开始扫描」或等待自动扫描（首次或超过5分钟未扫描会静默触发）</font>
    5. <font style="background-color:rgba(255, 255, 255, 0);">结果按分类展示，可点击条目复制</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">深度递归扫描</font>
    1. <font style="background-color:rgba(255, 255, 255, 0);">切换至「深度扫描」页</font>
    2. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856423366-5e86dbd0-972a-496d-9669-5db1263f4399.png)
    3. <font style="background-color:rgba(255, 255, 255, 0);">展开配置（最大深度、并发数、超时；可选：扫描 JS/HTML/API）</font>
    4. <font style="background-color:rgba(255, 255, 255, 0);">再次点击按钮启动，新窗口将执行分层递归扫描并实时更新结果</font>
    5. <font style="background-color:rgba(255, 255, 255, 0);">扫描完成后结果会自动合并保存并回显</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">批量 API 测试</font>
    1. <font style="background-color:rgba(255, 255, 255, 0);">切换至「API测试」页</font>
    2. <font style="background-color:rgba(255, 255, 255, 0);">选择请求方法及要测试的分类（如绝对路径API、相对路径API、JS/CSS/图片/URL/域名/路径）</font>
    3. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856435462-f6d693ea-0e57-498b-81dd-c70d8f9b7a3b.png)
    4. <font style="background-color:rgba(255, 255, 255, 0);">支持选择GET/POST请求方式来进行测试</font>
    5. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856444374-7cdeac95-cde9-4997-bfad-124643657cd0.png)
    6. <font style="background-color:rgba(255, 255, 255, 0);">配置并发与超时，点击「批量请求测试」</font>
    7. <font style="background-color:rgba(255, 255, 255, 0);">在弹窗结果中排序，查看与复制</font>
    8. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856467310-881b309b-4d17-427d-91b8-35c44833f0ef.png)
    9. <font style="background-color:rgba(255, 255, 255, 0);">支持预览响应</font>

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856486542-279b74f0-4090-4d42-a042-885f5afb985b.png)

<font style="background-color:rgba(255, 255, 255, 0);">增加了批量指定baseapi，增加自定义api路径的功能</font>

<font style="background-color:rgba(255, 255, 255, 0);">api测试界面如下</font>

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867798497-440ecf5c-b50f-49e2-9165-342fd6d8a875.png)

<font style="background-color:rgba(255, 255, 255, 0);">添加多个baseapi测试结果如下</font>

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867808392-5857b983-1278-4c32-a924-5d6c392c0a6c.png)

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867825378-fb13c236-784c-43bc-a082-11c8545500cf.png)

<font style="background-color:rgba(255, 255, 255, 0);">从findsomething添加路由</font>![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867839791-0180727d-5d77-4ce1-bc13-727c645c7f61.png)

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867848761-d0957cde-240a-4ab1-baee-d1c212344869.png)

<font style="background-color:rgba(255, 255, 255, 0);">添加后需要先到别的界面，比如扫描界面</font>

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867861416-67d4f810-bc04-4292-b9f0-8ed753748943.png)

可以看到多了一个自定义的api路径，然后再到api测试界面，就能选择自定义的api路径进行测试了

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867882946-2f1f9b3f-bd86-423a-aec5-d74b0f1650fb.png)

![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755867892024-08c02ddf-26ca-41db-a2e4-452ac9f681ca.png)

+ <font style="background-color:rgba(255, 255, 255, 0);">导出数据</font>
    1. <font style="background-color:rgba(255, 255, 255, 0);">在「扫描」页点击「导出数据」</font>
    2. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856503381-6c84b75b-6a7f-489d-8dbc-18f8b05efde8.png)
    3. <font style="background-color:rgba(255, 255, 255, 0);">选择导出为 JSON 或 Excel（.xls）</font>
    4. ![](https://cdn.nlark.com/yuque/0/2025/png/44105438/1755856115430-91a6406d-38db-46c3-823c-d9a26a526854.png)
    5. <font style="background-color:rgba(255, 255, 255, 0);">文件名格式：域名__随机数，例如 example.com__123456.xls</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">设置（Cookie与正则）</font>
    1. <font style="background-color:rgba(255, 255, 255, 0);">切换至「设置」页</font>
    2. <font style="background-color:rgba(255, 255, 255, 0);">Cookie：点击获取当前站点 Cookie 或手动粘贴保存</font>
    3. <font style="background-color:rgba(255, 255, 255, 0);">正则：按分类编辑后「保存配置」即时生效；可「恢复默认」</font>

## <font style="background-color:rgba(255, 255, 255, 0);">支持的数据分类（部分）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">API：absoluteApis</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">网络与资源：urls、domains、subdomains、ports、paths、parameters、jsFiles、cssFiles、images、audios、videos、vueFiles、githubUrls</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">身份与联络：emails、phoneNumbers、ipAddresses、companies</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">安全敏感：sensitiveKeywords、credentials、jwts、bearerTokens、basicAuth、authHeaders、wechatAppIds、awsKeys、googleApiKeys、githubTokens、gitlabTokens、webhookUrls、idCards、cryptoUsage</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">表单信息：forms、inputFields、hiddenFields</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">注释：comments</font>

<font style="background-color:rgba(255, 255, 255, 0);">说明：实际输出在展示前做去重、数量限制与过滤，避免噪音。</font>

## <font style="background-color:rgba(255, 255, 255, 0);">深度扫描原理与限制</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">原理</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">从当前页初始结果中收集候选 URL（JS/HTML/API）</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">分层递归（最大深度可配），队列+并发 worker 处理，URL 内容经 PatternExtractor 提取</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">通过 background.js 代发请求（runtime.sendMessage: makeRequest），处理跨域、超时、类型与文本提取</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">应用增强过滤器（域名/邮箱/手机号与 API），结果实时合并到 deepScanResults，并回显与持久化</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">仅同域扫描（same-domain 策略），避免越权和噪音</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">配置建议</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">最大深度 2~3，避免过度抓取</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">并发 5</font>~~<font style="background-color:rgba(255, 255, 255, 0);">16 之间；超时 5</font>~~<font style="background-color:rgba(255, 255, 255, 0);">10 秒</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">若目标需要授权访问，请先在设置中保存 Cookie</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">已做优化</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">URL 内容缓存、正则缓存、分层显示更新、Set 去重、分批持久化</font>

## <font style="background-color:rgba(255, 255, 255, 0);">数据持久化与清理</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">存储键（以域名为维度）</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">{hostname}__results：基础/最终结果</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">{hostname}__deepResults：深度扫描结果</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">{hostname}__deepBackup：深度结果备份</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">{hostname}__deepState：深度扫描运行状态（深度、并发、已扫 URL 等）</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">{hostname}__lastSave：最后保存时间戳</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">lastScan_{url}：自动扫描节流用</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">清理方式</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">弹窗「扫描」页的「清空结果」用于当前域数据的清理</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">代码包含全量清理逻辑（SettingsManager.clearAllData），默认界面未开启全量清空按钮</font>

## <font style="background-color:rgba(255, 255, 255, 0);">自定义正则（Settings）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">保存位置与生效链路 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">保存 phantomRegexConfig 与 regexSettings 两份，保证兼容</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">PatternExtractor 在扫描/深度扫描前会 load/update 自定义规则并即时生效</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">可配置项（示例） </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">API / 域名 / 邮箱 / 手机号 / 敏感信息 / IP / 路径 / JWT / Bearer / Basic / Authorization / 微信AppID / AWS / Google API Key / GitHub/GitLab Token / Webhook / 加密调用 / GitHub 链接 / Vue 文件 / 公司名称 / 注释 等</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">校验 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">保存前会对每条正则进行语法校验，失败会提示并中断保存</font>

## <font style="background-color:rgba(255, 255, 255, 0);">目录结构（摘录）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">manifest.json：扩展清单（MV3）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">background.js：后台脚本（代理请求、结果存储消息处理等）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">content.js：页面内容脚本（自动/增量扫描、提取与过滤）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">popup.html：扩展弹窗 UI（扫描、深度扫描、API 测试、设置、关于）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">src/main.js：应用入口与模块装配（ILoveYouTranslucent7）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">src/scanner/ </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">PatternExtractor.js / ContentExtractor.js / BasicScanner.js / DeepScanner.js / DeepScanWindow.js</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">src/api/ </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">ApiTester.js / TestWindow.js 等</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">src/ui/ </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">DisplayManager.js（结果展示）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">src/utils/ </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">ExportManager.js（JSON/XLS 导出）</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">SettingsManager.js（Cookie/正则配置、全量清理）</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">filters/ </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">domain-phone-filter.js（域名/邮箱/手机号增强过滤）</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">api-filter.js（API 路径增强过滤）</font>

## <font style="background-color:rgba(255, 255, 255, 0);">常见问题</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">扫描无结果或很少 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">目标为系统页（chrome://、chrome-extension://）会被跳过</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">页面首扫后 5 分钟内静默节流；可手动点「开始扫描」</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">规则过严或错误：检查设置中的自定义正则；可恢复默认</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">深度扫描不生效/请求失败 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">站点需要鉴权：先保存 Cookie 后再执行</font>
    - <font style="background-color:rgba(255, 255, 255, 0);">并发过高或超时过短：适度调小并发、调大超时</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">Excel 打不开 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">导出为 .xls可直接用 Excel 打开；若提示编码，选择 UTF-8</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">性能建议 </font>
    - <font style="background-color:rgba(255, 255, 255, 0);">复杂页面建议使用默认节流与深度参数，避免过高并发导致浏览器卡顿</font>

## <font style="background-color:rgba(255, 255, 255, 0);">安全与合规</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">工具仅用于授权范围内的安全测试与 SRC 场景自查，请勿用于非法用途</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">结果保存在本地 storage，不会自动对外发送</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">在进行深度扫描与批量请求时，请遵循目标站点策略与相关法律法规</font>

## <font style="background-color:rgba(255, 255, 255, 0);">版本与致谢</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">版本：1.6.6</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">作者：Phantom&yihuo&Xuan8a1</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">站点： </font>
    - [<font style="background-color:rgba(255, 255, 255, 0);">https://www.cn-fnst.top/</font>](https://www.cn-fnst.top/)
    - [<font style="background-color:rgba(255, 255, 255, 0);">https://blog.h-acker.cn/</font>](https://blog.h-acker.cn/)
    - [<font style="background-color:rgba(255, 255, 255, 0);">https://www.hdsec.cn/</font>](https://www.hdsec.cn/)
+ <font style="background-color:rgba(255, 255, 255, 0);">开源地址：</font>[<font style="background-color:rgba(255, 255, 255, 0);">https://github.com/Team-intN18-SoybeanSeclab/Phantom/</font>](https://github.com/Team-intN18-SoybeanSeclab/Phantom/)
+ <font style="background-color:rgba(255, 255, 255, 0);">致谢个人/团体：D3f4ultX、findsomething、SnowEyes</font>
+ <font style="background-color:rgba(255, 255, 255, 0);">致谢媒体：隼目安全、知攻善防实验室</font>

## <font style="background-color:rgba(255, 255, 255, 0);">宣传文章</font>
<font style="background-color:rgba(255, 255, 255, 0);">URL：</font>[<font style="background-color:rgba(255, 255, 255, 0);">https://mp.weixin.qq.com/s/FrUeZ9VYk6EP1EEikpwfzQ</font>](https://mp.weixin.qq.com/s/FrUeZ9VYk6EP1EEikpwfzQ)

<font style="background-color:rgba(255, 255, 255, 0);"></font>



