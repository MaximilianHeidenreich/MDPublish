import { MDPublish } from "../MDPublish.ts";
import { Leaf } from "../types/tree.ts";

export async function wikilinks(mdp: MDPublish, leaf: Leaf, markdown: string, meta: {}, ctx: {}): Promise<{ markdown: string, meta: any, ctx: any }> {
    const wlRegex = /\[\[.*?\]\]/g;

    for (const match of markdown.matchAll(wlRegex)) {
        const name = match[0].substring(2, match[0].length - 2);

        // Find leaf with name
        let targetLeaf: Leaf | undefined;
        for (const key in mdp.tree.leafs) {
            const l = mdp.tree.leafs[key];
            if (l.name === name) {
                targetLeaf = l;
                break;
            }
        }

        if (targetLeaf) {
            const out = `[${name}](/${mdp.options.build.pagesDir}/${targetLeaf?.id})`
            markdown = markdown.replaceAll(match[0], out);
        }
        else {
            // TODO: Print warning
            console.log(`[Plugin :: Wikilinks] Leaf '${name}' not found!`);
            
        }

        
    }
    
    
    //const rex = new RegExp(wlRegex, "g");
    //var match = rex.exec(content);

    //if (match) {
    //    console.log(match);
        
    //}

    return {
        markdown,
        meta,
        ctx
    }
}

/*export const wikilinks = {
    name: "wikilink",
    level: "inline",

    start(src: any) { return src.match(/\[/)?.index; },

    //@ts-ignore
    tokenizer(src: any, tokens: any) {
        const rule = /\[\[.*?\]\]/g;
        const match = rule.exec(src);
        if (match) {
            return {
                type: "wikilink",
                raw: match[0],
                //dt: this.lexer.inlineTokens(match[1].trim()),
                //dd: this.lexer.inlineTokens(match[2].trim())
            };
        }
    },

    //@ts-ignore
    renderer(token: any) {
        //@ts-ignore
        return `\n<dt>${this.parser.parseInline(token.dt)}</dt><dd>${this.parser.parseInline(token.dd)}</dd>`;
    },
    childTokens: ['dt', 'dd'],

}*/