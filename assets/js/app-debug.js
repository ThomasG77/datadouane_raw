var Promise = require('es6-promise').Promise;
require('whatwg-fetch');
window.ol = require('openlayers');
require('ol3-popup');

var geojsonToFeatures = function geojsonToFeatures(fc, options) {
  var opts = options || {};
  // Declare a formatter to read GeoJSON
  var format = new ol.format.GeoJSON();

  // Read GeoJSON features
  var features = format.readFeatures(fc, opts);
  return features;
};

// Playground using fetch API
// For the demo purpose, we don't want to use OpenLayers 3
// to make call to geojson files here
var fetchJSON = function(url) {
  return fetch(url).then(function(response) {
      return response.json();
    }).then(function(json) {
      return json;
    }).catch(function(ex) {
      console.log('parsing failed', ex);
    });
};

// Declare a source for points and drawing
vectorSourceArcs = new ol.source.Vector({
  format: new ol.format.GeoJSON(),
  wrapX: false
});

vectorLayerArcs = new ol.layer.Vector({
  source: vectorSourceArcs,
  style: [
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'black',
        width: 1
      })
    })
  ]
});

// Instanciate a map and add layers
var map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.MapQuest({
        layer: 'osm'
      })
    }),
    vectorLayerArcs
  ],
  view: new ol.View({
    center: ol.proj.transform(
      [-1.5603, 47.2383],
      'EPSG:4326',
      'EPSG:3857'
    ),
    zoom: 2
  })
});

var maxLineWidth = 8;
var maxElement = 50;

var dataPath = 'assets/data/';
var arcs = 'arcs_ne_10m_admin_0_countries_from_fr_buffered.json';
var vinExportMars2015 = 'national_vin_export_2015-03-01-group.json';
Promise.all([
  fetchJSON(dataPath + arcs, function(json) {
    return json;
  }),
  fetchJSON(dataPath + vinExportMars2015, function(json) {
    return json;
  })
]).then(function(returned) {
  var arcsGeoJSON = returned[0];
  var attributesJSON = returned[1];

  attributesJSON.sort(function(a, b) {
    return b.value - a.value;
  });
  var attributeSliced = attributesJSON.slice(0, maxElement);

  var hash = {};
  for (var i = 0, len = attributeSliced.length; i < len; i++) {
    hash[attributeSliced[i].country] = attributeSliced[i];
  }

  var max = attributeSliced[0].value;
  var ratio = maxLineWidth / max;
  arcsGeoJSON.features.forEach(function(el) {
    if (hash[el.properties.iso_a2]) {
      el.properties.value = hash[el.properties.iso_a2].value;
    } else {
      el.properties.value = undefined;
    }
  });

  vectorLayerArcs.setStyle(function(feature) {
    if (feature.get('value')) {

      var styles = [new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'black',
          width: ratio * feature.get('value')
        })
      })];

      var coordinates = feature.getGeometry().getCoordinates();
      var twoCoordinates = coordinates.slice(
        coordinates.length - 2,
        coordinates.length
      );
      var start = twoCoordinates[0];
      var end = twoCoordinates[1];
      var dx = end[0] - start[0];
      var dy = end[1] - start[1];
      var rotation = Math.atan2(dy, dx);
      // arrows
      var radius = 6;
      if (ratio * feature.get('value') > 6) {
        radius = ratio * feature.get('value');
      }
      styles.push(new ol.style.Style({
        geometry: new ol.geom.Point(end),
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({color: 'black'}),
          points: 3,
          radius: radius,
          stroke: new ol.style.Stroke({
            color: 'black'
          }),
          rotateWithView: false,
          rotation: -rotation + (Math.PI / 2) //- 15
        })
      }));
      return styles;
    } else {
      return null;
    }
  });

  vectorSourceArcs.addFeatures(geojsonToFeatures(arcsGeoJSON, {
    featureProjection: 'EPSG:3857'
  }));

  // vectorSourceArcs.getFeatures().forEach(function(el) {
  //     var start = el[0];
  //     var end = el[1];
  //     var dx = end[0] - start[0];
  //     var dy = end[1] - start[1];
  //     var rotation = Math.atan2(dy, dx);
  //     // arrows
  //     styles.push(new ol.style.Style({
  //       geometry: new ol.geom.Point(end),
  //       image: new ol.style.Icon({
  //         src: 'data/arrow.png',
  //         anchor: [0.75, 0.5],
  //         rotateWithView: false,
  //         rotation: -rotation
  //       })
  //     }));
  // });
});

var popup = new ol.Overlay.Popup();
map.addOverlay(popup);

var displayFeatureInfo = function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feat) {
    return feat;
  });
  if (feature) {
    var properties = feature.getProperties();
    console.log(properties);
    popup.show(evt.coordinate,
      '<div><h2>Coordinates</h2><p>' +
      properties.name + ' (' + properties.iso_a2 + ') ' +
      '<br>' + properties.value.toString() +
      '</p></div>');
  } else {
    popup.hide();
  }
};

map.on('singleclick', function(evt) {
  displayFeatureInfo(evt);
});
