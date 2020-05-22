"use strict";

const { MoleculerClientError } = require("moleculer").Errors;
const DbService = require("../mixins/db.mixin");
const CacheCleanerMixin = require("../mixins/cache.cleaner.mixin");


module.exports = {
	name: "favorites",
	mixins: [
		DbService("favorites"),
		CacheCleanerMixin([
			"cache.clean.articles",
			"cache.clean.user",
			"cache.clean.favorites",
		])
	],
	/**
	 * Default settings
	 */
	settings: {

	},

	/**
	 * Actions
	 */
	actions: {

		/**
		 * Create a new favorite record
		 *
		 * @actions
		 *
		 * @param {String} article - Article ID
		 * @param {String} user - User ID
		 * @returns {Object} Created favorite record
		 */
		add: {
			params: {
				article: { type: "string" },
				user: { type: "string" },
			},
			async handler(ctx) {
				const { article, user } = ctx.params;
				const item = await this.findByArticleAndUser(article, user);
				if (item)
					throw new MoleculerClientError("Articles has already favorited");

				return await this._create(ctx, { article, user, createdAt: new Date() });
			}
		},

		/**
		 * Check the given 'article' is followed by 'user'.
		 *
		 * @actions
		 *
		 * @param {String} article - Article ID
		 * @param {String} user - User ID
		 * @returns {Boolean}
		 */
		has: {
			cache: {
				keys: ["article", "user"]
			},
			params: {
				article: { type: "string" },
				user: { type: "string" },
			},
			async handler(ctx) {
				const { article, user } = ctx.params;
				const item = await this.findByArticleAndUser(article, user);
				return !!item;
			}
		},

		/**
		 * Count of favorites.
		 *
		 * @actions
		 *
		 * @param {String?} article - Article ID
		 * @param {String?} user - User ID
		 * @returns {Number}
		 */
		count: {
			cache: {
				keys: ["article", "user"]
			},
			params: {
				article: { type: "string", optional: true },
				user: { type: "string", optional: true },
			},
			async handler(ctx) {
				let query = {};
				if (ctx.params.article)
					query = { article: ctx.params.article };

				if (ctx.params.user)
					query = { user: ctx.params.user };

				return await this._count(ctx, { query });
			}
		},

		/**
		 * Delete a favorite record
		 *
		 * @actions
		 *
		 * @param {String} article - Article ID
		 * @param {String} user - User ID
		 * @returns {Number} Count of removed records
		 */
		delete: {
			params: {
				article: { type: "string" },
				user: { type: "string" },
			},
			async handler(ctx) {
				const { article, user } = ctx.params;
				const item = await this.findByArticleAndUser(article, user);
				if (!item)
					throw new MoleculerClientError("Articles has not favorited yet");

				return await this._remove(ctx, { id: item._id });
			}
		},

		/**
		 * Remove all favorites by article
		 *
		 * @actions
		 *
		 * @param {String} article - Article ID
		 * @returns {Number} Count of removed records
		 */
		removeByArticle: {
			params: {
				article: { type: "string" }
			},
			handler(ctx) {
				return this.adapter.removeMany(ctx.params);
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Find the first favorite record by 'article' or 'user'
		 * @param {String} article - Article ID
		 * @param {String} user - User ID
		 */
		findByArticleAndUser(article, user) {
			return this.adapter.findOne({ article, user });
		},
	}
};
