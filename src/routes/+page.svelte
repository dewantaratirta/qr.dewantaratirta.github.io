<script>
    import {onMount} from "svelte";

    let text = 'Hello world';
    let api = '';
    let endpoint = 'api?text=';
    let url = '';

    const handleChange = (ev) => {
        url = generateUrl(api, endpoint + text);
    }

    const generateUrl = (api, endpoint) => {
        return api + endpoint;
    }

    onMount( () => {
        let l = window.location;
        api = l.origin + '/';
        url = generateUrl(api, endpoint + text);
    });
</script>

<div class="container">

    <div>
        <h1>QRCode Generator</h1>
        <form>
            <div class="grid">
                <label for="firstname">
                    Input your text
                    <input type="text" id="firstname" name="firstname" placeholder="First name" 
                        bind:value={text}
                        on:keyup={handleChange}
                    >
                  </label>
            </div>
            <div>
                {#if url != ''}
                    <img src={url}/>
                {/if}
            </div>
        </form>
    </div>
</div>


