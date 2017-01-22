# GOCDB to Simple Lookup Service Data Loader

This service caches information from GOCDB(xml) and for each toolkit instances it downloads /toolkit json info and uploads it to a private sLS server mimicking the data collected by LS registration service. 

For endpoint that's not reachable from where this service is running, it *guesses* the information that needs to be stored on private sLS.

This service consits of various sub scripts.

## cache.js 

This does the caching of GOCDB XML and toolkit json and stores it to disk

## truncate.js / load.js

This loads the cached information to sLS. sLS needs to be truncated before data can be loaded.

# Installation

1) Install MongoDB and sLS server

Please follow https://github.com/esnet/simple-lookup-service/wiki/LSInstallation

Or.. you can use our docker container

```
docker run \
    --restart=always \
    --net mca \
    --name mongo \
    -d mongo

docker run \
    --restart=always \
    --net mca \
    --name sls \
    -v `pwd`/conf:/etc/lookup-service \
    -p 8090:8090 \
    -d soichih/sls
```

Here is some sample config files stored on `pwd`/conf

[conf/log4j.properties]
```
log4j.rootCategory=DEBUG, LOOKUP
log4j.appender.LOOKUP=org.apache.log4j.RollingFileAppender
log4j.appender.LOOKUP.MaxFileSize=10MB
log4j.appender.LOOKUP.MaxBackupIndex=3
log4j.appender.LOOKUP.File=/var/log/lookup-service/lookup-service.log
log4j.appender.LOOKUP.layout=org.apache.log4j.PatternLayout
log4j.appender.LOOKUP.layout.ConversionPattern=%p %d{ISO8601} %m%n
log4j.appender.console=org.apache.log4j.ConsoleAppender
log4j.appender.console.layout=org.apache.log4j.PatternLayout
log4j.appender.console.layout.ConversionPattern=%5p [%t] (%F:%L) - %m%n
```

[conf/lookupservice.yaml]
```
---
#Lookup Service settings
lookupservice:
    host: '0.0.0.0'
    port: 8090
    lease:
        max: 2592000
        default: 3600
        min: 1800
    coreservice: 'on'
    cacheservice: 'off'

#Database settings  
database:
    DBUrl: 'mongo'
    DBPort: 27017
    DBName: 'LookupService'
    DBCollName: 'services'
    pruneInterval: 1800
    pruneThreshold: 120
```

[confg/queueservice.yaml]
```
queue:
    queueservice: 'off'

message:
    persistent: false
    ttl: 120
```

2) Install gocdb2sls

To install locally

```
yum install node npm git
cd /usr/local/ && git clone git@github.com:soichih/gocdb2sls.git
cd /usr/local/gocdb2sls && npm install

mkdir /usr/local/gocdb2sls-cache
```

Or you can install via docker (run this after you create ./config directory - see below)

```
docker run \
    --restart=always \
    --name gocdb2sls \
    --net mca \
    -v `pwd`/config:/app/config \
    -v /usr/local/gocdb2sls-cache:/cache \
    -v /etc/grid-security/user:/etc/grid-security/user \
    -d soichih/gocdb2sls
```

3) Configure gocdb2sls

Update the configuration file under config/index.js

```
'use strict';

var fs = require('fs');
var winston = require('winston');

//path to your user cert / ca to access gocdb
var mycert = fs.readFileSync(__dirname+'/usercert.pem', {encoding: 'ascii'});
var mykey = fs.readFileSync(__dirname+'/userkey.pem', {encoding: 'ascii'});
var gocdbca = fs.readFileSync(__dirname+'/gocdb_ca.pem', {encoding: 'ascii'});

//gocdb2sls specific config (you need to create this directory and give proper file permission)
exports.gocdb2sls = {
    cache_dir: '/cache' 
}

//specify options to request xml from GOCDB for site information
//This information maybe used to augument information from the toolkit itself (but I might not need it..)
exports.site_xml = {
    url: 'https://goc.egi.eu/gocdbpi/private/?method=get_site', 
    cert: mycert, key: mykey, ca: gocdbca
}

//endpoints XML to load and process (you can list multiple URLs for each services that you want to load)
exports.endpoint_xmls = [
    {
        url: 'https://goc.egi.eu/gocdbpi/private/?method=get_service_endpoint&service_type=net.perfSONAR.Bandwidth',
        cert: mycert, key: mykey, ca: gocdbca
    },
    {
        url: 'https://goc.egi.eu/gocdbpi/private/?method=get_service_endpoint&service_type=net.perfSONAR.Latency', 
        cert: mycert, key: mykey, ca: gocdbca
    }
]

exports.toolkit = {
    //amount of time to attemp loading sonars' /toolkit?format=json
    timeout: 1000*20,

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
    url: "http://sls:8090",

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
        ]
    }
}
```

4) Test it (for non-docker installation)

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

5) Setup cron (for non-docker)

If above step worked, then you should run both steps via cron

[/etc/cron.d/gocdb2sls]

```
GOCDB2SLS_DIR=/somewhere
0 * * * * someone cd $GOCDB2SLS_DIR && ./cache.js >> gocdb2sls.log
40 * * * * someone cd $GOCDB2SLS_DIR && ./truncate.js && ./load.js >> gocdb2sls.log

#Remove old endpoint that's no longer getting cached (removed?)
55 0 * * * someone cd /usr/local/gocdb2sls-cache && find -mtime +1 -print -exec /bin/rm {} \;
```

6) (For MCA users) Point your MCA to use the gocdb-sls instance

You are most likely installing gocdb2sls to be used by MeshConfig Administrator. If so, you can add something like following to your MCA's datasource.js configuration to load data from your sLS instance.

```
exports.services = {
    "osg": {
        label: 'OSG',
        type: 'global-sls',
        activehosts_url: 'http://ps1.es.net:8096/lookup/activehosts.json',
        query: '?type=service&group-communities=OSG',
        //cache: 1000*60*5, //refresh every 5 minutes (default 30 minutes)
    },

    "wlcg": {
        label: 'WLCG',
        type: 'sls',
        url: 'http://localhost:8090/lookup/records/?type=service&group-communities=WLCG',
        cache: 1000*60*5, //refresh every 5 minutes (default 30 minutes)
        //exclude: [], //TODO - allow user to remove certain service from appearing in the UI
    },
};
```

# TODOs

Right now, endpoint removed in GOCDB will take up to 24 hours (based on cron) to be removed from the sLS - we should update cache.js to 
automatically remove any endpoint that no longer is registered immediately.

Add logrotate for gocdb2sls.log

