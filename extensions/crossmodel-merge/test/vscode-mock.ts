/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { URI } from 'vscode-uri';

export class Uri extends URI {}

export class Range {
   constructor(
      public start: Position,
      public end: Position
   ) {}
}

export class Position {
   constructor(
      public line: number,
      public character: number
   ) {}
}
