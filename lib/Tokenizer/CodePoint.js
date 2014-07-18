'use strict';

// A conceptual code point representing the end of the input stream.
// Whenever the input stream is empty, the next input code point is always an EOF code point.
var isEOF = isNaN;

function isBetween(codePoint, start, end) {
    return codePoint >= start && codePoint <= end;
}

// A code point between U+0030 DIGIT ZERO (0) and U+0039 DIGIT NINE (9).
function isDigit(codePoint) {
    return isBetween(codePoint, 0x30, 0x39);
}

// A digit, or a code point between U+0041 LATIN CAPITAL LETTER A (A) and U+0046 LATIN CAPITAL LETTER F (F),
// or a code point between U+0061 LATIN SMALL LETTER A (a) and U+0066 LATIN SMALL LETTER F (f).
function isHexDigit(codePoint) {
    return isDigit(codePoint) || isBetween(codePoint, 0x41, 0x46) || isBetween(codePoint, 0x61, 0x66);
}

// A code point between U+0041 LATIN CAPITAL LETTER A (A) and U+005A LATIN CAPITAL LETTER Z (Z).
function isUpperCaseLetter(codePoint) {
    return isBetween(codePoint, 0x41, 0x5a);
}

// A code point between U+0061 LATIN SMALL LETTER A (a) and U+007A LATIN SMALL LETTER Z (z).
function isLowerCaseLetter(codePoint) {
    return isBetween(codePoint, 0x61, 0x7a);
}

// An uppercase letter or a lowercase letter.
function isLetter(codePoint) {
    return isUpperCaseLetter(codePoint) || isLowerCaseLetter(codePoint);
}

// A code point with a value equal to or greater than U+0080 <control>.
function isNonAscii(codePoint) {
    return codePoint >= 0x80;
}

// A letter, a non-ASCII code point, or U+005F LOW LINE (_).
function isNameStart(codePoint) {
    return isLetter(codePoint) || isNonAscii(codePoint) || codePoint === 0x5f;
}

// A name-start code point, A digit, or U+002D HYPHEN-MINUS (-).
function isName(codePoint) {
    return isNameStart(codePoint) || isDigit(codePoint) || codePoint === 0x2d;
}

// A code point between U+0000 NULL and U+0008 BACKSPACE, or U+000B LINE TABULATION,
// or a code point between U+000E SHIFT OUT and U+001F INFORMATION SEPARATOR ONE, or U+007F DELETE.
function isNonPrintable(codePoint) {
    return isBetween(codePoint, 0, 0x8) || codePoint === 0xB || isBetween(codePoint, 0xe, 0x1f) || codePoint === 0x7f;
}

// U+000A LINE FEED.
// Note that U+000D CARRIAGE RETURN and U+000C FORM FEED are not included in this definition,
// as they are converted to U+000A LINE FEED during preprocessing.
function isNewline(codePoint) {
    return codePoint === 0xa;
}

// A newline, U+0009 CHARACTER TABULATION, or U+0020 SPACE.
function isWhitespace(codePoint) {
    return isNewline(codePoint) || codePoint === 9 || codePoint === 0x20;
}

// A code point between U+D800 and U+DFFF inclusive.
function isSurrogate(codePoint) {
    return isBetween(codePoint, 0xd800, 0xdfff);
}

module.exports = {
    NULL: 0,
    TAB: 9,
    LINE_FEED: 0xa,
    FORM_FEED: 0xc,
    CARRIAGE_RETURN: 0xd,
    SPACE: 0x20,
    EXCLAMATION_MARK: 0x21,
    QUOTATION_MARK: 0x22,
    NUMBER_SIGN: 0x23,
    DOLLAR_SIGN: 0x24,
    PERCENTAGE_SIGN: 0x25,
    APOSTROPHE: 0x27,
    LEFT_PAREN: 0x28,
    RIGHT_PAREN: 0x29,
    ASTERISK: 0x2a,
    PLUS_SIGN: 0x2b,
    COMMA: 0x2c,
    HYPHEN_MINUS: 0x2d,
    FULL_STOP: 0x2e,
    SOLIDUS: 0x2f,
    COLON: 0x3a,
    SEMICOLON: 0x3b,
    LESS_THAN_SIGN: 0x3c,
    EQUALS_SIGN: 0x3d,
    GREATER_THAN: 0x3e,
    QUESTION_MARK: 0x3f,
    COMMERCIAL_AT: 0x40,
    e: 0x45,
    u: 0x55,
    EOF: NaN,
    LEFT_BRACKET: 0x5b,
    REVERSE_SOLIDUS: 0x5c,
    RIGHT_BRACKET: 0x5d,
    CIRCUMFLEX_ACCENT: 0x5e,
    LOW_LINE: 0x5f,
    E: 0x65,
    U: 0x75,
    LEFT_BRACE: 0x7b,
    VERTICAL_LINE: 0x7c,
    RIGHT_BRACE: 0x7d,
    TILDE: 0x7e,
    CONTROL: 0x80,
    REPLACEMENT: 0xfffd,

    // The greatest code point defined by Unicode: U+10FFFF.
    MAX_VALUE: 0x10ffff,

    isEOF: isEOF,
    isName: isName,
    isDigit: isDigit,
    isNewline: isNewline,
    isNonAscii: isNonAscii,
    isHexDigit: isHexDigit,
    isSurrogate: isSurrogate,
    isNameStart: isNameStart,
    isWhitespace: isWhitespace,
    isNonPrintable: isNonPrintable
};
