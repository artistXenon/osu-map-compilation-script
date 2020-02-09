//osu Map Merging Script

const readline = require('readline');
const fs = require('fs');
const audioProc_merge = require('./audio');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

let rlcount = 0;
let mapLength = [0];
let mapContent = [];
let metadataInput = [];
let mapLimit = 0;
let offset = 0;
let imported = 0;
let mergedTimeStamp = [];
let mergedObject = [];
let sliderMultiplier = [];
let metadataString = '';
const colorString = '[Colours]\r\nCombo1 : 255,0,0\r\nCombo2 : 0,255,0\r\nCombo3 : 0,0,255\r\n\r\n';
let temp = '';
let temppos = 0;
let queued = false;
let audioMergeMode = false;
//insert default combo color

console.log('---osu! Compilation Map making script by NeroYuki---')
console.log("Map count: "); 


rl.on('line', input => {
	if (mapLimit > 0 && input == -1) {
		mapLength = [0]
		audioMergeMode = true;
		rl.close();
	}
	else if (!rlcount) {
		if (isNaN(input)) 
			console.log(`Please input only numbers: `);
		else {
			console.log(`Map length ${rlcount + 1}: `); 
			mapLimit = input; 
			rlcount++; 
		}
	}
	else if (rlcount < mapLimit) {
		if (isNaN(input))
			console.log(`Please input only numbers: `);
		else{
			console.log(`Map length ${rlcount + 1}: `); 
			mapLength.push(input); 
			rlcount++
		}
	}
	else {
		mapLength.push(input); console.log(mapLength); 
		rl.close();
	}
});

rl.on('close', () => {
	let rl2count = 0;
	const rl2 = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	console.log('Title:');
	const metaKeys = [`Artist`, `Creator`, `Version`, `HPDrainRate`, `CircleSize`, `OverallDifficulty`, `ApproachRate`];
	rl2.on('line', input => {
		if (rl2count > 3){
			if(isNaN(input))
				return console.log(`${metaKeys[rl2count-1]} should be a number`);
			else input = Math.floor(input*10)/10;
		}
		metadataInput.push(input);
		rl2count++;
		if (rl2count < 8) console.log(`${metaKeys[rl2count-1]}: `);
		else rl2.close();
	});

	rl2.on('close', () => {
		console.log('input done, processing...');
		if (audioMergeMode) {
			console.log('---Audio Merging Mode (EXPERIMENTAL)---')
			audioProc_merge(mapLimit, songRes => {
				for (i in songRes) mapLength.push(songRes[i].length);
				mapProcessing();
			})
		}
		else mapProcessing();
	});
});

function mapProcessing() {
	console.log(mapLength); 
	console.log(metadataInput);
	fs.readFile(`input/${imported+1}.osu`, 'utf8', cb);		
	function cb (err, data) {
		if (err) throw err;
		mapContent[imported] = data; 
		imported++;
		if (imported == mapLimit) breakdownMap();
		else fs.readFile(`input/${imported+1}.osu`, 'utf8', cb);
	}
}

function breakdownMap() {
	//console.log(colorString);
	console.log('Breaking down map...');
	for (let j = 0; j < mapLimit; j++) {
		leadoffset = 0;
		offset += parseInt(mapLength[j]);
		console.log(`Map ${j+1}...`);
		let TimingArea = false;
		let ObjectArea = false;
		let line = mapContent[j].split('\n');
		for (x in line) {
			if (line[x] == '\r' || line[x].includes('[Colours]')) {TimingArea = false; ObjectArea = false; continue;}
			else if (line[x].includes('[TimingPoints]')) {TimingArea = true; ObjectArea = false; continue;}
			else if (line[x].includes('[HitObjects]')) {ObjectArea = true; TimingArea = false; continue;}
			else if (line[x].includes('SliderMultiplier:')) sliderMultiplier.push(2.0 / parseFloat(line[x].split(':')[1]));
			else if (line[x].includes('AudioLeadIn:')) leadoffset = parseFloat(line[x].split(':')[1]);
			if (TimingArea && sliderMultiplier[j]) adjustTiming(line[x], offset, sliderMultiplier[j]);
			if (ObjectArea) adjustObject(line[x], offset);
		}
		console.log(`Map ${j+1} Merged`);
	}
	mapCreate();
}

function adjustTiming(line, offset, sliderMultiplier) {
	if (isNaN(parseInt(line))) return;
	let x = line.split(',');
	let mspb = parseFloat(x[1]);
	let pos = parseInt(x[0]);
	if (queued) {
		if (temppos != pos) mergedTimeStamp.push(temp);
		queued = false;
	}
	x[0] = (pos + offset).toString();
	//console.log(pos + ' ' + npos);
	if (parseFloat(mspb) < 0) {
		x[1] = (mspb * sliderMultiplier).toString();
		line = x.join();
		mergedTimeStamp.push(line);
	}
	else {
		let lineAlt = line;
		let xAlt = lineAlt.split(',');
		temppos = pos;
		xAlt[0] = (pos + offset).toString();
		xAlt[1] = (-100 * sliderMultiplier).toString();
		xAlt[6] = 0;
		temp = xAlt.join();
		queued = true;
		line = x.join();
		mergedTimeStamp.push(line);
	}
	//console.log(line)
}

function adjustObject(line, offset) {
	if (Number.isNaN(parseInt(line))) return;
	let x = line.split(',');
	let tpos = parseInt(x[2]);
	let type = parseInt(x[3]);
	if (type == 12) {
		let epos = parseInt(x[5]); 
		x[5] = (epos + offset).toString();
	}
	x[2] = (tpos + offset).toString();
	line = x.join();
	//console.log(line)
	mergedObject.push(line);
}

function mapCreate() {
	initMetadata();
	let mergedMap = metadataString + `[TimingPoints]\r\n${mergedTimeStamp.join('\n')}\r\n\r\n${colorString}[HitObjects]\r\n${mergedObject.join('\n')}`;
	//console.log(mergedMap);
	fs.writeFile(`output/${metadataInput[1]} - ${metadataInput[0]} (${metadataInput[2]}) [${metadataInput[3]}].osu`, mergedMap, 'utf8', err => {
		if (err) throw err;
		console.log('The file has been saved!');
	});
}

function initMetadata() {
	metadataString += 'osu file format v14\r\n\r\n'
	metadataString += '[General]\r\nAudioFilename: audio.mp3\r\nAudioLeadIn: 0\r\nPreviewTime: 0\r\nCountdown: 0\r\nSampleSet: Normal\r\nStackLeniency: 0.2\r\nMode: 0\r\nLetterboxInBreaks: 0\r\nWidescreenStoryboard: 1\r\n\r\n';
	metadataString += '[Editor]\r\nBookmarks:0\r\nDistanceSpacing: 1.0\r\nBeatDivisor: 8\r\nGridSize: 16\r\nTimelineZoom: 2\r\n\r\n';
	metadataString += '[Metadata]\r\n';
	metadataString += 'Title:' + metadataInput[0] + '\r\nTitleUnicode:' + metadataInput[0] + '\r\n';
	metadataString += 'Artist:' + metadataInput[1] + '\r\nArtistUnicode:' + metadataInput[1] + '\r\n';
	metadataString += 'Creator:' + metadataInput[2] + '\r\n';
	metadataString += 'Version:' + metadataInput[3] + '\r\n';
	metadataString += 'Source:\r\nTags:\r\nBeatmapID:0\r\nBeatmapSetID:-1\r\n\r\n'
	metadataString += '[Difficulty]\r\n';
	metadataString += 'HPDrainRate:' + metadataInput[4] + '\r\n';
	metadataString += 'CircleSize:' + metadataInput[5] + '\r\n';
	metadataString += 'OverallDifficulty:' + metadataInput[6] + '\r\n';
	metadataString += 'ApproachRate:' + metadataInput[7] + '\r\n';
	metadataString += 'SliderMultiplier:2\r\nSliderTickRate:1\r\n\r\n';
	metadataString += '[Events]\r\n//Background and Video events\r\n//Break Periods\r\n//Storyboard Layer 0 (Background)\r\n';
	metadataString += '//Storyboard Layer 1 (Fail)\r\n//Storyboard Layer 2 (Pass)\r\n//Storyboard Layer 3 (Foreground)\r\n//Storyboard Sound Samples\r\n\r\n';
}
