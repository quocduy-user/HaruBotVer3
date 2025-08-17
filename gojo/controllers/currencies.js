/**
 * Currencies controller module
 * @module controllers/currencies
 */
module.exports = function ({ models }) {
	const Currencies = models.use('Currencies');

	/**
	 * Get all currency records with optional filtering and attribute selection
	 * @param {...Object|Array} data - Where conditions or attributes to select
	 * @returns {Promise<Array>} Array of currency records
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function getAll(...data) {
		let where, attributes;
		for (const i of data) {
			if (typeof i !== 'object') throw global.getText("currencies", "needObjectOrArray");
			if (Array.isArray(i)) attributes = i;
			else where = i;
		}
		try { 
			const results = await Currencies.findAll({ where, attributes });
			return results.map(e => e.get({ plain: true })); 
		}
		catch (error) {
			console.error('Error in currencies.getAll:', error);
			throw new Error(`Failed to get currencies data: ${error.message}`);
		}
	}

	/**
	 * Get currency data for a specific user
	 * @param {String} userID - The ID of the user
	 * @returns {Promise<Object|boolean>} User's currency data or false if not found
	 * @throws {Error} If database operation fails
	 */
	async function getData(userID) {
		if (!userID) throw new Error(global.getText("currencies", "invalidUserID") || "Invalid userID");
		
		try {
			const data = await Currencies.findOne({ where: { userID }});
			return data ? data.get({ plain: true }) : false;
		} 
		catch (error) {
			console.error('Error in currencies.getData:', error);
			throw new Error(`Failed to get currency data for user ${userID}: ${error.message}`);
		}
	}

	/**
	 * Update currency data for a specific user
	 * @param {String} userID - The ID of the user
	 * @param {Object} options - Data to update
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function setData(userID, options = {}) {
		if (!userID) throw new Error(global.getText("currencies", "invalidUserID") || "Invalid userID");
		if (typeof options !== 'object' || Array.isArray(options)) 
			throw new Error(global.getText("currencies", "needObject") || "Options must be an object");
		
		try {
			const user = await Currencies.findOne({ where: { userID } });
			if (!user) {
				// If user doesn't exist, create new record
				await createData(userID, options);
			} else {
				await user.update(options);
			}
			return true;
		} 
		catch (error) {
			console.error('Error in currencies.setData:', error);
			throw new Error(`Failed to update currency data for user ${userID}: ${error.message}`);
		}
	}

	/**
	 * Delete currency data for a specific user
	 * @param {String} userID - The ID of the user
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If database operation fails
	 */
	async function delData(userID) {
		if (!userID) throw new Error(global.getText("currencies", "invalidUserID") || "Invalid userID");
		
		try {
			const user = await Currencies.findOne({ where: { userID } });
			if (!user) return false;
			
			await user.destroy();
			return true;
		}
		catch (error) {
			console.error('Error in currencies.delData:', error);
			throw new Error(`Failed to delete currency data for user ${userID}: ${error.message}`);
		}
	}

	/**
	 * Create new currency data for a user
	 * @param {String} userID - The ID of the user
	 * @param {Object} defaults - Default values for the new record
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function createData(userID, defaults = {}) {
		if (!userID) throw new Error(global.getText("currencies", "invalidUserID") || "Invalid userID");
		if (typeof defaults !== 'object' || Array.isArray(defaults)) 
			throw new Error(global.getText("currencies", "needObject") || "Defaults must be an object");
		
		try {
			const [record, created] = await Currencies.findOrCreate({ where: { userID }, defaults });
			return true;
		}
		catch (error) {
			console.error('Error in currencies.createData:', error);
			throw new Error(`Failed to create currency data for user ${userID}: ${error.message}`);
		}
	}

	/**
	 * Increase a user's money balance
	 * @param {String} userID - The ID of the user
	 * @param {Number} money - Amount to increase
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or operation fails
	 */
	async function increaseMoney(userID, money) {
		if (!userID) throw new Error(global.getText("currencies", "invalidUserID") || "Invalid userID");
		if (typeof money !== 'number') 
			throw new Error(global.getText("currencies", "needNumber") || "Money must be a number");
		if (money <= 0) throw new Error(global.getText("currencies", "invalidAmount") || "Amount must be positive");
		
		try {
			const userData = await getData(userID);
			if (!userData) {
				// If user doesn't exist, create new record with initial money
				await createData(userID, { money });
				return true;
			}
			
			const balance = userData.money || 0;
			await setData(userID, { money: balance + money });
			return true;
		}
		catch (error) {
			console.error('Error in currencies.increaseMoney:', error);
			throw new Error(`Failed to increase money for user ${userID}: ${error.message}`);
		}
	}

	/**
	 * Decrease a user's money balance
	 * @param {String} userID - The ID of the user
	 * @param {Number} money - Amount to decrease
	 * @returns {Promise<boolean>} True if successful, false if insufficient funds
	 * @throws {Error} If parameters are invalid or operation fails
	 */
	async function decreaseMoney(userID, money) {
		if (!userID) throw new Error(global.getText("currencies", "invalidUserID") || "Invalid userID");
		if (typeof money !== 'number') 
			throw new Error(global.getText("currencies", "needNumber") || "Money must be a number");
		if (money <= 0) throw new Error(global.getText("currencies", "invalidAmount") || "Amount must be positive");
		
		try {
			const userData = await getData(userID);
			if (!userData) return false;
			
			const balance = userData.money || 0;
			if (balance < money) return false;
			
			await setData(userID, { money: balance - money });
			return true;
		} catch (error) {
			console.error('Error in currencies.decreaseMoney:', error);
			throw new Error(`Failed to decrease money for user ${userID}: ${error.message}`);
		}
	}

	return {
		getAll,
		getData,
		setData,
		delData,
		createData,
		increaseMoney,
		decreaseMoney
	};
};