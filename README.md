### API for albion profit calculator
API for authorization and registration and some useful item data.

## Build Setup

``` bash
# install dependencies
$ yarn

# run server with hot reload at localhost:4000
$ yarn dev

# run in production mode
$ yarn prod

# run average data worker
$ yarn run-worker-dev

# run average data worker in production mode
$ npm run-worker-prod

# lint and fix
$ npm run lint
```

## Migrations and other
```bash
# create mongodb indexes
$ yarn create-indexes

# fill db with market orders from the orders dump
$ yarn fill-market-orders

# install migrate-mongo
$ npm install -g migrate-mongo

# up migrations
$ yarn migrations:up

# down migrations
$ yarn mgirations:down
```

Don't forget to run mongodb.
