FROM ubuntu:latest

ARG INVOKE_AI_PORT=8080
ARG INVOKE_AI_VERSION=5.5.0
ARG INVOKE_AI_DIR=/workdir

RUN mkdir $INVOKE_AI_DIR

COPY install_invoke_ai.sh /
RUN /install_invoke_ai.sh

COPY run_invoke_ai_web.sh /


EXPOSE 8080

CMD ["/run_invoke_ai_web.sh"]

