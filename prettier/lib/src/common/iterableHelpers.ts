async function* asyncIterableMap(source, selector) {
  for await (let item of source) yield selector(item);
},__name(asyncIterableMap, "asyncIterableMap");,async function* asyncIterableFilter(source, predicate) {
  for await (let item of source) (await predicate(item)) && (yield item);
},__name(asyncIterableFilter, "asyncIterableFilter");,async function* asyncIterableMapFilter(source, selector) {
  for await (let item of source) {
    let result = await selector(item);
    result !== void 0 && (yield result);
  }
},__name(asyncIterableMapFilter, "asyncIterableMapFilter");,async function* asyncIterableFromArray(source) {
  for (let item of source) yield item;
},__name(asyncIterableFromArray, "asyncIterableFromArray");