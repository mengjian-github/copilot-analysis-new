var SnippyLexemeRegex = new RegExp("[_\\p{L}\\p{Nd}]+|====+|----+|####+|////+|\\*\\*\\*\\*+|[\\p{P}\\p{S}]", "gu"),
  MinTokenLength = 65;,function lexemeLength(text) {
  let i = 0,
    m;
  SnippyLexemeRegex.lastIndex = 0;
  do if (m = SnippyLexemeRegex.exec(text), m && (i += 1), i >= MinTokenLength) break; while (m);
  return i;
},__name(lexemeLength, "lexemeLength");,function offsetFirstLexemes(text, n) {
  let i = 0,
    m;
  SnippyLexemeRegex.lastIndex = 0;
  do if (m = SnippyLexemeRegex.exec(text), m && (i += 1, i >= n)) return SnippyLexemeRegex.lastIndex; while (m);
  return text.length;
},__name(offsetFirstLexemes, "offsetFirstLexemes");,function offsetLastLexemes(text, n) {
  let textRev = text.split("").reverse().join(""),
    offsetRev = offsetFirstLexemes(textRev, n);
  return textRev.length - offsetRev;
},__name(offsetLastLexemes, "offsetLastLexemes");,function hasMinLexemeLength(text) {
  return lexemeLength(text) >= MinTokenLength;
},__name(hasMinLexemeLength, "hasMinLexemeLength");