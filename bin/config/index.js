'use strict';

var fs = require('fs');
var winston = require('winston');

//path to your user cert / ca to access gocdb
var mycert = fs.readFileSync('/usr/local/syncthing/laptop/soichi/ssh/derived/usercert.pem', {encoding: 'ascii'});
var mykey = fs.readFileSync('/usr/local/syncthing/laptop/soichi/ssh/derived/userkey.pem', {encoding: 'ascii'});
var gocdbca = fs.readFileSync('/usr/local/syncthing/laptop/soichi/ssh/gocdb_ca.pem', {encoding: 'ascii'});

//gocdb2sls specific config
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

    /* these things doesn't seems to help*/
    //for hosts that force redirect to https:
    rejectUnhauthorized : false, //ignore DEPTH_ZERO_SELF_SIGNED_CERT 
    strictSSL: false, //ignore SELF_SIGNED_CERT_IN_CHAIN
    cert: mycert, key: mykey, ca:gocdbca //use the same key use to contact gocdb .. 
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
    },
}

