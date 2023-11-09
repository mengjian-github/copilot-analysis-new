var CertificateReaderCache = class {
  constructor() {
    this.cache = new Map();
  }
  static {
    __name(this, "CertificateReaderCache");
  }
  get(platform) {
    return this.cache.get(platform);
  }
  set(platform, reader) {
    this.cache.set(platform, reader);
  }
};