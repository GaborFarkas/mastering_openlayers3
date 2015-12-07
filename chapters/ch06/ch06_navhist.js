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
        controlDiv.appendChild(this.createButton('newvector', 'New Vector Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('addvector', 'Add Vector Layer', 'addlayer'));
        controlDiv.appendChild(this.createButton('deletelayer', 'Remove Layer', 'deletelayer'));
        containerDiv.appendChild(controlDiv);
        this.layerContainer = document.createElement('div');
        this.layerContainer.className = 'layercontainer';
        containerDiv.appendChild(this.layerContainer);
        var idCounter = 0;
        this.selectedLayer = null;
        this.selectEventEmitter = new ol.Observable();
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
                    _this.map.getLayers().changed();
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
            this.selectEventEmitter.changed();
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
                    console.log(layer);
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
        _this.selectEventEmitter.changed();
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

var toolBar = function (options) {
    'use strict';
    if (!(this instanceof toolBar)) {
        throw new Error('toolBar must be constructed with the new keyword.');
    } else if (typeof options === 'object' && options.map && options.target && options.layertree) {
        if (!(options.map instanceof ol.Map)) {
            throw new Error('Please provide a valid OpenLayers 3 map object.');
        }
        this.map = options.map;
        this.toolbar = document.getElementById(options.target);
        this.layertree = options.layertree;
        this.controls = new ol.Collection();
    } else {
        throw new Error('Invalid parameter(s) provided.');
    }
};

toolBar.prototype.addControl = function (control) {
    if (!(control instanceof ol.control.Control)) {
        throw new Error('Only controls can be added to the toolbar.');
    }
    if (control.get('type') === 'toggle') {
        control.on('change:active', function () {
            if (control.get('active')) {
                this.controls.forEach(function (controlToDisable) {
                    if (controlToDisable.get('type') === 'toggle' && controlToDisable !== control) {
                        controlToDisable.set('active', false);
                    }
                });
            }
        }, this);
    }
    control.setTarget(this.toolbar);
    this.controls.push(control);
    this.map.addControl(control);
    return this;
};

toolBar.prototype.removeControl = function (control) {
    this.controls.remove(control);
    this.map.removeControl(control);
    return this;
};

ol.control.Interaction = function (opt_options) {
    var options = opt_options || {};
    var controlDiv = document.createElement('div');
    controlDiv.className = options.className || 'ol-unselectable ol-control';
    var controlButton = document.createElement('button');
    controlButton.textContent = options.label || 'I';
    controlButton.title = options.tipLabel || 'Custom interaction';
    controlDiv.appendChild(controlButton);
    this.setDisabled = function (bool) {
        if (typeof bool === 'boolean') {
            controlButton.disabled = bool;
            return this;
        }
    };
    var _this = this;
    controlButton.addEventListener('click', function () {
        if (_this.get('interaction').getActive()) {
            _this.set('active', false);
        } else {
            _this.set('active', true);
        }
    });
    var interaction = options.interaction;
    ol.control.Control.call(this, {
        element: controlDiv,
        target: options.target
    });
    this.setProperties({
        interaction: interaction,
        active: false,
        type: 'toggle',
        destroyFunction: function (evt) {
            if (evt.element === _this) {
                this.removeInteraction(_this.get('interaction'));
            }
        }
    });
    this.on('change:active', function () {
        this.get('interaction').setActive(this.get('active'));
        if (this.get('active')) {
            controlButton.classList.add('active');
        } else {
            controlButton.classList.remove('active');
        }
    }, this);
};
ol.inherits(ol.control.Interaction, ol.control.Control);

ol.control.Interaction.prototype.setMap = function (map) {
    ol.control.Control.prototype.setMap.call(this, map);
    var interaction = this.get('interaction');
    if (map === null) {
        ol.Observable.unByKey(this.get('eventId'));
    } else if (map.getInteractions().getArray().indexOf(interaction) === -1) {
        map.addInteraction(interaction);
        interaction.setActive(false);
        this.set('eventId', map.getControls().on('remove', this.get('destroyFunction'), map));
    }
};

toolBar.prototype.addSelectControls = function () {
    var layertree = this.layertree;
    var selectInteraction = new ol.interaction.Select({
        layers: function (layer) {
            if (layertree.selectedLayer) {
                if (layer === layertree.getLayerById(layertree.selectedLayer.id)) {
                    return true;
                }
            }
            return false;
        },
        wrapX: false
    });
    var selectSingle = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Select feature',
        className: 'ol-singleselect ol-unselectable ol-control',
        interaction: selectInteraction
    });
    var boxInteraction = new ol.interaction.DragBox();
    var selectMulti = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Select features with a box',
        className: 'ol-multiselect ol-unselectable ol-control',
        interaction: boxInteraction
    });
    boxInteraction.on('boxend', function (evt) {
        selectInteraction.getFeatures().clear();
        var extent = boxInteraction.getGeometry().getExtent();
        if (this.layertree.selectedLayer) {
            var source = layertree.getLayerById(layertree.selectedLayer.id).getSource();
            if (source instanceof ol.source.Vector) {
                source.forEachFeatureIntersectingExtent(extent, function (feature) {
                    selectInteraction.getFeatures().push(feature);
                });
            }
        }
    }, this);
    var controlDiv = document.createElement('div');
    controlDiv.className = 'ol-deselect ol-unselectable ol-control';
    var controlButton = document.createElement('button');
    controlButton.title = 'Remove selection(s)';
    controlDiv.appendChild(controlButton);
    controlButton.addEventListener('click', function () {
        selectInteraction.getFeatures().clear();
    });
    var deselectControl = new ol.control.Control({
        element: controlDiv
    });
    this.addControl(selectSingle)
        .addControl(selectMulti)
        .addControl(deselectControl);
    return this;
};

layerTree.prototype.newVectorLayer = function (form) {
    var type = form.type.value;
    if (type !== 'point' && type !== 'line' && type !== 'polygon' && type !== 'geomcollection') {
        this.messages.textContent = 'Unrecognized layer type.';
        return false;
    }
    var layer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        name: form.displayname.value || 'Unnamed Layer',
        type: type
    });
    this.addBufferIcon(layer);
    this.map.addLayer(layer);
    layer.getSource().changed();
    this.messages.textContent = 'New vector layer created successfully.';
    return this;
};

toolBar.prototype.addEditingToolBar = function () {
    var layertree = this.layertree;
    this.editingControls = new ol.Collection();
    var drawPoint = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Add points',
        className: 'ol-addpoint ol-unselectable ol-control',
        interaction: this.handleEvents(new ol.interaction.Draw({
            type: 'Point',
            snapTolerance: 1
        }), 'point')
    }).setDisabled(true);
    this.editingControls.push(drawPoint);
    var drawLine = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Add lines',
        className: 'ol-addline ol-unselectable ol-control',
        interaction: this.handleEvents(new ol.interaction.Draw({
            type: 'LineString',
            snapTolerance: 1
        }), 'line')
    }).setDisabled(true);
    this.editingControls.push(drawLine);
    var drawPolygon = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Add polygons',
        className: 'ol-addpolygon ol-unselectable ol-control',
        interaction: this.handleEvents(new ol.interaction.Draw({
            type: 'Polygon',
            snapTolerance: 1
        }), 'polygon')
    }).setDisabled(true);
    this.editingControls.push(drawPolygon);
    this.activeFeatures = new ol.Collection();
    var modifyFeature = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Modify features',
        className: 'ol-modifyfeat ol-unselectable ol-control',
        interaction: new ol.interaction.Modify({
            features: this.activeFeatures
        })
    }).setDisabled(true);
    this.editingControls.push(modifyFeature);
    var snapFeature = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Snap to paths, and vertices',
        className: 'ol-snap ol-unselectable ol-control',
        interaction: new ol.interaction.Snap({
            features: this.activeFeatures
        })
    }).setDisabled(true);
    snapFeature.unset('type');
    this.editingControls.push(snapFeature);
    var removeFeature = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Remove features',
        className: 'ol-removefeat ol-unselectable ol-control',
        interaction: new ol.interaction.RemoveFeature({
            features: this.activeFeatures
        })
    }).setDisabled(true);
    this.editingControls.push(removeFeature);
    var dragFeature = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Drag features',
        className: 'ol-dragfeat ol-unselectable ol-control',
        interaction: new ol.interaction.DragFeature({
            features: this.activeFeatures
        })
    }).setDisabled(true);
    this.editingControls.push(dragFeature);
    layertree.selectEventEmitter.on('change', function () {
        var layer = layertree.getLayerById(layertree.selectedLayer.id);
        if (layer instanceof ol.layer.Vector) {
            this.editingControls.forEach(function (control) {
                control.setDisabled(false);
            });
            var layerType = layer.get('type');
            if (layerType !== 'point' && layerType !== 'geomcollection') drawPoint.setDisabled(true).set('active', false);
            if (layerType !== 'line' && layerType !== 'geomcollection') drawLine.setDisabled(true).set('active', false);
            if (layerType !== 'polygon' && layerType !== 'geomcollection') drawPolygon.setDisabled(true).set('active', false);
            var _this = this;
            setTimeout(function () {
                _this.activeFeatures.clear();
                _this.activeFeatures.extend(layer.getSource().getFeatures());
            }, 0);
        } else {
            this.editingControls.forEach(function (control) {
                control.set('active', false);
                control.setDisabled(true);
            });
        }
    }, this);
    this.addControl(drawPoint).addControl(drawLine).addControl(drawPolygon)
        .addControl(modifyFeature).addControl(snapFeature).addControl(removeFeature)
        .addControl(dragFeature);
    return this;
};

toolBar.prototype.handleEvents = function (interaction, type) {
    if (type !== 'point') {
        interaction.on('drawstart', function (evt) {
            var error = false;
            if (this.layertree.selectedLayer) {
                var selectedLayer = this.layertree.getLayerById(this.layertree.selectedLayer.id);
                var layerType = selectedLayer.get('type');
                error = (layerType !== type && layerType !== 'geomcollection') ? true : false;
            } else {
                error = true;
            }
            if (error) {
                interaction.finishDrawing();
            }
        }, this);
    }
    interaction.on('drawend', function (evt) {
        var error = '';
        errorcheck: if (this.layertree.selectedLayer) {
            var selectedLayer = this.layertree.getLayerById(this.layertree.selectedLayer.id);
            error = selectedLayer instanceof ol.layer.Vector ? '' : 'Please select a valid vector layer.';
            if (error) break errorcheck;
            var layerType = selectedLayer.get('type');
            error = (layerType === type || layerType === 'geomcollection') ? '' : 'Selected layer has a different vector type.';
        } else {
            error = 'Please select a layer first.';
        }
        if (! error) {
            selectedLayer.getSource().addFeature(evt.feature);
            this.activeFeatures.push(evt.feature);
        } else {
            this.layertree.messages.textContent = error;
        }
    }, this);
    return interaction;
};

ol.interaction.RemoveFeature = function (opt_options) {
    ol.interaction.Pointer.call(this, {
        handleDownEvent: function (evt) {
            this.set('deleteCandidate', evt.map.forEachFeatureAtPixel(evt.pixel,
                function (feature, layer) {
                    if (this.get('features').getArray().indexOf(feature) !== -1) {
                        return feature;
                    }
                }, this
            ));
            return !!this.get('deleteCandidate');
        },
        handleUpEvent: function (evt) {
            evt.map.forEachFeatureAtPixel(evt.pixel, 
                function (feature, layer) {
                    if (feature === this.get('deleteCandidate')) {
                        layer.getSource().removeFeature(feature);
                        this.get('features').remove(feature);
                    }
                }, this
            );
            this.set('deleteCandidate', null);
        }
    });
    this.setProperties({
        features: opt_options.features,
        deleteCandidate: null
    });
};
ol.inherits(ol.interaction.RemoveFeature, ol.interaction.Pointer);

ol.interaction.DragFeature = function (opt_options) {
    ol.interaction.Pointer.call(this, {
        handleDownEvent: function (evt) {
            this.set('draggedFeature', evt.map.forEachFeatureAtPixel(evt.pixel,
                function (feature, layer) {
                    if (this.get('features').getArray().indexOf(feature) !== -1) {
                        return feature;
                    }
                }, this
            ));
            if (this.get('draggedFeature')) {
                this.set('coords', evt.coordinate);
            }
            return !!this.get('draggedFeature');
        },
        handleDragEvent: function (evt) {
            var deltaX = evt.coordinate[0] - this.get('coords')[0];
            var deltaY = evt.coordinate[1] - this.get('coords')[1];
            this.get('draggedFeature').getGeometry().translate(deltaX, deltaY);
            this.set('coords', evt.coordinate);
        },
        handleUpEvent: function (evt) {
            this.setProperties({
                coords: null,
                draggedFeature: null
            });
        }
    });
    this.setProperties({
        features: opt_options.features,
        coords: null,
        draggedFeature: null
    });
};
ol.inherits(ol.interaction.DragFeature, ol.interaction.Pointer);

ol.interaction.Measure = function (opt_options) {
    var options = opt_options || {};
    if (!(options.map instanceof ol.Map)) {
        throw new Error('Please provide a valid OpenLayers 3 map');
    }
    var style = opt_options.style || new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: [0, 153, 255, 1]
            }),
            stroke: new ol.style.Stroke({
                color: [255, 255, 255, 1],
                width: 1.5
            })
        }),
        stroke: new ol.style.Stroke({
            color: [0, 153, 255, 1],
            width: 3
        }),
        fill: new ol.style.Fill({
            color: [255, 255, 255, 0.5]
        })
    });
    var cursorFeature = new ol.Feature();
    var lineFeature = new ol.Feature();
    var polygonFeature = new ol.Feature();
    ol.interaction.Interaction.call(this, {
        handleEvent: function (evt) {
            switch (evt.type) {
                case 'pointermove':
                    cursorFeature.setGeometry(new ol.geom.Point(evt.coordinate));
                    var coordinates = this.get('coordinates');
                    coordinates[coordinates.length - 1] = evt.coordinate;
                    if (this.get('session') === 'area') {
                        if (coordinates.length < 3) {
                            lineFeature.getGeometry().setCoordinates(coordinates);
                        } else {
                            polygonFeature.getGeometry().setCoordinates([coordinates]);
                        }
                    }
                    else if (this.get('session') === 'length') {
                        lineFeature.getGeometry().setCoordinates(coordinates);
                    }
                    break;
                case 'click':
                    if (!this.get('session')) {
                        if (evt.originalEvent.shiftKey) {
                            this.set('session', 'area');
                            polygonFeature.setGeometry(new ol.geom.Polygon([[[0, 0]]]));
                        } else {
                            this.set('session', 'length');
                        }
                        lineFeature.setGeometry(new ol.geom.LineString([[0, 0]]));
                        this.set('coordinates', [evt.coordinate]);
                    }
                    this.get('coordinates').push(['chicken', 'nuggets']);
                    return false;
                case 'dblclick':
                    var unit;
                    if (this.get('session') === 'area') {
                        var area = polygonFeature.getGeometry().getArea();
                        if (area > 1000000) {
                            area = area / 1000000;
                            unit = 'km²';
                        } else {
                            unit = 'm²';
                        }
                        this.set('result', {
                            type: 'area',
                            measurement: area,
                            unit: unit
                        });
                    } else {
                        var length = lineFeature.getGeometry().getLength();
                        if (length > 1000) {
                            length = length / 1000;
                            unit = 'km';
                        } else {
                            unit = 'm';
                        }
                        this.set('result', {
                            type: 'length',
                            measurement: length,
                            unit: unit
                        });
                    }
                    cursorFeature.setGeometry(null);
                    lineFeature.setGeometry(null);
                    polygonFeature.setGeometry(null);
                    this.set('session', null);
                    return false;
            }
            return true;
        }
    });
    this.on('change:active', function (evt) {
        if (this.getActive()) {
            this.get('overlay').setMap(this.get('map'));
        } else {
            this.get('overlay').setMap(null);
            this.set('session', null);
            lineFeature.setGeometry(null);
            polygonFeature.setGeometry(null);
        }
    });
    this.setProperties({
        overlay: new ol.layer.Vector({
            source: new ol.source.Vector({
                features: [cursorFeature, lineFeature, polygonFeature]
            }),
            style: style
        }),
        map: options.map,
        session: null,
        coordinates: [],
        result: null
    });
};
ol.inherits(ol.interaction.Measure, ol.interaction.Interaction);

ol.control.NavigationHistory = function (opt_options) {
    var options = opt_options || {};
    var _this = this;
    var controlDiv = document.createElement('div');
    controlDiv.className = options.class || 'ol-unselectable ol-control';
    var backButton = document.createElement('button');
    backButton.className = 'ol-navhist-back';
    backButton.textContent = options.backButtonText || '◀';
    backButton.title = options.backButtonTipLabel || 'Previous view';
    backButton.addEventListener('click', function (evt) {
        var historyArray = _this.get('history');
        var currIndex = _this.get('index');
        if (currIndex > 0) {
            currIndex -= 1;
            _this.setProperties({
                shouldSave: false,
                index: currIndex
            });
            _this.getMap().getView().setProperties(historyArray[currIndex]);
        }
    });
    backButton.disabled = true;
    controlDiv.appendChild(backButton);
    var nextButton = document.createElement('button');
    nextButton.className = 'ol-navhist-next';
    nextButton.textContent = options.nextButtonText || '▶';
    nextButton.title = options.nextButtonTipLabel || 'Next view';
    nextButton.addEventListener('click', function (evt) {
        var historyArray = _this.get('history');
        var currIndex = _this.get('index');
        if (currIndex < historyArray.length - 1) {
            currIndex += 1;
            _this.setProperties({
                shouldSave: false,
                index: currIndex
            });
            _this.getMap().getView().setProperties(historyArray[currIndex]);
        }
    });
    nextButton.disabled = true;
    controlDiv.appendChild(nextButton);
    ol.control.Control.call(this, {
        element: controlDiv,
        target: options.target
    });
    this.setProperties({
        history: [],
        index: -1,
        maxSize: options.maxSize || 50,
        eventId: null,
        shouldSave: true
    });
    this.on('change:index', function () {
        if (this.get('index') === 0) {
            backButton.disabled = true;
        } else {
            backButton.disabled = false;
        }
        if (this.get('history').length - 1 === this.get('index')) {
            nextButton.disabled = true;
        } else {
            nextButton.disabled = false;
        }
    });
};
ol.inherits(ol.control.NavigationHistory, ol.control.Control);

ol.control.NavigationHistory.prototype.setMap = function (map) {
    ol.control.Control.prototype.setMap.call(this, map);
    if (map === null) {
        ol.Observable.unByKey(this.get('eventId'));
    } else {
        this.set('eventId', map.on('moveend', function (evt) {
            if (this.get('shouldSave')) {
                var view = map.getView();
                var viewStatus = {
                    center: view.getCenter(),
                    resolution: view.getResolution(),
                    rotation: view.getRotation()
                };
                var historyArray = this.get('history');
                var currIndex = this.get('index');
                historyArray.splice(currIndex + 1, historyArray.length - currIndex - 1);
                if (historyArray.length === this.get('maxSize')) {
                    historyArray.splice(0, 1);
                } else {
                    currIndex += 1;
                }
                historyArray.push(viewStatus);
                this.set('index', currIndex);
            } else {
                this.set('shouldSave', true);
            }
        }, this));
    }
};

function init() {
    document.removeEventListener('DOMContentLoaded', init);
    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.TileWMS({
                    url: 'http://demo.opengeo.org/geoserver/wms',
                    params: {
                        layers: 'ne_50m_land',
                        format: 'image/png'
                    },
                    wrapX: false
                }),
                name: 'Natural Earth Land'
            }),
            new ol.layer.Vector({
                source: new ol.source.Vector({
                    format: new ol.format.GeoJSON({
                        defaultDataProjection: 'EPSG:4326'
                    }),
                    url: '../../res/world_countries.geojson',
                    wrapX: false
                }),
                name: 'World Countries',
                headers: {
                    pop_est: 'integer',
                    gdp_md_est: 'integer'
                },
                type: 'polygon',
                updateWhileAnimating: true,
                updateWhileInteracting: true
            })
        ],
        controls: [
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
            zoom: 2,
            extent: ol.proj.get('EPSG:3857').getExtent()
        }),
        loadTilesWhileAnimating: true,
        loadTilesWhileInteracting: true
    });

    var tree = new layerTree({map: map, target: 'layertree', messages: 'messageBar'})
        .createRegistry(map.getLayers().item(0))
        .createRegistry(map.getLayers().item(1));

    map.getLayers().item(1).getSource().on('change', function (evt) {
        if (this.getState() === 'ready') {
            map.getLayers().item(1).buildHeaders();
        }
    });
    
    var tools = new toolBar({
        map: map,
        target: 'toolbar',
        layertree: tree,
    }).addControl(new ol.control.Zoom()).addControl(new ol.control.NavigationHistory());

    tools.addSelectControls().addEditingToolBar();

    var measureControl = new ol.control.Interaction({
        label: ' ',
        tipLabel: 'Measure distances and areas',
        className: 'ol-measure ol-unselectable ol-control',
        interaction: new ol.interaction.Measure({
            map: map
        })
    });
    measureControl.get('interaction').on('change:result', function (evt) {
        var result = evt.target.get('result');
        tree.messages.textContent = result.measurement + ' ' + result.unit;
    });

    tools.addControl(measureControl);

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
    document.getElementById('newvector_form').addEventListener('submit', function (evt) {
        evt.preventDefault();
        tree.newVectorLayer(this);
        this.parentNode.style.display = 'none';
    });
}
document.addEventListener('DOMContentLoaded', init);