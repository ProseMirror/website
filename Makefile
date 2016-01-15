PAGES:=$(wildcard pages/*.html) $(wildcard pages/**/*.html)

all: $(PAGES:pages/%=public/%) \
     public/demo/bundle_basic.js \
     public/demo/bundle_markdown.js \
     public/demo/bundle_dino.js \
     public/demo/bundle_lint.js \
     public/demo/bundle_track.js \
     public/demo/bundle_collab.js

BUILD:=browserify

public/ref.html: node_modules/prosemirror/src/*/*.js pages/ref.html templates/* src/build/*.js
	node src/build/build.js --ref $@

public/%.html: pages/%.html templates/* src/build/*.js
	node src/build/build.js $@

public/demo/bundle_collab.js: src/demo/collab/client/*.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t babelify src/demo/collab/client/collab.js

public/demo/bundle_%.js: src/demo/%.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t babelify $<
