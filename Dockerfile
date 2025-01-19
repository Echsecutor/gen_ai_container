FROM ubuntu:latest

ARG INVOKE_AI_VERSION=5.5.0
ARG INVOKE_AI_PORT=8080

ARG INVOKE_AI_PACKAGE_SPECIFIER=invokeai
ARG INVOKE_AI_DIR=/workdir

ARG INVOKE_AI_VENV="$INVOKE_AI_DIR/.venv"

RUN apt-get update -y && \
    apt-get install software-properties-common -y && \
    add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update -y && \
    apt-get install python3.11 -y

RUN apt-get install python3-opencv libopencv-dev -y

RUN mkdir $INVOKE_AI_DIR

WORKDIR $INVOKE_AI_DIR

RUN apt-get install curl -y

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    . "$HOME/.local/bin/env" && \
    uv venv --relocatable --prompt invoke --python 3.11 --python-preference only-managed "$INVOKE_AI_VENV"

RUN . "$HOME/.local/bin/env" && \
    . "$INVOKE_AI_VENV" && \
    uv pip install "${INVOKE_AI_PACKAGE_SPECIFIER}"~="${INVOKE_AI_VERSION}" --python 3.11 --python-preference only-managed --force-reinstall && \
    uv pip install pypatchmatch

RUN echo "host: 0.0.0.0" >>"${INVOKE_AI_DIR}"/invokeai.yaml && \
    echo "port: ${INVOKE_AI_PORT}" >>"${INVOKE_AI_DIR}"/invokeai.yaml

COPY run_invoke_ai_web.sh /

EXPOSE $INVOKE_AI_PORT

CMD ["/run_invoke_ai_web.sh"]
