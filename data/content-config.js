// Hilton IPTV content behaviour/configuration
// Future CMS/admin integration: edit these values when changing page behaviour,
// while page content stays inside the neighbouring data files.
window.IPTV_CONTENT_CONFIG = {
  liveTv: {
    defaultChannelId: "bbc-news",
    pageSize: 5
  },
  movies: {
    visiblePosters: 7
  },
  roomService: {
    pageSize: 6
  },
  hotelFeatures: {
    featurePageSize: 4
  },
  favourites: {
    filters: [
      { id: "all", label: "All Favourites" },
      { id: "channels", label: "Channels" },
      { id: "movies", label: "Movies" }
    ]
  },
  radio: {
    categories: ["All Stations", "Local", "News", "Jazz", "Pop", "Relax"],
    stationsPerPage: 4,
    columns: 2
  },
  weather: {
    panels: ["current", "hourly", "weekly", "details"],
    panelTitles: {
      current: "Current Weather",
      hourly: "Hourly Forecast",
      weekly: "7-Day Forecast",
      details: "Weather Details"
    }
  }
};
