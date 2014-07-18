'use strict';

var Types = require('../Types.js'),
    Algorithms = require('./Algorithms.js'),
    Tokenizer = require('../Tokenizer/Tokenizer.js');

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
