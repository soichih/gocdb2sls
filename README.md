# GOCDB to Simple Lookup Service Data Loader

This service caches information from GOCDB and each toolkit instances (sonars) and upload information to a private sLS server mimicking the data stored by LS registration service. Once the data is loaded to sLS, it should provide same information as any other sLS server populated by LS registration service.

# Installation

1) Install sLS server (and mongoDB)

Please follow https://github.com/esnet/simple-lookup-service/wiki/LSInstallation

Or.. if you have docker host, the quickest way to get sLS server running is to run following

```
docker run \
    --name slsdev-mongo \
    -e AUTH=no \
    -d tutum/mongodb

docker run \
    --name slsdev \
    --link slsdev-mongo:mongo \
    -v `pwd`/conf:/etc/lookup-service \
    -p 8090:8090 \
    -d soichih/sls
```

2) Install gocdb2sls

```
yum install node npm
git clone git@github.com:soichih/gocdb2sls.git
npm install
```

3) Configure gocdb2sls

Create a file named "config.js" and copy & update following template.

```
'use strict';

var fs = require('fs');
var winston = require('winston');

//path to your user cert / ca to access gocdb
var mycert = fs.readFileSync('/usr/local/syncthing/laptop/soichi/ssh/derived/usercert.pem', {encoding: 'ascii'});
var mykey = fs.readFileSync('/usr/local/syncthing/laptop/soichi/ssh/derived/userkey.pem', {encoding: 'ascii'});
var gocdbca = fs.readFileSync('/usr/local/syncthing/laptop/soichi/ssh/gocdb_ca.pem', {encoding: 'ascii'});

//gocdb2sls specific config (you need to create this directory and give proper file permission)
exports.gocdb2sls = {
    cache_dir: '/usr/local/gocdb2sls-cache' 
}

//specify options to request xml from GOCDB for site information
//This information maybe used to augument information from the toolkit itself (but I might not need it..)
exports.site_xml = {
    url: 'https://goc.egi.eu/gocdbpi/private/?method=get_site', 
    //url: 'http://soichi7.ppa.iu.edu/public/cache/site.xml',
    cert: mycert, key: mykey, ca: gocdbca
}

//endpoints XML to load and process (you can list multiple URLs for each services that you want to load)
exports.endpoint_xmls = [
    {
        url: 'https://goc.egi.eu/gocdbpi/private/?method=get_service_endpoint&service_type=net.perfSONAR.Bandwidth',
        //url: 'http://soichi7.ppa.iu.edu/public/cache/service_endpoint.xml',
        cert: mycert, key: mykey, ca: gocdbca
    },
    {
        url: 'https://goc.egi.eu/gocdbpi/private/?method=get_service_endpoint&service_type=net.perfSONAR.Latency', 
        //url: 'http://soichi7.ppa.iu.edu/public/cache/service_endpoint.xml',
        cert: mycert, key: mykey, ca: gocdbca
    }
]

exports.toolkit = {
    //amount of time to attemp loading sonars' /toolkit?format=json
    timeout: 1000*10,

    /* these things doesn't seems to help
    //for hosts that force redirect to https:
    rejectUnhauthorized : false, //ignore DEPTH_ZERO_SELF_SIGNED_CERT 
    strictSSL: false, //ignore SELF_SIGNED_CERT_IN_CHAIN
    cert: mycert, key: mykey, ca:gocdbca //use the same key use to contact gocdb .. 
    */
}

//configuration for Simple Lookup Serivce to store data
exports.sls = {
    //You SLS URL to post records
    url: "http://localhost:8090",

    //Global sLS instance to check against host record
    //global_url: "http://ps-east.es.net:8090",
}

///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Logging
//

exports.logger = {
    winston: {
        transports: [
            //display all logs to console
            new winston.transports.Console({
                timestamp: function() {
                    var d = new Date();
                    return d.toString(); //show timestamp
                },
                colorize: true,
                level: 'debug'
            }),
            /*
            //store all warnings / errors in error.log
            new (winston.transports.File)({
                filename: 'error.log',
                level: 'warn'
            })
            */
        ]
    }
}
```

4) Test it

gocdb2sls works in 2 steps. First step is to cache information from GOCDB and each toolkit instances

```
./cache.js
```

This will store endpoint information under the configured directory (see exports.gocdb2sls in your config). It could take 20 - 40 minutes.

Then, truncate & load data to sLS

```
./truncate.js
./load.js
```

If everything goes well, you should now be able to view data stored in your sLS server. At URL such as http://localhost:8090/lookup/records

5) Setup cron

If above step worked, then you should run both steps via cron

[/etc/cron.d/gocdb2sls]

```
GOCDB2SLS_DIR=/somewhere
0 * * * * someone cd $GOCDB2SLS_DIR && ./cache.js >> gocdb2sls.log
40 * * * * someone cd $GOCDB2SLS_DIR && ./truncate.js && ./load.js >> gocdb2sls.log

#Remove old endpoint that's no longer getting cached (removed?)
55 0 * * * someone cd /usr/local/gocdb2sls-cache && find -mtime +1 -print -exec /bin/rm {} \;
```

# TODOs

Until toolkit provides me the uuid for each host, meshconfig admin can't identify back to the same record.. used to configure 
meshconfig.. for each record type, I will need to implement getKey() function. if gocdb-key is present, it uses it. If uuid is present,
it uses it.. if that's not present, then maybe use composite of certain fields? During the query phase, however, I need to know
which method was used, so key value needs to be prefixed by "gocdb:" or "uuid:" or "comp:".. and do lookup on appropriate fields

Right now, endpoint removed in GOCDB will take up to 24 hours (based on cron) to be removed from the sLS - we should update cache.js to 
automatically remove any endpoint that no longer is registered immediately.

