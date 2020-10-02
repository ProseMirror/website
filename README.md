# Prosemirror.net an amazing project

These are the sources for https://prosemirror.net

This currently contains a [front-page](https://prosemirror.net), the
[examples](https://prosemirror.net/examples/) (including server-side code to
support the
[collaborative demo](https://prosemirror.net/example/collab/)), the
[guide](https://prosemirror.net/docs/guide/), and the scripts to build
the [reference docs](https://prosemirror.net/docs/ref/).

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

To work on the demos, or to experiment with the collaborative demo, it
is a good idea to use the dev server:

```
npm run devserver -- --port 8888
```

That will get you a server at [localhost:8888](http://localhost:8888/)
that serves the files in `public/`, along with the collaborative
editing backend, and updates the demo pages to use
[moduleserve](https://github.com/marijnh/moduleserve) so that you can
run the demos directly from the source files, rather than using the
bundled code. You can now edit them and see the changes with a single
refresh. (Though the server-side collaborative code still needs a
server refresh to update.)

Note that this is not secure (it provides file system access of HTTP)
and not fast (the browser will fetch each module individually), and
should only be used for development, on your local machine, bound to
`localhost`.
