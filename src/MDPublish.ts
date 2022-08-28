import { Marked, path, Scrypt, nunjucks, ensureDirSync } from "../deps.ts";
import { LeafTree, Leaf, Asset } from "./types/tree.ts";
import { readDirRecursive } from "./utils.ts";

import { wikilinks } from "./corePlugins/wikilinks.ts";
import { asideNav } from "./corePlugins/asideNav.ts";

// TODO: Move
export interface renderLeafPlugin {
    (mdp: MDPublish, leaf: Leaf, content: string, meta: {}, ctx: {}): { content: string, meta: any, ctx: any };
}

export class MDPublish {

    // Configuration
    templatesDir: string;
    jsDir: string;
    cssDir: string;

    markedOption = {
        //silent: true,
        smartLists: true,
        smartypants: true,
    };
    
    /**
     * Define custom headers: headers["path"]["header"] = value
     * e.g.
     * - headers["index.html"]["Cache-Control"] = "max-age=3600"
     * - headers["static/*"]["X-Robots-Tag"] = "nosnippet"
     */
    headers: { [key: string]: { [key: string]: string } };

    // Hooks - e.g. allow custom templating engine
    hooks = {
        renderPage: this.compile,

        preCompile: (mdp: MDPublish, src: string, out: string) => {},   // TODO: Add next() function to allow further logic
        postCompile: (mdp: MDPublish, src: string, out: string) => {},  // TODO: Add next() function to allow further logic
    }

    // Plugins
    plugins: { [key: string]: renderLeafPlugin[] } = {
        renderLeafPlugins: [ wikilinks, asideNav ],
    }

    hashSalt: string;

    leafTree: LeafTree;

    // State
    //srcDir: string;
    //outDir: string;
    globalTemplateSrc?: string;     // Template to render all pages
    globalJsSrc: string[] = [];     // JS sources to inject into all pages
    globalCssSrc: string[] = [];    // CSS sources to inject into all pages

    constructor() {
        this.templatesDir = Deno.cwd(); // TODO: Default to .mdp/templates
        this.jsDir = Deno.cwd(); // TODO: Default to .mdp/assets/js
        this.cssDir = Deno.cwd(); // TODO: Default to .mdp/assets/css
        this.headers = {};
        this.hashSalt = ""; // TODO: impl

        this.leafTree = {
            assets: {},
            indexLeaf: null,
            leafs: {}
        };

        //this.srcDir = Deno.cwd();
        ///this.outDir = path.resolve(Deno.cwd(), ".mdp/build");
    }

    public async compileAssets(lTree: LeafTree, outDir: string) {

        // Global JS/CSS
        this.globalJsSrc.forEach(src => {
            const id = crypto.randomUUID();
            const isRemote = (src.startsWith("http://") || src.startsWith("https://"));
            const buildPath = path.join(outDir, `assets/js/${id}.js`);
            const asset: Asset = {
                id,
                type: isRemote ? "remote" : "local",
                path: src,
                buildPath
            }
            lTree.assets[id] = asset;
        });
        this.globalCssSrc.forEach(src => {
            const id = crypto.randomUUID();
            const isRemote = (src.startsWith("http://") || src.startsWith("https://"));
            const buildPath = path.join(outDir, `assets/css/${id}.css`);
            const asset: Asset = {
                id,
                type: isRemote ? "remote" : "local",
                path: src,
                buildPath
            }
            lTree.assets[id] = asset;
        });

        console.log(lTree.assets);
        

        // Extract all unique assets from leafs.
        for (const key in lTree.leafs) {
            const leaf = lTree.leafs[key];



        }

    }

    public async writeAssets(assets: { [key: string]: Asset }, outDir: string) {
        for (const key in assets) {
            const asset = assets[key];

            if (asset.type == "local") {
                const buildRelativeP = asset.buildPath.replace(outDir, "");
                const buildPath = path.parse(path.join(outDir, buildRelativeP));
                ensureDirSync(buildPath.dir);
                Deno.copyFileSync(asset.path, asset.buildPath);
            }
            else {
                const data = await fetch(asset.path).then(res => res.text());
                ensureDirSync(path.parse(asset.buildPath).dir);
                Deno.writeTextFileSync(asset.buildPath, data, { create: true, append: false });
            }

        };
    }

    public async renderLeaf(leaf: Leaf, assets: { [key: string]: Asset }): Promise<string> {
        let fContent = Deno.readTextFileSync(leaf.srcFile);
        Marked.Marked.setOptions(this.markedOption);
        //Marked.setOptions()
        //Marked.Marked.use({ extensions: [ wikilinks ] });
        let { meta } = Marked.Marked.parse(fContent);
        let ctx: { [key: string]: any } = {};

        this.plugins.renderLeafPlugins.forEach(plugin => { const res = plugin(this, leaf, fContent, meta, ctx); fContent = res.content; meta = res.meta, ctx = res.ctx; });

        const { content } = Marked.Marked.parse(fContent);

        // Create CSS injects.
        let cssInjectsHtml = "";
        this.globalCssSrc.forEach(src => {
            for (const key in assets) {
                const asset = assets[key];
                if (asset.path === src) {
                    cssInjectsHtml += `<link rel="stylesheet" href="/assets/css/${asset.id}.css">\n`;
                }
            }
        });
        ctx["mdp_css_injects"] = cssInjectsHtml;

        // Create JS injects.
        let jsInjectsHtml = "";
        this.globalJsSrc.forEach(src => {
            for (const key in assets) {
                const asset = assets[key];
                if (asset.path === src) {
                    jsInjectsHtml += `<script src="/assets/js/${asset.id}.js"></script>\n`; // TODO: deferr / async?
                }
            }
        });
        ctx["mdp_js_injects"] = jsInjectsHtml;

        let template: any;
        if (leaf.localTemplate) {
            // Load from url
            if (leaf.localTemplate.startsWith("http://") || leaf.localTemplate.startsWith("https://")) {
                const data = await fetch(leaf.localTemplate).then(res => res.text());
                template = new nunjucks.default.Template(data);
            }
            // Load from file
            else {
                template = new nunjucks.default.Template(Deno.readTextFileSync(leaf.localTemplate));
            }
        }
        else if (this.globalTemplateSrc) {
            // Load from url
            if (this.globalTemplateSrc.startsWith("http://") || this.globalTemplateSrc.startsWith("https://")) {
                const data = await fetch(this.globalTemplateSrc).then(res => res.text());
                template = new nunjucks.default.Template(data);
            }
            // Load from file
            else {
                template = new nunjucks.default.Template(Deno.readTextFileSync(this.globalTemplateSrc));
            }
        }
        ctx["content"] = content;
        let renderedHtml = "";
        template && (renderedHtml = template.render(ctx));
        !template && (renderedHtml = nunjucks.default.renderString(content, ctx))

        return renderedHtml;
    }

    public async writeLeaf(leaf: Leaf, renderedHtml: string, srcDir: string, outDir: string) {
        // Build out path.
        const relativePath = leaf.srcFile.replace(srcDir, "");
        const buildOutPath = path.parse(path.join(outDir, relativePath));
        
        ensureDirSync(buildOutPath.dir);
        const outFName = `${leaf.name}.html`;
        const outFPath = path.join(buildOutPath.dir, outFName);

        Deno.writeTextFileSync(outFPath, renderedHtml, { create: true, append: false });
    }

    public async compile(src?: string, out?: string) {
        src || (src = Deno.cwd());
        out || (out = path.resolve(Deno.cwd(), ".mdp/build"));

        // Clear out dir
        Deno.removeSync(out, { recursive: true });

        this.hooks.preCompile(this, src, out);

        const srcPath = path.parse(src);
        const outPath = path.parse(out);

        const globalJsSrc: string[] = [];  // File srcPath to js linked into all pages
        const globalCssSrc: string[] = []; // File srcPath to css linked into all pages

        const srcFiles = readDirRecursive(srcPath.dir).filter(e => e.isFile && e.name.toLowerCase().endsWith(".md"));
        srcFiles.forEach(srcFile => {
            const { meta } = Marked.Marked.parse(Deno.readTextFileSync(srcFile.name));
            if (!meta["mdp-publish"]) return;

            const leafID = crypto.randomUUID();

            // Index
            if (meta["mdp-index"]) {
                if (this.leafTree.indexLeaf) throw new Error(`Only one index allowed! File @ ${srcFile.name} redefines index (mdp-index)!`);
                this.leafTree.indexLeaf = leafID;
            }

            // Template
            if (meta["mdp-global-template"]) {
                if (this.globalTemplateSrc) throw new Error(`Only one global template allowed! File @ ${srcFile.name} redefines template!`);
                this.globalTemplateSrc = meta["mdp-global-template"];
            }
            let localTemplate: string | undefined = undefined;
            if (meta["mdp-template"]) {
                localTemplate = meta["mdp-template"];
            }

            // Injects
            if (meta["mdp-global-js"]) {
                meta["mdp-global-js"].forEach((injectSrc: string) => {
                    if (!(injectSrc in this.globalJsSrc))
                        this.globalJsSrc.push(injectSrc);
                })
            }
            if (meta["mdp-global-css"]) {
                meta["mdp-global-css"].forEach((injectSrc: string) => {
                    if (!(injectSrc in this.globalCssSrc))
                        this.globalCssSrc.push(injectSrc);
                })
            }
            const localJsSrcFiles: string[] = [];  // File srcPath to js linked into this page
            if (meta["mdp-js"]) {
                meta["mdp-js"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in localJsSrcFiles))
                        localJsSrcFiles.push(injectSrcFile);
                })
            }
            const localCssSrcFiles: string[] = [];  // File srcPath to css linked into this page
            if (meta["mdp-css"]) {
                meta["mdp-css"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in localCssSrcFiles))
                        localCssSrcFiles.push(injectSrcFile);
                })
            }

            // Protection
            let password = meta["mdp-protected"];
            if (password) password = Scrypt.hash(password, { salt: this.hashSalt });

            this.leafTree.leafs[leafID] = {
                id: leafID,
                name: path.parse(srcFile.name).name,
                srcFile: srcFile.name,
                path: path.join(path.parse(srcFile.name.replace(src!, "")).dir, path.parse(srcFile.name).name),
                meta,
                protected: password,
                localJs: localJsSrcFiles,
                localCss: localCssSrcFiles,
                localTemplate: localTemplate
            };
        });

        console.log(this.leafTree);

        // Compile assets.
        this.compileAssets(this.leafTree, out);
        this.writeAssets(this.leafTree.assets, out);

        for (let key in this.leafTree.leafs) {
            const leaf = this.leafTree.leafs[key];
            const leafHtml = await this.renderLeaf(leaf, this.leafTree.assets);
            this.writeLeaf(leaf, leafHtml, src, out);
        }
        
        this.hooks.postCompile(this, src, out);
    }

}