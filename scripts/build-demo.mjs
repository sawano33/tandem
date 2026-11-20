// Construit tandem-demo.html : la démo complète en un seul fichier (données fictives).
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync(".demo-tmp", { recursive: true });
const env = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_EMAIL_GUILLAUME", "NEXT_PUBLIC_EMAIL_EMMA"]
  .map((k) => `--define:process.env.${k}='""'`).join(" ");
execSync(
  `npx esbuild demo-single/main.tsx --bundle --minify --format=iife --jsx=automatic --target=es2020 ` +
    `--alias:next/link=./demo-single/shim/link.tsx --alias:next/navigation=./demo-single/shim/navigation.ts --alias:@=./src ` +
    `--define:process.env.NEXT_PUBLIC_DEMO='"1"' --define:process.env.NODE_ENV='"production"' ${env} --outfile=.demo-tmp/app.js`,
  { stdio: "inherit" },
);
execSync("npx @tailwindcss/cli -i src/app/globals.css -o .demo-tmp/app.css --minify", { stdio: "inherit" });

const face = (family, file) =>
  `@font-face{font-family:'${family}';font-display:swap;font-weight:100 900;src:url(data:font/woff2;base64,${readFileSync(file).toString("base64")}) format('woff2-variations');}`;
const css =
  face("Fraunces Variable", "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2") +
  face("Inter Variable", "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2") +
  readFileSync(".demo-tmp/app.css", "utf8");
const js = readFileSync(".demo-tmp/app.js", "utf8").replaceAll("</script", "<\\/script");
const icon = readFileSync("public/icons/icon-192.png").toString("base64");

writeFileSync(
  "tandem-demo.html",
  `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"><meta name="theme-color" content="#F4EFF8"><link rel="icon" href="data:image/png;base64,${icon}"><title>TANDEM — démo</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
);
console.log("tandem-demo.html prêt");
