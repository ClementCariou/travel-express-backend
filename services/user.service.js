"use strict";

const { MoleculerClientError } = require("moleculer").Errors;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");

module.exports = {
	name: "user",
	mixins: [
		DbService("user"),
		CacheCleanerMixin([
			"cache.clean.user",
			"cache.clean.follows",
		])
	],

	/**
	 * Default settings
	 */
	settings: {
		/** REST Basepath */
		rest: "/",
		/** Secret for JWT */
		JWT_SECRET: process.env.JWT_SECRET || "jwt-travel-secret",


		/** Public fields */
		fields: ["_id", "email", "tel", "firstName", "lastName", "vehicule", "seats", "luggageSize", "talk", "smoke"],

		/** Validator schema for entity */
		entityValidator: {
			email: { type: "email" },
			tel: { type: "string", regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im },
			password: { type: "string", min: 6 },
			firstName: { type: "string", min: 2 },
			lastName: { type: "string", min: 2 },
			vehicle: { type: "string", default: "" },
			seats: { type: "number", min: 1, max: 10, default: 2 },
			luggageSize: { type: "enum", values: ["small", "medium", "large"], default: "medium" },
			talk: { type: "enum", values: ["no", "little", "yes"], default: "yes" },
			smoke: { type: "boolean", default: false }
		}
	},

	/**
	 * Actions
	 */
	actions: {
		/**
		 * Register a new user
		 *
		 * @actions
		 * @param {Object} user - User entity
		 *
		 * @returns {Object} Created entity & token
		 */
		create: {
			rest: "POST /user",
			params: {
				email: { type: "email" },
				tel: { type: "string", regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im },
				password: { type: "string", min: 6 },
				firstName: { type: "string", min: 2 },
				lastName: { type: "string", min: 2 }
			},
			async handler(ctx) {
				let entity = ctx.params.user;
				await this.validateEntity(entity);
				if (entity.firstName && entity.lastName) {
					const found = await this.adapter.findOne({ firstName: entity.firstName, lastName: entity.lastName });
					if (found)
						throw new MoleculerClientError("Username exists!", 422, "", [{ field: "username", message: "exists" }]);
				}

				if (entity.tel) {
					const found = await this.adapter.findOne({ tel: entity.tel });
					if (found)
						throw new MoleculerClientError("Tel exists!", 422, "", [{ field: "tel", message: "exists" }]);
				}

				if (entity.email) {
					const found = await this.adapter.findOne({ email: entity.email });
					if (found)
						throw new MoleculerClientError("Email exists!", 422, "", [{ field: "email", message: "exists" }]);
				}

				entity.password = bcrypt.hashSync(entity.password, 10);
				entity.createdAt = new Date();

				const doc = await this.adapter.insert(entity);
				const user = await this.transformDocuments(ctx, {}, doc);
				const json = await this.transformEntity(user, true, ctx.meta.token);
				await this.entityChanged("created", json, ctx);
				return json;
			}
		},

		/**
		 * Login with email & password
		 *
		 * @actions
		 * @param {Object} user - User credentials
		 *
		 * @returns {Object} Logged in user with token
		 */
		login: {
			rest: "POST /user/login",
			params: {
				type: "object", props: {
					email: { type: "email" },
					password: { type: "string", min: 1 }
				}
			},
			async handler(ctx) {
				const { email, password } = ctx.params.user;

				const user = await this.adapter.findOne({ email });
				if (!user)
					throw new MoleculerClientError("Email or password is invalid!", 422, "", [{ field: "email", message: "is not found" }]);

				const res = await bcrypt.compare(password, user.password);
				if (!res)
					throw new MoleculerClientError("Wrong password!", 422, "", [{ field: "email", message: "is not found" }]);

				// Transform user entity (remove password and all protected fields)
				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			}
		},

		/**
		 * Get user by JWT token (for API GW authentication)
		 *
		 * @actions
		 * @param {String} token - JWT token
		 *
		 * @returns {Object} Resolved user
		 */
		resolveToken: {
			cache: {
				keys: ["token"],
				ttl: 60 * 60 // 1 hour
			},
			params: {
				token: "string"
			},
			async handler(ctx) {
				const decoded = await new this.Promise((resolve, reject) => {
					jwt.verify(ctx.params.token, this.settings.JWT_SECRET, (err, decoded) => {
						if (err)
							return reject(err);

						resolve(decoded);
					});
				});

				if (decoded.id)
					return this.getById(decoded.id);
			}
		},

		/**
		 * Get current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @returns {Object} User entity
		 */
		me: {
			auth: "required",
			rest: "GET /user",
			cache: {
				keys: ["#userID"]
			},
			async handler(ctx) {
				const user = await this.getById(ctx.meta.user._id);
				if (!user)
					throw new MoleculerClientError("User not found!", 400);

				const doc = await this.transformDocuments(ctx, {}, user);
				return await this.transformEntity(doc, true, ctx.meta.token);
			}
		},

		/**
		 * Update current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @param {Object} user - Modified fields
		 * @returns {Object} User entity
		 */
		updateMyself: {
			auth: "required",
			rest: "PUT /user",
			params: {
				email: { type: "email" },
				tel: { type: "string", regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im, optional: true },
				password: { type: "string", min: 6, optional: true },
				firstName: { type: "string", min: 2, optional: true },
				lastName: { type: "string", min: 2, optional: true },
				vehicle: { type: "string", optional: true },
				seats: { type: "number", min: 1, max: 10, optional: true },
				luggageSize: { type: "enum", values: ["small", "medium", "large"], optional: true },
				talk: { type: "enum", values: ["no", "little", "yes"], optional: true },
				smoke: { type: "boolean", optional: true }
			},
			async handler(ctx) {
				const newData = ctx.params;
				if (newData.firstName && newData.lastName) {
					const found = await this.adapter.findOne({ firstName: newData.firstName, lastName: newData.lastName });
					if (found && found._id.toString() !== ctx.meta.user._id.toString())
						throw new MoleculerClientError("Username exists!", 422, "", [{ field: "username", message: "exists" }]);
				}

				if (newData.tel) {
					const found = await this.adapter.findOne({ tel: newData.tel });
					if (found && found._id.toString() !== ctx.meta.user._id.toString())
						throw new MoleculerClientError("Tel exists!", 422, "", [{ field: "tel", message: "exists" }]);
				}

				if (newData.email) {
					const found = await this.adapter.findOne({ email: newData.email });
					if (found && found._id.toString() !== ctx.meta.user._id.toString())
						throw new MoleculerClientError("Email exists!", 422, "", [{ field: "email", message: "exists" }]);
				}
				newData.updatedAt = new Date();
				const update = {
					"$set": newData
				};
				const doc = await this.adapter.updateById(ctx.meta.user._id, update);

				const user = await this.transformDocuments(ctx, {}, doc);
				const json = await this.transformEntity(user, true, ctx.meta.token);
				await this.entityChanged("updated", json, ctx);
				return json;
			}
		},

		/**
		 * Remove current user entity.
		 * Auth is required!
		 *
		 * @actions
		 *
		 * @returns
		 */
		deleteAccount: {
			auth: "required",
			rest: "DELETE /user",
			cache: {
				keys: ["#userID"]
			},
			async handler(ctx) {
				const user = await this.getById(ctx.meta.user._id);
				if (!user)
					throw new MoleculerClientError("User not found!", 400);
				//TODO: remove trip/reservations
				this.remove(user);
			}
		},

		get: {
			rest: "GET /user/:id"
		},

		// for debug porposes
		list: {
			rest: "GET /dev/users"
		},

		update: {
			rest: "PUT /dev/users/:id"
		},

		remove: {
			rest: "DELETE /dev/users/:id"
		}
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Generate a JWT token from user entity
		 *
		 * @param {Object} user
		 */
		generateJWT(user) {
			const today = new Date();
			const exp = new Date(today);
			exp.setDate(today.getDate() + 60);

			return jwt.sign({
				id: user._id,
				username: user.username,
				exp: Math.floor(exp.getTime() / 1000)
			}, this.settings.JWT_SECRET);
		},

		/**
		 * Transform returned user entity. Generate JWT token if neccessary.
		 *
		 * @param {Object} user
		 * @param {Boolean} withToken
		 */
		transformEntity(user, withToken, token) {
			if (user) {
				if (withToken)
					user.token = token || this.generateJWT(user);
			}

			return { user };
		}
	}
};
