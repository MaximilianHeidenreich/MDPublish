import { MDPublish } from "../MDPublish.ts";
import { Leaf } from "../types/tree.ts";

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

export function wikilinks(mdp: MDPublish, leaf: Leaf, content: string, meta: {}, ctx: {}): { content: string, meta: any, ctx: any } {
    //const wlRegex = "(?:(?:(?:<([^ ]+)(?:.*)>)\[\[(?:<\/\1>))|(?:\[\[))(?:(?:(?:<([^ ]+)(?:.*)>)(.+?)(?:<\/\2>))|(.+?))(?:(?:(?:<([^ ]+)(?:.*)>)\]\](?:<\/\5>))|(?:\]\]))";
    const wlRegex = /\[\[.*?\]\]/g;

    for (const match of content.matchAll(wlRegex)) {
        const name = match[0].substring(2, match[0].length - 2);

        // Find leaf with name
        let targetLeaf: Leaf | undefined;
        for (const key in mdp.leafTree.leafs) {
            const l = mdp.leafTree.leafs[key];
            if (l.name === name) {
                targetLeaf = l;
                break;
            }
        }

        if (targetLeaf) {
            const out = `[${name}](${targetLeaf?.path})`
            content = content.replaceAll(match[0], out);
        }
        else {
            // TODO: Print warning
        }
    }
    
    
    //const rex = new RegExp(wlRegex, "g");
    //var match = rex.exec(content);

    //if (match) {
    //    console.log(match);
        
    //}

    return {
        content,
        meta,
        ctx
    }
}