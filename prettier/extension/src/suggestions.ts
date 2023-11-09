function ignoreDocument(ctx, document) {
  let language = document.languageId;
  return !!(!getEnabledConfig(ctx, language) || [CopilotPanelScheme, "output", "search-editor"].includes(document.uri.scheme));
},__name(ignoreDocument, "ignoreDocument");