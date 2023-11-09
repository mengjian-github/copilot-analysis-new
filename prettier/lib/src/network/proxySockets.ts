var http = Ns(require("http"));,var PROXY_AUTHORIZATION_REQUIRED = 407,
  logger = new Logger(0, "proxy-socket-factory"),
  ProxySocketFactory = class {
    static {
      __name(this, "ProxySocketFactory");
    }
  },
  ProxySocketError = class extends Error {
    constructor(message, cause, code) {
      super(message);
      this.code = cause?.code, this.syscall = cause?.syscall, this.errno = cause?.errno, /^Failed to establish a socket connection to proxies:/.test(cause?.message ?? "") ? this.code = "ProxyFailedToEstablishSocketConnection" : /^InitializeSecurityContext:/.test(cause?.message ?? "") ? this.code = "ProxyInitializeSecurityContext" : cause?.message === "Miscellaneous failure (see text): Server not found in Kerberos database" ? this.code = "ProxyKerberosServerNotFound" : /^Unspecified GSS failure. {2}Minor code may provide more information: No Kerberos credentials available/.test(cause?.message ?? "") && (this.code = "ProxyGSSFailureNoKerberosCredentialsAvailable"), code !== void 0 && (this.code = code);
    }
    static {
      __name(this, "ProxySocketError");
    }
  };,function getProxySocketFactory(ctx) {
  return new KerberosProxySocketFactory(ctx, new TunnelingProxySocketFactory(ctx));
},__name(getProxySocketFactory, "getProxySocketFactory");,var KerberosProxySocketFactory = class extends ProxySocketFactory {
    constructor(ctx, delegate, kerberosLoader = new KerberosLoader(), platform = process.platform) {
      super();
      this.ctx = ctx;
      this.delegate = delegate;
      this.kerberosLoader = kerberosLoader;
      this.platform = platform;
      this.successfullyAuthorized = new LRUCacheMap(20);
    }
    static {
      __name(this, "KerberosProxySocketFactory");
    }
    async createSocket(requestOptions, proxySettings) {
      this.successfullyAuthorized.get(this.getProxyCacheKey(proxySettings)) && (logger.debug(this.ctx, "Proxy authorization already successful once, skipping 407 rountrip"), await this.reauthorize(requestOptions, proxySettings));
      try {
        return await this.delegate.createSocket(requestOptions, proxySettings);
      } catch (error) {
        if (error instanceof ProxySocketError && error.code === `ProxyStatusCode${PROXY_AUTHORIZATION_REQUIRED}`) {
          logger.debug(this.ctx, "Proxy authorization required, trying to authorize first time");
          let socket = await this.authorizeAndCreateSocket(requestOptions, proxySettings);
          if (socket) return logger.debug(this.ctx, "Proxy authorization successful, caching result"), this.successfullyAuthorized.set(this.getProxyCacheKey(proxySettings), !0), socket;
        }
        throw error;
      }
    }
    async reauthorize(requestOptions, proxySettings) {
      let proxyAuthorization = await this.authorize(proxySettings);
      proxyAuthorization && (logger.debug(this.ctx, "Proxy re-authorization successful, received token"), requestOptions.headers["Proxy-Authorization"] = "Negotiate " + proxyAuthorization);
    }
    async authorizeAndCreateSocket(requestOptions, proxySettings) {
      let proxyAuthorization = await this.authorize(proxySettings);
      if (logger.debug(this.ctx, "Proxy authorization successful, received token"), proxyAuthorization) return logger.debug(this.ctx, "Trying to create socket with proxy authorization"), requestOptions.headers["Proxy-Authorization"] = "Negotiate " + proxyAuthorization, await this.delegate.createSocket(requestOptions, proxySettings);
    }
    async authorize(proxySettings) {
      logger.debug(this.ctx, "Loading kerberos module");
      let kerberos = this.kerberosLoader.load(),
        spn = this.computeSpn(proxySettings);
      logger.debug(this.ctx, "Initializing kerberos client using spn", spn);
      let client = await kerberos.initializeClient(spn);
      logger.debug(this.ctx, "Perform client side kerberos step");
      let response = await client.step("");
      return logger.debug(this.ctx, "Received kerberos server response"), response;
    }
    computeSpn(proxySettings) {
      let configuredSpn = getHiddenConfig(this.ctx, ConfigKey.KerberosServicePrincipal, {
        default: proxySettings.kerberosServicePrincipal
      });
      if (configuredSpn) return logger.debug(this.ctx, "Using configured kerberos spn", configuredSpn), configuredSpn;
      let defaultSpn = this.platform === "win32" ? `HTTP/${proxySettings.host}` : `HTTP@${proxySettings.host}`;
      return logger.debug(this.ctx, "Using default kerberos spn", defaultSpn), defaultSpn;
    }
    getProxyCacheKey(proxySettings) {
      return proxySettings.host + ":" + proxySettings.port;
    }
  },
  TunnelingProxySocketFactory = class extends ProxySocketFactory {
    constructor(ctx) {
      super();
      this.ctx = ctx;
    }
    static {
      __name(this, "TunnelingProxySocketFactory");
    }
    async createSocket(requestOptions, proxySettings) {
      let connectOptions = this.createConnectRequestOptions(requestOptions, proxySettings);
      return new Promise((resolve, reject) => {
        logger.debug(this.ctx, "Attempting to establish connection to proxy");
        let connectRequest = yae.request(connectOptions);
        connectRequest.useChunkedEncodingByDefault = !1, connectRequest.once("connect", (res, socket, head) => {
          logger.debug(this.ctx, "Socket Connect returned status code", res.statusCode), connectRequest.removeAllListeners(), socket.removeAllListeners(), res.statusCode !== 200 ? (socket.destroy(), reject(new ProxySocketError(`tunneling socket could not be established, statusCode=${res.statusCode}`, void 0, `ProxyStatusCode${res.statusCode}`))) : head.length > 0 ? (socket.destroy(), reject(new ProxySocketError(`got non-empty response body from proxy, length=${head.length}`, void 0, "ProxyNonEmptyResponseBody"))) : (logger.debug(this.ctx, "Successfully established tunneling connection to proxy"), resolve(socket));
        }), connectRequest.once("error", cause => {
          logger.debug(this.ctx, "Proxy socket connection error", cause.message), connectRequest.removeAllListeners(), reject(new ProxySocketError(`tunneling socket could not be established, cause=${cause.message}`, cause));
        }), connectRequest.on("timeout", () => {
          logger.debug(this.ctx, "Proxy socket connection timeout"), reject(new ProxySocketError(`tunneling socket could not be established, proxy socket connection timeout while connecting to ${connectOptions.host}:${connectOptions.port}`, void 0, "ProxyTimeout"));
        }), connectRequest.end();
      });
    }
    createConnectRequestOptions(requestOptions, proxySettings) {
      let path = `${requestOptions.hostname}:${requestOptions.port}`,
        connectOptions = {
          ...proxySettings,
          method: "CONNECT",
          path: path,
          agent: !1,
          headers: {
            host: path,
            "Proxy-Connection": "keep-alive"
          },
          timeout: requestOptions.timeout
        };
      return requestOptions.localAddress && (connectOptions.localAddress = requestOptions.localAddress), this.configureProxyAuthorization(connectOptions, requestOptions), connectOptions;
    }
    configureProxyAuthorization(connectOptions, requestOptions) {
      connectOptions.headers["Proxy-Authorization"] = [], connectOptions.proxyAuth && connectOptions.headers["Proxy-Authorization"].push("Basic " + Buffer.from(connectOptions.proxyAuth).toString("base64")), requestOptions.headers && requestOptions.headers["Proxy-Authorization"] && connectOptions.headers["Proxy-Authorization"].push(requestOptions.headers["Proxy-Authorization"]);
    }
  },
  KerberosLoader = class {
    static {
      __name(this, "KerberosLoader");
    }
    load() {
      return _ae();
    }
  };