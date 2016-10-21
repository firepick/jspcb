var fs = require('fs');
var EagleBRD = require("./eaglebrd");
var Gerber = require("./gerber");
var PcbSvgFactory = require("./pcbsvg");

(function(exports) {
    function PcbTransform(options) {
        var that = this;

        options = options || {};
        that.verbose = options.verbose || false;
        that.writer = options.writer || console;

        return that;
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
        var bounds = brd.bounds;
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        var layerNumber = brd.getLayerNumber(options.layer);
        var layerPad = brd.isBottomLayer(layerNumber) ? "16" : "1";
        var layerSilk = brd.isBottomLayer(layerNumber) ? "22" : "21";

        new PcbSvgFactory(that.options).create({
            dimWires: brd.pcbWires("Dimension"),
            bounds: bounds,
            smds: smds,
            holes: holes,
            texts: brd.pcbText(layerSilk),
            writer: that.writer,
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
        for (var iLayer=0; iLayer<layerKeys.length; iLayer++)  {
            var key = layerKeys[iLayer];
            var id = key.toUpperCase();
            var path = layerFiles[key];
            that.verbose && that.log("loading Gerber", id, "file:"+path);
            var data = fs.readFileSync(path);
            that.verbose && that.log("processGerber() id:"+id, "path:"+path);
            var layer = grb.parseLayer(id, data);
            that.verbose && that.log("graphics:" + (layer.graphics.length));
        }
    }
    PcbTransform.prototype.pcbPads = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        return pcb && pcb.pcbPads(layerSpec) || [];
    }
    PcbTransform.prototype.pcbWires = function(layerSpec) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        return pcb && pcb.pcbWires(layerSpec) || [];
    }
    PcbTransform.prototype.writeCsv = function(csvWriters) {
        var that = this;
        var pcb = that.eagleBrd || that.gerber;
        csvWriters = csvWriters || {smdpads: that.writer};

        if (csvWriters.smdpads) {
            var writer = csvWriters.smdpads;
            var smds = pcb.pcbPads();
            writer.log("#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS");
            for (var iSMD = 0; iSMD < smds.length; iSMD++) {
                var smd = smds[iSMD];
                writer.log( iSMD+1+","+
                    smd.element+","+
                    smd.package+","+
                    smd.name+", "+
                    smd.x+","+
                    smd.y+","+
                    smd.width+","+
                    smd.height+","+
                    smd.angle+","+
                    smd.roundness+
                    "");
            }
        }
        if (csvWriters.holes) {
            var writer = csvWriters.holes;
            var holes = pcb.pcbHoles();
            writer.log("#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL");
            for (var iHole = 0; iHole < holes.length; iHole++) {
                var hole = holes[iHole];
                writer.log( iHole+1+","+
                    hole.element+","+
                    hole.package+","+
                    (hole.name||"")+", "+
                    hole.x+", "+
                    hole.y+", "+
                    hole.drill+
                    "");
            }
        }
    }
    PcbTransform.prototype.writeSvg = function(options) {
        var that = this;
        options = options || {};
        var writer = options.writer || that.writer;
        var pcb = that.eagleBrd || that.gerber;
        if (pcb == null) {
            throw new Error("SVG creation failed. No PCB files have been specified.");
        }
        if (that.gerber) {
            new PcbSvgFactory().create({
                writer: writer,
                smds: pcb.pcbPads(),
                dimWires: pcb.pcbWires("GKO"),
            });
        } else if (that.eagleBrd) {
            var brd = that.eagleBrd;
            that.eagleBrdToSvg(brd, 
               options.showSmds ? brd.pcbPads(options.layer) : [],
               brd.pcbHoles(),
               options);
        }
    }

    module.exports = exports.PcbTransform = PcbTransform;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("PcbTransform", function() {
    var should = require("should");
    var StringLog = require("./stringlog");
    var PcbTransform = exports.PcbTransform; // require("./PcbTransform");

    it("PcbTransform(options) creates a PCB data transformer", function() {
        var slog = new StringLog();
        var pcb = new PcbTransform({
            verbose: true,
            writer: slog,
        });
        pcb.verbose.should.equal(true);
        pcb.writer.should.equal(slog);
    })
    it("version() returns package.json version", function() {
        var pcb = new PcbTransform({verbose: false});
        pcb.version().should.equal("0.0.5");
    })
    it("readEagleBrd(path) reads Eagle BRD file ", function() {
        var pcb = new PcbTransform({verbose: false});
        pcb.readEagleBrd("../eagle/test.brd");
        var pads = pcb.pcbPads();
        pads.length.should.equal(4);
    });
    it("readGerber(layerFiles) reads Gerber files ", function() {
        var pcb = new PcbTransform({verbose: false});
        pcb.readGerber({
            GKO: "../gerber/ruler/Ruler.GKO",
            GTP: "../gerber/ruler/Ruler.GTP",
        });
        var pads = pcb.pcbPads();
        pads.length.should.equal(166);
    });
    it("writeSvg() writes SVG files ", function() {
        var slog = new StringLog();
        var pcb = new PcbTransform({
            verbose: false,
            writer: slog,
        });
        pcb.readEagleBrd("../eagle/test.brd");
        pcb.writeSvg({writer: slog});
        slog.output.indexOf("<svg").should.above(0);
    });
    it("writeCsv(csvWriters) writes CSV", function() {
        var smdpads = new StringLog();
        var holes = new StringLog();
        var pcb = new PcbTransform();
        pcb.readEagleBrd("../eagle/test.brd");
        pcb.writeCsv({
            smdpads: smdpads,
            holes: holes,
        });
        smdpads.output.should.equal(
            '#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS\n' +
            '1,E$16,0201,P$1, 19.05,10.764800000000001,0.3,0.3,90,0\n' +
            '2,E$16,0201,P$2, 19.05,10.1648,0.3,0.3,90,0\n' +
            '3,E$23,0402,1, 20.574,10.66,0.5,0.6,90,0\n' +
            '4,E$23,0402,2, 20.574,9.66,0.5,0.6,180,0\n' +
        '');
        holes.output.should.equal(
            '#,ELEMENT,PACKAGE,HOLE,X,Y,DRILL\n' +
            '1,E$46,ALL-HOLES,, 152.2235, 17.674, 3.26\n' +
        '');
    });
})
