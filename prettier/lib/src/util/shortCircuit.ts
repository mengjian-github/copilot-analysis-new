function shortCircuit(fn, shortCircuitMs, shortCircuitReturn) {
  return async function (...args) {
    return await Promise.race([fn.apply(this, args), new Promise(resolve => {
      setTimeout(resolve, shortCircuitMs, shortCircuitReturn);
    })]);
  };
},__name(shortCircuit, "shortCircuit");