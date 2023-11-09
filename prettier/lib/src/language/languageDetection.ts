var path = require("path"),
  Language = class {
    constructor(languageId, isGuess, fileExtension) {
      this.languageId = languageId;
      this.isGuess = isGuess;
      this.fileExtension = fileExtension;
    }
    static {
      __name(this, "Language");
    }
  },
  LanguageDetection = class {
    static {
      __name(this, "LanguageDetection");
    }
  };,function primeLanguageDetectionCache(ctx, doc) {
  ctx.get(LanguageDetection).detectLanguage(doc);
},__name(primeLanguageDetectionCache, "primeLanguageDetectionCache");,function getLanguageDetection(ctx) {
  return new CachingLanguageDetection(new FilenameAndExensionLanguageDetection(), new NotebookLanguageDetection(ctx));
},__name(getLanguageDetection, "getLanguageDetection");,var CachingLanguageDetection = class extends LanguageDetection {
  constructor(delegate, notebookDelegate) {
    super();
    this.delegate = delegate;
    this.notebookDelegate = notebookDelegate;
    this.cache = new LRUCacheMap(100);
  }
  static {
    __name(this, "CachingLanguageDetection");
  }
  async detectLanguage(doc) {
    let filename = path.basename(doc.uri.path);
    return isNotebook(filename) ? this.notebookDelegate.detectLanguage(doc) : this.detectLanguageForRegularFile(filename, doc);
  }
  async detectLanguageForRegularFile(filename, doc) {
    let language = this.cache.get(filename);
    return language || (language = await this.delegate.detectLanguage(doc), language.isGuess || this.cache.set(filename, language)), language;
  }
};,function isNotebook(filename) {
  return filename.endsWith(".ipynb");
},__name(isNotebook, "isNotebook");,var NotebookLanguageDetection = class extends LanguageDetection {
    constructor(ctx) {
      super();
      this.ctx = ctx;
    }
    static {
      __name(this, "NotebookLanguageDetection");
    }
    async detectLanguage(doc) {
      let notebook = this.ctx.get(TextDocumentManager).findNotebook(doc);
      return notebook ? this.detectCellLanguage(doc, notebook) : new Language("python", !1, ".ipynb");
    }
    detectCellLanguage(doc, notebook) {
      let activeCell = notebook.getCells().find(cell => cell.document.uri.toString() === doc.uri.toString());
      if (activeCell) {
        let metadata = activeCell.metadata;
        return metadata?.custom?.metadata?.vscode?.languageId ? new Language(metadata.custom.metadata.vscode.languageId, !1, ".ipynb") : activeCell.kind === 2 ? new Language("python", !1, ".ipynb") : new Language("markdown", !1, ".ipynb");
      }
      return new Language("unknown", !1, ".ipynb");
    }
  },
  FilenameAndExensionLanguageDetection = class extends LanguageDetection {
    constructor() {
      super(...arguments);
      this.languageIdByExtensionTracker = new LanguageIdTracker();
    }
    static {
      __name(this, "FilenameAndExensionLanguageDetection");
    }
    async detectLanguage(doc) {
      let filename = path.basename(doc.uri.path),
        extension = path.extname(filename).toLowerCase(),
        extensionWithoutTemplate = this.extensionWithoutTemplateLanguage(filename, extension),
        languageIdWithGuessing = this.detectLanguageId(filename, extensionWithoutTemplate);
      return new Language(languageIdWithGuessing.languageId, languageIdWithGuessing.isGuess, this.computeFullyQualifiedExtension(extension, extensionWithoutTemplate));
    }
    extensionWithoutTemplateLanguage(filename, extension) {
      if (knownTemplateLanguageExtensions.includes(extension)) {
        let filenameWithoutExtension = filename.substring(0, filename.lastIndexOf(".")),
          extensionWithoutTemplate = path.extname(filenameWithoutExtension).toLowerCase();
        if (extensionWithoutTemplate.length > 0 && knownFileExtensions.includes(extensionWithoutTemplate) && this.isExtensionValidForTemplateLanguage(extension, extensionWithoutTemplate)) return extensionWithoutTemplate;
      }
      return extension;
    }
    isExtensionValidForTemplateLanguage(extension, extensionWithoutTemplate) {
      let limitations = templateLanguageLimitations[extension];
      return !limitations || limitations.includes(extensionWithoutTemplate);
    }
    detectLanguageId(filename, extension) {
      let candidatesByExtension = [];
      for (let language in knownLanguages) {
        let info = knownLanguages[language];
        if (info.filenames && info.filenames.includes(filename)) return {
          languageId: language,
          isGuess: !1
        };
        info.extensions.includes(extension) && candidatesByExtension.push(language);
      }
      return this.determineLanguageIdByCandidates(candidatesByExtension);
    }
    determineLanguageIdByCandidates(candidates) {
      return candidates.length === 1 ? (this.languageIdByExtensionTracker.track(candidates[0]), {
        languageId: candidates[0],
        isGuess: !1
      }) : candidates.length > 1 ? this.determineMostSeenLanguages(candidates) : {
        languageId: "unknown",
        isGuess: !0
      };
    }
    determineMostSeenLanguages(candidates) {
      let mostSeenLanguageId = this.languageIdByExtensionTracker.mostRecentLanguageId(candidates);
      return mostSeenLanguageId ? {
        languageId: mostSeenLanguageId,
        isGuess: !0
      } : {
        languageId: candidates[0],
        isGuess: !0
      };
    }
    computeFullyQualifiedExtension(extension, extensionWithoutTemplate) {
      return extension !== extensionWithoutTemplate ? extensionWithoutTemplate + extension : extension;
    }
  },
  LanguageIdTracker = class {
    constructor() {
      this.seenLanguages = new LRUCacheMap(25);
    }
    static {
      __name(this, "LanguageIdTracker");
    }
    track(languageId) {
      this.seenLanguages.set(languageId, this.preciseTimestamp());
    }
    preciseTimestamp() {
      return process.hrtime.bigint();
    }
    mostRecentLanguageId(candidates) {
      let mostRecentIds = candidates.map(languageId => ({
        id: languageId,
        seen: this.seenLanguages.get(languageId)
      })).filter(candidate => candidate.seen).sort((a, b) => Number(b.seen) - Number(a.seen)).map(candidate => candidate.id);
      if (mostRecentIds.length > 0) return mostRecentIds[0];
    }
  };