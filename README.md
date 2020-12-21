Participants in this project:

Hamad Shah - cph-ss451@cphbusiness.dk 

Jacob Jabr - cph-jj433@cphbusiness.dk

Chris Skov - cph-cs342@cphbusiness.dk 

Ahmad Talha Noory - cph-an148@cphbusiness.dk 


Learning goals periode 4: https://docs.google.com/document/d/1YMjCnTD54jW9yDk_LoQYkDhrx9HNKHBpBzuetejwR4g/edit#

## first thing you should do is to create af file `.env` in the root of the project with this content

CONNECTION=YOUR_CONNECTION_STRING_TO_ATLAS

DB_NAME=semester_case

PORT=5555

DEBUG=game-project

The text below needs to be added to gameFacade.ts in btw line 36 & 37!

//1) Create expiresAfterSeconds index on lastUpdated
await positionCollection.createIndex({ "lastUpdated": 1 }, { expireAfterSeconds:30 })
//2) Create 2dsphere index on location

