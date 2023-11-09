var import_vscode_uri = Ns(B1());,var DotComAuthority = "github.com",
  DotComUrl = `https://${DotComAuthority}`,
  NetworkConfiguration = class {
    static {
      __name(this, "NetworkConfiguration");
    }
  },
  DefaultNetworkConfiguration = class extends NetworkConfiguration {
    constructor(url = DotComUrl, env = process.env) {
      super();
      this.env = env;
      this.recalculateUrls(url);
    }
    static {
      __name(this, "DefaultNetworkConfiguration");
    }
    isGitHubEnterprise() {
      return this.isEnterprise;
    }
    getAuthAuthority() {
      return this.baseUri.authority;
    }
    getTokenUrl(githubToken) {
      return githubToken.devOverride?.copilotTokenUrl ?? this.tokenUrl;
    }
    getNotificationUrl(githubToken) {
      return githubToken.devOverride?.notificationUrl ?? this.notificationUrl;
    }
    getContentRestrictionsUrl(githubToken) {
      return githubToken.devOverride?.contentRestrictionsUrl ?? this.contentRestrictionsUrl;
    }
    getDeviceFlowStartUrl() {
      return this.deviceFlowStartUrl;
    }
    getDeviceFlowCompletionUrl() {
      return this.deviceFlowCompletionUrl;
    }
    getUserInfoUrl() {
      return this.userInfoUrl;
    }
    updateBaseUrl(ctx, newUrl = DotComUrl) {
      let oldUri = this.baseUri;
      this.recalculateUrls(newUrl), oldUri.toString() !== this.baseUri.toString() && ctx.get(CopilotTokenManager).resetCopilotToken(ctx);
    }
    recalculateUrls(url) {
      let uris = this.parseUris(url);
      this.baseUri = uris.base;
      let apiUri = uris.api;
      this.isEnterprise = this.baseUri.authority !== DotComAuthority, this.tokenUrl = Pu.Utils.joinPath(apiUri, "/copilot_internal/v2/token").toString(), this.notificationUrl = Pu.Utils.joinPath(apiUri, "/copilot_internal/notification").toString(), this.contentRestrictionsUrl = Pu.Utils.joinPath(apiUri, "/copilot_internal/content_exclusion").toString(), this.deviceFlowStartUrl = Pu.Utils.joinPath(this.baseUri, "/login/device/code").toString(), this.deviceFlowCompletionUrl = Pu.Utils.joinPath(this.baseUri, "/login/oauth/access_token").toString(), this.userInfoUrl = Pu.Utils.joinPath(apiUri, "/user").toString();
    }
    parseUris(url) {
      if (this.env.CODESPACES === "true" && this.env.GITHUB_TOKEN && this.env.GITHUB_SERVER_URL && this.env.GITHUB_API_URL) try {
        return {
          base: Pu.URI.parse(this.env.GITHUB_SERVER_URL, !0),
          api: Pu.URI.parse(this.env.GITHUB_API_URL, !0)
        };
      } catch {}
      let base = Pu.URI.parse(url),
        api = Pu.URI.parse(`${base.scheme}://api.${base.authority}`);
      return {
        base: base,
        api: api
      };
    }
  };