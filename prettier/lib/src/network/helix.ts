var HelixFetcher = class extends Fetcher {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.createSocketFactory = (userSettings, rejectUnauthorized) => async requestOptions => {
      requestOptions.rejectUnauthorized = rejectUnauthorized, requestOptions.timeout = userSettings.connectionTimeoutInMs, await this.certificateConfigurator.applyToRequestOptions(requestOptions);
      let proxySettings = await this.certificateConfigurator.enhanceProxySettings(userSettings);
      return await this.proxySocketFactory.createSocket(requestOptions, proxySettings);
    };
    this.fetchApi = this.createFetchApi(ctx), this.certificateConfigurator = new RootCertificateConfigurator(ctx), this.proxySocketFactory = ctx.get(ProxySocketFactory);
  }
  static {
    __name(this, "HelixFetcher");
  }
  set proxySettings(value) {
    this._proxySettings = value, this.fetchApi = this.createFetchApi(this.ctx);
  }
  get proxySettings() {
    return this._proxySettings;
  }
  set rejectUnauthorized(value) {
    super.rejectUnauthorized = value, this.fetchApi = this.createFetchApi(this.ctx);
  }
  get rejectUnauthorized() {
    return super.rejectUnauthorized;
  }
  createFetchApi(ctx) {
    let buildInfo = ctx.get(BuildInfo);
    return super.rejectUnauthorized === !1 && (process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"), context({
      userAgent: `GithubCopilot/${buildInfo.getVersion()}`,
      socketFactory: this._proxySettings ? this.createSocketFactory(this._proxySettings, super.rejectUnauthorized) : void 0,
      rejectUnauthorized: super.rejectUnauthorized
    });
  }
  async fetch(url, options) {
    let helixOptions = {
      ...options,
      body: options.body ? options.body : options.json,
      signal: options.signal
    };
    await this.certificateConfigurator.applyToRequestOptions(helixOptions);
    let certs = await this.certificateConfigurator.getCertificates();
    this.fetchApi.setCA(certs);
    let resp = await this.fetchApi.fetch(url, helixOptions);
    return new Response(resp.status, resp.statusText, resp.headers, () => resp.text(), async () => resp.body);
  }
  disconnectAll() {
    return this.fetchApi.reset();
  }
  makeAbortController() {
    return new AbortController();
  }
};