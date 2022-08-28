import { MDPublish } from "../MDPublish.ts";
import { Leaf } from "./tree.ts";

export interface hookParseMarkdown {
    (text: string, options?: any): { content: string, meta: any };
}

export interface hookCompileAssets {
    (mdp: MDPublish): void;
}

export interface hookWriteAssets {
    (mdp: MDPublish): Promise<void>;
}

export interface hookRenderLeaf {
    (mdp: MDPublish, leaf: Leaf): Promise<string>;
}

export interface hookWriteLeaf {
    (mdp: MDPublish, leaf: Leaf, leafHtml: string): Promise<void>;
}