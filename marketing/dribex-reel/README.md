# Dribex Instagram reel (9:16)

Headless Chrome captures `reel.html` frames; `ffmpeg` encodes MP4.

## Local render (e.g. piocco)

```bash
mkdir -p /tmp/dribex-reel-render /tmp/dribex-reel
cd /tmp/dribex-reel-render && npm init -y && npm install puppeteer-core@24.2.0

REEL_SRC="/path/to/repo/marketing/dribex-reel"   # after git pull
cp -r "$REEL_SRC"/{assets,reel.html,render.mjs} /tmp/dribex-reel/
ln -sf /tmp/dribex-reel-render/node_modules /tmp/dribex-reel/node_modules

CHROME_PATH="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium)" \
  node /tmp/dribex-reel/render.mjs
```

Outputs: `/tmp/dribex-reel/dribex-reel-9x16.mp4` and `recording_demo.mp4`.

Requires `ffmpeg` on PATH. A pre-rendered `dribex-reel-9x16.mp4` is included in this folder; re-run `render.mjs` only if you change `reel.html`.

**Note:** `/opt/cursor/artifacts/` exists only on Cursor Cloud Agent VMs, not on your laptop.
