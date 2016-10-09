var should = require("should");
var DOMParser = require("xmldom").DOMParser;

(function(exports) {
    function parseLayers(that) {
        var root = that.dom.documentElement;
        var layers = root.getElementsByTagName("layer");
        that.$layers = {};
        for (var i=0; i < layers.length; i++) {
            var layer = layers.item(i);
            var number = layer.getAttribute("number");
            var name = layer.getAttribute("name");
            //console.log("layer number:"+number, "name:"+name);
            that.$layers[number] = that.$layers[name] = {
                number: number,
                name: name,
                color: layer.getAttribute("color"),
                fill: layer.getAttribute("fill"),
                visible: layer.getAttribute("visible") || "yes",
                active: layer.getAttribute("active") || "active",
            };
        }
    }//parseLayers
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
    }//parseWires
    function parseRectangles(that, domparent) {
        var domrectangles = domparent.getElementsByTagName("rectangle");
        var rectangles = [];
        for (var iRect = 0; iRect < domrectangles.length; iRect++) {
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
    }//parseRectangles
    function parsePlain(that) {
        var root = that.dom.documentElement;
        var elts = root.getElementsByTagName("plain");
        var domplain = elts.length ? elts.item(0) : null;
        that.$plain = {};
        domplain && (that.$plain.rectangle = parseRectangles(that, domplain));
        domplain && (that.$plain.wire = parseWires(that, domplain));
        return that;
    }//parsePlain
    function parseLibraries(that) {
        var root = that.dom.documentElement;
        var libraries = root.getElementsByTagName("library");
        that.$libraries = {};
        for (var iLib=0; iLib < libraries.length; iLib++) {
            var library = libraries.item(iLib);
            var name = library.getAttribute("name");
            //console.log("library name:"+name);
            var dompackages = library.getElementsByTagName("package");
            var packages = {};
            for (var iPkg=0; iPkg<dompackages.length; iPkg++) {
                var dompackage = dompackages.item(iPkg);
                var pkgname = dompackage.getAttribute("name");
                var domsmds = dompackage.getElementsByTagName("smd");
                var smds = [];
                for (var iSMD = 0; iSMD < domsmds.length; iSMD++) {
                    var domsmd = domsmds.item(iSMD);
                    var smdname = domsmd.getAttribute("name");
                    smds.push({
                        name:smdname,
                        x: domsmd.getAttribute("x"),
                        y: domsmd.getAttribute("y"),
                        dx: domsmd.getAttribute("dx"),
                        dy: domsmd.getAttribute("dy"),
                        layer: domsmd.getAttribute("layer"),
                    });
                }
                packages[pkgname] = {
                    name: pkgname,
                    smd: smds,
                    rectangle: parseRectangles(that, dompackage),
                    wire: parseWires(that, dompackage),
                };
            }
            that.$libraries[name] = {
                name: name,
                packages: packages,
            };
        }
        return that;
    }// parseLibraries

    ////////////////// constructor
    function EagleBRD(brd,options) {
        var that = this;

        options = options || {};
        var parser = new DOMParser();
        that.dom = parser.parseFromString(brd);
        parsePlain(that);
        parseLayers(that);
        parseLibraries(that);

        return that;
    }
    EagleBRD.prototype.getLayer = function(numberOrName) {
        var that = this;
        return that.$layers && that.$layers[numberOrName];
    }
    EagleBRD.prototype.getLibrary = function(name) {
        var that = this;
        return that.$libraries && that.$libraries[name];
    }
    EagleBRD.prototype.getPackage = function(libname,pkgname) {
        var that = this;
        var library = that.getLibrary(libname);
        return library && library.packages && library.packages[pkgname];
    }
    EagleBRD.prototype.getPlain = function() {
        var that = this;
        return that.$plain;
    }

    module.exports = exports.EagleBRD = EagleBRD;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("EagleBRD", function() {
    var EagleBRD = exports.EagleBRD; // require("./EagleBRD");
    var EAGLE_BEGIN = '<?xml version="1.0" encoding="utf-8"?>\n'+
        '<!DOCTYPE eagle SYSTEM "eagle.dtd">\n'+
        '<eagle version="6.4">\n'+
        '<drawing>\n'+
        '<settings>\n'+
        '<setting alwaysvectorfont="yes"/>\n'+
        '<setting verticaltext="up"/>\n'+
        '</settings>\n'+
        '<grid distance="0.01" unitdist="inch" unit="inch" style="lines" multiple="1" '+
            'display="yes" altdistance="0.0001" altunitdist="inch" altunit="inch"/>\n';
    var EAGLE_END = '</drawing>\n' +
        '</eagle>\n';
    var xml = EAGLE_BEGIN + 
        '<layers>\n' +
        '\t<layer number="21" name="tPlace" color="7" fill="1" visible="yes" active="yes"/>\n' +
        '\t<layer number="22" name="bPlace" color="7" fill="1" visible="yes" active="yes"/>\n' +
        '</layers>\n' +
        '<board>\n'+
        '\t<plain>\n'+
        '\t\t<rectangle x1="1.524" y1="17.5768" x2="10.922" y2="17.9832" layer="29"/>\n'+
        '\t\t<wire x1="0" y1="0" x2="0" y2="25.4" width="0" layer="20"/>\n'+
        '\t</plain>\n'+
        '\t<libraries>\n'+
        '\t\t<library name="Reference Ruler">\n'+
        '\t\t\t<packages>\n'+
        '\t\t\t\t<package name="0201">\n'+
        '\t\t\t\t\t<smd name="P$1" x="-0.3" y="0" dx="0.3" dy="0.3" layer="1"/>\n'+
        '\t\t\t\t\t<smd name="P$2" x="0.3" y="0" dx="0.3" dy="0.3" layer="1"/>\n'+
        '\t\t\t\t</package>\n'+
        '\t\t\t\t<package name="0402">\n'+
        '\t\t\t\t\t<smd name="1" x="-0.5" y="0" dx="0.5" dy="0.6" layer="1"/>\n'+
        '\t\t\t\t\t<smd name="2" x="0.5" y="0" dx="0.5" dy="0.6" layer="1"/>\n'+
        '\t\t\t\t\t<rectangle x1="-0.1999" y1="-0.3" x2="0.1999" y2="0.3" layer="35"/>\n'+
        '\t\t\t\t\t<wire x1="-0.1" y1="0.2" x2="0.1" y2="0.2" width="0.15" layer="21"/>\n'+
        '\t\t\t\t\t<wire x1="-0.1" y1="-0.2" x2="0.1" y2="-0.2" width="0.15" layer="21"/>\n'+
        '\t\t\t\t</package>\n'+
        '\t\t\t</packages>\n'+
        '\t\t</library>\n'+
        '\t</libraries>\n'+
        '</board>\n'+
        EAGLE_END;
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
        layers.length.should.equal(2);
    })
    it("getLayer(numberOrName) returns specified layer", function() {
        var brd = new EagleBRD(xml);
        brd.getLayer("21").should.properties({
            number:"21",
            name:"tPlace",
            color:"7",
            fill:"1",
            visible:"yes",
            active:"yes",
        });
        should.deepEqual(brd.getLayer("21"),brd.getLayer("tPlace"));
    });
    it("getLibrary(name) returns specified library", function() {
        var brd = new EagleBRD(xml);
        var lib = brd.getLibrary("Reference Ruler");
        lib.should.properties({
            name:"Reference Ruler",
        });
        lib.packages.should.properties(["0201", "0402"]);
        should.deepEqual(lib.packages["0201"], {
            name: "0201",
            rectangle:[],
            wire:[],
            smd: [{ 
                name: "P$1",
                x:"-0.3", 
                y:"0", 
                dx:"0.3",
                dy:"0.3",
                layer: "1",
            },{
                name: "P$2",
                x:"0.3", 
                y:"0", 
                dx:"0.3",
                dy:"0.3",
                layer: "1",
            }],
        });
    })
    it("getPackage(libname,pkgname) returns specified package", function() {
        var brd = new EagleBRD(xml);
        should.deepEqual(brd.getPackage("Reference Ruler","0402"), {
            name: "0402",
            rectangle:[{
                x1:"-0.1999",
                y1:"-0.3",
                x2:"0.1999",
                y2:"0.3",
                layer:"35",
            }],
            smd: [{ 
                dx:"0.5",
                dy:"0.6",
                layer: "1",
                name: "1",
                x:"-0.5", 
                y:"0", 
            },{
                dx:"0.5",
                dy:"0.6",
                layer: "1",
                name: "2",
                x:"0.5", 
                y:"0", 
            }],
            wire:[{
                x1:"-0.1",
                y1:"0.2",
                x2:"0.1",
                y2:"0.2",
                width:"0.15",
                layer:"21",
            },{
                x1:"-0.1",
                y1:"-0.2",
                x2:"0.1",
                y2:"-0.2",
                width:"0.15",
                layer:"21",
            }],
        });
    })
    it("getPlain() returns parsed board plain element", function() {
        var brd = new EagleBRD(xml);
        should.deepEqual(brd.getPlain(), {
            rectangle: [{
                layer: "29",
                x1: "1.524",
                y1:"17.5768",
                x2:"10.922",
                y2:"17.9832",
            }],
            wire:[{
                x1:"0",
                y1:"0",
                x2:"0",
                y2:"25.4",
                width:"0",
                layer:"20",
           }],
        });
    })
})
