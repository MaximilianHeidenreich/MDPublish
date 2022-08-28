import { MDPublish } from "./src/MDPublish.ts";
import { defaultOptions } from "./src/types/mdpoptions.ts";

const options = defaultOptions;
options.debug = true;

/*
new MDPublish(options)
    .compile(
        "/Users/max/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/M4xu\'s\ Garden\ Vault/", 
        "/Users/max/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/M4xu\'s\ Garden\ Vault/.mdp/build"
    )
    .then((mdp) => mdp.build());
*/

options.compile.inlineCss = true;
options.compile.inlineJs = false;
new MDPublish(options)
    .compile(
        "/Volumes/T7/Mac Mini/Programming/MDPublish/test/.mkp-example", 
        "/Volumes/T7/Mac Mini/Programming/MDPublish/test/.mkp-example/build"
    )
    .then((mdp) => mdp.build());




