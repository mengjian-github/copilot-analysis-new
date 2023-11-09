var nodePath = Ns(require("path"));,var CopilotRepositoryControl = class extends PolicyEvaluator {
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.repoUriToPolicyMap = new Map();
    this.requestStatus = {
      status: "initial"
    };
    this.initialWaitMs = 30 * 1e3;
    this.maxRetryCount = 3;
  }
  static {
    __name(this, "CopilotRepositoryControl");
  }
  async refresh() {
    try {
      this.reset(), this.requestStatus.status !== "retrying" && (this.requestStatus = {
        status: "initial"
      }, await this.fetchControlData());
    } catch (err) {
      telemetryException(this.ctx, err, "repositoryControl.refresh");
    }
  }
  reset() {
    this.repoUriToPolicyMap.clear();
  }
  async fetchControlData() {
    if (this.requestStatus.status === "retrying" || this.requestStatus.status === "maxRetries") return "POLICY_NOT_AVAILABLE";
    if (this.requestStatus.status === "cached") return this.requestStatus.data;
    this.requestStatus.status !== "fetching" && (this.requestStatus = {
      status: "fetching",
      data: this._fetchControlData()
    });
    let data = await this.requestStatus.data;
    return data || "POLICY_NOT_AVAILABLE";
  }
  async _fetchControlData() {
    if (this.requestStatus.status === "retrying") {
      let _waitMs = this.requestStatus.waitMs;
      await new Promise(resolve => setTimeout(resolve, _waitMs));
    }
    try {
      let githubToken = await this.ctx.get(CopilotTokenManager).getGitHubToken(this.ctx),
        editorSession = this.ctx.get(EditorSession),
        editorInfo = this.ctx.get(EditorAndPluginInfo),
        telemetryConfig = this.ctx.get(TelemetryUserConfig);
      if (!githubToken) throw new CopilotAuthError("No github token found");
      let fetcher = this.ctx.get(Fetcher),
        headers = {
          trackingid: `${telemetryConfig.trackingId}`,
          githubtoken: `${githubToken}`,
          machineid: `${editorSession.machineId}`,
          sessionid: `${editorSession.sessionId}`,
          extname: `${editorInfo.getEditorPluginInfo().name}`,
          extversion: `${editorInfo.getEditorPluginInfo().version}`
        },
        response = await fetcher.fetch(POLICY_ENDPOINT, {
          headers: headers,
          method: "GET"
        });
      if (response.ok) {
        let content = await response.json(),
          lowercaseConfig = {};
        for (let key in content.config) lowercaseConfig[key.toLowerCase()] = content.config[key];
        return content.config = lowercaseConfig, logger.info(this.ctx, "repositoryControl.fetch", "success", Object.keys(content.config).length + " repos"), telemetry(this.ctx, "repositoryControl.fetch.success"), this.requestStatus = {
          status: "cached",
          data: content
        }, content;
      }
      throw new Error(`API returned ${response.status}`);
    } catch (err) {
      telemetry(this.ctx, "repositoryControl.fetch.error"), telemetryException(this.ctx, err, "repositoryControl.fetch");
      let _retryCount = this.requestStatus.status === "retrying" ? this.requestStatus.retryCount + 1 : 0,
        _waitMs = this.requestStatus.status === "retrying" ? this.requestStatus.waitMs * 2 : this.initialWaitMs;
      if (_retryCount >= this.maxRetryCount) {
        telemetry(this.ctx, "repositoryControl.fetch.maxRetries"), this.requestStatus = {
          status: "maxRetries"
        };
        return;
      }
      this.requestStatus = {
        status: "retrying",
        retryCount: _retryCount,
        waitMs: _waitMs
      }, this._fetchControlData();
    }
  }
  async evaluate(uri, fileContent) {
    try {
      let policy = await this.getRepositoryPolicy(uri);
      return policy === "POLICY_NOT_AVAILABLE" ? BLOCKED_POLICY_ERROR_RESPONSE : policy === "NO_MATCHING_POLICY" ? NOT_BLOCKED_NO_MATCHING_POLICY_RESPONSE : {
        ...(await this._evaluate(uri, fileContent, policy)),
        providerRepoKey: policy.providerRepoKey
      };
    } catch (err) {
      return telemetryException(this.ctx, err, "repositoryControl.evaluate"), BLOCKED_POLICY_ERROR_RESPONSE;
    }
  }
  async _evaluate(uri, fileContent, policy) {
    if (policy?.blocked) return BLOCKED_REPO_RESPONSE;
    if (policy?.rule && policy.rule.fileContent && fileContent) {
      let mustInclude = policy.rule.fileContent.includes;
      if (fileContent && mustInclude && mustInclude.length > 0 && !new RegExp(mustInclude.join("|"), "i").test(fileContent)) return BLOCKED_FILE_RESPONSE;
      let mustExclude = policy.rule.fileContent.excludes;
      if (fileContent && mustExclude && mustExclude.length > 0 && new RegExp(mustExclude.join("|"), "i").test(fileContent)) return BLOCKED_FILE_RESPONSE;
    }
    return NOT_BLOCKED_RESPONSE;
  }
  async fetchRepositoryPolicy(providerRepoKey) {
    let data = await this.fetchControlData();
    if (data === "POLICY_NOT_AVAILABLE") return "POLICY_NOT_AVAILABLE";
    let config = data.config[providerRepoKey];
    if (!config) return "NO_MATCHING_POLICY";
    let result = {
      providerRepoKey: providerRepoKey,
      blocked: config.blocked
    };
    return config.ruleId && (result.rule = data.rule[config.ruleId]), result;
  }
  async getRepositoryPolicy(uri) {
    let cachedPolicy = this.repoUriToPolicyMap.get(uri.fsPath);
    if (cachedPolicy) return cachedPolicy;
    let matchingKey = getFilePathChunks(uri.fsPath).find(chunk => this.repoUriToPolicyMap.has(chunk));
    if (matchingKey) return this.repoUriToPolicyMap.get(matchingKey) ?? "NO_MATCHING_POLICY";
    let repositoryInfo = await extractRepoInfo(this.ctx, uri);
    if (!repositoryInfo || !repositoryInfo.url) {
      let parentFolder = R_.dirname(uri.fsPath);
      return this.repoUriToPolicyMap.set(parentFolder, "NO_MATCHING_POLICY"), this.repoUriToPolicyMap.set(uri.fsPath, "NO_MATCHING_POLICY"), "NO_MATCHING_POLICY";
    }
    let providerRepoKey = this.getProviderRepoKey(repositoryInfo);
    if (!providerRepoKey) return "NO_MATCHING_POLICY";
    let policy = await this.fetchRepositoryPolicy(providerRepoKey);
    return policy === "POLICY_NOT_AVAILABLE" || (this.repoUriToPolicyMap.set(repositoryInfo.baseFolder, policy), this.repoUriToPolicyMap.set(uri.fsPath, policy)), policy;
  }
  getProviderRepoKey(repoInfo) {
    if (repoInfo !== void 0) {
      if (repoInfo.hostname === "github.com") return `github.com:${repoInfo.owner}/${repoInfo.repo}`.toLowerCase();
      if (repoInfo.hostname.endsWith("azure.com") || repoInfo.hostname.endsWith("visualstudio.com")) return `dev.azure.com:${repoInfo.owner}/${repoInfo.repo}`.toLowerCase();
    }
  }
};,function getFilePathChunks(filepath) {
  let chunks = [],
    currentPath = "";
  for (let part of filepath.split(R_.sep)) currentPath += part + R_.sep, chunks.push(currentPath.slice(0, -1));
  return chunks;
},__name(getFilePathChunks, "getFilePathChunks");