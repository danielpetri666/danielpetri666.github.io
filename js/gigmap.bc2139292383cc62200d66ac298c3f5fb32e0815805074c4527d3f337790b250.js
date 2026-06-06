(function () {
  'use strict';

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getLeaflet() {
    if (window.leaflet && typeof window.leaflet.map === 'function') return window.leaflet;
    if (window.L && typeof window.L.map === 'function') return window.L;
    return null;
  }

  function configureLeafletIcons(Leaflet) {
    if (!Leaflet || !Leaflet.Icon || !Leaflet.Icon.Default) return;
    delete Leaflet.Icon.Default.prototype._getIconUrl;
    Leaflet.Icon.Default.mergeOptions({
      iconUrl: '/lib/leaflet/marker-icon.png',
      iconRetinaUrl: '/lib/leaflet/marker-icon-2x.png',
      shadowUrl: '/lib/leaflet/marker-shadow.png'
    });
  }

  function readGigs(mapEl) {
    var dataId = mapEl.getAttribute('data-gigmap-data');
    var dataEl = dataId ? document.getElementById(dataId) : null;
    if (!dataEl) return [];

    try {
      var parsed = JSON.parse(dataEl.textContent || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse gigmap data:', err);
      return [];
    }
  }

  function initMap(mapEl) {
    if (!mapEl || mapEl.getAttribute('data-gigmap-initialized') === 'true') return;
    var Leaflet = getLeaflet();
    if (!Leaflet) {
      console.error('Leaflet is not loaded; cannot initialize gigmap.');
      return;
    }

    configureLeafletIcons(Leaflet);

    var gigs = readGigs(mapEl);
    var withCoords = gigs.filter(function (gig) {
      return gig && typeof gig.lat === 'number' && typeof gig.lon === 'number' && isFinite(gig.lat) && isFinite(gig.lon);
    });

    var grouped = {};
    withCoords.forEach(function (gig) {
      var key = gig.lat + ',' + gig.lon;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(gig);
    });

    var map = Leaflet.map(mapEl, { scrollWheelZoom: false });
    var isDark = document.documentElement.classList.contains('dark');
    var tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var attribution = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; OpenStreetMap contributors';

    Leaflet.tileLayer(tileUrl, { attribution: attribution }).addTo(map);

    if (withCoords.length === 0) {
      map.setView([59.33, 18.07], 5);
      return;
    }

    var bounds = [];
    Object.keys(grouped).forEach(function (key) {
      var gigsAtLocation = grouped[key];
      var firstGig = gigsAtLocation[0];
      var latlng = [firstGig.lat, firstGig.lon];
      bounds.push(latlng);

      var popupContent = '<div style="max-height: 300px; overflow-y: auto;">';
      if (gigsAtLocation.length > 1) {
        popupContent += '<strong>' + esc(firstGig.city) + ', ' + esc(firstGig.country) + '</strong><br/>';
        popupContent += '<em>' + gigsAtLocation.length + ' gigs</em><br/><br/>';
      }

      gigsAtLocation.forEach(function (gig, index) {
        if (index > 0) popupContent += '<hr style="margin: 8px 0; border: 0; border-top: 1px solid #ccc;">';
        if (gigsAtLocation.length === 1) popupContent += '<strong>' + esc(gig.city) + ', ' + esc(gig.country) + '</strong><br/>';
        popupContent += esc(gig.band) + '<br/>';
        if (gig.venue) popupContent += '<span style="opacity:.7">' + esc(gig.venue) + '</span><br/>';
        popupContent += '<span style="opacity:.8">' + esc(gig.date) + '</span>';
      });
      popupContent += '</div>';

      Leaflet.marker(latlng).addTo(map).bindPopup(popupContent);
    });

    map.fitBounds(bounds, { padding: [30, 30] });
    mapEl.setAttribute('data-gigmap-initialized', 'true');
    window.setTimeout(function () { map.invalidateSize(); }, 250);
  }

  function initAllGigmaps() {
    if (!getLeaflet()) {
      console.error('Leaflet is not loaded; cannot initialize gigmap.');
      return;
    }

    var maps = Array.prototype.slice.call(document.querySelectorAll('[data-gigmap]'));
    maps.forEach(initMap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllGigmaps);
  } else {
    initAllGigmaps();
  }

  window.addEventListener('pageshow', initAllGigmaps);
  window.dp666InitGigmaps = initAllGigmaps;
})();
