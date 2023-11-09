var CompletionsCache = class {
  static {
    __name(this, "CompletionsCache");
  }
  constructor() {
    this._cache = new LRUCacheMap(100);
  }
  get(promptKey) {
    return this._cache.get(promptKey);
  }
  set(promptKey, contents) {
    this._cache.set(promptKey, contents);
  }
  clear() {
    this._cache.clear();
  }
};