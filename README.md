# jspcb
Javascript library for parsing PCB file formats having rich metadata. 
Compatible with nodejs, jspcb can be used on the server or in the browser 
client in the context of automated pick-and-place (PnP).

### Install
Clone this repository and install the command line wrapper:

`git clone https://github.com/firepick/jspcb.git`
`cd jspcb`
`npm install -g`

### Command line
#### Generate SVG file from Eagle BRD
Convert XML Eagle BRD file such as the 
<a href="https://github.com/adafruit/Adafruit-PCB-Ruler/blob/master/Adafruit%20PCB%20Reference%20Ruler.brd">AdaFruit PCB ruler</a>
into its 
<a href="https://raw.githubusercontent.com/firepick/jspcb/master/eagle/ruler.svg">SVG equivalent</a>

`jspcb --eagle eagle/ruler.brd -o svg`

<a href="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler.png">
    <img src="https://raw.githubusercontent.com/firepick/jspcb/master/doc/ruler.png" height="200px"></a>

#### Generate CSV file with SMD pads
`jspcb --eagle eagle/ruler.brd -o csv --layer 16`
