var CopilotExtensionStatus = class {
  constructor(status = "Normal", errorMessage) {
    this.status = status;
    this.errorMessage = errorMessage;
  }
  static {
    __name(this, "CopilotExtensionStatus");
  }
};