var import_copilot_promptlib = Ns(Dc()),
  import_vscode = require("vscode");,var ExtensionFileSystem = class extends H0e.FileSystem {
    static {
      __name(this, "ExtensionFileSystem");
    }
    async readFile(uri) {
      return await E3.workspace.fs.readFile(E3.Uri.file(uri));
    }
    async stat(uri) {
      return await E3.workspace.fs.stat(E3.Uri.file(uri));
    }
  },
  extensionFileSystem = new ExtensionFileSystem();