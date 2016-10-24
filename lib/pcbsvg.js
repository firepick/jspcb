(function(exports) {
    function PcbSvgFactory(options) {
        var that = this;
        options = options || {};
        that.writer = options.writer || console;
        that.colors = options.colors || {};
        that.fontFamily = options.fontFamily || "monospace";
        that.verbose = options.verbose;
        that.scale = 100; // 2-digit precision
        return that;
    }
    PcbSvgFactory.prototype.elementAttrs = function(name, attrs) {
        var svg = '<' + name;
        var keys = Object.keys(attrs);
        for (var iAttr = 0; iAttr < keys.length; iAttr++) {
            var key = keys[iAttr];
            var value = attrs[key];
            if (value != null) {
                svg += ' ';
                svg += key;
                svg += '="';
                svg += attrs[key];
                svg += '"';
            }
        }
        return svg;
    }
    PcbSvgFactory.prototype.log = function() {
        var that = this;
        that.writer.log.apply(that.writer, arguments);
    }
    PcbSvgFactory.prototype.elementStart = function(name, attrs, comment) {
        var that = this;
        var svg = that.elementAttrs(name, attrs);
        svg += '>';
        comment && (svg += '<!--' + comment + '-->');
        return svg;
    }
    PcbSvgFactory.prototype.elementEnd = function(name, comment) {
        var that = this;
        var svg = '</' + name + '>';
        comment && (svg += '<!--' + comment + '-->');
        return svg;
    }
    PcbSvgFactory.prototype.element = function(name, attrs, comment) {
        var that = this;
        var svg = that.elementAttrs(name, attrs);
        svg += '/>';
        comment && (svg += '<!--' + comment + '-->');
        that.log(svg);
        return svg;
    }
    PcbSvgFactory.prototype.attr = function(key, value) {
        return ' ' + key + '="' + value + '"';
    }
    PcbSvgFactory.prototype.writeTexts = function(texts) {
        var that = this;
        if (!texts || !texts.length) {
            return that;
        }
        that.log(that.elementStart("g", {
            fill: that.colors.text || "#888",
            "font-family": that.fontFamily,
        }, "pcb text"));
        for (var iText = 0; iText < texts.length; iText++) {
            var text = texts[iText];
            var transform = null;
            if (text.angle) {
                transform = 'rotate(' + (-text.angle) + ',' + text.x + ',' + (-text.y) + ')';
            }
            var tspans = text.text.replace(/ /g, "&#x00a0;").split("\n");
            var lineH = text.size * 1.45;
            if (tspans.length > 1) {
                var top = -text.y - (tspans.length - 1) * lineH;
                for (var iSpan = 0; iSpan < tspans.length; iSpan++) {
                    tspans[iSpan] = '<tspan' +
                        ' x="' + text.x + '"' +
                        ' y="' + (top + iSpan * lineH) + '"' +
                        '>' +
                        tspans[iSpan] +
                        '</tspan>\n';
                }
                tspans = "\n" + tspans.join("");
            } else {
                tspans = tspans.join("");
            }
            that.log(
                that.elementStart('text', {
                    x: text.x,
                    y: -text.y,
                    "font-size": lineH,
                    transform: transform,
                }) +
                tspans +
                that.elementEnd('text')
            );
        }
        that.log(that.elementEnd('g', 'pcb text'));
        return that;
    }
    PcbSvgFactory.prototype.writeSmds = function(smds) {
        var that = this;
        if (!smds || !smds.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            fill: that.colors.pad || "#f80",
            transform: "scale(1,-1)",
        }, 'pcb smd'));
        for (var iSMD = 0; iSMD < smds.length; iSMD++) {
            var smd = smds[iSMD];
            var transform = smd.angle ?
                'rotate(' + smd.angle + ',' + smd.x + ',' + smd.y + ')' : null;
            that.element("rect", {
                x: smd.x - smd.width / 2,
                y: smd.y - smd.height / 2,
                width: smd.width,
                height: smd.height,
                transform: transform,
            }, smd.element);
        }
        that.log(that.elementEnd('g', 'pcb smd'));
        return that;
    }
    PcbSvgFactory.prototype.writeArcs = function(arcs) {
        var that = this;
        if (!arcs || !arcs.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            stroke: that.colors.arc || "#000",
            fill: "none",
            transform: "scale(1,-1)",
        }, 'pcb arcs'));
        for (var iArc = 0; iArc < arcs.length; iArc++) {
            var arc = arcs[iArc];
            that.element("path", {
                d: 'M'+
                    arc.x1+' '+
                    arc.y1+', '+
                    "A " + 
                    arc.rx + ' ' + 
                    arc.ry + ', ' +
                    '0 ' +
                    arc.largeArc + ' ' +
                    (arc.sweep ? 0:1) + ' ' + // flip sweep sense with coordinates
                    arc.x2 + ' ' +
                    arc.y2 + ' ' +
                    '',
                "stroke-width": arc.width,
            }, arc.element);
        }
        that.log(that.elementEnd('g', 'pcb arcs'));
        return that;
    }
    PcbSvgFactory.prototype.writeHoles = function(holes) {
        var that = this;
        if (!holes || !holes.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            fill: that.colors.hole || "#000",
        }, 'pcb holes'));
        for (var iHole = 0; iHole < holes.length; iHole++) {
            var hole = holes[iHole];
            that.element("circle", {
                cx: hole.x,
                cy: -hole.y,
                r: hole.drill / 2,
            }, hole.element);
        }
        that.log(that.elementEnd('g', 'pcb holes'));
        return that;
    }

    PcbSvgFactory.prototype.pcbBounds = function(options) {
        var that = this;
        options = options || {};
        var dimWires = options.dimWires || [];
        var bounds = options.bounds || {};
        if (bounds.l == null || bounds.t == null || bounds.r == null || bounds.b == null) {
            if (dimWires.length < 4) {
                throw new Error("[SVG001] could not determine PCB bounds");
            }
            bounds.l = bounds.r = dimWires[0].x1;
            bounds.t = bounds.b = dimWires[0].y1;
            for (var iWire = 0; iWire < dimWires.length; iWire++) {
                var wire = dimWires[iWire];
                bounds.l = Math.min(bounds.l, wire.x1);
                bounds.r = Math.max(bounds.r, wire.x1);
                bounds.l = Math.min(bounds.l, wire.x2);
                bounds.r = Math.max(bounds.r, wire.x2);
                bounds.t = Math.min(bounds.t, wire.y1);
                bounds.b = Math.max(bounds.b, wire.y1);
                bounds.t = Math.min(bounds.t, wire.y2);
                bounds.b = Math.max(bounds.b, wire.y2);
            }
        }
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        if (width <= 0) {
            throw new Error("[SVG002] board width must be positive:" + JSON.stringify(bounds));
        }
        if (height <= 0) {
            throw new Error("[SVG003] board height must be positive:" + JSON.stringify(bounds));
        }
        return bounds;
    }
    PcbSvgFactory.prototype.round = function(value) {
        var that = this;
        return Math.round(value * that.scale) / that.scale;
    }
    PcbSvgFactory.prototype.writeWires = function(wires, comment, stroke) {
        var that = this;
        if (wires.length < 1) {
            return;
        }
        var strokeWidth = 0.2;
        that.log(that.elementStart('g', {
            stroke: stroke || "#f00",
            fill: "none",
            "stroke-width": strokeWidth,
            transform:"scale(1,-1)",
        }, comment));
        for (var iWire = 0; iWire < wires.length; iWire++) {
            var wire = wires[iWire];
            var x1 = that.round(wire.x1);
            var y1 = that.round(wire.y1);
            var x2 = that.round(wire.x2);
            var y2 = that.round(wire.y2);
            var points = x1 + ' '+ y1 + ' ' + x2 + ' ' + y2;
            if (wire.sw != null && strokeWidth !== wire.sw) {
                that.log(that.elementEnd('g', comment));
                strokeWidth = wire.sw;
                that.log(that.elementStart('g', {
                    stroke: stroke || "#f00",
                    fill: "none",
                    "stroke-width": strokeWidth,
                    transform:"scale(1,-1)",
                }, comment));
            }
            for (var nextWire; (nextWire = wires[iWire+1]); iWire++) {
                var x3 = that.round(nextWire.x1);
                var y3 = that.round(nextWire.y1);
                if (x3 != x2 || y3 != y2 || nextWire.sw != null && nextWire.sw != strokeWidth) {
                    break;
                }
                x1 = x3;
                y1 = y3;
                x2 = that.round(nextWire.x2);
                y2 = that.round(nextWire.y2);
                points += ' ' + x2 + ' ' + y2;
            }
            that.element("polyline", {points: points});
        }
        that.log(that.elementEnd('g', comment));
    }
    PcbSvgFactory.prototype.create = function(options) {
        var that = this;
        options = options || {};
        var oldWriter = that.writer;
        that.writer = options.writer || that.writer;
        that.log('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');

        var dimWires = options.dimWires || []; // board outline
        var bounds = that.pcbBounds(options);
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        that.log('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"',
            'width="' + width + 'mm" height="' + height + 'mm"',
            'viewbox="',
            bounds.l, -bounds.b, bounds.r - bounds.l, bounds.b - bounds.t,
            '" >');
        that.log('<g stroke-linecap="round" stroke-width="0.25">');
        that.element("rect", {
            x: bounds.l,
            y: bounds.t,
            width: width,
            height: height,
            transform: "scale(1,-1)",
            fill: that.colors.board || "#ddf",
        }, "dimension");

        that.writeWires(dimWires, "dimension", that.colors.outline || "#f0f");
        that.writeWires(options.silkWires || [], "silkscreen", that.colors.silkscreen || "#000");
        that.writeWires(options.copperWIres || [], "copper", that.colors.copper || "#f80");
        that.writeTexts(options.texts || []);
        that.writeArcs(options.arcs || []);
        that.writeSmds(options.smds || []);
        that.writeHoles(options.holes || []);

        that.log('</g>');
        that.log('</svg>');
        that.writer = oldWriter;
        return that;
    }

    module.exports = exports.PcbSvgFactory = PcbSvgFactory;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("EagleBRD", function() {
    var should = require("should");
    var LogString = require("./logstring");
    var PcbSvgFactory = exports.PcbSvgFactory; // require("./PcbSvgFactory");
    var dimWires = [{
        type: "L",
        x1: 1,
        y1: 2,
        x2: 1,
        y2: 4,
    }, {
        type: "L",
        x1: 1,
        y1: 4,
        x2: 3,
        y2: 4,
    }, {
        type: "L",
        x1: 1,
        y1: 2,
        x2: 3,
        y2: 2,
    }, {
        type: "L",
        x1: 3,
        y1: 2,
        x2: 3,
        y2: 4,
    }];
    var smds = [{
        type: "rect",
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        angle: 0,
    }, {
        type: "rect",
        x: 10,
        y: 20,
        width: 30,
        height: 40,
        angle: 45,
    }];
    var SVGHEADER = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n' +
        '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="2mm" height="2mm" viewbox=" 1 -4 2 2 " >\n' +
        '<g stroke-linecap="round" stroke-width="0.25">\n';
    var SVGTRAILER = '</g>\n' +
        '</svg>\n';
    it("PcbSvgFactory(options) creates SVG factory for PCBs", function() {
        var factory = new PcbSvgFactory();
        factory.writer.should.equal(console); // default output is console
        var slog = new LogString();
        var factory = new PcbSvgFactory({
            writer: slog,
            verbose: true,
        });
        factory.log("hello");
        slog.output.should.equal('hello\n');
        factory.writer.should.equal(slog);
    })
    it("element(name, attrs, comment) creates SVG element", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory({
            writer: slog
        });

        var elt = factory.element("rect", {
            x: 1,
            y: 2,
            width: 3,
            height: 4,
            fill: "red"
        });
        elt.should.equal('<rect x="1" y="2" width="3" height="4" fill="red"/>');
        slog.output.should.equal('<rect x="1" y="2" width="3" height="4" fill="red"/>\n');

        slog.output = "";
        elt = factory.element("rect", {
            x: 1,
            y: 2,
            width: 3,
            height: 4,
            "stroke-width": 0.5
        }, "hello");
        elt.should.equal('<rect x="1" y="2" width="3" height="4" stroke-width="0.5"/><!--hello-->');
        slog.output.should.equal('<rect x="1" y="2" width="3" height="4" stroke-width="0.5"/><!--hello-->\n');
    })
    it("pcbBounds(options) returns PCB bounding rectangle", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory({
            writer: slog
        });
        var bounds = factory.pcbBounds({
            dimWires: dimWires
        });
        should.deepEqual(bounds, {
            l: 1,
            t: 2,
            r: 3,
            b: 4,
        });
        var bounds = factory.pcbBounds({
            bounds: {
                l: 1,
                t: 2,
                r: 3,
                b: 4
            }
        });
        should.deepEqual(bounds, {
            l: 1,
            t: 2,
            r: 3,
            b: 4,
        });
    })
    it("create(options) creates SVG document with PCB outline", function() {
        var logger = new LogString();
        var factory = new PcbSvgFactory({
            writer: logger
        });
        factory.create({
            dimWires: dimWires
        });
        logger.output.should.equal(SVGHEADER +
            '<rect x="1" y="2" width="2" height="2" transform="scale(1,-1)" fill="#ddf"/><!--dimension-->\n' +
            '<g stroke="#f0f" fill="none" stroke-width="0.2" transform="scale(1,-1)"><!--dimension-->\n' +
            '<polyline points="1 2 1 4 3 4"/>\n' +
            '<polyline points="1 2 3 2 3 4"/>\n' +
            '</g><!--dimension-->\n' +
            SVGTRAILER);
    })
    it("create(options) creates SVG document with PCB SMD pads", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory();
        factory.create({
            writer: slog,
            bounds: {
                l: 1,
                t: 2,
                r: 3,
                b: 4
            },
            smds: smds,
        });
        slog.output.should.equal(SVGHEADER +
            '<rect x="1" y="2" width="2" height="2" transform="scale(1,-1)" fill="#ddf"/><!--dimension-->\n' +
            '<g fill="#f80" transform="scale(1,-1)"><!--pcb smd-->\n' +
            '<rect x="-0.5" y="0" width="3" height="4"/>\n' +
            '<rect x="-5" y="0" width="30" height="40" transform="rotate(45,10,20)"/>\n' +
            '</g><!--pcb smd-->\n' +
            SVGTRAILER);
        slog.clear();
        var factory = new PcbSvgFactory({
            writer: slog
        });
        factory.create({
            bounds: {
                l: 1,
                t: 2,
                r: 3,
                b: 4
            },
            smds: smds,
        });
        slog.output.should.equal(SVGHEADER +
            '<rect x="1" y="2" width="2" height="2" transform="scale(1,-1)" fill="#ddf"/><!--dimension-->\n' +
            '<g fill="#f80" transform="scale(1,-1)"><!--pcb smd-->\n' +
            '<rect x="-0.5" y="0" width="3" height="4"/>\n' +
            '<rect x="-5" y="0" width="30" height="40" transform="rotate(45,10,20)"/>\n' +
            '</g><!--pcb smd-->\n' +
            SVGTRAILER);
    })
    it("writeArcs(arcs) generates SVG for arcs", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory({writer: slog});
        var arcs = factory.writeArcs([]);
        slog.output.should.equal("");
        var arcs = factory.writeArcs([{
            type:"arc",
            x1: 2,
            y1: 3,
            x2: 4,
            y2: 5,
            rx: 6,
            ry: 7,
            largeArc: 1,
            sweep: 0,
        },{
            type:"arc",
            x1: 20,
            y1: 30,
            x2: 40,
            y2: 50,
            rx: 60,
            ry: 70,
            largeArc: 0,
            sweep: 1,
        }]);
        slog.output.should.equal(
            '<g stroke="#000" fill="none" transform="scale(1,-1)"><!--pcb arcs-->\n' +
            '<path d="M2 3, A 6 7, 0 1 1 4 5 "/>\n' +
            '<path d="M20 30, A 60 70, 0 0 0 40 50 "/>\n' +
            '</g><!--pcb arcs-->\n' );
    })
});
