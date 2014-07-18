'use strict';

var Types = require('../Types.js'),
    Tokenizer = require('../Tokenizer/Tokenizer.js'),

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
