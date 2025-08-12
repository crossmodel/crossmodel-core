// Terminals

// Scalar values
terminal STRING: /"[^"]*"|'[^']*'/;
terminal INT returns number: ('0'..'9')+;
terminal VERSION returns string: ('^' | '~')? INT '.' INT '.' INT;
terminal NUMBER returns number: '-'? INT ('.' INT)?;
terminal ID: /\^?[_a-zA-Z][\w_\-~$#@/\d]*/;

// Identification for cross references
IDReference returns string:
    ID ('.' ID)*;

// Misc
hidden terminal SL_COMMENT: /#[^\n\r]*/;

// Terminals to get the indentation working
terminal INDENT: ':synthetic-indent:';
terminal DEDENT: ':synthetic-dedent:';
terminal LIST_ITEM: '- '; // block sequence entry
hidden terminal NEWLINE: /[/\r\n|\r|\n/]+/;
hidden terminal WS: /[ \t]+/; 
