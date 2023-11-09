var Debouncer = class {
  static {
    __name(this, "Debouncer");
  }
  async debounce(ms) {
    return this.state && (clearTimeout(this.state.timer), this.state.reject(), this.state = void 0), new Promise((resolve, reject) => {
      this.state = {
        timer: setTimeout(() => resolve(), ms),
        reject: reject
      };
    });
  }
};,function debounce(ms, callback) {
  let timer;
  return (...args) => (timer && clearTimeout(timer), new Promise(resolve => {
    timer = setTimeout(() => {
      let returnValue = callback(...args);
      resolve(returnValue);
    }, ms);
  }));
},__name(debounce, "debounce");