var MAX_NUM_FILES = 100,
  CursorHistoryManager = class {
    static {
      __name(this, "CursorHistoryManager");
    }
    constructor() {
      this.lineCursorHistory = new LRUCacheMap(MAX_NUM_FILES), this.fileCursorHistory = new LRUCacheMap(MAX_NUM_FILES);
    }
    add(doc, line, timestamp) {
      let uri = doc.uri.toString(),
        singleFile = this.lineCursorHistory.get(uri) ?? new Map(),
        numFocused = singleFile.get(line) ?? 0;
      singleFile.set(line, numFocused + 1), this.lineCursorHistory.set(uri, singleFile), this.fileCursorHistory.set(uri, {
        uri: uri,
        doc: doc,
        clickCount: (this.fileCursorHistory.get(uri)?.clickCount ?? 0) + 1,
        lastClickTime: timestamp
      });
    }
    getDocs() {
      let docs = [];
      for (let key of this.fileCursorHistory.keys()) {
        let docTime = this.fileCursorHistory.get(key);
        docTime !== void 0 && docs.push(docTime);
      }
      return docs;
    }
    sortedDocsByClickTime() {
      return this.getDocs().sort((a, b) => b.lastClickTime - a.lastClickTime).map(f => f.doc);
    }
    sortedDocsByClickCount() {
      return this.getDocs().sort((a, b) => b.clickCount === a.clickCount ? b.lastClickTime - a.lastClickTime : b.clickCount - a.clickCount).map(f => f.doc);
    }
  };