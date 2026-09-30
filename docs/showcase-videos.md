# Banner videos

Konstantin requested one MP4 per model on 29 September 2026, framed for X.
The clips show the complete scroll story, with pauses for the words and
pointer movement during Sol's response scene. They retain the heroes' own
chapter controls and add a small model credit and site address.

| Model | Length | Download filename |
|---|---:|---|
| GPT-6.1 Sol | 33 seconds | `20260929-IAICY-GPT-6.1-Sol-16x9.mp4` |
| Claude Opus 5.5 | 73 seconds | `20260929-IAICY-Claude-Opus-5.5-16x9.mp4` |
| GPT-6 Astra | 49 seconds | `20260929-IAICY-GPT-6-Astra-16x9.mp4` |

Format: 1920 × 1080, 16:9, 30 fps, H.264 High profile, limited-range BT.709,
YUV 4:2:0, MP4 with fast-start metadata. The videos are silent. Encoding is
bounded at 8 Mbps. These settings fit the standard
[X web upload limits](https://help.x.com/en/using-x/x-videos), checked on
29 September 2026: 140 seconds, 512 MB, 40 fps, 25 Mbps, and a maximum
landscape resolution of 1920 × 1200.

Downloads is the delivery location. The retained videos and capture manifest
live in [Drive: IAICY / 20260929-banner-videos](https://drive.google.com/drive/folders/1MNS8WGmOSnmHr3r3kYuDpMRhPHARNzTO).
The verification record is `20260929-IAICY-banner-video-manifest.json` in that
folder. All three videos played in Chromium; all 4,650 frames decoded without
blank intervals. The local and Drive MD5 checksums match for all three files.

## Recreate

The source is [`tools/export-showcase-videos.mjs`](../tools/export-showcase-videos.mjs).
It uses Playwright from this repo and `ffmpeg` / `ffprobe` on PATH. Each frame
comes from the shipped hero's scroll and pointer handlers; the browser clock
and CSS transitions advance together. The site and its hero entries are
unchanged. Navigation outside the hero is hidden in the capture only.

```bash
~/.local/bin/agent-resource-gate -- node tools/export-showcase-videos.mjs \
  --date 20260929 --out-dir ~/Downloads \
  --manifest /tmp/20260929-IAICY-banner-video-manifest.json
```

Existing MP4s are protected from overwrite. Use a different output folder to
recreate a set. `--model gpt-6-1-sol` selects one model; repeat `--model` to
select several. `--base-url` selects a local or preview build. `--stills`
saves chapter images for framing checks instead of encoding a video.
