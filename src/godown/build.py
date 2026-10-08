#!/usr/bin/env python3
"""Build GodownInspection.html: one self-contained page that needs nothing from the internet.

    npm install        (once, in this folder; needs Node.js)
    python3 build.py   (writes ../../GodownInspection.html)

If GodownInspection.html was edited directly since the last build, the build stops instead of
overwriting those edits: copy them into the files here first, or run "python3 build.py --force".

The page is made from app.jsx (the app), style.css (the A4 documents and printing),
page.html (the outer page), Tailwind CSS generated from the classes in app.jsx,
React from node_modules, and logo.png.
"""
import base64
import hashlib
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
MODULES = HERE / 'node_modules'
BIN = MODULES / '.bin'


def run(*cmd):
    return subprocess.run([str(c) for c in cmd], cwd=HERE, check=True, capture_output=True, text=True).stdout


def inline_js(js):
    js = re.sub(r'^//# sourceMappingURL=.*$', '', js, flags=re.M)   # no requests for source maps
    return js.strip().replace('</script', '<\\/script')


app = run(BIN / 'esbuild', 'app.jsx', '--format=iife', '--target=es2018', '--charset=utf8', '--legal-comments=none',
          '--jsx-factory=React.createElement', '--jsx-fragment=React.Fragment')
tailwind = run(BIN / 'tailwindcss', '-c', 'tailwind.config.js', '-i', 'tailwind.css', '--minify')

parts = {
    'TAILWIND': tailwind.strip().replace('</style', '<\\/style'),
    'STYLE': (HERE / 'style.css').read_text().strip(),
    'REACT_VERSION': json.loads((MODULES / 'react/package.json').read_text())['version'],
    'REACT': inline_js((MODULES / 'react/umd/react.production.min.js').read_text()),
    'REACT_DOM': inline_js((MODULES / 'react-dom/umd/react-dom.production.min.js').read_text()),
    'LOGO': 'data:image/png;base64,' + base64.b64encode((HERE / 'logo.png').read_bytes()).decode(),
    'APP': inline_js(app),
}
page = re.sub(r'\{\{(\w+)\}\}', lambda m: parts[m.group(1)], (HERE / 'page.html').read_text())
out = ROOT / 'GodownInspection.html'
stamp = HERE / '.last-build'   # fingerprint of the page this script last wrote
digest = lambda data: hashlib.sha256(data).hexdigest()
if out.exists() and stamp.exists() and digest(out.read_bytes()) != stamp.read_text().strip() and '--force' not in sys.argv:
    sys.exit(f'{out.name} has been changed directly since it was last built, and building would overwrite those changes.\n'
             'Make the same changes in src/godown (app.jsx, style.css or page.html) and build again,\n'
             'or run "python3 build.py --force" to overwrite them.')
out.write_text(page)
stamp.write_text(digest(out.read_bytes()) + '\n')
print(f'wrote {out.relative_to(ROOT)} ({len(page.encode()) // 1024} KB)')
