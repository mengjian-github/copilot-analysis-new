var import_crypto_js = Ns(o8());,function keyForPrompt(prompt) {
  return (0, a8.SHA256)(a8.enc.Utf16.parse(prompt.prefix + prompt.suffix)).toString();
},__name(keyForPrompt, "keyForPrompt");,var LRUCacheMap = class {
  constructor(size = 10) {
    this.valueMap = new Map();
    this.lruKeys = [];
    this.sizeLimit = size;
  }
  static {
    __name(this, "LRUCacheMap");
  }
  set(key, value) {
    let maybeKeyToDelete;
    return this.valueMap.has(key) ? maybeKeyToDelete = key : this.lruKeys.length >= this.sizeLimit && (maybeKeyToDelete = this.lruKeys[0]), maybeKeyToDelete !== void 0 && this.delete(maybeKeyToDelete), this.valueMap.set(key, value), this.touchKeyInLRU(key), this;
  }
  get(key) {
    if (this.valueMap.has(key)) {
      let entry = this.valueMap.get(key);
      return this.touchKeyInLRU(key), entry;
    }
  }
  delete(key) {
    return this.has(key) ? (this.removeKeyFromLRU(key), this.valueMap.get(key) !== void 0 && this.valueMap.delete(key), !0) : !1;
  }
  clear() {
    this.valueMap.clear(), this.lruKeys = [];
  }
  get size() {
    return this.valueMap.size;
  }
  keys() {
    return this.lruKeys.slice().values();
  }
  values() {
    return new Map(this.valueMap).values();
  }
  entries() {
    return new Map(this.valueMap).entries();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  has(key) {
    return this.valueMap.has(key);
  }
  forEach(callbackfn, thisArg) {
    new Map(this.valueMap).forEach(callbackfn, thisArg);
  }
  get [Symbol.toStringTag]() {
    return "LRUCacheMap";
  }
  peek(key) {
    return this.valueMap.get(key);
  }
  removeKeyFromLRU(key) {
    let index = this.lruKeys.indexOf(key);
    index !== -1 && this.lruKeys.splice(index, 1);
  }
  touchKeyInLRU(key) {
    this.removeKeyFromLRU(key), this.lruKeys.push(key);
  }
};