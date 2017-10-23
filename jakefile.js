/* global jake:false */
/* global task:false */
/* global desc:false */
/* global complete:false */
/* global process:false */

var exec = (cmd, arg) => new Promise(resolve => {
    jake.exec(cmd, arg || {}, resolve);
});

function babel(args) {
    args = args || {};

    var fs = require('fs');
    var path = require('path');
    var babel = require('babel');

    var tsconfig = require(path.resolve('tsconfig.json'));

    var sourceMaps = args.sourceMaps === undefined ? true : !!args.sourceMaps;
    var srcPath = args.srcPath || tsconfig.compilerOptions.out;
    var outPath = args.outPath || srcPath;

    var es6src = fs.readFileSync(srcPath, 'utf8');
    var es6map = sourceMaps && fs.readFileSync(srcPath + '.map', 'utf8');

    var es5 = babel.transform(es6src, {
        inputSourceMap: sourceMaps && JSON.parse(es6map),
        sourceMaps: sourceMaps,
        loose: args.loose === false ? undefined : 'all',
        compact: false,
        blacklist: args.blacklist || [
            'regenerator',
            //'es6.forOf',
            //'es6.classes',
            //'es6.blockScoping',
            //'es6.templateLiterals',
        ]
    });

    es5.code = es5.code.replace(
        /(\r?\n\/\/# sourceMappingURL=)(.+)$/img,
        sourceMaps ? '$1' + outPath + '.map' : '$1(removed; see jakefile.js)');

    fs.writeFileSync(outPath, es5.code, 'utf8');
    sourceMaps && fs.writeFileSync(outPath + '.map', JSON.stringify(es5.map, null, '\t'), 'utf8');
}

desc('Empties the .bin folder');
task('clean', () => {
    jake.rmRf('.bin');
    jake.mkdirP('.bin');
});

desc('Builds the testbench app.');
task('tb', { async: true }, mode => {
    console.log('building the testbench app...');

    exec('node node_modules/typescript/lib/tsc', { printStdout: true }).then(() => {
        if (mode == 'dev') {
            // TODO: babel screws source maps
            console.log('skipping babel in the dev mode...');
        } else {
            return babel({
                loose: false,
                blacklist: [
                    //'regenerator', // doesn't work in IE/Edge
                    //'es6.forOf', // doesn't work in IE/Edge
                    //'es6.blockScoping', // otheriwse const/let variables won't be bound in loops with callbacks
                ]
            });
        }
    }).then(() => {
        console.log('rebuilding problems/manifest.json...');
        process.chdir('node_modules/problems');
        return exec('npm i');
    }).then(() => {
        return exec('node sgf > manifest.json');
    }).then(() => {
        process.chdir('../..');
    }).then(complete);
});

desc('Builds the site contents.');
task('site', ['tb'], () => {
    console.log('building the site...');
    jake.cpR('libs', '.bin');
    jake.cpR('node_modules/problems', '.bin/problems');
    jake.rmRf('.bin/problems/node_modules');

    jake.cpR('node_modules/tsumego.js/bin/tsumego.js', '.bin');
    jake.cpR('node_modules/tsumego.js/bin/tsumego.es5.js', '.bin');
    jake.cpR('node_modules/tsumego.js/bin/tsumego.es6.js', '.bin');

    jake.cpR('index.html', '.bin');
    jake.cpR('favicon.ico', '.bin');
    jake.cpR('styles', '.bin');
});

desc('Builds everything.');
task('default', ['clean', 'site'], () => {
    console.log('done!');
});
