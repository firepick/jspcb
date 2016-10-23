(function(exports) {
    function LogString() {
        var that = this;
        that.output = "";
        return that;
    }

    LogString.prototype.log = function() {
        var that = this;
        for (var iArg = 0; iArg < arguments.length; iArg++) {
            var arg = arguments[iArg];
            iArg && (that.output += " ");
            that.output += arg;
        }
        that.output += '\n';
        return that;
    }
    LogString.prototype.clear = function() {
        var that = this;
        that.output = "";
        return that;
    }

    module.exports = exports.LogString = LogString;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("LogString", function() {
    var should = require("should");
    var LogString = exports.LogString; // require("./LogString");
    it("LogString() creates a LogString", function() {
        var slog = new LogString();
        slog.output.should.equal("");
    })
    it("log(a,b,c,...) logs to output", function() {
        var slog = new LogString();
        slog.log(1, "A", true).should.equal(slog);
        slog.output.should.equal("1 A true\n");
        slog.log(2, "B", false);
        slog.output.should.equal("1 A true\n2 B false\n");
        slog.log(2, "B", false).should.equal(slog);
    });
    it("log(a,b,c,...) logs to output", function() {
        function TestObj(options) {
            var that = this;
            that.writer = options.writer || console;
            that.log("hello");
            return that;
        }
        TestObj.prototype.log = function() {
            var that = this;
            that.writer.log.apply(that.writer, arguments);
        }
        var slog = new LogString();
        var testLogger = new TestObj({
            writer: slog
        });
        slog.output.should.equal("hello\n");
    });
    it("clear() clears log", function() {
        var slog = new LogString();
        slog.log(1, "A", true).clear().should.equal(slog);
        slog.output.should.equal("");
    });
})
