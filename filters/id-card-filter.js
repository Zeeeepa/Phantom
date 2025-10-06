/**
 * ID card number validate filter
 * support15-digitand18-digit ID card number validate
 */

class IdCardFilter {
    constructor() {
        // provincecode map
        this.provinceCodes = {
            '11': 'Beijing', '12': 'Tianjin', '13': 'Hebei', '14': 'Shanxi', '15': 'Inner Mongolia',
            '21': 'Liaoning', '22': 'Jilin', '23': 'Heilongjiang',
            '31': '上海', '32': '江苏', '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
            '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西', '46': '海南',
            '50': '重庆', '51': '四川', '52': '贵州', '53': '云南', '54': '西藏',
            '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
            '71': '台湾', '81': '香港', '82': '澳门'
        };
        
        // 校验码权重
        this.weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        // 校验码对应表
        this.checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    }

    /**
     * validate ID card number
     * @param {string} idCard - ID card number
     * @returns {Object} validate result
     */
    validate(idCard) {
        if (!idCard) {
            return { valid: false, error: 'ID card numberdo not能to empty' };
        }

        // 去除 empty 格并转to大写
        idCard = idCard.replace(/\s/g, '').toUpperCase();

        // length validate
        if (idCard.length !== 15 && idCard.length !== 18) {
            return { valid: false, error: 'ID card number length do not正确' };
        }

        // format validate
        if (idCard.length === 15) {
            return this.validate15(idCard);
        } else {
            return this.validate18(idCard);
        }
    }

    /**
     * validate 15-digit ID card
     * @param {string} idCard - 15-digit ID card number
     * @returns {Object} validate result
     */
    validate15(idCard) {
        // format check：before14-digit必须是 number，第15-digit是 number
        if (!/^\d{15}$/.test(idCard)) {
            return { valid: false, error: '15-digit ID card number format do not正确' };
        }

        // provincecode validate
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: 'provincecodedo not正确' };
        }

        // 出生日期 validate（15-digit ID card 年份to两位数，default 19xx年）
        const year = parseInt('19' + idCard.substring(6, 8));
        const month = parseInt(idCard.substring(8, 10));
        const day = parseInt(idCard.substring(10, 12));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生日期do not正确' };
        }

        return {
            valid: true,
            type: '15-digit ID card',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(14)) % 2 === 0 ? '女' : '男'
        };
    }

    /**
     * validate 18-digit ID card
     * @param {string} idCard - 18-digit ID card number
     * @returns {Object} validate result
     */
    validate18(idCard) {
        // format check：before17-digit必须是 number，第18-digit是 number orX
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            return { valid: false, error: '18-digit ID card number format do not正确' };
        }

        // provincecode validate
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: 'provincecodedo not正确' };
        }

        // 出生日期 validate
        const year = parseInt(idCard.substring(6, 10));
        const month = parseInt(idCard.substring(10, 12));
        const day = parseInt(idCard.substring(12, 14));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生日期do not正确' };
        }

        // 校验码 validate
        if (!this.validateCheckCode(idCard)) {
            return { valid: false, error: '校验码do not正确' };
        }

        return {
            valid: true,
            type: '18-digit ID card',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(16)) % 2 === 0 ? '女' : '男'
        };
    }

    /**
     * validate 日期是否 valid
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @returns {boolean} 是否 valid
     */
    isValidDate(year, month, day) {
        // 年份 range check
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            return false;
        }

        // 月份 check
        if (month < 1 || month > 12) {
            return false;
        }

        // 日期 check
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }

        return true;
    }

    /**
     * validate 18-digit ID card 校验码
     * @param {string} idCard - 18-digit ID card number
     * @returns {boolean} 校验码是否正确
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
     * from text in extract ID card number
     * @param {string} text - 待检测 text
     * @returns {Array} extract 到  ID card number array
     */
    extractIdCards(text) {
        if (!text) return [];

        const idCards = [];
        
        // 18-digit ID card regex
        const regex18 = /\b\d{17}[\dX]\b/g;
        // 15-digit ID card regex
        const regex15 = /\b\d{15}\b/g;

        let matches;
        
        // extract 18-digit ID card
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

        // extract 15-digit ID card
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
     * check text in是否 contains ID card number
     * @param {string} text - 待检测 text
     * @returns {boolean} 是否 contains ID card number
     */
    hasIdCard(text) {
        return this.extractIdCards(text).length > 0;
    }

    /**
     * 脱敏 ID card number
     * @param {string} idCard - ID card number
     * @param {string} maskChar - 脱敏字符，default to*
     * @returns {string} 脱敏后  ID card number
     */
    maskIdCard(idCard, maskChar = '*') {
        if (!idCard) return '';
        
        const result = this.validate(idCard);
        if (!result.valid) return idCard;

        if (idCard.length === 15) {
            // 15-digit ID card：keepbefore6-digitand后3-digit
            return idCard.substring(0, 6) + maskChar.repeat(6) + idCard.substring(12);
        } else {
            // 18-digit ID card：keepbefore6-digitand后4-digit
            return idCard.substring(0, 6) + maskChar.repeat(8) + idCard.substring(14);
        }
    }
}

// export singleton 实例
const idCardFilter = new IdCardFilter();

// 兼容do not同  module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = idCardFilter;
} else if (typeof window !== 'undefined') {
    window.idCardFilter = idCardFilter;
}