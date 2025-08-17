/**
 * Model initialization and management module
 * @module database/model
 * @param {Object} input - Sequelize and database configuration
 * @param {Sequelize} input.sequelize - Sequelize instance
 * @param {Sequelize.Sequelize} input.Sequelize - Sequelize class
 * @returns {Object} Model manager with access to all models
 */
module.exports = function (input) {
	// Sync option - set to false to prevent dropping tables
	const force = false;

	// Initialize models with Sequelize instance
	const Users = require("./models/users")(input);
	const Threads = require("./models/threads")(input);
	const Currencies = require("./models/currencies")(input);

	// Sync models with database
	Users.sync({ force });
	Threads.sync({ force });
	Currencies.sync({ force });

	return {
		/**
		 * Available models
		 * @type {Object}
		 * @property {Sequelize.Model} Users - Users model
		 * @property {Sequelize.Model} Threads - Threads model
		 * @property {Sequelize.Model} Currencies - Currencies model
		 */
		model: {
			Users,
			Threads,
			Currencies
		},

		/**
		 * Get a specific model by name
		 * @param {string} modelName - Name of the model to retrieve
		 * @returns {Sequelize.Model} The requested model
		 */
		use: function (modelName) {
			if (!this.model[modelName]) {
				throw new Error(`Model ${modelName} not found`);
			}
			return this.model[modelName];
		}
	};
}