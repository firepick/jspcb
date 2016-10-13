#!usr/bin/env node

/**
 * jspcb
 *
 * https://github.com/firepick/jspcb
 */

var fs = require('fs');
var EagleBRD = require("./../lib/eaglebrd");

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
            process.exit(0);
        }

        function processEagleBRD(options) {
            fs.readFile(options.path, function(err, data) {
                if (err) {
                    console.log(err);
                    process.exit(err.errno);
                }
                var xml = data.toString();
                var brd = new EagleBRD(xml);
                var smds = [];
                if (options.show.toUpperCase() === "SMD") {
                    smds = brd.layerSMDs(options.layer);
                }
                if (options.output.toUpperCase() === "CSV") {
                    console.log("#,ELEMENT,PAD,X,Y,W,H,ANGLE,ROUNDNESS");
                    for (var iSMD = 0; iSMD < smds.length; iSMD++) {
                        var smd = smds[iSMD];
                        console.log( iSMD+1+","+smd.element+","+smd.name+", "+
                            smd.x+","+smd.y+","+
                            smd.w+","+smd.h+","+
                            smd.angle+","+smd.roundness);
                    }
                }
                if (options.output.toUpperCase() === "SVG") {
                    console.log('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"',
                        'width="194mm" height="228mm" viewbox="0 -114 194 228" >');
                    console.log('<g stroke-linecap="round" font-size="2" font-family="Verdana"',
                        '\tstroke-width="0.25"',
                        '\tfill="green"',
                        '\ttransform="scale(1,-1)"',
                        '>');
                    for (var iSMD = 0; iSMD < smds.length; iSMD++) {
                        var smd = smds[iSMD];
                        var transform = smd.angle ? 
                            '"rotate('+smd.angle+','+smd.x+','+smd.y+')"' : '""';
                        console.log('<rect',
                            'x="'+(smd.x-smd.w/2)+'"',
                            'y="'+(smd.y-smd.h/2)+'"',
                            'width="'+smd.w+'"',
                            'height="'+smd.h+'"',
                            'transform='+transform,
                            '/>'
                            );
                    }
                    console.log('</g>');
                    console.log('</svg>');
                }
            });
        }

        var version = false;
        var help = false;
        var eagle = {
            path:null,
            layer:"Top",
            show:"SMD",
        };
        var output = "CSV";

        for (var iArg = 2; iArg < process.argv.length; iArg++) {
            var arg = process.argv[iArg];
            switch (arg) {
                case '-v':
                case '--version':
                    version = true;
                    break;

                case '--layer':
                    eagle.layer = process.argv[++iArg];
                    break;
                case '-o':
                case '--out':
                case '--output':
                    output = process.argv[++iArg].toUpperCase();
                    break;
                case '--show':
                    eagle.show = process.argv[++iArg];
                    break;
                case '--eagle':
                    eagle.path = process.argv[++iArg];
                    break;
                case '-h':
                case '--help':
                    help = true;
                    break;
                default:
                    console.log("unexpected argument:", arg);
                    process.exit(22);
                    break;
            }
        }

        if (version) {
            outputVersion();
        } else if (help) {
            outputHelp();
        } else if (eagle.path) {
            eagle.output = output;
            processEagleBRD(eagle);
        } else {
            outputHelp();
        }
