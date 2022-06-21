const { transformFromAstSync } = require("@babel/core");
const parser = require("@babel/parser");
const { getStoryUrl } = require("./utils");
const { cypressPlugin } = require("./babel-helper");
let modeStr1 = (name, path, options, otherComp) => {
  return `import {${name}} from "${path.replace(/\\/g, "/")}"
  ${
    otherComp.length > 0
      ? otherComp.reduce((arr, cur) => {
          return (
            arr + `import ${cur.name} from "${cur.rPath.replace(/\\/g, "/")}";`
          );
        }, "")
      : ""
  }
    ${
      options.e2e
        ? `import { userEvent} from '@storybook/testing-library';`
        : ``
    }
    ${options.docs ? `import README from './${name}.md';` : ""}
    ${options.$ ? `let $=document.querySelector` : ``}
    
      `;
};

let modeStr2 = (name, options, otherComp) => {
  let template = "";
  options.examples.forEach((example, key) => {
    template += `
           export const ${"Example" + key} = Template.bind({});
  
           ${"Example" + key}.args= ${example} 

           ${options.e2e ? `${"Example" + key}.play=play` : ""}
          `;
  });
  return `  const Template = (args) => ({
      
      components: {${name},${
    otherComp.length > 0
      ? otherComp.reduce((arr, cur) => {
          return arr + cur.name + ",";
        })
      : ""
  } },
      
      setup() {
        
        return { ...args };
      },
     
      template: '<${name} v-bind="args" v-on="args">${
    options.slot ? options.slot : ""
  }</${name}>',
    });    
   ${template}
  
   export default {
      title: ${options.title ? "title" : `"${name}"`},
      component: ${name},
      parameters: {
        ${options.docs ? "notes:README" : ""}
      },
     ${options.argTypes ? `argTypes:argTypes,` : ""}
    };
  
    
    `;
};

let modeStrJest = (name, path, options) => {
  return `import {${name}} from "${path.replace(/\\/g, "/")}"
  import{mount} from "@vue/test-utils"
  describe("${name}",()=>{
   
${options.examples.reduce((arr, cur) => {
  const instance = `it("${cur}",async()=>{
    const wrapper =mount(${name},{props:${
    cur === "example" ? options.example : options.exampleData[cur]
  }})
  })\n`;
  return arr + instance;
}, "")}
  })
  `;
};

let modeStrCypress = (source, tilte) => {
  const ast = parser.parse(source, {
    sourceType: "unambiguous",
  });

  const { code } = transformFromAstSync(ast, source, {
    plugins: [
      [
        cypressPlugin,
        {
          url: getStoryUrl(tilte),
        },
      ],
    ],
  });
  return code;
};
module.exports = { modeStr1, modeStr2, modeStrJest, modeStrCypress };
