var TWIRP_URL = "twirp/github.snippy.v1.SnippyAPI";,function getSnippyDomain(ctx) {
  if (isProduction(ctx)) return ProdSnippyDomain;
  let overrideUrl;
  try {
    overrideUrl = getConfig(ctx, ConfigKey.DebugSnippyOverrideUrl);
  } catch {
    return ProdSnippyDomain;
  }
  return overrideUrl || ProdSnippyDomain;
},__name(getSnippyDomain, "getSnippyDomain");,async function call(ctx, endpoint, config, signal) {
  let SNIPPY_BASE_URL = `${getSnippyDomain(ctx)}/${TWIRP_URL}`,
    token;
  try {
    token = (await ctx.get(CopilotTokenManager).getCopilotToken(ctx)).token;
  } catch {
    return ConnectionState.setDisconnected(), createErrorResponse(401, ErrorMessages[ErrorReasons.Unauthorized]);
  }
  if (codeReferenceLogger.info(ctx, `Calling ${endpoint}`), ConnectionState.isRetrying()) return createErrorResponse(600, "Attempting to reconnect to the public code matching service.");
  if (ConnectionState.isDisconnected()) return createErrorResponse(601, "The public code matching service is offline.");
  let res;
  try {
    res = await ctx.get(Fetcher).fetch(`${SNIPPY_BASE_URL}/${endpoint}`, {
      method: config.method,
      body: config.method === "POST" ? JSON.stringify(config.body) : void 0,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...editorVersionHeaders(ctx)
      },
      signal: signal
    });
  } catch {
    return ConnectionState.enableRetry(ctx), createErrorResponse(602, "Network error detected. Check your internet connection.");
  }
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    let message = e.message;
    throw snippyTelemetry.handleUnexpectedError({
      context: ctx,
      origin: "snippyNetwork",
      reason: message
    }), e;
  }
  if (res.ok) return {
    kind: "success",
    ...payload
  };
  let errorPayload = {
      ...payload,
      code: Number(res.status)
    },
    {
      code: code,
      msg: msg,
      meta: meta
    } = errorPayload,
    formattedCode = Number(code),
    errorTypeFromCode = getErrorType(formattedCode),
    fallbackMsg = msg || "unknown error";
  switch (errorTypeFromCode) {
    case ErrorReasons.Unauthorized:
      return createErrorResponse(code, ErrorMessages[ErrorReasons.Unauthorized], meta);
    case ErrorReasons.BadArguments:
      return createErrorResponse(code, fallbackMsg, meta);
    case ErrorReasons.RateLimit:
      return ConnectionState.enableRetry(ctx, 60 * 1e3), createErrorResponse(code, ErrorMessages.RateLimitError, meta);
    case ErrorReasons.InternalError:
      return ConnectionState.enableRetry(ctx), createErrorResponse(code, ErrorMessages[ErrorReasons.InternalError], meta);
    default:
      return createErrorResponse(code, fallbackMsg, meta);
  }
},__name(call, "call");