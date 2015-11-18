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
        tracking: true,
        trackingOptions: {
            enableHighAccuracy: true,
            maximumAge: 2000
        }
    });
    var geoCaching = new ol.layer.Vector({
        source: new ol.source.Vector()
    });
    map.addLayer(geoCaching);
    geoloc.once('change:position', function (evt) {
        var altitude = this.getAltitude() || 150;
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
        map.addControl(new ol.control.FullScreen({
            target: 'toolbar'
        }));
        var geolocData = document.createElement('pre');
        geolocData.className = 'ol-geoloc ol-unselectable ol-control';
        var positionLyr = new ol.layer.Vector({
            source: new ol.source.Vector(),
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    fill: new ol.style.Fill({
                        color: [255, 255, 255, 1]
                    }),
                    stroke: new ol.style.Stroke({
                        color: [0, 0, 0, 1],
                        width: 2
                    }),
                    radius: 6
                }),
                stroke: new ol.style.Stroke({
                    color: [255, 0, 0, 1],
                    width: 2
                })
            })
        });
        map.addLayer(positionLyr);
        geoloc.on('change', function (evt) {
            var dataString = 'Position: ' + this.getPosition() + '\nError: ' + this.getAccuracy() + 'm\nAltitude: ' + this.getAltitude() + 'm\nAltitude error: ' + this.getAltitudeAccuracy() + 'm';
            geolocData.textContent = dataString.replace(/undefined/g, 'N/A');
            var positionSrc = positionLyr.getSource();
            positionSrc.clear(true);
            positionSrc.addFeatures([
                new ol.Feature({
                    geometry: new ol.geom.Point(evt.target.getPosition())
                }),
                new ol.Feature({
                    geometry: new ol.geom.Circle(evt.target.getPosition(), evt.target.getAccuracy())
                })
            ]);
            geoCaching.setStyle(geoCaching.getStyleFunction());
            map.getView().setCenter(this.getPosition());
            if (this.getHeading()) {
                map.getView().setRotation(this.getHeading());
            }
            if (selectInteraction.getFeatures().getLength() === 1) {
                var selectedFeat = selectInteraction.getFeatures().item(0);
                var selectedCoords = selectedFeat.getGeometry().getCoordinates();
                var height = selectedCoords[2] - this.getAltitude();
                selectedCoords.pop();
                positionSrc.addFeature(new ol.Feature({
                    geometry: new ol.geom.LineString([evt.target.getPosition(), selectedCoords])
                }));
                var extDataString = '\nDistance: ' + positionSrc.getFeatures()[2].getGeometry().getLength() + 'm\nHeight: ' + height + 'm\nPossible loot: ' + selectedFeat.get('loot');
                geolocData.textContent += extDataString.replace(/NaN/g, 'N/A');
            }
        });
        var selectInteraction = new ol.interaction.Select({
            layers: [geoCaching]
        });
        map.addInteraction(selectInteraction);
        map.addControl(new ol.control.Control({
            element: geolocData
        }));
        geoCaching.setStyle(function (feature, res) {
            if (geoloc.getAltitude()) {
                var altitude = geoloc.getAltitude();
                var zCoord = feature.getGeometry().getCoordinates()[2];
                var shapePts, shapeColor, shapeAngle;
                if (Math.abs(altitude - zCoord) < 1) {
                    shapePts = 4;
                    shapeColor = [255, 255, 0, 1];
                    shapeAngle = Math.PI / 2;
                } else if (zCoord < altitude) {
                    shapePts = 3;
                    shapeColor = [0, 255, 0, 1];
                    shapeAngle = Math.PI;
                } else {
                    shapePts = 3;
                    shapeColor = [255, 0, 0, 1];
                    shapeAngle = 0;
                }
                return [new ol.style.Style({
                    image: new ol.style.RegularShape({
                        fill: new ol.style.Fill({
                            color: shapeColor
                        }),
                        stroke: new ol.style.Stroke({
                            color: [0, 0, 0, 1],
                            width: 1
                        }),
                        points: shapePts,
                        radius: 10,
                        angle: shapeAngle
                    })
                })];
            } else {
                return [new ol.style.Style({
                    image: new ol.style.RegularShape({
                        fill: new ol.style.Fill({
                            color: [255, 0, 0, 1]
                        }),
                        stroke: new ol.style.Stroke({
                            color: [0, 0, 0, 1],
                            width: 1
                        }),
                        points: 4,
                        radius1: 5,
                        radius2: 10,
                        angle: Math.PI / 2
                    })
                })];
            }
        });
    } else {
        geoloc.once('change', function (evt) {
            this.setTracking(false);
            map.addInteraction(new ol.interaction.Modify({
                features: new ol.Collection(geoCaching.getSource().getFeatures())
            }));
        });
        map.on('click', function (evt) {
            map.getOverlays().clear();
            this.forEachFeatureAtPixel(evt.pixel, function (feature) {
                if (feature && feature.get('loot')) {
                    var overlayElem = document.createElement('div');
                    var lootElem = document.createElement('textarea');
                    lootElem.textContent = feature.get('loot');
                    overlayElem.appendChild(lootElem);
                    overlayElem.appendChild(document.createElement('br'));
                    var saveButton = document.createElement('button');
                    saveButton.textContent = 'Save';
                    overlayElem.appendChild(saveButton);
                    var overlay = new ol.Overlay({
                        position: feature.getGeometry().getCoordinates(),
                        element: overlayElem
                    });
                    saveButton.addEventListener('click', function (evt) {
                        feature.set('loot', lootElem.value);
                        map.removeOverlay(overlay);
                    });
                    map.addOverlay(overlay);
                }
            }, this, function (layer) {
                if (layer === geoCaching) {
                    return true;
                }
                return false;
            });
        });
    }
}
document.addEventListener('DOMContentLoaded', init);