function considerNeighborFile(languageId, neighborLanguageId) {
  return languageId === neighborLanguageId;
},__name(considerNeighborFile, "considerNeighborFile");,var NeighborSource = class _NeighborSource {
  static {
    __name(this, "NeighborSource");
  }
  static {
    this.MAX_NEIGHBOR_AGGREGATE_LENGTH = 2e5;
  }
  static {
    this.MAX_NEIGHBOR_FILES = 20;
  }
  static {
    this.EXCLUDED_NEIGHBORS = ["node_modules", "dist", "site-packages"];
  }
  static reset() {
    _NeighborSource.instance = void 0;
  }
  static async getNeighborFiles(ctx, uri, featuresFilterArgs) {
    let neighboringFileType = await ctx.get(Features).neighboringFileType(featuresFilterArgs);
    if (neighboringFileType === "none") return {
      docs: [],
      neighborSource: new Map()
    };
    if (_NeighborSource.instance === void 0) {
      let docManager = ctx.get(TextDocumentManager);
      if (neighboringFileType === "workspacesharingsamefolder" || neighboringFileType === "workspacesmallestpathdist") {
        let workspaceFileSystem = ctx.get(WorkspaceFileSystem);
        _NeighborSource.instance = new WorkspaceFiles(docManager, workspaceFileSystem);
      } else if (neighboringFileType == "opentabsandcocommitted") {
        let commitFileResolver = ctx.get(CommitFileResolver);
        _NeighborSource.instance = new CoCommittedFiles(docManager, commitFileResolver);
      } else neighboringFileType === "cursormostcount" || neighboringFileType === "cursormostrecent" ? _NeighborSource.instance = new CursorHistoryFiles(docManager) : _NeighborSource.instance = new OpenTabFiles(docManager);
    }
    return await _NeighborSource.instance.getNeighborFiles(uri, neighboringFileType, featuresFilterArgs.fileType, _NeighborSource.MAX_NEIGHBOR_FILES);
  }
};