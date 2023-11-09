var CERTIFICATE_ERRORS = ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_SIGNATURE_FAILURE"],
  UserErrorNotifier = class {
    constructor(ctx) {
      this.notifiedErrorCodes = [];
      ctx.get(CopilotTokenNotifier).on("onCopilotToken", token => {
        this.supportsSSC = token.getTokenValue("ssc") === "1";
      });
    }
    static {
      __name(this, "UserErrorNotifier");
    }
    async notifyUser(ctx, error) {
      CERTIFICATE_ERRORS.includes(error.code) && !this.didNotifyBefore(error.code) && (this.displayCertificateErrorNotification(ctx, error), this.notifiedErrorCodes.push(error.code));
    }
    displayCertificateErrorNotification(ctx, err) {
      let learnMoreLink = "https://gh.io/copilot-network-errors",
        errorMsg = this.certificateErrorMessage();
      new Logger(3, "certificates").error(ctx, `${errorMsg} Please visit ${learnMoreLink} to learn more. Original cause: ${JSON.stringify(err)}`), this.showCertificateWarningMessage(ctx, errorMsg, learnMoreLink);
    }
    certificateErrorMessage() {
      return this.supportsSSC === void 0 ? "The proxy connection couldn't be established due to an untrusted custom certificate, or your Copilot license might not support their use." : this.supportsSSC ? "Your proxy connection requires a trusted certificate. Please make sure the proxy certificate and any issuers are configured correctly and trusted by your operating system." : "Your current Copilot license doesn't support proxy connections with custom certificates.";
    }
    showCertificateWarningMessage(ctx, errorMsg, learnMoreLink) {
      let learnMoreAction = {
        title: "Learn more"
      };
      ctx.get(NotificationSender).showWarningMessage(errorMsg, learnMoreAction).then(userResponse => {
        userResponse?.title === learnMoreAction.title && ctx.get(UrlOpener).open(learnMoreLink);
      });
    }
    didNotifyBefore(code) {
      return this.notifiedErrorCodes.indexOf(code) !== -1;
    }
  };