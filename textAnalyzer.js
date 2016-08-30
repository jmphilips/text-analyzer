#! /usr/bin/env node

'use strict';

// dependencies 
const { get } = require('request');
const { createServer } = require('http');
const { load } = require('cheerio');

// Grabs the command line argument. 
const [,, url] = process.argv;

let loadText = (body) => {
	const $ = load(body);
	return $('div.dropcap').children('p').text()
};

let parseText = (textToParse) => {
	return textToParse.split('.');
};

let rankSentence = (text) => {

	let badWords = ['for', 'by', 'and', 'on', 'of', 'the'];
	let wordsArray = text.split(' ');
	let wordCount = wordsArray.length;
	let rank = 0;

	wordsArray.forEach((word) => {
		badWords.forEach((bw) => {
			if (word.toLowerCase() === bw.toLowerCase()) {rank++;}
		});
	});

	let goodWords = wordCount - rank;

	return goodWords / wordCount;
};


let compressParagraph = (objectArray) => {
	let compressedArray = [];

	objectArray.forEach((x) => {if (x.rank >= .85){compressedArray.push(x.text)}});

	return compressedArray;
};


// Starts up the server
const server = createServer();

// Makes an event handler 
server.on('request', (req, res) => {

	get(url, (err, _, body) => {

		let rawText = loadText(body);
		let sentenceArray = parseText(rawText);

		let objectArray = [];
		let count = 0;

		sentenceArray.forEach((x) => {
			objectArray.push(
				{
					'text': x,
					'rank': rankSentence(x),
					'ord': count,		
				}
			);
			count++;
		});

		let newParagraph = compressParagraph(objectArray).toString();

		let t = rawText + "\n\n\n\n\n\n\n\n\n\n" + newParagraph;
		let $ = load(body)

		

		res.end($.html());
	})
});



server.listen(3000);

