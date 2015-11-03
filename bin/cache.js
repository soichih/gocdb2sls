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
gocdb.loadSites(function(err) {
    if(err) throw err;

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

function processEndpoint(endpoint, cb) {
    endpoint._site = gocdb.getSiteByName(endpoint.SITENAME);
    toolkit.getInfo(endpoint, function(err, info) {
        if(err) return cb(err);
        endpoint._info = info;
        fs.writeFile(endpoints_cache_dir+"/"+endpoint.$.PRIMARY_KEY, JSON.stringify(endpoint), function(err) {
            if(err) return cb(err);
            cb(null);
        });
    });
}

