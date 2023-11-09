var import_net = require("net");,function getProxyFromEnvironment(env) {
  return env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
},__name(getProxyFromEnvironment, "getProxyFromEnvironment");,function proxySettingFromUrl(proxyUrl) {
  (0, K0e.isIPv6)(proxyUrl) ? proxyUrl = "https://[" + proxyUrl + "]" : /:\/\//.test(proxyUrl) || (proxyUrl = `https://${proxyUrl}`);
  let {
    hostname: hostname,
    port: port,
    username: username,
    password: password
  } = new URL(proxyUrl);
  return {
    host: hostname,
    port: parsePort(port),
    proxyAuth: getAuth(username, password),
    headers: {}
  };
},__name(proxySettingFromUrl, "proxySettingFromUrl");,function parsePort(port) {
  if (!port) return 80;
  let portNumber = Number(port);
  if (isNaN(portNumber)) throw new TypeError("Invalid proxy port");
  return portNumber;
},__name(parsePort, "parsePort");,function getAuth(username, password) {
  return !username || !password ? "" : `${decodeURIComponent(username)}:${decodeURIComponent(password)}`;
},__name(getAuth, "getAuth");,function initProxyEnvironment(fetcher, env) {
  C3.workspace.onDidChangeConfiguration(event => {
    let hasProxyUrlChanged = event.affectsConfiguration("http.proxy");
    (event.affectsConfiguration("http.proxyStrictSSL") || event.affectsConfiguration("http.proxyAuthorization") || event.affectsConfiguration("http.proxyKerberosServicePrincipal") || hasProxyUrlChanged) && updateProxyEnvironment(fetcher, env, hasProxyUrlChanged);
  }), updateProxyEnvironment(fetcher, env);
},__name(initProxyEnvironment, "initProxyEnvironment");,var updateProxyEnvironment = __name((fetcher, env, hasProxyUrlChanged) => {
  let proxyUrl = C3.workspace.getConfiguration("http").get("proxy") || getProxyFromEnvironment(env);
  if (proxyUrl) {
    let proxyAuthorization = C3.workspace.getConfiguration("http").get("proxyAuthorization"),
      proxyStrictSSL = C3.workspace.getConfiguration("http").get("proxyStrictSSL", !0),
      proxySettings = proxySettingFromUrl(proxyUrl);
    proxyAuthorization && (proxySettings.headers["Proxy-Authorization"] = proxyAuthorization);
    let spn = C3.workspace.getConfiguration("http").get("proxyKerberosServicePrincipal");
    spn && (proxySettings.kerberosServicePrincipal = spn), fetcher.proxySettings = proxySettings, fetcher.rejectUnauthorized = proxyStrictSSL;
  } else hasProxyUrlChanged && !proxyUrl && (fetcher.proxySettings = void 0);
}, "updateProxyEnvironment");