# App for anonymising and syncing mongodb collection

## Setup

in .env file replace DB_URI with your mongodb connection string. Replica set is required for syncing.

`npm i`

`npm run build`

`npm start` to start generating and inserting documents with fake data into `customers` collection

`npm run sync` to start anonymising and syncing `customers` with `customers_anonymised`

`npm run reindex` to start reindexing process

## app.ts

Generates 1 to 10 fake customers and inserts it into `customers` every 200ms.

## sync.ts

Detects documents that are being inserted or changed in `customers`. Anonymises personal data and copies it to `customers_anonymised`.

Also checks for any changes that were made to `customers` since last change to `customers_anonymised` while the app was offline.

When run with `--full-reindex` parameter, anonymises and copies all documents from `customers` to `customers_anonymised`.
