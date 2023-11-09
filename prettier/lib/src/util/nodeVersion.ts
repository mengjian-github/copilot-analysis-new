function errorMessageForUnsupportedNodeVersion(version = process.versions.node) {
  let [major, minor, _] = version.split(".").map(v => parseInt(v, 10));
  if (major < 16 || major === 16 && minor < 14 || major == 17 && minor < 3) return `Node.js 18.x is required to run GitHub Copilot but found ${version}`;
},__name(errorMessageForUnsupportedNodeVersion, "errorMessageForUnsupportedNodeVersion");