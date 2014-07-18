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
