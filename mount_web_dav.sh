#!/bin/bash

if [ -z "${DAV_DIR}" ]; then
    DAV_DIR="${MOUNT_DIR}"
fi
echo "DAV_DIR: '${DAV_DIR}'"

# Mount the WebDAV server
if [ -n "${DAV_URL}" ] && [ -n "${DAV_USER}" ] && [ -n "${DAV_PASSWORD}" ]; then
    echo "Mounting WebDAV server at ${DAV_URL} with user ${DAV_USER} and password of length ${#DAV_PASSWORD}"
    echo "${DAV_URL} ${DAV_USER} ${DAV_PASSWORD}" >> /etc/davfs2/secrets
    mount -t davfs "${DAV_URL}" "${DAV_DIR}"
else
    echo "DAV_URL: '${DAV_URL}'"
    echo "DAV_USER: '${DAV_USER}'"
    echo "DAV_PASSWORD length: '${#DAV_PASSWORD}'"
    echo "WebDAV is disabled"
fi
