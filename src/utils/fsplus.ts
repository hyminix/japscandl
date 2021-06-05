import fs from "fs";

const fsplus = {
    tellIfDoesntExist(locations: string[]): boolean {
        const found = [];
        locations.forEach((location) => {
            if (!fs.existsSync(location)) {
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
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    },
    createPath(_path: string): void {
        fs.mkdir(_path, {
            recursive: true
        }, (err) => {
            if(err) throw err;
        });
    },
};

export default fsplus;