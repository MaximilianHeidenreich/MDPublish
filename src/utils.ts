import { path } from "../deps.ts";

export function readDirRecursive(src: string): Deno.DirEntry[] {
    let entries: Deno.DirEntry[] = [];
    
    // TODO: Make async?
    for (let e of Deno.readDirSync(src)) {
        if (e.isDirectory)
            entries = entries.concat(readDirRecursive(path.join(src, e.name)));
        else {
            e.name= path.join(src, e.name);
            entries.push(e);
        }
    }
    return entries;
}