#!/usr/bin/node
'use strict';

///////////////////////////////////////////////////////////////////////////////////////////////////
// 
//  This script will remove all records stored in configured sls instance
//  Currently sLS does not provide bulk truncate API (publicaly) so I have to enumerate all records
//  and remove them one at a time..
//

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
var sls = require('./sls');

sls.getRecords('lookup/records', function(err, recs) {
    if(err) throw err;
    var count = 0;
    async.eachLimit(recs, 10, function(rec, next) {
        sls.removeRecord(rec.uri, function(err) {
            if(err) throw err;    
            count++;
            next(null); 
        });
    }, function(err) {
        logger.info("removed "+count+" counts");
    });
});

/*
sls.removeRecord('lookup/records', function(err) {
    if(err) throw err;    
});
*/
