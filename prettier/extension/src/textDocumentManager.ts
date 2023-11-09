var import_vscode = require("vscode");,var ExtensionTextDocumentManager = class extends TextDocumentManager {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.onDidFocusTextDocument = ap.window.onDidChangeActiveTextEditor;
    this.onDidChangeTextDocument = ap.workspace.onDidChangeTextDocument;
    this.onDidChangeCursor = ap.window.onDidChangeTextEditorSelection;
  }
  static {
    __name(this, "ExtensionTextDocumentManager");
  }
  async textDocuments() {
    let documents = ap.workspace.textDocuments,
      filteredDocuments = [];
    for (let doc of documents) (await isDocumentValid(this.ctx, doc)).status === "valid" && filteredDocuments.push(doc);
    return filteredDocuments;
  }
  async getTextDocumentWithValidation(uri) {
    try {
      let doc = await ap.workspace.openTextDocument(uri);
      return isDocumentValid(this.ctx, doc);
    } catch {
      return {
        status: "notfound",
        message: `Document for URI could not be found: ${uri}`
      };
    }
  }
  async getTextDocument(uri) {
    let result = await this.getTextDocumentWithValidation(uri);
    if (result.status === "valid") return result.document;
  }
  findNotebook(doc) {
    return ap.workspace.notebookDocuments.find(notebook => notebook.getCells().some(cell => cell.document.uri.toString() === doc.uri.toString()));
  }
  getWorkspaceFolders() {
    return ap.workspace.workspaceFolders?.map(f => f.uri) ?? [];
  }
};