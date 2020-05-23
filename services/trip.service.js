"use strict";

const { MoleculerClientError } = require("moleculer").Errors;

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
		fields: ["_id", "user", "fromLocation", "fromDate", "toLocation", "toDate", "repeat", "endRepeat"],
		populates: {
			user: {
				action: "user.get",
				params: {
					fields: ["seats", "luggageSize", "talk", "smoke"]
				}
			}
		},
		entityValidator: {
			fromLocation: { type: "string", min: 2 },
			fromDate: { type: "date", convert: true },
			toLocation: { type: "string", min: 2 },
			toDate: { type: "date", convert: true },
			repeat: { type: "enum", values: ["no", "daily", "weekly", "monthly"] },
			endRepeat: { type: "date", convert: true, optional: true }
		}
	},

	/**
	 * Actions
	 */
	actions: {
		create: {
			auth: "required",
			rest: "POST /",
			params: {
				fromLocation: { type: "string", min: 2 },
				fromDate: { type: "date", convert: true },
				toLocation: { type: "string", min: 2 },
				toDate: { type: "date", convert: true },
				repeat: { type: "enum", values: ["no", "daily", "weekly", "monthly"] },
				endRepeat: { type: "date", convert: true, optional: true }
			},
			async handler(ctx) {
				let entity = ctx.params;
				await this.validateEntity(entity);
				if (ctx.meta.user.vehicle === "") {
					throw new MoleculerClientError("Trying to create a trip without a vehicle", 403);
				}
				entity.user = ctx.meta.user._id.toString();
				const doc = await this.adapter.insert(entity);
				let json = await this.transformDocuments(ctx, { populate: ["user"] }, doc);
				await this.entityChanged("created", json, ctx);
				return json;
			}
		},

		list: {
			rest: "GET /",
			params: {
				minFromDate: { type: "date", optional: true },
				maxFromDate: { type: "date", optional: true },
				minToDate: { type: "date", optional: true },
				maxToDate: { type: "date", optional: true },
				fromLocation: { type: "string", min: 2, optional: true },
				toLocation: { type: "string", min: 2, optional: true },
				minSeats: { type: "number", min: 1, max: 10, optional: true },
				minLuggage: { type: "enum", values: ["small", "medium", "large"], optional: true },
				minTalk: { type: "enum", values: ["no", "little", "yes"], optional: true },
				maxTalk: { type: "enum", values: ["no", "little", "yes"], optional: true },
				smoke: { type: "boolean", optional: true },
				page: { type: "number", min: 0, default: 0 },
				pageSize: { type: "number", min: 5, default: 15 }
			},

			async handler(ctx) {
				let query = {};
				if (ctx.params.minFromDate || ctx.params.maxFromDate) {
					query.fromDate = {};
					if (ctx.params.minFromDate)
						query.fromDate.$gte = ctx.params.minFromDate;
					if (ctx.params.maxFromDate)
						query.fromDate.$lte = ctx.params.maxFromDate;
				}
				if (ctx.params.minToDate || ctx.params.maxToDate) {
					query.toDate = {};
					if (ctx.params.minToDate)
						query.toDate.$gte = ctx.params.minToDate;
					if (ctx.params.maxToDate)
						query.toDate.$lte = ctx.params.maxToDate;
				}
				if (ctx.params.fromLocation)
					query.fromLocation = ctx.params.fromLocation;
				if (ctx.params.toLocation)
					query.toLocation = ctx.params.toLocation;
				return this.adapter.find({
					page: ctx.params.page,
					pageSize: ctx.params.pageSize,
					populate: ["user"],
					query
				});
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {

	}
};