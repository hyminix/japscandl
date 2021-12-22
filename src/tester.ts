import Downloader from "./components/Downloader";
import { ChapterDownloadEmit } from "./utils/emitTypes";
import fs from "fs";

Downloader.launch({
  flags: {
    visible: false,
    timeout: 60,
    verbose: false,
    mock: true,
  },
}).then(async (downloader) => {
  console.log("Fetching");
  const manga = "tower-of-god";
  const data = await downloader.fetchMangaContent(manga);
  console.log("Fetched");
  fs.writeFileSync(manga + ".json", JSON.stringify(data, null, 2));
  downloader.destroy();
});
