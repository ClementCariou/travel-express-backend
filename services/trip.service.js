"use strict";

const _ = require("lodash");
const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");

module.exports = {
	name: "trip",
	mixins: [
		DbService("trip"),
		CacheCleanerMixin([
			"cache.clean.user",
			"cache.clean.reservation",
		])
	],

	/**
	 * Default settings
	 */
	settings: {
		rest: "trip/",
		fields: ["id", "user", "fromLocation", "fromDate", "toLocation", "toDate", "repeat", "endRepeat"],
		entityValidator: {
			fromLocation: { type: "string", min: 2 },
			fromDate: { type: "date" },
			toLocation: { type: "string", min: 2 },
			toDate: { type: "date" },
			repeat: { type: "enum", values: ["no", "daily", "weekly", "monthly"] },
			endRepeat: { type: "date" }
		}
	},

	/**
	 * Actions
	 */
	actions: {

	},

	/**
	 * Methods
	 */
	methods: {

	}
};