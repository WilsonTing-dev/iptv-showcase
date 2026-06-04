Movie CMS replacement notes
===========================

The Movies page reads from:
  frontend/assets/data/movies.js

To add more movies later, the CMS/admin can generate the same data format:
  id, title, category, year, duration, rating, tag, desc, poster, backdrop, video

Poster images are stored in:
  frontend/assets/movies/posters/

Hero/backdrop images are stored in:
  frontend/assets/movies/backdrops/

The sample movie player uses:
  frontend/assets/movies/videos/sample-movie.mp4

For a real hotel IPTV system, replace the video field with a local file, CDN file, or stream URL supported by the hotel TV browser.
