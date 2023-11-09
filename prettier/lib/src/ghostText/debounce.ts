async function getDebounceLimit(ctx, telemetryData) {
  let expDebounce;
  if ((await ctx.get(Features).debouncePredict()) && telemetryData.measurements.contextualFilterScore) {
    let acceptProbability = telemetryData.measurements.contextualFilterScore,
      sigmoidMin = 25,
      sigmoidRange = 250,
      sigmoidShift = .3475,
      sigmoidSlope = 7;
    expDebounce = sigmoidMin + sigmoidRange / (1 + Math.pow(acceptProbability / sigmoidShift, sigmoidSlope));
  } else expDebounce = await ctx.get(Features).debounceMs();
  return expDebounce > 0 ? expDebounce : 75;
},__name(getDebounceLimit, "getDebounceLimit");