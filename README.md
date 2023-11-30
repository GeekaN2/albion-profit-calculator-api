## API for albion profit calculator
API for authorization and registration and some useful item data.

### Configs setup
Rename .env.sample to .env 

Rename server.json.sample to servers.json

Rename migrate-mongo-config.js.sample to migrate-mongo-config.js and change credentials

### Build Setup

``` bash
# install dependencies
$ yarn

# run server with hot reload at localhost:4000
$ yarn dev

# run in production mode
$ yarn prod

# run average data worker
$ yarn run-workers-dev

# run average data worker in production mode
$ yarn run-workers

# run NATS script to get your data from NATS servers
$ yarn nats

# lint and fix
$ yarn lint
```

## Migrations and other
```bash
# create mongodb indexes
$ yarn create-indexes

# fill db with market orders from the orders dump
$ yarn fill-market-orders

# install migrate-mongo
$ yarn add -g migrate-mongo

# up migrations
$ yarn migrations:up

# down migrations
$ yarn mgirations:down
```

Don't forget to run mongodb.
