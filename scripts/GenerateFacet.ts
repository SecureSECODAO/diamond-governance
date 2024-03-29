/**
 * This program has been developed by students from the bachelor Computer Science at Utrecht University within the Software Project course.
 * © Copyright Utrecht University (Department of Information and Computing Sciences)
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from "fs";
import path from "path";

/// Script to generate a facet template with storage and interface, everything correctly named according to our naming scheme.

const templateFacetFile = "./example-facet/barebones/TemplateFacet.sol.example";
const templateInterfaceFile =
  "./example-facet/barebones/ITemplateFacet.sol.example";
const templateStorageFile =
  "./example-facet/barebones/LibTemplateStorage.sol.example";
const iFacetLocation = "./contracts/facets/IFacet.sol";
const facetDirectory = "./contracts/facets";
const storageDirectory = "./contracts/libraries/storage";

const printHelpMessage = () => {
  const exampleUsage = `npm run generate-facet --name="VeryCool" --output="/aragon" --includeStorage=true`;
  console.log(

`Example usage: ${exampleUsage}

Arguments:
\t--name=<YOUR_FACET_NAME>
\t\t[REQUIRED] Resulting name will be <YOUR_FACET_NAME>Facet.sol

\t--output=<DIRECTORY>
\t\t[REQUIRED] Directory where facet will be generated. This is appended to \"./contracts/facets\"

\t--includeStorage=<BOOLEAN>"
\t\t[OPTIONAL] Whether to generate a storage library for your facet. Defaults to false.
`

  );
};

async function main() {
  console.log({
    name: process.env.npm_config_name,
    output: process.env.npm_config_output,
    includeStorage: process.env.npm_config_includeStorage,
  });
  if (!process.env.npm_config_name) {
    console.log("No name provided; use --name=NAME\r\n");
    printHelpMessage();
    return;
  }
  if (!process.env.npm_config_output) {
    console.log("No output provided; use --output=PATH\r\n");
    printHelpMessage();
    return;
  }
  const name: string = process.env.npm_config_name;
  const outputDirectory: string = path.join(facetDirectory, process.env.npm_config_output);
  const includeStorage: boolean =
    process.env.npm_config_includeStorage === "true";

  if (!fs.existsSync(outputDirectory)) {
    console.log(`Creating directory: ${outputDirectory}`);
    fs.mkdirSync(outputDirectory);
  }

  console.log(`Started generating facet: ${name}Facet.sol`);

  const outputFacetPath = path.join(outputDirectory, `${name}Facet.sol`);
  const outputInterfacePath = path.join(outputDirectory, `I${name}Facet.sol`);
  const outputStoragePath = path.join(
    storageDirectory,
    `Lib${name}Storage.sol`
  );
  const relativeIFacetPath = 
    path.relative(outputDirectory, iFacetLocation).replaceAll("\\", "\/");
  const relativeStoragePath = 
    path.relative(outputDirectory, outputStoragePath).replaceAll("\\", "\/");

  const outputFacet = fs
    .readFileSync(templateFacetFile, "utf-8")
    .replaceAll("Counter", name)
    .replace(
      "/* INSERT IFACET IMPORT HERE */",
      `import { IFacet } from "${relativeIFacetPath}";`
    )
    .replace(
      "/* INSERT STORAGE IMPORT HERE */",
      includeStorage
        ? `import { Lib${name}Storage } from "${relativeStoragePath}";`
        : ""
    );

  const outputInterface = fs
    .readFileSync(templateInterfaceFile, "utf-8")
    .replaceAll("Counter", name);

  fs.writeFileSync(outputFacetPath, outputFacet);
  console.log(`Finished generating facet: ${outputFacetPath}`);
  fs.writeFileSync(outputInterfacePath, outputInterface);
  console.log(`Finished generating interface: ${outputInterfacePath}`);

  if (includeStorage) {
    const nameSplit = name.replace(/([a-z])([A-Z])/g, "$1 $2"); // split on camelCase using regex
    const nameSplitUpper = nameSplit.toUpperCase().replaceAll(" ", "_"); // convert to uppercase and replace spaces with underscores
    const nameSplitLower = nameSplit.toLowerCase().replaceAll(" ", "."); // convert to lowercase and replace spaces with dots
    const outputStorage = fs
      .readFileSync(templateStorageFile, "utf-8")
      .replaceAll("COUNTER", nameSplitUpper)
      .replaceAll("counter", nameSplitLower)
      .replace("Counter", name); // only the class name needs to be replaced

    fs.writeFileSync(outputStoragePath, outputStorage);
    console.log(`Finished generating storage: ${outputStoragePath}`);
  } else {
    console.log("Skipping storage generation");
  }

  console.log();
  console.log(
    "Don't forget to replace placeholder variable in the storage struct!"
  );
  console.log(
    "Don't forget to replace placeholder variable in the init params struct!"
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
