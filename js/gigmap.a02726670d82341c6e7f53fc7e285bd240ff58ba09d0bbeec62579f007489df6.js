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

  function getMapLibre() {
    if (window.maplibregl && typeof window.maplibregl.Map === 'function') return window.maplibregl;
    return null;
  }

  function createGigmapMarkerElement() {
    var marker = document.createElement('img');
    marker.src = '/lib/gigmap/marker-crimson.svg';
    marker.alt = '';
    marker.width = 32;
    marker.height = 48;
    marker.className = 'gigmap-marker-icon';
    return marker;
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
    var MapLibre = getMapLibre();
    if (!MapLibre) {
      console.error('MapLibre is not loaded; cannot initialize gigmap.');
      return;
    }

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

    var isDark = document.documentElement.classList.contains('dark');
    var map = new MapLibre.Map({
      container: mapEl,
      style: 'https://tiles.openfreemap.org/styles/' + (isDark ? 'dark' : 'positron'),
      center: [18.07, 59.33],
      zoom: 5,
      attributionControl: false,
      scrollZoom: false
    });
    map.addControl(new MapLibre.NavigationControl({ showCompass: false }), 'top-left');

    map.on('style.load', function () {
      map.getStyle().layers.forEach(function (layer) {
        if (layer.type === 'symbol' && layer.id.indexOf('place_country_') === 0) {
          map.setLayoutProperty(layer.id, 'text-field', [
            'coalesce',
            ['get', 'name_en'],
            ['get', 'name:latin'],
            ['get', 'name']
          ]);
        }
      });
    });
    mapEl.setAttribute('data-gigmap-initialized', 'true');

    if (withCoords.length === 0) {
      return;
    }

    var bounds = new MapLibre.LngLatBounds();
    Object.keys(grouped).forEach(function (key) {
      var gigsAtLocation = grouped[key];
      var firstGig = gigsAtLocation[0];
      var lnglat = [firstGig.lon, firstGig.lat];
      bounds.extend(lnglat);

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

      new MapLibre.Marker({
        element: createGigmapMarkerElement(),
        anchor: 'bottom'
      })
        .setLngLat(lnglat)
        .setPopup(new MapLibre.Popup({ offset: 38, maxWidth: '360px' }).setHTML(popupContent))
        .addTo(map);
    });

    map.fitBounds(bounds, { padding: 30, duration: 0, maxZoom: 12 });
    window.setTimeout(function () { map.resize(); }, 250);
  }

  function initAllGigmaps() {
    if (!getMapLibre()) {
      console.error('MapLibre is not loaded; cannot initialize gigmap.');
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
