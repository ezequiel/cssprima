'use strict';

var Types = require('../Types.js'),
    SpecialString = require('./SpecialString.js'),
    CodePoint = require('./CodePoint.js'),

    consumeComments,
    consumeNumericToken,
    consumeIdentLikeToken,
    consumeStringToken,
    consumeUrlToken,
    consumeUnicodeRangeToken,
    consumeEscapedCodePoint,
    areValidEscape,
    wouldStartIdentifier,
    wouldStartNumber,
    consumeName,
    consumeDigits,
    consumeNumber,
    consumeBadUrl,
    consumeToken;

// 4.3: Tokenizer Algorithms
// -------------------------

// 4.3.2: Consume comments
// -----------------------
consumeComments = function (inputStream) {
    // If the next two input code point are U+002F SOLIDUS (/)
    // followed by a U+002A ASTERISK (*),
    // consume them and all following code points up to and including
    // the first U+002A ASTERISK (*) followed by a U+002F SOLIDUS (/),
    // or up to an EOF code point.
    if (inputStream.getNextCodePoint() === CodePoint.SOLIDUS
            && inputStream.getNextCodePoint(2) === CodePoint.ASTERISK) {

        inputStream.consumeNextCodePoint(2);

        for (;;) {
            if (CodePoint.isEOF(inputStream.getNextCodePoint())
                    || (inputStream.getNextCodePoint() === CodePoint.ASTERISK
                            && inputStream.getNextCodePoint(2) === CodePoint.SOLIDUS)) {

                inputStream.consumeNextCodePoint(2);
                break;
            }

            inputStream.consumeNextCodePoint();

            // Return to the start of this step.
        }

        // If the preceding paragraph ended by consuming an EOF code point,
        // this is a parse error.
        if (CodePoint.isEOF(inputStream.getNextCodePoint())) {
            return {
                type: Types.ERROR,
                value: 'invalid'
            };
        }
    }

    // Otherwise, return nothing.
};

exports.consumeComments = consumeComments;

// 4.3.3: Consume a numeric token
// ------------------------------
consumeNumericToken = function (inputStream) {
    var returnNumber, dimension, returnValue;

    // Consume a number.
    returnNumber = consumeNumber(inputStream);

    // If the next 3 input code points would start an identifier, then:
    if (wouldStartIdentifier(inputStream.getNextCodePoint(),
                             inputStream.getNextCodePoint(2),
                             inputStream.getNextCodePoint(3))) {

        // Create a <dimension-token> with the same representation,
        // value, and type flag as the returned number,
        // and a unit set initially to the empty string.
        dimension = {
            type: Types.DIMENSION,
            repr: returnNumber.repr,
            value: returnNumber.value,
            typeFlag: returnNumber.type || 'integer',
            unit: ''
        };

        // Consume a name.
        returnValue = consumeName(inputStream);

        // Set the <dimension-token>'s unit to the returned value.
        dimension.unit = returnValue;

        // Return the <dimension-token>.
        return dimension;
    }

    // Otherwise, if the next input code point is U+0025 PERCENTAGE SIGN (%),
    // consume it.
    if (inputStream.getNextCodePoint() === CodePoint.PERCENTAGE_SIGN) {
        inputStream.consumeNextCodePoint();

        // Create a <percentage-token> with the same
        // representation and value as the returned number,
        // and return it.
        return {
            type: Types.PERCENTAGE,
            repr: returnNumber.repr,
            value: returnNumber.value,
            typeFlag: returnNumber.type || 'integer'
        };
    }

    // Otherwise, create a <number-token> with the same
    // representation, value, and type flag as the returned number,
    // and return it.
    return {
        type: Types.NUMBER,
        repr: returnNumber.repr,
        value: returnNumber.value,

        // The type flag defaults to "integer" if not otherwise set.
        typeFlag: returnNumber.type || 'integer'
    };
};

exports.consumeNumericToken = consumeNumericToken;

// 4.3.4: Consume an ident-like token
// ----------------------------------
consumeIdentLikeToken = function (inputStream) {
    var returnString;

    // Consume a name.
    returnString = consumeName(inputStream);

    // If the returned string's value is an ASCII case-insensitive match for
    // "url", and the next input code point is U+0028 LEFT PARENTHESIS ((),
    // consume it.
    if (returnString.toLowerCase() === 'url'
            && inputStream.getNextCodePoint() === CodePoint.LEFT_PAREN) {

        inputStream.consumeNextCodePoint();

        // While the next input code point is whitespace, consume it.
        while (CodePoint.isWhitespace(inputStream.getNextCodePoint())) {
            inputStream.consumeNextCodePoint();
        }

        // If the next input token is U+0022 QUOTATION MARK (") or
        // U+0027 APOSTROPHE ('), reconsume the current input code point,
        // then create a <function-token> with its value set to the returned
        // string and return it.
        // if (inputStream.getNextCodePoint() === CodePoint.QUOTATION_MARK
                // || inputStream.getNextCodePoint() === CodePoint.APOSTROPHE) {

            // inputStream.reconsumeCurrentCodePoint();
            // return {
                // type: Types.FUNCTION,
                // value: returnString
            // };
        // }

        // Otherwise, consume a url token, and return it.
        return consumeUrlToken(inputStream);
    }

    // Otherwise, if the next input code point is U+0028 LEFT PARENTHESIS ((),
    // consume it.
    if (inputStream.getNextCodePoint() === CodePoint.LEFT_PAREN) {
        inputStream.consumeNextCodePoint();

        // Create a <function-token> with its value
        // set to the returned string and return it.
        return {
            type: Types.FUNCTION,
            value: returnString
        };
    }

    // Otherwise, create an <ident-token> with its value
    // set to the returned string and return it.
    return {
        type: Types.IDENT,
        value: returnString
    };
};

exports.consumeIdentLikeToken = consumeIdentLikeToken;

// 4.3.5: Consume a string token
// -----------------------------
consumeStringToken = function (inputStream) {
    var string, value, endingCodePoint;

    // Initially create a <string-token> with its value
    // set to the empty string.
    string = {
        type: Types.STRING
    };

    value = new SpecialString();

    // If an ending code point is not specified,
    // the current input code point is used.
    endingCodePoint = inputStream.getCurrentCodePoint();

    // Repeatedly consume the next input code point from the stream:
    for (;;) {
        inputStream.consumeNextCodePoint();

        switch (inputStream.getCurrentCodePoint()) {
        case endingCodePoint:
            string.value = value.toString();
            return string;
        case CodePoint.LINE_FEED:
            // This is a parse error.
            // Reconsume the current input code point,
            // create a <bad-string-token>, and return it.
            inputStream.reconsumeCurrentCodePoint();
            return {
                type: Types.BAD_STRING
            };
        case CodePoint.REVERSE_SOLIDUS:
            switch (inputStream.getNextCodePoint()) {
            case CodePoint.LINE_FEED:
                // Otherwise, if the next input code point is a newline,
                // consume it.
                inputStream.consumeNextCodePoint();
                break;
            default:
                // If the next input code point is EOF, do nothing.
                if (!CodePoint.isEOF(inputStream.getNextCodePoint())) {
                    // Otherwise, (the stream starts with a valid escape)
                    // consume an escaped code point and
                    // append the returned code point to the <string-token>'s value.
                    value.append(consumeEscapedCodePoint(inputStream));
                }
            }
            break;
        default:
            if (CodePoint.isEOF(inputStream.getCurrentCodePoint())) {
                string.value = value.toString();
                return string;
            }

            // Append the current input code point to
            // the <string-token>'s value.
            value.append(inputStream.getCurrentCodePoint());
        }
    }
};

exports.consumeStringToken = consumeStringToken;

// 4.3.6: Consume a url token
// --------------------------
consumeUrlToken = function (inputStream) {
    var url, value, returnString;

    // Initially create a <url-token> with its value
    // set to the empty string.
    url = {
        type: Types.URL,
        value: ''
    };

    // Consume as much whitespace as possible.
    while (CodePoint.isWhitespace(inputStream.getNextCodePoint())) {
        inputStream.consumeNextCodePoint();
    }

    // If the next input code point is EOF, return the <url-token>.
    if (CodePoint.isEOF(inputStream.getNextCodePoint())) {
        return url;
    }

    // If the next input code point is a U+0022 QUOTATION MARK (")
    // or U+0027 APOSTROPHE (‘), then:
    if (inputStream.getNextCodePoint() === CodePoint.QUOTATION_MARK
            || inputStream.getNextCodePoint() === CodePoint.APOSTROPHE) {


        // Consume the next input code point, then consume a string token.
        inputStream.consumeNextCodePoint();
        returnString = consumeStringToken(inputStream);

        // If a <bad-string-token> was returned, consume the remnants of a bad url,
        // create a <bad-url-token>, and return it.
        if (returnString.type === Types.BAD_STRING) {
            return consumeBadUrl(inputStream);
        }

        // Set the <url-token>’s value to the returned <string-token>’s value.
        url.value = returnString.value;

        // Consume as much whitespace as possible.
        while (CodePoint.isWhitespace(inputStream.getNextCodePoint())) {
            inputStream.consumeNextCodePoint();
        }

        // If the next input code point is U+0029 RIGHT PARENTHESIS ()) or EOF,
        // consume it and return the <url-token>;
        if (inputStream.getNextCodePoint() === CodePoint.RIGHT_PAREN
                || CodePoint.isEOF(inputStream.getNextCodePoint())) {

            inputStream.consumeNextCodePoint();
            return url;
        }

        // otherwise, consume the remnants of a bad url,
        // create a <bad-url-token>, and return it.
        return consumeBadUrl(inputStream);
    }

    value = new SpecialString();

    // Repeatedly consume the next input code point from the stream
    for (;;) {
        inputStream.consumeNextCodePoint();

        if (inputStream.getCurrentCodePoint() === CodePoint.RIGHT_PAREN
                || CodePoint.isEOF(inputStream.getCurrentCodePoint())) {
            url.value = value.toString();
            return url;
        }

        if (CodePoint.isWhitespace(inputStream.getCurrentCodePoint())) {
            // Consume as much whitespace as possible.
            while (CodePoint.isWhitespace(inputStream.getNextCodePoint())) {
                inputStream.consumeNextCodePoint();
            }

            // If the next input code point is U+0029 RIGHT PARENTHESIS ())
            // or EOF, consume it and return the <url-token>;
            if (inputStream.getNextCodePoint() === CodePoint.RIGHT_PAREN
                    || CodePoint.isEOF(inputStream.getNextCodePoint())) {

                inputStream.consumeNextCodePoint();
                url.value = value.toString();
                return url;
            }

            // otherwise, consume the remnants of a bad url,
            // create a <bad-url-token>, and return it.
            return consumeBadUrl(inputStream);
        }

        if (inputStream.getCurrentCodePoint() === CodePoint.QUOTATION_MARK
                || inputStream.getCurrentCodePoint() === CodePoint.APOSTROPHE
                || inputStream.getCurrentCodePoint() === CodePoint.LEFT_PAREN
                || CodePoint.isNonPrintable(inputStream.getCurrentCodePoint())) {

            // This is a parse error.
            // Consume the remnants of a bad url,
            // create a <bad-url-token>,
            // and return it.
            return consumeBadUrl(inputStream);
        }

        if (inputStream.getCurrentCodePoint() === CodePoint.REVERSE_SOLIDUS) {
            // If the stream starts with a valid escape,
            // consume an escaped code point and append
            // the returned code point to the <url-token>'s value.
            if (areValidEscape(inputStream.getCurrentCodePoint(),
                               inputStream.getNextCodePoint())) {

                value.append(consumeEscapedCodePoint(inputStream));
            } else {
                // Otherwise, this is a parse error.
                // Consume the remnants of a bad url,
                // create a <bad-url-token>,
                // and return it.
                return consumeBadUrl(inputStream);
            }
        } else {
            // Append the current input code point to the <url-token>'s value.
            value.append(inputStream.getCurrentCodePoint());
        }
    }
};

exports.consumeUrlToken = consumeUrlToken;

// 4.3.7: Consume a unicode-range token
// ------------------------------------
consumeUnicodeRangeToken = function (inputStream) {
    var hex = new SpecialString(), i, j, startRange, endRange;

    // Consume as many hex digits as possible, but no more than 6.
    for (i = 0; i < 6 && CodePoint.isHexDigit(inputStream.getNextCodePoint()); i += 1) {
        hex.append(inputStream.getNextCodePoint());
        inputStream.consumeNextCodePoint();
    }

    // If less than 6 hex digits were consumed,
    // consume as many U+003F QUESTION MARK (?) code points as possible,
    // but no more than enough to make the total of hex digits and
    // U+003F QUESTION MARK (?) code points equal to 6.
    if (i < 6) {
        for (j = i; j < 6 && inputStream.getNextCodePoint() === CodePoint.QUESTION_MARK; j += 1) {
            hex.append(inputStream.getNextCodePoint());
            inputStream.consumeNextCodePoint();
        }

        // If any U+003F QUESTION MARK (?) code points were consumed, then:
        if (j > i) {
            hex = hex.toString();

            // Interpret the consumed code points as a hexadecimal number,
            // with the U+003F QUESTION MARK (?) code points replaced by
            // U+0030 DIGIT ZERO (0) code points.
            // This is the start of the range.
            startRange = parseInt(hex.replace(/\?/g, '0'), 16);

            // Interpret the consumed code points as a hexadecimal number again,
            // with the U+003F QUESTION MARK (?) code point replaced by
            // U+0046 LATIN CAPITAL LETTER F (F) code points.
            // This is the end of the range.
            endRange = parseInt(hex.replace(/\?/g, 'F'), 16);

            // Return a new <unicode-range-token> with the above start and end.
            return {
                type: Types.UNICODE_RANGE,
                start: startRange,
                end: endRange
            };
        }
    }

    // Otherwise, interpret the digits as a hexadecimal number.
    // This is the start of the range.
    startRange = parseInt(hex, 16);

    // If the next 2 input code point are U+002D HYPHEN-MINUS (-) followed by a
    // hex digit, then:
    if (inputStream.getNextCodePoint() === CodePoint.HYPHEN_MINUS
            && CodePoint.isDigit(inputStream.getNextCodePoint(2))) {

        hex = new SpecialString();

        // Consume the next input code point.
        inputStream.consumeNextCodePoint();

        // Consume as many hex digits as possible, but no more than 6.
        for (i = 0; i < 6 && CodePoint.isHexDigit(inputStream.getNextCodePoint()); i += 1) {
            hex.append(inputStream.getNextCodePoint());
            inputStream.consumeNextCodePoint();
        }

        // Interpret the digits as a hexadecimal number.
        // This is the end of the range.
        endRange = parseInt(hex, 16);
    } else {
        // Otherwise, the end of the range is the start of the range.
        endRange = startRange;
    }

    // Return the <unicode-range-token> with the above start and end.
    return {
        type: Types.UNICODE_RANGE,
        start: startRange,
        end: endRange
    };
};

exports.consumeUnicodeRangeToken = consumeUnicodeRangeToken;

// 4.3.8: Consume an escaped code point
// ------------------------------------
consumeEscapedCodePoint = function (inputStream) {
    var currentCodePoint, hex, nextCodePoint, i;

    hex = new SpecialString();

    // Consume the next input code point.
    inputStream.consumeNextCodePoint();
    currentCodePoint = inputStream.getCurrentCodePoint();

    if (CodePoint.isHexDigit(currentCodePoint)) {
        hex.append(currentCodePoint);

        // Consume as many hex digits as possible, but no more than 5.
        nextCodePoint = inputStream.getNextCodePoint();
        for (i = 5; i > 0 && CodePoint.isHexDigit(nextCodePoint); i -= 1) {
            hex.append(nextCodePoint);
            inputStream.consumeNextCodePoint();
            nextCodePoint = inputStream.getNextCodePoint();
        }

        // If the next input code point is whitespace, consume it as well.
        if (CodePoint.isWhitespace(nextCodePoint)) {
            inputStream.consumeNextCodePoint();
        }

        // Interpret the hex digits as a hexadecimal number.
        hex = parseInt(hex, 16);

        // If this number is zero, or is for a surrogate code point,
        // or is greater than the maximum allowed code point,
        // return U+FFFD REPLACEMENT CHARACTER.
        if (hex === CodePoint.NULL || CodePoint.isSurrogate(hex) || hex > CodePoint.MAX_VALUE) {
            return CodePoint.REPLACEMENT;
        }

        // Otherwise, return the code point with that value.
        return hex;
    }

    if (CodePoint.isEOF(currentCodePoint)) {
        return CodePoint.REPLACEMENT;
    }

    // Return the current input code point.
    return currentCodePoint;
};

exports.consumeEscapedCodePoint = consumeEscapedCodePoint;

// 4.3.9: Check if two code points are a valid escape
// --------------------------------------------------
areValidEscape = function (x, y) {
    // If the first code point is not U+005C REVERSE SOLIDUS (\), return false.
    if (x !== CodePoint.REVERSE_SOLIDUS) {
        return false;
    }

    // Otherwise, if the second code point is a newline, return false.
    if (CodePoint.isNewline(y)) {
        return false;
    }

    // Otherwise, return true.
    return true;
};

exports.areValidEscape = areValidEscape;

// 4.3.10: Check if three code points would start an identifier
// ------------------------------------------------------------
wouldStartIdentifier = function (x, y, z) {
    // Look at the first code point:
    if (x === CodePoint.HYPHEN_MINUS) {
        // If the second code point is a name-start code point or a
        // U+002D HYPHEN-MINUS, or the second and third code points are a
        // valid escape, return true.
        if (CodePoint.isNameStart(y)
                || y === CodePoint.HYPHEN_MINUS
                || areValidEscape(y, z)) {
            return true;
        }

        // Otherwise, return false.
        return false;
    }

    if (CodePoint.isNameStart(x)) {
        return true;
    }

    if (x === CodePoint.REVERSE_SOLIDUS) {
        // If the first and second code points are a valid escape, return true.
        if (areValidEscape(x, y)) {
            return true;
        }

        // Otherwise, return false.
        return false;
    }

    return false;
};

// 4.3.11: Check if three code points would start a number
// -------------------------------------------------------
wouldStartNumber = function (x, y, z) {
    // Look at the first code point:
    if (x === CodePoint.PLUS_SIGN || x === CodePoint.HYPHEN_MINUS) {
        // If the second code point is a digit, return true.
        if (CodePoint.isDigit(y)) {
            return true;
        }

        // Otherwise, if the second code point is a U+002E FULL STOP (.)
        // and the third code point is a digit, return true.
        if (y === CodePoint.FULL_STOP && CodePoint.isDigit(z)) {
            return true;
        }

        // Otherwise, return false.
        return false;
    }
    if (x === CodePoint.FULL_STOP) {
        // If the second code point is a digit, return true.
        if (CodePoint.isDigit(y)) {
            return true;
        }

        // Otherwise, return false.
        return false;
    }

    if (CodePoint.isDigit(x)) {
        return true;
    }

    return false;
};

exports.wouldStartNumber = wouldStartNumber;

// 4.3.12: Consume a name
// ----------------------
consumeName = function (inputStream) {
    var result, returnCodePoint;

    // Let result initially be an empty string.
    result = new SpecialString();

    // Repeatedly consume the next input code point from the stream:
    for (;;) {
        inputStream.consumeNextCodePoint();
        if (CodePoint.isName(inputStream.getCurrentCodePoint())) {

            // Append the code point to result.
            result.append(inputStream.getCurrentCodePoint());
        } else if (areValidEscape(inputStream.getCurrentCodePoint(),
                                  inputStream.getNextCodePoint())) {

            // Consume an escaped code point.
            returnCodePoint = consumeEscapedCodePoint(inputStream);

            // Append the returned code point to result.
            result.append(returnCodePoint);
        } else {
            // Reconsume the current input code point.
            inputStream.reconsumeCurrentCodePoint();

            // Return result.
            return result.toString();
        }
    }
};

exports.consumeName = consumeName;

// A helper function for consuming digits.
consumeDigits = function (inputStream) {
    var repr = new SpecialString(), nextCodePoint;

    // While the next input code point is a digit,
    // consume it and append it to repr.
    nextCodePoint = inputStream.getNextCodePoint();
    while (CodePoint.isDigit(nextCodePoint)) {
        inputStream.consumeNextCodePoint();
        repr.append(nextCodePoint);
        nextCodePoint = inputStream.getNextCodePoint();
    }

    return repr.toString();
};

exports.consumeDigits = consumeDigits;

// 4.3.13: Consume a number
// ------------------------
consumeNumber = function (inputStream) {
    var repr, type, nextCodePoint, nextCodePoint2, nextCodePoint3, value;

    // Initially set repr to the empty string and type to "integer".
    repr = new SpecialString();
    type = 'integer';

    // If the next input code point is U+002B PLUS SIGN (+)
    // or U+002D HYPHEN-MINUS (-),
    // consume it and append it to repr.
    nextCodePoint = inputStream.getNextCodePoint();
    if (nextCodePoint === CodePoint.PLUS_SIGN
            || nextCodePoint === CodePoint.HYPHEN_MINUS) {

        inputStream.consumeNextCodePoint();
        repr.append(nextCodePoint);
    }

    repr.append(consumeDigits(inputStream));

    // If the next 2 input code points are U+002E FULL STOP (.)
    // followed by a digit, then:
    nextCodePoint = inputStream.getNextCodePoint();
    nextCodePoint2 = inputStream.getNextCodePoint(2);
    if (nextCodePoint === CodePoint.FULL_STOP
            && CodePoint.isDigit(nextCodePoint2)) {

        // Consume them.
        inputStream.consumeNextCodePoint(2);

        // Append them to repr.
        repr.append(nextCodePoint, nextCodePoint2);

        // Set type to "number".
        type = 'number';

        repr.append(consumeDigits(inputStream));
    }

    // If the next 2 or 3 input code points are
    // U+0045 LATIN CAPITAL LETTER E (E) or U+0065 LATIN SMALL LETTER E (e),
    // optionally followed by U+002D HYPHEN-MINUS (-) or U+002B PLUS SIGN (+),
    // followed by a digit, then:
    nextCodePoint = inputStream.getNextCodePoint();
    if (nextCodePoint === CodePoint.E || nextCodePoint === CodePoint.e) {

        nextCodePoint2 = inputStream.getNextCodePoint(2);
        nextCodePoint3 = inputStream.getNextCodePoint(3);
        if ((nextCodePoint2 === CodePoint.HYPHEN_MINUS
                || nextCodePoint2 === CodePoint.PLUS_SIGN)
                && CodePoint.isDigit(nextCodePoint3)) {

            // Consume them.
            inputStream.consumeNextCodePoint(3);

            // Append them to repr.
            repr.append(nextCodePoint, nextCodePoint2, nextCodePoint3);

            // Set type to "number".
            type = 'number';

            repr.append(consumeDigits(inputStream));
        } else if (CodePoint.isDigit(nextCodePoint2)) {

            // Consume them.
            inputStream.consumeNextCodePoint(2);

            // Append them to repr.
            repr.append(nextCodePoint, nextCodePoint2);

            // Set type to "number".
            type = 'number';

            repr.append(consumeDigits(inputStream));
        }
    }

    repr = repr.toString();

    // Convert repr to a number, and set the value to the returned value.
    value = Number(repr);

    // Return a 3-tuple of repr, value, and type.
    return {
        repr: repr,
        value: value,
        type: type
    };
};

exports.consumeNumber = consumeNumber;

// 4.3.15: Consume the remnants of a bad url
// -----------------------------------------
consumeBadUrl = function (inputStream) {
    // Repeatedly consume the next input code point from the stream:
    for (;;) {
        inputStream.consumeNextCodePoint();

        if (inputStream.getCurrentCodePoint() === CodePoint.RIGHT_PAREN
                || CodePoint.isEOF(inputStream.getCurrentCodePoint())) {

            break;
        }

        if (areValidEscape(inputStream.getCurrentCodePoint(),
                           inputStream.getNextCodePoint())) {

            consumeEscapedCodePoint(inputStream);
        }
    }

    return {
        type: Types.BAD_URL
    };
};

exports.consumeBadUrl = consumeBadUrl;

// 4.3.1: Consume a token
// ----------------------
consumeToken = (function () {
    var codePoint = {}, i;

    // whitespace
    function consumeWhitespaceToken(inputStream) {
        var value = String.fromCharCode(inputStream.getCurrentCodePoint());

        // Consume as much whitespace as possible.
        while (CodePoint.isWhitespace(inputStream.getNextCodePoint())) {
            value += String.fromCharCode(inputStream.getNextCodePoint());
            inputStream.consumeNextCodePoint();
        }

        // Return a <whitespace-token>.
        return {
            type: Types.WHITESPACE,
            value: value
        };
    }

    codePoint[CodePoint.LINE_FEED]
        = codePoint[CodePoint.TAB]
        = codePoint[CodePoint.SPACE]
        = consumeWhitespaceToken;

    // U+0022 QUOTATION MARK (")
    codePoint[CodePoint.QUOTATION_MARK] = consumeStringToken;

    // U+0023 NUMBER SIGN (#)
    codePoint[CodePoint.NUMBER_SIGN] = function (inputStream) {
        var hash;

        // If the next input code point is a name code point or
        // the next two input code points are a valid escape, then:
        if (CodePoint.isName(inputStream.getNextCodePoint())
                || areValidEscape(inputStream.getNextCodePoint(),
                                  inputStream.getNextCodePoint(2))) {

            // Create a <hash-token>.
            hash = {
                type: Types.HASH
            };

            // If the next 3 input code points would start an identifier,
            // set the <hash-token>'s type flag to "id".
            if (wouldStartIdentifier(inputStream.getNextCodePoint(),
                                     inputStream.getNextCodePoint(2),
                                     inputStream.getNextCodePoint(3))) {
                hash.typeFlag = 'id';
            } else {
                // The type flag defaults to "unrestricted" if not otherwise set.
                hash.typeFlag = 'unrestricted';
            }

            // Consume a name,
            // and set the <hash-token>'s value to the returned string.
            hash.value = consumeName(inputStream);

            // Return the <hash-token>.
            return hash;
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '#'
        };
    };

    // U+0024 DOLLAR SIGN ($)
    codePoint[CodePoint.DOLLAR_SIGN] = function (inputStream) {
        // If the next input code point is U+003D EQUALS SIGN (=),
        // consume it and return a <suffix-match-token>.
        if (inputStream.getNextCodePoint() === CodePoint.EQUALS_SIGN) {
            inputStream.consumeNextCodePoint();
            return {
                type: Types.SUFFIX_MATCH,
                value: '$='
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '$'
        };
    };

    // U+0027 APOSTROPHE (')
    codePoint[CodePoint.APOSTROPHE] = consumeStringToken;

    // U+0028 LEFT PARENTHESIS (()
    codePoint[CodePoint.LEFT_PAREN] = function () {
        return {
            type: Types.LEFT_PAREN
        };
    };

    // U+0029 RIGHT PARENTHESIS ())
    codePoint[CodePoint.RIGHT_PAREN] = function () {
        return {
            type: Types.RIGHT_PAREN,
            value: ')'
        };
    };

    // U+002A ASTERISK (*)
    codePoint[CodePoint.ASTERISK] = function (inputStream) {
        // If the next input code point is U+003D EQUALS SIGN (=),
        // consume it and return a <substring-match-token>.
        if (inputStream.getNextCodePoint() === CodePoint.EQUALS_SIGN) {
            inputStream.consumeNextCodePoint();
            return {
                type: Types.SUBSTRING_MATCH,
                value: '*='
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '*'
        };
    };

    // U+002B PLUS SIGN (+)
    codePoint[CodePoint.PLUS_SIGN] = function (inputStream) {
        // If the input stream starts with a number,
        // reconsume the current input code point,
        // consume a numeric token and return it.
        if (wouldStartNumber(inputStream.getCurrentCodePoint(),
                             inputStream.getNextCodePoint(),
                             inputStream.getNextCodePoint(2))) {

            inputStream.reconsumeCurrentCodePoint();
            return consumeNumericToken(inputStream);
        }

        return {
            type: Types.DELIM,
            value: '+'
        };
    };

    // U+002C COMMA (,)
    codePoint[CodePoint.COMMA] = function () {
        return {
            type: Types.COMMA,
            value: ','
        };
    };

    // U+002D HYPHEN-MINUS (-)
    codePoint[CodePoint.HYPHEN_MINUS] = function (inputStream) {
        // If the input stream starts with a number,
        // reconsume the current input code point,
        // consume a numeric token, and return it.
        if (wouldStartNumber(inputStream.getCurrentCodePoint(),
                             inputStream.getNextCodePoint(),
                             inputStream.getNextCodePoint(2))) {

            inputStream.reconsumeCurrentCodePoint();
            return consumeNumericToken(inputStream);
        }

        // Otherwise, if the next 2 input code points are
        // U+002D HYPHEN-MINUS U+003E GREATER-THAN SIGN (->),
        // consume them and return a <CDC-token>.
        if (inputStream.getNextCodePoint() === CodePoint.HYPHEN_MINUS
                && inputStream.getNextCodePoint(2) === CodePoint.GREATER_THAN) {

            inputStream.consumeNextCodePoint(2);
            return {
                type: Types.CDC,
                value: '-->'
            };
        }

        // Otherwise, if the input stream starts with an identifier,
        // reconsume the current input code point,
        // consume an ident-like token, and return it.
        if (wouldStartIdentifier(inputStream.getCurrentCodePoint(),
                                 inputStream.getNextCodePoint(),
                                 inputStream.getNextCodePoint(2))) {

            inputStream.reconsumeCurrentCodePoint();
            return consumeIdentLikeToken(inputStream);
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '-'
        };
    };

    // U+002E FULL STOP (.)
    codePoint[CodePoint.FULL_STOP] = function (inputStream) {
        // If the input stream starts with a number,
        // reconsume the current input code point,
        // consume a numeric token, and return it.
        if (wouldStartNumber(inputStream.getCurrentCodePoint(),
                             inputStream.getNextCodePoint(),
                             inputStream.getNextCodePoint(2))) {

            inputStream.reconsumeCurrentCodePoint();
            return consumeNumericToken(inputStream);
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '.'
        };
    };

    // U+003A COLON (:)
    codePoint[CodePoint.COLON] = function () {
        return {
            type: Types.COLON,
            value: ':'
        };
    };

    // U+003B SEMICOLON (;)
    codePoint[CodePoint.SEMICOLON] = function () {
        return {
            type: Types.SEMICOLON,
            value: ';'
        };
    };

    // U+003C LESS-THAN SIGN (<)
    codePoint[CodePoint.LESS_THAN_SIGN] = function (inputStream) {
        // If the next 3 input code points are
        // U+0021 EXCLAMATION MARK U+002D HYPHEN-MINUS U+002D HYPHEN-MINUS (!--),
        // consume them and return a <CDO-token>.
        if (inputStream.getNextCodePoint() === CodePoint.EXCLAMATION_MARK
                && inputStream.getNextCodePoint(2) === CodePoint.HYPHEN_MINUS
                && inputStream.getNextCodePoint(3) === CodePoint.HYPHEN_MINUS) {

            inputStream.consumeNextCodePoint(3);
            return {
                type: Types.CDO,
                value: '<!--'
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '<'
        };
    };

    // U+0040 COMMERCIAL AT (@)
    codePoint[CodePoint.COMMERCIAL_AT] = function (inputStream) {
        var returnValue;

        // If the next 3 input code points would start an identifier,
        // consume a name,
        // create an <at-keyword-token> with its value
        // set to the returned value, and return it.
        if (wouldStartIdentifier(inputStream.getNextCodePoint(),
                                 inputStream.getNextCodePoint(2),
                                 inputStream.getNextCodePoint(3))) {

            returnValue = consumeName(inputStream);
            return {
                type: Types.AT_KEYWORD,
                value: returnValue
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '@'
        };
    };

    // U+005B LEFT SQUARE BRACKET ([)
    codePoint[CodePoint.LEFT_BRACKET] = function () {
        return {
            type: Types.LEFT_BRACKET
        };
    };

    // U+005C REVERSE SOLIDUS (\)
    codePoint[CodePoint.REVERSE_SOLIDUS] = function (inputStream) {
        // If the input stream starts with a valid escape,
        // reconsume the current input code point,
        // consume an ident-like token,
        // and return it.
        if (areValidEscape(inputStream.getCurrentCodePoint(),
                           inputStream.getNextCodePoint())) {

            inputStream.reconsumeCurrentCodePoint();
            return consumeIdentLikeToken(inputStream);
        }

        // Otherwise, this is a parse error.
        // Return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '\\'
        };
    };

    // U+005D RIGHT SQUARE BRACKET (])
    codePoint[CodePoint.RIGHT_BRACKET] = function () {
        return {
            type: Types.RIGHT_BRACKET,
            value: ']'
        };
    };

    // U+005E CIRCUMFLEX ACCENT (^)
    codePoint[CodePoint.CIRCUMFLEX_ACCENT] = function (inputStream) {
        // If the next input code point is U+003D EQUALS SIGN (=),
        // consume it and return a <prefix-match-token>.
        if (inputStream.getNextCodePoint() === CodePoint.EQUALS_SIGN) {
            inputStream.consumeNextCodePoint();
            return {
                type: Types.PREFIX_MATCH,
                value: '^='
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '^'
        };
    };

    // U+007B LEFT CURLY BRACKET ({)
    codePoint[CodePoint.LEFT_BRACE] = function () {
        return {
            type: Types.LEFT_BRACE
        };
    };

    // U+007D RIGHT CURLY BRACKET (})
    codePoint[CodePoint.RIGHT_BRACE] = function () {
        return {
            type: Types.RIGHT_BRACE,
            value: '}'
        };
    };

    // digit
    function consumeDigit(inputStream) {
        // Reconsume the current input code point,
        // consume a numeric token, and return it.
        inputStream.reconsumeCurrentCodePoint();
        return consumeNumericToken(inputStream);
    }

    // 0-9
    for (i = 48; i < 58; i += 1) {
        codePoint[i] = consumeDigit;
    }

    // name-start code point
    function consumeNameStart(inputStream) {
        // Reconsume the current input code point,
        // consume an ident-like token, and return it.
        inputStream.reconsumeCurrentCodePoint();
        return consumeIdentLikeToken(inputStream);
    }

    codePoint[CodePoint.LOW_LINE] = consumeNameStart;

    for (i = 65; i < 91; i += 1) {
        // A-Z
        codePoint[i]
            // a-z
            = codePoint[i + 32]
            = consumeNameStart;
    }

    // U+0055 LATIN CAPITAL LETTER U (U)
    // U+0075 LATIN SMALL LETTER U (u)
    codePoint[CodePoint.U] = codePoint[CodePoint.u] = function (inputStream) {

        // If the next 2 input code points are U+002B PLUS SIGN (+)
        // followed by a hex digit or U+003F QUESTION MARK (?),
        // consume the next input code point.
        if (inputStream.getNextCodePoint() === CodePoint.PLUS_SIGN
                && (inputStream.getNextCodePoint(2) === CodePoint.QUESTION_MARK
                        || CodePoint.isHexDigit(inputStream.getNextCodePoint(2)))) {

            inputStream.consumeNextCodePoint();

            // Consume a unicode-range token and return it.
            return consumeUnicodeRangeToken(inputStream);
        }

        // Otherwise, reconsume the current input code point,
        // consume an ident-like token, and return it.
        inputStream.reconsumeCurrentCodePoint();
        return consumeIdentLikeToken(inputStream);
    };

    // U+007C VERTICAL LINE (|)
    codePoint[CodePoint.VERTICAL_LINE] = function (inputStream) {
        // If the next input code point is U+003D EQUALS SIGN (=),
        // consume it and return a <dash-match-token>.
        if (inputStream.getNextCodePoint() === CodePoint.EQUALS_SIGN) {
            inputStream.consumeNextCodePoint();
            return {
                type: Types.DASH_MATCH,
                value: '|='
            };
        }

        if (inputStream.getNextCodePoint() === CodePoint.VERTICAL_LINE) {
            inputStream.consumeNextCodePoint();
            return {
                type: Types.COLUMN,
                value: '||'
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '|'
        };
    };

    // U+007E TILDE (~)
    codePoint[CodePoint.TILDE] = function (inputStream) {
        // If the next input code point is U+003D EQUALS SIGN (=),
        // consume it and return an <include-match-token>.
        if (inputStream.getNextCodePoint() === CodePoint.EQUALS_SIGN) {
            inputStream.consumeNextCodePoint();
            return {
                type: Types.INCLUDE_MATCH,
                value: '~='
            };
        }

        // Otherwise, return a <delim-token> with its value
        // set to the current input code point.
        return {
            type: Types.DELIM,
            value: '~'
        };
    };

    // EOF
    codePoint[CodePoint.EOF] = function () {
        return {
            type: Types.EOF
        };
    };

    return function (inputStream) {
        var consumeMethod;

        // Consume comments.
        consumeComments(inputStream);

        // Consume the next input code point.
        inputStream.consumeNextCodePoint();

        consumeMethod = codePoint[inputStream.getCurrentCodePoint()];

        if (consumeMethod !== undefined) {
            return consumeMethod(inputStream);
        }

        if (inputStream.getCurrentCodePoint() >= CodePoint.CONTROL) {
            return consumeNameStart(inputStream);
        }

        // Return a <delim-token> with its value set to the
        // current input code point.
        return {
            type: Types.DELIM,
            value: String.fromCharCode(inputStream.getCurrentCodePoint())
        };
    };
}());

exports.consumeToken = consumeToken;
