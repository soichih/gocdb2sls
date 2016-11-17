#!/usr/bin/node
'use strict';

//node
var fs = require('fs');

//contrib
var winston = require('winston');
var request = require('request');
var async = require('async');
var xml2js = require('xml2js');

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
        async.eachSeries(config.endpoint_xmls, function(endpoint_xml, next) {
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
function simulateInfo(endpoint) {
    var service_name = null;
    if(endpoint.SERVICE_TYPE == "net.perfSONAR.Bandwidth") service_name = "bwctl";
    if(endpoint.SERVICE_TYPE == "net.perfSONAR.Latency") service_name = "owamp"; 
    if(endpoint.SERVICE_TYPE == "net.perfSONAR.Traceroute") service_name = "traceroute"; //TODO correct?

    var info = {
        //for host record
        communities: ["WLCG"],
        external_address: {
            address: endpoint.HOSTNAME,
        },
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
        services: [
            {
                is_running: "yes",
                enabled: "1",
                name: service_name,
            }
        ],
    };

    return info;
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
            endpoint._info = simulateInfo(endpoint);
            logger.info("simulaing info");
            logger.debug(endpoint);
        } else {
            endpoint._info = info;
            //console.log(JSON.stringify(info, null, 4));
        }
        //console.dir(endpoint._info);
        fs.writeFile(cache_path, JSON.stringify(endpoint), function(err) {
            if(err) return cb(err);
            cb(null);
        });
    });
}

