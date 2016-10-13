var should = require("should");
var math = require("mathjs");
var Trans2D = require("./trans2d");
var DOMParser = require("xmldom").DOMParser;

(function(exports) {
    var LAYERTOP = "1";
    var LAYERBOT = "16";
    function parseLayers(that) {
        var root = that.dom.documentElement;
        var domlayers = root.getElementsByTagName("layer");
        var layers = {};
        for (var i = 0; i < domlayers.length; i++) {
            var layer = domlayers.item(i);
            var number = layer.getAttribute("number");
            var name = layer.getAttribute("name");
            //console.log("layer number:"+number, "name:"+name);
            layers[number] = layers[name] = {
                number: number,
                name: name,
                color: layer.getAttribute("color"),
                fill: layer.getAttribute("fill"),
                visible: layer.getAttribute("visible") || "yes",
                active: layer.getAttribute("active") || "active",
            };
        }
        return layers;
    } //parseLayers
    function parseWires(that, domparent) {
        var domwires = domparent.getElementsByTagName("wire");
        var wires = [];
        for (var iWire = 0; iWire < domwires.length; iWire++) {
            var domwire = domwires.item(iWire);
            wires.push({
                x1: domwire.getAttribute("x1"),
                y1: domwire.getAttribute("y1"),
                x2: domwire.getAttribute("x2"),
                y2: domwire.getAttribute("y2"),
                width: domwire.getAttribute("width"),
                layer: domwire.getAttribute("layer"),
            });
        }
        return wires;
    } //parseWires
    function parseRectangles(that, domparent) {
        var domrectangles = domparent.getElementsByTagName("rectangle");
        var rectangles = [];
        for (var iRect = 0; domrectangles && iRect < domrectangles.length; iRect++) {
            var domrectangle = domrectangles.item(iRect);
            rectangles.push({
                x1: domrectangle.getAttribute("x1"),
                y1: domrectangle.getAttribute("y1"),
                x2: domrectangle.getAttribute("x2"),
                y2: domrectangle.getAttribute("y2"),
                layer: domrectangle.getAttribute("layer"),
            });
        }
        return rectangles;
    } //parseRectangles
    function parseTexts(that, domparent) {
        var domtexts = domparent.getElementsByTagName("text");
        var texts = [];
        for (var iRect = 0; iRect < domtexts.length; iRect++) {
            var domtext = domtexts.item(iRect);
            var text = domtext.firstChild.nodeValue;
            texts.push({
                x: domtext.getAttribute("x"),
                y: domtext.getAttribute("y"),
                size: domtext.getAttribute("size"),
                ratio: domtext.getAttribute("ratio"),
                rot: domtext.getAttribute("rot"),
                layer: domtext.getAttribute("layer"),
                text: text,
            });
            //console.log("text.kid",kid);
        }
        return texts;
    } //parseTexts
    function parseSMDs(that, domparent) {
        var domsmds = domparent.getElementsByTagName("smd");
        var smds = [];
        for (var iSMD = 0; iSMD < domsmds.length; iSMD++) {
            var domsmd = domsmds.item(iSMD);
            var smdname = domsmd.getAttribute("name");
            smds.push({
                name: smdname,
                x: domsmd.getAttribute("x"),
                y: domsmd.getAttribute("y"),
                dx: domsmd.getAttribute("dx"),
                dy: domsmd.getAttribute("dy"),
                layer: domsmd.getAttribute("layer"),
            });
        }
        return smds;
    } //parseSMDs
    function parseElements(that) {
        var root = that.dom.documentElement;
        var domelts = root.getElementsByTagName("element");
        var elements = {};
        for (var iElt = 0; iElt < domelts.length; iElt++) {
            var domelt = domelts.item(iElt);
            var name = domelt.getAttribute("name");
            elements[name] = {
                name: name,
                library: domelt.getAttribute("library"),
                package: domelt.getAttribute("package"),
                x: domelt.getAttribute("x"),
                y: domelt.getAttribute("y"),
                rot: domelt.getAttribute("rot"),
                //UNUSED value: domelt.getAttribute("value"),
                //UNUSED locked: domelt.getAttribute("locked"),
            }
        }
        return elements;
    } //parseElements
    function parsePlain(that) {
        var root = that.dom.documentElement;
        var elts = root.getElementsByTagName("plain");
        var domplain = elts.length ? elts.item(0) : null;
        var plain = {
            rectangle:[],
            wire:[],
            text:[],
            smd:[],
        };
        if (domplain) {
            plain.rectangle = parseRectangles(that, domplain);
            plain.wire = parseWires(that, domplain);
            plain.text = parseTexts(that, domplain);
            plain.smd = parseSMDs(that, domplain);
        }
        return plain;
    } //parsePlain
    function parseLibraries(that) {
        var root = that.dom.documentElement;
        var domlibraries = root.getElementsByTagName("library");
        var libraries = {};
        for (var iLib = 0; iLib < domlibraries.length; iLib++) {
            var library = domlibraries.item(iLib);
            var name = library.getAttribute("name");
            //console.log("library name:"+name);
            var dompackages = library.getElementsByTagName("package");
            var packages = {};
            for (var iPkg = 0; iPkg < dompackages.length; iPkg++) {
                var dompackage = dompackages.item(iPkg);
                var pkgname = dompackage.getAttribute("name");
                packages[pkgname] = {
                    name: pkgname,
                    rectangle: parseRectangles(that, dompackage),
                    smd: parseSMDs(that, dompackage),
                    wire: parseWires(that, dompackage),
                };
            }
            libraries[name] = {
                name: name,
                packages: packages,
            };
        }
        return libraries;
    } // parseLibraries

    ////////////////// constructor
    function EagleBRD(brd, options) {
        var that = this;

        options = options || {};
        var parser = new DOMParser();
        that.dom = parser.parseFromString(brd);
        that.$plain = parsePlain(that);
        that.$layers = parseLayers(that);
        that.$libraries = parseLibraries(that);
        that.$elements = parseElements(that);

        return that;
    }
    EagleBRD.parseROT = function(rot) {
        var result = {
            angle: 0,
            mirrored: false,
        };
        if (rot) {
            if (rot.charAt(0) === 'M') {
                rot = rot.substring(1);
                result.mirrored = true;
            }
            if (rot.charAt(0) === 'R') {
                rot = rot.substring(1);
                result.angle = Number(rot);
            }
        }
        return result;
    }
    EagleBRD.prototype.getLayer = function(numberOrName) {
        var that = this;
        return that.$layers && that.$layers[numberOrName+""];
    }
    EagleBRD.prototype.getLayerNumber = function(numberOrName) {
        var that = this;
        var layer = that.$layers && that.$layers[numberOrName+""];
        return layer ? layer.number : numberOrName;
    }
    EagleBRD.prototype.getLibrary = function(name) {
        var that = this;
        return that.$libraries[name];
    }
    EagleBRD.prototype.getPackage = function(libname, pkgname) {
        var that = this;
        var library = that.getLibrary(libname);
        return library && library.packages && library.packages[pkgname];
    }
    EagleBRD.prototype.getPlain = function() {
        var that = this;
        return that.$plain;
    }
    EagleBRD.prototype.getElements = function() {
        var that = this;
        return that.$elements;
    }
    EagleBRD.prototype.layerRectangles = function(layer, options) {
        var that = this;
        var layerNumber = that.getLayerNumber(layer);
        opions = options || {};
        var rectangles = [];
        for (var iRect = 0; iRect < that.$plain.rectangle.length; iRect++) {
            var rectangle = that.$plain.rectangle[iRect];
            if (rectangle.layer === layerNumber) {
                var x1 = Number(rectangle.x1);
                var y1 = Number(rectangle.y1);
                var x2 = Number(rectangle.x2);
                var y2 = Number(rectangle.y2);
                rectangles.push({
                    x: (x1 + x2) / 2, // centroid
                    y: (y1 + y2) / 2, // centroid
                    w: x2 - x1,
                    h: y2 - y1,
                    angle: 0,
                });
            }
        }
        var eltNames = Object.keys(that.$elements);
        for (var iKey = 0; iKey < eltNames.length; iKey++) {
            var key = eltNames[iKey];
            var element = that.$elements[key];
            var pkg = element && that.getPackage(element.library, element.package);
            if (pkg) {
                var eltx = Number(element.x);
                var elty = Number(element.y);
                var erot = element.rot || "R0";
                var eangle = Number(erot.substring(1));
                for (var iRect = 0; iRect < pkg.rectangle.length; iRect++) {
                    var rectangle = pkg.rectangle[iRect];
                    if (rectangle.layer === layerNumber) {
                        var x1 = Number(rectangle.x1);
                        var y1 = Number(rectangle.y1);
                        var x2 = Number(rectangle.x2);
                        var y2 = Number(rectangle.y2);
                        rectangles.push({
                            x: eltx + (x1 + x2) / 2, // centroid
                            y: elty + (y1 + y2) / 2, // centroid
                            w: x2 - x1,
                            h: y2 - y1,
                            angle: eangle,
                        });
                    }
                }
            } else {
                console.log("Element", element.name, " refers to unknown package", element.package, "in library", element.library);
            }
        }

        return rectangles;
    }
    EagleBRD.prototype.layerSMDs = function(layer, options) {
        var that = this;
        var layerNumber = that.getLayerNumber(layer);
        opions = options || {};
        var smds = [];
        for (var iSMD = 0; iSMD < that.$plain.smd.length; iSMD++) {
            var smd = that.$plain.smd[iSMD];
            if (smd.layer === layerNumber) {
                var x = Number(smd.x);
                var y = Number(smd.y);
                var dx = Number(smd.dx);
                var dy = Number(smd.dy);
                var roundness = Number(smd.roundness) || 0;
                smds.push({
                    element: "",
                    name: smd.name,
                    roundness: roundness,
                    x: x,
                    y: y,
                    w: dx,
                    h: dy,
                    angle: eangle,
                });
            }
        }
        var eltNames = Object.keys(that.$elements);
        for (var iKey = 0; iKey < eltNames.length; iKey++) {
            var key = eltNames[iKey];
            var element = that.$elements[key];
            var erot = EagleBRD.parseROT(element.rot);
            var pkg = element && that.getPackage(element.library, element.package);
            if (pkg) {
                var eltx = Number(element.x);
                var elty = Number(element.y);
                var trans = new Trans2D();
                erot.mirrored && trans.mirrorY();
                trans.rotate(erot.angle);
                trans.translate(eltx, elty);
                for (var iSMD = 0; iSMD < pkg.smd.length; iSMD++) {
                    var smd = pkg.smd[iSMD];
                    if (!erot.mirrored && smd.layer === layerNumber ||
                        erot.mirrored && smd.layer === LAYERTOP && layerNumber === LAYERBOT) {
                        var x = Number(smd.x);
                        var y = Number(smd.y);
                        var dx = Number(smd.dx);
                        var dy = Number(smd.dy);
                        var roundness = Number(smd.roundness) || 0;
                        var xy = trans.apply(x, y); // translated and rotated centroid
                        smds.push({
                            element: element.name,
                            name: smd.name,
                            roundness: roundness,
                            x: xy.x,
                            y: xy.y,
                            w: dx,
                            h: dy,
                            angle: erot.angle,
                        });
                    }
                }
            } else {
                console.log("Element", element.name, " refers to unknown package", element.package, "in library", element.library);
            }
        }

        return smds;
    }
    EagleBRD.prototype.layerWires = function(layer) {
        var that = this;
        var layerNumber = that.getLayerNumber(layer);
        var wires = [];
        for (var iRect = 0; iRect < that.$plain.wire.length; iRect++) {
            var wire = that.$plain.wire[iRect];
            if (wire.layer === layerNumber) {
                wires.push({
                    x1: wire.x1,
                    y1: wire.y1,
                    x2: wire.x2,
                    y2: wire.y2,
                    width: wire.width,
                });
            }
        }
        var eltNames = Object.keys(that.$elements);
        for (var iKey = 0; iKey < eltNames.length; iKey++) {
            var key = eltNames[iKey];
            var element = that.$elements[key];
            var package = element && that.getPackage(element.library, element.package);
            if (package) {
                for (var iRect = 0; iRect < package.wire.length; iRect++) {
                    var wire = package.wire[iRect];
                    if (wire.layer === layer) {
                        wires.push({
                            x1: wire.x1,
                            y1: wire.y1,
                            x2: wire.x2,
                            y2: wire.y2,
                            width: wire.width,
                            rot: element.rot,
                        });
                    }
                }
            } else {
                console.log("Element", element.name, " refers to unknown package", element.package, "in library", element.library);
            }
        }

        return wires;
    }

    module.exports = exports.EagleBRD = EagleBRD;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("EagleBRD", function() {
    var EagleBRD = exports.EagleBRD; // require("./EagleBRD");
    var EAGLE_BEGIN = '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<!DOCTYPE eagle SYSTEM "eagle.dtd">\n' +
        '<eagle version="6.4">\n' +
        '<drawing>\n' +
        '<settings>\n' +
        '<setting alwaysvectorfont="yes"/>\n' +
        '<setting verticaltext="up"/>\n' +
        '</settings>\n' +
        '<grid distance="0.01" unitdist="inch" unit="inch" style="lines" multiple="1" ' +
        'display="yes" altdistance="0.0001" altunitdist="inch" altunit="inch"/>\n';
    var EAGLE_END = '</drawing>\n' +
        '</eagle>\n';
    var xml = EAGLE_BEGIN +
        '<layers>\n' +
        '\t<layer number="1" name="Top" color="4" fill="1" visible="yes" active="yes"/>\n' +
        '\t<layer number="16" name="Bottom" color="1" fill="1" visible="yes" active="yes"/>\n' +
        '\t<layer number="20" name="Dimension" color="15" fill="1" visible="yes" active="yes"/>\n' +
        '\t<layer number="21" name="tPlace" color="7" fill="1" visible="yes" active="yes"/>\n' +
        '\t<layer number="22" name="bPlace" color="7" fill="1" visible="yes" active="yes"/>\n' +
        '</layers>\n' +
        '<board>\n' +
        '\t<plain>\n' +
        '\t\t<wire x1="0" y1="0" x2="0" y2="25.4" width="0" layer="20"/>\n' +
        '\t\t<wire x1="0" y1="25.4" x2="154.94" y2="25.4" width="0" layer="20"/>\n' +
        '\t\t<wire x1="154.94" y1="25.4" x2="154.94" y2="0" width="0" layer="20"/>\n' +
        '\t\t<wire x1="154.94" y1="0" x2="0" y2="0" width="0" layer="20"/>\n' +
        '\t\t<rectangle x1="1.524" y1="17.5768" x2="10.922" y2="17.9832" layer="29"/>\n' +
        '\t\t<text x="24.13" y="11.43" size="1.016" layer="21" ratio="10" rot="R90">0201(0603)\n0402(1005)\n0603(1608)\n0805(2012)</text>\n' +
        '\t</plain>\n' +
        '\t<libraries>\n' +
        '\t\t<library name="Reference Ruler">\n' +
        '\t\t\t<packages>\n' +
        '\t\t\t\t<package name="0201">\n' +
        '\t\t\t\t\t<smd name="P$1" x="-0.3" y="0" dx="0.3" dy="0.3" layer="1"/>\n' +
        '\t\t\t\t\t<smd name="P$2" x="0.3" y="0" dx="0.3" dy="0.3" layer="1"/>\n' +
        '\t\t\t\t</package>\n' +
        '\t\t\t\t<package name="0402">\n' +
        '\t\t\t\t\t<smd name="1" x="-0.5" y="0" dx="0.5" dy="0.6" layer="1"/>\n' +
        '\t\t\t\t\t<smd name="2" x="0.5" y="0" dx="0.5" dy="0.6" layer="1"/>\n' +
        '\t\t\t\t\t<rectangle x1="-0.1999" y1="-0.3" x2="0.1999" y2="0.3" layer="35"/>\n' +
        '\t\t\t\t\t<wire x1="-0.1" y1="0.2" x2="0.1" y2="0.2" width="0.15" layer="21"/>\n' +
        '\t\t\t\t\t<wire x1="-0.1" y1="-0.2" x2="0.1" y2="-0.2" width="0.15" layer="21"/>\n' +
        '\t\t\t\t</package>\n' +
        '\t\t\t</packages>\n' +
        '\t\t</library>\n' +
        '\t</libraries>\n' +
        '\t<elements>\n' +
        '\t\t<element name="E$16" library="Reference Ruler" package="0201" value="" x="19.05" y="10.4648" rot="R90"/>\n' +
        '\t\t<element name="E$23" library="Reference Ruler" package="0402" value="" x="20.574" y="10.16" rot="R90"/>\n' +
        '\t\t<element name="E$71" library="Reference Ruler" package="0201" value="" x="19.05" y="10.4648" rot="MR90"/>\n' +
        '\t</elements>\n' +
        '</board>\n' +
        EAGLE_END;
    var e = 0.000000000001;
    it("EagleBRD(brd) parses the given Eagle BRD string", function() {
        var brd = new EagleBRD(xml);
        var root = brd.dom.documentElement;
        root.getAttribute("version").should.equal("6.4");
        var settings = root.getElementsByTagName("settings");
        settings.length.should.equal(1);
        var settings = root.getElementsByTagName("setting");
        settings.length.should.equal(2);
        settings.item(0).getAttribute("alwaysvectorfont").should.equal("yes");
        settings.item(1).getAttribute("verticaltext").should.equal("up");
        var layers = root.getElementsByTagName("layer");
        layers.length.should.equal(5);
    })
    it("getLayer(numberOrName) returns specified layer", function() {
        var brd = new EagleBRD(xml);
        brd.getLayer("21").should.properties({
            number: "21",
            name: "tPlace",
            color: "7",
            fill: "1",
            visible: "yes",
            active: "yes",
        });
        should.deepEqual(brd.getLayer("21"), brd.getLayer("tPlace"));
    });
    it("getLibrary(name) returns specified library", function() {
        var brd = new EagleBRD(xml);
        var lib = brd.getLibrary("Reference Ruler");
        lib.should.properties({
            name: "Reference Ruler",
        });
        lib.packages.should.properties(["0201", "0402"]);
        should.deepEqual(lib.packages["0201"], {
            name: "0201",
            rectangle: [],
            wire: [],
            smd: [{
                name: "P$1",
                x: "-0.3",
                y: "0",
                dx: "0.3",
                dy: "0.3",
                layer: "1",
            }, {
                name: "P$2",
                x: "0.3",
                y: "0",
                dx: "0.3",
                dy: "0.3",
                layer: "1",
            }],
        });
    })
    it("getPackage(libname,pkgname) returns specified package", function() {
        var brd = new EagleBRD(xml);
        should.deepEqual(brd.getPackage("Reference Ruler", "0402"), {
            name: "0402",
            rectangle: [{
                x1: "-0.1999",
                y1: "-0.3",
                x2: "0.1999",
                y2: "0.3",
                layer: "35",
            }],
            smd: [{
                dx: "0.5",
                dy: "0.6",
                layer: "1",
                name: "1",
                x: "-0.5",
                y: "0",
            }, {
                dx: "0.5",
                dy: "0.6",
                layer: "1",
                name: "2",
                x: "0.5",
                y: "0",
            }],
            wire: [{
                x1: "-0.1",
                y1: "0.2",
                x2: "0.1",
                y2: "0.2",
                width: "0.15",
                layer: "21",
            }, {
                x1: "-0.1",
                y1: "-0.2",
                x2: "0.1",
                y2: "-0.2",
                width: "0.15",
                layer: "21",
            }],
        });
    })
    it("getPlain() returns parsed board plain element", function() {
        var brd = new EagleBRD(xml);
        should.deepEqual(brd.getPlain(), {
            rectangle: [{
                layer: "29",
                x1: "1.524",
                y1: "17.5768",
                x2: "10.922",
                y2: "17.9832",
            }],
            smd:[],
            text: [{
                layer: "21",
                ratio: "10",
                rot: "R90",
                size: "1.016",
                x: "24.13",
                y: "11.43",
                text: "0201(0603)\n0402(1005)\n0603(1608)\n0805(2012)",
            }],
            wire: [{
                x1: "0",
                y1: "0",
                x2: "0",
                y2: "25.4",
                width: "0",
                layer: "20",
            },{
                x1: "0",
                y1: "25.4",
                x2: "154.94",
                y2: "25.4",
                width: "0",
                layer: "20",
            },{
                x1: "154.94",
                y1: "25.4",
                x2: "154.94",
                y2: "0",
                width: "0",
                layer: "20",
            },{
                x1: "154.94",
                y1: "0",
                x2: "0",
                y2: "0",
                width: "0",
                layer: "20",
            }],
        });
    })
    it("getElements() returns parsed board elements", function() {
        var brd = new EagleBRD(xml);
        should.deepEqual(brd.getElements(), {
            E$16: {
                library: "Reference Ruler",
                name: "E$16",
                package: "0201",
                rot: "R90",
                x: "19.05",
                y: "10.4648",
            },
            E$23: {
                library: "Reference Ruler",
                name: "E$23",
                package: "0402",
                rot: "R90",
                x: "20.574",
                y: "10.16",
            },
            E$71: {
                library: "Reference Ruler",
                name: "E$71",
                package: "0201",
                rot: "MR90",
                x: "19.05",
                y: "10.4648",
            },
        });
    })
    it("layerRectangles(layer) returns rectangles in layer", function() {
        var brd = new EagleBRD(xml);
        var r29 = brd.layerRectangles("29");
        r29.length.should.equal(1);
        r29[0].w.should.approximately(9.398, e);
        r29[0].h.should.approximately(0.4064, e);
        r29[0].x.should.approximately(6.223, e);
        r29[0].y.should.approximately(17.78, e);
        r29[0].angle.should.equal(0);
        var r35 = brd.layerRectangles("35");
        r35[0].w.should.approximately(0.3998, e);
        r35[0].h.should.approximately(0.6, e);
        r35[0].x.should.approximately(20.574, e);
        r35[0].y.should.approximately(10.16, e);
        r35[0].angle.should.equal(90);
    })
    it("layerSMDs(layer) returns SMD pads in layer", function() {
        var brd = new EagleBRD(xml);
        var topSMDs = brd.layerSMDs("Top");
        topSMDs.length.should.equal(4);
        topSMDs[0].name.should.equal("P$1");
        topSMDs[0].element.should.equal("E$16");
        topSMDs[0].angle.should.equal(90);
        topSMDs[0].roundness.should.equal(0);
        topSMDs[0].w.should.approximately(0.3, e);
        topSMDs[0].h.should.approximately(0.3, e);
        topSMDs[0].x.should.approximately(19.05, e);
        topSMDs[0].y.should.approximately(10.7648, e);
        topSMDs[1].name.should.equal("P$2");
        topSMDs[1].roundness.should.equal(0);
        topSMDs[1].w.should.approximately(0.3, e);
        topSMDs[1].h.should.approximately(0.3, e);
        topSMDs[1].x.should.approximately(19.05, e);
        topSMDs[1].y.should.approximately(10.1648, e);
        topSMDs[1].angle.should.equal(90);
        topSMDs[2].name.should.equal("1");
        topSMDs[2].roundness.should.equal(0);
        topSMDs[2].w.should.approximately(0.5, e);
        topSMDs[2].h.should.approximately(0.6, e);
        topSMDs[2].x.should.approximately(20.574, e);
        topSMDs[2].y.should.approximately(10.66, e);
        topSMDs[2].angle.should.equal(90);
        topSMDs[3].name.should.equal("2");
        topSMDs[3].roundness.should.equal(0);
        topSMDs[3].w.should.approximately(0.5, e);
        topSMDs[3].h.should.approximately(0.6, e);
        topSMDs[3].x.should.approximately(20.574, e);
        topSMDs[3].y.should.approximately(9.66, e);
        topSMDs[3].angle.should.equal(90);
        var botSMDs = brd.layerSMDs("Bottom");
        botSMDs.length.should.equal(2);
        botSMDs[0].name.should.equal("P$1");
        botSMDs[0].element.should.equal("E$71");
        botSMDs[0].angle.should.equal(90);
        botSMDs[0].roundness.should.equal(0);
        botSMDs[0].w.should.approximately(0.3, e);
        botSMDs[0].h.should.approximately(0.3, e);
        botSMDs[0].x.should.approximately(19.05, e);
        botSMDs[0].y.should.approximately(10.1648, e);
        botSMDs[1].name.should.equal("P$2");
        botSMDs[1].element.should.equal("E$71");
        botSMDs[1].angle.should.equal(90);
        botSMDs[1].roundness.should.equal(0);
        botSMDs[1].w.should.approximately(0.3, e);
        botSMDs[1].h.should.approximately(0.3, e);
        botSMDs[1].x.should.approximately(19.05, e);
        botSMDs[1].y.should.approximately(10.7648, e);
    })
    it("parseROT(rot) parses rot attribute", function() {
        should.deepEqual(EagleBRD.parseROT(null), {
            mirrored: false,
            angle: 0,
        });
        should.deepEqual(EagleBRD.parseROT("R32"), {
            mirrored: false,
            angle: 32,
        });
    })
    it("layerWires(layer) returns wires in layer", function() {
        var brd = new EagleBRD(xml);
        var w20 = brd.layerWires("Dimension");
        w20.length.should.equal(4);
        should.deepEqual(w20[0], {
            x1: "0",
            x2: "0",
            y1: "0",
            y2: "25.4",
            width: "0",
        });
        should.deepEqual(brd.layerWires("21"), [{
            rot: "R90",
            x1: "-0.1",
            y1: "0.2",
            x2: "0.1",
            y2: "0.2",
            width: "0.15",
        }, {
            rot: "R90",
            x1: "-0.1",
            y1: "-0.2",
            x2: "0.1",
            y2: "-0.2",
            width: "0.15",
        }]);
    })
})
