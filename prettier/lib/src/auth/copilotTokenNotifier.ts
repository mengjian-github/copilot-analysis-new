var EventEmitter = require("events"),
  CopilotTokenNotifier = class extends EventEmitter {
    static {
      __name(this, "CopilotTokenNotifier");
    }
    constructor() {
      super();
    }
    emit(event, token, envelope) {
      return super.emit(event, token, envelope);
    }
  };