import path from "path";
import { toNDigits } from "./utils/digits";
import { WEBSITE } from "./utils/variables";

class MangaAttributes {
  manga: string;
  chapter: string;
  page: string;
  constructor(
    manga: string,
    chapter?: string | number,
    page?: string | number
  ) {
    this.manga = manga;
    this.chapter = chapter?.toString() ?? "0";
    this.page = page?.toString() ?? "0";
  }
  public static fromLink(link: string): MangaAttributes {
    const linkSplit = link.split("/");
    const manga = linkSplit[4];
    const chapter = linkSplit[5];
    let page = linkSplit[6];
    page = !page ? "1" : page.replace(".html", "");
    return new MangaAttributes(manga, chapter, page);
  }

  public getLectureLink(): string {
    return (
      WEBSITE +
      "/" +
      path.posix.join("lecture-en-ligne", this.manga, this.chapter, "/")
    );
  }

  public getMangaLink(): string {
    return WEBSITE + "/" + path.posix.join("manga", this.manga, "/");
  }

  public getFolderPath(outputDirectory: string): string {
    let folderName;
    if (this.chapter.includes("volume")) {
      const volumeNumber = this.chapter.replace("volume-", "");
      folderName = `volume-${toNDigits(volumeNumber, 3)}`;
    } else {
      folderName = toNDigits(this.chapter, 4);
    }
    return `${outputDirectory}/${this.manga}/${folderName}/`;
  }

  public getFilename(format: "jpg" | "png"): string {
    return `${toNDigits(this.chapter, 4)}_${toNDigits(this.page, 3)}.${format}`;
  }

  public getImagePath(outputDirectory: string, format: "jpg" | "png"): string {
    return path.posix.join(
      this.getFolderPath(outputDirectory),
      this.getFilename(format)
    );
  }

  public toString(): string {
    const chapterString =
      this.chapter === "0"
        ? ""
        : !this.chapter.includes("volume")
        ? `chapitre ${this.chapter}`
        : ` - ${this.chapter}`;
    const pageString = this.page === "0" ? "" : ` page ${this.page}`;
    return `${this.manga} ${chapterString}${pageString}`;
  }
}

export default MangaAttributes;
