var layerTree = function(options) {
    'use strict';
    if (typeof options === 'object' && options.map && options.target) {
        if (!(options.map instanceof ol.Map)) {
            throw new Error('Please provide a valid OpenLayers 3 map object.'); 
        }
        this.map = options.map;
        var containerDiv = document.getElementById(options.target);
        if (containerDiv === null || containerDiv.nodeType !== 1) {
            throw new Error('Please provide a valid element id.');
        }
        var controlDiv = document.createElement('div');
        controlDiv.className = 'layertree-buttons';
        var addWms = document.createElement('button');
        addWms.className = 'addwms';
        addWms.title = 'New WMS Layer';
        controlDiv.appendChild(addWms);
        containerDiv.appendChild(controlDiv);
        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'layercontainer';
        containerDiv.appendChild(this.layerContainer);
        var idCounter = 0;
        this.createRegistry = function(layer) {
            layer.set('id', 'layer_' + idCounter);
            idCounter++;
            var containerDiv = document.createElement('div');
            containerDiv.className = 'layer ol-unselectable';
            containerDiv.textContent = layer.get('name') || 'Unnamed Layer';
            containerDiv.title = containerDiv.textContent;
            containerDiv.id = layer.get('id');
            this.layerContainer.appendChild(containerDiv);
            return this;
        }
        return this;
    } else {
        throw new Error('Invalid parameter(s) provided.');
    }
};

function init() {
    document.removeEventListener('DOMContentLoaded', init); 
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                name: 'OpenStreetMap'
            }),
            new ol.layer.Vector({
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
                name: 'World Capitals'
            })
        ],
        controls: [
            //Define the default controls
            new ol.control.Zoom({
                target: 'toolbar'
            }),
            //Define some new controls
            new ol.control.MousePosition({
                coordinateFormat: function(coordinates) {
                    var coord_x = coordinates[0].toFixed(3);
                    var coord_y = coordinates[1].toFixed(3);
                    return coord_x + ', ' + coord_y;
                },
                target: 'coordinates'
            })
        ],
        view: new ol.View({
            center: [0,0],
            zoom: 2
        })
    });
    tree = new layerTree({map:map, target:'layertree'})
        .createRegistry(map.getLayers().item(0))
        .createRegistry(map.getLayers().item(1));
}
document.addEventListener('DOMContentLoaded', init);