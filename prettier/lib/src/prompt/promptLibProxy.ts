var promptlib = Ns(Dc());,var worker = null,
  handlers = new Map(),
  nextHandlerId = 0;,function init(ctx, use_worker_threads, logger) {
  if (!use_worker_threads) {
    let localPromptlib = (uL(), nT(Pre));
    for (let fn of allFuns) updatePromptLibProxyFunction(fn, localPromptlib[fn]);
    return;
  }
  for (let fn of workerFuns) updatePromptLibProxyFunction(fn, proxy(ctx, logger, fn));
  promptLibProxy.getPrompt = getPromptProxy(ctx, logger), worker = X0.createWorker(), handlers.clear(), nextHandlerId = 0, worker.on("message", ({
    id: id,
    err: err,
    code: code,
    res: res
  }) => {
    let handler = handlers.get(id);
    logger.debug(ctx, `Response ${id} - ${res}, ${err}`), handler && (handlers.delete(id), err ? (err.code = code, handler.reject(err)) : handler.resolve(res));
  });
  function handleError(maybeError) {
    let err;
    if (maybeError instanceof Error) {
      err = maybeError, err.code === "MODULE_NOT_FOUND" && err.message?.endsWith("worker.js'") && (err = new Error("Failed to load worker.js"), err.code = "CopilotPromptLoadFailure");
      let ourStack = new Error().stack;
      err.stack && ourStack?.match(/^Error\n/) && (err.stack += ourStack.replace(/^Error/, ""));
    } else maybeError?.name === "ExitStatus" && typeof maybeError.status == "number" ? (err = new Error(`worker.js exited with status ${maybeError.status}`), err.code = `CopilotPromptWorkerExit${maybeError.status}`) : err = new Error(`Non-error thrown: ${maybeError}`);
    for (let handler of handlers.values()) handler.reject(err);
    handlers.clear();
  }
  __name(handleError, "handleError"), worker.on("error", handleError);
},__name(init, "init");,function terminate() {
  worker && (worker.removeAllListeners(), worker.terminate(), worker = null, handlers.clear());
},__name(terminate, "terminate");,var workerFuns = ["getFunctionPositions", "isEmptyBlockStart", "isBlockBodyFinished", "getNodeStart", "getCallSites", "parsesWithoutError"],
  directFuns = ["isSupportedLanguageId", "getBlockCloseToken", "getPrompt"],
  allFuns = [...workerFuns, ...directFuns];,function proxy(ctx, logger, fn) {
  return function (...args) {
    let id = nextHandlerId++;
    return new Promise((resolve, reject) => {
      handlers.set(id, {
        resolve: resolve,
        reject: reject
      }), logger.debug(ctx, `Proxy ${fn}`), worker?.postMessage({
        id: id,
        fn: fn,
        args: args
      });
    });
  };
},__name(proxy, "proxy");,function getPromptProxy(ctx, logger) {
  return function (_fileSystem, ...args) {
    let id = nextHandlerId++;
    return new Promise((resolve, reject) => {
      handlers.set(id, {
        resolve: resolve,
        reject: reject
      }), logger.debug(ctx, `Proxy getPrompt - ${id}`), worker?.postMessage({
        id: id,
        fn: "getPrompt",
        args: args
      });
    });
  };
},__name(getPromptProxy, "getPromptProxy");,function updatePromptLibProxyFunction(fn, impl) {
  promptLibProxy[fn] = impl;
},__name(updatePromptLibProxyFunction, "updatePromptLibProxyFunction");,var promptLibProxy = {
  isEmptyBlockStart: X0.isEmptyBlockStart,
  isBlockBodyFinished: X0.isBlockBodyFinished,
  isSupportedLanguageId: X0.isSupportedLanguageId,
  getBlockCloseToken: X0.getBlockCloseToken,
  getFunctionPositions: X0.getFunctionPositions,
  getNodeStart: X0.getNodeStart,
  getPrompt: X0.getPrompt,
  getCallSites: X0.getCallSites,
  parsesWithoutError: X0.parsesWithoutError
};