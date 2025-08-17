/**
 * Threads model definition
 * @module database/models/threads
 * @param {Object} options - Sequelize and database configuration
 * @param {Sequelize} options.sequelize - Sequelize instance
 * @param {Sequelize.Sequelize} options.Sequelize - Sequelize class
 * @returns {Sequelize.Model} Threads model
 */
module.exports = function({ sequelize, Sequelize }) {
	/**
	 * Threads model for storing conversation thread information
	 * @type {Sequelize.Model}
	 */
	const Threads = sequelize.define('Threads', {
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
		 * Facebook/Platform thread ID
		 * @type {String}
		 */
		threadID: {
			type: Sequelize.BIGINT,
			unique: true,
			allowNull: false,
			comment: 'Facebook/Platform thread ID (must be unique)'
		},
		/**
		 * Thread information (name, participants, etc.)
		 * @type {Object}
		 */
        threadInfo: {
            type: Sequelize.JSON,
			defaultValue: {},
			comment: 'Thread information including name, participants, etc.'
        },
		/**
		 * Additional thread data stored as JSON
		 * @type {Object}
		 */
		data: {
			type: Sequelize.JSON,
			defaultValue: {},
			comment: 'Additional thread data stored as JSON'
		}
	}, {
		// Model options
		indexes: [
			{ fields: ['threadID'] }
		],
		comment: 'Stores conversation thread information and related data'
	});

	return Threads;
}