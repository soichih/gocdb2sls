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
var sls = require('./sls');

//start here
var endpoints_cache_dir = config.gocdb2sls.cache_dir+"/endpoints";
fs.readdir(endpoints_cache_dir, function(err, files) {
    if(err) throw err;
    
    async.eachSeries(files, function(file, next) {
        logger.info("loading endpoint "+file);
        fs.readFile(endpoints_cache_dir+"/"+file, {encoding: 'utf8'}, function(err, json) {
            var endpoint = JSON.parse(json);
            processEndpoint(endpoint, next);
        });
    }, function(err) {
        if(err) throw err;
        //all done
    });
});

function createHostRecord(endpoint) {
    var info = endpoint._info;
    var rec = {
        //"gocdb-key": endpoint.$.PRIMARY_KEY,
        //"host-net-tcp-autotunemaxbuffer-send": [ "33554432 bytes" ],
        //"host-net-tcp-autotunemaxbuffer-recv": [ "33554432 bytes" ],
        //"host-net-tcp-congestionalgorithm": [ "reno" ],
        //"host-net-tcp-maxbuffer-send": [ "67108864 bytes" ],
        //"host-net-tcp-maxbuffer-recv": [ "67108864 bytes" ],
        //"host-os-kernel": [ "Linux 2.6.32-573.3.1.el6.web100.x86_64" ],
        //rec["host-os-name"] = : [ "CentOS" ],
        
        //"host-administrators": [ "lookup/person/82f61224-5de1-41dd-8882-2f192e9db93d" ],
        //"host-net-interfaces": [ "lookup/interface/e86f44c2-6fa5-4ab3-a0d3-ce1df048ac56" ]

        "type": [ "host" ],

        "group-communities": info.communities || info.keywords || [] , //[ "OSG" ],
        "host-name": [ info.external_address.address ], //"perfsonar-bw.grid.iu.edu" ],
        "pshost-toolkitversion": [ info.toolkit_rpm_version ],
    };
    setLocationFields(rec, endpoint);
    if(info.distribution) rec["host-os-version"] =  [ info.distribution ];
    if(info.host_memory) rec["host-hardware-memory"] = [ (info.host_memory*1024)+" MB" ]; //"3830 MB" ],
    if(info.cpus) rec["host-hardware-processorcount"] = [ info.cpus ];
    if(info.cpu_speed) rec["host-hardware-processorspeed"] =  [ info.cpu_speed+" MHz" ];
    if(endpoint._contactrec) {
        rec["host-administrators"] =  [ endpoint._contactrec.uri ];
    }

    //use info.client_uuid or if not available (for <3.5) use GOCDB primary key
    var key = endpoint.$.PRIMARY_KEY;
    if(info["client-uuid"]) key = info["client-uuid"];
    rec["client-uuid"] = [ key ];

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
        //"person-name": [ endpoint.SITENAME[0] + " Administrator" ], //TODO GOCDB doesn't store name for contact.. so I have to fake it
        "person-name": [ admin.name ], 
        "person-emails": [
            admin.email,
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
    if(info.location) {
        rec["location-longitude"] = [ info.location.longitude ];
        rec["location-latitude"] = [ info.location.latitude ];
        rec["location-city"] = [ info.location.city ];
        rec["location-state"] = [ info.location.state ];
        rec["location-code"] = [ info.location.zipcode ];
        rec["location-country"] = [ info.location.country ];
    } else logger.debug("location info not found for endpoint:"+endpoint.HOSTNAME[0]);
}

function createServiceRecord(endpoint, service) {
    var info = endpoint._info;
    var hostrec = endpoint._hostrec;
    var rec = {
        //"gocdb-key": endpoint.$.PRIMARY_KEY+"."+service.name,
        "type": [ "service" ],
        "service-name": [ endpoint.HOSTNAME[0] + " "+service.name ], //I use this as a key for service record.. must not change
        "service-type": [ service.name ],
        "group-communities": info.communities || info.keywords || [], //[ "OSG" ],
        "service-host": [ endpoint._hostrec.uri ], 
    };

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
    if(service.addresses && service.addresses.length > 0) rec["service-locator"] = [ service.addresses[service.addresses.length-1] ];
    else {
        //michael says addresses isn't really reliable.. using HOSTNAME/daemon_port
        rec["service-locator"] = "tcp://"+endpoint.HOSTNAME;
        if(service.daemon_port) rec["service-locator"] +=":"+service.daemon_port;
    }
    
    if(endpoint._contactrec) {
        rec["service-administrators"] =  [ endpoint._contactrec.uri ];
    }

    switch(service.name) {
    case "bwctl":
        var tools = [];
        service.testing_ports.forEach(function(port) {
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
    }
    
    //use info.client_uuid or if not available (for <3.5) use GOCDB primary key
    var key = endpoint.$.PRIMARY_KEY;
    if(info["ls_client_uuid"]) {
        key = info["ls_client_uuid"];
    } else {
        logger.warn("ls_client_uuid not set in toolkit info for "+endpoint.HOSTNAME+" -- using GOCDB primary key instead:"+endpoint.$.PRIMARY_KEY);
        //TODO - when this site gets upgraded and publish client_uuid, then we will have duplicate host entries...
    }    
    //
    //service client-uuid is just host uuid.. to make it unique across different services within a host, add service-type
    rec["client-uuid"] = [ key ];

    setLocationFields(rec, endpoint);
    return rec;
}

function processEndpoint(endpoint, cb) {
    var tasks = [];

    tasks.push(function(done) {
        var contactrec = createContactRecord(endpoint);        
        logger.debug("registering contactrec");
        sls.postRecord(contactrec, function(err, _rec) {
            if(err) cb(err);
            logger.info("contact: "+_rec["person-emails"]+" registered: "+_rec.uri);
            endpoint._contactrec = _rec;
            done(null);
        });
    });  

    tasks.push(function(done) {
        var hostrec = createHostRecord(endpoint);        
        logger.debug("registering hostrec");
        sls.postRecord(hostrec, function(err, _hostrec) {
            if(err) cb(err);
            logger.info("host uuid:"+_hostrec["client-uuid"]+" registered: "+_hostrec.uri);
            endpoint._hostrec = _hostrec;
            done(null);
        });
    });

    tasks.push(function(done) {
        //register serivce in parallel
        async.eachLimit(endpoint._info.services, 10, function(service, next) {
            if(!service.is_running) return next(null);
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
    
    async.series(tasks, cb);
}

