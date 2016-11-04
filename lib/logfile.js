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
        var p = new Promise(function(resolve, reject) {
            that.ws.end(null, null, function() {
                resolve(that);
            });
        });
        return p;
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

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("LogFile", function() {
    var should = require("should");
    var LogFile = exports.LogFile; // require("./LogFile");
    it("close() returns a promise that is resolved when the stream is closed", function() {
        var file = "/tmp/logfile.tmp";
        fs.existsSync(file) && fs.unlinkSync(file);
        var lf = new LogFile(file);
        lf.log("asdf");
        lf.close().then(function() {
            var data = fs.readFileSync(file);
            data.length.should.equal(5);
        });
    });
})
