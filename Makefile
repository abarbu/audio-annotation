start:
	./node_modules/supervisor/lib/cli-wrapper.js --no-restart-on-err -i public server.js

.PHONY: start

send:
	rsync -Pavz . matrix:~/audio-gui/ --delete
