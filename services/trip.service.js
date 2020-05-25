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
			"cache.clean.trip",
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
			user: "user.get"
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
			cache: false, //prod only
			params: {
				minFromDate: { type: "date", optional: true, convert: true },
				maxFromDate: { type: "date", optional: true, convert: true },
				minToDate: { type: "date", optional: true, convert: true },
				maxToDate: { type: "date", optional: true, convert: true },
				fromLocation: { type: "string", min: 2, optional: true },
				toLocation: { type: "string", min: 2, optional: true },
				minSeats: { type: "number", min: 1, max: 10, optional: true, convert: true },
				minLuggage: { type: "enum", values: ["small", "medium", "large"], optional: true },
				minTalk: { type: "enum", values: ["no", "little", "yes"], optional: true },
				maxTalk: { type: "enum", values: ["no", "little", "yes"], optional: true },
				smoke: { type: "boolean", optional: true, convert: true },
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
				/*if (typeof ctx.params.minSeats === "number") {
					query["user.seats"] = { $gte: ctx.params.minSeats };
				}
				const sizes = ["small", "medium", "large"];
				if (ctx.params.minLuggage)
					query.user = { ...query.user, luggageSize: { $in: sizes.slice(sizes.indexOf(ctx.params.minLuggage)) } };
				const talk = ["no", "little", "yes"];
				if (ctx.params.mintalk || ctx.params.maxtalk)
					query.user = { ...query.user, talk: { $in: talk.slice(talk.indexOf(ctx.params.minTalk), talk.indexOf(ctx.params.maxTalk)) } };
				if (typeof ctx.params.smoke === "boolean")
					query["user.smoke"] = ctx.params.smoke;*/
				const params = {
					page: ctx.params.page,
					pageSize: ctx.params.pageSize,
					populate: ["user"],
					query
				};
				return await this.adapter.find(params);
				//return this.transformDocuments(ctx, params, doc);
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {

	}
};