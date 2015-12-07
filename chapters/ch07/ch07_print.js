var layerTree = function (options) {
    'use strict';
    if (!(this instanceof layerTree)) {
        throw new Error('layerTree must be constructed with the new keyword.');
    } else if (typeof options === 'object' && options.map && options.target) {
        if (!(options.map instanceof ol.Map)) {
            throw new Error('Please provide a valid OpenLayers 3 map object.');
        }
        this.map = options.map;
        var containerDiv = document.getElementById(options.target);
        if (containerDiv === null || containerDiv.nodeType !== 1) {
            throw new Error('Please provide a valid element id.');
        }
        this.messages = document.getElementById(options.messages) || document.createElement('span');
        var controlDiv = document.createElement('div');
        controlDiv.className = 'layertree-buttons';
        controlDiv.appendChild(this.createButton('addwms', 'Add WMS Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('addwfs', 'Add WFS Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('addvector', 'Add Vector Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('deletelayer', 'Remove Layer', 'deletelayer'));
        containerDiv.appendChild(controlDiv);
        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'layercontainer';
        containerDiv.appendChild(this.layerContainer);
        var idCounter = 0;
        this.selectedLayer = null;
        this.createRegistry = function (layer, buffer) {
            layer.set('id', 'layer_' + idCounter);
            idCounter += 1;
            var layerDiv = document.createElement('div');
            layerDiv.className = buffer ? 'layer ol-unselectable buffering' : 'layer ol-unselectable';
            layerDiv.title = layer.get('name') || 'Unnamed Layer';
            layerDiv.id = layer.get('id');
            this.addSelectEvent(layerDiv);
            var _this = this;
            layerDiv.draggable = true;
            layerDiv.addEventListener('dragstart', function (evt) {
                evt.dataTransfer.effectAllowed = 'move';
                evt.dataTransfer.setData('Text', this.id);
            });
            layerDiv.addEventListener('dragenter', function (evt) {
                this.classList.add('over');
            });
            layerDiv.addEventListener('dragleave', function (evt) {
                this.classList.remove('over');
            });
            layerDiv.addEventListener('dragover', function (evt) {
                evt.preventDefault();
                evt.dataTransfer.dropEffect = 'move';
            });
            layerDiv.addEventListener('drop', function (evt) {
                evt.preventDefault();
                this.classList.remove('over');
                var sourceLayerDiv = document.getElementById(evt.dataTransfer.getData('Text'));
                if (sourceLayerDiv !== this) {
                    _this.layerContainer.removeChild(sourceLayerDiv);
                    _this.layerContainer.insertBefore(sourceLayerDiv, this);
                    var htmlArray = [].slice.call(_this.layerContainer.children);
                    var index = htmlArray.length - htmlArray.indexOf(sourceLayerDiv) - 1;
                    var sourceLayer = _this.getLayerById(sourceLayerDiv.id);
                    var layers = _this.map.getLayers().getArray();
                    layers.splice(layers.indexOf(sourceLayer), 1);
                    layers.splice(index, 0, sourceLayer);
                    _this.map.render();
                }
            });
            var layerSpan = document.createElement('span');
            layerSpan.textContent = layerDiv.title;
            layerDiv.appendChild(this.addSelectEvent(layerSpan, true));
            layerSpan.addEventListener('dblclick', function () {
                this.contentEditable = true;
                layerDiv.draggable = false;
                layerDiv.classList.remove('ol-unselectable');
                this.focus();
            });
            layerSpan.addEventListener('blur', function () {
                if (this.contentEditable) {
                    this.contentEditable = false;
                    layerDiv.draggable = true;
                    layer.set('name', this.textContent);
                    layerDiv.classList.add('ol-unselectable');
                    layerDiv.title = this.textContent;
                    this.scrollTo(0, 0);
                }
            });
            var visibleBox = document.createElement('input');
            visibleBox.type = 'checkbox';
            visibleBox.className = 'visible';
            visibleBox.checked = layer.getVisible();
            visibleBox.addEventListener('change', function () {
                if (this.checked) {
                    layer.setVisible(true);
                } else {
                    layer.setVisible(false);
                }
            });
            layerDiv.appendChild(this.stopPropagationOnEvent(visibleBox, 'click'));
            var layerControls = document.createElement('div');
            this.addSelectEvent(layerControls, true);
            var opacityHandler = document.createElement('input');
            opacityHandler.type = 'range';
            opacityHandler.min = 0;
            opacityHandler.max = 1;
            opacityHandler.step = 0.1;
            opacityHandler.value = layer.getOpacity();
            opacityHandler.addEventListener('input', function () {
                layer.setOpacity(this.value);
            });
            opacityHandler.addEventListener('change', function () {
                layer.setOpacity(this.value);
            });
            opacityHandler.addEventListener('mousedown', function () {
                layerDiv.draggable = false;
            });
            opacityHandler.addEventListener('mouseup', function () {
                layerDiv.draggable = true;
            });
            layerControls.appendChild(this.stopPropagationOnEvent(opacityHandler, 'click'));
            layerDiv.appendChild(layerControls);
            this.layerContainer.insertBefore(layerDiv, this.layerContainer.firstChild);
            return this;
        };
        this.map.getLayers().on('add', function (evt) {
            if (evt.element instanceof ol.layer.Vector) {
                this.createRegistry(evt.element, true);
            } else {
                this.createRegistry(evt.element);
            }
        }, this);
        this.map.getLayers().on('remove', function (evt) {
            this.removeRegistry(evt.element);
        }, this);
    } else {
        throw new Error('Invalid parameter(s) provided.');
    }
};

layerTree.prototype.createButton = function (elemName, elemTitle, elemType) {
    var buttonElem = document.createElement('button');
    buttonElem.className = elemName;
    buttonElem.title = elemTitle;
    switch (elemType) {
        case 'addlayer':
            buttonElem.addEventListener('click', function () {
                document.getElementById(elemName).style.display = 'block';
            });
            return buttonElem;
        case 'deletelayer':
            var _this = this;
            buttonElem.addEventListener('click', function () {
                if (_this.selectedLayer) {
                    var layer = _this.getLayerById(_this.selectedLayer.id);
                    _this.map.removeLayer(layer);
                    _this.messages.textContent = 'Layer removed successfully.';
                } else {
                    _this.messages.textContent = 'No selected layer to remove.';
                }
            });
            return buttonElem;
        default:
            return false;
    }
};

layerTree.prototype.addBufferIcon = function (layer) {
    layer.getSource().on('change', function (evt) {
        var layerElem = document.getElementById(layer.get('id'));
        switch (evt.target.getState()) {
            case 'ready':
                layerElem.className = layerElem.className.replace(/(?:^|\s)(error|buffering)(?!\S)/g, '');
                break;
            case 'error':
                layerElem.className += ' error'
                break;
            default:
                layerElem.className += ' buffering';
                break;
        }
    });
};

layerTree.prototype.removeContent = function (element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
    return this;
};

layerTree.prototype.createOption = function (optionValue) {
    var option = document.createElement('option');
    option.value = optionValue;
    option.textContent = optionValue;
    return option;
};

layerTree.prototype.checkWmsLayer = function (form) {
    form.check.disabled = true;
    var _this = this;
    this.removeContent(form.layer).removeContent(form.format);
    var url = form.server.value;
    url = /^((http)|(https))(:\/\/)/.test(url) ? url : 'http://' + url;
    form.server.value = url;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            var parser = new ol.format.WMSCapabilities();
            try {
                var capabilities = parser.read(request.responseText);
                var currentProj = _this.map.getView().getProjection().getCode();
                var crs;
                var messageText = 'Layers read successfully.';
                if (capabilities.version === '1.3.0') {
                    crs = capabilities.Capability.Layer.CRS;
                } else {
                    crs = [currentProj];
                    messageText += ' Warning! Projection compatibility could not be checked due to version mismatch (' + capabilities.version + ').';
                }
                var layers = capabilities.Capability.Layer.Layer;
                if (layers.length > 0 && crs.indexOf(currentProj) > -1) {
                    for (var i = 0; i < layers.length; i += 1) {
                        form.layer.appendChild(_this.createOption(layers[i].Name));
                    }
                    var formats = capabilities.Capability.Request.GetMap.Format;
                    for (i = 0; i < formats.length; i += 1) {
                        form.format.appendChild(_this.createOption(formats[i]));
                    }
                    _this.messages.textContent = messageText;
                }
            } catch (error) {
                _this.messages.textContent = 'Some unexpected error occurred: (' + error.message + ').';
            } finally {
                form.check.disabled = false;
            }
        } else if (request.status > 200) {
            form.check.disabled = false;
        }
    };
    url = /\?/.test(url) ? url + '&' : url + '?';
    url = url + 'REQUEST=GetCapabilities&SERVICE=WMS';
    request.open('GET', '../../../cgi-bin/proxy.py?' + encodeURIComponent(url), true);
    //request.open('GET', url, true);
    request.send();
};

layerTree.prototype.addWmsLayer = function (form) {
    var params = {
        url: form.server.value,
        params: {
            layers: form.layer.value,
            format: form.format.value
        }
    };
    var layer;
    if (form.tiled.checked) {
        layer = new ol.layer.Tile({
            source: new ol.source.TileWMS(params),
            name: form.displayname.value
        });
    } else {
        layer = new ol.layer.Image({
            source: new ol.source.ImageWMS(params),
            name: form.displayname.value
        });
    }
    this.map.addLayer(layer);
    this.messages.textContent = 'WMS layer added successfully.';
    return this;
};

layerTree.prototype.addWfsLayer = function (form) {
    var url = form.server.value;
    url = /^((http)|(https))(:\/\/)/.test(url) ? url : 'http://' + url;
    url = /\?/.test(url) ? url + '&' : url + '?';
    var typeName = form.layer.value;
    var mapProj = this.map.getView().getProjection().getCode();
    var proj = form.projection.value || mapProj;
    var parser = new ol.format.WFS();
    var source = new ol.source.Vector({
        strategy: ol.loadingstrategy.bbox
    });
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            source.addFeatures(parser.readFeatures(request.responseText, {
                dataProjection: proj,
                featureProjection: mapProj
            }));
        }
    };
    url = url + 'SERVICE=WFS&REQUEST=GetFeature&TYPENAME=' + typeName + '&VERSION=1.1.0&SRSNAME=' + proj;
    request.open('GET', '../../../cgi-bin/proxy.py?' + encodeURIComponent(url));
    //request.open('GET', url);
    request.send();
    var layer = new ol.layer.Vector({
        source: source,
        name: form.displayname.value
    });
    this.addBufferIcon(layer);
    this.map.addLayer(layer);
    this.messages.textContent = 'WFS layer added successfully.';
    return this;
};

layerTree.prototype.addVectorLayer = function (form) {
    var file = form.file.files[0];
    var currentProj = this.map.getView().getProjection();
    try {
        var fr = new FileReader();
        var sourceFormat;
        var source = new ol.source.Vector();
        fr.onload = function (evt) {
            var vectorData = evt.target.result;
            switch (form.format.value) {
                case 'geojson':
                    sourceFormat = new ol.format.GeoJSON();
                    break;
                case 'topojson':
                    sourceFormat = new ol.format.TopoJSON();
                    break;
                case 'kml':
                    sourceFormat = new ol.format.KML();
                    break;
                case 'osm':
                    sourceFormat = new ol.format.OSMXML();
                    break;
                default:
                    return false;
            }
            var dataProjection = form.projection.value || sourceFormat.readProjection(vectorData) || currentProj;
            source.addFeatures(sourceFormat.readFeatures(vectorData, {
                dataProjection: dataProjection,
                featureProjection: currentProj
            }));
        };
        fr.readAsText(file);
        var layer = new ol.layer.Vector({
            source: source,
            name: form.displayname.value,
            strategy: ol.loadingstrategy.bbox
        });
        this.addBufferIcon(layer);
        this.map.addLayer(layer);
        this.messages.textContent = 'Vector layer added successfully.';
        return this;
    } catch (error) {
        this.messages.textContent = 'Some unexpected error occurred: (' + error.message + ').';
        return error;
    }
};

layerTree.prototype.addSelectEvent = function (node, isChild) {
    var _this = this;
    node.addEventListener('click', function (evt) {
        var targetNode = evt.target;
        if (isChild) {
            evt.stopPropagation();
            targetNode = targetNode.parentNode;
        }
        if (_this.selectedLayer) {
            _this.selectedLayer.classList.remove('active');
        }
        _this.selectedLayer = targetNode;
        targetNode.classList.add('active');
    });
    return node;
};

layerTree.prototype.removeRegistry = function (layer) {
    var layerDiv = document.getElementById(layer.get('id'));
    this.layerContainer.removeChild(layerDiv);
    return this;
};

layerTree.prototype.getLayerById = function (id) {
    var layers = this.map.getLayers().getArray();
    for (var i = 0; i < layers.length; i += 1) {
        if (layers[i].get('id') === id) {
            return layers[i];
        }
    }
    return false;
};

layerTree.prototype.stopPropagationOnEvent = function (node, event) {
    node.addEventListener(event, function (evt) {
        evt.stopPropagation();
    });
    return node;
};

ol.control.Print = function (opt_options) {
    var options = opt_options || {};
    var _this = this;
    var controlDiv = document.createElement('div');
    controlDiv.className = options.class || 'ol-print ol-unselectable ol-control';
    var controlButton = document.createElement('button');
    controlButton.textContent = options.label || 'P';
    controlButton.title = options.tipLabel || 'Print map';
    var dataURL;
    controlButton.addEventListener('click', function (evt) {
        _this.getMap().once('postcompose', function (evt) {
            var canvas = evt.context.canvas;
            dataURL = canvas.toDataURL('image/png');
        });
        _this.getMap().renderSync();
        window.open(dataURL, '_blank');
        dataURL = null;
    });
    controlDiv.appendChild(controlButton);
    ol.control.Control.call(this, {
        element: controlDiv,
        target: options.target
    });
};
ol.inherits(ol.control.Print, ol.control.Control);

function init() {
    document.removeEventListener('DOMContentLoaded', init);
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'http://demo.opengeo.org/geoserver/wms',
                    params: {
                        layers: 'ned',
                        format: 'image/png'
                    },
                    wrapX: false,
                    crossOrigin: 'anonymous'
                }),
                name: 'Elevation'
            }),
            new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'http://demo.opengeo.org/geoserver/wms',
                    params: {
                        layers: 'nlcd',
                        format: 'image/png'
                    },
                    wrapX: false,
                    crossOrigin: 'anonymous'
                }),
                name: 'Land Cover'
            })
        ],
        controls: [
            //Define the default controls
            new ol.control.Zoom({
                target: 'toolbar'
            }),
            //Define some new controls
            new ol.control.MousePosition({
                coordinateFormat: function (coordinates) {
                    var coord_x = coordinates[0].toFixed(3);
                    var coord_y = coordinates[1].toFixed(3);
                    return coord_x + ', ' + coord_y;
                },
                target: 'coordinates'
            }),
            new ol.control.Print({
                target: 'toolbar'
            })
        ],
        view: new ol.View({
            center: [-8604363.40000572, 4741541.738586053],
            zoom: 9
        })
    });
    var tree = new layerTree({map: map, target: 'layertree', messages: 'messageBar'})
        .createRegistry(map.getLayers().item(0))
        .createRegistry(map.getLayers().item(1));

    document.getElementById('checkwmslayer').addEventListener('click', function () {
        tree.checkWmsLayer(this.form);
    });
    document.getElementById('addwms_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.addWmsLayer(this);
        this.parentNode.style.display = 'none';
    });
    document.getElementById('wmsurl').addEventListener('change', function () {
        tree.removeContent(this.form.layer)
            .removeContent(this.form.format);
    });
    document.getElementById('addwfs_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.addWfsLayer(this);
        this.parentNode.style.display = 'none';
    });
    document.getElementById('addvector_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.addVectorLayer(this);
        this.parentNode.style.display = 'none';
    });
}
document.addEventListener('DOMContentLoaded', init);