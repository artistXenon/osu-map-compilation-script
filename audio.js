const audioConcat = require("audioconcat-security-patched");
const mp3Duration = require("mp3-duration");
const { Lame } = require("node-lame");

var songs = []
var isDone = false;

function audioMerge(n = 1, cb) {
    getComponentDuration(1, n, () => {
        if (isDone) return cb(songs);
    });
}

function audioConcatenate(songs, cb) {
    var fileList = []
    for (i in songs) fileList.push(songs[i].file);
    audioConcat(fileList)
        .concat('output/audio.mp3')
        .on('start', function (command) {
            console.log('ffmpeg process started:', command);
        })
        .on('error', function (err, stdout, stderr) {
            console.error('Error:', err);
            console.error('ffmpeg stderr:', stderr);
        })
        .on('end', function (output) {
            console.error('Audio created in:', output);
            getDuration('output/audio.mp3', () => {
                isDone = true;
            });
            cb();
        })
}

function getComponentDuration(i, n, cb) {
    if (i > n) {
        audioConcatenate(songs, () => {
            isDone = true;
        });
        return cb();
    } 
    var filename = `input/${i}.mp3`;
    var destFilename = `input/${i}-use.mp3`;
    mp3Duration(filename, (err, duration) => {
        if (err) return console.log(err.message);
        console.log(`${filename} is ${duration * 1000}ms long`);
        const encoder = new Lame({
            output: destFilename,
            bitrate: 128,
            resample: 44.1
        }).setFile(filename);

        encoder.encode()
            .then(() => {
                // Encoding finished
                getDuration(destFilename, (length) => {
                    songs.push({
                        file: destFilename,
                        length
                    });
                    getComponentDuration(i + 1, n, cb);
                })
            })
            .catch(error => {
                throw error;
            });
        cb();
    });

}

function getDuration(filename, cb) {
    mp3Duration(filename, (err, duration) => {
        if (err) cb(-1);
        console.log(`${filename} is ${duration * 1000} ms long`);
        cb(duration * 1000);
        //return duration * 1000
    });
}

module.exports = audioMerge;
// return;