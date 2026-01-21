#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Documentation Validation Script
 *
 * Validates the component documentation system:
 * - Checks all documented components exist in src/components/
 * - Checks all doc files referenced in INDEX exist
 * - Validates YAML frontmatter in doc files
 * - Warns about stale documentation
 *
 * Usage: pnpm check-docs
 */

const fs = require('fs');
const path = require('path');

// Configuration
const COMPONENTS_DIR = path.join(__dirname, '..', 'src', 'components');
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'components');
const INDEX_PATH = path.join(DOCS_DIR, 'INDEX.md');
const STALE_DAYS = 180;

// Results tracking
let errors = 0;
let warnings = 0;

// ANSI colors
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  dim: '\x1b[2m'
};

function success(msg) {
  console.log(`${colors.green}✅${colors.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`);
  warnings++;
}

function error(msg) {
  console.log(`${colors.red}❌${colors.reset} ${msg}`);
  errors++;
}

function dim(msg) {
  return `${colors.dim}${msg}${colors.reset}`;
}

/**
 * Get all component folders (excluding ui/)
 */
function getComponentFolders() {
  try {
    const entries = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && e.name !== 'ui')
      .map(e => e.name);
  } catch (err) {
    error(`Cannot read components directory: ${err.message}`);
    return [];
  }
}

/**
 * Parse INDEX.md and extract component entries
 */
function parseIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    error(`INDEX.md not found at ${INDEX_PATH}`);
    return { components: [], docRefs: [] };
  }

  const content = fs.readFileSync(INDEX_PATH, 'utf-8');
  const lines = content.split('\n');

  const components = [];
  const docRefs = [];

  // Match table rows like: | **calendar** | Yes | [calendar.md](./calendar.md) |
  const tableRowRegex = /^\|\s*\*\*(\w+)\*\*\s*\|\s*(Yes|No|N\/A)\s*\|\s*(?:\[([^\]]+)\]\(([^)]+)\)|—)/;

  for (const line of lines) {
    const match = line.match(tableRowRegex);
    if (match) {
      const [, name, hasDocs, , docPath] = match;
      components.push({
        name,
        hasDocs: hasDocs === 'Yes',
        docPath: docPath ? docPath.replace('./', '') : null
      });

      if (hasDocs === 'Yes' && docPath) {
        docRefs.push({
          component: name,
          file: docPath.replace('./', '')
        });
      }
    }
  }

  return { components, docRefs };
}

/**
 * Validate YAML frontmatter in a doc file
 */
function validateFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: 'File not found' };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for frontmatter delimiters
  if (!content.startsWith('---')) {
    return { valid: false, error: 'Missing frontmatter' };
  }

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return { valid: false, error: 'Unclosed frontmatter' };
  }

  const frontmatter = content.substring(3, endIndex).trim();

  // Check required fields
  const requiredFields = ['component', 'complexity', 'status', 'last_updated'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!frontmatter.includes(`${field}:`)) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return { valid: false, error: `Missing fields: ${missingFields.join(', ')}` };
  }

  // Extract last_updated for staleness check
  const lastUpdatedMatch = frontmatter.match(/last_updated:\s*["']?(\d{4}-\d{2}-\d{2})["']?/);
  const lastUpdated = lastUpdatedMatch ? new Date(lastUpdatedMatch[1]) : null;

  return { valid: true, lastUpdated };
}

/**
 * Get the most recent modification time for a component folder
 */
function getComponentLastModified(componentName) {
  const componentPath = path.join(COMPONENTS_DIR, componentName);

  if (!fs.existsSync(componentPath)) {
    return null;
  }

  let latestMtime = 0;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs > latestMtime) {
          latestMtime = stat.mtimeMs;
        }
      }
    }
  }

  walkDir(componentPath);
  return latestMtime > 0 ? new Date(latestMtime) : null;
}

/**
 * Main validation
 */
function validate() {
  console.log('\n📋 Validating Component Documentation\n');
  console.log(dim('─'.repeat(50)));

  // 1. Get actual component folders
  const actualFolders = getComponentFolders();
  console.log(dim(`\nFound ${actualFolders.length} component folders (excluding ui/)\n`));

  // 2. Parse INDEX.md
  const { components, docRefs } = parseIndex();

  if (components.length === 0) {
    error('No components found in INDEX.md');
    return;
  }

  // 3. Check component coverage
  const indexedNames = components.map(c => c.name);
  const missingFromIndex = actualFolders.filter(f => !indexedNames.includes(f));

  if (missingFromIndex.length > 0) {
    error(`Components not in INDEX: ${missingFromIndex.join(', ')}`);
  } else {
    success(`Component coverage: ${actualFolders.length}/${actualFolders.length} in INDEX ${dim('(excluding ui/)')}`);
  }

  // 4. Check doc files exist
  let docsExist = 0;
  let docsMissing = [];

  for (const ref of docRefs) {
    const docPath = path.join(DOCS_DIR, ref.file);
    if (fs.existsSync(docPath)) {
      docsExist++;
    } else {
      docsMissing.push(ref.file);
    }
  }

  if (docsMissing.length > 0) {
    error(`Missing doc files: ${docsMissing.join(', ')}`);
  } else if (docRefs.length > 0) {
    success(`Doc files: ${docsExist}/${docRefs.length} exist`);
  } else {
    success(`Doc files: No docs referenced yet`);
  }

  // 5. Validate YAML frontmatter
  const invalidFrontmatter = [];

  for (const ref of docRefs) {
    const docPath = path.join(DOCS_DIR, ref.file);
    const result = validateFrontmatter(docPath);

    if (!result.valid) {
      invalidFrontmatter.push(`${ref.file}: ${result.error}`);
    }
  }

  if (invalidFrontmatter.length > 0) {
    error(`Invalid YAML frontmatter:`);
    invalidFrontmatter.forEach(msg => console.log(`   ${colors.dim}→${colors.reset} ${msg}`));
  } else if (docRefs.length > 0) {
    success(`YAML frontmatter: Valid`);
  } else {
    success(`YAML frontmatter: No docs to validate`);
  }

  // 6. Check for stale documentation
  const staleThreshold = Date.now() - (STALE_DAYS * 24 * 60 * 60 * 1000);
  let staleDocs = [];

  for (const ref of docRefs) {
    const docPath = path.join(DOCS_DIR, ref.file);
    const frontmatterResult = validateFrontmatter(docPath);

    if (frontmatterResult.valid && frontmatterResult.lastUpdated) {
      const componentModified = getComponentLastModified(ref.component);

      // Doc is stale if: last_updated > 180 days AND component was modified after doc
      if (frontmatterResult.lastUpdated.getTime() < staleThreshold) {
        if (componentModified && componentModified > frontmatterResult.lastUpdated) {
          staleDocs.push({
            file: ref.file,
            docDate: frontmatterResult.lastUpdated.toISOString().split('T')[0],
            componentDate: componentModified.toISOString().split('T')[0]
          });
        }
      }
    }
  }

  if (staleDocs.length > 0) {
    warn(`Stale documentation (>${STALE_DAYS} days, component modified since):`);
    staleDocs.forEach(s => {
      console.log(`   ${colors.dim}→${colors.reset} ${s.file} ${dim(`(doc: ${s.docDate}, component: ${s.componentDate})`)}`);
    });
  } else {
    success(`Staleness: None`);
  }

  // Summary
  console.log(dim('\n' + '─'.repeat(50)));
  console.log(`\nTotal: ${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}\n`);

  // Exit with error code if there are errors
  if (errors > 0) {
    process.exit(1);
  }
}

// Run validation
validate();
