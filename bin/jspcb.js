#!/usr/bin/env node

const help = [
    "jspcb -- Javascript library for parsing PCB board files",
    "",
    "DESCRIPTION",
    "Command line utility for jspcb package, which reads",
    "common PCB file formats such as Gerber or Eagle BRD and",
    "generates SVG, PNG or CSV files.",
    "",
    "URL",
    "   https://github.com/firepick/jspcb",
    "",
    "USAGE",
    "	jspcb {OPTIONS}",
    "",
    "OPTIONS",
    "    -v --version",
    "        Print version number",
    "    --verbose",
    "        Print verbose output",
    "    -h --help",
    "        Print these instructions",
    "    --csv-holes PATH",
    "        Generate CSV file for PCB holes",
    "    --csv-smdpads PATH",
    "        Generate CSV file for PCB SMD pads",
    "    --svg PATH",
    "        Generate SVG file",
    "    --png PATH",
    "        Generate PNG file",
    "    --gbl PATH",
    "        Read Gerber bottom copper file",
    "    --gbo PATH",
    "        Read Gerber bottom silkscreen file",
    "    --gbs PATH",
    "        Read Gerber bottom soldermask file",
    "    --gko PATH",
    "        Read Gerber keepout file (Altium/Protel board outline)",
    "    --gml PATH",
    "        Read Gerber mill file",
    "    --gtl PATH",
    "        Read Gerber top copper file",
    "    --gto PATH",
    "        Read Gerber top silkscreen file",
    "    --gtp PATH",
    "        Read Gerber top paste file",
    "    --gts PATH",
    "        Read Gerber top soldermask file",
    "    --txt PATH",
    "        Read Gerber drill file",
    ""
];

const fs = require('fs');
const EagleBRD = require("./../lib/eaglebrd");
const Gerber = require("./../lib/gerber");
const PcbTransform = require("./../lib/pcbtransform");
const LogFile = require("./../lib/logfile");

(function(exports) {
    var eagle = {
        path: null,
        layer: "Top",
        show: "SMD",
    };
    var gerber = {
        layers: {},
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
        argv.length <= 2 && process.exit(showHelp());

        if (eagle.path) {
            that.pcbx.readEagleBrd(eagle.path);
        } else if (Object.keys(gerber.layers).length) {
            that.pcbx.readGerber(gerber.layers);
        } else {
            // do nothing
        }
        if (that.svgFile) {
            var writer = new LogFile(that.svgFile);
            that.pcbx.writeSvg({
                writer: writer,
                layers: {
                    Top: true,
                },
            });
            writer.close();
        }
        if (that.csvSmdPads) {
            var writer = new LogFile(that.csvSmdPads);
            that.pcbx.writeCsv({
                smdpads: writer
            });
            writer.close();
        }
        if (that.csvHoles) {
            var writer = new LogFile(that.csvHoles);
            that.pcbx.writeCsv({
                holes: writer
            });
            writer.close();
        }
        (that.png) && that.pcbx.writePng(that.png);
        return that;
    }

    function showHelp() {
        for (var iHelp = 0; iHelp < help.length; iHelp++) {
            console.log(help[iHelp]);
        }
        return 0;
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
                case '--png': // PNG output file
                    that.png = argv[++iArg];
                    break;
                case '--eagle':
                    eagle.path = argv[++iArg];
                    break;
                case '-h':
                case '--help':
                    process.exit(showHelp());
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
    // TODO
})
