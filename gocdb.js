'use strict';

//contrib
var request = require('request');
var xml2js = require('xml2js');
var winston = require('winston');
var async = require('async');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);

//globals
var parser = new xml2js.Parser();
var gocdb_sites = {}; //list of all GOCDB sites - keyed by PRIMARY_KEY

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
    return null;
}

exports.getSiteByName = getSiteByName;
exports.loadSites = loadSites;

