var fs = require('fs');

(function(exports) {
    function LogFile(path) {
        var that = this;
        that.path = path;
        that.ws = fs.createWriteStream(path);
        return that;
    }
    LogFile.prototype.close = function() {
        var that = this;
        that.ws.end();
        return that;
    }
    LogFile.prototype.log = function() {
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

    module.exports = exports.LogFile = LogFile;
})(typeof exports === "object" ? exports : (exports = {}));
