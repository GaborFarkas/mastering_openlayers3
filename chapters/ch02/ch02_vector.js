function init() {
    document.removeEventListener('DOMContentLoaded', init);
    var vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector({
            format: new ol.format.GeoJSON({
                defaultDataProjection: 'EPSG:4326'
            }),
            url: '../../res/world_capitals.geojson',
            attributions: [
                new ol.Attribution({
                    html: 'World Capitals © Natural Earth'
                })
            ]
        }),
        style: new ol.style.Style({
            image: new ol.style.RegularShape({
                stroke: new ol.style.Stroke({
                    width: 2,
                    color: [6, 125, 34, 1]
                }),
                fill: new ol.style.Fill({
                    color: [25, 235, 75, 0.3]
                }),
                points: 5,
                radius1: 5,
                radius2: 8,
                rotation: Math.PI
            })
        })
    });
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vectorLayer
        ],
        controls: [
            //Define the default controls
            new ol.control.Zoom(),
            new ol.control.Rotate(),
            new ol.control.Attribution(),
            //Define some new controls
            new ol.control.ZoomSlider(),
            new ol.control.MousePosition(),
            new ol.control.ScaleLine(),
            new ol.control.OverviewMap()
        ],
        interactions: ol.interaction.defaults().extend([
            new ol.interaction.Select({
                layers: [vectorLayer]
            })
        ]),
        view: new ol.View({
            center: [0, 0],
            zoom: 2
        })
    });
}
document.addEventListener('DOMContentLoaded', init);