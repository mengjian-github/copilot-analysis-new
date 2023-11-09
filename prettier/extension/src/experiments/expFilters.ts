var vscode = Ns(require("vscode"));,var VSCodeEditorExperimentFilters = class extends EditorExperimentFilters {
  static {
    __name(this, "VSCodeEditorExperimentFilters");
  }
  addEditorSpecificFilters() {
    return {
      "X-VSCode-Build": DD.env.appName,
      "X-VSCode-Language": DD.env.language
    };
  }
};