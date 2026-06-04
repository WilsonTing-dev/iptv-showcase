// Hilton IPTV site/guest configuration
// Future CMS/admin integration: generate this object from the hotel PMS/CMS/API.
// Keep image paths relative to the frontend folder.
window.HILTON_SITE_CONFIG = {
  hotel: {
    name: "Hilton",
    logo: "assets/logos/hilton-clean.png"
  },
  guest: {
    displayName: "Wilson",
    welcomeName: "Mr Wilson",
    membership: "Member",
    avatar: "assets/home/avatar-wilson.png",
    room: "Room 178",
    roomSubtitle: "Complimentary WI-FI",
    checkoutTime: "12:00PM"
  },
  location: {
    city: "Kuala Lumpur",
    country: "Malaysia",
    latitude: 3.139,
    longitude: 101.6869,
    fallbackTemperature: "33°C"
  },
  home: {
    roomPreview: "assets/home/room-preview.jpg",
    wifiTitle: "Connect Hotel Wi-Fi",
    wifiDescription: "Scan the QR code to connect our<br />high-speed Wi-Fi",
    wifiQr: "assets/home/wifi-qr.png"
  },
  welcome: {
    message: "We hope you enjoy your stay with us",
    heroSlides: [
      { src: "assets/hotel/room-bedroom.jpg", alt: "Luxury hotel bedroom" },
      { src: "assets/hotel/room-wardrobe.jpg", alt: "Hotel room wardrobe area" },
      { src: "assets/hotel/room-bathroom.jpg", alt: "Hotel bathroom with bathtub" }
    ]
  }
};
