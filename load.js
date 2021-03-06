#!/usr/bin/node
'use strict';

//node
var fs = require('fs');

//contrib
var winston = require('winston');
var async = require('async');
var xml2js = require('xml2js');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var sls = require('./sls');

//start here
var endpoints_cache_dir = config.gocdb2sls.cache_dir+"/endpoints";
fs.readdir(endpoints_cache_dir, function(err, files) {
    if(err) throw err;

    logger.info("* 403 means record already exists");
    
    async.eachSeries(files, function(file, next) {
        
        //TODO - I should check for file timestamp - and ignore really old cache

        logger.info("loading endpoint "+file);
        fs.readFile(endpoints_cache_dir+"/"+file, {encoding: 'utf8'}, function(err, json) {
            var endpoint = JSON.parse(json);
            processEndpoint(endpoint, next);
        });
    }, function(err) {
        if(err) throw err;
        logger.info("all done");
    });
});

function createHostRecord(endpoint) {
    var info = endpoint._info;
    var rec = {
        "type": [ "host" ],
        "group-communities": info.communities || info.keywords || [] , //[ "OSG" ],
        "client-uuid": [ info.ls_client_uuid ], //always set for >3.4, but it's gocdb primary key for simulated ones
        "host-name": [ info.external_address.dns_name || info.external_address.address ], //"perfsonar-bw.grid.iu.edu" ],
    };
    setLocationFields(rec, endpoint);
    if(info.toolkit_rpm_version) rec["pshost-toolkitversion"] =  [ info.toolkit_rpm_version ];
    if(info.distribution) rec["host-os-version"] =  [ info.distribution ];
    if(info.host_memory) rec["host-hardware-memory"] = [ (info.host_memory*1024)+" MB" ]; //"3830 MB" ],
    if(info.cpus) rec["host-hardware-processorcount"] = [ info.cpus ];
    if(info.cpu_speed) rec["host-hardware-processorspeed"] =  [ info.cpu_speed+" MHz" ];
    if(endpoint._contactrec) rec["host-administrators"] =  [ endpoint._contactrec.uri ];
    if(info.simulated) rec["simulated"] =  [ "true" ];

    return rec;
}

//endpoint._info.administrator
/*
 * administrator: {
 * email: "stefan.stancu@cern.ch",
 * name: "Stefan Stancu"
 * },
 * administrator: {
 * email: "mj82@grnoc.iu.edu",
 * name: "Michael",
 * organization: "GlobalNOC"
 * },
 * 
 * */
function createContactRecord(endpoint) {
    var admin = endpoint._info.administrator;
    var rec = {
        "gocdb-key": endpoint.$.PRIMARY_KEY+".admin", //this ensures that we have unique contact records
        "type": [ "person" ],

        //SHORT_NAME isn't really admin's name but... better than null? 
        //GOCDB doesn't store name for contact.. so I have to fake it
        "person-name": [ admin.name || endpoint._site.SHORT_NAME[0] ], 

        "person-emails": [
            admin.email||endpoint._site.CONTACT_EMAIL[0] ,
            //endpoint._site.CONTACT_EMAIL[0], //always exists?
            //endpoint._site.CSIRT_EMAIL[0], //always exists?
            //endpoint._site.ALARM_EMAIL[0], //sometimest this exists also
        ],
    };
    setLocationFields(rec, endpoint);
    return rec;
 }

function setLocationFields(rec, endpoint) {
    var info = endpoint._info;
    rec["location-sitename"] = [ endpoint.SITENAME[0] ]; //this needs to be just SITENAME so that sls.getContactRecord can match it
    //prepare backup info
    var alt_long = null;
    if(endpoint._site.LONGITUDE) alt_long = endpoint._site.LONGITUDE[0];
    var alt_lat = null;
    if(endpoint._site.LATITUDE) alt_lat = endpoint._site.LATITUDE[0];
    var alt_timezone = null;
    if(endpoint._site.TIMEZONE) alt_timezone = endpoint._site.TIMEZONE[0];
    var alt_country = null;
    if(endpoint._site.COUNTRY) alt_country = endpoint._site.COUNTRY[0];

    if(info.location) {
        rec["location-longitude"] = [ info.location.longitude || alt_long ];
        rec["location-latitude"] = [ info.location.latitude || alt_lat ];
        rec["location-city"] = [ info.location.city || alt_timezone ]; //TODO no choice?
        rec["location-state"] = [ info.location.state ];
        rec["location-code"] = [ info.location.zipcode ];
        rec["location-country"] = [ info.location.country || alt_country ];
    } else logger.debug("location info not found for endpoint:"+endpoint.HOSTNAME[0]);
}

function createServiceRecord(endpoint, service) {
    var info = endpoint._info;
    var hostrec = endpoint._hostrec;
    var rec = {};
    
    //always set for >3.4, but it's gocdb primary key for simulated ones
    rec["client-uuid"] = [ info.ls_client_uuid ]; 

    rec["type"] =  [ "service" ];
    rec["service-name"] = [ endpoint.SITENAME[0] + " "+service.name ]; 
    rec["service-type"] = [ service.name ];
    rec["group-communities"] = info.communities || info.keywords || []; //[ "OSG" ],
    rec["service-host"] = [ endpoint._hostrec.uri ];
    
    //in sLS, "esmond" service is registered as "ma" (there is no "esmond" service in sLS)
    if(service.name == "esmond") {
        //rec["service-name"] =  [ endpoint.SITENAME[0] + " ma" ];
        rec["service-type"] = [ "ma" ];
        rec["service-version"] = [ service.version ]; //a esmond specific field..
    }

    //TODO - for now, I am just picking the last entry.. but I don't know what's the best way
    /* addresses: [
    * "tcp://perfsonar-lt.goc:4823",
    * "tcp://perfsonar-lt.grid.iu.edu:4823"
    * ]
    * addresses: [
    * "http://perfsonar-bw.cern.ch:7123/",
    * "tcp://perfsonar-bw.cern.ch:3001"
    * ],
    */
    if(service.addresses && service.addresses.length > 0) {
        rec["service-locator"] = [ service.addresses[service.addresses.length-1] ];
    } else {
        //michael says addresses is going away(?) .. use HOSTNAME/daemon_port if not set
        rec["service-locator"] = "tcp://"+endpoint.HOSTNAME;
        if(service.daemon_port) rec["service-locator"] +=":"+service.daemon_port;
    }

    if(endpoint._contactrec) {
        rec["service-administrators"] =  [ endpoint._contactrec.uri ];
    }

    switch(service.name) {
    case "bwctl":
        var tools = [];
        //TODO is this really needed?
        if(service.testing_ports) service.testing_ports.forEach(function(port) {
            tools.push(port.type);
        });
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/bwctl/1.0" ];
        rec["bwctl-tools"] = tools;
        break;
    case "owamp":
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/owamp/1.0" ];
        break;
    case "traceroute":
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/traceroute/1.0" ];
        break;
    case "ping":
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/ping/1.0" ];
        break;
    case "npad":
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/npad/1.0" ];
        break;
    case "ndt":
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/ndt/1.0" ];
        break;
    case "esmond":
        rec["psservice-eventtypes"] = [ ]; //global instance leaves this empty... just following an example
        break;
    }

    setLocationFields(rec, endpoint);
    return rec;
}

function processEndpoint(endpoint, cb) {
    var tasks = [];

    tasks.push(function(done) {
        var contactrec = createContactRecord(endpoint);        
        logger.debug("registering contactrec");
        sls.postRecord(contactrec, function(err, _rec) {
            if(err) return done(err);
            logger.info("contact: "+_rec["person-emails"]+" registered: "+_rec.uri);
            endpoint._contactrec = _rec;
            done(null);
        });
    });  

    tasks.push(function(done) {
        var hostrec = createHostRecord(endpoint);        
        logger.debug("registering hostrec");
        sls.postRecord(hostrec, function(err, _hostrec) {
            if(err) return done(err);
            logger.info("host uuid:"+_hostrec["client-uuid"]+" registered: "+_hostrec.uri);
            endpoint._hostrec = _hostrec;
            done(null);
        });
    });

    tasks.push(function(done) {
        //register all serivces in 10-way parallel
        async.eachLimit(endpoint._info.services, 10, function(service, next) {
            if(service.is_running == "disabled") return next(null);
            if(service.enabled == "0") return next(null);
            if(service.name == "regular_testing") return next(null); //don't need to register regular_testing service
            var servicerec = createServiceRecord(endpoint, service);
            logger.debug("registering servicerec");
            sls.postRecord(servicerec, function(err, _rec) {
                if(err && err != "403") logger.error(err); //continue
                if(_rec) logger.info("service uuid:"+_rec["client-uuid"]+" registered: "+_rec.uri);
                next(null);
            });
        }, done);
    }); 
    
    //pretend bwctl as a various other service
    //TODO - once traceroute services are registered in GOCDB as first class item, I need to remove this
    tasks.push(function(done) {
        //register all serivces in 10-way parallel
        async.eachLimit(endpoint._info.services, 10, function(service, next) {
            if(service.is_running == "disabled") return next(null);
            if(service.enabled == "0") return next(null);
            if(service.name != "bwctl") return next(null); 

            //fake some stuff
            async.each(["traceroute", "ping"], function(name, next_service) {
                service.name = name;
                service.addresses = [ endpoint._info.external_address.ipv4_address ]; //TODO why ipv4?

                var servicerec = createServiceRecord(endpoint, service);
                logger.debug("registering fake service rec:"+name);
                sls.postRecord(servicerec, function(err, _rec) {
                    if(err && err != "403") logger.error(err); //continue
                    if(_rec) logger.info("service uuid:"+_rec["client-uuid"]+" registered: "+_rec.uri);
                    next_service(null);
                });
            }, next);
        }, done);
    }); 
    
    async.series(tasks, cb);
}

