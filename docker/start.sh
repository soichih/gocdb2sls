echo "starting gocdb2sls"
while true
do 
    echo "running cache"
    ./cache.js

    echo "running truncate"
    ./truncate.js

    echo "running load"
    ./load.js

    echo "sleeping for an hour"
    sleep 3600

    #echo "removing old cache"
    #( /cache && find -mtime +7 -print -exec /bin/rm {} \;)
done
