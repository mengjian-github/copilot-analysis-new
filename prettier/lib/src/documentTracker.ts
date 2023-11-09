var accessTimes = new LRUCacheMap();,function sortByAccessTimes(docs) {
  return [...docs].sort((a, b) => {
    let aAccessTime = accessTimes.get(a.uri.toString()) ?? 0;
    return (accessTimes.get(b.uri.toString()) ?? 0) - aAccessTime;
  });
},__name(sortByAccessTimes, "sortByAccessTimes");,var registerDocumentTracker = __name(ctx => ctx.get(TextDocumentManager).onDidFocusTextDocument(e => {
    e && accessTimes.set(e.document.uri.toString(), Date.now());
  }), "registerDocumentTracker"),
  cursorHistoryManager = new CursorHistoryManager(),
  registerCursorTracker = __name(ctx => ctx.get(TextDocumentManager).onDidChangeCursor(e => {
    if (e && e.selections) for (let selection of e.selections) cursorHistoryManager.add(e.textEditor.document, selection.anchor.line, Date.now()), cursorHistoryManager.add(e.textEditor.document, selection.active.line, Date.now());
  }), "registerCursorTracker");,var CoCommittedFiles = class _CoCommittedFiles {
  constructor(docManager, commitFileResolver) {
    this.docManager = docManager;
    this.commitFileResolver = commitFileResolver;
    this.cocommittedFilesCache = this.computeInBackgroundAndMemoize(_CoCommittedFiles.getCoCommittedFiles, 1);
  }
  static {
    __name(this, "CoCommittedFiles");
  }
  async tryGetTextDocument(uri) {
    try {
      return await this.docManager.getTextDocument(FB.URI.parse(uri));
    } catch {
      return;
    }
  }
  static async getCoCommittedFiles(ns, fileURI, neighboringFileType, languageId, maxNumFiles) {
    if (ns.commitFileResolver === void 0) return [];
    let coCommittedFiles = await ns.commitFileResolver.getCoCommitResult(fileURI, maxNumFiles),
      totalLen = 0,
      files = [];
    for (let cocommittedFile of coCommittedFiles) {
      if (cocommittedFile.toString() === fileURI.toString()) continue;
      let doc = await ns.tryGetTextDocument(cocommittedFile.toString());
      if (!(doc === void 0 || totalLen + doc.getText().length > NeighborSource.MAX_NEIGHBOR_AGGREGATE_LENGTH) && doc.uri.scheme == "file" && doc.languageId === languageId && (files.push({
        uri: doc.uri.toString(),
        relativePath: await ns.docManager.getRelativePath(doc),
        languageId: doc.languageId,
        source: doc.getText()
      }), totalLen += doc.getText().length, files.length >= maxNumFiles)) break;
    }
    return files;
  }
  async truncateDocs(docs, fileURI, languageId, maxNumNeighborFiles) {
    let openFiles = [],
      totalLen = 0;
    for (let doc of docs) if (!(totalLen + doc.getText().length > NeighborSource.MAX_NEIGHBOR_AGGREGATE_LENGTH) && (doc.uri.scheme === "file" && fileURI.scheme === "file" && doc.uri.fsPath !== fileURI.fsPath && doc.languageId === languageId && (openFiles.push({
      uri: doc.uri.toString(),
      relativePath: await this.docManager.getRelativePath(doc),
      languageId: doc.languageId,
      source: doc.getText()
    }), totalLen += doc.getText().length), openFiles.length >= maxNumNeighborFiles)) break;
    return openFiles;
  }
  computeInBackgroundAndMemoize(fct, cacheSize) {
    let resultsCache = new LRUCacheMap(cacheSize),
      inComputation = new Set();
    return (fileURI, type, ...args) => {
      let key = fileURI.toString() + type,
        memorizedComputation = resultsCache.get(key);
      if (memorizedComputation) return memorizedComputation;
      if (inComputation.has(key)) return null;
      let computation = fct(this, fileURI, type, ...args);
      return inComputation.add(key), computation.then(computedResult => {
        resultsCache.set(key, computedResult), inComputation.delete(key);
      }), null;
    };
  }
  async getNeighborFiles(uri, neighboringFileType, languageId, maxNumNeighborFiles) {
    let neighborFiles = [],
      neighborSource = new Map();
    if (neighborFiles = await this.truncateDocs(sortByAccessTimes((await this.docManager.textDocuments()).filter(doc => accessTimes.get(doc.uri.toString()) !== void 0)), uri, languageId, maxNumNeighborFiles), neighborSource.set("opentabs", neighborFiles.map(f => f.uri)), neighborFiles.length < maxNumNeighborFiles) {
      let cocommittedFiles = this.cocommittedFilesCache(uri, neighboringFileType, languageId, maxNumNeighborFiles);
      if (cocommittedFiles !== null) {
        let neighborFileUriSet = new Set(neighborFiles.map(f => f.uri));
        cocommittedFiles = cocommittedFiles.filter(f => !neighborFileUriSet.has(f.uri)).slice(0, maxNumNeighborFiles - neighborFiles.length), neighborFiles.push(...cocommittedFiles), neighborSource.set(neighboringFileType, cocommittedFiles.map(f => f.uri));
      }
    }
    return {
      docs: neighborFiles,
      neighborSource: neighborSource
    };
  }
};