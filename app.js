#!/usr/bin/node
'use strict';

//contrib
var winston = require('winston');
var request = require('request');
var async = require('async');
var xml2js = require('xml2js');

//mine
var config = require('./config');
var logger = new winston.Logger(config.logger.winston);
var gocdb = require('./gocdb');
var toolkit = require('./toolkit');
var sls = require('./sls');

var parser = new xml2js.Parser();

/*
gocdb.load(function(err) {
    logger.debug("loaded gocdb");
    //console.dir(gocdb.getSiteByName("Taiwan-NCUCC-LCG2"));
    var e = gocdb.getEndpointByHostname("grid13.gsi.de");
    console.dir(e);
});
*/

//entry here
gocdb.loadSites(function(err) {
    if(err) throw err;

    async.eachSeries(config.endpoint_xmls, function(endpoint_xml, next) {
        logger.info("Processing "+endpoint_xml.url);
        processEndpointXML(endpoint_xml, function(err) {
            if(err) logger.error(err); //continue
            next();
        });
    }, function(err) {
        logger.info("All finished"); 
    });
});


function processEndpointXML(endpoint_xml, cb) {
    logger.debug("loading gocdb endpoints xml");
    request.get(endpoint_xml, function(err, msg, xml) {
        if(err) return cb(err);
        //logger.debug("parsing gocdb endpoints xml");
        parser.parseString(xml, function(err, endpoints) {
            if(err) return cb(err);

            var failed = 0;
            async.eachSeries(endpoints.results.SERVICE_ENDPOINT, function(endpoint, next) {
                var key = endpoint.$.PRIMARY_KEY;
                //endpoint._site = getSiteByName(endpoint.SITENAME);
                processEndpoint(endpoint, function(err) {
                    if(err) {
                        //continue to next endpoint
                        console.dir(err);
                        logger.error(err); 
                        failed++;
                    }
                    next(null);
                });
            }, function(err) {
                logger.info("Processed "+endpoints.results.SERVICE_ENDPOINT.length+ " endpoints");
                logger.info("Failed "+failed+" endpoints");
            });
        });
    });
}

/*
function createRecordBase(endpoint, service) {
    var rec = {
        "service-name": endpoint.SITENAME+" "+service.name
    };
    return rec;
}
*/

function createHostRecord(endpoint) {
    var info = endpoint._info;
    var rec = {
        "gocdb-key": endpoint.$.PRIMARY_KEY,
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

    return rec;
}

//TODO - use endpoint._info.administrator!
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
    var rec = {
        "type": [ "person" ],
        "ttl": [], //I've seen it like this on global registry.. I guess it's ok
        "person-name": [ endpoint.SITENAME[0] + " Administrator" ], //TODO GOCDB doesn't store name for contact.. what should I do?
        "person-emails": [
            endpoint._site.CONTACT_EMAIL[0], //always exists?
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
        "gocdb-key": endpoint.$.PRIMARY_KEY+"."+service.name,
        "ttl": [], //I've seen it like this on global registry.. I guess it's ok
        "type": [ "service" ],
        "service-name": [ endpoint.HOSTNAME[0] + " "+service.name ], //I use this as a key for service record.. must not change
        "service-type": [ service.name ],
        "group-communities": info.communities || info.keywords || [] , //[ "OSG" ],
        "service-host": [ hostrec.uri ], 
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
    if(service.addresses) rec["service-locator"] = [ service.addresses[service.addresses.length-1] ];

    if(endpoint._contactrec) rec["service-administrators"] =  [ endpoint._contactrec.uri ];

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
    case "npad":
        rec["psservice-eventtypes"] = [ "http://ggf.org/ns/nmwg/tools/ndt/1.0" ];
        break;
    }

    setLocationFields(rec, endpoint);
    return rec;
}

function processEndpoint(endpoint, cb) {
    endpoint._site = gocdb.getSiteByName(endpoint.SITENAME);

    //gather various info
    async.parallel([
        //load toolkit information from the actual instance
        function(done) {
            toolkit.getInfo(endpoint, function(err, info) {
                if(err) return done(err);
                endpoint._info = info;
                done(null);
            });
        },
        /*
        //load from global SLS host record (to see if it's globally registered) 
        //Right now.. I am doing this for curiosity ... this is not needed
        function(done) {
            sls.getHostRecord(config.sls.global_url, endpoint.HOSTNAME[0], function(err, rec) {
                if(err) logger.error(err); 
                if(rec) {
                    endpoint._sls_hostrec = rec; 
                    logger.warn("This host is already registerd in global SLS: "+config.sls.global_url+"/"+rec.uri);
                }
                done(null);
            });
        },
        */
        //load current host record (if exists)
        function(done) {
            sls.getHostRecord(config.sls.url, endpoint.$.PRIMARY_KEY, function(err, rec) {
                if(err) return done(err);
                if(rec) {
                    endpoint._hostrec = rec; 
                    logger.debug("Loaded previously registered hostrec:"+config.sls.url+"/"+rec.uri);
                }
                done(null);
            });
        },
        //load current contact record (if exists)
        function(done) {
            sls.getContactRecord(config.sls.url, endpoint, function(err, rec) {
                if(err) return done(err);
                if(rec) {
                    endpoint._contactrec = rec; 
                    logger.debug("Loaded previously registered contactrec:"+config.sls.url+"/"+rec.uri);
                }
                done(null);
            });
        },
    ], function(err) {
        if(err) return cb(err);
        //console.dir(endpoint);

        var posts = [];

        if(endpoint._hostrec === undefined) {
            //register new host rec
            posts.push(function(done) {
                var hostrec = createHostRecord(endpoint);        
                sls.postRecord(hostrec, function(err, _hostrec) {
                    if(err) {
                        logger.error("failed to resiter new host: "+hostrec["host-name"]);
                        return done(err); //couldn't register host record.. bail
                    }
                    if(_hostrec) {
                        logger.info("new host registered: "+_hostrec.uri);
                        endpoint._hostrec = _hostrec;
                    }
                    done();
                });
            });
        } else {
            //TODO - update existing host (with uri as key)
        }
        
        if(endpoint._contactrec === undefined) {
            //register new contact
            posts.push(function(done) {
                var rec = createContactRecord(endpoint);        
                sls.postRecord(rec, function(err, _rec) {
                    if(err && err != "403") logger.error(err); //but continue
                    if(_rec) {
                        logger.info("new contact registered: "+_rec.uri);
                        endpoint._contactrec = _rec;
                    }
                    done();
                });
            });        
        } else {
            //TODO - update existing contact (with uri as key)
        }

        async.forEach(endpoint._info.services, function(service, next) {
            if(service.is_running) {
                //if I change this, I also need to change createServiceRecord (and remove all records from sLS)
                var key = endpoint.$.PRIMARY_KEY+"."+service.name; 

                sls.getServiceRecord(config.sls.url, key, function(err, rec) {
                    if(err) { 
                        logger.error(err); 
                        return next(); //it's ok.. just go to next service
                    }
                    if(!rec) {
                        posts.push(function(done) {
                            var rec = createServiceRecord(endpoint, service);
                            sls.postRecord(rec, function(err, _rec) {
                                if(err && err != "403") logger.error(err); //continue
                                if(_rec) logger.info("new service registered: "+_rec.uri);
                                done();
                            });
                        }); 
                    } else {
                        //TODO - update existing service (with uri as key)
                    }

                    next();
                });
            }
        });

        async.series(posts, cb);

    });

    /*
    //now do service specific work
    try {
        switch(endpoint.SERVICE_TYPE[0]) {
        case "net.perfSONAR.Latency":
            processLatencyEndpoint(endpoint, cb); 
            break;
        case "net.perfSONAR.Bandwidth":
            processBandwidthEndpoint(endpoint, cb); 
            break;
        default:
            logger.warn("Unknown service type:"+endpoint.SERVICE_TYPE);
        }
    } catch(e) {
        logger.error(e);
        logger.error("continuing processing other endpoints..");
    }
    */
}

