"use strict";

const _ = require("lodash");
const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");

module.exports = {
	name: "reservation",
	mixins: [
		DbService("reservation"),
		CacheCleanerMixin([
			"cache.clean.user",
			"cache.clean.trip",
		])
	],

	/**
	 * Default settings
	 */
	settings: {
		rest: "reservation/",
		fields: ["id", "trip", "user", "seats", "paid"],
		entityValidator: {
			seats: { type: "number", min: 1, max: 10 },
			paid: { type: "boolean" }
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