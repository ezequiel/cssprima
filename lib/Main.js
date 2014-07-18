'use strict';

var API,
    Types = require('./Types.js'),
    Tokenizer = require('./Tokenizer/Tokenizer.js');

API = require('./Parser/EntryPoints.js');

API.Types = Types;

API.tokenize = function (input) {
    var token,
        tokens = [],
        tokenizer = new Tokenizer(input);

    for (;;) {
        tokenizer.consumeNextToken();
        token = tokenizer.getCurrentToken();

        if (token.type === Types.EOF) {
            break;
        }

        tokens.push(token);
    }

    return tokens;
};

module.exports = API;
