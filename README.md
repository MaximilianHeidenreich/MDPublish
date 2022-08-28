
# Refs

- Parse args (start): https://blog.decipher.dev/build-a-cli-application-using-deno

# Pitch

A super small and user friendly way to publish MarkDown sites to Cloudflare Pages.

# Features
- Compile MarkDown files to static site
- Publish to Cloudflare Pages
- Support for password protected content using CloudFlare Functions
  - API Ref:
    - https://api.cloudflare.com/#pages-project-create-project
    - https://developers.cloudflare.com/pages/platform/api/

# Commands

mkp publish <.md file / dir>

# API

new MDPublish()
    .markedOptions({ ..., extensions: [] }) // See https://marked.js.org/using_advanced#options
    .templatesDir("")                       // 
    .cssDir("")
    .jsDir("")
    .compile("srcPath/", "outDir/");
