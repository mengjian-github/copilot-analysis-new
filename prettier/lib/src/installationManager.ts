var InstallationManager = class {
  static {
    __name(this, "InstallationManager");
  }
  async startup(ctx) {
    (await this.isNewInstall(ctx)) ? (await this.handleInstall(ctx, await this.wasPreviouslyInstalled(ctx)), await this.markInstalled(ctx)) : (await this.isNewUpgrade(ctx)) && (await this.handleUpgrade(ctx), await this.markUpgraded(ctx));
  }
  async uninstall(ctx) {
    return await this.handleUninstall(ctx);
  }
  async handleInstall(ctx, previouslyInstalled) {
    previouslyInstalled ? telemetry(ctx, "installed.reinstall") : telemetry(ctx, "installed.new");
  }
  async handleUpgrade(ctx) {
    telemetry(ctx, "installed.upgrade");
  }
  async handleUninstall(ctx) {
    telemetry(ctx, "uninstalled");
  }
};,var VsCodeInstallationManager = class extends InstallationManager {
  static {
    __name(this, "VsCodeInstallationManager");
  }
  async isNewInstall(ctx) {
    return !ctx.get(Extension).context.globalState.get("installedVersion") && !(await hasExistingSession());
  }
  async markInstalled(ctx) {
    let info = ctx.get(EditorAndPluginInfo).getEditorPluginInfo();
    ctx.get(Extension).context.globalState.update("installedVersion", info.version);
  }
  async wasPreviouslyInstalled(ctx) {
    return !1;
  }
  async isNewUpgrade(ctx) {
    let current = ctx.get(EditorAndPluginInfo).getEditorPluginInfo(),
      last = ctx.get(Extension).context.globalState.get("installedVersion");
    if (last === void 0) return !0;
    try {
      return (0, py.gt)((0, py.coerce)(current.version), (0, py.coerce)(last));
    } catch {
      return !1;
    }
  }
  async markUpgraded(ctx) {
    await this.markInstalled(ctx);
  }
};