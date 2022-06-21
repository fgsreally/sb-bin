function getStoryUrl(title, name) {
  return `http://localhost:6006/?path=/story/${title
    .toLowerCase()
    .replace("/", "-")}--example0`;
}

function toLowerLine(str) {
  var temp = str.replace(/[A-Z]/g, function (match) {
    return "-" + match.toLowerCase();
  });
  if (temp.slice(0, 1) === "-") {
    temp = temp.slice(1);
  }
  return temp;
}

module.exports = { getStoryUrl };
