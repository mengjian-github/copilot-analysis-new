var import_vscode = require("vscode");,var CopilotStatusBarPickMenu = class {
    constructor(ctx, afterCommandCallback) {
      this.ctx = ctx;
      this.afterCommandCallback = afterCommandCallback;
      this.state = ctx.get(CopilotExtensionStatus);
    }
    static {
      __name(this, "CopilotStatusBarPickMenu");
    }
    showStatusMenu() {
      let quickpickList = Ih.window.createQuickPick();
      return quickpickList.items = this.collectQuickPickItems(), quickpickList.onDidAccept(() => {
        this.handleItemSelection(quickpickList);
      }), quickpickList.show(), quickpickList;
    }
    async handleItemSelection(quickpickList) {
      return new Promise((resolve, reject) => {
        let selection = quickpickList.selectedItems[0];
        if (selection !== void 0) if ("command" in selection) {
          let commandSelection = selection;
          Ih.commands.executeCommand(commandSelection.command, ...commandSelection.commandArgs).then(() => {
            this.afterCommandCallback(), quickpickList.hide(), resolve();
          });
        } else reject("Unexpected selection");
      });
    }
    collectQuickPickItems() {
      return this.state.status == "Normal" || this.state.status == "InProgress" ? [this.newStatusItem(), this.newSeparator(), this.newChatItem(), this.newSeparator(), ...this.collectLanguageSpecificItems(), this.newSeparator(), this.newKeyboardItem(), this.newSettingsItem(), this.newDiagnosticsItem(), this.newOpenLogsItem(), this.newSeparator(), this.newDocsItem(), this.newForumItem()] : [this.newStatusItem(), this.newSeparator(), this.newSettingsItem(), this.newDiagnosticsItem(), this.newOpenLogsItem(), this.newSeparator(), this.newDocsItem(), this.newForumItem(), this.newSeparator(), this.newSignInItem()];
    }
    collectLanguageSpecificItems() {
      let currentLanguage = Ih.window.activeTextEditor?.document.languageId;
      return currentLanguage ? [this.newPanelItem(), this.newGlobalEnablementItem(), ...this.newEnableLanguageItem(currentLanguage)] : [this.newGlobalEnablementItem()];
    }
    newEnableLanguageItem(currentLanguage) {
      let isEnabled = getEnabledConfig(this.ctx);
      if (isEnabled === void 0) return [];
      let enablementLabelPrefix = isEnabled ? "Disable" : "Enable";
      return [this.newCommandItem(enablementLabelPrefix + " Completions for '" + currentLanguage + "'", CMDToggleCopilot, [currentLanguage])];
    }
    newGlobalEnablementItem() {
      let prefix = getEnabledConfig(this.ctx, "*") ? "Disable" : "Enable";
      return this.newCommandItem(prefix + " Completions", CMDToggleCopilot);
    }
    newStatusItem() {
      let statusText;
      return this.state.status == "Normal" || this.state.status == "InProgress" ? (statusText = "Ready", getEnabledConfig(this.ctx) || (statusText += " (Disabled)")) : statusText = this.state.errorMessage || "Copilot is currently inactive", this.newCommandItem("$(copilot-logo) Status: " + statusText, CMDOpenLogs);
    }
    newSignInItem() {
      return this.newCommandItem("Sign in to GitHub", CMDSignIn);
    }
    newOpenLogsItem() {
      return this.newCommandItem("Open Logs...", CMDOpenLogs);
    }
    newDiagnosticsItem() {
      return this.newCommandItem("Show Diagnostics...", CMDCollectDiagnostics);
    }
    newKeyboardItem() {
      return this.newCommandItem("$(keyboard) Edit Keyboard Shortcuts...", "workbench.action.openGlobalKeybindings", ["copilot"]);
    }
    newChatItem() {
      return this.newCommandItem("$(copilot-chat) GitHub Copilot Chat", "workbench.panel.chat.view.copilot.focus");
    }
    newSettingsItem() {
      return this.newCommandItem("$(settings-gear) Edit Settings...", "workbench.action.openSettings", ["GitHub Copilot"]);
    }
    newPanelItem() {
      return this.newCommandItem("Open Completions Panel...", CMDOpenPanel);
    }
    newForumItem() {
      return this.newCommandItem("$(comments-view-icon) View Copilot Forum...", CMDSendFeedback);
    }
    newDocsItem() {
      return this.newCommandItem("$(remote-explorer-documentation) View Copilot Documentation...", CMDOpenDocumentation);
    }
    newCommandItem(label, command, commandArgs) {
      return new CommandQuickItem(label, command, commandArgs || []);
    }
    newSeparator() {
      return {
        label: "",
        kind: Ih.QuickPickItemKind.Separator
      };
    }
  },
  CommandQuickItem = class {
    constructor(label, command, commandArgs) {
      this.label = label;
      this.command = command;
      this.commandArgs = commandArgs;
    }
    static {
      __name(this, "CommandQuickItem");
    }
  };