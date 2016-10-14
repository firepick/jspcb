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

        function processEagleSVG(brd, smds, holes, options) {
            var width = brd.bounds.r - brd.bounds.l;
            var height = brd.bounds.b - brd.bounds.t;
            var layerNumber = brd.getLayerNumber(options.layer);
            var layerPad = brd.isBottomLayer(layerNumber) ? "16" : "1";
            var layerSilk = brd.isBottomLayer(layerNumber) ? "22" : "21";
            console.log('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>');
            console.log('<svg xmlns="http://www.w3.org/2000/svg" version="1.1"',
                'width="'+width+'mm" height="'+height+'mm"',
                'viewbox="',
                brd.bounds.l, -brd.bounds.b, brd.bounds.r-brd.bounds.l, brd.bounds.b-brd.bounds.t,
                '" >');
            console.log('<g stroke-linecap="round" stroke-width="0.25"',
                //'\ttransform="scale(1,-1)"',
                '>');

            var dimWires = brd.pcbWires("Dimension");
            console.log('<rect',
                'x="'+brd.bounds.l+'"',
                'y="'+(-brd.bounds.t)+'"',
                'width="'+width+'"',
                'height="'+height+'"',
                'fill="#ddf"',
                '/><!--dimension-->');
            for (var iWire = 0; iWire < dimWires.length; iWire++) {
                var wire = dimWires[iWire];
                console.log("<line",
                    'x1="'+wire.x1+'"',
                    'y1="'+(-wire.y1)+'"',
                    'x2="'+wire.x2+'"',
                    'y2="'+(-wire.y2)+'"',
                    'width="0.5"',
                    'stroke="#f0f"',
                    '/><!--dimension-->');
            }
                
            console.log('<g fill="#888" font-family="Courier New"><!--text-->');
            var texts = brd.pcbText(layerSilk);
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
                console.log('<text',
                    'x="'+text.x+'"',
                    'y="'+(-text.y)+'"',
                    transform,
                    'font-size="' + lineH + '"',
                    '>'+tspans+'</text>');
            }
            console.log('</g><!--text-->');

            console.log('<g fill="#f80" transform="scale(1,-1)" ><!--smd-->');
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
                    '/>',
                    '<!--'+smd.element+'-->'
                    );
            }
            console.log('</g><!--smd-->');

            console.log('<g fill="#000"><!--hole-->');
            for (var iHole = 0; iHole < holes.length; iHole++) {
                var hole = holes[iHole];
                console.log('<circle',
                    'cx="'+hole.x+'"',
                    'cy="'+(-hole.y)+'"',
                    'r="'+(hole.drill/2)+'"',
                    '/>',
                    '<!--'+hole.element+'-->'
                    );
            }
            console.log('</g><!--hole-->');
            console.log('</g>');
            console.log('</svg>');
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
                    processEagleSVG(brd, smds, holes, options);
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
