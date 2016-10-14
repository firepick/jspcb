# jspcb
Javascript library for parsing PCB file formats having rich metadata. 
Compatible with nodejs, jspcb can be used on the server or in the browser 
client in the context of automated pick-and-place (PnP).

### Install
`npm install jspcb`

### Command line
You can install the **jspcb** command line wrapper to perform common tasks:

`npm install -g`

For example, with **jspcb** you convert XML Eagle BRD file such as the 
<a href="https://github.com/adafruit/Adafruit-PCB-Ruler/blob/master/Adafruit%20PCB%20Reference%20Ruler.brd">AdaFruit PCB ruler</a>
into its 
<a href="https://raw.githubusercontent.com/firepick/jspcb/master/eagle/ruler.svg">SVG equivalent</a>

`jspcb --eagle eagle/ruler.brd -o svg`

<a href="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler.png">
    <img src="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler.png" height="200px"></a>

