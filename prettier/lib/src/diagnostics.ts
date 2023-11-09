var os = Ns(require("os")),
  tls = Ns(require("tls"));,async function collectDiagnostics(ctx) {
  return {
    sections: [collectCopilotSection(ctx), collectEnvironmentSection(), await collectFeatureFlagsSection(ctx), collectNodeSection(), collectNetworkConfigSection(ctx), await collectReachabilitySection(ctx)]
  };
},__name(collectDiagnostics, "collectDiagnostics");,function formatDiagnosticsAsMarkdown(data) {
  return data.sections.map(formatSectionAsMarkdown).join(Hu.EOL + Hu.EOL);
},__name(formatDiagnosticsAsMarkdown, "formatDiagnosticsAsMarkdown");,function collectCopilotSection(ctx) {
  return {
    name: "Copilot",
    items: {
      Version: getVersion(ctx),
      Build: getBuildType(ctx),
      Editor: editorVersionHeaders(ctx)["Editor-Version"]
    }
  };
},__name(collectCopilotSection, "collectCopilotSection");,function collectEnvironmentSection() {
  return {
    name: "Environment",
    items: {
      http_proxy: findEnvironmentVariable("http_proxy"),
      https_proxy: findEnvironmentVariable("https_proxy"),
      no_proxy: findEnvironmentVariable("no_proxy"),
      SSL_CERT_FILE: findEnvironmentVariable("SSL_CERT_FILE"),
      SSL_CERT_DIR: findEnvironmentVariable("SSL_CERT_DIR"),
      OPENSSL_CONF: findEnvironmentVariable("OPENSSL_CONF")
    }
  };
},__name(collectEnvironmentSection, "collectEnvironmentSection");,function collectNodeSection() {
  return {
    name: "Node setup",
    items: {
      "Number of root certificates": b3.rootCertificates.length,
      "Operating system": Hu.type(),
      "Operating system version": Hu.release(),
      "Operating system architecture": Hu.arch(),
      NODE_OPTIONS: findEnvironmentVariable("NODE_OPTIONS"),
      NODE_EXTRA_CA_CERTS: findEnvironmentVariable("NODE_EXTRA_CA_CERTS"),
      NODE_TLS_REJECT_UNAUTHORIZED: findEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED"),
      "tls default min version": b3.DEFAULT_MIN_VERSION,
      "tls default max version": b3.DEFAULT_MAX_VERSION
    }
  };
},__name(collectNodeSection, "collectNodeSection");,async function collectFeatureFlagsSection(ctx) {
  let ssc = "",
    rt = "";
  try {
    let token = await ctx.get(CopilotTokenManager).getCopilotToken(ctx);
    ssc = token.getTokenValue("ssc") === "1" ? "enabled" : "disabled", rt = token.getTokenValue("rt") === "1" ? "enabled" : "disabled";
  } catch {
    ssc = rt = "unable to determine";
  }
  return {
    name: "Feature Flags",
    items: {
      "Custom Certificates": ssc,
      "Send Restricted Telemetry": rt
    }
  };
},__name(collectFeatureFlagsSection, "collectFeatureFlagsSection");,function collectNetworkConfigSection(ctx) {
  let fetcher = ctx.get(Fetcher);
  return {
    name: "Network Configuration",
    items: {
      "Proxy host": fetcher.proxySettings?.host,
      "Proxy port": fetcher.proxySettings?.port,
      "Proxy auth": fetcher.proxySettings?.proxyAuth,
      "Kerberos SPN": fetcher.proxySettings?.kerberosServicePrincipal,
      "Reject unauthorized": fetcher.rejectUnauthorized ? "enabled" : "disabled"
    }
  };
},__name(collectNetworkConfigSection, "collectNetworkConfigSection");,async function collectReachabilitySection(ctx) {
  return {
    name: "Reachability",
    items: {
      "github.com": await determineReachability(ctx, "https://github.com"),
      "copilot-proxy.githubusercontent.com": await determineReachability(ctx, "https://copilot-proxy.githubusercontent.com/_ping"),
      "default.exp-tas.com": await determineReachability(ctx, "https://default.exp-tas.com/vscode/ab")
    }
  };
},__name(collectReachabilitySection, "collectReachabilitySection");,async function determineReachability(ctx, url) {
  try {
    let response = await ctx.get(Fetcher).fetch(url, {});
    return `HTTP ${response.status} - ${response.statusText}`;
  } catch (err) {
    return err.message;
  }
},__name(determineReachability, "determineReachability");,function findEnvironmentVariable(name) {
  let key = Object.keys(process.env).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? process.env[key] : void 0;
},__name(findEnvironmentVariable, "findEnvironmentVariable");,function formatSectionAsMarkdown(s) {
  return `## ${s.name}` + Hu.EOL + Hu.EOL + Object.keys(s.items).filter(k => k !== "name").map(k => `- ${k}: ${s.items[k] ?? "n/a"}`).join(Hu.EOL);
},__name(formatSectionAsMarkdown, "formatSectionAsMarkdown");,async function openDiagnosticReport(ctx) {
  let installationCheck = __name(name => wh.extensions.getExtension(name) !== void 0, "installationCheck"),
    reportData = await new DiagnosticReport(installationCheck).collectData(ctx),
    report = formatDiagnosticsAsMarkdown(reportData),
    doc = await wh.workspace.openTextDocument({
      language: "markdown",
      content: report
    });
  await wh.window.showTextDocument(doc);
},__name(openDiagnosticReport, "openDiagnosticReport");,var DiagnosticReport = class {
  static {
    __name(this, "DiagnosticReport");
  }
  constructor(installationCheck) {
    this.isExtensionInstalled = installationCheck;
  }
  async collectData(ctx) {
    return {
      sections: [...(await collectDiagnostics(ctx)).sections, this.collectConfigurationSection(), this.collectExtensionSection(ctx)]
    };
  }
  collectConfigurationSection() {
    return {
      name: "VS Code Configuration",
      items: {
        "HTTP proxy": this.findVsCodeConfiguration("http", "proxy"),
        "HTTP proxy autentication": this.findVsCodeConfiguration("http", "proxyAuthorization"),
        "Proxy Strict SSL": this.findVsCodeConfiguration("http", "proxyStrictSSL"),
        "Extension HTTP proxy support": this.findVsCodeConfiguration("http", "proxySupport")
      }
    };
  }
  collectExtensionSection(ctx) {
    return {
      name: "Extensions",
      items: {
        "Is `win-ca` installed?": this.isExtensionInstalled("ukoloff.win-ca"),
        "Is `mac-ca` installed?": this.isExtensionInstalled("linhmtran168.mac-ca-vscode")
      }
    };
  }
  findVsCodeConfiguration(section, name) {
    return wh.workspace.getConfiguration(section).get(name);
  }
};