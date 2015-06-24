#!/usr/bin/env node

/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

'use strict';

var upgradeHtml = require('./upgrade_html');
var yargs = require('yargs');
var colors = require('colors/safe');
var fs = require('fs');
var path = require('path');

// NOTE(rictic): if this gets any more complicated, recommend changing to
//     minimist or nomnom rather than introducing another args parser into
//     the polymer team.
var argv = yargs
    .usage(
      'polyup [options] ./path/to/your/v0.5/source.html\n\n' +

      'Assists in upgrading code that uses Polymer from v0.5 to v1.0. Takes ' +
      'care of most of the purely mechanical steps automatically.\n\n' +

      'By default, running polyup simply prints the upgraded code to the ' +
      'console. You must use the --overwrite option for anything to actually ' +
      'be written to disk.')
    .demand(1)
    .help('help')
    .boolean('overwrite')
    .describe(
      'overwrite',
      'Overwrite the input html and any referenced scripts on disk. ' +
      'Warning! Be confident that your source control is in a good state ' +
      'before you override your source code!')
    .argv;

var filename = argv._[0];
if (!fs.existsSync(filename)) {
  console.error('No such file: ' + filename);
  process.exit(66);
}

var outputMap;
try {
  outputMap = upgradeHtml(filename);
} catch(e) {
  console.error('Error attempting to upgrade ' + filename + '\n\n');
  throw e;
}

if (!argv.overwrite) {
  console.log();
  for (var filename in outputMap) {
    var contents = outputMap[filename];
    console.log(colors.blue(filename));
    var lines = contents.split('\n');
    for (var i = 0; i < lines.length; i++) {
      console.log('  ' + lines[i]);
    }
  }
} else {
  var tempPaths = {};
  var cwd = process.cwd();
  for (var filename in outputMap) {
    if (filename.substring(0, cwd.length) !== cwd) {
      console.error('For safety polyup will only modify files under your ' +
                    'current working directory.');
      console.error('This file is outside your cwd: ' + filename);
      process.exit(78);
    }
  }
  for (var filename in outputMap) {
    // Put temp dirs in the same directory, to be confident that they'll be
    // in the same filesystem, and thus more likely for the moves to be atomic.
    var targetDir = path.dirname(filename);
    var tempFilename;
    do {
      tempFilename = path.join(targetDir, '.polyup_temp_' + Math.random());
    } while(fs.existsSync(tempFilename));
    tempPaths[filename] = tempFilename;
    fs.writeFileSync(tempFilename, outputMap[filename]);
  }
  // Now that we've written all of the data out to disk we can just do move
  // operations, which should be atomic on most systems.
  for (filename in outputMap) {
    tempFilename = tempPaths[filename];
    fs.renameSync(tempFilename, filename);
  }
}