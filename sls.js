'use strict';

const request = require('request');
const winston = require('winston');

//mine
const config = require('./config');
const logger = new winston.Logger(config.logger.winston);

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

exports.postRecord = function(rec, cb) {
    var url = config.sls.url+'/lookup/records';
    request.post({
        url: url,
        json: rec,
    }, function(err, res, newrec) {
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
