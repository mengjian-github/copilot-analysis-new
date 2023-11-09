var import_vscode = require("vscode");,var CopilotStatusBar = class extends StatusReporter {
  constructor(ctx, outputChannel) {
    super();
    this.ctx = ctx;
    this.outputChannel = outputChannel;
    this.showingMessage = !1;
    this.delayedUpdateDisplay = debounce(100, () => {
      this.updateStatusBarIndicator();
    });
    this.item = ld.window.createStatusBarItem("status", ld.StatusBarAlignment.Right, 1), this.item.name = "Copilot Status", this.state = ctx.get(CopilotExtensionStatus), this.updateStatusBarIndicator(), this.item.show(), ld.window.onDidChangeActiveTextEditor(() => {
      this.updateStatusBarIndicator();
    }), ld.workspace.onDidCloseTextDocument(() => {
      !ld.window.activeTextEditor && this.state.status === "Inactive" && (this.state.status = "Normal"), this.updateStatusBarIndicator();
    }), ld.workspace.onDidOpenTextDocument(() => {
      this.updateStatusBarIndicator();
    });
  }
  static {
    __name(this, "CopilotStatusBar");
  }
  checkEnabledForLanguage() {
    return getEnabledConfig(this.ctx) || !1;
  }
  updateStatusBarIndicator() {
    switch (this.state.status) {
      case "Error":
        this.item.text = "$(copilot-notconnected)", this.item.command = CMDToggleStatusMenu, this.item.tooltip = "Copilot error (click for details)";
        break;
      case "Warning":
        this.item.text = "$(copilot-warning)", this.item.command = this.state.errorMessage ? CMDToggleStatusMenu : void 0, this.item.tooltip = "Copilot is encountering temporary issues (click for details)";
        break;
      case "InProgress":
        this.item.text = "$(loading~spin)";
        break;
      case "Inactive":
        this.item.text = "$(copilot-notconnected)", this.item.tooltip = this.state.errorMessage || "Copilot is currently inactive";
        break;
      case "Normal":
        this.item.text = this.checkEnabledForLanguage() ? "$(copilot-logo)" : "$(copilot-notconnected)", this.item.command = CMDToggleStatusMenu, this.item.tooltip = "Show Copilot status menu";
    }
  }
  getStatusBarItem() {
    return this.item;
  }
  setProgress() {
    this.state.status !== "Error" && (this.state.status = "InProgress", this.delayedUpdateDisplay());
  }
  removeProgress() {
    this.state.status !== "Error" && this.state.status !== "Warning" && (this.state.status = "Normal", this.delayedUpdateDisplay());
  }
  setWarning(warningMessage) {
    this.state.status !== "Error" && (this.state.status = "Warning", warningMessage && (this.state.errorMessage = warningMessage), this.updateStatusBarIndicator());
  }
  setError(errorMessage, errorRetry) {
    this.state.status = "Error", this.state.errorMessage = errorMessage, this.errorRetry = errorRetry, this.updateStatusBarIndicator(), this.showErrorMessage();
  }
  setInactive(message) {
    this.state.status = "Inactive", this.state.errorMessage = message || "", this.errorRetry = void 0, this.updateStatusBarIndicator();
  }
  forceNormal() {
    this.state.status = "Normal", this.state.errorMessage = "", this.errorRetry = void 0, this.updateStatusBarIndicator();
  }
  showErrorMessage() {
    if (this.showingMessage) return;
    this.showingMessage = !0;
    let showOutputOption = "Show Output Log",
      options = [showOutputOption];
    this.errorRetry && options.push("Retry"), ld.window.showWarningMessage(this.state.errorMessage, ...options).then(res => {
      this.showingMessage = !1, res === showOutputOption && this.outputChannel.show(), res === "Retry" && this.errorRetry && this.errorRetry();
    });
  }
};