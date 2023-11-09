var CopilotAuthError = class extends Error {
  static {
    __name(this, "CopilotAuthError");
  }
  constructor(message) {
    super(message), this.name = "CopilotAuthError";
  }
};