'use strict';

//contrib
var request = require('request');
var xml2js = require('xml2js');
var winston = require('winston');
var async = require('async');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);

exports.getHostRecord = function(url, key, cb) {
    var url = url+"?type=host&gocdb-key="+key;
    //logger.debug("getting sls info "+url);
    request.get({
        url: url,
        timeout: 1000*5, //sls should be quick
    }, function(err, msg, json) {
        if(err) return cb(err);
        try {
            //console.log(json);
            var info = JSON.parse(json);
            cb(null, info[0]);
        } catch(err) {
            cb(err);
        }
    });
}

//TODO - use endpoint._info.administrator instead (same for app.js)
exports.getContactRecord = function(url, endpoint, cb) {
    //TODO - maybe I should key by email address
    var url = url+"?type=person&host-name="+endpoint.HOSTNAME[0]+"&location-sitename="+endpoint.SITENAME[0];
    //logger.debug("getting sls info "+url);
    request.get({
        url: url,
        timeout: 1000*5, //sls should be quick
    }, function(err, msg, json) {
        if(err) return cb(err);
        try {
            //console.log(json);
            var info = JSON.parse(json);
            cb(null, info[0]);
        } catch(err) {
            cb(err);
        }
    });
}

exports.getServiceRecord = function(url, key, cb) {
    var url = url+"?type=service&gocdb-key="+key;
    request.get({
        url: url,
        timeout: 1000*5, //sls should be quick
    }, function(err, msg, json) {
        if(err) return cb(err);
        try {
            //console.log(json);
            var info = JSON.parse(json);
            cb(null, info[0]);
        } catch(err) {
            cb(err);
        }
    });
}

exports.postRecord = function(rec, cb) {
    var url = config.sls.url;
    //logger.debug("posting sls record");
    //console.log(JSON.stringify(rec, null, 4));
    //request.debug = true;
    request.post({
        url: url,
        json: rec,
        //headers: { "accept": "application/json" }
    }, function(err, res, newrec) {
        //request.debug = false;
        //console.dir(body);
        if(err) return cb(err);
        /*
        200: Created
        400: Unspecified error/Bad Request
        401: Unauthorized(future)
        403: Record already exists
        415: request is not application/json
        500: Internal server error
        */
        if(res.statusCode == 200)  {
            cb(null, newrec);
        } else {
            cb(res.statusCode);
        }
    });
}
