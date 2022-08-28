import { MDPOptions, defaultOptions } from "./types/mdpoptions.ts";
import { Marked, path, ensureDirSync, Scrypt, nunjucks } from "../deps.ts";
import { cyrb53, readDirRecursive } from "./utils.ts";
import { Asset, Leaf, Tree } from "./types/tree.ts";
import { hookCompileAssets, hookParseMarkdown, hookRenderLeaf, hookWriteAssets, hookWriteLeaf } from "./types/hooks.ts";
import { wikilinks } from "./corePlugins/wikilinks.ts";
import { pageLinkList } from "./corePlugins/pageLinkList.ts";


export class MDPublish {

    options: MDPOptions;

    tree: Tree;

    hooks: {
        parseMarkdown: hookParseMarkdown,
        compileAssets: hookCompileAssets,
        writeAssets: hookWriteAssets,
        renderLeaf: hookRenderLeaf,
        writeLeaf: hookWriteLeaf,
    } = {
        parseMarkdown: this.parseMarkdown,
        compileAssets: this.compileAssets,
        writeAssets: this.writeAssets,
        renderLeaf: this.renderLeaf,
        writeLeaf: this.writeLeaf,
    }

    plugins: {
        renderLeafPlugins: ((mdp: MDPublish, leaf: Leaf, markdown: string, meta: any, ctx: any) => Promise<{ markdown: string, meta: any, ctx: any }>)[];
    } = {
        renderLeafPlugins: [
            wikilinks,
            pageLinkList
        ]
    }


    // ===================== STATE

    constructor(options?: MDPOptions) {
        this.options = options || defaultOptions;
        this.options.build.srcDir = options?.build.srcDir || Deno.cwd();
        this.options.build.outDir = options?.build.outDir || path.resolve(Deno.cwd(), ".mdp/build");

        this.tree = {
            assets: {},
            indexLeaf: "",
            leafs: {}
        }
    }

    /**
     * Wrap function to only run if debug is enabled.
     * @param f Function to execute when debug is enabled.
     */
    private debug(f: () => void) {
        if (this.options.debug) f();
    }

    // ===================== CONFIGURATION

    /*src(srcDir: string) {
        this.options.build.srcDir = srcDir;
        return this;
    }
    out(outDir: string) {
        this.options.build.outDir = outDir;
        return this;
    }*/

    // ===================== HOOKS

    parseMarkdown(text: string, options?: Marked.MarkedOptions): { content: string, meta: any } {
        const { content, meta } = Marked.Marked.parse(text, options);
        return {
            content,
            meta
        }
    }

    // ===================== COMPILATION

    compileAssets(mdp: MDPublish) {
        console.time("compileAssets");
        // Global CSS/JS
        mdp.options.compile.globalCss.forEach(src => {
            const id = `${cyrb53(src)}`;
            const isRemote = (src.startsWith("http://") || src.startsWith("https://"));
            const outPath = path.join(mdp.options.build.outDir, path.join(mdp.options.build.assetsDir, `css/${id}.css`));
            const asset: Asset = {
                id,
                type: mdp.options.compile.inlineCss ? "inline-css" : (isRemote ? "remote" : "local"),
                src,
                outPath,
                path: outPath.replaceAll(mdp.options.build.outDir, "")
            }
            mdp.tree.assets[id] = asset;
        });
        mdp.options.compile.globalJs.forEach(src => {
            const id = `${cyrb53(src)}`;
            const isRemote = (src.startsWith("http://") || src.startsWith("https://"));
            const outPath = path.join(mdp.options.build.outDir, path.join(mdp.options.build.assetsDir, `css/${id}.js`));
            const asset: Asset = {
                id,
                type: mdp.options.compile.inlineCss ? "inline-js" : (isRemote ? "remote" : "local"),
                src,
                outPath,
                path: outPath.replaceAll(mdp.options.build.outDir, "")
            }
            mdp.tree.assets[id] = asset;
        });

        // Extract all unique assets from leafs.
        for (const key in mdp.tree.leafs) {
            const leaf = mdp.tree.leafs[key];
            // TODO: IMPLEMENT
        }

        mdp.debug(() => console.log("Assets:", mdp.tree.assets))
        console.timeEnd("compileAssets");
    }

    async compile(srcDir?: string, outDir?: string) {
        console.time("compile");
        srcDir && (this.options.build.srcDir = srcDir);
        outDir && (this.options.build.outDir = outDir);

        // Setup dir environmet
        try {
            Deno.lstatSync(this.options.build.outDir);
            Deno.removeSync(this.options.build.outDir, { recursive: true });
        } catch {}
        ensureDirSync(this.options.build.outDir);

        if (!Deno.lstatSync(this.options.build.srcDir).isDirectory)
            throw new Error(`Source dir: ${this.options.build.srcDir} is not a directory!`);

        const srcFiles = readDirRecursive(this.options.build.srcDir).filter(e => e.isFile && e.name.toLowerCase().endsWith(".md"));
        srcFiles.forEach(srcFile => {
            this.debug(() => { console.time(`process (${srcFile.name})`); });
            const { meta } = this.hooks.parseMarkdown(Deno.readTextFileSync(srcFile.name));
            if (!meta["mdp-publish"]) return;
            const id = `${cyrb53(srcFile.name)}`;

            // Index
            if (meta["mdp-index"]) {
                if (this.tree.indexLeaf) throw new Error(`Only one index allowed! File @ ${srcFile.name} redefines index (mdp-index)!`);
                this.tree.indexLeaf = id;
            }

            // Template
            if (meta["mdp-global-template"]) {
                if (this.options.compile.globalTemplate) throw new Error(`Only one global template allowed! File @ ${srcFile.name} redefines template!`);
                this.options.compile.globalTemplate = meta["mdp-global-template"];
            }
            let localTemplate: string | undefined = undefined;
            if (meta["mdp-template"]) {
                localTemplate = meta["mdp-template"];
            }

            // Injects
            if (meta["mdp-global-js"]) {
                meta["mdp-global-js"].forEach((injectSrc: string) => {
                    if (!(injectSrc in this.options.compile.globalJs))
                        this.options.compile.globalJs.push(injectSrc);
                })
            }
            if (meta["mdp-global-css"]) {
                meta["mdp-global-css"].forEach((injectSrc: string) => {
                    if (!(injectSrc in this.options.compile.globalCss))
                        this.options.compile.globalCss.push(injectSrc);
                })
            }
            const localJs: string[] = [];  // File srcPath to js linked into this page
            if (meta["mdp-js"]) {
                meta["mdp-js"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in localJs))
                        localJs.push(injectSrcFile);
                })
            }
            const localCss: string[] = [];  // File srcPath to css linked into this page
            if (meta["mdp-css"]) {
                meta["mdp-css"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in localCss))
                        localCss.push(injectSrcFile);
                })
            }

            // Protection
            let password = meta["mdp-protected"];
            if (password) password = Scrypt.hash(password);//, { salt: this.hashSalt });

            this.tree.leafs[id] = {
                id,
                name: path.parse(srcFile.name).name,
                srcFile: srcFile.name,
                path: `/${this.options.build.pagesDir}/${id}`, //path.join(path.parse(srcFile.name.replace(this.options.build.srcDir, "")).dir, path.parse(srcFile.name).name),
                meta,
                protected: password,
                localTemplate: localTemplate,
                localCss: localCss,
                localJs: localJs
            }

            this.debug(() => console.timeEnd(`process (${srcFile.name})`));
        });

        this.debug(() => console.log("Tree: ", this.tree.leafs));
        this.debug(() => console.log("Global Template:", this.options.compile.globalTemplate));
        this.debug(() => console.log("Global CSS:", this.options.compile.globalCss));
        this.debug(() => console.log("Global Js:", this.options.compile.globalJs));

        // Handle assets
        this.hooks.compileAssets(this);
        
        console.timeEnd("compile");
        return this;
    }

    // ===================== BUILD

    async writeAssets(mdp: MDPublish) {
        for (const aID in mdp.tree.assets) {
            const asset = mdp.tree.assets[aID];

            if (asset.type === "local") {
                const buildRelativeP = asset.outPath.replace(mdp.options.build.outDir, "");
                const buildPath = path.parse(path.join(mdp.options.build.outDir, buildRelativeP));
                ensureDirSync(buildPath.dir);
                Deno.copyFileSync(asset.src, asset.outPath);
            }
            else if (asset.type === "remote") {
                const buildRelativeP = asset.outPath.replace(mdp.options.build.outDir, "");
                const buildPath = path.parse(path.join(mdp.options.build.outDir, buildRelativeP));
                ensureDirSync(buildPath.dir);
                const data = await fetch(asset.src).then(res => res.text());
                Deno.writeTextFileSync(asset.outPath, data, { create: true, append: false });
            }
        }
    }

    async renderLeaf(mdp: MDPublish, leaf: Leaf) {
        const fileContent = Deno.readTextFileSync(leaf.srcFile);

        // Context which is inserted into template.
        // Can be modified by plugins
        let ctx: { [key: string]: any } = {
            mdp: {
                plugins: {}
            }
        }

        // Markdown content, will be passed through plugins.
        let markdown = fileContent;

        // Markdown meta, will be passed through plugins.
        let meta = leaf.meta;

        // Call renderLeafPlugins -> modify markdown, meta, ctx
        for (const pl of mdp.plugins.renderLeafPlugins) {
            const res = await pl(mdp, leaf, markdown, meta, ctx);
            markdown = res.markdown;
            meta = res.meta;
            ctx = res.ctx;
        }
        ctx["meta"] = meta;     // Expose meta to template
        
        // Create CSS injects. TODO: local
        let cssInjectsHtml = "";
        
        await mdp.options.compile.globalCss.forEach(async src => {
            for (const key in mdp.tree.assets) {
                const asset = mdp.tree.assets[key];
                if (asset.src === src) {
                    if (asset.type === "inline-css") {
                        let data;
                        if (asset.src.startsWith("http:") || asset.src.startsWith("https:")) data = await fetch(asset.src).then(res => res.text());
                        else data = Deno.readTextFileSync(asset.src);
                        cssInjectsHtml += `<style>${data}</style>`;
                    }
                    else cssInjectsHtml += `<link rel="stylesheet" href="/assets/css/${asset.id}.css">\n`;
                }
            }
        });
        ctx["mdp_css_injects"] = cssInjectsHtml;

        // Create JS injects. TODO: local
        let jsInjectsHtml = "";
        await mdp.options.compile.globalJs.forEach(async src => {
            for (const key in mdp.tree.assets) {
                const asset = mdp.tree.assets[key];
                if (asset.src === src) {
                    if (asset.type === "inline-js") {
                        let data;
                        if (asset.src.startsWith("http:") || asset.src.startsWith("https:")) data = await fetch(asset.src).then(res => res.text());
                        else data = Deno.readTextFileSync(asset.src);
                        jsInjectsHtml += `<script>${data}</script>`;
                    }
                    else jsInjectsHtml += `<script src="/assets/js/${asset.id}.js"></script>\n`; // TODO: deferr / async?
                }
            }
        });
        ctx["mdp_js_injects"] = jsInjectsHtml;

        // Render final markdown
        const htmlContent = mdp.hooks.parseMarkdown(markdown).content; //TODO: Options?

        // Get template
        let template: any;
        if (leaf.localTemplate) {
            // Load from url
            if (leaf.localTemplate.startsWith("http://") || leaf.localTemplate.startsWith("https://")) {
                const data = await fetch(leaf.localTemplate).then(res => res.text());
                template = new nunjucks.default.Template(data); // TODO: Hook
            }
            // Load from file
            else {
                template = new nunjucks.default.Template(Deno.readTextFileSync(leaf.localTemplate));
            }
        }
        else if (mdp.options.compile.globalTemplate) {
            // Load from url
            if (mdp.options.compile.globalTemplate.startsWith("http://") || mdp.options.compile.globalTemplate.startsWith("https://")) {
                const data = await fetch(mdp.options.compile.globalTemplate).then(res => res.text());
                template = new nunjucks.default.Template(data);
            }
            // Load global template from file
            else {
                template = new nunjucks.default.Template(Deno.readTextFileSync(mdp.options.compile.globalTemplate));
            }
        }

        ctx["page_content"] = htmlContent;
        let fullHtml = "";
        template && (fullHtml = template.render(ctx));
        !template && (fullHtml = nunjucks.default.renderString(htmlContent, ctx))

        return fullHtml;
    }

    async writeLeaf(mdp: MDPublish, leaf: Leaf, leafHtml: string) {
        const relativePath = leaf.srcFile.replace(mdp.options.build.srcDir, "");
        //const buildOutPath = path.parse(path.join(mdp.options.build.outDir, relativePath));
        //ensureDirSync(buildOutPath.dir);
        //const outFName = `${leaf.name}.html`;
        
        const buildOutPath = path.join(mdp.options.build.outDir, mdp.options.build.pagesDir);
        const outFName = leaf.id === mdp.tree.indexLeaf ? "index.html" : `${leaf.id}.html`;
        const outFPath = path.join(buildOutPath, outFName);
        ensureDirSync(buildOutPath);
        Deno.writeTextFileSync(outFPath, leafHtml, { create: true, append: false });
    }

    async createRoot(mdp: MDPublish) {
        let template: any;
        // Load from url
        if (!mdp.options.debug) {
            const data = await fetch("").then(res => res.text()); // TODO: FINAL URL  // TODO: Make option
            template = new nunjucks.default.Template(data); // TODO: Hook
        }
        // Load from file
        else {
            template = new nunjucks.default.Template(Deno.readTextFileSync("/Volumes/T7/Mac Mini/Programming/MDPublish/src/coreTemplates/rootIndex.html")); // TODO: Prod ready maken
        }
        const ctx = {
            mdp_options: mdp.options    // TODO: Env vars?
        }
        const rootIndexHtml = template.render(ctx);
        const outFPath = path.join(mdp.options.build.outDir, "index.html");
        Deno.writeTextFileSync(outFPath, rootIndexHtml, { create: true, append: false });
    }

    async build() {
        console.time("build");

        // Handle assets
        await this.hooks.writeAssets(this)

        // Render leafs
        for (let key in this.tree.leafs) {
            const leaf = this.tree.leafs[key];
            const leafHtml = await this.hooks.renderLeaf(this, leaf);
            await this.hooks.writeLeaf(this, leaf, leafHtml);
        }

        // Create root index.html
        await this.createRoot(this); // TODO: hook

        console.timeEnd("build");
    }

}