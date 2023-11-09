var TestUrlOpener = class extends UrlOpener {
  constructor() {
    super(...arguments);
    this.openedUrls = [];
  }
  static {
    __name(this, "TestUrlOpener");
  }
  open(target) {
    this.openedUrls.push(target);
  }
};