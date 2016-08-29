const { Transform } = require('stream');

const transformStream = Transform();

let count = 0;

transformStream._transform = (chunk, _, callback) => {

	let processedChunk = chunk.toString()

	// const sentenceInformation = {
	// 	sentence: processedChunk, 
	// 	arrayIndex: count,
	// 	scoreOutOfTen: 5
	// }

	callback(null, processedChunk);
};

module.exports = { transformStream };