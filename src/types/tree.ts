import { path } from "../../deps.ts";

export interface Asset {
    id: string;                 // Generated UUID
    type: "local" | "remote";  // Whether the asset is local file or needs to be downloaded
    path: string;               // Path to the asset
    buildPath: string;          // Path to the asset after build
}

/**
 * A single leaf (page based on a md file).
 */
export interface Leaf {
    id: string;                 // Generared UUID
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

export interface LeafTree {

    /**
     * List of file paths to asset files to include in build.
     */
    assets: { [key: string]: Asset };

    indexLeaf: string | null;

    /**
     * List of leafs (pages).
     * (key is Leaf id)
     */
    leafs: { [key: string]: Leaf };

}