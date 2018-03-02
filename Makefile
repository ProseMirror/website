PAGES:=$(shell find pages -name "*.html") $(shell find pages -name "*.md")

EXAMPLES:=basic markdown dino codemirror lint track collab footnote schema upload menu tooltip

GLITCH_EXAMPLES:=basic dino lint track footnote schema upload menu tooltip

ROOT:=$(shell if [ -d node_modules/prosemirror-model ]; then echo node_modules/; else echo ../node_modules/; fi)

UGLIFY:=
ifdef UGLIFY
UGLIFY=-g [ uglifyify -m -c ]
endif

all: $(subst .md,.html,$(PAGES:pages/%=public/%)) \
     $(foreach EX,$(EXAMPLES), public/examples/$(EX)/example.js) \
     public/examples/prosemirror.js \
     public/css/editor.css public/css/codemirror.css

public/docs/ref/index.html: pages/docs/ref/index.html $(ROOT)prosemirror-*/src/* templates/* src/build/*.js
	mkdir -p $(dir $@)
	node src/build/build.js $<

markdown/CHANGELOG.md: $(ROOT)prosemirror-*/CHANGELOG.md src/build/changelog.js
	node src/build/changelog.js > $@

public/docs/changelog/index.html: CHANGELOG.md

public/%.html: pages/%.* templates/* src/build/*.js
	mkdir -p $(dir $@)
	node src/build/build.js $<

public/docs/guide/index.html: pages/docs/guide/index.html templates/* src/build/*.js markdown/guide/*.md
	mkdir -p $(dir $@)
	node src/build/build.js $<

CORE:=prosemirror-model prosemirror-transform prosemirror-state prosemirror-view \
      prosemirror-keymap prosemirror-inputrules prosemirror-history prosemirror-commands \
      prosemirror-schema-basic prosemirror-schema-list \
      prosemirror-dropcursor prosemirror-menu prosemirror-example-setup

public/examples/prosemirror.js: bin/library.js $(foreach LIB,$(CORE),$(wildcard $(ROOT)$(LIB)/dist/*.js))
	mkdir -p $(dir $@)
	node bin/build-library.js > $@

public/examples/%/example.js: example/%/index.js
	mkdir -p $(dir $@)
	node bin/build-example.js $< > $@

public/css/editor.css: $(ROOT)prosemirror-view/style/prosemirror.css \
                       $(ROOT)prosemirror-menu/style/menu.css \
                       $(ROOT)prosemirror-gapcursor/style/gapcursor.css \
                       $(ROOT)prosemirror-example-setup/style/style.css \
                       public/css/editor-base.css
	cat $^ > $@

public/css/codemirror.css:
	cp $(ROOT)codemirror/lib/codemirror.css $@

glitch: $(foreach EX,$(GLITCH_EXAMPLES), example/build/prosemirror-example-$(EX)/index.js)

example/build/prosemirror-example-%/index.js: example/%/index.js example/%/index.html
	node bin/build-glitch $*
	cd example/build/prosemirror-example-$*; \
	  git init; \
	  git add *; \
	  git commit -a -m "Add"; \
	  git push https://$(GLITCH_AUTH)@api.glitch.com/prosemirror-demo-$*/git +HEAD:master

clean:
	rm -rf public/**/*.html public/examples/*/example.js public/examples/prosemirror.js public/css/editor.css CHANGELOG.md example/build/
