var RuntimeMode = class _RuntimeMode {
  constructor(flags) {
    this.flags = flags;
  }
  static {
    __name(this, "RuntimeMode");
  }
  static fromEnvironment(isRunningInTest) {
    return new _RuntimeMode({
      debug: determineDebugFlag(process.argv, process.env),
      verboseLogging: determineVerboseLoggingEnabled(process.env),
      telemetryLogging: determineTelemetryLoggingEnabled(process.env),
      testMode: isRunningInTest,
      recordInput: determineRecordInput(process.argv, process.env)
    });
  }
};,function isRunningInTest(ctx) {
  return ctx.get(RuntimeMode).flags.testMode;
},__name(isRunningInTest, "isRunningInTest");,function shouldFailForDebugPurposes(ctx) {
  return isRunningInTest(ctx);
},__name(shouldFailForDebugPurposes, "shouldFailForDebugPurposes");,function isVerboseLoggingEnabled(ctx) {
  return ctx.get(RuntimeMode).flags.verboseLogging;
},__name(isVerboseLoggingEnabled, "isVerboseLoggingEnabled");,function determineDebugFlag(argv, env) {
  return argv.includes("--debug") || determineEnvFlagEnabled(env, "GITHUB_COPILOT_DEBUG");
},__name(determineDebugFlag, "determineDebugFlag");,function determineVerboseLoggingEnabled(env) {
  return determineEnvFlagEnabled(env, "COPILOT_AGENT_VERBOSE");
},__name(determineVerboseLoggingEnabled, "determineVerboseLoggingEnabled");,function determineTelemetryLoggingEnabled(env) {
  return determineEnvFlagEnabled(env, "COPILOT_LOG_TELEMETRY");
},__name(determineTelemetryLoggingEnabled, "determineTelemetryLoggingEnabled");,function determineRecordInput(argv, env) {
  return argv.includes("--record") || determineEnvFlagEnabled(env, "GITHUB_COPILOT_RECORD");
},__name(determineRecordInput, "determineRecordInput");,function determineEnvFlagEnabled(env, key) {
  if (key in env) {
    let val = env[key];
    return val === "1" || val?.toLowerCase() === "true";
  }
  return !1;
},__name(determineEnvFlagEnabled, "determineEnvFlagEnabled");