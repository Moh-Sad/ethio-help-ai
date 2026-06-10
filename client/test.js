const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { useChat } = require("@ai-sdk/react");
function Test() {
  const result = useChat();
  return React.createElement("div", null, JSON.stringify(Object.keys(result)));
}
console.log(renderToStaticMarkup(React.createElement(Test)));
