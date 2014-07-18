// Intentionally programmed poorly.

'use strict';

var Types = require('../lib/Types.js');

function toJSON(componentValue) {
    var returnValue;

    if (Array.isArray(componentValue)) {
        returnValue = [];
        componentValue.forEach(function (componentValue) {
            returnValue.push(toJSON(componentValue));
        });
        return returnValue;
    }

    switch (componentValue.type) {
    case Types.ERROR:
        return ['error', componentValue.value];
    case Types.BAD_STRING:
        return ['error', 'bad-string'];
    case Types.BAD_URL:
        return ['error', 'bad-url'];
    case Types.UNICODE_RANGE:
        return ['unicode-range', componentValue.start, componentValue.end];
    case Types.IDENT:
        return ['ident', componentValue.value];
    case Types.AT_KEYWORD:
        return ['at-keyword', componentValue.value];
    case Types.URL:
        return ['url', componentValue.value];
    case Types.WHITESPACE:
        return ' ';
    case Types.HASH:
        return ['hash', componentValue.value, componentValue.typeFlag];
    case Types.DIMENSION:
        return [
            'dimension',
            componentValue.repr,
            componentValue.value,
            componentValue.typeFlag,
            componentValue.unit
        ];
    case Types.PERCENTAGE:
        return [
            'percentage',
            componentValue.repr,
            componentValue.value,
            componentValue.typeFlag
        ];
    case Types.NUMBER:
        return [
            'number',
            componentValue.repr,
            componentValue.value,
            componentValue.typeFlag
        ];
    case Types.SIMPLE_BLOCK:
        switch (componentValue.associatedToken.type) {
        case Types.LEFT_BRACE:
            returnValue = ['{}'];

            componentValue.value.forEach(function (componentValue) {
                returnValue.push(toJSON(componentValue));
            });

            return returnValue;
        case Types.LEFT_BRACKET:
            returnValue =['[]'];

            componentValue.value.forEach(function (componentValue) {
                returnValue.push(toJSON(componentValue));
            });

            return returnValue;
        case Types.LEFT_PAREN:
            returnValue =['()'];

            componentValue.value.forEach(function (componentValue) {
                returnValue.push(toJSON(componentValue));
            });

            return returnValue;
        }
        break;
    case Types.FUNCTION:
        returnValue = [
            'function',
            componentValue.name
        ];

        componentValue.value.forEach(function (componentValue) {
            returnValue.push(toJSON(componentValue));
        });

        return returnValue;
    case Types.STRING:
        return ['string', componentValue.value];
    case Types.DECLARATION:
        return [
            'declaration',
            componentValue.name,
            toJSON(componentValue.value),
            componentValue.important || false
        ];
    case Types.AT_RULE:
        return [
            'at-rule',
            componentValue.name,
            toJSON(componentValue.prelude),
            componentValue.block ? toJSON(componentValue.block.value) : null
        ];
    case Types.QUALIFIED_RULE:
        return [
            'qualified rule',
            toJSON(componentValue.prelude),
            toJSON(componentValue.block.value)
        ];
    case Types.STYLESHEET:
        return toJSON(componentValue.value);
    default:
        return componentValue.value;
    }
}

module.exports = toJSON;
