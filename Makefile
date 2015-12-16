all: public/doc/manual.html \
     public/demo_basic_bundle.js \
     public/demo_markdown_bundle.js \
     public/demo_dino_bundle.js \
     public/demo_lint_bundle.js \
     public/demo_track_bundle.js \
     public/demo_collab_bundle.js

BUILD:=browserify

public/doc/manual.html: node_modules/prosemirror/src/*/*.js src/templates/* src/doc/build-manual.js
	node src/doc/build-manual.js > $@

public/demo_collab_bundle.js: src/client/collab/*.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t babelify src/client/collab/client.js

public/demo_%_bundle.js: src/client/demo_%.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t babelify $<
