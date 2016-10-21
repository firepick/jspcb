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
 * TXT  Gerber drill file file
*/

(function(exports) {
    ////////////////// constructor
    function Gerber(options) {
        var that = this;

        options = options || {};
        //that.bounds = parseBounds(that);
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
            n = n*10 + (c - CHAR0);
            that.pos++;
        }
        if (that.peekCharCode(CHARPERIOD)) {
            var scale = 0.1;
            while (c = that.peekCharCode()) {
                if (c < CHAR0 || CHAR9 < c) {
                    break;
                }
                m += (c - CHAR0)*scale;
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
                code = (code == null ? 0 : code*10) + (c - CHAR0);
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
                    if (dcode< 10) {
                        throw new Error("[GRB001] invalid aperture D code: "+datablock.s);
                    }
                    var name = datablock.getCharCode();
                    if (name === CHARC) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var aperture = {
                                type: "circle",
                                r: layer.unit * datablock.getDouble() / 2,
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
                                var r = Math.min(width, height)/2;
                                var aperture = {
                                    type: "rect",
                                    width: width,
                                    height: height,
                                    rx: r,
                                    ry: r,
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
                                    type: "P",
                                    od: layer.unit * od,
                                    v: datablock.getDouble(),
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
                                var aperture = {
                                    type: "rect",
                                    width: layer.unit * x,
                                    height: layer.unit * datablock.getDouble(),
                                }
                                if (datablock.peekCharCode(CHARX)) {
                                    aperture.hole = layer.unit * datablock.getDouble();
                                }
                                layer.apertures[dcode] = aperture;
                                parsed = true;
                            }
                        }
                    } else {
                        console.log("[GRB002] not implemented:", datablock.s);
                        parsed = true;
                    }
                }
            } else if (datablock.peekCharCode(CHARM)) { // AM
                console.log("[GRB003] not implemented:", datablock.s);
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
            console.log("[GRB004] deprecated extended function codes:", datablock.s);
            parsed = true;
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
            throw new Error("[GRB005] invalid extended function code:"+datablock.s);
        }
    }

    function processDCode(that, layer, datablock) {
        var x = layer.x;
        var y = layer.y;
        var dx = 0;
        var dy = 0;
        var dcode = null;
        while (datablock.available()) {
            if (datablock.peekCharCode(CHARX)) {
                x = layer.xscale*datablock.getInteger();
            } else if (datablock.peekCharCode(CHARY)) {
                y = layer.yscale*datablock.getInteger();
            } else if (datablock.peekCharCode(CHARI)) {
                dx = layer.xscale*datablock.getInteger();
            } else if (datablock.peekCharCode(CHARJ)) {
                dy = layer.yscale*datablock.getInteger();
            } else if (datablock.peekCharCode(CHARD)) {
                dcode = datablock.getInteger();
            } else if (datablock.peekCharCode(CHARSTAR)) {
                break;
            } else {
                throw new Error("[GRB006] invalid D code:"+datablock.s);
            }
        }
        if (dcode < 10 && (x == null || y == null) || dcode == null) {
            throw new Error("[GRB007] invalid D code syntax:"+datablock.s);
        }
        var x2 = x + dx;
        var y2 = y + dy;
        switch (dcode) {
        case 1: // D01 interpolate
            if (layer.interpolation === "L") {
                layer.graphics.push({
                    type: "line",
                    x1: layer.x,
                    y1: layer.y,
                    x2: x2,
                    y2: y2,
                });
            } else if (layer.interpolation === "CW") {
                console.log("Ignoring D01 CW interpolation", datablock);
            } else if (layer.interpolation === "CCW") {
                console.log("Ignoring D01 CCW interpolation", datablock);
            }
            break;
        case 2: // D02 move
            break;
        case 3: // D03 flash
            if (layer.regionMode) {
                throw new Error("[GRB008] D03 not allowed during region mode:"+datablock.s);
            }
            if (layer.aperture == null) {
                throw new Error("[GRB009] no aperture:"+datablock.s);
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
            layer.interpolation = "L"; // line
            break;
        case 2:
            layer.interpolation = "CW"; // clockwise
            break;
        case 3:
            layer.interpolation = "CCW"; // counterclockwise
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
            break;
        case 75:
            layer.quadrantMode = "M"; // multi-quadrant arc interpolation
            break;
        default:
            throw new Error("[GRB010] invalid G code:"+datablock.s);
        }
        return that;
    }
    function processStandardCode(that, layer, datablock) {
        if (datablock.peekCharCode(CHARG)) {
            processGCode(that, layer, datablock);
        } else if (datablock.peekCharCode(CHARM)) {
            if (datablock.getInteger() !== 2) {
                throw new Error("[GRB011] invalid M code:"+datablock.s);
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
        that.rectangle =[];
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
        that.xscale = that.unit * Math.pow(10,-that.xm);
        that.yscale = that.unit * Math.pow(10,-that.ym);
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
                var iPct = buffer.indexOf(CHARPCT, iPos+1);
                if (iPct < 0) {
                    var err = new Error("[GRB012] Invalid Gerber file:  "+buffer.toString("UTF-8", iPos, iPos+50));
                    console.log(err);
                    throw err;
                }
                var datablock = new DataBlock(buffer.toString("UTF-8", iPos+1, iPct+1));
                processExtendedCode(that, layer, datablock);
                iPos = iPct;
                break;
            default:
                var iStar = buffer.indexOf(CHARSTAR, iPos);
                if (iStar < 0) {
                    var err = new Error("[GRB013] Invalid Gerber file:  "+buffer.toString(iPos-5, iPos+50));
                    console.log(err);
                    throw err;
                }
                var datablock = new DataBlock(buffer.toString("UTF-8", iPos, iStar+1));
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
    Gerber.prototype.pcbText = function(layer, options) {
        var that = this;
        return [];
    }
    Gerber.prototype.pcbRectangles = function(layer, options) {
        var that = this;
        return [];
    }
    Gerber.prototype.pcbHoles = function(options) {
        var that = this;
        return [];
    }
    Gerber.prototype.pcbPads = function(layerId, options) {
        var that = this;
        if (layerId == null) {
            var priority = ["GTP", "GTS", "GBS", "GTL", "GBL"];
            for (var iLay = 0; iLay < priority.length; iLay++) {
                var key = priority[iLay];
                if (that.layers[key]) {
                    layerId = key;
                    break;
                }
            }
        }
        var pads = that.pushGraphics([], that.layers[layerId], 'rect');
        that.verbose && console.log("pcbPads(" + layerId + ") pads:" + pads.length );
        return pads;
    }
    Gerber.prototype.pcbWires = function(layerId) {
        var that = this;
        layerId = layerId || "GKO";
        return that.pushGraphics([], that.layers[layerId], 'line');
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
            verbose: true
        });
        grb.should.property("layers");
        var layer = grb.parseLayer("GTO", "G04 Layer_Color=8421504*");
        grb.verbose = false;
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
        var layer = grb.parseLayer("GTO", "G4*\n\r G74*");
        layer.quadrantMode.should.equal("S");
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
            type: "circle",
            r: 0,
        });
        var layer = grb.parseLayer("GTO", "%ADD12C,12.34*%");
        should.deepEqual(layer.apertures[12], {
            type: "circle",
            r: 12.34 * 25.4 / 2,
        });
        var layer = grb.parseLayer("GTO", "%MOMM% %ADD123C,12.34X45.6*%");
        should.deepEqual(layer.apertures[123], {
            type: "circle",
            r: 12.34 / 2,
            hole: 45.6
        });
        var layer = grb.parseLayer("GTO", "%MOMM% %ADD0078R,1.2X3.4*%");
        should.deepEqual(layer.apertures[78], {
            height: 3.4,
            type: "rect",
            width: 1.2,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078R,1.2X3.4X45.6*%");
        should.deepEqual(layer.apertures[78], {
            height: 25.4*3.4,
            type: "rect",
            width: 25.4*1.2,
            hole: 25.4*45.6,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078O,1.2X3.4*%");
        layer.apertures[78].type.should.equal("rect");
        layer.apertures[78].width.should.approximately(1.2*25.4, e);
        layer.apertures[78].height.should.approximately(3.4*25.4, e);
        layer.apertures[78].rx.should.approximately(0.6*25.4, e);
        layer.apertures[78].ry.should.approximately(0.6*25.4, e);
        var layer = grb.parseLayer("GTO", "%MOIN% %ADD0078O,1.2X3.4X45.6*%");
        layer.apertures[78].type.should.equal("rect");
        layer.apertures[78].width.should.approximately(1.2*25.4, e);
        layer.apertures[78].height.should.approximately(3.4*25.4, e);
        layer.apertures[78].rx.should.approximately(0.6*25.4, e);
        layer.apertures[78].ry.should.approximately(0.6*25.4, e);
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
        layer.x.should.approximately(1.25, e);
        layer.y.should.approximately(4.59, e);
        var layer = grb.parseLayer("GTO", "%FSLAX12Y12*% %MOMM*% I2J-3X123Y456D2*");
        layer.x.should.approximately(1.25, e);
        layer.y.should.approximately(4.53, e);
        var layer = grb.parseLayer("GTO", "%FSLAX12Y12*% %MOMM*% %ADD10C,5*% D10* X123Y456D3*");
        should.deepEqual(layer.aperture, {
            r: 5 / 2,
            type: "circle",
        });
        layer.graphics[0].should.properties({
            r: 5 / 2,
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
        wires[0].x1.should.approximately(25.4*1,e);
        wires[0].x2.should.approximately(25.4*1,e);
        wires[0].y1.should.approximately(25.4*1,e);
        wires[0].y2.should.approximately(25.4*2,e);
        wires[1].type.should.equal("line");
        wires[1].x1.should.approximately(25.4*1,e);
        wires[1].x2.should.approximately(25.4*7.1,e);
        wires[1].y1.should.approximately(25.4*2,e);
        wires[1].y2.should.approximately(25.4*2,e);
        wires[2].type.should.equal("line");
        wires[2].x1.should.approximately(25.4*7.1,e);
        wires[2].x2.should.approximately(25.4*7.1,e);
        wires[2].y1.should.approximately(25.4*1,e);
        wires[2].y2.should.approximately(25.4*2,e);
        wires[3].type.should.equal("line");
        wires[3].x1.should.approximately(25.4*1,e);
        wires[3].x2.should.approximately(25.4*7.1,e);
        wires[3].y1.should.approximately(25.4*1,e);
        wires[3].y2.should.approximately(25.4*1,e);
    });
    it("pcbPads('GTP',options) returns solder paste pads for top paste layer", function() {
        var grb = new Gerber({verbose: false});
        var gdata = "%FSLAX21Y21*%" + // coordinates 1-digit precision
            "%MOIN*%" + // units inches
            "%ADD10R,0.3X0.4*%" + // Define aperture D10 <= rectangle 0.3x0.4
            "D10*" + // Use aperture D10
            "X10Y20D02*" + // move to (1,2)
            "D03*" + // flash
            "X50Y60D02*" + // move to (5,6)
            "D03*" + // flash
            "M02* "; // END
        var layer = grb.parseLayer("GTS", gdata);
        var pads = grb.pcbPads("GTS");
        pads.length.should.equal(2);
        pads[0].type.should.equal("rect");
        pads[0].x.should.approximately(25.4*1,e);
        pads[0].y.should.approximately(25.4*2,e);
        pads[0].width.should.approximately(25.4*0.3,e);
        pads[0].height.should.approximately(25.4*0.4,e);
        pads[1].type.should.equal("rect");
        pads[1].x.should.approximately(25.4*5,e);
        pads[1].y.should.approximately(25.4*6,e);
        pads[1].width.should.approximately(25.4*0.3,e);
        pads[1].height.should.approximately(25.4*0.4,e);
        should.deepEqual(pads, grb.pcbPads()); // test layer heuristic
    });
})
