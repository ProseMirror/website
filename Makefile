PAGES:=$(wildcard pages/*.html) $(wildcard pages/**/*.html)

all: public/doc/manual.html \
     $(PAGES:pages/%=public/%) \
     public/demo/bundle_basic.js \
     public/demo/bundle_markdown.js \
     public/demo/bundle_dino.js \
     public/demo/bundle_lint.js \
     public/demo/bundle_track.js \
     public/demo/bundle_collab.js

BUILD:=browserify

public/doc/manual.html: node_modules/prosemirror/src/*/*.js src/templates/* src/doc/build-manual.js
	node src/doc/build-manual.js > $@

%.html: $($@:public/%=pages/%)
	node src/generate.js $@

public/demo/bundle_collab.js: src/demo/collab/client/*.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t babelify src/demo/collab/client/collab.js

public/demo/bundle_%.js: src/demo/%.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t babelify $<
