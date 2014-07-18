!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.cssprima=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var API,
    Types = _dereq_('./Types.js'),
    Tokenizer = _dereq_('./Tokenizer/Tokenizer.js');

API = _dereq_('./Parser/EntryPoints.js');

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

},{"./Parser/EntryPoints.js":3,"./Tokenizer/Tokenizer.js":8,"./Types.js":9}],2:[function(_dereq_,module,exports){
'use strict';

var Types = _dereq_('../Types.js'),
    Tokenizer = _dereq_('../Tokenizer/Tokenizer.js'),

    consumeRules,
    consumeAtRule,
    consumeQualifiedRule,
    consumeDeclarations,
    consumeDeclaration,
    consumeComponentValue,
    consumeSimpleBlock,
    consumeFunction;

// 5.4: Parser Algorithms
// ----------------------

// 5.4.1: Consume a list of rules
// ------------------------------
consumeRules = function (tokenizer, toplevel) {
    var rules, rule, error;

    error = {
        type: Types.ERROR,
        value: 'invalid'
    };

    // Create an initially empty list of rules.
    rules = [];
    for (;;) {
        // Repeatedly consume the next input token:
        tokenizer.consumeNextToken();

        switch (tokenizer.getCurrentToken().type) {
        case Types.WHITESPACE:
            // Do nothing.
            break;
        case Types.EOF:
            // Return the list of rules.
            return rules;
        case Types.CDO:
        case Types.CDC:
            // If the top-level flag is set, do nothing.
            if (!toplevel) {
                // Otherwise, reconsume the current input token.
                tokenizer.reconsumeCurrentToken();

                // Consume a qualified rule.
                rule = consumeQualifiedRule(tokenizer);

                // If anything is returned, append it to the list of rules.
                if (rule) {
                    rules.push(rule);
                } else {
                    rules.push(error);
                }
            }
            break;
        case Types.AT_KEYWORD:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume an at-rule.
            rule = consumeAtRule(tokenizer);

            // If anything is returned, append it to the list of rules
            if (rule) {
                rules.push(rule);
            } else {
                rules.push(error);
            }
            break;
        default:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume a qualified rule.
            rule = consumeQualifiedRule(tokenizer);

            // If anything is returned, append it to the list of rules.
            if (rule) {
                rules.push(rule);
            } else {
                rules.push(error);
            }
            break;
        }
    }
};

exports.consumeRules = consumeRules;

// 5.4.2: Consume an at-rule
// -------------------------
consumeAtRule = function (tokenizer) {
    var atRule, returnValue;

    // Consume the next input token.
    tokenizer.consumeNextToken();

    // Create a new at-rule with its name set to the value of the
    // current input token, its prelude initially set to an empty list,
    // and its value initially set to nothing.
    atRule = {
        type: Types.AT_RULE,
        name: tokenizer.getCurrentToken().value,
        prelude: [],
        value: null
    };

    for (;;) {
        // Repeatedly consume the next input token:
        tokenizer.consumeNextToken();

        switch (tokenizer.getCurrentToken().type) {
        case Types.SEMICOLON:
        case Types.EOF:
            // Return the at-rule.
            return atRule;
        case Types.LEFT_BRACE:
            // Consume a simple block and assign it to the at-rule’s block.
            atRule.block = consumeSimpleBlock(tokenizer);

            // Return the at-rule.
            return atRule;
        default:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume a component value.
            returnValue = consumeComponentValue(tokenizer);

            // Append the returned value to the at-rule’s prelude.
            atRule.prelude.push(returnValue);
        }
    }
};

exports.consumeAtRule = consumeAtRule;

// 5.4.3: Consume a qualified rule
// -------------------------------
consumeQualifiedRule = function (tokenizer) {
    var qualifiedRule, returnValue;

    // Create a new qualified rule with its prelude initially set to
    // an empty list, and its value initially set to nothing.
    qualifiedRule = {
        type: Types.QUALIFIED_RULE,
        prelude: [],
        value: null
    };

    for (;;) {
        // Repeatedly consume the next input token:
        tokenizer.consumeNextToken();

        switch (tokenizer.getCurrentToken().type) {
        case Types.EOF:
            // This is a parse error. Return nothing.
            return null;
        case Types.LEFT_BRACE:
            // Consume a simple block and assign
            // it to the qualified rule’s block.
            qualifiedRule.block = consumeSimpleBlock(tokenizer);

            // Return the qualified rule.
            return qualifiedRule;
        default:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume a component value.
            returnValue = consumeComponentValue(tokenizer);

            // Append the returned value to the qualified rule’s prelude.
            qualifiedRule.prelude.push(returnValue);
        }
    }
};

exports.consumeQualifiedRule = consumeQualifiedRule;

// 5.4.4: Consume a list of declarations
// -------------------------------------
consumeDeclarations = function (tokenizer) {
    var declarations, temporaryList, returnValue;

    // Create an initially empty list of declarations.
    declarations = [];

    // Repeatedly consume the next input token:
    for (;;) {
        tokenizer.consumeNextToken();

        switch (tokenizer.getCurrentToken().type) {
        case Types.WHITESPACE:
        case Types.SEMICOLON:
            // Do nothing.
            break;
        case Types.EOF:
            // Return the list of declarations.
            return declarations;
        case Types.AT_KEYWORD:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume an at-rule.
            returnValue = consumeAtRule(tokenizer);

            // Append the returned rule to the list of declarations.
            declarations.push(returnValue);
            break;
        case Types.IDENT:
            // Initialize a temporary list initially filled with the current input token.
            temporaryList = [tokenizer.getCurrentToken()];

            // As long as the next input token is anything other than a <semicolon-token>
            // or <EOF-token>, consume a component value and append it to the
            // temporary list.
            while (tokenizer.getNextToken().type !== Types.SEMICOLON
                       && tokenizer.getNextToken().type !== Types.EOF) {

                temporaryList.push(consumeComponentValue(tokenizer));
            }

            // Consume a declaration from the temporary list.
            returnValue = consumeDeclaration(new Tokenizer(temporaryList));

            // If anything was returned, append it to the list of declarations.
            if (returnValue) {
                declarations.push(returnValue);
            } else {
                declarations.push({
                    type: Types.ERROR,
                    value: 'invalid'
                });
            }
            break;
        default:
            // This is a parse error.
            declarations.push({
                type: Types.ERROR,
                value: 'invalid'
            });

            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // As long as the next input token is anything other than a
            // <semicolon-token> or <EOF-token>, consume a component value
            // and throw away the returned value.
            while (tokenizer.getNextToken().type !== Types.SEMICOLON
                    && tokenizer.getNextToken().type !== Types.EOF) {

                consumeComponentValue(tokenizer);
            }
        }
    }
};

exports.consumeDeclarations = consumeDeclarations;

// 5.4.5: Consume a declaration
// ----------------------------
consumeDeclaration = function (tokenizer) {
    var declaration, firstNonWhitespaceToken, secondNonWhitespaceToken, i, j;

    // Consume the next input token.
    tokenizer.consumeNextToken();

    // Create a new declaration with its name set to the value
    // of the current input token and its value initially set to the empty list.
    declaration = {
        type: Types.DECLARATION,
        name: tokenizer.getCurrentToken().value,
        value: []
    };

    // While the next input token is a <whitespace-token>,
    // consume the next input token.
    while (tokenizer.getNextToken().type === Types.WHITESPACE) {
        tokenizer.consumeNextToken();
    }

    // If the next input token is anything other than a <colon-token>,
    // this is a parse error.
    if (tokenizer.getNextToken().type !== Types.COLON) {
        // Return nothing.
        return null;
    }

    // Otherwise, consume the next input token.
    tokenizer.consumeNextToken();

    // As long as the next input token is anything other than an <EOF-token>,
    // consume a component value and append it to the declaration’s value.
    while (tokenizer.getNextToken().type !== Types.EOF) {
        declaration.value.push(consumeComponentValue(tokenizer));
    }

    // If the last two non-<whitespace-token>s in the declaration’s value are a
    // <delim-token> with the value "!" followed by an <ident-token> with a
    // value that is an ASCII case-insensitive match for "important", remove
    // them from the declaration’s value and set the declaration’s important
    // flag to true.

    for (j = declaration.value.length - 1; j >= 0; j -= 1) {
        if (declaration.value[j].type === Types.DELIM
                && declaration.value[j].value === '!') {

            firstNonWhitespaceToken = declaration.value[j];
            break;
        }
    }

    for (i = j + 1; i < declaration.value.length; i += 1) {
        if (declaration.value[i].type === Types.IDENT
                && declaration.value[i].value.toLowerCase() === 'important') {

            secondNonWhitespaceToken = declaration.value[i];
            break;
        }
    }

    if (firstNonWhitespaceToken) {
        if (secondNonWhitespaceToken) {
            declaration.important = true;
            declaration.value.splice(i, 1);
            declaration.value.splice(j, 1);
        } else {
            return {
                type: Types.ERROR,
                value: 'invalid'
            };
        }
    }

    // Return the declaration.
    return declaration;
};

exports.consumeDeclaration = consumeDeclaration;

// 5.4.6: Consume a component value
// --------------------------------
consumeComponentValue = function (tokenizer) {
    // Consume the next input token.
    tokenizer.consumeNextToken();

    switch (tokenizer.getCurrentToken().type) {
    case Types.LEFT_BRACE:
    case Types.LEFT_BRACKET:
    case Types.LEFT_PAREN:
        // If the current input token is a <{-token>, <[-token>, or <(-token>,
        // consume a simple block and return it.
        return consumeSimpleBlock(tokenizer);
    case Types.FUNCTION:
        // Otherwise, if the current input token is a <function-token>,
        // consume a function and return it.
        return consumeFunction(tokenizer);
    case Types.RIGHT_BRACE:
    case Types.RIGHT_BRACKET:
    case Types.RIGHT_PAREN:
        return {
            type: Types.ERROR,
            value: tokenizer.getCurrentToken().value
        };
    }

    // Otherwise, return the current input token.
    return tokenizer.getCurrentToken();
};

exports.consumeComponentValue = consumeComponentValue;

// 5.4.7: Consume a simple block
// -----------------------------
consumeSimpleBlock = function (tokenizer) {
    var mirrorVariant, endingToken, simpleBlock;

    mirrorVariant = {};
    mirrorVariant[Types.LEFT_BRACE] = Types.RIGHT_BRACE;
    mirrorVariant[Types.LEFT_PAREN] = Types.RIGHT_PAREN;
    mirrorVariant[Types.LEFT_BRACKET] = Types.RIGHT_BRACKET;

    // The ending token is the mirror variant of the current input token.
    // (E.g. if it was called with <[-token>, the ending token is <]-token>.)
    endingToken = mirrorVariant[tokenizer.getCurrentToken().type];

    // Create a simple block with its associated token set to the
    // current input token and with a value with is initially an empty list.
    simpleBlock = {
        type: Types.SIMPLE_BLOCK,
        associatedToken: tokenizer.getCurrentToken(),
        value: []
    };

    for (;;) {
        // Repeatedly consume the next input token and process it as follows:
        tokenizer.consumeNextToken();

        switch (tokenizer.getCurrentToken().type) {
        case Types.EOF:
        case endingToken:
            return simpleBlock;
        default:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume a component value and append it
            // to the value of the block.
            simpleBlock.value.push(consumeComponentValue(tokenizer));
        }
    }
};

exports.consumeSimpleBlock = consumeSimpleBlock;

// 5.4.8: Consume a function
// -------------------------
consumeFunction = function (tokenizer) {
    var phunction;

    // Create a function with a name equal to the value of the
    // current input token, and with a value which is initially an empty list.
    phunction = {
        type: 'Function',
        name: tokenizer.getCurrentToken().value,
        value: []
    };

    for (;;) {
        // Repeatedly consume the next input token and process it as follows:
        tokenizer.consumeNextToken();

        switch (tokenizer.getCurrentToken().type) {
        case Types.EOF:
        case Types.RIGHT_PAREN:
            // Return the function.
            return phunction;
        default:
            // Reconsume the current input token.
            tokenizer.reconsumeCurrentToken();

            // Consume a component value and append the returned value
            // to the function’s value.
            phunction.value.push(consumeComponentValue(tokenizer));
        }
    }
};

exports.consumeFunction = consumeFunction;

},{"../Tokenizer/Tokenizer.js":8,"../Types.js":9}],3:[function(_dereq_,module,exports){
'use strict';

var Types = _dereq_('../Types.js'),
    Algorithms = _dereq_('./Algorithms.js'),
    Tokenizer = _dereq_('../Tokenizer/Tokenizer.js');

// 5.3: Parser Entry Points
// ------------------------

// 5.3.1: Parse a stylesheet
// -------------------------
exports.parseStylesheet = function (input) {
    var tokenizer, stylesheet, toplevel, returnValue;

    tokenizer = new Tokenizer(input);

    // Create a new stylesheet.
    stylesheet = {
        type: Types.STYLESHEET
    };

    // Consume a list of rules from the stream of tokens,
    // with the top-level flag set.
    toplevel = true;
    returnValue = Algorithms.consumeRules(tokenizer, toplevel);

    // Assign the returned value to the stylesheet’s value.
    stylesheet.value = returnValue;

    // Return the stylesheet.
    return stylesheet;
};

// 5.3.2: Parse a list of rules
// ----------------------------
exports.parseRules = function (input) {
    var tokenizer, returnList;

    tokenizer = new Tokenizer(input);

    // Consume a list of rules from the stream of tokens,
    // with the top-level flag unset.

    returnList = Algorithms.consumeRules(tokenizer, false);

    // Return the returned list.
    return returnList;
};

// 5.3.3: Parse a rule
// -------------------
exports.parseRule = function (input) {
    var tokenizer, rule;

    tokenizer = new Tokenizer(input);

    // While the next input token is a <whitespace-token>,
    // consume the next input token.
    while (tokenizer.getNextToken().type === Types.WHITESPACE) {
        tokenizer.consumeNextToken();
    }

    switch (tokenizer.getNextToken().type) {
    case Types.EOF:
        // If the next input token is an <EOF-token>, return a syntax error.
        return {
            type: Types.ERROR,
            value: 'empty'
        };
    case Types.AT_KEYWORD:
        // Otherwise, if the next input token is an <at-keyword-token>,
        // consume an at-rule, and let rule be the return value.
        rule = Algorithms.consumeAtRule(tokenizer);
        break;
    default:
        // Otherwise, consume a qualified rule and let rule be the return value.
        rule = Algorithms.consumeQualifiedRule(tokenizer);

        // If nothing was returned, return a syntax error.
        if (!rule) {
            return {
                type: Types.ERROR,
                value: 'invalid'
            };
        }
    }

    // While the next input token is a <whitespace-token>,
    // consume the next input token.
    while (tokenizer.getNextToken().type === Types.WHITESPACE) {
        tokenizer.consumeNextToken();
    }

    // If the next input token is an <EOF-token>, return rule.
    if (tokenizer.getNextToken().type === Types.EOF) {
        return rule;
    }

    // Otherwise, return a syntax error.
    return {
        type: Types.ERROR,
        value: 'extra-input'
    };
};

// 5.3.4: Parse a declaration
// --------------------------
exports.parseDeclaration = function (input) {
    var tokenizer, returnValue;
    tokenizer = new Tokenizer(input);

    // While the next input token is a <whitespace-token>,
    // consume the next input token.
    while (tokenizer.getNextToken().type === Types.WHITESPACE) {
        tokenizer.consumeNextToken();
    }

    if (tokenizer.getNextToken().type === Types.EOF) {
        return {
            type: Types.ERROR,
            value: 'empty'
        };
    }

    // If the next input token is not an <ident-token>, return a syntax error.
    if (tokenizer.getNextToken().type !== Types.IDENT) {
        return {
            type: Types.ERROR,
            value: 'invalid'
        };
    }

    // Consume a declaration.
    returnValue = Algorithms.consumeDeclaration(tokenizer);

    // If anything was returned, return it.
    if (returnValue) {
        return returnValue;
    }

    // Otherwise, return a syntax error.
    return {
        type: Types.ERROR,
        value: 'invalid'
    };
};

// 5.3.5: Parse a list of declarations
// -----------------------------------
exports.parseDeclarations = function (input) {
    var tokenizer, returnList;

    tokenizer = new Tokenizer(input);

    // Consume a list of declarations.
    returnList = Algorithms.consumeDeclarations(tokenizer);

    // Return the returned list.
    return returnList;
};

// 5.3.6: Parse a component value
// ------------------------------
exports.parseComponentValue = function (input) {
    var tokenizer, value;

    tokenizer = new Tokenizer(input);

    // While the next input token is a <whitespace-token>,
    // consume the next input token.
    while (tokenizer.getNextToken().type === Types.WHITESPACE) {
        tokenizer.consumeNextToken();
    }

    // If the next input token is an <EOF-token>, return a syntax error
    if (tokenizer.getNextToken().type === Types.EOF) {
        return {
            type: Types.ERROR,
            value: 'empty'
        };
    }

    // Consume a component value and let value be the return value.
    value = Algorithms.consumeComponentValue(tokenizer);

    // While the next input token is a <whitespace-token>,
    // consume the next input token.
    while (tokenizer.getNextToken().type === Types.WHITESPACE) {
        tokenizer.consumeNextToken();
    }

    // If the next input token is an <EOF-token>, return value.
    if (tokenizer.getNextToken().type === Types.EOF) {
        return value;
    }

    // Otherwise, return a syntax error.
    return {
        type: Types.ERROR,
        value: 'extra-input'
    };
};

// 5.3.7: Parse a list of component values
// ---------------------------------------
exports.parseComponentValues = function (input) {
    var tokenizer, returnList, componentValue;

    tokenizer = new Tokenizer(input);
    returnList = [];

    // Repeatedly consume a component value until an <EOF-token> is returned,
    // appending the returned values (except the final <EOF-token>) into a list.
    for (;;) {
        componentValue = Algorithms.consumeComponentValue(tokenizer);
        if (componentValue.type === Types.EOF) {
            // Return the list.
            return returnList;
        }
        returnList.push(componentValue);
    }
};

// 5.3.8: Parse a comma-separated list of component values
// -------------------------------------------------------
exports.parseCommaSeparatedComponentValues = function (input) {
    var tokenizer, listOfCvls, cvl, componentValue;
    tokenizer = new Tokenizer(input);

    // Let list of cvls be an initially empty list of component value lists.
    listOfCvls = [];

    // Repeatedly consume a component value until an <EOF-token> or
    // <comma-token> is returned, appending the returned values
    // (except the final <EOF-token> or <comma-token>) into a list.
    cvl = [];
    for (;;) {
        componentValue = Algorithms.consumeComponentValue(tokenizer);
        if (componentValue.type !== Types.COMMA
                && componentValue.type !== Types.EOF) {

            cvl.push(componentValue);
        } else {
            // Append the list to list of cvls.
            listOfCvls.push(cvl);

            // If it was a <comma-token> that was returned, repeat this step.
            if (componentValue.type === Types.COMMA) {
                cvl = [];
            } else {
                // Return list of cvls.
                return listOfCvls;
            }
        }
    }
};

},{"../Tokenizer/Tokenizer.js":8,"../Types.js":9,"./Algorithms.js":2}],4:[function(_dereq_,module,exports){
'use strict';

var Types = _dereq_('../Types.js'),
    SpecialString = _dereq_('./SpecialString.js'),
    CodePoint = _dereq_('./CodePoint.js'),

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

},{"../Types.js":9,"./CodePoint.js":5,"./SpecialString.js":7}],5:[function(_dereq_,module,exports){
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

},{}],6:[function(_dereq_,module,exports){
'use strict';

var CodePoint = _dereq_('./CodePoint.js');

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

},{"./CodePoint.js":5}],7:[function(_dereq_,module,exports){
'use strict';

function SpecialString() {
    this.value = '';
}

SpecialString.prototype = {
    constructor: SpecialString,

    append: function () {
        var i, argument;
        for (i = 0; i < arguments.length; i += 1) {
            argument = arguments[i];
            if (typeof argument === 'string') {
                this.value += argument;
            } else {
                this.value += String.fromCharCode(argument);
            }
        }
    },

    toString: function () {
        return this.value;
    }
};

module.exports = SpecialString;

},{}],8:[function(_dereq_,module,exports){
'use strict';

var Types = _dereq_('../Types.js'),
    InputStream = _dereq_('./InputStream.js');

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
        consumeToken = _dereq_('./Algorithms.js').consumeToken;
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

},{"../Types.js":9,"./Algorithms.js":4,"./InputStream.js":6}],9:[function(_dereq_,module,exports){
'use strict';

module.exports = {
    IDENT: 'Identifier',
    FUNCTION: 'Function',
    AT_KEYWORD: 'AtKeyword',
    HASH: 'Hash',
    STRING: 'String',
    BAD_STRING: 'BadString',
    URL: 'URL',
    BAD_URL: 'BadURL',
    DELIM: 'Delim',
    NUMBER: 'Number',
    PERCENTAGE: 'Percentage',
    DIMENSION: 'Dimension',
    UNICODE_RANGE: 'UnicodeRange',
    INCLUDE_MATCH: 'IncludeMatch',
    DASH_MATCH: 'DashMatch',
    PREFIX_MATCH: 'PrefixMatch',
    SUFFIX_MATCH: 'SuffixMatch',
    SUBSTRING_MATCH: 'SubstringMatch',
    COLUMN: 'Column',
    WHITESPACE: 'Whitespace',
    CDO: 'CDO',
    CDC: 'CDC',
    COLON: 'Colon',
    SEMICOLON: 'Semicolon',
    COMMA: 'Comma',
    LEFT_BRACKET: 'LeftBracket',
    RIGHT_BRACKET: 'RightBracket',
    LEFT_PAREN: 'LeftParen',
    RIGHT_PAREN: 'RightParen',
    LEFT_BRACE: 'LeftBrace',
    RIGHT_BRACE: 'RightBrace',
    STYLESHEET: 'Stylesheet',
    AT_RULE: 'AtRule',
    QUALIFIED_RULE: 'QualifiedRule',
    SIMPLE_BLOCK: 'SimpleBlock',
    DECLARATION: 'Declaration',
    ERROR: 'Error',
    EOF: 'EOF'
};

},{}]},{},[1])
(1)
});