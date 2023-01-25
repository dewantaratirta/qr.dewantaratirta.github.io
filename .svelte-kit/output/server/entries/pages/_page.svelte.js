import { c as create_ssr_component, d as add_attribute } from "../../chunks/index.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let text = "Hello world";
  return `<div class="${"container"}"><div><h1>QRCode Generator</h1>
        <form><div class="${"grid"}"><label for="${"firstname"}">Input your text
                    <input type="${"text"}" id="${"firstname"}" name="${"firstname"}" placeholder="${"First name"}"${add_attribute("value", text, 0)}></label></div>
            <div>${``}</div></form></div></div>`;
});
export {
  Page as default
};
