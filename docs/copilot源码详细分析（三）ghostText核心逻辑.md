# copilot源码详细分析（三）ghostText核心逻辑

## 代码补全的主入口

代码补全逻辑入口在`calculateInlineCompletions` 这个函数中：

```jsx
async function calculateInlineCompletions(ctx, vscodeDocument, position, context, token) {
  let document = new ExtensionTextDocument(vscodeDocument),
    textEditorOptions = getTextEditorOptions(vscodeDocument),
    telemetryData = TelemetryData.createAndMarkAsIssued();
  if (!ghostTextEnabled(ctx)) return {
    type: "abortedBeforeIssued",
    reason: "ghost text is disabled"
  };
  if (ignoreDocument(ctx, document)) return {
    type: "abortedBeforeIssued",
    reason: "document is ignored"
  };
  if (isDocumentTooLarge(document)) return {
    type: "abortedBeforeIssued",
    reason: "document is too large"
  };
  if (ghostTextLogger.debug(ctx, `Ghost text called at [${position.line}, ${position.character}], with triggerKind ${context.triggerKind}`), token.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled before extractPrompt"), {
    type: "abortedBeforeIssued",
    reason: "cancelled before extractPrompt"
  };
  let result = await getGhostText(ctx, document, position, context.triggerKind === Ol.InlineCompletionTriggerKind.Invoke, telemetryData, token);
  if (result.type !== "success") return ghostTextLogger.debug(ctx, "Breaking, no results from getGhostText -- " + result.type + ": " + result.reason), result;
  let [resultArray, resultType] = result.value;
  if (lastPosition && lastUri && !(lastPosition.isEqual(position) && lastUri.toString() === document.uri.toString()) && resultType !== 2) {
    let rejectedCompletions = computeRejectedCompletions();
    rejectedCompletions.length > 0 && postRejectionTasks(ctx, "ghostText", document.offsetAt(lastPosition), lastUri, rejectedCompletions), lastPartiallyAcceptedLength = void 0;
  }
  if (lastPosition = position, lastUri = document.uri, lastShownCompletions = [], token.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after getGhostText"), {
    type: "canceled",
    reason: "after getGhostText",
    telemetryData: {
      telemetryBlob: result.telemetryBlob
    }
  };
  let inlineCompletions = completionsFromGhostTextResults(ctx, resultArray, resultType, document, position, textEditorOptions, lastShownCompletionIndex).map(completion => {
    let {
        text: text,
        range: range
      } = completion,
      newRange = new Ol.Range(new Ol.Position(range.start.line, range.start.character), new Ol.Position(range.end.line, range.end.character)),
      completionItem = new Ol.InlineCompletionItem(text, newRange);
    return completionItem.index = completion.index, completionItem.telemetry = completion.telemetry, completionItem.displayText = completion.displayText, completionItem.resultType = completion.resultType, completionItem.id = completion.uuid, completionItem.uri = document.uri, completionItem.insertPosition = new Ol.Position(completion.position.line, completion.position.character), completionItem.insertOffset = document.offsetAt(completionItem.insertPosition), completionItem.command = {
      title: "PostInsertTask",
      command: postInsertCmdName,
      arguments: [completionItem]
    }, completionItem;
  });
  return inlineCompletions.length === 0 ? {
    type: "empty",
    reason: "no completions in final result",
    telemetryData: result.telemetryData
  } : {
    ...result,
    value: inlineCompletions
  };
}
```

我们逐行分析一下，首先获得了一个Document的包装实例document，然后拿到了当前editor text的options，初始化了telemetry：

```jsx
let document = new ExtensionTextDocument(vscodeDocument),
    textEditorOptions = getTextEditorOptions(vscodeDocument),
    telemetryData = TelemetryData.createAndMarkAsIssued();
```

接着是四种需要终止代码补全的情况：

```jsx
if (!ghostTextEnabled(ctx)) return {
    type: "abortedBeforeIssued",
    reason: "ghost text is disabled"
  };
  if (ignoreDocument(ctx, document)) return {
    type: "abortedBeforeIssued",
    reason: "document is ignored"
  };
  if (isDocumentTooLarge(document)) return {
    type: "abortedBeforeIssued",
    reason: "document is too large"
  };
  if (ghostTextLogger.debug(ctx, `Ghost text called at [${position.line}, ${position.character}], with triggerKind ${context.triggerKind}`), token.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled before extractPrompt"), {
    type: "abortedBeforeIssued",
    reason: "cancelled before extractPrompt"
  };
```

- `ghostTextEnabled` ，这个是在copilot配置里，如果关闭了代码补全。
- `ignoreDocument` ，不在白名单内的Document，这里取的是enable那个配置，我们在之前分析过默认值：
    - `plaintext` ，默认是ignore的。
    - `markdown` ，默认是ignore的。
    - `scminput` ，默认是ignore的。
    - 除此之外，还有三种scheme被过滤的：`CopilotPanelScheme, "output", "search-editor”`
- `isDocumentTooLarge` ，这个主要是通过document.getText()是否会报错`RangeError` 来判定文件是否过大了。
- `isCancellationRequested` ，这个是输入的时候发起的取消请求。

接下来就是通过`getGhostText`拿到结果：

```jsx
let result = await getGhostText(ctx, document, position, context.triggerKind === Ol.InlineCompletionTriggerKind.Invoke, telemetryData, token);
if (result.type !== "success") return ghostTextLogger.debug(ctx, "Breaking, no results from getGhostText -- " + result.type + ": " + result.reason), result;
let [resultArray, resultType] = result.value;
if (lastPosition && lastUri && !(lastPosition.isEqual(position) && lastUri.toString() === document.uri.toString()) && resultType !== 2) {
  let rejectedCompletions = computeRejectedCompletions();
  rejectedCompletions.length > 0 && postRejectionTasks(ctx, "ghostText", document.offsetAt(lastPosition), lastUri, rejectedCompletions), lastPartiallyAcceptedLength = void 0;
}
if (lastPosition = position, lastUri = document.uri, lastShownCompletions = [], token.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after getGhostText"), {
  type: "canceled",
  reason: "after getGhostText",
  telemetryData: {
    telemetryBlob: result.telemetryBlob
  }
};
```

这里有两个if判断，分别处理的是completions拒绝和cancel两种场景，也就是说在`getGhostText` 触发时机内，发生了cancel。

最后就是组装inlineCompletions返回：

```jsx
let inlineCompletions = completionsFromGhostTextResults(ctx, resultArray, resultType, document, position, textEditorOptions, lastShownCompletionIndex).map(completion => {
    let {
        text: text,
        range: range
      } = completion,
      newRange = new Ol.Range(new Ol.Position(range.start.line, range.start.character), new Ol.Position(range.end.line, range.end.character)),
      completionItem = new Ol.InlineCompletionItem(text, newRange);
    return completionItem.index = completion.index, completionItem.telemetry = completion.telemetry, completionItem.displayText = completion.displayText, completionItem.resultType = completion.resultType, completionItem.id = completion.uuid, completionItem.uri = document.uri, completionItem.insertPosition = new Ol.Position(completion.position.line, completion.position.character), completionItem.insertOffset = document.offsetAt(completionItem.insertPosition), completionItem.command = {
      title: "PostInsertTask",
      command: postInsertCmdName,
      arguments: [completionItem]
    }, completionItem;
  });
  return inlineCompletions.length === 0 ? {
    type: "empty",
    reason: "no completions in final result",
    telemetryData: result.telemetryData
  } : {
    ...result,
    value: inlineCompletions
  };
```

这里首先调用了`completionsFromGhostTextResults` 拿到inlineCompletions，然后创建了一个`InlineCompletionItem` 实例，将text和range传给它。

另外，这里还设置了`InlineCompletionItem` 的`command` 属性：

```jsx
{
  title: "PostInsertTask",
  command: postInsertCmdName,
  arguments: [completionItem]
}
```

也就是说，在用户采纳建议之后，会触发这个command，便于统计用户采纳、拒绝、局部采纳等等的情况。

## 关于completionsFormGhostTextResults的实现

```jsx
function completionsFromGhostTextResults(ctx, completionResults, resultType, document, position, textEditorOptions, lastShownCompletionIndex) {
  // 获取一个位置工厂
  let locationFactory = ctx.get(LocationFactory);

  // 获取当前行
  let currentLine = document.lineAt(position);

  // 根据completionResults生成新的对象数组
  let completions = completionResults.map(result => {
    let range, text = "";

    // 根据一些条件生成新的补全结果
    if (textEditorOptions && (result.completion = normalizeIndentCharacter(textEditorOptions, result.completion, currentLine.isEmptyOrWhitespace)), result.completion.displayNeedsWsOffset && currentLine.isEmptyOrWhitespace) {
      range = locationFactory.range(locationFactory.position(position.line, 0), position);
      text = result.completion.completionText;
    } else if (currentLine.isEmptyOrWhitespace && result.completion.completionText.startsWith(currentLine.text)) {
      range = locationFactory.range(locationFactory.position(position.line, 0), position);
      text = result.completion.completionText;
    } else {
      let wordRange = document.getWordRangeAtPosition(position);
      if (result.isMiddleOfTheLine) {
        let line = document.lineAt(position);
        let rangeFromStart = locationFactory.range(locationFactory.position(position.line, 0), position);
        let textBefore = document.getText(rangeFromStart);
        range = result.coversSuffix ? line.range : rangeFromStart;
        text = textBefore + result.completion.displayText;
      } else if (wordRange) {
        let word = document.getText(wordRange);
        range = locationFactory.range(wordRange.start, position);
        text = word + result.completion.completionText;
      } else {
        let rangeFromStart = locationFactory.range(locationFactory.position(position.line, 0), position);
        let textBefore = document.getText(rangeFromStart);
        range = rangeFromStart;
        text = textBefore + result.completion.displayText;
      }
    }

    // 返回一个新的补全结果对象
    return {
      uuid: v4_default(),
      text: text,
      range: range,
      file: document.uri,
      index: result.completion.completionIndex,
      telemetry: result.telemetry,
      displayText: result.completion.displayText,
      position: position,
      offset: document.offsetAt(position),
      resultType: resultType
    };
  });

  // 如果结果类型是2，并且有上次显示的补全索引，则将上次显示的补全结果移动到数组的最前面
  if (resultType === 2 && lastShownCompletionIndex !== void 0) {
    let lastShownCompletion = completions.find(predicate => predicate.index === lastShownCompletionIndex);
    if (lastShownCompletion) {
      let restCompletions = completions.filter(predicate => predicate.index !== lastShownCompletionIndex);
      completions = [lastShownCompletion, ...restCompletions];
    }
  }

  // 返回新的补全结果数组
  return completions;
}
```

这里面有一些复杂的if判断，我们逐行分析下：

- 第一个实际上是空行的判断`result.completion.displayNeedsWsOffset && currentLine.isEmptyOrWhitespace` ，在这个条件下，range取的是当前行的0起点到当前position：`range = locationFactory.range(locationFactory.position(position.line, 0), position);`
- 其他情况下，通过`getWordRangeAtPosition` 拿到word-range，然后分了三种情况：
    - 如果是`isMiddleOfTheLine` ，意味着当前光标在一行代码的中间位置，根据`result.coversSuffix` 的情况决定range，可以看到这个值表示的是代码补全是否要覆盖光标以后的内容，如果没有这个的话，默认的range是光标之前的，也就是说在中间插入代码，不会覆盖后面的内容。
    - 如果是`wordRange` ，表示当前光标在一个单词中间，这个时候代码补全的范围是在这个单词的后面。
    - 其他情况下，一律补全在当前光标的后面。
- 注意这里text的取法不一样，在空行和word的情况下，取的是`completionText` ，其他情况取的是`displayText` 。

最后处理了下缓存逻辑，返回整个补全结果的数组。

## getGhostText核心逻辑

这里的逻辑较为复杂，我们分段来分析，首先初始化几个变量：

```jsx
let documentSource = document.getText(),
    positionOffset = document.offsetAt(position),
    actualSuffix = documentSource.substring(positionOffset),
    prompt = await extractPrompt(ctx, document, position, preIssuedTelemetryData);
```

这里拿到了`documentSource` 、`positionOffset` 、`actualSuffix` 、`prompt` 。

紧接着4个条件判断：

```jsx
if (prompt.type === "copilotNotAvailable") return ghostTextLogger.debug(ctx, "Copilot not available, due to content exclusion"), {
  type: "abortedBeforeIssued",
  reason: "Copilot not available due to content exclusion"
};
if (prompt.type === "contextTooShort") return ghostTextLogger.debug(ctx, "Breaking, not enough context"), {
  type: "abortedBeforeIssued",
  reason: "Not enough context"
};
if (cancellationToken?.isCancellationRequested) return ghostTextLogger.info(ctx, "Cancelled after extractPrompt"), {
  type: "abortedBeforeIssued",
  reason: "Cancelled after extractPrompt"
};
let inlineSuggestion = isInlineSuggestion(document, position);
if (inlineSuggestion === void 0) return ghostTextLogger.debug(ctx, "Breaking, invalid middle of the line"), {
  type: "abortedBeforeIssued",
  reason: "Invalid middle of the line"
};
```

分别代表四种情况：

- `copilotNotAvailable` ，因为内容被block了。
- `contextTooShort` ，上下文太少了。
- `isCancellationRequested` ，又是这个取消Request的。
- `inlineSuggestion` 是invalid，这是通过一个正则判定的，以特定字符（括号、大括号、方括号、双引号、单引号、反引号、冒号、分号或逗号）结尾的行，这些字符后面可能跟着任意数量的空白字符，这样的行才是合法的。

接着是一个策略确定：

```jsx
ghostTextStrategy = await getGhostTextStrategy(ctx, document, position, prompt, isCycling, inlineSuggestion, preIssuedTelemetryData);
```

这个策略主要是决定是使用多行模式和单行模式进行补全，它的详细实现如下：

```jsx
async function shouldRequestMultiline(ctx, document, position, inlineSuggestion, preIssuedTelemetryData, prompt, requestMultilineExploration, requestMultilineOnNewLine, requestMultiModel, requestMultiModelThreshold) {
  // 如果强制多行请求被覆盖，则返回true
  if (ctx.get(ForceMultiLine).requestMultilineOverride) return !0;

  // 如果启用了多行探索，则收集一些关于文档和位置的信息
  if (requestMultilineExploration) {
    let isEmptyBlockStartDocumentPosition = await isEmptyBlockStart(document, position),
      isEmptyBlockStartDocumentPositionRangeEnd = await isEmptyBlockStart(document, document.lineAt(position).range.end);
    preIssuedTelemetryData.properties.isEmptyBlockStartDocumentPosition = isEmptyBlockStartDocumentPosition.toString(),
    preIssuedTelemetryData.properties.isEmptyBlockStartDocumentPositionRangeEnd = isEmptyBlockStartDocumentPositionRangeEnd.toString(),
    preIssuedTelemetryData.properties.inlineSuggestion = inlineSuggestion.toString(),
    preIssuedTelemetryData.measurements.documentLineCount = document.lineCount,
    preIssuedTelemetryData.measurements.positionLine = position.line;
  }

  // 如果文档的行数大于或等于8000，则发送一个遥测事件并返回false
  if (document.lineCount >= 8e3) {
    telemetry(ctx, "ghostText.longFileMultilineSkip", TelemetryData.createAndMarkAsIssued({
      languageId: document.languageId,
      lineCount: String(document.lineCount),
      currentLine: String(position.line)
    }));
    return !1;
  }

  // 如果启用了多行在新行，并且文档的语言ID是typescript或typescriptreact，并且位置在新的一行，则返回true
  if (requestMultilineOnNewLine && ["typescript", "typescriptreact"].includes(document.languageId) && isNewLine(position, document)) return !0;

  // 初始化requestMultiline为false
  let requestMultiline = !1;

  // 如果内联建议为false，并且文档的语言ID是支持的，则检查位置是否在一个空的代码块的开始位置
  if (!inlineSuggestion && (0, qL.isSupportedLanguageId)(document.languageId)) {
    requestMultiline = await isEmptyBlockStart(document, position);
  }

  // 如果内联建议为true，并且文档的语言ID是支持的，则检查位置或位置的结束位置是否在一个空的代码块的开始位置
  if (inlineSuggestion && (0, qL.isSupportedLanguageId)(document.languageId)) {
    requestMultiline = (await isEmptyBlockStart(document, position)) || (await isEmptyBlockStart(document, document.lineAt(position).range.end));
  }

  // 如果以上条件都不满足，则调用requestMultilineExperiment函数
  if (!requestMultiline) {
    requestMultiline = await requestMultilineExperiment(requestMultilineExploration, requestMultiModel, requestMultiModelThreshold, document, prompt, preIssuedTelemetryData);
  }

  // 返回requestMultiline的值
  return requestMultiline;
}
```

这里有一些策略：

- 文档大于8000行，直接不启用多行策略，并上报。
- `requestMultilineOnNewLine` 这个值默认为true，意味着当我们语言是TypeScript的时候，默认在新的一行开启多行策略。
- 如果是在某一行的中间，且是支持的语言列表内（python、js\ts、go、ruby），判断当前光标是不是空块的开头，或者结尾是不是空的块开头，决定是否开启多行模式。（这里的判断还比较复杂，不同的语法有自己的代码块规则，copilot这里采用了wasm解析AST来判断代码块）。
- 如果不在某一行的中间，那只要检测一下是不是空的块开头。
- 其他情况，采用模型预测，这里`requestMultiModel` 默认为true，`requestMultiModelThreshold` 默认为0.5。

调用模型的策略如下：

```jsx
async function requestMultilineExperiment(requestMultilineExploration, requestMultiModel, requestMultiModelThreshold, document, prompt, preIssuedTelemetryData) {
  let requestMultiline = !1;

  // 如果启用了多行探索，则随机探索多行
  if (requestMultilineExploration) {
    requestMultiline = exploreMultilineRandom();
  }

  // 如果启用了多模型，并且文档的语言ID是javascript、javascriptreact或python，并且请求的多行分数大于多模型阈值，则返回true
  if (requestMultiModel && ["javascript", "javascriptreact", "python"].includes(document.languageId)) {
    requestMultiline = requestMultilineScore(prompt.prompt, document.languageId) > requestMultiModelThreshold;
  }

  // 返回requestMultiline的值
  return requestMultiline;
}
```

可以看到目前仅支持js和python，预测模型分数>0.5，则采用多行模式。

模型本身构建的特征是根据语言和prompt的：

```jsx
constructFeatures() {
  let numFeatures = new Array(14).fill(0);
  numFeatures[0] = this.prefixFeatures.length, numFeatures[1] = this.prefixFeatures.firstLineLength, numFeatures[2] = this.prefixFeatures.lastLineLength, numFeatures[3] = this.prefixFeatures.lastLineRstripLength, numFeatures[4] = this.prefixFeatures.lastLineStripLength, numFeatures[5] = this.prefixFeatures.rstripLength, numFeatures[6] = this.prefixFeatures.rstripLastLineLength, numFeatures[7] = this.prefixFeatures.rstripLastLineStripLength, numFeatures[8] = this.suffixFeatures.length, numFeatures[9] = this.suffixFeatures.firstLineLength, numFeatures[10] = this.suffixFeatures.lastLineLength, numFeatures[11] = this.prefixFeatures.secondToLastLineHasComment ? 1 : 0, numFeatures[12] = this.prefixFeatures.rstripSecondToLastLineHasComment ? 1 : 0, numFeatures[13] = this.prefixFeatures.prefixEndsWithNewline ? 1 : 0;
  let langFeatures = new Array(Object.keys(languageMap).length + 1).fill(0);
  langFeatures[languageMap[this.language] ?? 0] = 1;
  let prefixLastCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
  prefixLastCharFeatures[contextualFilterCharacterMap[this.prefixFeatures.lastChar] ?? 0] = 1;
  let prefixRstripLastCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
  prefixRstripLastCharFeatures[contextualFilterCharacterMap[this.prefixFeatures.rstripLastChar] ?? 0] = 1;
  let suffixFirstCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
  suffixFirstCharFeatures[contextualFilterCharacterMap[this.suffixFeatures.firstChar] ?? 0] = 1;
  let suffixLstripFirstCharFeatures = new Array(Object.keys(contextualFilterCharacterMap).length + 1).fill(0);
  return suffixLstripFirstCharFeatures[contextualFilterCharacterMap[this.suffixFeatures.lstripFirstChar] ?? 0] = 1, numFeatures.concat(langFeatures, prefixLastCharFeatures, prefixRstripLastCharFeatures, suffixFirstCharFeatures, suffixLstripFirstCharFeatures);
}
```

整体预测方法比较复杂，看起来貌似是个逻辑回归的预测模型？

```jsx
// 省略一系列复杂参数计算
let var100 = sigmoid(var0 + var1 + var2 + var3 + var4 + var5 + var6 + var7 + var8 + var9 + var10 + var11 + var12 + var13 + var14 + var15 + var16 + var17 + var18 + var19 + var20 + var21 + var22 + var23 + var24 + var25 + var26 + var27 + var28 + var29 + var30 + var31 + var32 + var33 + var34 + var35 + var36 + var37 + var38 + var39 + var40 + var41 + var42 + var43 + var44 + var45 + var46 + var47 + var48 + var49 + var50 + var51 + var52 + var53 + var54 + var55 + var56 + var57 + var58 + var59 + var60 + var61 + var62 + var63 + var64 + var65 + var66 + var67 + var68 + var69 + var70 + var71 + var72 + var73 + var74 + var75 + var76 + var77 + var78 + var79 + var80 + var81 + var82 + var83 + var84 + var85 + var86 + var87 + var88 + var89 + var90 + var91 + var92 + var93 + var94 + var95 + var96 + var97 + var98 + var99);
return [1 - var100, var100];
```

接下来先从本地拿到inlineSuggestion：

```jsx
let [prefix] = trimLastLine(document.getText(locationFactory.range(locationFactory.position(0, 0), position))),
choices = getLocalInlineSuggestion(ctx, prefix, prompt.prompt, ghostTextStrategy.requestMultiline),
```

这个在之前的文章分析过了，是一个100的LRU缓存，通过prompt key来索引。这里有一个小优化，就是`getCompletionsForUserTyping` ，在用户的输入过程中，如果包含上次的prefix，也是走缓存的，当然这里的前提是remainingPrefix刚好是上次的completion开头。

接着就是一系列的变量初始化：

```jsx
engineURL = await getEngineURL(ctx, repoNwo, document.languageId, dogFood, userKind, customModel, retrievalOrg, preIssuedTelemetryData),
delayMs = await ctx.get(Features).beforeRequestWaitMs(featuresFilterArgs, preIssuedTelemetryData),
multiLogitBias = await ctx.get(Features).multiLogitBias(featuresFilterArgs, preIssuedTelemetryData),
requestContext = {
  blockMode: ghostTextStrategy.blockMode,
  languageId: document.languageId,
  repoInfo: repoInfo,
  engineURL: engineURL,
  ourRequestId: ourRequestId,
  prefix: prefix,
  prompt: prompt.prompt,
  multiline: ghostTextStrategy.requestMultiline,
  indentation: contextIndentation(document, position),
  isCycling: isCycling,
  delayMs: delayMs,
  multiLogitBias: multiLogitBias
},
debouncePredict = await ctx.get(Features).debouncePredict(),
contextualFilterEnable = await ctx.get(Features).contextualFilterEnable(),
contextualFilterAcceptThreshold = await ctx.get(Features).contextualFilterAcceptThreshold(),
contextualFilterEnableTree = await ctx.get(Features).contextualFilterEnableTree(),
contextualFilterExplorationTraffic = await ctx.get(Features).contextualFilterExplorationTraffic(),
computeContextualFilterScore = !1;
```

这里很多都是从特性平台上（Features）拉取的值。

接着就是请求后台的核心逻辑：

```jsx
if (ghostTextStrategy.isCyclingRequest && (choices?.[0].length ?? 0) > 1 || !ghostTextStrategy.isCyclingRequest && choices !== void 0) {
  ghostTextLogger.info(ctx, "Found inline suggestions locally");
} else {
  if (statusBarItem?.setProgress(), ghostTextStrategy.isCyclingRequest) {
    // 从网络获取所有完成建议
    let networkChoices = await getAllCompletionsFromNetwork(ctx, requestContext, telemetryData, cancellationToken, ghostTextStrategy.finishedCb);
    if (networkChoices.type === "success") {
      let resultChoices = choices?.[0] ?? [];
      // 遍历网络建议，如果结果选项中没有相同的建议，则添加到结果选项中
      networkChoices.value.forEach(c => {
        resultChoices.findIndex(v => v.completionText.trim() === c.completionText.trim()) === -1 && resultChoices.push(c);
      }), choices = [resultChoices, 3];
    } else if (choices === void 0) {
      // 如果选项为undefined，则移除进度并返回网络建议
      return statusBarItem?.removeProgress(), networkChoices;
    }
  } else {
    // 获取防抖限制
    let debounceLimit = await getDebounceLimit(ctx, telemetryData);
    try {
      // 进行防抖操作
      await ghostTextDebouncer.debounce(debounceLimit);
    } catch {
      // 如果防抖失败，则移除进度并返回取消的结果
      return {
        type: "canceled",
        reason: "by debouncer",
        telemetryData: mkCanceledResultTelemetry(telemetryData)
      };
    }
    // 如果取消令牌请求，则移除进度并返回取消的结果
    if (cancellationToken?.isCancellationRequested) {
      return ghostTextLogger.info(ctx, "Cancelled during debounce"), {
        type: "canceled",
        reason: "during debounce",
        telemetryData: mkCanceledResultTelemetry(telemetryData)
      };
    }
    // 如果启用了上下文过滤器，且上下文过滤器分数小于接受阈值，且随机数小于1减去上下文过滤器探索流量百分比
    if (contextualFilterEnable && telemetryData.measurements.contextualFilterScore && telemetryData.measurements.contextualFilterScore < contextualFilterAcceptThreshold / 100 && Math.random() < 1 - contextualFilterExplorationTraffic / 100) {
      // 移除进度并返回取消的结果
      return ghostTextLogger.info(ctx, "Cancelled by contextual filter"), {
        type: "canceled",
        reason: "contextualFilterScore below threshold",
        telemetryData: mkCanceledResultTelemetry(telemetryData)
      };
    }
    // 从网络获取完成建议
    let c = await getCompletionsFromNetwork(ctx, requestContext, telemetryData, cancellationToken, ghostTextStrategy.finishedCb);
    if (c.type !== "success") {
      // 如果获取失败，则移除进度并返回结果
      return statusBarItem?.removeProgress(), c;
    }
    // 设置选项为获取的建议和0
    choices = [[c.value], 0];
  }
  // 移除进度
  statusBarItem?.removeProgress();
}
```

这里其实逻辑是两个分支：

- 当`isCyclingRequest` 为true的时候，表示是用户手动触发的补全，这个时候不需要debounce，直接请求模型，此时resultType置为3。
- 否则，代表的是自动触发的代码补全，这个时候有一个debounce，debounce过后再调用模型。

值得一提的是，这里的`debounceLimit`，是可以预测的，根据上下文相关性得分来预测：

```jsx
async function getDebounceLimit(ctx, telemetryData) {
  let expDebounce;
  if ((await ctx.get(Features).debouncePredict()) && telemetryData.measurements.contextualFilterScore) {
    let acceptProbability = telemetryData.measurements.contextualFilterScore,
      sigmoidMin = 25,
      sigmoidRange = 250,
      sigmoidShift = .3475,
      sigmoidSlope = 7;
    expDebounce = sigmoidMin + sigmoidRange / (1 + Math.pow(acceptProbability / sigmoidShift, sigmoidSlope));
  } else expDebounce = await ctx.get(Features).debounceMs();
  return expDebounce > 0 ? expDebounce : 75;
}
```

看起来是一个sigmoid函数，加上一些超参，形成的简单预测模型？唯一的输入参数是`acceptProbability` 。

最后，还有一个`contextualFilterScore` 的计算，根据prompt和基本信息，来推测这个prompt可能被采纳的可能性：

```jsx
function contextualFilterScore(ctx, telemetryData, prompt, contextualFilterEnableTree) {
  let cfManager = ctx.get(ContextualFilterManager),
    yt_1 = cfManager.previousLabel,
    acw = 0;
  "afterCursorWhitespace" in telemetryData.properties && telemetryData.properties.afterCursorWhitespace === "true" && (acw = 1);
  let dt_1 = (Date.now() - cfManager.previousLabelTimestamp) / 1e3,
    ln_dt_1 = Math.log(1 + dt_1),
    ln_promptLastLineLength = 0,
    promptLastCharIndex = 0,
    promptPrefix = prompt.prefix;
  if (promptPrefix) {
    ln_promptLastLineLength = Math.log(1 + getLastLineLength(promptPrefix));
    let promptLastChar = promptPrefix.slice(-1);
    contextualFilterCharacterMap[promptLastChar] !== void 0 && (promptLastCharIndex = contextualFilterCharacterMap[promptLastChar]);
  }
  let ln_promptLastLineRstripLength = 0,
    promptLastRstripCharIndex = 0,
    promptPrefixRstrip = promptPrefix.trimEnd();
  if (promptPrefixRstrip) {
    ln_promptLastLineRstripLength = Math.log(1 + getLastLineLength(promptPrefixRstrip));
    let promptLastRstripChar = promptPrefixRstrip.slice(-1);
    contextualFilterCharacterMap[promptLastRstripChar] !== void 0 && (promptLastRstripCharIndex = contextualFilterCharacterMap[promptLastRstripChar]);
  }
  let ln_documentLength = 0;
  if ("documentLength" in telemetryData.measurements) {
    let documentLength = telemetryData.measurements.documentLength;
    ln_documentLength = Math.log(1 + documentLength);
  }
  let ln_promptEndPos = 0;
  if ("promptEndPos" in telemetryData.measurements) {
    let promptEndPos = telemetryData.measurements.promptEndPos;
    ln_promptEndPos = Math.log(1 + promptEndPos);
  }
  let relativeEndPos = 0;
  if ("promptEndPos" in telemetryData.measurements && "documentLength" in telemetryData.measurements) {
    let documentLength = telemetryData.measurements.documentLength;
    relativeEndPos = (telemetryData.measurements.promptEndPos + .5) / (1 + documentLength);
  }
  let languageIndex = 0;
  contextualFilterLanguageMap[telemetryData.properties.languageId] !== void 0 && (languageIndex = contextualFilterLanguageMap[telemetryData.properties.languageId]);
  let probabilityAccept = 0;
  if (contextualFilterEnableTree) {
    let features = new Array(221).fill(0);
    features[0] = yt_1, features[1] = acw, features[2] = ln_dt_1, features[3] = ln_promptLastLineLength, features[4] = ln_promptLastLineRstripLength, features[5] = ln_documentLength, features[6] = ln_promptEndPos, features[7] = relativeEndPos, features[8 + languageIndex] = 1, features[29 + promptLastCharIndex] = 1, features[125 + promptLastRstripCharIndex] = 1, probabilityAccept = treeScore(features)[1];
  } else {
    let sum = contextualFilterIntercept;
    sum += contextualFilterWeights[0] * yt_1, sum += contextualFilterWeights[1] * acw, sum += contextualFilterWeights[2] * ln_dt_1, sum += contextualFilterWeights[3] * ln_promptLastLineLength, sum += contextualFilterWeights[4] * ln_promptLastLineRstripLength, sum += contextualFilterWeights[5] * ln_documentLength, sum += contextualFilterWeights[6] * ln_promptEndPos, sum += contextualFilterWeights[7] * relativeEndPos, sum += contextualFilterWeights[8 + languageIndex], sum += contextualFilterWeights[29 + promptLastCharIndex], sum += contextualFilterWeights[125 + promptLastRstripCharIndex], probabilityAccept = 1 / (1 + Math.exp(-sum));
  }
  return ctx.get(ContextualFilterManager).probabilityAccept = probabilityAccept, probabilityAccept;
}
```

这里如果`contextualFilterEnableTree` 为true，应该是采用决策树模型来预测，否则就是一个线性回归模型来预测。

## 关于extractPrompt

extractPrompt在我之前的文章中已经有很详尽的分析了，在此就不再赘述，请参见：

[花了大半个月，我终于逆向分析了Github Copilot](https://mp.weixin.qq.com/s?__biz=Mzk0ODM5NTEyNA==&amp;mid=2247484980&amp;idx=1&amp;sn=240c76200248bc35101710683a516ff6&amp;chksm=c3690b2ff41e82399f6de726204d075d0b28313019e34cedc5608c93907488be2ce61ff375e5&token=2146763193&lang=zh_CN#rd)

## 小结一下

本篇文章主要分析了代码补全逻辑的主要实现，除了extractPrompt，基本所有的细节都涉及了，我们可以发现copilot虽然功能看起来好像比较单一，但是细节做起来其实十分不易，比如：

- 什么区域应该有代码提示？什么文件应该有代码提示？
- 光标位置在什么情况下补全？在什么情况下需要修正补全位置？
- 什么时候应该提示单行？什么时候提示多行？
- 什么时机提示？怎样更快地提示？怎样更合理地提示？

要做到一个好的体验，背后承载了大量复杂逻辑的处理。

上述代码已经提交在Github上，有需要的小伙伴可自取：

https://github.com/mengjian-github/copilot-analysis-new