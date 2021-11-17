import Downloader from "./components/Downloader";
import { ChapterDownloadEmit, ImageDownloadEmit } from "./utils/emitTypes";
Downloader.launch({
    flags: {
        fast: false,
        visible: false,
        timeout: 60,
        verbose: false,
    },
    onEvent: {
        onPage: (attributes, total) => {
            console.log("onPage:", attributes.page, total)
        },
        onChapter: (attributes, current, total) => {
            console.log("onChapter:", attributes, current, total);
        },
        onVolume: (manga, current, total) => {
            console.log("onVolume:", manga, current, total);
        }
    }
}).then(async (downloader) => {
    await downloader.downloadChapterFromLink('https://www.japscan.ws/lecture-en-ligne/one-piece/1030/', (events: ChapterDownloadEmit) => {
        events.on('start', (attributes) => console.log(attributes));
        events.on('noimage', (links: string[]) => console.log("No images at " + links));
        events.on('done', (path: string) => {
            console.log("Image is at " + path);
            downloader.destroy();
        });
    });
});