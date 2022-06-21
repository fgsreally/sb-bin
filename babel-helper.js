const { declare } = require("@babel/helper-plugin-utils");
const generate = require("@babel/generator");
let options = {};
function init() {
  options.$ = false;
  options.example = false;
  options.slot = false;
  options.e2e = false;
  options.test = false;
  options.argTypes = false;
  options.examples = ["example"];
  options.exampleData = {};
  options.title = false;
}
const examplePlugin = declare((api, _, dirname) => {
  api.assertVersion(7);

  return {
    visitor: {
      Program: {
        enter(path, state) {
          init();
          state.arrowTemplate = api.template.expression(
            ` async function play() {
  }`
          )();

          path.traverse({
            Identifier(path, state) {
              if (path.node.name === "slot" && options.slot === false) {
                options.slot = path.parent.init.value;
                //  path.remove();
              }
              if (path.node.name === "title" && options.title === false) {
                options.title = path.parent.init.value;
                // path.remove();
              }
              if (path.node.name === "argTypes" && options.argTypes === false) {
                options.argTypes = true;
              }
              if (path.node.name === "example" && options.example === false) {
                options.example = generate.default(path.parent.init, {}).code;
              }
              if (path.node.name === "$" && options.$ === false) {
                options.$ = true;
              }
              if (/^example[0-9]+$/.test(path.node.name)) {
                options.examples.push(path.node.name);
                options.exampleData[path.node.name] = generate.default(
                  path.parent.init,
                  {}
                ).code;
              }
            },
          });
        },
        exit(path, state) {
          path.node.body.push(state.arrowTemplate);
          // console.log(options);
          //   console.log(example, examples);
        },
      },

      ExpressionStatement(path, state) {
        const bodyPath = path.node.expression.callee;
        if (!bodyPath) {
          return;
        }
        if (bodyPath && bodyPath.name === "describe") {
          const output = generate.default(path.node, {
            /* options */
          });
          path.remove();
          if (!options.e2e) {
            options.e2e = output.code;
          }
        }
        if (
          [
            "type",
            "click",
            "dblClick",
            "keyboard",
            "upload",
            "clear",
            "selectOptions",
            "deselectOptions",
            "tab",
            "hover",
            "unhover",
            "paste",
          ].includes(bodyPath.name)
        ) {
          const template = api.template.expression(
            `await userEvent.${bodyPath.name}()`
          )();

          const originNode = path.node;

          template.argument.arguments = originNode.expression.arguments;
          path.get("expression").replaceWith(template);
          state.arrowTemplate.body.body.push(originNode);
          path.remove();
        }
      },
    },
  };
});

const cypressPlugin = declare((api, options, dirname) => {
  api.assertVersion(7);

  return {
    visitor: {
      CallExpression(path, state) {
        if (path.node.callee.name === "it") {
          const template = api.template.expression(
            `cy.visit('${options.url}')`
          )();
          path.node.arguments[1].body.body.unshift(template);
        }
      },
    },
  };
});
module.exports = { examplePlugin, cypressPlugin, options };
