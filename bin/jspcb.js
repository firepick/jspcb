#!/usr/bin/env node

/**
 * jspcb
 *
 * https://github.com/firepick/jspcb
 */

var fs = require('fs');
var EagleBRD = require("./../lib/eaglebrd");
var Gerber = require("./../lib/gerber");
var PcbSvgFactory = require("./../lib/pcbsvg");

(function(exports) {
    var version = false;
    var help = false;
    var eagle = {
        path:null,
        layer:"Top",
        show:"SMD",
    };
    var gerber = {
        layers:{},
    };
    var output = "CSV";
    var verbose = false;

    function JSPcb(argv) {
        var that = this;
        that.verbose = false;
        that.version = false;
        that.optiosn = {};

        that.processArgs(argv);

        that.verbose && console.log("jspcb command line");
        if (that.version) {
            outputVersion();
        } else if (help || argv.length <= 2) {
            outputHelp();
        } else if (eagle.path) {
            eagle.output = output;
            that.processEagleBRD(eagle);
        } else if (Object.keys(gerber.layers).length) {
            gerber.output = output;
            that.processGerber(gerber);
        } else {
            // do nothing
        }
        return that;
    }

    /**
     * Output application version number.
     * Version number is read version from package.json.
     */
    function outputVersion() {
        fs.readFile(__dirname + '/../package.json', function(err, data) {
            if (err) {
                console.log(err.toString());
            } else {
                var pkg = JSON.parse(data);
                var version = pkg && pkg.version ? pkg.version : 'unknown';
                console.log(version);
            }
            process.exit(0);
        });
    }

    /**
     * Output a help message
     */
    function outputHelp() {
        console.log('jspcb -- Javascript library for parsing PCB board files');
        console.log('\nUSAGE');
        console.log('\tjspcb {OPTIONS}');
        console.log('\nOPTIONS');
        console.log('-v --version');
        console.log('\tPrint version number');
        console.log('--verbose');
        console.log('\tPrint verbose output');
        console.log('-h --help');
        console.log('\tPrint these instructions');
        console.log('--layer LAYER');
        console.log('\tFilter for layer (default is "Top")');
        console.log('--show OBJECT');
        console.log('\tFilter for object to show (default is "SMD")');
        console.log('-o --out');
        console.log('\tOutput format (CSV, SVG)');
        console.log('--svg');
        console.log('\tGenerate SVG to stdout');
        console.log('--gbl PATH');
        console.log('\tGerber bottom copper file');
        console.log('--gbo PATH');
        console.log('\tGerber bottom silkscreen file');
        console.log('--gbs PATH');
        console.log('\tGerber bottom soldermask file');
        console.log('--gko PATH');
        console.log('\tGerber keepout file (Altium/Protel board outline)');
        console.log('--gml PATH');
        console.log('\tGerber mill file');
        console.log('--gtl PATH');
        console.log('\tGerber top copper file');
        console.log('--gto PATH');
        console.log('\tGerber top silkscreen file');
        console.log('--gtp PATH');
        console.log('\tGerber top paste file');
        console.log('--gts PATH');
        console.log('\tGerber top soldermask file');
        console.log('--txt PATH');
        console.log('\tGerber drill file file');
        process.exit(0);
    }

    JSPcb.prototype.processEagleSVG = function(brd, smds, holes, options) {
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
        });
    }
    JSPcb.prototype.processEagleBRD = function(options) {
        var that = this;
        fs.readFile(options.path, function(err, data) {
            if (err) {
                console.log(err);
                process.exit(err.errno);
            }
            var xml = data.toString();
            var brd = new EagleBRD(xml);
            var smds = [];
            var holes = brd.pcbHoles();
            if (options.show.toUpperCase() === "SMD") {
                smds = brd.pcbPads(options.layer);
            }
            if (options.output.toUpperCase() === "CSV") {
                console.log("#,ELEMENT,PACKAGE,PAD,X,Y,W,H,ANGLE,ROUNDNESS");
                for (var iSMD = 0; iSMD < smds.length; iSMD++) {
                    var smd = smds[iSMD];
                    console.log( iSMD+1+","+
                        smd.element+","+
                        smd.package+","+
                        smd.name+", "+
                        smd.x+","+smd.y+","+
                        smd.w+","+smd.h+","+
                        smd.angle+","+smd.roundness);
                }
            }
            if (options.output.toUpperCase() === "SVG") {
                that.processEagleSVG(brd, smds, holes, options);
            }
        });
    }
    JSPcb.prototype.parseOptions = function(options) {
        var that = this;
        if ((typeof options === "string") || (options instanceof Buffer)) {
            options = JSON.parse(options);
        }
        options = options || {};
        if (options.bounds && options.bounds.units) {
            options.bounds.l *= options.bounds.units;
            options.bounds.t *= options.bounds.units;
            options.bounds.r *= options.bounds.units;
            options.bounds.b *= options.bounds.units;
        }
        that.options = options;
        that.verbose && console.log("JSON options:", JSON.stringify(options, null, " "));
    }
    JSPcb.prototype.processGerber = function(parms) {
        var that = this;
        var layers = Object.keys(parms.layers);
        var grb = new Gerber();
        for (var iLayer=0; iLayer<layers.length; iLayer++)  {
            var key = layers[iLayer];
            var id = key.toUpperCase();
            var path = parms.layers[key];
            var data = fs.readFileSync(path);
            that.verbose && console.log("processGerber() id:"+id, "path:"+path);
            var layer = grb.parseLayer(id, data);
        }
        new PcbSvgFactory(that.options).create({
            smds: grb.pcbPads(),
            dimWires: grb.pcbWires("GKO"),
        });
    }


    JSPcb.prototype.processArgs = function(argv) {
        var that = this;
        for (var iArg = 2; iArg < process.argv.length; iArg++) {
            var arg = argv[iArg];
            switch (arg) {
                case '-v':
                case '--version':
                    version = true;
                    break;

                case '--layer':
                    eagle.layer = argv[++iArg];
                    break;
                case '--gbl': // bottom copper
                    gerber.layers.gtl = argv[++iArg];
                    break;
                case '--gbo': // bottom silkscreen
                    gerber.layers.gbo = argv[++iArg];
                    break;
                case '--gbs': // bottom soldermask
                    gerber.layers.gbs = argv[++iArg];
                    break;
                case '--gko': // Altima keepout board outline
                    gerber.layers.gko = argv[++iArg];
                    break;
                case '--gml': // mill
                    gerber.layers.gml = argv[++iArg];
                    break;
                case '--gtl': // top copper
                    gerber.layers.gtl = argv[++iArg];
                    break;
                case '--gto': // top silkscreen
                    gerber.layers.gto = argv[++iArg];
                    break;
                case '--gtp': // top paste
                    gerber.layers.gtp = argv[++iArg];
                    break;
                case '--gts': // top soldermask
                    gerber.layers.gts = argv[++iArg];
                    break;
                case '--txt': // drill file
                    gerber.layers.txt = argv[++iArg];
                    break;
                case '-o':
                case '--out':
                case '--output':
                    output = argv[++iArg].toUpperCase();
                    break;
                case '--show':
                    eagle.show = argv[++iArg];
                    break;
                case '--eagle':
                    eagle.path = argv[++iArg];
                    break;
                case '-h':
                case '--help':
                    help = true;
                    break;
                case '--verbose':
                    that.verbose = true;
                    break;
                case '-j':
                case '--json':
                    var options = fs.readFileSync(argv[++iArg]);
                    that.parseOptions(options);
                    break;
                default:
                    console.log("unexpected argument:", arg);
                    process.exit(22);
                    break;
            }
        }
    }

    module.exports = exports.JSPcb = JSPcb;
})(typeof exports === "object" ? exports : (exports = {}));

var JSPcb = exports.JSPcb;
var jspcb = new JSPcb(process.argv);

(typeof describe === 'function') && describe("Gerber", function() {
    var should = require("should");
    var JSPcb = exports.JSPcb; // require("./jspcb");
})
