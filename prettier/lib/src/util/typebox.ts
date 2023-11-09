var import_value = Ns(OL());,var assertShape = __name((schema, payload) => {
  if (LL.Value.Check(schema, payload)) return payload;
  let error = `Typebox schema validation failed:
${[...LL.Value.Errors(schema, payload)].map(i => `${i.path} ${i.message}`).join(`
`)}`;
  throw new Error(error);
}, "assertShape");,var TELEMETRY_NAME = "contentExclusion",
  CopilotContentRestrictions = class extends PolicyEvaluator {
    static {
      __name(this, "CopilotContentRestrictions");
    }
    ##context;
    ##evaluateResultCache = new LRUCacheMap(1e4);
    ##ruleLoaderCache = new LRUCacheMap(200);
    constructor(context) {
      super(), this.##context = context;
    }
    async evaluate(uri) {
      let cacheKey = uri.fsPath;
      if (this.##evaluateResultCache.has(cacheKey)) return this.##evaluateResultCache.get(cacheKey);
      try {
        let repo = await extractRepoInfo(this.##context, uri);
        if (!repo || !repo.url) return NOT_BLOCKED_NO_MATCHING_POLICY_RESPONSE;
        let fileNameToCompare = uri.fsPath.replace(repo.baseFolder, "");
        var result = await this.evaluateFileFromRepo(fileNameToCompare, repo.url);
      } catch (err) {
        return telemetryException(this.##context, err, `${TELEMETRY_NAME}.evaluate`), BLOCKED_POLICY_ERROR_RESPONSE;
      }
      return this.##evaluateResultCache.set(cacheKey, result), result;
    }
    async evaluateFileFromRepo(fileName, repoUrl) {
      let rules = await this.##rulesForRepo(repoUrl);
      if (!rules) return NOT_BLOCKED_NO_MATCHING_POLICY_RESPONSE;
      for (let rule of rules) for (let pattern of rule.paths) if (minimatch(fileName, pattern, {
        nocase: !0,
        matchBase: !0,
        nonegate: !0
      })) return fileBlockedEvaluationResult(rule);
      return NOT_BLOCKED_RESPONSE;
    }
    async refresh() {
      try {
        let existingUrls = [...this.##ruleLoaderCache.keys()];
        this.reset(), await Promise.all(existingUrls.map(url => this.##ruleLoader(url)));
      } catch (err) {
        telemetryException(this.##context, err, `${TELEMETRY_NAME}.refresh`);
      }
    }
    reset() {
      this.##ruleLoaderCache.clear(), this.##evaluateResultCache.clear();
    }
    async ##rulesForRepo(repoUrl) {
      let rules = await this.##ruleLoader(repoUrl.toLowerCase());
      if (rules.length !== 0) return rules;
    }
    ##ruleLoader = o(async urls => {
      let session = await this.##context.get(CopilotTokenManager).getGitHubSession(this.##context);
      if (!session) throw new CopilotAuthError("No token found");
      let endpoint = this.##context.get(NetworkConfiguration).getContentRestrictionsUrl(session),
        url = new URL(endpoint);
      url.searchParams.set("repos", urls.join(","));
      let result = await this.##context.get(Fetcher).fetch(url.href, {
          method: "GET",
          headers: {
            Authorization: `token ${session.token}`
          }
        }),
        data = await result.json();
      if (!result.ok) {
        if (result.status === 404) return Array.from(urls, () => []);
        this.##telemetry("fetch.error", {
          message: data.message
        });
        let error = new Error(`HTTP ${result.status}`);
        throw error.code = `HTTP${result.status}`, error;
      }
      return this.##telemetry("fetch.success"), assertShape(ContentRestrictionsResponseSchema, data).map(r => r.rules);
    }, this.##ruleLoaderCache);
    ##telemetry(event, properties, measurements) {
      telemetry(this.##context, `${TELEMETRY_NAME}.${event}`, TelemetryData.createAndMarkAsIssued(properties, measurements));
    }
  };,function fileBlockedEvaluationResult(rule) {
  return {
    isBlocked: !0,
    reason: "FILE_BLOCKED",
    message: `Your ${rule.source.type.toLowerCase()} '${rule.source.name}' has disabled Copilot for this file`
  };
},__name(fileBlockedEvaluationResult, "fileBlockedEvaluationResult");,var SourceSchema = eu.Type.Object({
    name: eu.Type.String(),
    type: eu.Type.Union([eu.Type.Literal("Organization"), eu.Type.Literal("Repository")])
  }),
  RuleSchema = eu.Type.Object({
    paths: eu.Type.Array(eu.Type.String()),
    source: SourceSchema
  }),
  RulesSchema = eu.Type.Array(RuleSchema),
  RepoRuleSchema = eu.Type.Object({
    rules: RulesSchema,
    last_updated_at: eu.Type.String()
  }),
  ContentRestrictionsResponseSchema = eu.Type.Array(RepoRuleSchema);