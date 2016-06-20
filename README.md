# Code base for the book Mastering [OpenLayers 3](http://openlayers.org/).
Written by: Gábor Farkas

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">Mastering OpenLayers 3 Code Base</span> by <span xmlns:cc="http://creativecommons.org/ns#" property="cc:attributionName">Gábor Farkas</span> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.

## Contents:

- `/chapters`   HTML, CSS, and JavaScript code for the examples provided by the book. There is one .html, one .css, and one .js file for each full example. There are also partial examples, which should be linked to the appropriate full example before using.

- `/js`    OpenLayers 3, and other compressed third party libraries needed for the examples.

- `/res`    Various resources (mainly vector files, and thumbnail images for custom controls) used in the book.

- `/src`    OpenLayers 3 source files needed to build custom libraries.

- `/README.md`    This readme file.

- `/proxy.py`    Proxy file for overriding CORS restrictions. Copy it in your web server's `cgi-bin` folder. Note: this proxy does not contain any security restrictions. Be sure, no one can exploit it, use it for testing purposes only, and use it on your own risk. Adapted from: https://trac.osgeo.org/openlayers/browser/trunk/openlayers/examples/proxy.cgi.

## Errata:

- On page 54, it is said, strategies affect the rendering process. Contrary, strategies affect the download process of WFSs, or other REST API based layers. They alter the [extent](https://github.com/openlayers/ol3/blob/v3.16.0/src/ol/source/vectorsource.js#L792) with which the [loader function](https://github.com/openlayers/ol3/blob/v3.16.0/src/ol/featureloader.js#L31) is called. Thus, setting a strategy only has effect, when it is used with the default loader function (`ol.featureloader.loadFeaturesXhr`).
