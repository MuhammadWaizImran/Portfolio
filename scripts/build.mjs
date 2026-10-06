import { build } from 'esbuild';
await build({entryPoints:['scripts/blob-client.js'],outfile:'public/vendor/blob-client.js',bundle:true,minify:true,platform:'browser',format:'iife',target:'es2022'});
console.log('Admin upload client built.');
