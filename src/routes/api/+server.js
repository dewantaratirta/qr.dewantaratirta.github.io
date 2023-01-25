import { base } from '$app/paths';
// import { AwesomeQR }  from 'awesome-qr';
import { AwesomeQR }  from '$lib/comp/CustomQr';
 
export async function GET(params) {
  let {url} = params;
  let text = url.searchParams.get('text') ?? "AwesomeQR by Makito - Awesome, right now.";
  const buffer = await new AwesomeQR({
    text: text,
    size: 500,
  }).draw();
  // console.log(text, buffer);

  let resp = new Response(
    buffer
  );
  return resp;
}

// node_modules\awesome-qr\lib\awesome-qr.d.ts
const baseConfig = {
  text: 'Hello world',
  size: 400,
  margin: 20,
  colorDark: "#181818",
  colorLight: "#ffffff",
  autoColor: true,
  backgroundImage: undefined,
  whiteMargin: true,
  logoImage: 'https://crosssync.app/assets/favicon/apple-touch-icon.png',
  logoScale: 0.2,
  logoMargin: 6,
  logoCornerRadius: 8,
  dotScale: 0.4
};


export async function POST(ev) {
  // console.log(ev.request.headers);
   if (ev.request.headers.get('content-type').startsWith('application/x-www-form-urlencoded')) {
       const formData = await ev.request.formData();
       let data = {};
       for (const pair of formData.entries()) {
        data[pair[0]] = pair[1];
      }

      let QrData = {...baseConfig, ...data};
      console.log(QrData)
      const buffer = await new AwesomeQR(QrData).draw();
      let resp = new Response(
        buffer
      );
      return resp;
   }
}