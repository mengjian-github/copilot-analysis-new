var ErrorReasons = {
    BadArguments: "BadArgumentsError",
    Unauthorized: "NotAuthorized",
    NotFound: "NotFoundError",
    RateLimit: "RateLimitError",
    InternalError: "InternalError",
    ConnectionError: "ConnectionError",
    Unknown: "UnknownError"
  },
  ErrorMessages = {
    [ErrorReasons.Unauthorized]: "Invalid GitHub token. Please sign out from your GitHub account using VSCode UI and try again",
    [ErrorReasons.InternalError]: "Internal error: matches to public code will not be detected. It is advised to disable Copilot completions until the service is reconnected.",
    [ErrorReasons.RateLimit]: "You've reached your quota and limit, code matching will be unavailable until the limit resets"
  };,function getErrorType(code) {
  return code === 401 ? ErrorReasons.Unauthorized : code === 400 ? ErrorReasons.BadArguments : code === 404 ? ErrorReasons.NotFound : code === 429 ? ErrorReasons.RateLimit : code >= 500 && code < 600 ? ErrorReasons.InternalError : code >= 600 ? ErrorReasons.ConnectionError : ErrorReasons.Unknown;
},__name(getErrorType, "getErrorType");,function createErrorResponse(code, msg, meta = {}) {
  return {
    kind: "failure",
    reason: getErrorType(Number(code)),
    code: Number(code),
    msg: msg,
    meta: meta
  };
},__name(createErrorResponse, "createErrorResponse");