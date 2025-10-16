# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A TypeScript utility library for AWS-related functionality. Currently provides utilities for EC2 instance discovery and inventory across all AWS regions.

## Project Structure

```
aws-utils/
├── src/              # TypeScript source files
│   ├── index.ts      # Main entry point (exports all utilities)
│   ├── types.ts      # TypeScript interfaces and types
│   ├── ec2-instances.ts  # EC2 instance discovery utilities
│   ├── csv-utils.ts  # CSV formatting utilities
│   └── utils.ts      # General utility functions
├── examples/         # Example usage scripts
│   └── list-ec2-instances.ts  # Example: List all EC2 instances
├── tests/            # Test files
├── dist/             # Compiled JavaScript output (generated)
└── tsconfig.json     # TypeScript configuration
```

## Features

### EC2 Instance Discovery

The `getAllEC2Instances()` function retrieves comprehensive information about all EC2 instances across all enabled AWS regions:

- Instance ID and name (from Name tag)
- Instance type, CPU count, and architecture
- RAM (in GB)
- Total disk storage across all attached volumes (in GB)
- Current instance state
- Region location

The function queries all enabled regions in parallel for optimal performance.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

## Common Commands

- `npm run build` - Compile TypeScript to JavaScript (output to `dist/`)
- `npm run clean` - Remove the `dist/` directory
- `npm run dev` - Run the TypeScript code directly without building
- `npm test` - Run tests (to be configured)

### EC2 Instance Discovery Examples

- `npx tsx examples/list-ec2-instances.ts` - List instances in human-readable format
- `npx tsx examples/list-ec2-instances.ts --csv` - Output in CSV format
- `npx tsx examples/list-ec2-instances.ts --csv --output instances.csv` - Save CSV to file
- `npx tsx examples/list-ec2-instances.ts --output report.txt` - Save human-readable to file

## AWS Configuration

AWS credentials must be configured for the SDK to work. The SDK will automatically look for credentials in this order:

1. Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (optional)
2. Shared credentials file: `~/.aws/credentials`
3. IAM role (when running on EC2, ECS, Lambda, etc.)

### Required IAM Permissions

For EC2 instance discovery:
- `ec2:DescribeRegions` - List all AWS regions
- `ec2:DescribeInstances` - List EC2 instances
- `ec2:DescribeInstanceTypes` - Get instance type specifications (CPU, RAM)
- `ec2:DescribeVolumes` - Get volume information for disk storage

## TypeScript Configuration

- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Source maps and declaration files generated
- Output directory: `dist/`
- Source directory: `src/`
