// import { base } from '$app/paths';
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
  // size: 400,
  // margin: 20,
  // colorDark: "#181818",
  // colorLight: "#ffffff",
  // autoColor: false,
  // backgroundImage: undefined,
  whiteMargin: false,
  // logoImage: 'https://crosssync.app/assets/favicon/apple-touch-icon.png',
  // logoScale: 0.2,
  // logoMargin: 6,
  // logoCornerRadius: 0,
  dotScale: 0.4,
  dotRound: [100,100,100,100],
  componentOptions:{
    // cornerAlignment:{
    //   scale: 0,
    //   protectors: true
    // }
  },
};


export async function POST(ev) {
  // console.log(ev.request);
  const data = await ev.request.json();
  let options = {
    ...baseConfig,
    ...data,
  }

  const buffer = await new AwesomeQR(options).draw();

  const resp = new Response(buffer);
  return resp;
}