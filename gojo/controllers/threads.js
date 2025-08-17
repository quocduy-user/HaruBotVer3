/**
 * Threads controller module
 * @module controllers/threads
 */
module.exports = function ({ models, api }) {
	const Threads = models.use('Threads');

	/**
	 * Get thread information from Facebook API
	 * @param {String} threadID - The ID of the thread
	 * @returns {Promise<Object>} Thread information
	 * @throws {Error} If API call fails
	 */
	async function getInfo(threadID) {
		if (!threadID) throw new Error(global.getText("threads", "invalidThreadID") || "Invalid threadID");
		
		try {
			const result = await api.getThreadInfo(threadID);
			return result;
		}
		catch (error) { 
			console.error('Error in threads.getInfo:', error);
			throw new Error(`Failed to get thread info for ${threadID}: ${error.message}`);
		}
	}

	/**
	 * Get all thread records with optional filtering and attribute selection
	 * @param {...Object|Array} data - Where conditions or attributes to select
	 * @returns {Promise<Array>} Array of thread records
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function getAll(...data) {
		let where, attributes;
		for (const i of data) {
			if (typeof i !== 'object') throw global.getText("threads", "needObjectOrArray");
			if (Array.isArray(i)) attributes = i;
			else where = i;
		}
		try { 
			const results = await Threads.findAll({ where, attributes });
			return results.map(e => e.get({ plain: true })); 
		}
		catch (error) {
			console.error('Error in threads.getAll:', error);
			throw new Error(`Failed to get threads data: ${error.message}`);
		}
	}

	/**
	 * Get thread data for a specific thread
	 * @param {String} threadID - The ID of the thread
	 * @returns {Promise<Object|boolean>} Thread data or false if not found
	 * @throws {Error} If database operation fails
	 */
	async function getData(threadID) {
		if (!threadID) throw new Error(global.getText("threads", "invalidThreadID") || "Invalid threadID");
		
		try {
			const data = await Threads.findOne({ where: { threadID }});
			return data ? data.get({ plain: true }) : false;
		} 
		catch (error) { 
			console.error('Error in threads.getData:', error);
			throw new Error(`Failed to get thread data for ${threadID}: ${error.message}`);
		}
	}

	/**
	 * Update thread data for a specific thread
	 * @param {String} threadID - The ID of the thread
	 * @param {Object} options - Data to update
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function setData(threadID, options = {}) {
		if (!threadID) throw new Error(global.getText("threads", "invalidThreadID") || "Invalid threadID");
		if (typeof options !== 'object' || Array.isArray(options)) 
			throw new Error(global.getText("threads", "needObject") || "Options must be an object");
		
		try {
			const thread = await Threads.findOne({ where: { threadID } });
			if (!thread) {
				// If thread doesn't exist, create new record
				await createData(threadID, options);
			} else {
				await thread.update(options);
			}
			return true;
		} catch (error) { 
			console.error('Error in threads.setData:', error);
			throw new Error(`Failed to update thread data for ${threadID}: ${error.message}`);
		}
	}

	/**
	 * Delete thread data for a specific thread
	 * @param {String} threadID - The ID of the thread
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If database operation fails
	 */
	async function delData(threadID) {
		if (!threadID) throw new Error(global.getText("threads", "invalidThreadID") || "Invalid threadID");
		
		try {
			const thread = await Threads.findOne({ where: { threadID } });
			if (!thread) return false;
			
			await thread.destroy();
			return true;
		}
		catch (error) {
			console.error('Error in threads.delData:', error);
			throw new Error(`Failed to delete thread data for ${threadID}: ${error.message}`);
		}
	}

	/**
	 * Create new thread data
	 * @param {String} threadID - The ID of the thread
	 * @param {Object} defaults - Default values for the new record
	 * @returns {Promise<boolean>} True if successful
	 * @throws {Error} If parameters are invalid or database operation fails
	 */
	async function createData(threadID, defaults = {}) {
		if (!threadID) throw new Error(global.getText("threads", "invalidThreadID") || "Invalid threadID");
		if (typeof defaults !== 'object' || Array.isArray(defaults)) 
			throw new Error(global.getText("threads", "needObject") || "Defaults must be an object");
		
		try {
			const [record, created] = await Threads.findOrCreate({ where: { threadID }, defaults });
			return true;
		}
		catch (error) {
			console.error('Error in threads.createData:', error);
			throw new Error(`Failed to create thread data for ${threadID}: ${error.message}`);
		}
	}

	return {
		getInfo,
		getAll,
		getData,
		setData,
		delData,
		createData
	};
};