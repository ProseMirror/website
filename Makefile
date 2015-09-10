all: public/doc/manual.html \
     public/demo_basic_bundle.js \
     public/demo_markdown_bundle.js \
     public/demo_dino_bundle.js \
     public/demo_lint_bundle.js \
     public/demo_track_bundle.js \
     public/demo_track_collab.js

public/doc/manual.html: node_modules/prosemirror/doc/manual.md template/manual.template
	pandoc node_modules/prosemirror/doc/manual.md -f markdown-auto_identifiers -s --template=template/manual.template > $@

public/demo_collab_bundle.js: src/client/collab/*.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/browserify --outfile $@ -t babelify src/client/collab/client.js

public/demo_%_bundle.js: src/client/demo_%.js node_modules/prosemirror/dist/**/*.js
	node_modules/.bin/browserify --outfile $@ -t babelify $<
