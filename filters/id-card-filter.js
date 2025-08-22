/**
 * 身份证号码验证过滤器
 * 支持15位和18位身份证号码验证
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
        // 校验码对应表
        this.checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    }

    /**
     * 验证身份证号码
     * @param {string} idCard - 身份证号码
     * @returns {Object} 验证结果
     */
    validate(idCard) {
        if (!idCard) {
            return { valid: false, error: '身份证号码不能为空' };
        }

        // 去除空格并转为大写
        idCard = idCard.replace(/\s/g, '').toUpperCase();

        // 长度验证
        if (idCard.length !== 15 && idCard.length !== 18) {
            return { valid: false, error: '身份证号码长度不正确' };
        }

        // 格式验证
        if (idCard.length === 15) {
            return this.validate15(idCard);
        } else {
            return this.validate18(idCard);
        }
    }

    /**
     * 验证15位身份证
     * @param {string} idCard - 15位身份证号码
     * @returns {Object} 验证结果
     */
    validate15(idCard) {
        // 格式检查：前14位必须是数字，第15位是数字
        if (!/^\d{15}$/.test(idCard)) {
            return { valid: false, error: '15位身份证号码格式不正确' };
        }

        // 省份代码验证
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: '省份代码不正确' };
        }

        // 出生日期验证（15位身份证年份为两位数，默认19xx年）
        const year = parseInt('19' + idCard.substring(6, 8));
        const month = parseInt(idCard.substring(8, 10));
        const day = parseInt(idCard.substring(10, 12));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生日期不正确' };
        }

        return {
            valid: true,
            type: '15位身份证',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(14)) % 2 === 0 ? '女' : '男'
        };
    }

    /**
     * 验证18位身份证
     * @param {string} idCard - 18位身份证号码
     * @returns {Object} 验证结果
     */
    validate18(idCard) {
        // 格式检查：前17位必须是数字，第18位是数字或X
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            return { valid: false, error: '18位身份证号码格式不正确' };
        }

        // 省份代码验证
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: '省份代码不正确' };
        }

        // 出生日期验证
        const year = parseInt(idCard.substring(6, 10));
        const month = parseInt(idCard.substring(10, 12));
        const day = parseInt(idCard.substring(12, 14));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生日期不正确' };
        }

        // 校验码验证
        if (!this.validateCheckCode(idCard)) {
            return { valid: false, error: '校验码不正确' };
        }

        return {
            valid: true,
            type: '18位身份证',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(16)) % 2 === 0 ? '女' : '男'
        };
    }

    /**
     * 验证日期是否有效
     * @param {number} year - 年份
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @returns {boolean} 是否有效
     */
    isValidDate(year, month, day) {
        // 年份范围检查
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            return false;
        }

        // 月份检查
        if (month < 1 || month > 12) {
            return false;
        }

        // 日期检查
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }

        return true;
    }

    /**
     * 验证18位身份证校验码
     * @param {string} idCard - 18位身份证号码
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
     * 从文本中提取身份证号码
     * @param {string} text - 待检测文本
     * @returns {Array} 提取到的身份证号码数组
     */
    extractIdCards(text) {
        if (!text) return [];

        const idCards = [];
        
        // 18位身份证正则
        const regex18 = /\b\d{17}[\dX]\b/g;
        // 15位身份证正则
        const regex15 = /\b\d{15}\b/g;

        let matches;
        
        // 提取18位身份证
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

        // 提取15位身份证
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
     * 检查文本中是否包含身份证号码
     * @param {string} text - 待检测文本
     * @returns {boolean} 是否包含身份证号码
     */
    hasIdCard(text) {
        return this.extractIdCards(text).length > 0;
    }

    /**
     * 脱敏身份证号码
     * @param {string} idCard - 身份证号码
     * @param {string} maskChar - 脱敏字符，默认为*
     * @returns {string} 脱敏后的身份证号码
     */
    maskIdCard(idCard, maskChar = '*') {
        if (!idCard) return '';
        
        const result = this.validate(idCard);
        if (!result.valid) return idCard;

        if (idCard.length === 15) {
            // 15位身份证：保留前6位和后3位
            return idCard.substring(0, 6) + maskChar.repeat(6) + idCard.substring(12);
        } else {
            // 18位身份证：保留前6位和后4位
            return idCard.substring(0, 6) + maskChar.repeat(8) + idCard.substring(14);
        }
    }
}

// 导出单例实例
const idCardFilter = new IdCardFilter();

// 兼容不同的模块系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = idCardFilter;
} else if (typeof window !== 'undefined') {
    window.idCardFilter = idCardFilter;
}