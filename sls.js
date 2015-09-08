'use strict';

//contrib
var request = require('request');
var xml2js = require('xml2js');
var winston = require('winston');
var async = require('async');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);

//references
//https://github.com/esnet/simple-lookup-service/wiki/ClientExamples
/*
200: Created
400: Unspecified error/Bad Request
401: Unauthorized(future)
403: Record already exists
405: (Method not allowed?)
415: request is not application/json
500: Internal server error
*/

exports.getRecords = function(uri, cb) {
    var url = config.sls.url+"/"+uri;
    logger.debug("getting sls record from:"+url);
    request.get({
        url: url,
        timeout: 1000*5, //sls should be quick
    }, function(err, msg, json) {
        if(err) return cb(err);
        try {
            var info = JSON.parse(json);
            cb(null, info);
        } catch(err) {
            cb(err);
        }
    });
}

/* no longer used
exports.getHostRecord = function(key, cb) {
    exports.getRecord("/lookup/records?type=host&gocdb-key="+key, cb);
}

exports.getContactRecord = function(key, cb) {
    exports.getRecord("/lookup/records/?type=person&gocdb-key="+key, cb);
}

exports.getServiceRecord = function(key, cb) {
    exports.getRecord("/lookup/records/?type=service&gocdb-key="+key, cb);
}
*/

exports.postRecord = function(rec, cb) {
    var url = config.sls.url+'/lookup/records';
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
        if(res.statusCode == 200)  {
            cb(null, newrec);
        } else {
            cb(res.statusCode);
        }
    });
}

exports.renewRecord = function(uri, cb) {
    var url = config.sls.url+'/'+uri;
    //logger.debug("renewing record:"+url);
    request.post({
        url: url
    }, function(err, res, body) {
        if(err)  return cb(err);
        if(res.statusCode == 200)  {
            cb(null);
        } else {
            cb(res.statusCode);
        }
    });
}

exports.removeRecord = function(uri, cb) {
    var url = config.sls.url+"/"+uri;
    //logger.debug("deleting record:"+url);
    request.del({
        url: url
    }, function(err, res, body) {
        if(err) return cb(err);
        if(res.statusCode == 200)  {
            cb(null);
        } else {
            cb(res.statusCode);
        }
    });
}
