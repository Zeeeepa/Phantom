// JSHook 预设脚本库
const JSHookPresets = {
    // 预设脚本data
    presetScripts: [
            {
                name: "Hook XMLHttpRequest",
                description: "拦截and监控allXMLHttpRequestrequest，可以查看requestURL、方法、parameterand响应内容。适for分析AJAXrequestandAPI调for。",
                code: `// Hook XMLHttpRequest
(function() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._method = method;
        this._url = url;
        console.log('[XHR Hook] requeststart:', method, url);
        return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 4) {
                console.log('[XHR Hook] 响应complete:', {
                    method: this._method,
                    url: this._url,
                    status: this.status,
                    response: this.responseText
                });
            }
        });
        
        if (data) {
            console.log('[XHR Hook] requestdata:', data);
        }
        
        return originalSend.apply(this, arguments);
    };
    
    console.log('[XHR Hook] XMLHttpRequest Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook Fetch API",
                description: "拦截and监控allfetchrequest，显示requestand响应详细information。现代浏览器in替代XMLHttpRequestnewAPI监控。",
                code: `// Hook Fetch API
(function() {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
        const [resource, config] = args;
        
        console.log('[Fetch Hook] requeststart:', {
            url: resource,
            method: config?.method || 'GET',
            headers: config?.headers,
            body: config?.body
        });
        
        return originalFetch.apply(this, args)
            .then(response => {
                console.log('[Fetch Hook] 响应complete:', {
                    url: resource,
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries())
                });
                
                // 克隆响应以便查看内容
                const clonedResponse = response.clone();
                clonedResponse.text().then(text => {
                    console.log('[Fetch Hook] 响应内容:', text);
                }).catch(err => {
                    console.log('[Fetch Hook] 无法read响应内容:', err);
                });
                
                return response;
            })
            .catch(error => {
                console.error('[Fetch Hook] requestfailed:', error);
                throw error;
            });
    };
    
    console.log('[Fetch Hook] Fetch API Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook Console Methods",
                description: "拦截allconsole方法调for，可以监控page面day志输出，includingconsole.log、console.error等。",
                code: `// Hook Console Methods
(function() {
    const originalMethods = {};
    const consoleMethods = ['log', 'warn', 'error', 'info', 'debug'];
    
    consoleMethods.forEach(method => {
        originalMethods[method] = console[method];
        
        console[method] = function(...args) {
            // record原始调for
            originalMethods[method].apply(console, args);
            
            // addHook标记
            originalMethods.log('[Console Hook]', method.toUpperCase() + ':', ...args);
        };
    });
    
    console.log('[Console Hook] Console Methods Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook Cookie Operations",
                description: "监控allCookiereadandsettings操作，可以追踪page面对Cookie访问and修改。",
                code: `// Hook Cookie Operations
(function() {
    let originalCookie = document.cookie;
    
    Object.defineProperty(document, 'cookie', {
        get: function() {
            console.log('[Cookie Hook] readCookie:', originalCookie);
            return originalCookie;
        },
        set: function(value) {
            console.log('[Cookie Hook] settingsCookie:', value);
            originalCookie = value;
            
            // 实际settingsCookie
            const cookieParts = value.split(';');
            const mainPart = cookieParts[0];
            document.cookie = value;
        },
        configurable: true
    });
    
    console.log('[Cookie Hook] Cookie Operations Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook LocalStorage",
                description: "监控LocalStorageall操作，includingsetItem、getItem、removeItem等方法调for。",
                code: `// Hook LocalStorage
(function() {
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;
    
    localStorage.setItem = function(key, value) {
        console.log('[LocalStorage Hook] setItem:', key, '=', value);
        return originalSetItem.apply(this, arguments);
    };
    
    localStorage.getItem = function(key) {
        const value = originalGetItem.apply(this, arguments);
        console.log('[LocalStorage Hook] getItem:', key, '=', value);
        return value;
    };
    
    localStorage.removeItem = function(key) {
        console.log('[LocalStorage Hook] removeItem:', key);
        return originalRemoveItem.apply(this, arguments);
    };
    
    localStorage.clear = function() {
        console.log('[LocalStorage Hook] clear: 清空alldata');
        return originalClear.apply(this, arguments);
    };
    
    console.log('[LocalStorage Hook] LocalStorage Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook WebSocket",
                description: "拦截WebSocket连接andmessage传输，监控实时通信data。",
                code: `// Hook WebSocket
(function() {
    const originalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
        console.log('[WebSocket Hook] create连接:', url, protocols);
        
        const ws = new originalWebSocket(url, protocols);
        
        const originalSend = ws.send;
        ws.send = function(data) {
            console.log('[WebSocket Hook] sendmessage:', data);
            return originalSend.apply(this, arguments);
        };
        
        ws.addEventListener('open', function(event) {
            console.log('[WebSocket Hook] 连接alreadyopen:', event);
        });
        
        ws.addEventListener('message', function(event) {
            console.log('[WebSocket Hook] receivedmessage:', event.data);
        });
        
        ws.addEventListener('close', function(event) {
            console.log('[WebSocket Hook] 连接already关闭:', event.code, event.reason);
        });
        
        ws.addEventListener('error', function(event) {
            console.log('[WebSocket Hook] 连接错误:', event);
        });
        
        return ws;
    };
    
    // keep原型链
    window.WebSocket.prototype = originalWebSocket.prototype;
    
    console.log('[WebSocket Hook] WebSocket Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook Function Calls",
                description: "general函数调forHook，可以监控指定函数调for情况。require修改targetFunction变量指定要监控函数。",
                code: `// Hook Function Calls (generalmod板)
(function() {
    // 修改这里指定要Hook函数
    const targetFunction = 'alert'; // 例such as: 'setTimeout', 'setInterval', 'eval' 等
    
    if (window[targetFunction] && typeof window[targetFunction] === 'function') {
        const originalFunction = window[targetFunction];
        
        window[targetFunction] = function(...args) {
            console.log('[Function Hook] 调for ' + targetFunction + ':', args);
            
            // get调for栈
            console.log('[Function Hook] 调for栈:', new Error().stack);
            
            return originalFunction.apply(this, args);
        };
        
        console.log('[Function Hook] ' + targetFunction + ' Hook already激活');
    } else {
        console.warn('[Function Hook] 函数notexists:', targetFunction);
    }
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: "Hook Event Listeners",
                description: "监控alleventlisteneraddand移除，可以追踪page面event绑定情况。",
                code: `// Hook Event Listeners
(function() {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        console.log('[Event Hook] addeventlistener:', {
            target: this,
            type: type,
            listener: listener,
            options: options
        });
        
        return originalAddEventListener.apply(this, arguments);
    };
    
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
        console.log('[Event Hook] 移除eventlistener:', {
            target: this,
            type: type,
            listener: listener,
            options: options
        });
        
        return originalRemoveEventListener.apply(this, arguments);
    };
    
    console.log('[Event Hook] Event Listeners Hook already激活');
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },
            
            {
                name: 'Hook Eval',
                description: 'listen网站对于eval调for',
                code: `(function () {
    let evalCache = window.eval;
    window.eval = function (string) {
        console.log("Hook eval =>", string);
        //debugger;
        return evalCache(string);
    };
    window.eval.toString = function () {
        return evalCache.toString();
    };
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },

            {
                name: 'Hook Function',
                description: 'listenall函数调for，all函数操作都会in控制台打印输出将要execute JS 源code',
                code: `(function () {
    let FunctionCache = window.Function;
    let newFunction = function () {
        let src = arguments[arguments.length - 1];
        console.log("Hook Function => ", src);
        //debugger;
        return FunctionCache.apply(this, arguments);
    };
    newFunction.toString = function () {
        return FunctionCache.toString();
    };
})();
`,
                isPreset: true,
                created: new Date().toISOString()
            },

            {
                name: 'Hook JSON.parse',
                description: 'listen对于JSON.parse调for',
                code: `(function () {
    let parseCache = JSON.parse;
    JSON.parse = function (params) {
        console.log("Hook JSON.parse => ", params);
        //debugger;
        return parseCache(params);
    };
})();
`,
                isPreset: true,
                created: new Date().toISOString()
            },

            {
                name: '固定random数value',
                description: '修改random数value为固定value',
                code: `(function () {
    let originalRandom = Math.random;
    Math.random = function random() {
        console.log("Hook Math.random => called");
        //debugger;
        return 12345689;
    };
})();`,
                isPreset: true,
                created: new Date().toISOString()
            },


            {
                name: 'FakeCryptoAES',
                description: '获取网页中的aes加密参数，如iv，key等，在控制台中显示，可在注入后在页面控制台中输入customerFlag = true，启动调试显示，再次启动界面上与加密相关的功能，会显示加密所调用的堆栈位置，使用customerEnc("加密内容")可直接进行加密操作，详细使用方法查看项目https://github.com/keecth/FakeCryptoJS?tab=readme-ov-file',
                code: `!function(t,e){\"object\"==typeof exports?module.exports=exports=e():\"function\"==typeof define&&define.amd?define([],e):t.CryptoJS=e()}(this,function(){var n,o,s,a,h,t,e,l,r,i,c,f,d,u,p,S,x,b,A,H,z,_,v,g,y,B,w,k,m,C,D,E,R,M,F,P,W,O,I,U=U||function(h){var i;if(\"undefined\"!=typeof window&&window.crypto&&(i=window.crypto),\"undefined\"!=typeof self&&self.crypto&&(i=self.crypto),!(i=!(i=!(i=\"undefined\"!=typeof globalThis&&globalThis.crypto?globalThis.crypto:i)&&\"undefined\"!=typeof window&&window.msCrypto?window.msCrypto:i)&&\"undefined\"!=typeof global&&global.crypto?global.crypto:i)&&\"function\"==typeof require)try{i=require(\"crypto\")}catch(t){}var r=Object.create||function(t){return e.prototype=t,t=new e,e.prototype=null,t};function e(){}var t={},n=t.lib={},o=n.Base={extend:function(t){var e=r(this);return t&&e.mixIn(t),e.hasOwnProperty(\"init\")&&this.init!==e.init||(e.init=function(){e.$super.init.apply(this,arguments)}),(e.init.prototype=e).$super=this,e},create:function(){var t=this.extend();return t.init.apply(t,arguments),t},init:function(){},mixIn:function(t){for(var e in t)t.hasOwnProperty(e)&&(this[e]=t[e]);t.hasOwnProperty(\"toString\")&&(this.toString=t.toString)},clone:function(){return this.init.prototype.extend(this)}},l=n.WordArray=o.extend({init:function(t,e){t=this.words=t||[],this.sigBytes=null!=e?e:4*t.length},toString:function(t){return(t||c).stringify(this)},concat:function(t){var e=this.words,r=t.words,i=this.sigBytes,n=t.sigBytes;if(this.clamp(),i%4)for(var o=0;o<n;o++){var s=r[o>>>2]>>>24-o%4*8&255;e[i+o>>>2]|=s<<24-(i+o)%4*8}else for(var c=0;c<n;c+=4)e[i+c>>>2]=r[c>>>2];return this.sigBytes+=n,this},clamp:function(){var t=this.words,e=this.sigBytes;t[e>>>2]&=4294967295<<32-e%4*8,t.length=h.ceil(e/4)},clone:function(){var t=o.clone.call(this);return t.words=this.words.slice(0),t},random:function(t){for(var e=[],r=0;r<t;r+=4)e.push(function(){if(i){if(\"function\"==typeof i.getRandomValues)try{return i.getRandomValues(new Uint32Array(1))[0]}catch(t){}if(\"function\"==typeof i.randomBytes)try{return i.randomBytes(4).readInt32LE()}catch(t){}}throw new Error(\"Native crypto module could not be used to get secure random number.\")}());return new l.init(e,t)}}),s=t.enc={},c=s.Hex={stringify:function(t){for(var e=t.words,r=t.sigBytes,i=[],n=0;n<r;n++){var o=e[n>>>2]>>>24-n%4*8&255;i.push((o>>>4).toString(16)),i.push((15&o).toString(16))}return i.join(\"\")},parse:function(t){for(var e=t.length,r=[],i=0;i<e;i+=2)r[i>>>3]|=parseInt(t.substr(i,2),16)<<24-i%8*4;return new l.init(r,e/2)}},a=s.Latin1={stringify:function(t){for(var e=t.words,r=t.sigBytes,i=[],n=0;n<r;n++){var o=e[n>>>2]>>>24-n%4*8&255;i.push(String.fromCharCode(o))}return i.join(\"\")},parse:function(t){for(var e=t.length,r=[],i=0;i<e;i++)r[i>>>2]|=(255&t.charCodeAt(i))<<24-i%4*8;return new l.init(r,e)}},f=s.Utf8={stringify:function(t){try{return decodeURIComponent(escape(a.stringify(t)))}catch(t){throw new Error(\"Malformed UTF-8 data\")}},parse:function(t){return a.parse(unescape(encodeURIComponent(t)))}},d=n.BufferedBlockAlgorithm=o.extend({reset:function(){this._data=new l.init,this._nDataBytes=0},_append:function(t){\"string\"==typeof t&&(t=f.parse(t)),this._data.concat(t),this._nDataBytes+=t.sigBytes},_process:function(t){var e,r=this._data,i=r.words,n=r.sigBytes,o=this.blockSize,s=n/(4*o),c=(s=t?h.ceil(s):h.max((0|s)-this._minBufferSize,0))*o,n=h.min(4*c,n);if(c){for(var a=0;a<c;a+=o)this._doProcessBlock(i,a);e=i.splice(0,c),r.sigBytes-=n}return new l.init(e,n)},clone:function(){var t=o.clone.call(this);return t._data=this._data.clone(),t},_minBufferSize:0}),u=(n.Hasher=d.extend({cfg:o.extend(),init:function(t){this.cfg=this.cfg.extend(t),this.reset()},reset:function(){d.reset.call(this),this._doReset()},update:function(t){return this._append(t),this._process(),this},finalize:function(t){return t&&this._append(t),this._doFinalize()},blockSize:16,_createHelper:function(r){return function(t,e){return new r.init(e).finalize(t)}},_createHmacHelper:function(r){return function(t,e){return new u.HMAC.init(r,e).finalize(t)}}}),t.algo={});return t}(Math);function K(t,e,r){return t&e|~t&r}function X(t,e,r){return t&r|e&~r}function L(t,e){return t<<e|t>>>32-e}function j(t,e,r,i){var n,o=this._iv;o?(n=o.slice(0),this._iv=void 0):n=this._prevBlock,i.encryptBlock(n,0);for(var s=0;s<r;s++)t[e+s]^=n[s]}function T(t){var e,r,i;return 255==(t>>24&255)?(r=t>>8&255,i=255&t,255===(e=t>>16&255)?(e=0,255===r?(r=0,255===i?i=0:++i):++r):++e,t=0,t+=e<<16,t+=r<<8,t+=i):t+=1<<24,t}function N(){for(var t=this._X,e=this._C,r=0;r<8;r++)E[r]=e[r];e[0]=e[0]+1295307597+this._b|0,e[1]=e[1]+3545052371+(e[0]>>>0<E[0]>>>0?1:0)|0,e[2]=e[2]+886263092+(e[1]>>>0<E[1]>>>0?1:0)|0,e[3]=e[3]+1295307597+(e[2]>>>0<E[2]>>>0?1:0)|0,e[4]=e[4]+3545052371+(e[3]>>>0<E[3]>>>0?1:0)|0,e[5]=e[5]+886263092+(e[4]>>>0<E[4]>>>0?1:0)|0,e[6]=e[6]+1295307597+(e[5]>>>0<E[5]>>>0?1:0)|0,e[7]=e[7]+3545052371+(e[6]>>>0<E[6]>>>0?1:0)|0,this._b=e[7]>>>0<E[7]>>>0?1:0;for(r=0;r<8;r++){var i=t[r]+e[r],n=65535&i,o=i>>>16;R[r]=((n*n>>>17)+n*o>>>15)+o*o^((4294901760&i)*i|0)+((65535&i)*i|0)}t[0]=R[0]+(R[7]<<16|R[7]>>>16)+(R[6]<<16|R[6]>>>16)|0,t[1]=R[1]+(R[0]<<8|R[0]>>>24)+R[7]|0,t[2]=R[2]+(R[1]<<16|R[1]>>>16)+(R[0]<<16|R[0]>>>16)|0,t[3]=R[3]+(R[2]<<8|R[2]>>>24)+R[1]|0,t[4]=R[4]+(R[3]<<16|R[3]>>>16)+(R[2]<<16|R[2]>>>16)|0,t[5]=R[5]+(R[4]<<8|R[4]>>>24)+R[3]|0,t[6]=R[6]+(R[5]<<16|R[5]>>>16)+(R[4]<<16|R[4]>>>16)|0,t[7]=R[7]+(R[6]<<8|R[6]>>>24)+R[5]|0}function q(){for(var t=this._X,e=this._C,r=0;r<8;r++)O[r]=e[r];e[0]=e[0]+1295307597+this._b|0,e[1]=e[1]+3545052371+(e[0]>>>0<O[0]>>>0?1:0)|0,e[2]=e[2]+886263092+(e[1]>>>0<O[1]>>>0?1:0)|0,e[3]=e[3]+1295307597+(e[2]>>>0<O[2]>>>0?1:0)|0,e[4]=e[4]+3545052371+(e[3]>>>0<O[3]>>>0?1:0)|0,e[5]=e[5]+886263092+(e[4]>>>0<O[4]>>>0?1:0)|0,e[6]=e[6]+1295307597+(e[5]>>>0<O[5]>>>0?1:0)|0,e[7]=e[7]+3545052371+(e[6]>>>0<O[6]>>>0?1:0)|0,this._b=e[7]>>>0<O[7]>>>0?1:0;for(r=0;r<8;r++){var i=t[r]+e[r],n=65535&i,o=i>>>16;I[r]=((n*n>>>17)+n*o>>>15)+o*o^((4294901760&i)*i|0)+((65535&i)*i|0)}t[0]=I[0]+(I[7]<<16|I[7]>>>16)+(I[6]<<16|I[6]>>>16)|0,t[1]=I[1]+(I[0]<<8|I[0]>>>24)+I[7]|0,t[2]=I[2]+(I[1]<<16|I[1]>>>16)+(I[0]<<16|I[0]>>>16)|0,t[3]=I[3]+(I[2]<<8|I[2]>>>24)+I[1]|0,t[4]=I[4]+(I[3]<<16|I[3]>>>16)+(I[2]<<16|I[2]>>>16)|0,t[5]=I[5]+(I[4]<<8|I[4]>>>24)+I[3]|0,t[6]=I[6]+(I[5]<<16|I[5]>>>16)+(I[4]<<16|I[4]>>>16)|0,t[7]=I[7]+(I[6]<<8|I[6]>>>24)+I[5]|0}return F=(M=U).lib,n=F.Base,o=F.WordArray,(M=M.x64={}).Word=n.extend({init:function(t,e){this.high=t,this.low=e}}),M.WordArray=n.extend({init:function(t,e){t=this.words=t||[],this.sigBytes=null!=e?e:8*t.length},toX32:function(){for(var t=this.words,e=t.length,r=[],i=0;i<e;i++){var n=t[i];r.push(n.high),r.push(n.low)}return o.create(r,this.sigBytes)},clone:function(){for(var t=n.clone.call(this),e=t.words=this.words.slice(0),r=e.length,i=0;i<r;i++)e[i]=e[i].clone();return t}}),\"function\"==typeof ArrayBuffer&&(P=U.lib.WordArray,s=P.init,(P.init=function(t){if((t=(t=t instanceof ArrayBuffer?new Uint8Array(t):t)instanceof Int8Array||\"undefined\"!=typeof Uint8ClampedArray&&t instanceof Uint8ClampedArray||t instanceof Int16Array||t instanceof Uint16Array||t instanceof Int32Array||t instanceof Uint32Array||t instanceof Float32Array||t instanceof Float64Array?new Uint8Array(t.buffer,t.byteOffset,t.byteLength):t)instanceof Uint8Array){for(var e=t.byteLength,r=[],i=0;i<e;i++)r[i>>>2]|=t[i]<<24-i%4*8;s.call(this,r,e)}else s.apply(this,arguments)}).prototype=P),function(){var t=U,n=t.lib.WordArray,t=t.enc;t.Utf16=t.Utf16BE={stringify:function(t){for(var e=t.words,r=t.sigBytes,i=[],n=0;n<r;n+=2){var o=e[n>>>2]>>>16-n%4*8&65535;i.push(String.fromCharCode(o))}return i.join(\"\")},parse:function(t){for(var e=t.length,r=[],i=0;i<e;i++)r[i>>>1]|=t.charCodeAt(i)<<16-i%2*16;return n.create(r,2*e)}};function s(t){return t<<8&4278255360|t>>>8&16711935}t.Utf16LE={stringify:function(t){for(var e=t.words,r=t.sigBytes,i=[],n=0;n<r;n+=2){var o=s(e[n>>>2]>>>16-n%4*8&65535);i.push(String.fromCharCode(o))}return i.join(\"\")},parse:function(t){for(var e=t.length,r=[],i=0;i<e;i++)r[i>>>1]|=s(t.charCodeAt(i)<<16-i%2*16);return n.create(r,2*e)}}}(),a=(w=U).lib.WordArray,w.enc.Base64={stringify:function(t){var e=t.words,r=t.sigBytes,i=this._map;t.clamp();for(var n=[],o=0;o<r;o+=3)for(var s=(e[o>>>2]>>>24-o%4*8&255)<<16|(e[o+1>>>2]>>>24-(o+1)%4*8&255)<<8|e[o+2>>>2]>>>24-(o+2)%4*8&255,c=0;c<4&&o+.75*c<r;c++)n.push(i.charAt(s>>>6*(3-c)&63));var a=i.charAt(64);if(a)for(;n.length%4;)n.push(a);return n.join(\"\")},parse:function(t){var e=t.length,r=this._map;if(!(i=this._reverseMap))for(var i=this._reverseMap=[],n=0;n<r.length;n++)i[r.charCodeAt(n)]=n;var o=r.charAt(64);return!o||-1!==(o=t.indexOf(o))&&(e=o),function(t,e,r){for(var i=[],n=0,o=0;o<e;o++){var s,c;o%4&&(s=r[t.charCodeAt(o-1)]<<o%4*2,c=r[t.charCodeAt(o)]>>>6-o%4*2,c=s|c,i[n>>>2]|=c<<24-n%4*8,n++)}return a.create(i,n)}(t,e,i)},_map:\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\"},h=(F=U).lib.WordArray,F.enc.Base64url={stringify:function(t,e=!0){var r=t.words,i=t.sigBytes,n=e?this._safe_map:this._map;t.clamp();for(var o=[],s=0;s<i;s+=3)for(var c=(r[s>>>2]>>>24-s%4*8&255)<<16|(r[s+1>>>2]>>>24-(s+1)%4*8&255)<<8|r[s+2>>>2]>>>24-(s+2)%4*8&255,a=0;a<4&&s+.75*a<i;a++)o.push(n.charAt(c>>>6*(3-a)&63));var h=n.charAt(64);if(h)for(;o.length%4;)o.push(h);return o.join(\"\")},parse:function(t,e=!0){var r=t.length,i=e?this._safe_map:this._map;if(!(n=this._reverseMap))for(var n=this._reverseMap=[],o=0;o<i.length;o++)n[i.charCodeAt(o)]=o;e=i.charAt(64);return!e||-1!==(e=t.indexOf(e))&&(r=e),function(t,e,r){for(var i=[],n=0,o=0;o<e;o++){var s,c;o%4&&(s=r[t.charCodeAt(o-1)]<<o%4*2,c=r[t.charCodeAt(o)]>>>6-o%4*2,c=s|c,i[n>>>2]|=c<<24-n%4*8,n++)}return h.create(i,n)}(t,r,n)},_map:\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\",_safe_map:\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_\"},function(a){var t=U,e=t.lib,r=e.WordArray,i=e.Hasher,e=t.algo,A=[];!function(){for(var t=0;t<64;t++)A[t]=4294967296*a.abs(a.sin(t+1))|0}();e=e.MD5=i.extend({_doReset:function(){this._hash=new r.init([1732584193,4023233417,2562383102,271733878])},_doProcessBlock:function(t,e){for(var r=0;r<16;r++){var i=e+r,n=t[i];t[i]=16711935&(n<<8|n>>>24)|4278255360&(n<<24|n>>>8)}var o=this._hash.words,s=t[e+0],c=t[e+1],a=t[e+2],h=t[e+3],l=t[e+4],f=t[e+5],d=t[e+6],u=t[e+7],p=t[e+8],_=t[e+9],y=t[e+10],v=t[e+11],g=t[e+12],B=t[e+13],w=t[e+14],k=t[e+15],m=H(m=o[0],b=o[1],x=o[2],S=o[3],s,7,A[0]),S=H(S,m,b,x,c,12,A[1]),x=H(x,S,m,b,a,17,A[2]),b=H(b,x,S,m,h,22,A[3]);m=H(m,b,x,S,l,7,A[4]),S=H(S,m,b,x,f,12,A[5]),x=H(x,S,m,b,d,17,A[6]),b=H(b,x,S,m,u,22,A[7]),m=H(m,b,x,S,p,7,A[8]),S=H(S,m,b,x,_,12,A[9]),x=H(x,S,m,b,y,17,A[10]),b=H(b,x,S,m,v,22,A[11]),m=H(m,b,x,S,g,7,A[12]),S=H(S,m,b,x,B,12,A[13]),x=H(x,S,m,b,w,17,A[14]),m=z(m,b=H(b,x,S,m,k,22,A[15]),x,S,c,5,A[16]),S=z(S,m,b,x,d,9,A[17]),x=z(x,S,m,b,v,14,A[18]),b=z(b,x,S,m,s,20,A[19]),m=z(m,b,x,S,f,5,A[20]),S=z(S,m,b,x,y,9,A[21]),x=z(x,S,m,b,k,14,A[22]),b=z(b,x,S,m,l,20,A[23]),m=z(m,b,x,S,_,5,A[24]),S=z(S,m,b,x,w,9,A[25]),x=z(x,S,m,b,h,14,A[26]),b=z(b,x,S,m,p,20,A[27]),m=z(m,b,x,S,B,5,A[28]),S=z(S,m,b,x,a,9,A[29]),x=z(x,S,m,b,u,14,A[30]),m=C(m,b=z(b,x,S,m,g,20,A[31]),x,S,f,4,A[32]),S=C(S,m,b,x,p,11,A[33]),x=C(x,S,m,b,v,16,A[34]),b=C(b,x,S,m,w,23,A[35]),m=C(m,b,x,S,c,4,A[36]),S=C(S,m,b,x,l,11,A[37]),x=C(x,S,m,b,u,16,A[38]),b=C(b,x,S,m,y,23,A[39]),m=C(m,b,x,S,B,4,A[40]),S=C(S,m,b,x,s,11,A[41]),x=C(x,S,m,b,h,16,A[42]),b=C(b,x,S,m,d,23,A[43]),m=C(m,b,x,S,_,4,A[44]),S=C(S,m,b,x,g,11,A[45]),x=C(x,S,m,b,k,16,A[46]),m=D(m,b=C(b,x,S,m,a,23,A[47]),x,S,s,6,A[48]),S=D(S,m,b,x,u,10,A[49]),x=D(x,S,m,b,w,15,A[50]),b=D(b,x,S,m,f,21,A[51]),m=D(m,b,x,S,g,6,A[52]),S=D(S,m,b,x,h,10,A[53]),x=D(x,S,m,b,y,15,A[54]),b=D(b,x,S,m,c,21,A[55]),m=D(m,b,x,S,p,6,A[56]),S=D(S,m,b,x,k,10,A[57]),x=D(x,S,m,b,d,15,A[58]),b=D(b,x,S,m,B,21,A[59]),m=D(m,b,x,S,l,6,A[60]),S=D(S,m,b,x,v,10,A[61]),x=D(x,S,m,b,a,15,A[62]),b=D(b,x,S,m,_,21,A[63]),o[0]=o[0]+m|0,o[1]=o[1]+b|0,o[2]=o[2]+x|0,o[3]=o[3]+S|0},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,i=8*t.sigBytes;e[i>>>5]|=128<<24-i%32;var n=a.floor(r/4294967296),r=r;e[15+(64+i>>>9<<4)]=16711935&(n<<8|n>>>24)|4278255360&(n<<24|n>>>8),e[14+(64+i>>>9<<4)]=16711935&(r<<8|r>>>24)|4278255360&(r<<24|r>>>8),t.sigBytes=4*(e.length+1),this._process();for(var e=this._hash,o=e.words,s=0;s<4;s++){var c=o[s];o[s]=16711935&(c<<8|c>>>24)|4278255360&(c<<24|c>>>8)}return e},clone:function(){var t=i.clone.call(this);return t._hash=this._hash.clone(),t}});function H(t,e,r,i,n,o,s){s=t+(e&r|~e&i)+n+s;return(s<<o|s>>>32-o)+e}function z(t,e,r,i,n,o,s){s=t+(e&i|r&~i)+n+s;return(s<<o|s>>>32-o)+e}function C(t,e,r,i,n,o,s){s=t+(e^r^i)+n+s;return(s<<o|s>>>32-o)+e}function D(t,e,r,i,n,o,s){s=t+(r^(e|~i))+n+s;return(s<<o|s>>>32-o)+e}t.MD5=i._createHelper(e),t.HmacMD5=i._createHmacHelper(e)}(Math),P=(M=U).lib,t=P.WordArray,e=P.Hasher,P=M.algo,l=[],P=P.SHA1=e.extend({_doReset:function(){this._hash=new t.init([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(t,e){for(var r=this._hash.words,i=r[0],n=r[1],o=r[2],s=r[3],c=r[4],a=0;a<80;a++){a<16?l[a]=0|t[e+a]:(h=l[a-3]^l[a-8]^l[a-14]^l[a-16],l[a]=h<<1|h>>>31);var h=(i<<5|i>>>27)+c+l[a];h+=a<20?1518500249+(n&o|~n&s):a<40?1859775393+(n^o^s):a<60?(n&o|n&s|o&s)-1894007588:(n^o^s)-899497514,c=s,s=o,o=n<<30|n>>>2,n=i,i=h}r[0]=r[0]+i|0,r[1]=r[1]+n|0,r[2]=r[2]+o|0,r[3]=r[3]+s|0,r[4]=r[4]+c|0},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,i=8*t.sigBytes;return e[i>>>5]|=128<<24-i%32,e[14+(64+i>>>9<<4)]=Math.floor(r/4294967296),e[15+(64+i>>>9<<4)]=r,t.sigBytes=4*e.length,this._process(),this._hash},clone:function(){var t=e.clone.call(this);return t._hash=this._hash.clone(),t}}),M.SHA1=e._createHelper(P),M.HmacSHA1=e._createHmacHelper(P),function(n){var t=U,e=t.lib,r=e.WordArray,i=e.Hasher,e=t.algo,o=[],p=[];!function(){function t(t){return 4294967296*(t-(0|t))|0}for(var e=2,r=0;r<64;)!function(t){for(var e=n.sqrt(t),r=2;r<=e;r++)if(!(t%r))return;return 1}(e)||(r<8&&(o[r]=t(n.pow(e,.5))),p[r]=t(n.pow(e,1/3)),r++),e++}();var _=[],e=e.SHA256=i.extend({_doReset:function(){this._hash=new r.init(o.slice(0))},_doProcessBlock:function(t,e){for(var r=this._hash.words,i=r[0],n=r[1],o=r[2],s=r[3],c=r[4],a=r[5],h=r[6],l=r[7],f=0;f<64;f++){f<16?_[f]=0|t[e+f]:(d=_[f-15],u=_[f-2],_[f]=((d<<25|d>>>7)^(d<<14|d>>>18)^d>>>3)+_[f-7]+((u<<15|u>>>17)^(u<<13|u>>>19)^u>>>10)+_[f-16]);var d=i&n^i&o^n&o,u=l+((c<<26|c>>>6)^(c<<21|c>>>11)^(c<<7|c>>>25))+(c&a^~c&h)+p[f]+_[f],l=h,h=a,a=c,c=s+u|0,s=o,o=n,n=i,i=u+(((i<<30|i>>>2)^(i<<19|i>>>13)^(i<<10|i>>>22))+d)|0}r[0]=r[0]+i|0,r[1]=r[1]+n|0,r[2]=r[2]+o|0,r[3]=r[3]+s|0,r[4]=r[4]+c|0,r[5]=r[5]+a|0,r[6]=r[6]+h|0,r[7]=r[7]+l|0},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,i=8*t.sigBytes;return e[i>>>5]|=128<<24-i%32,e[14+(64+i>>>9<<4)]=n.floor(r/4294967296),e[15+(64+i>>>9<<4)]=r,t.sigBytes=4*e.length,this._process(),this._hash},clone:function(){var t=i.clone.call(this);return t._hash=this._hash.clone(),t}});t.SHA256=i._createHelper(e),t.HmacSHA256=i._createHmacHelper(e)}(Math),r=(w=U).lib.WordArray,F=w.algo,i=F.SHA256,F=F.SHA224=i.extend({_doReset:function(){this._hash=new r.init([3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428])},_doFinalize:function(){var t=i._doFinalize.call(this);return t.sigBytes-=4,t}}),w.SHA224=i._createHelper(F),w.HmacSHA224=i._createHmacHelper(F),function(){var t=U,e=t.lib.Hasher,r=t.x64,i=r.Word,n=r.WordArray,r=t.algo;function o(){return i.create.apply(i,arguments)}var t1=[o(1116352408,3609767458),o(1899447441,602891725),o(3049323471,3964484399),o(3921009573,2173295548),o(961987163,4081628472),o(1508970993,3053834265),o(2453635748,2937671579),o(2870763221,3664609560),o(3624381080,2734883394),o(310598401,1164996542),o(607225278,1323610764),o(1426881987,3590304994),o(1925078388,4068182383),o(2162078206,991336113),o(2614888103,633803317),o(3248222580,3479774868),o(3835390401,2666613458),o(4022224774,944711139),o(264347078,2341262773),o(604807628,2007800933),o(770255983,1495990901),o(1249150122,1856431235),o(1555081692,3175218132),o(1996064986,2198950837),o(2554220882,3999719339),o(2821834349,766784016),o(2952996808,2566594879),o(3210313671,3203337956),o(3336571891,1034457026),o(3584528711,2466948901),o(113926993,3758326383),o(338241895,168717936),o(666307205,1188179964),o(773529912,1546045734),o(1294757372,1522805485),o(1396182291,2643833823),o(1695183700,2343527390),o(1986661051,1014477480),o(2177026350,1206759142),o(2456956037,344077627),o(2730485921,1290863460),o(2820302411,3158454273),o(3259730800,3505952657),o(3345764771,106217008),o(3516065817,3606008344),o(3600352804,1432725776),o(4094571909,1467031594),o(275423344,851169720),o(430227734,3100823752),o(506948616,1363258195),o(659060556,3750685593),o(883997877,3785050280),o(958139571,3318307427),o(1322822218,3812723403),o(1537002063,2003034995),o(1747873779,3602036899),o(1955562222,1575990012),o(2024104815,1125592928),o(2227730452,2716904306),o(2361852424,442776044),o(2428436474,593698344),o(2756734187,3733110249),o(3204031479,2999351573),o(3329325298,3815920427),o(3391569614,3928383900),o(3515267271,566280711),o(3940187606,3454069534),o(4118630271,4000239992),o(116418474,1914138554),o(174292421,2731055270),o(289380356,3203993006),o(460393269,320620315),o(685471733,587496836),o(852142971,1086792851),o(1017036298,365543100),o(1126000580,2618297676),o(1288033470,3409855158),o(1501505948,4234509866),o(1607167915,987167468),o(1816402316,1246189591)],e1=[];!function(){for(var t=0;t<80;t++)e1[t]=o()}();r=r.SHA512=e.extend({_doReset:function(){this._hash=new n.init([new i.init(1779033703,4089235720),new i.init(3144134277,2227873595),new i.init(1013904242,4271175723),new i.init(2773480762,1595750129),new i.init(1359893119,2917565137),new i.init(2600822924,725511199),new i.init(528734635,4215389547),new i.init(1541459225,327033209)])},_doProcessBlock:function(t,e){for(var r=this._hash.words,i=r[0],n=r[1],o=r[2],s=r[3],c=r[4],a=r[5],h=r[6],l=r[7],f=i.high,d=i.low,u=n.high,p=n.low,_=o.high,y=o.low,v=s.high,g=s.low,B=c.high,w=c.low,k=a.high,m=a.low,S=h.high,x=h.low,b=l.high,r=l.low,A=f,H=d,z=u,C=p,D=_,E=y,R=v,M=g,F=B,P=w,W=k,O=m,I=S,U=x,K=b,X=r,L=0;L<80;L++){var j,T,N=e1[L];L<16?(T=N.high=0|t[e+2*L],j=N.low=0|t[e+2*L+1]):($=(q=e1[L-15]).high,J=q.low,G=(Q=e1[L-2]).high,V=Q.low,Z=(Y=e1[L-7]).high,q=Y.low,Y=(Q=e1[L-16]).high,T=(T=(($>>>1|J<<31)^($>>>8|J<<24)^$>>>7)+Z+((j=(Z=(J>>>1|$<<31)^(J>>>8|$<<24)^(J>>>7|$<<25))+q)>>>0<Z>>>0?1:0))+((G>>>19|V<<13)^(G<<3|V>>>29)^G>>>6)+((j+=J=(V>>>19|G<<13)^(V<<3|G>>>29)^(V>>>6|G<<26))>>>0<J>>>0?1:0),j+=$=Q.low,N.high=T=T+Y+(j>>>0<$>>>0?1:0),N.low=j);var q=F&W^~F&I,Z=P&O^~P&U,V=A&z^A&D^z&D,G=(H>>>28|A<<4)^(H<<30|A>>>2)^(H<<25|A>>>7),J=t1[L],Q=J.high,Y=J.low,$=X+((P>>>14|F<<18)^(P>>>18|F<<14)^(P<<23|F>>>9)),N=K+((F>>>14|P<<18)^(F>>>18|P<<14)^(F<<23|P>>>9))+($>>>0<X>>>0?1:0),J=G+(H&C^H&E^C&E),K=I,X=U,I=W,U=O,W=F,O=P,F=R+(N=(N=(N=N+q+(($=$+Z)>>>0<Z>>>0?1:0))+Q+(($=$+Y)>>>0<Y>>>0?1:0))+T+(($=$+j)>>>0<j>>>0?1:0))+((P=M+$|0)>>>0<M>>>0?1:0)|0,R=D,M=E,D=z,E=C,z=A,C=H,A=N+(((A>>>28|H<<4)^(A<<30|H>>>2)^(A<<25|H>>>7))+V+(J>>>0<G>>>0?1:0))+((H=$+J|0)>>>0<$>>>0?1:0)|0}d=i.low=d+H,i.high=f+A+(d>>>0<H>>>0?1:0),p=n.low=p+C,n.high=u+z+(p>>>0<C>>>0?1:0),y=o.low=y+E,o.high=_+D+(y>>>0<E>>>0?1:0),g=s.low=g+M,s.high=v+R+(g>>>0<M>>>0?1:0),w=c.low=w+P,c.high=B+F+(w>>>0<P>>>0?1:0),m=a.low=m+O,a.high=k+W+(m>>>0<O>>>0?1:0),x=h.low=x+U,h.high=S+I+(x>>>0<U>>>0?1:0),r=l.low=r+X,l.high=b+K+(r>>>0<X>>>0?1:0)},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,i=8*t.sigBytes;return e[i>>>5]|=128<<24-i%32,e[30+(128+i>>>10<<5)]=Math.floor(r/4294967296),e[31+(128+i>>>10<<5)]=r,t.sigBytes=4*e.length,this._process(),this._hash.toX32()},clone:function(){var t=e.clone.call(this);return t._hash=this._hash.clone(),t},blockSize:32});t.SHA512=e._createHelper(r),t.HmacSHA512=e._createHmacHelper(r)}(),P=(M=U).x64,c=P.Word,f=P.WordArray,P=M.algo,d=P.SHA512,P=P.SHA384=d.extend({_doReset:function(){this._hash=new f.init([new c.init(3418070365,3238371032),new c.init(1654270250,914150663),new c.init(2438529370,812702999),new c.init(355462360,4144912697),new c.init(1731405415,4290775857),new c.init(2394180231,1750603025),new c.init(3675008525,1694076839),new c.init(1203062813,3204075428)])},_doFinalize:function(){var t=d._doFinalize.call(this);return t.sigBytes-=16,t}}),M.SHA384=d._createHelper(P),M.HmacSHA384=d._createHmacHelper(P),function(l){var t=U,e=t.lib,f=e.WordArray,i=e.Hasher,d=t.x64.Word,e=t.algo,A=[],H=[],z=[];!function(){for(var t=1,e=0,r=0;r<24;r++){A[t+5*e]=(r+1)*(r+2)/2%64;var i=(2*t+3*e)%5;t=e%5,e=i}for(t=0;t<5;t++)for(e=0;e<5;e++)H[t+5*e]=e+(2*t+3*e)%5*5;for(var n=1,o=0;o<24;o++){for(var s,c=0,a=0,h=0;h<7;h++)1&n&&((s=(1<<h)-1)<32?a^=1<<s:c^=1<<s-32),128&n?n=n<<1^113:n<<=1;z[o]=d.create(c,a)}}();var C=[];!function(){for(var t=0;t<25;t++)C[t]=d.create()}();e=e.SHA3=i.extend({cfg:i.cfg.extend({outputLength:512}),_doReset:function(){for(var t=this._state=[],e=0;e<25;e++)t[e]=new d.init;this.blockSize=(1600-2*this.cfg.outputLength)/32},_doProcessBlock:function(t,e){for(var r=this._state,i=this.blockSize/2,n=0;n<i;n++){var o=t[e+2*n],s=t[e+2*n+1],o=16711935&(o<<8|o>>>24)|4278255360&(o<<24|o>>>8);(m=r[n]).high^=s=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8),m.low^=o}for(var c=0;c<24;c++){for(var a=0;a<5;a++){for(var h=0,l=0,f=0;f<5;f++)h^=(m=r[a+5*f]).high,l^=m.low;var d=C[a];d.high=h,d.low=l}for(a=0;a<5;a++)for(var u=C[(a+4)%5],p=C[(a+1)%5],_=p.high,p=p.low,h=u.high^(_<<1|p>>>31),l=u.low^(p<<1|_>>>31),f=0;f<5;f++)(m=r[a+5*f]).high^=h,m.low^=l;for(var y=1;y<25;y++){var v=(m=r[y]).high,g=m.low,B=A[y];l=B<32?(h=v<<B|g>>>32-B,g<<B|v>>>32-B):(h=g<<B-32|v>>>64-B,v<<B-32|g>>>64-B);B=C[H[y]];B.high=h,B.low=l}var w=C[0],k=r[0];w.high=k.high,w.low=k.low;for(a=0;a<5;a++)for(f=0;f<5;f++){var m=r[y=a+5*f],S=C[y],x=C[(a+1)%5+5*f],b=C[(a+2)%5+5*f];m.high=S.high^~x.high&b.high,m.low=S.low^~x.low&b.low}m=r[0],k=z[c];m.high^=k.high,m.low^=k.low}},_doFinalize:function(){var t=this._data,e=t.words,r=(this._nDataBytes,8*t.sigBytes),i=32*this.blockSize;e[r>>>5]|=1<<24-r%32,e[(l.ceil((1+r)/i)*i>>>5)-1]|=128,t.sigBytes=4*e.length,this._process();for(var n=this._state,e=this.cfg.outputLength/8,o=e/8,s=[],c=0;c<o;c++){var a=n[c],h=a.high,a=a.low,h=16711935&(h<<8|h>>>24)|4278255360&(h<<24|h>>>8);s.push(a=16711935&(a<<8|a>>>24)|4278255360&(a<<24|a>>>8)),s.push(h)}return new f.init(s,e)},clone:function(){for(var t=i.clone.call(this),e=t._state=this._state.slice(0),r=0;r<25;r++)e[r]=e[r].clone();return t}});t.SHA3=i._createHelper(e),t.HmacSHA3=i._createHmacHelper(e)}(Math),Math,F=(w=U).lib,u=F.WordArray,p=F.Hasher,F=w.algo,S=u.create([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13]),x=u.create([5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11]),b=u.create([11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6]),A=u.create([8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11]),H=u.create([0,1518500249,1859775393,2400959708,2840853838]),z=u.create([1352829926,1548603684,1836072691,2053994217,0]),F=F.RIPEMD160=p.extend({_doReset:function(){this._hash=u.create([1732584193,4023233417,2562383102,271733878,3285377520])},_doProcessBlock:function(t,e){for(var r=0;r<16;r++){var i=e+r,n=t[i];t[i]=16711935&(n<<8|n>>>24)|4278255360&(n<<24|n>>>8)}for(var o,s,c,a,h,l,f=this._hash.words,d=H.words,u=z.words,p=S.words,_=x.words,y=b.words,v=A.words,g=o=f[0],B=s=f[1],w=c=f[2],k=a=f[3],m=h=f[4],r=0;r<80;r+=1)l=o+t[e+p[r]]|0,l+=r<16?(s^c^a)+d[0]:r<32?K(s,c,a)+d[1]:r<48?((s|~c)^a)+d[2]:r<64?X(s,c,a)+d[3]:(s^(c|~a))+d[4],l=(l=L(l|=0,y[r]))+h|0,o=h,h=a,a=L(c,10),c=s,s=l,l=g+t[e+_[r]]|0,l+=r<16?(B^(w|~k))+u[0]:r<32?X(B,w,k)+u[1]:r<48?((B|~w)^k)+u[2]:r<64?K(B,w,k)+u[3]:(B^w^k)+u[4],l=(l=L(l|=0,v[r]))+m|0,g=m,m=k,k=L(w,10),w=B,B=l;l=f[1]+c+k|0,f[1]=f[2]+a+m|0,f[2]=f[3]+h+g|0,f[3]=f[4]+o+B|0,f[4]=f[0]+s+w|0,f[0]=l},_doFinalize:function(){var t=this._data,e=t.words,r=8*this._nDataBytes,i=8*t.sigBytes;e[i>>>5]|=128<<24-i%32,e[14+(64+i>>>9<<4)]=16711935&(r<<8|r>>>24)|4278255360&(r<<24|r>>>8),t.sigBytes=4*(e.length+1),this._process();for(var e=this._hash,n=e.words,o=0;o<5;o++){var s=n[o];n[o]=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8)}return e},clone:function(){var t=p.clone.call(this);return t._hash=this._hash.clone(),t}}),w.RIPEMD160=p._createHelper(F),w.HmacRIPEMD160=p._createHmacHelper(F),P=(M=U).lib.Base,_=M.enc.Utf8,M.algo.HMAC=P.extend({init:function(t,e){t=this._hasher=new t.init,\"string\"==typeof e&&(e=_.parse(e));var r=t.blockSize,i=4*r;(e=e.sigBytes>i?t.finalize(e):e).clamp();for(var t=this._oKey=e.clone(),e=this._iKey=e.clone(),n=t.words,o=e.words,s=0;s<r;s++)n[s]^=1549556828,o[s]^=909522486;t.sigBytes=e.sigBytes=i,this.reset()},reset:function(){var t=this._hasher;t.reset(),t.update(this._iKey)},update:function(t){return this._hasher.update(t),this},finalize:function(t){var e=this._hasher,t=e.finalize(t);return e.reset(),e.finalize(this._oKey.clone().concat(t))}}),F=(w=U).lib,M=F.Base,v=F.WordArray,P=w.algo,F=P.SHA1,g=P.HMAC,y=P.PBKDF2=M.extend({cfg:M.extend({keySize:4,hasher:F,iterations:1}),init:function(t){this.cfg=this.cfg.extend(t)},compute:function(t,e){for(var r=this.cfg,i=g.create(r.hasher,t),n=v.create(),o=v.create([1]),s=n.words,c=o.words,a=r.keySize,h=r.iterations;s.length<a;){var l=i.update(e).finalize(o);i.reset();for(var f=l.words,d=f.length,u=l,p=1;p<h;p++){u=i.finalize(u),i.reset();for(var _=u.words,y=0;y<d;y++)f[y]^=_[y]}n.concat(l),c[0]++}return n.sigBytes=4*a,n}}),w.PBKDF2=function(t,e,r){return y.create(r).compute(t,e)},M=(P=U).lib,F=M.Base,B=M.WordArray,w=P.algo,M=w.MD5,k=w.EvpKDF=F.extend({cfg:F.extend({keySize:4,hasher:M,iterations:1}),init:function(t){this.cfg=this.cfg.extend(t)},compute:function(t,e){for(var r,i=this.cfg,n=i.hasher.create(),o=B.create(),s=o.words,c=i.keySize,a=i.iterations;s.length<c;){r&&n.update(r),r=n.update(t).finalize(e),n.reset();for(var h=1;h<a;h++)r=n.finalize(r),n.reset();o.concat(r)}return o.sigBytes=4*c,o}}),P.EvpKDF=function(t,e,r){return k.create(r).compute(t,e)},U.lib.Cipher||function(){var t=U,e=t.lib,r=e.Base,s=e.WordArray,i=e.BufferedBlockAlgorithm,n=t.enc,o=(n.Utf8,n.Base64),c=t.algo.EvpKDF,a=e.Cipher=i.extend({cfg:r.extend(),createEncryptor:function(t,e){return this.create(this._ENC_XFORM_MODE,t,e)},createDecryptor:function(t,e){return this.create(this._DEC_XFORM_MODE,t,e)},init:function(t,e,r){this.cfg=this.cfg.extend(r),this._xformMode=t,this._key=e,this.reset()},reset:function(){i.reset.call(this),this._doReset()},process:function(t){return this._append(t),this._process()},finalize:function(t){return t&&this._append(t),this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(i){return{encrypt:function(t,e,r){return h(e).encrypt(i,t,e,r)},decrypt:function(t,e,r){return h(e).decrypt(i,t,e,r)}}}});function h(t){return\"string\"==typeof t?p:u}e.StreamCipher=a.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var l=t.mode={},n=e.BlockCipherMode=r.extend({createEncryptor:function(t,e){return this.Encryptor.create(t,e)},createDecryptor:function(t,e){return this.Decryptor.create(t,e)},init:function(t,e){this._cipher=t,this._iv=e}}),n=l.CBC=((l=n.extend()).Encryptor=l.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize;f.call(this,t,e,i),r.encryptBlock(t,e),this._prevBlock=t.slice(e,e+i)}}),l.Decryptor=l.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize,n=t.slice(e,e+i);r.decryptBlock(t,e),f.call(this,t,e,i),this._prevBlock=n}}),l);function f(t,e,r){var i,n=this._iv;n?(i=n,this._iv=void 0):i=this._prevBlock;for(var o=0;o<r;o++)t[e+o]^=i[o]}var l=(t.pad={}).Pkcs7={pad:function(t,e){for(var e=4*e,r=e-t.sigBytes%e,i=r<<24|r<<16|r<<8|r,n=[],o=0;o<r;o+=4)n.push(i);e=s.create(n,r);t.concat(e)},unpad:function(t){var e=255&t.words[t.sigBytes-1>>>2];t.sigBytes-=e}},d=(e.BlockCipher=a.extend({cfg:a.cfg.extend({mode:n,padding:l}),reset:function(){var t;a.reset.call(this);var e=this.cfg,r=e.iv,e=e.mode;this._xformMode==this._ENC_XFORM_MODE?t=e.createEncryptor:(t=e.createDecryptor,this._minBufferSize=1),this._mode&&this._mode.__creator==t?this._mode.init(this,r&&r.words):(this._mode=t.call(e,this,r&&r.words),this._mode.__creator=t)},_doProcessBlock:function(t,e){this._mode.processBlock(t,e)},_doFinalize:function(){var t,e=this.cfg.padding;return this._xformMode==this._ENC_XFORM_MODE?(e.pad(this._data,this.blockSize),t=this._process(!0)):(t=this._process(!0),e.unpad(t)),t},blockSize:4}),e.CipherParams=r.extend({init:function(t){this.mixIn(t)},toString:function(t){return(t||this.formatter).stringify(this)}})),l=(t.format={}).OpenSSL={stringify:function(t){var e=t.ciphertext,t=t.salt,e=t?s.create([1398893684,1701076831]).concat(t).concat(e):e;return e.toString(o)},parse:function(t){var e,r=o.parse(t),t=r.words;return 1398893684==t[0]&&1701076831==t[1]&&(e=s.create(t.slice(2,4)),t.splice(0,4),r.sigBytes-=16),d.create({ciphertext:r,salt:e})}},u=e.SerializableCipher=r.extend({cfg:r.extend({format:l}),encrypt:function(t,e,r,i){i=this.cfg.extend(i);var n=t.createEncryptor(r,i),e=n.finalize(e),n=n.cfg;return d.create({ciphertext:e,key:r,iv:n.iv,algorithm:t,mode:n.mode,padding:n.padding,blockSize:t.blockSize,formatter:i.format})},decrypt:function(t,e,r,i){return i=this.cfg.extend(i),e=this._parse(e,i.format),t.createDecryptor(r,i).finalize(e.ciphertext)},_parse:function(t,e){return\"string\"==typeof t?e.parse(t,this):t}}),t=(t.kdf={}).OpenSSL={execute:function(t,e,r,i){i=i||s.random(8);t=c.create({keySize:e+r}).compute(t,i),r=s.create(t.words.slice(e),4*r);return t.sigBytes=4*e,d.create({key:t,iv:r,salt:i})}},p=e.PasswordBasedCipher=u.extend({cfg:u.cfg.extend({kdf:t}),encrypt:function(t,e,r,i){r=(i=this.cfg.extend(i)).kdf.execute(r,t.keySize,t.ivSize);i.iv=r.iv;i=u.encrypt.call(this,t,e,r.key,i);return i.mixIn(r),i},decrypt:function(t,e,r,i){i=this.cfg.extend(i),e=this._parse(e,i.format);r=i.kdf.execute(r,t.keySize,t.ivSize,e.salt);return i.iv=r.iv,u.decrypt.call(this,t,e,r.key,i)}})}(),U.mode.CFB=((F=U.lib.BlockCipherMode.extend()).Encryptor=F.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize;j.call(this,t,e,i,r),this._prevBlock=t.slice(e,e+i)}}),F.Decryptor=F.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize,n=t.slice(e,e+i);j.call(this,t,e,i,r),this._prevBlock=n}}),F),U.mode.CTR=(M=U.lib.BlockCipherMode.extend(),P=M.Encryptor=M.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize,n=this._iv,o=this._counter;n&&(o=this._counter=n.slice(0),this._iv=void 0);var s=o.slice(0);r.encryptBlock(s,0),o[i-1]=o[i-1]+1|0;for(var c=0;c<i;c++)t[e+c]^=s[c]}}),M.Decryptor=P,M),U.mode.CTRGladman=(F=U.lib.BlockCipherMode.extend(),P=F.Encryptor=F.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize,n=this._iv,o=this._counter;n&&(o=this._counter=n.slice(0),this._iv=void 0),0===((n=o)[0]=T(n[0]))&&(n[1]=T(n[1]));var s=o.slice(0);r.encryptBlock(s,0);for(var c=0;c<i;c++)t[e+c]^=s[c]}}),F.Decryptor=P,F),U.mode.OFB=(M=U.lib.BlockCipherMode.extend(),P=M.Encryptor=M.extend({processBlock:function(t,e){var r=this._cipher,i=r.blockSize,n=this._iv,o=this._keystream;n&&(o=this._keystream=n.slice(0),this._iv=void 0),r.encryptBlock(o,0);for(var s=0;s<i;s++)t[e+s]^=o[s]}}),M.Decryptor=P,M),U.mode.ECB=((F=U.lib.BlockCipherMode.extend()).Encryptor=F.extend({processBlock:function(t,e){this._cipher.encryptBlock(t,e)}}),F.Decryptor=F.extend({processBlock:function(t,e){this._cipher.decryptBlock(t,e)}}),F),U.pad.AnsiX923={pad:function(t,e){var r=t.sigBytes,e=4*e,e=e-r%e,r=r+e-1;t.clamp(),t.words[r>>>2]|=e<<24-r%4*8,t.sigBytes+=e},unpad:function(t){var e=255&t.words[t.sigBytes-1>>>2];t.sigBytes-=e}},U.pad.Iso10126={pad:function(t,e){e*=4,e-=t.sigBytes%e;t.concat(U.lib.WordArray.random(e-1)).concat(U.lib.WordArray.create([e<<24],1))},unpad:function(t){var e=255&t.words[t.sigBytes-1>>>2];t.sigBytes-=e}},U.pad.Iso97971={pad:function(t,e){t.concat(U.lib.WordArray.create([2147483648],1)),U.pad.ZeroPadding.pad(t,e)},unpad:function(t){U.pad.ZeroPadding.unpad(t),t.sigBytes--}},U.pad.ZeroPadding={pad:function(t,e){e*=4;t.clamp(),t.sigBytes+=e-(t.sigBytes%e||e)},unpad:function(t){for(var e=t.words,r=t.sigBytes-1,r=t.sigBytes-1;0<=r;r--)if(e[r>>>2]>>>24-r%4*8&255){t.sigBytes=r+1;break}}},U.pad.NoPadding={pad:function(){},unpad:function(){}},m=(P=U).lib.CipherParams,C=P.enc.Hex,P.format.Hex={stringify:function(t){return t.ciphertext.toString(C)},parse:function(t){t=C.parse(t);return m.create({ciphertext:t})}},function(){var t=U,e=t.lib.BlockCipher,r=t.algo,h=[],l=[],f=[],d=[],u=[],p=[],_=[],y=[],v=[],g=[];!function(){for(var t=[],e=0;e<256;e++)t[e]=e<128?e<<1:e<<1^283;for(var r=0,i=0,e=0;e<256;e++){var n=i^i<<1^i<<2^i<<3^i<<4;h[r]=n=n>>>8^255&n^99;var o=t[l[n]=r],s=t[o],c=t[s],a=257*t[n]^16843008*n;f[r]=a<<24|a>>>8,d[r]=a<<16|a>>>16,u[r]=a<<8|a>>>24,p[r]=a,_[n]=(a=16843009*c^65537*s^257*o^16843008*r)<<24|a>>>8,y[n]=a<<16|a>>>16,v[n]=a<<8|a>>>24,g[n]=a,r?(r=o^t[t[t[c^o]]],i^=t[t[i]]):r=i=1}}();var B=[0,1,2,4,8,16,32,64,128,27,54],r=r.AES=e.extend({_doReset:function(){if(!this._nRounds||this._keyPriorReset!==this._key){for(var t=this._keyPriorReset=this._key,e=t.words,r=t.sigBytes/4,i=4*(1+(this._nRounds=6+r)),n=this._keySchedule=[],o=0;o<i;o++)o<r?n[o]=e[o]:(a=n[o-1],o%r?6<r&&o%r==4&&(a=h[a>>>24]<<24|h[a>>>16&255]<<16|h[a>>>8&255]<<8|h[255&a]):(a=h[(a=a<<8|a>>>24)>>>24]<<24|h[a>>>16&255]<<16|h[a>>>8&255]<<8|h[255&a],a^=B[o/r|0]<<24),n[o]=n[o-r]^a);for(var s=this._invKeySchedule=[],c=0;c<i;c++){var a,o=i-c;a=c%4?n[o]:n[o-4],s[c]=c<4||o<=4?a:_[h[a>>>24]]^y[h[a>>>16&255]]^v[h[a>>>8&255]]^g[h[255&a]]}}},encryptBlock:function(t,e){this._doCryptBlock(t,e,this._keySchedule,f,d,u,p,h)},decryptBlock:function(t,e){var r=t[e+1];t[e+1]=t[e+3],t[e+3]=r,this._doCryptBlock(t,e,this._invKeySchedule,_,y,v,g,l);r=t[e+1];t[e+1]=t[e+3],t[e+3]=r},_doCryptBlock:function(t,e,r,i,n,o,s,c){for(var a=this._nRounds,h=t[e]^r[0],l=t[e+1]^r[1],f=t[e+2]^r[2],d=t[e+3]^r[3],u=4,p=1;p<a;p++)var _=i[h>>>24]^n[l>>>16&255]^o[f>>>8&255]^s[255&d]^r[u++],y=i[l>>>24]^n[f>>>16&255]^o[d>>>8&255]^s[255&h]^r[u++],v=i[f>>>24]^n[d>>>16&255]^o[h>>>8&255]^s[255&l]^r[u++],g=i[d>>>24]^n[h>>>16&255]^o[l>>>8&255]^s[255&f]^r[u++],h=_,l=y,f=v,d=g;_=(c[h>>>24]<<24|c[l>>>16&255]<<16|c[f>>>8&255]<<8|c[255&d])^r[u++],y=(c[l>>>24]<<24|c[f>>>16&255]<<16|c[d>>>8&255]<<8|c[255&h])^r[u++],v=(c[f>>>24]<<24|c[d>>>16&255]<<16|c[h>>>8&255]<<8|c[255&l])^r[u++],g=(c[d>>>24]<<24|c[h>>>16&255]<<16|c[l>>>8&255]<<8|c[255&f])^r[u++];t[e]=_,t[e+1]=y,t[e+2]=v,t[e+3]=g},keySize:8});t.AES=e._createHelper(r)}(),function(){var t=U,e=t.lib,i=e.WordArray,r=e.BlockCipher,e=t.algo,h=[57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4],l=[14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32],f=[1,2,4,6,8,10,12,14,15,17,19,21,23,25,27,28],d=[{0:8421888,268435456:32768,536870912:8421378,805306368:2,1073741824:512,1342177280:8421890,1610612736:8389122,1879048192:8388608,2147483648:514,2415919104:8389120,2684354560:33280,2952790016:8421376,3221225472:32770,3489660928:8388610,3758096384:0,4026531840:33282,134217728:0,402653184:8421890,671088640:33282,939524096:32768,1207959552:8421888,1476395008:512,1744830464:8421378,2013265920:2,2281701376:8389120,2550136832:33280,2818572288:8421376,3087007744:8389122,3355443200:8388610,3623878656:32770,3892314112:514,4160749568:8388608,1:32768,268435457:2,536870913:8421888,805306369:8388608,1073741825:8421378,1342177281:33280,1610612737:512,1879048193:8389122,2147483649:8421890,2415919105:8421376,2684354561:8388610,2952790017:33282,3221225473:514,3489660929:8389120,3758096385:32770,4026531841:0,134217729:8421890,402653185:8421376,671088641:8388608,939524097:512,1207959553:32768,1476395009:8388610,1744830465:2,2013265921:33282,2281701377:32770,2550136833:8389122,2818572289:514,3087007745:8421888,3355443201:8389120,3623878657:0,3892314113:33280,4160749569:8421378},{0:1074282512,16777216:16384,33554432:524288,50331648:1074266128,67108864:1073741840,83886080:1074282496,100663296:1073758208,117440512:16,134217728:540672,150994944:1073758224,167772160:1073741824,184549376:540688,201326592:524304,218103808:0,234881024:16400,251658240:1074266112,8388608:1073758208,25165824:540688,41943040:16,58720256:1073758224,75497472:1074282512,92274688:1073741824,109051904:524288,125829120:1074266128,142606336:524304,159383552:0,176160768:16384,192937984:1074266112,209715200:1073741840,226492416:540672,243269632:1074282496,260046848:16400,268435456:0,285212672:1074266128,301989888:1073758224,318767104:1074282496,335544320:1074266112,352321536:16,369098752:540688,385875968:16384,402653184:16400,419430400:524288,436207616:524304,452984832:1073741840,469762048:540672,486539264:1073758208,503316480:1073741824,520093696:1074282512,276824064:540688,293601280:524288,310378496:1074266112,327155712:16384,343932928:1073758208,360710144:1074282512,377487360:16,394264576:1073741824,411041792:1074282496,427819008:1073741840,444596224:1073758224,461373440:524304,478150656:0,494927872:16400,511705088:1074266128,528482304:540672},{0:260,1048576:0,2097152:67109120,3145728:65796,4194304:65540,5242880:67108868,6291456:67174660,7340032:67174400,8388608:67108864,9437184:67174656,10485760:65792,11534336:67174404,12582912:67109124,13631488:65536,14680064:4,15728640:256,524288:67174656,1572864:67174404,2621440:0,3670016:67109120,4718592:67108868,5767168:65536,6815744:65540,7864320:260,8912896:4,9961472:256,11010048:67174400,12058624:65796,13107200:65792,14155776:67109124,15204352:67174660,16252928:67108864,16777216:67174656,17825792:65540,18874368:65536,19922944:67109120,20971520:256,22020096:67174660,23068672:67108868,24117248:0,25165824:67109124,26214400:67108864,27262976:4,28311552:65792,29360128:67174400,30408704:260,31457280:65796,32505856:67174404,17301504:67108864,18350080:260,19398656:67174656,20447232:0,21495808:65540,22544384:67109120,23592960:256,24641536:67174404,25690112:65536,26738688:67174660,27787264:65796,28835840:67108868,29884416:67109124,30932992:67174400,31981568:4,33030144:65792},{0:2151682048,65536:2147487808,131072:4198464,196608:2151677952,262144:0,327680:4198400,393216:2147483712,458752:4194368,524288:2147483648,589824:4194304,655360:64,720896:2147487744,786432:2151678016,851968:4160,917504:4096,983040:2151682112,32768:2147487808,98304:64,163840:2151678016,229376:2147487744,294912:4198400,360448:2151682112,425984:0,491520:2151677952,557056:4096,622592:2151682048,688128:4194304,753664:4160,819200:2147483648,884736:4194368,950272:4198464,1015808:2147483712,1048576:4194368,1114112:4198400,1179648:2147483712,1245184:0,1310720:4160,1376256:2151678016,1441792:2151682048,1507328:2147487808,1572864:2151682112,1638400:2147483648,1703936:2151677952,1769472:4198464,1835008:2147487744,1900544:4194304,1966080:64,2031616:4096,1081344:2151677952,1146880:2151682112,1212416:0,1277952:4198400,1343488:4194368,1409024:2147483648,1474560:2147487808,1540096:64,1605632:2147483712,1671168:4096,1736704:2147487744,1802240:2151678016,1867776:4160,1933312:2151682048,1998848:4194304,2064384:4198464},{0:128,4096:17039360,8192:262144,12288:536870912,16384:537133184,20480:16777344,24576:553648256,28672:262272,32768:16777216,36864:537133056,40960:536871040,45056:553910400,49152:553910272,53248:0,57344:17039488,61440:553648128,2048:17039488,6144:553648256,10240:128,14336:17039360,18432:262144,22528:537133184,26624:553910272,30720:536870912,34816:537133056,38912:0,43008:553910400,47104:16777344,51200:536871040,55296:553648128,59392:16777216,63488:262272,65536:262144,69632:128,73728:536870912,77824:553648256,81920:16777344,86016:553910272,90112:537133184,94208:16777216,98304:553910400,102400:553648128,106496:17039360,110592:537133056,114688:262272,118784:536871040,122880:0,126976:17039488,67584:553648256,71680:16777216,75776:17039360,79872:537133184,83968:536870912,88064:17039488,92160:128,96256:553910272,100352:262272,104448:553910400,108544:0,112640:553648128,116736:16777344,120832:262144,124928:537133056,129024:536871040},{0:268435464,256:8192,512:270532608,768:270540808,1024:268443648,1280:2097152,1536:2097160,1792:268435456,2048:0,2304:268443656,2560:2105344,2816:8,3072:270532616,3328:2105352,3584:8200,3840:270540800,128:270532608,384:270540808,640:8,896:2097152,1152:2105352,1408:268435464,1664:268443648,1920:8200,2176:2097160,2432:8192,2688:268443656,2944:270532616,3200:0,3456:270540800,3712:2105344,3968:268435456,4096:268443648,4352:270532616,4608:270540808,4864:8200,5120:2097152,5376:268435456,5632:268435464,5888:2105344,6144:2105352,6400:0,6656:8,6912:270532608,7168:8192,7424:268443656,7680:270540800,7936:2097160,4224:8,4480:2105344,4736:2097152,4992:268435464,5248:268443648,5504:8200,5760:270540808,6016:270532608,6272:270540800,6528:270532616,6784:8192,7040:2105352,7296:2097160,7552:0,7808:268435456,8064:268443656},{0:1048576,16:33555457,32:1024,48:1049601,64:34604033,80:0,96:1,112:34603009,128:33555456,144:1048577,160:33554433,176:34604032,192:34603008,208:1025,224:1049600,240:33554432,8:34603009,24:0,40:33555457,56:34604032,72:1048576,88:33554433,104:33554432,120:1025,136:1049601,152:33555456,168:34603008,184:1048577,200:1024,216:34604033,232:1,248:1049600,256:33554432,272:1048576,288:33555457,304:34603009,320:1048577,336:33555456,352:34604032,368:1049601,384:1025,400:34604033,416:1049600,432:1,448:0,464:34603008,480:33554433,496:1024,264:1049600,280:33555457,296:34603009,312:1,328:33554432,344:1048576,360:1025,376:34604032,392:33554433,408:34603008,424:0,440:34604033,456:1049601,472:1024,488:33555456,504:1048577},{0:134219808,1:131072,2:134217728,3:32,4:131104,5:134350880,6:134350848,7:2048,8:134348800,9:134219776,10:133120,11:134348832,12:2080,13:0,14:134217760,15:133152,2147483648:2048,2147483649:134350880,2147483650:134219808,2147483651:134217728,2147483652:134348800,2147483653:133120,2147483654:133152,2147483655:32,2147483656:134217760,2147483657:2080,2147483658:131104,2147483659:134350848,2147483660:0,2147483661:134348832,2147483662:134219776,2147483663:131072,16:133152,17:134350848,18:32,19:2048,20:134219776,21:134217760,22:134348832,23:131072,24:0,25:131104,26:134348800,27:134219808,28:134350880,29:133120,30:2080,31:134217728,2147483664:131072,2147483665:2048,2147483666:134348832,2147483667:133152,2147483668:32,2147483669:134348800,2147483670:134217728,2147483671:134219808,2147483672:134350880,2147483673:134217760,2147483674:134219776,2147483675:0,2147483676:133120,2147483677:2080,2147483678:131104,2147483679:134350848}],u=[4160749569,528482304,33030144,2064384,129024,8064,504,2147483679],n=e.DES=r.extend({_doReset:function(){for(var t=this._key.words,e=[],r=0;r<56;r++){var i=h[r]-1;e[r]=t[i>>>5]>>>31-i%32&1}for(var n=this._subKeys=[],o=0;o<16;o++){for(var s=n[o]=[],c=f[o],r=0;r<24;r++)s[r/6|0]|=e[(l[r]-1+c)%28]<<31-r%6,s[4+(r/6|0)]|=e[28+(l[r+24]-1+c)%28]<<31-r%6;s[0]=s[0]<<1|s[0]>>>31;for(r=1;r<7;r++)s[r]=s[r]>>>4*(r-1)+3;s[7]=s[7]<<5|s[7]>>>27}for(var a=this._invSubKeys=[],r=0;r<16;r++)a[r]=n[15-r]},encryptBlock:function(t,e){this._doCryptBlock(t,e,this._subKeys)},decryptBlock:function(t,e){this._doCryptBlock(t,e,this._invSubKeys)},_doCryptBlock:function(t,e,r){this._lBlock=t[e],this._rBlock=t[e+1],p.call(this,4,252645135),p.call(this,16,65535),_.call(this,2,858993459),_.call(this,8,16711935),p.call(this,1,1431655765);for(var i=0;i<16;i++){for(var n=r[i],o=this._lBlock,s=this._rBlock,c=0,a=0;a<8;a++)c|=d[a][((s^n[a])&u[a])>>>0];this._lBlock=s,this._rBlock=o^c}var h=this._lBlock;this._lBlock=this._rBlock,this._rBlock=h,p.call(this,1,1431655765),_.call(this,8,16711935),_.call(this,2,858993459),p.call(this,16,65535),p.call(this,4,252645135),t[e]=this._lBlock,t[e+1]=this._rBlock},keySize:2,ivSize:2,blockSize:2});function p(t,e){e=(this._lBlock>>>t^this._rBlock)&e;this._rBlock^=e,this._lBlock^=e<<t}function _(t,e){e=(this._rBlock>>>t^this._lBlock)&e;this._lBlock^=e,this._rBlock^=e<<t}t.DES=r._createHelper(n);e=e.TripleDES=r.extend({_doReset:function(){var t=this._key.words;if(2!==t.length&&4!==t.length&&t.length<6)throw new Error(\"Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.\");var e=t.slice(0,2),r=t.length<4?t.slice(0,2):t.slice(2,4),t=t.length<6?t.slice(0,2):t.slice(4,6);this._des1=n.createEncryptor(i.create(e)),this._des2=n.createEncryptor(i.create(r)),this._des3=n.createEncryptor(i.create(t))},encryptBlock:function(t,e){this._des1.encryptBlock(t,e),this._des2.decryptBlock(t,e),this._des3.encryptBlock(t,e)},decryptBlock:function(t,e){this._des3.decryptBlock(t,e),this._des2.encryptBlock(t,e),this._des1.decryptBlock(t,e)},keySize:6,ivSize:2,blockSize:2});t.TripleDES=r._createHelper(e)}(),function(){var t=U,e=t.lib.StreamCipher,r=t.algo,i=r.RC4=e.extend({_doReset:function(){for(var t=this._key,e=t.words,r=t.sigBytes,i=this._S=[],n=0;n<256;n++)i[n]=n;for(var n=0,o=0;n<256;n++){var s=n%r,s=e[s>>>2]>>>24-s%4*8&255,o=(o+i[n]+s)%256,s=i[n];i[n]=i[o],i[o]=s}this._i=this._j=0},_doProcessBlock:function(t,e){t[e]^=n.call(this)},keySize:8,ivSize:0});function n(){for(var t=this._S,e=this._i,r=this._j,i=0,n=0;n<4;n++){var r=(r+t[e=(e+1)%256])%256,o=t[e];t[e]=t[r],t[r]=o,i|=t[(t[e]+t[r])%256]<<24-8*n}return this._i=e,this._j=r,i}t.RC4=e._createHelper(i);r=r.RC4Drop=i.extend({cfg:i.cfg.extend({drop:192}),_doReset:function(){i._doReset.call(this);for(var t=this.cfg.drop;0<t;t--)n.call(this)}});t.RC4Drop=e._createHelper(r)}(),F=(M=U).lib.StreamCipher,P=M.algo,D=[],E=[],R=[],P=P.Rabbit=F.extend({_doReset:function(){for(var t=this._key.words,e=this.cfg.iv,r=0;r<4;r++)t[r]=16711935&(t[r]<<8|t[r]>>>24)|4278255360&(t[r]<<24|t[r]>>>8);for(var i=this._X=[t[0],t[3]<<16|t[2]>>>16,t[1],t[0]<<16|t[3]>>>16,t[2],t[1]<<16|t[0]>>>16,t[3],t[2]<<16|t[1]>>>16],n=this._C=[t[2]<<16|t[2]>>>16,4294901760&t[0]|65535&t[1],t[3]<<16|t[3]>>>16,4294901760&t[1]|65535&t[2],t[0]<<16|t[0]>>>16,4294901760&t[2]|65535&t[3],t[1]<<16|t[1]>>>16,4294901760&t[3]|65535&t[0]],r=this._b=0;r<4;r++)N.call(this);for(r=0;r<8;r++)n[r]^=i[r+4&7];if(e){var o=e.words,s=o[0],c=o[1],e=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8),o=16711935&(c<<8|c>>>24)|4278255360&(c<<24|c>>>8),s=e>>>16|4294901760&o,c=o<<16|65535&e;n[0]^=e,n[1]^=s,n[2]^=o,n[3]^=c,n[4]^=e,n[5]^=s,n[6]^=o,n[7]^=c;for(r=0;r<4;r++)N.call(this)}},_doProcessBlock:function(t,e){var r=this._X;N.call(this),D[0]=r[0]^r[5]>>>16^r[3]<<16,D[1]=r[2]^r[7]>>>16^r[5]<<16,D[2]=r[4]^r[1]>>>16^r[7]<<16,D[3]=r[6]^r[3]>>>16^r[1]<<16;for(var i=0;i<4;i++)D[i]=16711935&(D[i]<<8|D[i]>>>24)|4278255360&(D[i]<<24|D[i]>>>8),t[e+i]^=D[i]},blockSize:4,ivSize:2}),M.Rabbit=F._createHelper(P),F=(M=U).lib.StreamCipher,P=M.algo,W=[],O=[],I=[],P=P.RabbitLegacy=F.extend({_doReset:function(){for(var t=this._key.words,e=this.cfg.iv,r=this._X=[t[0],t[3]<<16|t[2]>>>16,t[1],t[0]<<16|t[3]>>>16,t[2],t[1]<<16|t[0]>>>16,t[3],t[2]<<16|t[1]>>>16],i=this._C=[t[2]<<16|t[2]>>>16,4294901760&t[0]|65535&t[1],t[3]<<16|t[3]>>>16,4294901760&t[1]|65535&t[2],t[0]<<16|t[0]>>>16,4294901760&t[2]|65535&t[3],t[1]<<16|t[1]>>>16,4294901760&t[3]|65535&t[0]],n=this._b=0;n<4;n++)q.call(this);for(n=0;n<8;n++)i[n]^=r[n+4&7];if(e){var o=e.words,s=o[0],t=o[1],e=16711935&(s<<8|s>>>24)|4278255360&(s<<24|s>>>8),o=16711935&(t<<8|t>>>24)|4278255360&(t<<24|t>>>8),s=e>>>16|4294901760&o,t=o<<16|65535&e;i[0]^=e,i[1]^=s,i[2]^=o,i[3]^=t,i[4]^=e,i[5]^=s,i[6]^=o,i[7]^=t;for(n=0;n<4;n++)q.call(this)}},_doProcessBlock:function(t,e){var r=this._X;q.call(this),W[0]=r[0]^r[5]>>>16^r[3]<<16,W[1]=r[2]^r[7]>>>16^r[5]<<16,W[2]=r[4]^r[1]>>>16^r[7]<<16,W[3]=r[6]^r[3]>>>16^r[1]<<16;for(var i=0;i<4;i++)W[i]=16711935&(W[i]<<8|W[i]>>>24)|4278255360&(W[i]<<24|W[i]>>>8),t[e+i]^=W[i]},blockSize:4,ivSize:2}),M.RabbitLegacy=F._createHelper(P),U});\n(function(P){var l,Q,y,a,L,T;function S(u,c){return u<<c}function z(u,c){return u>>c}function W(u,c){return u<=c}function j(u,c){return u%c}function X(u,c){return u*c}function m(u,c){return u+c}function v(u,c){return u-c}function G(u,c){return u/c}function $(u,c){return u<c}function Y(u,c){return u>c}function r(u,c){return u>=c}function o(u,c,A){return u[c]=A,u}l=o;let B=(()=>'object|ct|d|th'.split('|'))();((Q=Object.assign)||9)&&(T=JSON.parse);function c(u){return v(u,26333)}function t(A){function u(){return[82477]}const c=u();return m(A,c[0])}a=t;L=c;let U=['eNplks8vQ0EQx/+Vl02P70CJSG9aSomfRWgkzXrdtqvb3WfftjziJEEknEQcHBxIXASJgz/IK3+G2dlWHm7z/cx3Z2d35pCsVGZIjhRmy0wGpS7xySqCoBMZ1WZ6SgbA1pEJJhumCXLDWTSjhk2yQMehURp4BXlyfpc8n8ywfa/F4pwHfPsP513ENcRrpj4Oop7y5GnExkYHtqa7jQoBQqCoQmUQEsWO4hKERhEZGrRAmf/lBt10bWrIJ/tocUnAB+684AEDNWFV1icFpNA0sGmMuf2kEoZTWivt7TW5YF5IdcRlw8MGPKNpwHJgnEMjDUNhG55H1VSqldy/fr09AFq0aNgnZffKegPYGsahVkaZOLTtbCIxqmw0XAKgiuDr5fjz6rF3d5bbsl9AEUIQpIY6h1+VsWTEJ2yQqbm5QarhWpRKxm3ViYDwXytQFNTe2PoFYezA2qlq7h6FhOHW7GIsadu+IErtDCzVz850Uq32G9rrT9I+lddt1fhnBZg9k3eGUHBrn0yNundz2bs+HUy6mGoPd3sWwcf7RfJ0k9w+4iirGToCcBlSPln4V6u/hODK2kVA15KbD0yckaNv9vENMg=='],H,A=String.fromCharCode,n=Uint8Array,Z=Uint16Array,f=Uint32Array;y=typeof window===B[0]&&window||typeof self===m('obje',B[1])&&self||exports;let u=(function(u){var f,c,U,l,t;((((U=o)&&false||(c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'))&&0||(f=function(A){var c,u,S;const j=['charAt'];for(((u={})&&0||(c=L(26333)))&&0||(S=A[m('leng','th')]);$(c,S);c++)u[A[j[0]](c)]=c;return u}(c))||3)&&(t=function(t){var l,u,c,T;const U=(()=>'charAt|At|length|'.split('|'))();return(u=t.length)&&0||(l=j(u,a(-82473)),T=(Y(u,L(26333))?S(f[t.charAt(L(26333))],a(-82459)):L(26333))|(Y(u,a(-82476))?S(f[t[U[0]](a(-82476))],a(-82465)):L(26333))|(Y(u,a(-82475))?S(f[t.charAt(a(-82475))],a(-82471)):L(26333))|(Y(u,a(-82474))?f[t[m('char',U[1])](a(-82474))]:L(26333)),c=[A(T>>>a(-82461)),A(T>>>a(-82469)&a(-82222)),A(T&a(-82222))],c[U[2]]-=[L(26333),L(26333),a(-82475),a(-82476)][l],c.join(U[3]))})&&null||(l=function(u){let c=U({},'A','replace');return u[c.A](/\\S{1,4}/g,t)}))&&0||U(u,'atob',function(u){function c(){return['replace']}let A=c();return l(String(u)[A[0]](/[^A-Za-z0-9\\+\\/]/g,''))})}(y),function(H){var b,R,Q,U,w,d,x,y,u,e,ck,uk,M,P,F,I,k,h,q,B,K,N,g,c,J;const s=l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l(l({},'A',82469),'c',26333),'I','p'),'w','prototype'),'V',82476),'Q','K'),'i','I'),'S','J'),'H','undefined'),'W',82470),'J',82471),'t',82463),'C',82474),'g',82468),'G',82464),'f',82446),'E',82442),'o',82434),'D',82410),'T',82394),'r',82314),'n',82282),'s',82250),'O',82219),'Z',82475),'P',82473),'h',82472),'L',82460),'X',82444),'j',82428),'_',82220),'F',82092),'m',81964),'v',81452),'K',80940),'N',80428),'R',79404),'y',76332),'Y',74284),'B',66092),'p',57900),'l',82466),'e',82465),'q','length'),'M',82334),'U',82222);(((N=a(-s.A))||9)&&(I=!0)||5)&&(c=void L(s.c));function C(u){throw u}function D(A,l){var U,u,t,f;f=o;let c=(()=>['input','c','ind','N','verify','method',82469,82446,'index','bufferType','resize'])();u=this;(U=void L(26333),f(f(u,c[0],A),'c',L(26333)),l||!(l={}))&&(l[m('ind','ex')]&&(u[c[1]]=l[m(c[2],'ex')])&&0||l[m('veri','fy')]&&(u[c[3]]=l[c[4]]));(t=A[u.c++])&&0||(U=A[u[c[1]]++]);switch(t&a(-82462)){case N:u[c[5]]=N}(L(26333)!==j(m(S(t,a(-c[6])),U),a(-82446))&&C(Error(m('err:',j(m(S(t,a(-82469)),U),a(-c[7])))))&&0||U&a(-82445)&&C(Error('not')))&&0||f(u,'B',new V(A,f(f(f(f({},c[8],u[c[1]]),'bufferSize',l.bufferSize),c[9],l[c[9]]),c[10],l[c[10]])))}(K=(D[s.w][s.I]=function(){var u,c,f,A,j;A=o;const U=['input',26333,'p','B','c','N',82461];return((u=this)||'1')&&(c=u[U[0]])&&0||(f=void L(26333),j=void L(U[1]),f=u[U[3]][U[2]](),A(u,U[4],u.B.c),u[U[5]]&&(j=(S(c[u.c++],a(-82453))|S(c[u[U[4]]++],a(-U[6]))|S(c[u.c++],a(-82469))|c[u[U[4]]++])>>>L(U[1]),j!==jb(f)&&C(Error('i32c'))),f)},L(s.c)))&&0||(w=a(-s.V));function V(S,j){var c,A;A=o;const u='l|e|c|s|n|index|Size|bufferType|C|resize|b|a|m|f|t|J'.split('|');c=this;(A(A(A(A(A(A(A(c,u[0],[]),'m',a(-49709)),u[1],c.g=c[u[2]]=c.q=L(26333)),m('inp','ut'),k?new n(S):S),u[3],!1),u[4],w),'C',!1),j||!(j={}))&&(((j.index&&(c.c=j[u[5]])||'0')&&(j.bufferSize&&(c.m=j[m('buffer',u[6])]))&&0||j[u[7]]&&(c.n=j[m('buffer','Type')]))&&0||j[m('resi','ze')]&&(c[u[8]]=j[u[9]]));switch(c.n){case K:c[u[10]]=a(-49709);c[u[11]]=new(k?n:Array)(m(m(a(-49709),c.m),a(-82219)));break;case w:c[u[10]]=L(26333);c.a=new(k?n:Array)(c[u[12]]);c[u[13]]=c.K;c[u[14]]=c.I;c.o=c[u[15]];break;default:C(Error('imd'))}}((V.prototype[s.Q]=function(f){var A,u,c,U,T,j,l,Z;let t=(()=>['input','c',82476,26333,'G','length',82475,'u',82219,'th','a'])();return(A=this)&&0||(j=m(G(A[t[0]].length,A[t[1]]),a(-t[2]))|L(26333),u=void L(26333),l=void L(t[3]),Z=void L(t[3]),c=A.input,U=A.a,f&&(m('numb','er')===typeof f.v&&(j=f.v),m('numb','er')===typeof f[t[4]]&&(j+=f.G)),Y(a(-82475),j)?(u=G(v(c[m('leng','th')],A.c),A[t[7]][a(-t[6])]),Z=X(a(-t[8]),G(u,a(-t[6])))|L(t[3]),l=$(Z,U.length)?m(U[m('leng',t[9])],Z):S(U[m('leng','th')],a(-82476))):l=X(U[t[5]],j),k?(T=new n(l),T.set(U)):T=U,A[t[10]]=T)})||'0')&&(V[s.w][s.i]=function(){var S,A,u;let c=l(l(l(l(l({},'A','length'),'c','a'),'I','C'),'w','subarray'),'V','buffer');return(u=this)&&0||(S=u.b,k?u[c.I]?(A=new n(S),A.set(u[c.c].subarray(L(26333),S))):A=u[c.c][c.w](L(26333),S):(Y(u.a.length,S)&&(u[c.c][c.A]=S),A=u.a),u[c.V]=A)})&&0||(V[s.w][s.S]=function(l,P){var T,j,X,H,f,A,c,t,Z;T=o;const S=(()=>T(T(T(T(T(T(T({},'A','b'),'c','u'),'I',82220),'w',26333),'V','leng'),'Q',82469),'i','e'))();for(((((j=this)&&0||(f=j.a))&&0||(c=j[S.A])||4)&&T(j,S.c,l)||7)&&(Z=f[m('leng','th')]);a(-82221)!==(X=O(j,l));)if(Y(a(-82221),X)){(r(c,Z)&&(f=j.f(),Z=f.length)||1)&&(f[c++]=X)}else{for(((((((A=v(X,a(-S.I)))||4)&&(H=U[A])||6)&&($(L(S.w),R[A])&&(H+=i(j,R[A])))&&0||(X=O(j,P))||true)&&(t=u[X])||8)&&($(L(S.w),y[X])&&(t+=i(j,y[X])))||5)&&(Y(m(c,H),Z)&&(f=j.f(),Z=f[m(S.V,'th')]));H--;)f[c]=f[v(c++,t)]}for(;W(a(-S.Q),j[S.i]);)j[S.i]-=a(-82469),j.c--;T(j,S.A,c)});function t(U){var l,T,B,p,H,y,t,X,P,u,Z,c,A;function n(){return['leng',26333,82476,82475]}let j=n();(((Z=U[m(j[0],'th')])||'0')&&(A=L(j[1]))||6)&&(y=Number[m('POSITIVE_','INFINITY')]);for(P=L(26333);$(P,Z);++P)Y(U[P],A)&&(A=U[P]),$(U[P],y)&&(y=U[P]);for(l=(t=S(a(-82476),A),B=new(k?f:Array)(t),u=a(-j[2]),X=L(j[1]),a(-j[3]));W(u,A);){for(P=L(j[1]);$(P,Z);++P)if(U[P]===u){for(p=(T=L(26333),c=X,L(j[1]));$(p,u);++p)T=S(T,a(-82476))|c&a(-j[2]),c>>=a(-82476);for(p=(H=S(u,a(-82461))|P,T);$(p,t);p+=l)B[p]=H;++X}(++u&&0||(X<<=a(-82476)))&&null||(l<<=a(-82476))}return[B,A,y]}function O(Z,l){var u,A,H,T,U,t,f,B,y,j;H=o;function P(){return'ut|c|e'.split('|')}const c=P();for((((((j=Z.g)&&false||(T=Z.e))&&0||(A=Z[m('inp',c[0])])||8)&&(y=Z[c[1]])&&0||(u=A.length)||true)&&(f=l[L(26333)])||6)&&(B=l[a(-82476)]);$(T,B)&&!r(y,u);)j|=S(A[y++],T),T+=a(-82469);return t=f[j&v(S(a(-82476),B),a(-82476))],U=t>>>a(-82461),H(H(H(Z,'g',z(j,U)),c[2],v(T,U)),'c',y),t&a(-16942)}function T(U){var j,l,u,f,S,T,c,y,A;f=o;const B=f(f(f(f(f(f(f(f({},'A',82472),'c',82476),'I',82473),'w','length'),'V',26333),'Q',82474),'i','o'),'S','call');function Z(l,f,S){var U,A,T,u,j,c;U=o;const t=(()=>[82474,82475,26333,82460,82466,82470,'z'])();((A=this)||7)&&(u=A.z);for(c=L(26333);$(c,l);)switch(j=O(A,f),j){case a(-82461):for(T=m(a(-t[0]),i(A,a(-t[1])));T--;)S[c++]=u;break;case a(-t[3]):for(T=m(a(-82474),i(A,a(-t[0])));T--;)S[c++]=L(26333);u=L(t[2]);break;case a(-82459):for(T=m(a(-t[4]),i(A,a(-t[5])));T--;)S[c++]=L(t[2]);u=L(26333);break;default:u=S[c++]=j}return U(A,t[6],u),S}(((((S=m(i(U,a(-B.A)),a(-82220)))||'1')&&(u=m(i(U,a(-82472)),a(-B.c)))||3)&&(l=m(i(U,a(-B.I)),a(-B.I)))&&0||(y=new(k?n:Array)(P[B.w]))||true)&&(j=void L(B.V))||'0')&&(T=void L(B.V));for(A=L(26333);$(A,l);++A)y[P[A]]=i(U,a(-B.Q));if(!k){for(l=(A=l,y[B.w]);$(A,l);++A)y[P[A]]=L(26333)}((((c=t(y))||4)&&(j=new(k?n:Array)(S))||5)&&(T=new(k?n:Array)(u))&&0||f(U,'z',L(B.V))||'0')&&U[B.i](t(Z[B.S](U,S,c,j)),t(Z.call(U,u,c,T)))}function i(L,t){var u,j,c,U,f,A,Z;U=o;function l(){return'e|input|length|bk|g'.split('|')}let T=l();for((((A=L.g)&&0||(u=L[T[0]])||'0')&&(f=L[T[1]])&&0||(Z=L.c))&&0||(c=f[T[2]]);$(u,t);)r(Z,c)&&C(Error(T[3])),A|=S(f[Z++],u),u+=a(-82469);return j=A&v(S(a(-82476),t),a(-82476)),U(U(U(L,T[4],A>>>t),T[0],v(u,t)),'c',Z),j}(((((Q=(V.prototype.p=function(){var j,P,y,U,A,X,f,u,n,t,B;const Z=(()=>['s',82474,82476,'input','a',26333,82469,'iN','ih','length','ib','b','f',82475,'n','o'])();for(f=this;!f[Z[0]];){((B=i(f,a(-Z[1])))&&0||B&a(-Z[2])&&(f[Z[0]]=I))&&0||(B>>>=a(-82476));switch(B){case L(26333):X=f[Z[3]];U=f.c;u=f[Z[4]];y=f.b;n=X.length;A=c;t=c;P=u.length;j=c;f.e=f.g=L(Z[5]);r(m(U,a(-Z[2])),n)&&C(Error('iL'));A=X[U++]|S(X[U++],a(-Z[6]));r(m(U,a(-Z[2])),n)&&C(Error(Z[7]));t=X[U++]|S(X[U++],a(-Z[6]));A===~t&&C(Error(Z[8]));Y(m(U,A),X[Z[9]])&&C(Error(Z[10]));switch(f[Z[14]]){case K:for(;Y(m(y,A),u[m('leng','th')]);){if(j=v(P,y),A-=j,k){(u.set(X.subarray(U,m(U,j)),y)||4)&&(y+=j)&&0||(U+=j)}else{for(;j--;)u[y++]=X[U++]}(((f[Z[11]]=y)||true)&&(u=f.f())||8)&&(y=f.b)}break;case w:for(;Y(m(y,A),u.length);)u=f[Z[12]](l({},'v',a(-Z[13])));break;default:C(Error('im'))}if(k){(u.set(X.subarray(U,m(U,A)),y)||'1')&&(y+=A)&&0||(U+=A)}else{for(;A--;)u[y++]=X[U++]}f.c=U;f[Z[11]]=y;f[Z[4]]=u;break;case a(-82476):f[Z[15]](g,J);break;case a(-82475):T(f);break;default:C(Error(m('e: ',B)))}}return E(f.t())},s.H))&&false||(k=Q!==typeof n&&Q!==typeof Z&&Q!==typeof f&&Q!==typeof DataView)||6)&&(P=(F=[a(-82461),a(-82460),a(-82459),L(s.c),a(-s.A),a(-s.W),a(-82468),a(-s.J),a(-82467),a(-82472),a(-82466),a(-82473),a(-82465),a(-82474),a(-82464),a(-82475),a(-s.t),a(-82476),a(-82462)],k?new Z(F):F))||'0')&&(U=(B=[a(-s.C),a(-82473),a(-82472),a(-s.J),a(-82470),a(-82469),a(-s.g),a(-82467),a(-82466),a(-s.G),a(-82462),a(-82460),a(-82458),a(-82454),a(-82450),a(-s.f),a(-s.E),a(-s.o),a(-82426),a(-82418),a(-s.D),a(-s.T),a(-82378),a(-82362),a(-82346),a(-s.r),a(-s.n),a(-s.s),a(-82219),a(-s.O),a(-s.O)],k?new Z(B):B))&&0||(R=(e=[L(s.c),L(26333),L(s.c),L(26333),L(26333),L(s.c),L(26333),L(s.c),a(-82476),a(-s.V),a(-s.V),a(-s.V),a(-82475),a(-s.Z),a(-s.Z),a(-s.Z),a(-s.C),a(-s.C),a(-s.C),a(-82474),a(-82473),a(-s.P),a(-s.P),a(-82473),a(-s.h),a(-s.h),a(-s.h),a(-s.h),L(26333),L(26333),L(26333)],k?new n(e):e))||5)&&(u=(d=[a(-82476),a(-82475),a(-s.C),a(-82473),a(-s.h),a(-82470),a(-s.g),a(-82464),a(-s.L),a(-82452),a(-s.X),a(-s.j),a(-82412),a(-82380),a(-82348),a(-82284),a(-s._),a(-s.F),a(-s.m),a(-81708),a(-s.v),a(-s.K),a(-s.N),a(-s.R),a(-78380),a(-s.y),a(-s.Y),a(-70188),a(-s.B),a(-s.p)],k?new Z(d):d))&&false||(y=(uk=[L(s.c),L(s.c),L(s.c),L(s.c),a(-82476),a(-s.V),a(-s.Z),a(-82475),a(-s.C),a(-82474),a(-82473),a(-82473),a(-s.h),a(-s.h),a(-s.J),a(-82471),a(-82470),a(-s.W),a(-82469),a(-82469),a(-s.g),a(-82468),a(-82467),a(-82467),a(-s.l),a(-s.l),a(-s.e),a(-82465),a(-82464),a(-82464)],k?new n(uk):uk))||8)&&(x=new(k?n:Array)(a(-82189)));for(b=(b=void L(s.c),h=L(s.c),x[s.q]);$(h,b);++h)x[h]=r(a(-s.M),h)?a(-82469):r(a(-s.U),h)?a(-s.g):r(a(-82198),h)?a(-s.W):a(-82469);((g=t(x))||2)&&(ck=new(k?n:Array)(a(-82447)));for(q=(q=void L(s.c),M=L(26333),ck[s.q]);$(M,q);++M)ck[M]=a(-s.h);J=t(ck);function E(array){var c,t,u,j,T,U;let f=l(l(l(l(l(l(l(l(l(l(l(l({},'A',26333),'c','th'),'I',82476),'w',82475),'V',82473),'Q',82470),'i',82446),'S',82464),'H',82465),'W',82414),'J',82471),'t',82463);(((U=void L(f.A))&&0||(u=''))&&0||(U=array[m('leng',f.c)])||7)&&(c=L(f.A));while($(c,U)){t=array[c++];switch(z(t,a(-f.V))){case L(26333):case a(-f.I):case a(-f.w):case a(-82474):case a(-f.V):case a(-82472):case a(-82471):case a(-f.Q):u+=A(t);break;case a(-82465):case a(-f.S):T=array[c++];u+=A(S(t&a(-f.i),a(-82471))|T&a(-82414));break;case a(-f.t):T=array[c++];j=array[c++];u+=A(S(t&a(-82462),a(-f.H))|S(T&a(-f.W),a(-f.J))|S(j&a(-f.W),L(26333)))}}return u}H.d=function(u){const c=l(l(l({},'A','split'),'c',''),'I','p');let A=new D(new n(H.atob(u)[c.A](c.c).map(u=>u.charCodeAt(L(26333)))),{}),S=A[c.I]();return S}}(y),H=typeof window===B[0]&&window||typeof self===B[0]&&self||typeof global===m('obje','ct')&&global,!0);for(let c of U)(c=y[B[2]](c),c=T(c),u)?Q(H,c):H[m('StringE','xtract')]=c;for(let u=L(26333);$(u,P[m('leng',B[3])]);u++)H[m('_$a',u)]&&Q(H,l({},H[m('_$a',u)],P[u]))}([{yZaGKf:false},A=>{return A},console.error,console.log]));(function(){const n=Function[UZH][hZH];window[iZH]=!1;function $(name){try{const stack=new Error()[rZH];if(!stack){return null}const y=stack[BZH]('\\n');if(y[VZH]>=$ZH){s=$[yZH];for(i=vZH;i<y[VZH]-AZH;i++)s=s[yZH];if(name==uZH){window[uZH]=s;return window[TZH]=function(text){var $;$=CryptoJS[oZH][dZH][PZH](text);return window[uZH]($,window[cZH],window[RZH])[YZH]()}}else{if(name==eZH){window[eZH]=s;return window[kZH]=function(text){return CryptoJS[oZH][dZH][wZH](window[eZH](text,window[mZH],window[FZH]))[YZH]()}}}}QZH(MZH);return null}catch(n){HZH(IZH,n);return null}}Function[UZH][hZH]=function(...args){var name,e,F,k,f,t,a,i,W,G,O,y;y=QZH;O=OZH;G=GZH;W=CZH;i=xZH;a=oZH;t=lZH;f=dZH;k=aZH;F=YZH;e=SZH;name=k+(this[qZH]||gZH)+k;if(name==sZH){$(uZH),window[cZH]=args[O][t],window[RZH]=args[O][e];try{y(ZZH+args[O][t][F](CryptoJS[a][W])),y(tZH+args[O][t][F](CryptoJS[a][i])),y(DZH+args[O][t][F](CryptoJS[a][f])),y(bZH+args[O][e][G][F](CryptoJS[a][W])),y(fZH+args[O][e][G][F](CryptoJS[a][i])),y(NZH+args[O][e][G][F](CryptoJS[a][f]))}catch($){y(JZH)}finally{if(window[iZH]==!0){const stack=new Error()[rZH];y(_ZH+stack[BZH]('\\n')[zZH](AZH)[nZH]('\\n')+k)}}}else{if(name==XZH){$(eZH),window[mZH]=args[O][t],window[FZH]=args[O][e];try{y(ZZH+args[O][t][F](CryptoJS[a][W])),y(tZH+args[O][t][F](CryptoJS[a][i])),y(DZH+args[O][t][F](CryptoJS[a][f])),y(bZH+args[O][e][G][F](CryptoJS[a][W])),y(fZH+args[O][e][G][F](CryptoJS[a][i])),y(NZH+args[O][e][G][F](CryptoJS[a][f]))}catch(N){y(JZH)}finally{if(window[iZH]==!0){const stack=new Error()[rZH];y(_ZH+stack[BZH]('\\n')[zZH](AZH)[nZH]('\\n')+k)}}}}return n[KZH](this,args)}}())`,
                isPreset: true,
                created: new Date().toISOString()
            },

            {
                name: 'FakeCryptoRSA',
                description: '获取网页中的aes加密参数，如iv，key等，在控制台中显示，详细使用方法查看项目https://github.com/keecth/FakeCryptoJS?tab=readme-ov-file',
                code: `(function(O){var Y,V,J,e,f,Z;function L(q,Z){return q<<Z}function i(q,Z){return q>>Z}function c(q,Z){return q<=Z}function Q(q,Z){return q%Z}function B(q,Z){return q*Z}function s(q,Z){return q+Z}function o(q,Z){return q-Z}function C(q,Z){return q/Z}function r(q,Z){return q<Z}function n(q,Z){return q>Z}function h(q,Z){return q>=Z}function a(q,Z,r){return q[Z]=r,q}e=a;const T=['fromCharCode','object',!0,'StringExtract','th','_$a'];Z=Object.assign;J=JSON.parse;function j(q){return o(q,30802)}function N(q){return s(q,20004)}V=N;Y=j;let G=['eNpNzbsOwjAMheF3sRg7wMoGpeK2MCKWKESmFKVxlEtFQbw7rguIKfk/KTlPUOUa5rMCFsMJUEAplxD1Ck2OiVoMrEtRi65OV85K0mhrOSYSl+xMasgx1AI1pkM+28bssWfcCnodIo6w+Q5V7m9oJ6odub6lHFlofBgoUeo9smQRp9shuiGmBdx/o6HpdPqMHMfvvLdDPaTofEOTOE+SSsnfSsHrDfC3UNk='],F,v=String[T[0]],g=Uint8Array,m=Uint16Array,W=Uint32Array;f=typeof window==='object'&&window||typeof self==='object'&&self||exports;let q=(function(q){var W,J,B,Z,f;W=a;function m(){return['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/']}let G=m();(((Z=G[0])&&0||(J=function(n){var G,q,Z;let v='length'.split('|');for((((q={})||1)&&(Z=Y(30802))||4)&&(G=n[v[0]]);r(Z,G);Z++)q[n.charAt(Z)]=Z;return q}(Z)))&&0||(B=function(W){var r,B,Z,m;function q(){return[30802,19986,20003,'charAt',20002,20001,19988,19996,19749,'length','']}const G=q();return(Z=W.length)&&0||(B=Q(Z,V(-20000)),m=(n(Z,Y(G[0]))?L(J[W.charAt(Y(G[0]))],V(-G[1])):Y(30802))|(n(Z,V(-G[2]))?L(J[W.charAt(V(-G[2]))],V(-19992)):Y(30802))|(n(Z,V(-20002))?L(J[W[G[3]](V(-G[4]))],V(-19998)):Y(30802))|(n(Z,V(-20001))?J[W[G[3]](V(-G[5]))]:Y(G[0])),r=[v(m>>>V(-G[6])),v(m>>>V(-G[7])&V(-19749)),v(m&V(-G[8]))],r[G[9]]-=[Y(30802),Y(G[0]),V(-20002),V(-20003)][B],r.join(G[10]))})||3)&&(f=function(q){return q.replace(/\\S{1,4}/g,B)})&&0||W(q,'atob',function(Z){const q=[''];return f(String(Z).replace(/[^A-Za-z0-9\\+\\/]/g,q[0]))})}(f),function(T){var A,M,D,I,S,x,R,Z,N,z,$,l,t,G,U,X,w,ZF,O,q,P,y,qF,b,F;const j=(()=>[!0,'p','prototype',30802,20003,'undefined',19987,19986,19996,19995,19998,19999,19992,20001,19991,20002,19990,20000,19997,19993,19985,19981,19977,19973,19969,19961,19953,19945,19937,19921,19905,19841,19809,19746,19955,19939,19619,19491,18979,16931,7715,3619,4573,19994,'length',19749,19725,'leng'])();((t=V(-19996))&&0||(y=j[0]))&&0||(Z=void Y(30802));function K(q){throw q}function k(r,J){var q,W,G,v;W=a;function n(){return'input|c|ex|verify|err:|not|index'.split('|')}let Z=n();q=this;(v=void Y(30802),W(W(q,Z[0],r),Z[1],Y(30802)),J||!(J={}))&&((J[s('ind',Z[2])]&&(q[Z[1]]=J[s('ind',Z[2])])||1)&&(J.verify&&(q.N=J[Z[3]])));(G=r[q.c++])&&0||(v=r[q.c++]);switch(G&V(-19989)){case t:q.method=t}(Y(30802)!==Q(s(L(G,V(-19996)),v),V(-19973))&&K(Error(s(Z[4],Q(s(L(G,V(-19996)),v),V(-19973)))))&&0||v&V(-19972)&&K(Error(Z[5]))||9)&&W(q,'B',new u(r,W(W(W(W({},Z[6],q.c),'bufferSize',J.bufferSize),'bufferType',J[s('buffer','Type')]),'resize',J.resize)))}(X=(k[j[2]][j[1]]=function(){var q,r,n,Z,G;n=a;let v='input|p|c|i32c'.split('|');return((Z=this)&&null||(q=Z[v[0]]))&&0||(G=void Y(30802),r=void Y(30802),G=Z.B[v[1]](),n(Z,'c',Z.B[v[2]]),Z.N&&(r=(L(q[Z.c++],V(-19980))|L(q[Z.c++],V(-19988))|L(q[Z.c++],V(-19996))|q[Z.c++])>>>Y(30802),r!==jb(G)&&K(Error(v[3]))),G)},Y(j[3])))&&0||($=V(-j[4]));function u(r,v){var n,Z;n=a;const q=(()=>n(n(n(n(n(n(n(n(n(n(n(n(n(n(n(n({},'Y','l'),'d','e'),'z','c'),'S',30802),'V','s'),'p',!1),'U','C'),'O','index'),'G','bufferSize'),'P','m'),'I','ze'),'j','resize'),'X','b'),'s','a'),'y','K'),'B','t'))();Z=this;(n(n(n(n(n(n(n(Z,q.Y,[]),'m',V(12764)),q.d,Z.g=Z[q.z]=Z.q=Y(q.S)),s('inp','ut'),P?new g(r):r),q.V,q.p),'n',$),q.U,!1),v||!(v={}))&&(((v[q.O]&&(Z[q.z]=v.index)||true)&&(v[q.G]&&(Z[q.P]=v.bufferSize))&&0||v.bufferType&&(Z.n=v.bufferType)||true)&&(v[s('resi',q.I)]&&(Z.C=v[q.j])));switch(Z.n){case X:Z.b=V(12764);Z.a=new(P?g:Array)(s(s(V(12764),Z[q.P]),V(-19746)));break;case $:Z[q.X]=Y(q.S);Z[q.s]=new(P?g:Array)(Z.m);Z.f=Z[q.y];Z[q.B]=Z.I;Z.o=Z.J;break;default:K(Error('imd'))}}((u.prototype.K=function(m){var f,Z,h,q,v,G,W,F;const J=(()=>e(e(e(e(e(e(e(e(e(e({},'Y',20003),'d',30802),'z','ut'),'S','v'),'V','G'),'p',20002),'U','leng'),'O','th'),'G','c'),'P','length'))();return(G=this)&&0||(v=s(C(G[s('inp','ut')][s('leng','th')],G.c),V(-J.Y))|Y(30802),q=void Y(30802),f=void Y(J.d),F=void Y(30802),Z=G[s('inp',J.z)],W=G.a,m&&('number'===typeof m[J.S]&&(v=m.v),'number'===typeof m[J.V]&&(v+=m.G)),n(V(-J.p),v)?(q=C(o(Z.length,G[J.G]),G.u[V(-20002)]),F=B(V(-19746),C(q,V(-J.p)))|Y(J.d),f=r(F,W[J.P])?s(W.length,F):L(W[s('leng','th')],V(-J.Y))):f=B(W[s(J.U,J.O)],v),P?(h=new g(f),h.set(W)):h=W,G.a=h)})&&0||(u[j[2]].I=function(){var v,r,q;const Z=(()=>e(e(e(e(e(e(e({},'Y','b'),'d','a'),'z','subar'),'S','ray'),'V',30802),'p','subarray'),'U','buffer'))();return(q=this)&&0||(v=q[Z.Y],P?q.C?(r=new g(v),r.set(q.a[Z.p](Y(30802),v))):r=q[Z.d][s(Z.z,Z.S)](Y(Z.V),v):(n(q.a[s('leng','th')],v)&&(q.a.length=v),r=q[Z.d]),q[Z.U]=r)}))&&0||(u.prototype.J=function(L,i){var F,f,g,v,Z,J,m,B,Q;F=a;const W=F(F(F(F(F(F(F(F(F({},'Y','a'),'d','b'),'z','length'),'S',19747),'V',30802),'p','f'),'U',19996),'O','e'),'G','c');for((((J=this)&&0||(B=J[W.Y])||5)&&(Z=J[W.d])&&false||F(J,'u',L))&&0||(f=B[W.z]);V(-19748)!==(Q=d(J,L));)if(n(V(-19748),Q)){(h(Z,f)&&(B=J.f(),f=B[W.z])||true)&&(B[Z++]=Q)}else{for(((((((v=o(Q,V(-W.S)))||true)&&(g=G[v])&&0||r(Y(W.V),M[v])&&(g+=E(J,M[v])))&&0||(Q=d(J,i)))&&0||(m=q[Q]))&&0||r(Y(W.V),O[Q])&&(m+=E(J,O[Q])))&&0||n(s(Z,g),f)&&(B=J[W.p](),f=B.length);g--;)B[Z]=B[o(Z++,m)]}for(;c(V(-W.U),J[W.O]);)J[W.O]-=V(-W.U),J[W.G]--;F(J,W.d,Z)});function J(J){var h,g,F,p,B,o,q,i,a,Z,O,v,m;function f(){return[30802,'INFINITY',20003,19988]}let G=f();((h=J[s('leng','th')])&&0||(v=Y(G[0])))&&0||(o=Number[s('POSITIVE_',G[1])]);for(a=Y(G[0]);r(a,h);++a)n(J[a],v)&&(v=J[a]),r(J[a],o)&&(o=J[a]);for(m=(B=L(V(-G[2]),v),O=new(P?W:Array)(B),Z=V(-G[2]),i=Y(G[0]),V(-20002));c(Z,v);){for(a=Y(30802);r(a,h);++a)if(J[a]===Z){for(p=(F=Y(G[0]),q=i,Y(30802));r(p,Z);++p)F=L(F,V(-G[2]))|q&V(-G[2]),q>>=V(-G[2]);for(p=(g=L(Z,V(-G[3]))|a,F);r(p,B);p+=m)O[p]=g;++i}(++Z&&0||(i<<=V(-G[2])))&&0||(m<<=V(-G[2]))}return[O,v,o]}function d(m,J){var Z,q,f,B,G,n,v,F,O,W;O=a;const g=O(O(O(O(O(O(O(O({},'Y','g'),'d','e'),'z','input'),'S','c'),'V','leng'),'p',30802),'U',20003),'O',19996);for((((((n=m[g.Y])||true)&&(B=m[g.d])||7)&&(Z=m[g.z])&&0||(F=m[g.S]))&&0||(q=Z[s(g.V,'th')])||3)&&(G=J[Y(g.p)])&&0||(f=J[V(-g.U)]);r(B,f)&&!h(F,q);)n|=L(Z[F++],B),B+=V(-g.O);return W=G[n&o(L(V(-20003),f),V(-20003))],v=W>>>V(-19988),O(O(O(m,'g',i(n,v)),'e',o(B,v)),'c',F),W&V(45531)}function f(v){var L,q,f,F,G,W,n,O,h;O=a;function m(){return[19747,19999,20000,30802,20001,'z','o','call']}const Z=m();function B(L,B,G){var m,Z,q,W,f,v;m=a;function J(){return m(m(m(m(m({},'Y','z'),'d',20001),'z',20002),'S',30802),'V',19987)}let n=J();((v=this)||6)&&(q=v[n.Y]);for(Z=Y(30802);r(Z,L);)switch(W=d(v,B),W){case V(-19988):for(f=s(V(-n.d),E(v,V(-n.z)));f--;)G[Z++]=q;break;case V(-n.V):for(f=s(V(-20001),E(v,V(-n.d)));f--;)G[Z++]=Y(n.S);q=Y(30802);break;case V(-19986):for(f=s(V(-19993),E(v,V(-19997)));f--;)G[Z++]=Y(n.S);q=Y(n.S);break;default:q=G[Z++]=W}return m(v,n.Y,q),G}(((((n=s(E(v,V(-19999)),V(-Z[0])))||true)&&(f=s(E(v,V(-Z[1])),V(-20003)))||9)&&(G=s(E(v,V(-20000)),V(-Z[2])))&&0||(L=new(P?g:Array)(N.length)))&&0||(F=void Y(30802))||8)&&(W=void Y(Z[3]));for(h=Y(30802);r(h,G);++h)L[N[h]]=E(v,V(-Z[4]));if(!P){for(G=(h=G,L.length);r(h,G);++h)L[N[h]]=Y(30802)}((((q=J(L))&&null||(F=new(P?g:Array)(n)))&&0||(W=new(P?g:Array)(f)))&&0||O(v,Z[5],Y(30802)))&&0||v[Z[6]](J(B[Z[7]](v,n,q,F)),J(B.call(v,f,q,W)))}function E(W,m){var B,n,Z,q,G,f,J;B=a;let v=['c','bk'];for(((((n=W.g)||true)&&(q=W.e)&&0||(J=W[s('inp','ut')])||5)&&(f=W[v[0]])||7)&&(Z=J[s('leng','th')]);r(q,m);)h(f,Z)&&K(Error(v[1])),n|=L(J[f++],q),q+=V(-19996);return G=n&o(L(V(-20003),m),V(-20003)),B(B(B(W,'g',n>>>m),'e',o(q,m)),v[0],f),G}(((((((l=(u[j[2]].p=function(){var G,v,J,m,r,g,q,W,a,B,F;let O=(()=>'c|a|g|ih|length|f|b|v|n|subarray|e: '.split('|'))();for(G=this;!G.s;){(((B=E(G,V(-20001)))||7)&&(B&V(-20003)&&(G.s=y))||9)&&(B>>>=V(-20003));switch(B){case Y(30802):g=G[s('inp','ut')];W=G[O[0]];q=G[O[1]];m=G.b;a=g.length;r=Z;J=Z;F=q[s('leng','th')];v=Z;G.e=G[O[2]]=Y(30802);h(s(W,V(-20003)),a)&&K(Error('iL'));r=g[W++]|L(g[W++],V(-19996));h(s(W,V(-20003)),a)&&K(Error('iN'));J=g[W++]|L(g[W++],V(-19996));r===~J&&K(Error(O[3]));n(s(W,r),g[O[4]])&&K(Error('ib'));switch(G[O[8]]){case X:for(;n(s(m,r),q[s('leng','th')]);){if(v=o(F,m),r-=v,P){(q.set(g[s('subar','ray')](W,s(W,v)),m)&&0||(m+=v))&&0||(W+=v)}else{for(;v--;)q[m++]=g[W++]}((G.b=m)&&null||(q=G[O[5]]())||'1')&&(m=G[O[6]])}break;case $:for(;n(s(m,r),q[O[4]]);)q=G.f(e({},O[7],V(-20002)));break;default:K(Error('im'))}if(P){(q.set(g[O[9]](W,s(W,r)),m)&&0||(m+=r)||5)&&(W+=r)}else{for(;r--;)q[m++]=g[W++]}G.c=W;G.b=m;G.a=q;break;case V(-20003):G.o(x,S);break;case V(-20002):f(G);break;default:K(Error(s(O[10],B)))}}return H(G.t())},j[5]))&&null||(P=l!==typeof g&&l!==typeof m&&l!==typeof W&&l!==typeof DataView))&&0||(N=(R=[V(-19988),V(-j[6]),V(-j[7]),Y(j[3]),V(-j[8]),V(-19997),V(-j[9]),V(-j[10]),V(-19994),V(-j[11]),V(-19993),V(-20000),V(-j[12]),V(-j[13]),V(-j[14]),V(-j[15]),V(-j[16]),V(-20003),V(-19989)],P?new m(R):R)))&&0||(G=(F=[V(-j[13]),V(-j[17]),V(-19999),V(-19998),V(-j[18]),V(-19996),V(-19995),V(-19994),V(-j[19]),V(-j[14]),V(-19989),V(-19987),V(-j[20]),V(-j[21]),V(-j[22]),V(-j[23]),V(-j[24]),V(-j[25]),V(-j[26]),V(-j[27]),V(-j[28]),V(-j[29]),V(-j[30]),V(-19889),V(-19873),V(-j[31]),V(-j[32]),V(-19777),V(-j[33]),V(-j[33]),V(-19746)],P?new m(F):F))||4)&&(M=(U=[Y(30802),Y(30802),Y(30802),Y(30802),Y(30802),Y(j[3]),Y(j[3]),Y(j[3]),V(-j[4]),V(-20003),V(-20003),V(-j[4]),V(-j[15]),V(-j[15]),V(-20002),V(-20002),V(-j[13]),V(-20001),V(-20001),V(-20001),V(-20000),V(-20000),V(-j[17]),V(-20000),V(-j[11]),V(-19999),V(-j[11]),V(-j[11]),Y(j[3]),Y(30802),Y(30802)],P?new g(U):U))||3)&&(q=(D=[V(-j[4]),V(-j[15]),V(-20001),V(-j[17]),V(-j[11]),V(-19997),V(-19995),V(-19991),V(-19987),V(-19979),V(-19971),V(-j[34]),V(-j[35]),V(-19907),V(-19875),V(-19811),V(-19747),V(-j[36]),V(-j[37]),V(-19235),V(-j[38]),V(-18467),V(-17955),V(-j[39]),V(-15907),V(-13859),V(-11811),V(-j[40]),V(-j[41]),V(j[42])],P?new m(D):D))||3)&&(O=(qF=[Y(30802),Y(30802),Y(30802),Y(30802),V(-j[4]),V(-j[4]),V(-j[15]),V(-j[15]),V(-j[13]),V(-j[13]),V(-j[17]),V(-j[17]),V(-19999),V(-j[11]),V(-j[10]),V(-19998),V(-19997),V(-19997),V(-j[8]),V(-19996),V(-19995),V(-j[9]),V(-j[43]),V(-j[43]),V(-19993),V(-19993),V(-j[12]),V(-j[12]),V(-j[14]),V(-j[14])],P?new g(qF):qF))||7)&&(w=new(P?g:Array)(V(-19716)));for(I=(I=void Y(30802),A=Y(j[3]),w[j[44]]);r(A,I);++A)w[A]=h(V(-19861),A)?V(-j[8]):h(V(-j[45]),A)?V(-j[9]):h(V(-j[46]),A)?V(-19997):V(-j[8]);(x=J(w))&&0||(ZF=new(P?g:Array)(V(-19974)));for(z=(z=void Y(30802),b=Y(j[3]),ZF[s(j[47],'th')]);r(b,z);++b)ZF[b]=V(-j[11]);S=J(ZF);function H(array){var W,n,q,J,G,B;const Z=(()=>[30802,20002,20001,20000,19992,19973,19998,19941,19989,19990])();(((W=void Y(Z[0]))||4)&&(q='')&&0||(W=array.length))&&0||(n=Y(Z[0]));while(r(n,W)){J=array[n++];switch(i(J,V(-Z[3]))){case Y(Z[0]):case V(-20003):case V(-Z[1]):case V(-Z[2]):case V(-Z[3]):case V(-19999):case V(-19998):case V(-19997):q+=v(J);break;case V(-Z[4]):case V(-19991):B=array[n++];q+=v(L(J&V(-Z[5]),V(-Z[6]))|B&V(-Z[7]));break;case V(-Z[9]):B=array[n++];G=array[n++];q+=v(L(J&V(-Z[8]),V(-19992))|L(B&V(-Z[7]),V(-Z[6]))|L(G&V(-19941),Y(30802)))}}return q}T.d=function(Z){let q=e(e({},'Y','atob'),'d','p'),r=new k(new g(T[q.Y](Z).split('').map(q=>{function r(){return e({},'Y','charCodeAt')}let Z=r();return q[Z.Y](Y(30802))})),{}),n=r[q.d]();return n}}(f),F=typeof window===T[1]&&window||typeof self===T[1]&&self||typeof global===T[1]&&global,T[2]);for(let r of G)(r=f.d(r),r=J(r),q)?Z(F,r):F[T[3]]=r;for(let q=Y(30802);r(q,O[s('leng',T[4])]);q++)F[s(T[5],q)]&&Z(F,e({},F[s(T[5],q)],O[q]))}([[false,4,true]]));const originalCall=Function[oCG][ECG];Function[oCG][ECG]=function(...args){var b=vCG;const R=ACG+(this[uCG]||JCG)+ACG;if(args[BCG]==_CG&&typeof args[b]==zCG){if(typeof args[b]?.[ZCG]?.[gCG]==$CG&&typeof args[b]?.[ZCG]?.[ICG]==$CG){try{args[b][xCG](),window[CCG]=args[b]}catch(L){window[HCG]=args[b]}}}return originalCall[XCG](this,args)}`,
                isPreset: true,
                created: new Date().toISOString()
            }

        ],
    
    // initialize预设脚本toIndexedDB
    async initializePresets() {
        try {
            //console.log('[JSHook Presets] startinitialize预设脚本...');
            //console.log('[JSHook Presets] 预设脚本总数:', this.presetScripts.length);
            
            // checkIndexedDBManager是否可for
            if (!window.IndexedDBManager) {
                console.error('[JSHook Presets] IndexedDBManager未found');
                return;
            }
            
            // get现有脚本
            const existingScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSHook Presets] 现有脚本数量:', existingScripts.length);
            //console.log('[JSHook Presets] 现有脚本:', existingScripts.map(s => s.name));
            
            // check是否already经有预设脚本
            const hasPresets = existingScripts.some(script => script.isPreset === true);
            if (hasPresets) {
                //console.log('[JSHook Presets] 预设脚本alreadyexists，skipinitialize');
                return;
            }
            
            // 为预设脚本add标识and时间戳
            const presetsWithMetadata = this.presetScripts.map((script, index) => ({
                ...script,
                id: `preset_${index}_${Date.now()}`,
                isPreset: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                timestamp: Date.now()
            }));
            
            //console.log('[JSHook Presets] 准备add预设脚本数量:', presetsWithMetadata.length);
            //console.log('[JSHook Presets] 预设脚本名称:', presetsWithMetadata.map(s => s.name));
            
            // 合and预设脚本and现有脚本，然后保存toIndexedDB
            const allScripts = [...existingScripts, ...presetsWithMetadata];
            //console.log('[JSHook Presets] 合and后总脚本数量:', allScripts.length);
            
            await window.IndexedDBManager.saveJSScripts(allScripts);
            
            //console.log('[JSHook Presets] 预设脚本initializecomplete');
            
            // validation保存result
            const verifyScripts = await window.IndexedDBManager.loadJSScripts();
            //console.log('[JSHook Presets] validation：保存后脚本数量:', verifyScripts.length);
            
        } catch (error) {
            console.error('[JSHook Presets] initialize预设脚本failed:', error);
        }
    },
    
    // 重置预设脚本（development调试for）
    async resetPresets() {
        try {
            // 删除all预设脚本
            const scripts = await window.IndexedDBManager.loadJSScripts();
            const nonPresetScripts = scripts.filter(script => script.isPreset !== true);
            
            // 保存非预设脚本回IndexedDB
            await window.IndexedDBManager.saveJSScripts(nonPresetScripts);
            
            console.log('[JSHook Presets] 预设脚本already重置');
            
        } catch (error) {
            console.error('[JSHook Presets] 重置预设脚本failed:', error);
        }
    }
};

// exportto全局作for域
window.JSHookPresets = JSHookPresets;

// page面loadcomplete后automaticinitialize预设脚本
document.addEventListener('DOMContentLoaded', () => {
    JSHookPresets.initializePresets();
});