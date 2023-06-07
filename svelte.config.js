import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';

// const dev = process.env.NODE_ENV === "development";
// console.log(dev);
const config = {
  kit: {
    adapter: adapter({
      pages: "docs",
      assets: "docs",
      fallback: 'index.html',
    }),
    csrf: {
      checkOrigin: false
    },
    paths:{
      base: '/qr.dewantaratirta.github.io',
    }
  },
  extensions: ['.svelte'],
  preprocess: [
    preprocess({
    }),
  ],
};

export default config;
