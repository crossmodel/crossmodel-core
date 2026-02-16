/********************************************************************************
 * Copyright (c) 2026 CrossBreeze.
 *
 * Zero-config generator: reads the Langium-generated AST (interfaces, type
 * aliases, and reflection metadata) together with the module augmentation file
 * to produce a serializable "transfer model" for client-server communication.
 *
 * The generator performs a pure 1:1 mapping from the AST. All semantic type
 * narrowings are handled in the handwritten overlay (transfer-model.ts).
 *
 * Usage: yarn --cwd packages/server generate:transfer-model
 ********************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, type InterfaceDeclaration, type SourceFile } from 'ts-morph';
import { fileURLToPath } from 'url';
import { reflection } from '../language-server/ast.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../..');
const AST_FILE = path.join(ROOT, 'packages/server/src/language-server/generated/ast.ts');
const AUG_FILE = path.join(ROOT, 'packages/server/src/language-server/ast.ts');
const OUT_FILE = path.join(ROOT, 'packages/protocol/src/model-service/generated/transfer-model.ts');

/** Langium infrastructure type aliases to exclude. */
const SKIP_TYPE_ALIASES = new Set(['CrossModelAstType', 'CrossModelTerminalNames', 'CrossModelTokenNames', 'IDReference']);

/** Synthetic/internal terminals to exclude from the generated validation patterns. */
const SKIP_TERMINALS = new Set(['INDENT', 'DEDENT', 'LIST_ITEM', 'NEWLINE', 'WS']);

// ---------------------------------------------------------------------------
// Type mapping
// ---------------------------------------------------------------------------

/** Map AST type text to transfer-model form. */
function mapType(text: string): string {
   return text.replace(/langium\.Reference<(\w+)>/g, 'Reference<$1>').replace(/langium\.AstNode/g, 'CrossModelElement');
}

/** Extract string literals from a union definition, or undefined if not a pure string literal union. */
function extractStringLiterals(definition: string): string[] | undefined {
   const stringLiteral = '(?:\'[^\']*\'|"[^"]*")';
   if (!new RegExp(`^\\|?\\s*${stringLiteral}(\\s*\\|\\s*${stringLiteral})*$`).test(definition.trim())) {
      return undefined;
   }
   return [...definition.matchAll(/'([^']*)'|"([^"]*)"/g)].map(m => m[1] ?? m[2]);
}

// ---------------------------------------------------------------------------
// Augmentation parsing
// ---------------------------------------------------------------------------

interface AugmentedProperty {
   name: string;
   type: string;
   optional: boolean;
   readonly: boolean;
   comment?: string;
}

/** Resolve string constants exported from a source file. */
function resolveConstants(source: SourceFile): Map<string, string> {
   const constants = new Map<string, string>();
   for (const decl of source.getVariableDeclarations()) {
      const init = decl.getInitializer();
      if (init) {
         const match = init.getText().match(/^['"](.+)['"]$/);
         if (match) {
            constants.set(decl.getName(), match[1]);
         }
      }
   }
   return constants;
}

/** Parse augmented properties from `declare module` blocks. */
function parseAugmentations(source: SourceFile, constants: Map<string, string>): Map<string, AugmentedProperty[]> {
   const result = new Map<string, AugmentedProperty[]>();

   for (const stmt of source.getStatements()) {
      if (stmt.getKind() !== SyntaxKind.ModuleDeclaration) {
         continue;
      }
      const body = stmt.getFirstChildByKind(SyntaxKind.ModuleBlock);
      if (!body) {
         continue;
      }

      for (const iface of body.getChildrenOfKind(SyntaxKind.InterfaceDeclaration)) {
         const props: AugmentedProperty[] = [];

         for (const prop of iface.getProperties()) {
            // Handle computed property names like [DERIVED_ID_PROPERTY]
            const nameText = prop.getNameNode().getText();
            let propName: string;
            if (nameText.startsWith('[') && nameText.endsWith(']')) {
               const constName = nameText.slice(1, -1).trim();
               const resolved = constants.get(constName);
               if (!resolved) {
                  continue;
               }
               propName = resolved;
            } else {
               propName = prop.getName();
            }

            // Skip $-prefixed properties (Langium internals)
            if (propName.startsWith('$')) {
               continue;
            }

            const jsDocs = prop.getJsDocs();
            const comment =
               jsDocs.length > 0
                  ? jsDocs[0]
                       .getInnerText()
                       .trim()
                       .replace(/\s*\n\s*/g, ' ')
                  : undefined;

            props.push({
               name: propName,
               type: mapType(prop.getTypeNode()?.getText() ?? 'unknown'),
               optional: prop.hasQuestionToken(),
               readonly: prop.isReadonly(),
               comment: comment || undefined
            });
         }

         if (props.length > 0) {
            const existing = result.get(iface.getName()) ?? [];
            result.set(iface.getName(), [...existing, ...props]);
         }
      }
   }

   return result;
}

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------

function topologicalSort(names: string[], getDeps: (n: string) => string[]): string[] {
   const visited = new Set<string>();
   const nameSet = new Set(names);
   const sorted: string[] = [];

   function visit(name: string): void {
      if (visited.has(name)) {
         return;
      }
      visited.add(name);
      for (const dep of getDeps(name)) {
         if (nameSet.has(dep)) {
            visit(dep);
         }
      }
      sorted.push(name);
   }

   for (const name of names) {
      visit(name);
   }
   return sorted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function generate(): void {
   // 1. Reflection metadata — superTypes from the generated AST
   const reflectionTypes = reflection.types as Record<string, { superTypes: readonly string[] }>;

   // 2. ts-morph — property types, optionality, $type unions, type aliases, augmentations
   const project = new Project({
      compilerOptions: { strict: true },
      skipAddingFilesFromTsConfig: true
   });
   const astSource = project.addSourceFileAtPath(AST_FILE);
   const augSource = project.addSourceFileAtPath(AUG_FILE);

   // 3. Collect AST interfaces
   const astInterfaces = new Map<string, InterfaceDeclaration>();
   for (const iface of astSource.getInterfaces()) {
      astInterfaces.set(iface.getName(), iface);
   }

   // 4. Collect AST type aliases (skip infrastructure types)
   const typeAliases: Array<{ name: string; definition: string }> = [];
   for (const alias of astSource.getTypeAliases()) {
      const name = alias.getName();
      if (SKIP_TYPE_ALIASES.has(name)) {
         continue;
      }
      const typeText = alias.getTypeNode()?.getText();
      if (typeText) {
         typeAliases.push({ name, definition: mapType(typeText) });
      }
   }

   // 5. Parse augmentations
   const constants = resolveConstants(augSource);
   const augmented = parseAugmentations(augSource, constants);

   // 6. Parse terminal regex patterns for client-side validation
   const terminals: Array<{ name: string; pattern: string }> = [];
   const terminalsDecl = astSource.getVariableDeclaration('CrossModelTerminals');
   if (terminalsDecl) {
      const objLiteral = terminalsDecl.getFirstChildByKind(SyntaxKind.ObjectLiteralExpression);
      if (objLiteral) {
         for (const prop of objLiteral.getChildrenOfKind(SyntaxKind.PropertyAssignment)) {
            const name = prop.getName();
            if (SKIP_TERMINALS.has(name)) {
               continue;
            }
            const regex = prop.getFirstChildByKind(SyntaxKind.RegularExpressionLiteral);
            if (regex) {
               const regexText = regex.getText();
               const match = regexText.match(/^\/(.+)\/([gimsuy]*)$/s);
               if (match) {
                  terminals.push({ name, pattern: `/^(?:${match[1]})$/` });
               }
            }
         }
      }
   }

   // 7. Classify interfaces: abstract (union $type) vs concrete (literal $type)
   //    (renumbered from original step 6)
   const interfaceNames: string[] = [];
   const abstractTypes = new Set<string>();
   const concreteTypes = new Set<string>();

   for (const name of Object.keys(reflectionTypes)) {
      const iface = astInterfaces.get(name);
      if (!iface) {
         continue;
      } // Type alias (e.g. BooleanExpression) — handled separately

      interfaceNames.push(name);
      const typeText = iface.getProperty('$type')?.getTypeNode()?.getText() ?? '';
      if (typeText.includes('|')) {
         abstractTypes.add(name);
      } else {
         concreteTypes.add(name);
      }
   }

   // 7. Extends chains from reflection (empty superTypes → CrossModelElement)
   //    Filter out type-alias superTypes — TypeScript can't extend a union type alias.
   //    Langium reflection includes them (e.g., NumberLiteral → BooleanExpression) for
   //    the grammar hierarchy, but in TypeScript the interface extends langium.AstNode.
   const typeAliasNames = new Set(typeAliases.map(ta => ta.name));
   const getExtends = (name: string): string[] => {
      const supers = reflectionTypes[name]?.superTypes;
      if (!supers?.length) {
         return ['CrossModelElement'];
      }
      const interfaceSupers = supers.filter(s => !typeAliasNames.has(s));
      return interfaceSupers.length ? [...interfaceSupers] : ['CrossModelElement'];
   };

   // 8. Topological sort — base types first
   const sorted = topologicalSort(interfaceNames, getExtends);

   // 9. Build output
   const out: string[] = [];

   // Header
   out.push('/******************************************************************************');
   out.push(' * Generated from the Langium AST — DO NOT EDIT MANUALLY!');
   out.push(' * Run: yarn --cwd packages/server generate:transfer-model');
   out.push(' ******************************************************************************/');
   out.push('');
   out.push('/* eslint-disable */');
   out.push('');
   // Base types (inlined — no external dependency)
   out.push('// eslint-disable-next-line @typescript-eslint/no-unused-vars');
   out.push('export type Reference<T> = string;');
   out.push('');
   out.push('export interface CrossModelElement {');
   out.push('   readonly $type: string;');
   out.push('}');
   out.push('');

   // Type constants (concrete types only)
   out.push('// --- Type Constants ---');
   for (const name of sorted) {
      if (concreteTypes.has(name)) {
         out.push(`export const ${name}Type = '${name}';`);
      }
   }
   out.push('');

   // Type aliases
   if (typeAliases.length > 0) {
      out.push('// --- Type Aliases ---');
      for (const { name, definition } of typeAliases) {
         out.push(`export type ${name} = ${definition};`);
         // For string literal unions, generate a runtime array of allowed values
         const literals = extractStringLiterals(definition);
         if (literals) {
            const items = literals.map(l => `'${l}'`).join(', ');
            out.push(`export const ${name}Values = [${items}] as const;`);
         }
      }
      out.push('');
   }

   // Terminal patterns (anchored for full-string validation)
   if (terminals.length > 0) {
      out.push('// --- Terminal Patterns (anchored for validation) ---');
      out.push('export const CrossModelTerminals = {');
      for (const { name, pattern } of terminals) {
         out.push(`   ${name}: ${pattern},`);
      }
      out.push('};');
      out.push('');
   }

   // Interfaces
   out.push('// --- Interfaces ---');
   for (const name of sorted) {
      const iface = astInterfaces.get(name)!;
      const isAbstract = abstractTypes.has(name);
      const extendsTypes = getExtends(name);

      out.push(`export interface ${name} extends ${extendsTypes.join(', ')} {`);

      // $type
      if (isAbstract) {
         const typeValue = iface.getProperty('$type')?.getTypeNode()?.getText() ?? `'${name}'`;
         out.push(`   readonly $type: ${typeValue};`);
      } else {
         out.push(`   readonly $type: typeof ${name}Type;`);
      }

      // Own properties from AST (skip $-prefixed)
      const emitted = new Set<string>(['$type']);
      for (const prop of iface.getProperties()) {
         const propName = prop.getName();
         if (propName.startsWith('$')) {
            continue;
         }

         const mappedType = mapType(prop.getTypeNode()?.getText() ?? 'unknown');
         const opt = prop.hasQuestionToken() ? '?' : '';
         const ro = prop.isReadonly() ? 'readonly ' : '';
         const jsDocs = prop.getJsDocs();
         if (jsDocs.length > 0) {
            const comment = jsDocs[0]
               .getInnerText()
               .trim()
               .replace(/\s*\n\s*/g, ' ');
            if (comment) {
               out.push(`   /** ${comment} */`);
            }
         }
         out.push(`   ${ro}${propName}${opt}: ${mappedType};`);
         emitted.add(propName);
      }

      // Augmented properties (from declare module blocks)
      for (const aug of augmented.get(name) ?? []) {
         if (emitted.has(aug.name)) {
            continue;
         }
         const opt = aug.optional ? '?' : '';
         const ro = aug.readonly ? 'readonly ' : '';
         if (aug.comment) {
            out.push(`   /** ${aug.comment} */`);
         }
         out.push(`   ${ro}${aug.name}${opt}: ${aug.type};`);
         emitted.add(aug.name);
      }

      out.push('}');
      out.push('');
   }

   // Type guards
   out.push('// --- Type Guards ---');

   // Helper: isCrossModelElement
   out.push('export function isCrossModelElement(item: unknown): item is CrossModelElement {');
   out.push("   return !!item && typeof item === 'object' && '$type' in item && typeof (item as CrossModelElement).$type === 'string';");
   out.push('}');
   out.push('');

   // Interface guards
   for (const name of sorted) {
      const iface = astInterfaces.get(name)!;
      const isAbstract = abstractTypes.has(name);

      out.push(`export function is${name}(item: unknown): item is ${name} {`);
      if (isAbstract) {
         // Extract $type union members
         const typeText = iface.getProperty('$type')?.getTypeNode()?.getText() ?? '';
         const members = [...typeText.matchAll(/'([^']+)'/g)].map(m => m[1]);
         const checks = members.map(m => `item.$type === '${m}'`).join(' || ');
         out.push(`   return isCrossModelElement(item) && (${checks});`);
      } else {
         out.push(`   return isCrossModelElement(item) && item.$type === ${name}Type;`);
      }
      out.push('}');
      out.push('');
   }

   // Type alias guards
   for (const { name, definition } of typeAliases) {
      const literals = extractStringLiterals(definition);

      if (literals) {
         // String literal union — check item against each literal
         const checks = literals.map(l => `item === '${l}'`).join(' || ');
         out.push(`export function is${name}(item: unknown): item is ${name} {`);
         out.push(`   return ${checks};`);
         out.push('}');
         out.push('');
      } else {
         // Interface union — delegate to constituent type guards
         const members = definition.split('|').map(s => s.trim());
         const checks = members.map(m => `is${m}(item)`).join(' || ');
         out.push(`export function is${name}(item: unknown): item is ${name} {`);
         out.push(`   return ${checks};`);
         out.push('}');
         out.push('');
      }
   }

   // Validate coverage
   const processedSet = new Set(sorted);
   for (const name of Object.keys(reflectionTypes)) {
      if (!processedSet.has(name) && !typeAliasNames.has(name)) {
         console.warn(`Warning: reflection type '${name}' was not included in the transfer model`);
      }
   }

   // Write file
   const content = out.join('\n') + '\n';
   fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
   if (fs.existsSync(OUT_FILE) && fs.readFileSync(OUT_FILE, 'utf-8') === content) {
      console.log('Transfer model is up to date.');
      return;
   }

   fs.writeFileSync(OUT_FILE, content, 'utf-8');
   console.log(`Generated: ${path.relative(ROOT, OUT_FILE)}`);
}

generate();
