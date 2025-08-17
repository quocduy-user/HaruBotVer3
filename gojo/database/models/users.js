/**
 * Users model definition
 * @module database/models/users
 * @param {Object} options - Sequelize and database configuration
 * @param {Sequelize} options.sequelize - Sequelize instance
 * @param {Sequelize.Sequelize} options.Sequelize - Sequelize class
 * @returns {Sequelize.Model} Users model
 */
module.exports = function({ sequelize, Sequelize }) {
	/**
	 * Users model for storing user information
	 * @type {Sequelize.Model}
	 */
	const Users = sequelize.define('Users', {
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
		 * User's display name
		 * @type {String}
		 */
        name: {
            type: Sequelize.STRING,
			allowNull: true,
			comment: 'User\'s display name'
        },
		/**
		 * Additional user data stored as JSON
		 * @type {Object}
		 */
		data: {
			type: Sequelize.JSON,
			defaultValue: {},
			comment: 'Additional user data stored as JSON'
		}
	}, {
		// Model options
		indexes: [
			{ fields: ['userID'] }
		],
		comment: 'Stores user information and related data'
	});

	return Users;
}