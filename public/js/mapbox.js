export const displayMap = locations => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWljaGlhbGxlYiIsImEiOiJjazhla3cyazQwMTBmM25vNzI0b2N4OTI3In0.xd5Nao5qCCC5gXV51fjajg';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/michialleb/ck8ely02r3efs1imyx4luxj9x',
    scrollZoom: false
    //   center: [-118.188627, 34.069996],
    //   zoom: 9,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //Create  marker
    const el = document.createElement('div');
    el.className = 'marker'; // este marker es una clase que tenemos nosotros

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Entend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
