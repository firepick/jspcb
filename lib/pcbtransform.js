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
        that.verbose = options.verbose;
        that.writer = options.writer || console;
        that.precision = options.precision || 3;
        that.showBounds = options.showBounds;
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
        that.view = options.view || {};
        that.layers = options.layers || {
            Top: true
        };
        that.csv = options.csv || {};
        that.json = options.json || {};
        that.colors = options.colors || {
            "board": "#000",
            "copper": "#f80",
            "silkscreen": "#fff",
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

    PcbTransform.prototype.version = function() {
        var that = this;
        if (that.version == null) {
            var pkg = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));
            that.version = pkg && pkg.version ? pkg.version : 'unknown';
        }
        return that.version;
    }
    PcbTransform.prototype.pcbBounds = function() {
        var that = this;
        that.loadInputs();
        var brd = that.getPcb();
        var bounds = that.bounds;
        if (bounds.l == null || bounds.t == null || bounds.r == null || bounds.b == null) {
            bounds = brd.pcbBounds();
        }
        return bounds;
    }
    PcbTransform.prototype.loadInputs = function() {
        var that = this;
        if (that.eagle == null || that.gerber == null) {
            var eagle = that.eagle || {};
            if (eagle.path) {
                that.readEagleBrd(eagle.path);
            } 
            var gerberLayers = that.gerberLayers || {};
            if (Object.keys(gerberLayers).length) {
                that.readGerber(gerberLayers);
            } 
        }
        return that;
    }
    PcbTransform.prototype.transform = function() {
        var that = this;
        var p = new Promise(function(resolve, reject) {
            that.verbose && console.warn("BEGIN\t: PCB file transformation in progress...");
            that.loadInputs();

            // outputs
            if (that.showBounds) {
                that.writer.log(JSON.stringify(that.pcbBounds()));
            }
            that.verbose && console.warn("BOUNDS\t:", JSON.stringify(that.pcbBounds()));
            var svg = that.svg || {};
            var nWriters = 0;
            var nCloses = 0;
            if (svg.path) {
                var writer = new LogFile(svg.path);
                that.writeSvg(writer);
                nWriters++;
                writer.close().then(function() {
                    ++nCloses >= nWriters && resolve();
                });
                that.verbose && console.warn("SVG\t: generated SVG file", svg.path);
            }
            var json = that.json || {};
            if (json.path) {
                var writer = new LogFile(json.path);
                that.writeJson(writer, {
                    holes: json.holes,
                });
                nWriters++;
                writer.close().then(function() {
                    ++nCloses >= nWriters && resolve();
                });
                that.verbose && console.warn("JSON\t: generated JSON file", json.path);
            }
            var csv = that.csv || {};
            if (csv.smdpads) {
                var writer = new LogFile(csv.smdpads);
                that.writeCsvSmdPads(writer);
                nWriters++;
                writer.close().then(function() {
                    ++nCloses >= nWriters && resolve();
                });
                that.verbose && console.warn("CSV\t: generated SMD pad CSV file", csv.smdpads);
            }
            if (csv.holes) {
                var writer = new LogFile(csv.holes);
                that.writeCsvHoles(writer);
                nWriters++;
                writer.close().then(function() {
                    ++nCloses >= nWriters && resolve();
                });
                that.verbose && console.warn("CSV\t: generated hole CSV file", csv.holes);
            }
            var png = that.png || {};
            if (png.path) {
                png.width = png.width || 800;
                that.writePng();
                that.verbose && console.warn("PNG\t: generated PNG file", png.path, "width:"+png.width);
            }
            that.verbose && console.warn("END\t: Transform complete");
        });
        return p;
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
        var bounds = options.bounds || brd.bounds;
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        var layerNumber = brd.getLayerNumber(options.layer);
        var layerPad = brd.isBottomLayer(layerNumber) ? "16" : "1";
        var layerSilk = brd.isBottomLayer(layerNumber) ? "22" : "21";

        new PcbSvgFactory(that.options).writeDocument(writer, {
            dimWires: brd.pcbWires("Dimension"),
            view: options.view,
            bounds: bounds,
            smds: smds,
            holes: holes,
            texts: brd.pcbText(layerSilk),
        });
    }
    PcbTransform.prototype.readEagleBrd = function(path) {
        var that = this;
        data = fs.readFileSync(path);
        that.eagleBrd = new EagleBRD(data.toString(), {
            precision: that.precision,
        });
        that.verbose && console.warn("LOAD\t: Eagle file:"+path);
    }
    PcbTransform.prototype.readGerber = function(layerFiles) {
        var that = this;
        var layerKeys = Object.keys(layerFiles);
        var grb = that.gerber = new Gerber({
            precision: that.precision,
        });
        for (var iLayer = 0; iLayer < layerKeys.length; iLayer++) {
            var key = layerKeys[iLayer];
            var id = key.toUpperCase();
            var path = layerFiles[key];
            var data = fs.readFileSync(path);
            var layer = grb.parseLayer(id, data);
            var bounds = layer.bounds();
            that.verbose && console.warn("GERBER\t:", path, "loaded-as:"+id, 
                "graphics:" + (layer.graphics.length), 
                "l:"+bounds.l+" t:"+bounds.t+" r:"+bounds.r+" b:"+bounds.b);
        }
    }
    PcbTransform.prototype.getPcb = function() {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        if (pcb == null) {
            throw new Error("No PCB files have been specified.");
        }
        return pcb;
    }
    PcbTransform.prototype.pcbArcs = function(layerSpec) {
        var that = this;
        var pcb = that.getPcb();
        return pcb && pcb.pcbArcs(layerSpec) || [];
    }
    PcbTransform.prototype.pcbHoles = function(layerSpec) {
        var that = this;
        var pcb = that.getPcb();
        return pcb && pcb.pcbHoles(layerSpec) || [];
    }
    PcbTransform.prototype.pcbRects = function(layerSpec) {
        var that = this;
        var pcb = that.getPcb();
        return pcb && pcb.pcbRects(layerSpec) || [];
    }
    PcbTransform.prototype.pcbPads = function(layerSpec) {
        var that = this;
        var pcb = that.getPcb();
        return pcb && pcb.pcbPads(layerSpec) || [];
    }
    PcbTransform.prototype.pcbWires = function(layerSpec) {
        var that = this;
        var pcb = that.getPcb();
        return pcb && pcb.pcbWires(layerSpec) || [];
    }
    PcbTransform.prototype.writePng = function() {
        var that = this;
        var pngPath = that.png.path || "pcb.png";
        var svgWriter = new LogString();
        that.writeSvg(svgWriter);
        var bufsvg = new Buffer(svgWriter.output);
        var bufpng = svg2png.sync(bufsvg, { 
            width: that.png.width
        });
        fs.writeFileSync(pngPath, bufpng);
    }
    PcbTransform.prototype.writeJson = function(writer, options = {}) {
        var that = this;
        var brd = that.getPcb();
        var json = {
            bounds: brd.pcbBounds(),
            smdpads: that.pcbPads(),
        }
        options.holes && (json.holes = that.pcbHoles());
        writer.log(JSON.stringify(json, null, "    "));
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
            new PcbSvgFactory().writeDocument(writer, {
                smds: that.pcbPads(),
                arcs: that.pcbArcs(),
                holes: that.pcbHoles(),
                copperWires: that.pcbWires("GTL"),
                silkWires: that.pcbWires("GTO"),
                silkRects: that.pcbRects("GTO"),
                dimWires: that.pcbWires("GKO"),
                colors: that.colors,
                bounds: that.pcbBounds(),
                view: that.view,
            });
        } else if (that.eagleBrd) {
            var brd = that.eagleBrd;
            var eagleOpts = {
                writer: writer,
                layers: that.layers,
                bounds: that.pcbBounds(),
                view: that.view,
                colors: that.colors,
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
    var e = 0.000001;

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
    it("writeSvg(writer) writes SVG files for Gerber files", function() {
        var slog = new LogString();
        var pcbTrans = new PcbTransform({
            gerberLayer: {
                gko: "../gerber/ruler/Ruler.GKO",
                gto: "../gerber/ruler/Ruler.GTO",
            },
        });
        pcbTrans.readEagleBrd("../eagle/test.brd");
        pcbTrans.writeSvg(slog);
        var svgLines = slog.output.trim().split("\n");
        svgLines.length.should.equal(23);
        var i = 0;
        svgLines[i++].should.equal('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
        svgLines[i++].should.equal('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ' +
            'width="154.94mm" height="25.4mm" viewbox="0 -25.4 154.94 25.4 ">');
        i++;
        svgLines[i++].should.equal('<g stroke-linecap="round" stroke-width="0.2">');
        svgLines[i++].should.equal('<rect x="0" y="0" width="154.94" height="25.4" ' +
            'transform="scale(1,-1)" stroke="none" fill="#ddf"/><!--dimension-->');
        svgLines[i++].should.equal('<g stroke="#000" fill="none" stroke-width="0.1" transform="scale(1,-1)"><!--dimension-->');
        svgLines[i++].should.equal('<polyline points="0 0 0 25.4 154.94 25.4 154.94 0 0 0"/>');
        svgLines[i++].should.equal('</g><!--dimension-->');
        svgLines[i++].should.equal('<g fill="#888" font-family="monospace"><!--pcb text-->');

        //svgLines[11].should.equal('<polyline points="0 0 0 25.4 154.94 25.4 154.94 0 0 0"/>');
    });
    it("writeJson(writer, options) writes JSON description for EagleBRD", function() {
        var slog = new LogString();
        var pcbTrans = new PcbTransform({
            eagle: {
                path: "../eagle/test.brd",
            },
        });
        pcbTrans.loadInputs();
        pcbTrans.writeJson(slog);
        var json = JSON.parse(slog.output);
        json.bounds.should.properties({
            l:0,
            t:25.4,
            r:154.94,
            b:0,
            source: '20',
        });
        json.smdpads.length.should.equal(4);
        json.smdpads[0].should.properties({
            angle: 90,
            element: "E$16",
            height: 0.3,
            name: "P$1",
            package: "0201",
            roundness: 0,
            width: 0.3,
            x: 19.05,
            y: 10.765,
        });
    });
    it("transform() writes JSON description for EagleBRD", function() {
        var slog = new LogString();
        var outJson = "/tmp/jspcb.json";
        var pcbTrans = new PcbTransform({
            eagle: {
                path: "../eagle/test.brd",
            },
            json: {
                path: outJson,
                holes: true,
            },
        });
        fs.existsSync(outJson) && fs.unlinkSync(outJson);
        should.equal(false, fs.existsSync(outJson));
        pcbTrans.transform().then(function() {
            should.equal(true, fs.existsSync(outJson));
            var data = fs.readFileSync(outJson);
            var json = JSON.parse(data);
            json.bounds.should.properties({
                l:0,
                t:25.4,
                r:154.94,
                b:0,
                source: '20',
            });
            json.smdpads.length.should.equal(4);
            json.smdpads[0].should.properties({
                angle: 90,
                element: "E$16",
                height: 0.3,
                name: "P$1",
                package: "0201",
                roundness: 0,
                width: 0.3,
                x: 19.05,
                y: 10.765,
            });
        });
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
        svgLines.length.should.equal(23);
        var i = 0;
        svgLines[i++].should.equal('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
        svgLines[i++].should.equal('<svg xmlns="http://www.w3.org/2000/svg" version="1.1" ' +
            'width="154.94mm" height="25.4mm" viewbox="0 -25.4 154.94 25.4 ">');
        svgLines[i++].should.equal('<rect x="0" y="-25.4" width="154.94" height="25.4" stroke="none" fill="#fff"/><!--view-->');
        svgLines[i++].should.equal('<g stroke-linecap="round" stroke-width="0.2">');
        svgLines[i++].should.equal('<rect x="0" y="0" width="154.94" height="25.4" ' +
            'transform="scale(1,-1)" stroke="none" fill="#ddf"/><!--dimension-->');
        svgLines[i++].should.equal('<g stroke="#000" fill="none" stroke-width="0.1" transform="scale(1,-1)"><!--dimension-->');
        svgLines[i++].should.equal('<polyline points="0 0 0 25.4 154.94 25.4 154.94 0 0 0"/>');
    });
    it("writeCsvSmdPads(writer) writes CSV SMD pads for EagleBRD", function() {
        var pcbTrans = new PcbTransform();
        pcbTrans.readEagleBrd("../eagle/test.brd");
        var smdpads = new LogString();
        pcbTrans.writeCsvSmdPads(smdpads);
        var outPads = smdpads.output.trim().split("\n");
        outPads.length.should.equal(5);
        outPads[0].should.equal('#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS');
        outPads[1].should.equal('1,E$16,0201,P$1, 19.05, 10.765, 0.3, 0.3, 90, 0');
        outPads[2].should.equal('2,E$16,0201,P$2, 19.05, 10.165, 0.3, 0.3, 90, 0');
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
        padLines[1].should.equal('1,,,D10, 44.45, 35.565, 0.305, 0.305, 0, 0');
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
        holeLines[1].should.equal('1,,,D61, 161.239, 43.789, 2.0574');
        holeLines[21].should.equal('21,,,D366, 137.668, 44.502, 0.6096');
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
        stats.size.should.equal(12060);
    });
    it("pcbBounds() returns pcb bounding box (Gerber)", function() {
        // Gerber (fast)
        var pcbTrans = new PcbTransform({
            gerberLayers: {
                GKO: "../gerber/ruler/Ruler.GKO",
                GTP: "../gerber/ruler/Ruler.GTP",
                GTS: "../gerber/ruler/Ruler.GTS",
            },
        });
        should.deepEqual(pcbTrans.pcbBounds(), {
            source: "GKO",
            l: 25.4,
            t: 50.8,
            r: 180.34,
            b: 25.4,
        });

        var slog = new LogString();
        var pcbTrans = new PcbTransform({
            writer: slog,
            showBounds: true,
            gerberLayers: {
                GKO: "../gerber/ruler/Ruler.GKO",
                GTP: "../gerber/ruler/Ruler.GTP",
                GTS: "../gerber/ruler/Ruler.GTS",
            },
        });
        pcbTrans.transform();
        should.deepEqual(JSON.parse(slog.output), {
            source: "GKO",
            r:180.34,
            l:25.4,
            b:25.4,
            t:50.8
        });
    });
    it("pcbBounds() returns pcb bounding box (Eagle)", function() {
        // Eagle (slow)
        this.timeout(3000);
        var pcbTrans = new PcbTransform({
            eagle: {
                path: "../eagle/ruler.brd",
            },
        });
        should.deepEqual(pcbTrans.pcbBounds(), {
            source: "20",
            l:0,
            t: 25.4,
            r: 154.94,
            b: 0,
        });
    });
    it("version() returns the jspcb version", function() {
        var pcbTrans = new PcbTransform();
        pcbTrans.version().should.startWith("0.1.");
    });
})
