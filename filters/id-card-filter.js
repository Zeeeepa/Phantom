/**
 * ID cardnumbervalidationthrough滤器
 * support15-digitand18-digit ID cardnumbervalidation
 */

class IdCardFilter {
    constructor() {
        // provincecode映射
        this.provinceCodes = {
            '11': 'Beijing', '12': 'Tianjin', '13': 'Hebei', '14': 'Shanxi', '15': 'Inner Mongolia',
            '21': 'Liaoning', '22': 'Jilin', '23': 'Heilongjiang',
            '31': 'Shanghai', '32': 'Jiangsu', '33': 'Zhejiang', '34': 'Anhui', '35': 'Fujian', '36': 'Jiangxi', '37': 'Shandong',
            '41': 'Henan', '42': 'Hubei', '43': 'Hunan', '44': 'Guangdong', '45': 'Guangxi', '46': 'Hainan',
            '50': 'Chongqing', '51': 'Sichuan', '52': 'Guizhou', '53': 'Yunnan', '54': 'Tibet',
            '61': 'Shaanxi', '62': 'Gansu', '63': 'Qinghai', '64': 'Ningxia', '65': 'Xinjiang',
            '71': 'Taiwan', '81': 'Hong Kong', '82': 'Macao'
        };
        
        // check digitweight
        this.weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        // check digitcorrespond表
        this.checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    }

    /**
     * validationID cardnumber
     * @param {string} idCard - ID cardnumber
     * @returns {Object} validationresult
     */
    validate(idCard) {
        if (!idCard) {
            return { valid: false, error: 'ID cardnumbernot能为空' };
        }

        // 去除空格andconvert为大写
        idCard = idCard.replace(/\s/g, '').toUpperCase();

        // 长度validation
        if (idCard.length !== 15 && idCard.length !== 18) {
            return { valid: false, error: 'ID cardnumber长度incorrect' };
        }

        // formatvalidation
        if (idCard.length === 15) {
            return this.validate15(idCard);
        } else {
            return this.validate18(idCard);
        }
    }

    /**
     * validation15-digit ID card
     * @param {string} idCard - 15-digit ID cardnumber
     * @returns {Object} validationresult
     */
    validate15(idCard) {
        // formatcheck：before14位必须是数字，第15-digit是数字
        if (!/^\d{15}$/.test(idCard)) {
            return { valid: false, error: '15-digit ID cardnumberformatincorrect' };
        }

        // provincecodevalidation
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: 'provincecodeincorrect' };
        }

        // birth datevalidation（15-digit ID cardyear为two digits，默认19xxyear）
        const year = parseInt('19' + idCard.substring(6, 8));
        const month = parseInt(idCard.substring(8, 10));
        const day = parseInt(idCard.substring(10, 12));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: 'birth dateincorrect' };
        }

        return {
            valid: true,
            type: '15-digit ID card',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(14)) % 2 === 0 ? 'female' : 'male'
        };
    }

    /**
     * validation18-digit ID card
     * @param {string} idCard - 18-digit ID cardnumber
     * @returns {Object} validationresult
     */
    validate18(idCard) {
        // formatcheck：before17位必须是数字，第18-digit是数字orX
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            return { valid: false, error: '18-digit ID cardnumberformatincorrect' };
        }

        // provincecodevalidation
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: 'provincecodeincorrect' };
        }

        // birth datevalidation
        const year = parseInt(idCard.substring(6, 10));
        const month = parseInt(idCard.substring(10, 12));
        const day = parseInt(idCard.substring(12, 14));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: 'birth dateincorrect' };
        }

        // check digitvalidation
        if (!this.validateCheckCode(idCard)) {
            return { valid: false, error: 'check digitincorrect' };
        }

        return {
            valid: true,
            type: '18-digit ID card',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(16)) % 2 === 0 ? 'female' : 'male'
        };
    }

    /**
     * validationdate是否valid
     * @param {number} year - year
     * @param {number} month - month
     * @param {number} day - date
     * @returns {boolean} 是否valid
     */
    isValidDate(year, month, day) {
        // year范围check
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            return false;
        }

        // monthcheck
        if (month < 1 || month > 12) {
            return false;
        }

        // datecheck
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }

        return true;
    }

    /**
     * validation18-digit ID cardcheck digit
     * @param {string} idCard - 18-digit ID cardnumber
     * @returns {boolean} check digit是否正确
     */
    validateCheckCode(idCard) {
        let sum = 0;
        for (let i = 0; i < 17; i++) {
            sum += parseInt(idCard.charAt(i)) * this.weights[i];
        }
        const checkCodeIndex = sum % 11;
        const expectedCheckCode = this.checkCodes[checkCodeIndex];
        return idCard.charAt(17) === expectedCheckCode;
    }

    /**
     * from文本inextractID cardnumber
     * @param {string} text - 待detect文本
     * @returns {Array} extracttoID cardnumber数组
     */
    extractIdCards(text) {
        if (!text) return [];

        const idCards = [];
        
        // 18-digit ID cardregex
        const regex18 = /\b\d{17}[\dX]\b/g;
        // 15-digit ID cardregex
        const regex15 = /\b\d{15}\b/g;

        let matches;
        
        // extract18-digit ID card
        while ((matches = regex18.exec(text)) !== null) {
            const idCard = matches[0];
            const result = this.validate(idCard);
            if (result.valid) {
                idCards.push({
                    value: idCard,
                    position: matches.index,
                    ...result
                });
            }
        }

        // extract15-digit ID card
        while ((matches = regex15.exec(text)) !== null) {
            const idCard = matches[0];
            const result = this.validate(idCard);
            if (result.valid) {
                idCards.push({
                    value: idCard,
                    position: matches.index,
                    ...result
                });
            }
        }

        return idCards;
    }

    /**
     * check文本in是否containsID cardnumber
     * @param {string} text - 待detect文本
     * @returns {boolean} 是否containsID cardnumber
     */
    hasIdCard(text) {
        return this.extractIdCards(text).length > 0;
    }

    /**
     * 脱敏ID cardnumber
     * @param {string} idCard - ID cardnumber
     * @param {string} maskChar - 脱敏字符，默认为*
     * @returns {string} 脱敏后ID cardnumber
     */
    maskIdCard(idCard, maskChar = '*') {
        if (!idCard) return '';
        
        const result = this.validate(idCard);
        if (!result.valid) return idCard;

        if (idCard.length === 15) {
            // 15-digit ID card：keepbefore6位and后3位
            return idCard.substring(0, 6) + maskChar.repeat(6) + idCard.substring(12);
        } else {
            // 18-digit ID card：keepbefore6位and后4位
            return idCard.substring(0, 6) + maskChar.repeat(8) + idCard.substring(14);
        }
    }
}

// export单例实例
const idCardFilter = new IdCardFilter();

// 兼容not同mod块系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = idCardFilter;
} else if (typeof window !== 'undefined') {
    window.idCardFilter = idCardFilter;
}