'use strict';

var test = require('tap').test,
    toJSON = require('../to_json.js'),
    cssprima = require('../../lib/Main.js');

test('parse one component value', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/one_component_value.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseComponentValue(input)), expected);
    }

    t.end();
});

test('parse component value list', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/component_value_list.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseComponentValues(input)), expected);
    }

    t.end();
});

test('parse one declaration', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/one_declaration.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseDeclaration(input)), expected);
    }

    t.end();
});

test('parse declaration list', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/declaration_list.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseDeclarations(input)), expected);
    }

    t.end();
});

test('parse one rule', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/one_rule.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseRule(input)), expected);
    }

    t.end();
});

test('parse rule list', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/rule_list.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseRules(input)), expected);
    }

    t.end();
});

test('parse stylesheet', function (t) {
    var tests, i, input, expected;

    tests = require('./css-parsing-tests/stylesheet.json');

    for (i = 0; i < tests.length; i += 2) {
        input = tests[i];
        expected = tests[i + 1];
        t.deepEqual(toJSON(cssprima.parseStylesheet(input)), expected);
    }

    t.end();
});
