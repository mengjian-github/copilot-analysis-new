var TelemetryUserConfig = class {
  static {
    __name(this, "TelemetryUserConfig");
  }
  constructor(ctx, trackingId, optedIn, ftFlag) {
    this.trackingId = trackingId, this.optedIn = optedIn ?? !1, this.ftFlag = ftFlag ?? "", this.setupUpdateOnToken(ctx);
  }
  setupUpdateOnToken(ctx) {
    ctx.get(CopilotTokenNotifier).on("onCopilotToken", copilotToken => {
      let restrictedTelemetry = copilotToken.getTokenValue("rt") === "1",
        ftFlag = copilotToken.getTokenValue("ft") ?? "",
        trackingId = copilotToken.getTokenValue("tid"),
        organizationsList = copilotToken.organization_list,
        enterpriseList = copilotToken.enterprise_list,
        sku = copilotToken.getTokenValue("sku");
      trackingId !== void 0 && (this.trackingId = trackingId, this.organizationsList = organizationsList?.toString(), this.enterpriseList = enterpriseList?.toString(), this.sku = sku, this.optedIn = restrictedTelemetry, this.ftFlag = ftFlag);
    });
  }
};,var frameRegexp = /^(\s+at)?(.*?)(@|\s\(|\s)([^(\n]+?)(:\d+)?(:\d+)?(\)?)$/;,function buildExceptionDetail(error) {
  let exceptionDetail = {
      type: error.name,
      value: error.message
    },
    originalStack = error.stack?.replace(/^.*?:\d+\n.*\n *\^?\n\n/, "");
  if (originalStack?.startsWith(error.toString() + `
`)) {
    exceptionDetail.stacktrace = [];
    for (let assembly of originalStack.slice(error.toString().length + 1).split(/\n/).reverse()) {
      let matches = assembly.match(frameRegexp),
        frame = {
          filename: "",
          function: ""
        };
      matches && (frame.function = matches[2]?.trim()?.replace(/^[^.]{1,2}(\.|$)/, "_$1") ?? frame.function, frame.filename = matches[4]?.trim() ?? frame.filename, matches[5] && matches[5] !== ":0" && (frame.lineno = matches[5].slice(1)), matches[6] && matches[5] !== ":0" && (frame.colno = matches[6].slice(1)), frame.in_app = !/[[<:]|(?:^|\/)node_modules\//.test(frame.filename)), exceptionDetail.stacktrace.push(frame);
    }
  }
  return exceptionDetail;
},__name(buildExceptionDetail, "buildExceptionDetail");,function buildPayload(ctx, redactedError, properties = {}) {
  let buildInfo = ctx.get(BuildInfo),
    epinfo = ctx.get(EditorAndPluginInfo),
    payload = {
      app: "copilot-client",
      rollup_id: "auto",
      platform: "node",
      release: buildInfo.getBuildType() !== "dev" ? `copilot-client@${buildInfo.getVersion()}` : void 0,
      deployed_to: buildInfo.getBuildType(),
      catalog_service: epinfo.getEditorInfo().name === "vscode" ? "CopilotCompletionsVSCode" : "CopilotIDEAgent",
      context: {
        ...properties,
        "#editor": epinfo.getEditorInfo().name,
        "#editor_version": formatNameAndVersion(epinfo.getEditorInfo()),
        "#editor_remote_name": `${epinfo.getEditorInfo().name}/${epinfo.getEditorInfo().remoteName ?? "none"}`,
        "#plugin": epinfo.getEditorPluginInfo().name,
        "#plugin_version": formatNameAndVersion(epinfo.getEditorPluginInfo()),
        "#session_id": ctx.get(EditorSession).sessionId,
        "#machine_id": ctx.get(EditorSession).machineId,
        "#node_version": process.versions.node,
        "#architecture": r6.arch(),
        "#os_platform": r6.platform()
      },
      sensitive_context: {}
    },
    telemetryConfig = ctx.get(TelemetryUserConfig);
  telemetryConfig.trackingId && (payload.context.user = telemetryConfig.trackingId, payload.context["#tracking_id"] = telemetryConfig.trackingId);
  let exceptionsWithDetails = [];
  payload.exception_detail = [];
  let i = 0,
    exception = redactedError;
  for (; exception instanceof Error && i < 10;) {
    let detail = buildExceptionDetail(exception);
    payload.exception_detail.unshift(detail), exceptionsWithDetails.unshift([exception, detail]), i += 1, exception = exception.cause;
  }
  let rollup = [];
  for (let [exception, detail] of exceptionsWithDetails) if (detail.stacktrace && detail.stacktrace.length > 0) {
    rollup.push(`${detail.type}: ${exception.code ?? ""}`);
    let stacktrace = [...detail.stacktrace].reverse();
    for (let frame of stacktrace) if (frame.in_app) {
      rollup.push(`${frame.filename}:${frame.lineno}:${frame.colno}`);
      break;
    }
    rollup.push(`${stacktrace[0].filename}`);
  } else return payload;
  return payload.exception_detail.length > 0 && (payload.rollup_id = (0, t6.SHA256)(t6.enc.Utf16.parse(rollup.join(`
`))).toString()), payload;
},__name(buildPayload, "buildPayload");