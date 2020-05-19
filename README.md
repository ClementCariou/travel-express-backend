# Travel Express Backend

### To get the Node server running locally:

- Clone this repo
- `npm install` to install all required dependencies
- `npm run dev` to start the local server
- the API is available at http://localhost:3000/api

#### MongoDB persistent store
Basically the services stores data in an NeDB persistent file storage in the `./data` folder. If you have to use MongoDB, set the `MONGO_URI` environment variable.
```
MONGO_URI=mongodb://localhost/travel
```

#### Multiple instances
You can run multiple instances of services. Moleculer uses TCP transporter to communicate all instances. No need any additional configuration, it uses UDP for discovery.

### To get the Node server running locally with Docker

1. Start with docker-compose: `docker-compose up -d --build`

	It starts all services in separated containers, a Redis server for caching, a MongoDB server for database and a [Traefik](https://traefik.io/) reverse proxy. All nodes communicate via Moleculer TCP transporter.
2. Open the http://docker-ip:3000 in your browser
3. _Optional: Scale up services_

	`docker-compose up -d --scale api=3 --scale articles=2 --scale users=2 --scale comments=2 --scale follows=2 --scale favorites=2`

## Code Overview

### Dependencies

- [moleculer](https://github.com/moleculerjs/moleculer) - Microservices framework for NodeJS
- [moleculer-web](https://github.com/moleculerjs/moleculer-web) - Official API Gateway service for Moleculer
- [moleculer-db](https://github.com/moleculerjs/moleculer-db/tree/master/packages/moleculer-db#readme) - Database store service for Moleculer
- [moleculer-db-adapter-mongo](https://github.com/moleculerjs/moleculer-db/tree/master/packages/moleculer-db-adapter-mongo#readme) - Database store service for MongoDB *(optional)*
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - To generate JWTs used by authentication
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Hashing user password
- [lodash](https://github.com/lodash/lodash) - Utility library
- [slug](https://github.com/dodo/node-slug) - To encode titles into a URL-friendly format
- [ioredis](https://github.com/luin/ioredis) - [Redis](https://redis.io) server for caching *(optional)*

### Application Structure

- `moleculer.config.js` - Moleculer ServiceBroker configuration file.
- `services/` - This folder contains the services.
- `public/` - This folder contains the front-end static files.
- `data/` - This folder contains the NeDB database files.
