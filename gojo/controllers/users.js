/**
 * Users controller module
 * @module controllers/users
 */
module.exports = function ({ models, api }) {
	const Users = models.use('Users');

	/**
	 * Get user information from Facebook API
	 * @param {String} id - The ID of the user
	 * @returns {Promise<Object>} User information
	 * @throws {Error} If API call fails
	 */
	async function getInfo(id) {
		if (!id) throw new Error(global.getText("users", "invalidUserID") || "Invalid userID");
		
		try {
			const result = await api.getUserInfo(id);
			return result[id];
		} catch (error) {
			console.error('Error in users.getInfo:', error);
			throw new Error(`Failed to get user info for ${id}: ${error.message}`);
		}
	}

	/**
	 * Get user's name from cache or database
	 * @param {String} id - The ID of the user
	 * @returns {Promise<String>} User's name or default name if not found
	 */
	async function getNameUser(id) {
		if (!id) return "Người dùng facebook";
		
		try {
			// First check in cache
			if (global.data.userName.has(id)) {
				return global.data.userName.get(id);
			}
			
			// Then check in database if user ID is known
			if (global.data.allUserID.includes(id)) {
				const userData = await this.getData(id);
				if (userData && userData.name) {
					return userData.name;
				}
			}
			
			// Default fallback
			return "Người dùng facebook";
		}
		catch (error) { 
			console.error('Error in users.getNameUser:', error);
			return "Người dùng facebook";
		}
	}

	/**
	 * Get all user records with optional filtering and attribute selection
	 * @param {...Object|Array} data - Where conditions or attributes to select
	 * @returns {Promise<Array>} Array of user records
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function getAll(...data) {
		let where, attributes;
		for (const i of data) {
			if (typeof i !== 'object') throw global.getText("users", "needObjectOrArray");
			if (Array.isArray(i)) attributes = i;
			else where = i;
		}
		try {
			const results = await Users.findAll({ where, attributes });
			return results.map(e => e.get({ plain: true }));
		}
		catch (error) {
			console.error('Error in users.getAll:', error);
			throw new Error(`Failed to get users data: ${error.message}`);
		}
	}

	/**
	 * Get user data for a specific user
	 * @param {String} userID - The ID of the user
	 * @returns {Promise<Object|boolean>} User data or false if not found
	 * @throws {Error} If database operation fails
	 */
	async function getData(userID) {
		if (!userID) throw new Error(global.getText("users", "invalidUserID") || "Invalid userID");
		
		try {
			const data = await Users.findOne({ where: { userID } });
			return data ? data.get({ plain: true }) : false;
		}
		catch(error) {
			console.error('Error in users.getData:', error);
			throw new Error(`Failed to get user data for ${userID}: ${error.message}`);
		}
	}

	/**
	 * Update user data for a specific user
	 * @param {String} userID - The ID of the user
	 * @param {Object} options - Data to update
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function setData(userID, options = {}) {
		if (!userID) throw new Error(global.getText("users", "invalidUserID") || "Invalid userID");
		if (typeof options !== 'object' || Array.isArray(options)) 
			throw new Error(global.getText("users", "needObject") || "Options must be an object");
		
		try {
			const user = await Users.findOne({ where: { userID } });
			if (!user) {
				// If user doesn't exist, create new record
				await createData(userID, options);
			} else {
				await user.update(options);
			}
			return true;
		}
		catch (error) {
			console.error('Error in users.setData:', error);
			throw new Error(`Failed to update user data for ${userID}: ${error.message}`);
		}
	}

	/**
	 * Delete user data for a specific user
	 * @param {String} userID - The ID of the user
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If database operation fails
	 */
	async function delData(userID) {
		if (!userID) throw new Error(global.getText("users", "invalidUserID") || "Invalid userID");
		
		try {
			const user = await Users.findOne({ where: { userID } });
			if (!user) return false;
			
			await user.destroy();
			return true;
		}
		catch (error) {
			console.error('Error in users.delData:', error);
			throw new Error(`Failed to delete user data for ${userID}: ${error.message}`);
		}
	}

	/**
	 * Create new user data
	 * @param {String} userID - The ID of the user
	 * @param {Object} defaults - Default values for the new record
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function createData(userID, defaults = {}) {
		if (!userID) throw new Error(global.getText("users", "invalidUserID") || "Invalid userID");
		if (typeof defaults !== 'object' || Array.isArray(defaults)) 
			throw new Error(global.getText("users", "needObject") || "Defaults must be an object");
		
		try {
			const [record, created] = await Users.findOrCreate({ where: { userID }, defaults });
			return true;
		}
		catch (error) {
			console.error('Error in users.createData:', error);
			throw new Error(`Failed to create user data for ${userID}: ${error.message}`);
		}
	}

	return {
		getInfo,
		getNameUser,
		getAll,
		getData,
		setData,
		delData,
		createData
	};
};