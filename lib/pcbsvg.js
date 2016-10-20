(function(exports) {
    function PcbSvgFactory(options) {
        var that = this;
        options = options || {};
        that.log = options.log || console.log;
        return that;
    }
    PcbSvgFactory.prototype.comment = function(comment) {
    }
    PcbSvgFactory.prototype.element = function(name, attrs, comment) {
        var that = this;
        var keys = Object.keys(attrs);
        var svg = '<' + name;
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
        svg += '/>';
        comment && (svg += '<!--' + comment + '-->');
        that.log(svg);
        return svg;
    }
    PcbSvgFactory.prototype.attr = function(key, value) {
        return ' ' + key + '="' + value + '"';
    }
    PcbSvgFactory.prototype.pcbTexts = function(texts) {
        var that = this;
        if (!texts || !texts.length) {
            return that;
        }
        that.log('<g fill="#888" font-family="Courier New"><!--pcb text-->');
        for (var iText = 0; iText < texts.length; iText++ ) {
            var text = texts[iText];
            var transform = "";
            if (text.angle) {
                transform = 'transform="rotate('+(-text.angle)+','+text.x+','+(-text.y)+')"';
            }
            var tspans = text.text.replace(/ /g, "\u00a0").split("\n");
            var lineH = text.size * 1.45;
            if (tspans.length > 1) {
                var top = -text.y-(tspans.length-1)*lineH;
                for (var iSpan = 0; iSpan < tspans.length; iSpan++) {
                    tspans[iSpan] = '<tspan'+
                        ' x="'+text.x+'"'+
                        ' y="'+(top+iSpan*lineH)+'"'+
                        '>' + 
                        tspans[iSpan] + 
                        '</tspan>\n';
                }
                tspans = "\n" + tspans.join("");
            } else {
                tspans = tspans.join("");
            }
            that.log('<text',
                'x="'+text.x+'"',
                'y="'+(-text.y)+'"',
                transform,
                'font-size="' + lineH + '"',
                '>'+tspans+'</text>');
        }
        that.log('</g><!--pcb text-->');
        return that;
    }
    PcbSvgFactory.prototype.pcbSmds = function(smds) {
        var that = this;
        if (!smds || !smds.length) {
            return that;
        }
        that.log('<g fill="#f80" transform="scale(1,-1)" ><!--pcb smd-->');
        for (var iSMD = 0; iSMD < smds.length; iSMD++) {
            var smd = smds[iSMD];
            var transform = smd.angle ? 
                'rotate('+smd.angle+','+smd.x+','+smd.y+')' : null;
            that.element("rect", {
                x: smd.x-smd.width/2,
                y: smd.y-smd.height/2,
                width: smd.width,
                height: smd.height,
                transform: transform,
            }, smd.element);
        }
        that.log('</g><!--pcb smd-->');
        return that;
    }
    PcbSvgFactory.prototype.pcbHoles = function(holes) {
        var that = this;
        if (!holes || !holes.length) {
            return that;
        }
        that.log('<g fill="#000"><!--pcb holes-->');
        for (var iHole = 0; iHole < holes.length; iHole++) {
            var hole = holes[iHole];
            that.element("circle", {
                cx: hole.x,
                cy: hole.y,
                r: hole.drill/2,
            }, hole.element);
        }
        that.log('</g><!--pcb holes-->');
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
    PcbSvgFactory.prototype.create = function(options) {
        var that = this;
        options = options || {};
        that.log('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');

        var dimWires = options.dimWires || []; // board outline
        var bounds = that.pcbBounds(options);
        var width = bounds.r - bounds.l;
        var height = bounds.b - bounds.t;
        that.log('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"',
            'width="'+width+'mm" height="'+height+'mm"',
            'viewbox="',
            bounds.l, -bounds.b, bounds.r-bounds.l, bounds.b-bounds.t,
            '" >');
        that.log('<g stroke-linecap="round" stroke-width="0.25">');
        that.element("rect", {
            x: bounds.l, 
            y: -bounds.t, 
            width: width, 
            height: height, 
            fill: "#ddf"}, 
        "dimension");

        for (var iWire = 0; iWire < dimWires.length; iWire++) {
            var wire = dimWires[iWire];
            that.element("line", {
                x1: wire.x1,
                y1: -wire.y1,
                x2: wire.x2,
                y2: -wire.y2,
                width: 0.5,
                stroke: "#f0f",
            }, "dimension");
        }
            
        that.pcbTexts(options.texts || []);
        that.pcbSmds(options.smds || []);
        that.pcbHoles(options.holes || []);

        that.log('</g>');
        that.log('</svg>');
        return that;
    }

    module.exports = exports.PcbSvgFactory = PcbSvgFactory;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("EagleBRD", function() {
    var should = require("should");
    var PcbSvgFactory = exports.PcbSvgFactory; // require("./PcbSvgFactory");
    var output = "";
    var logger = function() {
        for (var iArg = 0; iArg < arguments.length; iArg++) {
            iArg && (output += ' ');
            output += arguments[iArg];
        }
        output += '\n';
    }
    var dimWires = [{
        type:"L",
        x1: 1,
        y1: 2,
        x2: 1,
        y2: 4,
    },{
        type:"L",
        x1: 1,
        y1: 4,
        x2: 3,
        y2: 4,
    },{
        type:"L",
        x1: 1,
        y1: 2,
        x2: 3,
        y2: 2,
    },{
        type:"L",
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
    },{
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
        factory.log.should.equal(console.log); // default output is console
        var factory = new PcbSvgFactory({log: logger}); 
        factory.log.should.equal(logger);
    })
    it("element(name, attrs, comment) creates SVG element", function() {
        var factory = new PcbSvgFactory({log: logger});
        factory.log.should.equal(logger);

        output = "";
        var elt = factory.element("rect", { x:1, y:2, width: 3, height: 4, fill:"red" });
        elt.should.equal('<rect x="1" y="2" width="3" height="4" fill="red"/>');
        output.should.equal('<rect x="1" y="2" width="3" height="4" fill="red"/>\n');

        output = "";
        elt = factory.element("rect", { x:1, y:2, width: 3, height: 4, "stroke-width":0.5 }, "hello");
        elt.should.equal('<rect x="1" y="2" width="3" height="4" stroke-width="0.5"/><!--hello-->');
        output.should.equal('<rect x="1" y="2" width="3" height="4" stroke-width="0.5"/><!--hello-->\n');
    })
    it("pcbBounds(options) returns PCB bounding rectangle", function() {
        var factory = new PcbSvgFactory({log: logger});
        var bounds = factory.pcbBounds({dimWires: dimWires});
        should.deepEqual(bounds, {
            l: 1,
            t: 2,
            r: 3,
            b: 4,
        });
        var bounds = factory.pcbBounds({bounds: {l:1, t:2, r:3, b:4}});
        should.deepEqual(bounds, {
            l: 1,
            t: 2,
            r: 3,
            b: 4,
        });
    })
    it("create(options) creates SVG document with PCB outline", function() {
        var factory = new PcbSvgFactory({log: logger});
        output = "";
        factory.create({dimWires: dimWires});
        output.should.equal(SVGHEADER +
            '<rect x="1" y="-2" width="2" height="2" fill="#ddf"/><!--dimension-->\n' +
            '<line x1="1" y1="-2" x2="1" y2="-4" width="0.5" stroke="#f0f"/><!--dimension-->\n' +
            '<line x1="1" y1="-4" x2="3" y2="-4" width="0.5" stroke="#f0f"/><!--dimension-->\n' +
            '<line x1="1" y1="-2" x2="3" y2="-2" width="0.5" stroke="#f0f"/><!--dimension-->\n' +
            '<line x1="3" y1="-2" x2="3" y2="-4" width="0.5" stroke="#f0f"/><!--dimension-->\n' +
            SVGTRAILER);
    })
    it("create(options) creates SVG document with PCB SMD pads", function() {
        var factory = new PcbSvgFactory({log: logger});
        output = "";
        factory.create({
            bounds: {l:1, t:2, r: 3, b:4},
            smds: smds,
        });
        output.should.equal(SVGHEADER +
            '<rect x="1" y="-2" width="2" height="2" fill="#ddf"/><!--dimension-->\n' +
            '<g fill="#f80" transform="scale(1,-1)" ><!--pcb smd-->\n' +
            '<rect x="-0.5" y="0" width="3" height="4"/>\n' +
            '<rect x="-5" y="0" width="30" height="40" transform="rotate(45,10,20)"/>\n' +
            '</g><!--pcb smd-->\n' +
            SVGTRAILER);
    })
});
