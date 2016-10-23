var MathJS = require("mathjs");
var DOMParser = require("xmldom").DOMParser;

(function(exports) {
    const DEG_TO_RAD = Math.PI / 180;
    ////////////////// constructor
    function Trans2D(options) {
        var that = this;

        options = options || {};
        that.math = MathJS.create();
        that.clear();

        return that;
    }
    Trans2D.prototype.clear = function(x, y) {
        var that = this;
        that.mat = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        that.matInv = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
    }
    Trans2D.prototype.mirrorX = function() {
        var that = this;
        return that.scale(1, -1);
    }
    Trans2D.prototype.mirrorY = function() {
        var that = this;
        return that.scale(-1, 1);
    }
    Trans2D.prototype.translate = function(x, y) {
        var that = this;
        var mat2 = [
            [1, 0, x],
            [0, 1, y],
            [0, 0, 1]
        ];
        that.mat = that.math.multiply(mat2, that.mat);
        var mat2Inv = [
            [1, 0, -x],
            [0, 1, -y],
            [0, 0, 1]
        ];
        that.matInv = that.math.multiply(that.matInv, mat2Inv);
        return that.mat;
    }
    Trans2D.prototype.rotate = function(degrees) {
        var that = this;
        var radians = DEG_TO_RAD * degrees;
        var cosAngle = that.math.cos(radians); // clockwise
        var sinAngle = that.math.sin(radians);
        var mat2 = [
            [cosAngle, sinAngle, 0],
            [-sinAngle, cosAngle, 0],
            [0, 0, 1]
        ];
        that.mat = that.math.multiply(mat2, that.mat);
        var mat2Inv = [
            [cosAngle, -sinAngle, 0],
            [sinAngle, cosAngle, 0],
            [0, 0, 1]
        ];
        that.matInv = that.math.multiply(that.matInv, mat2Inv);
    }
    Trans2D.prototype.shearX = function(degrees) {
        var that = this;
        var radians = DEG_TO_RAD * degrees;
        var tanAngle = that.math.tan(radians); // clockwise
        var mat2 = [
            [1, tanAngle, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        that.mat = that.math.multiply(mat2, that.mat);
        var mat2Inv = [
            [1, -tanAngle, 0],
            [0, 1, 0],
            [0, 0, 1]
        ];
        that.matInv = that.math.multiply(that.matInv, mat2Inv);
    }
    Trans2D.prototype.shearY = function(degrees) {
        var that = this;
        var radians = DEG_TO_RAD * degrees;
        var tanAngle = that.math.tan(-radians); // clockwise
        var mat2 = [
            [1, 0, 0],
            [tanAngle, 1, 0],
            [0, 0, 1]
        ];
        that.mat = that.math.multiply(mat2, that.mat);
        var mat2Inv = [
            [1, 0, 0],
            [-tanAngle, 1, 0],
            [0, 0, 1]
        ];
        that.matInv = that.math.multiply(that.matInv, mat2Inv);
    }
    Trans2D.prototype.scale = function(w, h) {
        var that = this;
        w = w || 1;
        h = h || 1;
        var mat2 = [
            [w, 0, 0],
            [0, h, 0],
            [0, 0, 1]
        ];
        that.mat = that.math.multiply(mat2, that.mat);
        var mat2Inv = [
            [1 / w, 0, 0],
            [0, 1 / h, 0],
            [0, 0, 1]
        ];
        that.matInv = that.math.multiply(that.matInv, mat2Inv);
    }
    Trans2D.prototype.apply = function(x, y) {
        var that = this;
        var result = that.math.multiply(that.mat, [x, y, 1]);
        return {
            x: result[0],
            y: result[1]
        };
    }
    Trans2D.prototype.applyInverse = function(x, y) {
        var that = this;
        var result = that.math.multiply(that.matInv, [x, y, 1]);
        return {
            x: result[0],
            y: result[1]
        };
    }

    module.exports = exports.Trans2D = Trans2D;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("Trans2D", function() {
    var should = require("should");
    var Trans2D = exports.Trans2D; // require("./Trans2D");
    var e = 0.0000000000001;

    function assertxy(xy, xyexpected, e) {
        xy.x.should.approximately(xyexpected.x, e);
        xy.y.should.approximately(xyexpected.y, e);
    }
    it("apply(x,y) transforms given point", function() {
        var xfm = new Trans2D();
        should.deepEqual(xfm.apply(1, 2), {
            x: 1,
            y: 2,
        });
    })
    it("translate(x,y) translates coordinate system by (x,y)", function() {
        var xfm = new Trans2D();
        xfm.translate(3, 5);
        should.deepEqual(JSON.stringify(xfm.mat), "[[1,0,3],[0,1,5],[0,0,1]]");
        assertxy(xfm.apply(1, 2), {
            x: 4,
            y: 7
        }, e);
    })
    it("rotate(degrees) rotates coordinate system by clockwise degrees", function() {
        var xfm = new Trans2D();
        xfm.rotate(90);
        assertxy(xfm.apply(1, 2), {
            x: 2,
            y: -1
        }, e);
        xfm.rotate(90);
        assertxy(xfm.apply(1, 2), {
            x: -1,
            y: -2
        }, e);
        xfm.rotate(90);
        assertxy(xfm.apply(1, 2), {
            x: -2,
            y: 1
        }, e);
        xfm.rotate(90);
        assertxy(xfm.apply(1, 2), {
            x: 1,
            y: 2
        }, e);
        xfm.translate(3, 5);
        assertxy(xfm.apply(1, 2), {
            x: 4,
            y: 7
        }, e);
    })
    it("applyInverse(x,y) applies inverse transformation to point", function() {
        var xfm = new Trans2D();
        xfm.translate(3, 5);
        assertxy(xfm.apply(1, 2), {
            x: 4,
            y: 7
        }, e);
        assertxy(xfm.applyInverse(4, 7), {
            x: 1,
            y: 2
        }, e);
        xfm.clear();
        xfm.rotate(90);
        assertxy(xfm.apply(1, 2), {
            x: 2,
            y: -1
        }, e);
        assertxy(xfm.applyInverse(2, -1), {
            x: 1,
            y: 2
        }, e);
        xfm.translate(3, 5);
        assertxy(xfm.apply(1, 2), {
            x: 5,
            y: 4
        }, e);
        assertxy(xfm.applyInverse(5, 4), {
            x: 1,
            y: 2
        }, e);
    })
    it("shearX(degrees) shears coordinate system clockwise, parallel to x-axis", function() {
        var xfm = new Trans2D();
        xfm.shearX(45);
        assertxy(xfm.apply(1, 0), {
            x: 1,
            y: 0
        }, e);
        assertxy(xfm.apply(1, 1), {
            x: 2,
            y: 1
        }, e);
        assertxy(xfm.apply(1, 2), {
            x: 3,
            y: 2
        }, e);
        assertxy(xfm.applyInverse(3, 2), {
            x: 1,
            y: 2
        }, e);
    })
    it("shearY(degrees) shears coordinate system clockwise, parallel to y-axis", function() {
        var xfm = new Trans2D();
        xfm.shearY(-45);
        assertxy(xfm.apply(0, 1), {
            x: 0,
            y: 1
        }, e);
        assertxy(xfm.apply(1, 1), {
            x: 1,
            y: 2
        }, e);
        assertxy(xfm.apply(2, 1), {
            x: 2,
            y: 3
        }, e);
        assertxy(xfm.applyInverse(2, 3), {
            x: 2,
            y: 1
        }, e);
    })
    it("scale(w,h) scales coordinate", function() {
        var xfm = new Trans2D();
        xfm.scale(2, 3);
        assertxy(xfm.apply(1, 2), {
            x: 2,
            y: 6
        }, e);
        assertxy(xfm.applyInverse(2, 6), {
            x: 1,
            y: 2
        }, e);
    })
    it("mirrorY() mirrors in y axis", function() {
        var xfm = new Trans2D();
        xfm.mirrorX();
        assertxy(xfm.apply(1, 2), {
            x: 1,
            y: -2
        }, e);
        xfm.clear();
        xfm.mirrorY();
        assertxy(xfm.apply(1, 2), {
            x: -1,
            y: 2
        }, e);
    })
})
