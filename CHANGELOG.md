0.1.10
------
* NEW: command line JSON configuration 
* NEW: color.border for PCB border
* NEW: increased sensitivity for FireSight matchtemplate.json
* NEW: more examples for PCB matching

0.1.9
-----
* FIX: user-specified bounds ignored

0.1.7
-----
* NEW: Support Gerber files generated by SparkFun Eagle BRD sfe-gerb274x.cam 
* FIX: --png crash

0.1.6
-----
* FIX: --help crashes

0.1.5
-----
* FIX: --version crashes

0.1.4
-----
* FIX: README examples did not work

0.1.3
-----
* updated package dependencies

0.1.2
-----
* FIX: silkscreen arcs and rectangles not showing in Gerber to SVG

0.1.1
-----
* use SVG circle for Gerber 360 degree arcs
* use 0.1mm for default aperture stroke width

0.1.0
-----
Revised command line interface and removed:
* --layer
* --out
* --show
Added output file parameters:
* --png
* --csv-holes
* --csv-smdpads
* --svg

0.0.5
-----
* --json JSON configuration file

0.0.4
-----
* --eagle Eagle BRD file input
* --gbl  Gerber bottom copper file
* --gbo  Gerber bottom silkscreen file
* --gbs  Gerber bottom soldermask file
* --gko  Gerber keepout file (Altium/Protel board outline)
* --gml  Gerber mill file
* --gtl  Gerber top copper file
* --gto  Gerber top silkscreen file
* --gtp  Gerber top paste file
* --gts  Gerber top soldermask file
* --txt  Gerber drill file file

0.0.3
-----
* update package.json dependencies