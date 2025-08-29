/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import chalk from 'chalk';
import { Command } from 'commander';
import { NodeFileSystem } from 'langium/node';
import { createCrossModelServices } from '../language-server/cross-model-module.js';
import { CrossModelRoot } from '../language-server/generated/ast.js';
import { CrossModelLanguageMetaData } from '../language-server/generated/module.js';
import { extractAstNode } from './cli-util.js';
import { generateJavaScript } from './generator.js';

export const generateAction = async (fileName: string, opts: GenerateOptions): Promise<void> => {
   const services = createCrossModelServices(NodeFileSystem).CrossModel;
   const root = await extractAstNode<CrossModelRoot>(fileName, services);
   const generatedFilePath = generateJavaScript(root, fileName, opts.destination);
   console.log(chalk.green(`JavaScript code generated successfully: ${generatedFilePath}`));
};

export interface GenerateOptions {
   destination?: string;
}

export default function (): void {
   const program = new Command();

   program
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      .version(require('../../package.json').version);

   const fileExtensions = CrossModelLanguageMetaData.fileExtensions.join(', ');
   program
      .command('generate')
      .argument('<file>', `source file (possible file extensions: ${fileExtensions})`)
      .option('-d, --destination <dir>', 'destination directory of generating')
      .description('generates JavaScript code that prints "Hello, {name}!" for each greeting in a source file')
      .action(generateAction);

   program.parse(process.argv);
}
