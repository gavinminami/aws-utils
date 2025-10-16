/**
 * Example: List all EC2 instances across all regions
 *
 * This example demonstrates how to use the getAllEC2Instances function
 * to retrieve information about all EC2 instances in your AWS account.
 *
 * Prerequisites:
 * - AWS credentials must be configured (via environment variables, ~/.aws/credentials, or IAM role)
 * - Required IAM permissions: ec2:DescribeRegions, ec2:DescribeInstances, ec2:DescribeVolumes
 *
 * Usage:
 *   npx tsx examples/list-ec2-instances.ts [--csv] [--output <file>]
 *
 * Options:
 *   --csv              Output in CSV format
 *   --output <file>    Write output to a file instead of stdout
 */

import { getAllEC2Instances } from '../src/ec2-instances';
import { convertToCSV } from '../src/csv-utils';
import * as fs from 'fs';

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const csvFormat = args.includes('--csv');
    const outputIndex = args.indexOf('--output');
    const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;

    console.error('Starting EC2 instance discovery...\n');

    const instances = await getAllEC2Instances();

    if (instances.length === 0) {
      console.error('No EC2 instances found in any region.');
      return;
    }

    let output: string;

    if (csvFormat) {
      // CSV format
      output = convertToCSV(instances);
    } else {
      // Human-readable format
      const lines: string[] = [];
      lines.push('\n=== EC2 Instance Summary ===\n');

      // Group by region for better readability
      const instancesByRegion = instances.reduce((acc, instance) => {
        if (!acc[instance.region]) {
          acc[instance.region] = [];
        }
        acc[instance.region].push(instance);
        return acc;
      }, {} as Record<string, typeof instances>);

      for (const [region, regionInstances] of Object.entries(instancesByRegion)) {
        lines.push(`\nRegion: ${region} (${regionInstances.length} instances)`);
        lines.push('─'.repeat(80));

        for (const instance of regionInstances) {
          lines.push(`
  Name:         ${instance.name}
  Instance ID:  ${instance.instanceId}
  Type:         ${instance.instanceType}
  State:        ${instance.state}
  CPU:          ${instance.cpuCount} vCPUs (${instance.cpuArchitecture})
  RAM:          ${instance.ramGB} GB
  Disk:         ${instance.diskStorageGB} GB
          `);
        }
      }

      // Summary statistics
      lines.push('\n=== Summary Statistics ===\n');
      lines.push(`Total instances:     ${instances.length}`);
      lines.push(`Total vCPUs:         ${instances.reduce((sum, i) => sum + i.cpuCount, 0)}`);
      lines.push(`Total RAM:           ${instances.reduce((sum, i) => sum + i.ramGB, 0)} GB`);
      lines.push(`Total disk storage:  ${instances.reduce((sum, i) => sum + i.diskStorageGB, 0)} GB`);

      // Count by state
      const stateCount = instances.reduce((acc, instance) => {
        acc[instance.state] = (acc[instance.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      lines.push('\nInstances by state:');
      for (const [state, count] of Object.entries(stateCount)) {
        lines.push(`  ${state}: ${count}`);
      }

      // Count by instance type
      const instanceTypeCount = instances.reduce((acc, instance) => {
        acc[instance.instanceType] = (acc[instance.instanceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      lines.push('\nInstances by type:');
      // Sort by count (descending) then by instance type name
      const sortedTypes = Object.entries(instanceTypeCount).sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1]; // Sort by count descending
        }
        return a[0].localeCompare(b[0]); // Then by name
      });

      for (const [type, count] of sortedTypes) {
        lines.push(`  ${type}: ${count}`);
      }

      output = lines.join('\n');
    }

    // Output to file or stdout
    if (outputFile) {
      fs.writeFileSync(outputFile, output, 'utf-8');
      console.error(`\nOutput written to: ${outputFile}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
