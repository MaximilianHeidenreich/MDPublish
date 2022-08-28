export interface MDPOptions {

    /**
     * Whether to print debug information.
     */
    debug: boolean;

    // hashSalt: string

    render: {

    }

    compile: {
        /**
         * Inlines css sources instead of linking them.
         */
        inlineCss: boolean;

        /**
         * Inlines js sources instead of linking them.
         */
        inlineJs: boolean;
        
        /**
         * Whether to download sources from url and link as local file.
         */
        pullRemoteInjects: boolean;

        /**
         * Source of global template.
         * Can be local filepath or remote URL.
         */
        globalTemplate?: string;

        /**
         * Source of fallback index template.
         */
        indexTemplate: string;

        /**
         * Sources of global css injects.
         */
        globalCss: string[];

        /**
         * Sources of global css injects.
         */
        globalJs: string[];
    }

    build: {
        /**
         * Path to src directory.
         * All md files inside will be processed.
         */
        srcDir: string;

        /**
         * Path to output directory.
         * Will be created if not exists.
         * Default: ".mdp/build"
         * e.g. "your/project/build"
         */
        outDir: string;

        /**
         * Relative path to the assets dir inside outDir.
         * Default: "assets" (".mdp/build/assets")
         */
        assetsDir: string;

        /**
         * Relative path to the pages dir iside outDir.
         * Default: "pages" (".mdp/build/pages")
         */
        pagesDir: string;

        /**
         * Define custom headers: headers["path"]["header"] = value
         * e.g.
         * - headers["index.html"]["Cache-Control"] = "max-age=3600"
         * - headers["static/*"]["X-Robots-Tag"] = "nosnippet"
         */
        headers: { [key: string]: { [key: string]: string } };
    }

}

export const defaultOptions: MDPOptions = {
    debug: false,
    render: {},
    compile: {
        inlineCss: false,
        inlineJs: false,
        pullRemoteInjects: false,
        globalTemplate: "",
        indexTemplate: "/Volumes/T7/Mac Mini/Programming/MDPublish/src/coreTemplates/index.html", // TODO -> Point to GITHUB
        globalCss: [],  // TODO -> POint to git default style
        globalJs: []
    },
    build: {
        srcDir: ".",
        outDir: ".mdp/build",
        assetsDir: "assets",
        pagesDir: "pages",
        headers: {}
    }
}