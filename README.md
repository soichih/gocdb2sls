# GOCDB to Simple Lookup Service Data Loader

This service caches information from GOCDB(xml) and for each toolkit instances it downloads /toolkit json info and uploads it to a private sLS server mimicking the data collected by LS registration service. 

For endpoint that's not reachable from where this service is running, it *guesses* the information that needs to be stored on private sLS.

This service consits of various sub scripts.

`cache.js`

This does the caching of GOCDB XML and toolkit json and stores it to disk

`truncate.js / load.js`

This loads the cached information to sLS. sLS needs to be truncated before data can be loaded.

## Configuration

Before we start installing gocdb2sls, prepare configuration files under /etc/lookup-service

### Simple Lookup Service Configuration

```bash
mkdir -p /etc/gocdb2sls/sls
```

`/etc/gocdb2sls/sls/log4j.properties`

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

`/etc/gocdb2sls/sls/lookupservice.yaml`

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

`/etc/gocdb2sls/sls/queueservice.yaml`

```
queue:
    queueservice: 'off'

message:
    persistent: false
    ttl: 120
```

Please see https://github.com/esnet/simple-lookup-service/wiki/LSInstallation for more information

### GOCDB2SLS Configuration

`/etc/gocdb2sls/index.js`

```javascript
'use strict';

var fs = require('fs');
var winston = require('winston');

//path to your user cert / ca to access gocdb
var mycert = fs.readFileSync('/etc/grid-security/user/cert.pem', {encoding: 'ascii'});
var mykey = fs.readFileSync('/etc/grid-security/user/key.pem', {encoding: 'ascii'});
var gocdbca = `-----BEGIN CERTIFICATE-----
MIIDhjCCAm6gAwIBAgIBADANBgkqhkiG9w0BAQUFADBUMQswCQYDVQQGEwJVSzEV
MBMGA1UEChMMZVNjaWVuY2VSb290MRIwEAYDVQQLEwlBdXRob3JpdHkxGjAYBgNV
BAMTEVVLIGUtU2NpZW5jZSBSb290MB4XDTA3MTAzMDA5MDAwMFoXDTI3MTAzMDA5
MDAwMFowVDELMAkGA1UEBhMCVUsxFTATBgNVBAoTDGVTY2llbmNlUm9vdDESMBAG
A1UECxMJQXV0aG9yaXR5MRowGAYDVQQDExFVSyBlLVNjaWVuY2UgUm9vdDCCASIw
DQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAM3ORtmmUHotwDTfAH5/eIlo3+BK
oElDeaeN5Sg2lhPu0laPch7pHKSzlqyHmZGsk3fZb8hBmO0lD49+dKnA31zLU6ko
Bje1THqdrGZPcjTm0lhc/SjzsBtWm4oC/bpYBACliB9wa3eSuU4Rqq71n7+4J+WO
KvaDHvaTdRYE3pyie2Xe5QTI8CXedCMh18+EdFvwlV79dlmNRNY93ZWUu6POL6d+
LapQkUmasXLjyjNzcoPXgDyGauHOqmyqxuPx4tDTsC25nKr+7K5k3T+lplJ/jMkQ
l/QHgqnABBXQILzzrt0a8nQdM8ONA+bht+8sy4eN/0zMulNj8kAzrutkhJsCAwEA
AaNjMGEwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYE
FF74G0imd2spPC4AUzMrY6J7fpPAMB8GA1UdIwQYMBaAFF74G0imd2spPC4AUzMr
Y6J7fpPAMA0GCSqGSIb3DQEBBQUAA4IBAQCT0a0kcE8oVYzjTGrd5ayvOI+vbdiY
MG7/2V2cILKIts7DNdIrEIonlV0Cw96pQShjRRIizSHG5eH1kLJcbK/DpgX6QuPR
WhWR5wDJ4vaz0qTmUpwEpsT9mmyehhHbio/EsYM7LesScJrO2piD2Bf6pFUMR1LC
scAqN7fTXJSg6Mj6tOhpWpPwM9WSwQn8sDTgL0KkrjVOVaeJwlyNyEfUpJuFIgTl
rEnkXqhWQ6ozArDonB4VHlew6eqIGaxWB/yWMNvY5K+b1j5fdcMelzA45bFucOf1
Ag+odBgsGZahpFgOqKvBuvSrk/8+ie8I2CVYwT486pPnb5JFgHgUfZo8
-----END CERTIFICATE-----`;

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

## Installation

0. First of all, you need to install docker. Please refer to [docker installation doc](https://docs.docker.com/engine/installation/) to install the latest docker engine.

    Then, make sure to create a network to place all of gocdb2sls (and mca) containers.

    ```bash
    docker network create mca
    ```

1. Install MongoDB and sLS server

    ```bash
    docker run \
        --restart=always \
        --net mca \
        --name sls-mongo \
        -d mongo

    docker run \
        --restart=always \
        --net mca \
        --name sls \
        -v /etc/gocdb2sls/sls:/etc/lookup-service \
        -d soichih/sls
    ```

    You shouldn't have to persist the DB content of sls-mongo, since it's mostly used as a cache.

2. Install gocdb2sls

    ```bash
    docker run \
        --restart=always \
        --name gocdb2sls \
        --net mca \
        -v /etc/gocdb2sls:/app/config \
        -v /usr/local/gocdb2sls-cache:/cache \
        -v /etc/grid-security/user:/etc/grid-security/user \
        -d soichih/gocdb2sls
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

## Update Containers

To update your container to the latest version, do

```bash
docker pull soichih/sls
docker restart sls
```

```bash
docker pull soichih/gocdb2sls
docker restart gocdb2sls
```

## TODOs

Right now, endpoint removed in GOCDB will take up to 24 hours (based on cron) to be removed from the sLS - we should update cache.js to 
automatically remove any endpoint that no longer is registered immediately.

Add logrotate for gocdb2sls.log

