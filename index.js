var recursive = require("recursive-readdir"),
    jsonfile = require('jsonfile'),
    fs = require('fs'),
    argv = require('yargs').argv,
    ignores = ["**.css", "**.scss", "**.json"],
    srcDir = argv['src-dir'],
    translationDir = argv['translation-dir'];

if (srcDir && translationDir) {
    console.log('*** Will find and replace missing keys.');
    console.log('* Source directory', srcDir);
    console.log('* Translation directory', translationDir);
    runScript();
} else {
    console.log('--src-dir and --translation-dir arguments are required.');
}

function readFile(path) {
    return new Promise(function(resolve, reject) {
        fs.readFile(path, 'utf8', function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function findMissingKeys(text, keys) {
    var missingKeys = [];
    keys.forEach(function(key) {
        if (!text.includes(key) && missingKeys.indexOf(key) === -1) {
            missingKeys.push(key);
        }
    });
    return missingKeys;
}

function compileNewTranslations(filePath, oldTranslations, missingKeys) {
    newTranslations = oldTranslations;
    missingKeys.forEach(function(key) {
        delete newTranslations[key];
    });
    fs.writeFile(filePath, JSON.stringify(newTranslations, 2, 4), 'utf8', function(err, data) {
        if (err) {
            console.log("Failed to write new translations to", filePath);
        } else {
            console.log('*** Removed', missingKeys.length, 'keys from', filePath);
        }
    });
}

function handleTranslationFile(translationFile) {
    jsonfile.readFile(translationFile, function(err, obj) {
        var keys = Object.keys(obj);
        var text = '';

        recursive(srcDir, ignores, function(reErr, files) {
            files.forEach(function(path, i) {
                readFile(path).then(function(data) {
                    text += data;

                    if (i + 1 === files.length) {
                        missingKeys = findMissingKeys(text, keys);
                        compileNewTranslations(translationFile, obj, missingKeys);
                    }
                }, function(error) {
                    console.log("Failed to read:", path, err);
                });
            });
        });
    });
}

function runScript() {
    recursive(translationDir, [function(file, stats) {
            return file.split('.').pop() !== 'json';
        }
    ], function(reErr, files) {
        files.forEach(function(translationFile) {
            handleTranslationFile(translationFile);
        });
    });
}