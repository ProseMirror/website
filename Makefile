PAGES:=$(shell find pages -name "*.html") $(shell find pages -name "*.md")

EXAMPLES:=basic markdown dino codemirror lint track collab footnote

ROOT:=$(shell if [ -d node_modules/prosemirror-model ]; then echo node_modules/; else echo ../node_modules/; fi)

UGLIFY:=
ifdef UGLIFY
UGLIFY=-g [ uglifyify -m -c ]
endif

all: $(subst .md,.html,$(PAGES:pages/%=public/%)) \
     $(foreach EX,$(EXAMPLES), public/examples/$(EX)/example.js) \
     public/css/editor.css public/css/codemirror.css

public/docs/ref/index.html: pages/docs/ref/index.html $(ROOT)prosemirror-*/src/* templates/* src/build/*.js
	mkdir -p $(dir $@)
	node src/build/build.js $<

CHANGELOG.md:
	curl https://raw.githubusercontent.com/ProseMirror/prosemirror/master/CHANGELOG.md > CHANGELOG.md

public/docs/changelog/index.html: CHANGELOG.md

public/%.html: pages/%.* templates/* src/build/*.js
	mkdir -p $(dir $@)
	node src/build/build.js $<

CORE:=prosemirror-model prosemirror-transform prosemirror-state prosemirror-view \
      prosemirror-keymap prosemirror-inputrules prosemirror-history prosemirror-commands \
      prosemirror-schema-basic prosemirror-schema-list \
      prosemirror-dropcursor prosemirror-menu prosemirror-example-setup

public/examples/prosemirror.js: $(foreach LIB,$(CORE),$(wildcard $(ROOT)$(LIB)/src/*.js))
	mkdir -p $(dir $@)
	$(ROOT).bin/browserify -t bubleify $(UGLIFY) $(foreach LIB,$(CORE), -r $(LIB)) --outfile $@

public/examples/%/example.js: pages/examples/%/example.js public/examples/prosemirror.js
	mkdir -p $(dir $@)
	$(ROOT).bin/browserify --outfile $@ -t bubleify $(foreach LIB,$(CORE), -x $(LIB)) $<

public/css/editor.css: $(ROOT)prosemirror-view/style/prosemirror.css \
                       $(ROOT)prosemirror-menu/style/menu.css \
                       $(ROOT)prosemirror-example-setup/style/style.css
	cat $^ > $@

public/css/codemirror.css:
	cp $(ROOT)codemirror/lib/codemirror.css $@

clean:
	rm public/**/*.html public/examples/*/example.js public/examples/prosemirror.js public/css/editor.css CHANGELOG.md
