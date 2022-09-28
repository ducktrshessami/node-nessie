# node-nessie
A partial ORM for oracledb

This is not intended to be a finished project for release. I'm writing exactly what I need for a current personal project, and at the time of writing this, I do not intend to maintain this.

Based on [Sequelize](https://sequelize.org/)

![GitHub top language](https://img.shields.io/github/languages/top/ducktrshessami/node-nessie)

## Features
- basic model definition
- basic CRUD
- row insertion with ignore duplicate(s)
- findOrCreate based on [findCreateFind](https://sequelize.org/api/v6/class/src/model.js~Model.html#static-method-findCreateFind)

## Not Yet Implemented
I'm sure there's more that could be implemented at some point, but this is what I personally think should be implemented before 1.0
- an underlying separate sql builder module rather than template literal queries
- model template generation for QOL (possibly in separate cli)
- native migrations/seeders support
- internal value sanitization
- stricter attribute validation (especially for bulkCreate)
- potential for bulkCreate to pull default values to fill missing attributes in query
- joins in select queries
- transactions

## Contributing
If you feel like contributing, there's a very high chance you should just maintain a fork instead.

You're welcome to open PRs, but no promises
