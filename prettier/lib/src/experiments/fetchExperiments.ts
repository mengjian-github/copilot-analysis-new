var ExpConfigMaker = class {
    static {
      __name(this, "ExpConfigMaker");
    }
  },
  ExpConfigFromTAS = class extends ExpConfigMaker {
    static {
      __name(this, "ExpConfigFromTAS");
    }
    async fetchExperiments(ctx, filterHeaders) {
      let fetcher = ctx.get(Fetcher),
        resp;
      try {
        resp = await fetcher.fetch("https://default.exp-tas.com/vscode/ab", {
          method: "GET",
          headers: filterHeaders
        });
      } catch (e) {
        return ExpConfig.createFallbackConfig(ctx, `Error fetching ExP config: ${e}`);
      }
      if (!resp.ok) return ExpConfig.createFallbackConfig(ctx, `ExP responded with ${resp.status}`);
      let json;
      try {
        json = await resp.json();
      } catch (e) {
        if (e instanceof SyntaxError) return telemetryException(ctx, e, "fetchExperiments"), ExpConfig.createFallbackConfig(ctx, "ExP responded with invalid JSON");
        throw e;
      }
      let vscodeConfig = json.Configs.find(c => c.Id === "vscode") ?? {
          Id: "vscode",
          Parameters: {}
        },
        features = Object.entries(vscodeConfig.Parameters).map(([name, value]) => name + (value ? "" : "cf"));
      return new ExpConfig(vscodeConfig.Parameters, json.AssignmentContext, features.join(";"));
    }
  },
  ExpConfigNone = class extends ExpConfigMaker {
    static {
      __name(this, "ExpConfigNone");
    }
    async fetchExperiments(ctx, filterHeaders) {
      return ExpConfig.createEmptyConfig();
    }
  };