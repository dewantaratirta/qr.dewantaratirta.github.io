<script>
  import QR from "qrcode";

  let data = null;
  export let text = "";
  export const handleChange = () => {
    setTimeout( ()=> {
        return generateQR(text).then((res) => {
            data = res;
        });
    } )
  };

  const generateQR = async (text) => {
    let opts = {
        width: 256
    };
    return await QR.toDataURL(text, opts);
  };

  $: data, text;
</script>

{#if data && typeof data == "string"}
  <p>Text: {text}</p>
  <img src={data} alt="qrcode" />
{/if}
