'use strict';

//contrib
var request = require('request');
var xml2js = require('xml2js');
var winston = require('winston');
var async = require('async');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
//var toolkit = require('./toolkit');
//var sls = require('./sls');

var parser = new xml2js.Parser();

/* pointless
function parseEndpoint(raw_endpoint) {
    var endpoint = {};
    for(var key in raw_endpoint) {
        var value = raw_endpoint[key];
        switch(key) {
        case '$':
            //ignore
            break;
        case 'PRIMARY_KEY':
        case 'HOSTNAME':
        case 'GOCDB_PORTAL_URL':
        case 'HOSTDN':
        case 'BETA':
        case 'SERVICE_TYPE':
        case 'HOST_IP':
        case 'HOST_IPV6':
        case 'CORE':
        case 'IN_PRODUCTION':
        case 'NODE_MONITORED':
        case 'SITENAME':
        case 'COUNTRY_NAME':
        case 'COUNTRY_CODE':
        case 'ROC_NAME':
        case 'URL':
        case 'ENDPOINTS':
        case 'EXTENSIONS':
        case 'HOST_OS':
        case 'HOST_ARCH':
            //just unwrap
            endpoint[key] = value[0];
            break;
        default:
            logger.warn("ignoring unknown key("+key+") in wlcg endpoint record with value("+value+")");
        }
    }
    return endpoint;
}
*/

var gocdb_sites = {}; //list of all GOCDB sites - keyed by PRIMARY_KEY

/*
var gocdb_endpoints = {}; //list of all GOCDB endpoints - keyed by PRIMARY_KEY
exports.load = function(cb) {
    async.series([
        load_sites,
        load_endpoints,
    ], cb);
}
*/

function loadSites(cb) {
    logger.debug("loading gocdb sites from "+config.site_xml.url);
    request.get(config.site_xml, function(err, msg, xml) {
        if(err) return cb(err);
        parser.parseString(xml, function(err, sites) {
            if(err) return cb(err);
            sites.results.SITE.forEach(function(site) {
                var name = site.$.PRIMARY_KEY;
                gocdb_sites[name] = site;
            });
            cb(null);
        });
    });
}

function getSiteByName(name) {
    for(var key in gocdb_sites) {
        var site = gocdb_sites[key];
        if(site.$.NAME == name) return site;
    }
    //logger.debug("couldn't find site by name: "+name);
    return null;
}

/*
function getEndpointByHostname(hostname) {
    for(var key in gocdb_endpoints) {
        var endpoint = gocdb_endpoints[key];
        if(endpoint.HOSTNAME == hostname) return endpoint;
    }
    return null;
}
*/


/*
function processLatencyEndpoint(endpoint, cb) {
    logger.debug("processing latency endpoint");
    cb();
}

function processBandwidthEndpoint(endpoint, cb) {
    logger.debug("processing bandwitch endpoint");
    cb();
}
*/

exports.getSiteByName = getSiteByName;
//exports.getEndpointByHostname = getEndpointByHostname;

exports.loadSites = loadSites;

