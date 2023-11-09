var OpenTabFiles = class {
  constructor(docManager) {
    this.docManager = docManager;
  }
  static {
    __name(this, "OpenTabFiles");
  }
  async truncateDocs(docs, fileURI, languageId, maxNumNeighborFiles) {
    let openFiles = [],
      totalLen = 0;
    for (let doc of docs) if (!(totalLen + doc.getText().length > NeighborSource.MAX_NEIGHBOR_AGGREGATE_LENGTH) && (doc.uri.scheme === "file" && fileURI.scheme === "file" && doc.uri.fsPath !== fileURI.fsPath && considerNeighborFile(languageId, doc.languageId) && (openFiles.push({
      uri: doc.uri.toString(),
      relativePath: await this.docManager.getRelativePath(doc),
      languageId: doc.languageId,
      source: doc.getText()
    }), totalLen += doc.getText().length), openFiles.length >= maxNumNeighborFiles)) break;
    return openFiles;
  }
  async getNeighborFiles(uri, neighboringFileType, languageId, maxNumNeighborFiles) {
    let neighborFiles = [],
      neighborSource = new Map();
    return neighborFiles = await this.truncateDocs(sortByAccessTimes(await this.docManager.textDocuments()), uri, languageId, maxNumNeighborFiles), neighborSource.set("opentabs", neighborFiles.map(f => f.uri)), {
      docs: neighborFiles,
      neighborSource: neighborSource
    };
  }
};