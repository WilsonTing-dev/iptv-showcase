YouTube page CMS notes

The YouTube page reads video data from:
  frontend/assets/data/youtube-videos.js

To add or change YouTube videos later, update the objects in window.IPTV_YOUTUBE_VIDEOS:
  - id
  - title
  - category
  - channel
  - views
  - length
  - thumbnail
  - video
  - desc

For real deployment, a CMS/admin panel can generate this data from a database/API. Keep thumbnails and video paths replaceable, similar to the movie and live TV pages.
