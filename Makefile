start-server:
	npx tsc
	./node_modules/supervisor/lib/cli-wrapper.js --no-restart-on-err -i public server.js

start-telemetry-server:
	./node_modules/supervisor/lib/cli-wrapper.js --no-restart-on-err -i public telemetry-server.js

start-redis:
	redis-6.2.7/src/redis-server redis.conf

.PHONY: start install start-server start-redis commander

install:
	npm install
	wget https://download.redis.io/releases/redis-6.2.7.tar.gz
	tar xvzf redis-6.2.7.tar.gz
	(cd redis-6.2.7; make)

start-commander:
	redis-commander --redis-port 6399

watch:
	npx tsc -w

send:
	rsync -Pavz . matrix:~/audio-gui/ --exclude log --exclude node_modules
