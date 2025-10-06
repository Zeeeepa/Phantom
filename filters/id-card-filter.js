/**
 * 身份证号码ValidateFilter
 * 支持15位And18-digit ID card号码Validate
 */

class IdCardFilter {
    constructor() {
        // 省份代码映射
        this.provinceCodes = {
            '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
            '21': '辽宁', '22': '吉林', '23': '黑龙江',
            '31': '上海', '32': '江苏', '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
            '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西', '46': '海南',
            '50': '重庆', '51': '四川', '52': '贵州', '53': '云南', '54': '西藏',
            '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
            '71': '台湾', '81': '香港', '82': '澳门'
        };
        
        // 校验码权重
        this.weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        // 校验码对应Table
        this.checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    }

    /**
     * Validate身份证号码
     * @param {string} idCard - 身份证号码
     * @returns {Object} ValidateResult
     */
    validate(idCard) {
        if (!idCard) {
            return { valid: false, error: '身份证号码不能is empty' };
        }

        // 去除Empty格And转为大写
        idCard = idCard.replace(/\s/g, '').toUpperCase();

        // 长度Validate
        if (idCard.length !== 15 && idCard.length !== 18) {
            return { valid: false, error: '身份证号码长度不正确' };
        }

        // FormatValidate
        if (idCard.length === 15) {
            return this.validate15(idCard);
        } else {
            return this.validate18(idCard);
        }
    }

    /**
     * Validate15-digit ID card
     * @param {string} idCard - 15-digit ID number
     * @returns {Object} ValidateResult
     */
    validate15(idCard) {
        // FormatCheck：Before14位必须是数字，第15位是数字
        if (!/^\d{15}$/.test(idCard)) {
            return { valid: false, error: '15-digit ID numberFormat不正确' };
        }

        // 省份代码Validate
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: '省份代码不正确' };
        }

        // 出生DateValidate（15-digit ID card年份为两位数，Default19xx年）
        const year = parseInt('19' + idCard.substring(6, 8));
        const month = parseInt(idCard.substring(8, 10));
        const day = parseInt(idCard.substring(10, 12));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生Date不正确' };
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
     * Validate18-digit ID card
     * @param {string} idCard - 18-digit ID card号码
     * @returns {Object} ValidateResult
     */
    validate18(idCard) {
        // FormatCheck：Before17位必须是数字，第18位是数字OrX
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            return { valid: false, error: '18-digit ID card号码Format不正确' };
        }

        // 省份代码Validate
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: '省份代码不正确' };
        }

        // 出生DateValidate
        const year = parseInt(idCard.substring(6, 10));
        const month = parseInt(idCard.substring(10, 12));
        const day = parseInt(idCard.substring(12, 14));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生Date不正确' };
        }

        // 校验码Validate
        if (!this.validateCheckCode(idCard)) {
            return { valid: false, error: '校验码不正确' };
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
     * ValidateDate是否Valid
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - Date
     * @returns {boolean} 是否Valid
     */
    isValidDate(year, month, day) {
        // 年份范围Check
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            return false;
        }

        // 月份Check
        if (month < 1 || month > 12) {
            return false;
        }

        // DateCheck
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }

        return true;
    }

    /**
     * Validate18-digit ID card校验码
     * @param {string} idCard - 18-digit ID card号码
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
     * Extract from text身份证号码
     * @param {string} text - PendingDetect文本
     * @returns {Array} Extract到的身份证号码数Group
     */
    extractIdCards(text) {
        if (!text) return [];

        const idCards = [];
        
        // 18-digit ID card正则
        const regex18 = /\b\d{17}[\dX]\b/g;
        // 15-digit ID card正则
        const regex15 = /\b\d{15}\b/g;

        let matches;
        
        // Extract18-digit ID card
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

        // Extract15-digit ID card
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
     * Check文本中是否包含身份证号码
     * @param {string} text - PendingDetect文本
     * @returns {boolean} 是否包含身份证号码
     */
    hasIdCard(text) {
        return this.extractIdCards(text).length > 0;
    }

    /**
     * 脱敏身份证号码
     * @param {string} idCard - 身份证号码
     * @param {string} maskChar - 脱敏字符，Default为*
     * @returns {string} 脱敏After的身份证号码
     */
    maskIdCard(idCard, maskChar = '*') {
        if (!idCard) return '';
        
        const result = this.validate(idCard);
        if (!result.valid) return idCard;

        if (idCard.length === 15) {
            // 15-digit ID card：保留Before6位AndAfter3位
            return idCard.substring(0, 6) + maskChar.repeat(6) + idCard.substring(12);
        } else {
            // 18-digit ID card：保留Before6位AndAfter4位
            return idCard.substring(0, 6) + maskChar.repeat(8) + idCard.substring(14);
        }
    }
}

// Export单例实例
const idCardFilter = new IdCardFilter();

// 兼容不同的模块System
if (typeof module !== 'undefined' && module.exports) {
    module.exports = idCardFilter;
} else if (typeof window !== 'undefined') {
    window.idCardFilter = idCardFilter;
}