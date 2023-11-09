var logger = new Logger(1, "Exp"),
  EditorExperimentFilters = class {
    static {
      __name(this, "EditorExperimentFilters");
    }
  };,function setupExperimentationService(ctx) {
  let features = ctx.get(Features);
  features.registerStaticFilters(createAllFilters(ctx)), features.registerDynamicFilter("X-Copilot-OverrideEngine", () => getConfig(ctx, ConfigKey.DebugOverrideEngine));
},__name(setupExperimentationService, "setupExperimentationService");,function createAllFilters(ctx) {
  let defaultFilters = createDefaultFilters(ctx),
    specificFilters = ctx.get(EditorExperimentFilters).addEditorSpecificFilters();
  return {
    ...defaultFilters,
    ...specificFilters
  };
},__name(createAllFilters, "createAllFilters");,function createDefaultFilters(ctx) {
  let buildInfo = ctx.get(BuildInfo),
    editorInfo = ctx.get(EditorAndPluginInfo).getEditorInfo(),
    editorSession = ctx.get(EditorSession);
  return {
    "X-VSCode-AppVersion": trimVersionSuffix(editorInfo.version),
    "X-MSEdge-ClientId": editorSession.machineId,
    "X-VSCode-ExtensionName": buildInfo.getName(),
    "X-VSCode-ExtensionVersion": trimVersionSuffix(buildInfo.getVersion()),
    "X-VSCode-TargetPopulation": "public"
  };
},__name(createDefaultFilters, "createDefaultFilters");,function trimVersionSuffix(version) {
  return version.split("-")[0];
},__name(trimVersionSuffix, "trimVersionSuffix");