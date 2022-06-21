#!/usr/bin/env node
const path = require("path");
var argv = require("minimist")(process.argv.slice(2));
const fs = require("fs");
const chokidar = require("chokidar");
const chalk = require("chalk");
// rootPath = `/${String(process.argv[2] || `src/components`)}`;
const { transformFromAstSync } = require("@babel/core");
const parser = require("@babel/parser");
const { examplePlugin, options } = require("./babel-helper");
const { modeStr1, modeStr2, modeStrCypress, modeStrJest } = require("./mode");
const inquirer = require("inquirer");
var beautify = require("js-beautify").js;
const question = [
  { type: "input", message: "项目名称", name: "project", default: "project" },
  { type: "input", message: "用户名称", name: "user", default: "fgs" },
  { type: "input", message: "版本", name: "version", default: "1.0.0" },
];
let config = {
  stories: "stories",
  test: path.join("test", "unit"),
  cypress: path.join("test", "e2e"),
};
function getOutPath(type) {
  return path.resolve(process.cwd(), `${String(argv[type] || config[type])}`);
}

function getStoriesFile(name) {
  return getOutPath("stories") + `/${name}.stories.js`;
}
function getREADMEFile(name) {
  return getOutPath("stories") + `/${name}.md`;
}
function getJestFile(name) {
  return getOutPath("test") + `/${name}.spec.js`;
}
function getCypressFile(name) {
  return getOutPath("cypress") + `/${name}.spec.js`;
}
if (!fs.existsSync(getOutPath("stories"))) {
  fs.mkdirSync(getOutPath("stories"));
}
if (!fs.existsSync(getOutPath("test"))) {
  fs.mkdirSync(getOutPath("test"));
}
if (!fs.existsSync(getOutPath("cypress"))) {
  fs.mkdirSync(getOutPath("cypress"));
}
let res;
let files = [];
function watchSb() {
  const watcher = chokidar.watch(path.resolve(process.cwd(), "src"), {
    persistent: false,
  });

  watcher
    .on("add", async (p) => {
      let type = "";
      if (/.vue$/.test(p)) type = ".vue";
      // if (/.jsx$/.test(path)) type = ".jsx";
      if (type === "") return;
      let curPath = p;
      let name = p.substring(p.lastIndexOf("\\") + 1, p.lastIndexOf("."));
      // log(`component ${name} has been added`);
      console.log(p, name);
      files.push({ name: name, path: p });
    })
    .on("ready", function () {
      files.forEach(async function (file, i) {
        const sourceCode = await fs.promises.readFile(file.path, {
          encoding: "utf-8",
        });
        let exampleScript = "";

        sourceCode.replace(
          /<example.*?>([\s\S]+?)<\/example>/gim,
          function (_, js) {
            //正则匹配出script中的内容
            exampleScript += js;
          }
        );
        let docs = "";
        sourceCode.replace(/<docs.*?>([\s\S]+?)<\/docs>/gim, function (_, js) {
          //正则匹配出script中的内容
          docs += js;
        });

        if (docs !== "") {
          console.log(chalk.hex("#00ffee")(`组件${file.name}已创建README`));
          await fs.promises.writeFile(getREADMEFile(file.name), docs, {
            encoding: "utf-8",
          });
          options.docs = true;
        }

        if (exampleScript === "") return;

        try {
          const ast = parser.parse(exampleScript, {
            sourceType: "unambiguous",
          });

          const { code } = transformFromAstSync(ast, sourceCode, {
            plugins: [[examplePlugin]],
          });

          if (options.e2e) {
            fs.writeFileSync(
              getCypressFile(file.name),
              // modeStrJest(file.name, path.relative(getOutPath("test"), p)) +
              //   options.test,
              modeStrCypress(options.e2e, options.title || file.name),
              {
                encoding: "utf-8",
              }
            );

            console.log(chalk.blue(`组件${file.name}已创建e2e`));
          }

          if (options.example) {
            fs.writeFileSync(
              getJestFile(file.name),
              // modeStrJest(file.name, path.relative(getOutPath("test"), p)) +
              //   options.test,
              modeStrJest(
                file.name,
                path.relative(getOutPath("cypress"), file.path),
                options
              ),
              {
                encoding: "utf-8",
              }
            );
            console.log(chalk.yellow(`组件${file.name}已创建单元测试`));
          }

          if (options.argTypes) {
            console.log(chalk.pink(`组件${file.name}已创建操作器`));
          }
          if (!options.example) {
            console.log(
              chalk.red(
                `警告：组件${file.name}没有测试数据--这可能会导致所有其他功能不起效(${p})`
              )
            );
          }
          let otherComp = [];
          options.slot &&
            options.slot.replace(/<(\w*)>/g, function (_, js) {
              otherComp.push(js);
            });
          const ret =
            modeStr1(
              file.name,
              path.relative(getOutPath("stories"), file.path),
              options,
              files.filter((f) => {
                f.rPath = path.relative(getOutPath("stories"), f.path);

                return otherComp.includes(f.name) && f.name !== file.name;
              })
            ) +
            "//*****origin code*****\n" +
            code +
            "\n//*****\n\n" +
            modeStr2(file.name, options, otherComp);

          res.components.push({
            path: path.relative(process.cwd(), file.path).replace(/\\/g, "/"),
            data: options.example.replace(/\n/g, ""),
            name: file.name,
            title: options.title ? options.title : "",
          });

          if (i === files.length - 1) {
            fs.promises.writeFile(
              path.join(process.cwd(), "micro.json"),
              JSON.stringify(res),
              {
                encoding: "utf-8",
              }
            );
            console.log(chalk.keyword("orange")(`创建micro.json`));
          }
          fs.promises.writeFile(
            getStoriesFile(file.name),
            beautify(ret, { indent_size: 2, space_in_empty_paren: true }),
            {
              encoding: "utf-8",
            }
          );
        } catch (e) {
          console.log(
            chalk.hex("#e1e657")(
              `Error:${file.name}组件---在example中有js语法错误--- ${file.path}`
            )
          );
          console.error(e);
          process.exit(1);
        }
      });
    });
}
inquirer.prompt(question).then((answer) => {
  res = answer;
  res.components = [];
  watchSb();
});
