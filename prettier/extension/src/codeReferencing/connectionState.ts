var InitialTimeout = 3e3,
  BaseRetryTime = 2,
  MaxRetryTime = 256,
  MaxAttempts = Math.log(MaxRetryTime) / Math.log(BaseRetryTime) / BaseRetryTime,
  state = {
    connection: "disabled",
    maxAttempts: MaxAttempts,
    retryAttempts: 0,
    initialWait: !1
  },
  stateAPI,
  handlers = [];,function registerConnectionState() {
  if (stateAPI) return stateAPI;
  function subscribe(cb) {
    return handlers.push(cb), () => {
      let index = handlers.indexOf(cb);
      index !== -1 && handlers.splice(index, 1);
    };
  }
  __name(subscribe, "subscribe");
  function afterUpdateConnection() {
    for (let handler of handlers) handler();
  }
  __name(afterUpdateConnection, "afterUpdateConnection");
  function updateConnection(status) {
    state.connection !== status && (state.connection = status, afterUpdateConnection());
  }
  __name(updateConnection, "updateConnection");
  function isConnected() {
    return state.connection === "connected";
  }
  __name(isConnected, "isConnected");
  function isDisconnected() {
    return state.connection === "disconnected";
  }
  __name(isDisconnected, "isDisconnected");
  function isRetrying() {
    return state.connection === "retry";
  }
  __name(isRetrying, "isRetrying");
  function isDisabled() {
    return state.connection === "disabled";
  }
  __name(isDisabled, "isDisabled");
  function setConnected() {
    updateConnection("connected"), setInitialWait(!1);
  }
  __name(setConnected, "setConnected");
  function setDisconnected() {
    updateConnection("disconnected");
  }
  __name(setDisconnected, "setDisconnected");
  function setRetrying() {
    updateConnection("retry");
  }
  __name(setRetrying, "setRetrying");
  function setDisabled() {
    updateConnection("disabled");
  }
  __name(setDisabled, "setDisabled");
  function setInitialWait(enabled) {
    state.initialWait !== enabled && (state.initialWait = enabled);
  }
  __name(setInitialWait, "setInitialWait");
  async function enableRetry(ctx, initialTimeout = InitialTimeout) {
    isRetrying() || (setRetrying(), setInitialWait(!0), attemptToPing(ctx, initialTimeout));
  }
  __name(enableRetry, "enableRetry");
  function isInitialWait() {
    return state.initialWait;
  }
  __name(isInitialWait, "isInitialWait");
  async function attemptToPing(ctx, initialTimeout) {
    codeReferenceLogger.info(ctx, `Attempting to reconnect in ${initialTimeout}ms.`), await timeout(initialTimeout), setInitialWait(!1);
    let fetcher = ctx.get(Fetcher);
    async function succeedOrRetry(time, ctx) {
      if (time > MaxRetryTime) {
        codeReferenceLogger.info(ctx, "Max retry time reached, disabling."), setDisabled();
        return;
      }
      setTimeout(async () => {
        state.retryAttempts = Math.min(state.retryAttempts + 1, MaxAttempts);
        try {
          codeReferenceLogger.info(ctx, `Pinging service after ${time} second(s)`);
          let response = await fetcher.fetch(ProdSnippyDomain + "/_ping", {
            method: "GET",
            headers: {
              "content-type": "application/json"
            }
          });
          if (response.status !== 200 || !response.ok) await succeedOrRetry(time ** 2, ctx);else {
            codeReferenceLogger.info(ctx, "Successfully reconnected."), setConnected();
            return;
          }
        } catch {
          await succeedOrRetry(time ** 2, ctx);
        }
      }, time * 1e3);
    }
    __name(succeedOrRetry, "succeedOrRetry"), codeReferenceLogger.info(ctx, "Attempting to reconnect."), await succeedOrRetry(BaseRetryTime, ctx);
  }
  __name(attemptToPing, "attemptToPing");
  let timeout = __name(ms => new Promise(resolve => setTimeout(resolve, ms)), "timeout");
  function listen(cb) {
    return {
      dispose: subscribe(cb)
    };
  }
  return __name(listen, "listen"), stateAPI = {
    setConnected: setConnected,
    setDisconnected: setDisconnected,
    setRetrying: setRetrying,
    setDisabled: setDisabled,
    enableRetry: enableRetry,
    listen: listen,
    isConnected: isConnected,
    isDisconnected: isDisconnected,
    isRetrying: isRetrying,
    isDisabled: isDisabled,
    isInitialWait: isInitialWait
  }, stateAPI;
},__name(registerConnectionState, "registerConnectionState");,var ConnectionState = registerConnectionState();