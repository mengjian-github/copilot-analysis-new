var init_tokenization = __esmMin(() => {
  "use strict";

  init_tokenizer();
});,function virtualNode(indentation, subs, label) {
  return {
    type: "virtual",
    indentation: indentation,
    subs: subs,
    label: label
  };
},function lineNode(indentation, lineNumber, sourceLine, subs, label) {
  if (sourceLine === "") throw new Error("Cannot create a line node with an empty source line");
  return {
    type: "line",
    indentation: indentation,
    lineNumber: lineNumber,
    sourceLine: sourceLine,
    subs: subs,
    label: label
  };
},function blankNode(line) {
  return {
    type: "blank",
    lineNumber: line,
    subs: []
  };
},function topNode(subs) {
  return {
    type: "top",
    indentation: -1,
    subs: subs ?? []
  };
},function isBlank(tree) {
  return tree.type === "blank";
},function isLine(tree) {
  return tree.type === "line";
},function isVirtual(tree) {
  return tree.type === "virtual";
},function isTop(tree) {
  return tree.type === "top";
},function cutTreeAfterLine(tree, lineNumber) {
  function cut(tree) {
    if (!isVirtual(tree) && !isTop(tree) && tree.lineNumber === lineNumber) return tree.subs = [], !0;
    for (let i = 0; i < tree.subs.length; i++) if (cut(tree.subs[i])) return tree.subs = tree.subs.slice(0, i + 1), !0;
    return !1;
  }
  __name(cut, "cut"), cut(tree);
},function duplicateTree(tree) {
  return JSON.parse(JSON.stringify(tree));
},var init_classes = __esmMin(() => {
  "use strict";

  __name(virtualNode, "virtualNode");
  __name(lineNode, "lineNode");
  __name(blankNode, "blankNode");
  __name(topNode, "topNode");
  __name(isBlank, "isBlank");
  __name(isLine, "isLine");
  __name(isVirtual, "isVirtual");
  __name(isTop, "isTop");
  __name(cutTreeAfterLine, "cutTreeAfterLine");
  __name(duplicateTree, "duplicateTree");
});,function clearLabels(tree) {
  return visitTree(tree, tree => {
    tree.label = void 0;
  }, "bottomUp"), tree;
},function clearLabelsIf(tree, condition) {
  return visitTree(tree, tree => {
    tree.label = tree.label ? condition(tree.label) ? void 0 : tree.label : void 0;
  }, "bottomUp"), tree;
},function mapLabels(tree, map) {
  switch (tree.type) {
    case "line":
    case "virtual":
      let newSubs = tree.subs.map(sub => mapLabels(sub, map));
      return {
        ...tree,
        subs: newSubs,
        label: tree.label ? map(tree.label) : void 0
      };
    case "blank":
      return {
        ...tree,
        label: tree.label ? map(tree.label) : void 0
      };
    case "top":
      return {
        ...tree,
        subs: tree.subs.map(sub => mapLabels(sub, map)),
        label: tree.label ? map(tree.label) : void 0
      };
  }
},function resetLineNumbers(tree) {
  let lineNumber = 0;
  function visitor(tree) {
    !isVirtual(tree) && !isTop(tree) && (tree.lineNumber = lineNumber, lineNumber++);
  }
  __name(visitor, "visitor"), visitTree(tree, visitor, "topDown");
},function visitTree(tree, visitor, direction) {
  function _visit(tree) {
    direction === "topDown" && visitor(tree), tree.subs.forEach(subtree => {
      _visit(subtree);
    }), direction === "bottomUp" && visitor(tree);
  }
  __name(_visit, "_visit"), _visit(tree);
},function visitTreeConditionally(tree, visitor, direction) {
  function _visit(tree) {
    if (direction === "topDown" && !visitor(tree)) return !1;
    let shouldContinue = !0;
    return tree.subs.forEach(subtree => {
      shouldContinue = shouldContinue && _visit(subtree);
    }), direction === "bottomUp" && (shouldContinue = shouldContinue && visitor(tree)), shouldContinue;
  }
  __name(_visit, "_visit"), _visit(tree);
},function foldTree(tree, init, accumulator, direction) {
  let acc = init;
  function visitor(tree) {
    acc = accumulator(tree, acc);
  }
  return __name(visitor, "visitor"), visitTree(tree, visitor, direction), acc;
},function rebuildTree(tree, visitor, skip) {
  let rebuild = __name(tree => {
      if (skip !== void 0 && skip(tree)) return tree;
      {
        let newSubs = tree.subs.map(rebuild).filter(sub => sub !== void 0);
        return tree.subs = newSubs, visitor(tree);
      }
    }, "rebuild"),
    rebuilt = rebuild(tree);
  return rebuilt !== void 0 ? rebuilt : topNode();
},var init_manipulation = __esmMin(() => {
  "use strict";

  init_classes();
  __name(clearLabels, "clearLabels");
  __name(clearLabelsIf, "clearLabelsIf");
  __name(mapLabels, "mapLabels");
  __name(resetLineNumbers, "resetLineNumbers");
  __name(visitTree, "visitTree");
  __name(visitTreeConditionally, "visitTreeConditionally");
  __name(foldTree, "foldTree");
  __name(rebuildTree, "rebuildTree");
});,function parseRaw(source) {
  let rawLines = source.split(`
`),
    indentations = rawLines.map(line => line.match(/^\s*/)[0].length),
    lines = rawLines.map(line => line.trimLeft());
  function parseNode(line) {
    let [subs, nextLine] = parseSubs(line + 1, indentations[line]);
    return [lineNode(indentations[line], line, lines[line], subs), nextLine];
  }
  __name(parseNode, "parseNode");
  function parseSubs(initialLine, parentIndentation) {
    let sub,
      subs = [],
      line = initialLine,
      lastBlank;
    for (; line < lines.length && (lines[line] === "" || indentations[line] > parentIndentation);) if (lines[line] === "") lastBlank === void 0 && (lastBlank = line), line += 1;else {
      if (lastBlank !== void 0) {
        for (let i = lastBlank; i < line; i++) subs.push(blankNode(i));
        lastBlank = void 0;
      }
      [sub, line] = parseNode(line), subs.push(sub);
    }
    return lastBlank !== void 0 && (line = lastBlank), [subs, line];
  }
  __name(parseSubs, "parseSubs");
  let [subs, parsedLine] = parseSubs(0, -1),
    line = parsedLine;
  for (; line < lines.length && lines[line] === "";) subs.push(blankNode(line)), line += 1;
  if (line < lines.length) throw new Error(`Parsing did not go to end of file. Ended at ${line} out of ${lines.length}`);
  return topNode(subs);
},function labelLines(tree, labelRules) {
  function visitor(tree) {
    if (isLine(tree)) {
      let rule = labelRules.find(rule => rule.matches(tree.sourceLine));
      rule && (tree.label = rule.label);
    }
  }
  __name(visitor, "visitor"), visitTree(tree, visitor, "bottomUp");
},function labelVirtualInherited(tree) {
  function visitor(tree) {
    if (isVirtual(tree) && tree.label === void 0) {
      let subs = tree.subs.filter(sub => !isBlank(sub));
      subs.length === 1 && (tree.label = subs[0].label);
    }
  }
  __name(visitor, "visitor"), visitTree(tree, visitor, "bottomUp");
},function buildLabelRules(ruleMap) {
  return Object.keys(ruleMap).map(key => {
    let matches;
    return ruleMap[key].test ? matches = __name(sourceLine => ruleMap[key].test(sourceLine), "matches") : matches = ruleMap[key], {
      matches: matches,
      label: key
    };
  });
},function combineClosersAndOpeners(tree) {
  let returnTree = rebuildTree(tree, __name(function (tree) {
    if (tree.subs.length === 0 || tree.subs.findIndex(sub => sub.label === "closer" || sub.label === "opener") === -1) return tree;
    let newSubs = [],
      lastNew;
    for (let i = 0; i < tree.subs.length; i++) {
      let sub = tree.subs[i],
        directOlderSibling = tree.subs[i - 1];
      if (sub.label === "opener" && directOlderSibling !== void 0 && isLine(directOlderSibling)) directOlderSibling.subs.push(sub), sub.subs.forEach(sub => directOlderSibling.subs.push(sub)), sub.subs = [];else if (sub.label === "closer" && lastNew !== void 0 && (isLine(sub) || isVirtual(sub)) && sub.indentation >= lastNew.indentation) {
        let j = newSubs.length - 1;
        for (; j > 0 && isBlank(newSubs[j]);) j -= 1;
        if (lastNew.subs.push(...newSubs.splice(j + 1)), sub.subs.length > 0) {
          let firstNonVirtual = lastNew.subs.findIndex(sub => sub.label !== "newVirtual"),
            subsToKeep = lastNew.subs.slice(0, firstNonVirtual),
            subsToWrap = lastNew.subs.slice(firstNonVirtual),
            wrappedSubs = subsToWrap.length > 0 ? [virtualNode(sub.indentation, subsToWrap, "newVirtual")] : [];
          lastNew.subs = [...subsToKeep, ...wrappedSubs, sub];
        } else lastNew.subs.push(sub);
      } else newSubs.push(sub), isBlank(sub) || (lastNew = sub);
    }
    return tree.subs = newSubs, tree;
  }, "rebuilder"));
  return clearLabelsIf(tree, arg => arg === "newVirtual"), returnTree;
},function groupBlocks(tree, isDelimiter = isBlank, label) {
  return rebuildTree(tree, __name(function (tree) {
    if (tree.subs.length <= 1) return tree;
    let newSubs = [],
      nodesSinceLastFlush = [],
      currentBlockIndentation,
      lastNodeWasDelimiter = !1;
    function flushBlockIntoNewSubs(final = !1) {
      if (currentBlockIndentation !== void 0 && (newSubs.length > 0 || !final)) {
        let virtual = virtualNode(currentBlockIndentation, nodesSinceLastFlush, label);
        newSubs.push(virtual);
      } else nodesSinceLastFlush.forEach(node => newSubs.push(node));
    }
    __name(flushBlockIntoNewSubs, "flushBlockIntoNewSubs");
    for (let i = 0; i < tree.subs.length; i++) {
      let sub = tree.subs[i],
        subIsDelimiter = isDelimiter(sub);
      !subIsDelimiter && lastNodeWasDelimiter && (flushBlockIntoNewSubs(), nodesSinceLastFlush = []), lastNodeWasDelimiter = subIsDelimiter, nodesSinceLastFlush.push(sub), isBlank(sub) || (currentBlockIndentation = currentBlockIndentation ?? sub.indentation);
    }
    return flushBlockIntoNewSubs(!0), tree.subs = newSubs, tree;
  }, "rebuilder"));
},function flattenVirtual(tree) {
  return rebuildTree(tree, __name(function (tree) {
    return isVirtual(tree) && tree.label === void 0 && tree.subs.length <= 1 ? tree.subs.length === 0 ? void 0 : tree.subs[0] : (tree.subs.length === 1 && isVirtual(tree.subs[0]) && tree.subs[0].label === void 0 && (tree.subs = tree.subs[0].subs), tree);
  }, "rebuilder"));
},function registerLanguageSpecificParser(language, parser) {
  LANGUAGE_SPECIFIC_PARSERS[language] = parser;
},function parseTree(source, languageId) {
  let raw = parseRaw(source),
    languageSpecificParser = LANGUAGE_SPECIFIC_PARSERS[languageId ?? ""];
  return languageSpecificParser ? languageSpecificParser(raw) : (labelLines(raw, genericLabelRules), combineClosersAndOpeners(raw));
},var _genericLabelRules,
  genericLabelRules,
  LANGUAGE_SPECIFIC_PARSERS,
  init_parsing = __esmMin(() => {
    "use strict";

    init_classes();
    init_manipulation();
    __name(parseRaw, "parseRaw");
    __name(labelLines, "labelLines");
    __name(labelVirtualInherited, "labelVirtualInherited");
    __name(buildLabelRules, "buildLabelRules");
    __name(combineClosersAndOpeners, "combineClosersAndOpeners");
    __name(groupBlocks, "groupBlocks");
    __name(flattenVirtual, "flattenVirtual");
    _genericLabelRules = {
      opener: /^[\[({]/,
      closer: /^[\])}]/
    }, genericLabelRules = buildLabelRules(_genericLabelRules), LANGUAGE_SPECIFIC_PARSERS = {};
    __name(registerLanguageSpecificParser, "registerLanguageSpecificParser");
    __name(parseTree, "parseTree");
  });,function processJava(originalTree) {
  let tree = originalTree;
  return labelLines(tree, javaLabelRules), tree = combineClosersAndOpeners(tree), tree = flattenVirtual(tree), labelVirtualInherited(tree), visitTree(tree, tree => {
    if (tree.label === "class" || tree.label === "interface") for (let sub of tree.subs) !isBlank(sub) && (sub.label === void 0 || sub.label === "annotation") && (sub.label = "member");
  }, "bottomUp"), tree;
},var _javaLabelRules,
  javaLabelRules,
  init_java = __esmMin(() => {
    "use strict";

    init_classes();
    init_manipulation();
    init_parsing();
    _javaLabelRules = {
      package: /^package /,
      import: /^import /,
      class: /\bclass /,
      interface: /\binterface /,
      javadoc: /^\/\*\*/,
      comment_multi: /^\/\*[^*]/,
      comment_single: /^\/\//,
      annotation: /^@/,
      opener: /^[\[({]/,
      closer: /^[\])}]/
    }, javaLabelRules = buildLabelRules(_javaLabelRules);
    __name(processJava, "processJava");
  });,function processMarkdown(originalTree) {
  let tree = originalTree;
  if (labelLines(tree, MarkdownLabelRules), isBlank(tree)) return tree;
  function headingLevel(sub) {
    if (sub.label === "heading") return 1;
    if (sub.label === "subheading") return 2;
    if (sub.label === "subsubheading") return 3;
  }
  __name(headingLevel, "headingLevel");
  let currentHierarchy = [tree],
    oldTreeSubs = [...tree.subs];
  tree.subs = [];
  for (let sub of oldTreeSubs) {
    let level = headingLevel(sub);
    if (level === void 0 || isBlank(sub)) currentHierarchy[currentHierarchy.length - 1].subs.push(sub);else {
      for (; currentHierarchy.length < level;) currentHierarchy.push(currentHierarchy[currentHierarchy.length - 1]);
      for (currentHierarchy[level - 1].subs.push(sub), currentHierarchy[level] = sub; currentHierarchy.length > level + 1;) currentHierarchy.pop();
    }
  }
  return tree = groupBlocks(tree), tree = flattenVirtual(tree), labelVirtualInherited(tree), tree;
},var _MarkdownLabelRules,
  MarkdownLabelRules,
  init_markdown = __esmMin(() => {
    "use strict";

    init_classes();
    init_parsing();
    _MarkdownLabelRules = {
      heading: /^# /,
      subheading: /^## /,
      subsubheading: /### /
    }, MarkdownLabelRules = buildLabelRules(_MarkdownLabelRules);
    __name(processMarkdown, "processMarkdown");
  });,function deparseLine(node) {
  return " ".repeat(node.indentation) + node.sourceLine + `
`;
},function deparseTree(tree) {
  function accumulator(tree, accum) {
    let str = "";
    return isLine(tree) ? str = deparseLine(tree) : isBlank(tree) && (str = `
`), accum + str;
  }
  return __name(accumulator, "accumulator"), foldTree(tree, "", accumulator, "topDown");
},function deparseAndCutTree(tree, cutAt) {
  let cutAtSet = new Set(cutAt),
    cuts = [],
    curUndef = "";
  function visit(tree) {
    tree.label !== void 0 && cutAtSet.has(tree.label) ? (curUndef !== "" && cuts.push({
      label: void 0,
      source: curUndef
    }), cuts.push({
      label: tree.label,
      source: deparseTree(tree)
    }), curUndef = "") : (isLine(tree) && (curUndef += deparseLine(tree)), tree.subs.forEach(visit));
  }
  return __name(visit, "visit"), visit(tree), curUndef !== "" && cuts.push({
    label: void 0,
    source: curUndef
  }), cuts;
},function describeTree(tree, indent = 0) {
  let ind = " ".repeat(indent);
  if (tree === void 0) return "UNDEFINED NODE";
  let children;
  tree.subs === void 0 ? children = "UNDEFINED SUBS" : children = tree.subs.map(child => describeTree(child, indent + 2)).join(`,
`), children === "" ? children = "[]" : children = `[
${children}
      ${ind}]`;
  let prefix = (isVirtual(tree) || isTop(tree) ? "   " : String(tree.lineNumber).padStart(3, " ")) + `:  ${ind}`,
    labelString = tree.label === void 0 ? "" : JSON.stringify(tree.label);
  return isVirtual(tree) || isTop(tree) ? `${prefix}vnode(${tree.indentation}, ${labelString}, ${children})` : isBlank(tree) ? `${prefix}blank(${labelString ?? ""})` : `${prefix}lnode(${tree.indentation}, ${labelString}, ${JSON.stringify(tree.sourceLine)}, ${children})`;
},function encodeTree(tree, indent = "") {
  let labelString = tree.label === void 0 ? "" : `, ${JSON.stringify(tree.label)}`,
    subString = !isBlank(tree) && tree.subs.length > 0 ? `[
${tree.subs.map(node => encodeTree(node, indent + "  ")).join(`, 
`)}
${indent}]` : "[]";
  switch (tree.type) {
    case "blank":
      return `${indent}blankNode(${tree.lineNumber}${labelString})`;
    case "top":
      return `topNode(${subString}${labelString})`;
    case "virtual":
      return `${indent}virtualNode(${tree.indentation}, ${subString}${labelString})`;
    case "line":
      return `${indent}lineNode(${tree.indentation}, ${tree.lineNumber}, "${tree.sourceLine}", ${subString}${labelString})`;
  }
},function firstLineOf(tree) {
  if (isLine(tree) || isBlank(tree)) return tree.lineNumber;
  for (let sub of tree.subs) {
    let firstLine = firstLineOf(sub);
    if (firstLine !== void 0) return firstLine;
  }
},function lastLineOf(tree) {
  let lastLine,
    i = tree.subs.length - 1;
  for (; i >= 0 && lastLine === void 0;) lastLine = lastLineOf(tree.subs[i]), i--;
  return lastLine === void 0 && !isVirtual(tree) && !isTop(tree) ? tree.lineNumber : lastLine;
},var init_description = __esmMin(() => {
  "use strict";

  init_classes();
  init_manipulation();
  __name(deparseLine, "deparseLine");
  __name(deparseTree, "deparseTree");
  __name(deparseAndCutTree, "deparseAndCutTree");
  __name(describeTree, "describeTree");
  __name(encodeTree, "encodeTree");
  __name(firstLineOf, "firstLineOf");
  __name(lastLineOf, "lastLineOf");
});,var init_indentation = __esmMin(() => {
  "use strict";

  init_java();
  init_markdown();
  init_parsing();
  init_classes();
  init_description();
  init_manipulation();
  init_parsing();
  registerLanguageSpecificParser("markdown", processMarkdown);
  registerLanguageSpecificParser("java", processJava);
});,function fromTreeWithFocussedLines(tree, config = DEFAULT_TREE_TRAVERSAL_CONFIG) {
  let treeWithDistances = mapLabels(tree, x => x ? 1 : void 0);
  return visitTree(treeWithDistances, node => {
    if (isBlank(node)) return;
    let maxChildLabel = Math.max(...node.subs.map(child => child.label ?? 0));
    node.label = Math.max(node.label ?? 0, maxChildLabel * config.worthUp);
  }, "bottomUp"), visitTree(treeWithDistances, node => {
    if (isBlank(node)) return;
    let values = node.subs.map(sub => sub.label ?? 0),
      new_values = [...values];
    for (let i = 0; i < values.length; i++) values[i] !== 0 && (new_values = new_values.map((v, j) => Math.max(v, Math.pow(config.worthSibling, Math.abs(i - j)) * values[i])));
    let nodeLabel = node.label;
    nodeLabel !== void 0 && (new_values = new_values.map(v => Math.max(v, config.worthDown * nodeLabel))), node.subs.forEach((sub, i) => sub.label = new_values[i]);
  }, "topDown"), fromTreeWithValuedLines(treeWithDistances);
},function fromTreeWithValuedLines(tree) {
  let valuedLines = foldTree(tree, [], (node, acc) => ((node.type === "line" || node.type === "blank") && acc.push(node.type === "line" ? [deparseLine(node).trimEnd(), node.label ?? 0] : ["", node.label ?? 0]), acc), "topDown");
  return new ElidableText(...valuedLines);
},var DEFAULT_TREE_TRAVERSAL_CONFIG,
  init_fromIndentationTrees = __esmMin(() => {
    "use strict";

    init_indentation();
    init_elidableText();
    DEFAULT_TREE_TRAVERSAL_CONFIG = {
      worthUp: .9,
      worthSibling: .88,
      worthDown: .8
    };
    __name(fromTreeWithFocussedLines, "fromTreeWithFocussedLines");
    __name(fromTreeWithValuedLines, "fromTreeWithValuedLines");
  });,function elidableTextForSourceCode(contents, focusOnLastLeaf = !0, focusOnFirstLine = !0) {
  let tree = typeof contents == "string" ? parseTree(contents) : parseTree(contents.source, contents.languageId);
  flattenVirtual(tree);
  let treeWithFocussedLines = mapLabels(tree, label => focusOnLastLeaf && label !== "closer");
  return visitTree(treeWithFocussedLines, node => {
    node.label === void 0 && (node.label = focusOnLastLeaf && node.label !== !1);
  }, "topDown"), focusOnLastLeaf && visitTree(treeWithFocussedLines, node => {
    if (node.label) {
      let foundLastTrue = !1;
      for (let subnode of [...node.subs].reverse()) subnode.label && !foundLastTrue ? foundLastTrue = !0 : subnode.label = !1;
    } else for (let subnode of node.subs) subnode.label = !1;
    node.subs.length > 0 && (node.label = !1);
  }, "topDown"), focusOnFirstLine && visitTree(treeWithFocussedLines, node => {
    node.label ||= (isLine(node) || isBlank(node)) && node.lineNumber == 0;
  }, "topDown"), fromTreeWithFocussedLines(treeWithFocussedLines);
},var init_fromSourceCode = __esmMin(() => {
  "use strict";

  init_indentation();
  init_fromIndentationTrees();
  __name(elidableTextForSourceCode, "elidableTextForSourceCode");
});,var LineWithValueAndCost,
  init_lineWithValueAndCost = __esmMin(() => {
    "use strict";

    init_tokenization();
    LineWithValueAndCost = class _LineWithValueAndCost {
      constructor(text, _value, _cost = getTokenizer().tokenLength(text + `
`), validate = "strict") {
        this.text = text;
        this._value = _value;
        this._cost = _cost;
        if (text.includes(`
`) && validate !== "none") throw new Error("LineWithValueAndCost: text contains newline");
        if (_value < 0 && validate !== "none") throw new Error("LineWithValueAndCost: value is negative");
        if (_cost < 0 && validate !== "none") throw new Error("LineWithValueAndCost: cost is negative");
        if (validate == "strict" && _value > 1) throw new Error("Value should normally be between 0 and 1 -- set validation to `loose` to ignore this error");
      }
      static {
        __name(this, "LineWithValueAndCost");
      }
      get value() {
        return this._value;
      }
      get cost() {
        return this._cost;
      }
      adjustValue(multiplier) {
        return this._value *= multiplier, this;
      }
      recost(coster = x => getTokenizer().tokenLength(x + `
`)) {
        return this._cost = coster(this.text), this;
      }
      copy() {
        return new _LineWithValueAndCost(this.text, this.value, this.cost, "none");
      }
    };
  });,function makePrompt(lines, maxTokens, ellipsis, indentEllipses, strategy, tokenizer) {
  if (tokenizer.tokenLength(ellipsis + `
`) > maxTokens) throw new Error("maxTokens must be larger than the ellipsis length");
  strategy === "removeLeastBangForBuck" && lines.forEach(line => line.adjustValue(1 / line.cost));
  let infiniteWorth = lines.reduce((a, b) => Math.max(a, b.value), 0) + 1,
    infiniteIndentation = lines.reduce((a, b) => Math.max(a, b.text.length), 0) + 1,
    trimmedEllipsis = ellipsis.trim(),
    totalCost = lines.reduce((sum, line) => sum + line.cost, 0),
    defensiveCounter = lines.length + 1;
  for (; totalCost > maxTokens && defensiveCounter-- >= -1;) {
    let leastDesirable = lines.reduce((least, line) => line.value < least.value ? line : least),
      index = lines.indexOf(leastDesirable),
      mostRecentNonBlankLine = lines.slice(0, index + 1).reverse().find(line => line.text.trim() !== "") ?? {
        text: ""
      },
      indentation = indentEllipses ? Math.min(mostRecentNonBlankLine.text.match(/^\s*/)?.[0].length ?? 0, lines[index - 1]?.text.trim() === trimmedEllipsis ? lines[index - 1]?.text.match(/^\s*/)?.[0].length ?? 0 : infiniteIndentation, lines[index + 1]?.text.trim() === trimmedEllipsis ? lines[index + 1]?.text.match(/^\s*/)?.[0].length ?? 0 : infiniteIndentation) : 0,
      insert = " ".repeat(indentation) + ellipsis,
      newEllipis = new LineWithValueAndCost(insert, infiniteWorth, tokenizer.tokenLength(insert + `
`), "loose");
    lines.splice(index, 1, newEllipis), lines[index + 1]?.text.trim() === trimmedEllipsis && lines.splice(index + 1, 1), lines[index - 1]?.text.trim() === trimmedEllipsis && lines.splice(index - 1, 1);
    let newTotalCost = lines.reduce((sum, line) => sum + line.cost, 0);
    newTotalCost >= totalCost && lines.every(line => line.value === infiniteWorth) && (indentEllipses = !1), totalCost = newTotalCost;
  }
  if (defensiveCounter < 0) throw new Error("Infinite loop in ElidableText.makePrompt: Defensive counter < 0 in ElidableText.makePrompt with end text");
  return lines.map(line => line.text).join(`
`);
},var ElidableText,
  init_elidableText = __esmMin(() => {
    "use strict";

    init_tokenization();
    init_fromSourceCode();
    init_lineWithValueAndCost();
    ElidableText = class _ElidableText {
      constructor(...chunks) {
        this.lines = [];
        let lines = [];
        for (let chunk of chunks) {
          let value = Array.isArray(chunk) ? chunk[1] : 1,
            input = Array.isArray(chunk) ? chunk[0] : chunk;
          typeof input == "string" ? input.split(`
`).forEach(line => lines.push(new LineWithValueAndCost(line, value))) : input instanceof _ElidableText ? lines.push(...input.lines.map(line => line.copy().adjustValue(value))) : "source" in input && "languageId" in input && lines.push(...elidableTextForSourceCode(input).lines.map(line => line.copy().adjustValue(value)));
        }
        this.lines = lines;
      }
      static {
        __name(this, "ElidableText");
      }
      adjust(multiplier) {
        this.lines.forEach(line => line.adjustValue(multiplier));
      }
      recost(coster = x => getTokenizer().tokenLength(x + `
`)) {
        this.lines.forEach(line => line.recost(coster));
      }
      makePrompt(maxTokens, ellipsis = "[...]", indentEllipses = !0, strategy = "removeLeastDesirable", tokenizer = getTokenizer()) {
        let lines = this.lines.map(line => line.copy());
        return makePrompt(lines, maxTokens, ellipsis, indentEllipses, strategy, tokenizer);
      }
    };
    __name(makePrompt, "makePrompt");
  });,function Diff() {},function buildValues(diff, components, newString, oldString, useLongestToken) {
  for (var componentPos = 0, componentLen = components.length, newPos = 0, oldPos = 0; componentPos < componentLen; componentPos++) {
    var component = components[componentPos];
    if (component.removed) {
      if (component.value = diff.join(oldString.slice(oldPos, oldPos + component.count)), oldPos += component.count, componentPos && components[componentPos - 1].added) {
        var tmp = components[componentPos - 1];
        components[componentPos - 1] = components[componentPos], components[componentPos] = tmp;
      }
    } else {
      if (!component.added && useLongestToken) {
        var value = newString.slice(newPos, newPos + component.count);
        value = value.map(function (value, i) {
          var oldValue = oldString[oldPos + i];
          return oldValue.length > value.length ? oldValue : value;
        }), component.value = diff.join(value);
      } else component.value = diff.join(newString.slice(newPos, newPos + component.count));
      newPos += component.count, component.added || (oldPos += component.count);
    }
  }
  var lastComponent = components[componentLen - 1];
  return componentLen > 1 && typeof lastComponent.value == "string" && (lastComponent.added || lastComponent.removed) && diff.equals("", lastComponent.value) && (components[componentLen - 2].value += lastComponent.value, components.pop()), components;
},function clonePath(path) {
  return {
    newPos: path.newPos,
    components: path.components.slice(0)
  };
},function diffLines(oldStr, newStr, callback) {
  return lineDiff.diff(oldStr, newStr, callback);
},function _typeof(obj) {
  "@babel/helpers - typeof";

  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? _typeof = __name(function (obj) {
    return typeof obj;
  }, "_typeof") : _typeof = __name(function (obj) {
    return obj && typeof Symbol == "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  }, "_typeof"), _typeof(obj);
},function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
},function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
},function _iterableToArray(iter) {
  if (typeof Symbol < "u" && Symbol.iterator in Object(iter)) return Array.from(iter);
},function _unsupportedIterableToArray(o, minLen) {
  if (o) {
    if (typeof o == "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor && (n = o.constructor.name), n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }
},function _arrayLikeToArray(arr, len) {
  (len == null || len > arr.length) && (len = arr.length);
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
},function _nonIterableSpread() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
},function canonicalize(obj, stack, replacementStack, replacer, key) {
  stack = stack || [], replacementStack = replacementStack || [], replacer && (obj = replacer(key, obj));
  var i;
  for (i = 0; i < stack.length; i += 1) if (stack[i] === obj) return replacementStack[i];
  var canonicalizedObj;
  if (objectPrototypeToString.call(obj) === "[object Array]") {
    for (stack.push(obj), canonicalizedObj = new Array(obj.length), replacementStack.push(canonicalizedObj), i = 0; i < obj.length; i += 1) canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, key);
    return stack.pop(), replacementStack.pop(), canonicalizedObj;
  }
  if (obj && obj.toJSON && (obj = obj.toJSON()), _typeof(obj) === "object" && obj !== null) {
    stack.push(obj), canonicalizedObj = {}, replacementStack.push(canonicalizedObj);
    var sortedKeys = [],
      _key;
    for (_key in obj) obj.hasOwnProperty(_key) && sortedKeys.push(_key);
    for (sortedKeys.sort(), i = 0; i < sortedKeys.length; i += 1) _key = sortedKeys[i], canonicalizedObj[_key] = canonicalize(obj[_key], stack, replacementStack, replacer, _key);
    stack.pop(), replacementStack.pop();
  } else canonicalizedObj = obj;
  return canonicalizedObj;
},function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  options || (options = {}), typeof options.context > "u" && (options.context = 4);
  var diff = diffLines(oldStr, newStr, options);
  if (!diff) return;
  diff.push({
    value: "",
    lines: []
  });
  function contextLines(lines) {
    return lines.map(function (entry) {
      return " " + entry;
    });
  }
  __name(contextLines, "contextLines");
  for (var hunks = [], oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1, _loop = __name(function (i) {
      var current = diff[i],
        lines = current.lines || current.value.replace(/\n$/, "").split(`
`);
      if (current.lines = lines, current.added || current.removed) {
        var _curRange;
        if (!oldRangeStart) {
          var prev = diff[i - 1];
          oldRangeStart = oldLine, newRangeStart = newLine, prev && (curRange = options.context > 0 ? contextLines(prev.lines.slice(-options.context)) : [], oldRangeStart -= curRange.length, newRangeStart -= curRange.length);
        }
        (_curRange = curRange).push.apply(_curRange, _toConsumableArray(lines.map(function (entry) {
          return (current.added ? "+" : "-") + entry;
        }))), current.added ? newLine += lines.length : oldLine += lines.length;
      } else {
        if (oldRangeStart) if (lines.length <= options.context * 2 && i < diff.length - 2) {
          var _curRange2;
          (_curRange2 = curRange).push.apply(_curRange2, _toConsumableArray(contextLines(lines)));
        } else {
          var _curRange3,
            contextSize = Math.min(lines.length, options.context);
          (_curRange3 = curRange).push.apply(_curRange3, _toConsumableArray(contextLines(lines.slice(0, contextSize))));
          var hunk = {
            oldStart: oldRangeStart,
            oldLines: oldLine - oldRangeStart + contextSize,
            newStart: newRangeStart,
            newLines: newLine - newRangeStart + contextSize,
            lines: curRange
          };
          if (i >= diff.length - 2 && lines.length <= options.context) {
            var oldEOFNewline = /\n$/.test(oldStr),
              newEOFNewline = /\n$/.test(newStr),
              noNlBeforeAdds = lines.length == 0 && curRange.length > hunk.oldLines;
            !oldEOFNewline && noNlBeforeAdds && oldStr.length > 0 && curRange.splice(hunk.oldLines, 0, "\\ No newline at end of file"), (!oldEOFNewline && !noNlBeforeAdds || !newEOFNewline) && curRange.push("\\ No newline at end of file");
          }
          hunks.push(hunk), oldRangeStart = 0, newRangeStart = 0, curRange = [];
        }
        oldLine += lines.length, newLine += lines.length;
      }
    }, "_loop"), i = 0; i < diff.length; i++) _loop(i);
  return {
    oldFileName: oldFileName,
    newFileName: newFileName,
    oldHeader: oldHeader,
    newHeader: newHeader,
    hunks: hunks
  };
},var characterDiff,
  extendedWordChars,
  reWhitespace,
  wordDiff,
  lineDiff,
  sentenceDiff,
  cssDiff,
  objectPrototypeToString,
  jsonDiff,
  arrayDiff,
  init_lib = __esmMin(() => {
    __name(Diff, "Diff");
    Diff.prototype = {
      diff: __name(function (oldString, newString) {
        var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {},
          callback = options.callback;
        typeof options == "function" && (callback = options, options = {}), this.options = options;
        var self = this;
        function done(value) {
          return callback ? (setTimeout(function () {
            callback(void 0, value);
          }, 0), !0) : value;
        }
        __name(done, "done"), oldString = this.castInput(oldString), newString = this.castInput(newString), oldString = this.removeEmpty(this.tokenize(oldString)), newString = this.removeEmpty(this.tokenize(newString));
        var newLen = newString.length,
          oldLen = oldString.length,
          editLength = 1,
          maxEditLength = newLen + oldLen;
        options.maxEditLength && (maxEditLength = Math.min(maxEditLength, options.maxEditLength));
        var bestPath = [{
            newPos: -1,
            components: []
          }],
          oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
        if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) return done([{
          value: this.join(newString),
          count: newString.length
        }]);
        function execEditLength() {
          for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
            var basePath = void 0,
              addPath = bestPath[diagonalPath - 1],
              removePath = bestPath[diagonalPath + 1],
              _oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
            addPath && (bestPath[diagonalPath - 1] = void 0);
            var canAdd = addPath && addPath.newPos + 1 < newLen,
              canRemove = removePath && 0 <= _oldPos && _oldPos < oldLen;
            if (!canAdd && !canRemove) {
              bestPath[diagonalPath] = void 0;
              continue;
            }
            if (!canAdd || canRemove && addPath.newPos < removePath.newPos ? (basePath = clonePath(removePath), self.pushComponent(basePath.components, void 0, !0)) : (basePath = addPath, basePath.newPos++, self.pushComponent(basePath.components, !0, void 0)), _oldPos = self.extractCommon(basePath, newString, oldString, diagonalPath), basePath.newPos + 1 >= newLen && _oldPos + 1 >= oldLen) return done(buildValues(self, basePath.components, newString, oldString, self.useLongestToken));
            bestPath[diagonalPath] = basePath;
          }
          editLength++;
        }
        if (__name(execEditLength, "execEditLength"), callback) __name(function exec() {
          setTimeout(function () {
            if (editLength > maxEditLength) return callback();
            execEditLength() || exec();
          }, 0);
        }, "exec")();else for (; editLength <= maxEditLength;) {
          var ret = execEditLength();
          if (ret) return ret;
        }
      }, "diff"),
      pushComponent: __name(function (components, added, removed) {
        var last = components[components.length - 1];
        last && last.added === added && last.removed === removed ? components[components.length - 1] = {
          count: last.count + 1,
          added: added,
          removed: removed
        } : components.push({
          count: 1,
          added: added,
          removed: removed
        });
      }, "pushComponent"),
      extractCommon: __name(function (basePath, newString, oldString, diagonalPath) {
        for (var newLen = newString.length, oldLen = oldString.length, newPos = basePath.newPos, oldPos = newPos - diagonalPath, commonCount = 0; newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1]);) newPos++, oldPos++, commonCount++;
        return commonCount && basePath.components.push({
          count: commonCount
        }), basePath.newPos = newPos, oldPos;
      }, "extractCommon"),
      equals: __name(function (left, right) {
        return this.options.comparator ? this.options.comparator(left, right) : left === right || this.options.ignoreCase && left.toLowerCase() === right.toLowerCase();
      }, "equals"),
      removeEmpty: __name(function (array) {
        for (var ret = [], i = 0; i < array.length; i++) array[i] && ret.push(array[i]);
        return ret;
      }, "removeEmpty"),
      castInput: __name(function (value) {
        return value;
      }, "castInput"),
      tokenize: __name(function (value) {
        return value.split("");
      }, "tokenize"),
      join: __name(function (chars) {
        return chars.join("");
      }, "join")
    };
    __name(buildValues, "buildValues");
    __name(clonePath, "clonePath");
    characterDiff = new Diff(), extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/, reWhitespace = /\S/, wordDiff = new Diff();
    wordDiff.equals = function (left, right) {
      return this.options.ignoreCase && (left = left.toLowerCase(), right = right.toLowerCase()), left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
    };
    wordDiff.tokenize = function (value) {
      for (var tokens = value.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/), i = 0; i < tokens.length - 1; i++) !tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2]) && (tokens[i] += tokens[i + 2], tokens.splice(i + 1, 2), i--);
      return tokens;
    };
    lineDiff = new Diff();
    lineDiff.tokenize = function (value) {
      var retLines = [],
        linesAndNewlines = value.split(/(\n|\r\n)/);
      linesAndNewlines[linesAndNewlines.length - 1] || linesAndNewlines.pop();
      for (var i = 0; i < linesAndNewlines.length; i++) {
        var line = linesAndNewlines[i];
        i % 2 && !this.options.newlineIsToken ? retLines[retLines.length - 1] += line : (this.options.ignoreWhitespace && (line = line.trim()), retLines.push(line));
      }
      return retLines;
    };
    __name(diffLines, "diffLines");
    sentenceDiff = new Diff();
    sentenceDiff.tokenize = function (value) {
      return value.split(/(\S.+?[.!?])(?=\s+|$)/);
    };
    cssDiff = new Diff();
    cssDiff.tokenize = function (value) {
      return value.split(/([{}:;,]|\s+)/);
    };
    __name(_typeof, "_typeof");
    __name(_toConsumableArray, "_toConsumableArray");
    __name(_arrayWithoutHoles, "_arrayWithoutHoles");
    __name(_iterableToArray, "_iterableToArray");
    __name(_unsupportedIterableToArray, "_unsupportedIterableToArray");
    __name(_arrayLikeToArray, "_arrayLikeToArray");
    __name(_nonIterableSpread, "_nonIterableSpread");
    objectPrototypeToString = Object.prototype.toString, jsonDiff = new Diff();
    jsonDiff.useLongestToken = !0;
    jsonDiff.tokenize = lineDiff.tokenize;
    jsonDiff.castInput = function (value) {
      var _this$options = this.options,
        undefinedReplacement = _this$options.undefinedReplacement,
        _this$options$stringi = _this$options.stringifyReplacer,
        stringifyReplacer = _this$options$stringi === void 0 ? function (k, v) {
          return typeof v > "u" ? undefinedReplacement : v;
        } : _this$options$stringi;
      return typeof value == "string" ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, "  ");
    };
    jsonDiff.equals = function (left, right) {
      return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"));
    };
    __name(canonicalize, "canonicalize");
    arrayDiff = new Diff();
    arrayDiff.tokenize = function (value) {
      return value.slice();
    };
    arrayDiff.join = arrayDiff.removeEmpty = function (value) {
      return value;
    };
    __name(structuredPatch, "structuredPatch");
  });,function elidableTextForDiff(oldContent, newContent) {
  let languageId = typeof oldContent == "string" ? typeof newContent == "string" ? void 0 : newContent.languageId : typeof newContent == "string" || oldContent.languageId === newContent.languageId ? oldContent.languageId : void 0;
  oldContent = typeof oldContent == "string" ? oldContent : oldContent.source, newContent = typeof newContent == "string" ? newContent : newContent.source;
  let patch = structuredPatch("", "", oldContent, newContent),
    changedLinesOld = new Set(),
    changedLinesNew = new Set();
  for (let hunk of patch.hunks) {
    for (let i = hunk.oldStart; i < hunk.oldStart + hunk.oldLines; i++) changedLinesOld.add(i);
    for (let i = hunk.newStart; i < hunk.newStart + hunk.newLines; i++) changedLinesNew.add(i);
  }
  let oldTree = mapLabels(flattenVirtual(parseTree(oldContent, languageId)), () => !1),
    newTree = mapLabels(flattenVirtual(parseTree(newContent, languageId)), () => !1);
  return visitTree(oldTree, node => {
    (node.type === "line" || node.type === "blank") && changedLinesOld.has(node.lineNumber) && (node.label = !0);
  }, "topDown"), visitTree(newTree, node => {
    (node.type === "line" || node.type === "blank") && changedLinesNew.has(node.lineNumber) && (node.label = !0);
  }, "topDown"), [fromTreeWithFocussedLines(oldTree), fromTreeWithFocussedLines(newTree)];
},var init_fromDiff = __esmMin(() => {
  "use strict";

  init_lib();
  init_indentation();
  init_fromIndentationTrees();
  __name(elidableTextForDiff, "elidableTextForDiff");
});