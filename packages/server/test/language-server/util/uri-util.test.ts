/********************************************************************************
 * Copyright (c) 2024 CrossBreeze.
 ********************************************************************************/

import { URI } from 'vscode-uri';
import { Utils } from '../../../src/language-server/util/uri-util.js';

describe('Utils', () => {
   const parentUri = URI.file('/parent');
   const childUri = URI.file('/parent/child');
   const unrelatedUri = URI.file('/unrelated');

   describe('isChildOf', () => {
      test('should return true if child URI is a child of parent URI', () => {
         expect(Utils.isChildOf(parentUri, childUri)).toBe(true);
      });

      test('should return false if child URI is not a child of parent URI', () => {
         expect(Utils.isChildOf(parentUri, unrelatedUri)).toBe(false);
      });

      test('should return false if URIs have different schemes', () => {
         expect(Utils.isChildOf(URI.parse('file:///parent'), URI.parse('http://example.com/parent'))).toBe(false);
      });

      test('should return false if URIs have different authorities', () => {
         expect(Utils.isChildOf(URI.parse('file:///parent'), URI.parse('file://other/parent'))).toBe(false);
      });

      test('should return false if URIs do not have hierarchical paths', () => {
         expect(Utils.isChildOf(URI.parse('file://'), URI.parse('file://'))).toBe(false);
      });
   });

   describe('matchSameFolder', () => {
      const folderProvider = (uri?: URI): URI | undefined => (uri ? URI.file(uri.path.split('/')[1]) : undefined);

      test('should return true if all URIs match the same folder', () => {
         expect(Utils.matchSameFolder(folderProvider, URI.file('/folder/file1'), URI.file('/folder/file2'))).toBe(true);
      });

      test('should return false if URIs do not match the same folder', () => {
         expect(Utils.matchSameFolder(folderProvider, URI.file('/folder/file1'), URI.file('/other/file2'))).toBe(false);
      });

      test('should return true if no URIs are given', () => {
         expect(Utils.matchSameFolder(folderProvider)).toBe(true);
      });

      test('should return true if a single URI is given', () => {
         expect(Utils.matchSameFolder(folderProvider, URI.file('/folder/file1'))).toBe(true);
      });
   });
});
