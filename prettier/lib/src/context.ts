var Context = class {
  constructor(baseContext) {
    this.baseContext = baseContext;
    this.constructionStack = [];
    this.instances = new Map();
    let stack = new Error().stack?.split(`
`);
    stack && this.constructionStack.push(...stack.slice(1));
  }
  static {
    __name(this, "Context");
  }
  get(ctor) {
    let value = this.tryGet(ctor);
    if (value) return value;
    throw new Error(`No instance of ${ctor.name} has been registered.`);
  }
  tryGet(ctor) {
    let value = this.instances.get(ctor);
    if (value) return value;
    if (this.baseContext) return this.baseContext.tryGet(ctor);
  }
  set(ctor, instance) {
    if (this.tryGet(ctor)) throw new Error(`An instance of ${ctor.name} has already been registered. Use forceSet() if you're sure it's a good idea.`);
    this.assertIsInstance(ctor, instance), this.instances.set(ctor, instance);
  }
  forceSet(ctor, instance) {
    this.assertIsInstance(ctor, instance), this.instances.set(ctor, instance);
  }
  assertIsInstance(ctor, instance) {
    if (!(instance instanceof ctor)) {
      let inst = JSON.stringify(instance);
      throw new Error(`The instance you're trying to register for ${ctor.name} is not an instance of it (${inst}).`);
    }
  }
  toString() {
    let lines = `    Context created at:
`;
    for (let stackEntry of this.constructionStack || []) lines += `    ${stackEntry}
`;
    return lines += this.baseContext?.toString() ?? "", lines;
  }
};