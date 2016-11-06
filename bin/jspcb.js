#!/usr/bin/env node

const fs = require('fs');
const PcbTransform = require("./../lib/pcbtransform");

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
    "\t--json-out JSONFILE",
    "\t\tWrite JSON PCB description to given JSON file",
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
    "\t--bounds L,T,R,B",
    "\t\tSet PCB view bounds to given mm coordinates",
    "\t--show-bounds ",
    "\t\tPrint out PCB view bounds",
    ""
];

(function(exports) {

    function JSPcb() {
        var that = this;
        that.version = new PcbTransform().version();
        return that;
    }

    JSPcb.prototype.transform = function(argv) {
        var that = this;
        var xfm = that.processArgs(argv);
        xfm.verbose && console.warn("XFM\t:", JSON.stringify(xfm));
        argv.length <= 2 && process.exit(showHelp());
        var pcbXfm = new PcbTransform(xfm);
        pcbXfm.transform();
        return that;
    }
    JSPcb.prototype.processArgs = function(argv) {
        var that = this;
        var xfm = {
            verbose: false,
        };
        for (var iArg = 2; iArg < process.argv.length; iArg++) { // pass 1
            var arg = argv[iArg];
            switch (arg) {
                case '-j':
                case '--json':
                    var jsonFile = argv[++iArg];
                    var transform = fs.readFileSync(jsonFile);
                    xfm = JSON.parse(transform);
                    xfm.bounds && xfm.bounds.src == null && (xfm.bounds.source = jsonFile);
                    xfm.verbose && console.log("ARG\t: JSON transform:", jsonFile);
                    break;
            }
        }
        xfm.gerberLayers = xfm.gerberLayers || {};
        xfm.eagle = xfm.eagle || {};
        xfm.svg = xfm.svg || {};
        xfm.csv = xfm.csv || {};
        xfm.png = xfm.png || {};
        xfm.bounds = xfm.bounds || {};
        xfm.colors = xfm.colors || {};
        for (var iArg = 2; iArg < process.argv.length; iArg++) { // pass 2
            var arg = argv[iArg];
            switch (arg) {
                case '-v':
                case '--version':
                    console.log("JsPCB v" + new JSPcb().version);
                    break;
                case '--gbl': // bottom copper
                    xfm.gerberLayers.gtl = argv[++iArg];
                    break;
                case '--gbo': // bottom silkscreen
                    xfm.gerberLayers.gbo = argv[++iArg];
                    break;
                case '--gbs': // bottom soldermask
                    xfm.gerberLayers.gbs = argv[++iArg];
                    break;
                case '--gko': // Altima keepout board outline
                    xfm.gerberLayers.gko = argv[++iArg];
                    break;
                case '--gml': // mill
                    xfm.gerberLayers.gml = argv[++iArg];
                    break;
                case '--gtl': // top copper
                    xfm.gerberLayers.gtl = argv[++iArg];
                    break;
                case '--gto': // top silkscreen
                    xfm.gerberLayers.gto = argv[++iArg];
                    break;
                case '--gtp': // top paste
                    xfm.gerberLayers.gtp = argv[++iArg];
                    break;
                case '--gts': // top soldermask
                    xfm.gerberLayers.gts = argv[++iArg];
                    break;
                case '--txt': // drill file
                    xfm.gerberLayers.txt = argv[++iArg];
                    break;
                case '--svg': // SVG output file
                    xfm.svg.path = argv[++iArg];
                    break;
                case '--json-out':
                    xfm.json = xfm.json || {};
                    xfm.json.path = argv[++iArg];
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
                    iArg++;
                    break;
                case '--bounds':
                    var bounds = argv[++iArg].split(",");
                    if (bounds.length !== 4) {
                        throw new Error("--bounds requires four comma-separated values (l,t,r,b)");
                    }
                    xfm.bounds.l = Math.min(Number(bounds[0]), Number(bounds[2]));
                    xfm.bounds.t = Math.max(Number(bounds[1]), Number(bounds[3]));
                    xfm.bounds.r = Math.max(Number(bounds[0]), Number(bounds[2]));
                    xfm.bounds.b = Math.min(Number(bounds[1]), Number(bounds[3]));
                    xfm.showBounds = true;
                    break;
                case '--show-bounds':
                    xfm.showBounds = true;
                    break;
                default:
                    var tokens = arg.substring(2).split(".");
                    if (tokens.length === 1) {
                        var attr = tokens[0];
                        xfm[attr] = argv[++iArg];
                    } else if (tokens.length === 2) {
                        var key = tokens[0];
                        var attr = tokens[1];
                        var obj = xfm[key] = xfm[key] || {};
                        obj[attr] = argv[++iArg];
                    } else {
                        console.log("unexpected argument:", arg);
                        process.exit(22);
                    }
                    break;
            }
        }
        return xfm;
    }

    function showHelp() {
        var that = this;
        for (var iHelp = 0; iHelp < help.length; iHelp++) {
            console.log(help[iHelp]);
        }
        return 0;
    }

    module.exports = exports.JSPcb = JSPcb;
})(typeof exports === "object" ? exports : (exports = {}));

var JSPcb = exports.JSPcb;
var jspcb = new JSPcb();
jspcb.transform(process.argv);

(typeof describe === 'function') && describe("JSPcb", function() {
    var should = require("should");
    var JSPcb = exports.JSPcb; // require("./jspcb");
    it("version returns package.json version", function() {
        new JSPcb().version.should.equal("0.1.1");
    })
})
