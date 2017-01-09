echo "starting gocdb2sls"
while true
do 
    echo "removing old cache"
    ( cd /cache && find -mtime +7 -print -exec /bin/rm {} \;)

    echo "running truncate"
    ./truncate.js

    echo "running load"
    ./load.js

    echo "running cache"
    ./cache.js

    echo "sleeping for an hour"
    sleep 3600
done
