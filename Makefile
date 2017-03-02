PAGES:=$(wildcard pages/*.html) $(wildcard pages/**/*.html) $(wildcard pages/*.md) $(wildcard pages/**/*.md)

EXAMPLES:=basic markdown dino nodeview lint track collab

UGLIFY:=
ifdef UGLIFY
UGLIFY=-g [ uglifyify -m -c ]
endif

all: $(subst .md,.html,$(PAGES:pages/%=public/%)) $(foreach EX,$(EXAMPLES), public/examples/$(EX)/bundle.js)

public/ref.html: pages/ref.html node_modules/prosemirror-*/src/* templates/* src/build/*.js
	node src/build/build.js --ref $<

CHANGELOG.md:
	curl https://raw.githubusercontent.com/ProseMirror/prosemirror/master/CHANGELOG.md > CHANGELOG.md

public/changelog.html: pages/changelog.html CHANGELOG.md
	node src/build/build.js $<

public/%.html: pages/%.* templates/* src/build/*.js
	node src/build/build.js $<

CORE:=prosemirror-model prosemirror-transform prosemirror-state prosemirror-view \
      prosemirror-keymap prosemirror-inputrules prosemirror-history prosemirror-commands \
      prosemirror-schema-basic prosemirror-schema-list \
      prosemirror-dropcursor prosemirror-menu prosemirror-example-setup

public/examples/prosemirror.js: $(foreach LIB,$(CORE),$(wildcard node_modules/$(LIB)/src/*.js))
	mkdir -p $(dir $@)
	node_modules/.bin/browserify -t bubleify $(UGLIFY) $(foreach LIB,$(CORE), -r $(LIB)) --outfile $@

public/examples/collab/bundle.js: src/collab/client/*.js
	mkdir -p $(dir $@)
	node_modules/.bin/browserify --outfile $@ -t bubleify $(foreach LIB,$(CORE), -x $(LIB)) src/collab/client/collab.js

public/examples/%/bundle.js: pages/examples/%/example.js public/examples/prosemirror.js
	mkdir -p $(dir $@)
	node_modules/.bin/browserify --outfile $@ -t bubleify $(foreach LIB,$(CORE), -x $(LIB)) $<

public/css/editor.css: node_modules/prosemirror-view/style/prosemirror.css \
                       node_modules/prosemirror-menu/style/menu.css \
                       node_modules/prosemirror-example-setup/style/style.css
	cat $^ > $@
