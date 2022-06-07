FROM debian:buster


ARG PIECES_TO_BUILD=luau
ARG DEBIAN_FRONTEND=noninteractive

WORKDIR /tmp/
RUN apt update && apt upgrade -y
RUN apt install make wget g++ -y
RUN wget https://github.com/Roblox/luau/archive/master.tar.gz && \
  tar -xzf master.tar.gz && rm master.tar.gz
WORKDIR /tmp/luau-master
RUN make config=release $PIECES_TO_BUILD
RUN find ./build/release/ -perm /u=x,g=x,o=x -exec cp {} /usr/local/bin/ \;
RUN rm -rf /tmp/luau-master/
RUN apt purge wget make g++ -y
RUN apt autoremove --purge -y
RUN mkdir /data/ -p
WORKDIR /data/
USER nobody

ADD --chown=nobody ./sandbox-static /data/sandbox-static

CMD ["./sandbox-static"]