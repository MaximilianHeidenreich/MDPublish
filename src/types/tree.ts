import { path } from "../../deps.ts";

export interface Asset {
    id: string;                 // Generated UUID
    type: "local" | "remote" | "inline-css" | "inline-js";   // Whether the asset is local file or needs to be downloaded
    src: string;                // Path to the asset
    outPath: string;            // Path to the asset after build
    path: string;               // Relative path to build out folder.
}

/**
 * A single leaf (page based on a md file).
 */
export interface Leaf {
    id: string;                 // Hash of name
    name: string;               // File name (no extension)
    srcFile: string;            // Absolute source file path
    path: string;               // Relative path to leaf (e.g. /folder1/page1)
    meta: {};                   // Meta frontmatter data from the md file

    /** Contains the password hash if page was defined as protected. undefined if not */
    protected?: string;

    /**
     * List of js code to inject into the page.
     * Each entry will be injected as the body of a script tag.
     */
    localJs: string[];

    /**
     * List of css code to inject into the page.
     * Each entry will be injected as the body of a style tag. // TODO: Collect unique sytles -> Put into files -> Allow caching & reduce out html size
     */
    localCss: string[];

    /**
     * Local path to template html file (relative to configured templateDir).
     * Overrides global template if set.
     */
    localTemplate?: string;

}

export interface Tree { // Not really a tree.. but who cares anyway?

    /**
     * All assets to be included in build.
     */
    assets: { [key: string]: Asset };

    /**
     * A leaf id that acts as a custom index.html file.
     * Can be set using `mdp-index: true` in the frontmatter of a md file.
     * Default: Display core index template.
     */
    indexLeaf: string | null;

    /**
     * All leafs by hash id.
     */
    leafs: { [key: string]: Leaf };

}