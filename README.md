# Prosemirror.net

This is a fork of https://github.com/ProseMirror/website for serverless test
Changes in `src/collab/client/collab.js`

## Installation

Install [Node.js](http://nodejs.org).

Install the module's dependencies:

```bash
npm install
```

Build the documentation and all the demos' JavaScript source

```bash
make
```

That will populate the `public/` directory with an instance of the
website. You could point a webserver at it to try it out.

Adjust these constants `src/collab/client/collab.js`:
```
const WEBSOCKET_URL = "ws://localhost:3001";
const DOC_PREFIX = "pref_1_";
```

Good to change DOC_PREFIX every time when starting a new testing, so events are not intercepted (old events stay in document_events table until ttl expres). This table has key (documentUrn, version)

Run:

```
npm run devserver -- --port 8888
```

## Manual test

1) In two browsers enable debug console

2) Open collaborative editing example page
http://localhost:8888/examples/collab/#edit-Example

3) In console `join websocket`  should appear

4) Try to edit document - in another browser we should see reflected changes
