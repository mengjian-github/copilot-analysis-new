var import_copilot_promptlib = Ns(Dc()),
  vscode = Ns(require("vscode")),
  import_vscode = require("vscode");,var ExtensionSymbolDefinitionProvider = class extends SymbolDefinitionProvider {
  static {
    __name(this, "ExtensionSymbolDefinitionProvider");
  }
  async getSymbolDefinition(docInfo) {
    let location = {
        line: docInfo.position.line,
        character: docInfo.position.character,
        uri: T3.Uri.parse(docInfo.uri)
      },
      [signature, semantics] = await this.getHoverTextAndDecompose(location);
    return signature === "" ? [] : [{
      snippet: signature,
      score: 1,
      startLine: location.line,
      endLine: location.line,
      semantics: semantics,
      provider: pc.SnippetProviderType.SymbolDef
    }];
  }
  async getHoverTextAndDecompose(uriLineCol) {
    let hoverText = await T3.commands.executeCommand("vscode.executeHoverProvider", uriLineCol.uri, new J0e.Position(uriLineCol.line, uriLineCol.character));
    return hoverText[0] && hoverText[0].contents[0] instanceof T3.MarkdownString ? decomposeHoverText(hoverText[0].contents[0].value) : ["", pc.SnippetSemantics.Snippet];
  }
};,function decomposeHoverText(hoverText) {
  let regex = /```\w+\n(class|\(\w+\))\s([^`]*)```.*/m,
    match = hoverText.match(regex);
  if (match != null) {
    let codeTypeString = match[1],
      semantics = getSemantics(codeTypeString);
    return [match[2].trim(), semantics];
  } else return ["", pc.SnippetSemantics.Snippet];
},__name(decomposeHoverText, "decomposeHoverText");,function getSemantics(codeTypeString) {
  switch (codeTypeString = codeTypeString.replace("(", "").replace(")", ""), codeTypeString) {
    case "function":
      return pc.SnippetSemantics.Function;
    case "variable":
      return pc.SnippetSemantics.Variable;
    case "parameter":
      return pc.SnippetSemantics.Parameter;
    case "method":
      return pc.SnippetSemantics.Method;
    case "class":
      return pc.SnippetSemantics.Class;
    case "module":
      return pc.SnippetSemantics.Module;
    case "alias":
      return pc.SnippetSemantics.Alias;
    case "enum":
      return pc.SnippetSemantics.Enum;
    case "interface":
      return pc.SnippetSemantics.Interface;
    default:
      return pc.SnippetSemantics.Snippet;
  }
},__name(getSemantics, "getSemantics");