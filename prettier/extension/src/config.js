var vscode = Ns(require("vscode"));,var packageJson = rO();,function stringOrStringify(value) {
  return typeof value == "string" ? value : JSON.stringify(value);
},__name(stringOrStringify, "stringOrStringify");,var VSCodeConfigProvider = class extends ConfigProvider {
    constructor() {
      super();
      this.config = vscode.workspace.getConfiguration(CopilotConfigPrefix), vscode.workspace.onDidChangeConfiguration(changeEvent => {
        changeEvent.affectsConfiguration(CopilotConfigPrefix) && (this.config = vscode.workspace.getConfiguration(CopilotConfigPrefix));
      });
    }
    static {
      __name(this, "VSCodeConfigProvider");
    }
    getConfigKeyFromObject(key, objectKey) {
      let value = this.config[key][objectKey];
      return value === void 0 ? getConfigDefaultForObjectKey(key, objectKey) : value;
    }
    getConfig(key) {
      if (Array.isArray(key)) return this.getConfigKeyFromObject(key[0], key[1]);
      let value = this.config.get(key);
      if (value === void 0) throw new Error(`Missing config default value: ${CopilotConfigPrefix}.${key}`);
      return value;
    }
    isDefaultSettingOverwritten(key) {
      if (Array.isArray(key)) return this.config[key[0]][key[1]] !== void 0;
      let inspection = this.config.inspect(key);
      return inspection ? !!inspection.globalValue || !!inspection.workspaceValue || !!inspection.workspaceFolderValue || !!inspection.defaultLanguageValue || !!inspection.globalLanguageValue || !!inspection.workspaceLanguageValue || !!inspection.workspaceFolderLanguageValue : !1;
    }
    dumpConfig() {
      let configProperties = {};
      try {
        let extensionConfigProps = packageJson.contributes.configuration[0].properties;
        for (let key in extensionConfigProps) {
          let value = key.replace(`${CopilotConfigPrefix}.`, "").split(".").reduce((o, i) => o[i], this.config);
          typeof value == "object" && value !== null ? Object.keys(value).filter(k => k !== "secret_key").forEach(k => configProperties[`${key}.${k}`] = stringOrStringify(value[k])) : configProperties[key] = stringOrStringify(value);
        }
      } catch (ex) {
        console.error(`Failed to retrieve configuration properties ${ex}`);
      }
      return configProperties;
    }
    getLanguageConfig(key, language) {
      let obj = this.getConfig(key);
      if (language === void 0) {
        let editor = vscode.window.activeTextEditor;
        language = editor && editor.document.languageId;
      }
      return obj?.[language ?? "*"] ?? obj?.["*"];
    }
    updateEnabledConfig(ctx, language, enabled) {
      let updatedConfig = ctx.get(ConfigProvider).getConfig(ConfigKey.Enable);
      return updatedConfig[language] = enabled, this.config.update(ConfigKey.Enable, updatedConfig, !0);
    }
  },
  telemetryAllowedAuthorities = new Set(["ssh-remote", "dev-container", "attached-container", "wsl", "tunnel", "codespaces", "amlext"]),
  VSCodeEditorInfo = class extends EditorAndPluginInfo {
    static {
      __name(this, "VSCodeEditorInfo");
    }
    getEditorInfo() {
      let remoteName = vscode.env.remoteName;
      return {
        name: "vscode",
        version: vscode.version,
        root: vscode.env.appRoot,
        remoteName: remoteName && (telemetryAllowedAuthorities.has(remoteName) ? remoteName : "other")
      };
    }
    getEditorPluginInfo() {
      return {
        name: "copilot",
        version: packageJson.version
      };
    }
  };,async function toggleCopilotEnablement(ctx, scope) {
  let configProvider = ctx.get(ConfigProvider),
    isEnabled = getEnabledConfig(ctx) || !1,
    currentLanguage = vscode.window.activeTextEditor?.document.languageId;
  isEnabled && vscode.commands.executeCommand("editor.action.inlineSuggest.hide"), scope === "global" ? await configProvider.updateEnabledConfig(ctx, "*", !getEnabledConfig(ctx, "*")) : await configProvider.updateEnabledConfig(ctx, currentLanguage || "*", !isEnabled);
},__name(toggleCopilotEnablement, "toggleCopilotEnablement");