// parse.js — dependency-free reimplementation of marked 18.1.3
// (defaults: gfm:true, breaks:false, pedantic:false, async:false)
// Faithful port of marked's lexer/tokenizer/renderer for byte-exact output.

const RULES = {"block":{"blockquote":{"s":"^( {0,3}> ?(?:(?![ \\t]*(?:\\n|$))(([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|\\d{1,9}[.)])(?:[ \\t]|\\n|$)| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)|[ \\t]+\\n)[^\\n]+)*))|[^\\n]*)(?:\\n|$))+","f":""},"code":{"s":"^((?: {4}| {0,3}\\t)[^\\n]+(?:\\n(?:[ \\t]*(?:\\n|$))*)?)+","f":""},"def":{"s":"^ {0,3}\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]: *(?:\\n[ \\t]*)?([^<\\s][^\\s]*|<.*?>)(?:(?: +(?:\\n[ \\t]*)?| *\\n[ \\t]*)((?:\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\\\n]|\\n(?!\\n))*'|\\((?:\\\\[\\s\\S]|[^()\\\\])*\\))))? *(?:\\n+|$)","f":""},"fences":{"s":"^ {0,3}(`{3,}(?=[^`\\n]*(?:\\n|$))|~{3,})([^\\n]*)(?:\\n|$)(?:|([\\s\\S]*?)(?:\\n|$))(?: {0,3}(?:(?=`)\\1`*|(?=~)\\1~*) *(?=\\n|$)|$)","f":""},"heading":{"s":"^ {0,3}(#{1,6})(?=\\s|$)(.*)(?:\\n+|$)","f":""},"hr":{"s":"^ {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)","f":""},"html":{"s":"^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:<\\/\\1>[^\\n]*\\n*|$)|<!--(?:-?>|[\\s\\S]*?(?:-->|$))[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|<\\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \\t]+|\\n|\\/?>|$)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?: +[a-zA-Z:_][\\w.:-]*(?: *= *\"[^\"\\n]*\"| *= *'[^'\\n]*'| *= *[^\\s\"'=<>`]+)?)*? *\\/?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<\\/[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))","f":"i"},"lheading":{"s":"^(?! {0,3}(?:[*+-]|\\d{1,9}[.)]) |(?: {4}| {0,3}\\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n)((?:.|\\n(?!\\s*?\\n| {0,3}(?:[*+-]|\\d{1,9}[.)]) | {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}(?:(?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n))+?)\\n {0,3}(=+|-+)[ \\t]*(?:\\n+|$)","f":""},"list":{"s":"^( {0,3}(?:[*+-]|\\d{1,9}[.)]))([ \\t][^\\n]*?)?(?:\\n|$)","f":""},"newline":{"s":"^(?:[ \\t]*(?:\\n|$))+","f":""},"paragraph":{"s":"^([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)| *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)|[ \\t]+\\n)[^\\n]+)*)","f":""},"table":{"s":"^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)","f":""},"text":{"s":"^[^\\n]+","f":""}},"inline":{"_backpedal":{"s":"(?:[^?!.,:;*_'\"~()&]+|\\([^)]*\\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'\"~)]+(?!$))+","f":""},"anyPunctuation":{"s":"\\\\([\\p{P}\\p{S}])","f":"gu"},"anyPunctuationOutsideCode":{"s":"(`+)(?:[^`]|[^`][\\s\\S]*?[^`])\\1(?!`)|`+|\\\\([\\p{P}\\p{S}])","f":"gu"},"autolink":{"s":"^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\\s\\x00-\\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>","f":""},"blockSkip":{"s":"\\[(?:[^\\[\\]`]|(?<a>`+)[^`]+\\k<a>(?!`))*?\\]\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)]|\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)])*\\))*\\)|(?<!`)()(?<b>`+)[^`]+\\k<b>(?!`)|<(?! )[^<>]*?>","f":"g"},"br":{"s":"^( {2,}|\\\\)\\n(?!\\s*$)[ \\t]*","f":""},"code":{"s":"^(`+)([^`]|[^`][\\s\\S]*?[^`])\\1(?!`)","f":""},"del":{"s":"^(~~?)(?=[^\\s~])((?:\\\\[\\s\\S]|[^\\\\])*?(?:\\\\[\\s\\S]|[^\\s~\\\\]))\\1(?=[^~]|$)","f":""},"delLDelim":{"s":"^~~?(?:((?!~)[\\p{P}\\p{S}])|[^\\s~])","f":"u"},"delRDelim":{"s":"^[^~]+(?=[^~])|(?!~)[\\p{P}\\p{S}](~~?)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](~~?)(?!~)(?=[\\s\\p{P}\\p{S}]|$)|(?!~)[\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])|[\\s](~~?)(?!~)(?=[\\p{P}\\p{S}])|(?!~)[\\p{P}\\p{S}](~~?)(?!~)(?=[\\p{P}\\p{S}])|[^\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])","f":"gu"},"emStrongLDelim":{"s":"^(?:\\*+(?:((?!\\*)(?!~)[\\p{P}\\p{S}])|([^\\s*]))?)|^_+(?:((?!_)(?!~)[\\p{P}\\p{S}])|([^\\s_]))?","f":"u"},"emStrongRDelimAst":{"s":"^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?=[\\s]|$)|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?!\\*)(?=(?!~)[\\s\\p{P}\\p{S}]|$)|(?!\\*)(?!~)[\\s\\p{P}\\p{S}](\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))|[\\s](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))","f":"gu"},"emStrongRDelimUnd":{"s":"^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)[\\p{P}\\p{S}](_+)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](_+)(?!_)(?=[\\s\\p{P}\\p{S}]|$)|(?!_)[\\s\\p{P}\\p{S}](_+)(?=[^\\s\\p{P}\\p{S}])|[\\s](_+)(?!_)(?=[\\p{P}\\p{S}])|(?!_)[\\p{P}\\p{S}](_+)(?!_)(?=[\\p{P}\\p{S}])","f":"gu"},"escape":{"s":"^\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~])","f":""},"link":{"s":"^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\([ \\t\\n]*(<(?:\\\\.|[^\\n<>\\\\])+>|[^ \\t\\n\\x00-\\x1f]+|(?=\\)))(?:(?:[ \\t]+(?:\\n[ \\t]*)?|\\n[ \\t]*)(\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\])*'|\\((?:\\\\[\\s\\S]|[^)\\\\])*\\)))?[ \\t\\n]*\\)","f":""},"nolink":{"s":"^!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\](?:\\[\\])?","f":""},"punctuation":{"s":"^((?![*_])[\\s\\p{P}\\p{S}])","f":"u"},"reflink":{"s":"^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]","f":""},"reflinkSearch":{"s":"!?\\[((?:[^\\[\\]\\\\`]*(?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\]))){0,999}?[^\\[\\]\\\\`]*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\]|!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\](?:\\[\\])?(?!\\()","f":"g"},"tag":{"s":"^<!--(?:-?>|[\\s\\S]*?-->)|^<\\/[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:\\s+[a-zA-Z:_][\\w.:-]*(?:\\s*=\\s*\"[^\"]*\"|\\s*=\\s*'[^']*'|\\s*=\\s*[^\\s\"'=<>`]+)?)*?\\s*\\/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>","f":""},"text":{"s":"^(?:[^a-zA-Z0-9](?=(?:mailto|xmpp):)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\\n)|(?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@)|[\\s\\S]*?(?:(?=[\\\\<!\\[`*~_]|\\b_|[hH][tT][tT][pP][sS]?|[fF][tT][pP]:\\/\\/|(?<![^\\s*_~(])www\\.|$)|[^ ](?= {2,}\\n)|[^a-zA-Z0-9](?=(?:mailto|xmpp):)|[^a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-](?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@))))","f":""},"url":{"s":"^(?:mailto:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])|xmpp:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])(?:\\/[A-Za-z0-9@.]+)?)|^((?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\\/\\/|www\\.)(?:[a-zA-Z0-9\\-]+\\.?)+[^\\s<]*|^[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])","f":""}},"other":{"codeRemoveIndent":{"s":"^(?: {0,3}\\t| {1,4})","f":"gm"},"outputLinkReplace":{"s":"\\\\([\\[\\]])","f":"g"},"indentCodeCompensation":{"s":"^(\\s+)(?:```)","f":""},"beginningSpace":{"s":"^\\s+","f":""},"endingHash":{"s":"#$","f":""},"startingSpaceChar":{"s":"^ ","f":""},"endingSpaceChar":{"s":" $","f":""},"endingSpaceTabChar":{"s":"[ \\t]$","f":""},"nonSpaceChar":{"s":"[^ ]","f":""},"newLineCharGlobal":{"s":"\\n","f":"g"},"tabCharGlobal":{"s":"\\t","f":"g"},"leadingSpaceTab":{"s":"^[ \\t]+","f":""},"multipleSpaceGlobal":{"s":"\\s+","f":"g"},"blankLine":{"s":"^[ \\t]*$","f":""},"doubleBlankLine":{"s":"\\n[ \\t]*\\n[ \\t]*$","f":""},"blockquoteStart":{"s":"^ {0,3}>","f":""},"blockquoteSetextReplace":{"s":"\\n {0,3}((?:=+|-+)[ \\t]*)(?=\\n|$)","f":"g"},"blockquoteSetextReplace2":{"s":"^ {0,3}>[ \\t]?","f":"gm"},"blockquoteMarkerWhitespace":{"s":"^( {0,3}>)([ \\t]+)","f":"gm"},"listReplaceNesting":{"s":"^ {1,4}(?=( {4})*[^ ])","f":"g"},"listIsTask":{"s":"^\\[[ xX]\\][ \\t]+\\S","f":""},"listReplaceTask":{"s":"^\\[[ xX]\\][ \\t]+","f":""},"listTaskCheckbox":{"s":"\\[[ xX]\\]","f":""},"anyLine":{"s":"\\n.*\\n","f":""},"hrefBrackets":{"s":"^<(.*)>$","f":""},"tableDelimiter":{"s":"[:|]","f":""},"tableAlignChars":{"s":"^\\||\\| *$","f":"g"},"tableRowBlankLine":{"s":"\\n[ \\t]*$","f":""},"tableAlignRight":{"s":"^ *-+: *$","f":""},"tableAlignCenter":{"s":"^ *:-+: *$","f":""},"tableAlignLeft":{"s":"^ *:-+ *$","f":""},"startATag":{"s":"^<a ","f":"i"},"endATag":{"s":"^<\\/a>","f":"i"},"startPreScriptTag":{"s":"^<(pre|code|kbd|script)(\\s|>)","f":"i"},"endPreScriptTag":{"s":"^<\\/(pre|code|kbd|script)(\\s|>)","f":"i"},"startAngleBracket":{"s":"^<","f":""},"endAngleBracket":{"s":">$","f":""},"pedanticHrefTitle":{"s":"^([^'\"]*[^\\s])\\s+(['\"])(.*)\\2","f":""},"unicodeAlphaNumeric":{"s":"[\\p{L}\\p{N}]","f":"u"},"numericCharacterReference":{"s":"&#(?:(\\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));","f":""},"numericCharacterReferenceOrAmpersand":{"s":"&#(?:(\\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)","f":"g"},"escapeTest":{"s":"[&<>\"']","f":""},"escapeReplace":{"s":"[&<>\"']","f":"g"},"escapeTestNoEncode":{"s":"[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)","f":""},"escapeReplaceNoEncode":{"s":"[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)","f":"g"},"caret":{"s":"(^|[^\\[])\\^","f":"g"},"percentDecode":{"s":"%25","f":"g"},"findPipe":{"s":"\\|","f":"g"},"splitPipe":{"s":" \\|","f":""},"slashPipe":{"s":"\\\\\\|","f":"g"},"carriageReturn":{"s":"\\r\\n|\\r","f":"g"},"spaceLine":{"s":"^ +$","f":"gm"},"notSpaceStart":{"s":"^\\S*","f":""},"endingNewline":{"s":"\\n$","f":""}}};

const block = {}, inline = {}, other = {};
for (const k in RULES.block) block[k] = new RegExp(RULES.block[k].s, RULES.block[k].f);
for (const k in RULES.inline) inline[k] = new RegExp(RULES.inline[k].s, RULES.inline[k].f);
for (const k in RULES.other) other[k] = new RegExp(RULES.other[k].s, RULES.other[k].f);

const BLOCK_TAGS = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";

function memoize(fn) { const c = []; return t => { const n = Math.max(0, Math.min(3, t - 1)); return c[n] || (c[n] = fn(n)); }; }
// listItemRegex cache keyed by bull — only ~5 distinct bulls exist (\*, \+, \-,
// \d{1,9}\., \d{1,9}\)), and list() ran on nearly every dash/digit-starting
// paragraph line, so building a fresh RegExp each time was pure waste.
const listItemRegexCache = new Map();
other.listItemRegex = a => {
  let re = listItemRegexCache.get(a);
  if (re === undefined) { re = new RegExp("^( {0,3}" + a + ")((?:[\t ][^\\n]*)?(?:\\n|$))"); listItemRegexCache.set(a, re); }
  return re;
};
other.nextBulletRegex = memoize(n => new RegExp("^ {0," + n + "}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))"));
other.hrRegex = memoize(n => new RegExp("^ {0," + n + "}((?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\\*[ \t]*){3,})(?:\\n+|$)"));
other.fencesBeginRegex = memoize(n => new RegExp("^ {0," + n + "}(?:```|~~~)"));
other.headingBeginRegex = memoize(n => new RegExp("^ {0," + n + "}#{1,6}(?:\\s|$)"));
other.htmlBeginRegex = memoize(n => new RegExp("^ {0," + n + "}(?:</?(?:" + BLOCK_TAGS + ")(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)", "i"));
other.blockquoteBeginRegex = memoize(n => new RegExp("^ {0," + n + "}>"));

// cheap prefilters (necessary conditions for the heavy regexes below)
// distance-from-end of the LAST "\n {0,3}[=-]" (setext underline) match;
// Infinity when absent. Walks newlines from the right, early-exits on hit.
function lastSetextFromEnd(s) {
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
const hasNonWs = /\S/;   // \S class == JS trim() class, allocation-free blank test
const emCharRe = /[*_~]/;
// URL first-char classification for the inlineLoop url gate:
// 1 = h/f/w/m/x (any case) — can start http/ftp/www/mailto/xmpp
// 2 = other email-local chars — only relevant when an "@" remains ahead
const URLC0 = new Uint8Array(128);
for (const c of "hHfFwWmMxX") URLC0[c.charCodeAt(0)] = 1;
for (let c = 97; c <= 122; c++) if (!URLC0[c]) URLC0[c] = 2;
for (let c = 65; c <= 90; c++) if (!URLC0[c]) URLC0[c] = 2;
for (let c = 48; c <= 57; c++) URLC0[c] = 2;
URLC0[46] = 2; URLC0[95] = 2; URLC0[43] = 2; URLC0[45] = 2;
// inlineLoop dispatch bitmask per first char: 1=escape(\\) 2=tag/autolink(<)
// 4=link/reflink([ !) 8=emStrong(* _) 16=codespan(`) 32=br(sp \\) 64=del(~)
const IDISPATCH = new Uint8Array(128);
IDISPATCH[92] = 1 | 32;
IDISPATCH[60] = 2;
IDISPATCH[91] = 4; IDISPATCH[33] = 4;
IDISPATCH[42] = 8; IDISPATCH[95] = 8;
IDISPATCH[96] = 16;
IDISPATCH[32] = 32;
IDISPATCH[126] = 64;
const maskCharRe = /[`\\[<]/;

// ---------- helpers ----------

// equivalent to /\n[ \t]*\n[ \t]*$/.test(s), scanned backward (O(trailing))
function endsDoubleBlank(s) {
  let i = s.length - 1;
  while (i >= 0) { const c = s.charCodeAt(i); if (c === 32 || c === 9) i--; else break; }
  if (i < 0 || s.charCodeAt(i) !== 10) return false;
  i--;
  while (i >= 0) { const c = s.charCodeAt(i); if (c === 32 || c === 9) i--; else break; }
  return i >= 0 && s.charCodeAt(i) === 10;
}
function expandLeading(line, colOffset) {
  // equivalent to line.replace(/^[ \t]+/, v => tabLength(v, colOffset)):
  // a pure-space leading run passes through tabLength unchanged, so only
  // rebuild the string when the run actually contains a tab.
  let i = 0;
  const n = line.length;
  while (i < n) { const c = line.charCodeAt(i); if (c === 32 || c === 9) i++; else break; }
  if (i === 0) return line;
  const lead = line.slice(0, i);
  if (lead.indexOf("\t") === -1) return line;
  return tabLength(lead, colOffset) + line.slice(i);
}

const htmlEscapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(str, encode) {
  if (encode) {
    if (other.escapeTest.test(str)) return str.replace(other.escapeReplace, ch => htmlEscapes[ch]);
  } else if (other.escapeTestNoEncode.test(str)) {
    return str.replace(other.escapeReplaceNoEncode, ch => htmlEscapes[ch]);
  }
  return str;
}

function ncr(str) {
  if (!other.numericCharacterReference.test(str)) return str;
  return str.replace(other.numericCharacterReferenceOrAmpersand, (m, dec, hex) => {
    if (dec === undefined && hex === undefined) return "&amp;";
    const cp = dec === undefined ? parseInt(hex, 16) : parseInt(dec, 10);
    return cp === 0 || cp > 1114111 || (cp >= 55296 && cp <= 57343) ? "\uFFFD" : cp === 38 ? "&amp;" : String.fromCodePoint(cp);
  });
}

function cleanUrl(href) {
  try { href = encodeURI(href).replace(other.percentDecode, "%"); } catch { return null; }
  return href;
}

function splitCells(row, count) {
  let t = row.replace(other.findPipe, (m, off, str) => {
    let escaped = false, p = off;
    while (--p >= 0 && str[p] === "\\") escaped = !escaped;
    return escaped ? "|" : " |";
  });
  const cells = t.split(other.splitPipe);
  if (cells[0].trim() || cells.shift(), cells.length > 0 && !(cells[cells.length - 1] || "").trim() && cells.pop(), count) {
    if (cells.length > count) cells.splice(count);
    else while (cells.length < count) cells.push("");
  }
  for (let i = 0; i < cells.length; i++) cells[i] = cells[i].trim().replace(other.slashPipe, "|");
  return cells;
}

function rtrim(str, cutChar, respectTrailing) {
  const len = str.length;
  if (len === 0) return "";
  let i = 0;
  while (i < len) {
    const ch = str.charAt(len - i - 1);
    if (ch === cutChar && !respectTrailing) i++;
    else if (ch !== cutChar && respectTrailing) i++;
    else break;
  }
  return str.slice(0, len - i);
}

function dedentTrailingBlank(src) {
  const lines = src.split("\n");
  let i = lines.length - 1;
  while (i >= 0 && other.blankLine.test(lines[i])) i--;
  return lines.length - i <= 2 ? src : lines.slice(0, i + 1).join("\n");
}

function normalizeId(str) {
  return str.trim().replace(other.multipleSpaceGlobal, " ").toLowerCase().toUpperCase().toLowerCase();
}

function findClosingBracket(str, brackets) {
  if (str.indexOf(brackets[0]) === -1 && str.indexOf(brackets[1]) === -1) return -1;
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\") i++;
    else if (str[i] === brackets[0]) level++;
    else if (str[i] === brackets[1] && (--level, level < 0)) return i;
  }
  return level > 0 ? -2 : -1;
}

function tabLength(str, offset = 0) {
  let col = offset, out = "";
  for (const ch of str) {
    if (ch === "\t") { const r = 4 - col % 4; out += " ".repeat(r); col += r; }
    else { out += ch; col++; }
  }
  return out;
}

// codepoint-length helpers (no array spread allocation)
function cpLen(s) { let n = 0; for (const _ of s) n++; return n; }
function cpLast(s) {
  if (s === "") return "";
  const end = s.length - 1;
  const u = s.charCodeAt(end);
  if (u >= 0xDC00 && u <= 0xDFFF && end > 0) {
    const h = s.charCodeAt(end - 1);
    if (h >= 0xD800 && h <= 0xDBFF) return s.slice(end - 1);
  }
  return s[end];
}
function cpFirstLen(s) { const c = s.codePointAt(0); return c > 0xFFFF ? 2 : 1; }
// first line of a string without allocating an array
function firstLineOf(s) { const i = s.indexOf("\n"); return i === -1 ? s : s.slice(0, i); }

// charCode replacements for the list() per-line begin-regexes (each is an
// anchored `^ {0,n}<shape>` rule; n = memoized clamp of the item offset).
// Exact behavioural clones of nextBulletRegex/hrRegex/fencesBeginRegex/
// headingBeginRegex/blockquoteBeginRegex .test() on a newline-free line.
function listBulletAt(line, n) {
  let i = 0;
  while (i < n && line.charCodeAt(i) === 32) i++;
  let c = line.charCodeAt(i);
  let j;
  if (c >= 48 && c <= 57) {
    j = i + 1;
    while (j < line.length && (c = line.charCodeAt(j)) >= 48 && c <= 57 && j - i < 9) j++;
    if (c !== 46 && c !== 41) return false;
    j++;
  } else {
    if (c !== 42 && c !== 43 && c !== 45) return false;
    j = i + 1;
  }
  const e = line.charCodeAt(j);
  return e === 32 || e === 9 || j >= line.length;
}
function listHrAt(line, n) {
  let i = 0;
  while (i < n && line.charCodeAt(i) === 32) i++;
  const c = line.charCodeAt(i);
  if (c !== 45 && c !== 95 && c !== 42) return false;
  let k = i + 1, cnt = 1;
  const len = line.length;
  while (k < len) {
    const d = line.charCodeAt(k);
    if (d === c) { cnt++; k++; }
    else if (d === 32 || d === 9) k++;
    else return false;
  }
  return cnt >= 3;
}
function listFencesAt(line, n) {
  let i = 0;
  while (i < n && line.charCodeAt(i) === 32) i++;
  const c = line.charCodeAt(i);
  if (c !== 96 && c !== 126) return false;
  return line.charCodeAt(i + 1) === c && line.charCodeAt(i + 2) === c;
}
function listHeadingAt(line, n) {
  let i = 0;
  while (i < n && line.charCodeAt(i) === 32) i++;
  if (line.charCodeAt(i) !== 35) return false;
  let k = i + 1;
  const len = line.length;
  while (k < len && line.charCodeAt(k) === 35) k++;
  if (k - i > 6) return false;
  if (k >= len) return true;
  const c = line.charCodeAt(k);
  return c === 32 || c === 9 || (c >= 9 && c <= 13) || c === 0xA0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200A)
    || c === 0x2028 || c === 0x2029 || c === 0x202F || c === 0x205F || c === 0x3000 || c === 0xFEFF;
}
function listBqAt(line, n) {
  let i = 0;
  while (i < n && line.charCodeAt(i) === 32) i++;
  return line.charCodeAt(i) === 62;
}

function compareLinks(src, text, maskLen) {
  if (!text.includes("<")) return false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\") { i++; continue; }
    if (text[i] === "`") {
      const m = inline.code.exec(text.slice(i));
      if (m) { i += m[0].length - 1; continue; }
    }
    if (text[i] !== "<") continue;
    const r = src.slice(maskLen + i);
    const m = inline.tag.exec(r) || inline.autolink.exec(r);
    if (m) {
      if (m[0].length > text.length - i) return true;
      i += m[0].length - 1;
    }
  }
  return false;
}

function indentCodeCompensation(fenceRaw, text) {
  const indentMatch = fenceRaw.match(other.indentCodeCompensation);
  if (indentMatch === null) return text;
  const s = indentMatch[1];
  return text.split("\n").map(r => {
    const m = r.match(other.beginningSpace);
    if (m === null) return r;
    return r.slice(Math.min(m[0].length, s.length));
  }).join("\n");
}

function outputLink(match, link, raw, lexer) {
  const href = link.href, title = link.title || null;
  const text = match[1].replace(other.outputLinkReplace, "$1");
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

// em/del "mask" stack (marked uses a WeakMap keyed on the tokenizer; one tokenizer per lexer here)
let maskStack = [];
function findLastCloserRun(a, code) {
  // last run of `code` whose preceding char is not whitespace (-1 if none)
  const n = a.length;
  let s = a.indexOf(String.fromCharCode(code));
  let last = -1;
  while (s !== -1) {
    let i = s + 1;
    while (i < n && a.charCodeAt(i) === code) i++;
    const o = s === 0 ? 10 : a.charCodeAt(s - 1);
    if (o !== 32 && o !== 9 && o !== 10 && o !== 13 && o !== 12) last = s;
    if (i >= n) break;
    s = a.indexOf(String.fromCharCode(code), i);
  }
  return last;
}
function computeMask(a) {
  return { maskedSrc: a, closer: { "*": findLastCloserRun(a, 42), "_": findLastCloserRun(a, 95) }, delCloser: findLastCloserRun(a, 126) };
}
void computeMask;
// lazy closers: most chunks never reach a peek (emStrong early-outs before the
// closer lookup), so compute each closer run on first use instead of 3x eagerly
function pushMask(src) { maskStack.push({ maskedSrc: src, c42: null, c95: null, c126: null }); }
function pushMaskNoEm(src) { maskStack.push({ maskedSrc: src, c42: -1, c95: -1, c126: -1 }); }
function popMask() { maskStack.pop(); }
function peekEmCloser(src, ch) {
  const m = maskStack[maskStack.length - 1];
  if (m && m.maskedSrc === src) {
    if (ch === "*") return m.c42 !== null ? m.c42 : (m.c42 = findLastCloserRun(src, 42));
    return m.c95 !== null ? m.c95 : (m.c95 = findLastCloserRun(src, 95));
  }
  return findLastCloserRun(src, ch === "*" ? 42 : 95);
}
function peekDelCloser(src) {
  const m = maskStack[maskStack.length - 1];
  if (m && m.maskedSrc === src) return m.c126 !== null ? m.c126 : (m.c126 = findLastCloserRun(src, 126));
  return findLastCloserRun(src, 126);
}

// ---------- tokenizer ----------

class Tokenizer {
  constructor() { this.lexer = null; }

  space(src) {
    const t = block.newline.exec(src);
    if (t && t[0].length > 0) return { type: "space", raw: t[0] };
  }

  code(src) {
    const t = block.code.exec(src);
    if (t) {
      const raw = dedentTrailingBlank(t[0]);
      const text = raw.replace(other.codeRemoveIndent, "");
      return { type: "code", raw, codeBlockStyle: "indented", text };
    }
  }

  fences(src) {
    const t = block.fences.exec(src);
    if (t) {
      const raw = t[0];
      const text = indentCodeCompensation(raw, t[3] || "");
      return { type: "code", raw, lang: t[2] ? t[2].trim().replace(inline.anyPunctuation, "$1") : t[2], text };
    }
  }

  heading(src) {
    const t = block.heading.exec(src);
    if (t) {
      let text = t[2].trim();
      if (other.endingHash.test(text)) {
        const s = rtrim(text, "#");
        if (!s || other.endingSpaceTabChar.test(s)) text = s.trim();
      }
      return { type: "heading", raw: rtrim(t[0], "\n"), depth: t[1].length, text, tokens: this.lexer.inline(text) };
    }
  }

  hr(src) {
    const t = block.hr.exec(src);
    if (t) return { type: "hr", raw: rtrim(t[0], "\n") };
  }

  blockquote(src) {
    const t = block.blockquote.exec(src);
    if (t) {
      const lines = rtrim(t[0], "\n").split("\n");
      let raw = "", text = "";
      const tokens = [];
      while (lines.length > 0) {
        let seenMarker = false;
        const chunk = [];
        let p;
        for (p = 0; p < lines.length; p++) {
          if (other.blockquoteStart.test(lines[p])) { chunk.push(lines[p]); seenMarker = true; }
          else if (!seenMarker) chunk.push(lines[p]);
          else break;
        }
        const remaining = lines.slice(p);
        const h = chunk.join("\n");
        const u = h
          .replace(other.blockquoteMarkerWhitespace, (g, b, m) => b + tabLength(m, b.length))
          .replace(other.blockquoteSetextReplace, "\n    $1")
          .replace(other.blockquoteSetextReplace2, "");
        raw = raw ? raw + "\n" + h : h;
        text = text ? text + "\n" + u : u;
        const prevTop = this.lexer.state.top;
        this.lexer.state.top = true;
        this.lexer.blockTokens(u, tokens, true);
        this.lexer.state.top = prevTop;
        if (remaining.length === 0) break;
        const last = tokens[tokens.length - 1];
        if (last && (last.type === "code" || last.type === "heading" || last.type === "hr" || last.type === "html" || last.type === "table")) break;
        if (last && last.type === "blockquote") {
          const g = last;
          const b = remaining.join("\n");
          const m = g.raw + "\n" + b.replace(other.blockquoteSetextReplace2, "");
          const f = this.blockquote(m);
          tokens[tokens.length - 1] = f;
          const y = m.substring(f.raw.length).replace(/^\n/, "");
          const lineCount = y ? y.split("\n").length : 0;
          const consumedLines = lineCount ? remaining.slice(0, -lineCount) : remaining;
          if (consumedLines.length > 0) raw = raw + "\n" + consumedLines.join("\n");
          text = text.substring(0, text.length - g.text.length) + f.text;
          lines.length = 0;
          for (const ln of remaining.slice(consumedLines.length)) lines.push(ln);
          if (lines.length > 0 && other.blockquoteStart.test(lines[0])) continue;
          break;
        } else if (last && last.type === "list") {
          const g = last;
          const b = g.raw + "\n" + remaining.join("\n");
          const m = this.list(b);
          tokens[tokens.length - 1] = m;
          const cnt = m.raw.length > g.raw.length ? b.slice(g.raw.length + 1, m.raw.length).split("\n").length : 0;
          if (cnt > 0) {
            const y = remaining.slice(0, cnt).join("\n");
            raw = raw + "\n" + y;
            text = text + "\n" + y;
          }
          lines.length = 0;
          for (const ln of remaining.slice(cnt)) lines.push(ln);
          continue;
        } else {
          lines.length = 0;
          for (const ln of remaining) lines.push(ln);
        }
      }
      return { type: "blockquote", raw, tokens, text };
    }
  }

  list(src) {
    // fast reject (sound: block.list's first line is ^bull([ \t][^\n]*?)?(?:\n|$),
    // so a marker NOT followed by space/tab/newline/EOS can never start a list)
    let fi = 0;
    while (fi < 3 && src.charCodeAt(fi) === 32) fi++;
    let fc = src.charCodeAt(fi);
    if (fc >= 48 && fc <= 57) {
      let fj = fi + 1;
      while (fj < src.length && (fc = src.charCodeAt(fj)) >= 48 && fc <= 57) fj++;
      // \d{1,9} greedy: the only length that can be followed by [.)] is the
      // full digit run, and it must be <= 9 chars
      if (fj - fi > 9) return;
      fc = src.charCodeAt(fj);
      if (fc !== 46 && fc !== 41) return;
      fi = fj;
    } else if (fc !== 42 && fc !== 43 && fc !== 45) return;
    fc = src.charCodeAt(fi + 1);
    if (!(fc === 32 || fc === 9 || fc === 10) && fi + 1 < src.length) return;
    const t = block.list.exec(src);
    if (!t) return;
    const orig = src;
    const consumed = () => orig.length - src.length;
    const marker = t[1].trim();
    const ordered = marker.length > 1;
    const listTok = { type: "list", raw: "", ordered, start: ordered ? +marker.slice(0, -1) : "", loose: false, items: [] };
    const bull = ordered ? "\\d{1,9}\\" + marker.slice(-1) : "\\" + marker;
    const listItemRegex = other.listItemRegex(bull);
    let pendingLoose = false;
    while (src) {
      let endEarly = false;
      let itemText = "";
      let m;
      if (!((m = listItemRegex.exec(src))) || block.hr.test(src)) break;
      const itemStart = consumed();
      src = src.substring(m[0].length);
      const firstLine = firstLineOf(m[2]);
      const markerLen = m[1].length;
      const spacedFirstLine = expandLeading(firstLine, markerLen);
      let lineAfter = firstLineOf(src);
      let blankFirstLine = !hasNonWs.test(spacedFirstLine);
      let offset = 0;
      if (blankFirstLine) {
        offset = markerLen + 1;
      } else {
        offset = spacedFirstLine.search(other.nonSpaceChar);
        offset = offset > 4 ? 1 : offset;
        itemText = spacedFirstLine.slice(offset);
        offset += markerLen;
      }
      if (blankFirstLine && other.blankLine.test(lineAfter)) {
        src = src.substring(lineAfter.length + 1);
        endEarly = true;
      }
      if (!endEarly) {
        const htmlBeginRegex = other.htmlBeginRegex(offset);
        const bn = offset <= 1 ? 0 : offset >= 4 ? 3 : offset - 1; // memoize() clamp
        let cur = spacedFirstLine;
        while (src) {
          const nlIdx = src.indexOf("\n");
          const line = nlIdx === -1 ? src : src.slice(0, nlIdx);
          lineAfter = line;
          const lineC0 = line.charCodeAt(0);
          const spacedLine = (lineC0 === 32 || lineC0 === 9) ? expandLeading(line, 0) : line;
          // gate the six begin-checks on the first non-space char (all are
          // anchored `^ {0,N}<char>...` rules, so this is semantics-preserving)
          let j = 0;
          while (j < 3 && line.charCodeAt(j) === 32) j++;
          const lc = line.charCodeAt(j);
          if ((lc === 96 || lc === 126) && listFencesAt(line, bn)) break;
          if (lc === 35 && listHeadingAt(line, bn)) break;
          if (lc === 60 && htmlBeginRegex.test(line)) break;
          if (lc === 62 && listBqAt(line, bn)) break;
          if ((lc === 42 || lc === 43 || lc === 45 || (lc >= 48 && lc <= 57)) && listBulletAt(line, bn)) break;
          if ((lc === 45 || lc === 95 || lc === 42) && listHrAt(line, bn)) break;
          // first index of a non-space char (== spacedLine.search(/[^ ]/), -1 if none)
          let ns = -1;
          for (let q = 0; q < spacedLine.length; q++) { if (spacedLine.charCodeAt(q) !== 32) { ns = q; break; } }
          const lineBlank = !hasNonWs.test(lineAfter);
          if (ns >= offset || lineBlank) {
            itemText += "\n" + spacedLine.slice(offset);
          } else {
            const curSpaced = cur.indexOf("\t") === -1 ? cur : cur.replace(other.tabCharGlobal, "    ");
            let cns = -1;
            for (let q = 0; q < curSpaced.length; q++) { if (curSpaced.charCodeAt(q) !== 32) { cns = q; break; } }
            if (blankFirstLine || cns >= 4 || (listFencesAt(cur, bn) || listHeadingAt(cur, bn) || htmlBeginRegex.test(cur) || listHrAt(cur, bn))) break;
            const qe = /^ {0,3}(?:=+|-+) *$/.test(lineAfter) && block.lheading.test(cur + "\n" + lineAfter)
              ? "    " + spacedLine.replace(/^ {0,3}/, "")
              : lineAfter;
            itemText += "\n" + qe;
          }
          blankFirstLine = lineBlank;
          src = src.substring(line.length + 1);
          cur = spacedLine.slice(offset);
        }
      }
      const itemRaw = orig.slice(itemStart, consumed());
      if (!listTok.loose) {
        if (pendingLoose) listTok.loose = true;
        else if (endsDoubleBlank(itemRaw)) pendingLoose = true;
      }
      listTok.items.push({ type: "list_item", raw: itemRaw, task: other.listIsTask.test(itemText), loose: false, text: itemText, tokens: [] });
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
          if (g.type === "space" && other.anyLine.test(g.raw)) { k = true; break; }
        }
        listTok.loose = k;
      }
    }
    for (const item of listTok.items) {
      const first = item.tokens[0];
      if (item.task && (first?.type === "text" || first?.type === "paragraph")) {
        item.text = item.text.replace(other.listReplaceTask, "");
        first.raw = first.raw.replace(other.listReplaceTask, "");
        first.text = first.text.replace(other.listReplaceTask, "");
        for (let g = this.lexer.inlineQueue.length - 1; g >= 0; g--) {
          if (other.listIsTask.test(this.lexer.inlineQueue[g].src)) {
            this.lexer.inlineQueue[g].src = this.lexer.inlineQueue[g].src.replace(other.listReplaceTask, "");
            break;
          }
        }
        const k = other.listTaskCheckbox.exec(item.raw);
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
    const t = block.html.exec(src);
    if (t) {
      const text = dedentTrailingBlank(t[0]);
      return { type: "html", block: true, raw: text, pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text };
    }
  }

  def(src) {
    const t = block.def.exec(src);
    if (t) {
      if (!other.startAngleBracket.test(t[2]) && findClosingBracket(t[2], "()") !== -1) return;
      const tag = normalizeId(t[1]);
      const href = t[2] ? t[2].replace(other.hrefBrackets, "$1").replace(inline.anyPunctuation, "$1") : "";
      const title = t[3] ? t[3].substring(1, t[3].length - 1).replace(inline.anyPunctuation, "$1") : t[3];
      return { type: "def", tag, raw: rtrim(t[0], "\n"), href, title };
    }
  }

  table(src) {
    const t = block.table.exec(src);
    if (!t || !other.tableDelimiter.test(t[2])) return;
    const header = splitCells(t[1]);
    const align = t[2].replace(other.tableAlignChars, "").split("|");
    const rows = t[3]?.trim() ? t[3].replace(other.tableRowBlankLine, "").split("\n") : [];
    const tok = { type: "table", raw: rtrim(t[0], "\n"), header: [], align: [], rows: [] };
    if (header.length === align.length) {
      for (const i of align) {
        if (other.tableAlignRight.test(i)) tok.align.push("right");
        else if (other.tableAlignCenter.test(i)) tok.align.push("center");
        else if (other.tableAlignLeft.test(i)) tok.align.push("left");
        else tok.align.push(null);
      }
      for (let i = 0; i < header.length; i++) {
        tok.header.push({ text: header[i], tokens: this.lexer.inline(header[i]), header: true, align: tok.align[i] });
      }
      for (const i of rows) {
        tok.rows.push(splitCells(i, tok.header.length).map((l, p) => ({ text: l, tokens: this.lexer.inline(l), header: false, align: tok.align[p] })));
      }
      return tok;
    }
  }

  lheading(src) {
    const t = block.lheading.exec(src);
    if (t) {
      const text = t[1].trim();
      return { type: "heading", raw: rtrim(t[0], "\n"), depth: t[2].charAt(0) === "=" ? 1 : 2, text, tokens: this.lexer.inline(text) };
    }
  }

  paragraph(src) {
    const t = block.paragraph.exec(src);
    if (t) {
      const text = t[1].charAt(t[1].length - 1) === "\n" ? t[1].slice(0, -1) : t[1];
      return { type: "paragraph", raw: t[0], text, tokens: this.lexer.inline(text) };
    }
  }

  text(src) {
    const t = block.text.exec(src);
    if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
  }

  // ---------- inline ----------

  escape(src) {
    const t = inline.escape.exec(src);
    if (t) return { type: "escape", raw: t[0], text: t[1] };
  }

  tag(src) {
    const t = inline.tag.exec(src);
    if (t) {
      if (!this.lexer.state.inLink && other.startATag.test(t[0])) this.lexer.state.inLink = true;
      else if (this.lexer.state.inLink && other.endATag.test(t[0])) this.lexer.state.inLink = false;
      if (!this.lexer.state.inRawBlock && other.startPreScriptTag.test(t[0])) this.lexer.state.inRawBlock = true;
      else if (this.lexer.state.inRawBlock && other.endPreScriptTag.test(t[0])) this.lexer.state.inRawBlock = false;
      return { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
    }
  }

  link(src) {
    const st = this.lexer.state;
    if (st.linkParenPossible === false) return;
    if (st.parenHas === -1 && st.parenSrc !== null) st.parenHas = st.parenSrc.includes(")") ? 1 : 0;
    if (st.parenHas === 0) return;
    const t = inline.link.exec(src);
    if (t) {
      const maskLen = t[0].charAt(0) === "!" ? 2 : 1;
      if (compareLinks(src, t[1], maskLen)) return;
      let href = t[2].trim();
      if (other.startAngleBracket.test(href)) {
        if (!other.endAngleBracket.test(href)) return;
        const stripped = rtrim(href.slice(0, -1), "\\");
        if ((href.length - stripped.length) % 2 === 0) return;
      } else {
        const closeIdx = findClosingBracket(t[2], "()");
        if (closeIdx === -2) return;
        if (closeIdx > -1) {
          const cut = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + closeIdx;
          t[2] = t[2].substring(0, closeIdx);
          t[0] = t[0].substring(0, cut).trim();
          t[3] = "";
        }
      }
      const stripped2 = rtrim(t[0].slice(0, -1), "\\");
      if ((t[0].length - stripped2.length) % 2 === 0) return;
      let rawHref = t[2], title = "";
      title = t[3] ? t[3].slice(1, -1) : "";
      rawHref = rawHref.trim();
      if (other.startAngleBracket.test(rawHref)) rawHref = rawHref.slice(1, -1);
      return outputLink(t, {
        href: rawHref && rawHref.replace(inline.anyPunctuation, "$1"),
        title: title && title.replace(inline.anyPunctuation, "$1")
      }, t[0], this.lexer);
    }
  }

  reflink(src, links) {
    let n;
    if ((n = inline.reflink.exec(src)) || (n = inline.nolink.exec(src))) {
      const maskLen = n[0].charAt(0) === "!" ? 2 : 1;
      if (compareLinks(src, n[1], maskLen)) return;
      const link = links[normalizeId(n[2] || n[1])];
      if (!link) {
        const ch = n[0].charAt(0);
        return { type: "text", raw: ch, text: ch };
      }
      return outputLink(n, link, n[0], this.lexer);
    }
  }

  emStrong(src, maskedSrc, prevChar = "") {
    const lDelim = inline.emStrongLDelim.exec(src);
    if (!lDelim || !lDelim[1] && !lDelim[2] && !lDelim[3] && !lDelim[4]) return;
    const firstChar = lDelim[0][0];
    const canOpenEqual = prevChar === firstChar;
    const srcOffset = maskedSrc.length - src.length;
    let l = srcOffset;
    while (l > 0 && maskedSrc[l - 1] === firstChar) l--;
    // == cpLast(maskedSrc.slice(max(0, l - 2), l)) without the slice allocation
    let charBeforeRun;
    if (l === 0) charBeforeRun = "";
    else {
      const u = maskedSrc.charCodeAt(l - 1);
      if (u >= 0xDC00 && u <= 0xDFFF && l >= 2) {
        const h = maskedSrc.charCodeAt(l - 2);
        charBeforeRun = (h >= 0xD800 && h <= 0xDBFF) ? maskedSrc.slice(l - 2, l) : maskedSrc.charAt(l - 1);
      } else charBeforeRun = maskedSrc.charAt(l - 1);
    }
    const isPunctBefore = charBeforeRun === "*" || charBeforeRun === "_" || !!inline.punctuation.test(charBeforeRun);
    if (l < srcOffset) prevChar = charBeforeRun;
    const prevCharIsPunct = l < srcOffset ? isPunctBefore : !!inline.punctuation.test(prevChar);
    if (lDelim[4] && other.unicodeAlphaNumeric.test(prevChar)) return;
    const punctAfter = lDelim[1] || lDelim[3] || "";
    if (!punctAfter || !prevChar || prevCharIsPunct) {
      const k = cpLen(lDelim[0]) - 1;
      let m = k, f = 0;
      const y = srcOffset - l + k;
      const R = !!charBeforeRun.trim() && (!!punctAfter || firstChar === "*" && !isPunctBefore);
      if (firstChar !== "*" && firstChar !== "_") return;
      const A = firstChar === "*" ? inline.emStrongRDelimAst : inline.emStrongRDelimUnd;
      const v = peekEmCloser(maskedSrc, firstChar);
      const Q = maskedSrc.length - src.length + k;
      if (v < Q) return;
      const t = maskedSrc.slice(-1 * src.length + k);
      const ee = v - Q;
      let s;
      A.lastIndex = 0;
      while ((s = A.exec(t)) !== null && !(s.index > ee)) {
        const g = s[1] || s[2] || s[3] || s[4] || s[5] || s[6];
        if (!g) continue;
        let b = cpLen(g);
        if (s[3] || s[4]) { m += b; continue; }
        else if (s[5] || s[6] || R) {
          if (canOpenEqual && (s[5] || s[6])) break;
          if (y % 3 && !((y + b) % 3)) { f += b; continue; }
        }
        if (m -= b, m > 0) continue;
        b = Math.min(b, b + m + f);
        const te = cpFirstLen(s[0]);
        const M = src.slice(0, k + s.index + te + b);
        if (Math.min(k, b) % 2) {
          const U = M.slice(1, -1);
          return { type: "em", raw: M, text: U, tokens: this.lexer.inlineTokens(U) };
        }
        const ne = M.slice(2, -2);
        return { type: "strong", raw: M, text: ne, tokens: this.lexer.inlineTokens(ne) };
      }
    }
  }

  codespan(src) {
    const t = inline.code.exec(src);
    if (t) {
      let n = t[2].replace(other.newLineCharGlobal, " ");
      const s = other.nonSpaceChar.test(n);
      const r = other.startingSpaceChar.test(n) && other.endingSpaceChar.test(n);
      if (s && r) n = n.substring(1, n.length - 1);
      return { type: "codespan", raw: t[0], text: n };
    }
  }

  br(src) {
    const t = inline.br.exec(src);
    if (t) return { type: "br", raw: t[0] };
  }

  del(src, maskedSrc, prevChar = "") {
    const s = inline.delLDelim.exec(src);
    if (!s) return;
    if (!(s[1] || "") || !prevChar || inline.punctuation.exec(prevChar)) {
      const o = cpLen(s[0]) - 1;
      let p = o;
      const h = inline.delRDelim;
      const u = peekDelCloser(maskedSrc);
      const d = maskedSrc.length - src.length + o;
      if (u < d) return;
      const t = maskedSrc.slice(-1 * src.length + o);
      const k = u - d;
      let m;
      h.lastIndex = 0;
      while ((m = h.exec(t)) !== null && !(m.index > k)) {
        const i = m[1] || m[2] || m[3] || m[4] || m[5] || m[6];
        if (!i) continue;
        let l = cpLen(i);
        if (l !== o) continue;
        if (m[3] || m[4]) { p += l; continue; }
        if (p -= l, p > 0) continue;
        l = Math.min(l, l + p);
        const g = cpFirstLen(m[0]);
        const b = src.slice(0, o + m.index + g + l);
        const inner = b.slice(o, -o);
        return { type: "del", raw: b, text: inner, tokens: this.lexer.inlineTokens(inner) };
      }
    }
  }

  autolink(src) {
    const t = inline.autolink.exec(src);
    if (t) {
      let text, href;
      if (t[2] === "@") { text = t[1]; href = "mailto:" + text; }
      else { text = t[1]; href = text; }
      return { type: "link", raw: t[0], text, href, autolink: true, tokens: [{ type: "text", raw: text, text }] };
    }
  }

  url(src) {
    let t;
    if (t = inline.url.exec(src)) {
      let text, href;
      if (t[2] === "@") { text = t[0]; href = "mailto:" + text; }
      else {
        let r;
        do { r = t[0]; t[0] = inline._backpedal.exec(t[0])?.[0] ?? ""; } while (r !== t[0]);
        text = t[0];
        if (t[1] === "www.") href = "http://" + t[0];
        else href = t[0];
      }
      return { type: "link", raw: t[0], text, href, autolink: true, tokens: [{ type: "text", raw: text, text }] };
    }
  }

  inlineText(src) {
    const t = inline.text.exec(src);
    if (t) {
      const inRaw = this.lexer.state.inRawBlock;
      return { type: "text", raw: t[0], text: inRaw ? t[0] : ncr(t[0]), escaped: inRaw };
    }
  }
}

// ---------- lexer ----------

class Lexer {
  constructor() {
    this.tokens = [];
    this.tokens.links = Object.create(null);
    this.hasLinks = false;
    this.tokenizer = new Tokenizer();
    this.tokenizer.lexer = this;
    this.inlineQueue = [];
    this.state = { inLink: false, inRawBlock: false, linkEmitted: false, linkParenPossible: true, parenSrc: null, parenHas: -1, top: true };
  }

  lex(src) {
    src = src.indexOf("\r") === -1 ? src : src.replace(other.carriageReturn, "\n");
    this.blockTokens(src, this.tokens);
    for (let i = 0; i < this.inlineQueue.length; i++) {
      const item = this.inlineQueue[i];
      this.state.inRawBlock = false;
      const s = item.src;
      const prev = this.state.linkParenPossible;
      const prevSrc = this.state.parenSrc, prevHas = this.state.parenHas;
      if (prev) { this.state.parenSrc = s; this.state.parenHas = -1; }
      const hasEm = emCharRe.test(s);
      const masked = hasEm ? this.maskSrc(s) : s;
      if (hasEm) pushMask(masked); else pushMaskNoEm(s);
      try {
        this.inlineLoop(s, masked, item.tokens);
      } finally { popMask(); }
      this.state.linkParenPossible = prev;
      this.state.parenSrc = prevSrc; this.state.parenHas = prevHas;
    }
    this.inlineQueue = [];
    return this.tokens;
  }

  blockTokens(src, t = [], top = false) {
    let prevLen = Infinity;
    // distance-from-end caches: the string is consumed from the LEFT, so a
    // feature's distance from the END is stable across iterations. Infinity =
    // known absent. Computed lazily once per blockTokens call.
    let nlKnown = false, nlFromEnd = Infinity;     // last "\n"
    let sxKnown = false, sxFromEnd = Infinity;     // last "\n {0,3}[=-]"
    const tk = this.tokenizer;
    while (src) {
      if (src.length < prevLen) prevLen = src.length;
      else { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
      let r;
      // cheap first-char gates (semantics-preserving: every block rule is
      // anchored and can only start with the gated characters)
      const c0 = src.charCodeAt(0);
      const ws = c0 === 32 || c0 === 9 || c0 === 10;
      let i = 0;
      while (i < 3 && src.charCodeAt(i) === 32) i++;
      const c = src.charCodeAt(i); // first char after <=3 leading spaces
      if (ws && (r = tk.space(src))) {
        src = src.substring(r.raw.length);
        const last = t[t.length - 1];
        if (r.raw.length === 1 && last !== undefined) last.raw += "\n";
        else t.push(r);
        continue;
      }
      if ((c0 === 32 || c0 === 9) && (r = tk.code(src))) {
        src = src.substring(r.raw.length);
        const last = t[t.length - 1];
        if (last?.type === "paragraph" || last?.type === "text") {
          last.raw += (last.raw.endsWith("\n") ? "" : "\n") + r.raw;
          last.text += "\n" + r.text;
          this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
        } else t.push(r);
        continue;
      }
      if ((c === 96 || c === 126) && (r = tk.fences(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (c === 35 && (r = tk.heading(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if ((c === 45 || c === 95 || c === 42) && (r = tk.hr(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (c === 62 && (r = tk.blockquote(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if ((c === 42 || c === 43 || c === 45 || (c >= 48 && c <= 57)) && (r = tk.list(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (c === 60 && (r = tk.html(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (c === 91 && (r = tk.def(src))) {
        src = src.substring(r.raw.length);
        const last = t[t.length - 1];
        if (last?.type === "paragraph" || last?.type === "text") {
          last.raw += (last.raw.endsWith("\n") ? "" : "\n") + r.raw;
          last.text += "\n" + r.raw;
          this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
        } else {
          if (!this.tokens.links[r.tag]) this.tokens.links[r.tag] = { href: r.href, title: r.title };
          this.hasLinks = true;
          t.push(r);
        }
        continue;
      }
      let nlIdx = -1;
      if (c0 !== 10) {
        if (!nlKnown) {
          const lastNl = src.lastIndexOf("\n");
          nlKnown = true;
          nlFromEnd = lastNl === -1 ? Infinity : src.length - lastNl;
        }
        nlIdx = nlFromEnd < src.length ? src.length - nlFromEnd : -1;
      }
      if (nlIdx !== -1 && (r = tk.table(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      let hasSetext = false;
      if (nlIdx !== -1) {
        if (!sxKnown) { sxKnown = true; sxFromEnd = lastSetextFromEnd(src); }
        hasSetext = sxFromEnd < src.length;
      }
      if (hasSetext && (r = tk.lheading(src))) { src = src.substring(r.raw.length); t.push(r); continue; }
      if (this.state.top && c0 !== 10 && (r = tk.paragraph(src))) {
        const last = t[t.length - 1];
        if (top && last?.type === "paragraph") {
          last.raw += (last.raw.endsWith("\n") ? "" : "\n") + r.raw;
          last.text += "\n" + r.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
        } else t.push(r);
        top = false;
        src = src.substring(r.raw.length);
        continue;
      }
      if (c0 !== 10 && (r = tk.text(src))) {
        src = src.substring(r.raw.length);
        const last = t[t.length - 1];
        if (last?.type === "text") {
          last.raw += (last.raw.endsWith("\n") ? "" : "\n") + r.raw;
          last.text += "\n" + r.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
        } else t.push(r);
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

  linkInText(src) {
    if (!src.includes("[")) return false;
    const linkRule = inline.link;
    for (const m of src.matchAll(inline.blockSkip)) {
      if (linkRule.test(m[0]) && src.charAt(m.index - 1) !== "!") return true;
    }
    for (const m of src.matchAll(inline.reflinkSearch)) {
      const s = m[0];
      const r = s.lastIndexOf("[");
      if (!(s.charAt(0) === "!" || !Object.hasOwn(this.tokens.links, normalizeId(s.slice(r + 1, -1)))) && !(r > 1 && this.linkInText(s.slice(1, r - 1)))) return true;
    }
    return false;
  }

  inlineTokens(src, tokens = []) {
    const prev = this.state.linkParenPossible;
    const prevSrc = this.state.parenSrc, prevHas = this.state.parenHas;
    if (prev) { this.state.parenSrc = src; this.state.parenHas = -1; }
    try {
      // single native scan for the three emphasis characters
      const hasEm = emCharRe.test(src);
      const masked = hasEm ? this.maskSrc(src) : src;
      if (hasEm) pushMask(masked); else pushMaskNoEm(src);
      try {
        return this.inlineLoop(src, masked, tokens);
      } finally { popMask(); }
    } finally {
      this.state.linkParenPossible = prev;
      this.state.parenSrc = prevSrc; this.state.parenHas = prevHas;
    }
  }

  inlineLoop(src, masked, tokens) {
    let continueFlag = false;
    let prevChar = "";
    let minLen = Infinity;
    let hasAt = -1; // lazily computed: does the source contain "@"
    const tk = this.tokenizer;
    const links = this.tokens.links;
    const st = this.state;
    while (src) {
      if (src.length < minLen) minLen = src.length;
      else { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
      if (!continueFlag) prevChar = "";
      continueFlag = false;
      const c0 = src.charCodeAt(0);
      let tok;
      // first-char gates via one bitmask lookup (IDISPATCH): each rule is
      // anchored with a fixed set of possible first characters, so skipping on
      // other chars is semantics-preserving; tokenizer order is unchanged.
      const bits = c0 < 128 ? IDISPATCH[c0] : 0;
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
      if (!st.inLink && URLC0[c0]) {
        // URLC0[c0]: 1 = protocol/www/mailto/xmpp first char (always try url),
        // 2 = email-local first char (only when an "@" remains ahead)
        if (URLC0[c0] === 1) {
          if ((tok = tk.url(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        } else {
          if (hasAt === -1) hasAt = src.includes("@") ? 1 : 0;
          if (hasAt === 1 && (tok = tk.url(src))) { src = src.substring(tok.raw.length); tokens.push(tok); continue; }
        }
      }
      if (tok = tk.inlineText(src)) {
        src = src.substring(tok.raw.length);
        const lc = tok.raw.length ? tok.raw.charAt(tok.raw.length - 1) : "";
        if (lc !== "_") prevChar = lc;
        continueFlag = true;
        const last = tokens[tokens.length - 1];
        if (last?.type === "text") { last.raw += tok.raw; last.text += tok.text; }
        else tokens.push(tok);
        continue;
      }
      if (src) { throw new Error("Infinite loop on byte: " + src.charCodeAt(0)); }
    }
    return tokens;
  }

  maskSrc(src) {
    let t = src;
    // every masking replace can only match ` \ [ < — skip everything otherwise
    if (!maskCharRe.test(t)) return t;
    if (this.hasLinks && t.includes("[")) {
      const reflinkSearch = inline.reflinkSearch;
      const replacer = (r) => {
        const o = r.lastIndexOf("[");
        if (!Object.hasOwn(this.tokens.links, normalizeId(r.slice(o + 1, -1)))) return r;
        if (o > 1 && r.charAt(0) !== "!") {
          const inner = r.slice(1, o - 1);
          if (this.linkInText(inner)) return "[" + inner.replace(reflinkSearch, replacer) + "][" + "a".repeat(r.length - o - 2) + "]";
        }
        return "[" + "a".repeat(r.length - 2) + "]";
      };
      t = t.replace(reflinkSearch, replacer);
    }
    // anyPunctuationOutsideCode can only match backtick runs or backslash escapes
    const hasBacktick = t.includes("`");
    if (hasBacktick || t.includes("\\")) {
      t = t.replace(inline.anyPunctuationOutsideCode, (n, s, r) => {
        if (r) return "+".repeat(n.length);
        if (s) return s + n.slice(s.length, -s.length).replace(/`/g, "+") + s;
        return n;
      });
    }
    // blockSkip can only match a link ([...](...)), a code span or an html tag
    if (hasBacktick || t.includes("<") || (t.includes("[") && t.includes("("))) {
      t = t.replace(inline.blockSkip, (n, s, r) => {
        const o = r ? r.length : 0;
        return n.slice(0, o) + "[" + "a".repeat(n.length - o - 2) + "]";
      });
    }
    return t;
  }
}

// ---------- renderer / parser ----------

class Renderer {
  constructor(parser) { this.parser = parser; }
  space() { return ""; }
  code({ text, lang }) {
    const s = (lang || "").match(other.notSpaceStart)?.[0];
    const r = text ? text.replace(other.endingNewline, "") + "\n" : "";
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
    const i = cleanUrl(href);
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
    const r = cleanUrl(href);
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

class TextRenderer {
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

class Parser {
  constructor() {
    this.renderer = new Renderer(this);
    this.textRenderer = new TextRenderer(this);
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

export function parse(markdown) {
  maskStack.length = 0;
  const lexer = new Lexer();
  const tokens = lexer.lex(markdown);
  return new Parser().parse(tokens);
}

export { Lexer };
