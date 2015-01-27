FROM debian:wheezy
MAINTAINER Shay Erlichmen shay@samba.me

env NODE_ENV production
env PORT 8080
ENV PATH $PATH:/nodejs/bin

add package.json /var/www/openurban/package.json

run apt-get -yqq update && \
    DEBIAN_FRONTEND=noninteractive apt-get -yqq install --no-install-recommends python python-setuptools curl gcc make build-essential openssl && \
    easy_install supervisor && \
    echo_supervisord_conf > /etc/supervisord.conf && \
    printf "[include]\nfiles = /var/www/openurban/Supervisorfile.ini\n" >> /etc/supervisord.conf && \
    mkdir /nodejs && curl http://nodejs.org/dist/v0.10.33/node-v0.10.33-linux-x64.tar.gz | tar xvzf - -C /nodejs --strip-components=1 && \
    mkdir -p /var/www/openurban && \
    cd /var/www/openurban && \
    npm install --production --no-color --loglevel info && \
    apt-get -y purge --auto-remove curl gcc make build-essential && \
    apt-get clean autoclean && \
    rm -rf /var/lib/{apt,dpkg,cache,log} && \
    rm -rf /tmp && \
    rm -rf /.npm && \
    rm -rf /.node-gyp && \
    rm -rf /usr/include && \
    rm -rf /usr/share/doc && \
    find /var/www/openurban -type f -iname readme.* -delete && \
    find /var/www/openurban -type f -iname LICENSE* -delete && \
    find /var/www/openurban -type f -iname AUTHORS* -delete && \
    find /var/www/openurban -type f -iname History.* -delete && \
    find /var/www/openurban -type d -iname test -exec rm -rf {} + && \
    mkdir /tmp && \
    node --version

add . /var/www/openurban

# 8080 application port
expose 8080

VOLUME /var/log/openurban

WORKDIR /var/www/openurban

cmd ["/usr/local/bin/supervisord", "-n", "-c", "/etc/supervisord.conf"]