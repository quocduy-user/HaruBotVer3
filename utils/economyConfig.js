/**
 * Economy Configuration for HaruBot
 * Prevents inflation and maintains balanced economy
 * All amounts in VNĐ
 */

const ECONOMY_CONFIG = {
    // Daily limits to prevent inflation
    DAILY_LIMITS: {
        MAX_DAILY_EARNINGS: 150000,      // 150k VNĐ/ngày tối đa
        MAX_WORK_EARNINGS: 50000,        // 50k VNĐ từ work/ngày
        MAX_GAME_EARNINGS: 75000,        // 75k VNĐ từ games/ngày
        MAX_DAILY_REWARD: 25000          // 25k VNĐ từ daily
    },

    // Reward ranges (balanced)
    REWARDS: {
        WORK: {
            MIN: 5000,      // 5k VNĐ
            MAX: 25000,     // 25k VNĐ
            COOLDOWN: 21600000  // 6 giờ
        },
        DAILY: {
            MIN: 15000,     // 15k VNĐ
            MAX: 25000,     // 25k VNĐ
            COOLDOWN: 43200000  // 12 giờ
        },
        KIEMTIEN: {
            MIN: 3000,      // 3k VNĐ
            MAX: 15000,     // 15k VNĐ
            COOLDOWN: 21600000  // 6 giờ
        },
        GAMES: {
            BANCHIM: {
                MIN: 2000,  // 2k VNĐ
                MAX: 8000,  // 8k VNĐ
                COOLDOWN: 3600000  // 1 giờ
            },
            CUOP: {
                TREASURE_MIN: 1000,  // 1k VNĐ
                TREASURE_MAX: 5000,  // 5k VNĐ
                COOLDOWN: 7200000    // 2 giờ
            }
        }
    },

    // Transaction fees to control money supply
    FEES: {
        TRANSFER_FEE_PERCENT: 0.02,      // 2% phí chuyển tiền
        MIN_TRANSFER_FEE: 500,           // Phí tối thiểu 500đ
        MAX_TRANSFER_FEE: 5000,          // Phí tối đa 5k đ
        BANK_DEPOSIT_FEE: 0.01,          // 1% phí gửi ngân hàng
        BANK_WITHDRAW_FEE: 0.015         // 1.5% phí rút ngân hàng
    },

    // Level-based multipliers
    LEVEL_MULTIPLIERS: {
        1: 1.0,    // Level 1: x1.0
        2: 1.1,    // Level 2: x1.1
        3: 1.2,    // Level 3: x1.2
        4: 1.3,    // Level 4: x1.3
        5: 1.4,    // Level 5: x1.4
        6: 1.5,    // Level 6: x1.5
        7: 1.6,    // Level 7: x1.6
        8: 1.7,    // Level 8: x1.7
        9: 1.8,    // Level 9: x1.8
        10: 2.0    // Level 10: x2.0 (max)
    },

    // Anti-spam protection
    ANTI_SPAM: {
        MAX_COMMANDS_PER_HOUR: 10,       // Tối đa 10 lệnh kiếm tiền/giờ
        COOLDOWN_VIOLATION_PENALTY: 0.5  // Giảm 50% reward nếu spam
    }
};

/**
 * Calculate balanced reward based on user level and activity
 * @param {string} commandType - Type of command (work, daily, game, etc.)
 * @param {number} userLevel - User's current level (1-10)
 * @param {number} userActivity - User's recent activity score
 * @returns {number} Calculated reward amount in VNĐ
 */
function calculateBalancedReward(commandType, userLevel = 1, userActivity = 1) {
    const config = ECONOMY_CONFIG.REWARDS[commandType.toUpperCase()];
    if (!config) return 0;

    // Base random amount
    const baseAmount = Math.floor(Math.random() * (config.MAX - config.MIN + 1)) + config.MIN;
    
    // Apply level multiplier (capped at level 10)
    const levelMultiplier = ECONOMY_CONFIG.LEVEL_MULTIPLIERS[Math.min(userLevel, 10)] || 1.0;
    
    // Apply activity bonus (max 20% bonus for very active users)
    const activityBonus = Math.min(userActivity * 0.1, 0.2);
    
    const finalAmount = Math.floor(baseAmount * levelMultiplier * (1 + activityBonus));
    
    return finalAmount;
}

/**
 * Calculate transaction fee
 * @param {number} amount - Transaction amount
 * @returns {number} Fee amount
 */
function calculateTransactionFee(amount) {
    const feeAmount = Math.floor(amount * ECONOMY_CONFIG.FEES.TRANSFER_FEE_PERCENT);
    return Math.max(
        ECONOMY_CONFIG.FEES.MIN_TRANSFER_FEE,
        Math.min(feeAmount, ECONOMY_CONFIG.FEES.MAX_TRANSFER_FEE)
    );
}

/**
 * Check if user has exceeded daily earning limits
 * @param {object} userData - User's currency data
 * @param {number} newEarning - New earning amount
 * @returns {boolean} True if within limits
 */
function checkDailyLimits(userData, newEarning) {
    const today = new Date().toDateString();
    const dailyData = userData.data?.dailyEarnings || {};
    
    if (dailyData.date !== today) {
        // Reset daily earnings for new day
        dailyData.date = today;
        dailyData.total = 0;
        dailyData.work = 0;
        dailyData.games = 0;
    }
    
    return (dailyData.total + newEarning) <= ECONOMY_CONFIG.DAILY_LIMITS.MAX_DAILY_EARNINGS;
}

/**
 * Update user's daily earnings
 * @param {object} userData - User's currency data
 * @param {string} source - Source of earning (work, game, daily)
 * @param {number} amount - Earning amount
 */
function updateDailyEarnings(userData, source, amount) {
    const today = new Date().toDateString();
    if (!userData.data) userData.data = {};
    if (!userData.data.dailyEarnings) userData.data.dailyEarnings = {};
    
    const dailyData = userData.data.dailyEarnings;
    
    if (dailyData.date !== today) {
        dailyData.date = today;
        dailyData.total = 0;
        dailyData.work = 0;
        dailyData.games = 0;
        dailyData.daily = 0;
    }
    
    dailyData.total += amount;
    dailyData[source] = (dailyData[source] || 0) + amount;
}

module.exports = {
    ECONOMY_CONFIG,
    calculateBalancedReward,
    calculateTransactionFee,
    checkDailyLimits,
    updateDailyEarnings
};
