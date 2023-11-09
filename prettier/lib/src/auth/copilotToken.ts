var authLogger = new Logger(1, "auth"),
  REFRESH_BUFFER_SECONDS = 60,
  refreshRunningCount = 0,
  TOKEN_REFRESHED_EVENT = "token_refreshed";,function nowSeconds() {
  return Math.floor(Date.now() / 1e3);
},__name(nowSeconds, "nowSeconds");,async function authFromGitHubToken(ctx, githubToken) {
  telemetry(ctx, "auth.new_login");
  let response = await fetchCopilotToken(ctx, githubToken),
    tokenInfo = await response.json();
  if (!tokenInfo) return authLogger.info(ctx, "Failed to get copilot token"), telemetryError(ctx, "auth.request_read_failed"), {
    kind: "failure",
    reason: "FailedToGetToken"
  };
  let notification = tokenInfo.user_notification;
  if (notifyUser(ctx, notification, githubToken), response.status === 401) {
    let message = "Failed to get copilot token due to 401 status. Please sign out and try again.";
    return authLogger.info(ctx, message), telemetryError(ctx, "auth.unknown_401"), {
      kind: "failure",
      reason: "HTTP401",
      message: message
    };
  }
  if (!response.ok || !tokenInfo.token) {
    authLogger.info(ctx, `Invalid copilot token: missing token: ${response.status} ${response.statusText}`), telemetryError(ctx, "auth.invalid_token", TelemetryData.createAndMarkAsIssued({
      status: response.status.toString(),
      status_text: response.statusText
    }));
    let error_details = tokenInfo.error_details;
    return notifyUser(ctx, error_details, githubToken), {
      kind: "failure",
      reason: "NotAuthorized",
      message: "User not authorized",
      ...error_details
    };
  }
  let expires_at = tokenInfo.expires_at;
  tokenInfo.expires_at = nowSeconds() + tokenInfo.refresh_in + REFRESH_BUFFER_SECONDS;
  let {
      token: token,
      organization_list: organization_list,
      enterprise_list: enterprise_list,
      ...tokenEnvelope
    } = tokenInfo,
    copilotToken = new CopilotToken(token, organization_list, enterprise_list);
  return ctx.get(CopilotTokenNotifier).emit("onCopilotToken", copilotToken, tokenEnvelope), telemetry(ctx, "auth.new_token", TelemetryData.createAndMarkAsIssued({}, {
    adjusted_expires_at: tokenInfo.expires_at,
    expires_at: expires_at,
    current_time: nowSeconds()
  })), {
    kind: "success",
    ...tokenInfo
  };
},__name(authFromGitHubToken, "authFromGitHubToken");,async function fetchCopilotToken(ctx, githubToken) {
  let copilotTokenUrl = ctx.get(NetworkConfiguration).getTokenUrl(githubToken);
  try {
    return await ctx.get(Fetcher).fetch(copilotTokenUrl, {
      headers: {
        Authorization: `token ${githubToken.token}`,
        ...editorVersionHeaders(ctx)
      }
    });
  } catch (err) {
    throw ctx.get(UserErrorNotifier).notifyUser(ctx, err), err;
  }
},__name(fetchCopilotToken, "fetchCopilotToken");,var recentNotifications = new Map();,function notifyUser(ctx, notification, githubToken) {
  if (!notification) return;
  let now = nowSeconds();
  recentNotifications.get(notification.message) || (recentNotifications.set(notification.message, now), ctx.get(NotificationSender).showWarningMessage(notification.message, {
    title: notification.title
  }, {
    title: "Dismiss"
  }).then(async r => {
    let showUrl = r?.title === notification.title,
      ackNotification = showUrl || r?.title === "Dismiss";
    if (showUrl) {
      let editorInfo = ctx.get(EditorAndPluginInfo).getEditorPluginInfo(),
        urlWithContext = notification.url.replace("{EDITOR}", encodeURIComponent(editorInfo.name + "_" + editorInfo.version));
      await ctx.get(UrlOpener).open(urlWithContext);
    }
    "notification_id" in notification && ackNotification && (await sendNotificationResultToGitHub(ctx, notification.notification_id, githubToken));
  }).catch(error => {
    authLogger.exception(ctx, error, "copilotToken.notification");
  }));
},__name(notifyUser, "notifyUser");,async function sendNotificationResultToGitHub(ctx, notification_id, githubToken) {
  let notificationUrl = ctx.get(NetworkConfiguration).getNotificationUrl(githubToken),
    response = await ctx.get(Fetcher).fetch(notificationUrl, {
      headers: {
        Authorization: `token ${githubToken.token}`,
        ...editorVersionHeaders(ctx)
      },
      method: "POST",
      body: JSON.stringify({
        notification_id: notification_id
      })
    });
  (!response || !response.ok) && authLogger.error(ctx, `Failed to send notification result to GitHub: ${response?.status} ${response?.statusText}`);
},__name(sendNotificationResultToGitHub, "sendNotificationResultToGitHub");,var CopilotToken = class {
  constructor(token, organization_list, enterprise_list) {
    this.token = token;
    this.organization_list = organization_list;
    this.enterprise_list = enterprise_list;
    this.tokenMap = this.parseToken(token);
  }
  static {
    __name(this, "CopilotToken");
  }
  parseToken(token) {
    let result = new Map(),
      fields = token?.split(":")[0]?.split(";");
    for (let field of fields) {
      let [key, value] = field.split("=");
      result.set(key, value);
    }
    return result;
  }
  getTokenValue(key) {
    return this.tokenMap.get(key);
  }
};,function refreshToken(ctx, tokenManager, refreshIn) {
  let now = nowSeconds();
  refreshRunningCount > 0 || (refreshRunningCount++, setTimeout(async () => {
    let kind,
      error = "";
    try {
      refreshRunningCount--, await tokenManager.getCopilotToken(ctx, !0), kind = "success", tokenManager.tokenRefreshEventEmitter.emit(TOKEN_REFRESHED_EVENT);
    } catch (e) {
      kind = "failure", error = e.toString();
    }
    let data = TelemetryData.createAndMarkAsIssued({
      result: kind
    }, {
      time_taken: nowSeconds() - now,
      refresh_count: refreshRunningCount
    });
    error && (data.properties.reason = error), telemetry(ctx, "auth.token_refresh", data);
  }, refreshIn * 1e3));
},__name(refreshToken, "refreshToken");,var authLogger = new Logger(1, "auth"),
  CopilotTokenManager = class {
    static {
      __name(this, "CopilotTokenManager");
    }
    constructor() {
      this.tokenRefreshEventEmitter = new Cee.EventEmitter();
    }
    async getGitHubToken(ctx) {
      return (await this.getGitHubSession(ctx))?.token;
    }
  },
  CopilotTokenManagerFromGitHubTokenBase = class extends CopilotTokenManager {
    constructor() {
      super();
      this.copilotToken = void 0;
    }
    static {
      __name(this, "CopilotTokenManagerFromGitHubTokenBase");
    }
    async getCopilotToken(ctx, force) {
      if (!this.copilotToken || this.copilotToken.expires_at < nowSeconds() || force) {
        let gitHubToken = await this.getGitHubSession(ctx);
        if (!gitHubToken) throw new CopilotAuthError("Not signed in");
        let tokenResult = await authFromGitHubToken(ctx, gitHubToken);
        if (tokenResult.kind === "failure") {
          if (tokenResult.message) throw new CopilotAuthError(tokenResult.message);
          let error = new Error(`Unexpected error getting Copilot token: ${tokenResult.reason}`);
          throw error.code = `CopilotToken.${tokenResult.reason}`, error;
        }
        this.copilotToken = {
          ...tokenResult
        }, refreshToken(ctx, this, tokenResult.refresh_in);
      }
      return new CopilotToken(this.copilotToken.token, this.copilotToken.organization_list);
    }
    async checkCopilotToken(ctx) {
      if (!this.copilotToken || this.copilotToken.expires_at < nowSeconds()) {
        let gitHubToken = await this.getGitHubSession(ctx);
        if (!gitHubToken) throw new CopilotAuthError("Not signed in");
        let tokenResult = await authFromGitHubToken(ctx, gitHubToken);
        if (tokenResult.kind === "failure") return tokenResult;
        this.copilotToken = {
          ...tokenResult
        }, refreshToken(ctx, this, tokenResult.refresh_in);
      }
      return {
        status: "OK"
      };
    }
    resetCopilotToken(ctx, httpError) {
      httpError !== void 0 && telemetry(ctx, "auth.reset_token_" + httpError), authLogger.debug(ctx, `Resetting copilot token on HTTP error ${httpError || "unknown"}`), this.copilotToken = void 0;
    }
  };