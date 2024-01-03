const path = require("path");
const fs = require('fs-extra');
const sourcemap = require("source-map");
const parser = require("@babel/parser");
const types = require("@babel/types");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

const mapFile = fs.readFileSync("./extension.js.map");
const rawSourceMap = JSON.parse(mapFile.toString());

const source = fs.readFileSync("./extension.js", "utf8");
const ast = parser.parse(source);

const nameMap = new Map();
const fileMap = new Map();


function updateNodeName(node, name) {
  if (node.type === "VariableDeclarator") {
    node.id.name = name;
  } else if (node.type === "Identifier") {
    node.name = name;
  } else if (node.type === "CallExpression") {
    updateNodeName(node.callee, name);
  } else if (node.type === "ArrowFunctionExpression") {
    node.params[0].name = name;
  } else if (node.type === "ExpressionStatement") {
    updateNodeName(node.expression, name);
  } else if (node.type === "AssignmentExpression") {
    updateNodeName(node.left, name);
  } else if (node.type === "MemberExpression") {
    updateNodeName(node.object, name);
  } else if (node.type === "BinaryExpression") {
    updateNodeName(node.left, name);
  } else if (node.type === "ConditionalExpression") {
    updateNodeName(node.test, name);
  } else if (node.type === "LogicalExpression") {
    updateNodeName(node.left, name);
  } else if (node.type === "SequenceExpression") {
    updateNodeName(node.expressions[0], name);
  } else if (node.type === "UpdateExpression") {
    updateNodeName(node.argument, name);
  } else if (node.type === "StringLiteral") {
    node.value = name;
  } else if (node.type === "AssignmentPattern") {
    updateNodeName(node.left, name);
  } else if (node.type === "ReturnStatement") {
    updateNodeName(node.argument, name);
  } else if (node.type === "BlockStatement") {
    if (node.body[0]) {
      updateNodeName(node.body[0], name);
    }
  } else if (node.type === "UnaryExpression") {
    updateNodeName(node.argument, name);
  } else if (node.type === "ObjectProperty") {
    updateNodeName(node.key, name);
  } else if (node.type === "EmptyStatement") {
    // 好像是start和end标记
    // console.log(name);
  } else if (node.type === "NumericLiteral") {
    node.value = name;
  } else if (node.type === "ThisExpression") {
    // console.log(name);
  } else if (node.type === "ForStatement") {
    updateNodeName(node.init, name);
  } else if (node.type === "OptionalMemberExpression") {
    updateNodeName(node.object, name);
  } else if (node.type === "OptionalCallExpression") {
    updateNodeName(node.callee, name);
  } else if (node.type === "LabeledStatement") {
    updateNodeName(node.label, name);
  } else if (node.type === "ClassPrivateProperty") {
    updateNodeName(node.key, name);
  } else if (node.type === "PrivateName") {
    updateNodeName(node.id, name);
  } else if (node.type === "ClassPrivateMethod") {
    updateNodeName(node.key, name);
  } else if (node.type === "VariableDeclaration") {
    updateNodeName(node.declarations[0], name);
  } else if (node.type === "IfStatement") {
    updateNodeName(node.test, name);
  } else if (node.type === "TryStatement") {
    updateNodeName(node.block, name);
  } else if (node.type === "SwitchStatement") {
    updateNodeName(node.discriminant, name);
  } else {
    // console.log(node);
  }
}

(async function start() {
  await sourcemap.SourceMapConsumer.with(rawSourceMap, null, (consumer) => {
    consumer.eachMapping(function (m) {
      if (m.name) {
        nameMap.set(`${m.generatedLine}:${m.generatedColumn}`, m);
      }

      if (m.source) {
        if (!fileMap.has(m.source)) {
          fileMap.set(m.source, {
            start: m,
          });
        } else {
          fileMap.set(m.source, {
            ...fileMap.get(m.source),
            end: m,
          });
        }
      }
    });
  });

  let lastFile;
  let lastNodes = [];
  traverse(ast, {
    enter(p) {
      const node = p.node;
      const { line, column } = node.loc.start;
      
      // 处理变量命名
      if (nameMap.has(`${line}:${column}`)) {
        const sourceObj = nameMap.get(`${line}:${column}`);
        const name = sourceObj.name;
        updateNodeName(node, name);
      }
    },
  });
  traverse(ast, {
    enter(p) {
      const node = p.node;
      const { line, column } = node.loc.start;

      // 处理路径
      for (const [file, m] of fileMap.entries()) {
        if (
          m.start.generatedLine === line &&
          m.start.generatedColumn === column
        ) {
          if (lastFile && lastNodes.length) {
            const pp = path.resolve(__dirname, "./prettier/empty", lastFile);
            fs.ensureFileSync(pp);
            fs.writeFileSync(pp, lastNodes.map(n => generate(n).code).join());
            lastNodes = [];
          }
          lastFile = file;
          break;
        }
      }
      if (lastFile) {
        lastNodes.push(node);
        p.skip();
      }
    },
  });
})();
