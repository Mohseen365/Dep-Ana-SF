#!/usr/bin/env node

/**
 * Salesforce Dependency Analyzer v13
 * ==================================
 *
 * Purpose:
 *   Analyze Salesforce DX source and answer:
 *     1. What depends on what?
 *     2. What will be impacted if I change X?
 *     3. Which classes/components are highly coupled?
 *     4. Where are circular dependencies?
 *     5. Which references could not be resolved?
 *     6. Which Salesforce objects/fields are touched?
 *     7. Which tests are likely affected?
 *
 * Zero npm dependencies.
 *
 * Commands:
 *   node dependency-analyzer.js analyze [sourceDir]
 *   node dependency-analyzer.js impact <name> [sourceDir]
 *   node dependency-analyzer.js refactor-impact <name> [sourceDir]
 *   node dependency-analyzer.js search <text> [sourceDir]
 *   node dependency-analyzer.js stats [sourceDir]
 *   node dependency-analyzer.js llm-context <name> [sourceDir]
 *
 * Optional:
 *   node dependency-analyzer.js analyze force-app/main/default --max-graph-edges 5000
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============================================================
// Configuration
// ============================================================

const ANALYZER_ROOT = path.resolve(__dirname);

// BASE_OUTPUT_DIR is the target directory for generated dependency analysis artifacts.
// It defaults to process.cwd(), which corresponds to DEPENDENCY_REPO_PATH when run by the orchestrator.
const BASE_OUTPUT_DIR = path.resolve(process.cwd());

// The API-oriented analyzer normally lives under
// SalesforceProject/dependency-analysis. When that layout is detected,
// project-relative Salesforce paths resolve against the Salesforce project
// root while analyzer artifacts remain under the analyzer directory.
// If the analyzer is deployed at the Salesforce project root, it still works.
const PROJECT_ROOT =
  fs.existsSync(path.join(BASE_OUTPUT_DIR, "force-app"))
    ? BASE_OUTPUT_DIR
    : fs.existsSync(path.join(BASE_OUTPUT_DIR, "..", "force-app"))
      ? path.resolve(BASE_OUTPUT_DIR, "..")
      : fs.existsSync(path.join(ANALYZER_ROOT, "force-app"))
        ? ANALYZER_ROOT
        : fs.existsSync(path.join(ANALYZER_ROOT, "..", "force-app"))
          ? path.resolve(ANALYZER_ROOT, "..")
          : BASE_OUTPUT_DIR;

const DEFAULT_SOURCE_DIR = path.join(
  PROJECT_ROOT,
  "force-app",
  "main",
  "default"
);

// The active output directory is selected from the CLI command.
// It is never based on process.cwd(), so manual and API subprocess
// invocations produce the same deterministic layout.
let OUTPUT_DIR = BASE_OUTPUT_DIR;

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".sfdx",
  "node_modules",
  "coverage",
  "dist",
  "tmp",
  ".cache",
  ".scannerwork"
]);

const SYSTEM_TYPES = new Set([
  "System", "Database", "Schema", "Test", "Math", "String",
  "Date", "Datetime", "Time", "JSON", "Limits", "UserInfo",
  "URL", "EncodingUtil", "Crypto", "Type", "Pattern",
  "Matcher", "Blob", "Id", "Integer", "Long", "Decimal",
  "Double", "Boolean", "Object", "Exception", "Http",
  "HttpRequest", "HttpResponse", "Messaging", "PageReference",
  "ApexPages", "AuraHandledException", "ConnectApi", "Cache",
  "EventBus", "Approval", "Flow", "Metadata", "Auth",
  "FeatureManagement", "Continuation", "AggregateResult",
  "SObject", "SObjectType", "SObjectField"
]);

const SOQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "WITH", "USING", "SCOPE", "ORDER",
  "GROUP", "HAVING", "LIMIT", "OFFSET", "FOR", "UPDATE", "VIEW",
  "REFERENCE", "TYPEOF", "WHEN", "THEN", "ELSE", "END", "AND",
  "OR", "NOT", "IN", "LIKE", "INCLUDES", "EXCLUDES", "NULL",
  "TRUE", "FALSE", "AS", "ASC", "DESC", "NULLS", "FIRST", "LAST",
  "BY", "COUNT", "SUM", "MIN", "MAX", "AVG", "ROLLUP", "CUBE"
]);

const COMMON_WORDS = new Set([
  "public", "private", "protected", "global", "static", "virtual",
  "override", "abstract", "final", "class", "interface", "extends",
  "implements", "return", "new", "if", "else", "for", "while",
  "do", "switch", "case", "when", "try", "catch", "finally",
  "throw", "throws", "this", "super", "true", "false", "null",
  "void", "with", "sharing", "without", "inherited", "sharing",
  "list", "map", "set", "string", "integer", "long", "decimal",
  "double", "boolean", "date", "datetime", "id", "object"
]);

const CURRENT_ANALYZER_VERSION = "13";
const CURRENT_SCHEMA_VERSION = 4;

const HIGH_FAN_IN = 8;
const HIGH_FAN_OUT = 10;
const HIGH_COUPLING = 15;

// ============================================================
// CLI
// ============================================================

function resolveProjectPath(value) {
  if (!value) return DEFAULT_SOURCE_DIR;
  const normalized = String(value).replace(/\\/g, "/");
  if (path.isAbsolute(normalized)) return path.normalize(normalized);

  const cwdPath = path.resolve(process.cwd(), normalized);
  if (fs.existsSync(cwdPath)) return cwdPath;

  const projectPath = path.resolve(PROJECT_ROOT, normalized);
  if (fs.existsSync(projectPath)) return projectPath;

  return cwdPath;
}

function commandOutputDir(command, target, phase, options = {}) {
  if (options && options.outputDir) {
    const normalized = String(options.outputDir).replace(/\\/g, "/");
    return path.isAbsolute(normalized)
      ? path.normalize(normalized)
      : path.resolve(process.cwd(), normalized);
  }

  const root = BASE_OUTPUT_DIR;
  const safeTarget = safeName(target);

  switch (command) {
    case "analyze":
      return path.join(root, "analyze");
    case "impact":
      return path.join(root, "impact", safeTarget);
    case "refactor-impact":
      return path.join(root, "refactor-impact", safeTarget);
    case "search":
      return path.join(root, "search", safeTarget);
    case "stats":
      return path.join(root, "stats");
    case "llm-context":
      return path.join(root, "llm-context", safeTarget);
    case "component-context":
      return path.join(root, "component-context", safeTarget);
    case "batch-context":
      return path.join(root, "batch-context", `batch-${String(target).padStart(2, "0")}`);
    case "phase-context":
      return path.join(root, "phase-context", safeTarget, `phase-${safeName(phase)}`);
    case "context-completeness":
      return path.join(root, "context-completeness", safeTarget);
    case "create-batches":
      return path.join(root, "create-batches");
    case "llm-context-batch":
      return path.join(root, "llm-context-batch", `batch-${String(target).padStart(2, "0")}`);
    default:
      return root;
  }
}

function activateOutputDir(command, target, phase, options = {}) {
  OUTPUT_DIR = commandOutputDir(command, target, phase, options);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  return OUTPUT_DIR;
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (!args.length || args[0] === "analyze") {
    const rawOptions = parseOptions(args.slice(args[0] === "analyze" ? 1 : 0));
    let sourceDir = rawOptions.sourceDir ? resolveProjectPath(rawOptions.sourceDir) : null;
    if (!sourceDir && args[0] === "analyze" && args[1] && !args[1].startsWith("--")) {
      sourceDir = resolveProjectPath(args[1]);
    }
    if (!sourceDir) sourceDir = DEFAULT_SOURCE_DIR;

    return {
      command: "analyze",
      sourceDir,
      options: rawOptions
    };
  }

  const command = args[0];

  if ([
    "impact",
    "refactor-impact",
    "search",
    "llm-context",
    "llm-context-batch",
    "component-context",
    "batch-context",
    "phase-context",
    "context-completeness",
    "llm-investigation-context"
  ].includes(command)) {
    return {
      command,
      target: args[1],
      phase: command === "phase-context" ? args[2] : null,
      sourceDir: command === "phase-context"
        ? (
            args[3] && !args[3].startsWith("--")
              ? resolveProjectPath(args[3])
              : DEFAULT_SOURCE_DIR
          )
        : (
            args[2] && !args[2].startsWith("--")
              ? resolveProjectPath(args[2])
              : DEFAULT_SOURCE_DIR
          ),
      options: parseOptions(
        command === "phase-context"
          ? args.slice(args[3] && !args[3].startsWith("--") ? 4 : 3)
          : args.slice(args[2] && !args[2].startsWith("--") ? 3 : 2)
      )
    };
  }

  if (command === "create-batches") {
    return {
      command,
      sourceDir: args[1] && !args[1].startsWith("--")
        ? resolveProjectPath(args[1])
        : DEFAULT_SOURCE_DIR,
      options: parseOptions(
        args.slice(args[1] && !args[1].startsWith("--") ? 2 : 1)
      )
    };
  }

  if (command === "stats") {
    return {
      command,
      sourceDir: args[1] && !args[1].startsWith("--")
        ? resolveProjectPath(args[1])
        : DEFAULT_SOURCE_DIR,
      options: parseOptions(args.slice(args[1] && !args[1].startsWith("--") ? 2 : 1))
    };
  }

  if (command === "--help" || command === "-h") {
    printHelp();
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function parseOptions(args) {
  const options = {
    maxGraphEdges: 10000,
    maxImpactDepth: 50,
    batchSize: 15,
    maxContextDepth: 3,
    maxContextEdges: 1000,
    maxSourceFiles: 40,
    profile: "full",
    includeSource: false,
    outputDir: null,
    sourceDir: null,
    manifest: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output-dir" || args[i] === "--output") {
      options.outputDir = args[++i];
    }
    if (args[i] === "--source") {
      options.sourceDir = args[++i];
    }
    if (args[i] === "--manifest") {
      options.manifest = true;
    }
    if (args[i] === "--include-source") {
      options.includeSource = true;
    }
    if (args[i] === "--max-graph-edges") {
      options.maxGraphEdges = Number(args[++i]) || 10000;
    }

    if (args[i] === "--max-impact-depth") {
      options.maxImpactDepth = Number(args[++i]) || 50;
    }

    if (args[i] === "--batch-size") {
      options.batchSize = Number(args[++i]) || 15;
    }

    if (args[i] === "--max-context-depth") {
      options.maxContextDepth = Number(args[++i]) || 3;
    }

    if (args[i] === "--max-context-edges") {
      options.maxContextEdges = Number(args[++i]) || 1000;
    }

    if (args[i] === "--max-source-files") {
      options.maxSourceFiles = Number(args[++i]) || 40;
    }

    if (args[i] === "--profile") {
      options.profile = String(args[++i] || "full").toLowerCase();
    }

    if (args[i] === "--no-source") {
      options.includeSource = false;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Salesforce Dependency Analyzer v13

Commands:

  analyze [sourceDir]
      Full repository analysis.

  impact <name> [sourceDir]
      Show direct + transitive dependencies and dependents.

  refactor-impact <name> [sourceDir]
      Produce a refactoring-focused impact assessment.

  search <text> [sourceDir]
      Search symbols, dependencies and evidence.

  stats [sourceDir]
      Show architecture statistics.

  llm-context <name> [sourceDir]
      Generate a compact, LLM-ready context package for one component.

  component-context <name> [sourceDir]
      Generate a deterministic full component intelligence package.

  batch-context <batchNumber> [sourceDir]
      Generate deterministic context for one analysis batch.

  phase-context <name> <phase> [sourceDir]
      Generate phase-specific deterministic context for one component.

  context-completeness <name> [sourceDir]
      Measure deterministic context coverage and identify LLM-required gaps.

  llm-investigation-context <name> [sourceDir]
      Generate the semantic investigation package for one component.

  create-batches [sourceDir]
      Create logical dependency-based analysis batches.

  llm-context-batch <batchNumber> [sourceDir]
      Generate an LLM-ready context package for one analysis batch.

Examples:

  node dependency-analyzer.js analyze force-app/main/default

  node dependency-analyzer.js impact DashboardContext

  node dependency-analyzer.js refactor-impact AssetDashboardService

  node dependency-analyzer.js search AssetDashboard

  node dependency-analyzer.js stats

  node dependency-analyzer.js llm-context DashboardContext

  node dependency-analyzer.js create-batches force-app/main/default

  node dependency-analyzer.js create-batches force-app/main/default --batch-size 15

  node dependency-analyzer.js llm-context-batch 1 force-app/main/default

Options:

  --max-graph-edges 10000
  --max-impact-depth 50
  --batch-size 15
  --max-context-depth 3
  --max-context-edges 1000
  --max-source-files 40
  --profile full|structural|planning|implementation
  --no-source
`);
}

// ============================================================
// Utilities
// ============================================================

function normalizePath(value) {
  if (!value) return "";
  return String(value).replace(/\\/g, "/");
}

function rel(file) {
  return normalizePath(path.relative(PROJECT_ROOT, file));
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function unique(values) {
  return [...new Set(values)];
}

function uniqueBy(values, fn) {
  const map = new Map();
  for (const value of values) {
    const key = fn(value);
    if (!map.has(key)) map.set(key, value);
  }
  return [...map.values()];
}

function safeName(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .replace(/^(\d)/, "_$1");
}

function escapeMd(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");
}

function looksLikeClassName(value) {
  return (
    /^[A-Z][A-Za-z0-9_]*$/.test(value) &&
    !SYSTEM_TYPES.has(value) &&
    !SOQL_KEYWORDS.has(value.toUpperCase()) &&
    !COMMON_WORDS.has(value.toLowerCase())
  );
}

function countLines(content) {
  return content ? content.split(/\r?\n/).length : 0;
}

// ============================================================
// Discovery
// ============================================================

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const output = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      output.push(...walk(full));
    } else {
      output.push(full);
    }
  }

  return output;
}

function discover(sourceDir) {
  const files = walk(sourceDir);

  return {
    sourceDir,
    files,
    apexClasses: files.filter(f => f.endsWith(".cls")),
    apexTriggers: files.filter(f => f.endsWith(".trigger")),
    apexClassMeta: files.filter(f => f.endsWith(".cls-meta.xml")),
    triggerMeta: files.filter(f => f.endsWith(".trigger-meta.xml")),
    lwcJs: files.filter(f =>
      f.endsWith(".js") &&
      f.includes(`${path.sep}lwc${path.sep}`)
    ),
    lwcHtml: files.filter(f =>
      f.endsWith(".html") &&
      f.includes(`${path.sep}lwc${path.sep}`)
    ),
    lwcCss: files.filter(f =>
      f.endsWith(".css") &&
      f.includes(`${path.sep}lwc${path.sep}`)
    ),
    lwcMeta: files.filter(f =>
      f.endsWith(".js-meta.xml") &&
      f.includes(`${path.sep}lwc${path.sep}`)
    ),
    aura: files.filter(f =>
      f.includes(`${path.sep}aura${path.sep}`)
    ),
    visualforce: files.filter(f =>
      f.endsWith(".page") || f.endsWith(".component")
    ),
    flows: files.filter(f =>
      f.endsWith(".flow-meta.xml") || f.endsWith(".flow")
    ),
    objects: files.filter(f =>
      f.endsWith(".object-meta.xml")
    ),
    fields: files.filter(f =>
      f.includes(`${path.sep}fields${path.sep}`) &&
      f.endsWith(".field-meta.xml")
    ),
    triggers: files.filter(f =>
      f.endsWith(".trigger")
    )
  };
}

function lwcName(file) {
  const marker = `${path.sep}lwc${path.sep}`;
  const index = file.indexOf(marker);
  if (index < 0) return path.basename(file, ".js");

  return file
    .substring(index + marker.length)
    .split(path.sep)[0];
}

// ============================================================
// Apex parsing
// ============================================================


function lineNumberAtOffset(text, offset) {
  if (!Number.isFinite(offset) || offset < 0) return null;
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function nearestMethodForOffset(methods, offset) {
  if (!methods.length || !Number.isFinite(offset)) return null;
  let best = null;
  for (const method of methods) {
    if (method.startOffset <= offset && (!best || method.startOffset > best.startOffset)) {
      best = method;
    }
  }
  return best;
}

function enrichMethodRanges(raw, methods) {
  const sorted = [...methods].sort((a, b) => a.startOffset - b.startOffset);
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    current.startLine = lineNumberAtOffset(raw, current.startOffset);
    current.endLine = next
      ? Math.max(current.startLine || 1, lineNumberAtOffset(raw, next.startOffset) - 1)
      : Math.max(current.startLine || 1, countLines(raw));
    current.endOffset = next ? next.startOffset - 1 : raw.length;
  }
  return sorted;
}

function parseApex(file) {
  const raw = read(file);
  const content = stripComments(raw);
  const fileName = path.basename(file, ".cls");

  const result = {
    id: `ApexClass:${fileName}`,
    type: "ApexClass",
    name: fileName,
    file: rel(file),
    lines: countLines(raw),
    isTest: false,
    sharing: null,
    extends: [],
    implements: [],
    annotations: [],
    methods: [],
    dependencies: [],
    sourceHash: crypto.createHash("sha256").update(raw).digest("hex"),
    lineCount: countLines(raw),
    objects: [],
    fields: [],
    dml: [],
    callouts: [],
    dynamicApex: [],
    testReferences: []
  };

  const declaration =
    content.match(
      /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:extends\s+([A-Za-z_][A-Za-z0-9_]*))?\s*(?:implements\s+([^{]+))?/i
    );

  if (declaration) {
    result.name = declaration[1];
    result.id = `ApexClass:${result.name}`;

    if (declaration[2]) {
      result.extends.push(declaration[2]);
    }

    if (declaration[3]) {
      result.implements.push(
        ...declaration[3]
          .split(",")
          .map(v => v.trim())
          .map(v => v.split(/\s+/)[0])
          .filter(Boolean)
      );
    }
  }

  result.isTest =
    /@isTest\b/i.test(content) ||
    /\btestMethod\b/i.test(content) ||
    /class\s+\w*Test\b/i.test(content);

  const sharing =
    content.match(
      /\bclass\s+\w+[\s\S]{0,100}?\b(with\s+sharing|without\s+sharing|inherited\s+sharing)\b/i
    );

  if (sharing) result.sharing = sharing[1];

  const annotationRegex = /@([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;

  while ((m = annotationRegex.exec(content))) {
    result.annotations.push(m[1]);
  }

  result.annotations = unique(result.annotations);

  // Methods
  const methodRegex =
    /\b((?:(?:public|private|protected|global|static|virtual|override|abstract|final|webservice|testMethod)\s+)+)([A-Za-z_][A-Za-z0-9_<>,\s\[\].?]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;

  while ((m = methodRegex.exec(content))) {
    const methodName = m[3];
    const modifiers = m[1].trim().split(/\s+/).filter(Boolean);

    if (!COMMON_WORDS.has(methodName.toLowerCase())) {
      result.methods.push({
        name: methodName,
        returnType: m[2].trim(),
        parameters: m[4].trim(),
        visibility: modifiers.find(x => /^(public|private|protected|global)$/.test(x)) || null,
        modifiers,
        isStatic: modifiers.includes("static"),
        isVirtual: modifiers.includes("virtual"),
        isOverride: modifiers.includes("override"),
        isAbstract: modifiers.includes("abstract"),
        isAuraEnabled: false,
        isInvocable: false,
        startOffset: m.index
      });
    }
  }

  result.methods = uniqueBy(
    result.methods,
    x => `${x.name}:${x.parameters}`
  );

  result.methods = enrichMethodRanges(raw, result.methods);

  // Annotated methods: mark methods approximately by name.
  for (const method of result.methods) {
    const nearby = content.match(
      new RegExp(
        `@(AuraEnabled|InvocableMethod)[^\\n]{0,300}?\\b${method.name}\\s*\\(`,
        "i"
      )
    );

    if (nearby) {
      method.isAuraEnabled =
        nearby[1].toLowerCase() === "auraenabled";
      method.isInvocable =
        nearby[1].toLowerCase() === "invocablemethod";
    }
  }

  // new Class()
  const newRegex =
    /\bnew\s+([A-Z][A-Za-z0-9_]*)\s*\(/g;

  while ((m = newRegex.exec(content))) {
    if (
      looksLikeClassName(m[1]) &&
      m[1] !== result.name
    ) {
      result.dependencies.push({
        from: result.id,
        toName: m[1],
        type: "instantiation",
        evidence: `new ${m[1]}()`
      });
    }
  }

  // Class.method()
  const callRegex =
    /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;

  while ((m = callRegex.exec(content))) {
    const className = m[1];
    const methodName = m[2];

    if (
      looksLikeClassName(className) &&
      className !== result.name
    ) {
      result.dependencies.push({
        from: result.id,
        toName: className,
        type: "method-call",
        method: methodName,
        evidence: `${className}.${methodName}()`
      });
    }
  }

  // Generic type references. Restrict to likely type contexts.
  const typeRegex =
    /\b([A-Z][A-Za-z0-9_]*)\s+(?:[A-Za-z_][A-Za-z0-9_]*)\s*(?:[=;,)\[])/g;

  while ((m = typeRegex.exec(content))) {
    const candidate = m[1];

    if (
      candidate !== result.name &&
      looksLikeClassName(candidate)
    ) {
      result.dependencies.push({
        from: result.id,
        toName: candidate,
        type: "type-reference",
        evidence: candidate
      });
    }
  }

  // Generic parameters: List<MyDTO>, Map<Id, MyDTO>
  const genericRegex =
    /<\s*([A-Z][A-Za-z0-9_]*)\s*>/g;

  while ((m = genericRegex.exec(content))) {
    if (looksLikeClassName(m[1])) {
      result.dependencies.push({
        from: result.id,
        toName: m[1],
        type: "generic-type",
        evidence: `<${m[1]}>`
      });
    }
  }

  for (const parent of result.extends) {
    result.dependencies.push({
      from: result.id,
      toName: parent,
      type: "extends",
      evidence: `extends ${parent}`
    });
  }

  for (const iface of result.implements) {
    result.dependencies.push({
      from: result.id,
      toName: iface,
      type: "implements",
      evidence: `implements ${iface}`
    });
  }

  // SOQL objects.
  const fromRegex =
    /\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

  while ((m = fromRegex.exec(content))) {
    const objectName = m[1];

    if (!SOQL_KEYWORDS.has(objectName.toUpperCase())) {
      const line = lineNumberAtOffset(raw, m.index);
      const owner = result.methods.find(method =>
        line >= (method.startLine || 1) &&
        line <= (method.endLine || Number.MAX_SAFE_INTEGER)
      );

      result.objects.push(objectName);
      if (!result.soql) result.soql = [];
      result.soql.push({
        object: objectName,
        line,
        column: Math.max(1, m.index - raw.lastIndexOf("\n", m.index - 1)),
        methodOwner: owner ? owner.name : null,
        evidence: `SOQL FROM ${objectName}`,
        confidence: "high"
      });
    }
  }

  // Semi-accurate field extraction from SELECT ... FROM.
  const selectRegex =
    /\bSELECT\s+([\s\S]{0,2000}?)\s+\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

  while ((m = selectRegex.exec(content))) {
    const objectName = m[2];

    const fieldTokens = m[1]
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);

    for (const token of fieldTokens) {
      const field = token
        .replace(/\s+(ASC|DESC)\b/gi, "")
        .replace(/\s+NULLS\s+(FIRST|LAST)\b/gi, "")
        .trim();

      if (
        /^[A-Za-z_][A-Za-z0-9_.]*$/.test(field) &&
        !SOQL_KEYWORDS.has(field.toUpperCase())
      ) {
        const fieldOffset = m.index + m[0].indexOf(token);
        const line = lineNumberAtOffset(raw, fieldOffset);
        const owner = result.methods.find(method =>
          line >= (method.startLine || 1) &&
          line <= (method.endLine || Number.MAX_SAFE_INTEGER)
        );

        result.fields.push({
          object: objectName,
          field,
          line,
          methodOwner: owner ? owner.name : null,
          confidence: "high"
        });
      }
    }
  }

  // DML
  const dmlRegex =
    /\b(insert|update|delete|undelete|upsert|merge)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

  while ((m = dmlRegex.exec(content))) {
    const line = lineNumberAtOffset(raw, m.index);
    const owner = result.methods.find(method =>
      line >= (method.startLine || 1) &&
      line <= (method.endLine || Number.MAX_SAFE_INTEGER)
    );

    result.dml.push({
      operation: m[1].toLowerCase(),
      variable: m[2],
      line,
      methodOwner: owner ? owner.name : null,
      confidence: "high"
    });
  }

  const dbDml =
    /\bDatabase\.(insert|update|delete|undelete|upsert|merge)\s*\(/gi;

  while ((m = dbDml.exec(content))) {
    const line = lineNumberAtOffset(raw, m.index);
    const owner = result.methods.find(method =>
      line >= (method.startLine || 1) &&
      line <= (method.endLine || Number.MAX_SAFE_INTEGER)
    );

    result.dml.push({
      operation: m[1].toLowerCase(),
      databaseMethod: true,
      line,
      methodOwner: owner ? owner.name : null,
      confidence: "high"
    });
  }

  // Callouts.
  if (/\bHttpRequest\b/.test(content)) {
    result.callouts.push("HttpRequest");
  }
  if (/\bHttp\.send\s*\(/.test(content)) {
    result.callouts.push("Http.send");
  }
  if (/\bContinuation\b/.test(content)) {
    result.callouts.push("Continuation");
  }
  if (/\bWebServiceCallout\b/.test(content)) {
    result.callouts.push("WebServiceCallout");
  }

  result.callouts = unique(result.callouts);

  // Dynamic Apex.
  const dynamicPatterns = [
    /\bType\.forName\s*\(/,
    /\bDatabase\.query\s*\(/,
    /\bDatabase\.queryWithBinds\s*\(/,
    /\bJSON\.deserialize\s*\(/,
    /\bJSON\.deserializeUntyped\s*\(/
  ];

  for (const pattern of dynamicPatterns) {
    if (pattern.test(content)) {
      result.dynamicApex.push(pattern.source);
    }
  }

  // Test references.
  if (result.isTest) {
    const refs = content.match(
      /\b[A-Z][A-Za-z0-9_]*\b/g
    ) || [];

    result.testReferences = unique(
      refs.filter(
        x =>
          looksLikeClassName(x) &&
          x !== result.name
      )
    );
  }

  // Attach deterministic source evidence to every dependency.
  // Prefer an occurrence inside the enclosing method so downstream context
  // can reason at method scope without searching the repository.
  const usedEvidenceOffsets = new Set();

  function findDependencyOffset(dependency) {
    const needles = unique([
      dependency.evidence || "",
      dependency.method && dependency.toName
        ? `${dependency.toName}.${dependency.method}`
        : ""
    ].filter(Boolean));

    const candidates = [];
    for (const needle of needles) {
      let cursor = 0;
      while (cursor < content.length) {
        const found = content.indexOf(needle, cursor);
        if (found < 0) break;
        candidates.push(found);
        cursor = found + Math.max(1, needle.length);
      }
    }

    const ordered = unique(candidates);
    const inMethod = ordered.find(offset => {
      if (usedEvidenceOffsets.has(offset)) return false;
      const line = lineNumberAtOffset(raw, offset);
      return result.methods.some(method =>
        line >= (method.startLine || 1) &&
        line <= (method.endLine || Number.MAX_SAFE_INTEGER)
      );
    });

    if (inMethod !== undefined) return inMethod;
    return ordered.find(offset => !usedEvidenceOffsets.has(offset))
      ?? ordered[0]
      ?? -1;
  }

  for (const dependency of result.dependencies) {
    const offset = findDependencyOffset(dependency);

    if (offset >= 0) {
      usedEvidenceOffsets.add(offset);
      dependency.line = lineNumberAtOffset(raw, offset);
      dependency.column = Math.max(
        1,
        offset - raw.lastIndexOf("\n", offset - 1)
      );

      const owner = result.methods.find(method =>
        dependency.line >= (method.startLine || 1) &&
        dependency.line <= (method.endLine || Number.MAX_SAFE_INTEGER)
      );

      if (owner) dependency.methodOwner = owner.name;
    }

    dependency.confidence =
      dependency.confidence ||
      (
        dependency.type === "method-call" ||
        dependency.type === "instantiation"
          ? "high"
          : dependency.type === "extends" ||
            dependency.type === "implements"
            ? "high"
            : dependency.type === "generic-type" ||
              dependency.type === "type-reference"
              ? "medium"
              : "medium"
      );

    dependency.canonical = createCanonicalRelationship({
      from: result.id,
      toName: dependency.toName,
      type: dependency.type,
      method: dependency.method,
      methodOwner: dependency.methodOwner,
      line: dependency.line,
      column: dependency.column,
      confidence: dependency.confidence,
      evidence: dependency.evidence
    });
  }

  result.methods = result.methods.map(method => {
    const methodDeps = result.dependencies.filter(
      dependency => dependency.methodOwner === method.name
    );
    return {
      ...method,
      dependencies: methodDeps.map(dependency => ({
        to: dependency.toName,
        type: dependency.type,
        method: dependency.method || null,
        line: dependency.line || null,
        confidence: dependency.confidence || null,
        evidence: dependency.evidence || null,
        canonical: dependency.canonical || createCanonicalRelationship({
          from: result.id,
          toName: dependency.toName,
          type: dependency.type,
          method: dependency.method,
          methodOwner: method.name,
          line: dependency.line,
          column: dependency.column,
          confidence: dependency.confidence,
          evidence: dependency.evidence
        })
      })),
      dependencyCount: methodDeps.length
    };
  });

  result.objects = unique(result.objects);
  result.fields = uniqueBy(
    result.fields,
    x => `${x.object}.${x.field}`
  );
  result.dependencies = uniqueBy(
    result.dependencies,
    x =>
      `${x.from}|${x.toName}|${x.type}|${x.method || ""}`
  );

  return result;
}

// ============================================================
// LWC parsing
// ============================================================

function parseLwcJs(file) {
  const raw = read(file);
  const content = stripComments(raw);
  const name = lwcName(file);

  const result = {
    id: `LWC:${name}`,
    type: "LWC",
    name,
    file: rel(file),
    lines: countLines(raw),
    apex: [],
    childComponents: [],
    imports: [],
    dependencies: [],
    events: [],
    capabilities: [],
    schemaReferences: [],
    wireAdapters: [],
    apiProperties: [],
    sourceHash: crypto.createHash("sha256").update(raw).digest("hex"),
    lineCount: countLines(raw)
  };

  let m;

  const apexRegex =
    /from\s+['"]@salesforce\/apex\/([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)['"]/g;

  while ((m = apexRegex.exec(content))) {
    result.apex.push({
      className: m[1],
      methodName: m[2]
    });

    result.dependencies.push({
      from: result.id,
      toName: m[1],
      type: "lwc-apex",
      method: m[2],
      evidence:
        `@salesforce/apex/${m[1]}.${m[2]}`
    });
  }

  const childRegex =
    /from\s+['"]c\/([A-Za-z0-9_-]+)['"]/g;

  while ((m = childRegex.exec(content))) {
    result.childComponents.push(m[1]);

    result.dependencies.push({
      from: result.id,
      toName: m[1],
      type: "lwc-import",
      evidence: `c/${m[1]}`
    });
  }

  const imports =
    content.match(
      /from\s+['"]([^'"]+)['"]/g
    ) || [];

  result.imports = unique(
    imports.map(x =>
      x.replace(/^from\s+['"]|['"]$/g, "")
    )
  );

  if (/lightning\/uiRecordApi/.test(content)) {
    result.capabilities.push("UI Record API");
  }

  if (
    /lightning\/uiObjectInfoApi/.test(content)
  ) {
    result.capabilities.push("UI Object Info API");
  }

  if (
    /lightning\/uiRelatedListApi/.test(content)
  ) {
    result.capabilities.push("UI Related List API");
  }

  if (/lightning\/navigation/.test(content)) {
    result.capabilities.push("Navigation");
  }

  if (/lightning\/messageService/.test(content)) {
    result.capabilities.push("Lightning Message Service");
  }

  if (/@wire\b/.test(content)) {
    result.capabilities.push("Wire");
  }

  const customEvent =
    /new\s+CustomEvent\s*\(\s*['"]([^'"]+)['"]/g;

  while ((m = customEvent.exec(content))) {
    result.events.push({
      direction: "dispatch",
      name: m[1]
    });
  }

  if (/\bpublish\s*\(/.test(content)) {
    result.events.push({
      direction: "publish",
      name: "Lightning Message Service"
    });
  }

  if (/\bsubscribe\s*\(/.test(content)) {
    result.events.push({
      direction: "subscribe",
      name: "Lightning Message Service"
    });
  }

  result.capabilities = unique(result.capabilities);
  result.events = uniqueBy(
    result.events,
    x => `${x.direction}:${x.name}`
  );

  return result;
}

function parseLwcHtml(file) {
  const content = read(file);
  const name = lwcName(file);

  const result = {
    id: `LWC_HTML:${name}`,
    type: "LWC_HTML",
    name,
    file: rel(file),
    dependencies: []
  };

  let m;

  const childRegex =
    /<c-([A-Za-z0-9-]+)\b/g;

  while ((m = childRegex.exec(content))) {
    result.dependencies.push({
      from: `LWC:${name}`,
      toName: m[1],
      type: "lwc-template-child",
      evidence: `<c-${m[1]}>`
    });
  }

  return result;
}

// ============================================================
// Trigger parsing
// ============================================================

function parseTrigger(file) {
  const raw = read(file);
  const content = stripComments(raw);
  const name = path.basename(file, ".trigger");

  const result = {
    id: `Trigger:${name}`,
    type: "Trigger",
    name,
    file: rel(file),
    lines: countLines(raw),
    object: null,
    events: [],
    dependencies: []
  };

  const declaration =
    content.match(
      /\btrigger\s+([A-Za-z0-9_]+)\s+on\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/i
    );

  if (declaration) {
    result.name = declaration[1];
    result.id = `Trigger:${result.name}`;
    result.object = declaration[2];
    result.events = declaration[3]
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  }

  const callRegex =
    /\b([A-Z][A-Za-z0-9_]*)\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;

  let m;

  while ((m = callRegex.exec(content))) {
    if (looksLikeClassName(m[1])) {
      result.dependencies.push({
        from: result.id,
        toName: m[1],
        type: "trigger-handler",
        method: m[2],
        evidence: `${m[1]}.${m[2]}()`
      });
    }
  }

  result.dependencies = uniqueBy(
    result.dependencies,
    x =>
      `${x.from}|${x.toName}|${x.type}|${x.method || ""}`
  );

  return result;
}

// ============================================================
// Visualforce
// ============================================================

function parseVisualforce(file) {
  const content = read(file);
  const name = path.basename(
    file,
    path.extname(file)
  );

  const dependencies = [];

  const regex =
    /\b(?:controller|extensions)\s*=\s*["']([^"']+)["']/gi;

  let m;

  while ((m = regex.exec(content))) {
    for (
      const controller of m[1]
        .split(",")
        .map(x => x.trim())
        .filter(Boolean)
    ) {
      dependencies.push({
        from: `Visualforce:${name}`,
        toName: controller,
        type: "visualforce-controller",
        evidence: controller
      });
    }
  }

  return {
    id: `Visualforce:${name}`,
    type: "Visualforce",
    name,
    file: rel(file),
    dependencies
  };
}

// ============================================================
// Object / field registry
// ============================================================

function buildObjectRegistry(discovered) {
  const objects = [];

  for (const file of discovered.objects) {
    const name = path.basename(
      file,
      ".object-meta.xml"
    );

    objects.push({
      id: `Object:${name}`,
      type: "Object",
      name,
      file: rel(file)
    });
  }

  for (const file of discovered.fields) {
    const fieldsDir = `${path.sep}fields${path.sep}`;
    const index = file.lastIndexOf(fieldsDir);

    let objectName = "Unknown";

    if (index >= 0) {
      const before = file.substring(0, index);
      objectName =
        path.basename(
          before
        );
    }

    const fieldName = path.basename(
      file,
      ".field-meta.xml"
    );

    objects.push({
      id: `Field:${objectName}.${fieldName}`,
      type: "Field",
      name: `${objectName}.${fieldName}`,
      object: objectName,
      file: rel(file)
    });
  }

  return objects;
}

// ============================================================
// Registry
// ============================================================

function buildRegistry(discovered) {
  const symbols = [];
  const byName = new Map();

  function add(symbol) {
    symbols.push(symbol);

    if (!byName.has(symbol.name)) {
      byName.set(symbol.name, []);
    }

    byName.get(symbol.name).push(symbol);
  }

  for (const file of discovered.apexClasses) {
    const parsed = parseApex(file);

    add({
      id: parsed.id,
      type: parsed.type,
      name: parsed.name,
      file: parsed.file,
      parsed
    });
  }

  for (const file of discovered.apexTriggers) {
    const parsed = parseTrigger(file);

    add({
      id: parsed.id,
      type: parsed.type,
      name: parsed.name,
      file: parsed.file,
      parsed
    });
  }

  for (const file of discovered.lwcJs) {
    const parsed = parseLwcJs(file);

    add({
      id: parsed.id,
      type: parsed.type,
      name: parsed.name,
      file: parsed.file,
      parsed
    });
  }

  for (const file of discovered.visualforce) {
    const parsed = parseVisualforce(file);

    add({
      id: parsed.id,
      type: parsed.type,
      name: parsed.name,
      file: parsed.file,
      parsed
    });
  }

  for (const symbol of buildObjectRegistry(discovered)) {
    add(symbol);
  }

  return {
    symbols,
    byName
  };
}

// ============================================================
// Graph resolution
// ============================================================

function resolveByName(name, registry) {
  return registry.byName.get(name) || [];
}

function classifyUnresolvedReference(name, type) {
  const standardObjects = new Set([
    "Account", "Asset", "Case", "Contact", "ContentDocument",
    "ContentDocumentLink", "ContentVersion", "Event", "Lead",
    "Opportunity", "Order", "Product2", "Task", "User",
    "Campaign", "Contract", "Quote", "Pricebook2", "PricebookEntry"
  ]);

  if (type === "soql-object" && standardObjects.has(name)) {
    return "SALESFORCE_STANDARD";
  }
  if (type === "lwc-apex") return "EXTERNAL_OR_UNRESOLVED_APEX";
  if (type === "lwc-import" || type === "lwc-template-child") {
    return "EXTERNAL_OR_UNRESOLVED_LWC";
  }
  return "UNKNOWN";
}

function buildGraph(discovered, registry, options) {
  const nodes = [];
  const edgeMap = new Map();

  function addNode(node) {
    if (!nodes.some(x => x.id === node.id)) {
      nodes.push(node);
    }
  }

  function addEdge(edge) {
    if (!edge.from || !edge.to || edge.from === edge.to) {
      return;
    }

    const key = [
      edge.from,
      edge.to,
      edge.type,
      edge.method || "",
      edge.evidence || ""
    ].join("|");

    if (
      edgeMap.size >= options.maxGraphEdges &&
      !edgeMap.has(key)
    ) {
      return;
    }

    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        id: key,
        ...edge,
        canonical: createCanonicalRelationship(edge)
      });
    }
  }

  // Registry nodes.
  for (const symbol of registry.symbols) {
    addNode({
      id: symbol.id,
      name: symbol.name,
      type: symbol.type,
      file: symbol.file
    });
  }

  // Apex dependencies.
  for (const symbol of registry.symbols.filter(
    x => x.type === "ApexClass"
  )) {
    const parsed = symbol.parsed;

    for (const dependency of parsed.dependencies) {
      const targets =
        resolveByName(
          dependency.toName,
          registry
        ).filter(
          target =>
            target.id !== symbol.id
        );

      if (targets.length) {
        for (const target of targets) {
          addEdge({
            from: symbol.id,
            to: target.id,
            type: dependency.type,
            method: dependency.method || null,
            evidence: dependency.evidence || null
          });
        }
      } else {
        addEdge({
          from: symbol.id,
          to: `External:${dependency.toName}`,
          type: dependency.type,
          method: dependency.method || null,
          evidence: dependency.evidence || null,
          unresolved: true,
          resolutionCategory: classifyUnresolvedReference(dependency.toName, dependency.type)
        });
      }
    }

    // Object dependencies.
    for (const objectName of parsed.objects) {
      const targets =
        resolveByName(
          objectName,
          registry
        ).filter(
          x => x.type === "Object"
        );

      if (targets.length) {
        for (const target of targets) {
          addEdge({
            from: symbol.id,
            to: target.id,
            type: "soql-object",
            evidence: `SOQL FROM ${objectName}`
          });
        }
      } else {
        addEdge({
          from: symbol.id,
          to: `External:Object:${objectName}`,
          type: "soql-object",
          evidence: `SOQL FROM ${objectName}`,
          unresolved: true,
          resolutionCategory: classifyUnresolvedReference(objectName, "soql-object")
        });
      }

      // Field dependencies.
      for (const field of parsed.fields.filter(
        x => x.object === objectName
      )) {
        const targets =
          registry.byName.get(
            `${objectName}.${field.field}`
          ) || [];

        if (targets.length) {
          for (const target of targets) {
            if (target.type === "Field") {
              addEdge({
                from: symbol.id,
                to: target.id,
                type: "soql-field",
                evidence:
                  `${objectName}.${field.field}`
              });
            }
          }
        }
      }
    }

    // Test -> production.
    if (parsed.isTest) {
      for (const referenced of parsed.testReferences) {
        const targets =
          resolveByName(
            referenced,
            registry
          ).filter(
            x =>
              x.type === "ApexClass" &&
              x.id !== symbol.id
          );

        for (const target of targets) {
          addEdge({
            from: symbol.id,
            to: target.id,
            type: "test-reference",
            evidence:
              `Test reference: ${referenced}`
          });
        }
      }
    }
  }

  // LWC JS.
  for (const symbol of registry.symbols.filter(
    x => x.type === "LWC"
  )) {
    const parsed = symbol.parsed;

    for (const dependency of parsed.dependencies) {
      if (dependency.type === "lwc-apex") {
        const targets =
          resolveByName(
            dependency.toName,
            registry
          ).filter(
            x => x.type === "ApexClass"
          );

        if (targets.length) {
          for (const target of targets) {
            addEdge({
              from: symbol.id,
              to: target.id,
              type: dependency.type,
              method: dependency.method,
              evidence: dependency.evidence
            });
          }
        } else {
          addEdge({
            from: symbol.id,
            to: `External:ApexClass:${dependency.toName}`,
            type: dependency.type,
            method: dependency.method,
            evidence: dependency.evidence,
            unresolved: true,
            resolutionCategory: classifyUnresolvedReference(dependency.toName, dependency.type)
          });
        }
      }

      if (
        dependency.type === "lwc-import"
      ) {
        const targets =
          resolveByName(
            dependency.toName,
            registry
          ).filter(
            x => x.type === "LWC"
          );

        if (targets.length) {
          for (const target of targets) {
            addEdge({
              from: symbol.id,
              to: target.id,
              type: dependency.type,
              evidence: dependency.evidence
            });
          }
        } else {
          addEdge({
            from: symbol.id,
            to: `External:LWC:${dependency.toName}`,
            type: dependency.type,
            evidence: dependency.evidence,
            unresolved: true,
            resolutionCategory: classifyUnresolvedReference(dependency.toName, dependency.type)
          });
        }
      }
    }
  }

  // LWC HTML.
  for (const file of discovered.lwcHtml) {
    const parsed = parseLwcHtml(file);
    const source = `LWC:${parsed.name}`;

    for (const dependency of parsed.dependencies) {
      const targets =
        resolveByName(
          dependency.toName,
          registry
        ).filter(
          x => x.type === "LWC"
        );

      if (targets.length) {
        for (const target of targets) {
          addEdge({
            from: source,
            to: target.id,
            type: dependency.type,
            evidence: dependency.evidence
          });
        }
      } else {
        addEdge({
          from: source,
          to: `External:LWC:${dependency.toName}`,
          type: dependency.type,
          evidence: dependency.evidence,
          unresolved: true
        });
      }
    }
  }

  // Triggers.
  for (const symbol of registry.symbols.filter(
    x => x.type === "Trigger"
  )) {
    const parsed = symbol.parsed;

    for (const dependency of parsed.dependencies) {
      const targets =
        resolveByName(
          dependency.toName,
          registry
        );

      if (targets.length) {
        for (const target of targets) {
          addEdge({
            from: symbol.id,
            to: target.id,
            type: dependency.type,
            method: dependency.method,
            evidence: dependency.evidence
          });
        }
      } else {
        addEdge({
          from: symbol.id,
          to: `External:${dependency.toName}`,
          type: dependency.type,
          method: dependency.method,
          evidence: dependency.evidence,
          unresolved: true
        });
      }
    }

    if (parsed.object) {
      const objectTargets =
        resolveByName(
          parsed.object,
          registry
        ).filter(
          x => x.type === "Object"
        );

      for (const target of objectTargets) {
        addEdge({
          from: symbol.id,
          to: target.id,
          type: "trigger-object",
          evidence:
            `Trigger ${parsed.name} on ${parsed.object}`
        });
      }
    }
  }

  // Visualforce.
  for (const symbol of registry.symbols.filter(
    x => x.type === "Visualforce"
  )) {
    for (const dependency of symbol.parsed.dependencies) {
      const targets =
        resolveByName(
          dependency.toName,
          registry
        );

      if (targets.length) {
        for (const target of targets) {
          addEdge({
            from: symbol.id,
            to: target.id,
            type: dependency.type,
            evidence: dependency.evidence
          });
        }
      } else {
        addEdge({
          from: symbol.id,
          to: `External:${dependency.toName}`,
          type: dependency.type,
          evidence: dependency.evidence,
          unresolved: true
        });
      }
    }
  }

  // Include external nodes that were actually referenced.
  for (const edge of edgeMap.values()) {
    if (
      edge.unresolved &&
      !nodes.some(x => x.id === edge.to)
    ) {
      nodes.push({
        id: edge.to,
        name: edge.to.replace(/^External:/, ""),
        type: "External",
        file: null
      });
    }
  }

  return {
    nodes,
    edges: [...edgeMap.values()]
  };
}

// ============================================================
// Indexes
// ============================================================

function indexes(graph) {
  const outgoing = new Map();
  const incoming = new Map();

  for (const node of graph.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (!outgoing.has(edge.from)) {
      outgoing.set(edge.from, []);
    }

    if (!incoming.has(edge.to)) {
      incoming.set(edge.to, []);
    }

    outgoing.get(edge.from).push(edge);
    incoming.get(edge.to).push(edge);
  }

  return { outgoing, incoming };
}

// ============================================================
// Metrics
// ============================================================

function metrics(graph) {
  const { outgoing, incoming } = indexes(graph);

  const output = [];

  for (const node of graph.nodes) {
    const inEdges = incoming.get(node.id) || [];
    const outEdges = outgoing.get(node.id) || [];

    const fanIn = inEdges.length;
    const fanOut = outEdges.length;

    const unresolved =
      outEdges.filter(
        x => x.unresolved
      ).length;

    let score = 0;
    const reasons = [];

    if (fanIn >= HIGH_FAN_IN) {
      score += 3;
      reasons.push("high fan-in");
    }

    if (fanOut >= HIGH_FAN_OUT) {
      score += 3;
      reasons.push("high fan-out");
    }

    if (fanIn + fanOut >= HIGH_COUPLING) {
      score += 3;
      reasons.push("high coupling");
    }

    if (unresolved > 0) {
      score += 1;
      reasons.push("unresolved references");
    }

    if (
      node.type === "ApexClass" &&
      inEdges.some(e => e.from.startsWith("LWC:"))
    ) {
      score += 2;
      reasons.push("direct LWC consumer");
    }

    if (
      node.type === "ApexClass" &&
      /Test$/i.test(node.name)
    ) {
      score -= 1;
    }

    const risk =
      score >= 6
        ? "HIGH"
        : score >= 3
          ? "MEDIUM"
          : "LOW";

    output.push({
      ...node,
      fanIn,
      fanOut,
      coupling: fanIn + fanOut,
      unresolved,
      score: Math.max(0, score),
      risk,
      reasons
    });
  }

  return output.sort(
    (a, b) =>
      b.score - a.score ||
      b.coupling - a.coupling ||
      b.fanOut - a.fanOut
  );
}

// ============================================================
// Cycle detection
// ============================================================

function stronglyConnectedComponents(graph) {
  const { outgoing } = indexes(graph);

  let index = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const low = new Map();
  const components = [];

  function connect(v) {
    indices.set(v, index);
    low.set(v, index);
    index++;

    stack.push(v);
    onStack.add(v);

    for (const edge of outgoing.get(v) || []) {
      const w = edge.to;

      if (!indices.has(w)) {
        connect(w);

        low.set(
          v,
          Math.min(
            low.get(v),
            low.get(w)
          )
        );
      } else if (onStack.has(w)) {
        low.set(
          v,
          Math.min(
            low.get(v),
            indices.get(w)
          )
        );
      }
    }

    if (
      low.get(v) ===
      indices.get(v)
    ) {
      const component = [];

      let w;

      do {
        w = stack.pop();
        onStack.delete(w);
        component.push(w);
      } while (w !== v);

      components.push(component);
    }
  }

  for (const node of graph.nodes) {
    if (!indices.has(node.id)) {
      connect(node.id);
    }
  }

  return components.filter(
    component =>
      component.length > 1 ||
      graph.edges.some(
        e =>
          e.from === component[0] &&
          e.to === component[0]
      )
  );
}

// ============================================================
// Traversal
// ============================================================

function traverse(
  start,
  adjacency,
  maxDepth
) {
  const results = [];
  const bestDepth = new Map();

  const queue = [{
    id: start,
    depth: 0,
    path: [start]
  }];

  while (queue.length) {
    const current = queue.shift();

    if (current.depth >= maxDepth) {
      continue;
    }

    for (const edge of adjacency.get(
      current.id
    ) || []) {
      const next = edge.from === current.id ? edge.to : edge.from;
      const depth = current.depth + 1;

      const existing = bestDepth.get(next);

      if (
        existing !== undefined &&
        existing <= depth
      ) {
        continue;
      }

      bestDepth.set(next, depth);

      const item = {
        id: next,
        depth,
        path: [...current.path, next],
        edge
      };

      results.push(item);

      queue.push(item);
    }
  }

  return results.sort(
    (a, b) =>
      a.depth - b.depth ||
      a.id.localeCompare(b.id)
  );
}

// ============================================================
// Target resolution
// ============================================================

function resolveTarget(target, registry) {
  if (!target) return [];

  const exactId =
    registry.symbols.filter(
      x =>
        x.id.toLowerCase() ===
        target.toLowerCase()
    );

  if (exactId.length) return exactId;

  const exactName =
    registry.byName.get(target) || [];

  if (exactName.length) return exactName;

  const q = target.toLowerCase();

  return registry.symbols.filter(
    x =>
      x.name.toLowerCase().includes(q) ||
      x.file.toLowerCase().includes(q)
  );
}

// ============================================================
// Impact analysis
// ============================================================

function impactFor(
  target,
  graph,
  registry,
  maxDepth
) {
  const { outgoing, incoming } =
    indexes(graph);

  const downstream =
    traverse(
      target.id,
      outgoing,
      maxDepth
    );

  const upstream =
    traverse(
      target.id,
      incoming,
      maxDepth
    );

  const directDependencies =
    outgoing.get(target.id) || [];

  const directDependents =
    incoming.get(target.id) || [];

  const downstreamIds =
    new Set(
      downstream.map(x => x.id)
    );

  const impactedLwc =
    [...downstreamIds].filter(
      id => id.startsWith("LWC:")
    );

  const impactedTests =
    [...downstreamIds].filter(
      id =>
        id.startsWith("ApexClass:") &&
        /Test$/i.test(id)
    );

  const impactedObjects =
    [...downstreamIds].filter(
      id => id.startsWith("Object:")
    );

  const impactedFields =
    [...downstreamIds].filter(
      id => id.startsWith("Field:")
    );

  const triggerImpact =
    [...downstreamIds].filter(
      id => id.startsWith("Trigger:")
    );

  const unresolved =
    [...downstreamIds].filter(
      id => id.startsWith("External:")
    );

  const totalImpact =
    downstream.length;

  const level =
    totalImpact >= 30
      ? "CRITICAL"
      : totalImpact >= 15
        ? "HIGH"
        : totalImpact >= 5
          ? "MEDIUM"
          : "LOW";

  return {
    target,
    level,
    directDependencies,
    directDependents,
    upstream,
    downstream,
    impactedLwc,
    impactedTests,
    impactedObjects,
    impactedFields,
    triggerImpact,
    unresolved
  };
}

// ============================================================
// Refactoring risk analysis
// ============================================================

function refactorAssessment(
  impact,
  metric
) {
  const findings = [];
  let score = 0;

  if (
    impact.level === "CRITICAL"
  ) {
    score += 5;
    findings.push(
      "Large downstream dependency surface."
    );
  } else if (
    impact.level === "HIGH"
  ) {
    score += 4;
    findings.push(
      "Large downstream dependency surface."
    );
  } else if (
    impact.level === "MEDIUM"
  ) {
    score += 2;
  }

  if (
    metric &&
    metric.fanIn >= HIGH_FAN_IN
  ) {
    score += 3;
    findings.push(
      "Many components directly depend on this symbol."
    );
  }

  if (
    metric &&
    metric.fanOut >= HIGH_FAN_OUT
  ) {
    score += 3;
    findings.push(
      "This symbol has high outbound coupling."
    );
  }

  if (impact.impactedLwc.length) {
    score += 2;
    findings.push(
      "LWC consumers may require coordinated changes."
    );
  }

  if (impact.impactedTests.length) {
    score += 1;
    findings.push(
      "Existing tests are affected."
    );
  }

  if (impact.triggerImpact.length) {
    score += 2;
    findings.push(
      "Trigger behavior may be affected indirectly."
    );
  }

  if (impact.unresolved.length) {
    score += 2;
    findings.push(
      "Unresolved/dynamic dependencies require manual review."
    );
  }

  const risk =
    score >= 10
      ? "CRITICAL"
      : score >= 7
        ? "HIGH"
        : score >= 4
          ? "MEDIUM"
          : "LOW";

  const recommendedOrder = [
    "Read direct dependents before changing signatures.",
    "Preserve public/@AuraEnabled/@InvocableMethod contracts.",
    "Update production references.",
    "Update affected test classes.",
    "Run Apex tests for direct and transitive consumers.",
    "Run Salesforce Code Analyzer after the refactor."
  ];

  if (impact.impactedLwc.length) {
    recommendedOrder.splice(
      4,
      0,
      "Validate LWC Apex imports and response DTO contracts."
    );
  }

  if (impact.triggerImpact.length) {
    recommendedOrder.splice(
      4,
      0,
      "Validate trigger/automation behavior caused by DML."
    );
  }

  return {
    risk,
    score,
    findings,
    recommendedOrder
  };
}

// ============================================================
// Reports
// ============================================================

function summaryReport(
  discovered,
  graph,
  metricList,
  cycles
) {
  const lines = [];

  lines.push("# Salesforce Dependency Analysis Summary");
  lines.push("");
  lines.push(
    `Generated: ${new Date().toISOString()}`
  );
  lines.push("");

  lines.push("## Inventory");
  lines.push("");
  lines.push(`- Source files: ${discovered.files.length}`);
  lines.push(`- Apex classes: ${discovered.apexClasses.length}`);
  lines.push(`- Apex triggers: ${discovered.apexTriggers.length}`);
  lines.push(`- LWC JS: ${discovered.lwcJs.length}`);
  lines.push(`- LWC HTML: ${discovered.lwcHtml.length}`);
  lines.push(`- Visualforce: ${discovered.visualforce.length}`);
  lines.push(`- Flows: ${discovered.flows.length}`);
  lines.push(`- Objects: ${discovered.objects.length}`);
  lines.push(`- Fields: ${discovered.fields.length}`);
  lines.push(`- Graph nodes: ${graph.nodes.length}`);
  lines.push(`- Graph edges: ${graph.edges.length}`);
  lines.push(`- Circular groups: ${cycles.length}`);
  lines.push("");

  lines.push("## Highest Impact Components");
  lines.push("");
  lines.push(
    "| Component | Type | Fan-In | Fan-Out | Coupling | Risk |"
  );
  lines.push("|---|---|---:|---:|---:|---|");

  for (const item of metricList.slice(0, 40)) {
    lines.push(
      `| ${escapeMd(item.name)} | ${item.type} | ${item.fanIn} | ${item.fanOut} | ${item.coupling} | ${item.risk} |`
    );
  }

  lines.push("");
  lines.push("## Interpretation");
  lines.push("");
  lines.push(
    "- High fan-in = many consumers; changing the component has broad impact."
  );
  lines.push(
    "- High fan-out = the component knows/uses many other components."
  );
  lines.push(
    "- High coupling = both inbound and outbound dependency pressure."
  );
  lines.push(
    "- Unresolved references should be checked for dynamic Apex, metadata, managed-package symbols, or parser limitations."
  );
  lines.push("");

  return lines.join("\n");
}

function dependencyReport(
  graph,
  metricList,
  cycles
) {
  const lines = [];

  lines.push("# Salesforce Dependency Report");
  lines.push("");

  lines.push("## LWC → Apex");
  lines.push("");
  lines.push("| LWC | Apex | Method |");
  lines.push("|---|---|---|");

  for (const e of graph.edges.filter(
    x => x.type === "lwc-apex"
  )) {
    const c = e.canonical || createCanonicalRelationship(e);
    const methodStr = c.source.method && c.target.method
      ? `${c.source.method} -> ${c.target.method}`
      : c.target.method || c.source.method || "";
    lines.push(
      `| ${escapeMd(c.source.type + ":" + c.source.name)} | ${escapeMd(c.target.type + ":" + c.target.name)} | ${escapeMd(methodStr)} |`
    );
  }

  lines.push("");

  lines.push("## LWC → LWC");
  lines.push("");
  lines.push("| Parent | Child | Type |");
  lines.push("|---|---|---|");

  for (const e of graph.edges.filter(
    x =>
      x.type === "lwc-import" ||
      x.type === "lwc-template-child"
  )) {
    const c = e.canonical || createCanonicalRelationship(e);
    lines.push(
      `| ${escapeMd(c.source.type + ":" + c.source.name)} | ${escapeMd(c.target.type + ":" + c.target.name)} | ${c.relationship.type} |`
    );
  }

  lines.push("");

  lines.push("## Apex → Apex");
  lines.push("");
  lines.push("| From | To | Type | Method |");
  lines.push("|---|---|---|---|");

  for (const e of graph.edges.filter(
    x =>
      [
        "instantiation",
        "method-call",
        "type-reference",
        "generic-type",
        "extends",
        "implements",
        "test-reference",
        "trigger-handler"
      ].includes(x.type)
  )) {
    const c = e.canonical || createCanonicalRelationship(e);
    const methodStr = c.source.method && c.target.method
      ? `${c.source.method} -> ${c.target.method}`
      : c.target.method || c.source.method || "";
    lines.push(
      `| ${escapeMd(c.source.type + ":" + c.source.name)} | ${escapeMd(c.target.type + ":" + c.target.name)} | ${c.relationship.type} | ${escapeMd(methodStr)} |`
    );
  }

  lines.push("");

  lines.push("## Apex → Salesforce Data");
  lines.push("");
  lines.push("| Apex | Target | Type | Evidence |");
  lines.push("|---|---|---|---|");

  for (const e of graph.edges.filter(
    x =>
      x.type === "soql-object" ||
      x.type === "soql-field" ||
      x.type === "trigger-object"
  )) {
    const c = e.canonical || createCanonicalRelationship(e);
    lines.push(
      `| ${escapeMd(c.source.type + ":" + c.source.name)} | ${escapeMd(c.target.type + ":" + c.target.name)} | ${c.relationship.type} | ${escapeMd(e.evidence || "")} |`
    );
  }

  lines.push("");

  lines.push("## Circular Dependencies");
  lines.push("");

  if (!cycles.length) {
    lines.push("None detected.");
  } else {
    cycles.forEach((cycle, index) => {
      lines.push(`### Cycle ${index + 1}`);
      lines.push("");
      cycle.forEach(id => lines.push(`- ${id}`));
      lines.push("");
    });
  }

  lines.push("");

  lines.push("## High Risk Components");
  lines.push("");
  lines.push("| Component | Type | Fan-In | Fan-Out | Risk | Reasons |");
  lines.push("|---|---|---:|---:|---|---|");

  for (const item of metricList.filter(
    x => x.risk === "HIGH"
  )) {
    lines.push(
      `| ${escapeMd(item.name)} | ${item.type} | ${item.fanIn} | ${item.fanOut} | ${item.risk} | ${escapeMd(item.reasons.join(", "))} |`
    );
  }

  lines.push("");

  return lines.join("\n");
}

function unresolvedReport(graph) {
  const lines = [
    "# Unresolved Dependency References",
    "",
    "These were detected in source but could not be resolved to a local symbol.",
    "",
    "| From | To | Type | Evidence |",
    "|---|---|---|---|"
  ];

  for (const e of graph.edges.filter(
    x => x.unresolved
  )) {
    lines.push(
      `| ${escapeMd(e.from)} | ${escapeMd(e.to)} | ${e.type} | ${escapeMd(e.evidence || "")} |`
    );
  }

  lines.push("");

  return lines.join("\n");
}

function graphMermaid(graph) {
  const lines = ["graph TD"];
  const ids = new Map();
  let counter = 0;

  function gid(id) {
    if (!ids.has(id)) {
      ids.set(id, `N${++counter}`);
    }
    return ids.get(id);
  }

  for (const node of graph.nodes) {
    const methodLabel = Array.isArray(node.relevantMethods) && node.relevantMethods.length
      ? `\\nMethods: ${node.relevantMethods.join(", ")}`
      : "";
    const label =
      `${node.name}\\n[${node.type}]${methodLabel}`
        .replace(/"/g, "'")
        .replace(/[<>]/g, "");

    lines.push(
      `  ${gid(node.id)}["${label}"]`
    );
  }

  for (const edge of graph.edges) {
    const c = edge.canonical || createCanonicalRelationship(edge);
    const methodStr = c.source.method && c.target.method
      ? `${c.source.method}->${c.target.method}`
      : c.target.method || c.source.method || "";
    const label = methodStr
      ? `${c.relationship.type}: ${methodStr}`
      : c.relationship.type;

    lines.push(
      `  ${gid(edge.from)} -->|"${label.replace(/"/g, "'")}"| ${gid(edge.to)}`
    );
  }

  return lines.join("\n");
}

function graphDot(graph) {
  const lines = [
    "digraph SalesforceDependencies {",
    '  rankdir="LR";',
    '  graph [overlap=false];'
  ];

  const ids = new Map();
  let counter = 0;

  function gid(id) {
    if (!ids.has(id)) {
      ids.set(id, `N${++counter}`);
    }
    return ids.get(id);
  }

  for (const node of graph.nodes) {
    const shape =
      node.type === "LWC"
        ? "component"
        : node.type === "Object"
          ? "cylinder"
          : node.type === "Trigger"
            ? "diamond"
            : node.type === "External"
              ? "note"
              : "box";

    const methodLabel = Array.isArray(node.relevantMethods) && node.relevantMethods.length
      ? `\\nMethods: ${node.relevantMethods.join(", ")}`
      : "";
    lines.push(
      `  ${gid(node.id)} [label="${node.name}\\n${node.type}${methodLabel}", shape=${shape}];`
    );
  }

  for (const edge of graph.edges) {
    const c = edge.canonical || createCanonicalRelationship(edge);
    const methodStr = c.source.method && c.target.method
      ? `${c.source.method}->${c.target.method}`
      : c.target.method || c.source.method || "";
    const label = methodStr
      ? `${c.relationship.type}:${methodStr}`
      : c.relationship.type;

    lines.push(
      `  ${gid(edge.from)} -> ${gid(edge.to)} [label="${label.replace(/"/g, "'")}"];`
    );
  }

  lines.push("}");

  return lines.join("\n");
}


// ============================================================
// Deterministic Context / Intelligence Layer
// ============================================================

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function lineNumberAtOffset(content, offset) {
  if (offset == null || offset < 0) return null;
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function columnNumberAtOffset(content, offset) {
  if (offset == null || offset < 0) return null;
  const start = content.lastIndexOf("\n", offset - 1);
  return offset - start;
}

function confidenceForDependencyType(type) {
  if (["method-call", "instantiation", "extends", "implements", "lwc-apex", "lwc-import", "lwc-template-child"].includes(type)) {
    return "HIGH";
  }
  if (["soql-object", "soql-field", "trigger-object", "test-reference"].includes(type)) {
    return "MEDIUM";
  }
  if (["type-reference", "generic-type"].includes(type)) {
    return "MEDIUM";
  }
  return "LOW";
}

function methodRangesFromContent(content, methods = []) {
  const ranges = [];
  for (const method of methods) {
    const name = method && method.name;
    if (!name) continue;

    const signature = new RegExp(`\\b${escapeRegExp(name)}\\s*\\([^)]*\\)`, "g");
    const match = signature.exec(content);
    if (!match) continue;

    const braceStart = content.indexOf("{", match.index);
    if (braceStart < 0) {
      ranges.push({
        name,
        startOffset: match.index,
        endOffset: match.index + match[0].length
      });
      continue;
    }

    let depth = 0;
    let endOffset = content.length;
    for (let i = braceStart; i < content.length; i++) {
      const ch = content[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          endOffset = i + 1;
          break;
        }
      }
    }

    ranges.push({
      name,
      startOffset: match.index,
      endOffset
    });
  }
  return ranges.sort((a, b) => a.startOffset - b.startOffset);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nearestMethodForOffset(ranges, offset) {
  if (offset == null) return null;
  const match = ranges.find(x => offset >= x.startOffset && offset <= x.endOffset);
  return match ? match.name : null;
}


function dependencyEvidenceOffset(raw, dependency) {
  const evidence = dependency?.evidence || "";
  if (evidence) {
    const exact = raw.toLowerCase().indexOf(String(evidence).toLowerCase());
    if (exact >= 0) return exact;
  }

  if (dependency?.type === "method-call" && dependency?.toName && dependency?.method) {
    const pattern = new RegExp(
      `${escapeRegExp(dependency.toName)}\\s*\\.\\s*${escapeRegExp(dependency.method)}\\s*\\(`,
      "i"
    );
    const match = pattern.exec(raw);
    if (match) return match.index;
  }

  if (dependency?.toName) {
    const fallback = raw.toLowerCase().indexOf(String(dependency.toName).toLowerCase());
    if (fallback >= 0) return fallback;
  }

  return -1;
}

function enrichParsedSymbol(symbol) {
  if (!symbol || !symbol.file) return symbol;

  const absolute = path.resolve(PROJECT_ROOT, symbol.file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return symbol;

  const raw = read(absolute);
  const parsed = symbol.parsed || {};

  parsed.sourceHash = sha256(raw);
  parsed.sourceBytes = Buffer.byteLength(raw, "utf8");
  parsed.lineCount = countLines(raw);

  const ranges = methodRangesFromContent(raw, parsed.methods || []);

  for (const method of parsed.methods || []) {
    const range = ranges.find(x => x.name === method.name);
    if (!range) continue;

    method.lineStart = lineNumberAtOffset(raw, range.startOffset);
    method.lineEnd = lineNumberAtOffset(raw, range.endOffset);
    method.visibility =
      /\\bglobal\\b/.test(raw.slice(range.startOffset - 120, range.startOffset))
        ? "global"
        : /\\bpublic\\b/.test(raw.slice(range.startOffset - 120, range.startOffset))
          ? "public"
          : /\\bprotected\\b/.test(raw.slice(range.startOffset - 120, range.startOffset))
            ? "protected"
            : "private";

    const declarationWindow = raw.slice(Math.max(0, range.startOffset - 250), range.startOffset);
    method.isStatic = /\\bstatic\\b/.test(declarationWindow);
    method.isVirtual = /\\bvirtual\\b/.test(declarationWindow);
    method.isOverride = /\\boverride\\b/.test(declarationWindow);
    method.annotations = unique(
      [...declarationWindow.matchAll(/@([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1])
    );
  }

  for (const dependency of parsed.dependencies || []) {
    const offset = dependencyEvidenceOffset(raw, dependency);

    dependency.line = offset >= 0 ? lineNumberAtOffset(raw, offset) : null;
    dependency.column = offset >= 0 ? columnNumberAtOffset(raw, offset) : null;
    dependency.methodOwner = nearestMethodForOffset(ranges, offset);
    dependency.confidence = dependency.confidence || confidenceForDependencyType(dependency.type);
    dependency.file = symbol.file;
  }

  for (const field of parsed.fields || []) {
    const evidence = `${field.object}.${field.field}`;
    const offset = raw.toLowerCase().indexOf(evidence.toLowerCase());
    field.line = offset >= 0 ? lineNumberAtOffset(raw, offset) : null;
    field.confidence = "MEDIUM";
  }

  for (const dml of parsed.dml || []) {
    const evidence = dml.variable || dml.operation || "";
    const offset = evidence
      ? raw.toLowerCase().indexOf(String(evidence).toLowerCase())
      : -1;
    dml.line = offset >= 0 ? lineNumberAtOffset(raw, offset) : null;
    dml.confidence = "MEDIUM";
  }

  parsed.behavior = parsed.behavior || {};
  parsed.behavior.publicContracts = (parsed.methods || [])
    .filter(m =>
      m.visibility === "public" ||
      m.visibility === "global" ||
      m.isAuraEnabled ||
      m.isInvocable
    )
    .map(m => ({
      name: m.name,
      visibility: m.visibility,
      returnType: m.returnType,
      parameters: m.parameters,
      isAuraEnabled: Boolean(m.isAuraEnabled),
      isInvocable: Boolean(m.isInvocable),
      annotations: m.annotations || [],
      lineStart: m.lineStart || null,
      lineEnd: m.lineEnd || null
    }));

  parsed.behavior.async = [];
  if (/\bimplements\s+(?:Database\.)?Batchable\b/i.test(raw)) parsed.behavior.async.push("Batchable");
  if (/\bimplements\s+(?:Database\.)?Queueable\b/i.test(raw)) parsed.behavior.async.push("Queueable");
  if (/\bimplements\s+Schedulable\b/i.test(raw)) parsed.behavior.async.push("Schedulable");
  if (/@future\b/i.test(raw)) parsed.behavior.async.push("@future");
  if (/\bSystem\.enqueueJob\s*\(/i.test(raw)) parsed.behavior.async.push("System.enqueueJob");
  if (/\bEventBus\./i.test(raw)) parsed.behavior.async.push("Platform Event / EventBus");
  parsed.behavior.async = unique(parsed.behavior.async);

  parsed.behavior.securitySignals = [];
  if (/\bwith\s+sharing\b/i.test(raw)) parsed.behavior.securitySignals.push("with sharing");
  if (/\bwithout\s+sharing\b/i.test(raw)) parsed.behavior.securitySignals.push("without sharing");
  if (/\binherited\s+sharing\b/i.test(raw)) parsed.behavior.securitySignals.push("inherited sharing");
  if (/\bWITH\s+USER_MODE\b/i.test(raw)) parsed.behavior.securitySignals.push("SOQL USER_MODE");
  if (/\bWITH\s+SECURITY_ENFORCED\b/i.test(raw)) parsed.behavior.securitySignals.push("WITH SECURITY_ENFORCED");
  if (/\bDatabase\.[A-Za-z]+\([^)]*,\s*AccessLevel\.USER_MODE/i.test(raw)) parsed.behavior.securitySignals.push("DML USER_MODE");
  parsed.behavior.securitySignals = unique(parsed.behavior.securitySignals);

  parsed.behavior.errorHandling = {
    throws: (raw.match(/\bthrow\s+new\s+[A-Za-z0-9_.]+/g) || []).length,
    tryCatchBlocks: (raw.match(/\btry\s*\{/g) || []).length,
    auraHandledExceptions: (raw.match(/\bAuraHandledException\b/g) || []).length
  };

  parsed.behavior.queries = (parsed.objects || []).map(objectName => ({
    object: objectName,
    fields: unique((parsed.fields || []).filter(x => x.object === objectName).map(x => x.field))
  }));

  return symbol;
}

function enrichRegistry(registry) {
  for (const symbol of registry.symbols) {
    enrichParsedSymbol(symbol);
  }
  return registry;
}

// ============================================================
// Canonical Relationship Representation
// ============================================================

function parseIdParts(id, defaultType = "ApexClass") {
  if (!id) return { type: defaultType, name: "" };
  let str = String(id);
  if (str.startsWith("External:")) {
    const rest = str.slice("External:".length);
    if (rest.includes(":")) {
      const idx = rest.indexOf(":");
      return { type: rest.slice(0, idx), name: rest.slice(idx + 1) };
    }
    return { type: "External", name: rest };
  }
  if (str.includes(":")) {
    const idx = str.indexOf(":");
    return { type: str.slice(0, idx), name: str.slice(idx + 1) };
  }
  return { type: defaultType, name: str };
}

function determineResolution(edge) {
  if (!edge) return "UNRESOLVED";
  if (edge.unresolved || (edge.to && String(edge.to).startsWith("External:"))) {
    return "UNRESOLVED";
  }
  if (edge.resolution) {
    const u = String(edge.resolution).toUpperCase();
    if (["EXACT", "INFERRED", "HEURISTIC", "UNRESOLVED"].includes(u)) {
      return u;
    }
  }
  if (edge.relationship && edge.relationship.resolution) {
    const u = String(edge.relationship.resolution).toUpperCase();
    if (["EXACT", "INFERRED", "HEURISTIC", "UNRESOLVED"].includes(u)) {
      return u;
    }
  }
  const edgeType = edge.type || (edge.relationship && edge.relationship.type);
  if (["extends", "implements", "lwc-import", "visualforce-controller"].includes(edgeType)) {
    return "EXACT";
  }
  if (["method-call", "instantiation", "lwc-apex", "trigger-handler"].includes(edgeType)) {
    if (edge.confidence === "high" || edge.confidence === "HIGH") {
      return "EXACT";
    }
    return "INFERRED";
  }
  if (["type-reference", "generic-type", "test-reference"].includes(edgeType)) {
    return "INFERRED";
  }
  if (["soql-object", "soql-field", "trigger-object", "lwc-template-child"].includes(edgeType)) {
    return "HEURISTIC";
  }
  return (edge.confidence === "high" || edge.confidence === "HIGH") ? "EXACT" : "INFERRED";
}

function createCanonicalRelationship(raw) {
  if (!raw) return null;

  if (raw.source && raw.target && raw.relationship && raw.location) {
    return {
      source: {
        type: String(raw.source.type || "ApexClass"),
        name: String(raw.source.name || ""),
        method: raw.source.method || null
      },
      target: {
        type: String(raw.target.type || "ApexClass"),
        name: String(raw.target.name || ""),
        method: raw.target.method || null
      },
      relationship: {
        type: String(raw.relationship.type || "unknown"),
        resolution: determineResolution(raw)
      },
      location: {
        line: Number(raw.location.line) || 0,
        column: Number(raw.location.column) || 0
      }
    };
  }

  const sourceNode = parseIdParts(raw.from || raw.sourceId || (raw.source && raw.source.name));
  const targetNode = parseIdParts(raw.to || raw.toName || raw.targetId || (raw.target && raw.target.name));

  const sourceType = raw.sourceType || (raw.source && raw.source.type) || sourceNode.type;
  const sourceName = raw.sourceClass || raw.sourceName || (raw.source && raw.source.name) || sourceNode.name;
  const sourceMethod = raw.sourceMethod !== undefined
    ? raw.sourceMethod
    : (raw.methodOwner || (raw.source && raw.source.method) || null);

  const targetType = raw.targetType || (raw.target && raw.target.type) || targetNode.type;
  const targetName = raw.targetClass || raw.toName || raw.targetName || (raw.target && raw.target.name) || targetNode.name;
  const targetMethod = raw.targetMethod !== undefined
    ? raw.targetMethod
    : (raw.method || (raw.target && raw.target.method) || null);

  const relType = raw.type || (raw.relationship && raw.relationship.type) || "unknown";
  const resolution = determineResolution(raw);

  const line = raw.line ?? (raw.location && raw.location.line) ?? 0;
  const column = raw.column ?? (raw.location && raw.location.column) ?? 0;

  return {
    source: {
      type: sourceType,
      name: sourceName,
      method: sourceMethod || null
    },
    target: {
      type: targetType,
      name: targetName,
      method: targetMethod || null
    },
    relationship: {
      type: relType,
      resolution: resolution
    },
    location: {
      line: Number(line) || 0,
      column: Number(column) || 0
    }
  };
}

function edgeWithEvidence(edge) {
  const canonical = edge.canonical || createCanonicalRelationship(edge);
  return {
    id: edge.id || null,
    from: edge.from,
    to: edge.to,
    type: edge.type,
    method: edge.method || null,
    evidence: edge.evidence || null,
    file: edge.file || null,
    line: edge.line || null,
    column: edge.column || null,
    methodOwner: edge.methodOwner || null,
    confidence: edge.confidence || confidenceForDependencyType(edge.type),
    unresolved: Boolean(edge.unresolved),
    canonical: canonical
  };
}


function buildMethodCallGraph(target, result, metricById) {
  const nodes = nodeById(result.graph);
  const targetId = target.id;

  const outgoing = result.graph.edges
    .filter(edge =>
      edge.from === targetId &&
      edge.type === "method-call"
    )
    .map(edge => {
      const targetNode = nodes.get(edge.to);
      const canonical = edge.canonical || createCanonicalRelationship(edge);
      return {
        direction: "outgoing",
        sourceComponent: target.name,
        sourceMethod: edge.methodOwner || null,
        targetComponent: targetNode?.name || edge.to,
        targetType: targetNode?.type || null,
        targetMethod: edge.method || null,
        file: edge.file || target.file || null,
        line: edge.line || null,
        column: edge.column || null,
        confidence: edge.confidence || "high",
        evidence: edge.evidence || null,
        resolved: !edge.unresolved,
        canonical
      };
    });

  const incoming = result.graph.edges
    .filter(edge =>
      edge.to === targetId &&
      edge.type === "method-call"
    )
    .map(edge => {
      const sourceNode = nodes.get(edge.from);
      const canonical = edge.canonical || createCanonicalRelationship(edge);
      return {
        direction: "incoming",
        sourceComponent: sourceNode?.name || edge.from,
        sourceType: sourceNode?.type || null,
        sourceMethod: edge.methodOwner || null,
        targetComponent: target.name,
        targetMethod: edge.method || null,
        file: edge.file || sourceNode?.file || null,
        line: edge.line || null,
        column: edge.column || null,
        confidence: edge.confidence || "high",
        evidence: edge.evidence || null,
        resolved: !edge.unresolved,
        canonical
      };
    });

  const byMethod = new Map();

  function ensureMethod(name) {
    const key = name || "(class-scope)";
    if (!byMethod.has(key)) {
      byMethod.set(key, {
        method: name || null,
        calls: [],
        calledBy: []
      });
    }
    return byMethod.get(key);
  }

  for (const call of outgoing) {
    ensureMethod(call.sourceMethod).calls.push(call);
  }

  for (const call of incoming) {
    ensureMethod(call.targetMethod).calledBy.push(call);
  }

  for (const value of byMethod.values()) {
    value.calls = uniqueBy(
      value.calls,
      x => `${x.sourceMethod}|${x.targetComponent}|${x.targetMethod}|${x.line}|${x.evidence}`
    );
    value.calledBy = uniqueBy(
      value.calledBy,
      x => `${x.sourceComponent}|${x.sourceMethod}|${x.targetMethod}|${x.line}|${x.evidence}`
    );
  }

  return {
    outgoing: uniqueBy(
      outgoing,
      x => `${x.sourceMethod}|${x.targetComponent}|${x.targetMethod}|${x.line}|${x.evidence}`
    ),
    incoming: uniqueBy(
      incoming,
      x => `${x.sourceComponent}|${x.sourceMethod}|${x.targetMethod}|${x.line}|${x.evidence}`
    ),
    byMethod: [...byMethod.values()].sort((a, b) =>
      String(a.method || "").localeCompare(String(b.method || ""))
    )
  };
}

function enrichGraphEvidence(graph, registry) {
  const byId = new Map(registry.symbols.map(s => [s.id, s]));
  for (const edge of graph.edges) {
    const source = byId.get(edge.from);
    const parsed = source && source.parsed;
    const dep = parsed && (parsed.dependencies || []).find(d =>
      d.toName === (byId.get(edge.to)?.name || String(edge.to).replace(/^External:/, "").split(":").pop()) &&
      d.type === edge.type &&
      (d.method || null) === (edge.method || null)
    );

    if (dep) {
      edge.file = dep.file || source.file || null;
      edge.line = dep.line || null;
      edge.column = dep.column || null;
      edge.methodOwner = dep.methodOwner || null;
      edge.confidence = dep.confidence || confidenceForDependencyType(edge.type);
    } else {
      edge.confidence = edge.confidence || confidenceForDependencyType(edge.type);
    }
    edge.canonical = createCanonicalRelationship(edge);
  }
  return graph;
}

function nodeContextSummary(symbol, metricById) {
  if (!symbol) return null;
  const p = symbol.parsed || {};
  const metric = metricById.get(symbol.id) || null;

  return {
    id: symbol.id,
    name: symbol.name,
    type: symbol.type,
    file: symbol.file || null,
    lines: p.lines || p.lineCount || null,
    sourceHash: p.sourceHash || null,
    isTest: Boolean(p.isTest),
    sharing: p.sharing || null,
    extends: p.extends || [],
    implements: p.implements || [],
    annotations: p.annotations || [],
    methods: (p.methods || []).map(m => ({
      name: m.name,
      returnType: m.returnType || null,
      parameters: m.parameters || "",
      visibility: m.visibility || null,
      static: Boolean(m.isStatic),
      virtual: Boolean(m.isVirtual),
      override: Boolean(m.isOverride),
      auraEnabled: Boolean(m.isAuraEnabled),
      invocable: Boolean(m.isInvocable),
      annotations: m.annotations || [],
      lineStart: m.lineStart || null,
      lineEnd: m.lineEnd || null
    })),
    contracts: p.behavior?.publicContracts || [],
    async: p.behavior?.async || [],
    securitySignals: p.behavior?.securitySignals || [],
    errorHandling: p.behavior?.errorHandling || null,
    objects: p.objects || [],
    fields: p.fields || [],
    dml: p.dml || [],
    callouts: p.callouts || [],
    dynamicApex: p.dynamicApex || [],
    testReferences: p.testReferences || [],
    apex: p.apex || [],
    childComponents: p.childComponents || [],
    imports: p.imports || [],
    events: p.events || [],
    capabilities: p.capabilities || [],
    dependencies: (p.dependencies || []).map(d => ({
      toName: d.toName,
      type: d.type,
      method: d.method || null,
      evidence: d.evidence || null,
      line: d.line || null,
      column: d.column || null,
      methodOwner: d.methodOwner || null,
      confidence: d.confidence || confidenceForDependencyType(d.type),
      canonical: d.canonical || createCanonicalRelationship({
        from: symbol.id,
        toName: d.toName,
        type: d.type,
        method: d.method,
        methodOwner: d.methodOwner,
        line: d.line,
        column: d.column,
        confidence: d.confidence,
        evidence: d.evidence
      })
    })),
    metrics: metric
  };
}


// ============================================================
// Analysis snapshot cache
// ============================================================

function snapshotPath() {
  // The analysis snapshot is a full-project cache and must never live inside
  // a component-specific command directory.
  return path.join(BASE_OUTPUT_DIR, "analyze", "analysis-snapshot.json");
}

function computeFileHash(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath);
    return "sha256:" + crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

function getGitCommitHash(sourceDir) {
  try {
    const { execSync } = require("child_process");
    const commit = execSync("git rev-parse HEAD", {
      cwd: sourceDir,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    }).trim();
    return commit || null;
  } catch {
    return null;
  }
}

function computeSourceHash(sourceDir) {
  const discovered = discover(sourceDir);
  const files = unique(
    Object.values(discovered)
      .filter(Array.isArray)
      .flat()
      .filter(x => typeof x === "string")
  ).sort();

  const hash = crypto.createHash("sha256");
  for (const file of files) {
    try {
      const relPath = normalizePath(path.relative(PROJECT_ROOT, file));
      const stat = fs.statSync(file);
      hash.update(`${relPath}:${stat.size}:${stat.mtimeMs}\n`);
    } catch (_) {}
  }
  return "sha256:" + hash.digest("hex");
}

function generateAnalysisManifest(sourceDir, outputDir, reportJson, status = "COMPLETE") {
  const manifestPath = path.join(outputDir, "analysis-manifest.json");

  const fileCount = reportJson.inventory?.files ?? discover(sourceDir).files.length;
  const sourceHash = computeSourceHash(sourceDir);
  const gitCommit = getGitCommitHash(sourceDir);

  const artifacts = {};

  const knownArtifacts = [
    { key: "dependencyReport", file: "dependency-report.json" },
    { key: "analysisSnapshot", file: "analysis-snapshot.json" },
    { key: "architectureMetrics", file: "architecture-metrics.json" },
    { key: "dependencyReportMd", file: "dependency-report.md" },
    { key: "dependencySummaryMd", file: "dependency-summary.md" },
    { key: "unresolvedReferencesMd", file: "unresolved-references.md" },
    { key: "explorerData", file: "explorer-data.json", schemaVersion: "1.0.0" }
  ];

  for (const item of knownArtifacts) {
    const itemPath = path.join(outputDir, item.file);
    if (fs.existsSync(itemPath)) {
      const art = {
        path: item.file,
        fileHash: computeFileHash(itemPath)
      };
      if (item.schemaVersion) art.schemaVersion = item.schemaVersion;
      if (item.file === "explorer-data.json") {
        try {
          const parsed = JSON.parse(fs.readFileSync(itemPath, "utf8"));
          if (parsed.summary) {
            art.nodeCount = parsed.summary.nodeCount;
            art.edgeCount = parsed.summary.edgeCount;
          }
        } catch (_) {}
      }
      artifacts[item.key] = art;
    }
  }

  const manifest = {
    manifestVersion: "1.0.0",
    analyzerVersion: "13.0.0",
    contractVersion: "1.0.0",
    generatedAt: reportJson.generatedAt || new Date().toISOString(),
    source: {
      directory: rel(sourceDir),
      fileCount,
      sourceHash,
      gitCommit
    },
    status,
    artifacts
  };

  write(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

function snapshotFileState(sourceDir) {
  const discovered = discover(sourceDir);
  const files = unique(
    Object.values(discovered)
      .filter(Array.isArray)
      .flat()
      .filter(x => typeof x === "string")
  );

  return files.map(file => {
    try {
      const stat = fs.statSync(file);
      return {
        file: normalizePath(path.relative(PROJECT_ROOT, file)),
        size: stat.size,
        mtimeMs: stat.mtimeMs
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function snapshotIsFresh(snapshot, sourceDir, options = {}) {
  if (!snapshot) return false;

  // 1. Schema version check
  if (snapshot.schemaVersion !== CURRENT_SCHEMA_VERSION) return false;

  // 2. Analyzer version check
  const snapshotAnalyzerVersion = String(
    snapshot.analyzerVersion || (snapshot.analyzer && snapshot.analyzer.match(/v(\d+)/)?.[1]) || ""
  );
  if (snapshotAnalyzerVersion !== CURRENT_ANALYZER_VERSION) return false;

  // 3. Source directory check
  const expectedSource = normalizePath(path.resolve(sourceDir));
  const snapshotSource = normalizePath(
    path.isAbsolute(snapshot.sourceDirectory || "")
      ? path.normalize(snapshot.sourceDirectory)
      : path.resolve(PROJECT_ROOT, snapshot.sourceDirectory || "")
  );
  if (expectedSource !== snapshotSource) return false;

  // 4. Configuration check (e.g. maxGraphEdges)
  if (options && snapshot.options) {
    if (options.maxGraphEdges !== undefined && snapshot.options.maxGraphEdges !== undefined) {
      if (Number(options.maxGraphEdges) !== Number(snapshot.options.maxGraphEdges)) {
        return false;
      }
    }
  }

  // 5. Source fingerprint / file state check
  const current = snapshotFileState(sourceDir);
  const saved = Array.isArray(snapshot.fileState) ? snapshot.fileState : [];

  if (current.length !== saved.length) return false;

  const savedMap = new Map(saved.map(x => [normalizePath(x.file), `${x.size}:${x.mtimeMs}`]));
  for (const item of current) {
    const key = normalizePath(item.file);
    if (!savedMap.has(key)) return false;
    if (savedMap.get(key) !== `${item.size}:${item.mtimeMs}`) return false;
  }

  return true;
}

function rehydrateRegistry(snapshot) {
  const symbols = (snapshot.registry || []).map(symbol => ({
    id: symbol.id,
    type: symbol.type,
    name: symbol.name,
    file: symbol.file,
    parsed: symbol.parsed
  }));

  const byName = new Map();
  for (const symbol of symbols) {
    if (!byName.has(symbol.name)) byName.set(symbol.name, []);
    byName.get(symbol.name).push(symbol);
  }

  return { symbols, byName };
}

function loadAnalysisSnapshot(sourceDir, options = {}) {
  const file = snapshotPath();
  if (!fs.existsSync(file)) return null;

  try {
    const snapshot = JSON.parse(read(file));
    if (!snapshotIsFresh(snapshot, sourceDir, options)) return null;

    const registry = rehydrateRegistry(snapshot);
    return {
      discovered: snapshot.discovered || {
        sourceDir: snapshot.sourceDirectory,
        files: []
      },
      registry,
      graph: {
        nodes: snapshot.nodes || [],
        edges: snapshot.edges || []
      },
      metricList: snapshot.metrics || [],
      cycles: snapshot.cycles || [],
      fromSnapshot: true,
      snapshotGeneratedAt: snapshot.generatedAt
    };
  } catch (error) {
    if (!options.quiet) {
      console.warn(`Analysis snapshot unavailable: ${error.message}`);
    }
    return null;
  }
}

function getAnalysis(sourceDir, options = {}) {
  const isGlobalAnalyze = OUTPUT_DIR === path.join(BASE_OUTPUT_DIR, "analyze");

  if (options.fresh === true || options.useSnapshot === false) {
    return analyze(sourceDir, options, isGlobalAnalyze);
  }

  const cached = loadAnalysisSnapshot(sourceDir, options);
  if (cached) {
    if (!options.quiet) {
      console.log(`Using cached analysis snapshot: ${snapshotPath()}`);
      console.log(`Snapshot generated: ${cached.snapshotGeneratedAt}`);
    }
    return cached;
  }

  if (!options.quiet) {
    console.log("No fresh analysis snapshot found. Running full analysis...");
  }

  return analyze(sourceDir, options, isGlobalAnalyze);
}

function buildComponentIntelligence(target, result, options = {}) {
  const metricById = new Map(result.metricList.map(x => [x.id, x]));
  const nodes = nodeById(result.graph);
  const scopedResolution = ScopeResolver.resolve(target, result, options);
  const impact = scopedResolution.impact;
  const assessment = refactorAssessment(
    impact,
    metricById.get(target.id) || null
  );

  const directDependencies = result.graph.edges
    .filter(e => e.from === target.id)
    .map(edgeWithEvidence);

  const directDependents = result.graph.edges
    .filter(e => e.to === target.id)
    .map(edgeWithEvidence);

  const relatedIds = scopedResolution.relatedIds;
  const scopedNodesMap = new Map(scopedResolution.nodes.map(n => [n.id, n]));

  const related = [...relatedIds]
    .map(id => scopedNodesMap.get(id) || nodes.get(id))
    .filter(Boolean)
    .map(symbolNode => {
      const symbol = scopedResolution.registry.find(s => s.id === symbolNode.id) ||
        result.registry.symbols.find(s => s.id === symbolNode.id);
      return symbol ? nodeContextSummary(symbol, metricById) : symbolNode;
    });

  const relevantEdges = scopedResolution.edges
    .slice(0, options.maxContextEdges || 1000)
    .map(edgeWithEvidence);

  const unresolved = scopedResolution.edges
    .filter(e =>
      e.unresolved &&
      (e.from === target.id || e.to === target.id || relatedIds.has(e.from) || relatedIds.has(e.to))
    )
    .map(edgeWithEvidence);

  const reasoningReasons = [];
  if ((target.parsed?.dynamicApex || []).length) reasoningReasons.push("dynamic Apex detected");
  if (unresolved.length) reasoningReasons.push("unresolved or external dependencies detected");
  if ((target.parsed?.behavior?.async || []).length) reasoningReasons.push("asynchronous execution detected");
  if ((target.parsed?.behavior?.securitySignals || []).length) reasoningReasons.push("security/sharing behavior requires semantic review");
  if ((impact.impactedLwc || []).length) reasoningReasons.push("LWC contract impact");
  if ((impact.triggerImpact || []).length) reasoningReasons.push("trigger/automation impact");
  if ((impact.impactedTests || []).length) reasoningReasons.push("test behavior is affected");

  const sourceFiles = [];
  for (const id of relatedIds) {
    const node = nodes.get(id);
    if (!node?.file) continue;
    const absolute = path.resolve(PROJECT_ROOT, node.file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    sourceFiles.push({
      id: node.id,
      name: node.name,
      type: node.type,
      file: node.file,
      sourceHash: node.sourceHash || result.registry.symbols.find(s => s.id === node.id)?.parsed?.sourceHash || null,
      lines: node.lines || result.registry.symbols.find(s => s.id === node.id)?.parsed?.lineCount || null,
      role: node.id === target.id
        ? "target"
        : directDependencies.some(e => e.to === node.id)
          ? "dependency"
          : directDependents.some(e => e.from === node.id)
            ? "dependent"
            : node.type === "LWC"
              ? "lwc"
              : node.type === "ApexClass" && /Test$/i.test(node.name)
                ? "test"
                : "related"
    });
  }

  sourceFiles.sort((a, b) => {
    const rank = { target: 0, dependency: 1, dependent: 2, test: 3, lwc: 4, related: 5 };
    return (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.name.localeCompare(b.name);
  });

  const profile = options.profile || "full";
  const profileFields = {
    structural: ["identity", "metrics", "contracts", "dependencies", "dependents", "impact", "risks", "data", "frontend", "tests", "unresolved"],
    planning: ["identity", "metrics", "contracts", "methods", "dependencies", "dependents", "impact", "risks", "data", "frontend", "tests", "architecture", "unresolved"],
    implementation: ["identity", "metrics", "contracts", "methods", "dependencies", "dependents", "impact", "risks", "data", "frontend", "tests", "architecture", "unresolved", "sourceFiles"],
    full: ["identity", "metrics", "contracts", "methods", "dependencies", "dependents", "impact", "risks", "data", "frontend", "tests", "architecture", "unresolved", "sourceFiles"]
  };

  const methodCallGraph = buildMethodCallGraph(target, result, metricById);

  const intelligence = {
    schemaVersion: 6,
    generatedAt: new Date().toISOString(),
    analyzer: "Salesforce Dependency Analyzer v13",
    profile,
    target: nodeContextSummary(target, metricById),
    impact: {
      level: impact.level,
      directDependencies,
      directDependents,
      downstream: impact.downstream.slice(0, 300),
      upstream: impact.upstream.slice(0, 300),
      impactedLwc: impact.impactedLwc || [],
      impactedTests: impact.impactedTests || [],
      impactedObjects: impact.impactedObjects || [],
      impactedFields: impact.impactedFields || [],
      triggerImpact: impact.triggerImpact || [],
      unresolved
    },
    assessment,
    relatedComponents: related,
    graph: {
      edges: relevantEdges
    },
    callGraph: methodCallGraph,
    risks: {
      refactorRisk: assessment.risk,
      score: assessment.score,
      reasoningRequired: reasoningReasons.length > 0,
      reasons: unique(reasoningReasons)
    },
    data: {
      objects: unique([
        ...(target.parsed?.objects || []),
        ...((target.parsed?.fields || []).map(x => x.object))
      ]),
      fields: target.parsed?.fields || [],
      dml: target.parsed?.dml || [],
      soql: target.parsed?.soql || [],
      callouts: target.parsed?.callouts || [],
      dynamicApex: target.parsed?.dynamicApex || [],
      methodUsage: {
        soql: (target.parsed?.soql || []).map(x => ({
          method: x.methodOwner || null,
          object: x.object,
          line: x.line || null,
          confidence: x.confidence || null,
          evidence: x.evidence || null
        })),
        fields: (target.parsed?.fields || []).map(x => ({
          method: x.methodOwner || null,
          object: x.object,
          field: x.field,
          line: x.line || null,
          confidence: x.confidence || null
        })),
        dml: (target.parsed?.dml || []).map(x => ({
          method: x.methodOwner || null,
          operation: x.operation,
          variable: x.variable || null,
          line: x.line || null,
          confidence: x.confidence || null
        }))
      }
    },
    frontend: {
      lwcs: impact.impactedLwc || [],
      apexMethods: target.parsed?.apex || [],
      events: target.parsed?.events || [],
      capabilities: target.parsed?.capabilities || []
    },
    tests: {
      isTest: Boolean(target.parsed?.isTest),
      references: target.parsed?.testReferences || [],
      impacted: impact.impactedTests || []
    },
    architecture: {
      extends: target.parsed?.extends || [],
      implements: target.parsed?.implements || [],
      async: target.parsed?.behavior?.async || [],
      securitySignals: target.parsed?.behavior?.securitySignals || [],
      errorHandling: target.parsed?.behavior?.errorHandling || null,
      cycleMembership: result.cycles.filter(group => group.includes(target.id)),
      fanIn: metricById.get(target.id)?.fanIn || 0,
      fanOut: metricById.get(target.id)?.fanOut || 0
    },
    sourceFiles,
    evidence: {
      targetFile: target.file,
      targetSourceHash: target.parsed?.sourceHash || target.sourceHash || null,
      dependencyEvidence: directDependencies.map(edge => ({
        from: edge.from,
        to: edge.to,
        type: edge.type,
        method: edge.method || null,
        methodOwner: edge.methodOwner || null,
        line: edge.line || null,
        confidence: edge.confidence || null,
        evidence: edge.evidence || null,
        canonical: edge.canonical || createCanonicalRelationship(edge)
      })),
      unresolvedEvidence: unresolved.map(edge => ({
        from: edge.from,
        to: edge.to,
        type: edge.type,
        line: edge.line || null,
        evidence: edge.evidence || null,
        canonical: edge.canonical || createCanonicalRelationship(edge)
      }))
    },
    methodDetails: (target.parsed?.methods || []).map(method => {
      const methodGraph = methodCallGraph.byMethod.find(
        entry => entry.method === method.name
      ) || { calls: [], calledBy: [] };

      return {
        name: method.name,
        returnType: method.returnType,
        parameters: method.parameters,
        visibility: method.visibility,
        modifiers: method.modifiers || [],
        isStatic: Boolean(method.isStatic),
        isVirtual: Boolean(method.isVirtual),
        isOverride: Boolean(method.isOverride),
        isAbstract: Boolean(method.isAbstract),
        isAuraEnabled: Boolean(method.isAuraEnabled),
        isInvocable: Boolean(method.isInvocable),
        startLine: method.startLine || null,
        endLine: method.endLine || null,
        dependencyCount: method.dependencyCount || 0,
        dependencies: (method.dependencies || []).map(dependency => ({
          ...dependency,
          scope: "method",
          sourceMethod: method.name,
          sourceComponent: target.name
        })),
        calls: methodGraph.calls,
        calledBy: methodGraph.calledBy
      };
    }),
    uncertainty: {
      unresolvedCount: unresolved.length,
      dynamicApexCount: (target.parsed?.dynamicApex || []).length,
      asyncCount: (target.parsed?.behavior?.async || []).length,
      externalDependencyCount: directDependencies.filter(
        edge => edge.to && /^(External|Unknown):/i.test(edge.to)
      ).length
    }
  };

  intelligence.completeness = buildContextCompleteness(intelligence);

  // IMPORTANT: do not attach the projection to the canonical object.
  // A "full" projection would otherwise point back to `intelligence` and
  // create a circular JSON structure:
  // intelligence -> llmProjection -> intelligence.
  // The projection is computed at serialization time instead.
  return intelligence;
}


function buildContextCompleteness(intelligence) {
  const target = intelligence.target || {};
  const data = intelligence.data || {};
  const arch = intelligence.architecture || {};
  const impact = intelligence.impact || {};
  const methods = intelligence.methodDetails || [];
  const callGraph = intelligence.callGraph || {};
  const unresolved = intelligence.uncertainty || {};

  const checks = [
    {
      key: "identity",
      label: "Identity",
      weight: 8,
      ok: Boolean(target.name && target.type && target.file)
    },
    {
      key: "source",
      label: "Source metadata",
      weight: 5,
      ok: Boolean(target.file && target.sourceHash)
    },
    {
      key: "methods",
      label: "Method inventory",
      weight: 10,
      ok: target.type !== "ApexClass" || methods.length > 0
    },
    {
      key: "methodDependencies",
      label: "Method-level dependencies",
      weight: 12,
      ok: target.type !== "ApexClass" || methods.every(m =>
        Array.isArray(m.dependencies) && m.dependencies.every(d => d.sourceMethod)
      )
    },
    {
      key: "callGraph",
      label: "Method call graph",
      weight: 12,
      ok: target.type !== "ApexClass" || (
        Array.isArray(callGraph.outgoing) &&
        Array.isArray(callGraph.incoming) &&
        Array.isArray(callGraph.byMethod)
      )
    },
    {
      key: "data",
      label: "Data / SOQL / DML",
      weight: 10,
      ok: Boolean(data.objects && data.fields && data.soql && data.dml)
    },
    {
      key: "frontend",
      label: "Frontend relationships",
      weight: 7,
      ok: Boolean(intelligence.frontend)
    },
    {
      key: "tests",
      label: "Test relationships",
      weight: 7,
      ok: Boolean(intelligence.tests)
    },
    {
      key: "architecture",
      label: "Architecture / async / security",
      weight: 7,
      ok: Boolean(arch)
    },
    {
      key: "impact",
      label: "Impact / upstream / downstream",
      weight: 8,
      ok: Boolean(impact.downstream && impact.upstream)
    },
    {
      key: "evidence",
      label: "Source evidence",
      weight: 7,
      ok: Boolean(intelligence.evidence && intelligence.evidence.dependencyEvidence)
    },
    {
      key: "uncertainty",
      label: "Uncertainty explicitly surfaced",
      weight: 7,
      ok: unresolved.unresolvedCount !== undefined
    }
  ];

  const totalWeight = checks.reduce((n, x) => n + x.weight, 0);
  const earnedWeight = checks.filter(x => x.ok).reduce((n, x) => n + x.weight, 0);

  const gaps = [];
  if ((unresolved.unresolvedCount || 0) > 0) {
    gaps.push({
      type: "unresolved-references",
      count: unresolved.unresolvedCount,
      action: "Inspect only unresolved/external references."
    });
  }
  if ((unresolved.dynamicApexCount || 0) > 0) {
    gaps.push({
      type: "dynamic-apex",
      count: unresolved.dynamicApexCount,
      action: "Review dynamic Apex semantics."
    });
  }
  if ((unresolved.asyncCount || 0) > 0) {
    gaps.push({
      type: "async-semantics",
      count: unresolved.asyncCount,
      action: "Review asynchronous execution semantics."
    });
  }
  if ((arch.securitySignals || []).length) {
    gaps.push({
      type: "security-semantics",
      count: arch.securitySignals.length,
      action: "Review sharing/security behavior."
    });
  }
  if ((impact.impactedLwc || []).length) {
    gaps.push({
      type: "lwc-contract",
      count: impact.impactedLwc.length,
      action: "Review UI contract changes."
    });
  }

  const score = Math.round((earnedWeight / totalWeight) * 100);
  const reasoningRequired = gaps.length > 0;

  return {
    schemaVersion: 1,
    deterministicCoveragePercent: score,
    deterministicCoverageLabel:
      score >= 95 ? "EXCELLENT" :
      score >= 85 ? "GOOD" :
      score >= 70 ? "PARTIAL" : "LOW",
    reasoningRequired,
    llmInvestigationPercent: Math.max(0, 100 - score),
    checks: checks.map(x => ({
      key: x.key,
      label: x.label,
      weight: x.weight,
      status: x.ok ? "complete" : "gap"
    })),
    gaps,
    recommendation: reasoningRequired
      ? "Do not ask the LLM to rediscover repository structure. Send only the listed uncertainty areas plus relevant source evidence."
      : "No structural context-discovery LLM call is required. Use the deterministic context directly."
  };
}

function projectContextForProfile(intelligence, profile) {
  if (profile === "full") return intelligence;

  const allowed = {
    structural: new Set(["schemaVersion", "generatedAt", "analyzer", "profile", "target", "impact", "assessment", "risks", "data", "frontend", "tests", "architecture", "uncertainty", "completeness"]),
    planning: new Set(["schemaVersion", "generatedAt", "analyzer", "profile", "target", "impact", "assessment", "risks", "data", "frontend", "tests", "architecture", "relatedComponents", "graph", "callGraph", "methodDetails", "evidence", "uncertainty", "completeness"]),
    implementation: new Set(["schemaVersion", "generatedAt", "analyzer", "profile", "target", "impact", "assessment", "risks", "data", "frontend", "tests", "architecture", "relatedComponents", "graph", "callGraph", "sourceFiles", "methodDetails", "evidence", "uncertainty", "completeness"])
  }[profile] || null;

  if (!allowed) return intelligence;
  const projected = {};
  for (const key of allowed) projected[key] = intelligence[key];
  return projected;
}



const SALESFORCE_STANDARD_OBJECTS = new Set([
  "Account","Asset","Case","Contact","ContentDocument","ContentDocumentLink",
  "ContentVersion","Event","Group","Lead","Opportunity","Order","Product2",
  "Task","User","UserRole","Pricebook2","PricebookEntry","RecordType",
  "Campaign","CampaignMember","Contract","Quote","QuoteLineItem",
  "PermissionSet","PermissionSetAssignment","Profile","Organization",
  "CollaborationGroup","ContentWorkspace","ContentWorkspaceDoc"
]);

function classifyUnresolvedReference(ref) {
  const name = String(
    ref?.name || ref?.target || ref?.symbol || ref?.reference || ""
  ).trim();

  const evidence = String(
    ref?.evidence || ref?.detail || ref?.reason || ""
  );

  if (!name) {
    return {
      classification: "UNKNOWN",
      resolution: "LLM",
      confidence: "low",
      reason: "Reference has no identifiable symbol name."
    };
  }

  if (SALESFORCE_STANDARD_OBJECTS.has(name)) {
    return {
      classification: "SALESFORCE_STANDARD",
      resolution: "DETERMINISTIC",
      confidence: "high",
      reason: "Recognized Salesforce standard object."
    };
  }

  if (/__r$/.test(name)) {
    return {
      classification: "CUSTOM_RELATIONSHIP",
      resolution: "INFER",
      confidence: "medium",
      reason: "Reference uses a Salesforce relationship-name convention."
    };
  }

  if (/^__c$/.test(name) || /__c$/.test(name)) {
    return {
      classification: "CUSTOM_SALESFORCE",
      resolution: "INFER",
      confidence: "medium",
      reason: "Reference uses a Salesforce custom metadata/object naming convention."
    };
  }

  if (/Type\.forName|Type\.forName|dynamic|reflection|configuration/i.test(evidence)) {
    return {
      classification: "DYNAMIC_OR_METADATA_DRIVEN",
      resolution: "LLM",
      confidence: "medium",
      reason: "Evidence suggests runtime or configuration-driven resolution."
    };
  }

  if (/^([a-zA-Z_$][\w$]*\.)+[A-Z][\w$]*$/.test(name)) {
    return {
      classification: "EXTERNAL_OR_NAMESPACED",
      resolution: "LLM",
      confidence: "low",
      reason: "Namespaced/qualified symbol could not be deterministically resolved."
    };
  }

  return {
    classification: "UNKNOWN",
    resolution: "LLM",
    confidence: "low",
    reason: "Reference could not be deterministically classified."
  };
}

function enrichUnresolvedReferences(intelligence) {
  const refs =
    intelligence?.unresolvedReferences ||
    intelligence?.unresolved ||
    intelligence?.uncertainty?.unresolvedReferences ||
    [];

  const items = Array.isArray(refs) ? refs : [];
  const classified = items.map((ref, index) => ({
    id: `REF-${String(index + 1).padStart(3, "0")}`,
    reference: ref,
    ...classifyUnresolvedReference(ref)
  }));

  const summary = {
    detected: classified.length,
    deterministicallyResolved: classified.filter(
      x => x.resolution === "DETERMINISTIC"
    ).length,
    inferred: classified.filter(x => x.resolution === "INFER").length,
    requiresReasoning: classified.filter(x => x.resolution === "LLM").length
  };

  intelligence.unresolvedReferenceAnalysis = {
    version: 1,
    summary,
    items: classified
  };

  return intelligence.unresolvedReferenceAnalysis;
}

function buildSemanticCoverage(intelligence, investigationPlan) {
  const structural =
    Number(intelligence?.completeness?.deterministicCoveragePercent ?? 0);

  const unresolved =
    intelligence?.unresolvedReferenceAnalysis?.summary?.requiresReasoning ?? 0;

  const security =
    investigationPlan?.tasks?.filter(
      task => task.type === "security-semantics"
    ).length ?? 0;

  const semanticPenalty = Math.min(100, unresolved * 2 + security * 2);

  return {
    structuralCoveragePercent: structural,
    semanticCoveragePercent: Math.max(0, 100 - semanticPenalty),
    unresolvedRequiringReasoning: unresolved,
    securitySemanticTasks: security
  };
}



function scanApexSecuritySignals(sourceText, fileName = null) {
  const text = String(sourceText || "");
  const lines = text.split(/\r?\n/);
  const signals = [];
  let currentMethod = null;
  let braceDepth = 0;

  const methodRegex =
    /(?:public|private|protected|global)?\s*(?:static\s+|virtual\s+|override\s+|abstract\s+)*[\w<>\[\], ?]+\s+([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*(?:throws\s+[^{]+)?\{/;

  const add = (type, value, line, method = currentMethod) => {
    signals.push({
      type,
      value,
      file: fileName,
      line,
      method,
      evidence: lines[line - 1]?.trim() || ""
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    // Class-level sharing declaration.
    const sharing = line.match(/\b(with sharing|without sharing|inherited sharing)\b/i);
    if (sharing) add("sharing-model", sharing[1].toLowerCase(), lineNo, null);

    // Method ownership.
    const method = line.match(methodRegex);
    if (method) {
      currentMethod = method[1];
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      continue;
    }

    if (/\bWITH\s+SECURITY_ENFORCED\b/i.test(line)) {
      add("security-enforced", "WITH SECURITY_ENFORCED", lineNo);
    }
    if (/\bWITH\s+USER_MODE\b|\bAccessLevel\.USER_MODE\b/i.test(line)) {
      add("user-mode", "USER_MODE", lineNo);
    }
    if (/\bWITH\s+SYSTEM_MODE\b|\bAccessLevel\.SYSTEM_MODE\b/i.test(line)) {
      add("system-mode", "SYSTEM_MODE", lineNo);
    }
    if (/Security\.stripInaccessible\s*\(/i.test(line)) {
      add("strip-inaccessible", "Security.stripInaccessible", lineNo);
    }

    const crudPatterns = [
      ["crud-accessible", "isAccessible"],
      ["crud-createable", "isCreateable"],
      ["crud-updateable", "isUpdateable"],
      ["crud-deletable", "isDeletable"]
    ];
    for (const [type, name] of crudPatterns) {
      if (new RegExp(`\\b${name}\\s*\\(`, "i").test(line)) {
        add(type, name, lineNo);
      }
    }

    if (/\bDatabase\.query\s*\(|\bDatabase\.queryWithBinds\s*\(/i.test(line)) {
      add("dynamic-soql", "Database.query", lineNo);
    }
    if (/\bType\.forName\s*\(|\bnewInstance\s*\(/i.test(line)) {
      add("dynamic-apex", "Type.forName/newInstance", lineNo);
    }

    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;
    if (braceDepth <= 0 && currentMethod) {
      currentMethod = null;
      braceDepth = Math.max(0, braceDepth);
    }
  }

  return signals;
}

function getComponentSourceText(intelligence) {
  const target = intelligence?.target || {};
  const sourceText =
    target?.sourceText ||
    target?.source ||
    target?.content ||
    intelligence?.sourceText ||
    "";

  return typeof sourceText === "string" ? sourceText : "";
}

function analyzeSecurityIntelligence(intelligence) {
  const target = intelligence?.target || {};
  const parsed = target?.parsed || {};
  const behavior = parsed?.behavior || {};

  let securitySignals = Array.isArray(behavior?.securitySignals)
    ? behavior.securitySignals
    : [];

  let sourceText = getComponentSourceText(intelligence);

  if (!sourceText && target?.file) {
    try {
      const candidate = path.isAbsolute(target.file)
        ? target.file
        : path.join(PROJECT_ROOT, target.file);
      if (fs.existsSync(candidate)) {
        sourceText = fs.readFileSync(candidate, "utf8");
      }
    } catch (_) {
      // Keep security analysis deterministic and non-fatal if source cannot be read.
    }
  }

  if (!securitySignals.length && sourceText) {
    securitySignals = scanApexSecuritySignals(
      sourceText,
      target?.file || target?.path || null
    );
  }

  const signalText = securitySignals
    .map(x => typeof x === "string" ? x : JSON.stringify(x))
    .join("\n");

  const explicitSharing = securitySignals.find(
    s => s && s.type === "sharing-model"
  );

  const sharingModel = explicitSharing?.value
    ? String(explicitSharing.value).toLowerCase()
    : "unspecified";

  const securityEnforced = securitySignals.some(
    s => s?.type === "security-enforced"
  );

  const userMode = securitySignals.some(
    s => s?.type === "user-mode"
  );

  const systemMode = securitySignals.some(
    s => s?.type === "system-mode"
  );

  const stripInaccessible = securitySignals.some(
    s => s?.type === "strip-inaccessible"
  );

  const crudChecks = {
    accessible: securitySignals.some(s => s?.type === "crud-accessible"),
    createable: securitySignals.some(s => s?.type === "crud-createable"),
    updateable: securitySignals.some(s => s?.type === "crud-updateable"),
    deletable: securitySignals.some(s => s?.type === "crud-deletable")
  };

  const dynamicSoql = securitySignals.some(
    s => s?.type === "dynamic-soql"
  );

  const dynamicApex = securitySignals.some(
    s => s?.type === "dynamic-apex"
  );

  const facts = {
    sharingModel,
    securityEnforced,
    userMode,
    systemMode,
    stripInaccessible,
    crudChecks,
    dynamicSoql,
    dynamicApex,
    parserSecuritySignals: securitySignals
  };

  const unknowns = [];

  if (sharingModel === "unspecified") {
    unknowns.push({
      key: "sharing-model",
      question:
        "Determine the effective Apex sharing behavior for this class and its callers, given that no explicit sharing declaration was detected."
    });
  }

  if (
    !securityEnforced &&
    !userMode &&
    !stripInaccessible &&
    !Object.values(crudChecks).some(Boolean)
  ) {
    unknowns.push({
      key: "crud-fls",
      question:
        "Determine whether the component's object and field access relies on implicit platform behavior or requires explicit CRUD/FLS enforcement for the intended refactoring contract."
    });
  }

  if (dynamicSoql) {
    unknowns.push({
      key: "dynamic-soql-security",
      question:
        "Determine whether dynamically constructed SOQL changes the intended security model and whether the refactoring must preserve or strengthen that behavior."
    });
  }

  if (dynamicApex) {
    unknowns.push({
      key: "dynamic-apex-security",
      question:
        "Determine whether dynamic Apex can resolve to security-sensitive runtime behavior that cannot be established statically."
    });
  }

  return {
    version: 3,
    facts,
    unknowns,
    semanticReviewRequired: unknowns.length > 0
  };
}

function buildInvestigationPlan(intelligence) {
  const referenceAnalysis = enrichUnresolvedReferences(intelligence);
  const securityAnalysis = analyzeSecurityIntelligence(intelligence);
  intelligence.securityIntelligence = securityAnalysis;

  const gaps = intelligence?.completeness?.gaps || [];
  const tasks = [];

  const add = (type, priority, question, evidence = null) => {
    tasks.push({
      id: `INV-${String(tasks.length + 1).padStart(3, "0")}`,
      type,
      priority,
      question,
      evidence,
      instruction:
        "Investigate only this uncertainty. Do not rediscover deterministic context already present in the component package."
    });
  };

  for (const gap of gaps) {
    const text = typeof gap === "string" ? gap : JSON.stringify(gap);
    const lower = text.toLowerCase();

    if (lower.includes("security")) {
      // Security gaps are converted into targeted tasks from
      // analyzeSecurityIntelligence(); avoid creating a duplicate generic task.
      continue;
    } else if (lower.includes("dynamic")) {
      add(
        "dynamic-apex",
        "high",
        "Determine the runtime target of the dynamic Apex behavior and identify concrete classes, methods, objects, or configuration involved.",
        gap
      );
    } else if (lower.includes("async")) {
      add(
        "async-semantics",
        "medium",
        "Determine the asynchronous execution path, producer, consumer, and transaction or ordering implications.",
        gap
      );
    } else if (lower.includes("lwc")) {
      add(
        "frontend-contract",
        "medium",
        "Determine the semantic contract between the component and its LWC consumers that cannot be established deterministically.",
        gap
      );
    }
  }

  for (const unknown of securityAnalysis.unknowns) {
    add(
      "security-semantics",
      "medium",
      unknown.question,
      {
        key: unknown.key,
        knownSecurityFacts: securityAnalysis.facts
      }
    );
  }

  for (const item of referenceAnalysis.items.filter(
    x => x.resolution === "LLM"
  )) {
    const name =
      item.reference?.name ||
      item.reference?.target ||
      item.reference?.symbol ||
      item.reference ||
      "unknown";

    add(
      "unresolved-reference",
      "high",
      `Classify the unresolved reference "${String(name)}" using the supplied evidence only.`,
      item
    );
  }

  const priorityRank = { high: 3, medium: 2, low: 1 };
  const unique = new Map();

  for (const task of tasks) {
    const key = `${task.type}|${task.question}`;
    const existing = unique.get(key);

    if (
      !existing ||
      priorityRank[task.priority] > priorityRank[existing.priority]
    ) {
      unique.set(key, task);
    }
  }

  const dedupedTasks = Array.from(unique.values()).map((task, index) => ({
    ...task,
    id: `INV-${String(index + 1).padStart(3, "0")}`
  }));

  return {
    version: 2,
    component: intelligence?.target?.name || intelligence?.name || null,
    deterministicCoveragePercent:
      Number(intelligence?.completeness?.deterministicCoveragePercent ?? 100),
    semanticCoverage: buildSemanticCoverage(intelligence, {
      tasks: dedupedTasks
    }),
    unresolvedReferenceSummary: referenceAnalysis.summary,
    securityIntelligence: securityAnalysis,
    llmInvestigationRequired: dedupedTasks.length > 0,
    taskCount: dedupedTasks.length,
    tasks: dedupedTasks
  };
}

function writeInvestigationPlan(intelligence, packageDir) {
  const plan = buildInvestigationPlan(intelligence);

  write(
    path.join(packageDir, "06-INVESTIGATION-PLAN.json"),
    JSON.stringify(plan, null, 2)
  );

  write(
    path.join(packageDir, "07-SECURITY-INTELLIGENCE.json"),
    JSON.stringify(
      {
        component: plan.component,
        facts: plan.securityIntelligence?.facts || {},
        unknowns: plan.securityIntelligence?.unknowns || [],
        tasks: plan.tasks.filter(task => task.type === "security-semantics")
      },
      null,
      2
    )
  );

  const lines = [
    "# Investigation Plan",
    "",
    `Component: ${plan.component || "unknown"}`,
    `Structural coverage: ${plan.deterministicCoveragePercent}%`,
    `Semantic coverage: ${plan.semanticCoverage?.semanticCoveragePercent ?? 0}%`,
    `LLM investigation required: ${plan.llmInvestigationRequired ? "YES" : "NO"}`,
    `Tasks: ${plan.taskCount}`,
    "",
    "## Unresolved Reference Summary",
    `Detected: ${plan.unresolvedReferenceSummary?.detected ?? 0}`,
    `Deterministically resolved: ${plan.unresolvedReferenceSummary?.deterministicallyResolved ?? 0}`,
    `Inferred: ${plan.unresolvedReferenceSummary?.inferred ?? 0}`,
    `Requires reasoning: ${plan.unresolvedReferenceSummary?.requiresReasoning ?? 0}`,
    "",
    "## Security Facts",
    `Sharing model: ${plan.securityIntelligence?.facts?.sharingModel ?? "unknown"}`,
    `WITH SECURITY_ENFORCED: ${plan.securityIntelligence?.facts?.securityEnforced ? "yes" : "no"}`,
    `USER_MODE: ${plan.securityIntelligence?.facts?.userMode ? "yes" : "no"}`,
    `SYSTEM_MODE: ${plan.securityIntelligence?.facts?.systemMode ? "yes" : "no"}`,
    `stripInaccessible: ${plan.securityIntelligence?.facts?.stripInaccessible ? "yes" : "no"}`,
    `Dynamic SOQL: ${plan.securityIntelligence?.facts?.dynamicSoql ? "yes" : "no"}`,
    `Dynamic Apex: ${plan.securityIntelligence?.facts?.dynamicApex ? "yes" : "no"}`,
    ""
  ];

  if (!plan.tasks.length) {
    lines.push("No additional semantic investigation is required.");
  } else {
    for (const task of plan.tasks) {
      lines.push(
        `## ${task.id} — ${task.type}`,
        `Priority: ${task.priority}`,
        "",
        `Question: ${task.question}`,
        `Evidence: ${JSON.stringify(task.evidence)}`,
        ""
      );
    }
  }

  write(
    path.join(packageDir, "06-INVESTIGATION-PLAN.md"),
    lines.join("\n")
  );

  return plan;
}


function writeComponentIntelligencePackage(targetName, sourceDir, options = {}) {
  const result = getAnalysis(sourceDir, options);
  const matches = resolveTarget(targetName, result.registry);

  if (!matches.length) throw new Error(`Target not found: ${targetName}`);
  if (matches.length > 1) {
    throw new Error(
      `Target is ambiguous. Use the exact class/component name or ID.\n\n` +
      matches.slice(0, 20).map(x => `- ${x.name} [${x.type}] — ${x.file}`).join("\n")
    );
  }

  const target = matches[0];
  const intelligence = buildComponentIntelligence(target, result, options);
  const packageDir = OUTPUT_DIR;
  fs.mkdirSync(path.join(packageDir, "source"), { recursive: true });
  const investigationPlan = writeInvestigationPlan(intelligence, packageDir);

  const metricById = new Map((result.metricList || []).map(x => [x.id, x]));
  writeComponentAnalysisArtifacts(
    target,
    intelligence.impact,
    result,
    metricById.get(target.id) || null,
    intelligence.assessment,
    packageDir
  );

  write(path.join(packageDir, "00-MANIFEST.json"), JSON.stringify({
    schemaVersion: intelligence.schemaVersion,
    generatedAt: intelligence.generatedAt,
    analyzer: intelligence.analyzer,
    target: intelligence.target,
    profile: intelligence.profile,
    sourceFiles: intelligence.sourceFiles,
    reasoningRequired: intelligence.risks.reasoningRequired,
    reasoningReasons: intelligence.risks.reasons,
    deterministicCoveragePercent: intelligence.completeness?.deterministicCoveragePercent ?? null,
    llmInvestigationPercent: intelligence.completeness?.llmInvestigationPercent ?? null,
    investigationTaskCount: investigationPlan.taskCount,
    investigationPlan: "06-INVESTIGATION-PLAN.json",
    analysisSource: result.fromSnapshot ? "cached-snapshot" : "fresh-analysis",
    analysisGeneratedAt: result.snapshotGeneratedAt || intelligence.generatedAt
  }, null, 2));

  write(path.join(packageDir, "01-CONTEXT.json"), JSON.stringify(intelligence, null, 2));
  write(path.join(packageDir, "01-CONTEXT-COMPLETENESS.json"), JSON.stringify(intelligence.completeness, null, 2));
  write(path.join(packageDir, "02-GRAPH.json"), JSON.stringify(intelligence.graph, null, 2));

  const copied = [];
  if (options.includeSource !== false) {
    const used = new Set();
    const max = options.maxSourceFiles || 40;
    for (const item of intelligence.sourceFiles.slice(0, max)) {
      const absolute = path.resolve(PROJECT_ROOT, item.file);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;

      const base = safeName(`${item.type}-${item.name}-${path.basename(item.file)}`);
      let destination = path.join(packageDir, "source", base);
      let n = 2;
      while (used.has(destination)) destination = path.join(packageDir, "source", `${n++}-${base}`);
      used.add(destination);
      fs.copyFileSync(absolute, destination);
      copied.push({
        ...item,
        packageFile: normalizePath(path.relative(packageDir, destination))
      });
    }
  }

  intelligence.sourceFiles = copied.length ? copied : intelligence.sourceFiles;
  write(path.join(packageDir, "03-SOURCE-MANIFEST.json"), JSON.stringify(intelligence.sourceFiles, null, 2));

  const overview = [
    `# Deterministic Component Intelligence — ${target.name}`,
    "",
    `Generated: ${intelligence.generatedAt}`,
    `Profile: ${intelligence.profile}`,
    `Analyzer: ${intelligence.analyzer}`,
    "",
    "## Identity",
    "",
    `- Type: ${target.type}`,
    `- File: ${target.file || "N/A"}`,
    `- Lines: ${target.parsed?.lineCount || target.parsed?.lines || "N/A"}`,
    `- Source SHA-256: ${target.parsed?.sourceHash || "N/A"}`,
    `- Test class: ${target.parsed?.isTest ? "Yes" : "No"}`,
    `- Sharing: ${target.parsed?.sharing || "N/A"}`,
    "",
    "## Metrics",
    "",
    `- Fan-in: ${intelligence.architecture.fanIn}`,
    `- Fan-out: ${intelligence.architecture.fanOut}`,
    `- Refactoring risk: ${intelligence.risks.refactorRisk}`,
    `- Score: ${intelligence.risks.score}`,
    `- Reasoning required: ${intelligence.risks.reasoningRequired ? "YES" : "NO"}`,
    `- Deterministic coverage: ${intelligence.completeness?.deterministicCoveragePercent ?? "N/A"}%`,
    `- LLM investigation estimate: ${intelligence.completeness?.llmInvestigationPercent ?? "N/A"}%`,
    `- Reasons: ${intelligence.risks.reasons.join("; ") || "None"}`,
    "",
    "## Contracts",
    "",
    ...(target.parsed?.behavior?.publicContracts?.length
      ? target.parsed.behavior.publicContracts.map(x =>
          `- ${x.visibility || "private"} ${x.name}(${x.parameters || ""}) -> ${x.returnType || "void"}${x.isAuraEnabled ? " [AuraEnabled]" : ""}${x.isInvocable ? " [Invocable]" : ""} [L${x.lineStart || "?"}-${x.lineEnd || "?"}]`
        )
      : ["- None detected."]),
    "",
    "## Methods",
    "",
    ...(target.parsed?.methods?.length
      ? target.parsed.methods.map(x =>
          `- ${x.name}(${x.parameters || ""}) -> ${x.returnType || "void"} [L${x.lineStart || "?"}-${x.lineEnd || "?"}]`
        )
      : ["- None detected."]),
    "",
    "## Direct Dependencies",
    "",
    ...(intelligence.impact.directDependencies.length
      ? intelligence.impact.directDependencies.map(x =>
          `- ${x.to} | ${x.type} | ${x.method || ""} | ${x.confidence} | L${x.line || "?"} | ${x.evidence || ""}`
        )
      : ["- None detected."]),
    "",
    "## Direct Dependents",
    "",
    ...(intelligence.impact.directDependents.length
      ? intelligence.impact.directDependents.map(x =>
          `- ${x.from} | ${x.type} | ${x.method || ""} | ${x.confidence} | L${x.line || "?"} | ${x.evidence || ""}`
        )
      : ["- None detected."]),
    "",
    "## Data",
    "",
    `- Objects: ${intelligence.data.objects.join(", ") || "None"}`,
    `- Fields: ${(intelligence.data.fields || []).map(x => `${x.object}.${x.field}`).join(", ") || "None"}`,
    `- DML: ${(intelligence.data.dml || []).map(x => `${x.operation}${x.variable ? `(${x.variable})` : ""}`).join(", ") || "None"}`,
    `- Callouts: ${intelligence.data.callouts.join(", ") || "None"}`,
    `- Dynamic Apex: ${intelligence.data.dynamicApex.join(", ") || "None"}`,
    "",
    "## Frontend / LWC",
    "",
    `- Impacted LWCs: ${intelligence.frontend.lwcs.join(", ") || "None"}`,
    `- Apex methods used by LWC: ${(intelligence.frontend.apexMethods || []).map(x => `${x.className}.${x.methodName}`).join(", ") || "None"}`,
    `- Capabilities: ${intelligence.frontend.capabilities.join(", ") || "None"}`,
    `- Events: ${(intelligence.frontend.events || []).map(x => `${x.direction}:${x.name}`).join(", ") || "None"}`,
    "",
    "## Tests",
    "",
    `- Is test class: ${intelligence.tests.isTest ? "Yes" : "No"}`,
    `- Test references: ${intelligence.tests.references.join(", ") || "None"}`,
    `- Impacted tests: ${intelligence.tests.impacted.join(", ") || "None"}`,
    "",
    "## Architecture / Behavior",
    "",
    `- Extends: ${intelligence.architecture.extends.join(", ") || "None"}`,
    `- Implements: ${intelligence.architecture.implements.join(", ") || "None"}`,
    `- Async: ${intelligence.architecture.async.join(", ") || "None"}`,
    `- Security: ${intelligence.architecture.securitySignals.join(", ") || "None"}`,
    `- Cycles: ${intelligence.architecture.cycleMembership.length ? "YES" : "None"}`,
    "",
    "## Impact",
    "",
    `- Downstream nodes: ${intelligence.impact.downstream.length}`,
    `- Upstream nodes: ${intelligence.impact.upstream.length}`,
    `- Impacted LWC: ${intelligence.impact.impactedLwc.length}`,
    `- Impacted tests: ${intelligence.impact.impactedTests.length}`,
    `- Trigger impact: ${intelligence.impact.triggerImpact.length}`,
    `- Unresolved: ${intelligence.impact.unresolved.length}`,
    "",
    "## LLM Rule",
    "",
    "The analyzer is authoritative for structural facts. Do not spend LLM tokens rediscovering files, dependencies, callers, tests, objects, fields, or graph relationships.",
    "Use source files only for semantic reasoning that the analyzer cannot prove deterministically.",
    ""
  ];
  write(path.join(packageDir, "04-OVERVIEW.md"), overview.join("\n"));

  const projected = projectContextForProfile(intelligence, intelligence.profile || "full");
  const llmContext = [
    `# Component Context — ${target.name}`,
    "",
    "This is deterministic analyzer output. Structural facts are authoritative.",
    `Profile: ${intelligence.profile}`,
    `Reasoning required: ${intelligence.risks.reasoningRequired ? "YES" : "NO"}`,
    `Reasoning reasons: ${intelligence.risks.reasons.join("; ") || "None"}`,
    "",
    "## Machine-readable context",
    "",
    "See ./01-CONTEXT.json",
    "",
    "## LLM operating rule",
    "",
    "Do not rediscover dependencies or repository structure.",
    "Reason only about the provided evidence and source files.",
    "If information is missing or marked LOW confidence, identify the exact unknown.",
    "",
    "## Context summary",
    "",
    "```json",
    JSON.stringify(projected, null, 2),
    "```",
    "",
    "## Context completeness",
    "",
    `- Deterministic coverage: ${intelligence.completeness?.deterministicCoveragePercent ?? "N/A"}%`,
    `- LLM investigation estimate: ${intelligence.completeness?.llmInvestigationPercent ?? "N/A"}%`,
    `- Recommendation: ${intelligence.completeness?.recommendation || "N/A"}`,
    "",
    ...(intelligence.completeness?.gaps || []).map(g =>
      `- Gap: ${g.type} (${g.count}) — ${g.action}`
    ),
    "",
    "## Source files",
    "",
    ...(copied.length
      ? copied.map(x => `- ${x.packageFile} — ${x.role} — ${x.file}`)
      : ["- Source copying disabled."]),
    ""
  ];
  write(path.join(packageDir, "LLM_CONTEXT.md"), llmContext.join("\n"));

  console.log("");
  console.log(`Component context generated: ${packageDir}`);
  console.log(`Primary LLM context: ${path.join(packageDir, "LLM_CONTEXT.md")}`);
  console.log(`Canonical JSON: ${path.join(packageDir, "01-CONTEXT.json")}`);
  console.log(`Reasoning required: ${intelligence.risks.reasoningRequired ? "YES" : "NO"}`);
  console.log(`Investigation tasks: ${investigationPlan.taskCount}`);
  console.log(`Source files included: ${copied.length}`);
  console.log("");
}

function writePhaseContext(targetName, phase, sourceDir, options = {}) {
  const profileByPhase = {
    "1": "structural",
    "2": "structural",
    "3": "planning",
    "4": "implementation",
    "5": "implementation",
    "6": "implementation"
  };
  const profile = profileByPhase[String(phase)] || options.profile || "full";
  const nextOptions = { ...options, profile };
  writeComponentIntelligencePackage(targetName, sourceDir, nextOptions);

  const packageDir = OUTPUT_DIR;
  const phaseDir = OUTPUT_DIR;
  fs.mkdirSync(phaseDir, { recursive: true });

  const canonical = read(path.join(packageDir, "01-CONTEXT.json"));
  let context = canonical;
  try {
    const parsed = JSON.parse(canonical);
    const projection = parsed.llmProjection || projectContextForProfile(parsed, parsed.profile || "full");
    context = JSON.stringify(projection, null, 2);
  } catch {}

  write(path.join(phaseDir, "CONTEXT.json"), context);
  write(path.join(phaseDir, "LLM_CONTEXT.md"), [
    `# Phase ${phase} Context — ${targetName}`,
    "",
    `Profile: ${profile}`,
    "",
    "Use the deterministic analyzer context below.",
    "Do not rediscover structural dependencies with the LLM.",
    "",
    "```json",
    context,
    "```",
    ""
  ].join("\n"));

  console.log(`Phase context generated: ${phaseDir}`);
}


function writeContextCompleteness(targetName, sourceDir, options = {}) {
  const result = getAnalysis(sourceDir, options);
  const matches = resolveTarget(targetName, result.registry);

  if (!matches.length) throw new Error(`Target not found: ${targetName}`);
  if (matches.length > 1) {
    throw new Error(
      `Target is ambiguous. Use the exact class/component name or ID.\n\n` +
      matches.slice(0, 20).map(x => `- ${x.name} [${x.type}] — ${x.file}`).join("\n")
    );
  }

  const target = matches[0];
  const intelligence = buildComponentIntelligence(target, result, {
    ...options,
    profile: "full"
  });

  const packageDir = OUTPUT_DIR;
  fs.mkdirSync(packageDir, { recursive: true });

  write(
    path.join(packageDir, "01-CONTEXT-COMPLETENESS.json"),
    JSON.stringify(intelligence.completeness, null, 2)
  );

  const c = intelligence.completeness;
  console.log("");
  console.log(`Context completeness: ${target.name}`);
  console.log(`Deterministic coverage: ${c.deterministicCoveragePercent}% (${c.deterministicCoverageLabel})`);
  console.log(`LLM investigation estimate: ${c.llmInvestigationPercent}%`);
  console.log(`Reasoning required: ${c.reasoningRequired ? "YES" : "NO"}`);
  console.log("");
  console.log("Checks:");
  for (const check of c.checks) {
    console.log(`  ${check.status === "complete" ? "✓" : "!"} ${check.label}`);
  }
  if (c.gaps.length) {
    console.log("");
    console.log("LLM-relevant gaps:");
    for (const gap of c.gaps) {
      console.log(`  - ${gap.type}: ${gap.count} — ${gap.action}`);
    }
  }
  console.log("");
  console.log(c.recommendation);
  console.log("");
}

function runBatchContext(batchNumber, sourceDir, options = {}) {
  const batchId = String(batchNumber).padStart(2, "0");
  const batchFile = path.join(BASE_OUTPUT_DIR, "create-batches", "batches", `batch-${batchId}.json`);
  if (!fs.existsSync(batchFile)) {
    throw new Error(`Batch ${batchNumber} not found. Run create-batches first.`);
  }

  const batch = JSON.parse(read(batchFile));
  const result = getAnalysis(sourceDir, options);
  const metricById = new Map(result.metricList.map(m => [m.id, m]));
  const nodeMap = nodeById(result.graph);
  const ids = new Set(batch.components.map(x => x.id));

  const components = batch.components.map(component => {
    const symbol = result.registry.symbols.find(s => s.id === component.id);
    const directDependencies = result.graph.edges.filter(e => e.from === component.id).map(edgeWithEvidence);
    const directDependents = result.graph.edges.filter(e => e.to === component.id).map(edgeWithEvidence);
    const unresolved = result.graph.edges.filter(e =>
      e.unresolved && (e.from === component.id || e.to === component.id)
    ).map(edgeWithEvidence);

    return {
      id: component.id,
      name: component.name,
      type: component.type,
      file: component.file,
      metrics: metricById.get(component.id) || null,
      sourceHash: symbol?.parsed?.sourceHash || null,
      contracts: symbol?.parsed?.behavior?.publicContracts || [],
      methods: (symbol?.parsed?.methods || []).map(m => ({
        name: m.name,
        returnType: m.returnType,
        parameters: m.parameters,
        lineStart: m.lineStart || null,
        lineEnd: m.lineEnd || null
      })),
      dependencies: directDependencies,
      dependents: directDependents,
      unresolved
    };
  });

  const edges = result.graph.edges
    .filter(e => ids.has(e.from) || ids.has(e.to))
    .slice(0, options.maxContextEdges || 1000)
    .map(edgeWithEvidence);

  const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    analyzer: "Salesforce Dependency Analyzer v13",
    batch: Number(batchNumber),
    batchSize: components.length,
    sourceDirectory: rel(sourceDir),
    components,
    edges,
    instructions: {
      structuralFactsAreAuthoritative: true,
      llmShouldNotRediscoverDependencies: true,
      llmPurpose: "selection, prioritization, semantic reasoning"
    }
  };

  const dir = OUTPUT_DIR;
  fs.mkdirSync(dir, { recursive: true });
  write(path.join(dir, "CONTEXT.json"), JSON.stringify(output, null, 2));

  const md = [
    `# Deterministic Batch Context — Batch ${batchId}`,
    "",
    `Components: ${components.length}`,
    "",
    "| Component | Type | Fan-In | Fan-Out | Coupling | Risk | Reasoning Required |",
    "|---|---|---:|---:|---:|---|---|"
  ];

  for (const c of components) {
    const metric = c.metrics || {};
    const unresolvedCount = c.unresolved.length;
    const reasoning = unresolvedCount ? "YES" : "NO";
    md.push(`| ${c.name} | ${c.type} | ${metric.fanIn || 0} | ${metric.fanOut || 0} | ${metric.coupling || 0} | ${metric.risk || "LOW"} | ${reasoning} |`);
  }

  md.push(
    "",
    "## LLM Boundary",
    "",
    "Use this data for component selection. Do not ask the LLM to discover dependencies, files, tests, objects, or callers.",
    ""
  );
  write(path.join(dir, "LLM_CONTEXT.md"), md.join("\n"));

  console.log(`Batch context generated: ${dir}`);
}


// ============================================================

// ============================================================
// Scope Resolver & Component-scoped analysis artifacts
// Global Graph -> Scope Resolver -> Scoped Graph
// ============================================================

class ScopeResolver {
  /**
   * Resolves component-scoped graph and filtered symbol definitions from global graph.
   * Target component retains full methods/contracts.
   * Related components retain only methods participating in active dependency paths.
   *
   * @param {Object} target Target symbol/node object
   * @param {Object} globalResult Full global analysis result (graph, registry, metrics, etc.)
   * @param {Object} options Configuration options (maxDepth, relationship filtering, etc.)
   * @returns {Object} Scoped resolution object containing nodes, edges, registry, metrics, cycles, etc.
   */
  static resolve(target, globalResult, options = {}) {
    if (!target || !target.id) {
      throw new Error("ScopeResolver.resolve requires a valid target node with an id");
    }

    const maxDepth = options.maxDepth || options.maxImpactDepth || 50;
    const impact = impactFor(target, globalResult.graph, globalResult.registry, maxDepth);

    const relatedIds = new Set([target.id]);
    const pathPairs = new Set();

    function addTraversalPaths(items) {
      for (const item of items || []) {
        const ids = Array.isArray(item.path) ? item.path : [];
        for (let i = 0; i < ids.length - 1; i++) {
          relatedIds.add(ids[i]);
          relatedIds.add(ids[i + 1]);
          pathPairs.add(`${ids[i]}|${ids[i + 1]}`);
        }
        if (item.id) relatedIds.add(item.id);
      }
    }

    addTraversalPaths(impact.downstream);
    addTraversalPaths(impact.upstream);

    const directPairs = new Set([
      ...(impact.directDependencies || []).map(e => `${e.from}|${e.to}`),
      ...(impact.directDependents || []).map(e => `${e.from}|${e.to}`)
    ]);

    let finalEdges = globalResult.graph.edges.filter(edge =>
      pathPairs.has(`${edge.from}|${edge.to}`) ||
      directPairs.has(`${edge.from}|${edge.to}`) ||
      (relatedIds.has(edge.from) && relatedIds.has(edge.to))
    );

    // Keep method-level relationships for related classes instead of leaking unrelated methods/fields.
    finalEdges = finalEdges.filter(edge => {
      const sourceIsTarget = edge.from === target.id;
      const targetIsTarget = edge.to === target.id;

      if (sourceIsTarget || targetIsTarget) return true;
      if (edge.type === "method-call") return true;

      return Boolean(edge.method || edge.methodOwner);
    });

    const finalRelatedIds = new Set([target.id]);
    for (const edge of finalEdges) {
      finalRelatedIds.add(edge.from);
      finalRelatedIds.add(edge.to);
    }

    const relevantMethodsById = new Map();
    for (const edge of finalEdges) {
      if (!relevantMethodsById.has(edge.from)) relevantMethodsById.set(edge.from, new Set());
      if (!relevantMethodsById.has(edge.to)) relevantMethodsById.set(edge.to, new Set());

      if (edge.methodOwner) relevantMethodsById.get(edge.from).add(edge.methodOwner);
      if (edge.method) relevantMethodsById.get(edge.to).add(edge.method);
    }

    const scopedNodes = globalResult.graph.nodes
      .filter(node => finalRelatedIds.has(node.id))
      .map(node => ({
        ...node,
        relevantMethods: node.id === target.id
          ? null
          : [...(relevantMethodsById.get(node.id) || new Set())].sort()
      }));

    const scopedRegistry = globalResult.registry.symbols
      .filter(symbol => finalRelatedIds.has(symbol.id))
      .map(symbol => filterSymbolForComponentScope(symbol, target, finalEdges));

    const scopedMetrics = globalResult.metricList.filter(item => finalRelatedIds.has(item.id));
    const scopedCycles = globalResult.cycles.filter(cycle =>
      cycle.some(id => finalRelatedIds.has(id))
    );

    return {
      target,
      impact,
      relatedIds: finalRelatedIds,
      nodes: scopedNodes,
      edges: finalEdges,
      registry: scopedRegistry,
      metrics: scopedMetrics,
      cycles: scopedCycles,
      relevantMethodsById
    };
  }
}

function buildComponentScopedGraph(target, impact, result) {
  const scope = ScopeResolver.resolve(target, result);
  return {
    relatedIds: scope.relatedIds,
    nodes: scope.nodes,
    edges: scope.edges,
    relevantMethodsById: scope.relevantMethodsById
  };
}

function filterSymbolForComponentScope(symbol, target, scopedEdges) {
  if (!symbol) return null;

  const p = symbol.parsed || {};

  // The requested component remains complete. For every related component,
  // expose only methods that participate in the scoped relationships.
  const isTarget = symbol.id === target.id;
  const relevantMethodNames = new Set();

  for (const edge of scopedEdges) {
    if (edge.from === symbol.id && edge.methodOwner) {
      relevantMethodNames.add(edge.methodOwner);
    }
    if (edge.to === symbol.id && edge.method) {
      relevantMethodNames.add(edge.method);
    }
  }

  const filteredMethods = isTarget
    ? (p.methods || [])
    : (p.methods || []).filter(method =>
        relevantMethodNames.has(method.name)
      );

  const filteredDependencies = isTarget
    ? (p.dependencies || [])
    : (p.dependencies || []).filter(dependency => {
        const targetName = dependency.toName;
        const matchingEdge = scopedEdges.some(edge =>
          edge.from === symbol.id &&
          (edge.to === `ApexClass:${targetName}` ||
            edge.to === `LWC:${targetName}` ||
            String(edge.to).endsWith(`:${targetName}`) ||
            edge.to === targetName) &&
          (!dependency.method || edge.method === dependency.method)
        );
        return matchingEdge || relevantMethodNames.has(dependency.methodOwner);
      });

  const filtered = {
    ...symbol,
    parsed: {
      ...p,
      methods: filteredMethods,
      dependencies: filteredDependencies,
      behavior: p.behavior
        ? {
            ...p.behavior,
            publicContracts: (p.behavior.publicContracts || []).filter(contract =>
              isTarget || relevantMethodNames.has(contract.name)
            )
          }
        : p.behavior
    }
  };

  return filtered;
}

function writeComponentAnalysisArtifacts(
  target,
  impact,
  result,
  metric,
  assessment,
  outputDir
) {
  const scoped = buildComponentScopedGraph(target, impact, result);
  const scopedNodes = scoped.nodes;
  const scopedEdges = scoped.edges;
  const scopedGraph = {
    nodes: scopedNodes,
    edges: scopedEdges
  };

  const scopedMetrics = result.metricList.filter(item => scoped.relatedIds.has(item.id));
  const scopedCycles = result.cycles.filter(cycle =>
    cycle.some(id => scoped.relatedIds.has(id))
  );

  const scopedRegistry = result.registry.symbols
    .filter(symbol => scoped.relatedIds.has(symbol.id))
    .map(symbol => filterSymbolForComponentScope(symbol, target, scopedEdges));

  const scopedFiles = new Set(
    scopedNodes
      .map(node => node.file)
      .filter(Boolean)
      .map(file =>
        path.isAbsolute(file)
          ? path.normalize(file)
          : path.resolve(PROJECT_ROOT, file)
      )
  );

  const scopedDiscovered = {};
  for (const [key, value] of Object.entries(result.discovered || {})) {
    if (Array.isArray(value)) {
      scopedDiscovered[key] = value.filter(file => {
        if (typeof file !== "string") return false;
        const absolute = path.isAbsolute(file)
          ? path.normalize(file)
          : path.resolve(PROJECT_ROOT, file);
        return scopedFiles.has(absolute);
      });
    } else {
      scopedDiscovered[key] = value;
    }
  }

  if (target.file) {
    const targetFile = path.isAbsolute(target.file)
      ? path.normalize(target.file)
      : path.resolve(PROJECT_ROOT, target.file);
    if (!scopedFiles.has(targetFile)) scopedFiles.add(targetFile);
  }

  const generatedAt = new Date().toISOString();
  const filteredRegistryJson = scopedRegistry.map(symbol => ({
    id: symbol.id,
    type: symbol.type,
    name: symbol.name,
    file: symbol.file,
    parsed: symbol.parsed
  }));

  const reportJson = {
    generatedAt,
    scope: "component-impact",
    target: {
      id: target.id,
      name: target.name,
      type: target.type,
      file: target.file || null
    },
    sourceDirectory: rel(result.discovered.sourceDir || DEFAULT_SOURCE_DIR),
    inventory: {
      files: scopedDiscovered.files?.length || 0,
      apexClasses: scopedDiscovered.apexClasses?.length || 0,
      apexTriggers: scopedDiscovered.apexTriggers?.length || 0,
      lwcJs: scopedDiscovered.lwcJs?.length || 0,
      lwcHtml: scopedDiscovered.lwcHtml?.length || 0,
      visualforce: scopedDiscovered.visualforce?.length || 0,
      flows: scopedDiscovered.flows?.length || 0,
      objects: scopedDiscovered.objects?.length || 0,
      fields: scopedDiscovered.fields?.length || 0
    },
    nodes: scopedNodes,
    edges: scopedEdges,
    metrics: scopedMetrics,
    cycles: scopedCycles,
    registry: filteredRegistryJson,
    impact,
    metric: metric || null,
    assessment: assessment || null,
    methodScope: {
      description: "Related components contain only methods participating in the scoped dependency relationships.",
      targetIncludesAllMethods: true,
      edgeMethodFields: ["methodOwner", "method"]
    }
  };

  write(
    path.join(outputDir, "dependency-report.json"),
    JSON.stringify(reportJson, null, 2)
  );

  const fileState = [...scopedFiles].map(file => {
    try {
      const stat = fs.statSync(file);
      return {
        file: normalizePath(path.relative(PROJECT_ROOT, file)),
        size: stat.size,
        mtimeMs: stat.mtimeMs
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  write(
    path.join(outputDir, "analysis-snapshot.json"),
    JSON.stringify({
      schemaVersion: 5,
      analyzerVersion: CURRENT_ANALYZER_VERSION,
      analyzer: `Salesforce Dependency Analyzer v${CURRENT_ANALYZER_VERSION}`,
      scope: "component-impact",
      generatedAt,
      sourceDirectory: reportJson.sourceDirectory,
      target: reportJson.target,
      inventory: reportJson.inventory,
      discovered: scopedDiscovered,
      fileState,
      options: {
        maxGraphEdges: result.options?.maxGraphEdges || 10000
      },
      registry: filteredRegistryJson,
      nodes: scopedNodes,
      edges: scopedEdges,
      metrics: scopedMetrics,
      cycles: scopedCycles
    }, null, 2)
  );

  write(
    path.join(outputDir, "dependency-report.md"),
    dependencyReport(scopedGraph, scopedMetrics, scopedCycles)
  );

  write(
    path.join(outputDir, "dependency-summary.md"),
    summaryReport(scopedDiscovered, scopedGraph, scopedMetrics, scopedCycles)
  );

  write(
    path.join(outputDir, "dependency-graph.mmd"),
    graphMermaid(scopedGraph)
  );

  write(
    path.join(outputDir, "dependency-graph.dot"),
    graphDot(scopedGraph)
  );

  write(
    path.join(outputDir, "unresolved-references.md"),
    unresolvedReport(scopedGraph)
  );

  const sortedMetrics = [...scopedMetrics].sort((a, b) =>
    (b.fanIn || 0) - (a.fanIn || 0) ||
    (b.fanOut || 0) - (a.fanOut || 0) ||
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  write(
    path.join(outputDir, "architecture-metrics.json"),
    JSON.stringify({
      generatedAt,
      scope: "component-impact",
      target: reportJson.target,
      targetMetric: metric || null,
      highestImpact: sortedMetrics,
      highRiskCount: scopedMetrics.filter(x => x.risk === "HIGH").length,
      mediumRiskCount: scopedMetrics.filter(x => x.risk === "MEDIUM").length,
      lowRiskCount: scopedMetrics.filter(x => x.risk === "LOW").length,
      cycleCount: scopedCycles.length
    }, null, 2)
  );

  generateAnalysisManifest(
    result.discovered.sourceDir || DEFAULT_SOURCE_DIR,
    outputDir,
    reportJson,
    "COMPLETE"
  );
}

// Run analysis
// ============================================================

function analyze(sourceDir, options, writeOutputs = true) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `Source directory does not exist: ${sourceDir}`
    );
  }

  console.log("");
  console.log("Salesforce Dependency Analyzer v13");
  console.log("=================================");
  console.log("");

  const discovered = discover(sourceDir);

  console.log(`Scanning: ${sourceDir}`);
  console.log(`Files: ${discovered.files.length}`);
  console.log(`Apex Classes: ${discovered.apexClasses.length}`);
  console.log(`Apex Triggers: ${discovered.apexTriggers.length}`);
  console.log(`LWC JS: ${discovered.lwcJs.length}`);
  console.log(`LWC HTML: ${discovered.lwcHtml.length}`);
  console.log(`Visualforce: ${discovered.visualforce.length}`);
  console.log(`Flows: ${discovered.flows.length}`);
  console.log(`Objects: ${discovered.objects.length}`);
  console.log(`Fields: ${discovered.fields.length}`);
  console.log("");

  console.log("Building symbol registry...");
  const registry = buildRegistry(discovered);
  console.log("Enriching deterministic component intelligence...");
  enrichRegistry(registry);

  console.log(
    `Local symbols: ${registry.symbols.length}`
  );

  console.log("Building dependency graph...");
  const graph =
    buildGraph(
      discovered,
      registry,
      options
    );

  enrichGraphEvidence(graph, registry);

  console.log(
    `Graph nodes: ${graph.nodes.length}`
  );

  console.log(
    `Graph edges: ${graph.edges.length}`
  );

  console.log("Calculating coupling metrics...");
  const metricList = metrics(graph);

  console.log("Detecting circular dependencies...");
  const cycles =
    stronglyConnectedComponents(graph);

  console.log(
    `Circular dependency groups: ${cycles.length}`
  );

  if (!writeOutputs) {
    return {
      discovered,
      registry,
      graph,
      metricList,
      cycles
    };
  }

  fs.mkdirSync(
    OUTPUT_DIR,
    { recursive: true }
  );

  const reportJson = {
    generatedAt: new Date().toISOString(),
    sourceDirectory: rel(sourceDir),
    inventory: {
      files: discovered.files.length,
      apexClasses: discovered.apexClasses.length,
      apexTriggers: discovered.apexTriggers.length,
      lwcJs: discovered.lwcJs.length,
      lwcHtml: discovered.lwcHtml.length,
      visualforce: discovered.visualforce.length,
      flows: discovered.flows.length,
      objects: discovered.objects.length,
      fields: discovered.fields.length
    },
    nodes: graph.nodes,
    edges: graph.edges,
    metrics: metricList,
    cycles,
    registry: registry.symbols.map(symbol => ({
      id: symbol.id,
      type: symbol.type,
      name: symbol.name,
      file: symbol.file,
      parsed: symbol.parsed
    }))
  };

  write(
    path.join(
      OUTPUT_DIR,
      "dependency-report.json"
    ),
    JSON.stringify(
      reportJson,
      null,
      2
    )
  );

  const snapshotFiles = unique(
    Object.values(discovered)
      .filter(Array.isArray)
      .flat()
      .filter(x => typeof x === "string")
  ).map(file => {
    try {
      const stat = fs.statSync(file);
      return {
        file: normalizePath(path.relative(PROJECT_ROOT, file)),
        size: stat.size,
        mtimeMs: stat.mtimeMs
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  write(
    path.join(OUTPUT_DIR, "analysis-snapshot.json"),
    JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      analyzerVersion: CURRENT_ANALYZER_VERSION,
      analyzer: `Salesforce Dependency Analyzer v${CURRENT_ANALYZER_VERSION}`,
      generatedAt: reportJson.generatedAt,
      sourceDirectory: reportJson.sourceDirectory,
      inventory: reportJson.inventory,
      discovered,
      fileState: snapshotFiles,
      options: {
        maxGraphEdges: options?.maxGraphEdges || 10000
      },
      registry: reportJson.registry,
      nodes: reportJson.nodes,
      edges: reportJson.edges,
      metrics: reportJson.metrics,
      cycles: reportJson.cycles
    }, null, 2)
  );

  write(
    path.join(
      OUTPUT_DIR,
      "dependency-report.md"
    ),
    dependencyReport(
      graph,
      metricList,
      cycles
    )
  );

  write(
    path.join(
      OUTPUT_DIR,
      "dependency-summary.md"
    ),
    summaryReport(
      discovered,
      graph,
      metricList,
      cycles
    )
  );

  write(
    path.join(
      OUTPUT_DIR,
      "dependency-graph.mmd"
    ),
    graphMermaid(graph)
  );

  write(
    path.join(
      OUTPUT_DIR,
      "dependency-graph.dot"
    ),
    graphDot(graph)
  );

  write(
    path.join(
      OUTPUT_DIR,
      "unresolved-references.md"
    ),
    unresolvedReport(graph)
  );

  write(
    path.join(
      OUTPUT_DIR,
      "architecture-metrics.json"
    ),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        highestImpact: metricList.slice(0, 50),
        highRiskCount:
          metricList.filter(
            x => x.risk === "HIGH"
          ).length,
        mediumRiskCount:
          metricList.filter(
            x => x.risk === "MEDIUM"
          ).length,
        lowRiskCount:
          metricList.filter(
            x => x.risk === "LOW"
          ).length,
        cycleCount: cycles.length
      },
      null,
      2
    )
  );

  generateAnalysisManifest(sourceDir, OUTPUT_DIR, reportJson, "COMPLETE");

  console.log("");
  console.log("Analysis complete.");
  console.log("");
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log("");
  console.log("Generated:");
  console.log("  analysis-manifest.json");
  console.log("  dependency-report.json");
  console.log("  dependency-report.md");
  console.log("  dependency-summary.md");
  console.log("  dependency-graph.mmd");
  console.log("  dependency-graph.dot");
  console.log("  unresolved-references.md");
  console.log("  architecture-metrics.json");
  console.log("");

  if (metricList.some(x => x.risk === "HIGH")) {
    console.log(
      `HIGH RISK COMPONENTS: ${metricList.filter(x => x.risk === "HIGH").length}`
    );

    for (
      const item of metricList
        .filter(x => x.risk === "HIGH")
        .slice(0, 15)
    ) {
      console.log(
        `  ${item.name} [${item.type}] - Fan-In ${item.fanIn}, Fan-Out ${item.fanOut}`
      );
    }

    console.log("");
  }

  return {
    discovered,
    registry,
    graph,
    metricList,
    cycles
  };
}

// ============================================================
// Impact command
// ============================================================

function runImpact(
  targetName,
  sourceDir,
  options,
  refactorMode
) {
  const result =
    analyze(
      sourceDir,
      options,
      false
    );

  const targets =
    resolveTarget(
      targetName,
      result.registry
    );

  if (!targets.length) {
    console.error(
      `No local symbol found for: ${targetName}`
    );
    process.exit(1);
  }

  const metricById = new Map(
    result.metricList.map(
      x => [x.id, x]
    )
  );

  for (const target of targets) {
    const impact =
      impactFor(
        target,
        result.graph,
        result.registry,
        options.maxImpactDepth
      );

    const metric =
      metricById.get(target.id);

    const assessment =
      refactorAssessment(
        impact,
        metric
      );

    const lines = [];

    lines.push(
      `# ${refactorMode ? "Refactor Impact" : "Impact Analysis"}: ${target.name}`
    );
    lines.push("");

    lines.push(
      `**Type:** ${target.type}`
    );
    lines.push(
      `**File:** ${target.file}`
    );
    lines.push(
      `**Impact Level:** ${impact.level}`
    );

    if (metric) {
      lines.push(
        `**Fan-In:** ${metric.fanIn}`
      );
      lines.push(
        `**Fan-Out:** ${metric.fanOut}`
      );
      lines.push(
        `**Coupling:** ${metric.coupling}`
      );
    }

    if (refactorMode) {
      lines.push(
        `**Refactoring Risk:** ${assessment.risk}`
      );
      lines.push(
        `**Risk Score:** ${assessment.score}`
      );
    }

    lines.push("");

    lines.push("## Direct Dependencies");
    lines.push("");

    if (!impact.directDependencies.length) {
      lines.push("- None detected.");
    } else {
      for (const edge of impact.directDependencies) {
        lines.push(
          `- **${edge.to}** — ${edge.type}${edge.method ? ` (${edge.method})` : ""}`
        );
      }
    }

    lines.push("");

    lines.push("## Direct Dependents");
    lines.push("");

    if (!impact.directDependents.length) {
      lines.push("- None detected.");
    } else {
      for (const edge of impact.directDependents) {
        lines.push(
          `- **${edge.from}** — ${edge.type}${edge.method ? ` (${edge.method})` : ""}`
        );
      }
    }

    lines.push("");

    lines.push("## Impacted LWCs");
    lines.push("");

    if (!impact.impactedLwc.length) {
      lines.push("- None detected.");
    } else {
      impact.impactedLwc.forEach(
        id => lines.push(`- ${id}`)
      );
    }

    lines.push("");

    lines.push("## Impacted Tests");
    lines.push("");

    if (!impact.impactedTests.length) {
      lines.push("- None detected.");
    } else {
      impact.impactedTests.forEach(
        id => lines.push(`- ${id}`)
      );
    }

    lines.push("");

    lines.push("## Impacted Triggers");
    lines.push("");

    if (!impact.triggerImpact.length) {
      lines.push("- None detected.");
    } else {
      impact.triggerImpact.forEach(
        id => lines.push(`- ${id}`)
      );
    }

    lines.push("");

    lines.push("## Impacted Objects");
    lines.push("");

    if (!impact.impactedObjects.length) {
      lines.push("- None detected.");
    } else {
      impact.impactedObjects.forEach(
        id => lines.push(`- ${id}`)
      );
    }

    lines.push("");

    lines.push("## Impacted Fields");
    lines.push("");

    if (!impact.impactedFields.length) {
      lines.push("- None detected.");
    } else {
      impact.impactedFields.forEach(
        id => lines.push(`- ${id}`)
      );
    }

    lines.push("");

    lines.push("## Dynamic / Unresolved Impact");
    lines.push("");

    if (!impact.unresolved.length) {
      lines.push(
        "- No unresolved downstream dependencies detected."
      );
    } else {
      impact.unresolved.forEach(
        id => lines.push(`- ${id}`)
      );
    }

    lines.push("");

    lines.push("## Downstream Paths");
    lines.push("");

    for (
      const item of impact.downstream.slice(0, 150)
    ) {
      lines.push(
        `- Depth ${item.depth}: ${item.path.join(" → ")}`
      );
    }

    if (!impact.downstream.length) {
      lines.push("- None.");
    }

    lines.push("");

    lines.push("## Upstream Paths");
    lines.push("");

    for (
      const item of impact.upstream.slice(0, 150)
    ) {
      lines.push(
        `- Depth ${item.depth}: ${item.path.join(" → ")}`
      );
    }

    if (!impact.upstream.length) {
      lines.push("- None.");
    }

    lines.push("");

    if (refactorMode) {
      lines.push("## Refactoring Findings");
      lines.push("");

      for (const finding of assessment.findings) {
        lines.push(`- ${finding}`);
      }

      if (!assessment.findings.length) {
        lines.push(
          "- No major structural risk detected."
        );
      }

      lines.push("");

      lines.push(
        "## Recommended Refactoring Order"
      );
      lines.push("");

      assessment.recommendedOrder.forEach(
        (step, index) =>
          lines.push(
            `${index + 1}. ${step}`
          )
      );

      lines.push("");

      lines.push("## Refactoring Checklist");
      lines.push("");
      lines.push("- [ ] Review direct dependents.");
      lines.push("- [ ] Review transitive dependents.");
      lines.push("- [ ] Review LWC Apex contracts.");
      lines.push("- [ ] Review public/AuraEnabled/Invocable APIs.");
      lines.push("- [ ] Review object/field dependencies.");
      lines.push("- [ ] Review trigger and automation effects.");
      lines.push("- [ ] Update affected tests.");
      lines.push("- [ ] Run focused Apex tests.");
      lines.push("- [ ] Run broader regression tests.");
      lines.push("- [ ] Run Salesforce Code Analyzer.");
      lines.push("");
    }

    // Generate the standard analysis artifacts from the component's
    // dependency closure only. Never copy full-project analyze artifacts
    // into a component-specific directory.
    writeComponentAnalysisArtifacts(
      target,
      impact,
      result,
      metric,
      refactorMode ? assessment : null,
      OUTPUT_DIR
    );

    const prefix =
      refactorMode
        ? "refactor-impact"
        : "impact";

    write(
      path.join(
        OUTPUT_DIR,
        `${prefix}-${safeName(target.name)}.md`
      ),
      lines.join("\n")
    );

    write(
      path.join(
        OUTPUT_DIR,
        `${prefix}-${safeName(target.name)}.json`
      ),
      JSON.stringify(
        {
          impact,
          metric,
          assessment: refactorMode
            ? assessment
            : null
        },
        null,
        2
      )
    );

    console.log(
      `${refactorMode ? "Refactor impact" : "Impact"} report written for ${target.name}`
    );
  }
}

// ============================================================
// Analysis Batches
// ============================================================

const BATCHABLE_TYPES = new Set([
  "ApexClass",
  "Trigger",
  "LWC"
]);

function createAnalysisBatches(graph, metricList, batchSize) {
  const nodeMap = nodeById(graph);
  const batchableNodes = graph.nodes.filter(node => BATCHABLE_TYPES.has(node.type));
  const batchableIds = new Set(batchableNodes.map(node => node.id));
  const metricById = new Map(metricList.map(metric => [metric.id, metric]));

  const outgoing = new Map();
  const incoming = new Map();
  for (const id of batchableIds) {
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }

  for (const edge of graph.edges) {
    if (batchableIds.has(edge.from) && batchableIds.has(edge.to)) {
      outgoing.get(edge.from).add(edge.to);
      incoming.get(edge.to).add(edge.from);
    }
  }

  const ranked = [...batchableNodes].sort((a, b) => {
    const ma = metricById.get(a.id) || {};
    const mb = metricById.get(b.id) || {};
    const scoreA = (ma.fanIn || 0) * 4 + (ma.fanOut || 0) * 3 + (ma.coupling || 0) * 2;
    const scoreB = (mb.fanIn || 0) * 4 + (mb.fanOut || 0) * 3 + (mb.coupling || 0) * 2;
    return scoreB - scoreA || a.name.localeCompare(b.name);
  });

  const unassigned = new Set(ranked.map(node => node.id));
  const batches = [];

  function neighbors(id) {
    return new Set([
      ...(outgoing.get(id) || []),
      ...(incoming.get(id) || [])
    ]);
  }

  while (unassigned.size) {
    const seed = ranked.find(node => unassigned.has(node.id));
    if (!seed) break;

    const batchIds = [seed.id];
    unassigned.delete(seed.id);
    const candidateQueue = [...neighbors(seed.id)].filter(id => unassigned.has(id));

    while (candidateQueue.length && batchIds.length < batchSize) {
      const scored = [...new Set(candidateQueue)]
        .filter(id => unassigned.has(id))
        .map(id => {
          let score = 0;
          for (const existingId of batchIds) {
            if (outgoing.get(existingId)?.has(id)) score += 10;
            if (incoming.get(existingId)?.has(id)) score += 10;
          }
          const metric = metricById.get(id) || {};
          score += (metric.fanIn || 0) * 2;
          score += metric.fanOut || 0;
          return { id, score };
        })
        .sort((a, b) => b.score - a.score);

      if (!scored.length) break;

      const selected = scored[0].id;
      batchIds.push(selected);
      unassigned.delete(selected);

      for (const neighbor of neighbors(selected)) {
        if (unassigned.has(neighbor) && !candidateQueue.includes(neighbor)) {
          candidateQueue.push(neighbor);
        }
      }
    }

    const components = batchIds
      .map(id => {
        const node = nodeMap.get(id);
        const metric = metricById.get(id) || {};
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          file: node.file,
          fanIn: metric.fanIn || 0,
          fanOut: metric.fanOut || 0,
          coupling: metric.coupling || 0,
          risk: metric.risk || "LOW"
        };
      })
      .sort((a, b) =>
        b.fanIn - a.fanIn || b.fanOut - a.fanOut || a.name.localeCompare(b.name)
      );

    batches.push({
      number: batches.length + 1,
      seed: { id: seed.id, name: seed.name, type: seed.type },
      components
    });
  }

  return batches;
}

function writeBatchPlan(batches, sourceDir, options) {
  const batchesDir = path.join(OUTPUT_DIR, "batches");
  fs.mkdirSync(batchesDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const plan = {
    generatedAt,
    sourceDirectory: rel(sourceDir),
    batchSize: options.batchSize,
    batchCount: batches.length,
    batches
  };

  write(path.join(batchesDir, "batch-plan.json"), JSON.stringify(plan, null, 2));

  const lines = [
    "# Salesforce Analysis Batch Plan",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Batch size: ${options.batchSize}`,
    "",
    `Total batches: ${batches.length}`,
    "",
    "Batches are dependency-oriented. High-impact components are used as seeds and strongly related components are grouped together where possible.",
    ""
  ];

  for (const batch of batches) {
    lines.push(`## Batch ${String(batch.number).padStart(2, "0")}`, "");
    lines.push(`**Seed:** ${batch.seed.name} [${batch.seed.type}]`, "");
    lines.push("| Component | Type | Fan-In | Fan-Out | Coupling | Risk | File |");
    lines.push("|---|---|---:|---:|---:|---|---|");
    for (const component of batch.components) {
      lines.push(`| ${component.name} | ${component.type} | ${component.fanIn} | ${component.fanOut} | ${component.coupling} | ${component.risk} | ${component.file} |`);
    }
    lines.push("");
  }

  write(path.join(batchesDir, "batch-plan.md"), lines.join("\n"));

  for (const batch of batches) {
    write(
      path.join(batchesDir, `batch-${String(batch.number).padStart(2, "0")}.json`),
      JSON.stringify({ generatedAt, sourceDirectory: rel(sourceDir), batchSize: options.batchSize, ...batch }, null, 2)
    );
  }

  console.log("");
  console.log("Analysis batches created.");
  console.log(`Batches: ${batches.length}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Output: ${path.join(batchesDir, "batch-plan.md")}`);
  console.log("");
}

function runCreateBatches(sourceDir, options) {
  const result = analyze(sourceDir, options, false);
  const batches = createAnalysisBatches(result.graph, result.metricList, options.batchSize);
  writeBatchPlan(batches, sourceDir, options);
}

function runLlmContextBatch(batchNumber, sourceDir, options) {
  const batchId = String(batchNumber).padStart(2, "0");
  const batchFile = path.join(BASE_OUTPUT_DIR, "create-batches", "batches", `batch-${batchId}.json`);

  if (!fs.existsSync(batchFile)) {
    throw new Error(
      `Batch ${batchNumber} not found. Run:\n\nnode dependency-analyzer.js create-batches ${rel(sourceDir)}`
    );
  }

  const batch = JSON.parse(read(batchFile));
  const result = analyze(sourceDir, options, false);
  const batchIds = new Set(batch.components.map(component => component.id));
  const metricById = new Map(result.metricList.map(metric => [metric.id, metric]));

  const relevantNodes = result.graph.nodes.filter(node => batchIds.has(node.id));
  const relevantEdges = result.graph.edges.filter(edge => batchIds.has(edge.from) || batchIds.has(edge.to));
  const internalEdges = relevantEdges.filter(edge => batchIds.has(edge.from) && batchIds.has(edge.to));
  const externalEdges = relevantEdges.filter(edge => batchIds.has(edge.from) !== batchIds.has(edge.to));

  const batchDir = path.join(OUTPUT_DIR, "llm-context", `batch-${batchId}`);
  fs.mkdirSync(batchDir, { recursive: true });

  const lines = [
    `# LLM Batch Context — Batch ${batchId}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: ${rel(sourceDir)}`,
    "",
    "## Purpose",
    "",
    "Use this package to decide which components in this batch deserve deep source-code analysis.",
    "",
    "IMPORTANT:",
    "- Do not refactor code.",
    "- Do not assume every component requires source analysis.",
    "- Do not request the entire Salesforce project.",
    "- Use refactor-impact and llm-context for selected components before requesting source code.",
    "",
    "## Components",
    "",
    "| Component | Type | Fan-In | Fan-Out | Coupling | Risk | File |",
    "|---|---|---:|---:|---:|---|---|"
  ];

  for (const component of batch.components) {
    const metric = metricById.get(component.id) || {};
    lines.push(`| ${component.name} | ${component.type} | ${metric.fanIn || 0} | ${metric.fanOut || 0} | ${metric.coupling || 0} | ${metric.risk || "LOW"} | ${component.file} |`);
  }

  lines.push("", "## Dependencies Inside Batch", "");
  if (internalEdges.length) {
    for (const edge of internalEdges.slice(0, 1000)) {
      lines.push(`- ${edge.from} -> ${edge.to} | ${edge.type}${edge.method ? ` | method: ${edge.method}` : ""}${edge.evidence ? ` | evidence: ${edge.evidence}` : ""}`);
    }
  } else {
    lines.push("- None detected.");
  }

  lines.push("", "## External Dependencies Touching Batch", "");
  if (externalEdges.length) {
    for (const edge of externalEdges.slice(0, 1000)) {
      lines.push(`- ${edge.from} -> ${edge.to} | ${edge.type}${edge.method ? ` | method: ${edge.method}` : ""}${edge.evidence ? ` | evidence: ${edge.evidence}` : ""}`);
    }
  } else {
    lines.push("- None detected.");
  }

  lines.push(
    "",
    "## LLM Task",
    "",
    "For each component determine:",
    "1. Architectural importance",
    "2. Dependency impact",
    "3. Risk",
    "4. Whether refactor-impact should be run next",
    "5. Whether llm-context should be generated next",
    "6. Whether full source code is actually required",
    "7. Exactly which source files should be requested",
    "",
    "Do not design or implement a refactoring in this phase."
  );

  write(path.join(batchDir, "LLM_CONTEXT.md"), lines.join("\n"));

  write(
    path.join(batchDir, "context.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), batch, nodes: relevantNodes, edges: relevantEdges, metrics: batch.components.map(component => metricById.get(component.id) || null) }, null, 2)
  );

  const sourceManifest = batch.components.map(component => ({
    name: component.name,
    type: component.type,
    file: component.file,
    absolutePath: path.resolve(PROJECT_ROOT, component.file)
  }));

  write(path.join(batchDir, "source-manifest.json"), JSON.stringify(sourceManifest, null, 2));

  console.log("");
  console.log(`LLM batch context generated for Batch ${batchId}`);
  console.log(`Primary file: ${path.join(batchDir, "LLM_CONTEXT.md")}`);
  console.log(`Components: ${batch.components.length}`);
  console.log("Full source code was NOT copied.");
  console.log(`Source manifest: ${path.join(batchDir, "source-manifest.json")}`);
  console.log("");
}

// ============================================================
// Search
// ============================================================

function runSearch(
  query,
  sourceDir,
  options
) {
  const result =
    analyze(
      sourceDir,
      options,
      false
    );

  const q =
    query.toLowerCase();

  const matches = [];

  for (const symbol of result.registry.symbols) {
    if (
      symbol.name.toLowerCase().includes(q) ||
      symbol.file.toLowerCase().includes(q)
    ) {
      matches.push({
        kind: "symbol",
        value: symbol
      });
    }
  }

  for (const edge of result.graph.edges) {
    const text = [
      edge.from,
      edge.to,
      edge.type,
      edge.method || "",
      edge.evidence || ""
    ].join(" ");

    if (text.toLowerCase().includes(q)) {
      matches.push({
        kind: "dependency",
        value: edge
      });
    }
  }

  console.log("");
  console.log(`Search: ${query}`);
  console.log("================================");

  if (!matches.length) {
    console.log("No results.");
    return;
  }

  for (const match of matches.slice(0, 500)) {
    if (match.kind === "symbol") {
      console.log(
        `[SYMBOL] ${match.value.name} [${match.value.type}]`
      );
      console.log(
        `         ${match.value.file}`
      );
    } else {
      console.log(
        `[DEPENDENCY] ${match.value.from} -> ${match.value.to}`
      );
      console.log(
        `             ${match.value.type}`
      );

      if (match.value.method) {
        console.log(
          `             method: ${match.value.method}`
        );
      }

      if (match.value.evidence) {
        console.log(
          `             ${match.value.evidence}`
        );
      }
    }

    console.log("");
  }
}


// ============================================================
// LLM Context Package
// ============================================================

function nodeById(graph) {
  return new Map(graph.nodes.map(node => [node.id, node]));
}

function compactEdge(edge) {
  return {
    from: edge.from,
    to: edge.to,
    type: edge.type,
    method: edge.method || null,
    evidence: edge.evidence || null,
    unresolved: Boolean(edge.unresolved)
  };
}

function writeLlmContextPackage(targetName, sourceDir, options = {}) {
  // Compatibility command: keep the existing orchestrator contract while
  // moving the implementation to the deterministic intelligence package.
  writeComponentIntelligencePackage(targetName, sourceDir, {
    ...options,
    profile: options.profile || "full"
  });

  // The llm-context command has its own isolated output directory.
  // The canonical deterministic package is written directly here.
  const sourcePackage = OUTPUT_DIR;
  const legacyPackage = OUTPUT_DIR;

  fs.mkdirSync(path.join(legacyPackage, "source"), { recursive: true });

  const filesToCopy = [
    "04-OVERVIEW.md",
    "02-GRAPH.json",
    "03-SOURCE-MANIFEST.json",
    "01-CONTEXT.json",
    "LLM_CONTEXT.md"
  ];

  for (const name of filesToCopy) {
    const from = path.join(sourcePackage, name);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(legacyPackage, name));
  }

  const sourceDirPath = path.join(sourcePackage, "source");
  const legacySource = path.join(legacyPackage, "source");
  if (fs.existsSync(sourceDirPath)) {
    for (const name of fs.readdirSync(sourceDirPath)) {
      fs.copyFileSync(path.join(sourceDirPath, name), path.join(legacySource, name));
    }
  }

  // Preserve legacy artifact names expected by the existing orchestrator.
  const context = JSON.parse(read(path.join(sourcePackage, "01-CONTEXT.json")));
  const impact = context.impact || {};
  const assessment = context.assessment || {};
  const tests = context.tests || {};
  const frontend = context.frontend || {};
  const data = context.data || {};

  write(path.join(legacyPackage, "01-overview.md"), read(path.join(sourcePackage, "04-OVERVIEW.md")));
  write(path.join(legacyPackage, "02-dependencies.md"), [
    `# Dependencies — ${targetName}`,
    "",
    "## Direct Dependencies",
    "",
    ...(impact.directDependencies || []).map(e => `- ${e.from} -> ${e.to} | ${e.type} | ${e.method || ""} | ${e.evidence || ""} | ${e.confidence || ""} | L${e.line || "?"}`),
    "",
    "## Direct Dependents",
    "",
    ...(impact.directDependents || []).map(e => `- ${e.from} -> ${e.to} | ${e.type} | ${e.method || ""} | ${e.evidence || ""} | ${e.confidence || ""} | L${e.line || "?"}`),
    "",
    "## Downstream Paths",
    "",
    ...(impact.downstream || []).slice(0, 300).map(x => `- Depth ${x.depth}: ${x.path.join(" -> ")}`),
    "",
    "## Upstream Paths",
    "",
    ...(impact.upstream || []).slice(0, 300).map(x => `- Depth ${x.depth}: ${x.path.join(" -> ")}`),
    ""
  ].join("\n"));

  write(path.join(legacyPackage, "03-refactor-impact.md"), [
    `# Refactoring Impact — ${targetName}`,
    "",
    `- Level: ${impact.level || "UNKNOWN"}`,
    `- Risk: ${assessment.risk || "UNKNOWN"}`,
    `- Score: ${assessment.score ?? "N/A"}`,
    "",
    "## Findings",
    "",
    ...(assessment.findings || []).map(x => `- ${x}`),
    "",
    "## Recommended Order",
    "",
    ...(assessment.recommendedOrder || []).map((x, i) => `${i + 1}. ${x}`),
    ""
  ].join("\n"));

  write(path.join(legacyPackage, "04-tests.md"), [
    `# Test Impact — ${targetName}`,
    "",
    `- Is test class: ${tests.isTest ? "Yes" : "No"}`,
    `- Test references: ${(tests.references || []).join(", ") || "None"}`,
    `- Impacted tests: ${(tests.impacted || []).join(", ") || "None"}`,
    ""
  ].join("\n"));

  write(path.join(legacyPackage, "05-lwc.md"), [
    `# LWC Impact — ${targetName}`,
    "",
    `- Impacted LWCs: ${(frontend.lwcs || []).join(", ") || "None"}`,
    `- Apex methods used: ${(frontend.apexMethods || []).map(x => `${x.className}.${x.methodName}`).join(", ") || "None"}`,
    `- Capabilities: ${(frontend.capabilities || []).join(", ") || "None"}`,
    ""
  ].join("\n"));

  write(path.join(legacyPackage, "06-data.md"), [
    `# Salesforce Data Impact — ${targetName}`,
    "",
    `- Objects: ${(data.objects || []).join(", ") || "None"}`,
    `- Fields: ${(data.fields || []).map(x => `${x.object}.${x.field}`).join(", ") || "None"}`,
    `- DML: ${(data.dml || []).map(x => `${x.operation}${x.variable ? `(${x.variable})` : ""}`).join(", ") || "None"}`,
    `- Callouts: ${(data.callouts || []).join(", ") || "None"}`,
    `- Dynamic Apex: ${(data.dynamicApex || []).join(", ") || "None"}`,
    ""
  ].join("\n"));

  write(path.join(legacyPackage, "07-unresolved.md"), [
    `# Unresolved References — ${targetName}`,
    "",
    ...((impact.unresolved || []).length
      ? impact.unresolved.map(e => `- ${e.from} -> ${e.to} | ${e.type} | ${e.evidence || ""} | ${e.confidence || ""}`)
      : ["- None detected."]),
    ""
  ].join("\n"));

  write(path.join(legacyPackage, "08-context.json"), JSON.stringify(context, null, 2));

  console.log("");
  console.log(`LLM context package generated: ${legacyPackage}`);
  console.log(`Primary file: ${path.join(legacyPackage, "LLM_CONTEXT.md")}`);
  console.log(`Canonical intelligence: ${path.join(sourcePackage, "01-CONTEXT.json")}`);
  console.log("");
}


// ============================================================
// LLM Investigation Context
// ============================================================

function buildLlmInvestigationContext(componentName) {
  const safe = safeName(componentName);
  const packageDir = path.join(
    OUTPUT_DIR,
    "component-context",
    safe
  );

  const planPath = path.join(
    packageDir,
    "06-INVESTIGATION-PLAN.json"
  );

  if (!fs.existsSync(planPath)) {
    throw new Error(
      `Investigation plan not found for ${componentName}. Run component-context first.`
    );
  }

  const plan = JSON.parse(
    fs.readFileSync(planPath, "utf8")
  );

  const allTasks = Array.isArray(plan.tasks)
    ? plan.tasks
    : [];

  // Only forward tasks that genuinely require semantic reasoning.
  // Deterministic facts stay in the analyzer package and are not duplicated
  // into a generic repository-discovery prompt.
  const tasks = allTasks.filter(task =>
    task?.llmRequired === true ||
    task?.evidence?.resolution === "LLM" ||
    [
      "security-semantics",
      "dynamic-apex",
      "dynamic-soql-security",
      "unresolved-reference",
      "async-semantics",
      "frontend-contract",
      "semantic-gap"
    ].includes(task?.type)
  );

  const securityPath = path.join(
    packageDir,
    "07-SECURITY-INTELLIGENCE.json"
  );

  let security = null;

  if (fs.existsSync(securityPath)) {
    security = JSON.parse(
      fs.readFileSync(securityPath, "utf8")
    );
  }

  const investigations = tasks.map(task => {
    const result = {
      id: task.id,
      type: task.type,
      priority: task.priority,
      question: task.question,
      evidence: task.evidence || {}
    };

    if (
      task.type === "security-semantics" &&
      security
    ) {
      result.knownFacts =
        security.facts || {};

      result.knownUnknowns =
        security.unknowns || [];
    }

    return result;
  });

  const payload = {
    version: 1,
    component:
      plan.component ||
      componentName,

    purpose:
      "semantic-investigation",

    analyzerVersion:
      plan.analyzerVersion ||
      "13",

    deterministicContextAvailable:
      true,

    structuralCoveragePercent:
      plan.semanticCoverage?.structuralCoveragePercent ??
      plan.deterministicCoveragePercent ??
      null,

    semanticCoveragePercent:
      plan.semanticCoverage?.semanticCoveragePercent ??
      null,

    investigationRequired:
      investigations.length > 0,

    taskCount:
      investigations.length,

    investigations,

    llmRules: {
      doNotRediscoverDependencies: true,
      doNotScanRepository: true,
      doNotReconstructComponentContext: true,
      answerOnlyProvidedQuestions: true,
      distinguishFactsFromInference: true,
      reportAdditionalUnknownsExplicitly: true
    }
  };

  fs.writeFileSync(
    path.join(
      packageDir,
      "08-LLM-INVESTIGATION.json"
    ),
    JSON.stringify(
      payload,
      null,
      2
    )
  );

  const markdown = [
    "# LLM Investigation Context",
    "",
    `Component: ${payload.component}`,
    `Analyzer version: ${payload.analyzerVersion}`,
    `Structural coverage: ${payload.structuralCoveragePercent ?? "unknown"}%`,
    `Semantic coverage: ${payload.semanticCoveragePercent ?? "unknown"}%`,
    `Investigation required: ${payload.investigationRequired ? "YES" : "NO"}`,
    `Task count: ${payload.taskCount}`,
    "",
    "## Rules",
    ...Object.entries(payload.llmRules).map(
      ([key, value]) =>
        `- ${key}: ${value ? "true" : "false"}`
    ),
    ""
  ];

  if (!investigations.length) {
    markdown.push(
      "No LLM investigation is required."
    );
  } else {
    for (const task of investigations) {
      markdown.push(
        `## ${task.id} — ${task.type}`,
        `Priority: ${task.priority}`,
        "",
        `Question: ${task.question}`,
        "",
        "Evidence:",
        "```json",
        JSON.stringify(
          task.evidence,
          null,
          2
        ),
        "```",
        ""
      );

      if (task.knownFacts) {
        markdown.push(
          "Known deterministic facts:",
          "```json",
          JSON.stringify(
            task.knownFacts,
            null,
            2
          ),
          "```",
          ""
        );
      }

      if (task.knownUnknowns) {
        markdown.push(
          "Known unresolved semantics:",
          "```json",
          JSON.stringify(
            task.knownUnknowns,
            null,
            2
          ),
          "```",
          ""
        );
      }
    }
  }

  fs.writeFileSync(
    path.join(
      packageDir,
      "08-LLM-INVESTIGATION.md"
    ),
    markdown.join("\n")
  );

  console.log("");
  console.log(
    `LLM investigation context generated: ${packageDir}`
  );
  console.log(
    `JSON: ${path.join(packageDir, "08-LLM-INVESTIGATION.json")}`
  );
  console.log(
    `Tasks requiring investigation: ${investigations.length}`
  );
  console.log("");

  return payload;
}


// ============================================================
// Main
// ============================================================

if (require.main === module) {
  try {
    const args = parseArgs(process.argv);

    // Each analyzer command gets its own deterministic output directory.
    // This keeps CLI/subprocess invocations isolated without changing the
    // API runner contract (the runner still invokes this CLI as a child process).
    activateOutputDir(args.command, args.target, args.phase, args.options);

  if (args.command === "analyze") {
    analyze(
      args.sourceDir,
      args.options
    );
  } else if (args.command === "create-batches") {
    runCreateBatches(
      args.sourceDir,
      args.options
    );
  } else if (args.command === "llm-context-batch") {
    runLlmContextBatch(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "impact"
  ) {
    runImpact(
      args.target,
      args.sourceDir,
      args.options,
      false
    );
  } else if (
    args.command === "refactor-impact"
  ) {
    runImpact(
      args.target,
      args.sourceDir,
      args.options,
      true
    );
  } else if (
    args.command === "search"
  ) {
    runSearch(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "llm-context"
  ) {
    writeLlmContextPackage(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "component-context"
  ) {
    writeComponentIntelligencePackage(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "llm-investigation-context"
  ) {
    buildLlmInvestigationContext(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "batch-context"
  ) {
    runBatchContext(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "phase-context"
  ) {
    writePhaseContext(
      args.target,
      args.phase,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "context-completeness"
  ) {
    writeContextCompleteness(
      args.target,
      args.sourceDir,
      args.options
    );
  } else if (
    args.command === "stats"
  ) {
    const result =
      analyze(
        args.sourceDir,
        args.options,
        false
      );

    const high =
      result.metricList.filter(
        x => x.risk === "HIGH"
      ).length;

    const medium =
      result.metricList.filter(
        x => x.risk === "MEDIUM"
      ).length;

    const low =
      result.metricList.filter(
        x => x.risk === "LOW"
      ).length;

    console.log(
      JSON.stringify(
        {
          files:
            result.discovered.files.length,
          apexClasses:
            result.discovered.apexClasses.length,
          apexTriggers:
            result.discovered.apexTriggers.length,
          lwc:
            result.discovered.lwcJs.length,
          objects:
            result.discovered.objects.length,
          fields:
            result.discovered.fields.length,
          graphNodes:
            result.graph.nodes.length,
          graphEdges:
            result.graph.edges.length,
          circularGroups:
            result.cycles.length,
          highRisk: high,
          mediumRisk: medium,
          lowRisk: low
        },
        null,
        2
      )
    );
  }
  } catch (error) {
    console.error("");
    console.error("Analyzer failed:");
    console.error(error.message);
    console.error("");

    if (error.stack) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createCanonicalRelationship,
    determineResolution,
    parseIdParts,
    analyze,
    getAnalysis,
    buildGraph,
    buildComponentIntelligence,
    impactFor
  };
}
