import MangaAttributes from "../MangaAttributes";
import { bytesToSize, CompressStats } from "../utils/compress";
import {
  ChapterDownloadEmit,
  ChaptersDownloadEmit,
  ImageDownloadEmit,
  VolumeDownloadEmit,
  VolumesDownloadEmit,
} from "../utils/emitTypes";

class BasicTextHandler {
  static imageDownloadCallback(callback: ImageDownloadEmit): void {
    callback.on("start", (attributes: MangaAttributes, link: string) => {
      console.log(`Downloading image from ${attributes} at ${link}`);
    });
    callback.on("noimage", (attributes: MangaAttributes, link: string) => {
      console.log(`No image found for ${attributes} at ${link}`);
    });
    callback.on("done", (attributes: MangaAttributes, savePath: string) => {
      console.log(`Image of ${attributes} downloaded to ${savePath}`);
    });
  }

  static chapterDownloadCallback(callback: ChapterDownloadEmit): void {
    callback.on(
      "start",
      (attributes: MangaAttributes, link: string, pages: number) => {
        console.log(
          `Downloading chapter ${attributes} at ${link} with ${pages} pages`
        );
      }
    );
    callback.on(
      "page",
      (attributes: MangaAttributes, totalPages: number, savePath: string) => {
        console.log(
          `Downloading page ${attributes} / ${totalPages} at ${savePath}`
        );
      }
    );
    callback.on("noimage", (attributes: MangaAttributes, link: string) => {
      console.log(`No image found for ${attributes} at ${link}`);
    });
    callback.on(
      "compressing",
      (attributes: MangaAttributes, savePath: string) => {
        console.log(`Compressing ${attributes} from ${savePath}`);
      }
    );

    callback.on(
      "compressed",
      (attributes: MangaAttributes, savePath: string, stats: CompressStats) => {
        console.log(
          `Compressed ${attributes} to ${savePath} at ${
            stats.path
          }, size: (${bytesToSize(stats.size)})`
        );
      }
    );

    callback.on("done", (attributes: MangaAttributes, savePath: string) => {
      console.log(`Chapter ${attributes} downloaded to ${savePath}`);
    });
  }

  static chaptersDownloadCallback(callback: ChaptersDownloadEmit): void {
    callback.on("start", (manga: string, links: string[]) => {
      console.log(`Downloading chapters ${manga} from ${links}`);
    });
    callback.on(
      "startchapter",
      (attributes: MangaAttributes, current: number, total: number) => {
        console.log(`Starting ${attributes} ${current}/${total} chapters`);
      }
    );
    callback.on(
      "endchapter",
      (attributes: MangaAttributes, current: number, total: number) => {
        console.log(`Finished ${attributes} ${current}/${total} chapters`);
      }
    );
    callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
      console.log(`No image found for ${attributes} at ${links}`);
    });
    callback.on("page", (attributes: MangaAttributes, totalPages: number) => {
      console.log(`Downloaded ${attributes} out of ${totalPages}`);
    });
    callback.on("done", (manga, downloadLocations) => {
      console.log(`${manga} downloaded to ${downloadLocations}`);
    });
  }

  static volumeDownloadCallback(callback: VolumeDownloadEmit): void {
    callback.on("start", (manga: string, volume: number) => {
      console.log(`Downloading volume ${volume} of ${manga}`);
    });
    callback.on(`chapters`, (chapters: string[]) => {
      console.log(`Chapters to download from`, chapters);
    });
    callback.on(
      "startchapter",
      (
        attributes: MangaAttributes,
        pages: number,
        current: number,
        total: number
      ) => {
        console.log(
          `Starting ${attributes} with ${pages} pages`,
          `${current}/${total}`
        );
      }
    );
    callback.on(
      `endchapter`,
      (attributes: MangaAttributes, current: number, total: number) => {
        console.log(`Finished downloading ${attributes}, ${current}/${total}`);
      }
    );
    callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
      console.log(`No image found for ${attributes} at`, links);
    });
    callback.on("page", (attributes: MangaAttributes, totalPages: number) => {
      console.log(`Downloaded ${attributes} of`, totalPages);
    });
    callback.on(
      "done",
      (manga: string, volume: number, downloadLocations: string[]) => {
        console.log(
          `Volume`,
          volume,
          `of`,
          manga,
          `downloaded to`,
          downloadLocations
        );
      }
    );
  }

  static volumesDownloadCallback(callback: VolumesDownloadEmit): void {
    callback.on("start", (manga: string, start: number, end: number) => {
      console.log(`Downloading volumes`, start, `to`, end, `of`, manga);
    });
    callback.on(
      `chapters`,
      (volume: number, volumeIndex: number, chapters: string[]) => {
        console.log(
          `Chapters to download from volume ${volume}, ${volumeIndex}`,
          volume,
          volumeIndex,
          `of`,
          chapters
        );
      }
    );
    callback.on(
      `startvolume`,
      (manga: string, volume: number, volumeIndex: number, total: number) => {
        console.log(
          `Starting Volume`,
          volume,
          `of`,
          manga,
          `,`,
          volumeIndex,
          `/`,
          total,
          `volumes`
        );
      }
    );
    callback.on(
      "startchapter",
      (attributes: MangaAttributes, pages: number) => {
        console.log(`Starting Chapter ${attributes} with`, pages, `pages`);
      }
    );
    callback.on(`endchapter`, (attributes: MangaAttributes, pages: number) => {
      console.log(`Finished downloading ${attributes} with`, pages, `pages`);
    });
    callback.on(
      `endvolume`,
      (
        manga: string,
        volumeIndex: number,
        total: number,
        downloadLocations: string[]
      ) => {
        console.log(
          `Finished downloading volumes`,
          volumeIndex,
          `of`,
          manga,
          `with`,
          total,
          `volumes`,
          `downloaded to`,
          downloadLocations
        );
      }
    );
    callback.on("noimage", (attributes: MangaAttributes, links: string[]) => {
      console.log(`No image found for ${attributes} at`, links);
    });
    callback.on("page", (attributes: MangaAttributes, totalPages: number) => {
      console.log(`Downloaded ${attributes} of`, totalPages);
    });
    callback.on(
      "done",
      (
        manga: string,
        start: number,
        end: number,
        downloadLocations: string[][]
      ) => {
        console.log(
          `Volumes`,
          start,
          `to`,
          end,
          `of`,
          manga,
          `downloaded to`,
          downloadLocations
        );
      }
    );
  }
}

export default BasicTextHandler;
