#!/usr/bin/node
'use strict';

//node
var fs = require('fs');

//contrib
var winston = require('winston');
var request = require('request');
var async = require('async');
var xml2js = require('xml2js');
var dns = require('dns');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var gocdb = require('./gocdb');
var toolkit = require('./toolkit');
var sls = require('./sls');

//globals
var parser = new xml2js.Parser();
var endpoints_cache_dir = config.gocdb2sls.cache_dir+"/endpoints";

//starts here
gocdb.loadSites(function(err, sites) {
    if(err) throw err;
    
    //store sites for reference purpose
    fs.writeFile(config.gocdb2sls.cache_dir+"/gocdb.sites.json", JSON.stringify(sites));

    fs.exists(endpoints_cache_dir, function (exists) {
        if(!exists) fs.mkdirSync(endpoints_cache_dir);
        //load 10 at a time
        async.eachLimit(config.endpoint_xmls, 10, function(endpoint_xml, next) {
            processEndpointXML(endpoint_xml, function(err) {
                if(err) logger.error(err); //continue
                next();
            });
        }, function(err) {
            logger.info("All finished"); 
        });
    });
});

function processEndpointXML(endpoint_xml, cb) {
    logger.debug("loading gocdb endpoints xml from "+endpoint_xml.url);
    request.get(endpoint_xml, function(err, msg, xml) {
        if(err) return cb(err);
        parser.parseString(xml, function(err, endpoints) {
            if(err) return cb(err);

            if(endpoint_xml.name) {
                //store sites for reference purpose
                fs.writeFile(config.gocdb2sls.cache_dir+"/gocdb.endpoints."+endpoint_xml.name+".json", JSON.stringify(endpoints));
            } else {
                logger.error("endpoint_xml name not speicified - not caching content");
            }

            if(!endpoints.results.SERVICE_ENDPOINT) {
                logger.error("no service entries");
                return cb(null);
            }

            var failed = 0;
            async.eachSeries(endpoints.results.SERVICE_ENDPOINT, function(endpoint, next) {
                var key = endpoint.$.PRIMARY_KEY;
                processEndpoint(endpoint, function(err) {
                    if(err) {
                        //continue to next endpoint
                        logger.error(err); 
                        failed++;
                    }
                    next(null);
                });
            }, function(err) {
                if(err) return cb(err);    
                logger.info("Processed "+endpoints.results.SERVICE_ENDPOINT.length+ " endpoints");
                logger.info("Failed "+failed+" endpoints");
                cb(null);
            });
        });
    });
}

//if we can't reach the toolkit, let's create minimal info so that we can still register to sLS
function simulateInfo(endpoint, cb) {
    var service = {
        is_running: "yes",
        enabled: "1",
    };
    if(endpoint.SERVICE_TYPE == "net.perfSONAR.Bandwidth") {
        service.name = "bwctl";
        service.port = "4823";
    }
    if(endpoint.SERVICE_TYPE == "net.perfSONAR.Latency") {
        service.name = "owamp"; 
        service.port = "861";
    }
    if(endpoint.SERVICE_TYPE == "net.perfSONAR.Traceroute") {
        service.name = "traceroute"; //TODO correct?
    }

    var info = {
        ls_client_uuid: endpoint.$.PRIMARY_KEY, //use fake uuid..
        simulated: true,
        
        //for host record
        //communities: ["WLCG", "simulated-WLCG"],
        communities: ["WLCG"],
        external_address: {
            dns_name: endpoint.HOSTNAME[0],
        },
        /* should look like..
        "external_address": {
          "speed": 1000000000,
          "iface": "eth0",
          "ipv4_address": "134.158.73.244",
          "address": "134.158.73.244",
          "ipv6_address": null,
          "mtu": 1500,
          "dns_name": "psonar2.lal.in2p3.fr"
        },

        */
        //toolkit_rpm_version: "unknown",

        //for contact record (let loader pick appropriate fields)
        administrator: {
            //name: null,
            //email: null,
        },

        //for location fields (let loader pick appropriate fields)
        location: {
            //longitude: null,
            //latitude: null,
            //city: null,
            //country: null,
        },

        //for service record
        services: [ service ],
    };

    info.external_address.dns_name = endpoint.HOSTNAME[0];
    dns.lookup(endpoint.HOSTNAME[0], {all: true}, function(err, addresses) {
        if(err) {
            logger.error(err);
            return cb(null, info);
        }
        addresses.forEach(function(address) {
            if(address.family == 4) info.external_address.ipv4_address = address.address;
            if(address.family == 6) info.external_address.ipv6_address = address.address;
        });
        cb(err, info);
    }); 
}

function processEndpoint(endpoint, cb) {
    endpoint._site = gocdb.getSiteByName(endpoint.SITENAME);
    toolkit.getInfo(endpoint, function(err, info) {
        var cache_path = endpoints_cache_dir+"/"+endpoint.$.PRIMARY_KEY;
        if(err) {
            logger.error(err); 
            //continue..
            //TODO - maybe *guess* some key _info?
            /*
            //overwrite if it's not cached yet
            fs.access(cache_path, fs.constants.F_OK, function(err) {
                if(err) {
                    logger.info("storing endpoint without toolkit info.. since we haven't seen this.");
                    fs.writeFile(cache_path, JSON.stringify(endpoint), function(err) {
                        if(err) return cb(err);
                        cb(null);
                    });
                } else cb(null);
            });
            */
            simulateInfo(endpoint, function(err, info) {
                endpoint._info = info;
                logger.info("simulated info");
                logger.debug(JSON.stringify(info, null, 4));

                //TODO - instead of just overriding - only override if it's old, or doesn't contain full _info
                fs.writeFile(cache_path, JSON.stringify(endpoint), function(err) {
                    if(err) return cb(err);
                    cb(null);
                });
            });
        } else {
            endpoint._info = info;
            //some site doesn't register with WLCG community.. although this is super hacky.. let's do
            //if(!~info.communities.indexOf("WLCG")) info.communities.push("WLCG");
            fs.writeFile(cache_path, JSON.stringify(endpoint), function(err) {
                if(err) return cb(err);
                cb(null);
            });
        }
    });
}

