/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/
import { EmptyFileSystem } from 'langium';
import { parentPort } from 'node:worker_threads';
import { createCrossModelServices } from '../cross-model-module.js';

const services = createCrossModelServices(EmptyFileSystem).CrossModel;
const parser = services.parser.LangiumParser;
const hydrator = services.serializer.Hydrator;

parentPort?.on('message', text => {
   const result = parser.parse(text);
   const dehydrated = hydrator.dehydrate(result);
   parentPort?.postMessage(dehydrated);
});
