Live TV channel setup

Channels are configured in:
  frontend/assets/data/channels.js

To add more channels later, add a new object to window.IPTV_CHANNELS.
Each channel can use either:
  - a local video file, e.g. assets/live/videos/channel.mp4
  - or a real IPTV/HLS stream URL, e.g. https://example.com/live/channel.m3u8

For real hotel CMS/admin integration, the CMS can generate the same data structure as JSON or JavaScript and replace this file.
The Live TV page reads this file automatically and renders the list, search, video player and programme progress.
