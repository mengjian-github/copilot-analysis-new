var import_vscode = require("vscode");,var GITHUB_SCOPE_READ_USER = ["read:user"],
  GITHUB_SCOPE_USER_EMAIL = ["user:email"],
  SESSION_LOGIN_MESSAGE = "You are not signed in to GitHub. Please sign in to use Copilot.",
  shownSignInMessage = !1;,function permitOneSignIn() {
  shownSignInMessage = !1;
},__name(permitOneSignIn, "permitOneSignIn");,function authProviderId() {
  return N1.workspace.getConfiguration(CopilotConfigPrefix).get("advanced")?.authProvider === "github-enterprise" ? "github-enterprise" : "github";
},__name(authProviderId, "authProviderId");,async function onDidChangeSessionsHandler(event, ctx) {
  let provider = event.provider,
    providerId = authProviderId();
  if (provider.id === providerId) {
    let statusReporter = ctx.get(StatusReporter);
    (await N1.authentication.getSession(providerId, GITHUB_SCOPE_USER_EMAIL)) ? (statusReporter.forceNormal(), await ctx.get(CopilotTokenManager).getCopilotToken(ctx, !0)) : (ctx.get(CopilotTokenManager).resetCopilotToken(ctx), statusReporter.setWarning(SESSION_LOGIN_MESSAGE));
  }
},__name(onDidChangeSessionsHandler, "onDidChangeSessionsHandler");,function getSessionHelper(createIfNone) {
  let providerId = authProviderId();
  return N1.authentication.getSession(providerId, GITHUB_SCOPE_READ_USER, {
    silent: !0
  }).then(session => session || N1.authentication.getSession(providerId, GITHUB_SCOPE_USER_EMAIL, {
    createIfNone: createIfNone
  }));
},__name(getSessionHelper, "getSessionHelper");,async function getSession(ctx, fromCommand = !1) {
  let session = await getSessionHelper(!1);
  if (!session) if (shownSignInMessage) fromCommand && (telemetryAuthNotifyShown(ctx, "command"), telemetryNewGitHubLogin(ctx, "command", "editorAuth"), session = await getSessionHelper(!0));else {
    shownSignInMessage = !0, telemetryAuthNotifyShown(ctx, "toast");
    let choice = await N1.window.showInformationMessage("Sign in to use GitHub Copilot.", "Sign in to GitHub");
    if (session = await getSessionHelper(!1), !session) if (choice === "Sign in to GitHub") telemetryNewGitHubLogin(ctx, "toast", "editorAuth"), session = await getSessionHelper(!0);else throw telemetryAuthNotifyDismissed(ctx), new CopilotAuthError("GitHubLoginFailed");
  }
  return session;
},__name(getSession, "getSession");,async function hasExistingSession() {
  return (await getSessionHelper(!1)) !== void 0;
},__name(hasExistingSession, "hasExistingSession");,var authLogger = new Logger(1, "auth"),
  shown401Message = !1,
  everActivated = !1;,async function auth(ctx) {
  let session = await getSession(ctx);
  if (!session) {
    let message = "GitHub login failed";
    return authLogger.info(ctx, message), telemetryGitHubLoginFailed(ctx), {
      kind: "failure",
      reason: "GitHubLoginFailed",
      message: message
    };
  }
  authLogger.debug(ctx, `Logged in as ${session.account.label}, oauth token ${session.accessToken}`);
  let tokenResult = await authFromGitHubToken(ctx, {
    token: session.accessToken
  });
  if (tokenResult.kind == "success") {
    let token = tokenResult.token;
    authLogger.debug(ctx, `Copilot HMAC for ${session.account.label}: ${token}`);
  }
  return tokenResult;
},__name(auth, "auth");,var ExtensionNotificationSender = class extends NotificationSender {
  static {
    __name(this, "ExtensionNotificationSender");
  }
  async showWarningMessage(message, ...actions) {
    return {
      title: await ED.window.showWarningMessage(message, ...actions.map(action => action.title))
    };
  }
};,async function authShowWarnings(ctx) {
  let tokenResult = await auth(ctx);
  if (tokenResult.kind === "failure" && tokenResult.reason === "HTTP401") {
    let message = "Your GitHub token is invalid. Please sign out from your GitHub account using VSCode UI and try again.";
    everActivated && !shown401Message && (shown401Message = !0, ED.window.showWarningMessage(message));
  }
  if (tokenResult.kind === "failure" && tokenResult.message) throw new CopilotAuthError(tokenResult.message);
  if (tokenResult.kind === "failure") {
    let error = new Error(`Unexpected error getting Copilot token: ${tokenResult.reason ?? "no reason given"}`);
    throw error.code = `CopilotToken.${tokenResult.reason}`, error;
  }
  return everActivated = !0, tokenResult;
},__name(authShowWarnings, "authShowWarnings");,var VSCodeCopilotTokenManager = class extends CopilotTokenManager {
  constructor() {
    super();
    this.copilotToken = void 0;
  }
  static {
    __name(this, "VSCodeCopilotTokenManager");
  }
  async getGitHubSession(ctx) {
    let session = await getSession(ctx);
    return session ? {
      token: session.accessToken
    } : void 0;
  }
  async getCopilotToken(ctx, force) {
    return (!this.copilotToken || this.copilotToken.expires_at < nowSeconds() || force) && (this.copilotToken = await authShowWarnings(ctx), refreshToken(ctx, this, this.copilotToken.refresh_in)), new CopilotToken(this.copilotToken.token, this.copilotToken.organization_list);
  }
  resetCopilotToken(ctx, httpError) {
    httpError !== void 0 && telemetry(ctx, "auth.reset_token_" + httpError), authLogger.debug(ctx, `Resetting copilot token on HTTP error ${httpError || "unknown"}`), this.copilotToken = void 0;
  }
};