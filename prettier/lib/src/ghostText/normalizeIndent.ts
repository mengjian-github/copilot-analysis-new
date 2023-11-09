function normalizeIndentCharacter(options, completion, isEmptyLine) {
  function replace(text, toReplace, replacer) {
    let regex = new RegExp(`^(${toReplace})+`, "g");
    return text.split(`
`).map(line => {
      let trimmed = line.replace(regex, ""),
        removedCharacters = line.length - trimmed.length;
      return replacer(removedCharacters) + trimmed;
    }).join(`
`);
  }
  __name(replace, "replace");
  let indentSize;
  if (options.tabSize === void 0 || typeof options.tabSize == "string" ? indentSize = 4 : indentSize = options.tabSize, options.insertSpaces === !1) {
    let r = __name(txt => replace(txt, " ", n => "	".repeat(Math.floor(n / indentSize)) + " ".repeat(n % indentSize)), "r");
    completion.displayText = r(completion.displayText), completion.completionText = r(completion.completionText);
  } else if (options.insertSpaces === !0) {
    let r = __name(txt => replace(txt, "	", n => " ".repeat(n * indentSize)), "r");
    if (completion.displayText = r(completion.displayText), completion.completionText = r(completion.completionText), isEmptyLine) {
      let re = __name(txt => {
        let spacesAtStart = txt.length - txt.trimLeft().length,
          remainder = spacesAtStart % indentSize;
        if (remainder !== 0 && spacesAtStart > 0) {
          let toReplace = " ".repeat(remainder);
          return replace(txt, toReplace, n => " ".repeat((Math.floor(n / indentSize) + 1) * indentSize));
        } else return txt;
      }, "re");
      completion.displayText = re(completion.displayText), completion.completionText = re(completion.completionText);
    }
  }
  return completion;
},__name(normalizeIndentCharacter, "normalizeIndentCharacter");