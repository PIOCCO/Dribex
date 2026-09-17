#!/usr/bin/env bash
set -eo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
AS="$DIR/assets"
OUT="$DIR/dribex-reel-9x16.mp4"
DEMO="$DIR/recording_demo.mp4"
FONT="/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf"
W=1080 H=1920 FPS=24

seg() {
  local bg="$1" dur="$2" text="$3" y="$4" out="$5"
  ffmpeg -y -loop 1 -i "$bg" -t "$dur" -vf "
    scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},
    zoompan=z='min(zoom+0.001,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${FPS}*${dur}:s=${W}x${H}:fps=${FPS},
    drawtext=fontfile=${FONT}:text='${text}':fontcolor=white:fontsize=50:x=(w-text_w)/2:y=${y}:box=1:boxcolor=0x00000055:boxborderw=14,
    format=yuv420p
  " -c:v libx264 -pix_fmt yuv420p -an "$out"
}

TMP="$DIR/tmp_seg2"
rm -rf "$TMP" && mkdir -p "$TMP"

seg "$AS/onboarding_02_discover.png" 3 "كتقلب على شي حاجة؟ 🔎" 400 "$TMP/01.mp4"
seg "$AS/onboarding_skyline.png" 4 "لقاها فـ Dribex." 130 "$TMP/02.mp4"
seg "$AS/onboarding_03_connect.png" 4 "منتوجات وخدمات من عند الناس اللي قراب ليك 🇲🇦" 150 "$TMP/03.mp4"
seg "$AS/onboarding_02_discover.png" 3 "عجباتك؟ تواصل مباشرة." 130 "$TMP/04.mp4"

ffmpeg -y -f lavfi -i "color=c=0x2563eb:s=${W}x${H}:d=4:r=${FPS}" -loop 1 -i "$AS/margem_logo.png" -filter_complex "
  [1:v]scale=500:-1[lg];
  [0:v][lg]overlay=(W-w)/2:(H-h)/2-180[v];
  [v]drawtext=fontfile=${FONT}:text='Dribex 🇲🇦':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=980,
  drawtext=fontfile=${FONT}:text='قلب. لقا. تواصل.':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=1070,
  drawtext=fontfile=${FONT}:text='جرب Dribex دابا.':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=1320:box=1:boxcolor=0xffffff25:boxborderw=10,
  format=yuv420p
" -t 4 -c:v libx264 -pix_fmt yuv420p -an "$TMP/05.mp4"

printf "file '%s'\nfile '%s'\nfile '%s'\nfile '%s'\nfile '%s'\n" \
  "$TMP/01.mp4" "$TMP/02.mp4" "$TMP/03.mp4" "$TMP/04.mp4" "$TMP/05.mp4" > "$TMP/list.txt"
ffmpeg -y -f concat -safe 0 -i "$TMP/list.txt" -c copy "$OUT"
cp "$OUT" "$DEMO"
ffprobe -v error -show_entries format=duration -of default=nw=1 "$OUT"
ls -lh "$OUT"
