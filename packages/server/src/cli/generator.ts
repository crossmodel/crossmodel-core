/********************************************************************************
 * Copyright (c) 2023 CrossBreeze.
 ********************************************************************************/
import fs from 'fs';
import { CompositeGeneratorNode, NL, toString } from 'langium/generate';
import path from 'path';
import { CrossModelRoot } from '../language-server/generated/ast.js';
import { extractDestinationAndName } from './cli-util.js';

export function generateJavaScript(root: CrossModelRoot, filePath: string, destination: string | undefined): string {
   const data = extractDestinationAndName(filePath, destination);
   const generatedFilePath = `${path.join(data.destination, data.name)}.js`;

   const fileNode = new CompositeGeneratorNode();
   fileNode.append('"use strict";', NL, NL);
   fileNode.append(JSON.stringify(root), NL);

   if (!fs.existsSync(data.destination)) {
      fs.mkdirSync(data.destination, { recursive: true });
   }
   fs.writeFileSync(generatedFilePath, toString(fileNode));
   return generatedFilePath;
}
