

(function(exports) {
    function StringLog() {
        var that = this;
        that.output = "";
        return that;
    }

    StringLog.prototype.log = function() {
        var that = this;
        for (var iArg = 0; iArg < arguments.length; iArg++) {
            var arg = arguments[iArg];
            iArg && (that.output += " ");
            that.output += arg;
        }
        that.output += '\n';
        return that;
    }
    StringLog.prototype.clear = function() {
        var that = this;
        that.output = "";
        return that;
    }

    module.exports = exports.StringLog = StringLog;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("StringLog", function() {
    var should = require("should");
    var StringLog = exports.StringLog; // require("./StringLog");
    it("StringLog() creates a StringLog", function() {
        var slog = new StringLog();
        slog.output.should.equal("");
    })
    it("log(a,b,c,...) logs to output", function() {
        var slog = new StringLog();
        slog.log(1,"A",true).should.equal(slog);
        slog.output.should.equal("1 A true\n");
        slog.log(2,"B",false);
        slog.output.should.equal("1 A true\n2 B false\n");
        slog.log(2,"B",false).should.equal(slog);
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
        var slog = new StringLog();
        var testLogger = new TestObj({writer: slog});
        slog.output.should.equal("hello\n");
    });
    it("clear() clears log", function() {
        var slog = new StringLog();
        slog.log(1,"A",true).clear().should.equal(slog);
        slog.output.should.equal("");
    });
})
