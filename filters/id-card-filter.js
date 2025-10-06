/**
 * ID number filter validate
 * ID number validate digit(s) digit(s) and 支持1518
 */

class IdCardFilter {
    constructor() {
        // code 省份映射
        this.provinceCodes = {
            '11': '北京', '12': ' days 津', '13': '河北', '14': '山西', '15': '内蒙古',
            '21': '辽宁', '22': '吉林', '23': '黑龙江',
            '31': '上海', '32': '江苏', '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
            '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西', '46': '海南',
            '50': '重庆', '51': '四川', '52': '贵州', '53': '云南', '54': '西藏',
            '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
            '71': '台湾', '81': '香港', '82': '澳门'
        };
        
        // verify 码权重
        this.weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        // verify 码对应表
        this.checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    }

    /**
     * ID number validate
     * @param {string} idCard - ID number
     * @returns {Object} results validate
     */
    validate(idCard) {
        if (!idCard) {
            return { valid: false, error: 'ID number is empty 不能' };
        }

        // as empty 去除格并转大写
        idCard = idCard.replace(/\s/g, '').toUpperCase();

        // validate length
        if (idCard.length !== 15 && idCard.length !== 18) {
            return { valid: false, error: 'ID number length 不正确' };
        }

        // validate format
        if (idCard.length === 15) {
            return this.validate15(idCard);
        } else {
            return this.validate18(idCard);
        }
    }

    /**
     * ID card validate digit(s) 15
     * @param {string} idCard - ID number digit(s) 15
     * @returns {Object} results validate
     */
    validate15(idCard) {
        // check format：digit(s) digit(s) yes before 14必须，digit(s) digit(s) yes # 15
        if (!/^\d{15}$/.test(idCard)) {
            return { valid: false, error: 'format is incorrect ID number digit(s) 15' };
        }

        // code validate 省份
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: 'code 省份不正确' };
        }

        // validate 出生日期（ID card two digits year digit(s) as 15，default 19xx年）
        const year = parseInt('19' + idCard.substring(6, 8));
        const month = parseInt(idCard.substring(8, 10));
        const day = parseInt(idCard.substring(10, 12));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生日期不正确' };
        }

        return {
            valid: true,
            type: 'ID card digit(s) 15',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(14)) % 2 === 0 ? '女' : '男'
        };
    }

    /**
     * ID card validate digit(s) 18
     * @param {string} idCard - ID number digit(s) 18
     * @returns {Object} results validate
     */
    validate18(idCard) {
        // check format：digit(s) digit(s) yes before 17必须，digit(s) digit(s) yes # 18或X
        if (!/^\d{17}[\dX]$/.test(idCard)) {
            return { valid: false, error: 'format is incorrect ID number digit(s) 18' };
        }

        // code validate 省份
        const provinceCode = idCard.substring(0, 2);
        if (!this.provinceCodes[provinceCode]) {
            return { valid: false, error: 'code 省份不正确' };
        }

        // validate 出生日期
        const year = parseInt(idCard.substring(6, 10));
        const month = parseInt(idCard.substring(10, 12));
        const day = parseInt(idCard.substring(12, 14));

        if (!this.isValidDate(year, month, day)) {
            return { valid: false, error: '出生日期不正确' };
        }

        // validate verify 码
        if (!this.validateCheckCode(idCard)) {
            return { valid: false, error: 'verify 码不正确' };
        }

        return {
            valid: true,
            type: 'ID card digit(s) 18',
            province: this.provinceCodes[provinceCode],
            birthDate: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
            gender: parseInt(idCard.charAt(16)) % 2 === 0 ? '女' : '男'
        };
    }

    /**
     * validate no yes has 日期效
     * @param {number} year - year
     * @param {number} month - 月份
     * @param {number} day - 日期
     * @returns {boolean} no yes has 效
     */
    isValidDate(year, month, day) {
        // check year 范围
        const currentYear = new Date().getFullYear();
        if (year < 1900 || year > currentYear) {
            return false;
        }

        // check 月份
        if (month < 1 || month > 12) {
            return false;
        }

        // check 日期
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) {
            return false;
        }

        return true;
    }

    /**
     * ID card validate verify digit(s) 18码
     * @param {string} idCard - ID number digit(s) 18
     * @returns {boolean} verify no yes 码正确
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
     * ID number text extracted from in
     * @param {string} text - text detect 待
     * @returns {Array} ID number extracted array to of
     */
    extractIdCards(text) {
        if (!text) return [];

        const idCards = [];
        
        // ID card regex digit(s) 18
        const regex18 = /\b\d{17}[\dX]\b/g;
        // ID card regex digit(s) 15
        const regex15 = /\b\d{15}\b/g;

        let matches;
        
        // ID card extracted digit(s) 18
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

        // ID card extracted digit(s) 15
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
     * ID number text contains check in no yes
     * @param {string} text - text detect 待
     * @returns {boolean} ID number contains no yes
     */
    hasIdCard(text) {
        return this.extractIdCards(text).length > 0;
    }

    /**
     * ID number 脱敏
     * @param {string} idCard - ID number
     * @param {string} maskChar - characters 脱敏，default as *
     * @returns {string} ID number of after 脱敏
     */
    maskIdCard(idCard, maskChar = '*') {
        if (!idCard) return '';
        
        const result = this.validate(idCard);
        if (!result.valid) return idCard;

        if (idCard.length === 15) {
            // ID card digit(s) 15： digit(s) digit(s) and after before 保留63
            return idCard.substring(0, 6) + maskChar.repeat(6) + idCard.substring(12);
        } else {
            // ID card digit(s) 18： digit(s) digit(s) and after before 保留64
            return idCard.substring(0, 6) + maskChar.repeat(8) + idCard.substring(14);
        }
    }
}

// export instance 单例
const idCardFilter = new IdCardFilter();

// module of 兼容不同系统
if (typeof module !== 'undefined' && module.exports) {
    module.exports = idCardFilter;
} else if (typeof window !== 'undefined') {
    window.idCardFilter = idCardFilter;
}