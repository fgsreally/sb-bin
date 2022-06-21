//current useless
const $AST = require("trans-ast");
function getSlots(str) {
  const t = str.match(/<template.*?>([\s\S]+?)<\/template>/g);

  const ret = $AST.parseAST(t[0]);
  if (!ret) return [];
  let result = [];
  function traverse(ast, tag) {
    ast &&
      ast.map((item) => {
        traverse(item.children, tag);
        if (item.tag === tag) {
          result.push(item);
        }
      });
  }
  traverse(ret.children, "slot");

  return result.map((i) => {
    return i.attrsMap.name || "default";
  });
}
