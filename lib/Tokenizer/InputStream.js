'use strict';

var CodePoint = require('./CodePoint.js');

function InputStream(input) {
    this.index = -1;
    this.input = input;
}

InputStream.prototype = {
    constructor: InputStream,


    getCodePointAt: function (index) {
        var codePoint = this.input.charCodeAt(index);

        switch (codePoint) {
        // Replace any U+0000 NULL code point with U+FFFD REPLACEMENT CHARACTER ().
        case CodePoint.NULL:
            return CodePoint.REPLACEMENT;

        // Replace any U+000D CARRIAGE RETURN (CR) code point, U+000C FORM FEED (FF) code point,
        // or pairs of U+000D CARRIAGE RETURN (CR) followed by U+000A LINE FEED (LF) by
        // a single U+000A LINE FEED (LF) code point.
        case CodePoint.FORM_FEED:
            return CodePoint.LINE_FEED;
        case CodePoint.CARRIAGE_RETURN:
            if (this.input.charCodeAt(index + 1) === CodePoint.LINE_FEED) {
                this.index += 1;
            }
            return CodePoint.LINE_FEED;
        }

        return codePoint;
    },

    // The last code point to have been consumed.
    getCurrentCodePoint: function () {
        return this.getCodePointAt(this.index);
    },

    // The first code point in the input stream that has not yet been consumed.
    getNextCodePoint: function (length) {
        return this.getCodePointAt(this.index + (length || 1));
    },

    consumeNextCodePoint: function (length) {
        this.index += (length || 1);
    },

    // Push the current input code point back onto the front of the input stream,
    // so that the next time you are instructed to consume the next input code point,
    // it will instead reconsume the current input code point
    reconsumeCurrentCodePoint: function () {
        this.index -= 1;
    }
};

module.exports = InputStream;
