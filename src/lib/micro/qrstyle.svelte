<script>
    // import QrCode from "svelte-qrcode/src/lib/index.svelte"
    // import QrCode from './qrs.svelte';
    import {onMount} from 'svelte';
  
    export var text = "";
    let QR;

    export const handleChange = async (textInput) => {
      text = textInput;
      console.log(text);
      printText();
      QR = ( await import('./qrs.svelte') );
    }

    const printText = () => {
      console.log(text);
    }

    onMount( async() =>{
      QR = ( await import('./qrs.svelte') );
      console.log(QR);
    });
 
    $:text
  </script>
  
  <p>{text}</p>
  {#if text && typeof text == "string"}
    <svelte:component this={QR}/>
  {/if}
  