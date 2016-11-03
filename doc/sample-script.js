const jspcb = require("jspcb");
const PcbTransform = jspcb.PcbTransform;

var pcbTrans = new PcbTransform({
    eagle: {
        path: "eagle/ruler.brd",
    },
});
console.log(pcbTrans.viewBounds());
