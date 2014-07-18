'use strict';

var Types = require('../Types.js'),
    InputStream = require('./InputStream.js');

function Tokenizer(input) {
    var consumeToken;

    this.canConsume = true;
    this.currentToken = null;

    // If `input` is an array, we'll assume it's a component value list.
    if (Array.isArray(input)) {
        this.inputStream = input;
        consumeToken = function (inputStream) {
            // If the array is, or becomes empty; emit <EOF-token>s.
            return inputStream.shift() || { type: Types.EOF };
        };
    } else {
        this.inputStream = new InputStream(input);
        consumeToken = require('./Algorithms.js').consumeToken;
    }

    this.nextToken = consumeToken(this.inputStream);

    // Let the current input token be the current next input token,
    // adjusting the next input token accordingly.
    this.consumeNextToken = function () {
        if (this.canConsume) {
            this.currentToken = this.nextToken;
            this.nextToken = consumeToken(this.inputStream);
        } else {
            this.canConsume = true;
        }
    };
}


Tokenizer.prototype = {
    constructor: Tokenizer,

    // The token or component value currently being operated on,
    // from the list of tokens produced by the tokenizer.
    getCurrentToken: function () {
        return this.currentToken;
    },

    // The token or component value following the current input token in the list
    // of tokens produced by the tokenizer. If there isn’t a token following the
    // current input token, the next input token is an <EOF-token>.
    getNextToken: function () {
        return this.nextToken;
    },

    // The next time an algorithm instructs you to consume the next input token,
    // instead do nothing (retain the current input token unchanged).
    reconsumeCurrentToken: function () {
        this.canConsume = false;
    }
};

module.exports = Tokenizer;
