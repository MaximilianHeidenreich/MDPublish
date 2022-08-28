import { Marked, path, Scrypt, nunjucks, ensureDirSync } from "../deps.ts";
import { LeafTree, Leaf } from "./types/tree.ts";
import { readDirRecursive } from "./utils.ts";

import { wikilinks } from "./corePlugins/wikilinks.ts";

// TODO: Move
export interface renderLeafPlugin {
    (mdp: MDPublish, leaf: Leaf, content: string, meta: {}): { content: string, meta: any }
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
        renderLeafPlugins: [ wikilinks ],
    }

    hashSalt: string;

    leafTree: LeafTree;

    // State
    //srcDir: string;
    //outDir: string;
    globalTemplateSrcFile?: string;   // Template to render all pages


    constructor() {
        this.templatesDir = Deno.cwd(); // TODO: Default to .mdp/templates
        this.jsDir = Deno.cwd(); // TODO: Default to .mdp/assets/js
        this.cssDir = Deno.cwd(); // TODO: Default to .mdp/assets/css
        this.headers = {};
        this.hashSalt = ""; // TODO: impl

        this.leafTree = {
            assets: [],
            indexLeaf: null,
            leafs: {}
        };

        //this.srcDir = Deno.cwd();
        ///this.outDir = path.resolve(Deno.cwd(), ".mdp/build");
    }

    public async renderLeaf(leaf: Leaf): Promise<string> {
        let fContent = Deno.readTextFileSync(leaf.srcFile);
        Marked.Marked.setOptions(this.markedOption);
        ////@ts-ignore
        //Marked.setOptions()
        //Marked.Marked.use({ extensions: [ wikilinks ] });
        let { meta } = Marked.Marked.parse(fContent);

        this.plugins.renderLeafPlugins.forEach(plugin => { const res = plugin(this, leaf, fContent, meta); fContent = res.content; meta = res.meta; });

        const { content } = Marked.Marked.parse(fContent);

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
        else if (this.globalTemplateSrcFile) {
            // Load from url
            if (this.globalTemplateSrcFile.startsWith("http://") || this.globalTemplateSrcFile.startsWith("https://")) {
                const data = await fetch(this.globalTemplateSrcFile).then(res => res.text());
                template = new nunjucks.default.Template(data);
            }
            // Load from file
            else {
                template = new nunjucks.default.Template(Deno.readTextFileSync(this.globalTemplateSrcFile));
            }
        }
        let renderedHtml = "";
        template && (renderedHtml = template.render({ content, meta }));
        !template && (renderedHtml = nunjucks.default.renderString(content, { meta }))

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

        this.hooks.preCompile(this, src, out);

        const srcPath = path.parse(src);
        const outPath = path.parse(out);

        const globalJsSrcFiles: path.ParsedPath[] = [];  // File srcPath to js linked into all pages
        const globalCssSrcFiles: path.ParsedPath[] = []; // File srcPath to css linked into all pages

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
                if (this.globalTemplateSrcFile) throw new Error(`Only one global template allowed! File @ ${srcFile.name} redefines template!`);
                this.globalTemplateSrcFile = meta["mdp-global-template"];
            }
            let localTemplate: string | undefined = undefined;
            if (meta["mdp-template"]) {
                localTemplate = meta["mdp-template"];
            }

            // Injects
            if (meta["mdp-global-js"]) {
                meta["mdp-global-js"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in globalJsSrcFiles))
                        globalJsSrcFiles.push(path.parse(injectSrcFile));
                })
            }
            if (meta["mdp-global-css"]) {
                meta["mdp-global-css"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in globalCssSrcFiles))
                        globalCssSrcFiles.push(path.parse(injectSrcFile));
                })
            }
            const localJsSrcFiles: path.ParsedPath[] = [];  // File srcPath to js linked into this page
            if (meta["mdp-js"]) {
                meta["mdp-js"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in localJsSrcFiles))
                        localJsSrcFiles.push(path.parse(injectSrcFile));
                })
            }
            const localCssSrcFiles: path.ParsedPath[] = [];  // File srcPath to css linked into this page
            if (meta["mdp-css"]) {
                meta["mdp-css"].forEach((injectSrcFile: string) => {
                    if (!(injectSrcFile in localCssSrcFiles))
                        localCssSrcFiles.push(path.parse(injectSrcFile));
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
                protected: password,
                localJs: localJsSrcFiles,
                localCss: localCssSrcFiles,
                localTemplate: localTemplate
            };
        });

        console.log(this.leafTree);

        for (let key in this.leafTree.leafs) {
            const leaf = this.leafTree.leafs[key];
            const leafHtml = await this.renderLeaf(leaf);
            this.writeLeaf(leaf, leafHtml, src, out);
        }
        
        this.hooks.postCompile(this, src, out);
    }

}