ENV DAV_URL=
ENV DAV_USER=
ENV DAV_PASSWORD=

RUN apt-get update -y \
    && apt-get install davfs2 -y 


COPY mount_web_dav.sh /run_web_dav_mounting.sh
RUN chmod +x /run_web_dav_mounting.sh
