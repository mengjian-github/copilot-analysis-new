var import_vscode = require("vscode");,var GitHubCopilotChannelName = "GitHub Copilot Log";,function getCurrentTimestamp() {
  let toTwoDigits = __name(v => v < 10 ? `0${v}` : v, "toTwoDigits"),
    toThreeDigits = __name(v => v < 10 ? `00${v}` : v < 100 ? `0${v}` : v, "toThreeDigits"),
    currentTime = new Date();
  return `${currentTime.getFullYear()}-${toTwoDigits(currentTime.getMonth() + 1)}-${toTwoDigits(currentTime.getDate())} ${toTwoDigits(currentTime.getHours())}:${toTwoDigits(currentTime.getMinutes())}:${toTwoDigits(currentTime.getSeconds())}.${toThreeDigits(currentTime.getMilliseconds())}`;
},__name(getCurrentTimestamp, "getCurrentTimestamp");,var CodeReferenceOutputChannel = class {
    constructor(output) {
      this.output = output;
    }
    static {
      __name(this, "CodeReferenceOutputChannel");
    }
    info(...messages) {
      this.output.appendLine(`${getCurrentTimestamp()} [info] ${messages.join(" ")}`);
    }
    show(preserveFocus) {
      this.output.show(preserveFocus);
    }
    dispose() {
      this.output.dispose();
    }
  },
  GitHubCopilotLogger = class _GitHubCopilotLogger {
    constructor(ctx) {
      this.ctx = ctx;
      this.tokenManager = void 0;
      this.checkCopilotToken = (_, env) => {
        env.code_quote_enabled ? this.output = this.createChannel() : this.output?.dispose();
      };
      this.tokenManager = this.ctx.get(CopilotTokenNotifier), this.tokenManager.on("onCopilotToken", this.checkCopilotToken), this.output = this.createChannel();
    }
    static {
      __name(this, "GitHubCopilotLogger");
    }
    static create(ctx) {
      return new _GitHubCopilotLogger(ctx);
    }
    createChannel() {
      return this.output ? this.output : new CodeReferenceOutputChannel(d0e.window.createOutputChannel(GitHubCopilotChannelName, "code-referencing"));
    }
    async log(type, ...messages) {
      this.output || (this.output = this.createChannel());
      let [base, ...rest] = messages;
      this.output[type](base, ...rest);
    }
    info(...messages) {
      this.log("info", ...messages);
    }
    forceShow() {
      this.output?.show(!0);
    }
    dispose() {
      this.output?.dispose();
    }
  };