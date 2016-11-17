FROM centos:7
MAINTAINER Soichi Hayashi <hayashis@iu.edu>

#RUN yum -y update
RUN yum -y install epel-release #cronie
RUN yum -y install npm node

RUN mkdir /cache

#ADD docker/crontab /etc/cron.d/gocdb2sls
#RUN chmod 0644 /etc/cron.d/gocdb2sls

#install app src
ADD . /gocdb2sls/
WORKDIR /gocdb2sls/
#RUN npm update

#create the log file to be able to run tail right after it's started
#RUN touch /var/log/cron.log

#this service is based on cron
#CMD crond && tail -f /var/log/cron.log
CMD ./docker/start.sh
