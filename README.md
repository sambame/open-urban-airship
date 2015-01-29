[![Build Status](https://travis-ci.org/sambame/open-urban-airship.svg)](https://travis-ci.org/sambame/open-urban-airship)
[![Coverage Status](https://coveralls.io/repos/sambame/open-urban-airship/badge.svg)](https://coveralls.io/r/sambame/open-urban-airship)
[![Dependency Status](https://david-dm.org/alanshaw/david.svg)](https://david-dm.org/sambame/open-urban-airship)
[![devDependency Status](https://david-dm.org/alanshaw/david/dev-status.svg)](https://david-dm.org/sambame/open-urban-airship#info=devDependencies)

This is an open implmenation of the Urban [Airship REST API](https://docs.urbanairship.com/display/DOCS/Server%3A+iOS+Push+API) for pushing notifications to iOS devices.
The project runs under node.js and keep be run only any platform that can host node.js.  

Any Urban client can work with this code as long and you change the endpoint to point to where your server code is running instead of the Urban endpoint (https://go.urbanairship.com/).

The project uses mongodb for saving all the server data and been tested successfully to run on Heroku with MongoLab. 

After deploy you need to create an application (as you also do in Urban), you can use the PUT /application command and pass the same (more or less) parameters as you do in Urban.
