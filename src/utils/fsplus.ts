import { existsSync, mkdirSync, readdirSync, rmSync } from "fs";

const fsplus = {
  tellIfDoesntExist(locations: string[]): boolean {
    const found = [];
    locations.forEach((location) => {
      if (!existsSync(location)) {
        console.log(
          "Attention: le chapitre " +
            location +
            " n'a pas été trouvé sur votre disque."
        );
      } else {
        found.push({ location: location });
      }
    });
    console.log(`${found.length}/${locations.length} vont être ajoutés au zip`);
    return !!found.length;
  },
  mkdirIfDoesntExist(path: string): void {
    if (!existsSync(path)) {
      mkdirSync(path);
    }
  },
  createPath(path: string): void {
    mkdirSync(path, { recursive: true });
  },
  alreadyDownloadedChapter(path: string, pages: number): boolean {
    const files = readdirSync(path);
    if (files.length !== pages) return false;
    return true;
  },
  rmLocations(downloadLocations: string[]): void {
    downloadLocations.forEach((path: string) =>
      rmSync(path, { force: true, recursive: true })
    );
  },
};

export default fsplus;
