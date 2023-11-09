var path = require("path");,function getRelativePath(workspaceFolders, docURI) {
  for (let uri of workspaceFolders) {
    let parentURI = `${uri}/`;
    if (docURI.toString().startsWith(parentURI)) return docURI.toString().slice(parentURI.length);
  }
},__name(getRelativePath, "getRelativePath");,var TextDocumentManager = class {
  static {
    __name(this, "TextDocumentManager");
  }
  async getWorkspaceFolder(doc) {
    return this.getWorkspaceFolders().find(folder => {
      if (doc.uri.toString().startsWith(folder.toString())) return folder;
    });
  }
  async getRelativePath(doc) {
    if (doc.uri.scheme !== "untitled") return getRelativePath(this.getWorkspaceFolders(), doc.uri) ?? path.basename(doc.uri.fsPath);
  }
};