var ChangeTracker = class {
  constructor(ctx, fileURI, insertionOffset) {
    this._referenceCount = 0;
    this._isDisposed = !1;
    this._offset = insertionOffset;
    let documentManager = ctx.get(TextDocumentManager);
    this._tracker = documentManager.onDidChangeTextDocument(async e => {
      if (e.document.uri.toString() === fileURI.toString()) {
        for (let cc of e.contentChanges) if (cc.rangeOffset + cc.rangeLength <= this.offset) {
          let delta = cc.text.length - cc.rangeLength;
          this._offset = this._offset + delta;
        }
      }
    });
  }
  static {
    __name(this, "ChangeTracker");
  }
  get offset() {
    return this._offset;
  }
  push(action, timeout) {
    if (this._isDisposed) throw new Error("Unable to push new actions to a disposed ChangeTracker");
    this._referenceCount++, setTimeout(() => {
      action(), this._referenceCount--, this._referenceCount === 0 && (this._tracker.dispose(), this._isDisposed = !0);
    }, timeout);
  }
};