#!/usr/bin/env node

/**
 * jspcb
 *
 * https://github.com/firepick/jspcb
 */

var fs = require('fs');

/**
 * Output application version number.
 * Version number is read version from package.json.
 */
function outputVersion () {
  fs.readFile(__dirname + '/../package.json', function (err, data) {
    if (err) {
      console.log(err.toString());
    }
    else {
      var pkg = JSON.parse(data);
      var version = pkg && pkg.version ? pkg.version : 'unknown';
      console.log(version);
    }
    process.exit(0);
  });
}

/**
 * Output a help message
 */
function outputHelp() {
  console.log('jspcb');
  process.exit(0);
}

var version = false;
var help = false;

process.argv.forEach(function (arg, index) {
  if (index < 2) {
    return;
  }

  switch (arg) {
    case '-v':
    case '--version':
      version = true;
      break;

    default:
    case '-h':
    case '--help':
      help = true;
      break;
  }
});

if (version) {
  outputVersion();
} else if (help) {
  outputHelp();
} else if (scripts.length === 0) {
}
