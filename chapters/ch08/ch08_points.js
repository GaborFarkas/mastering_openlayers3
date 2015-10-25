function init() {
    document.removeEventListener('DOMContentLoaded', init);
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        controls: [
            new ol.control.Zoom({
                target: 'toolbar'
            })
        ],
        view: new ol.View({
            center: [0, 0],
            zoom: 2
        })
    });
    var geoloc = new ol.Geolocation({
        projection: map.getView().getProjection(),
        tracking: true
    });
    var geoCaching = new ol.layer.Vector({
        source: new ol.source.Vector()
    });
    map.addLayer(geoCaching);
    geoloc.once('change:position', function (evt) {
        var altitude = this.getAltitude() || 100;
        var myPos = this.getPosition();
        map.getView().setCenter(myPos);
        map.getView().setZoom(17);
        for (var i = 0; i < 50; i += 1) {
            geoCaching.getSource().addFeature(new ol.Feature({
                geometry: new ol.geom.Point([myPos[0] - 500 + Math.random() * 1000, myPos[1] - 500 + Math.random() * 1000, altitude - 150 + Math.random() * 300]),
                loot: 'Treasures of the Seven Seas'
            }));
        }
    });
    if (ol.has.TOUCH) {
        document.getElementById('map').classList.add('ol-touch');
    }
}
document.addEventListener('DOMContentLoaded', init);