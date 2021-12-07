import path from "path";

class MangaAttributes {
    manga: string;
    chapter: string;
    page: string;
    constructor(
        manga: string,
        chapter?: string | number,
        page?: string | number,
    ) {
        this.manga = manga;
        this.chapter = chapter?.toString() ?? "0";
        this.page = page?.toString() ?? "0";
    }
    static fromLink(
        link: string
    ): MangaAttributes {
        const linkSplit = link.split("/");
        const manga = linkSplit[4];
        const chapter = linkSplit[5];
        let page = linkSplit[6];
        page = (!page) ? "1" : page.replace(".html", "");
        return new MangaAttributes(manga, chapter, page);
    }

    getLectureLink(website: string): string {
        return website + "/" + path.posix.join("lecture-en-ligne", this.manga, this.chapter, "/");
    }

    getMangaLink(website: string): string {
        return website + "/" + path.posix.join("manga", this.manga, "/");
    }

    getPath(outputDirectory: string): string {
        return `${outputDirectory}/${this.manga}/${this.chapter}/`;
    }

    getFilename(format: "jpg" | "png"): string {
        return `${this.chapter}_${this.page}.${format}`;
    }
}

export default MangaAttributes;