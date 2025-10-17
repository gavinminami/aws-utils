# AWS Utils

A TypeScript utility library for AWS operations, providing comprehensive EC2 instance discovery and cost analysis across all regions.

## Features

- 🌍 **Multi-Region Discovery** - Automatically discovers and queries all enabled AWS regions
- 💰 **Cost Estimation** - Calculates on-demand pricing with hourly and annual cost estimates
- 📊 **Multiple Output Formats** - Human-readable text or CSV export
- 🚀 **High Performance** - Parallel region queries with built-in caching
- 📄 **Complete Instance Details** - CPU, RAM, disk storage, state, and pricing information
- 🔄 **Pagination Support** - Handles accounts with thousands of instances

## Installation

```bash
npm install
```

## Prerequisites

### AWS Credentials

Configure your AWS credentials using one of the following methods:

**Option 1: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_SESSION_TOKEN=your_session_token  # Optional
```

**Option 2: AWS Credentials File**
```bash
# ~/.aws/credentials
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key
```

**Option 3: IAM Role**
When running on EC2, ECS, or Lambda, credentials are automatically obtained from the instance role.

### Required IAM Permissions

Your AWS credentials need the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeRegions",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceTypes",
        "ec2:DescribeVolumes",
        "pricing:GetProducts"
      ],
      "Resource": "*"
    }
  ]
}
```

## Usage

### Command Line

**List all instances (human-readable format)**
```bash
npx tsx examples/list-ec2-instances.ts
```

**Output in CSV format**
```bash
npx tsx examples/list-ec2-instances.ts --csv
```

**Save to file**
```bash
npx tsx examples/list-ec2-instances.ts --csv --output instances.csv
npx tsx examples/list-ec2-instances.ts --output report.txt
```

**Pipe CSV output to other tools**
```bash
npx tsx examples/list-ec2-instances.ts --csv | grep running
npx tsx examples/list-ec2-instances.ts --csv > instances.csv
```

### Programmatic Usage

```typescript
import { getAllEC2Instances } from 'aws-utils';

async function main() {
  // Get all instances across all regions
  const instances = await getAllEC2Instances();

  // Process the results
  for (const instance of instances) {
    console.log(`${instance.name} (${instance.instanceType})`);
    console.log(`  vCPUs: ${instance.cpuCount}`);
    console.log(`  RAM: ${instance.ramGB} GB`);
    console.log(`  Disk: ${instance.diskStorageGB} GB`);
    console.log(`  Annual Cost: $${instance.annualCost.toFixed(2)}`);
  }

  // Calculate total costs
  const totalAnnualCost = instances.reduce((sum, i) => sum + i.annualCost, 0);
  console.log(`\nTotal Annual Cost: $${totalAnnualCost.toFixed(2)}`);
}

main();
```

### Get Pricing for Specific Instance

```typescript
import { getInstancePricing, calculateAnnualCost } from 'aws-utils';

async function getPricing() {
  const hourlyPrice = await getInstancePricing('us-east-1', 't3.medium');
  const annualCost = calculateAnnualCost(hourlyPrice);

  console.log(`Hourly: $${hourlyPrice.toFixed(4)}`);
  console.log(`Annual: $${annualCost.toFixed(2)}`);
}
```

### CSV Export

```typescript
import { getAllEC2Instances, convertToCSV } from 'aws-utils';
import * as fs from 'fs';

async function exportToCSV() {
  const instances = await getAllEC2Instances();
  const csv = convertToCSV(instances);

  fs.writeFileSync('ec2-instances.csv', csv, 'utf-8');
  console.log('Exported to ec2-instances.csv');
}
```

## Output Format

### Human-Readable Output

```
=== EC2 Instance Summary ===

Region: us-east-1 (3 instances)
────────────────────────────────────────────────────────────────────────────────

  Name:         web-server-01
  Instance ID:  i-0123456789abcdef0
  Type:         t3.medium
  State:        running
  CPU:          2 vCPUs (x86_64)
  RAM:          4 GB
  Disk:         30 GB
  Hourly Cost:  $0.0416
  Annual Cost:  $364.42

=== Summary Statistics ===

Total instances:     42
Total vCPUs:         156
Total RAM:           512 GB
Total disk storage:  2048 GB

Estimated annual cost (all instances):     $45,678.50
Estimated annual cost (running only):      $32,450.75

Instances by state:
  running: 35
  stopped: 7

Instances by type:
  t3.medium: 12
  m5.large: 8
  t3.small: 6
  c5.xlarge: 5
```

### CSV Output

```csv
Instance ID,Name,Region,Instance Type,State,vCPUs,CPU Architecture,RAM (GB),Disk Storage (GB),Hourly Price (USD),Annual Cost (USD)
i-0123456789abcdef0,web-server-01,us-east-1,t3.medium,running,2,x86_64,4,30,0.0416,364.42
i-0123456789abcdef1,app-server-01,us-east-1,m5.large,running,2,x86_64,8,50,0.096,840.96
```

## API Reference

### `getAllEC2Instances(): Promise<EC2InstanceInfo[]>`

Retrieves all EC2 instances across all enabled AWS regions.

**Returns:** Array of EC2InstanceInfo objects containing:
- `instanceId` - EC2 instance ID
- `name` - Instance name from Name tag
- `region` - AWS region
- `instanceType` - Instance type (e.g., t3.medium)
- `cpuCount` - Number of vCPUs
- `cpuArchitecture` - CPU architecture (x86_64, arm64)
- `ramGB` - RAM in gigabytes
- `diskStorageGB` - Total disk storage across all volumes
- `state` - Instance state (running, stopped, etc.)
- `hourlyPrice` - On-demand hourly price in USD
- `annualCost` - Estimated annual cost (24/7 operation)

### `getInstancePricing(region: string, instanceType: string, os?: string): Promise<number>`

Gets the on-demand hourly pricing for a specific instance type in a region.

**Parameters:**
- `region` - AWS region code (e.g., "us-east-1")
- `instanceType` - EC2 instance type (e.g., "t3.medium")
- `os` - Operating system (default: "Linux")

**Returns:** Hourly price in USD

### `calculateAnnualCost(hourlyPrice: number): number`

Calculates annual cost based on hourly price (assumes 24/7 operation).

**Parameters:**
- `hourlyPrice` - Hourly price in USD

**Returns:** Annual cost in USD

### `convertToCSV(instances: EC2InstanceInfo[]): string`

Converts instance data to CSV format.

**Parameters:**
- `instances` - Array of EC2InstanceInfo objects

**Returns:** CSV formatted string

## Development

### Build the project
```bash
npm run build
```

### Clean build artifacts
```bash
npm run clean
```

### Run in development mode
```bash
npm run dev
```

### Run tests
```bash
npm test
```

## Important Notes

### Pricing Assumptions

- **On-Demand Pricing Only**: Costs are based on on-demand pricing without Reserved Instances or Savings Plans
- **Linux OS**: Default pricing assumes Linux operating system
- **24/7 Operation**: Annual costs assume instances run continuously (8,760 hours/year)
- **Running vs Stopped**: The summary shows both total cost (all instances) and running cost (only running instances)
- **Stopped Instance Costs**: Stopped instances still incur EBS storage costs (not included in these estimates)

### Performance

- Queries all regions in parallel for optimal performance
- Caches instance type specifications and pricing data to reduce API calls
- Supports pagination for accounts with thousands of instances

### Limitations

- Pricing data fetched from AWS Pricing API (updated regularly but may have slight delays)
- Does not account for:
  - Reserved Instance discounts
  - Savings Plans
  - Spot pricing
  - EBS storage costs
  - Data transfer costs
  - Additional AWS services

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
