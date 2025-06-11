ARG SYNCTHING_PORT=8384
ARG SYNCTHING_DIR=/syncthing
ARG RUN_SYNCTHING=true

ENV SYNCTHING_DIR=${SYNCTHING_DIR}
ENV SYNCTHING_GUI_ADDRESS=0.0.0.0:${SYNCTHING_PORT}
ENV RUN_SYNCTHING=${RUN_SYNCTHING}

# Apt should not ask for user input
ENV DEBIAN_FRONTEND=noninteractive
COPY run_syncthing.sh /run_syncthing.sh

RUN if [ "${SYNCTHING_DIR}" == "" ]; then exit 0; fi \
    && mkdir -p "${SYNCTHING_DIR}" \
    && apt-get update -y \
    && apt-get install gnupg2 curl apt-transport-https -y \
    && curl -s https://syncthing.net/release-key.txt | apt-key add - \
    && echo "deb https://apt.syncthing.net/ syncthing release" | tee /etc/apt/sources.list.d/syncthing.list \
    && apt-get update -y \
    && apt-get install syncthing -y \
    && chmod +x /run_syncthing.sh

EXPOSE ${SYNCTHING_PORT}
VOLUME ["${SYNCTHING_DIR}"]

