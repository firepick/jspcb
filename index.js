var EagleBRD = require("./lib/eaglebrd");
var Trans2D = require("./lib/trans2d");
var Gerber = require("./lib/gerber");
var LogFile = require("./lib/logfile");
var LogString = require("./lib/logstring");
var PcbSvg = require("./lib/pcbsvg");
var PcbTransform = require("./lib/pcbtransform");

if (typeof require === 'function') {
    exports.EagleBRD = EagleBRD;
    exports.Trans2D = Trans2D;
    exports.Gerber = Gerber;
    exports.LogFile = LogFile;
    exports.LogString = LogString;
    exports.PcbSvg = PcbSvg;
    exports.PcbTransform = PcbTransform;
}
