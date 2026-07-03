#!/usr/bin/env bash
# Re-render the Looka media set (thumbnail + gallery) from the HTML sources.
# Requires: google-chrome (headless), ImageMagick `convert`.
# Fonts (Outfit/Inter) load from Google Fonts, matching the app — needs network.
set -euo pipefail
cd "$(dirname "$0")"
OUT="${1:-..}"          # default: write into misc/media (parent)
G="$OUT/gallery"; mkdir -p "$G"
render() { google-chrome --headless=new --no-sandbox --hide-scrollbars \
  --force-device-scale-factor=2 --window-size="$2,$3" \
  --default-background-color=00000000 --screenshot="$4" "file://$PWD/$1" >/dev/null 2>&1; }

render thumbnail.html 1280 720 _t.png
convert _t.png -resize 1920x1080 -strip -quality 92 "$OUT/looka-thumbnail.png"
render "screen.html?img=meet.png&h=772&tag=Flat%20preview&cap=One%20friendly%20face%20for%20%3Cb%3Eevery%20agent%3C%2Fb%3E" 1600 1000 _01.png
render "screen.html?img=bee-scene.png&h=648&tag=Playground&cap=Meet%20%3Cb%3EBee%3C%2Fb%3E%2C%20your%20workflow%20guide" 1600 1000 _02.png
render "gallery.html?img=hero-terrace.png&pos=50%25%2040%25&tag=Live%20in%20AR&cap=Your%20agent%2C%20%3Cb%3Ein%20the%20real%20world%3C%2Fb%3E" 1600 1000 _03.png
render "gallery.html?img=hero-wave.png&pos=50%25%2038%25&tag=In%20the%20room&cap=See%20it%2C%20place%20it%2C%20%3Cb%3Etalk%20to%20it%3C%2Fb%3E" 1600 1000 _04.png
render slate.html 1600 1000 _05.png
for n in 01:meet-looka 02:meet-the-bee 03:real-world 04:in-the-room 05:open-doors; do
  i="${n%%:*}"; name="${n##*:}"
  convert "_${i}.png" -resize 1600x1000 -strip -quality 90 "$G/${i}-${name}.png"
done
rm -f _t.png _0*.png
echo "Rendered into $OUT"
