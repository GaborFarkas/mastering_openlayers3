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
        var observer = new MutationObserver(function (mutations) {
            if (mutations[0].target.textContent) {
                var oldText = mutations[0].target.textContent;
                var timeoutFunction = function () {
                    if (oldText !== mutations[0].target.textContent) {
                        oldText = mutations[0].target.textContent;
                        setTimeout(timeoutFunction, 10000);
                    } else {
                        oldText = '';
                        mutations[0].target.textContent = '';
                    }
                };
            	setTimeout(timeoutFunction, 10000);
            }
        });
        observer.observe(this.messages, {childList: true});
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
            if (layer instanceof ol.layer.Vector) {
                layerControls.appendChild(document.createElement('br'));
                var attributeOptions = document.createElement('select');
                layerControls.appendChild(this.stopPropagationOnEvent(attributeOptions, 'click'));
                layerControls.appendChild(document.createElement('br'));
                var defaultStyle = this.createButton('stylelayer', 'Default', 'stylelayer', layer);
                layerControls.appendChild(this.stopPropagationOnEvent(defaultStyle, 'click'));
                var graduatedStyle = this.createButton('stylelayer', 'Graduated', 'stylelayer', layer);
                layerControls.appendChild(this.stopPropagationOnEvent(graduatedStyle, 'click'));
                var categorizedStyle = this.createButton('stylelayer', 'Categorized', 'stylelayer', layer);
                layerControls.appendChild(this.stopPropagationOnEvent(categorizedStyle, 'click'));
                layer.set('style', layer.getStyle());
                layer.on('propertychange', function (evt) {
                    if (evt.key === 'headers') {
                        this.removeContent(attributeOptions);
                        var headers = layer.get('headers');
                        for (var i in headers) {
                            attributeOptions.appendChild(this.createOption(i));
                        }
                    }
                }, this);
            }
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

layerTree.prototype.createButton = function (elemName, elemTitle, elemType, layer) {
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
        case 'stylelayer':
            var _this = this;
            buttonElem.textContent = elemTitle;
            if (elemTitle === 'Default') {
                buttonElem.addEventListener('click', function () {
                    layer.setStyle(layer.get('style'));
                });
            } else {
                var styleFunction = elemTitle === 'Graduated' ? this.styleGraduated : this.styleCategorized;
                buttonElem.addEventListener('click', function () {
                    var attribute = buttonElem.parentNode.querySelector('select').value;
                    styleFunction.call(_this, layer, attribute);
                });
            }
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

ol.layer.Vector.prototype.buildHeaders = function () {
    var headers = this.get('headers') || {};
    var features = this.getSource().getFeatures();
    for (var i = 0; i < features.length; i += 1) {
        var attributes = features[i].getProperties();
        for (var j in attributes) {
            if (typeof attributes[j] !== 'object' && !(j in headers)) {
                headers[j] = 'string';
            }
        }
    }
    this.set('headers', headers);
    return this;
};

layerTree.prototype.styleGraduated = function (layer, attribute) {
    if (layer.get('headers')[attribute] === 'string') {
        this.messages.textContent = 'A numeric column is required for graduated symbology.';
    } else {
        var attributeArray = [];
        layer.getSource().forEachFeature(function (feat) {
            attributeArray.push(feat.get(attribute));
        });
        var max = Math.max.apply(null, attributeArray);
        var min = Math.min.apply(null, attributeArray);
        var step = (max - min) / 5;
        var colors = this.graduatedColorFactory(5, [254, 240, 217], [179, 0, 0]);
        layer.setStyle(function (feature, res) {
            var property = feature.get(attribute);
            var color = property < min + step * 1 ? colors[0] :
                property < min + step * 2 ? colors[1] :
                property < min + step * 3 ? colors[2] : 
                property < min + step * 4 ? colors[3] : colors[4];
            var style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: [0, 0, 0, 1],
                    width: 1
                }),
                fill: new ol.style.Fill({
                    color: color
                })
            });
            return [style];
        });
    }
};

layerTree.prototype.graduatedColorFactory = function (intervals, rgb1, rgb2) {
    var colors = [];
    var step = intervals - 1;
    var redStep = (rgb2[0] - rgb1[0]) / step;
    var greenStep = (rgb2[1] - rgb1[1]) / step;
    var blueStep = (rgb2[2] - rgb1[2]) / step;
    for (var i = 0; i < step; i += 1) {
        var red = Math.ceil(rgb1[0] + redStep * i);
        var green = Math.ceil(rgb1[1] + greenStep * i);
        var blue = Math.ceil(rgb1[2] + blueStep * i);
        colors.push([red, green, blue, 1]);
    }
    colors.push([rgb2[0], rgb2[1], rgb2[2], 1]);
    return colors;
};

layerTree.prototype.styleCategorized = function (layer, attribute) {
    var attributeArray = [];
    var colorArray = [];
    var randomColor;
    layer.getSource().forEachFeature(function (feat) {
        var property = feat.get(attribute).toString();
        if (attributeArray.indexOf(property) === -1) {
            attributeArray.push(property);
            do {
                randomColor = this.randomHexColor();
            } while (colorArray.indexOf(randomColor) !== -1);
            colorArray.push(randomColor);
        }
    }, this);
    layer.setStyle(function (feature, res) {
        var index = attributeArray.indexOf(feature.get(attribute).toString());
        var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [0, 0, 0, 1],
                width: 1
            }),
            fill: new ol.style.Fill({
                color: colorArray[index]
            })
        });
        return [style];
    });
};

layerTree.prototype.randomHexColor = function() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
};

function init() {
    document.removeEventListener('DOMContentLoaded', init);
    map = new ol.Map({
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
                    url: '../../res/world_countries.geojson'
                }),
                name: 'World Countries',
                headers: {
                    pop_est: 'integer',
                    gdp_md_est: 'integer'
                }
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
            })
        ],
        view: new ol.View({
            center: [0, 0],
            zoom: 2
        })
    });

    var tree = new layerTree({map: map, target: 'layertree', messages: 'messageBar'})
        .createRegistry(map.getLayers().item(0))
        .createRegistry(map.getLayers().item(1));

    map.getLayers().item(1).getSource().on('change', function (evt) {
        if (this.getState() === 'ready') {
            map.getLayers().item(1).buildHeaders();
            var geoJSONSerializer = new ol.format.GeoJSON();
            var featString = geoJSONSerializer.writeFeatures(this.getFeatures());
            var request = new XMLHttpRequest();
            request.open('POST', 'myserver/myscript');
            request.send(featString);
            
            var modifiedFeatures = [];
            var features = this.getFeatures();
            for (var i = 0; i < features.length; i += 1) {
                var modifiedFeature = features[i].clone();
                modifiedFeature.getGeometry().applyTransform(function (flatCoordinates, flatCoordinates2, stride) {
                        for (var j = 0; j < flatCoordinates.length; j += stride) {
                        var y = flatCoordinates[j];
                        var x = flatCoordinates[j + 1];
                        flatCoordinates[j] = x;
                        flatCoordinates[j + 1] = y;
                    }
                });
                modifiedFeatures.push(modifiedFeature);
            }
            var WFSTSerializer = new ol.format.WFS();
            var featObject = WFSTSerializer.writeTransaction(null, modifiedFeatures, null, {
                featureType: 'ne:countries',
                featureNS: 'http://naturalearthdata.com',
                srsName: 'EPSG:4326'
            });
            var serializer = new XMLSerializer();
            var featString = serializer.serializeToString(featObject);
            var request = new XMLHttpRequest();
            request.open('POST', 'myowsserver?SERVICE=WFS');
            request.setRequestHeader('Content-Type', 'text/xml');
            request.send(featString);
        }
    });

    map.on('click', function (evt) {
        var pixel = evt.pixel;
        var coord = evt.coordinate;
        var attributeForm = document.createElement('form');
        attributeForm.className = 'popup';
        this.getOverlays().clear();
        var firstFeature = true;
        function createRow (attributeName, attributeValue, type) {
            var rowElem = document.createElement('div');
            var attributeSpan = document.createElement('span');
            attributeSpan.textContent = attributeName + ': ';
            rowElem.appendChild(attributeSpan);
            var attributeInput = document.createElement('input');
            attributeInput.name = attributeName;
            attributeInput.type = 'text';
            if (type !== 'string') {
                attributeInput.type = 'number';
                attributeInput.step = (type === 'float') ? 1e-6 : 1;
            }
            attributeInput.value = attributeValue;
            rowElem.appendChild(attributeInput);
            return rowElem;
        }
        this.forEachFeatureAtPixel(pixel, function (feature, layer) {
            if (firstFeature) {
                var attributes = feature.getProperties();
                var headers = layer.get('headers');
                for (var i in attributes) {
                    if (typeof attributes[i] !== 'object' && i in headers) {
                        attributeForm.appendChild(createRow(i, attributes[i], headers[i]));
                    }
                }
                if (attributeForm.children.length > 0) {
                    var saveAttributes = document.createElement('input');
                    saveAttributes.type = 'submit';
                    saveAttributes.className = 'save';
                    saveAttributes.value = '';
                    attributeForm.addEventListener('submit', function (evt) {
                        evt.preventDefault();
                        var attributeList = {};
                        var inputList = [].slice.call(this.querySelectorAll('input[type=text], input[type=number]'));
                        for (var i = 0; i < inputList.length; i += 1) {
                            switch (headers[inputList[i].name]) {
                                case 'string':
                                    attributeList[inputList[i].name] = inputList[i].value.toString();
                                    break;
                                case 'integer':
                                    attributeList[inputList[i].name] = parseInt(inputList[i].value);
                                    break;
                                case 'float':
                                    attributeList[inputList[i].name] = parseFloat(inputList[i].value);
                                    break;
                            }
                        }
                        feature.setProperties(attributeList);
                        map.getOverlays().clear();
                    });
                    attributeForm.appendChild(saveAttributes);
                    this.addOverlay(new ol.Overlay({
                        element: attributeForm,
                        position: coord
                    }));
                    firstFeature = false;
                }
            }
        }, map, function (layerCandidate) {
            if (this.selectedLayer !== null && layerCandidate.get('id') === this.selectedLayer.id) {
                return true;
            }
            return false;
        }, tree);
    });

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