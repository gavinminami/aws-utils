#!/usr/bin/env node
import { checkSecurityGroupUsage } from '../src/security-groups';

/**
 * Example script to check if a security group is being used
 *
 * Usage:
 *   npx tsx examples/check-security-group-usage.ts <security-group-id> [region]
 *
 * Examples:
 *   npx tsx examples/check-security-group-usage.ts sg-1234567890abcdef0
 *   npx tsx examples/check-security-group-usage.ts sg-1234567890abcdef0 us-west-2
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx examples/check-security-group-usage.ts <security-group-id> [region]');
    console.error('\nExamples:');
    console.error('  npx tsx examples/check-security-group-usage.ts sg-1234567890abcdef0');
    console.error('  npx tsx examples/check-security-group-usage.ts sg-1234567890abcdef0 us-west-2');
    process.exit(1);
  }

  const securityGroupId = args[0];
  const region = args[1] || 'us-east-1';

  console.log(`Checking usage for security group: ${securityGroupId}`);
  console.log(`Region: ${region}`);
  console.log('');

  try {
    const result = await checkSecurityGroupUsage(securityGroupId, region);

    console.log('='.repeat(80));
    console.log(`Security Group: ${result.securityGroupId}`);
    if (result.securityGroupName) {
      console.log(`Name: ${result.securityGroupName}`);
    }
    if (result.vpcId) {
      console.log(`VPC: ${result.vpcId}`);
    }
    console.log('='.repeat(80));
    console.log('');

    if (result.isInUse) {
      console.log(`✓ Security group IS IN USE by ${result.totalCount} resource(s):`);
      console.log('');

      // Group resources by type
      const resourcesByType = result.resources.reduce((acc, resource) => {
        if (!acc[resource.resourceType]) {
          acc[resource.resourceType] = [];
        }
        acc[resource.resourceType].push(resource);
        return acc;
      }, {} as Record<string, typeof result.resources>);

      // Display resources grouped by type
      for (const [type, resources] of Object.entries(resourcesByType)) {
        console.log(`${type} (${resources.length}):`);
        for (const resource of resources) {
          console.log(`  - ${resource.resourceId}`);
          if (resource.resourceName && resource.resourceName !== resource.resourceId) {
            console.log(`    Name: ${resource.resourceName}`);
          }
          if (resource.details) {
            console.log(`    ${resource.details}`);
          }
          console.log(`    Region: ${resource.region}`);
        }
        console.log('');
      }

      console.log('⚠️  WARNING: This security group is in use and should NOT be deleted.');
    } else {
      console.log('✓ Security group is NOT in use by any resources.');
      console.log('');
      console.log('This security group can be safely deleted if no longer needed.');
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
