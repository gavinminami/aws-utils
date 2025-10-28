# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A TypeScript utility library for AWS-related functionality. Currently provides:
- EC2 instance discovery and inventory across all AWS regions with cost estimation
- Security group usage checker to identify resources using a security group

**For detailed usage instructions, installation, and examples, see [README.md](README.md).**

## Project Structure

```
aws-utils/
├── src/              # TypeScript source files
│   ├── index.ts      # Main entry point (exports all utilities)
│   ├── types.ts      # TypeScript interfaces and types
│   ├── ec2-instances.ts  # EC2 instance discovery utilities
│   ├── security-groups.ts  # Security group usage checker
│   ├── pricing.ts    # AWS pricing utilities
│   ├── csv-utils.ts  # CSV formatting utilities
│   └── utils.ts      # General utility functions
├── examples/         # Example usage scripts
│   ├── list-ec2-instances.ts  # Example: List all EC2 instances
│   └── check-security-group-usage.ts  # Example: Check security group usage
├── tests/            # Test files
├── dist/             # Compiled JavaScript output (generated)
├── README.md         # User documentation
└── tsconfig.json     # TypeScript configuration
```

## Features

### EC2 Instance Discovery with Cost Analysis

The `getAllEC2Instances()` function retrieves comprehensive information about all EC2 instances across all enabled AWS regions:

- Instance ID and name (from Name tag)
- Instance type, CPU count, and architecture
- RAM (in GB)
- Total disk storage across all attached volumes (in GB)
- Current instance state
- Region location
- On-demand hourly pricing
- Estimated annual cost (24/7 operation)

The function queries all enabled regions in parallel for optimal performance and caches pricing data to minimize API calls.

### Security Group Usage Checker

The `checkSecurityGroupUsage()` function checks if a security group is being used by AWS resources and returns a comprehensive list of all resources referencing it:

- EC2 instances
- Network interfaces (ENIs)
- RDS instances and clusters
- Load balancers (ALB, NLB, CLB)
- Lambda functions in VPCs
- ElastiCache clusters and replication groups

This helps determine whether a security group can be safely deleted or if it's still in use by active resources.

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

### Security Group Usage Examples

- `npx tsx examples/check-security-group-usage.ts sg-1234567890abcdef0` - Check usage in default region (us-east-1)
- `npx tsx examples/check-security-group-usage.ts sg-1234567890abcdef0 us-west-2` - Check usage in specific region

## AWS Configuration

AWS credentials must be configured for the SDK to work. The SDK will automatically look for credentials in this order:

1. Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (optional)
2. Shared credentials file: `~/.aws/credentials`
3. IAM role (when running on EC2, ECS, Lambda, etc.)

### Required IAM Permissions

For EC2 instance discovery with pricing:
- `ec2:DescribeRegions` - List all AWS regions
- `ec2:DescribeInstances` - List EC2 instances
- `ec2:DescribeInstanceTypes` - Get instance type specifications (CPU, RAM)
- `ec2:DescribeVolumes` - Get volume information for disk storage
- `pricing:GetProducts` - Get on-demand pricing information

For security group usage checker:
- `ec2:DescribeSecurityGroups` - Get security group details
- `ec2:DescribeInstances` - Check EC2 instances
- `ec2:DescribeNetworkInterfaces` - Check network interfaces
- `rds:DescribeDBInstances` - Check RDS instances
- `rds:DescribeDBClusters` - Check RDS clusters
- `elasticloadbalancing:DescribeLoadBalancers` - Check load balancers
- `lambda:ListFunctions` - List Lambda functions
- `lambda:GetFunction` - Get Lambda function details
- `elasticache:DescribeCacheClusters` - Check ElastiCache clusters
- `elasticache:DescribeReplicationGroups` - Check ElastiCache replication groups

## TypeScript Configuration

- Target: ES2022
- Module: CommonJS
- Strict mode enabled
- Source maps and declaration files generated
- Output directory: `dist/`
- Source directory: `src/`
