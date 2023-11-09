var restraintLogger = new Logger(1, "restraint"),
  Logit = {
    link: x => Math.exp(x) / (1 + Math.exp(x)),
    unlink: p => Math.log(p / (1 - p))
  };,function linearInterpolation(x0, points) {
  let x_after = Math.min(...Array.from(points.keys()).filter(x => x >= x0)),
    x_before = Math.max(...Array.from(points.keys()).filter(x => x < x0)),
    y_after = points.get(x_after),
    y_before = points.get(x_before);
  return y_before + (y_after - y_before) * (x0 - x_before) / (x_after - x_before);
},__name(linearInterpolation, "linearInterpolation");,var Regressor = class {
    static {
      __name(this, "Regressor");
    }
    constructor(name, coefficient, transformation) {
      this.name = name, this.coefficient = coefficient, this.transformation = transformation || (x => x);
    }
    contribution(value) {
      return this.coefficient * this.transformation(value);
    }
  },
  LogisticRegression = class {
    constructor(intercept, coefficients, quantiles) {
      this.link = Logit;
      if (this.intercept = intercept, this.coefficients = coefficients, this.logitsToQuantiles = new Map(), this.logitsToQuantiles.set(0, 0), this.logitsToQuantiles.set(1, 1), quantiles) for (let key in quantiles) this.logitsToQuantiles.set(quantiles[key], Number(key));
    }
    static {
      __name(this, "LogisticRegression");
    }
    predict(ctx, values) {
      let sum = this.intercept;
      for (let regressor of this.coefficients) {
        let value = values[regressor.name];
        if (value === void 0) return NaN;
        sum += regressor.contribution(value);
      }
      return this.link.link(sum);
    }
    quantile(ctx, values) {
      let logit = this.predict(ctx, values);
      return linearInterpolation(logit, this.logitsToQuantiles);
    }
  },
  ghostTextRetentionModel = new LogisticRegression(ghostTextDisplayInterceptParameter, [new Regressor("compCharLen", ghostTextDisplayLog1pcompCharLenParameter, x => Math.log(1 + x)), new Regressor("meanLogProb", ghostTextDisplayMeanLogProbParameter), new Regressor("meanAlternativeLogProb", ghostTextDisplayMeanAlternativeLogProbParameter)].concat(Object.entries(ghostTextDisplayLanguageParameters).map(value => new Regressor(value[0], value[1]))), ghostTextDisplayQuantiles);,function ghostTextScoreConfidence(ctx, telemetryData) {
  let values = {
    ...telemetryData.measurements
  };
  return Object.keys(ghostTextDisplayLanguageParameters).forEach(lang => {
    values[lang] = telemetryData.properties["customDimensions.languageId"] == lang ? 1 : 0;
  }), ghostTextRetentionModel.predict(ctx, values);
},__name(ghostTextScoreConfidence, "ghostTextScoreConfidence");,function ghostTextScoreQuantile(ctx, telemetryData) {
  let values = {
    ...telemetryData.measurements
  };
  return Object.keys(ghostTextDisplayLanguageParameters).forEach(lang => {
    values[lang] = telemetryData.properties["customDimensions.languageId"] == lang ? 1 : 0;
  }), ghostTextRetentionModel.quantile(ctx, values);
},__name(ghostTextScoreQuantile, "ghostTextScoreQuantile");