import { MDPublish } from "../MDPublish.ts";
import { Leaf } from "../types/tree.ts";

export async function pageLinkList(mdp: MDPublish, leaf: Leaf, markdown: string, meta: {}, ctx: any): Promise<{ markdown: string, meta: any, ctx: any }> {
    let listHtml = "";

    for (const key in mdp.tree.leafs) {
        const leaf = mdp.tree.leafs[key];
        if (mdp.tree.indexLeaf === leaf.id) {
            listHtml += `<li><a href="/${mdp.options.build.pagesDir}">${leaf.name}</a></li>\n`;
        }
        else {
            listHtml += `<li><a href="${leaf.path}">${leaf.name}</a></li>\n`;
        }
    }

    const outHtml = `
        <ul>
            ${listHtml}
        </ul>`
    
    ctx["mdp"]["plugins"]["pageLinkList"] = {
        html: outHtml
    };

    return {
        markdown,
        meta,
        ctx
    }
}