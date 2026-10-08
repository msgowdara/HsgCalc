# Smart Godown Inspector: source

`GodownInspection.html` (at the top of the site) is built from the files in this folder. Edit these, not the built page.

| File | What it holds |
| --- | --- |
| `app.jsx` | The app: form, checks, findings, memo and letter wording, backups |
| `style.css` | The A4 documents and print settings |
| `page.html` | The outer page (menu bar, offline registration) |
| `logo.png` | The logo printed on the documents |

To build:

```
npm install        # once; needs Node.js
python3 build.py   # writes ../../GodownInspection.html
```

The built page contains everything it needs (React, styles, logo), so it makes no requests to the internet.
`godown-sw.js` (at the top of the site) keeps a copy of the page on the device so it opens without internet.
Reports are stored only in the browser on the device; the page's Back up / Load backup buttons move them as a file.
