var math = require("mathjs");
var fs = require('fs');
var Trans2D = require("./trans2d");
var DOMParser = require("xmldom").DOMParser;

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
    var CHARL = "L".charCodeAt(0);
    var CHARM = "M".charCodeAt(0);
    var CHARN = "N".charCodeAt(0);
    var CHARO = "O".charCodeAt(0);
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
        var c;
        while (c = that.peekCharCode()) {
            if (c < CHAR0 || CHAR9 < c) {
                break;
            }
            code = (code == null ? 0 : code*10) + (c - CHAR0);
            that.pos++;
        }
        return code;
    }

    function processExtendedCode(that, layer, datablock) {
        var parsed = false;
        if (datablock.peekCharCode(CHARA)) {
            if (datablock.peekCharCode(CHARD)) {
                if (datablock.peekCharCode(CHARD)) {
                    var dcode = datablock.getInteger();
                    if (dcode< 10) {
                        throw new Error("[GRB007] invalid aperture D code"+datablock);
                    }
                    var name = datablock.getCharCode();
                    if (name === CHARC) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var aperture = {
                                type: "C",
                                diameter: datablock.getDouble(),
                            }
                            if (datablock.peekCharCode(CHARX)) {
                                aperture.hole = datablock.getDouble();
                            }
                            layer.apertures[dcode] = aperture;
                            parsed = true;
                        }
                    } else if (name === CHARO) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var x = datablock.getDouble();
                            if (datablock.peekCharCode(CHARX)) {
                                var aperture = {
                                    type: "O",
                                    x: x,
                                    y: datablock.getDouble(),
                                }
                                if (datablock.peekCharCode(CHARX)) {
                                    aperture.hole = datablock.getDouble();
                                }
                                layer.apertures[dcode] = aperture;
                                parsed = true;
                            }
                        }
                    } else if (name === CHARR) {
                        if (datablock.peekCharCode(CHARCOMMA)) {
                            var x = datablock.getDouble();
                            if (datablock.peekCharCode(CHARX)) {
                                var aperture = {
                                    type: "R",
                                    x: x,
                                    y: datablock.getDouble(),
                                }
                                if (datablock.peekCharCode(CHARX)) {
                                    aperture.hole = datablock.getDouble();
                                }
                                layer.apertures[dcode] = aperture;
                                parsed = true;
                            }
                        }
                    } else {
                        throw new Error("not implemented");
                    }
                }
            } else if (datablock.peekCharCode(CHARM)) {
                throw new Error("not implemented");
                parsed = true;
            }
        }
        if (datablock.peekCharCode(CHARF)) {
            if (datablock.peekCharCode(CHARS)) {
                if (datablock.peekCharCode(CHARL)) {
                    if (datablock.peekCharCode(CHARA)) {
                        if (datablock.peekCharCode(CHARX)) {
                            layer.xn = datablock.getCharCode() - CHAR0;
                            layer.xm = datablock.getCharCode() - CHAR0;
                            if (datablock.peekCharCode(CHARY)) {
                                layer.yn = datablock.getCharCode() - CHAR0;
                                layer.ym = datablock.getCharCode() - CHAR0;
                                parsed = true;
                            }
                        }
                    }
                }
            }
        } else if (datablock.peekCharCode(CHARL)) {
            if (datablock.peekCharCode(CHARF)) {
                throw new Error("not implemented");
            }
        } else if (datablock.peekCharCode(CHARM)) {
            if (datablock.peekCharCode(CHARO)) {
                if (datablock.peekCharCode(CHARI) && datablock.peekCharCode(CHARN)) {
                    layer.unit = 25.4; // inch
                    that.verbose && console.log("unit:", layer.unit);
                    parsed = true;
                } else if (datablock.peekCharCode(CHARM) && datablock.peekCharCode(CHARM)) {
                    layer.unit = 1; // millimeters
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
            throw new Error("[GRB006] invalid extended function code:"+datablock.s);
        }
    }

    function processGCode(that, layer, datablock) {
        var gcode = datablock.getInteger();
        switch (gcode) {
        case 1:
            layer.interpolation = "L";
            break;
        case 2:
            layer.interpolation = "CW";
            break;
        case 3:
            layer.interpolation = "CCW";
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
        case 74:
            layer.quadrantMode = "S";
            break;
        case 75:
            layer.quadrantMode = "M";
            break;
        default:
            throw new Error("[GRB003] invalid G code:"+datablock.s);
        }
        return that;
    }
    function processStandardCode(that, layer, datablock) {
        switch (datablock.getCharCode()) {
        case CHARD:
            break;
        case CHARG:
            processGCode(that, layer, datablock);
            break;
        case CHARM:
            if (datablock.getInteger() !== 2) {
                throw new Error("[GRB004] invalid M code:"+datablock.s);
            }
            layer.eof = true;
            break;
        default:
            break;
        }
    }

    function Layer(buffer) {
        var that = this;

        that.buffer = buffer;
        that.datablocks = 0,
        that.comments = 0;
        that.rectangle =[];
        that.interpolation = null;
        that.apertures = {};
        that.aperture = null;
        that.regionMode = null;
        that.quadrantMode = null;
        that.coordFormat = null;
        that.unit = null;
        that.x = null;
        that.y = null;
        that.polarity = null;

        return that;
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
                    var err = new Error("[CRB001] Invalid Gerber file:  "+buffer.toString("UTF-8", iPos, iPos+50));
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
                    var err = new Error("[CRB002] Invalid Gerber file:  "+buffer.toString(iPos, iPos+50));
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
    Gerber.prototype.pcbRectangles = function(layer, options) {
        var that = this;
    }
    Gerber.prototype.pcbHoles = function(options) {
        var that = this;
    }
    Gerber.prototype.pcbPads = function(layer, options) {
        var that = this;
    }
    Gerber.prototype.pcbWires = function(layer) {
        var that = this;
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
        var layer = grb.parseLayer("GTO", "%FSLAX12Y34*%");
        layer.xn.should.equal(1);
        layer.xm.should.equal(2);
        layer.yn.should.equal(3);
        layer.ym.should.equal(4);
    })
    it("parseLayer(id,stringOrBuffer) parses A commands", function() {
        var grb = new Gerber();
        var layer = grb.parseLayer("GTO", "%ADD12C,0*%");
        should.deepEqual(layer.apertures[12], {
            type: "C",
            diameter: 0,
        });
        var layer = grb.parseLayer("GTO", "%ADD12C,12.34*%");
        should.deepEqual(layer.apertures[12], {
            type: "C",
            diameter: 12.34,
        });
        var layer = grb.parseLayer("GTO", "%ADD123C,12.34X45.6*%");
        should.deepEqual(layer.apertures[123], {
            type: "C",
            diameter: 12.34,
            hole: 45.6
        });
        var layer = grb.parseLayer("GTO", "%ADD0078R,1.2X3.4*%");
        should.deepEqual(layer.apertures[78], {
            type: "R",
            x: 1.2,
            y: 3.4,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078R,1.2X3.4X45.6*%");
        should.deepEqual(layer.apertures[78], {
            type: "R",
            x: 1.2,
            y: 3.4,
            hole: 45.6,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078O,1.2X3.4*%");
        should.deepEqual(layer.apertures[78], {
            type: "O",
            x: 1.2,
            y: 3.4,
        });
        var layer = grb.parseLayer("GTO", "%ADD0078O,1.2X3.4X45.6*%");
        should.deepEqual(layer.apertures[78], {
            type: "O",
            x: 1.2,
            y: 3.4,
            hole: 45.6,
        });
    })
})
