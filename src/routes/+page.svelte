<script>
  import { onMount } from "svelte";

  let text = "";
  let api = "";
  let endpoint = "api";
  let url = "";
  let opts = {
    colorDark: "#181818",
    colorLight: "#ffffff",
    dotScale: 6,
    logoImage: undefined,
    dotRound: 0,
  };

  const generateUrl = async (api, endpoint, text, opts = {}) => {
    let tempOpts = {
      ...opts,
      dotScale: opts.dotScale * 0.1,
      dotRound: [opts.dotRound, opts.dotRound, opts.dotRound, opts.dotRound],
    };

    const rawResponse = await fetch(api + endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        ...tempOpts,
      }),
    });

    const content = await rawResponse.blob();
    const blob = content.slice(0, content.size, "image/png");
    return blob;
  };

  const doGenerate = async () => {
    let result = await generateUrl(api, endpoint, text, opts);
    url = await URL.createObjectURL(result);
  };
</script>

<div class="container">
  <div>
    <h1>QRCode Generator</h1>
    <form>
      <div class="grid">
        <label for="firstname">
          Input your text
          <input
            type="text"
            placeholder="Type text/url here..."
            bind:value={text}
          />
        </label>
      </div>
      <button type="submit" on:click|preventDefault={doGenerate}
        >Generate</button
      >
    </form>

    <details>
      <summary id="summary">Advance Settings</summary>
      <div>
        <div class="grid">
          <label for="color">
            Color
            <input
              type="color"
              id="color"
              name="color"
              bind:value={opts.colorDark}
            />
          </label>

          <label for="range"
            >Dot Scale {opts.dotScale / 10}
            <input
              type="range"
              min="4"
              max="10"
              bind:value={opts.dotScale}
              id="range"
              name="range"
            />
          </label>
        </div>

        <div class="grid">
          <!-- <label for="color">
                  Background Color
                  <input type="color" id="color" name="color" bind:value={opts.colorLight}>
                </label> -->
          <!-- 
                <label for="range"
                >Dot Round
                <input
                  type="range"
                  min="0"
                  max="100"
                  bind:value={opts.dotRound}
                  id="range"
                  name="range"
                />
              </label> -->
        </div>
      </div>
    </details>

    <div>
      {#if url != ""}
        <img src={url} alt={text} />
      {/if}
    </div>
  </div>
</div>

<style>
  .container {
    margin-bottom: 20vh;
  }
</style>
