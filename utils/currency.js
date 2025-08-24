/**
 * Currency utilities for HaruBot
 * Standardizes currency display and conversion
 * Main currency: Vietnamese Dong (VNĐ)
 * Exchange rate: 1$ = 25,000 VNĐ
 */

const CURRENCY_CONFIG = {
    // Main currency settings
    MAIN_CURRENCY: {
        name: "Việt Nam Đồng",
        symbol: "đ",
        code: "VNĐ",
        shortCode: "vnđ"
    },
    
    // Exchange rates
    EXCHANGE_RATES: {
        USD_TO_VND: 25000,
        VND_TO_USD: 1/25000
    },
    
    // Display formats
    FORMATS: {
        SHORT: "đ",           // 100,000đ
        MEDIUM: "VNĐ",        // 100,000 VNĐ  
        LONG: "Việt Nam Đồng", // 100,000 Việt Nam Đồng
        SYMBOL_ONLY: "đ"      // đ
    }
};

/**
 * Format money amount to Vietnamese Dong
 * @param {number} amount - Amount to format
 * @param {string} format - Format type (SHORT, MEDIUM, LONG, SYMBOL_ONLY)
 * @returns {string} Formatted currency string
 */
function formatVND(amount, format = 'SHORT') {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '0đ';
    }
    
    const formattedAmount = Math.floor(amount).toLocaleString('vi-VN');
    const currencySymbol = CURRENCY_CONFIG.FORMATS[format] || CURRENCY_CONFIG.FORMATS.SHORT;
    
    switch (format) {
        case 'LONG':
            return `${formattedAmount} ${currencySymbol}`;
        case 'MEDIUM':
            return `${formattedAmount} ${currencySymbol}`;
        case 'SHORT':
        case 'SYMBOL_ONLY':
        default:
            return `${formattedAmount}${currencySymbol}`;
    }
}

/**
 * Convert USD to VND
 * @param {number} usdAmount - Amount in USD
 * @returns {number} Amount in VND
 */
function convertUSDToVND(usdAmount) {
    if (typeof usdAmount !== 'number' || isNaN(usdAmount)) {
        return 0;
    }
    return Math.floor(usdAmount * CURRENCY_CONFIG.EXCHANGE_RATES.USD_TO_VND);
}

/**
 * Convert VND to USD
 * @param {number} vndAmount - Amount in VND
 * @returns {number} Amount in USD
 */
function convertVNDToUSD(vndAmount) {
    if (typeof vndAmount !== 'number' || isNaN(vndAmount)) {
        return 0;
    }
    return Math.floor(vndAmount * CURRENCY_CONFIG.EXCHANGE_RATES.VND_TO_USD);
}

/**
 * Parse currency input (supports various formats)
 * @param {string} input - Input string (e.g., "100k", "1m", "50000", "2$")
 * @returns {number} Amount in VND
 */
function parseCurrencyInput(input) {
    if (!input || typeof input !== 'string') return 0;
    
    input = input.toLowerCase().trim();
    
    // Handle USD input (e.g., "10$", "5usd")
    if (input.includes('$') || input.includes('usd')) {
        const usdAmount = parseFloat(input.replace(/[$usd]/g, ''));
        return convertUSDToVND(usdAmount);
    }
    
    // Handle VND shorthand (k, m, b)
    const regex = /^(\d+(?:\.\d+)?)([kmb])?$/;
    const match = input.replace(/[đvn]/g, '').match(regex);
    
    if (!match) return 0;
    
    let value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 'k': value *= 1000; break;
        case 'm': value *= 1000000; break;
        case 'b': value *= 1000000000; break;
    }
    
    return Math.floor(value);
}

/**
 * Get currency display info
 * @returns {object} Currency configuration
 */
function getCurrencyInfo() {
    return CURRENCY_CONFIG;
}

/**
 * Format large numbers with appropriate units
 * @param {number} amount - Amount to format
 * @returns {string} Formatted string with units
 */
function formatLargeAmount(amount) {
    if (amount >= 1000000000) {
        return `${(amount / 1000000000).toFixed(1)}B đ`;
    } else if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}M đ`;
    } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}K đ`;
    }
    return formatVND(amount);
}

module.exports = {
    CURRENCY_CONFIG,
    formatVND,
    convertUSDToVND,
    convertVNDToUSD,
    parseCurrencyInput,
    getCurrencyInfo,
    formatLargeAmount
};
