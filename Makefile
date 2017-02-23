PAGES:=$(wildcard pages/*.html) $(wildcard pages/**/*.html) $(wildcard pages/*.md) $(wildcard pages/**/*.md)

all: $(subst .md,.html,$(PAGES:pages/%=public/%)) \
     public/demo/bundle_basic.js \
     public/demo/bundle_markdown.js \
     public/demo/bundle_dino.js \
     public/demo/bundle_nodeview.js \
     public/demo/bundle_lint.js \
     public/demo/bundle_track.js \
     public/demo/bundle_collab.js

BUILD:=browserify

public/ref.html: pages/ref.html node_modules/prosemirror-*/src/* templates/* src/build/*.js
	node src/build/build.js --ref $<

CHANGELOG.md:
	curl https://raw.githubusercontent.com/ProseMirror/prosemirror/master/CHANGELOG.md > CHANGELOG.md

public/changelog.html: pages/changelog.html CHANGELOG.md
	node src/build/build.js $<

public/%.html: pages/%.* templates/* src/build/*.js
	node src/build/build.js $<

public/demo/bundle_collab.js: src/demo/collab/client/*.js
	node_modules/.bin/$(BUILD) --outfile $@ -t bubleify src/demo/collab/client/collab.js

public/demo/bundle_%.js: src/demo/%.js
	node_modules/.bin/$(BUILD) --outfile $@ -t bubleify $<

public/css/editor.css: node_modules/prosemirror-view/style/prosemirror.css \
                       node_modules/prosemirror-menu/style/menu.css \
                       node_modules/prosemirror-example-setup/style/style.css
	cat $^ > $@
