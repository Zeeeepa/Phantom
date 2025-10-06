/*
 * filter domain and 手机号
 * domain feature for of and 增强筛选手机号
 */
class DomainPhoneFilter {
    constructor() {
        this.domainTLDs = this.loadDomainTLDs();
        this.invalidSuffixes = this.loadInvalidSuffixes();
    }
    
    /**
     * domain load column(s) of has 效顶级表
     */
    loadDomainTLDs() {
        // domain column(s) of 完整顶级表
        return new Set([
            // domain general 常见顶级
            'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 
            'mobi', 'app', 'io', 'co', 'me', 'tv', 'xyz', 'site', 'online', 'store', 'shop',
            'tech', 'dev', 'ai', 'cloud', 'digital', 'live', 'blog', 'art', 'design', 'game',
            
            // domain and 国家地区顶级
            'cn', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'ru', 'br', 'in', 'it', 'es', 'nl',
            'se', 'no', 'dk', 'fi', 'ch', 'at', 'be', 'ie', 'nz', 'sg', 'hk', 'tw', 'kr', 'za',
            'mx', 'ar', 'cl', 'co', 'pe', 've', 'ec', 'py', 'uy', 'bo', 'cr', 'cu', 'do', 'gt',
            'hn', 'ni', 'pa', 'sv', 'ae', 'il', 'sa', 'qa', 'kw', 'bh', 'om', 'jo', 'lb', 'eg',
            'ma', 'dz', 'tn', 'ly', 'ng', 'ke', 'gh', 'ci', 'cm', 'ug', 'tz', 'et', 'mu', 'mg',
            'na', 'zw', 'zm', 'mz', 'ao', 'cd', 'cg', 'ga', 'gm', 'ml', 'sn', 'so', 'td', 'tg',
            'bj', 'bf', 'cv', 'gn', 'gw', 'lr', 'mr', 'ne', 'sl', 'st', 'ph', 'my', 'th', 'vn',
            'id', 'pk', 'bd', 'np', 'lk', 'mm', 'kh', 'la', 'mn', 'bt', 'mv', 'bn', 'tl', 'tp',
            'pg', 'fj', 'sb', 'vu', 'nr', 'pw', 'to', 'ws', 'ck', 'nu', 'tk', 'fm', 'mh', 'mp',
            'gu', 'as', 'cx', 'cc', 'nf', 'nc', 'pf', 'wf', 'ki', 'tv', 'ua', 'by', 'md', 'am',
            'az', 'ge', 'kz', 'kg', 'tj', 'tm', 'uz',
            
            // domain special 顶级
            'eu', 'asia', 'travel', 'museum', 'jobs', 'coop', 'aero', 'cat', 'tel', 'post', 'arpa',
            
            // domain and 常用商业主题顶级
            'top', 'vip', 'club', 'team', 'company', 'network', 'group', 'agency', 'academy',
            'school', 'university', 'college', 'institute', 'foundation', 'center', 'community',
            'church', 'city', 'town', 'zone', 'ninja', 'guru', 'expert', 'consulting', 'management',
            'partners', 'lawyer', 'legal', 'doctor', 'health', 'care', 'hospital', 'clinic', 'dental',
            'pharmacy', 'fitness', 'restaurant', 'cafe', 'bar', 'pub', 'hotel', 'travel', 'tours',
            'vacations', 'holiday', 'fashion', 'clothing', 'shoes', 'jewelry', 'watch', 'beauty',
            'makeup', 'cosmetics', 'furniture', 'home', 'garden', 'kitchen', 'pet', 'baby', 'kids',
            'toys', 'gift', 'photo', 'photography', 'video', 'film', 'movie', 'music', 'band', 'dance',
            'theater', 'art', 'gallery', 'museum', 'book', 'magazine', 'news', 'blog', 'press', 'media',
            'marketing', 'seo', 'ads', 'advertising', 'market', 'sale', 'discount', 'deal', 'hosting',
            'server', 'systems', 'technology', 'software', 'app', 'code', 'dev', 'crypto', 'bitcoin',
            'blockchain', 'token', 'nft', 'dao', 'finance', 'bank', 'money', 'invest', 'investment',
            'fund', 'capital', 'wealth', 'tax', 'insurance', 'mortgage', 'loan', 'credit', 'card',
            'pay', 'cash', 'shop', 'store', 'mall', 'market', 'buy', 'auction', 'bid', 'win', 'prize',
            'award', 'game', 'play', 'fun', 'bet', 'casino', 'poker', 'sport', 'sports', 'team',
            'club', 'league', 'fan', 'racing', 'run', 'golf', 'tennis', 'soccer', 'football',
            'basketball', 'baseball', 'hockey', 'fitness', 'yoga', 'gym', 'fit', 'diet', 'food',
            'recipe', 'cook', 'cooking', 'chef', 'wine', 'beer', 'coffee', 'tea', 'juice', 'water',
            'drink', 'bar', 'pub', 'club', 'party', 'event', 'wedding', 'dating', 'singles', 'love',
            'sex', 'porn', 'xxx', 'adult', 'chat', 'talk', 'meet', 'date', 'match', 'social',
            'network', 'forum', 'community',
            
            // domain starts with of a顶级
            'aaa', 'aarp', 'abb', 'abbott', 'abbvie', 'abc', 'able', 'abogado', 'abudhabi',
            'ac', 'academy', 'accenture', 'accountant', 'accountants', 'aco', 'actor', 'ad',
            'ads', 'adult', 'ae', 'aeg', 'aero', 'aetna', 'af', 'afl', 'africa', 'ag',
            'agakhan', 'agency', 'ai', 'aig', 'airbus', 'airforce', 'airtel', 'akdn', 'al',
            'alibaba', 'alipay', 'allfinanz', 'allstate', 'ally', 'alsace', 'alstom', 'am',
            'amazon', 'americanexpress', 'americanfamily', 'amex', 'amfam', 'amica', 'amsterdam',
            'analytics', 'android', 'anquan', 'anz', 'ao', 'aol', 'apartments', 'app', 'apple',
            'aq', 'aquarelle', 'ar', 'arab', 'aramco', 'archi', 'army', 'arpa', 'art', 'arte',
            'as', 'asda', 'asia', 'associates', 'at', 'athleta', 'attorney', 'au', 'auction',
            'audi', 'audible', 'audio', 'auspost', 'author', 'auto', 'autos', 'aw', 'aws',
            'ax', 'axa', 'az', 'azure',
            
            // domain starts with of b顶级
            'ba', 'baby', 'baidu', 'banamex', 'band', 'bank', 'bar', 'barcelona', 'barclaycard',
            'barclays', 'barefoot', 'bargains', 'baseball', 'basketball', 'bauhaus', 'bayern',
            'bb', 'bbc', 'bbt', 'bbva', 'bcg', 'bcn', 'bd', 'be', 'beats', 'beauty', 'beer',
            'berlin', 'best', 'bestbuy', 'bet', 'bf', 'bg', 'bh', 'bharti', 'bi', 'bible',
            'bid', 'bike', 'bing', 'bingo', 'bio', 'biz', 'bj', 'black', 'blackfriday',
            'blockbuster', 'blog', 'bloomberg', 'blue', 'bm', 'bms', 'bmw', 'bn', 'bnpparibas',
            'bo', 'boats', 'boehringer', 'bofa', 'bom', 'bond', 'boo', 'book', 'booking',
            'bosch', 'bostik', 'boston', 'bot', 'boutique', 'box', 'br', 'bradesco',
            'bridgestone', 'broadway', 'broker', 'brother', 'brussels', 'bs', 'bt', 'build',
            'builders', 'business', 'buy', 'buzz', 'bv', 'bw', 'by', 'bz', 'bzh',
            
            // domain starts with of c顶级
            'ca', 'cab', 'cafe', 'cal', 'call', 'calvinklein', 'cam', 'camera', 'camp',
            'canon', 'capetown', 'capital', 'capitalone', 'car', 'caravan', 'cards', 'care',
            'career', 'careers', 'cars', 'casa', 'case', 'cash', 'casino', 'cat', 'catering',
            'catholic', 'cba', 'cbn', 'cbre', 'cc', 'cd', 'center', 'ceo', 'cern', 'cf',
            'cfa', 'cfd', 'cg', 'ch', 'chanel', 'channel', 'charity', 'chase', 'chat',
            'cheap', 'chintai', 'christmas', 'chrome', 'church', 'ci', 'cipriani', 'circle',
            'cisco', 'citadel', 'citi', 'citic', 'city', 'ck', 'cl', 'claims', 'cleaning',
            'click', 'clinic', 'clinique', 'clothing', 'cloud', 'club', 'clubmed', 'cm',
            'cn', 'co', 'coach', 'codes', 'coffee', 'college', 'cologne', 'com', 'commbank',
            'community', 'company', 'compare', 'computer', 'comsec', 'condos', 'construction',
            'consulting', 'contact', 'contractors', 'cooking', 'cool', 'coop', 'corsica',
            'country', 'coupon', 'coupons', 'courses', 'cpa', 'cr', 'credit', 'creditcard',
            'creditunion', 'cricket', 'crown', 'crs', 'cruise', 'cruises', 'cu', 'cuisinella',
            'cv', 'cw', 'cx', 'cy', 'cymru', 'cyou', 'cz',
            
            // domain starts with of d顶级
            'dad', 'dance', 'data', 'date', 'dating', 'datsun', 'day', 'dclk', 'dds', 'de',
            'deal', 'dealer', 'deals', 'degree', 'delivery', 'dell', 'deloitte', 'delta',
            'democrat', 'dental', 'dentist', 'desi', 'design', 'dev', 'dhl', 'diamonds',
            'diet', 'digital', 'direct', 'directory', 'discount', 'discover', 'dish', 'diy',
            'dj', 'dk', 'dm', 'dnp', 'do', 'docs', 'doctor', 'dog', 'domains', 'dot',
            'download', 'drive', 'dtv', 'dubai', 'dunlop', 'dupont', 'durban', 'dvag',
            'dvr', 'dz',
            
            // domain starts with of e顶级
            'earth', 'eat', 'ec', 'eco', 'edeka', 'edu', 'education', 'ee', 'eg', 'email',
            'emerck', 'energy', 'engineer', 'engineering', 'enterprises', 'epson', 'equipment',
            'er', 'ericsson', 'erni', 'es', 'esq', 'estate', 'et', 'eu', 'eurovision',
            'eus', 'events', 'exchange', 'expert', 'exposed', 'express', 'extraspace',
            
            // domain starts with of f顶级
            'fage', 'fail', 'fairwinds', 'faith', 'family', 'fan', 'fans', 'farm', 'farmers',
            'fashion', 'fast', 'fedex', 'feedback', 'ferrari', 'ferrero', 'fi', 'fidelity',
            'fido', 'film', 'final', 'finance', 'financial', 'fire', 'firestone', 'firmdale',
            'fish', 'fishing', 'fit', 'fitness', 'fj', 'fk', 'flickr', 'flights', 'flir',
            'florist', 'flowers', 'fly', 'fm', 'fo', 'foo', 'food', 'football', 'ford',
            'forex', 'forsale', 'forum', 'foundation', 'fox', 'fr', 'free', 'fresenius',
            'frl', 'frogans', 'frontier', 'ftr', 'fujitsu', 'fun', 'fund', 'furniture',
            'futbol', 'fyi',
            
            // domain starts with of g顶级
            'ga', 'gal', 'gallery', 'gallo', 'gallup', 'game', 'games', 'gap', 'garden',
            'gay', 'gb', 'gbiz', 'gd', 'gdn', 'ge', 'gea', 'gent', 'genting', 'george',
            'gf', 'gg', 'ggee', 'gh', 'gi', 'gift', 'gifts', 'gives', 'giving', 'gl',
            'glass', 'gle', 'global', 'globo', 'gm', 'gmail', 'gmbh', 'gmo', 'gmx', 'gn',
            'godaddy', 'gold', 'goldpoint', 'golf', 'goo', 'goodyear', 'goog', 'google',
            'gop', 'got', 'gov', 'gp', 'gq', 'gr', 'grainger', 'graphics', 'gratis',
            'green', 'gripe', 'grocery', 'group', 'gs', 'gt', 'gu', 'gucci', 'guge',
            'guide', 'guitars', 'guru', 'gw', 'gy',
            
            // domain starts with of h顶级
            'hair', 'hamburg', 'hangout', 'haus', 'hbo', 'hdfc', 'hdfcbank', 'health',
            'healthcare', 'help', 'helsinki', 'here', 'hermes', 'hiphop', 'hisamitsu',
            'hitachi', 'hiv', 'hk', 'hkt', 'hm', 'hn', 'hockey', 'holdings', 'holiday',
            'homedepot', 'homegoods', 'homes', 'homesense', 'honda', 'horse', 'hospital',
            'host', 'hosting', 'hot', 'hotels', 'hotmail', 'house', 'how', 'hr', 'hsbc',
            'ht', 'hu', 'hughes', 'hyatt', 'hyundai',
            
            // domain starts with of i顶级
            'ibm', 'icbc', 'ice', 'icu', 'id', 'ie', 'ieee', 'ifm', 'ikano', 'il', 'im',
            'imamat', 'imdb', 'immo', 'immobilien', 'in', 'inc', 'industries', 'infiniti',
            'info', 'ing', 'ink', 'institute', 'insurance', 'insure', 'int', 'international',
            'intuit', 'investments', 'io', 'ipiranga', 'iq', 'ir', 'irish', 'is', 'ismaili',
            'ist', 'istanbul', 'it', 'itau', 'itv',
            
            // domain starts with of j顶级
            'jaguar', 'java', 'jcb', 'je', 'jeep', 'jetzt', 'jewelry', 'jio', 'jll', 'jm',
            'jmp', 'jnj', 'jo', 'jobs', 'joburg', 'jot', 'joy', 'jp', 'jpmorgan', 'jprs',
            'juegos', 'juniper',
            
            // domain starts with of k顶级
            'kaufen', 'kddi', 'ke', 'kerryhotels', 'kerryproperties', 'kfh', 'kg', 'kh',
            'ki', 'kia', 'kids', 'kim', 'kindle', 'kitchen', 'kiwi', 'km', 'kn', 'koeln',
            'komatsu', 'kosher', 'kp', 'kpmg', 'kpn', 'kr', 'krd', 'kred', 'kuokgroup',
            'kw', 'ky', 'kyoto', 'kz',
            
            // domain starts with of l顶级
            'la', 'lacaixa', 'lamborghini', 'lamer', 'land', 'landrover', 'lanxess',
            'lasalle', 'lat', 'latino', 'latrobe', 'law', 'lawyer', 'lb', 'lc', 'lds',
            'lease', 'leclerc', 'lefrak', 'legal', 'lego', 'lexus', 'lgbt', 'li', 'lidl',
            'life', 'lifeinsurance', 'lifestyle', 'lighting', 'like', 'lilly', 'limited',
            'limo', 'lincoln', 'link', 'live', 'living', 'lk', 'llc', 'llp', 'loan',
            'loans', 'locker', 'locus', 'lol', 'london', 'lotte', 'lotto', 'love', 'lpl',
            'lplfinancial', 'lr', 'ls', 'lt', 'ltd', 'ltda', 'lu', 'lundbeck', 'luxe',
            'luxury', 'lv', 'ly',
            
            // domain starts with of m顶级
            'ma', 'madrid', 'maif', 'maison', 'makeup', 'man', 'management', 'mango',
            'map', 'market', 'marketing', 'markets', 'marriott', 'marshalls', 'mattel',
            'mba', 'mc', 'mckinsey', 'md', 'me', 'med', 'media', 'meet', 'melbourne',
            'meme', 'memorial', 'men', 'menu', 'merckmsd', 'mg', 'mh', 'miami', 'microsoft',
            'mil', 'mini', 'mint', 'mit', 'mitsubishi', 'mk', 'ml', 'mlb', 'mls', 'mm',
            'mma', 'mn', 'mo', 'mobi', 'mobile', 'moda', 'moe', 'moi', 'mom', 'monash',
            'money', 'monster', 'mormon', 'mortgage', 'moscow', 'moto', 'motorcycles',
            'mov', 'movie', 'mp', 'mq', 'mr', 'ms', 'msd', 'mt', 'mtn', 'mtr', 'mu',
            'museum', 'music', 'mv', 'mw', 'mx', 'my', 'mz',
            
            // domain starts with of n顶级
            'na', 'nab', 'nagoya', 'name', 'navy', 'nba', 'nc', 'ne', 'nec', 'net',
            'netbank', 'netflix', 'network', 'neustar', 'new', 'news', 'next', 'nextdirect',
            'nexus', 'nf', 'nfl', 'ng', 'ngo', 'nhk', 'ni', 'nico', 'nike', 'nikon',
            'ninja', 'nissan', 'nissay', 'nl', 'no', 'nokia', 'norton', 'now', 'nowruz',
            'nowtv', 'np', 'nr', 'nra', 'nrw', 'ntt', 'nu', 'nyc', 'nz',
            
            // domain starts with of o顶级
            'obi', 'observer', 'office', 'okinawa', 'olayan', 'olayangroup', 'ollo', 'om',
            'omega', 'one', 'ong', 'onl', 'online', 'ooo', 'open', 'oracle', 'orange',
            'org', 'organic', 'origins', 'osaka', 'otsuka', 'ott', 'ovh',
            
            // domain starts with of p顶级
            'pa', 'page', 'panasonic', 'paris', 'pars', 'partners', 'parts', 'party',
            'pay', 'pccw', 'pe', 'pet', 'pf', 'pfizer', 'pg', 'ph', 'pharmacy', 'phd',
            'philips', 'phone', 'photo', 'photography', 'photos', 'physio', 'pics', 'pictet',
            'pictures', 'pid', 'pin', 'ping', 'pink', 'pioneer', 'pizza', 'pk', 'pl',
            'place', 'play', 'playstation', 'plumbing', 'plus', 'pm', 'pn', 'pnc', 'pohl',
            'poker', 'politie', 'porn', 'post', 'pr', 'praxi', 'press', 'prime', 'pro',
            'prod', 'productions', 'prof', 'progressive', 'promo', 'properties', 'property',
            'protection', 'pru', 'prudential', 'ps', 'pt', 'pub', 'pw', 'pwc', 'py',
            
            // domain starts with of q顶级
            'qa', 'qpon', 'quebec', 'quest',
            
            // domain starts with of r顶级
            'racing', 'radio', 're', 'read', 'realestate', 'realtor', 'realty', 'recipes',
            'red', 'redstone', 'redumbrella', 'rehab', 'reise', 'reisen', 'reit', 'reliance',
            'ren', 'rent', 'rentals', 'repair', 'report', 'republican', 'rest', 'restaurant',
            'review', 'reviews', 'rexroth', 'rich', 'richardli', 'ricoh', 'ril', 'rio',
            'rip', 'ro', 'rocks', 'rodeo', 'rogers', 'room', 'rs', 'rsvp', 'ru', 'rugby',
            'ruhr', 'run', 'rw', 'rwe', 'ryukyu',
            
            // domain starts with of s顶级
            'sa', 'saarland', 'safe', 'safety', 'sakura', 'sale', 'salon', 'samsclub',
            'samsung', 'sandvik', 'sandvikcoromant', 'sanofi', 'sap', 'sarl', 'sas',
            'save', 'saxo', 'sb', 'sbi', 'sbs', 'sc', 'scb', 'schaeffler', 'schmidt',
            'scholarships', 'school', 'schule', 'schwarz', 'science', 'scot', 'sd', 'se',
            'search', 'seat', 'secure', 'security', 'seek', 'select', 'sener', 'services',
            'seven', 'sew', 'sex', 'sexy', 'sfr', 'sg', 'sh', 'shangrila', 'sharp',
            'shell', 'shia', 'shiksha', 'shoes', 'shop', 'shopping', 'shouji', 'show',
            'si', 'silk', 'sina', 'singles', 'site', 'sj', 'sk', 'ski', 'skin', 'sky',
            'skype', 'sl', 'sling', 'sm', 'smart', 'smile', 'sn', 'sncf', 'so', 'soccer',
            'social', 'softbank', 'software', 'sohu', 'solar', 'solutions', 'song', 'sony',
            'soy', 'spa', 'space', 'sport', 'spot', 'sr', 'srl', 'ss', 'st', 'stada',
            'staples', 'star', 'statebank', 'statefarm', 'stc', 'stcgroup', 'stockholm',
            'storage', 'store', 'stream', 'studio', 'study', 'style', 'su', 'sucks',
            'supplies', 'supply', 'support', 'surf', 'surgery', 'suzuki', 'sv', 'swatch',
            'swiss', 'sx', 'sy', 'sydney', 'systems', 'sz',
            
            // domain starts with of t顶级
            'tab', 'taipei', 'talk', 'taobao', 'target', 'tatamotors', 'tatar', 'tattoo',
            'tax', 'taxi', 'tc', 'tci', 'td', 'tdk', 'team', 'tech', 'technology', 'tel',
            'temasek', 'tennis', 'teva', 'tf', 'tg', 'th', 'thd', 'theater', 'theatre',
            'tiaa', 'tickets', 'tienda', 'tips', 'tires', 'tirol', 'tj', 'tjmaxx', 'tjx',
            'tk', 'tkmaxx', 'tl', 'tm', 'tmall', 'tn', 'to', 'today', 'tokyo', 'tools',
            'top', 'toray', 'toshiba', 'total', 'tours', 'town', 'toyota', 'toys', 'tr',
            'trade', 'trading', 'training', 'travel', 'travelers', 'travelersinsurance',
            'trust', 'trv', 'tt', 'tube', 'tui', 'tunes', 'tushu', 'tv', 'tvs', 'tw', 'tz',
            
            // domain starts with of u顶级
            'ua', 'ubank', 'ubs', 'ug', 'uk', 'unicom', 'university', 'uno', 'uol', 'ups',
            'us', 'uy', 'uz',
            
            // domain starts with of v顶级
            'va', 'vacations', 'vana', 'vanguard', 'vc', 've', 'vegas', 'ventures',
            'verisign', 'versicherung', 'vet', 'vg', 'vi', 'viajes', 'video', 'vig',
            'viking', 'villas', 'vin', 'vip', 'virgin', 'visa', 'vision', 'viva', 'vivo',
            'vlaanderen', 'vn', 'vodka', 'volvo', 'vote', 'voting', 'voto', 'voyage', 'vu',
            
            // domain starts with of w顶级
            'wales', 'walmart', 'walter', 'wang', 'wanggou', 'watch', 'watches', 'weather',
            'weatherchannel', 'webcam', 'weber', 'website', 'wed', 'wedding', 'weibo', 'weir',
            'wf', 'whoswho', 'wien', 'wiki', 'williamhill', 'win', 'windows', 'wine',
            'winners', 'wme', 'wolterskluwer', 'woodside', 'work', 'works', 'world', 'wow',
            'ws', 'wtc', 'wtf',
            
            // domain starts with of x顶级
            'xbox', 'xerox', 'xihuan', 'xin', 'xxx', 'xyz',
            
            // domain starts with of y顶级
            'yachts', 'yahoo', 'yamaxun', 'yandex', 'ye', 'yodobashi', 'yoga', 'yokohama',
            'you', 'youtube', 'yt', 'yun',
            
            // domain starts with of z顶级
            'za', 'zappos', 'zara', 'zero', 'zip', 'zm', 'zone', 'zuerich', 'zw',
            
            // domain of 其他语言顶级
            'xn--p1ai', 'xn--80asehdb', 'xn--80aswg', 'xn--j1amh', 'xn--90ais'
        ]);
    }
    
    /**
     * file load column(s) of after 无效缀表
     */
    loadInvalidSuffixes() {
        return new Set([
            // file resource after 常见缀
            'js', 'css', 'html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'png', 'jpg', 'jpeg', 
            'gif', 'bmp', 'ico', 'svg', 'webp', 'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'tar', 'gz',
            'json', 'xml', 'txt', 'log', 'md', 'scss', 'less', 'ts', 'tsx', 'jsx', 'vue',
            'woff', 'woff2', 'ttf', 'eot', 'otf', 'swf', 'map'
        ]);
    }
    
    /**
     * domain check of no yes yes has 效
     * @param {string} domain domain check of 待
     * @returns {boolean} domain no yes yes has 效
     */
    isValidDomain(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // remove path and before 缀
        domain = domain.toLowerCase().trim();
        domain = domain.replace(/^https?:\/\//, '');
        domain = domain.replace(/^www\./, '');
        domain = domain.split('/')[0];
        domain = domain.split('?')[0];
        domain = domain.split('#')[0];
        domain = domain.split(':')[0];
        
        // domain content filter of yes 掉明显不
        if (domain.length < 3) return false;
        if (domain.startsWith('.') || domain.endsWith('.')) return false;
        if (domain.includes('..')) return false;
        
        // contains check no yes 点号（domain has 必须点号）
        if (!domain.includes('.')) return false;
        
        // check format 基本
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z0-9\-]+$/i;
        if (!domainRegex.test(domain)) return false;
        
        // domain check no yes has 顶级效
        const parts = domain.split('.');
        if (parts.length < 2) return false;
        
        const tld = parts[parts.length - 1];
        
        // check digit(s) no yes yes after 缀（domain of yes has 通常不效顶级）
        if (/^\d+$/.test(tld)) return false;
        
        // file resource check no yes yes after 缀
        if (this.invalidSuffixes.has(tld)) return false;
        
        // check length TLD（characters item(s) of has 效TLD通常在2-63之间）
        if (tld.length < 2 || tld.length > 63) return false;
        
        // domain check of no yes yes has 效顶级
        if (!this.domainTLDs.has(tld)) return false;
        
        // check 额外：domain filter mode of yes 掉一些明显不
        // domain filter digit(s) 掉纯（format address 除了IP）
        const isIPAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
        if (!isIPAddress && /^\d+\.\d+/.test(domain)) return false;
        
        // domain filter contains special characters of 掉
        if (/[<>(){}[\]"'`~!@#$%^&*+=|\\;,]/.test(domain)) return false;
        
        return true;
    }
    
    /**
     * check in of no yes yes has 效国手机号
     * @param {string} phone check of 待手机号
     * @returns {boolean} no yes yes has 效手机号
     */
    isValidChinesePhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // remove process digit(s) all characters 非并国家码（+86/86/0086）
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0086')) cleaned = cleaned.slice(4);
        else if (cleaned.startsWith('86')) cleaned = cleaned.slice(2);
        
        //  digit(s) after 截取最11，before 避免缀残留
        if (cleaned.length > 11) {
            cleaned = cleaned.slice(-11);
        }
        
        // in then 国手机号规：starts with 1，digit(s) digit(s) 11
        if (cleaned.length !== 11) return false;
        if (cleaned[0] !== '1') return false;
        
        // check before 运营商缀
        // 移动: 134-139, 147-148, 150-152, 157-159, 165, 172, 178, 182-184, 187-188, 195, 197-198
        // 联通: 130-132, 145-146, 155-156, 166, 167, 171, 175-176, 185-186, 196
        // 电信: 133, 149, 153, 173-174, 177, 180-181, 189, 191, 193, 199
        // 广电: 192
        // 虚拟运营商: 162, 165, 167, 170-171, 192
        const validPrefixes = /^1(3[0-9]|4[5-9]|5[0-3,5-9]|6[2,5-7]|7[0-8]|8[0-9]|9[1,3,5-9])/;
        return validPrefixes.test(cleaned);
    }
    
    /**
     * check of no yes yes has 效国际手机号
     * @param {string} phone check of 待手机号
     * @returns {boolean} no yes yes has 效手机号
     */
    isValidInternationalPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // remove starts with digit(s) all characters of and 非+号
        const originalPhone = phone;
        phone = phone.replace(/^\+/, '').replace(/\D/g, '');
        
        // filter digit(s) of yes 掉明显不手机号
        // 1. check length： digit(s) 国际手机号通常在7-15之间
        if (phone.length < 7 || phone.length > 15) return false;
        
        // 2. exclude digit(s) column(s) of yes 明显不手机号序
        if (/^(.)\1+$/.test(phone)) return false; // digit(s) 全相同
        if (/^0+$/.test(phone)) return false; // 全0
        if (/^1+$/.test(phone)) return false; // 全1
        if (/^(0123456789|1234567890|9876543210|0987654321)/.test(phone)) return false; // digit(s) 顺序
        
        // 3. exclude digit(s) 小数点（如 227.7371）
        if (originalPhone.includes('.')) return false;
        
        // 4. exclude digit(s) format of yes with has 减号但不电话号码
        if (originalPhone.includes('-')) {
            // contains if 减号，check format of no yes yes 合理电话号码
            const dashCount = (originalPhone.match(/-/g) || []).length;
            if (dashCount > 3) return false; // 减号太多
            
            // check digit(s) no yes yes after before 减号都
            const parts = originalPhone.split('-');
            for (let part of parts) {
                if (!/^\d+$/.test(part.replace(/^\+/, ''))) return false;
            }
        }
        
        // 5. exclude digit(s) of 过短（version yes 可能号、, etc. ID）
        if (phone.length < 8) return false;
        
        // 6. data exclude digit(s) type of yes 明显其他
        // exclude from 看起像坐标、尺寸、digit(s) version , etc. of 号
        if (/^\d{1,3}\.\d+$/.test(originalPhone)) return false; // 小数
        if (/^\d{4}$/.test(phone)) return false; // digit(s) digit(s) 4（year yes 可能）
        if (/^[12]\d{3}$/.test(phone)) return false; // digit(s) year digit(s) of from 看起像4
        
        return true;
    }
    
    /**
     * check address of no yes yes has 效邮箱
     * @param {string} email check address of 待邮箱
     * @returns {boolean} no yes yes has 效邮箱
     */
    isValidEmail(email) {
        if (!email) return false;
        
        // check format 基本邮箱
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) return false;
        
        // domain check no yes has 部分效
        const domain = email.split('@')[1];
        return this.isValidDomain(domain);
    }
    
    /**
     * domain filter column(s) 表，domain has 只保留效
     * @param {string[]} domains domain column(s) 表
     * @returns {string[]} domain column(s) has 效表
     */
    filterDomains(domains) {
        if (!domains || !Array.isArray(domains)) return [];
        
        const validDomains = new Set(); // auto use Set去重
        
        for (let domain of domains) {
            if (!domain || typeof domain !== 'string') continue;
            
            // domain extracted 部分
            let cleanDomain = domain.toLowerCase().trim();
            
            // remove before 协议缀
            cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
            cleanDomain = cleanDomain.replace(/^ftp:\/\//, '');
            cleanDomain = cleanDomain.replace(/^ftps:\/\//, '');
            
            // remove before www缀
            cleanDomain = cleanDomain.replace(/^www\./, '');
            
            // remove path、parameters query and 锚点
            cleanDomain = cleanDomain.split('/')[0];
            cleanDomain = cleanDomain.split('?')[0];
            cleanDomain = cleanDomain.split('#')[0];
            cleanDomain = cleanDomain.split(':')[0]; // remove 端口号
            
            // domain content filter of yes 掉明显不
            if (!cleanDomain || cleanDomain.length < 3) continue;
            if (cleanDomain.startsWith('.') || cleanDomain.endsWith('.')) continue;
            if (!cleanDomain.includes('.')) continue; // domain contains 必须点号
            
            // filter contains 掉localStorage、API content , etc. of sessionStorage浏览器
            if (cleanDomain.includes('localStorage') || 
                cleanDomain.includes('sessionStorage') || 
                cleanDomain.includes('indexedDB') ||
                cleanDomain.includes('webkitStorage')) continue;
            
            // domain check no yes yes has 效
            if (this.isValidDomain(cleanDomain)) {
                validDomains.add(cleanDomain);
            }
        }
        
        return Array.from(validDomains);
    }
    
    /**
     * filter column(s) 手机号表，has 只保留效手机号
     * @param {string[]} phones  column(s) 手机号表
     * @param {boolean} chineseOnly filter in no yes 只国手机号
     * @returns {string[]}  column(s) has 效手机号表
     */
    filterPhones(phones, chineseOnly = false) {
        if (!phones || !Array.isArray(phones)) return [];
        
        return phones.filter(phone => {
            if (chineseOnly) {
                return this.isValidChinesePhone(phone);
            } else {
                return this.isValidChinesePhone(phone) || this.isValidInternationalPhone(phone);
            }
        });
    }
    
    /**
     * filter address column(s) 邮箱表，has 只保留效邮箱
     * @param {string[]} emails address column(s) 邮箱表
     * @returns {string[]}  column(s) has 效邮箱表
     */
    filterEmails(emails) {
        if (!emails || !Array.isArray(emails)) return [];
        
        return emails.filter(email => this.isValidEmail(email));
    }
    
    /**
     * domain text extracted from in
     * @param {string} text text analysis of 待
     * @returns {string[]} domain extracted column(s) of 表
     */
    extractDomainsFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;
        const matches = [];
        let match;
        
        while ((match = domainRegex.exec(text)) !== null) {
            // domain extracted 部分（path parameters query and 不包括）
            let domain = match[1] || match[0];
            domain = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
            domain = domain.split('/')[0].split('?')[0].split('#')[0];
            
            if (domain && domain.includes('.')) {
                matches.push(domain);
            }
        }
        
        return matches;
    }
    
    /**
     * text extracted from in 手机号
     * @param {string} text text analysis of 待
     * @returns {string[]} extracted column(s) of 手机号表
     */
    extractPhonesFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const matches = [];
        
        // mode in 国手机号：starts with digit(s) digit(s) of 111
        const cnPhoneRegex = /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/g;
        let cnMatch;
        while ((cnMatch = cnPhoneRegex.exec(text)) !== null) {
            matches.push(cnMatch[0]);
        }
        
        // mode 国际手机号：code digit(s) digit(s) of with has 可能国家6-15
        const intlPhoneRegex = /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,15}(?!\d)/g;
        let intlMatch;
        while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
            // in 避免与国手机号重复
            if (!matches.includes(intlMatch[0])) {
                matches.push(intlMatch[0]);
            }
        }
        
        return matches;
    }
    
    /**
     * text extracted address from in 邮箱
     * @param {string} text text analysis of 待
     * @returns {string[]} extracted column(s) of 邮箱表
     */
    extractEmailsFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = [];
        let match;
        
        while ((match = emailRegex.exec(text)) !== null) {
            matches.push(match[0]);
        }
        
        return matches;
    }
    
    /**
     * text process，domain extracted filter 并、and 手机号邮箱
     * @param {string} text text process of 待
     * @returns {Object} domain contains has 效、object of and 手机号邮箱
     */
    processText(text) {
        if (!text || typeof text !== 'string') {
            return {
                domains: [],
                phoneNumbers: [],
                emails: []
            };
        }
        
        // domain extracted
        const domainMatches = this.extractDomainsFromText(text);
        const validDomains = this.filterDomains(domainMatches);
        
        // extracted 手机号（in 仅国大陆）
        const phoneMatches = this.extractPhonesFromText(text);
        const validPhones = this.filterPhones(phoneMatches, true);
        
        // extracted 邮箱
        const emailMatches = this.extractEmailsFromText(text);
        const validEmails = this.filterEmails(emailMatches);
        
        return {
            domains: validDomains,
            phoneNumbers: validPhones,
            emails: validEmails
        };
    }
}

// module 支持多种系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomainPhoneFilter;
} else if (typeof window !== 'undefined') {
    window.DomainPhoneFilter = DomainPhoneFilter;
}
