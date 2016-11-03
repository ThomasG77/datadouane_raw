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

var lineStyle = function lineStyle(width, color) {
  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: color,
      width: width
    })
  });
};

var createArrowStyle = function createArrowStyle(coordPt, radius, rotation, fillColor, strokeColor) {
  return new ol.style.Style({
    geometry: new ol.geom.Point(coordPt),
    image: new ol.style.RegularShape({
      fill: new ol.style.Fill({color: fillColor}),
      points: 3,
      radius: radius,
      stroke: new ol.style.Stroke({
        color: strokeColor
      }),
      rotateWithView: false,
      rotation: -rotation + (Math.PI / 2)
    })
  });
};

var extractRotation = function extractRotation(twoCoordinates) {
  var start = twoCoordinates[0];
  var end = twoCoordinates[1];
  var dx = end[0] - start[0];
  var dy = end[1] - start[1];
  return Math.atan2(dy, dx);
};

// Declare a source for points and drawing
vectorSourceArcs = new ol.source.Vector({
  format: new ol.format.GeoJSON(),
  wrapX: false,
  attributions: [
      new ol.Attribution({
        html: 'Données source flux &copy; ' +
            '<a href="http://www.douane.gouv.fr/services/datadouane" target="_blank">DataDouane</a>'
      })
  ]
});

vectorLayerArcs = new ol.layer.Vector({
  source: vectorSourceArcs
});

// Instanciate a map and add layers
var map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM({
        url: 'http://{a-c}.tile.openstreetmap.se/hydda/full/{z}/{x}/{y}.png',
        crossOrigin: null
      })
    }),
    vectorLayerArcs
  ],
  view: new ol.View({
    center: ol.proj.transform(
      [0, 0],
      'EPSG:4326',
      'EPSG:3857'
    ),
    zoom: 2
  })
});

var maxLineWidth = 8;
var maxElement = 50;
var ratio;

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
    var allAttributes = attributeSliced[i];
    allAttributes['rank'] = (i + 1).toString();
    hash[attributeSliced[i].country] = allAttributes;
  }

  var max = attributeSliced[0].value;
  ratio = maxLineWidth / max;
  arcsGeoJSON.features.forEach(function(el) {
    if (hash[el.properties.iso_a2]) {
      el.properties.value = hash[el.properties.iso_a2].value;
      el.properties.rank = hash[el.properties.iso_a2].rank;

    } else {
      el.properties.value = undefined;
      el.properties.rank = undefined;
    }
  });

  vectorLayerArcs.setStyle(function(feature) {
    if (feature.get('value')) {

      var styles = [lineStyle(ratio * feature.get('value'), 'black')];

      var coordinates = feature.getGeometry().getCoordinates();
      var twoCoordinates = coordinates.slice(
        coordinates.length - 2,
        coordinates.length
      );
      var rotation = extractRotation(twoCoordinates);
      // arrows
      var radius = 6;
      if (ratio * feature.get('value') > 6) {
        radius = ratio * feature.get('value');
      }
      styles.push(
        createArrowStyle(twoCoordinates[1], radius, rotation, 'black', 'black')
      );
      return styles;
    } else {
      return null;
    }
  });

  vectorSourceArcs.addFeatures(geojsonToFeatures(arcsGeoJSON, {
    featureProjection: 'EPSG:3857'
  }));
});

var popup = new ol.Overlay.Popup();
map.addOverlay(popup);

var featureOverlay = new ol.FeatureOverlay({
  map: map,
  style: function(feature) {
    if (feature.get('value')) {
      var width = (ratio * feature.get('value')) - 2;
      if (width < 1) {
        width = 1;
      }
      var styles = [lineStyle(width, 'red')];

      var coordinates = feature.getGeometry().getCoordinates();
      var twoCoordinates = coordinates.slice(
        coordinates.length - 2,
        coordinates.length
      );
      var rotation = extractRotation(twoCoordinates);
      // arrows
      var radius = 6 - 1;
      if (ratio * feature.get('value') > 6) {
        radius = (ratio * feature.get('value')) - 1;
      }
      styles.push(
        createArrowStyle(twoCoordinates[1], radius, rotation, 'red', 'red')
      );
      return styles;
    } else {
      return null;
    }
  }
});

var highlight;
var displayFeatureInfo = function(evt) {
  var feature = map.forEachFeatureAtPixel(evt.pixel, function(feat) {
    return feat;
  });
  if (feature) {
    var properties = feature.getProperties();
    popup.show(evt.coordinate,
      '<div><h3>Export de vin Mars 2015</h3><p>' +
      '<b>Classement mondial: </b>' + properties.rank + '<br>' +
       '<b>Pays: </b>' + properties.name + ' (' + properties.iso_a2 + ') ' +
      '<br><b>Valeur</b> (<i>en kiloEuros</i>): ' +
      (Math.round(properties.value / 1000 * 1000) / 1000).toString() +
      '</p></div>');
  } else {
    popup.hide();
  }
  if (feature !== highlight) {
    if (highlight) {
      featureOverlay.removeFeature(highlight);
    }
    if (feature) {
      featureOverlay.addFeature(feature);
    }
    highlight = feature;
  }
};

map.on('singleclick', function(evt) {
  displayFeatureInfo(evt);
});
