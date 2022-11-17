import { componentTests } from "./component";
import { downloaderTests } from "./download";
import { fetcherTests } from "./fetch";
import yargs from "yargs";

const flags = yargs(process.argv.slice(2)).option("only", {
  alias: "o",
  string: true,
  choices: ["c", "component", "f", "fetcher", "d", "downloader"],
}).argv;

const choices = {
    "c": componentTests,
    "f": fetcherTests,
    "d": downloaderTests
}

if(flags.only){
    const choice = flags.only[0] as keyof typeof choices;
    choices[choice]();
} else {
    componentTests();
    fetcherTests();
    downloaderTests();
}




