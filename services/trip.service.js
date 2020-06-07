"use strict";

const { MoleculerClientError } = require("moleculer").Errors;

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
			endRepeat: { type: "date", convert: true, optional: true },
			seats: { type: "number", min: 1, max: 10, default: 2 },
			luggageSize: { type: "enum", values: ["small", "medium", "large"], default: "medium" },
			talk: { type: "enum", values: ["no", "little", "yes"], default: "yes" },
			smoke: { type: "boolean", convert: true, default: false }
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
				const now = new Date();
				let entity = ctx.params;
				await this.validateEntity(entity);
				if (ctx.params.fromDate < now || ctx.params.toDate < now) {
					throw new MoleculerClientError("The trip dates are incoherents", 403);
				}
				if (ctx.params.toDate < new Date(ctx.params.fromDate.getTime() + 5 * 60 * 1000)) {
					throw new MoleculerClientError("The trip should be at least 5 minutes long", 403);
				}
				if (ctx.params.repeat !== "no" && !ctx.params.endRepeat) {
					throw new MoleculerClientError("Need to specify the date of end repeat", 403);
				}
				if (ctx.params.repeat !== "no" && ctx.params.endRepeat < ctx.params.fromDate + 2) {
					throw new MoleculerClientError("If the trip repeats it should repeat at least once", 403);
				}
				entity.user = ctx.meta.user._id.toString();
				// Add private fields from the user preferences
				const { user } = await ctx.call("user.me", { user: entity.user });
				const { vehicle, smoke, talk, luggageSize, seats } = user;
				if (!vehicle || vehicle === "") {
					throw new MoleculerClientError("Trying to create a trip without a vehicle", 403);
				}
				entity = { ...entity, smoke, talk, luggageSize, seats };
				if (ctx.params.repeat !== "no") {
					const entities = [];
					while (entity.fromDate <= ctx.params.endRepeat) {
						entities.push({
							...entity,
							fromDate: new Date(entity.fromDate.getTime()),
							toDate: new Date(entity.toDate.getTime())
						});
						switch (ctx.params.repeat) {
							case "daily":
								entity.fromDate.setDate(entity.fromDate.getDate() + 1);
								entity.toDate.setDate(entity.toDate.getDate() + 1);
								break;
							case "weekly":
								entity.fromDate.setDate(entity.fromDate.getDate() + 7);
								entity.toDate.setDate(entity.toDate.getDate() + 7);
								break;
							case "monthly":
								entity.fromDate.setMonth(entity.fromDate.getMonth() + 1);
								entity.toDate.setMonth(entity.toDate.getMonth() + 1);
								break;
						}
					}
					entity = entities;
				}
				const doc = await this.adapter.insert(entity);
				await this.entityChanged("created", doc, ctx);
				return doc;
			}
		},

		update: {
			rest: "PUT /",
			handler: () => {
				throw new MoleculerClientError("Cannot update a trip, please delete and create a new one", 403);
			}
		},

		list: {
			rest: "GET /",
			cache: false, //prod only
			params: {
				user: { type: "string", optional: true },
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
				if (ctx.params.user)
					query.user = ctx.params.user;
				const now = new Date();
				if (ctx.params.minFromDate || ctx.params.maxFromDate) {
					query.fromDate = {};
					if (ctx.params.minFromDate)
						query.fromDate.$gte = new Date(Math.max(now, ctx.params.minFromDate));
					if (ctx.params.maxFromDate)
						query.fromDate.$lte = new Date(Math.max(now, ctx.params.maxFromDate));
				}
				if (ctx.params.minToDate || ctx.params.maxToDate) {
					query.toDate = {};
					if (ctx.params.minToDate)
						query.toDate.$gte = new Date(Math.max(now, ctx.params.minToDate));
					if (ctx.params.maxToDate)
						query.toDate.$lte = new Date(Math.max(now, ctx.params.maxToDate));
				}
				if (ctx.params.fromLocation)
					query.fromLocation = ctx.params.fromLocation;
				if (ctx.params.toLocation)
					query.toLocation = ctx.params.toLocation;
				if (typeof ctx.params.minSeats === "number") {
					query.seats = { $gte: ctx.params.minSeats };
				}
				const sizes = ["small", "medium", "large"];
				if (ctx.params.minLuggage)
					query.luggageSize = { $in: sizes.slice(sizes.indexOf(ctx.params.minLuggage)) };
				if (ctx.params.minTalk || ctx.params.maxTalk) {
					const talk = ["no", "little", "yes"];
					ctx.params.minTalk = ctx.params.minTalk ? talk.indexOf(ctx.params.minTalk) : 0;
					ctx.params.maxTalk = ctx.params.maxTalk ? talk.indexOf(ctx.params.maxTalk) + 1 : 3;
					query.talk = { $in: talk.slice(ctx.params.minTalk, ctx.params.maxTalk) };
				}
				if (typeof ctx.params.smoke === "boolean")
					query.smoke = ctx.params.smoke;
				const params = {
					page: ctx.params.page,
					pageSize: ctx.params.pageSize,
					query
				};
				return await this.adapter.find(params);
			}
		},

		remove: {
			auth: "required",
			rest: "DELETE /:id",
			async handler(ctx) {
				const trip = await this.getById(ctx.params.id);
				if (!trip) {
					throw new MoleculerClientError("Trip not found.", 403);
				}
				if (trip.user !== ctx.meta.user._id) {
					throw new MoleculerClientError("You cannot delete trips of other users.", 403);
				}
				const reservations = await ctx.call("reservation.list", { tripID: trip._id });
				// Maybe we want to cancel the reservations depending on the trip date
				// and if so we would need to notify the users which is out of the scope of this project
				if (reservations.length !== 0) {
					throw new MoleculerClientError("You cannot delete trips with reservations.", 403);
				}
				return await this._remove(ctx, { id: trip._id });
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {

	}
};