var open = yee(),
  UrlOpener = class {
    static {
      __name(this, "UrlOpener");
    }
  },
  RealUrlOpener = class extends UrlOpener {
    static {
      __name(this, "RealUrlOpener");
    }
    async open(target) {
      await open(target);
    }
  };