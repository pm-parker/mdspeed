// parse.js — a self-contained Markdown → HTML engine that reproduces the
// output of marked 18.1.3 under its default configuration (gfm on, breaks
// off, pedantic off). It keeps marked's three stages — block tokenizing,
// inline tokenizing, rendering — but fuses them into one streaming pass with
// no plugin hooks and no surviving token tree, so the emitted HTML comes out
// byte-for-byte identical while the per-document work drops.

const RULE_PATTERNS = {"block":{"blockquote":{"s":"^( {0,3}> ?(?:(?![ \\t]*(?:\\n|$))(([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|\\d{1,9}[.)])(?:[ \\t]|\\n|$)| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)|[ \\t]+\\n)[^\\n]+)*))|[^\\n]*)(?:\\n|$))+","f":""},"code":{"s":"^((?: {4}| {0,3}\\t)[^\\n]+(?:\\n(?:[ \\t]*(?:\\n|$))*)?)+","f":""},"def":{"s":"^ {0,3}\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]: *(?:\\n[ \\t]*)?([^<\\s][^\\s]*|<.*?>)(?:(?: +(?:\\n[ \\t]*)?| *\\n[ \\t]*)((?:\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\\\n]|\\n(?!\\n))*'|\\((?:\\\\[\\s\\S]|[^()\\\\])*\\))))? *(?:\\n+|$)","f":""},"fences":{"s":"^ {0,3}(`{3,}(?=[^`\\n]*(?:\\n|$))|~{3,})([^\\n]*)(?:\\n|$)(?:|([\\s\\S]*?)(?:\\n|$))(?: {0,3}(?:(?=`)\\1`*|(?=~)\\1~*) *(?=\\n|$)|$)","f":""},"heading":{"s":"^ {0,3}(#{1,6})(?=\\s|$)(.*)(?:\\n+|$)","f":""},"hr":{"s":"^ {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)","f":""},"html":{"s":"^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:<\\/\\1>[^\\n]*\\n*|$)|<!--(?:-?>|[\\s\\S]*?(?:-->|$))[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|<\\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \\t]+|\\n|\\/?>|$)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?: +[a-zA-Z:_][\\w.:-]*(?: *= *\"[^\"\\n]*\"| *= *'[^'\\n]*'| *= *[^\\s\"'=<>`]+)?)*? *\\/?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<\\/[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))","f":"i"},"lheading":{"s":"^(?! {0,3}(?:[*+-]|\\d{1,9}[.)]) |(?: {4}| {0,3}\\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n)((?:.|\\n(?!\\s*?\\n| {0,3}(?:[*+-]|\\d{1,9}[.)]) | {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}(?:(?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n))+?)\\n {0,3}(=+|-+)[ \\t]*(?:\\n+|$)","f":""},"list":{"s":"^( {0,3}(?:[*+-]|\\d{1,9}[.)]))([ \\t][^\\n]*?)?(?:\\n|$)","f":""},"newline":{"s":"^(?:[ \\t]*(?:\\n|$))+","f":""},"paragraph":{"s":"^([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)| *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)|[ \\t]+\\n)[^\\n]+)*)","f":""},"table":{"s":"^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)","f":""},"text":{"s":"^[^\\n]+","f":""}},"inline":{"_backpedal":{"s":"(?:[^?!.,:;*_'\"~()&]+|\\([^)]*\\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'\"~)]+(?!$))+","f":""},"anyPunctuation":{"s":"\\\\([\\p{P}\\p{S}])","f":"gu"},"anyPunctuationOutsideCode":{"s":"(`+)(?:[^`]|[^`][\\s\\S]*?[^`])\\1(?!`)|`+|\\\\([\\p{P}\\p{S}])","f":"gu"},"autolink":{"s":"^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\\s\\x00-\\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>","f":""},"blockSkip":{"s":"\\[(?:[^\\[\\]`]|(?<a>`+)[^`]+\\k<a>(?!`))*?\\]\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)]|\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)])*\\))*\\)|(?<!`)()(?<b>`+)[^`]+\\k<b>(?!`)|<(?! )[^<>]*?>","f":"g"},"br":{"s":"^( {2,}|\\\\)\\n(?!\\s*$)[ \\t]*","f":""},"code":{"s":"^(`+)([^`]|[^`][\\s\\S]*?[^`])\\1(?!`)","f":""},"del":{"s":"^(~~?)(?=[^\\s~])((?:\\\\[\\s\\S]|[^\\\\])*?(?:\\\\[\\s\\S]|[^\\s~\\\\]))\\1(?=[^~]|$)","f":""},"delLDelim":{"s":"^~~?(?:((?!~)[\\p{P}\\p{S}])|[^\\s~])","f":"u"},"delRDelim":{"s":"^[^~]+(?=[^~])|(?!~)[\\p{P}\\p{S}](~~?)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](~~?)(?!~)(?=[\\s\\p{P}\\p{S}]|$)|(?!~)[\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])|[\\s](~~?)(?!~)(?=[\\p{P}\\p{S}])|(?!~)[\\p{P}\\p{S}](~~?)(?!~)(?=[\\p{P}\\p{S}])|[^\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])","f":"gu"},"emStrongLDelim":{"s":"^(?:\\*+(?:((?!\\*)(?!~)[\\p{P}\\p{S}])|([^\\s*]))?)|^_+(?:((?!_)(?!~)[\\p{P}\\p{S}])|([^\\s_]))?","f":"u"},"emStrongRDelimAst":{"s":"^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?=[\\s]|$)|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?!\\*)(?=(?!~)[\\s\\p{P}\\p{S}]|$)|(?!\\*)(?!~)[\\s\\p{P}\\p{S}](\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))|[\\s](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))","f":"gu"},"emStrongRDelimUnd":{"s":"^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)[\\p{P}\\p{S}](_+)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](_+)(?!_)(?=[\\s\\p{P}\\p{S}]|$)|(?!_)[\\s\\p{P}\\p{S}](_+)(?=[^\\s\\p{P}\\p{S}])|[\\s](_+)(?!_)(?=[\\p{P}\\p{S}])|(?!_)[\\p{P}\\p{S}](_+)(?!_)(?=[\\p{P}\\p{S}])","f":"gu"},"escape":{"s":"^\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~])","f":""},"link":{"s":"^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\([ \\t\\n]*(<(?:\\\\.|[^\\n<>\\\\])+>|[^ \\t\\n\\x00-\\x1f]+|(?=\\)))(?:(?:[ \\t]+(?:\\n[ \\t]*)?|\\n[ \\t]*)(\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\])*'|\\((?:\\\\[\\s\\S]|[^)\\\\])*\\)))?[ \\t\\n]*\\)","f":""},"nolink":{"s":"^!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\](?:\\[\\])?","f":""},"punctuation":{"s":"^((?![*_])[\\s\\p{P}\\p{S}])","f":"u"},"reflink":{"s":"^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]","f":""},"reflinkSearch":{"s":"!?\\[((?:[^\\[\\]\\\\`]*(?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\]))){0,999}?[^\\[\\]\\\\`]*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\]|!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\](?:\\[\\])?(?!\\()","f":"g"},"tag":{"s":"^<!--(?:-?>|[\\s\\S]*?-->)|^<\\/[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:\\s+[a-zA-Z:_][\\w.:-]*(?:\\s*=\\s*\"[^\"]*\"|\\s*=\\s*'[^']*'|\\s*=\\s*[^\\s\"'=<>`]+)?)*?\\s*\\/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>","f":""},"text":{"s":"^(?:[^a-zA-Z0-9](?=(?:mailto|xmpp):)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\\n)|(?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@)|[\\s\\S]*?(?:(?=[\\\\<!\\[`*~_]|\\b_|[hH][tT][tT][pP][sS]?|[fF][tT][pP]:\\/\\/|(?<![^\\s*_~(])www\\.|$)|[^ ](?= {2,}\\n)|[^a-zA-Z0-9](?=(?:mailto|xmpp):)|[^a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-](?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@))))","f":""},"url":{"s":"^(?:mailto:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])|xmpp:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])(?:\\/[A-Za-z0-9@.]+)?)|^((?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\\/\\/|www\\.)(?:[a-zA-Z0-9\\-]+\\.?)+[^\\s<]*|^[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])","f":""}},"other":{"codeRemoveIndent":{"s":"^(?: {0,3}\\t| {1,4})","f":"gm"},"outputLinkReplace":{"s":"\\\\([\\[\\]])","f":"g"},"indentCodeCompensation":{"s":"^(\\s+)(?:```)","f":""},"beginningSpace":{"s":"^\\s+","f":""},"endingHash":{"s":"#$","f":""},"startingSpaceChar":{"s":"^ ","f":""},"endingSpaceChar":{"s":" $","f":""},"endingSpaceTabChar":{"s":"[ \\t]$","f":""},"nonSpaceChar":{"s":"[^ ]","f":""},"newLineCharGlobal":{"s":"\\n","f":"g"},"tabCharGlobal":{"s":"\\t","f":"g"},"leadingSpaceTab":{"s":"^[ \\t]+","f":""},"multipleSpaceGlobal":{"s":"\\s+","f":"g"},"blankLine":{"s":"^[ \\t]*$","f":""},"doubleBlankLine":{"s":"\\n[ \\t]*\\n[ \\t]*$","f":""},"blockquoteStart":{"s":"^ {0,3}>","f":""},"blockquoteSetextReplace":{"s":"\\n {0,3}((?:=+|-+)[ \\t]*)(?=\\n|$)","f":"g"},"blockquoteSetextReplace2":{"s":"^ {0,3}>[ \\t]?","f":"gm"},"blockquoteMarkerWhitespace":{"s":"^( {0,3}>)([ \\t]+)","f":"gm"},"listReplaceNesting":{"s":"^ {1,4}(?=( {4})*[^ ])","f":"g"},"listIsTask":{"s":"^\\[[ xX]\\][ \\t]+\\S","f":""},"listReplaceTask":{"s":"^\\[[ xX]\\][ \\t]+","f":""},"listTaskCheckbox":{"s":"\\[[ xX]\\]","f":""},"anyLine":{"s":"\\n.*\\n","f":""},"hrefBrackets":{"s":"^<(.*)>$","f":""},"tableDelimiter":{"s":"[:|]","f":""},"tableAlignChars":{"s":"^\\||\\| *$","f":"g"},"tableRowBlankLine":{"s":"\\n[ \\t]*$","f":""},"tableAlignRight":{"s":"^ *-+: *$","f":""},"tableAlignCenter":{"s":"^ *:-+: *$","f":""},"tableAlignLeft":{"s":"^ *:-+ *$","f":""},"startATag":{"s":"^<a ","f":"i"},"endATag":{"s":"^<\\/a>","f":"i"},"startPreScriptTag":{"s":"^<(pre|code|kbd|script)(\\s|>)","f":"i"},"endPreScriptTag":{"s":"^<\\/(pre|code|kbd|script)(\\s|>)","f":"i"},"startAngleBracket":{"s":"^<","f":""},"endAngleBracket":{"s":">$","f":""},"pedanticHrefTitle":{"s":"^([^'\"]*[^\\s])\\s+(['\"])(.*)\\2","f":""},"unicodeAlphaNumeric":{"s":"[\\p{L}\\p{N}]","f":"u"},"numericCharacterReference":{"s":"&#(?:(\\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));","f":""},"numericCharacterReferenceOrAmpersand":{"s":"&#(?:(\\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)","f":"g"},"escapeTest":{"s":"[&<>\"']","f":""},"escapeReplace":{"s":"[&<>\"']","f":"g"},"escapeTestNoEncode":{"s":"[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)","f":""},"escapeReplaceNoEncode":{"s":"[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)","f":"g"},"caret":{"s":"(^|[^\\[])\\^","f":"g"},"percentDecode":{"s":"%25","f":"g"},"findPipe":{"s":"\\|","f":"g"},"splitPipe":{"s":" \\|","f":""},"slashPipe":{"s":"\\\\\\|","f":"g"},"carriageReturn":{"s":"\\r\\n|\\r","f":"g"},"spaceLine":{"s":"^ +$","f":"gm"},"notSpaceStart":{"s":"^\\S*","f":""},"endingNewline":{"s":"\\n$","f":""}}};

// Compile the grammar once into three lookup tables: block-level rules,
// inline rules, and miscellaneous small patterns shared by both stages.
const blockRules = {}, inlineRules = {}, miscRules = {};
for (const name in RULE_PATTERNS.block) blockRules[name] = new RegExp(RULE_PATTERNS.block[name].s, RULE_PATTERNS.block[name].f);
for (const name in RULE_PATTERNS.inline) inlineRules[name] = new RegExp(RULE_PATTERNS.inline[name].s, RULE_PATTERNS.inline[name].f);
for (const name in RULE_PATTERNS.other) miscRules[name] = new RegExp(RULE_PATTERNS.other[name].s, RULE_PATTERNS.other[name].f);

const BLOCK_LEVEL_TAGS = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";

// Several auxiliary rules differ only in how much leading indent they allow,
// and the allowed depth always clamps to 0–3, so a four-slot ladder caches
// one compiled regex per depth instead of rebuilding it on every call.
function indentMemo(build) { const slots = []; return depth => { const i = Math.max(0, Math.min(3, depth - 1)); return slots[i] || (slots[i] = build(i)); }; }
// Item-start patterns keyed by escaped marker shape. Markers come from a tiny
// closed set (\*, \+, \-, \d{1,9}\., \d{1,9}\)), yet list() is tried on
// nearly every dash- or digit-leading paragraph line — compile each shape
// once and reuse it instead of allocating a RegExp per attempt.
const itemPatternByMarker = new Map();
miscRules.listItemRegex = shape => {
  let re = itemPatternByMarker.get(shape);
  if (re === undefined) { re = new RegExp("^( {0,3}" + shape + ")((?:[\t ][^\\n]*)?(?:\\n|$))"); itemPatternByMarker.set(shape, re); }
  return re;
};
miscRules.nextBulletRegex = indentMemo(n => new RegExp("^ {0," + n + "}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))"));
miscRules.hrRegex = indentMemo(n => new RegExp("^ {0," + n + "}((?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\\*[ \t]*){3,})(?:\\n+|$)"));
miscRules.fencesBeginRegex = indentMemo(n => new RegExp("^ {0," + n + "}(?:```|~~~)"));
miscRules.headingBeginRegex = indentMemo(n => new RegExp("^ {0," + n + "}#{1,6}(?:\\s|$)"));
miscRules.htmlBeginRegex = indentMemo(n => new RegExp("^ {0," + n + "}(?:</?(?:" + BLOCK_LEVEL_TAGS + ")(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)", "i"));
miscRules.blockquoteBeginRegex = indentMemo(n => new RegExp("^ {0," + n + "}>"));

// ---------- tokenizer ----------

class Tokenizer {
  constructor() { this.lexer = null; }

  space(src) {
    const t = blockRules.newline.exec(src);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }

  code(src) {
    const t = blockRules.code.exec(src);
    if (t) {
      const raw = dropTrailingBlankLines(t[0]);
      const text = raw.replace(miscRules.codeRemoveIndent, "");
      return { type: "code", raw, codeBlockStyle: "indented", text };
    }
  }

  fences(src) {
    const t = blockRules.fences.exec(src);
    if (t) {
      const raw = t[0];
      const text = stripFenceIndent(raw, t[3] || "");
      return { type: "code", raw, lang: t[2] ? t[2].trim().replace(inlineRules.anyPunctuation, "$1") : t[2], text };
    }
  }

  heading(src) {
    const t = blockRules.heading.exec(src);
    if (t) {
      let text = t[2].trim();
      if (miscRules.endingHash.test(text)) {
        const s = trimCharRight(text, "#");
        if (!s || miscRules.endingSpaceTabChar.test(s)) text = s.trim();
      }
      return { type: "heading", raw: trimCharRight(t[0], "\n"), depth: t[1].length, text, tokens: this.lexer.inline(text) };
    }
  }

  hr(src) {
    const t = blockRules.hr.exec(src);
    if (t) return { type: "hr", raw: trimCharRight(t[0], "\n") };
  }

  blockquote(src) {
    const match = blockRules.blockquote.exec(src);
    if (match) {
      const lines = trimCharRight(match[0], "\n").split("\n");
      // Replace the pending line buffer in place; the outer loop re-reads it.
      const refill = from => { lines.length = 0; for (const ln of from) lines.push(ln); };
      let raw = "", text = "";
      const tokens = [];
      while (lines.length > 0) {
        // Gather one group: quoted lines plus any unquoted lines before them.
        let sawMarker = false;
        const group = [];
        let end;
        for (end = 0; end < lines.length; end++) {
          if (miscRules.blockquoteStart.test(lines[end])) { group.push(lines[end]); sawMarker = true; }
          else if (!sawMarker) group.push(lines[end]);
          else break;
        }
        const remaining = lines.slice(end);
        const groupRaw = group.join("\n");
        const groupText = groupRaw
          .replace(miscRules.blockquoteMarkerWhitespace, (g, b, m) => b + expandTabs(m, b.length))
          .replace(miscRules.blockquoteSetextReplace, "\n    $1")
          .replace(miscRules.blockquoteSetextReplace2, "");
        raw = raw ? raw + "\n" + groupRaw : groupRaw;
        text = text ? text + "\n" + groupText : groupText;
        const prevTop = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(groupText, tokens, true);
        this.lexer.state.top = prevTop;
        if (remaining.length === 0) break;
        const last = tokens[tokens.length - 1];
        // Self-continuing blocks: a quote interrupting itself re-lexes with the
        // leftover lines appended, and a list may swallow following lines as
        // further items. Anything else terminates the quote right here.
        if (last && (last.type === "code" || last.type === "heading" || last.type === "hr" || last.type === "html" || last.type === "table")) break;
        if (last && last.type === "blockquote") {
          const prevQuote = last;
          const merged = prevQuote.raw + "\n" + remaining.join("\n").replace(miscRules.blockquoteSetextReplace2, "");
          const reTok = this.blockquote(merged);
          tokens[tokens.length - 1] = reTok;
          const leftover = merged.substring(reTok.raw.length).replace(/^\n/, "");
          const unconsumedLines = leftover ? leftover.split("\n").length : 0;
          const kept = unconsumedLines ? remaining.slice(0, -unconsumedLines) : remaining;
          if (kept.length > 0) raw = raw + "\n" + kept.join("\n");
          text = text.substring(0, text.length - prevQuote.text.length) + reTok.text;
          refill(remaining.slice(kept.length));
          if (lines.length > 0 && miscRules.blockquoteStart.test(lines[0])) continue;
          break;
        } else if (last && last.type === "list") {
          const prevList = last;
          const merged = prevList.raw + "\n" + remaining.join("\n");
          const reTok = this.list(merged);
          tokens[tokens.length - 1] = reTok;
          const tookLines = reTok.raw.length > prevList.raw.length ? merged.slice(prevList.raw.length + 1, reTok.raw.length).split("\n").length : 0;
          if (tookLines > 0) {
            const swallowed = remaining.slice(0, tookLines).join("\n");
            raw = raw + "\n" + swallowed;
            text = text + "\n" + swallowed;
          }
          refill(remaining.slice(tookLines));
          continue;
        } else {
          refill(remaining);
        }
      }
      return { type: "blockquote", raw, tokens, text };
    }
  }

  list(src) {
    // Cheap rejection before the list regex runs: its first line must be
    // ^bull([ \t][^\n]*?)?(?:\n|$), so a marker not followed by a space, tab,
    // newline or end of input can never open a list.
    let indent = 0;
    while (indent < 3 && src.charCodeAt(indent) === 32) indent++;
    let code = src.charCodeAt(indent);
    if (code >= 48 && code <= 57) {
      let digits = indent + 1;
      while (digits < src.length && (code = src.charCodeAt(digits)) >= 48 && code <= 57) digits++;
      // \d{1,9} is greedy: only the full digit run can precede "." or ")",
      // and that run must be at most nine digits long
      if (digits - indent > 9) return;
      code = src.charCodeAt(digits);
      if (code !== 46 && code !== 41) return;
      indent = digits;
    } else if (code !== 42 && code !== 43 && code !== 45) return;
    code = src.charCodeAt(indent + 1);
    if (!(code === 32 || code === 9 || code === 10) && indent + 1 < src.length) return;
    const t = blockRules.list.exec(src);
    if (!t) return;
    const orig = src;
    const consumed = () => orig.length - src.length;
    const marker = t[1].trim();
    const ordered = marker.length > 1;
    const listTok = { type: "list", raw: "", ordered, start: ordered ? +marker.slice(0, -1) : "", loose: false, items: [] };
    const shape = ordered ? "\\d{1,9}\\" + marker.slice(-1) : "\\" + marker;
    const itemStartRegex = miscRules.listItemRegex(shape);
    let pendingLoose = false;
    while (src) {
      let endEarly = false;
      let itemText = "";
      let m;
      if (!((m = itemStartRegex.exec(src))) || blockRules.hr.test(src)) break;
      const itemStart = consumed();
      src = src.substring(m[0].length);
      const firstLine = upToNewline(m[2]);
      const markerLen = m[1].length;
      const spacedFirstLine = expandLineIndent(firstLine, markerLen);
      let lineAfter = upToNewline(src);
      let blankFirstLine = !nonWhitespaceProbe.test(spacedFirstLine);
      let offset = 0;
      if (blankFirstLine) {
        offset = markerLen + 1;
      } else {
        offset = spacedFirstLine.search(miscRules.nonSpaceChar);
        offset = offset > 4 ? 1 : offset;
        itemText = spacedFirstLine.slice(offset);
        offset += markerLen;
      }
      if (blankFirstLine && miscRules.blankLine.test(lineAfter)) {
        src = src.substring(lineAfter.length + 1);
        endEarly = true;
      }
      if (!endEarly) {
        const htmlBeginRegex = miscRules.htmlBeginRegex(offset);
        const probeLimit = offset <= 1 ? 0 : offset >= 4 ? 3 : offset - 1; // indentMemo slot for this offset
        let prevItemLine = spacedFirstLine;
        while (src) {
          const nlIdx = src.indexOf("\n");
          const line = nlIdx === -1 ? src : src.slice(0, nlIdx);
          lineAfter = line;
          const lineC0 = line.charCodeAt(0);
          const spacedLine = (lineC0 === 32 || lineC0 === 9) ? expandLineIndent(line, 0) : line;
          // Each begin-check is anchored at "^ {0,N}<char>…", so the first
          // non-space character decides which checks are even possible.
          let skip = 0;
          while (skip < 3 && line.charCodeAt(skip) === 32) skip++;
          const firstChar = line.charCodeAt(skip);
          if ((firstChar === 96 || firstChar === 126) && opensFence(line, probeLimit)) break;
          if (firstChar === 35 && opensAtxHeading(line, probeLimit)) break;
          if (firstChar === 60 && htmlBeginRegex.test(line)) break;
          if (firstChar === 62 && opensQuote(line, probeLimit)) break;
          if ((firstChar === 42 || firstChar === 43 || firstChar === 45 || (firstChar >= 48 && firstChar <= 57)) && startsListItem(line, probeLimit)) break;
          if ((firstChar === 45 || firstChar === 95 || firstChar === 42) && isThematicBreak(line, probeLimit)) break;
          // first non-space index in spacedLine (== search(/[^ ]/); -1 when all spaces)
          let firstNonSpace = -1;
          for (let q = 0; q < spacedLine.length; q++) { if (spacedLine.charCodeAt(q) !== 32) { firstNonSpace = q; break; } }
          const lineBlank = !nonWhitespaceProbe.test(lineAfter);
          if (firstNonSpace >= offset || lineBlank) {
            itemText += "\n" + spacedLine.slice(offset);
          } else {
            // A dedented continuation line survives only as a lazy continuation
            // of the previous item line — which must itself be unable to open a
            // new block. Setext underlines are re-indented so they cannot turn
            // into headings.
            const prevSpaced = prevItemLine.indexOf("\t") === -1 ? prevItemLine : prevItemLine.replace(miscRules.tabCharGlobal, "    ");
            let prevFirstNonSpace = -1;
            for (let q = 0; q < prevSpaced.length; q++) { if (prevSpaced.charCodeAt(q) !== 32) { prevFirstNonSpace = q; break; } }
            if (blankFirstLine || prevFirstNonSpace >= 4 || (opensFence(prevItemLine, probeLimit) || opensAtxHeading(prevItemLine, probeLimit) || htmlBeginRegex.test(prevItemLine) || isThematicBreak(prevItemLine, probeLimit))) break;
            const keptLine = /^ {0,3}(?:=+|-+) *$/.test(lineAfter) && blockRules.lheading.test(prevItemLine + "\n" + lineAfter)
              ? "    " + spacedLine.replace(/^ {0,3}/, "")
              : lineAfter;
            itemText += "\n" + keptLine;
          }
          blankFirstLine = lineBlank;
          src = src.substring(line.length + 1);
          prevItemLine = spacedLine.slice(offset);
        }
      }
      const itemRaw = orig.slice(itemStart, consumed());
      if (!listTok.loose) {
        if (pendingLoose) listTok.loose = true;
        else if (endsWithTwoBlanks(itemRaw)) pendingLoose = true;
      }
      listTok.items.push({ type: "list_item", raw: itemRaw, task: miscRules.listIsTask.test(itemText), loose: false, text: itemText, tokens: [] });
    }
    const lastItem = listTok.items[listTok.items.length - 1];
    if (lastItem) {
      lastItem.raw = lastItem.raw.trimEnd();
      lastItem.text = lastItem.text.trimEnd();
    } else return;
    listTok.raw = orig.slice(0, consumed()).trimEnd();
    for (const item of listTok.items) {
      this.lexer.state.top = false;
      item.tokens = this.lexer.blockTokens(item.text, []);
      if (!listTok.loose) {
        let k = false;
        for (let i = 0; i < item.tokens.length; i++) {
          const g = item.tokens[i];
          if (g.type === "space" && miscRules.anyLine.test(g.raw)) { k = true; break; }
        }
        listTok.loose = k;
      }
    }
    for (const item of listTok.items) {
      const first = item.tokens[0];
      if (item.task && (first?.type === "text" || first?.type === "paragraph")) {
        item.text = item.text.replace(miscRules.listReplaceTask, "");
        first.raw = first.raw.replace(miscRules.listReplaceTask, "");
        first.text = first.text.replace(miscRules.listReplaceTask, "");
        for (let g = this.lexer.inlineQueue.length - 1; g >= 0; g--) {
          if (miscRules.listIsTask.test(this.lexer.inlineQueue[g].src)) {
            this.lexer.inlineQueue[g].src = this.lexer.inlineQueue[g].src.replace(miscRules.listReplaceTask, "");
            break;
          }
        }
        const k = miscRules.listTaskCheckbox.exec(item.raw);
        if (k) {
          const g = { type: "checkbox", raw: k[0] + " ", checked: k[0] !== "[ ]" };
          item.checked = g.checked;
          if (listTok.loose) {
            if (item.tokens[0] && ["paragraph", "text"].includes(item.tokens[0].type) && "tokens" in item.tokens[0] && item.tokens[0].tokens) {
              item.tokens[0].raw = g.raw + item.tokens[0].raw;
              item.tokens[0].text = g.raw + item.tokens[0].text;
              item.tokens[0].tokens.unshift(g);
            } else {
              item.tokens.unshift({ type: "paragraph", raw: g.raw, text: g.raw, tokens: [g] });
            }
          } else {
            item.tokens.unshift(g);
          }
        }
      } else if (item.task) item.task = false;
    }
    if (listTok.loose) {
      for (const item of listTok.items) {
        item.loose = true;
        for (const tk of item.tokens) if (tk.type === "text") tk.type = "paragraph";
      }
    }
    return listTok;
  }

  html(src) {
    const t = blockRules.html.exec(src);
    if (t) {
      const text = dropTrailingBlankLines(t[0]);
      return { type: "html", block: true, raw: text, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text };
    }
  }

  def(src) {
    const t = blockRules.def.exec(src);
    if (t) {
      if (!miscRules.startAngleBracket.test(t[2]) && findOrphanClose(t[2], "()") !== -1) return;
      const tag = normalizeLabel(t[1]);
      const href = t[2] ? t[2].replace(miscRules.hrefBrackets, "$1").replace(inlineRules.anyPunctuation, "$1") : "";
      const title = t[3] ? t[3].substring(1, t[3].length - 1).replace(inlineRules.anyPunctuation, "$1") : t[3];
      return { type: "def", tag, raw: trimCharRight(t[0], "\n"), href, title };
    }
  }

  table(src) {
    const t = blockRules.table.exec(src);
    if (!t || !miscRules.tableDelimiter.test(t[2])) return;
    const header = splitTableRow(t[1]);
    const align = t[2].replace(miscRules.tableAlignChars, "").split("|");
    const rows = t[3]?.trim() ? t[3].replace(miscRules.tableRowBlankLine, "").split("\n") : [];
    const tok = { type: "table", raw: trimCharRight(t[0], "\n"), header: [], align: [], rows: [] };
    if (header.length === align.length) {
      for (const i of align) {
        if (miscRules.tableAlignRight.test(i)) tok.align.push("right");
        else if (miscRules.tableAlignCenter.test(i)) tok.align.push("center");
        else if (miscRules.tableAlignLeft.test(i)) tok.align.push("left");
        else tok.align.push(null);
      }
      for (let i = 0; i < header.length; i++) {
        tok.header.push({ text: header[i], tokens: this.lexer.inline(header[i]), header: true, align: tok.align[i] });
      }
      for (const i of rows) {
        tok.rows.push(splitTableRow(i, tok.header.length).map((l, p) => ({ text: l, tokens: this.lexer.inline(l), header: false, align: tok.align[p] })));
      }
      return tok;
    }
  }

  lheading(src) {
    const t = blockRules.lheading.exec(src);
    if (t) {
      const text = t[1].trim();
      return { type: "heading", raw: trimCharRight(t[0], "\n"), depth: t[2].charAt(0) === "=" ? 1 : 2, text, tokens: this.lexer.inline(text) };
    }
  }

  paragraph(src) {
    const t = blockRules.paragraph.exec(src);
    if (t) {
      const text = t[1].charAt(t[1].length - 1) === "\n" ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text, tokens: this.lexer.inline(text) };
    }
  }

  text(src) {
    const t = blockRules.text.exec(src);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }

  // ---------- inline ----------

  escape(src) {
    const t = inlineRules.escape.exec(src);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }

  tag(src) {
    const t = inlineRules.tag.exec(src);
    if (t) {
      if (!this.lexer.state.inLink && miscRules.startATag.test(t[0])) this.lexer.state.inLink = true;
      else if (this.lexer.state.inLink && miscRules.endATag.test(t[0])) this.lexer.state.inLink = false;
      if (!this.lexer.state.inRawBlock && miscRules.startPreScriptTag.test(t[0])) this.lexer.state.inRawBlock = true;
      else if (this.lexer.state.inRawBlock && miscRules.endPreScriptTag.test(t[0])) this.lexer.state.inRawBlock = false;
      return { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
    }
  }

  link(src) {
    const st = this.lexer.state;
    if (st.linkParenPossible === false) return;
    if (st.parenHas === -1 && st.parenSrc !== null) st.parenHas = st.parenSrc.includes(")") ? 1 : 0;
    if (st.parenHas === 0) return;
    const t = inlineRules.link.exec(src);
    if (t) {
      const maskLen = t[0].charAt(0) === "!" ? 2 : 1;
      if (tagSpansPastLabel(src, t[1], maskLen)) return;
      let href = t[2].trim();
      if (miscRules.startAngleBracket.test(href)) {
        if (!miscRules.endAngleBracket.test(href)) return;
        const hrefNoSlash = trimCharRight(href.slice(0, -1), "\\");
        if ((href.length - hrefNoSlash.length) % 2 === 0) return;
      } else {
        const closeIdx = findOrphanClose(t[2], "()");
        if (closeIdx === -2) return;
        if (closeIdx > -1) {
          const cutAt = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + closeIdx;
          t[2] = t[2].substring(0, closeIdx);
          t[0] = t[0].substring(0, cutAt).trim();
          t[3] = "";
        }
      }
      const rawNoSlash = trimCharRight(t[0].slice(0, -1), "\\");
      if ((t[0].length - rawNoSlash.length) % 2 === 0) return;
      let rawHref = t[2], title = "";
      title = t[3] ? t[3].slice(1, -1) : "";
      rawHref = rawHref.trim();
      if (miscRules.startAngleBracket.test(rawHref)) rawHref = rawHref.slice(1, -1);
      return buildLinkToken(t, {
        href: rawHref && rawHref.replace(inlineRules.anyPunctuation, "$1"),
        title: title && title.replace(inlineRules.anyPunctuation, "$1")
      }, t[0], this.lexer);
    }
  }

  reflink(src, links) {
    let n;
    if ((n = inlineRules.reflink.exec(src)) || (n = inlineRules.nolink.exec(src))) {
      const maskLen = n[0].charAt(0) === "!" ? 2 : 1;
      if (tagSpansPastLabel(src, n[1], maskLen)) return;
      const link = links[normalizeLabel(n[2] || n[1])];
      if (!link) {
        const ch = n[0].charAt(0);
        return { type: "text", raw: ch, text: ch };
      }
      return buildLinkToken(n, link, n[0], this.lexer);
    }
  }

  emStrong(src, maskedSrc, prevChar = "") {
    const openDelim = inlineRules.emStrongLDelim.exec(src);
    if (!openDelim || !openDelim[1] && !openDelim[2] && !openDelim[3] && !openDelim[4]) return;
    const delimChar = openDelim[0][0];
    const openedAfterSameChar = prevChar === delimChar;
    const srcStart = maskedSrc.length - src.length;
    // Walk left over the delimiter run the opener sits in.
    let runStart = srcStart;
    while (runStart > 0 && maskedSrc[runStart - 1] === delimChar) runStart--;
    // The code point ending at runStart — a surrogate pair when its last two
    // code units combine — read inline instead of through a slice.
    let charBeforeRun;
    if (runStart === 0) charBeforeRun = "";
    else {
      const tail = maskedSrc.charCodeAt(runStart - 1);
      if (tail >= 0xDC00 && tail <= 0xDFFF && runStart >= 2) {
        const head = maskedSrc.charCodeAt(runStart - 2);
        charBeforeRun = (head >= 0xD800 && head <= 0xDBFF) ? maskedSrc.slice(runStart - 2, runStart) : maskedSrc.charAt(runStart - 1);
      } else charBeforeRun = maskedSrc.charAt(runStart - 1);
    }
    const beforeIsPunct = charBeforeRun === "*" || charBeforeRun === "_" || !!inlineRules.punctuation.test(charBeforeRun);
    if (runStart < srcStart) prevChar = charBeforeRun;
    const prevIsPunct = runStart < srcStart ? beforeIsPunct : !!inlineRules.punctuation.test(prevChar);
    if (openDelim[4] && miscRules.unicodeAlphaNumeric.test(prevChar)) return;
    const punctAfter = openDelim[1] || openDelim[3] || "";
    if (!punctAfter || !prevChar || prevIsPunct) {
      const delimLen = countCodePoints(openDelim[0]) - 1;
      let need = delimLen, skipped = 0;
      const runLen = srcStart - runStart + delimLen;
      const closerSkippable = !!charBeforeRun.trim() && (!!punctAfter || delimChar === "*" && !beforeIsPunct);
      if (delimChar !== "*" && delimChar !== "_") return;
      const closerRule = delimChar === "*" ? inlineRules.emStrongRDelimAst : inlineRules.emStrongRDelimUnd;
      const lastCloser = emCloserIndex(maskedSrc, delimChar);
      const minCloserPos = maskedSrc.length - src.length + delimLen;
      if (lastCloser < minCloserPos) return;
      const closerZone = maskedSrc.slice(-1 * src.length + delimLen);
      const closerLimit = lastCloser - minCloserPos;
      let match;
      closerRule.lastIndex = 0;
      while ((match = closerRule.exec(closerZone)) !== null && !(match.index > closerLimit)) {
        const run = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!run) continue;
        let closerLen = countCodePoints(run);
        if (match[3] || match[4]) { need += closerLen; continue; }
        else if (match[5] || match[6] || closerSkippable) {
          if (openedAfterSameChar && (match[5] || match[6])) break;
          if (runLen % 3 && !((runLen + closerLen) % 3)) { skipped += closerLen; continue; }
        }
        if (need -= closerLen, need > 0) continue;
        closerLen = Math.min(closerLen, closerLen + need + skipped);
        const leadWidth = leadCodeUnitWidth(match[0]);
        const whole = src.slice(0, delimLen + match.index + leadWidth + closerLen);
        if (Math.min(delimLen, closerLen) % 2) {
          const emInner = whole.slice(1, -1);
          return { type: "em", raw: whole, text: emInner, tokens: this.lexer.inlineTokens(emInner) };
        }
        const strongInner = whole.slice(2, -2);
        return { type: "strong", raw: whole, text: strongInner, tokens: this.lexer.inlineTokens(strongInner) };
      }
    }
  }

  codespan(src) {
    const t = inlineRules.code.exec(src);
    if (t) {
      let n = t[2].replace(miscRules.newLineCharGlobal, " ");
      const s = miscRules.nonSpaceChar.test(n);
      const r = miscRules.startingSpaceChar.test(n) && miscRules.endingSpaceChar.test(n);
      if (s && r) n = n.substring(1, n.length - 1);
      return { type: "codespan", raw: t[0], text: n };
    }
  }

  br(src) {
    const t = inlineRules.br.exec(src);
    if (t) return { type: "br", raw: t[0] };
  }

  del(src, maskedSrc, prevChar = "") {
    const openDelim = inlineRules.delLDelim.exec(src);
    if (!openDelim) return;
    if (!(openDelim[1] || "") || !prevChar || inlineRules.punctuation.exec(prevChar)) {
      const delimLen = countCodePoints(openDelim[0]) - 1;
      let need = delimLen;
      const closerRule = inlineRules.delRDelim;
      const lastCloser = delCloserIndex(maskedSrc);
      const minCloserPos = maskedSrc.length - src.length + delimLen;
      if (lastCloser < minCloserPos) return;
      const closerZone = maskedSrc.slice(-1 * src.length + delimLen);
      const closerLimit = lastCloser - minCloserPos;
      let match;
      closerRule.lastIndex = 0;
      while ((match = closerRule.exec(closerZone)) !== null && !(match.index > closerLimit)) {
        const run = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
        if (!run) continue;
        let closerLen = countCodePoints(run);
        if (closerLen !== delimLen) continue;
        if (match[3] || match[4]) { need += closerLen; continue; }
        if (need -= closerLen, need > 0) continue;
        closerLen = Math.min(closerLen, closerLen + need);
        const leadWidth = leadCodeUnitWidth(match[0]);
        const whole = src.slice(0, delimLen + match.index + leadWidth + closerLen);
        const inner = whole.slice(delimLen, -delimLen);
        return { type: "del", raw: whole, text: inner, tokens: this.lexer.inlineTokens(inner) };
      }
    }
  }

  // Both autolink flavors produce the same token shape: a link whose label is
  // literal text, never re-tokenized inline.
  bareLinkToken(raw, text, href) {
    return { type: "link", raw, text, href, autolink: true, tokens: [{ type: "text", raw: text, text }] };
  }

  autolink(src) {
    const t = inlineRules.autolink.exec(src);
    if (t) {
      const text = t[1];
      return this.bareLinkToken(t[0], text, t[2] === "@" ? "mailto:" + text : text);
    }
  }

  url(src) {
    const t = inlineRules.url.exec(src);
    if (!t) return;
    if (t[2] === "@") return this.bareLinkToken(t[0], t[0], "mailto:" + t[0]);
    // The URL rule grabs greedily; the backpedal pattern shaves trailing
    // punctuation until the match stops shrinking.
    let prev;
    do { prev = t[0]; t[0] = inlineRules._backpedal.exec(t[0])?.[0] ?? ""; } while (prev !== t[0]);
    return this.bareLinkToken(t[0], t[0], t[1] === "www." ? "http://" + t[0] : t[0]);
  }

  inlineText(src) {
    const t = inlineRules.text.exec(src);
    if (t) {
      const inRaw = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: inRaw ? t[0] : resolveNumericRefs(t[0]), escaped: inRaw };
    }
  }
}

// ---------- lexer ----------

class Lexer {
  constructor() {
    this.tokens = [];
    // Link definitions ride on the token array, exactly as in marked.
    this.tokens.links = Object.create(null);
    this.hasLinks = false;
    this.tokenizer = new Tokenizer();
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = { inLink: false, inRawBlock: false, linkEmitted: false, linkParenPossible: true, parenSrc: null, parenHas: -1, top: true };
  }

  // Build the masked view of a chunk and register it as the current mask
  // frame. Chunks without any emphasis characters skip masking entirely and
  // get an inert frame whose closer lookups always miss.
  frameUp(src) {
    if (!emphasisProbe.test(src)) { pushInertFrame(src); return src; }
    const masked = this.maskSrc(src);
    pushMaskFrame(masked);
    return masked;
  }

  lex(src) {
    src = src.indexOf("\r") === -1 ? src : src.replace(miscRules.carriageReturn, "\n");
    this.blockTokens(src, this.tokens);
    // Inline passes run only after every block has been tokenized, so link
    // definitions gathered anywhere in the document are already visible.
    for (let i = 0; i < this.inlineQueue.length; i++) {
      const item = this.inlineQueue[i];
      this.state.inRawBlock = false;
      const s = item.src;
      const prev = this.state.linkParenPossible;
      const prevSrc = this.state.parenSrc, prevHas = this.state.parenHas;
      if (prev) { this.state.parenSrc = s; this.state.parenHas = -1; }
      const masked = this.frameUp(s);
      try {
        this.inlineLoop(s, masked, item.tokens);
      } finally { popMaskFrame(); }
      this.state.linkParenPossible = prev;
      this.state.parenSrc = prevSrc; this.state.parenHas = prevHas;
    }
    this.inlineQueue = [];
    return this.tokens;
  }

  // Fold a just-matched token into the trailing text-bearing token so lazy
  // continuations merge instead of piling up. wantParagraph / wantText select
  // which neighbor types may absorb; textPayload joins the text field (raw
  // and text differ for definitions); dropQueue discards the fresh token's
  // own queued inline pass. Returns true when the fold happened.
  foldIntoPrevious(list, wantParagraph, wantText, raw, textPayload, dropQueue) {
    const last = list[list.length - 1];
    if (!last) return false;
    const absorbs = last.type === "paragraph" ? wantParagraph : last.type === "text" ? wantText : false;
    if (!absorbs) return false;
    last.raw += (last.raw.endsWith("\n") ? "" : "\n") + raw;
    last.text += "\n" + textPayload;
    if (dropQueue) this.inlineQueue.pop();
    this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
    return true;
  }

  blockTokens(src, t = [], top = false) {
    let shortest = Infinity;
    // Distance-from-end caches. The source shrinks from the left, so a
    // feature's distance from the END never changes between iterations:
    // compute it lazily once, with Infinity meaning "known absent".
    let newlineKnown = false, newlineFromEnd = Infinity;   // last "\n"
    let setextKnown = false, setextFromEnd = Infinity;     // last setext underline
    const tk = this.tokenizer;
    while (src) {
      if (src.length < shortest) shortest = src.length;
      else { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
      let r;
      // First-character gates: every block rule is anchored, so a rule whose
      // possible opening characters exclude the current one cannot match.
      const firstCode = src.charCodeAt(0);
      const startsWhitespace = firstCode === 32 || firstCode === 9 || firstCode === 10;
      let i = 0;
      while (i < 3 && src.charCodeAt(i) === 32) i++;
      const probeCode = src.charCodeAt(i); // first char after up to 3 spaces
      if (startsWhitespace && (r = tk.space(src))) {
        src = src.substring(r.raw.length);
        const last = t[t.length - 1];
        if (r.raw.length === 1 && last !== undefined) last.raw += "\n";
        else t.push(r);
        continue;
      }
      if ((firstCode === 32 || firstCode === 9) && (r = tk.code(src))) {
        src = src.substring(r.raw.length);
        if (!this.foldIntoPrevious(t, true, true, r.raw, r.text, false)) t.push(r);
        continue;
      }
      if ((probeCode === 96 || probeCode === 126) && (r = tk.fences(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (probeCode === 35 && (r = tk.heading(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if ((probeCode === 45 || probeCode === 95 || probeCode === 42) && (r = tk.hr(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (probeCode === 62 && (r = tk.blockquote(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if ((probeCode === 42 || probeCode === 43 || probeCode === 45 || (probeCode >= 48 && probeCode <= 57)) && (r = tk.list(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (probeCode === 60 && (r = tk.html(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (probeCode === 91 && (r = tk.def(src))) {
        src = src.substring(r.raw.length);
        if (!this.foldIntoPrevious(t, true, true, r.raw, r.raw, false)) {
          // The first definition seen for a label wins; later ones are dropped.
          if (!this.tokens.links[r.tag]) this.tokens.links[r.tag] = { href: r.href, title: r.title };
          this.hasLinks = true;
          t.push(r);
        }
        continue;
      }
      let nlIdx = -1;
      if (firstCode !== 10) {
        if (!newlineKnown) {
          const lastNl = src.lastIndexOf("\n");
          newlineKnown = true;
          newlineFromEnd = lastNl === -1 ? Infinity : src.length - lastNl;
        }
        nlIdx = newlineFromEnd < src.length ? src.length - newlineFromEnd : -1;
      }
      // Tables and setext headings both need a newline somewhere ahead.
      if (nlIdx !== -1 && (r = tk.table(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      let hasSetext = false;
      if (nlIdx !== -1) {
        if (!setextKnown) { setextKnown = true; setextFromEnd = lastSetextGap(src); }
        hasSetext = setextFromEnd < src.length;
      }
      if (hasSetext && (r = tk.lheading(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (this.state.top && firstCode !== 10 && (r = tk.paragraph(src))) {
        if (!(top && this.foldIntoPrevious(t, true, false, r.raw, r.text, true))) t.push(r);
        top = false;
        src = src.substring(r.raw.length);
        continue;
      }
      if (firstCode !== 10 && (r = tk.text(src))) {
        src = src.substring(r.raw.length);
        if (!this.foldIntoPrevious(t, false, true, r.raw, r.text, true)) t.push(r);
        continue;
      }
      if (src) { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
    }
    this.state.top = true;
    return t;
  }

  inline(src, tokens = []) {
    this.inlineQueue.push({ src, tokens });
    return tokens;
  }

  // Does this text contain a link that will actually render as one? Used by
  // the masker to decide whether a "[label][ref]" construct resolves through
  // the link table (and therefore hides its label from emphasis matching).
  hasActualLink(src) {
    if (!src.includes("[")) return false;
    const linkRule = inlineRules.link;
    for (const m of src.matchAll(inlineRules.blockSkip)) {
      if (linkRule.test(m[0]) && src.charAt(m.index - 1) !== "!") return true;
    }
    for (const m of src.matchAll(inlineRules.reflinkSearch)) {
      const s = m[0];
      const r = s.lastIndexOf("[");
      if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, normalizeLabel(s.slice(r + 1, -1)))) && !(r > 1 && this.hasActualLink(s.slice(1, r - 1)))) return true;
    }
    return false;
  }

  inlineTokens(src, tokens = []) {
    const prev = this.state.linkParenPossible;
    const prevSrc = this.state.parenSrc, prevHas = this.state.parenHas;
    if (prev) { this.state.parenSrc = src; this.state.parenHas = -1; }
    try {
      const masked = this.frameUp(src);
      try {
        return this.inlineLoop(src, masked, tokens);
      } finally { popMaskFrame(); }
    } finally {
      this.state.linkParenPossible = prev;
      this.state.parenSrc = prevSrc; this.state.parenHas = prevHas;
    }
  }

  inlineLoop(src, masked, tokens) {
    let carryPrevChar = false;
    let prevChar = "";
    let shortest = Infinity;
    let sawAt = -1; // lazily computed: 1 when an "@" remains in the chunk, else 0
    const tk = this.tokenizer;
    const links = this.tokens.links;
    const st = this.state;
    while (src) {
      if (src.length < shortest) shortest = src.length;
      else { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
      // prevChar survives across iterations only while plain text keeps
      // flowing; any other token invalidates it.
      if (!carryPrevChar) prevChar = "";
      carryPrevChar = false;
      const c0 = src.charCodeAt(0);
      let tok;
      // One bitmask lookup gates the rule attempts below: a rule whose first
      // character cannot match is skipped without ever touching its regex.
      const bits = c0 < 128 ? INLINE_DISPATCH[c0] : 0;
      if (bits !== 0) {
        if ((bits & 1) && (tok = tk.escape(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 2) && (tok = tk.tag(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 4) && (tok = tk.link(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 4) && (tok = tk.reflink(src, links))) {
          src = src.substring(tok.raw.length);
          const last = tokens[tokens.length - 1];
          if (tok.type === "text" && last?.type === "text") { last.raw += tok.raw; last.text += tok.text; }
          else tokens.push(tok);
          continue;
        }
        if ((bits & 8) && (tok = tk.emStrong(src, masked, prevChar))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 16) && (tok = tk.codespan(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 32) && (tok = tk.br(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 64) && (tok = tk.del(src, masked, prevChar))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        if ((bits & 2) && (tok = tk.autolink(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
      }
      if (!st.inLink && URL_LEAD_CLASS[c0]) {
        // 1 = a possible scheme/www/mailto/xmpp lead — always try the URL
        //     rule; 2 = an email-local lead — only when an "@" lies ahead
        if (URL_LEAD_CLASS[c0] === 1) {
          if ((tok = tk.url(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        } else {
          if (sawAt === -1) sawAt = src.includes("@") ? 1 : 0;
          if (sawAt === 1 && (tok = tk.url(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        }
      }
      if (tok = tk.inlineText(src)) {
        src = src.substring(tok.raw.length);
        const lc = tok.raw.length ? tok.raw.charAt(tok.raw.length - 1) : "";
        if (lc !== "_") prevChar = lc;
        carryPrevChar = true;
        const last = tokens[tokens.length - 1];
        if (last?.type === "text") { last.raw += tok.raw; last.text += tok.text; }
        else tokens.push(tok);
        continue;
      }
      if (src) { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
    }
    return tokens;
  }

  // Build the masked twin of a chunk: resolved link labels, code spans and
  // html tags are overwritten with filler characters of the same length so
  // emphasis matching cannot mistake their insides for delimiters.
  maskSrc(src) {
    let t = src;
    // None of the masking patterns can match without ` \ [ or <.
    if (!maskTriggerProbe.test(t)) return t;
    if (this.hasLinks && t.includes("[")) {
      const reflinkSearch = inlineRules.reflinkSearch;
      const replacer = (r) => {
        const o = r.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, normalizeLabel(r.slice(o + 1, -1)))) return r;
        if (o > 1 && r.charAt(0) !== "!") {
          const inner = r.slice(1, o - 1);
          if (this.hasActualLink(inner)) return "[" + inner.replace(reflinkSearch, replacer) + "][" + "a".repeat(r.length - o - 2) + "]";
        }
        return "[" + "a".repeat(r.length - 2) + "]";
      };
      t = t.replace(reflinkSearch, replacer);
    }
    // escaped punctuation outside code spans turns into "+" filler
    const hasBacktick = t.includes("`");
    if (hasBacktick || t.includes("\\")) {
      t = t.replace(inlineRules.anyPunctuationOutsideCode, (n, s, r) => {
        if (r) return "+".repeat(n.length);
        if (s) return s + n.slice(s.length, -s.length).replace(/`/g, "+") + s;
        return n;
      });
    }
    // whole links, code spans and tags collapse to "[aaa…]"
    if (hasBacktick || t.includes("<") || (t.includes("[") && t.includes("("))) {
      t = t.replace(inlineRules.blockSkip, (n, s, r) => {
        const o = r ? r.length : 0;
        return n.slice(0, o) + "[" + "a".repeat(n.length - o - 2) + "]";
      });
    }
    return t;
  }
}

// ---------- renderer / parser ----------

// One method per token type; each returns the HTML fragment for that token.
// The renderer holds no state beyond its parser reference.
class Renderer {
  constructor(parser) { this.parser = parser; }
  space() { return ""; }
  code({ text, lang }) {
    const s = (lang || "").match(miscRules.notSpaceStart)?.[0];
    const r = text ? text.replace(miscRules.endingNewline, "") + "\n" : "";
    return s
      ? '<pre><code class="language-' + escapeHtml(s) + '">' + escapeHtml(r, true) + "</code></pre>\n"
      : "<pre><code>" + escapeHtml(r, true) + "</code></pre>\n";
  }
  blockquote({ tokens }) { return "<blockquote>\n" + this.parser.parse(tokens) + "</blockquote>\n"; }
  html({ text }) { return text; }
  def() { return ""; }
  heading({ tokens, depth }) { return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>\n`; }
  hr() { return "<hr>\n"; }
  list(e) {
    const { ordered, start } = e;
    let s = "";
    for (let i = 0; i < e.items.length; i++) s += this.listitem(e.items[i]);
    const tag = ordered ? "ol" : "ul";
    const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : "";
    return "<" + tag + startAttr + ">\n" + s + "</" + tag + ">\n";
  }
  listitem(e) { return `<li>${this.parser.parse(e.tokens)}</li>\n`; }
  checkbox({ checked }) { return "<input " + (checked ? 'checked="" ' : "") + 'disabled="" type="checkbox"> '; }
  paragraph({ tokens }) { return `<p>${this.parser.parseInline(tokens)}</p>\n`; }
  table(e) {
    let head = "";
    let cell = "";
    for (let i = 0; i < e.header.length; i++) cell += this.tablecell(e.header[i]);
    head += this.tablerow({ text: cell });
    let body = "";
    for (let i = 0; i < e.rows.length; i++) {
      const row = e.rows[i];
      cell = "";
      for (let j = 0; j < row.length; j++) cell += this.tablecell(row[j]);
      body += this.tablerow({ text: cell });
    }
    if (body) body = `<tbody>${body}</tbody>`;
    return `<table>\n<thead>\n${head}</thead>\n${body}</table>\n`;
  }
  tablerow({ text }) { return `<tr>\n${text}</tr>\n`; }
  tablecell(e) {
    const t = this.parser.parseInline(e.tokens);
    const n = e.header ? "th" : "td";
    return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>\n`;
  }
  strong({ tokens }) { return `<strong>${this.parser.parseInline(tokens)}</strong>`; }
  em({ tokens }) { return `<em>${this.parser.parseInline(tokens)}</em>`; }
  codespan({ text }) { return `<code>${escapeHtml(text, true)}</code>`; }
  br() { return "<br>"; }
  del({ tokens }) { return `<del>${this.parser.parseInline(tokens)}</del>`; }
  link({ href, title, text, tokens, autolink }) {
    const o = autolink ? escapeHtml(text, true) : this.parser.parseInline(tokens);
    const i = sanitizeHref(href);
    if (i === null) return o;
    href = escapeHtml(i, autolink);
    let l = '<a href="' + href + '"';
    if (title) l += ' title="' + escapeHtml(title) + '"';
    l += ">" + o + "</a>";
    return l;
  }
  image({ href, title, text, tokens }) {
    let n = text;
    if (tokens) n = this.parser.parseInline(tokens, this.parser.textRenderer);
    const r = sanitizeHref(href);
    if (r === null) return escapeHtml(n);
    href = r;
    let o = `<img src="${escapeHtml(href)}" alt="${escapeHtml(n)}"`;
    if (title) o += ` title="${escapeHtml(title)}"`;
    o += ">";
    return o;
  }
  text(e) {
    if ("tokens" in e && e.tokens) return this.parser.parseInline(e.tokens);
    if ("escaped" in e && e.escaped) return e.text;
    return escapeHtml(e.text);
  }
}

// Renders tokens to plain text for link and image alt attributes: every
// construct collapses to its textual content and nothing is escaped.
class AltTextRenderer {
  constructor(parser) { this.parser = parser; }
  strong({ text, tokens }) { return tokens ? this.parser.parseInline(tokens, this) : text; }
  em({ text, tokens }) { return tokens ? this.parser.parseInline(tokens, this) : text; }
  codespan({ text }) { return text; }
  del({ text, tokens }) { return tokens ? this.parser.parseInline(tokens, this) : text; }
  html({ text }) { return text; }
  text({ text }) { return text; }
  link({ text, tokens }) { return tokens ? this.parser.parseInline(tokens, this) : text; }
  image({ text, tokens }) { return tokens ? this.parser.parseInline(tokens, this) : text; }
  br() { return ""; }
  checkbox({ raw }) { return raw; }
}

// Drives the renderers: walks a token list and dispatches each token to the
// method named after its type.
class Parser {
  constructor() {
    this.renderer = new Renderer(this);
    this.textRenderer = new AltTextRenderer(this);
  }
  parse(tokens) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      switch (tok.type) {
        case "space": out += this.renderer.space(tok); break;
        case "hr": out += this.renderer.hr(tok); break;
        case "heading": out += this.renderer.heading(tok); break;
        case "code": out += this.renderer.code(tok); break;
        case "table": out += this.renderer.table(tok); break;
        case "blockquote": out += this.renderer.blockquote(tok); break;
        case "list": out += this.renderer.list(tok); break;
        case "checkbox": out += this.renderer.checkbox(tok); break;
        case "html": out += this.renderer.html(tok); break;
        case "def": out += this.renderer.def(tok); break;
        case "paragraph": out += this.renderer.paragraph(tok); break;
        case "text": out += this.renderer.text(tok); break;
        default: throw new Error('Token with "' + tok.type + '" type was not found.');
      }
    }
    return out;
  }
  parseInline(tokens, renderer = this.renderer) {
    let out = "";
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      switch (tok.type) {
        case "escape": out += renderer.text(tok); break;
        case "html": out += renderer.html(tok); break;
        case "link": out += renderer.link(tok); break;
        case "image": out += renderer.image(tok); break;
        case "checkbox": out += renderer.checkbox(tok); break;
        case "strong": out += renderer.strong(tok); break;
        case "em": out += renderer.em(tok); break;
        case "codespan": out += renderer.codespan(tok); break;
        case "br": out += renderer.br(tok); break;
        case "del": out += renderer.del(tok); break;
        case "text": out += renderer.text(tok); break;
        default: throw new Error('Token with "' + tok.type + '" type was not found.');
      }
    }
    return out;
  }
}

// ---------- cheap prefilters ----------
// The heavy grammar regexes are all anchored, so a quick charCode glance can
// veto a rule before its regex ever runs. Every gate below is a necessary
// condition for its rule: a veto can never change which rule eventually
// matches, only how soon the losers give up.

// Gap between the end of the source and the newline that precedes the last
// candidate setext underline (up to 3 spaces then "=" or "-"); Infinity when
// no candidate exists. Scans newlines from the right, stopping at the first
// hit.
function lastSetextGap(s) {
  let g = s.lastIndexOf("\n");
  while (g !== -1) {
    let j = g + 1, k = 0;
    while (k < 3 && s.charCodeAt(j + k) === 32) k++;
    const cc = s.charCodeAt(j + k);
    if (cc === 61 || cc === 45) return s.length - g;
    g = s.lastIndexOf("\n", g - 1);
  }
  return Infinity;
}
const nonWhitespaceProbe = /\S/;  // true when trim() would leave anything behind
const emphasisProbe = /[*_~]/;    // one scan rules out the whole emphasis family
// Leading-character classes for the bare-URL attempt in the inline loop:
//   1 — h/f/w/m/x in either case: a possible http/ftp/www/mailto/xmpp start,
//       the URL rule is always worth trying
//   2 — a legal first character of an email local part: tried only when an
//       "@" still lies ahead in the same chunk
const URL_LEAD_CLASS = new Uint8Array(128);
for (const c of "hHfFwWmMxX") URL_LEAD_CLASS[c.charCodeAt(0)] = 1;
for (let c = 97; c <= 122; c++) if (!URL_LEAD_CLASS[c]) URL_LEAD_CLASS[c] = 2;
for (let c = 65; c <= 90; c++) if (!URL_LEAD_CLASS[c]) URL_LEAD_CLASS[c] = 2;
for (let c = 48; c <= 57; c++) URL_LEAD_CLASS[c] = 2;
URL_LEAD_CLASS[46] = 2; URL_LEAD_CLASS[95] = 2; URL_LEAD_CLASS[43] = 2; URL_LEAD_CLASS[45] = 2;
// Bitmask dispatch for the inline loop, indexed by the chunk's first char:
//   1 escape "\" · 2 tag/autolink "<" · 4 link or reference "[ !"
//   8 emphasis "*_" · 16 code span "`" · 32 line break " \" · 64 delete "~"
// A set bit only opens an attempt; the tokenizer order below is untouched,
// so skipping impossible rules cannot change what matches.
const INLINE_DISPATCH = new Uint8Array(128);
INLINE_DISPATCH[92] = 1 | 32;
INLINE_DISPATCH[60] = 2;
INLINE_DISPATCH[91] = 4; INLINE_DISPATCH[33] = 4;
INLINE_DISPATCH[42] = 8; INLINE_DISPATCH[95] = 8;
INLINE_DISPATCH[96] = 16;
INLINE_DISPATCH[32] = 32;
INLINE_DISPATCH[126] = 64;
// The masking pass can only be triggered by backticks, backslashes, "[" or
// "<"; a chunk containing none of them skips the pass outright.
const maskTriggerProbe = /[`\\[<]/;

// ---------- shared utilities ----------

// True when the source ends with two blank lines — the pattern
// /\n[ \t]*\n[ \t]*$/ — verified by walking backwards, so the cost tracks the
// trailing whitespace rather than the whole string.
function endsWithTwoBlanks(s) {
  let i = s.length - 1;
  while (i >= 0) { const c = s.charCodeAt(i); if (c === 32 || c === 9) i--; else break; }
  if (i < 0 || s.charCodeAt(i) !== 10) return false;
  i--;
  while (i >= 0) { const c = s.charCodeAt(i); if (c === 32 || c === 9) i--; else break; }
  return i >= 0 && s.charCodeAt(i) === 10;
}

// Expand a line's leading whitespace run with tabs blown out to the 4-column
// grid anchored at colOffset. A run made only of spaces is already its own
// expansion, so the string is rebuilt only when a tab is actually present.
function expandLineIndent(line, colOffset) {
  let i = 0;
  const n = line.length;
  while (i < n) { const c = line.charCodeAt(i); if (c === 32 || c === 9) i++; else break; }
  if (i === 0) return line;
  const lead = line.slice(0, i);
  if (lead.indexOf("\t") === -1) return line;
  return expandTabs(lead, colOffset) + line.slice(i);
}

const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(str, encodeAmp) {
  const probe = encodeAmp ? miscRules.escapeTest : miscRules.escapeTestNoEncode;
  if (!probe.test(str)) return str;
  return str.replace(encodeAmp ? miscRules.escapeReplace : miscRules.escapeReplaceNoEncode, ch => ESCAPE_MAP[ch]);
}

// Decode &#NN; / &#xHH; references and defuse bare ampersands, exactly as
// marked's numeric-character-reference pass does. Out-of-range and surrogate
// code points become U+FFFD; a lone "&" re-escapes to "&amp;".
function resolveNumericRefs(str) {
  if (!miscRules.numericCharacterReference.test(str)) return str;
  return str.replace(miscRules.numericCharacterReferenceOrAmpersand, (m, dec, hex) => {
    if (dec === undefined && hex === undefined) return "&amp;";
    const cp = dec === undefined ? parseInt(hex, 16) : parseInt(dec, 10);
    return cp === 0 || cp > 1114111 || (cp >= 55296 && cp <= 57343) ? "\uFFFD" : cp === 38 ? "&amp;" : String.fromCodePoint(cp);
  });
}

// Percent-encode an href for attribute use. encodeURI throws on malformed
// URIs; the null return tells the caller to fall back to plain text.
function sanitizeHref(href) {
  try { href = encodeURI(href).replace(miscRules.percentDecode, "%"); } catch { return null; }
  return href;
}

// Split a table row on its unescaped pipes, then pad or trim the cells to the
// header's column count.
function splitTableRow(row, count) {
  let t = row.replace(miscRules.findPipe, (m, off, str) => {
    let escaped = false, p = off;
    while (--p >= 0 && str[p] === "\\") escaped = !escaped;
    return escaped ? "|" : " |";
  });
  const cells = t.split(miscRules.splitPipe);
  if (cells[0].trim() || cells.shift(), cells.length > 0 && !(cells[cells.length - 1] || "").trim() && cells.pop(), count) {
    if (cells.length > count) cells.splice(count);
    else while (cells.length < count) cells.push("");
  }
  for (let i = 0; i < cells.length; i++) cells[i] = cells[i].trim().replace(miscRules.slashPipe, "|");
  return cells;
}

// Strip trailing occurrences of a character from the right end. With
// respectTrailing set the sense flips — strip until the character appears.
function trimCharRight(str, cutChar, respectTrailing) {
  const len = str.length;
  if (len === 0) return "";
  const code = cutChar.charCodeAt(0);
  let i = 0;
  while (i < len) {
    const isCut = str.charCodeAt(len - i - 1) === code;
    if (isCut === !respectTrailing) i++;
    else break;
  }
  return str.slice(0, len - i);
}

// Cut a run of trailing blank lines back to at most one: when more than a
// single blank line follows the last non-blank line, everything past that
// line is dropped.
function dropTrailingBlankLines(src) {
  const lines = src.split("\n");
  let i = lines.length - 1;
  while (i >= 0 && miscRules.blankLine.test(lines[i])) i--;
  return lines.length - i <= 2 ? src : lines.slice(0, i + 1).join("\n");
}

// Collapse whitespace and case-fold a link label into its lookup key; the
// lower→upper→lower round trip performs the Unicode fold marked relies on.
function normalizeLabel(str) {
  return str.trim().replace(miscRules.multipleSpaceGlobal, " ").toLowerCase().toUpperCase().toLowerCase();
}

// Find the first closing bracket with no matching opener, honoring backslash
// escapes. -1 when every bracket closes; -2 when an opener dangles.
function findOrphanClose(str, pair) {
  if (str.indexOf(pair[0]) === -1 && str.indexOf(pair[1]) === -1) return -1;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") i++;
    else if (str[i] === pair[0]) depth++;
    else if (str[i] === pair[1] && (--depth, depth < 0)) return i;
  }
  return depth > 0 ? -2 : -1;
}

// Replace tabs with spaces on the 4-column grid, starting at column `offset`.
function expandTabs(str, offset = 0) {
  let col = offset, out = "";
  for (const ch of str) {
    if (ch === "\t") { const r = 4 - col % 4; out += " ".repeat(r); col += r; }
    else { out += ch; col++; }
  }
  return out;
}

// code-point helpers that never allocate a split array
function countCodePoints(s) { let n = 0; for (const _ of s) n++; return n; }
function leadCodeUnitWidth(s) { const c = s.codePointAt(0); return c > 0xFFFF ? 2 : 1; }
// the first line of a string, without splitting it
function upToNewline(s) { const i = s.indexOf("\n"); return i === -1 ? s : s.slice(0, i); }

// ---------- per-line block-shape probes (list walker) ----------
// Each probe below is the charCode twin of an anchored `^ {0,n}<shape>` rule
// tested against one newline-free line; n is the same indent bound the
// memoized regex builders clamp to. Walking list lines this way keeps the
// regex engine out of the list hot path entirely.

// index just past a run of at most n leading spaces
function indentEnd(line, n) {
  let i = 0;
  while (i < n && line.charCodeAt(i) === 32) i++;
  return i;
}

function startsListItem(line, n) {
  const i = indentEnd(line, n);
  let c = line.charCodeAt(i);
  let j;
  if (c >= 48 && c <= 57) {           // ordered marker: up to 9 digits, then "." or ")"
    j = i + 1;
    while (j < line.length && (c = line.charCodeAt(j)) >= 48 && c <= 57 && j - i < 9) j++;
    if (c !== 46 && c !== 41) return false;
    j++;
  } else {                            // bullet marker: "*", "+" or "-"
    if (c !== 42 && c !== 43 && c !== 45) return false;
    j = i + 1;
  }
  const after = line.charCodeAt(j);
  return after === 32 || after === 9 || j >= line.length;
}

function isThematicBreak(line, n) {
  const i = indentEnd(line, n);
  const c = line.charCodeAt(i);
  if (c !== 45 && c !== 95 && c !== 42) return false;
  let k = i + 1, run = 1;
  const len = line.length;
  while (k < len) {
    const d = line.charCodeAt(k);
    if (d === c) { run++; k++; }
    else if (d === 32 || d === 9) k++;
    else return false;
  }
  return run >= 3;
}

function opensFence(line, n) {
  const i = indentEnd(line, n);
  const c = line.charCodeAt(i);
  if (c !== 96 && c !== 126) return false;
  return line.charCodeAt(i + 1) === c && line.charCodeAt(i + 2) === c;
}

function opensAtxHeading(line, n) {
  const i = indentEnd(line, n);
  if (line.charCodeAt(i) !== 35) return false;
  let k = i + 1;
  const len = line.length;
  while (k < len && line.charCodeAt(k) === 35) k++;
  if (k - i > 6) return false;
  if (k >= len) return true;
  const c = line.charCodeAt(k);
  // "\s" in the grammar rule spans every Unicode space, not just " " and "\t"
  return c === 32 || c === 9 || (c >= 9 && c <= 13) || c === 0xA0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200A)
    || c === 0x2028 || c === 0x2029 || c === 0x202F || c === 0x205F || c === 0x3000 || c === 0xFEFF;
}

function opensQuote(line, n) {
  return line.charCodeAt(indentEnd(line, n)) === 62;
}

// Emphasis matching runs on a "masked" copy of the chunk — code spans, links
// and tags blanked out — and repeatedly needs the last usable closer run.
// Returns the start of the last run of `code` whose preceding character is
// not whitespace, or -1 when there is none.
function lastCloserStart(s, code) {
  const len = s.length;
  let start = s.indexOf(String.fromCharCode(code));
  let last = -1;
  while (start !== -1) {
    let i = start + 1;
    while (i < len && s.charCodeAt(i) === code) i++;
    const prev = start === 0 ? 10 : s.charCodeAt(start - 1);
    if (prev !== 32 && prev !== 9 && prev !== 10 && prev !== 13 && prev !== 12) last = start;
    if (i >= len) break;
    start = s.indexOf(String.fromCharCode(code), i);
  }
  return last;
}

// A "<" inside a link label counts as markup only when, at the same offset in
// the raw source, it opens an html tag or autolink reaching past the end of
// the label — such a label cannot serve as link text. maskLen is the "!" and
// "[" the caller's match has already consumed.
function tagSpansPastLabel(src, text, maskLen) {
  if (!text.includes("<")) return false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") { i++; continue; }
    if (text[i] === "`") {
      const m = inlineRules.code.exec(text.slice(i));
      if (m) { i += m[0].length - 1; continue; }
    }
    if (text[i] !== "<") continue;
    const r = src.slice(maskLen + i);
    const m = inlineRules.tag.exec(r) || inlineRules.autolink.exec(r);
    if (m) {
      if (m[0].length > text.length - i) return true;
      i += m[0].length - 1;
    }
  }
  return false;
}

// Fenced code: take up to as many leading spaces off each line as the opening
// fence had.
function stripFenceIndent(fenceRaw, text) {
  const indentMatch = fenceRaw.match(miscRules.indentCodeCompensation);
  if (indentMatch === null) return text;
  const s = indentMatch[1];
  return text.split("\n").map(r => {
    const m = r.match(miscRules.beginningSpace);
    if (m === null) return r;
    return r.slice(Math.min(m[0].length, s.length));
  }).join("\n");
}

// Shared tail of the link and reflink tokenizers: tokenize the label under a
// fresh inLink state. A label that itself produced an <a> may not nest inside
// another link — the linkEmitted flag carries that verdict back out, and the
// raw-block state rides along so the nested call cannot leak its changes.
function buildLinkToken(match, link, raw, lexer) {
  const href = link.href, title = link.title || null;
  const text = match[1].replace(miscRules.outputLinkReplace, "$1");
  const isImage = match[0].charAt(0) === "!";
  const prevInLink = lexer.state.inLink, prevEmitted = lexer.state.linkEmitted, prevRaw = lexer.state.inRawBlock;
  lexer.state.inLink = true;
  lexer.state.linkEmitted = false;
  const tokens = lexer.inlineTokens(text);
  const emitted = lexer.state.linkEmitted;
  lexer.state.linkEmitted = prevEmitted;
  lexer.state.inLink = prevInLink;
  if (!isImage) {
    if (emitted) { lexer.state.inRawBlock = prevRaw; return; }
    lexer.state.linkEmitted = true;
  }
  return { type: isImage ? "image" : "link", raw, href, title, text, tokens };
}

// ---------- mask frames ----------
// While emphasis matching unwinds nested chunks, the masked source and its
// closer positions are consulted again and again. marked caches closers in a
// WeakMap keyed by tokenizer; one tokenizer serves this whole parser, so a
// plain stack of frames does the same job. Closer runs are computed lazily —
// most chunks never ask for any of them, which turns three eager scans per
// mask into zero.
let maskFrames = [];

function pushMaskFrame(masked) { maskFrames.push({ maskedSrc: masked, c42: null, c95: null, c126: null }); }
function pushInertFrame(src) { maskFrames.push({ maskedSrc: src, c42: -1, c95: -1, c126: -1 }); }
function popMaskFrame() { maskFrames.pop(); }

function emCloserIndex(maskedSrc, ch) {
  const frame = maskFrames[maskFrames.length - 1];
  if (frame && frame.maskedSrc === maskedSrc) {
    if (ch === "*") return frame.c42 !== null ? frame.c42 : (frame.c42 = lastCloserStart(maskedSrc, 42));
    return frame.c95 !== null ? frame.c95 : (frame.c95 = lastCloserStart(maskedSrc, 95));
  }
  return lastCloserStart(maskedSrc, ch === "*" ? 42 : 95);
}

function delCloserIndex(maskedSrc) {
  const frame = maskFrames[maskFrames.length - 1];
  if (frame && frame.maskedSrc === maskedSrc) return frame.c126 !== null ? frame.c126 : (frame.c126 = lastCloserStart(maskedSrc, 126));
  return lastCloserStart(maskedSrc, 126);
}

// ---------- public API ----------

// Render a Markdown document to HTML — byte-identical to marked 18.1.3 with
// default options. Every call is independent: fresh lexer, fresh parser, and
// any mask frames left behind by an earlier exception are discarded.
export function parse(markdown) {
  maskFrames.length = 0;
  const lexer = new Lexer();
  const tokens = lexer.lex(markdown);
  return new Parser().parse(tokens);
}

// The lexing stage is exported for standalone use.
export { Lexer };
