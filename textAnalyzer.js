#! /usr/bin/env node

'use strict';

// dependencies 
const { get } = require('request');
const { load } = require('cheerio');
const config = require('./config.json');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
app.set('port', port)

app.set('view engine', 'pug')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false}))

// scrapes the targeted web page and grabs elements from the html page

const loadH1FromPage = body => {
	const $ = load(body)
	return $('h1.review-title').text()
}

const getArtistName = body => {
	const $ = load(body)
	return $('ul.artist-list li a').text()
};

const getReviewScore = body => {
	const $ = load(body)
	return $('span.score').text()
};


// scrapes the web page and returns just the text from the article
const loadText = (body) => {
	const $ = load(body);
	return $('div.dropcap').text();
};

// splits the text into an array of sentences
const parseText = (textToParse) => {
	return textToParse.split('. ');
};

// this function ranks the sentence based on the percentage of filler words 
const rankSentence = (text) => {
	
	let badWords = config.settings.badWords;
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

// this function evaluates the stor
const compressParagraph = (objectArray) => {

	let minRank = config.settings.minRank;
	let compressedArray = [];

	objectArray.forEach((x) => {if (x.rank >= minRank){compressedArray.push(x.text)}});

	return compressedArray;
};

// This function takes the text and outputs a paragraph reduced 
const makeNewParagraph = (rawParagraph) => {
	
	let sentenceArray = parseText(rawParagraph);
	let objectArray = [];
	let counter = 0;

	sentenceArray.forEach((sentence) => {
		objectArray.push(
			{
				'text': sentence,
				'rank': rankSentence(sentence),
				'ord': counter
			}
		);
		counter++
	})

	return compressParagraph(objectArray).join('. ');
};

// returns the length of a paragraph based on word count. 
const paragraphWordCounter = (paragraph) => {
	return paragraph.split(" ").length
};

// returns the percentage reduced by the paragraph reduction
const reductionPercentCalculator = (oldLength, newLength) => {
	return Math.floor((newLength / oldLength) * 100)
};

// Calculates the average read time based on the average reader reading ~180 words a minute
// and rounded up based on the fact that Americans' reading levels are dropping
// Calculates based on the number of words in the paragraph
const readEstimatorByMinute = (paragraphLength) => {
	return Math.floor(paragraphLength / 180) + 1
}; 

// This function takes in the before and after values of the paragraph and outputs then 
// compares the before and after reading length and word count.  The function returns an 
// object that 
const infoObjectMaker = (paragraph) => {

	let originalLength = paragraphWordCounter(loadText(paragraph));
	let reducedLength = paragraphWordCounter(makeNewParagraph(loadText(paragraph)))

	return {
		'originalLength': originalLength,
		'reducedLength': reducedLength,
		'percentOfOriginal': reductionPercentCalculator(originalLength, reducedLength),
		'originalReadTime': readEstimatorByMinute(originalLength),
		'reducedReadTime': readEstimatorByMinute(reducedLength)
	};
};

// Routes
app.get('/', (req, res) => {
	res.render('index')
})

let urlInput = null;

app.post('/', (req, res) => {	
	urlInput = req.body.url;
	res.redirect('/layout')
})

app.get('/layout', (req, res) => {
	if (urlInput) {
		
	get(urlInput, (err, _, body) => {

			// This is where all of the data is taken and then passed to Pug. 

			let rawHTML = loadText(body);
		
			let statsObject = infoObjectMaker(body)

			app.locals.percentOfOriginal = statsObject.percentOfOriginal;
			app.locals.reviewArtist = getArtistName(body);
			app.locals.reviewTitle = loadH1FromPage(body);
			app.locals.rawHTML = rawHTML;
			app.locals.newParagraph = 	makeNewParagraph(rawHTML);
			app.locals.reviewScore = getReviewScore(body);
			app.locals.timeSaved = statsObject.originalReadTime - statsObject.reducedReadTime;
			app.locals.originalLength = statsObject.originalLength;
			app.locals.reducedLength = statsObject.reducedLength;
			app.locals.originalReadTime = statsObject.originalReadTime;
			app.locals.reducedReadTime = statsObject.reducedReadTime;

			res.render('layout')
		})
	} else {console.log("why?")}
})

app.listen(app.get('port'));
