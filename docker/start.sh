#!/bin/bash

echo "starting gocdb2sls"
while true
do 
    echo "removing old cache"
    ( cd /cache && find -mtime +7 -print -exec /bin/rm {} \;)

    echo "running truncate and load"
    node /app/truncate.js
    node /app/load.js

    echo "running cache"
    node /app/cache.js

    echo "sleeping for an hour"
    sleep 3600
done
