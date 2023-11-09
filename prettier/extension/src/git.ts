var import_vscode = require("vscode");,var ExtensionCommitFileResolver = class extends CommitFileResolver {
  static {
    __name(this, "ExtensionCommitFileResolver");
  }
  async getCoCommitResult(targetURI, maxFiles) {
    if (targetURI.scheme !== "file") return [];
    let targetPath = targetURI.fsPath,
      gitExtension = ele.extensions.getExtension("vscode.git");
    if (gitExtension === void 0) return [];
    let api = gitExtension.exports.getAPI(1);
    if (api === void 0) return [];
    if (api.repositories.length === 0) return [];
    let repos = api.repositories,
      touchedFiles = [],
      visited = new Set(),
      deleteStatus = new Set([6, 12, 13, 2, 15]);
    visited.add(targetPath);
    let logOption = {
      path: targetPath
    };
    for (let repo of repos) {
      let relative = eT.relative(repo.rootUri.fsPath, targetPath);
      if (!(relative && !relative.startsWith("..") && !eT.isAbsolute(relative))) continue;
      let logResults = await repo.log(logOption);
      for (let logResult of logResults) {
        let parents = logResult.parents;
        for (let parent of parents) {
          let changes = await repo.diffBetween(parent, logResult.hash);
          for (let change of changes) if (!(deleteStatus.has(change.status) || visited.has(change.uri.fsPath)) && (visited.add(change.uri.fsPath), touchedFiles.push(change.uri), touchedFiles.length >= maxFiles)) return touchedFiles;
        }
      }
    }
    return touchedFiles;
  }
};