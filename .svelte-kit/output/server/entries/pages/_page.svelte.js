import { c as create_ssr_component, d as add_attribute, e as escape } from "../../chunks/index.js";
const _page_svelte_svelte_type_style_lang = "";
const css = {
  code: ".container.svelte-1o4uv6x{margin-bottom:20vh}",
  map: null
};
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let text = "";
  let opts = {
    colorDark: "#181818",
    colorLight: "#ffffff",
    dotScale: 6,
    logoImage: void 0,
    dotRound: 0
  };
  $$result.css.add(css);
  return `<div class="${"container svelte-1o4uv6x"}"><div><h1>QRCode Generator</h1>
    <form><div class="${"grid"}"><label for="${"firstname"}">Input your text
          <input type="${"text"}" placeholder="${"Type text/url here..."}"${add_attribute("value", text, 0)}></label></div>
      <button type="${"submit"}">Generate</button></form>

    <details><summary id="${"summary"}">Advance Settings</summary>
      <div><div class="${"grid"}"><label for="${"color"}">Color
            <input type="${"color"}" id="${"color"}" name="${"color"}"${add_attribute("value", opts.colorDark, 0)}></label>

          <label for="${"range"}">Dot Scale ${escape(opts.dotScale / 10)}
            <input type="${"range"}" min="${"4"}" max="${"10"}" id="${"range"}" name="${"range"}"${add_attribute("value", opts.dotScale, 0)}></label></div>

        <div class="${"grid"}">
          </div></div></details>

    <div>${``}</div></div>
</div>`;
});
export {
  Page as default
};
