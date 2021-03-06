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
    PcbSvgFactory.prototype.writeTexts = function(texts, color) {
        var that = this;
        if (!texts || !texts.length) {
            return that;
        }
        that.log(that.elementStart("g", {
            fill: color || "#888",
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
    PcbSvgFactory.prototype.writeRects = function(rects, comment, color) {
        var that = this;
        if (!rects || !rects.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            fill: color || "#f80",
            transform: "scale(1,-1)",
        }, comment));
        for (var iRect = 0; iRect < rects.length; iRect++) {
            var rect = rects[iRect];
            var transform = rect.angle ?
                'rotate(' + rect.angle + ',' + rect.x + ',' + rect.y + ')' : null;
            that.element("rect", {
                x: rect.x - rect.width / 2,
                y: rect.y - rect.height / 2,
                width: rect.width,
                height: rect.height,
                rx: rect.rx,
                ry: rect.ry,
                transform: transform,
            }, rect.element);
        }
        that.log(that.elementEnd('g', comment));
        return that;
    }
    PcbSvgFactory.prototype.writeSmds = function(smds, color) {
        var that = this;
        if (!smds || !smds.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            fill: color || "#f80",
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
    PcbSvgFactory.prototype.writeArcs = function(arcs, comment, color) {
        var that = this;
        if (!arcs || !arcs.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            stroke: color || "#000",
            fill: "none",
            transform: "scale(1,-1)",
        }, comment));
        for (var iArc = 0; iArc < arcs.length; iArc++) {
            var arc = arcs[iArc];
            var x1 = that.round(arc.x1);
            var y1 = that.round(arc.y1);
            var x2 = that.round(arc.x2);
            var y2 = that.round(arc.y2);
            var rx = that.round(arc.rx);
            var ry = that.round(arc.ry);
            var strokeWidth = that.round(arc.sw);
            if (x1 === x2 && y1 === y2) {
                that.element("circle", {
                    cx: that.round(arc.cx),
                    cy: that.round(arc.cy),
                    r: (rx+ry)/2,
                    "stroke-width": strokeWidth,
                }, arc.element);
            } else {
                that.element("path", {
                    d: 'M'+
                        x1+' '+
                        y1+', '+
                        "A " + 
                        rx + ' ' + 
                        ry + ', ' +
                        '0 ' +
                        arc.largeArc + ' ' +
                        (arc.sweep ? 0:1) + ' ' + // flip sweep sense with coordinates
                        x2 + ' ' +
                        y2 + ' ' +
                        '',
                    "stroke-width": strokeWidth,
                }, arc.element);
            }
        }
        that.log(that.elementEnd('g', comment));
        return that;
    }
    PcbSvgFactory.prototype.writeHoles = function(holes) {
        var that = this;
        if (!holes || !holes.length) {
            return that;
        }
        that.log(that.elementStart('g', {
            fill: that.colors.hole || "#000",
            stroke: "none",
            transform: "scale(1,-1)",
        }, 'pcb holes'));
        for (var iHole = 0; iHole < holes.length; iHole++) {
            var hole = holes[iHole];
            that.element("circle", {
                cx: that.round(hole.x),
                cy: that.round(hole.y),
                r: that.round(hole.r),
            }, hole.element);
        }
        that.log(that.elementEnd('g', 'pcb holes'));
        return that;
    }

    PcbSvgFactory.prototype.calcBounds = function(options) {
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
                bounds.t = Math.max(bounds.t, wire.y1);
                bounds.b = Math.min(bounds.b, wire.y1);
                bounds.t = Math.max(bounds.t, wire.y2);
                bounds.b = Math.min(bounds.b, wire.y2);
            }
        }
        (that.verbose || options.verbose) && console.warn("bounds\t:", JSON.stringify(bounds));
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
        var strokeWidth = 0.1;
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
            if (wire.sw && strokeWidth !== wire.sw) {
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
    PcbSvgFactory.prototype.writeDocument = function(writer, options) {
        var that = this;
        options = options || {};
        var colors = options.colors || that.colors;
        var oldWriter = that.writer;
        that.writer = writer || that.writer;
        that.log('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');

        var dimWires = options.dimWires || []; // board edge
        var bounds = that.calcBounds(options);
        var view = options.view || {};
        view.l == null && (view.l = bounds.l);
        view.t == null && (view.t = bounds.t);
        view.r == null && (view.r = bounds.r);
        view.b == null && (view.b = bounds.b);
        var viewW = Math.abs(bounds.r - bounds.l);
        var viewH = Math.abs(bounds.b - bounds.t);
        var viewBox = {
            l: Math.min(view.l, view.r), 
            t: -Math.max(view.b, view.t),
            r: Math.max(view.l, view.r),
            b: -Math.min(view.b, view.t),
        };
        that.log(that.elementStart('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
            version: '1.1',
            width: viewW+'mm',
            height: viewH+'mm',
            viewbox: viewBox.l+' '+
                viewBox.t+' '+
                (viewBox.r-viewBox.l)+' '+
                (viewBox.b-viewBox.t)+' ',
        }));
        that.element("rect", {
            x: viewBox.l,
            y: viewBox.t,
            width: viewBox.r - viewBox.l,
            height: viewBox.b - viewBox.t,
            stroke: colors.viewBorder || 'none',
            fill: colors.view || "#fff", 
        }, "view");
        that.log('<g stroke-linecap="round" stroke-width="0.2">');
        that.element("rect", {
            x: bounds.l,
            y: Math.min(bounds.t,bounds.b),
            width: Math.abs(bounds.r - bounds.l),
            height: Math.abs(bounds.t - bounds.b),
            transform: "scale(1,-1)",
            stroke: colors.border || 'none',
            fill: colors.board || "#ddf", 
        }, "dimension");

        that.writeWires(dimWires, "dimension", colors.outline || "#000");
        that.writeWires(options.silkWires || [], "silkscreen", colors.silkscreen || colors.wires || "#fff");
        that.writeRects(options.silkRects || [], "silkscreen rects", colors.silkscreen || colors.rects || "#fff");
        that.writeArcs(options.arcs || [], "silkscreen arcs", colors.silkscreen || colors.arcs || "#fff");
        that.writeWires(options.copperWires || [], "copper", colors.copper || "#f80");
        that.writeTexts(options.texts || [], colors.text || colors.silkscreen || "#888");
        that.writeSmds(options.smds || [], colors.pads || colors.copper || "#f80");
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
        '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="2mm" height="2mm" viewbox="1 -4 2 2 ">\n' +
        '<rect x="1" y="-4" width="2" height="2" stroke="none" fill="#fff"/><!--view-->\n' +
        '<g stroke-linecap="round" stroke-width="0.2">\n';
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
    it("calcBounds(options) returns SVG PCB bounding box", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory({
            writer: slog
        });
        var bounds = factory.calcBounds({
            dimWires: dimWires
        });
        should.deepEqual(bounds, {
            l: 1,
            t: 4,
            r: 3,
            b: 2,
        });
        var bounds = factory.calcBounds({
            bounds: {
                l: 1,
                t: 4,
                r: 3,
                b: 2,
            }
        });
        should.deepEqual(bounds, {
            l: 1,
            t: 4,
            r: 3,
            b: 2,
        });
    })
    it("writeDocument(writer, options) creates SVG document with PCB outline", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory();
        factory.writeDocument(slog, {
            dimWires: dimWires
        });
        slog.output.should.equal(SVGHEADER +
            '<rect x="1" y="2" width="2" height="2" transform="scale(1,-1)" stroke="none" fill="#ddf"/><!--dimension-->\n' +
            '<g stroke="#000" fill="none" stroke-width="0.1" transform="scale(1,-1)"><!--dimension-->\n' +
            '<polyline points="1 2 1 4 3 4"/>\n' +
            '<polyline points="1 2 3 2 3 4"/>\n' +
            '</g><!--dimension-->\n' +
            SVGTRAILER);
    })
    it("writeDocument(options) creates SVG document with PCB SMD pads", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory();
        factory.writeDocument(slog, {
            bounds: {
                l: 1,
                t: 2,
                r: 3,
                b: 4
            },
            smds: smds,
        });
        slog.output.should.equal(SVGHEADER +
            '<rect x="1" y="2" width="2" height="2" transform="scale(1,-1)" stroke="none" fill="#ddf"/><!--dimension-->\n' +
            '<g fill="#f80" transform="scale(1,-1)"><!--pcb smd-->\n' +
            '<rect x="-0.5" y="0" width="3" height="4"/>\n' +
            '<rect x="-5" y="0" width="30" height="40" transform="rotate(45,10,20)"/>\n' +
            '</g><!--pcb smd-->\n' +
            SVGTRAILER);
        slog.clear();
        var factory = new PcbSvgFactory();
        factory.writeDocument(slog, {
            bounds: {
                l: 1,
                t: 2,
                r: 3,
                b: 4
            },
            smds: smds,
        });
        slog.output.should.equal(SVGHEADER +
            '<rect x="1" y="2" width="2" height="2" transform="scale(1,-1)" stroke="none" fill="#ddf"/><!--dimension-->\n' +
            '<g fill="#f80" transform="scale(1,-1)"><!--pcb smd-->\n' +
            '<rect x="-0.5" y="0" width="3" height="4"/>\n' +
            '<rect x="-5" y="0" width="30" height="40" transform="rotate(45,10,20)"/>\n' +
            '</g><!--pcb smd-->\n' +
            SVGTRAILER);
    })
    it("writeArcs(arcs, comment, color) generates SVG for arcs", function() {
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
            sw: 0.249,
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
            sw: 0.251,
            largeArc: 0,
            sweep: 1,
        }], 'arc comment', '#123');
        slog.output.should.equal(
            '<g stroke="#123" fill="none" transform="scale(1,-1)"><!--arc comment-->\n' +
            '<path d="M2 3, A 6 7, 0 1 1 4 5 " stroke-width="0.25"/>\n' +
            '<path d="M20 30, A 60 70, 0 0 0 40 50 " stroke-width="0.25"/>\n' +
            '</g><!--arc comment-->\n' );
    })
    it("writeRects(rects, color) generates SVG for rects", function() {
        var slog = new LogString();
        var factory = new PcbSvgFactory({writer: slog});
        var arcs = factory.writeRects([]);
        slog.output.should.equal("");
        var arcs = factory.writeRects([{
            type:"rect",
            x: 3,
            y: 4,
            width: 20,
            height: 10,
            rx: 1,
            ry: 2,
            sw: 0.45,
        },{
            type:"rect",
            x: 7,
            y: 8,
            width: 20,
            height: 10,
            rx: 1,
            ry: 2,
            sw: 0.45,
        }], 'pcb rect', '#123');
        slog.output.should.equal(
            '<g fill="#123" transform="scale(1,-1)"><!--pcb rect-->\n' +
            '<rect x="-7" y="-1" width="20" height="10" rx="1" ry="2"/>\n' +
            '<rect x="-3" y="3" width="20" height="10" rx="1" ry="2"/>\n' +
            '</g><!--pcb rect-->\n' );
    })
});
