var knownLanguages = {
  abap: {
    extensions: [".abap"]
  },
  bat: {
    extensions: [".bat", ".cmd"]
  },
  bibtex: {
    extensions: [".bib", ".bibtex"]
  },
  blade: {
    extensions: [".blade", ".blade.php"]
  },
  c: {
    extensions: [".c", ".cats", ".h", ".idc"]
  },
  csharp: {
    extensions: [".cake", ".cs", ".csx", ".linq"]
  },
  cpp: {
    extensions: [".c++", ".cc", ".cp", ".cpp", ".cxx", ".h", ".h++", ".hh", ".hpp", ".hxx", ".inc", ".inl", ".ino", ".ipp", ".ixx", ".re", ".tcc", ".tpp", ".i"]
  },
  css: {
    extensions: [".css", ".wxss"]
  },
  clojure: {
    extensions: [".bb", ".boot", ".cl2", ".clj", ".cljc", ".cljs", ".cljs.hl", ".cljscm", ".cljx", ".edn", ".hic"],
    filenames: ["riemann.config"]
  },
  ql: {
    extensions: [".ql", ".qll"]
  },
  coffeescript: {
    extensions: ["._coffee", ".cake", ".cjsx", ".coffee", ".iced"],
    filenames: ["Cakefile"]
  },
  dart: {
    extensions: [".dart"]
  },
  dockerfile: {
    extensions: [".dockerfile"],
    filenames: ["Containerfile", "Dockerfile"]
  },
  html: {
    extensions: [".ect", ".ejs", ".ejs.t", ".jst", ".hta", ".htm", ".html", ".html.hl", ".html5", ".inc", ".jsp", ".tpl", ".twig", ".wxml", ".xht", ".xhtml", ".phtml", ".liquid"]
  },
  elixir: {
    extensions: [".ex", ".exs"],
    filenames: ["mix.lock"]
  },
  erlang: {
    extensions: [".app.src", ".erl", ".es", ".escript", ".hrl", ".xrl", ".yrl"],
    filenames: ["Emakefile", "rebar.config", "rebar.config.lock", "rebar.lock"]
  },
  fsharp: {
    extensions: [".fs", ".fsi", ".fsx"]
  },
  go: {
    extensions: [".go"]
  },
  groovy: {
    extensions: [".gradle", ".groovy", ".grt", ".gtpl", ".gvy", ".jenkinsfile"],
    filenames: ["Jenkinsfile", "Jenkinsfile"]
  },
  terraform: {
    extensions: [".hcl", ".nomad", ".tf", ".tfvars", ".workflow"]
  },
  erb: {
    extensions: [".erb", ".erb.deface", ".rhtml"]
  },
  razor: {
    extensions: [".cshtml", ".razor"]
  },
  haml: {
    extensions: [".haml", ".haml.deface"]
  },
  handlebars: {
    extensions: [".handlebars", ".hbs"]
  },
  haskell: {
    extensions: [".hs", ".hs-boot", ".hsc"]
  },
  ini: {
    extensions: [".cfg", ".dof", ".ini", ".lektorproject", ".prefs", ".pro", ".properties", ".url"],
    filenames: [".coveragerc", ".flake8", ".pylintrc", "buildozer.spec", "pylintrc"]
  },
  jsonc: {
    extensions: [".code-snippets", ".code-workspace", ".jsonc", ".sublime-build", ".sublime-commands", ".sublime-completions", ".sublime-keymap", ".sublime-macro", ".sublime-menu", ".sublime-mousemap", ".sublime-project", ".sublime-settings", ".sublime-theme", ".sublime-workspace", ".sublime_metrics", ".sublime_session"],
    filenames: [".babelrc", ".devcontainer.json", ".eslintrc.json", ".jscsrc", ".jshintrc", ".jslintrc", "api-extractor.json", "devcontainer.json", "jsconfig.json", "language-configuration.json", "launch.json", "settings.json", "tsconfig.json", "tslint.json"]
  },
  java: {
    extensions: [".jav", ".java", ".jsh"]
  },
  javascript: {
    extensions: ["._js", ".bones", ".cjs", ".es", ".es6", ".frag", ".gs", ".jake", ".javascript", ".js", ".jsb", ".jscad", ".jsfl", ".jslib", ".jsm", ".jspre", ".jss", ".mjs", ".njs", ".pac", ".sjs", ".ssjs", ".xsjs", ".xsjslib"],
    filenames: ["Jakefile"]
  },
  julia: {
    extensions: [".jl"]
  },
  python: {
    extensions: [".ipynb", ".cgi", ".codon", ".fcgi", ".gyp", ".gypi", ".lmi", ".py", ".py3", ".pyde", ".pyi", ".pyp", ".pyt", ".pyw", ".rpy", ".smk", ".spec", ".tac", ".wsgi", ".xpy"],
    filenames: ["Notebook", ".gclient", "DEPS", "SConscript", "SConstruct", "Snakefile", "wscript"]
  },
  kotlin: {
    extensions: [".kt", ".ktm", ".kts"]
  },
  less: {
    extensions: [".less"]
  },
  lua: {
    extensions: [".fcgi", ".lua", ".luau", ".nse", ".p8", ".pd_lua", ".rbxs", ".rockspec", ".wlua"],
    filenames: [".luacheckrc"]
  },
  makefile: {
    extensions: [".d", ".mak", ".make", ".makefile", ".mk", ".mkfile"],
    filenames: ["BSDmakefile", "GNUmakefile", "Kbuild", "Makefile", "Makefile.am", "Makefile.boot", "Makefile.frag", "Makefile.in", "Makefile.inc", "Makefile.wat", "makefile", "makefile.sco", "mkfile"]
  },
  markdown: {
    extensions: [".livemd", ".markdown", ".md", ".mdown", ".mdwn", ".mdx", ".mkd", ".mkdn", ".mkdown", ".ronn", ".scd", ".workbook"],
    filenames: ["contents.lr"]
  },
  "objective-c": {
    extensions: [".h", ".m"]
  },
  "objective-cpp": {
    extensions: [".mm"]
  },
  php: {
    extensions: [".aw", ".ctp", ".fcgi", ".inc", ".php", ".php3", ".php4", ".php5", ".phps", ".phpt"],
    filenames: [".php", ".php_cs", ".php_cs.dist", "Phakefile"]
  },
  perl: {
    extensions: [".al", ".cgi", ".fcgi", ".perl", ".ph", ".pl", ".plx", ".pm", ".psgi", ".t"],
    filenames: [".latexmkrc", "Makefile.PL", "Rexfile", "ack", "cpanfile", "latexmkrc"]
  },
  powershell: {
    extensions: [".ps1", ".psd1", ".psm1"]
  },
  pug: {
    extensions: [".jade", ".pug"]
  },
  r: {
    extensions: [".r", ".rd", ".rsx"],
    filenames: [".Rprofile", "expr-dist"]
  },
  ruby: {
    extensions: [".builder", ".eye", ".fcgi", ".gemspec", ".god", ".jbuilder", ".mspec", ".pluginspec", ".podspec", ".prawn", ".rabl", ".rake", ".rb", ".rbi", ".rbuild", ".rbw", ".rbx", ".ru", ".ruby", ".spec", ".thor", ".watchr"],
    filenames: [".irbrc", ".pryrc", ".simplecov", "Appraisals", "Berksfile", "Brewfile", "Buildfile", "Capfile", "Dangerfile", "Deliverfile", "Fastfile", "Gemfile", "Guardfile", "Jarfile", "Mavenfile", "Podfile", "Puppetfile", "Rakefile", "Snapfile", "Steepfile", "Thorfile", "Vagrantfile", "buildfile"]
  },
  rust: {
    extensions: [".rs", ".rs.in"]
  },
  scss: {
    extensions: [".scss"]
  },
  sql: {
    extensions: [".cql", ".ddl", ".inc", ".mysql", ".prc", ".sql", ".tab", ".udf", ".viw"]
  },
  sass: {
    extensions: [".sass"]
  },
  scala: {
    extensions: [".kojo", ".sbt", ".sc", ".scala"]
  },
  shellscript: {
    extensions: [".bash", ".bats", ".cgi", ".command", ".fcgi", ".ksh", ".sh", ".sh.in", ".tmux", ".tool", ".zsh", ".zsh-theme"],
    filenames: [".bash_aliases", ".bash_functions", ".bash_history", ".bash_logout", ".bash_profile", ".bashrc", ".cshrc", ".flaskenv", ".kshrc", ".login", ".profile", ".zlogin", ".zlogout", ".zprofile", ".zshenv", ".zshrc", "9fs", "PKGBUILD", "bash_aliases", "bash_logout", "bash_profile", "bashrc", "cshrc", "gradlew", "kshrc", "login", "man", "profile", "zlogin", "zlogout", "zprofile", "zshenv", "zshrc"]
  },
  slim: {
    extensions: [".slim"]
  },
  solidity: {
    extensions: [".sol"]
  },
  stylus: {
    extensions: [".styl"]
  },
  svelte: {
    extensions: [".svelte"]
  },
  swift: {
    extensions: [".swift"]
  },
  typescriptreact: {
    extensions: [".tsx"]
  },
  latex: {
    extensions: [".aux", ".bbx", ".cbx", ".cls", ".dtx", ".ins", ".lbx", ".ltx", ".mkii", ".mkiv", ".mkvi", ".sty", ".tex", ".toc"]
  },
  typescript: {
    extensions: [".cts", ".mts", ".ts"]
  },
  verilog: {
    extensions: [".v", ".veo"]
  },
  vb: {
    extensions: [".vb", ".vbhtml", ".Dsr", ".bas", ".cls", ".ctl", ".frm"]
  },
  vue: {
    extensions: [".nvue", ".vue"]
  },
  xml: {
    extensions: [".adml", ".admx", ".ant", ".axaml", ".axml", ".builds", ".ccproj", ".ccxml", ".clixml", ".cproject", ".cscfg", ".csdef", ".csl", ".csproj", ".ct", ".depproj", ".dita", ".ditamap", ".ditaval", ".dll.config", ".dotsettings", ".filters", ".fsproj", ".fxml", ".glade", ".gml", ".gmx", ".grxml", ".gst", ".hzp", ".iml", ".ivy", ".jelly", ".jsproj", ".kml", ".launch", ".mdpolicy", ".mjml", ".mm", ".mod", ".mxml", ".natvis", ".ncl", ".ndproj", ".nproj", ".nuspec", ".odd", ".osm", ".pkgproj", ".plist", ".pluginspec", ".proj", ".props", ".ps1xml", ".psc1", ".pt", ".qhelp", ".rdf", ".res", ".resx", ".rss", ".sch", ".scxml", ".sfproj", ".shproj", ".srdf", ".storyboard", ".sublime-snippet", ".svg", ".targets", ".tml", ".ui", ".urdf", ".ux", ".vbproj", ".vcxproj", ".vsixmanifest", ".vssettings", ".vstemplate", ".vxml", ".wixproj", ".workflow", ".wsdl", ".wsf", ".wxi", ".wxl", ".wxs", ".x3d", ".xacro", ".xaml", ".xib", ".xlf", ".xliff", ".xmi", ".xml", ".xml.dist", ".xmp", ".xproj", ".xsd", ".xspec", ".xul", ".zcml"],
    filenames: [".classpath", ".cproject", ".project", "App.config", "NuGet.config", "Settings.StyleCop", "Web.Debug.config", "Web.Release.config", "Web.config", "packages.config"]
  },
  xsl: {
    extensions: [".xsl", ".xslt"]
  },
  yaml: {
    extensions: [".mir", ".reek", ".rviz", ".sublime-syntax", ".syntax", ".yaml", ".yaml-tmlanguage", ".yaml.sed", ".yml", ".yml.mysql"],
    filenames: [".clang-format", ".clang-tidy", ".gemrc", "CITATION.cff", "glide.lock", "yarn.lock"]
  },
  javascriptreact: {
    extensions: [".jsx"]
  }
};,var WorkspaceFiles = class _WorkspaceFiles {
  constructor(docManager, workspaceFileSystem) {
    this.docManager = docManager;
    this.workspaceFileSystem = workspaceFileSystem;
    this.workspaceFilesCache = this.computeInBackgroundAndMemoize(_WorkspaceFiles.getWorkspaceFiles, 1);
  }
  static {
    __name(this, "WorkspaceFiles");
  }
  static {
    this.EXCLUDED_NEIGHBORS = ["node_modules", "dist", "site-packages"];
  }
  async tryGetTextDocument(uri) {
    try {
      return await this.docManager.getTextDocument(m8.URI.parse(uri));
    } catch {
      return;
    }
  }
  filePathDistance(filePath, targetFilePath) {
    let distance = Mc.relative(filePath, targetFilePath).split(Mc.sep).length;
    return {
      dist: distance,
      lca: (filePath.split(Mc.sep).length + targetFilePath.split(Mc.sep).length - distance) / 2
    };
  }
  static async getWorkspaceFiles(ns, filePath, neighboringFileType, languageId, maxNumWorkspaceFiles, blacklist) {
    if (ns.workspaceFileSystem === void 0 || ns.workspaceFilesCache === void 0) return [];
    let workspaceUri = await ns.workspaceFileSystem.getWorkspaceFolder(m8.URI.file(filePath));
    if (workspaceUri === void 0) return [];
    let include = `**/*.{${knownLanguages[languageId].extensions.map(ext => ext.replace(/^\.+/g, "")).join(",")}}`;
    if (neighboringFileType === "workspacesmallestpathdist") {
      let currentFileRepository = (await ns.workspaceFileSystem.findFiles("**/.git/config")).map(f => Mc.dirname(Mc.dirname(f.fsPath))).sort((a, b) => b.split(Mc.sep).length - a.split(Mc.sep).length).find(repo => filePath.startsWith(repo));
      currentFileRepository !== void 0 && currentFileRepository !== "" && (include = `${currentFileRepository}/${include}`);
    } else {
      let fileRelativePath = Mc.relative(workspaceUri.fsPath, Mc.dirname(filePath));
      fileRelativePath !== "" && (include = `${fileRelativePath}/${include}`);
    }
    let visitedFiles = new Set(blacklist.map(f => m8.URI.parse(f.uri).fsPath));
    visitedFiles.add(filePath);
    let exclude = `**/{${_WorkspaceFiles.EXCLUDED_NEIGHBORS.join(",")},.*}/**`,
      workspaceFiles = (await ns.workspaceFileSystem.findFiles(include, exclude)).filter(f => !visitedFiles.has(f.fsPath)).sort((a, b) => {
        let aDist = ns.filePathDistance(a.fsPath, filePath),
          bDist = ns.filePathDistance(b.fsPath, filePath);
        return aDist.dist !== bDist.dist ? aDist.dist - bDist.dist : bDist.lca - aDist.lca;
      }),
      files = [],
      totalLen = 0;
    for (let workspaceFile of workspaceFiles) {
      let doc = await ns.tryGetTextDocument(workspaceFile.toString());
      if (!(doc === void 0 || totalLen + doc.getText().length > NeighborSource.MAX_NEIGHBOR_AGGREGATE_LENGTH) && doc.uri.scheme == "file" && considerNeighborFile(languageId, doc.languageId) && (files.push({
        uri: doc.uri.toString(),
        relativePath: await ns.docManager.getRelativePath(doc),
        languageId: doc.languageId,
        source: doc.getText()
      }), totalLen += doc.getText().length, files.length >= maxNumWorkspaceFiles)) break;
    }
    return files;
  }
  async truncateDocs(docs, fileURI, languageId, maxNumNeighborFiles) {
    let openFiles = [],
      totalLen = 0;
    for (let doc of docs) if (!(totalLen + doc.getText().length > NeighborSource.MAX_NEIGHBOR_AGGREGATE_LENGTH) && (doc.uri.scheme === "file" && fileURI.scheme === "file" && doc.uri.fsPath !== fileURI.fsPath && considerNeighborFile(languageId, doc.languageId) && (openFiles.push({
      uri: doc.uri.toString(),
      relativePath: await this.docManager.getRelativePath(doc),
      languageId: doc.languageId,
      source: doc.getText()
    }), totalLen += doc.getText().length), openFiles.length >= maxNumNeighborFiles)) break;
    return openFiles;
  }
  computeInBackgroundAndMemoize(fct, cacheSize) {
    let resultsCache = new LRUCacheMap(cacheSize),
      inComputation = new Set();
    return (filePath, type, ...args) => {
      let key = filePath + type,
        memorizedComputation = resultsCache.get(key);
      if (memorizedComputation) return memorizedComputation;
      if (inComputation.has(key)) return null;
      let computation = fct(this, filePath, type, ...args);
      return inComputation.add(key), computation.then(computedResult => {
        resultsCache.set(key, computedResult), inComputation.delete(key);
      }), null;
    };
  }
  async getNeighborFiles(uri, neighboringFileType, languageId, maxNumNeighborFiles) {
    let neighborFiles = [],
      neighborSource = new Map();
    if (neighborFiles = await this.truncateDocs(sortByAccessTimes((await this.docManager.textDocuments()).filter(doc => accessTimes.get(doc.uri.toString()) !== void 0)), uri, languageId, maxNumNeighborFiles), neighborSource.set("opentabs", neighborFiles.map(f => f.uri)), neighborFiles.length < maxNumNeighborFiles) {
      let workspaceFiles = this.workspaceFilesCache(uri.fsPath, neighboringFileType, languageId, maxNumNeighborFiles, neighborFiles);
      if (workspaceFiles !== null) {
        let neighborFileUriSet = new Set(neighborFiles.map(f => f.uri));
        workspaceFiles = workspaceFiles.filter(f => !neighborFileUriSet.has(f.uri)).slice(0, maxNumNeighborFiles - neighborFiles.length), neighborFiles.push(...workspaceFiles), neighborSource.set(neighboringFileType, workspaceFiles.map(f => f.uri));
      }
    }
    return {
      docs: neighborFiles,
      neighborSource: neighborSource
    };
  }
};