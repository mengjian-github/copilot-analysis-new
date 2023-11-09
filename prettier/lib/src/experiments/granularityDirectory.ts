var BUCKETFILTER = "X-Copilot-ClientTimeBucket",
  GranularityDirectory = class {
    constructor(prefix, clock) {
      this.specs = new Map();
      this.prefix = prefix, this.clock = clock, this.defaultGranularity = DEFAULT_GRANULARITY(prefix);
    }
    static {
      __name(this, "GranularityDirectory");
    }
    selectGranularity(filters) {
      for (let [rememberedFilters, granularity] of this.specs.entries()) if (filters.extends(rememberedFilters)) return granularity;
      return this.defaultGranularity;
    }
    update(filters, byCallBuckets, timePeriodSizeInH) {
      if (byCallBuckets = byCallBuckets > 1 ? byCallBuckets : NaN, timePeriodSizeInH = timePeriodSizeInH > 0 ? timePeriodSizeInH : NaN, isNaN(byCallBuckets) && isNaN(timePeriodSizeInH)) this.specs.delete(filters);else {
        let newGranularity = new TimeBucketGranularity(this.prefix);
        isNaN(byCallBuckets) || newGranularity.setByCallBuckets(byCallBuckets), isNaN(timePeriodSizeInH) || newGranularity.setTimePeriod(timePeriodSizeInH * 3600 * 1e3), this.specs.set(filters, newGranularity);
      }
    }
    extendFilters(filters) {
      let implementation = this.selectGranularity(filters),
        [value, upcomingValues] = implementation.getCurrentAndUpComingValues(this.clock.now());
      return {
        newFilterSettings: filters.withChange(BUCKETFILTER, value),
        otherFilterSettingsToPrefetch: upcomingValues.map(value => filters.withChange(BUCKETFILTER, value))
      };
    }
  };,var FilterSettingsToExpConfigs = class {
    constructor(ctx) {
      this.ctx = ctx;
      this.cache = new LRUCacheMap(200);
    }
    static {
      __name(this, "FilterSettingsToExpConfigs");
    }
    async fetchExpConfig(settings) {
      let task = this.cache.get(settings.stringify());
      return task || (task = new Task(() => this.ctx.get(ExpConfigMaker).fetchExperiments(this.ctx, settings.toHeaders()), 1e3 * 60 * 60), this.cache.set(settings.stringify(), task)), task.run();
    }
    getCachedExpConfig(settings) {
      return this.cache.get(settings.stringify())?.value();
    }
  },
  Task = class {
    constructor(producer, expirationMs = 1 / 0) {
      this.producer = producer;
      this.expirationMs = expirationMs;
    }
    static {
      __name(this, "Task");
    }
    async run() {
      return this.promise === void 0 && (this.promise = this.producer(), this.storeResult(this.promise).then(() => {
        this.expirationMs < 1 / 0 && this.promise !== void 0 && setTimeout(() => this.promise = void 0, this.expirationMs);
      })), this.promise;
    }
    async storeResult(promise) {
      try {
        this.result = await promise;
      } finally {
        this.result === void 0 && (this.promise = void 0);
      }
    }
    value() {
      return this.result;
    }
  },
  Features = class _Features {
    constructor(ctx) {
      this.ctx = ctx;
      this.staticFilters = {};
      this.dynamicFilters = {};
      this.upcomingDynamicFilters = {};
      this.assignments = new FilterSettingsToExpConfigs(this.ctx);
    }
    static {
      __name(this, "Features");
    }
    static {
      this.upcomingDynamicFilterCheckDelayMs = 20;
    }
    static {
      this.upcomingTimeBucketMinutes = 5 + Math.floor(Math.random() * 11);
    }
    registerStaticFilters(filters) {
      Object.assign(this.staticFilters, filters);
    }
    registerDynamicFilter(filter, generator) {
      this.dynamicFilters[filter] = generator;
    }
    getDynamicFilterValues() {
      let values = {};
      for (let [filter, generator] of Object.entries(this.dynamicFilters)) values[filter] = generator();
      return values;
    }
    registerUpcomingDynamicFilter(filter, generator) {
      this.upcomingDynamicFilters[filter] = generator;
    }
    async getAssignment(feature, requestFilters = {}, telemetryData) {
      let granularityDirectory = this.getGranularityDirectory(),
        preGranularityFilters = this.makeFilterSettings(requestFilters),
        rememberedGranularityExtension = granularityDirectory.extendFilters(preGranularityFilters),
        expAccordingToRememberedExtension = await this.getExpConfig(rememberedGranularityExtension.newFilterSettings);
      granularityDirectory.update(preGranularityFilters, +(expAccordingToRememberedExtension.variables.copilotbycallbuckets ?? NaN), +(expAccordingToRememberedExtension.variables.copilottimeperiodsizeinh ?? NaN));
      let currentGranularityExtension = granularityDirectory.extendFilters(preGranularityFilters),
        filters = currentGranularityExtension.newFilterSettings,
        exp = await this.getExpConfig(filters),
        backgroundQueue = new Promise(resolve => setTimeout(resolve, _Features.upcomingDynamicFilterCheckDelayMs));
      for (let upcomingFilter of currentGranularityExtension.otherFilterSettingsToPrefetch) backgroundQueue = backgroundQueue.then(async () => {
        await new Promise(resolve => setTimeout(resolve, _Features.upcomingDynamicFilterCheckDelayMs)), this.getExpConfig(upcomingFilter);
      });
      return this.prepareForUpcomingFilters(filters), telemetryData && (telemetryData.filtersAndExp = {
        exp: exp,
        filters: filters
      }), exp.variables[feature];
    }
    getGranularityDirectory() {
      if (!this.granularityDirectory) {
        let machineId = this.ctx.get(EditorSession).machineId;
        this.granularityDirectory = new GranularityDirectory(machineId, this.ctx.get(Clock));
      }
      return this.granularityDirectory;
    }
    makeFilterSettings(requestFilters) {
      return new FilterSettings({
        ...this.staticFilters,
        ...this.getDynamicFilterValues(),
        ...requestFilters
      });
    }
    async getExpConfig(settings) {
      try {
        return this.assignments.fetchExpConfig(settings);
      } catch (e) {
        return ExpConfig.createFallbackConfig(this.ctx, `Error fetching ExP config: ${e}`);
      }
    }
    async prepareForUpcomingFilters(filters) {
      if (!(new Date().getMinutes() < 60 - _Features.upcomingTimeBucketMinutes)) for (let [filter, generator] of Object.entries(this.upcomingDynamicFilters)) await new Promise(resolve => setTimeout(resolve, _Features.upcomingDynamicFilterCheckDelayMs)), this.getExpConfig(filters.withChange(filter, generator()));
    }
    stringify() {
      let defaultExpConfig = this.assignments.getCachedExpConfig(new FilterSettings({}));
      return JSON.stringify(defaultExpConfig?.variables ?? {});
    }
    async addExpAndFilterToTelemetry(telemetryData) {
      let filters = this.makeFilterSettings({});
      telemetryData.filtersAndExp = {
        filters: filters,
        exp: await this.getExpConfig(filters)
      };
    }
    async debounceMs() {
      return (await this.getAssignment("copilotdebouncems")) ?? 0;
    }
    async debouncePredict() {
      return (await this.getAssignment("copilotdebouncepredict")) ?? !1;
    }
    async contextualFilterEnable() {
      return (await this.getAssignment("copilotcontextualfilterenable")) ?? !0;
    }
    async contextualFilterEnableTree() {
      return (await this.getAssignment("copilotcontextualfilterenabletree")) ?? !0;
    }
    async contextualFilterAcceptThreshold() {
      return (await this.getAssignment("copilotcontextualfilteracceptthreshold")) ?? 35;
    }
    async contextualFilterExplorationTraffic() {
      return (await this.getAssignment("copilotcontextualfilterexplorationtraffic")) ?? 1;
    }
    async disableLogProb() {
      return (await this.getAssignment("copilotdisablelogprob")) ?? !0;
    }
    async overrideBlockMode() {
      return (await this.getAssignment("copilotoverrideblockmode")) || void 0;
    }
    async fastCancellation() {
      return (await this.getAssignment("copilotoverridefastcancellation")) ?? !0;
    }
    async overrideNumGhostCompletions() {
      return await this.getAssignment("copilotoverridednumghostcompletions");
    }
    async dropCompletionReasons() {
      let reasons = await this.getAssignment("copilotdropcompletionreasons");
      if (reasons) return reasons.split(",");
    }
    async customEngine({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, telemetryData) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotcustomengine", filters, telemetryData)) ?? "";
    }
    async beforeRequestWaitMs({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, telemetryData) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotlms", filters, telemetryData)) ?? 0;
    }
    async multiLogitBias({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, telemetryData) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotlbeot", filters, telemetryData)) ?? !1;
    }
    async requestMultilineExploration({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, telemetryData) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotrequestmultilineexploration", filters, telemetryData)) ?? !1;
    }
    async suffixPercent({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return getConfig(this.ctx, ConfigKey.DebugOverrideEngine) ? 0 : (await this.getAssignment("CopilotSuffixPercent", filters)) ?? 15;
    }
    async suffixMatchThreshold({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotsuffixmatchthreshold", filters)) ?? 10;
    }
    async fimSuffixLengthThreshold({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotfimsuffixlenthreshold", filters)) ?? 0;
    }
    async suffixStartMode({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      switch (await this.getAssignment("copilotsuffixstartmode", filters)) {
        case "cursor":
          return $a.SuffixStartMode.Cursor;
        case "cursortrimstart":
          return $a.SuffixStartMode.CursorTrimStart;
        case "siblingblock":
          return $a.SuffixStartMode.SiblingBlock;
        case "siblingblocktrimstart":
          return $a.SuffixStartMode.SiblingBlockTrimStart;
        default:
          return $a.SuffixStartMode.CursorTrimStart;
      }
    }
    async numberOfSnippets({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotnumberofsnippets", filters)) ?? $a.DEFAULT_NUM_OF_SNIPPETS;
    }
    async snippetPercent({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("snippetpercent", filters)) ?? 0;
    }
    async neighboringTabsOption({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      switch (await this.getAssignment("copilotneighboringtabs", filters)) {
        case "none":
          return $a.NeighboringTabsOption.None;
        case "conservative":
          return $a.NeighboringTabsOption.Conservative;
        case "medium":
          return $a.NeighboringTabsOption.Medium;
        case "eager":
          return $a.NeighboringTabsOption.Eager;
        case "eagerbutlittle":
          return $a.NeighboringTabsOption.EagerButLittle;
        case "eagerbutmedium":
          return $a.NeighboringTabsOption.EagerButMedium;
        case "eagerbutmuch":
          return $a.NeighboringTabsOption.EagerButMuch;
        case "retrievalcomparable":
          return $a.NeighboringTabsOption.RetrievalComparable;
        default:
          return $a.NeighboringTabsOption.Eager;
      }
    }
    async neighboringSnippetTypes({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      switch (await this.getAssignment("copilotneighboringsnippettypes", filters)) {
        case "function":
          return $a.NeighboringSnippetType.NeighboringFunctions;
        case "snippet":
          return $a.NeighboringSnippetType.NeighboringSnippets;
        case "cursor":
          return $a.NeighboringSnippetType.CursorHistoryMatcher;
        default:
          return $a.NeighboringSnippetType.NeighboringSnippets;
      }
    }
    async neighboringFileType({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      switch (await this.getAssignment("copilotneighboringfiletype", filters)) {
        case "none":
          return "none";
        case "cursormostrecent":
          return "cursormostrecent";
        case "cursormostcount":
          return "cursormostcount";
        case "workspacesharingsamefolder":
          return "workspacesharingsamefolder";
        case "workspacesmallestpathdist":
          return "workspacesmallestpathdist";
        case "cocommitted":
          return "opentabsandcocommitted";
        case "opentabs":
        default:
          return "opentabs";
      }
    }
    async cursorSnippetsPickingStrategy({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      switch (await this.getAssignment("cursorsnippetspickingstrategy", filters)) {
        case "cursoronly":
          return $a.CursorSnippetsPickingStrategy.CursorOnly;
        case "jaccardcursor":
          return $a.CursorSnippetsPickingStrategy.JaccardCursor;
        case "cursorjaccard":
        default:
          return $a.CursorSnippetsPickingStrategy.CursorJaccard;
      }
    }
    async retrievalStrategy({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, telemetryData) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("retrieval", filters, telemetryData)) ?? !1;
    }
    async retrievalServerRoute({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, telemetryData) {
      let filters = {
          "X-Copilot-Repository": repoNwo,
          "X-Copilot-FileType": fileType,
          "X-Copilot-UserKind": userKind,
          "X-Copilot-Dogfood": dogFood,
          "X-Copilot-CustomModel": customModel,
          "X-Copilot-RetrievalOrg": retrievalOrg
        },
        expvalue = await this.getAssignment("retrievalserverroute", filters, telemetryData);
      switch (expvalue) {
        case "aims":
          return "2";
        case "devdiv":
          return "1";
        case "githubnext":
          return "0";
        default:
          return expvalue ?? "0";
      }
    }
    async symbolDefinitionStrategy({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotsymboldefinitionstrategy", filters)) ?? !1;
    }
    async localImportContext({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      switch (await this.getAssignment("localimportcontext", filters)) {
        case !0:
          return $a.LocalImportContextOption.Declarations;
        case !1:
        default:
          return $a.LocalImportContextOption.NoContext;
      }
    }
    async maxPromptCompletionTokens({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }, def) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("maxpromptcompletionTokens", filters)) ?? def;
    }
    async hybridInference({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("hybridinference", filters)) ?? !1;
    }
    async hybridInferenceThreshold({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return ((await this.getAssignment("hybridinferencethreshold", filters)) ?? -100) / 100;
    }
    async requestMultiOnNewLine({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotrequestmultionnewline", filters)) ?? !1;
    }
    async requestMultiModel({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return (await this.getAssignment("copilotrequestmultimodel", filters)) ?? !1;
    }
    async requestMultiModelThreshold({
      repoNwo: repoNwo,
      fileType: fileType,
      userKind: userKind,
      dogFood: dogFood,
      retrievalOrg: retrievalOrg,
      customModel: customModel
    }) {
      let filters = {
        "X-Copilot-Repository": repoNwo,
        "X-Copilot-FileType": fileType,
        "X-Copilot-UserKind": userKind,
        "X-Copilot-Dogfood": dogFood,
        "X-Copilot-CustomModel": customModel,
        "X-Copilot-RetrievalOrg": retrievalOrg
      };
      return ((await this.getAssignment("copilotrequestmultimodelthreshold", filters)) ?? 100) / 100;
    }
  };,var packageJson = rO(),
  ConfigKey = {
    Enable: "enable",
    InlineSuggestEnable: "inlineSuggest.enable",
    ShowEditorCompletions: ["editor", "showEditorCompletions"],
    EnableAutoCompletions: ["editor", "enableAutoCompletions"],
    DelayCompletions: ["editor", "delayCompletions"],
    FilterCompletions: ["editor", "filterCompletions"],
    DisplayStyle: ["advanced", "displayStyle"],
    SecretKey: ["advanced", "secret_key"],
    SolutionLength: ["advanced", "length"],
    Stops: ["advanced", "stops"],
    Temperature: ["advanced", "temperature"],
    TopP: ["advanced", "top_p"],
    IndentationMode: ["advanced", "indentationMode"],
    InlineSuggestCount: ["advanced", "inlineSuggestCount"],
    ListCount: ["advanced", "listCount"],
    DebugOverrideCapiUrl: ["advanced", "debug.overrideCapiUrl"],
    DebugTestOverrideCapiUrl: ["advanced", "debug.testOverrideCapiUrl"],
    DebugOverrideProxyUrl: ["advanced", "debug.overrideProxyUrl"],
    DebugTestOverrideProxyUrl: ["advanced", "debug.testOverrideProxyUrl"],
    DebugOverrideEngine: ["advanced", "debug.overrideEngine"],
    DebugShowScores: ["advanced", "debug.showScores"],
    DebugOverrideLogLevels: ["advanced", "debug.overrideLogLevels"],
    DebugFilterLogCategories: ["advanced", "debug.filterLogCategories"],
    DebugSnippyOverrideUrl: ["advanced", "debug.codeRefOverrideUrl"],
    DebugTruncationKiwi: ["advanced", "debug.truncationKiwi"],
    KerberosServicePrincipal: ["advanced", "kerberosServicePrincipal"]
  };,function shouldDoParsingTrimming(blockMode) {
  return ["parsing", "parsingandserver"].includes(blockMode);
},__name(shouldDoParsingTrimming, "shouldDoParsingTrimming");,function shouldDoServerTrimming(blockMode) {
  return ["server", "parsingandserver"].includes(blockMode);
},__name(shouldDoServerTrimming, "shouldDoServerTrimming");,var BlockModeConfig = class {
    static {
      __name(this, "BlockModeConfig");
    }
  },
  ConfigBlockModeConfig = class extends BlockModeConfig {
    static {
      __name(this, "ConfigBlockModeConfig");
    }
    async forLanguage(ctx, languageId) {
      if (ctx.get(ConfigProvider).isDefaultSettingOverwritten(ConfigKey.IndentationMode)) switch (ctx.get(ConfigProvider).getLanguageConfig(ConfigKey.IndentationMode, languageId)) {
        case "client":
        case !0:
        case "server":
          return "server";
        case "clientandserver":
          return toApplicableBlockMode("parsingandserver", languageId);
        default:
          return "parsing";
      }
      let overrideBlockMode = await ctx.get(Features).overrideBlockMode();
      return overrideBlockMode ? toApplicableBlockMode(overrideBlockMode, languageId) : languageId == "ruby" ? "parsing" : (0, Ox.isSupportedLanguageId)(languageId) ? "parsingandserver" : "server";
    }
  };,function toApplicableBlockMode(blockMode, languageId) {
  switch (blockMode) {
    case "parsing":
      return (0, Ox.isSupportedLanguageId)(languageId) ? "parsing" : "server";
    case "server":
      return "server";
    case "parsingandserver":
    default:
      return (0, Ox.isSupportedLanguageId)(languageId) ? "parsingandserver" : "server";
  }
},__name(toApplicableBlockMode, "toApplicableBlockMode");,var ConfigProvider = class {
  static {
    __name(this, "ConfigProvider");
  }
};,function getConfigDefaultForObjectKey(key, objectKey) {
  try {
    let value = packageJson.contributes.configuration[0].properties[`${CopilotConfigPrefix}.${key}`].properties[objectKey].default;
    if (value === void 0) throw new Error(`Missing config default value: ${CopilotConfigPrefix}.${key}`);
    return value;
  } catch (e) {
    throw new Error(`Error inspecting config default value ${CopilotConfigPrefix}.${key}.${objectKey}: ${e}`);
  }
},__name(getConfigDefaultForObjectKey, "getConfigDefaultForObjectKey");,function getConfig(ctx, key) {
  return ctx.get(ConfigProvider).getConfig(key);
},__name(getConfig, "getConfig");,function isDefaultSettingOverwritten(ctx, key) {
  return ctx.get(ConfigProvider).isDefaultSettingOverwritten(key);
},__name(isDefaultSettingOverwritten, "isDefaultSettingOverwritten");,function getHiddenConfig(ctx, key, options) {
  return isDefaultSettingOverwritten(ctx, key) ? getConfig(ctx, key) : options.default;
},__name(getHiddenConfig, "getHiddenConfig");,function dumpConfig(ctx) {
  return ctx.get(ConfigProvider).dumpConfig();
},__name(dumpConfig, "dumpConfig");,function getLanguageConfig(ctx, key, language) {
  return ctx.get(ConfigProvider).getLanguageConfig(key, language);
},__name(getLanguageConfig, "getLanguageConfig");,function getEnabledConfig(ctx, language) {
  return getLanguageConfig(ctx, ConfigKey.Enable, language);
},__name(getEnabledConfig, "getEnabledConfig");,var BuildInfo = class {
  constructor() {
    this.packageJson = packageJson;
  }
  static {
    __name(this, "BuildInfo");
  }
  isProduction() {
    return this.getBuildType() != "dev";
  }
  getBuildType() {
    return this.packageJson.buildType;
  }
  getVersion() {
    return this.packageJson.version;
  }
  getBuild() {
    return this.packageJson.build;
  }
  getName() {
    return this.packageJson.name;
  }
};,function isProduction(ctx) {
  return ctx.get(BuildInfo).isProduction();
},__name(isProduction, "isProduction");,function getBuildType(ctx) {
  return ctx.get(BuildInfo).getBuildType();
},__name(getBuildType, "getBuildType");,function getBuild(ctx) {
  return ctx.get(BuildInfo).getBuild();
},__name(getBuild, "getBuild");,function getVersion(ctx) {
  return ctx.get(BuildInfo).getVersion();
},__name(getVersion, "getVersion");,var EditorSession = class {
  constructor(sessionId, machineId) {
    this.sessionId = sessionId;
    this.machineId = machineId;
  }
  static {
    __name(this, "EditorSession");
  }
};,function formatNameAndVersion({
  name: name,
  version: version
}) {
  return `${name}/${version}`;
},__name(formatNameAndVersion, "formatNameAndVersion");,var EditorAndPluginInfo = class {
  static {
    __name(this, "EditorAndPluginInfo");
  }
};,function editorVersionHeaders(ctx) {
  let info = ctx.get(EditorAndPluginInfo);
  return {
    "Editor-Version": formatNameAndVersion(info.getEditorInfo()),
    "Editor-Plugin-Version": formatNameAndVersion(info.getEditorPluginInfo())
  };
},__name(editorVersionHeaders, "editorVersionHeaders");