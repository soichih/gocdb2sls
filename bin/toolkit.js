'use strict';

//contrib
var request = require('request');
var winston = require('winston');

var config = require('./config');
var logger = new winston.Logger(config.logger.winston);

function parse_json(json, cb) {
    if(!json) return cb(new Error("empty json"));
    try {
        //v3.3 doesn't provide ?format=json output.. so the parsing will fail when it tries to parse the HTML
        var info = JSON.parse(json);
        cb(null, info);
    } catch(err) {
        cb(err);
    }
}

exports.getInfo = function(endpoint, cb) {
   
    //people put all kinds of stuff under URL.. let's just ignore and use HOSTNAME
    var toolkit_url = 'http://'+endpoint.HOSTNAME[0]+'/toolkit?format=json';
    var toolkit_url_s = 'https://'+endpoint.HOSTNAME[0]+'/toolkit?format=json';

    //load toolkit info
    logger.info("loading toolkit info: "+toolkit_url); 
    var opts = Object.create(config.toolkit);
    opts.url = toolkit_url;
    request.get(opts, function(err, res, json) {
        if(err) {
            logger.info("failed to access it.. trying "+toolkit_url_s);
            opts.url = toolkit_url_s;
            opts.rejectUnhauthorized = false;
            request.get(opts, function(err, res, json) {
                if(err) return cb(err);
                logger.debug("https worked!!! ");
                parse_json(json, cb);
            }); 
        } else {
            parse_json(json, cb);
        }
    });
}


