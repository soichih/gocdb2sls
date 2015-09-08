
'use strict';

//contrib
var request = require('request');
var winston = require('winston');

var config = require('./config');
var logger = new winston.Logger(config.logger.winston);

exports.getInfo = function(endpoint, cb) {
    /*
    var toolkit_url = null;
    if(endpoint.URL[0] != '')  {
        if(endpoint.URL[0].indexOf("http") == 0) {
            //looks like a valid URL
            toolkit_url = endpoint.URL[0];
        } else {
            logger.warn("incomplete URL:"+endpoint.URL[0]+".. fixing");
            toolkit_url = "http://"+endpoint.URL[0];
        }
    } else {
        logger.warn("URL not set - guessing from HOSTNAME");
        toolkit_url = 'http://'+endpoint.HOSTNAME[0]+'/toolkit';
    }
    */
    //people put all kinds of stuff under URL.. let's just ignore and use HOSTNAME
    var toolkit_url = 'http://'+endpoint.HOSTNAME[0]+'/toolkit';
    toolkit_url += "?format=json";

    //load toolkit info
    logger.info("loading toolkit info: "+toolkit_url); 
    var opts = Object.create(config.toolkit);
    opts.url = toolkit_url;
    request.get(opts, function(err, msg, json) {
        if(err) return cb(err);
        try {
            //v3.3 doesn't provide ?format=json output.. so the parsing will fail when it tries to parse the HTML
            var info = JSON.parse(json);
            cb(null, info);
        } catch(err) {
            cb(err);
        }
    });
}


