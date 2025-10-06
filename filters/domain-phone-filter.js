/*
 * DomainAnd手机号Filter
 * Used for增强FilterDomainAnd手机号的功能
 */
class DomainPhoneFilter {
    constructor() {
        this.domainTLDs = this.loadDomainTLDs();
        this.invalidSuffixes = this.loadInvalidSuffixes();
    }
    
    /**
     * LoadValid的顶级Domain列Table
     */
    loadDomainTLDs() {
        // Complete的顶级Domain列Table
        return new Set([
            // 常见通用顶级Domain
            'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 
            'mobi', 'app', 'io', 'co', 'me', 'tv', 'xyz', 'site', 'online', 'store', 'shop',
            'tech', 'dev', 'ai', 'cloud', 'digital', 'live', 'blog', 'art', 'design', 'game',
            
            // 国家And地区顶级Domain
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
            
            // 特殊顶级Domain
            'eu', 'asia', 'travel', 'museum', 'jobs', 'coop', 'aero', 'cat', 'tel', 'post', 'arpa',
            
            // 常用商业And主题顶级Domain
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
            
            // a开Header的顶级Domain
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
            
            // b开Header的顶级Domain
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
            
            // c开Header的顶级Domain
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
            
            // d开Header的顶级Domain
            'dad', 'dance', 'data', 'date', 'dating', 'datsun', 'day', 'dclk', 'dds', 'de',
            'deal', 'dealer', 'deals', 'degree', 'delivery', 'dell', 'deloitte', 'delta',
            'democrat', 'dental', 'dentist', 'desi', 'design', 'dev', 'dhl', 'diamonds',
            'diet', 'digital', 'direct', 'directory', 'discount', 'discover', 'dish', 'diy',
            'dj', 'dk', 'dm', 'dnp', 'do', 'docs', 'doctor', 'dog', 'domains', 'dot',
            'download', 'drive', 'dtv', 'dubai', 'dunlop', 'dupont', 'durban', 'dvag',
            'dvr', 'dz',
            
            // e开Header的顶级Domain
            'earth', 'eat', 'ec', 'eco', 'edeka', 'edu', 'education', 'ee', 'eg', 'email',
            'emerck', 'energy', 'engineer', 'engineering', 'enterprises', 'epson', 'equipment',
            'er', 'ericsson', 'erni', 'es', 'esq', 'estate', 'et', 'eu', 'eurovision',
            'eus', 'events', 'exchange', 'expert', 'exposed', 'express', 'extraspace',
            
            // f开Header的顶级Domain
            'fage', 'fail', 'fairwinds', 'faith', 'family', 'fan', 'fans', 'farm', 'farmers',
            'fashion', 'fast', 'fedex', 'feedback', 'ferrari', 'ferrero', 'fi', 'fidelity',
            'fido', 'film', 'final', 'finance', 'financial', 'fire', 'firestone', 'firmdale',
            'fish', 'fishing', 'fit', 'fitness', 'fj', 'fk', 'flickr', 'flights', 'flir',
            'florist', 'flowers', 'fly', 'fm', 'fo', 'foo', 'food', 'football', 'ford',
            'forex', 'forsale', 'forum', 'foundation', 'fox', 'fr', 'free', 'fresenius',
            'frl', 'frogans', 'frontier', 'ftr', 'fujitsu', 'fun', 'fund', 'furniture',
            'futbol', 'fyi',
            
            // g开Header的顶级Domain
            'ga', 'gal', 'gallery', 'gallo', 'gallup', 'game', 'games', 'gap', 'garden',
            'gay', 'gb', 'gbiz', 'gd', 'gdn', 'ge', 'gea', 'gent', 'genting', 'george',
            'gf', 'gg', 'ggee', 'gh', 'gi', 'gift', 'gifts', 'gives', 'giving', 'gl',
            'glass', 'gle', 'global', 'globo', 'gm', 'gmail', 'gmbh', 'gmo', 'gmx', 'gn',
            'godaddy', 'gold', 'goldpoint', 'golf', 'goo', 'goodyear', 'goog', 'google',
            'gop', 'got', 'gov', 'gp', 'gq', 'gr', 'grainger', 'graphics', 'gratis',
            'green', 'gripe', 'grocery', 'group', 'gs', 'gt', 'gu', 'gucci', 'guge',
            'guide', 'guitars', 'guru', 'gw', 'gy',
            
            // h开Header的顶级Domain
            'hair', 'hamburg', 'hangout', 'haus', 'hbo', 'hdfc', 'hdfcbank', 'health',
            'healthcare', 'help', 'helsinki', 'here', 'hermes', 'hiphop', 'hisamitsu',
            'hitachi', 'hiv', 'hk', 'hkt', 'hm', 'hn', 'hockey', 'holdings', 'holiday',
            'homedepot', 'homegoods', 'homes', 'homesense', 'honda', 'horse', 'hospital',
            'host', 'hosting', 'hot', 'hotels', 'hotmail', 'house', 'how', 'hr', 'hsbc',
            'ht', 'hu', 'hughes', 'hyatt', 'hyundai',
            
            // i开Header的顶级Domain
            'ibm', 'icbc', 'ice', 'icu', 'id', 'ie', 'ieee', 'ifm', 'ikano', 'il', 'im',
            'imamat', 'imdb', 'immo', 'immobilien', 'in', 'inc', 'industries', 'infiniti',
            'info', 'ing', 'ink', 'institute', 'insurance', 'insure', 'int', 'international',
            'intuit', 'investments', 'io', 'ipiranga', 'iq', 'ir', 'irish', 'is', 'ismaili',
            'ist', 'istanbul', 'it', 'itau', 'itv',
            
            // j开Header的顶级Domain
            'jaguar', 'java', 'jcb', 'je', 'jeep', 'jetzt', 'jewelry', 'jio', 'jll', 'jm',
            'jmp', 'jnj', 'jo', 'jobs', 'joburg', 'jot', 'joy', 'jp', 'jpmorgan', 'jprs',
            'juegos', 'juniper',
            
            // k开Header的顶级Domain
            'kaufen', 'kddi', 'ke', 'kerryhotels', 'kerryproperties', 'kfh', 'kg', 'kh',
            'ki', 'kia', 'kids', 'kim', 'kindle', 'kitchen', 'kiwi', 'km', 'kn', 'koeln',
            'komatsu', 'kosher', 'kp', 'kpmg', 'kpn', 'kr', 'krd', 'kred', 'kuokgroup',
            'kw', 'ky', 'kyoto', 'kz',
            
            // l开Header的顶级Domain
            'la', 'lacaixa', 'lamborghini', 'lamer', 'land', 'landrover', 'lanxess',
            'lasalle', 'lat', 'latino', 'latrobe', 'law', 'lawyer', 'lb', 'lc', 'lds',
            'lease', 'leclerc', 'lefrak', 'legal', 'lego', 'lexus', 'lgbt', 'li', 'lidl',
            'life', 'lifeinsurance', 'lifestyle', 'lighting', 'like', 'lilly', 'limited',
            'limo', 'lincoln', 'link', 'live', 'living', 'lk', 'llc', 'llp', 'loan',
            'loans', 'locker', 'locus', 'lol', 'london', 'lotte', 'lotto', 'love', 'lpl',
            'lplfinancial', 'lr', 'ls', 'lt', 'ltd', 'ltda', 'lu', 'lundbeck', 'luxe',
            'luxury', 'lv', 'ly',
            
            // m开Header的顶级Domain
            'ma', 'madrid', 'maif', 'maison', 'makeup', 'man', 'management', 'mango',
            'map', 'market', 'marketing', 'markets', 'marriott', 'marshalls', 'mattel',
            'mba', 'mc', 'mckinsey', 'md', 'me', 'med', 'media', 'meet', 'melbourne',
            'meme', 'memorial', 'men', 'menu', 'merckmsd', 'mg', 'mh', 'miami', 'microsoft',
            'mil', 'mini', 'mint', 'mit', 'mitsubishi', 'mk', 'ml', 'mlb', 'mls', 'mm',
            'mma', 'mn', 'mo', 'mobi', 'mobile', 'moda', 'moe', 'moi', 'mom', 'monash',
            'money', 'monster', 'mormon', 'mortgage', 'moscow', 'moto', 'motorcycles',
            'mov', 'movie', 'mp', 'mq', 'mr', 'ms', 'msd', 'mt', 'mtn', 'mtr', 'mu',
            'museum', 'music', 'mv', 'mw', 'mx', 'my', 'mz',
            
            // n开Header的顶级Domain
            'na', 'nab', 'nagoya', 'name', 'navy', 'nba', 'nc', 'ne', 'nec', 'net',
            'netbank', 'netflix', 'network', 'neustar', 'new', 'news', 'next', 'nextdirect',
            'nexus', 'nf', 'nfl', 'ng', 'ngo', 'nhk', 'ni', 'nico', 'nike', 'nikon',
            'ninja', 'nissan', 'nissay', 'nl', 'no', 'nokia', 'norton', 'now', 'nowruz',
            'nowtv', 'np', 'nr', 'nra', 'nrw', 'ntt', 'nu', 'nyc', 'nz',
            
            // o开Header的顶级Domain
            'obi', 'observer', 'office', 'okinawa', 'olayan', 'olayangroup', 'ollo', 'om',
            'omega', 'one', 'ong', 'onl', 'online', 'ooo', 'open', 'oracle', 'orange',
            'org', 'organic', 'origins', 'osaka', 'otsuka', 'ott', 'ovh',
            
            // p开Header的顶级Domain
            'pa', 'page', 'panasonic', 'paris', 'pars', 'partners', 'parts', 'party',
            'pay', 'pccw', 'pe', 'pet', 'pf', 'pfizer', 'pg', 'ph', 'pharmacy', 'phd',
            'philips', 'phone', 'photo', 'photography', 'photos', 'physio', 'pics', 'pictet',
            'pictures', 'pid', 'pin', 'ping', 'pink', 'pioneer', 'pizza', 'pk', 'pl',
            'place', 'play', 'playstation', 'plumbing', 'plus', 'pm', 'pn', 'pnc', 'pohl',
            'poker', 'politie', 'porn', 'post', 'pr', 'praxi', 'press', 'prime', 'pro',
            'prod', 'productions', 'prof', 'progressive', 'promo', 'properties', 'property',
            'protection', 'pru', 'prudential', 'ps', 'pt', 'pub', 'pw', 'pwc', 'py',
            
            // q开Header的顶级Domain
            'qa', 'qpon', 'quebec', 'quest',
            
            // r开Header的顶级Domain
            'racing', 'radio', 're', 'read', 'realestate', 'realtor', 'realty', 'recipes',
            'red', 'redstone', 'redumbrella', 'rehab', 'reise', 'reisen', 'reit', 'reliance',
            'ren', 'rent', 'rentals', 'repair', 'report', 'republican', 'rest', 'restaurant',
            'review', 'reviews', 'rexroth', 'rich', 'richardli', 'ricoh', 'ril', 'rio',
            'rip', 'ro', 'rocks', 'rodeo', 'rogers', 'room', 'rs', 'rsvp', 'ru', 'rugby',
            'ruhr', 'run', 'rw', 'rwe', 'ryukyu',
            
            // s开Header的顶级Domain
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
            
            // t开Header的顶级Domain
            'tab', 'taipei', 'talk', 'taobao', 'target', 'tatamotors', 'tatar', 'tattoo',
            'tax', 'taxi', 'tc', 'tci', 'td', 'tdk', 'team', 'tech', 'technology', 'tel',
            'temasek', 'tennis', 'teva', 'tf', 'tg', 'th', 'thd', 'theater', 'theatre',
            'tiaa', 'tickets', 'tienda', 'tips', 'tires', 'tirol', 'tj', 'tjmaxx', 'tjx',
            'tk', 'tkmaxx', 'tl', 'tm', 'tmall', 'tn', 'to', 'today', 'tokyo', 'tools',
            'top', 'toray', 'toshiba', 'total', 'tours', 'town', 'toyota', 'toys', 'tr',
            'trade', 'trading', 'training', 'travel', 'travelers', 'travelersinsurance',
            'trust', 'trv', 'tt', 'tube', 'tui', 'tunes', 'tushu', 'tv', 'tvs', 'tw', 'tz',
            
            // u开Header的顶级Domain
            'ua', 'ubank', 'ubs', 'ug', 'uk', 'unicom', 'university', 'uno', 'uol', 'ups',
            'us', 'uy', 'uz',
            
            // v开Header的顶级Domain
            'va', 'vacations', 'vana', 'vanguard', 'vc', 've', 'vegas', 'ventures',
            'verisign', 'versicherung', 'vet', 'vg', 'vi', 'viajes', 'video', 'vig',
            'viking', 'villas', 'vin', 'vip', 'virgin', 'visa', 'vision', 'viva', 'vivo',
            'vlaanderen', 'vn', 'vodka', 'volvo', 'vote', 'voting', 'voto', 'voyage', 'vu',
            
            // w开Header的顶级Domain
            'wales', 'walmart', 'walter', 'wang', 'wanggou', 'watch', 'watches', 'weather',
            'weatherchannel', 'webcam', 'weber', 'website', 'wed', 'wedding', 'weibo', 'weir',
            'wf', 'whoswho', 'wien', 'wiki', 'williamhill', 'win', 'windows', 'wine',
            'winners', 'wme', 'wolterskluwer', 'woodside', 'work', 'works', 'world', 'wow',
            'ws', 'wtc', 'wtf',
            
            // x开Header的顶级Domain
            'xbox', 'xerox', 'xihuan', 'xin', 'xxx', 'xyz',
            
            // y开Header的顶级Domain
            'yachts', 'yahoo', 'yamaxun', 'yandex', 'ye', 'yodobashi', 'yoga', 'yokohama',
            'you', 'youtube', 'yt', 'yun',
            
            // z开Header的顶级Domain
            'za', 'zappos', 'zara', 'zero', 'zip', 'zm', 'zone', 'zuerich', 'zw',
            
            // 其他语言的顶级Domain
            'xn--p1ai', 'xn--80asehdb', 'xn--80aswg', 'xn--j1amh', 'xn--90ais'
        ]);
    }
    
    /**
     * LoadInvalid的FileAfter缀列Table
     */
    loadInvalidSuffixes() {
        return new Set([
            // 常见ResourceFileAfter缀
            'js', 'css', 'html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'png', 'jpg', 'jpeg', 
            'gif', 'bmp', 'ico', 'svg', 'webp', 'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar', 'tar', 'gz',
            'json', 'xml', 'txt', 'log', 'md', 'scss', 'less', 'ts', 'tsx', 'jsx', 'vue',
            'woff', 'woff2', 'ttf', 'eot', 'otf', 'swf', 'map'
        ]);
    }
    
    /**
     * Check是否是Valid的Domain
     * @param {string} domain PendingCheck的Domain
     * @returns {boolean} 是否是ValidDomain
     */
    isValidDomain(domain) {
        if (!domain || typeof domain !== 'string') return false;
        
        // RemoveBefore缀AndPath
        domain = domain.toLowerCase().trim();
        domain = domain.replace(/^https?:\/\//, '');
        domain = domain.replace(/^www\./, '');
        domain = domain.split('/')[0];
        domain = domain.split('?')[0];
        domain = domain.split('#')[0];
        domain = domain.split(':')[0];
        
        // Filter掉明显不是Domain的Content
        if (domain.length < 3) return false;
        if (domain.startsWith('.') || domain.endsWith('.')) return false;
        if (domain.includes('..')) return false;
        
        // Check是否包含点号（Domain必须有点号）
        if (!domain.includes('.')) return false;
        
        // Check基本Format
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z0-9\-]+$/i;
        if (!domainRegex.test(domain)) return false;
        
        // Check顶级Domain是否Valid
        const parts = domain.split('.');
        if (parts.length < 2) return false;
        
        const tld = parts[parts.length - 1];
        
        // Check是否是数字After缀（通常不是Valid的顶级Domain）
        if (/^\d+$/.test(tld)) return false;
        
        // Check是否是ResourceFileAfter缀
        if (this.invalidSuffixes.has(tld)) return false;
        
        // CheckTLD长度（Valid的TLD通常在2-63个字符之间）
        if (tld.length < 2 || tld.length > 63) return false;
        
        // Check是否是Valid的顶级Domain
        if (!this.domainTLDs.has(tld)) return false;
        
        // 额外Check：Filter掉一些明显不是Domain的Pattern
        // Filter掉纯数字Domain（除了IP地址Format）
        const isIPAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
        if (!isIPAddress && /^\d+\.\d+/.test(domain)) return false;
        
        // Filter掉包含特殊字符的Domain
        if (/[<>(){}[\]"'`~!@#$%^&*+=|\\;,]/.test(domain)) return false;
        
        return true;
    }
    
    /**
     * Check是否是Valid的China手机号
     * @param {string} phone PendingCheck的手机号
     * @returns {boolean} 是否是Valid手机号
     */
    isValidChinesePhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove所有非数字字符AndProcess国家码（+86/86/0086）
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('0086')) cleaned = cleaned.slice(4);
        else if (cleaned.startsWith('86')) cleaned = cleaned.slice(2);
        
        // 截取最After11位，避免Before缀残留
        if (cleaned.length > 11) {
            cleaned = cleaned.slice(-11);
        }
        
        // China手机号规则：1开Header，11 digits
        if (cleaned.length !== 11) return false;
        if (cleaned[0] !== '1') return false;
        
        // Check运营商Before缀
        // 移动: 134-139, 147-148, 150-152, 157-159, 165, 172, 178, 182-184, 187-188, 195, 197-198
        // 联通: 130-132, 145-146, 155-156, 166, 167, 171, 175-176, 185-186, 196
        // 电信: 133, 149, 153, 173-174, 177, 180-181, 189, 191, 193, 199
        // 广电: 192
        // 虚拟运营商: 162, 165, 167, 170-171, 192
        const validPrefixes = /^1(3[0-9]|4[5-9]|5[0-3,5-9]|6[2,5-7]|7[0-8]|8[0-9]|9[1,3,5-9])/;
        return validPrefixes.test(cleaned);
    }
    
    /**
     * Check是否是Valid的国际手机号
     * @param {string} phone PendingCheck的手机号
     * @returns {boolean} 是否是Valid手机号
     */
    isValidInternationalPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove所有非数字字符And开Header的+号
        const originalPhone = phone;
        phone = phone.replace(/^\+/, '').replace(/\D/g, '');
        
        // Filter掉明显不是手机号的数字
        // 1. 长度Check：国际手机号通常在7-15位之间
        if (phone.length < 7 || phone.length > 15) return false;
        
        // 2. 排除明显不是手机号的数字序列
        if (/^(.)\1+$/.test(phone)) return false; // 全相同数字
        if (/^0+$/.test(phone)) return false; // 全0
        if (/^1+$/.test(phone)) return false; // 全1
        if (/^(0123456789|1234567890|9876543210|0987654321)/.test(phone)) return false; // 顺序数字
        
        // 3. 排除小数点数字（如 227.7371）
        if (originalPhone.includes('.')) return false;
        
        // 4. 排除带有减号但不是Phone号码Format的数字
        if (originalPhone.includes('-')) {
            // 如果包含减号，Check是否是合理的Phone号码Format
            const dashCount = (originalPhone.match(/-/g) || []).length;
            if (dashCount > 3) return false; // 减号太多
            
            // Check减号BeforeAfter是否都是数字
            const parts = originalPhone.split('-');
            for (let part of parts) {
                if (!/^\d+$/.test(part.replace(/^\+/, ''))) return false;
            }
        }
        
        // 5. 排除过短的数字（可能是版本号、ID等）
        if (phone.length < 8) return false;
        
        // 6. 排除明显是其他TypeData的数字
        // 排除看起来像坐标、尺寸、版本号等的数字
        if (/^\d{1,3}\.\d+$/.test(originalPhone)) return false; // 小数
        if (/^\d{4}$/.test(phone)) return false; // 4位数字（可能是年份）
        if (/^[12]\d{3}$/.test(phone)) return false; // 看起来像年份的4位数字
        
        return true;
    }
    
    /**
     * Check是否是Valid的邮箱地址
     * @param {string} email PendingCheck的邮箱地址
     * @returns {boolean} 是否是Valid邮箱
     */
    isValidEmail(email) {
        if (!email) return false;
        
        // 基本邮箱FormatCheck
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) return false;
        
        // CheckDomain部分是否Valid
        const domain = email.split('@')[1];
        return this.isValidDomain(domain);
    }
    
    /**
     * FilterDomain列Table，Only保留ValidDomain
     * @param {string[]} domains Domain列Table
     * @returns {string[]} ValidDomain列Table
     */
    filterDomains(domains) {
        if (!domains || !Array.isArray(domains)) return [];
        
        const validDomains = new Set(); // 使用SetAuto去重
        
        for (let domain of domains) {
            if (!domain || typeof domain !== 'string') continue;
            
            // ExtractDomain部分
            let cleanDomain = domain.toLowerCase().trim();
            
            // RemoveProtocolBefore缀
            cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
            cleanDomain = cleanDomain.replace(/^ftp:\/\//, '');
            cleanDomain = cleanDomain.replace(/^ftps:\/\//, '');
            
            // RemovewwwBefore缀
            cleanDomain = cleanDomain.replace(/^www\./, '');
            
            // RemovePath、QueryParameterAnd锚点
            cleanDomain = cleanDomain.split('/')[0];
            cleanDomain = cleanDomain.split('?')[0];
            cleanDomain = cleanDomain.split('#')[0];
            cleanDomain = cleanDomain.split(':')[0]; // Remove端口号
            
            // Filter掉明显不是Domain的Content
            if (!cleanDomain || cleanDomain.length < 3) continue;
            if (cleanDomain.startsWith('.') || cleanDomain.endsWith('.')) continue;
            if (!cleanDomain.includes('.')) continue; // Domain必须包含点号
            
            // Filter掉包含localStorage、sessionStorage等浏览器API的Content
            if (cleanDomain.includes('localStorage') || 
                cleanDomain.includes('sessionStorage') || 
                cleanDomain.includes('indexedDB') ||
                cleanDomain.includes('webkitStorage')) continue;
            
            // Check是否是ValidDomain
            if (this.isValidDomain(cleanDomain)) {
                validDomains.add(cleanDomain);
            }
        }
        
        return Array.from(validDomains);
    }
    
    /**
     * Filter手机号列Table，Only保留Valid手机号
     * @param {string[]} phones 手机号列Table
     * @param {boolean} chineseOnly 是否OnlyFilterChina手机号
     * @returns {string[]} Valid手机号列Table
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
     * Filter邮箱地址列Table，Only保留Valid邮箱
     * @param {string[]} emails 邮箱地址列Table
     * @returns {string[]} Valid邮箱列Table
     */
    filterEmails(emails) {
        if (!emails || !Array.isArray(emails)) return [];
        
        return emails.filter(email => this.isValidEmail(email));
    }
    
    /**
     * Extract from textDomain
     * @param {string} text Pending分析的文本
     * @returns {string[]} Extract的Domain列Table
     */
    extractDomainsFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,})(?:\/[^\s]*)?/gi;
        const matches = [];
        let match;
        
        while ((match = domainRegex.exec(text)) !== null) {
            // ExtractDomain部分（不包括PathAndQueryParameter）
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
     * Extract from text手机号
     * @param {string} text Pending分析的文本
     * @returns {string[]} Extract的手机号列Table
     */
    extractPhonesFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const matches = [];
        
        // China手机号Pattern：1开Header的11 digits
        const cnPhoneRegex = /(?<!\d)(?:1(3([0-35-9]\d|4[1-8])|4[14-9]\d|5(\d\d|7[1-79])|66\d|7[2-35-8]\d|8\d{2}|9[89]\d)\d{7})(?!\d)/g;
        let cnMatch;
        while ((cnMatch = cnPhoneRegex.exec(text)) !== null) {
            matches.push(cnMatch[0]);
        }
        
        // 国际手机号Pattern：可能带有国家代码的6-15位数字
        const intlPhoneRegex = /(?<!\d)(?:\+\d{1,3}[\s-]?)?\d{6,15}(?!\d)/g;
        let intlMatch;
        while ((intlMatch = intlPhoneRegex.exec(text)) !== null) {
            // 避免与China手机号重复
            if (!matches.includes(intlMatch[0])) {
                matches.push(intlMatch[0]);
            }
        }
        
        return matches;
    }
    
    /**
     * Extract from text邮箱地址
     * @param {string} text Pending分析的文本
     * @returns {string[]} Extract的邮箱列Table
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
     * Process文本，ExtractAndFilterDomain、手机号And邮箱
     * @param {string} text PendingProcess的文本
     * @returns {Object} 包含ValidDomain、手机号And邮箱的Object
     */
    processText(text) {
        if (!text || typeof text !== 'string') {
            return {
                domains: [],
                phoneNumbers: [],
                emails: []
            };
        }
        
        // ExtractDomain
        const domainMatches = this.extractDomainsFromText(text);
        const validDomains = this.filterDomains(domainMatches);
        
        // Extract手机号（仅China大陆）
        const phoneMatches = this.extractPhonesFromText(text);
        const validPhones = this.filterPhones(phoneMatches, true);
        
        // Extract邮箱
        const emailMatches = this.extractEmailsFromText(text);
        const validEmails = this.filterEmails(emailMatches);
        
        return {
            domains: validDomains,
            phoneNumbers: validPhones,
            emails: validEmails
        };
    }
}

// 支持多种模块System
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomainPhoneFilter;
} else if (typeof window !== 'undefined') {
    window.DomainPhoneFilter = DomainPhoneFilter;
}
