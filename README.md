# GOCDB to Simple Lookup Service Data Feeder

This service continously feed data from GOCDB to a private sLS (Simple Lookup Service)

# TODOs

# Reference 

Sample XML for GOCDB Site

```
<SITE ID="419" PRIMARY_KEY="80090G0" NAME="100IT">
<PRIMARY_KEY>80090G0</PRIMARY_KEY>
<SHORT_NAME>100IT</SHORT_NAME>
<OFFICIAL_NAME>100 Percent IT Ltd</OFFICIAL_NAME>
<GOCDB_PORTAL_URL>
https://goc.egi.eu/portal/index.php?Page_Type=Site&id=419
</GOCDB_PORTAL_URL>
<HOME_URL>http://www.100percentit.com</HOME_URL>
<CONTACT_EMAIL>egi-info@100percentit.com</CONTACT_EMAIL>
<CONTACT_TEL>+44 1635 881881</CONTACT_TEL>
<ALARM_EMAIL>egi-urgent@100percentit.com</ALARM_EMAIL>
<GIIS_URL>ldap://site-bdii.100percentit.com:2170/o=glue</GIIS_URL>
<COUNTRY_CODE>GB</COUNTRY_CODE>
<COUNTRY>United Kingdom</COUNTRY>
<ROC>NGI_UK</ROC>
<PRODUCTION_INFRASTRUCTURE>Production</PRODUCTION_INFRASTRUCTURE>
<CERTIFICATION_STATUS>Certified</CERTIFICATION_STATUS>
<TIMEZONE>Europe/London</TIMEZONE>
<LATITUDE>51.38</LATITUDE>
<LONGITUDE>-1.28</LONGITUDE>
<CSIRT_EMAIL>egi-security@100percentit.com</CSIRT_EMAIL>
<DOMAIN>
<DOMAIN_NAME>100percentit.com</DOMAIN_NAME>
</DOMAIN>
<SITE_IP>0.0.0.0/255.255.255.255</SITE_IP>
<EXTENSIONS>
<EXTENSION>
<LOCAL_ID>325</LOCAL_ID>
<KEY>cloud_max_storage4VM</KEY>
<VALUE>1000GB</VALUE>
</EXTENSION>
<EXTENSION>
<LOCAL_ID>324</LOCAL_ID>
<KEY>cloud_max_RAM4VM</KEY>
<VALUE>190GB</VALUE>
</EXTENSION>
<EXTENSION>
<LOCAL_ID>38</LOCAL_ID>
<KEY>P4U_Pilot_Cloud_Wall</KEY>
<VALUE>0.07</VALUE>
</EXTENSION>
<EXTENSION>
<LOCAL_ID>114</LOCAL_ID>
<KEY>P4U_Pilot_VAT</KEY>
<VALUE>20</VALUE>
</EXTENSION>
<EXTENSION>
<LOCAL_ID>323</LOCAL_ID>
<KEY>cloud_max_cores4VM</KEY>
<VALUE>16</VALUE>
</EXTENSION>
</EXTENSIONS>
</SITE>
```

Sample endpoint XML

```
<SERVICE_ENDPOINT PRIMARY_KEY="6684G0">
<PRIMARY_KEY>6684G0</PRIMARY_KEY>
<HOSTNAME>perfsonar-alice.sut.ac.th</HOSTNAME>
<GOCDB_PORTAL_URL>
https://goc.egi.eu/portal/index.php?Page_Type=Service&id=6684
</GOCDB_PORTAL_URL>
<BETA>N</BETA>
<SERVICE_TYPE>net.perfSONAR.Bandwidth</SERVICE_TYPE>
<CORE/>
<IN_PRODUCTION>Y</IN_PRODUCTION>
<NODE_MONITORED>Y</NODE_MONITORED>
<SITENAME>T2-TH-SUT</SITENAME>
<COUNTRY_NAME>Thailand</COUNTRY_NAME>
<COUNTRY_CODE>TH</COUNTRY_CODE>
<ROC_NAME>AsiaPacific</ROC_NAME>
<URL/>
<ENDPOINTS/>
<EXTENSIONS/>
</SERVICE_ENDPOINT>
```

toolkit?json (old)

```
{
    "ntp": {
        "synchronized": "1"
    },
    "location": {
        "country": "ES",
        "longitude": "-0.425",
        "city": "Paterna",
        "latitude": "39.5151",
        "zipcode": "46980",
        "state": "Valencia"
    },
    "meshes": [
        "https://myosg.grid.iu.edu/pfmesh/mine/hostname/psific02.ific.uv.es"
    ],
    "services": [
        {
            "is_running": "disabled",
            "addresses": null,
            "version": "3.0.11-1.el6",
            "name": "iperf3"
        },
        {
            "is_running": "yes",
            "addresses": [
                "tcp://[2001:720:1014:41:21e:c9ff:feb0:6ab]:4823",
                "tcp://psific02.ific.uv.es:4823"
            ],
            "version": "1.5.4-1.el6",
            "name": "bwctl",
            "testing_ports": [
                {
                    "min_port": "6001",
                    "type": "peer",
                    "max_port": "6200"
                },
                {
                    "min_port": "5001",
                    "type": "iperf",
                    "max_port": "5300"
                },
                {
                    "min_port": "5301",
                    "type": "nuttcp",
                    "max_port": "5600"
                },
                {
                    "min_port": "5601",
                    "type": "owamp",
                    "max_port": "5900"
                },
                {
                    "min_port": 5001,
                    "type": "test",
                    "max_port": 5900
                }
            ]
        },
        {
            "is_running": "yes",
            "addresses": null,
            "version": "3.4.2-5.pSPS",
            "name": "regular_testing"
        },
        {
            "is_running": "disabled",
            "addresses": [
                "tcp://[2001:720:1014:41:21e:c9ff:feb0:6ab]:861",
                "tcp://psific02.ific.uv.es:861"
            ],
            "version": "3.4-10.el6",
            "name": "owamp",
            "testing_ports": [
                {
                    "min_port": "8760",
                    "type": "test",
                    "max_port": "9960"
                }
            ]
        },
        {
            "is_running": "yes",
            "addresses": [
                "http://[2001:720:1014:41:21e:c9ff:feb0:6ab]:7123/",
                "tcp://[2001:720:1014:41:21e:c9ff:feb0:6ab]:3001",
                "http://psific02.ific.uv.es:7123/",
                "tcp://psific02.ific.uv.es:3001"
            ],
            "version": "3.7.0.2-1.el6",
            "name": "ndt"
        },
        {
            "is_running": "yes",
            "addresses": [
                "http://2001:720:1014:41:21e:c9ff:feb0:6ab/esmond/perfsonar/archive/",
                "http://psific02.ific.uv.es/esmond/perfsonar/archive/"
            ],
            "version": "1.0-16.el6",
            "name": "esmond"
        },
        {
            "is_running": "yes",
            "addresses": [
                "http://[2001:720:1014:41:21e:c9ff:feb0:6ab]:8000/",
                "tcp://[2001:720:1014:41:21e:c9ff:feb0:6ab]:8001",
                "http://psific02.ific.uv.es:8000/",
                "tcp://psific02.ific.uv.es:8001"
            ],
            "version": "1.5.6-3.el6",
            "name": "npad"
        }
    ],
    "toolkit_version": "3.4.2",
    "keywords": [],
    "toolkit_rpm_version": "3.4.2-14.pSPS",
    "administrator": {
        "email": "lcg.support@ific.uv.es",
        "name": "Victor Lacort"
    },
    "external_address": {
        "ipv4_address": "psific02.ific.uv.es",
        "address": "psific02.ific.uv.es",
        "ipv6_address": "2001:720:1014:41:21e:c9ff:feb0:6ab",
        "mtu": 1500
    },
    "globally_registered": 1,
    "host_memory": 16
}
```

toolkit info (new) - from http://perfsonar-dev.grnoc.iu.edu/toolkit/?format=json
```
{
meshes: [ ],
toolkit_version: null,
administrator: {
email: "mj82@grnoc.iu.edu",
name: "Michael",
organization: "GlobalNOC"
},
interfaces: [
{
speed: 0,
iface: "eth0",
ipv4_address: [
"140.182.44.162"
],
mac: "54:52:00:0B:AC:13",
ipv6_address: [
"2001:18e8:3:10:8000::1"
],
mtu: 1500
},
{
speed: 100000000,
iface: "eth1",
ipv4_address: [
"140.182.44.125"
],
mac: "54:52:00:2D:7A:0A",
ipv6_address: [ ],
mtu: 1500
}
],
external_address: {
iface: "eth0",
ipv4_address: "140.182.44.162",
address: "140.182.44.162",
ipv6_address: "2001:18e8:3:10:8000::1",
mtu: 1500,
dns_name: "perfsonar-dev.grnoc.iu.edu"
},
globally_registered: 0,
cpu_speed: "2666.834",
ntp: {
reach: "377",
polling_interval: "512",
synchronized: "1",
delay: "0.00127",
stratum: "1",
address: "140.182.44.162",
dispersion: "0.09772",
offset: "0.000108",
host: "ntp.grnoc.iu.ed"
},
location: {
country: "US",
longitude: "-86.456",
city: "Bloomington",
latitude: "39.25",
zipcode: "47401",
state: "MI"
},
services: [
{
is_running: "yes",
addresses: [ ],
version: "1.5.4-1.el6",
name: "bwctl",
daemon_port: "4823",
testing_ports: [
{
min_port: "6001",
type: "peer",
max_port: "6200"
},
{
min_port: "5001",
type: "iperf",
max_port: "5300"
},
{
min_port: "5301",
type: "nuttcp",
max_port: "5600"
},
{
min_port: "5601",
type: "owamp",
max_port: "5900"
},
{
min_port: 5001,
type: "test",
max_port: 5900
}
],
enabled: "1"
},
{
is_running: "yes",
addresses: [ ],
version: "3.4.2-5.pSPS",
name: "regular_testing",
enabled: "1"
},
{
is_running: "yes",
addresses: [ ],
version: "3.4-10.el6",
name: "owamp",
daemon_port: "861",
testing_ports: [
{
min_port: "8760",
type: "test",
max_port: "9960"
}
],
enabled: "1"
},
{
is_running: "yes",
addresses: [
"http://perfsonar-dev.grnoc.iu.edu:7123/",
"http://perfsonar-dev-owamp.grnoc.iu.edu:7123/",
"http://perfsonar-dev-ipv6.grnoc.iu.edu:7123/"
],
version: "3.7.0.2-1.el6",
is_installed: 1,
name: "ndt",
daemon_port: "3001",
enabled: "1"
},
{
is_running: "disabled",
addresses: [
"http://perfsonar-dev.grnoc.iu.edu:8000/",
"http://perfsonar-dev-owamp.grnoc.iu.edu:8000/",
"http://perfsonar-dev-ipv6.grnoc.iu.edu:8000/"
],
version: "1.5.6-3.el6",
is_installed: 1,
name: "npad",
daemon_port: "8001",
enabled: 0
},
{
is_running: "yes",
addresses: [
"http://perfsonar-dev.grnoc.iu.edu/esmond/perfsonar/archive/",
"http://perfsonar-dev-owamp.grnoc.iu.edu/esmond/perfsonar/archive/",
"http://perfsonar-dev-ipv6.grnoc.iu.edu/esmond/perfsonar/archive/"
],
version: "1.0-16.el6",
name: "esmond",
enabled: "1"
}
],
distribution: "CentOS 6.7 (Final)",
toolkit_rpm_version: "3.4.2-14.pSPS",
communities: [
"perfsonar",
"perfSONAR-PS",
"Indiana"
],
toolkit_name: "perfSONAR-Toolkit",
cpu_cores: "2",
cpus: "2",
host_memory: 2
}
```

Sample (target) sLS record (bwctl)

```
{
service-name: [
"UCSD CMS T2 Center BWCTL Server"
],
service-type: [
"bwctl"
],
location-sitename: [
"UCSD CMS T2 Center"
],
state: "renewed",
bwctl-tools: [
"iperf",
"nuttcp",
"iperf3",
"ping",
"traceroute",
"tracepath",
"owamp"
],
ttl: [ ],
type: [
"service"
],
psservice-eventtypes: [
"http://ggf.org/ns/nmwg/tools/bwctl/1.0"
],
uri: "lookup/service/80cbb71d-6072-402f-9d88-89ca32d7931d",
location-longitude: [
"-117.236"
],
location-latitude: [
"32.881"
],
service-host: [
"lookup/host/22b98977-f965-4416-b34c-5a607603984c"
],
expires: "2015-09-01T19:33:10.301Z",
location-country: [
"US"
],
service-locator: [
"tcp://perfsonar-1.t2.ucsd.edu:4823"
],
location-state: [
"CA"
],
location-code: [
"92093"
],
service-administrators: [
"lookup/person/91c322b0-a4e0-4e98-85c2-74fc0b3249b7"
],
location-city: [
"La Jolla"
]
},
```

Sample sLS (traceroute)

```
  {
    "service-name": [
      "BCNET-SRRYTX Traceroute Responder"
    ],
    "service-type": [
      "traceroute"
    ],
    "location-sitename": [
      "BCNET-SRRYTX"
    ],
    "state": "renewed",
    "ttl": [],
    "psservice-eventtypes": [
      "http://ggf.org/ns/nmwg/tools/traceroute/1.0"
    ],
    "type": [
      "service"
    ],
    "uri": "lookup/service/545c2b30-9cd9-47e8-9aab-653de1841d8a",
    "location-longitude": [
      "-122.847794"
    ],
    "location-latitude": [
      "49.187959"
    ],
    "service-host": [
      "lookup/host/f90a2ec5-5c4c-4883-af61-c6492518e8c8"
    ],
    "group-communities": [
      "ComputeCanada",
      "CANARIE",
      "HEPnet-Canada"
    ],
    "expires": "2015-09-01T19:27:25.002Z",
    "location-country": [
      "CA"
    ],
    "service-locator": [
      "pfs1-lat.srry1.BC.net"
    ],
    "location-state": [
      "BC"
    ],
    "service-administrators": [
      "lookup/person/29ccdaf4-d4e0-4384-876a-8d2f68f08937"
    ],
    "location-city": [
      "Surrey"
    ]
  },

```

Sample owamp record

```
  {
    "service-name": [
      "BCNET-SRRYTX OWAMP Server"
    ],
    "service-type": [
      "owamp"
    ],
    "location-sitename": [
      "BCNET-SRRYTX"
    ],
    "state": "renewed",
    "ttl": [],
    "psservice-eventtypes": [
      "http://ggf.org/ns/nmwg/tools/owamp/1.0"
    ],
    "type": [
      "service"
    ],
    "uri": "lookup/service/a85f08be-815f-4122-ade7-ad94003120fb",
    "location-longitude": [
      "-122.847794"
    ],
    "location-latitude": [
      "49.187959"
    ],
    "service-host": [
      "lookup/host/f90a2ec5-5c4c-4883-af61-c6492518e8c8"
    ],
    "group-communities": [
      "ComputeCanada",
      "CANARIE",
      "HEPnet-Canada"
    ],
    "expires": "2015-09-01T19:27:25.156Z",
    "location-country": [
      "CA"
    ],
    "service-locator": [
      "tcp://pfs1-lat.srry1.BC.net:861"
    ],
    "location-state": [
      "BC"
    ],
    "service-administrators": [
      "lookup/person/29ccdaf4-d4e0-4384-876a-8d2f68f08937"
    ],
    "location-city": [
      "Surrey"
    ]
  },

```
