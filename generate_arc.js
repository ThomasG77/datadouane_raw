var arc = require('arc');
var turf = require('turf');

var geojson_world = require('./centroide_pays.json');


var geojson_tpl = {
  "type": "FeatureCollection",
  "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  "features": []
};

var start = { x: 2.191758992206804, y: 46.195245187448144};

var newFeature = {"type": "Feature", "properties": {}, "geometry": { "type": "Point", "coordinates": [start.x, start.y] }};
var world_with_buffer_hole = turf.buffer(newFeature, 300, 'kilometers');
// Add a polygon to make the buffer works as an hole
world_with_buffer_hole.features[0].geometry.coordinates.unshift([
  [180, 90], [180, -90], [-180, -90], [-180, 90], [180, 90]
]);

geojson_world.features.forEach(function(el) {    
    var centroidPt = turf.centroid(el);
    if (el.properties.iso_a2 !== 'FR') {
        var end = { x: centroidPt.geometry.coordinates[0], y: centroidPt.geometry.coordinates[1] };
        var generator = new arc.GreatCircle(start, end);
        var line = generator.Arc(100, {
          offset: 10
        });
        var line_feature = line.json();
        var splited = turf.intersect(
            line_feature, world_with_buffer_hole.features[0]
        );
        splited.properties.iso_a2 = el.properties.iso_a2;
        splited.properties.name = el.properties.name;

        geojson_tpl.features.push(splited);
    }
});

console.log(JSON.stringify(geojson_tpl));






