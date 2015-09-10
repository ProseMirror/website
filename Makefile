all: public/doc/manual.html

public/doc/manual.html: node_modules/prosemirror/doc/manual.md template/manual.template
	pandoc node_modules/prosemirror/doc/manual.md -f markdown-auto_identifiers -s --template=template/manual.template > $@
