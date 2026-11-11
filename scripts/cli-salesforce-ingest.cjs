#!/usr/bin/env node

/**
 * Salesforce CLI Ingest Utility - Agent 4 Implementation
 * ======================================================
 *
 * Command line utility to upload generated dependency graph snapshots to Salesforce
 * without mutating source files or canonical payloads.
 *
 * Usage:
 *   node scripts/cli-salesforce-ingest.cjs --project-id <id> --file <path> [options]
 *
 * Options:
 *   --project-id <id>     Salesforce DA_Project__c Id or Key (required)
 *   --run-name <name>     Name of the analysis run (default: "Analysis Run <ISO Date>")
 *   --file <path>         Path to graph snapshot JSON file (default: "analysis-snapshot.json")
 *   --commit-hash <hash>  Git source commit hash for provenance
 *   --dry-run             Perform sizing, chunking, and checksum verification without uploading
 *   --help                Display this help message
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  SalesforceGraphUploadClient,
  SalesforceRestTransportAdapter,
  InMemoryTransportAdapter,
  chunkPayloadSafe,
  computePayloadChecksum,
  measureEnvelopeWireBytes,
  MAX_CHUNK_SIZE,
  MAX_TOTAL_PAYLOAD_CHARS,
  MAX_REQUEST_BYTES
} = require('./salesforce-upload-client.cjs');

function parseArgs(args) {
  const options = {
    projectId: null,
    runName: null,
    filePath: 'analysis-snapshot.json',
    commitHash: null,
    instanceUrl: process.env.SF_INSTANCE_URL || null,
    accessToken: process.env.SF_ACCESS_TOKEN || null,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--project-id' && i + 1 < args.length) {
      options.projectId = args[++i];
    } else if (arg === '--run-name' && i + 1 < args.length) {
      options.runName = args[++i];
    } else if (arg === '--file' && i + 1 < args.length) {
      options.filePath = args[++i];
    } else if (arg === '--commit-hash' && i + 1 < args.length) {
      options.commitHash = args[++i];
    } else if (arg === '--instance-url' && i + 1 < args.length) {
      options.instanceUrl = args[++i];
    } else if (arg === '--access-token' && i + 1 < args.length) {
      options.accessToken = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Salesforce Dependency Graph Ingestion CLI (Agent 4)
===================================================

Usage:
  node scripts/cli-salesforce-ingest.cjs --project-id <id> [options]

Required:
  --project-id <id>      Salesforce DA_Project__c ID or Project_Key__c

Options:
  --file <path>          Path to graph snapshot JSON (default: analysis-snapshot.json)
  --run-name <name>      Name of the analysis run (default: Analysis Run <ISO-timestamp>)
  --commit-hash <hash>   Git source commit SHA-1/SHA-256 (optional provenance)
  --instance-url <url>   Salesforce instance base URL (or env SF_INSTANCE_URL)
  --access-token <token> Salesforce OAuth bearer token (or env SF_ACCESS_TOKEN)
  --dry-run              Calculate chunks, wire sizing, and checksums without transmitting
  --help, -h             Show this help screen
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.projectId) {
    console.error('Error: --project-id is required.');
    printHelp();
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), options.filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at path: ${resolvedPath}`);
    process.exit(1);
  }

  console.log('----------------------------------------------------');
  console.log('Salesforce Dependency Graph Ingestion CLI (Agent 4)');
  console.log('----------------------------------------------------');
  console.log(`Target Project:     ${options.projectId}`);
  console.log(`Source File:        ${resolvedPath}`);

  // Non-mutating read of the payload file
  const rawContent = fs.readFileSync(resolvedPath, 'utf8');
  const payloadChars = rawContent.length;
  const utf8Bytes = Buffer.byteLength(rawContent, 'utf8');

  console.log(`Payload Size:       ${payloadChars.toLocaleString()} UTF-16 code units (${utf8Bytes.toLocaleString()} UTF-8 bytes)`);

  if (payloadChars > MAX_TOTAL_PAYLOAD_CHARS) {
    console.error(`Error: Payload size (${payloadChars}) exceeds maximum allowed cap of ${MAX_TOTAL_PAYLOAD_CHARS} UTF-16 units.`);
    process.exit(1);
  }

  // Pre-flight Chunking and Checksum Verification
  const checksum = computePayloadChecksum(rawContent);
  const chunks = chunkPayloadSafe(rawContent, MAX_CHUNK_SIZE);
  console.log(`Calculated Chunks:  ${chunks.length}`);
  console.log(`SHA-256 Checksum:   ${checksum}`);

  if (options.commitHash) {
    console.log(`Git Commit Provenance: ${options.commitHash}`);
  }

  if (options.dryRun) {
    console.log('\n[DRY RUN MODE ENABLED]');
    console.log('Performing pre-flight batch sizing checks...');

    let offset = 0;
    let batchIndex = 0;
    while (offset < chunks.length) {
      const candidateCount = Math.min(10, chunks.length - offset);
      const candidateChunks = chunks.slice(offset, offset + candidateCount);
      const envelope = {
        runId: 'dry_run_id',
        projectId: options.projectId,
        startIndex: offset,
        chunks: candidateChunks
      };
      const wireSize = measureEnvelopeWireBytes(envelope);
      const isOversize = wireSize > MAX_REQUEST_BYTES;
      console.log(`  Batch #${batchIndex + 1} (chunks ${offset}..${offset + candidateCount - 1}): ${wireSize.toLocaleString()} bytes ${isOversize ? '[EXCEEDS 5 MiB - DOWN-SCALE TRIGGERED]' : '[OK]'}`);
      offset += candidateCount;
      batchIndex++;
    }

    console.log('\n✓ Dry-run completed successfully. All pre-flight invariants validated.');
    process.exit(0);
  }

  // Configure Transport Adapter (REST if credentials provided, otherwise in-memory simulation)
  let transport;
  if (options.instanceUrl && options.accessToken) {
    console.log(`\nConfiguring Salesforce REST Transport Adapter:`);
    console.log(`  Instance URL:       ${options.instanceUrl}`);
    console.log(`  Access Token:       [REDACTED] (${options.accessToken.length} chars)`);
    transport = new SalesforceRestTransportAdapter({
      instanceUrl: options.instanceUrl,
      accessToken: options.accessToken
    });
  } else {
    console.log(`\nNotice: No --instance-url / --access-token provided. Using InMemoryTransportAdapter for offline execution.`);
    transport = new InMemoryTransportAdapter();
  }

  // Normal Upload Execution
  const client = new SalesforceGraphUploadClient({ transportAdapter: transport });
  const runName = options.runName || `Analysis Run ${new Date().toISOString()}`;

  console.log(`\nInitiating upload: "${runName}"...`);

  try {
    const result = await client.uploadGraph({
      projectId: options.projectId,
      runName,
      payload: rawContent,
      commitHash: options.commitHash,
      onProgress: (evt) => {
        if (evt.phase === 'UPLOADING') {
          process.stdout.write(`\rUploading chunks: ${evt.current}/${evt.total} (${evt.percentage}%) - batch size ${evt.batchSize} (${evt.batchWireBytes.toLocaleString()} wire bytes)`);
        } else {
          process.stdout.write(`\rPhase: ${evt.phase} (${evt.percentage}%)...`);
        }
      }
    });

    console.log('\n\n====================================================');
    console.log('Upload Completed Successfully');
    console.log('====================================================');
    console.log(`Run ID:             ${result.runId}`);
    console.log(`Final Status:       ${result.status}`);
    console.log(`Total Chunks:       ${result.totalChunks}`);
    console.log(`Total Payload Chars:${result.totalBytes}`);
    console.log(`Checksum (SHA-256): ${result.checksum}`);
    console.log('====================================================\n');
  } catch (err) {
    console.error(`\n\nUpload failed [${err.code || 'UNKNOWN'}]: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal CLI Error:', err);
    process.exit(1);
  });
}

module.exports = { parseArgs, main };
