#!/usr/bin/env node

/**
 * jspcb
 *
 * https://github.com/firepick/jspcb
 */

var fs = require('fs');
var EagleBRD = require("./../lib/eaglebrd");
var Gerber = require("./../lib/gerber");
var PcbTransform = require("./../lib/pcbtransform");

(function(exports) {
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
        that.options = {};
        that.pcbx = new PcbTransform();

        that.processArgs(argv);

        that.verbose && console.log("jspcb command line");
        if (argv.length <= 2) {
            outputHelp();
        } else if (eagle.path) {
            that.pcbx.readEagleBrd(eagle.path);
        } else if (Object.keys(gerber.layers).length) {
            that.pcbx.readGerber(gerber.layers);
        } else {
            // do nothing
        }
        if (that.svgFile) {
            var writer = new FileWriter(that.svgFile);
            that.pcbx.writeSvg({
                writer: writer,
                layers: {
                    Top:true,
                },
            });
            writer.close();
        }
        if (that.csvSmdPads) {
            var writer = new FileWriter(that.csvSmdPads);
            that.pcbx.writeCsv({ smdpads: writer });
            writer.close();
        }
        if (that.csvHoles) {
            var writer = new FileWriter(that.csvHoles);
            that.pcbx.writeCsv({ holes: writer });
            writer.close();
        }
        return that;
    }

    function FileWriter(path) {
        var that = this;
        that.path = path;
        console.log("FilewWriter("+path+")");
        var ws = that.ws = fs.createWriteStream(path);
        return that;
    }
    FileWriter.prototype.close = function() {
        var that = this;
        that.ws.end();
        return that;
    }
    FileWriter.prototype.log = function() {
        var that = this;
        var line = "";
        for (var iArg = 0; iArg < arguments.length; iArg++) {
            var arg = arguments[iArg];
            iArg && (line += " ");
            line += arg;
        }
        line += '\n';
        that.ws.write(line);
        return that;
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

    JSPcb.prototype.processArgs = function(argv) {
        var that = this;
        for (var iArg = 2; iArg < process.argv.length; iArg++) {
            var arg = argv[iArg];
            switch (arg) {
                case '-v':
                case '--version':
                    console.log("JsPCB v" + that.pcbx.version());
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
                case '--svg': // SVG output file
                    that.svgFile = argv[++iArg];
                    break;
                case '--csv-holes': // CSV output file
                    that.csvHoles = argv[++iArg];
                    break;
                case '--csv-smdpads': // CSV output file
                    that.csvSmdPads = argv[++iArg];
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
                    outputHelp();
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
