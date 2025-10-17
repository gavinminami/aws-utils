import {
  EC2Client,
  DescribeRegionsCommand,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeInstanceTypesCommand,
  Instance,
  Filter,
} from '@aws-sdk/client-ec2';
import { EC2InstanceInfo } from './types';
import { getInstancePricing, calculateAnnualCost } from './pricing';

/**
 * Cache for instance type specifications
 */
const instanceTypeCache = new Map<string, { cpus: number; ramGB: number }>();

/**
 * Get all enabled AWS regions
 */
async function getAllRegions(): Promise<string[]> {
  const ec2Client = new EC2Client({});

  try {
    const command = new DescribeRegionsCommand({
      AllRegions: false, // Only get enabled regions
    });

    const response = await ec2Client.send(command);

    return response.Regions?.map(region => region.RegionName).filter((name): name is string => !!name) || [];
  } catch (error) {
    console.error('Error fetching regions:', error);
    throw error;
  }
}

/**
 * Get the Name tag value from an instance
 */
function getInstanceName(instance: Instance): string {
  const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
  return nameTag?.Value || 'N/A';
}

/**
 * Get instance specifications (CPU count and RAM) from AWS API
 */
async function getInstanceSpecs(
  ec2Client: EC2Client,
  instanceType: string
): Promise<{ cpus: number; ramGB: number }> {
  // Check cache first
  if (instanceTypeCache.has(instanceType)) {
    return instanceTypeCache.get(instanceType)!;
  }

  try {
    const command = new DescribeInstanceTypesCommand({
      InstanceTypes: [instanceType as any],
    });

    const response = await ec2Client.send(command);

    if (response.InstanceTypes && response.InstanceTypes.length > 0) {
      const typeInfo = response.InstanceTypes[0];
      const cpus = typeInfo.VCpuInfo?.DefaultVCpus || 0;
      const ramMB = typeInfo.MemoryInfo?.SizeInMiB || 0;
      const ramGB = Math.round((ramMB / 1024) * 100) / 100; // Convert MiB to GB with 2 decimal precision

      const specs = { cpus, ramGB };

      // Cache the result
      instanceTypeCache.set(instanceType, specs);

      return specs;
    }
  } catch (error) {
    console.error(`Error fetching instance type info for ${instanceType}:`, error);
  }

  // Return unknown if not found
  return { cpus: 0, ramGB: 0 };
}

/**
 * Get total disk storage for an instance across all attached volumes
 */
async function getInstanceDiskStorage(
  ec2Client: EC2Client,
  instanceId: string
): Promise<number> {
  try {
    const filters: Filter[] = [
      {
        Name: 'attachment.instance-id',
        Values: [instanceId],
      },
    ];

    const command = new DescribeVolumesCommand({ Filters: filters });
    const response = await ec2Client.send(command);

    const totalGB = response.Volumes?.reduce((sum, volume) => {
      return sum + (volume.Size || 0);
    }, 0) || 0;

    return totalGB;
  } catch (error) {
    console.error(`Error fetching volumes for instance ${instanceId}:`, error);
    return 0;
  }
}

/**
 * Get EC2 instances from a specific region (with pagination support)
 */
async function getInstancesInRegion(region: string): Promise<EC2InstanceInfo[]> {
  const ec2Client = new EC2Client({ region });
  const instances: EC2InstanceInfo[] = [];

  try {
    let nextToken: string | undefined;

    // Paginate through all results
    do {
      const command = new DescribeInstancesCommand({
        NextToken: nextToken,
        MaxResults: 1000, // Maximum allowed by AWS
      });

      const response = await ec2Client.send(command);

      if (!response.Reservations) {
        break;
      }

      // Process all instances in all reservations
      for (const reservation of response.Reservations) {
        if (!reservation.Instances) continue;

        for (const instance of reservation.Instances) {
          const instanceType = instance.InstanceType || 'unknown';
          const specs = await getInstanceSpecs(ec2Client, instanceType);
          const diskStorageGB = await getInstanceDiskStorage(
            ec2Client,
            instance.InstanceId || ''
          );

          // Get pricing information
          const hourlyPrice = await getInstancePricing(region, instanceType);
          const annualCost = calculateAnnualCost(hourlyPrice);

          instances.push({
            instanceId: instance.InstanceId || 'N/A',
            name: getInstanceName(instance),
            region,
            instanceType,
            cpuCount: specs.cpus,
            cpuArchitecture: instance.Architecture || 'unknown',
            ramGB: specs.ramGB,
            diskStorageGB,
            state: instance.State?.Name || 'unknown',
            hourlyPrice,
            annualCost,
          });
        }
      }

      // Get the next token for pagination
      nextToken = response.NextToken;
    } while (nextToken);

  } catch (error) {
    console.error(`Error fetching instances in region ${region}:`, error);
  }

  return instances;
}

/**
 * Get all EC2 instances across all regions in the current AWS account
 *
 * @returns Array of EC2 instance information including name, CPU, RAM, and disk storage
 *
 * @example
 * ```typescript
 * const instances = await getAllEC2Instances();
 * for (const instance of instances) {
 *   console.log(`${instance.name} (${instance.instanceType}): ${instance.cpuCount} vCPUs, ${instance.ramGB} GB RAM, ${instance.diskStorageGB} GB disk`);
 * }
 * ```
 */
export async function getAllEC2Instances(): Promise<EC2InstanceInfo[]> {
  console.log('Fetching all AWS regions...');
  const regions = await getAllRegions();
  console.log(`Found ${regions.length} regions`);

  const allInstances: EC2InstanceInfo[] = [];

  // Fetch instances from all regions in parallel
  const instancePromises = regions.map(region => {
    console.log(`Fetching instances in ${region}...`);
    return getInstancesInRegion(region);
  });

  const instancesByRegion = await Promise.all(instancePromises);

  // Flatten the results
  for (const instances of instancesByRegion) {
    allInstances.push(...instances);
  }

  console.log(`Total instances found: ${allInstances.length}`);
  return allInstances;
}
