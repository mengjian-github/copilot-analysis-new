var fs = Ns(require("fs")),
  import_tls = require("tls");,var certLogger = new Logger(1, "certificates"),
  RootCertificateReader = class {
    static {
      __name(this, "RootCertificateReader");
    }
  },
  getRootCertificateReader = __name((ctx, platform = process.platform) => new FeatureAwareCertificateReader(ctx.get(CopilotTokenNotifier), createRealReader(ctx, platform), new EmptyRootCertificateReader()), "getRootCertificateReader"),
  FeatureAwareCertificateReader = class extends RootCertificateReader {
    constructor(notifier, realReader, noopReader) {
      super();
      this.realReader = realReader;
      this.noopReader = noopReader;
      this.delegate = realReader, notifier.on("onCopilotToken", token => {
        this.delegate = token.getTokenValue("ssc") === "1" ? this.realReader : this.noopReader;
      });
    }
    static {
      __name(this, "FeatureAwareCertificateReader");
    }
    getAllRootCAs() {
      return this.delegate.getAllRootCAs();
    }
  };,function createRealReader(ctx, platform) {
  let cachedReader = ctx.get(CertificateReaderCache).get(platform);
  if (cachedReader) return cachedReader;
  let realReader = new ErrorHandlingCertificateReader(ctx, createPlatformReader(ctx, platform), Yoe.rootCertificates),
    envReader = new ErrorHandlingCertificateReader(ctx, new EnvironmentVariableRootCertificateReader()),
    cachingReader = new CachingRootCertificateReader([envReader, realReader]);
  return ctx.get(CertificateReaderCache).set(platform, cachingReader), cachingReader;
},__name(createRealReader, "createRealReader");,function createPlatformReader(ctx, platform) {
  switch (platform) {
    case "linux":
      return new LinuxRootCertificateReader(ctx);
    case "darwin":
      return new MacRootCertificateReader(ctx);
    case "win32":
      return new WindowsRootCertificateReader(ctx);
    default:
      return new UnsupportedPlatformRootCertificateReader();
  }
},__name(createPlatformReader, "createPlatformReader");,var ErrorHandlingCertificateReader = class extends RootCertificateReader {
    constructor(ctx, delegate, fallbackCerts = []) {
      super();
      this.ctx = ctx;
      this.delegate = delegate;
      this.fallbackCerts = fallbackCerts;
    }
    static {
      __name(this, "ErrorHandlingCertificateReader");
    }
    async getAllRootCAs() {
      try {
        return await this.delegate.getAllRootCAs();
      } catch (ex) {
        return certLogger.warn(this.ctx, `Failed to read root certificates: ${ex}`), this.fallbackCerts;
      }
    }
  },
  CachingRootCertificateReader = class extends RootCertificateReader {
    constructor(delegates) {
      super();
      this.delegates = delegates;
    }
    static {
      __name(this, "CachingRootCertificateReader");
    }
    async getAllRootCAs() {
      return this.certificates || (this.certificates = (await Promise.all(this.delegates.map(d => d.getAllRootCAs()))).flat()), this.certificates;
    }
  },
  EnvironmentVariableRootCertificateReader = class extends RootCertificateReader {
    static {
      __name(this, "EnvironmentVariableRootCertificateReader");
    }
    async getAllRootCAs() {
      let extraCertsFile = process.env.NODE_EXTRA_CA_CERTS;
      return extraCertsFile ? await readCertsFromFile(extraCertsFile) : [];
    }
  },
  LinuxRootCertificateReader = class extends RootCertificateReader {
    constructor(ctx) {
      super();
      this.ctx = ctx;
    }
    static {
      __name(this, "LinuxRootCertificateReader");
    }
    async getAllRootCAs() {
      let rootCAs = [];
      for (let certPath of ["/etc/ssl/certs/ca-certificates.crt", "/etc/ssl/certs/ca-bundle.crt"]) {
        let certs = await readCertsFromFile(certPath);
        certLogger.debug(this.ctx, `Read ${certs.length} certificates from ${certPath}`), rootCAs = rootCAs.concat(certs);
      }
      return rootCAs;
    }
  },
  MacRootCertificateReader = class extends RootCertificateReader {
    constructor(ctx) {
      super();
      this.ctx = ctx;
    }
    static {
      __name(this, "MacRootCertificateReader");
    }
    async getAllRootCAs() {
      let macCa = Woe(),
        certs = macCa.all(macCa.der2.pem).filter(c => c !== void 0);
      return certLogger.debug(this.ctx, `Read ${certs.length} certificates from Mac keychain`), certs;
    }
  },
  WindowsRootCertificateReader = class extends RootCertificateReader {
    constructor(ctx) {
      super();
      this.ctx = ctx;
    }
    static {
      __name(this, "WindowsRootCertificateReader");
    }
    async getAllRootCAs() {
      let certs = Koe().all();
      return certLogger.debug(this.ctx, `Read ${certs.length} certificates from Windows store`), certs;
    }
  },
  UnsupportedPlatformRootCertificateReader = class extends RootCertificateReader {
    static {
      __name(this, "UnsupportedPlatformRootCertificateReader");
    }
    async getAllRootCAs() {
      throw new Error("No certificate reader available for unsupported platform");
    }
  },
  EmptyRootCertificateReader = class extends RootCertificateReader {
    static {
      __name(this, "EmptyRootCertificateReader");
    }
    async getAllRootCAs() {
      return [];
    }
  };,async function readCertsFromFile(certFilePath) {
  try {
    let nonEmptyCerts = (await Xoe.promises.readFile(certFilePath, {
        encoding: "utf8"
      })).split(/(?=-----BEGIN CERTIFICATE-----)/g).filter(pem => pem.length > 0),
      uniqueCerts = new Set(nonEmptyCerts);
    return Array.from(uniqueCerts);
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
  }
  return [];
},__name(readCertsFromFile, "readCertsFromFile");