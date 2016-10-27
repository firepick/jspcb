const EagleBRD = require("./eaglebrd");
const Gerber = require("./gerber");
const PcbSvgFactory = require("./pcbsvg");
//const fs = require("pn/fs"); // https://www.npmjs.com/package/pn
const fs = require("fs");
const svg2png = require("svg2png");
const LogString = require("./logstring");
const LogFile = require("./logfile");

(function(exports) {
    function PcbTransform(options) {
        var that = this;

        options = options || {};
        that.verbose = options.verbose || false;
        that.writer = options.writer || console;
        that.eagle = options.eagle || {
            path: null,
            layer: "Top",
            show: "SMD",
        };
        that.gerberLayers = options.gerberLayers || {};
        that.units = options.units || 1;
        that.bounds = options.bounds || {
            l: 0,
            t: null,
            r: null,
            b: 0,
        };
        that.bounds.l && (that.bounds.l *= that.units);
        that.bounds.t && (that.bounds.t *= that.units);
        that.bounds.r && (that.bounds.r *= that.units);
        that.bounds.b && (that.bounds.b *= that.units);
        that.layers = options.layers || {
            Top: true
        };
        that.csv = options.csv || {};
        that.colors = options.colors || {
            "board": "#000",
            "outline": "#000",
            "pad": "#fff",
            "text": "#444",
            "hole": "#000"
        };
        that.png = options.png || {
            path: null,
            width: 800,
            height: null,
        };
        that.svg = options.svg || { 
            path: null,
        };

        return that;
    }

    PcbTransform.prototype.transform = function() {
        var that = this;
        // inputs
        var eagle = that.eagle || {};
        if (eagle.path) {
            that.readEagleBrd(eagle.path);
        } 
        var gerberLayers = that.gerberLayers;
        if (gerberLayers && Object.keys(gerberLayers).length) {
            that.readGerber(gerberLayers);
        } 

        // outputs
        var svg = that.svg || {};
        if (svg.path) {
            var writer = new LogFile(svg.path);
            that.writeSvg(writer);
            writer.close();
        }
        var csv = that.csv || {};
        if (csv.smdpads) {
            var writer = new LogFile(csv.smdpads);
            that.writeCsvSmdPads(writer);
            writer.close();
        }
        if (csv.holes) {
            var writer = new LogFile(csv.holes);
            that.writeCsvHoles(writer);
            writer.close();
        }
        var png = that.png || {};
        if (png.path) {
            that.writePng();
        }
    }
    PcbTransform.prototype.log = function() {
        var that = this;
        that.writer.log.apply(that.writer, arguments);
    }
    PcbTransform.prototype.version = function() {
        var pkg = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));
        return pkg && pkg.version ? pkg.version : 'unknown';
    }

    PcbTransform.prototype.eagleBrdToSvg = function(brd, smds, holes, options) {
        var that = this;
        options = options || {};
        var writer = options.writer || that.writer;
        var bounds = brd.bounds;
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        var layerNumber = brd.getLayerNumber(options.layer);
        var layerPad = brd.isBottomLayer(layerNumber) ? "16" : "1";
        var layerSilk = brd.isBottomLayer(layerNumber) ? "22" : "21";

        new PcbSvgFactory(that.options).create(writer, {
            dimWires: brd.pcbWires("Dimension"),
            bounds: bounds,
            smds: smds,
            holes: holes,
            texts: brd.pcbText(layerSilk),
        });
    }
    PcbTransform.prototype.readEagleBrd = function(path) {
        var that = this;
        data = fs.readFileSync(path);
        that.eagleBrd = new EagleBRD(data.toString());
    }
    PcbTransform.prototype.readGerber = function(layerFiles) {
        var that = this;
        var layerKeys = Object.keys(layerFiles);
        var grb = that.gerber = new Gerber();
        for (var iLayer = 0; iLayer < layerKeys.length; iLayer++) {
            var key = layerKeys[iLayer];
            var id = key.toUpperCase();
            var path = layerFiles[key];
            that.verbose && that.log("loading Gerber", id, "file:" + path);
            var data = fs.readFileSync(path);
            that.verbose && that.log("processGerber() id:" + id, "path:" + path);
            var layer = grb.parseLayer(id, data);
            that.verbose && that.log("graphics:" + (layer.graphics.length));
        }
    }
    PcbTransform.prototype.pcbArcs = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        if (pcb == null) {
            throw new Error("No PCB files have been specified.");
        }
        return pcb && pcb.pcbArcs(layerSpec) || [];
    }
    PcbTransform.prototype.pcbHoles = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        if (pcb == null) {
            throw new Error("No PCB files have been specified.");
        }
        return pcb && pcb.pcbHoles(layerSpec) || [];
    }
    PcbTransform.prototype.pcbPads = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        if (pcb == null) {
            throw new Error("No PCB files have been specified.");
        }
        return pcb && pcb.pcbPads(layerSpec) || [];
    }
    PcbTransform.prototype.pcbWires = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        return pcb && pcb.pcbWires(layerSpec) || [];
    }
    PcbTransform.prototype.writePng = function() {
        var that = this;
        var pngPath = that.png.path || "pcb.png";
        var svgWriter = new LogString();
        that.writeSvg(svgWriter);
        var bufsvg = new Buffer(svgWriter.output);
        var width = that.png.width || 800;
        var bufpng = svg2png.sync(bufsvg, { 
            width: width
        });
        that.verbose && console.log("Created PNG:"+pngPath, 
            "bytes:"+bufpng.length, "width:"+width);
        fs.writeFileSync(pngPath, bufpng);
    }
    PcbTransform.prototype.writeCsvSmdPads = function(writer) {
        var that = this;
        var smds = that.pcbPads();
        writer.log("#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS");
        for (var iSMD = 0; iSMD < smds.length; iSMD++) {
            var smd = smds[iSMD];
            writer.log(iSMD + 1 + "," +
                (smd.element || "") + "," +
                (smd.package || "") + "," +
                (smd.name || "") + ", " +
                smd.x + ", " +
                smd.y + ", " +
                smd.width + ", " +
                smd.height + ", " +
                (smd.angle || 0) + ", " +
                (smd.roundness || 0) +
                "");
        }
    }
    PcbTransform.prototype.writeCsvHoles = function(writer) {
        var that = this;
        var holes = that.pcbHoles();
        writer.log("#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL");
        for (var iHole = 0; iHole < holes.length; iHole++) {
            var hole = holes[iHole];
            writer.log(iHole + 1 + "," +
                (hole.element || "") + "," +
                (hole.package || "") + "," +
                (hole.name || "") + ", " +
                hole.x + ", " +
                hole.y + ", " +
                hole.r * 2 +
                "");
        }
    }
    PcbTransform.prototype.writeSvg = function(writer) {
        var that = this;
        var writer = writer || that.writer;
        if (that.gerber) {
            new PcbSvgFactory().create(writer, {
                smds: that.pcbPads(),
                arcs: that.pcbArcs(),
                holes: that.pcbHoles(),
                copperWires: that.pcbWires("GTL"),
                silkWires: that.pcbWires("GTO"),
                dimWires: that.pcbWires("GKO"),
                colors: that.colors,
                bounds: that.bounds,
            });
        } else if (that.eagleBrd) {
            var brd = that.eagleBrd;
            var eagleOpts = {
                writer: writer,
                layers: that.layers,
            };
            that.eagleBrdToSvg(brd, that.pcbPads(that.layer), that.pcbHoles(), eagleOpts);
        }
    }

    module.exports = exports.PcbTransform = PcbTransform;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("PcbTransform", function() {
    var should = require("should");
    var PcbTransform = exports.PcbTransform; // require("./PcbTransform");

    it("PcbTransform(options) creates a PCB data transformer", function() {
        var slog = new LogString();
        var pcbTrans = new PcbTransform({
            verbose: true,
            writer: slog,
        });
        pcbTrans.verbose.should.equal(true);
        pcbTrans.writer.should.equal(slog);
    })
    it("readEagleBrd(path) reads Eagle BRD file ", function() {
        var pcbTrans = new PcbTransform({
            verbose: false
        });
        pcbTrans.readEagleBrd("../eagle/test.brd");
        var pads = pcbTrans.pcbPads();
        pads.length.should.equal(4);
    });
    it("readGerber(layerFiles) reads Gerber files ", function() {
        var pcbTrans = new PcbTransform({
            verbose: false
        });
        pcbTrans.readGerber({
            GKO: "../gerber/ruler/Ruler.GKO",
            GTP: "../gerber/ruler/Ruler.GTP",
        });
        var pads = pcbTrans.pcbPads();
        pads.length.should.equal(166);
    });
    it("writeSvg(writer) writes SVG files for EagleBRD", function() {
        var slog = new LogString();
        var pcbTrans = new PcbTransform({
            colors: {
                smdpads: "#ff0",
            },
            layers: {
                Top: true,
            },
        });
        pcbTrans.readEagleBrd("../eagle/test.brd");
        pcbTrans.writeSvg(slog);
        var svgLines = slog.output.trim().split("\n");
        svgLines.length.should.equal(22);
        svgLines[0].should.equal('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
        svgLines[1].should.equal('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ' +
            'width="154.94mm" height="25.4mm" viewbox=" 0 -25.4 154.94 25.4 " >');
        svgLines[2].should.equal('<g stroke-linecap="round" stroke-width="0.25">');
        svgLines[3].should.equal('<rect x="0" y="0" width="154.94" height="25.4" ' +
            'transform="scale(1,-1)" fill="#ddf"/><!--dimension-->');
        svgLines[4].should.equal('<g stroke="#f0f" fill="none" stroke-width="0.2" transform="scale(1,-1)"><!--dimension-->');
        svgLines[5].should.equal('<polyline points="0 0 0 25.4 154.94 25.4 154.94 0 0 0"/>');
    });
    it("writeCsvSmdPads(writer) writes CSV SMD pads for EagleBRD", function() {
        var pcbTrans = new PcbTransform();
        pcbTrans.readEagleBrd("../eagle/test.brd");
        var smdpads = new LogString();
        pcbTrans.writeCsvSmdPads(smdpads);
        var outPads = smdpads.output.trim().split("\n");
        outPads.length.should.equal(5);
        outPads[0].should.equal('#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS');
        outPads[1].should.equal('1,E$16,0201,P$1, 19.05, 10.764800000000001, 0.3, 0.3, 90, 0');
        outPads[2].should.equal('2,E$16,0201,P$2, 19.05, 10.1648, 0.3, 0.3, 90, 0');
        outPads[3].should.equal('3,E$23,0402,1, 20.574, 10.66, 0.5, 0.6, 90, 0');
        outPads[4].should.equal('4,E$23,0402,2, 20.574, 9.66, 0.5, 0.6, 180, 0');
    });
    it("writeCsvHoles(writer) writes CSV holes for EagleBRD", function() {
        var pcbTrans = new PcbTransform();
        pcbTrans.readEagleBrd("../eagle/test.brd");
        var holes = new LogString();
        pcbTrans.writeCsvHoles(holes);
        var outHoles = holes.output.trim().split("\n");
        outHoles.length.should.equal(2);
        outHoles[0].should.equal('#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL');
        outHoles[1].should.equal('1,E$46,ALL-HOLES,, 152.2235, 17.674, 3.26');
    });
    it("writeCsvSmdPads(writer) writes CSV SMD pads for Gerber files", function() {
        var pcbTrans = new PcbTransform();
        pcbTrans.readGerber({
            GKO: "../gerber/ruler/Ruler.GKO",
            GTP: "../gerber/ruler/Ruler.GTP",
            GTS: "../gerber/ruler/Ruler.GTS",
        });
        var csvPads = new LogString();
        pcbTrans.writeCsvSmdPads(csvPads);
        var padLines = csvPads.output.trim().split("\n");
        padLines.length.should.equal(167);
        padLines[0].should.equal('#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS');
        padLines[1].should.equal('1,,,D10, 44.449999999999996, 35.564826, 0.3048, 0.3048, 0, 0');
    });
    it("writeCsvHoles(writer) writes CSV holes for Gerber files", function() {
        var pcbTrans = new PcbTransform();
        pcbTrans.readGerber({
            GKO: "../gerber/ruler/Ruler.GKO",
            GTP: "../gerber/ruler/Ruler.GTP",
            GTS: "../gerber/ruler/Ruler.GTS",
        });
        var csvHoles = new LogString();
        pcbTrans.writeCsvHoles(csvHoles);
        var holeLines = csvHoles.output.trim().split("\n");
        holeLines.length.should.equal(22);
        holeLines[0].should.equal('#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL');
        holeLines[1].should.equal('1,,,D61, 161.23919999999998, 43.789092, 2.0574');
        holeLines[21].should.equal('21,,,D366, 137.668, 44.501562, 0.6096');
    });
    it("transform() writes PNG from Gerber", function() {
        var pngTmp = "/tmp/pcb.png";
        try {
            fs.statSync(pngTmp);
            fs.unlinkSync(pngTmp);
        } catch (e) {}
        var pcbTrans = new PcbTransform({
            colors: {
                copper: "#f00",
            },
            gerberLayers: {
                GKO: "../gerber/ruler/Ruler.GKO",
                GTP: "../gerber/ruler/Ruler.GTP",
                GTS: "../gerber/ruler/Ruler.GTS",
            },
            png: {
                path: pngTmp,
            }
        });
        pcbTrans.transform();
        var stats = fs.statSync(pngTmp);
        stats.size.should.equal(12049);
    });
})
