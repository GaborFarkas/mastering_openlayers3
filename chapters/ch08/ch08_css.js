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
    if (ol.has.TOUCH) {
        document.getElementById('map').classList.add('ol-touch');
    }
}
document.addEventListener('DOMContentLoaded', init);