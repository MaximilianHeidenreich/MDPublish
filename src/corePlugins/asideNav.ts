import { MDPublish } from "../MDPublish.ts";
import { Leaf } from "../types/tree.ts";

export function asideNav(mdp: MDPublish, leaf: Leaf, content: string, meta: {}, ctx: any): { content: string, meta: any, ctx: any } {
    
    let listHtml = "";

    for (const key in mdp.leafTree.leafs) {
        const leaf = mdp.leafTree.leafs[key];
        listHtml += `<li><a href="${leaf.path}">${leaf.name}</a></li>\n`;
    }

    const outHtml = `
        <ul>
            ${listHtml}
        </ul>`
    
    ctx["plugin_asideNav_html"] = outHtml;

    return {
        content,
        meta,
        ctx
    }
}