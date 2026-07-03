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
card() { render "$1" 1600 1000 _c.png; convert _c.png -resize 1600x1000 -strip -quality 90 "$G/$2"; }

# Thumbnail
render thumbnail.html 1280 720 _t.png
convert _t.png -resize 1920x1080 -strip -quality 92 "$OUT/looka-thumbnail.png"

# Gallery (order = filename order)
card "screen.html?img=meet.png&h=772&tag=Flat%20preview&cap=One%20friendly%20face%20for%20%3Cb%3Eevery%20agent%3C%2Fb%3E"                        01-meet-looka.png
card "screen.html?img=bee-scene.png&h=560&tag=Listens%20%26%20speaks&cap=Meet%20%3Cb%3EBee%3C%2Fb%3E%2C%20your%20workflow%20guide"                02-meet-the-bee.png
card "screen.html?img=emulator-landing.png&h=700&tag=In-headset%20browser&cap=The%20landing%2C%20%3Cb%3Elive%20in%20the%20PICO%20browser%3C%2Fb%3E" 03-emulator-landing.png
card "screen.html?img=emulator-spatial.png&h=648&tag=PICO%20emulator&cap=Your%20workspace%2C%20%3Cb%3Eon%20the%20headset%3C%2Fb%3E"               04-emulator-spatial.png
card "screen.html?img=handheld-ar.png&h=706&tag=Handheld%20AR&cap=Place%20the%20bee%20%3Cb%3Ein%20your%20room%3C%2Fb%3E"                          05-handheld-ar.png
card "gallery.html?img=hero-terrace.png&pos=50%25%2040%25&tag=Live%20in%20AR&cap=Your%20agent%2C%20%3Cb%3Ein%20the%20real%20world%3C%2Fb%3E"      06-real-world.png
card "gallery.html?img=hero-wave.png&pos=50%25%2038%25&tag=In%20the%20room&cap=See%20it%2C%20place%20it%2C%20%3Cb%3Etalk%20to%20it%3C%2Fb%3E"      07-in-the-room.png
card "slate.html"                                                                                                                                 08-open-doors.png

rm -f _t.png _c.png
echo "Rendered thumbnail + 8 gallery cards into $OUT"
