ARG RUN_SYNCTHING=true
ARG SYNCTHING_PORT=8384
ARG SYNCTHING_DIR=/syncthing

ENV SYNCTHING_DIR=${SYNCTHING_DIR}
ENV SYNCTHING_GUI_ADDRESS=0.0.0.0:${SYNCTHING_PORT}
ENV RUN_SYNCTHING=${RUN_SYNCTHING}

# Apt should not ask for user input
ENV DEBIAN_FRONTEND=noninteractive

RUN if [ "${RUN_SYNCTHING}" != "true" ]; then exit 0; fi \
    && mkdir -p "${SYNCTHING_DIR}" \
    && apt-get update -y \
    && apt-get install gnupg2 curl apt-transport-https -y \
    && curl -s https://syncthing.net/release-key.txt | apt-key add - \
    && echo "deb https://apt.syncthing.net/ syncthing release" | tee /etc/apt/sources.list.d/syncthing.list \
    && apt-get update -y \
    && apt-get install syncthing -y

EXPOSE ${SYNCTHING_PORT}

