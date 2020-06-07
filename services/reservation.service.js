"use strict";

const { MoleculerClientError } = require("moleculer").Errors;

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
		fields: ["_id", "trip", "user", "seats", "paid"],
		entityValidator: {
			seats: { type: "number", min: 1, max: 10 },
			paid: { type: "boolean" }
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
				trip: { type: "string" },
				seats: { type: "number", min: 1, max: 10 }
			},
			async handler(ctx) {
				const trip = await ctx.call("trip.get", { id: ctx.params.trip });
				if (trip.user === ctx.meta.user._id) {
					throw new MoleculerClientError("Cannot reserve your own trip.", 403);
				}
				const reservations = await ctx.call("reservation.list", { tripID: ctx.params.trip });
				if (reservations.find(r => r.user === ctx.meta.user._id)) {
					console.log(reservations.find(r => r.user === ctx.meta.user._id));
					throw new MoleculerClientError("The user already reserved this trip.", 403);
				}
				const reserved = reservations.map((r) => r.seats).reduce((a, b) => a + b, 0);
				if (trip.seats < reserved + ctx.params.seats) {
					throw new MoleculerClientError("Not enough seats.", 403);
				}
				const reservation = {
					user: ctx.meta.user._id,
					seats: ctx.params.seats,
					trip: ctx.params.trip,
					paid: false
				};
				const doc = await this.adapter.insert(reservation);
				await this.entityChanged("created", doc, ctx);
				return doc;
			}
		},
		pay: {
			auth: "required",
			rest: "POST /pay/:id",
			async handler(ctx) {
				const reservation = await this.getById(ctx.params.id);
				if (!reservation) {
					throw new MoleculerClientError("Reservation not found.", 403);
				}
				if (reservation.user !== ctx.meta.user._id) {
					throw new MoleculerClientError("You cannot pay reservations of other users.", 403);
				}
				if (reservation.paid) {
					throw new MoleculerClientError("Reservation already paid.", 403);
				}
				reservation.paid = true;
				const doc = await this.adapter.updateById(reservation._id, reservation);
				await this.entityChanged("updated", doc, ctx);
				return doc;
			}
		},
		list: {
			rest: "GET /",
			cache: false, //prod only
			params: {
				"userID": { type: "string", optional: true },
				"tripID": { type: "string", optional: true },
			},
			async handler(ctx) {
				const query = {};
				if (!ctx.params.userID && !ctx.params.tripID) {
					throw new MoleculerClientError("Need at least one parameter", 403);
				}
				if (!ctx.params.tripID && (!ctx.meta.user || ctx.params.userID !== ctx.meta.user._id)) {
					throw new MoleculerClientError("You cannot fetch reservations informations of other users", 403);
				}
				if (ctx.params.userID)
					query.user = ctx.params.userID;
				if (ctx.params.tripID)
					query.trip = ctx.params.tripID;
				return await this.adapter.find({ query });
			}
		},
		remove: {
			auth: "required",
			rest: "DELETE /:id",
			async handler(ctx) {
				const reservation = await this.getById(ctx.params.id);
				if (!reservation) {
					throw new MoleculerClientError("Reservation not found.", 403);
				}
				if (reservation.user !== ctx.meta.user._id) {
					throw new MoleculerClientError("You cannot delete reservations of other users.", 403);
				}
				return this._remove(ctx, { id: reservation._id });
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {

	}
};