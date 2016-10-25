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
    "\t-v --version",
    "\t\tPrint version number",
    "\t--verbose",
    "\t\tPrint verbose output",
    "\t-j --json TRANSFORMFILE",
    "\t\tRun transformations specified in given JSON file",
    "\t-h --help",
    "\t\tPrint these instructions",
    "\t--csv-holes PATH",
    "\t\tGenerate CSV file for PCB holes",
    "\t--csv-smdpads PATH",
    "\t\tGenerate CSV file for PCB SMD pads",
    "\t--svg PATH",
    "\t\tGenerate SVG file",
    "\t--png PATH",
    "\t\tGenerate PNG file",
    "\t--png-height PIXELS",
    "\t\tSpecify PNG image height",
    "\t--png-width PIXELS",
    "\t\tSpecify PNG image width",
    "\t--gbl PATH",
    "\t\tRead Gerber bottom copper file",
    "\t--gbo PATH",
    "\t\tRead Gerber bottom silkscreen file",
    "\t--gbs PATH",
    "\t\tRead Gerber bottom soldermask file",
    "\t--gko PATH",
    "\t\tRead Gerber keepout file (Altium/Protel board outline)",
    "\t--gml PATH",
    "\t\tRead Gerber mill file",
    "\t--gtl PATH",
    "\t\tRead Gerber top copper file",
    "\t--gto PATH",
    "\t\tRead Gerber top silkscreen file",
    "\t--gtp PATH",
    "\t\tRead Gerber top paste file",
    "\t--gts PATH",
    "\t\tRead Gerber top soldermask file",
    "\t--txt PATH",
    "\t\tRead Gerber drill file",
    ""
];

const fs = require('fs');
const EagleBRD = require("./../lib/eaglebrd");
const Gerber = require("./../lib/gerber");
const PcbTransform = require("./../lib/pcbtransform");
const LogFile = require("./../lib/logfile");

(function(exports) {

    function JSPcb(argv) {
        var that = this;
        that.pcbx = new PcbTransform();
        that.xfm = {
            verbose: false,
            eagle: { //input
                path: null,
                layer: "Top",
                show: "SMD",
            },
            gerber: { //input
                layers: {},
            },
            bounds: { //output
                l: 0,
                t: null,
                r: null,
                b: 0,
            },
            csv: { // output
            },
            colors: { // output
                "board": "#000",
                "outline": "#000",
                "pad": "#fff",
                "text": "#444",
                "hole": "#000"
            },
            png: { // output
                path: null,
                width: 800,
                height: null,
            },
            svg: { // output
                path: null,
            },
        };

        that.processArgs(argv, that.xfm);

        that.xfm.verbose && console.log("jspcb command line");
        argv.length <= 2 && process.exit(showHelp());

        if (that.xfm.eagle.path) {
            that.pcbx.readEagleBrd(that.xfm.eagle.path);
        } else if (Object.keys(that.xfm.gerber.layers).length) {
            that.pcbx.readGerber(that.xfm.gerber.layers);
        } else {
            // do nothing
        }
        if (that.xfm.svg.path) {
            var writer = new LogFile(that.xfm.svg.path);
            that.pcbx.writeSvg({
                writer: writer,
                layers: {
                    Top: true,
                },
            });
            writer.close();
        }
        if (that.xfm.csv.smdpads) {
            var writer = new LogFile(that.xfm.csv.smdpads);
            that.pcbx.writeCsv({
                smdpads: writer
            });
            writer.close();
        }
        if (that.xfm.csv.holes) {
            var writer = new LogFile(that.xfm.csv.holes);
            that.pcbx.writeCsv({
                holes: writer
            });
            writer.close();
        }
        (that.xfm.png.path) && that.pcbx.writePng(that.xfm.png);
        return that;
    }

    function showHelp() {
        for (var iHelp = 0; iHelp < help.length; iHelp++) {
            console.log(help[iHelp]);
        }
        return 0;
    }

    JSPcb.prototype.parseJsonTransform = function(transform) {
        var that = this;
        if ((typeof transform === "string") || (transform instanceof Buffer)) {
            transform = JSON.parse(transform);
        }
        transform = transform || {};
        if (transform.bounds && transform.bounds.units) {
            transform.bounds.l *= transform.bounds.units;
            transform.bounds.t *= transform.bounds.units;
            transform.bounds.r *= transform.bounds.units;
            transform.bounds.b *= transform.bounds.units;
        }
        that.xfm = transform;
        that.xfm.verbose && console.log("JSON transform:", JSON.stringify(transform, null, " "));
    }

    JSPcb.prototype.processArgs = function(argv, xfm) {
        var that = this;
        for (var iArg = 2; iArg < process.argv.length; iArg++) {
            var arg = argv[iArg];
            switch (arg) {
                case '-v':
                case '--version':
                    console.log("JsPCB v" + that.pcbx.version());
                    break;
                case '--gbl': // bottom copper
                    xfm.gerber.layers.gtl = argv[++iArg];
                    break;
                case '--gbo': // bottom silkscreen
                    xfm.gerber.layers.gbo = argv[++iArg];
                    break;
                case '--gbs': // bottom soldermask
                    xfm.gerber.layers.gbs = argv[++iArg];
                    break;
                case '--gko': // Altima keepout board outline
                    xfm.gerber.layers.gko = argv[++iArg];
                    break;
                case '--gml': // mill
                    xfm.gerber.layers.gml = argv[++iArg];
                    break;
                case '--gtl': // top copper
                    xfm.gerber.layers.gtl = argv[++iArg];
                    break;
                case '--gto': // top silkscreen
                    xfm.gerber.layers.gto = argv[++iArg];
                    break;
                case '--gtp': // top paste
                    xfm.gerber.layers.gtp = argv[++iArg];
                    break;
                case '--gts': // top soldermask
                    xfm.gerber.layers.gts = argv[++iArg];
                    break;
                case '--txt': // drill file
                    xfm.gerber.layers.txt = argv[++iArg];
                    break;
                case '--svg': // SVG output file
                    xfm.svg.path = argv[++iArg];
                    break;
                case '--csv-holes': // CSV output file
                    xfm.csv.holes = argv[++iArg];
                    break;
                case '--csv-smdpads': // CSV output file
                    xfm.csv.smdpads = argv[++iArg];
                    break;
                case '--png': // PNG output file
                    xfm.png.path = argv[++iArg];
                    break;
                case '--png-height': // PNG output file pixel height
                    xfm.png.height = Number(argv[++iArg]);
                    break;
                case '--png-width': // PNG output file pixel width
                    xfm.png.width = Number(argv[++iArg]);
                    break;
                case '--eagle':
                    xfm.eagle.path = argv[++iArg];
                    break;
                case '-h':
                case '--help':
                    process.exit(showHelp());
                    break;
                case '--verbose':
                    xfm.verbose = true;
                    break;
                case '-j':
                case '--json':
                    var transform = fs.readFileSync(argv[++iArg]);
                    that.parseJsonTransform(transform);
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
