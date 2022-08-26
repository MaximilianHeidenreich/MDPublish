import { Marked, Kia, path, ensureDirSync } from "../deps.ts"
import { readDirRecursive } from "./utils.ts";

export interface InjectTree {
    [key: string]: string[]     // key: resourcePath, value: array of page files to inject
}

export async function compile(rootDir: string, customHeaders: any, debug: boolean = false) {
    rootDir = "/Volumes/T7/Mac Mini/Programming/MDPublish/test";
    let buildDir = "/Volumes/T7/Mac Mini/Programming/MDPublish/test/.build";
    // path.dirname(path.fromFileUrl(import.meta.url);
    //const compile = new Kia.default("Compiling from " + src);
    //compile.start();

    let indexPage = undefined;      // The md file with "mkp-index" in the frontmatter

    // Inject Lists
    let jsInjects: { [key: string]: string[] } = {};
    let jsGlobalInjects: string[] = [];
    let cssInjects: { [key: string]: string[] } = {};
    let cssGlobalInjects: string[] = [];

    // Iterate all files & extract frontmatter mkp- kv-pairs
    let mdSrcFiles = readDirRecursive(rootDir).filter(e => e.isFile && e.name.toLowerCase().endsWith(".md"));
    
    // Extract meta
    //const meta = new Kia.default("Meta...");
    //meta.start();
    let mdSrcMeta = mdSrcFiles.map(e => {
        const parsed = Marked.parse(Deno.readTextFileSync(e.name));
        return {
            file: e.name,
            meta: parsed.meta
        }
    });

    // Build inject trees
    if (debug) console.group("\nBuilding inject tree...");
    mdSrcMeta.forEach(src => {
        // JS injects
        if (src.meta["mkp-inject-js"]) {
            src.meta["mkp-inject-js"].forEach((injectFile: string) => {
                if (!jsInjects[injectFile])
                    jsInjects[injectFile] = [];
                jsInjects[injectFile].push(src.file);
            })
        }
        if (src.meta["mkp-inject-global-js"]) {
            src.meta["mkp-inject-global-js"].forEach((injectFile: string) => {
                if (!(injectFile in jsGlobalInjects))
                    jsGlobalInjects.push(injectFile);
            })
        }

        // CSS injects
        if (src.meta["mkp-inject-css"]) {
            src.meta["mkp-inject-css"].forEach((injectFile: string) => {
                if (!cssInjects[injectFile])
                    cssInjects[injectFile] = [];
                cssInjects[injectFile].push(src.file);
            })
        }
        if (src.meta["mkp-inject-global-css"]) {
            src.meta["mkp-inject-global-css"].forEach((injectFile: string) => {
                if (!(injectFile in cssGlobalInjects))
                    cssGlobalInjects.push(injectFile);
            })
        }

    });

    if (debug) {
        console.log("JS Injects:");
        console.log(jsInjects);
        console.log("JS Global Injects:");
        console.log(jsGlobalInjects);
        console.log("CSS Injects:");
        console.log(cssInjects);
        console.log("CSS Global Injects:");
        console.log(cssGlobalInjects);
        console.groupEnd();
        console.log("Built inject tree!");
    }

    // Test for missing files in index tree
    

    // Compile to html
    for (let mdSrcFile of mdSrcFiles) {
        const content = Deno.readTextFileSync(mdSrcFile.name);
        const htmlContent = compileFile(content, { jsInjects, jsGlobalInjects, cssInjects, cssGlobalInjects });
        
        // Build out path.
        const relativeP = mdSrcFile.name.replace(rootDir, "");
        const outP = path.parse(path.join(buildDir, relativeP));
        ensureDirSync(outP.dir);
        //console.log(`${path.basename(outPath).split(".")[0]}.html`);
        const outFName = `${path.parse(mdSrcFile.name).name}.html`;
        const outF = path.join(outP.dir, outFName);
        
        Deno.writeTextFileSync(outF, htmlContent, { create: true, append: false });
        
    }

    //compile.succeed("Compiled");
}

export function compileFile(markdown: string, injects: { jsInjects: any, jsGlobalInjects: any, cssInjects: any, cssGlobalInjects: any }) {
    let parsed = Marked.parse(markdown);
    console.log(parsed);
    return parsed.content;
    
    /*if (customCss)
        parsed.content = `<style>${customCss}</style>${parsed.content}`;
    if (customJs)
        parsed.content = `${parsed.content}<script>${customJs}</script>`;*/
}

await compile("", null, true);