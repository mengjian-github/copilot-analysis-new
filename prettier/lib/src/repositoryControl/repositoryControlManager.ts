var logger = new Logger(1, "CopilotContentExclusion");,var CopilotRepositoryControlManager = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.##featureEnabled = !1;
    this.##repositoryControl = null;
    this.##contentRestrictions = new CopilotContentRestrictions(this.ctx);
    this.evaluateResultCache = new Map();
    this.onDidChangeActiveTextEditor = async e => {
      if (!this.##featureEnabled || !e) return;
      let result = await this.ctx.get(TextDocumentManager).getTextDocumentWithValidation(e.document.uri),
        isBlocked = result.status === "invalid",
        reason = result.status === "invalid" ? result.reason : void 0;
      this.updateStatusIcon(isBlocked, reason);
    };
    this.ctx.get(TextDocumentManager).onDidFocusTextDocument(this.onDidChangeActiveTextEditor), this.ctx.get(CopilotTokenNotifier).on("onCopilotToken", (token, tokenEnvelope) => {
      this.##featureEnabled = tokenEnvelope?.copilotignore_enabled ?? !1, tokenEnvelope?.copilotignore_enabled && logger.info(this.ctx, "feature flag is enabled for user"), this.evaluateResultCache.clear(), this.##contentRestrictions.refresh();
      let orgs = token.organization_list ?? [];
      this.##refreshMSFTRepoControl(orgs);
    });
  }
  static {
    __name(this, "CopilotRepositoryControlManager");
  }
  ##featureEnabled;
  ##repositoryControl;
  ##contentRestrictions;
  get enabled() {
    return this.##featureEnabled;
  }
  async evaluate(uri, fileContent, shouldUpdateStatusBar) {
    if (!this.##featureEnabled || uri.scheme !== "file") return {
      isBlocked: !1
    };
    let events = [],
      track = __name(async (key, ev) => {
        let startTimeMs = Date.now(),
          result = await ev.evaluate(uri, fileContent),
          endTimeMs = Date.now();
        return events.push({
          key: key,
          result: result,
          elapsedMs: endTimeMs - startTimeMs
        }), result;
      }, "track"),
      result = (await Promise.all([this.##repositoryControl && track("repositoryControl.evaluate", this.##repositoryControl), track("contentExclusion.evaluate", this.##contentRestrictions)])).find(r => r?.isBlocked) ?? {
        isBlocked: !1
      };
    try {
      for (let event of events) this.##trackEvaluationResult(event.key, uri, event.result, event.elapsedMs);
    } catch (e) {
      console.log("Error tracking telemetry", e);
    }
    return shouldUpdateStatusBar === "UPDATE" && this.updateStatusIcon(result.isBlocked, result.message), result;
  }
  updateStatusIcon(isBlocked, reason) {
    this.##featureEnabled && (isBlocked ? this.ctx.get(StatusReporter).setInactive(reason ?? "Copilot is disabled") : this.ctx.get(StatusReporter).forceNormal());
  }
  ##trackEvaluationResult(key, uri, result, elapsedMs) {
    let cacheKey = uri.path + key;
    if (this.evaluateResultCache.get(cacheKey) === result.reason) return !1;
    if (this.evaluateResultCache.set(cacheKey, result.reason ?? "UNKNOWN"), result.reason === NOT_BLOCKED_NO_MATCHING_POLICY_RESPONSE.reason) return logger.info(this.ctx, key, ` No matching policy for this repository. uri: ${uri.path}`), !1;
    let properties = {
        isBlocked: result.isBlocked ? "true" : "false",
        reason: result.reason ?? "UNKNOWN"
      },
      measurements = {
        elapsedMs: elapsedMs
      };
    return telemetry(this.ctx, key, TelemetryData.createAndMarkAsIssued(properties, measurements)), telemetry(this.ctx, key, TelemetryData.createAndMarkAsIssued({
      ...properties,
      path: uri.path
    }, measurements), 1), logger.info(this.ctx, key, uri.path, JSON.stringify(result)), !0;
  }
  ##refreshMSFTRepoControl(user_orgs) {
    let knownOrg = ["a5db0bcaae94032fe715fb34a5e4bce2", "7184f66dfcee98cb5f08a1cb936d5225"].find(org => user_orgs.includes(org));
    this.##featureEnabled && knownOrg ? (this.##repositoryControl ||= new CopilotRepositoryControl(this.ctx), this.##repositoryControl.refresh()) : this.##repositoryControl = null;
  }
  set __repositoryControl(repoControl) {
    this.##repositoryControl = repoControl;
  }
  get __repositoryControl() {
    return this.##repositoryControl;
  }
  set __contentRestrictions(contentRestrictions) {
    this.##contentRestrictions = contentRestrictions;
  }
  get __contentRestrictions() {
    return this.##contentRestrictions;
  }
};