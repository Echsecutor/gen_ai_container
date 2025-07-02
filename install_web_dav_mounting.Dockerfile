ENV DAV_URL=
ENV DAV_USER=
ENV DAV_PASSWORD=

RUN apt-get update -y \
    && apt-get install davfs2 -y 


COPY mount_web_dav.sh /mount_web_dav.sh
RUN chmod +x /mount_web_dav.sh
