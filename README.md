### cssprima - *The* most standards compliant CSS parser, written in JavaScript.

This project is intended to be a reference implementation to the latest *Editor's Draft* of the  [CSS Syntax Level 3](http://dev.w3.org/csswg/css-syntax/) specification. As this edition of the specification evolves, so will the implementation.

The code attempts to follow the specification verbatim, with the least amount of code additions possible.

----------------------------
### Usage

```js
npm i cssprima
```
----------------------------

### Examples

##### 1. Tokenize a selector.
```js
> cssprima.tokenize('#headlines:nth-child(2n)');
[ { type: 'Hash',
    typeFlag: 'id',
    value: 'headlines' },
  { type: 'Colon', value: ':' },
  { type: 'Function', value: 'nth-child' },
  { type: 'Dimension',
    repr: '2',
    value: 2,
    typeFlag: 'integer',
    unit: 'n' },
  { type: 'RightParen', value: ')' } ]
```

##### 2. Parse a rule.

```js
> var rule = '.clearfix { clear: both; }';
undefined
> cssprima.parseRule(rule);
{ type: 'QualifiedRule',
  prelude:
   [ { type: 'Delim', value: '.' },
     { type: 'Identifier', value: 'clearfix' },
     { type: 'Whitespace', value: ' ' } ],
  value: null,
  block:
   { type: 'SimpleBlock',
     associatedToken: { type: 'LeftBrace' },
     value:
      [ { type: 'Whitespace', value: ' ' },
        { type: 'Identifier', value: 'clear' },
        { type: 'Colon', value: ':' },
        { type: 'Whitespace', value: ' ' },
        { type: 'Identifier', value: 'both' },
        { type: 'Semicolon', value: ';' },
        { type: 'Whitespace', value: ' ' } ] } }
```

##### Possible object types:
##### 4. Possible object types:

```js
> cssprima.Types
{ IDENT: 'Identifier',
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
  ... }
```

##### Other API methods:

+ parseStylesheet
+ parseRules
+ parseDeclaration
+ parseDeclarations
+ parseComponentValue
+ parseComponentValues
+ parseCommaSeparatedComponentValues

Each method may be invoked with a string, or a list of *component values*, a.k.a. already parsed tokens (see example #3 for clarification).

----------------------------
#### Testing

This project passes [*css-parsing-tests*](https://github.com/simonSapin/css-parsing-tests/), written by the specification's co-author Simon Sapin.

```bash
$ npm test

> cssprima@0.1.0 test c:\Users\ezequiel\Desktop\cssprima
> tap test/tap/*.js

ok test/tap/parsing.js .............................. 136/136
total ............................................... 136/136

ok
```

----------------------------
### Notes

+ Not entirely ready for use, but is for the most part.
+ There's still **a lot** more to do (documentation, examples, code cleansing. ...).
