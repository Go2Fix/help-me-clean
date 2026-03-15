#!/usr/bin/env node
/**
 * Validates all GraphQL operations in the mobile app against the backend schema.
 *
 * Uses the .graphql schema files from backend/internal/graph/schema/ directly —
 * no server needs to be running.
 *
 * Usage:
 *   node scripts/validate-graphql.js
 *   npm run validate-gql
 */

const fs = require('fs');
const path = require('path');
const { buildSchema, parse, validate } = require('graphql');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCHEMA_DIR = path.resolve(__dirname, '../../../../backend/internal/graph/schema');
const SRC_DIRS = [
  path.resolve(__dirname, '../app'),
  path.resolve(__dirname, '../src'),
];

// ---------------------------------------------------------------------------
// 1. Load and merge all .graphql schema files
// ---------------------------------------------------------------------------

function loadSchema() {
  const files = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.graphql'));
  const sdl = files
    .map((f) => fs.readFileSync(path.join(SCHEMA_DIR, f), 'utf8'))
    .join('\n');
  return buildSchema(sdl);
}

// ---------------------------------------------------------------------------
// 2. Extract gql`...` template literals from TypeScript files
// ---------------------------------------------------------------------------

function extractGqlDocuments(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      results.push(...extractGqlDocuments(full));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(full, 'utf8');
      // Match gql`...` with possible nested template expressions stripped
      const regex = /gql`([\s\S]*?)`/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        results.push({ file: full, gql: match[1] });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. Validate
// ---------------------------------------------------------------------------

function run() {
  let schema;
  try {
    schema = loadSchema();
    console.log('✓ Schema loaded from', SCHEMA_DIR);
  } catch (err) {
    console.error('✗ Failed to load schema:', err.message);
    process.exit(1);
  }

  const documents = SRC_DIRS.flatMap(extractGqlDocuments);
  console.log(`  Found ${documents.length} GQL documents to validate\n`);

  let errorCount = 0;

  for (const { file, gql: gqlStr } of documents) {
    const relPath = path.relative(path.resolve(__dirname, '..'), file);
    let doc;
    try {
      doc = parse(gqlStr);
    } catch (err) {
      console.error(`✗ ${relPath}\n  Parse error: ${err.message}\n`);
      errorCount++;
      continue;
    }

    const errors = validate(schema, doc);
    if (errors.length > 0) {
      console.error(`✗ ${relPath}`);
      for (const e of errors) {
        console.error(`    ${e.message}`);
      }
      console.error('');
      errorCount++;
    } else {
      // Print operation names for visibility
      const opNames = doc.definitions
        .filter((d) => d.kind === 'OperationDefinition' || d.kind === 'FragmentDefinition')
        .map((d) => d.name?.value ?? '<anonymous>')
        .join(', ');
      console.log(`✓ ${relPath}${opNames ? ` (${opNames})` : ''}`);
    }
  }

  console.log('');
  if (errorCount > 0) {
    console.error(`${errorCount} document(s) failed validation.`);
    process.exit(1);
  } else {
    console.log(`All ${documents.length} GQL documents are valid.`);
  }
}

run();
