import { EC2InstanceInfo } from './types';

/**
 * Escape a CSV field value
 */
function escapeCsvField(value: string | number): string {
  const stringValue = String(value);

  // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert EC2 instances to CSV format
 */
export function convertToCSV(instances: EC2InstanceInfo[]): string {
  // Define CSV headers
  const headers = [
    'Instance ID',
    'Name',
    'Region',
    'Instance Type',
    'State',
    'vCPUs',
    'CPU Architecture',
    'RAM (GB)',
    'Disk Storage (GB)',
    'Hourly Price (USD)',
    'Annual Cost (USD)',
  ];

  // Create CSV rows
  const rows = instances.map(instance => [
    escapeCsvField(instance.instanceId),
    escapeCsvField(instance.name),
    escapeCsvField(instance.region),
    escapeCsvField(instance.instanceType),
    escapeCsvField(instance.state),
    escapeCsvField(instance.cpuCount),
    escapeCsvField(instance.cpuArchitecture),
    escapeCsvField(instance.ramGB),
    escapeCsvField(instance.diskStorageGB),
    escapeCsvField(instance.hourlyPrice.toFixed(4)),
    escapeCsvField(instance.annualCost.toFixed(2)),
  ]);

  // Combine headers and rows
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ];

  return csvLines.join('\n');
}
