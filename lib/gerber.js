var math = require("mathjs");
var fs = require('fs');

//https://www.ucamco.com/files/downloads/file/81/the_gerber_file_format_specification.pd4

/*
 * GBL  Gerber bottom copper file
 * GBO  Gerber bottom silkscreen file
 * GBS  Gerber bottom soldermask file
 * GKO  Gerber keepout file (Altium/Protel board outline)
 * GML  Gerber mill file
 * GTL  Gerber top copper file
 * GTO  Gerber top silkscreen file
 * GTP  Gerber top paste file
 * GTS  Gerber top soldermask file
 * TXT  Gerber drill file
 */

(function(exports) {
    ////////////////// constructor
    function Gerber(options) {
        var that = this;

        options = options || {};
        that.strokeWidth = options.strokeWidth;
        that.layers = {};
        that.verbose = options.verbose;

        return that;
    }

    var CHARSTAR = "*".charCodeAt(0);
    var CHARPCT = "%".charCodeAt(0);
    var CHARNL = "\n".charCodeAt(0);
    var CHARLF = "\r".charCodeAt(0);
    var CHARBLANK = " ".charCodeAt(0);
    var CHARPERIOD = ".".charCodeAt(0);
    var CHARPLUS = "+".charCodeAt(0);
    var CHARMINUS = "-".charCodeAt(0);
    var CHARCOMMA = ",".charCodeAt(0);
    var CHAR0 = "0".charCodeAt(0);
    var CHAR9 = "9".charCodeAt(0);
    var CHARA = "A".charCodeAt(0);
    var CHARC = "C".charCodeAt(0);
    var CHARD = "D".charCodeAt(0);
    var CHARF = "F".charCodeAt(0);
    var CHARG = "G".charCodeAt(0);
    var CHARI = "I".charCodeAt(0);
    var CHARJ = "J".charCodeAt(0);
    var CHARL = "L".charCodeAt(0);
    var CHARM = "M".charCodeAt(0);
    var CHARN = "N".charCodeAt(0);
    var CHARO = "O".charCodeAt(0);
    var CHARP = "P".charCodeAt(0);
    var CHARR = "R".charCodeAt(0);
    var CHARS = "S".charCodeAt(0);
    var CHARX = "X".charCodeAt(0);
    var CHARY = "Y".charCodeAt(0);

    function DataBlock(s) {
        var that = this;
        that.s = s;
        that.length = s.length;
        that.pos = 0;
    }
    DataBlock.prototype.available = function() {
        var that = this;
        return Math.max(0, that.length - that.pos);
    }
    DataBlock.prototype.peekCharCode = function(cMatch) {
        var that = this;
        if (that.pos >= that.length) {
            return null;
        }
        var c = that.s.charCodeAt(that.pos);
        if (cMatch) {
            if (c === cMatch) {
                that.pos++;
            } else {
                c = null;
            }
        }
        return c;
    }
    DataBlock.prototype.getCharCode = function() {
        var that = this;
        return that.pos < that.length ?
            that.s.charCodeAt(that.pos++) : null;
    }
    DataBlock.prototype.getDouble = function() {
        var that = this;
        var n = 0;
        var m = 0;
        var sign = 1;
        var c;
        if (that.peekCharCode(CHARPLUS)) {
            // do nothing
        }
        if (that.peekCharCode(CHARMINUS)) {
            sign = -1;
        }
        while (c = that.peekCharCode()) {
            if (c < CHAR0 || CHAR9 < c) {
                break;
            }
            n = n * 10 + (c - CHAR0);
            that.pos++;
        }
        if (that.peekCharCode(CHARPERIOD)) {
            var scale = 0.1;
            while (c = that.peekCharCode()) {
                if (c < CHAR0 || CHAR9 < c) {
                    break;
                }
                m += (c - CHAR0) * scale;
                scale /= 10;
                that.pos++;
            }
        }
        return sign * (n + m);
    }
    DataBlock.prototype.getInteger = function() {
        var that = this;
        var code = null;
        var sign = 1;
        var c;
        while (c = that.peekCharCode()) {
            if (c === CHARPLUS) {
                sign = 1;
            } else if (c === CHARMINUS) {
                sign = -1;
            } else if (c < CHAR0 || CHAR9 < c) {
                break;
            } else {
                code = (code == null ? 0 : code * 10) + (c - CHAR0);
            }
            that.pos++;
        }
        return sign * code;
    }

    function processExtendedCode(that, layer, datablock) {
        var parsed = false;
        if (datablock.peekCharCode(CHARA)) {
            if (datablock.peekCharCode(CHARD)) { // AD define aperture
                if (datablock.peekCharCode(CHARD)) {
                    var dcode = datablock.getInteger();
                    if (dcode < 10) {
                        throw new Error("GRB001\t: invalid aperture D code: " + datablock.s);
                    }
                    var name = datablock.getCharCode();
                    if (name === CHARC) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var r = layer.unit * datablock.getDouble() / 2;
                            var aperture = {
                                name: "D" + dcode,
                                type: "circle",
                                r: r,
                                sw: r*2,
                            }
                            if (datablock.peekCharCode(CHARX)) {
                                aperture.hole = layer.unit * datablock.getDouble();
                            }
                            layer.apertures[dcode] = aperture;
                            parsed = true;
                        }
                    } else if (name === CHARO) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var x = datablock.getDouble();
                            if (datablock.peekCharCode(CHARX)) {
                                var width = layer.unit * x;
                                var height = layer.unit * datablock.getDouble();
                                var r = Math.min(width, height) / 2;
                                var strokeWidth = Math.max(width, height);
                                var aperture = {
                                    name: "D" + dcode,
                                    type: "rect",
                                    width: width,
                                    height: height,
                                    rx: r,
                                    ry: r,
                                    sw: strokeWidth,
                                }
                                if (datablock.peekCharCode(CHARX)) {
                                    aperture.hole = layer.unit * datablock.getDouble();
                                }
                                layer.apertures[dcode] = aperture;
                                parsed = true;
                            }
                        }
                    } else if (name === CHARP) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var od = datablock.getDouble();
                            if (datablock.peekCharCode(CHARX)) {
                                var aperture = {
                                    name: "D" + dcode,
                                    type: "polygon",
                                    od: layer.unit * od,
                                    v: datablock.getDouble(),
                                    sw: od,
                                }
                                if (datablock.peekCharCode(CHARX)) {
                                    aperture.angle = datablock.getDouble();
                                    if (datablock.peekCharCode(CHARX)) {
                                        aperture.hole = layer.unit * datablock.getDouble();
                                    }
                                    layer.apertures[dcode] = aperture;
                                    parsed = true;
                                }
                            }
                        }
                    } else if (name === CHARR) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var x = datablock.getDouble();
                            if (datablock.peekCharCode(CHARX)) {
                                var width = layer.unit * x;
                                var height = layer.unit * datablock.getDouble();
                                var strokeWidth = Math.max(width,height);
                                var aperture = {
                                    name: "D" + dcode,
                                    type: "rect",
                                    width: width,
                                    height: height,
                                    sw: strokeWidth,
                                }
                                if (datablock.peekCharCode(CHARX)) {
                                    aperture.hole = layer.unit * datablock.getDouble();
                                }
                                layer.apertures[dcode] = aperture;
                                parsed = true;
                            }
                        }
                    } else {
                        console.log("GRB002\t: not implemented:", datablock.s);
                        parsed = true;
                    }
                }
            } else if (datablock.peekCharCode(CHARM)) { // AM
                console.log("GRB003\t: WARNING: macro definitions are not implemented and are ignored:", datablock.s);
                parsed = true;
            }
        } else if (datablock.peekCharCode(CHARF)) {
            if (datablock.peekCharCode(CHARS)) {
                if (datablock.peekCharCode(CHARL)) {
                    if (datablock.peekCharCode(CHARA)) {
                        if (datablock.peekCharCode(CHARX)) {
                            layer.xn = datablock.getCharCode() - CHAR0;
                            layer.xm = datablock.getCharCode() - CHAR0;
                            if (datablock.peekCharCode(CHARY)) {
                                layer.yn = datablock.getCharCode() - CHAR0;
                                layer.ym = datablock.getCharCode() - CHAR0;
                                layer.setUnit(layer.unit);
                                parsed = true;
                            }
                        }
                    }
                }
            }
        } else if (datablock.peekCharCode(CHARI)) {
            if (datablock.peekCharCode(CHARP)) {
                if (datablock.peekCharCode(CHARP)) {
                    if (datablock.peekCharCode(CHARO)) {
                        if (datablock.peekCharCode(CHARS)) {
                            that.polarity = true;
                            console.log("GRB004\t: WARNING: deprecated extended function code:", datablock.s);
                            parsed = true;
                        }
                    }
                } else if (datablock.peekCharCode(CHARN)) {
                    if (datablock.peekCharCode(CHARE)) {
                        if (datablock.peekCharCode(CHARG)) {
                            that.polarity = true;
                            console.log("GRB005\t: ERROR: unsupported and deprecated extended function code:", datablock.s);
                            parsed = true;
                        }
                    }
                }
            }
        } else if (datablock.peekCharCode(CHARL)) {
            if (datablock.peekCharCode(CHARP)) {
                if (datablock.peekCharCode(CHARC)) {
                    that.polarity = false;
                    parsed = true;
                } else if (datablock.peekCharCode(CHARD)) {
                    that.polarity = true;
                    parsed = true;
                }
            }
        } else if (datablock.peekCharCode(CHARO)) {
            if (datablock.peekCharCode(CHARF)) {
                console.log("GRB006\t: Ignoring offset command:", datablock.s);
                parsed = true;
            }
        } else if (datablock.peekCharCode(CHARP)) {
            if (datablock.peekCharCode(CHARF)) {
                throw new Error("not implemented");
            }
        } else if (datablock.peekCharCode(CHARM)) {
            if (datablock.peekCharCode(CHARO)) {
                if (datablock.peekCharCode(CHARI) && datablock.peekCharCode(CHARN)) {
                    layer.setUnit(25.4); // inch
                    that.verbose && console.log("unit:", layer.unit);
                    parsed = true;
                } else if (datablock.peekCharCode(CHARM) && datablock.peekCharCode(CHARM)) {
                    layer.setUnit(1) // millimeters
                    that.verbose && console.log("unit:", layer.unit);
                    parsed = true;
                }
            }
        } else if (datablock.peekCharCode(CHARS)) {
            if (datablock.peekCharCode(CHARR)) {
                throw new Error("not implemented");
                parsed = true;
            }
        }

        if (!parsed) {
            console.log("GRB007\t: ignoring non-standard extended function code:" + JSON.stringify(datablock));
        }
    }

    function processDCode(that, layer, datablock) {
        var x2 = layer.x;
        var y2 = layer.y;
        var dx = 0;
        var dy = 0;
        var dcode = null;
        while (datablock.available()) {
            if (datablock.peekCharCode(CHARX)) {
                x2 = layer.xscale * datablock.getInteger();
            } else if (datablock.peekCharCode(CHARY)) {
                y2 = layer.yscale * datablock.getInteger();
            } else if (datablock.peekCharCode(CHARI)) {
                dx = layer.xscale * datablock.getInteger();
            } else if (datablock.peekCharCode(CHARJ)) {
                dy = layer.yscale * datablock.getInteger();
            } else if (datablock.peekCharCode(CHARD)) {
                dcode = datablock.getInteger();
            } else if (datablock.peekCharCode(CHARSTAR)) {
                break;
            } else {
                throw new Error("GRB008\t: invalid D code:" + datablock.s);
            }
        }
        if (dcode == null) {
            throw new Error("GRB010\t: invalid D code syntax:" + datablock.s);
        }
        switch (dcode) {
            case 1: // D01 interpolate
                if (layer.interpolation === "L") {
                    layer.graphics.push({
                        type: "line",
                        x1: layer.x,
                        y1: layer.y,
                        x2: x2,
                        y2: y2,
                        sw: layer.aperture && layer.aperture.sw,
                    });
                } else {
                    if (dx === 0 && dy === 0) {
                        throw new Error("GRB011\t: I and J cannot both be zero:" + datablock.s);
                    }
                    layer.graphics.push(that.svgArc( layer.x, layer.y,
                        x2, y2, dx, dy, layer.interpolation==="CW", layer.aperture.sw));
                }
                break;
            case 2: // D02 move
                break;
            case 3: // D03 flash
                if (layer.regionMode) {
                    throw new Error("GRB012\t: D03 not allowed during region mode:" + datablock.s);
                }
                if (layer.aperture == null) {
                    throw new Error("GRB013\t: no aperture:" + datablock.s);
                }
                var flash = JSON.parse(JSON.stringify(layer.aperture));
                flash.x = x2;
                flash.y = y2;
                layer.graphics.push(flash);
                break;
            default:
                layer.aperture = layer.apertures[dcode];
                break;
        }
        layer.x = x2;
        layer.y = y2;
    }

    function processGCode(that, layer, datablock) {
        var gcode = datablock.getInteger();
        switch (gcode) {
            case 1:
                layer.interpolation = "L"; // G01 line
                break;
            case 2: //
                layer.interpolation = "CW"; // G02 clockwise
                break;
            case 3:
                layer.interpolation = "CCW"; // G03 counterclockwise
                break;
            case 4:
                that.verbose && console.log("G04 ", datablock);
                layer.comments++;
                break;
            case 36:
                layer.regionMode = true;
                break;
            case 37:
                layer.regionMode = false;
                break;
            case 70:
                layer.setUnit(25.4); // inch
                break;
            case 71:
                layer.setUnit(1); // mm
                break;
            case 74:
                layer.quadrantMode = "S"; // single quadrant arc interpolation
                console.log("Single quadrant interpolation not implemented");
                break;
            case 75:
                layer.quadrantMode = "M"; // multi-quadrant arc interpolation
                break;
            default:
                throw new Error("GRB014\t: invalid G code:" + datablock.s);
        }
        return that;
    }

    function processStandardCode(that, layer, datablock) {
        if (datablock.peekCharCode(CHARG)) {
            processGCode(that, layer, datablock);
        } else if (datablock.peekCharCode(CHARM)) {
            if (datablock.getInteger() !== 2) {
                throw new Error("GRB015\t: invalid M code:" + datablock.s);
            }
            layer.eof = true;
        } else {
            processDCode(that, layer, datablock);
        }
    }

    function Layer(buffer) {
        var that = this;

        that.buffer = buffer;
        that.datablocks = 0,
            that.comments = 0;
        that.rectangle = [];
        that.interpolation = "L"; // default to line for leniency
        that.graphics = [];
        that.apertures = {};
        that.aperture = null;
        that.regionMode = null;
        that.quadrantMode = null;
        that.coordFormat = null;
        that.unit = 25.4; // default for debugging
        that.x = null;
        that.y = null;
        that.polarity = true;

        return that;
    }
    Layer.prototype.setUnit = function(unit) {
        var that = this;
        that.unit = unit;
        that.xscale = that.unit * Math.pow(10, -that.xm);
        that.yscale = that.unit * Math.pow(10, -that.ym);
    }
    Layer.prototype.bounds = function() {
        var that = this;
        var graphics = that.graphics;
        var bounds = null;
        function updateBounds(x,y) {
            x = Number(x);
            y = Number(y);
            if (bounds) {
                bounds.l = bounds.l == null ? x : Math.min(x, bounds.l);
                bounds.r = bounds.r == null ? x : Math.max(x, bounds.r);
                bounds.b = bounds.b == null ? x : Math.min(y, bounds.b);
                bounds.t = bounds.t == null ? x : Math.max(y, bounds.t);
            } else {
                bounds = {
                    l: x,
                    r: x,
                    t: y,
                    b: y,
                }
            }
        }
        for (var iGr = 0; iGr < graphics.length; iGr++) {
            var gr = graphics[iGr];
            if (gr.type === "circle") {
                updateBounds(gr.x, gr.y);
            } else if (gr.type === "arc") {
                updateBounds(gr.x1, gr.y1);
                updateBounds(gr.x2, gr.y2);
            } else if (gr.type === "line") {
                updateBounds(gr.x1, gr.y1);
                updateBounds(gr.x2, gr.y2);
            }
        }
        return bounds;
    }

    Gerber.prototype.svgArc = function(x1, y1, x2, y2, dx1, dy1, cw, strokeWidth) {
        var that = this;
        var cx = x1 + dx1;
        var cy = y1 + dy1;
        var x12 = (x1 + x2) / 2; // intermediate point
        var y12 = (y1 + y2) / 2; // intermediate point
        var r1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        var dx2 = x2 - cx;
        var dy2 = y2 - cy;
        var r2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        var r = (r1 + r2) / 2;
        if (x2 < x1) { // x1 should be leftmost
            var tmp = x2; 
            x2 = x1;
            x1 = tmp;
            var tmp = y2;
            y2 = y1;
            y1 = tmp;
            cw = !cw;
        }
        if (y1 < y2) {
            if (x1 < x2) {
                var sweep = cw;
                var largeArc = cy <= y12 ? !sweep : sweep;
            } else { // x1 === x2
                var sweep = !cw;
                var largeArc = cx < x12 ? !sweep : sweep;
            }
        } else if (y1 === y2) {
            var sweep = x1 < x2 ? cw : !cw;
            var largeArc = cy < y12 ? !sweep : sweep;
        } else { // y1 > y2
            var sweep = cw;
            if (x1 < x2) {
                var largeArc = cy < y12 ? !sweep : sweep;
            } else { // x1 === x2
                var largeArc = cx < x12 ? !sweep : sweep;
            }
        }
        var angle = 0;

        var arc = {
            type: "arc",
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            rx: r,
            ry: r,
            sw: strokeWidth || 1,
            //angle: angle, // always zero because Gerbers use circles, not ellipses
            sweep: sweep ? 1 : 0,
            largeArc: largeArc ? 1 : 0,
        };
        if (x1 === x2 && y1 === y2) {
            that.verbose && 
                console.log("Arc-circle center("+cx+","+cy+") r:"+r);
            arc.cx = cx;
            arc.cy = cy;
        }

        return arc;
    }

    Gerber.prototype.parseLayer = function(id, layer) {
        var that = this;
        var buffer = (layer instanceof Buffer) ? layer : new Buffer(layer);
        var layer = new Layer(buffer);
        var endPos = buffer.length;
        for (var iPos = 0; iPos < endPos; iPos++) {
            var c = buffer[iPos];
            switch (c) {
                case CHARBLANK:
                case CHARNL:
                case CHARLF:
                    // do nothing
                    break;
                case CHARPCT:
                    var iPct = buffer.indexOf(CHARPCT, iPos + 1);
                    if (iPct < 0) {
                        var err = new Error("GRB016\t: Invalid Gerber file:  " + buffer.toString("UTF-8", iPos, iPos + 50));
                        console.log(err);
                        throw err;
                    }
                    var datablock = new DataBlock(buffer.toString("UTF-8", iPos + 1, iPct + 1));
                    processExtendedCode(that, layer, datablock);
                    iPos = iPct;
                    break;
                default:
                    var iStar = buffer.indexOf(CHARSTAR, iPos);
                    if (iStar < 0) {
                        var err = new Error("GRB017\t: Invalid Gerber file:  " + buffer.toString(iPos - 5, iPos + 50));
                        console.log(err);
                        throw err;
                    }
                    var datablock = new DataBlock(buffer.toString("UTF-8", iPos, iStar + 1));
                    processStandardCode(that, layer, datablock);
                    iPos = iStar;
                    break;
            }
            layer.datablocks++;
        }
        that.layers[id] = layer;
        return layer;
    }
    Gerber.prototype.loadFile = function(path) {
        fs.readFile(path, function(err, data) {
            if (err) {
                console.log(err.toString());
            } else {
                // TODO
            }
            process.exit(0);
        });
    }
    Gerber.prototype.pushGraphics = function(result, layer, type) {
        if (layer && layer.graphics) {
            for (var iGr = 0; iGr < layer.graphics.length; iGr++) {
                var gr = layer.graphics[iGr];
                if (gr.type === type) {
                    result.push(gr);
                };
            }
        }
        return result;
    }
    Gerber.prototype.layerId = function(layerId, priority) {
        var that = this;
        if (layerId == null || layerId == "Top") {
            for (var iLay = 0; iLay < priority.length; iLay++) {
                var key = priority[iLay];
                if (that.layers[key]) {
                    return key;
                }
            }
        }
        if (layerId === "Dimension") {
            layerId = "GKO";
        }
        return layerId;
    }
    Gerber.prototype.pcbText = function(layer, options) {
        var that = this;
        return []; // Gerber has no text
    }
    Gerber.prototype.pcbHoles = function(layerId) {
        var that = this;
        layerId = that.layerId(layerId,["TXT", "GTS" ]);
        var holes = that.pushGraphics([], that.layers[layerId], 'circle');
        that.verbose && console.log("holes(" + layerId + ") holes:" + holes.length);
        return holes;
    }
    Gerber.prototype.pcbArcs = function(layerId, options) {
        var that = this;
        layerId = that.layerId(layerId,["GTO", "GTL", "GTS", "GTP" ]);
        var arcs = that.pushGraphics([], that.layers[layerId], 'arc');
        that.verbose && console.log("pcbArcs(" + layerId + ") arcs:" + arcs.length);
        return arcs;
    }
    Gerber.prototype.pcbPads = function(layerId, options) {
        var that = this;
        layerId = that.layerId(layerId, ["GTP", "GTS", "GBS", "GTL", "GBL"]);
        var pads = that.pushGraphics([], that.layers[layerId], 'rect');
        that.verbose && console.log("pcbPads(" + layerId + ") pads:" + pads.length);
        return pads;
    }
    Gerber.prototype.pcbRects = function(layerId, options) {
        var that = this;
        layerId = that.layerId(layerId, ["GTO", "GTL", "GTS", "GTP", "GBS", "GTL", "GBL"]);
        var rects = that.pushGraphics([], that.layers[layerId], 'rect');
        that.verbose && console.log("pcbRects(" + layerId + ") rects:" + rects.length);
        return rects;
    }
    Gerber.prototype.pcbWires = function(layerId) {
        var that = this;
        var resolvedId = that.layerId(layerId, ["GKO", "GTL", "GTO", "GBL", "GBO"]);
        //console.log("layerId", layerId , "=>", resolvedId);
        return that.pushGraphics([], that.layers[resolvedId], 'line');
    }
    Gerber.prototype.pcbBounds = function(layerId) {
        var that = this;
        layerId = that.layerId(layerId, ["GKO", "GTL", "GTO", "GTS", "GBL", "GBO", "GBS", "GTP"]);
        if (!layerId) {
            return null;
        }
        return that.layers[layerId].bounds();
    }
    Gerber.prototype.pcbText = function(layer) {
        var that = this;
    }

    module.exports = exports.Gerber = Gerber;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("Gerber", function() {
    var should = require("should");
    var Gerber = exports.Gerber; // require("./Gerber");
    var e = 0.000000000001;
    it("Gerber(options) creates a Gerber file parser", function() {
        var grb = new Gerber({
            verbose: true
        });
        grb.should.property("layers");
        grb.verbose.should.equal(true);
    })
    it("parseLayer(id,stringOrBuffer) parses G commands", function() {
        var grb = new Gerber({
            verbose: false
        });
        grb.should.property("layers");
        var layer = grb.parseLayer("GTO", "G04 Layer_Color=8421504*");
        layer.should.equal(grb.layers["GTO"]);
        layer.datablocks.should.equal(1);
        layer.comments.should.equal(1);
        var layer = grb.parseLayer("GTO", "G04*G04HI*");
        layer.comments.should.equal(2);
        var layer = grb.parseLayer("GTO", "G1*");
        layer.interpolation.should.equal("L");
        var layer = grb.parseLayer("GTO", "G1*G0002*");
        layer.interpolation.should.equal("CW");
        var layer = grb.parseLayer("GTO", "G1*G03*");
        layer.interpolation.should.equal("CCW");
        var layer = grb.parseLayer("GTO", "G4*\nG36*");
        layer.regionMode.should.equal(true);
        var layer = grb.parseLayer("GTO", "G4*\nG37*");
        layer.regionMode.should.equal(false);
        //var layer = grb.parseLayer("GTO", "G4*\n\r G74*"); // not implemented
        //layer.quadrantMode.should.equal("S");
        var layer = grb.parseLayer("GTO", "G4*\n\n G75*");
        layer.quadrantMode.should.equal("M");
    })
    it("parseLayer(id,stringOrBuffer) parses M commands", function() {
        var grb = new Gerber();
        var layer = grb.parseLayer("GTO", "M02*");
        layer.eof.should.equal(true);
        var layer = grb.parseLayer("GTO", "%MOIN*%");
        layer.unit.should.equal(25.4);
        var layer = grb.parseLayer("GTO", "%MOMM*%");
        layer.unit.should.equal(1);
    })
    it("parseLayer(id,stringOrBuffer) parses F commands", function() {
        var grb = new Gerber();
        var layer = grb.parseLayer("GTO", "%FSLAX12Y34*% %MOMM%");
        layer.xn.should.equal(1);
        layer.xm.should.equal(2);
        layer.yn.should.equal(3);
        layer.ym.should.equal(4);
        layer.xscale.should.equal(0.01);
        layer.yscale.should.equal(0.0001);
    })
    it("parseLayer(id,stringOrBuffer) parses A commands", function() {
        var grb = new Gerber();
        var layer = grb.parseLayer("GTO", "%ADD12C,0*%");
        should.deepEqual(layer.apertures[12], {
            name: "D12",
            type: "circle",
            r: 0,
            sw: 0,
        });
        var layer = grb.parseLayer("GTO", "%ADD12C,12.34*%");
        should.deepEqual(layer.apertures[12], {
            name: "D12",
            type: "circle",
            r: 12.34 * 25.4 / 2,
            sw: 12.34 * 25.4,
        });
        var layer = grb.parseLayer("GTO", "%MOMM% %ADD123C,12.34X45.6*%");
        should.deepEqual(layer.apertures[123], {
            name: "D123",
            type: "circle",
            r: 12.34 / 2,
            sw: 12.34,
            hole: 45.6
        });
        var layer = grb.parseLayer("GTO", "%MOMM% %ADD0078R,1.2X3.4*%");
        should.deepEqual(layer.apertures[78], {
            name: "D78",
            height: 3.4,
            type: "rect",
            width: 1.2,
            sw: 3.4,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078R,1.2X3.4X45.6*%");
        should.deepEqual(layer.apertures[78], {
            name: "D78",
            height: 25.4 * 3.4,
            type: "rect",
            width: 25.4 * 1.2,
            hole: 25.4 * 45.6,
            sw: 25.4 * 3.4,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078O,1.2X3.4*%");
        layer.apertures[78].type.should.equal("rect");
        layer.apertures[78].width.should.approximately(1.2 * 25.4, e);
        layer.apertures[78].height.should.approximately(3.4 * 25.4, e);
        layer.apertures[78].rx.should.approximately(0.6 * 25.4, e);
        layer.apertures[78].ry.should.approximately(0.6 * 25.4, e);
        var layer = grb.parseLayer("GTO", "%MOIN% %ADD0078O,1.2X3.4X45.6*%");
        layer.apertures[78].type.should.equal("rect");
        layer.apertures[78].width.should.approximately(1.2 * 25.4, e);
        layer.apertures[78].height.should.approximately(3.4 * 25.4, e);
        layer.apertures[78].rx.should.approximately(0.6 * 25.4, e);
        layer.apertures[78].ry.should.approximately(0.6 * 25.4, e);
        var layer = grb.parseLayer("GTO", "%MOMM% %ADD0078P,10X5X-2.3X3.4*%");
        // polygons should be converterd to SVG graphic attributes (i.e., points)
        //should.deepEqual(layer.apertures[78], {
        //type: "P",
        //od: 10,
        //v: 5,
        //angle:-2.3,
        //hole:3.4,
        //});
        //var layer = grb.parseLayer("GTO", "%MOMM% %ADD0078P,10X5X-2.3*%");
        //should.deepEqual(layer.apertures[78], {
        //type: "P",
        //od: 10,
        //v: 5,
        //angle:-2.3,
        //});
    })
    it("parseLayer(id,stringOrBuffer) parses D commands", function() {
        var grb = new Gerber();
        var layer = grb.parseLayer("GTO", "%FSLAX12Y12*% %MOMM*% X123Y456D2*");
        layer.x.should.equal(1.23);
        layer.y.should.approximately(4.56, e);
        var layer = grb.parseLayer("GTO", "%FSLAX12Y12*% %MOMM*% X123Y456D2*I2J3D0002*");
        layer.x.should.approximately(1.23, e);
        layer.y.should.approximately(4.56, e);
        var layer = grb.parseLayer("GTO", "%FSLAX12Y12*% %MOMM*% I2J-3X123Y456D02*");
        layer.x.should.approximately(1.23, e);
        layer.y.should.approximately(4.56, e);
        var layer = grb.parseLayer("GTO", "%FSLAX12Y12*% %MOMM*% %ADD10C,5*% D10* X123Y456D3*");
        should.deepEqual(layer.aperture, {
            name: "D10",
            r: 5 / 2,
            sw: 5,
            type: "circle",
        });
        layer.graphics[0].should.properties({
            name: "D10",
            r: 5 / 2,
            sw: 5,
            type: "circle",
        });
        layer.graphics[0].x.should.equal(layer.x);
        layer.graphics[0].y.should.equal(layer.y);
        layer.x.should.approximately(1.23, e);
        layer.y.should.approximately(4.56, e);
    })
    it("pcbWires('GKO',options) returns board outline for Altima boards", function() {
        var grb = new Gerber();
        var gko = "%FSLAX25Y25*%" + // coordinates 5-digit precision
            "%MOIN*%" + // units inches
            "G70*" + // units inches
            "G01*" + // interpolate line
            "G75*" + // multi-quadrant arc interpolation
            "%ADD377C,0.00000*%" + // Define aperture #D377 <= circle with 0 radius
            "D377*" + // Use aperture #D377
            "X100000Y100000D02*" + // move to (1,1)
            "Y200000D01*" + // interpolate (line) to (1,2)
            "X710000D01*" + // interpolate (line) to (7.1,2)
            "Y100000D02*" + // move to (7.1,1)
            "Y200000D01*" + // interpolate line to (7.1,2)
            "X100000Y100000D02*" + // move to (1,1)
            "X710000D01*" + // interpolate line to (7.1,1)
            "M02* "; // END
        var layer = grb.parseLayer("GKO", gko);
        var wires = grb.pcbWires("GKO");
        wires.length.should.equal(4);
        wires[0].type.should.equal("line");
        wires[0].x1.should.approximately(25.4 * 1, e);
        wires[0].x2.should.approximately(25.4 * 1, e);
        wires[0].y1.should.approximately(25.4 * 1, e);
        wires[0].y2.should.approximately(25.4 * 2, e);
        wires[1].type.should.equal("line");
        wires[1].x1.should.approximately(25.4 * 1, e);
        wires[1].x2.should.approximately(25.4 * 7.1, e);
        wires[1].y1.should.approximately(25.4 * 2, e);
        wires[1].y2.should.approximately(25.4 * 2, e);
        wires[2].type.should.equal("line");
        wires[2].x1.should.approximately(25.4 * 7.1, e);
        wires[2].x2.should.approximately(25.4 * 7.1, e);
        wires[2].y1.should.approximately(25.4 * 1, e);
        wires[2].y2.should.approximately(25.4 * 2, e);
        wires[3].type.should.equal("line");
        wires[3].x1.should.approximately(25.4 * 1, e);
        wires[3].x2.should.approximately(25.4 * 7.1, e);
        wires[3].y1.should.approximately(25.4 * 1, e);
        wires[3].y2.should.approximately(25.4 * 1, e);
    });
    it("pcbPads('GTP',options) returns solder paste pads for top paste layer", function() {
        var grb = new Gerber({
            verbose: false
        });
        var gdata = "%FSLAX21Y21*%" + // coordinates 1-digit precision
            "%MOIN*%" + // units inches
            "%ADD10R,0.3X0.4*%" + // Define aperture D10 <= rectangle 0.3x0.4
            "D10*" + // Use aperture D10
            "X10Y20D02*" + // move to (1,2)
            "D03*" + // flash
            "X50Y60D02*" + // move to (5,6)
            "D03*" + // flash
            "M02* "; // END
        var layer = grb.parseLayer("GTP", gdata);
        var pads = grb.pcbPads("GTP");
        pads.length.should.equal(2);
        pads[0].type.should.equal("rect");
        pads[0].x.should.approximately(25.4 * 1, e);
        pads[0].y.should.approximately(25.4 * 2, e);
        pads[0].width.should.approximately(25.4 * 0.3, e);
        pads[0].height.should.approximately(25.4 * 0.4, e);
        pads[1].type.should.equal("rect");
        pads[1].x.should.approximately(25.4 * 5, e);
        pads[1].y.should.approximately(25.4 * 6, e);
        pads[1].width.should.approximately(25.4 * 0.3, e);
        pads[1].height.should.approximately(25.4 * 0.4, e);
        should.deepEqual(pads, grb.pcbPads()); // test layer heuristic
    });
    it("pcbHoles(layerSpec) returns holes using specified layer", function() {
        var grb = new Gerber({
            verbose: false
        });
        var gts = "%FSLAX21Y21*%" + // coordinates 1-digit precision
            "%MOIN*%" + // units inches
            "%ADD352C,0.13700*%" + // Define aperture D352 <= circle 0.137"
            "D352*" + // Use aperture D10
            "X10Y20D02*" + // move to (1,2)
            "D03*" + // flash
            "X50Y60D02*" + // move to (5,6)
            "D03*" + // flash
            "M02* "; // END
        grb.parseLayer("GTS", gts);
        var gtl = "%FSLAX21Y21*%" + // coordinates 1-digit precision
            "%MOIN*%" + // units inches
            "%ADD353C,0.12700*%" + // Define aperture D353 <= circle 0.127"
            "D353*" + // Use aperture D10
            "X10Y20D02*" + // move to (1,2)
            "D03*" + // flash
            "X50Y60D02*" + // move to (5,6)
            "D03*" + // flash
            "M02* "; // END
        grb.parseLayer("GTL", gtl);

        // GTS holes are default
        var gtsHoles = grb.pcbHoles();
        gtsHoles.length.should.equal(2);
        gtsHoles[0].type.should.equal("circle");
        gtsHoles[0].x.should.approximately(25.4 * 1, e);
        gtsHoles[0].y.should.approximately(25.4 * 2, e);
        gtsHoles[0].r.should.approximately(25.4 * 0.137 / 2, e);
        gtsHoles[1].type.should.equal("circle");
        gtsHoles[1].x.should.approximately(25.4 * 5, e);
        gtsHoles[1].y.should.approximately(25.4 * 6, e);
        gtsHoles[1].r.should.approximately(25.4 * 0.137 / 2, e);
        should.deepEqual(gtsHoles, grb.pcbHoles("Top")); // test layer heuristic
        should.deepEqual(gtsHoles, grb.pcbHoles("GTS")); // test layer heuristic

        // GTL holes are smaller and may include round copper pads (!)
        var gtlHoles = grb.pcbHoles("GTL");
        gtlHoles.length.should.equal(2);
        gtlHoles[0].type.should.equal("circle");
        gtlHoles[0].x.should.approximately(25.4 * 1, e);
        gtlHoles[0].y.should.approximately(25.4 * 2, e);
        gtlHoles[0].r.should.approximately(25.4 * 0.127 / 2, e);
        gtlHoles[1].type.should.equal("circle");
        gtlHoles[1].x.should.approximately(25.4 * 5, e);
        gtlHoles[1].y.should.approximately(25.4 * 6, e);
        gtlHoles[1].r.should.approximately(25.4 * 0.127 / 2, e);
    });
    it("svgArc(x1,y1,x2,y2,dx,dy,ccw,sw) returns SVG arc parameters for given Gerber arc", function() {
        var grb = new Gerber({
            verbose: false
        });
        var e = .0001;

        // horizontal
        var arc = grb.svgArc(1, 0, 3, 0, 1, -1, true, 1.2);
        arc.should.properties({
            type: "arc",
            x1: 1,
            y1: 0,
            x2: 3,
            y2: 0,
            sweep: 1,
            largeArc: 0,
            sw: 1.2,
        });
        arc.rx.should.approximately(1.4142, e);
        arc.ry.should.equal(arc.rx);
        var arc = grb.svgArc(3, 0, 1, 0, -1, -1, true);
        arc.should.properties({
            sweep: 0,
            largeArc: 1,
            sw: 1,
        });
        arc.rx.should.approximately(1.4142, e);
        arc.ry.should.equal(arc.rx);
        var arc = grb.svgArc(1, 0, 3, 0, 1, -1, false);
        arc.should.properties({
            sweep: 0,
            largeArc: 1,
        });
        arc.rx.should.approximately(1.4142, e);
        arc.ry.should.equal(arc.rx);
        var arc = grb.svgArc(3, 0, 1, 0, -1, -1, false);
        arc.should.properties({
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1.4142, e);
        arc.ry.should.equal(arc.rx);

        // vertical
        var arc = grb.svgArc(1, 1, 1, 3, -1, 1, true);
        arc.should.properties({
            type: "arc",
            x1: 1,
            y1: 1,
            x2: 1,
            y2: 3,
            sweep: 0,
            largeArc: 1,
        });
        arc.rx.should.approximately(1.4142, e);
        arc.ry.should.equal(arc.rx);
        var arc = grb.svgArc(1, 1, 1, 3, -1, 1, false);
        arc.should.properties({
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1.4142, e);
        var arc = grb.svgArc(1, 3, 1, 1, -1, -1, true);
        arc.should.properties({
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1.4142, e);
        var arc = grb.svgArc(1, 3, 1, 1, -1, -1, false);
        arc.should.properties({
            sweep: 0,
            largeArc: 1,
        });
        arc.rx.should.approximately(1.4142, e);

        // top-left, bottom-right corners
        var arc = grb.svgArc(1, 1, 2, 2, 1, 0, true);
        arc.should.properties({
            type: "arc",
            x1: 1,
            y1: 1,
            x2: 2,
            y2: 2,
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);
        arc.ry.should.equal(arc.rx);
        var arc = grb.svgArc(1, 1, 2, 2, 0, 1, false);
        arc.should.properties({
            sweep: 0,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);
        var arc = grb.svgArc(2, 2, 1, 1, 0, -1, false);
        arc.should.properties({
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);
        var arc = grb.svgArc(2, 2, 1, 1, -1, 0, true);
        arc.should.properties({
            sweep: 0,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);

        // top-right, bottom-left corners
        var arc = grb.svgArc(2, 1, 1, 2, -1, 0, false);
        arc.should.properties({
            type: "arc",
            x1: 1,
            y1: 2,
            x2: 2,
            y2: 1,
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);
        var arc = grb.svgArc(2, 1, 1, 2, 0, 1, true);
        arc.should.properties({
            sweep: 0,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);
        var arc = grb.svgArc(1, 2, 2, 1, 0, -1, true);
        arc.should.properties({
            sweep: 1,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);
        var arc = grb.svgArc(1, 2, 2, 1, 1, 0, false);
        arc.should.properties({
            sweep: 0,
            largeArc: 0,
        });
        arc.rx.should.approximately(1, e);

    });
    it("pcbArcs(layerSpec) returns arcs in specified layer", function() {
        var grb = new Gerber({
            verbose: false
        });
        var gto = "%FSLAX21Y21*%" + // coordinates 1-digit precision
            "%MOIN*%" + // units inches
            "%ADD352C,0.13700*%" + // Define aperture D352 <= circle 0.137"
            "D352*" + // Use aperture D10
            "G02*" + // clockwise interpolation
            "G75*" + // multi-quadrant mode
            "X10Y20D02*" + // move to (1,2)
            "X40Y30I20J-10D01*" + // interpolate to (4,3) circle center at (3,1)
            "G03*" + // counterclockwise interpolation
            "X70Y40I10J20D01*" + // interpolate to (7,4) circle center at (5,5)
            "M02* "; // END
        grb.parseLayer("GTO", gto);

        var gtoArcs = grb.pcbArcs();
        gtoArcs.length.should.equal(2);
        gtoArcs[0].type.should.equal("arc");
        gtoArcs[0].x1.should.approximately(25.4 * 1, e);
        gtoArcs[0].y1.should.approximately(25.4 * 2, e);
        gtoArcs[0].x2.should.approximately(25.4 * 4, e);
        gtoArcs[0].y2.should.approximately(25.4 * 3, e);
        gtoArcs[0].rx.should.approximately(25.4 * Math.sqrt(5), e);
        gtoArcs[0].ry.should.approximately(25.4 * Math.sqrt(5), e);
        gtoArcs[0].sw.should.approximately(25.4 * 0.137, e);
        gtoArcs[0].sweep.should.equal(1);
        gtoArcs[0].largeArc.should.equal(0);
        gtoArcs[1].type.should.equal("arc");
        gtoArcs[1].x1.should.approximately(25.4 * 4, e);
        gtoArcs[1].y1.should.approximately(25.4 * 3, e);
        gtoArcs[1].x2.should.approximately(25.4 * 7, e);
        gtoArcs[1].y2.should.approximately(25.4 * 4, e);
        gtoArcs[1].rx.should.approximately(25.4 * Math.sqrt(5), e);
        gtoArcs[1].ry.should.approximately(25.4 * Math.sqrt(5), e);
        gtoArcs[1].sweep.should.equal(0);
        gtoArcs[1].largeArc.should.equal(0);
    });
    it("pcbBounds(layerSpec) returns arcs in specified layer", function() {
        var grb = new Gerber({
            verbose: false
        });
        var gto = "%FSLAX21Y21*%" + // coordinates 1-digit precision
            "%MOIN*%" + // units inches
            "%ADD352C,0.13700*%" + // Define aperture D352 <= circle 0.137"
            "D352*" + // Use aperture D10
            "G02*" + // clockwise interpolation
            "G75*" + // multi-quadrant mode
            "X10Y20D02*" + // move to (1,2)
            "X40Y30I20J-10D01*" + // interpolate to (4,3) circle center at (3,1)
            "G01*" + // linear interpolation
            "X70Y40I10J20D01*" + // line to (7,4)
            "X80Y40D02*" + // move to (8,4)
            "D03*" + // flash
            "M02* "; // END
        grb.parseLayer("GTO", gto);

        var bounds = grb.pcbBounds();
        bounds.l.should.approximately( 25.4 * 1, e);
        bounds.t.should.approximately( 25.4 * 4, e);
        bounds.r.should.approximately( 25.4 * 8, e);
        bounds.b.should.approximately( 25.4 * 2, e);
    });
})
