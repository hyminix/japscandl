import path from "path";
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
    return `${outputDirectory}/${this.manga}/${this.chapter}/`;
  }

  public getFilename(format: "jpg" | "png"): string {
    const DIGITS = 3;
    let addedZeros = DIGITS - this.page.length;
    // this prevents error if page has more than 3 digits
    if (addedZeros < 0) addedZeros = 0;
    const pageOn3Digits = "0".repeat(addedZeros) + this.page;
    return `${this.chapter}_${pageOn3Digits}.${format}`;
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
