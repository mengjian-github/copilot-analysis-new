var tls = Ns(require("tls"));,var RootCertificateConfigurator = class {
  static {
    __name(this, "RootCertificateConfigurator");
  }
  constructor(ctx) {
    this._certificateReader = ctx.get(RootCertificateReader);
  }
  async enhanceProxySettings(proxySettings) {
    let certs = await this.getCertificates();
    return {
      ...proxySettings,
      ca: certs
    };
  }
  async getCertificates() {
    let certificates = await this._certificateReader.getAllRootCAs();
    if (certificates.length !== 0) return certificates;
  }
  async applyToRequestOptions(requestOptions) {
    let certs = await this._certificateReader.getAllRootCAs(),
      options = {
        _vscodeAdditionalCaCerts: certs
      };
    requestOptions.secureContext = Joe.createSecureContext(options), requestOptions.ca = certs, requestOptions.cert = certs, certs.map(cert => {
      requestOptions.secureContext.context.addCACert(cert);
    });
  }
};