import Component from "../components/Component";
import { MangaAttributes } from "./types";
import path from "path";

const url = {
    buildMangaLink( mangaName: string, component: Component): string {
        return component.WEBSITE + "/" + path.posix.join("manga", mangaName, "/");
    },
    buildLectureLink( mangaName: string, chapter: string, component: Component): string {
        return component.WEBSITE + "/" + path.posix.join("lecture-en-ligne", mangaName, chapter, "/");
    },
    /**
     * @param link link to evaluate
     * @returns manga attributes found from link
     */
    getAttributesFromLink(
        link: string
    ): MangaAttributes {
        const linkSplit = link.split("/");
        const attributes = {
            manga: linkSplit[4],
            chapter: linkSplit[5],
            // This prevents error on a /manga/ page
            page:
                linkSplit[6] === "" || linkSplit[6] === undefined
                    ? "1"
                    : linkSplit[6].replace(".html", ""),
        };
        return attributes;
    },
};

export default url;
