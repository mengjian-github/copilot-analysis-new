var import_vscode = require("vscode");,var EnterpriseConfigPrefix = "github-enterprise",
  DotComUrl = "https://github.com";,function configuredBaseUrl() {
  return BD.workspace.getConfiguration(CopilotConfigPrefix).get("advanced")?.authProvider === "github-enterprise" ? BD.workspace.getConfiguration(EnterpriseConfigPrefix).get("uri") ?? DotComUrl : DotComUrl;
},__name(configuredBaseUrl, "configuredBaseUrl");,var VSCodeNetworkConfiguration = class extends DefaultNetworkConfiguration {
  static {
    __name(this, "VSCodeNetworkConfiguration");
  }
  constructor() {
    super(configuredBaseUrl(), {});
  }
  updateBaseUrl(ctx, newUrl) {
    super.updateBaseUrl(ctx, configuredBaseUrl());
  }
};,function onDidChangeConfigurationHandler(event, ctx) {
  (event.affectsConfiguration(`${CopilotConfigPrefix}.advanced`) || event.affectsConfiguration(`${EnterpriseConfigPrefix}.uri`)) && ctx.get(NetworkConfiguration).updateBaseUrl(ctx);
},__name(onDidChangeConfigurationHandler, "onDidChangeConfigurationHandler");