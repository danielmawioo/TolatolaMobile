/**
 * HTML for the transporter Leaflet/OpenStreetMap WebView.
 * Shows the active route plus shop, customer, and driver markers.
 */
export function buildDeliveryLeafletHtml(
  driverLoc: { latitude: number; longitude: number } | null,
  sLat: number, sLng: number, shopName: string,
  cLat: number, cLng: number, custName: string,
  routeCoords: { latitude: number; longitude: number }[],
  isHeadingToCustomer: boolean
): string {
  const routeCoordsJson = JSON.stringify(routeCoords.map(c => [c.latitude, c.longitude]));
  const startLat = driverLoc?.latitude || sLat || -6.7924;
  const startLng = driverLoc?.longitude || sLng || 39.2083;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${startLat}, ${startLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var routeCoords = ${routeCoordsJson};
    if (routeCoords.length > 0) {
      var polyline = L.polyline(routeCoords, {
        color: '${isHeadingToCustomer ? '#7c3aed' : '#0284c7'}',
        weight: 5
      }).addTo(map);
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
    }

    // Driver Marker
    ${driverLoc ? `
      L.marker([${driverLoc.latitude}, ${driverLoc.longitude}], {
        icon: L.divIcon({
          className: 'driver-marker',
          html: '<div style="width: 24px; height: 24px; border-radius: 12px; background: #6366f1; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">D</div>',
          iconSize: [24, 24]
        })
      }).addTo(map).bindPopup("Your Location");
    ` : ''}

    // Shop Marker
    ${sLat !== 0 ? `
      L.marker([${sLat}, ${sLng}], {
        icon: L.divIcon({
          className: 'shop-marker',
          html: '<div style="width: 24px; height: 24px; border-radius: 12px; background: #0284c7; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">S</div>',
          iconSize: [24, 24]
        })
      }).addTo(map).bindPopup(${JSON.stringify(shopName)});
    ` : ''}

    // Customer Marker
    ${cLat !== 0 ? `
      L.marker([${cLat}, ${cLng}], {
        icon: L.divIcon({
          className: 'customer-marker',
          html: '<div style="width: 24px; height: 24px; border-radius: 12px; background: #7c3aed; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">C</div>',
          iconSize: [24, 24]
        })
      }).addTo(map).bindPopup(${JSON.stringify(custName)});
    ` : ''}
  </script>
</body>
</html>`;
}
