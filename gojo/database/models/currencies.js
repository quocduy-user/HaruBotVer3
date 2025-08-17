/**
 * Currencies model definition
 * @module database/models/currencies
 * @param {Object} options - Sequelize and database configuration
 * @param {Sequelize} options.sequelize - Sequelize instance
 * @param {Sequelize.Sequelize} options.Sequelize - Sequelize class
 * @returns {Sequelize.Model} Currencies model
 */
module.exports = function({ sequelize, Sequelize }) {
	/**
	 * Currencies model for storing user currency and experience information
	 * @type {Sequelize.Model}
	 */
	const Currencies = sequelize.define('Currencies', {
		/**
		 * Auto-incrementing numeric ID
		 * @type {Number}
		 */
		num: {
			type: Sequelize.INTEGER,
			primaryKey: true,
			autoIncrement: true,
			comment: 'Auto-incrementing primary key'
		},
		/**
		 * Facebook/Platform user ID
		 * @type {String}
		 */
		userID: {
			type: Sequelize.BIGINT,
			unique: true,
			allowNull: false,
			comment: 'Facebook/Platform user ID (must be unique)'
		},
		/**
		 * User's money/currency amount
		 * @type {Number}
		 */
		money: {
			type: Sequelize.BIGINT,
			defaultValue: 0,
			allowNull: false,
			validate: {
				isInt: true,
				min: 0
			},
			comment: 'User\'s money/currency amount'
		},
		/**
		 * User's experience points
		 * @type {Number}
		 */
        exp: {
            type: Sequelize.BIGINT,
            defaultValue: 0,
			allowNull: false,
			validate: {
				isInt: true,
				min: 0
			},
			comment: 'User\'s experience points'
        },
		/**
		 * Additional currency data stored as JSON
		 * @type {Object}
		 */
		data: {
			type: Sequelize.JSON,
			defaultValue: {},
			comment: 'Additional currency data stored as JSON'
		}
	}, {
		// Model options
		indexes: [
			{ fields: ['userID'] }
		],
		comment: 'Stores user currency and experience information'
	});

	return Currencies;
}