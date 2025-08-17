/**
 * Database configuration module
 * @module database/index
 */
const Sequelize = require("sequelize");
const { resolve } = require("path");
const { DATABASE } = global.config;

// Get database dialect from config (first key in DATABASE object)
const dialect = Object.keys(DATABASE)[0];
const storage = resolve(__dirname, `../${DATABASE[dialect].storage}`);

/**
 * Sequelize instance configured for the application
 * @type {Sequelize}
 */
module.exports.sequelize = new Sequelize({
	// Database dialect (sqlite, mysql, postgres, etc.)
	dialect,
	// Storage location for SQLite
	storage,
	// Connection pool configuration
	pool: {
		max: 20, // Maximum number of connections in pool
		min: 0,  // Minimum number of connections in pool
		acquire: 60000, // Maximum time (ms) to acquire a connection
		idle: 20000    // Maximum time (ms) a connection can be idle
	},
	// Retry configuration for handling busy database
	retry: {
		match: [
			/SQLITE_BUSY/, // Retry on SQLITE_BUSY errors
		],
		name: 'query',
		max: 20 // Maximum retry attempts
	},
	logging: false, // Disable SQL query logging
	transactionType: 'IMMEDIATE', // Transaction isolation level
	// Model definition defaults
	define: {
		underscored: false,     // Don't convert camelCase to snake_case
		freezeTableName: true,  // Use model name as table name without pluralization
		charset: 'utf8',        // Character set for the database
		dialectOptions: {
			collate: 'utf8_general_ci' // Collation for string comparison
		},
		timestamps: true        // Add createdAt and updatedAt timestamps
	},
	// Sync options
	sync: {
		force: false // Don't drop tables when syncing
	}
});

/**
 * Export Sequelize library for use in models
 * @type {Sequelize.Sequelize}
 */
module.exports.Sequelize = Sequelize;