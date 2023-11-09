var HeaderContributors = class {
  constructor() {
    this.contributors = [];
  }
  static {
    __name(this, "HeaderContributors");
  }
  add(contributor) {
    this.contributors.push(contributor);
  }
  remove(contributor) {
    let index = this.contributors.indexOf(contributor);
    index !== -1 && this.contributors.splice(index, 1);
  }
  contributeHeaders(headers) {
    for (let contributor of this.contributors) contributor.contributeHeaderValues(headers);
  }
  size() {
    return this.contributors.length;
  }
};,var Fetcher = class {
  static {
    __name(this, "Fetcher");
  }
  set rejectUnauthorized(value) {
    this._rejectUnauthorized = value;
  }
  get rejectUnauthorized() {
    return this._rejectUnauthorized;
  }
};,function isAbortError(e) {
  return e instanceof AbortError || e.name === "AbortError" && e.code === "ABORT_ERR" && e instanceof Error || e instanceof FetchError && e.code === "ABORT_ERR";
},__name(isAbortError, "isAbortError");,var JsonParseError = class extends SyntaxError {
    constructor(message, code) {
      super(message);
      this.code = code;
      this.name = "JsonParseError";
    }
    static {
      __name(this, "JsonParseError");
    }
  },
  networkErrorCodes = new Set(["ECONNABORTED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH", "ENOTCONN", "ETIMEDOUT", "ERR_HTTP2_STREAM_ERROR", "ERR_SSL_BAD_DECRYPT", "ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC", "ERR_STREAM_PREMATURE_CLOSE"]);,function isNetworkError(e) {
  return e instanceof FetchError || e instanceof JsonParseError || e instanceof Error && networkErrorCodes.has(e.code);
},__name(isNetworkError, "isNetworkError");,var Response = class {
    constructor(status, statusText, headers, getText, getBody) {
      this.status = status;
      this.statusText = statusText;
      this.headers = headers;
      this.getText = getText;
      this.getBody = getBody;
      this.ok = this.status >= 200 && this.status < 300;
    }
    static {
      __name(this, "Response");
    }
    async text() {
      return this.getText();
    }
    async json() {
      let text = await this.text(),
        contentType = this.headers.get("content-type");
      if (!contentType || !contentType.includes("json")) throw new JsonParseError(`Response content-type is ${contentType ?? "missing"} (status=${this.status})`, `ContentType=${contentType}`);
      try {
        return JSON.parse(text);
      } catch (e) {
        if (e instanceof SyntaxError) {
          let posMatch = e.message.match(/^(.*?) in JSON at position (\d+)$/);
          if (posMatch && parseInt(posMatch[2], 10) == text.length || e.message === "Unexpected end of JSON input") {
            let actualLength = new wU.TextEncoder().encode(text).length,
              headerLength = this.headers.get("content-length");
            throw headerLength === null ? new JsonParseError(`Response body truncated: actualLength=${actualLength}`, "Truncated") : new JsonParseError(`Response body truncated: actualLength=${actualLength}, headerLength=${headerLength}`, "Truncated");
          }
        }
        throw e;
      }
    }
    async body() {
      return this.getBody();
    }
  },
  requestTimeoutMs = 30 * 1e3;,function postRequest(ctx, url, secretKey, intent, requestId, body, cancelToken) {
  let headers = {
    Authorization: SU.format("Bearer %s", secretKey),
    "X-Request-Id": requestId,
    "Openai-Organization": "github-copilot",
    "VScode-SessionId": ctx.get(EditorSession).sessionId,
    "VScode-MachineId": ctx.get(EditorSession).machineId,
    ...editorVersionHeaders(ctx)
  };
  ctx.get(HeaderContributors).contributeHeaders(headers), intent && (headers["OpenAI-Intent"] = intent);
  let request = {
      method: "POST",
      headers: headers,
      json: body,
      timeout: requestTimeoutMs
    },
    fetcher = ctx.get(Fetcher);
  if (cancelToken) {
    let abort = fetcher.makeAbortController();
    cancelToken.onCancellationRequested(() => {
      telemetry(ctx, "networking.cancelRequest", TelemetryData.createAndMarkAsIssued({
        headerRequestId: requestId
      })), abort.abort();
    }), request.signal = abort.signal;
  }
  return fetcher.fetch(url, request).catch(reason => {
    if (reason.code == "ECONNRESET" || reason.code == "ETIMEDOUT" || reason.code == "ERR_HTTP2_INVALID_SESSION" || reason.message == "ERR_HTTP2_GOAWAY_SESSION") return telemetry(ctx, "networking.disconnectAll"), fetcher.disconnectAll().then(() => fetcher.fetch(url, request));
    throw reason;
  });
},__name(postRequest, "postRequest");