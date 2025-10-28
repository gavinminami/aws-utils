import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  DescribeInstancesCommand,
  DescribeNetworkInterfacesCommand,
} from '@aws-sdk/client-ec2';
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand,
} from '@aws-sdk/client-rds';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
} from '@aws-sdk/client-lambda';
import {
  ElastiCacheClient,
  DescribeCacheClustersCommand,
  DescribeReplicationGroupsCommand,
} from '@aws-sdk/client-elasticache';
import {
  SecurityGroupUsageResult,
  SecurityGroupResource,
} from './types';

/**
 * Check if a security group is being used by AWS resources
 *
 * @param securityGroupId - The security group ID to check (e.g., sg-1234567890abcdef0)
 * @param region - AWS region to check (defaults to us-east-1)
 * @returns Security group usage information including all resources using it
 *
 * @example
 * ```typescript
 * const result = await checkSecurityGroupUsage('sg-1234567890abcdef0', 'us-east-1');
 * if (result.isInUse) {
 *   console.log(`Security group is used by ${result.totalCount} resources:`);
 *   result.resources.forEach(resource => {
 *     console.log(`- ${resource.resourceType}: ${resource.resourceId} (${resource.region})`);
 *   });
 * } else {
 *   console.log('Security group is not in use');
 * }
 * ```
 */
export async function checkSecurityGroupUsage(
  securityGroupId: string,
  region: string = 'us-east-1'
): Promise<SecurityGroupUsageResult> {
  const resources: SecurityGroupResource[] = [];

  // Initialize clients
  const ec2Client = new EC2Client({ region });
  const rdsClient = new RDSClient({ region });
  const elbv2Client = new ElasticLoadBalancingV2Client({ region });
  const lambdaClient = new LambdaClient({ region });
  const elastiCacheClient = new ElastiCacheClient({ region });

  // Get security group details first
  let securityGroupName: string | undefined;
  let vpcId: string | undefined;

  try {
    const sgResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({
        GroupIds: [securityGroupId],
      })
    );

    if (sgResponse.SecurityGroups && sgResponse.SecurityGroups.length > 0) {
      securityGroupName = sgResponse.SecurityGroups[0].GroupName;
      vpcId = sgResponse.SecurityGroups[0].VpcId;
    }
  } catch (error) {
    console.error(`Error fetching security group details: ${error}`);
    throw new Error(
      `Security group ${securityGroupId} not found in region ${region}`
    );
  }

  // Check all resource types in parallel
  await Promise.all([
    checkEC2Instances(ec2Client, securityGroupId, region, resources),
    checkNetworkInterfaces(ec2Client, securityGroupId, region, resources),
    checkRDSInstances(rdsClient, securityGroupId, region, resources),
    checkRDSClusters(rdsClient, securityGroupId, region, resources),
    checkLoadBalancers(elbv2Client, securityGroupId, region, resources),
    checkLambdaFunctions(lambdaClient, securityGroupId, region, resources),
    checkElastiCacheClusters(elastiCacheClient, securityGroupId, region, resources),
    checkElastiCacheReplicationGroups(
      elastiCacheClient,
      securityGroupId,
      region,
      resources
    ),
  ]);

  return {
    securityGroupId,
    securityGroupName,
    vpcId,
    isInUse: resources.length > 0,
    resources,
    totalCount: resources.length,
  };
}

/**
 * Check EC2 instances using the security group
 */
async function checkEC2Instances(
  client: EC2Client,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(
      new DescribeInstancesCommand({
        Filters: [
          {
            Name: 'instance.group-id',
            Values: [securityGroupId],
          },
        ],
      })
    );

    if (response.Reservations) {
      for (const reservation of response.Reservations) {
        if (reservation.Instances) {
          for (const instance of reservation.Instances) {
            const nameTag = instance.Tags?.find((tag) => tag.Key === 'Name');
            resources.push({
              resourceType: 'EC2',
              resourceId: instance.InstanceId || 'unknown',
              resourceName: nameTag?.Value,
              region,
              details: `Instance Type: ${instance.InstanceType}, State: ${instance.State?.Name}`,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error checking EC2 instances: ${error}`);
  }
}

/**
 * Check network interfaces using the security group
 */
async function checkNetworkInterfaces(
  client: EC2Client,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(
      new DescribeNetworkInterfacesCommand({
        Filters: [
          {
            Name: 'group-id',
            Values: [securityGroupId],
          },
        ],
      })
    );

    if (response.NetworkInterfaces) {
      for (const eni of response.NetworkInterfaces) {
        // Skip ENIs already associated with EC2 instances (we report those separately)
        if (eni.Attachment?.InstanceId) {
          continue;
        }

        const description = eni.Description || 'No description';
        resources.push({
          resourceType: 'NetworkInterface',
          resourceId: eni.NetworkInterfaceId || 'unknown',
          region,
          details: `Description: ${description}, Status: ${eni.Status}`,
        });
      }
    }
  } catch (error) {
    console.error(`Error checking network interfaces: ${error}`);
  }
}

/**
 * Check RDS instances using the security group
 */
async function checkRDSInstances(
  client: RDSClient,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(new DescribeDBInstancesCommand({}));

    if (response.DBInstances) {
      for (const instance of response.DBInstances) {
        const hasSecurityGroup = instance.VpcSecurityGroups?.some(
          (sg: any) => sg.VpcSecurityGroupId === securityGroupId
        );

        if (hasSecurityGroup) {
          resources.push({
            resourceType: 'RDS',
            resourceId: instance.DBInstanceIdentifier || 'unknown',
            resourceName: instance.DBInstanceIdentifier,
            region,
            details: `Engine: ${instance.Engine}, Status: ${instance.DBInstanceStatus}`,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error checking RDS instances: ${error}`);
  }
}

/**
 * Check RDS clusters using the security group
 */
async function checkRDSClusters(
  client: RDSClient,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(new DescribeDBClustersCommand({}));

    if (response.DBClusters) {
      for (const cluster of response.DBClusters) {
        const hasSecurityGroup = cluster.VpcSecurityGroups?.some(
          (sg: any) => sg.VpcSecurityGroupId === securityGroupId
        );

        if (hasSecurityGroup) {
          resources.push({
            resourceType: 'RDS',
            resourceId: cluster.DBClusterIdentifier || 'unknown',
            resourceName: cluster.DBClusterIdentifier,
            region,
            details: `Engine: ${cluster.Engine}, Status: ${cluster.Status} (Cluster)`,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error checking RDS clusters: ${error}`);
  }
}

/**
 * Check load balancers using the security group
 */
async function checkLoadBalancers(
  client: ElasticLoadBalancingV2Client,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(new DescribeLoadBalancersCommand({}));

    if (response.LoadBalancers) {
      for (const lb of response.LoadBalancers) {
        const hasSecurityGroup = lb.SecurityGroups?.includes(securityGroupId);

        if (hasSecurityGroup) {
          resources.push({
            resourceType: 'LoadBalancer',
            resourceId: lb.LoadBalancerArn || 'unknown',
            resourceName: lb.LoadBalancerName,
            region,
            details: `Type: ${lb.Type}, State: ${lb.State?.Code}`,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error checking load balancers: ${error}`);
  }
}

/**
 * Check Lambda functions using the security group
 */
async function checkLambdaFunctions(
  client: LambdaClient,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const listResponse = await client.send(new ListFunctionsCommand({}));

    if (listResponse.Functions) {
      // Check each function's VPC configuration
      const checks = listResponse.Functions.map(async (fn: any) => {
        if (!fn.FunctionName) return;

        try {
          const fnDetails = await client.send(
            new GetFunctionCommand({ FunctionName: fn.FunctionName })
          );

          const hasSecurityGroup =
            fnDetails.Configuration?.VpcConfig?.SecurityGroupIds?.includes(
              securityGroupId
            );

          if (hasSecurityGroup) {
            resources.push({
              resourceType: 'Lambda',
              resourceId: fn.FunctionArn || 'unknown',
              resourceName: fn.FunctionName,
              region,
              details: `Runtime: ${fn.Runtime}, State: ${fn.State}`,
            });
          }
        } catch (error) {
          console.error(
            `Error checking Lambda function ${fn.FunctionName}: ${error}`
          );
        }
      });

      await Promise.all(checks);
    }
  } catch (error) {
    console.error(`Error checking Lambda functions: ${error}`);
  }
}

/**
 * Check ElastiCache clusters using the security group
 */
async function checkElastiCacheClusters(
  client: ElastiCacheClient,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(
      new DescribeCacheClustersCommand({ ShowCacheNodeInfo: true })
    );

    if (response.CacheClusters) {
      for (const cluster of response.CacheClusters) {
        const hasSecurityGroup = cluster.SecurityGroups?.some(
          (sg: any) => sg.SecurityGroupId === securityGroupId
        );

        if (hasSecurityGroup) {
          resources.push({
            resourceType: 'ElastiCache',
            resourceId: cluster.CacheClusterId || 'unknown',
            resourceName: cluster.CacheClusterId,
            region,
            details: `Engine: ${cluster.Engine}, Status: ${cluster.CacheClusterStatus}`,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error checking ElastiCache clusters: ${error}`);
  }
}

/**
 * Check ElastiCache replication groups using the security group
 */
async function checkElastiCacheReplicationGroups(
  client: ElastiCacheClient,
  securityGroupId: string,
  region: string,
  resources: SecurityGroupResource[]
): Promise<void> {
  try {
    const response = await client.send(
      new DescribeReplicationGroupsCommand({})
    );

    if (response.ReplicationGroups) {
      for (const group of response.ReplicationGroups) {
        // Check the member clusters for security groups
        const memberClusters = group.MemberClusters || [];
        if (memberClusters.length > 0) {
          const clusterDetails = await client.send(
            new DescribeCacheClustersCommand({
              CacheClusterId: memberClusters[0],
            })
          );

          const hasSecurityGroup =
            clusterDetails.CacheClusters?.[0]?.SecurityGroups?.some(
              (sg: any) => sg.SecurityGroupId === securityGroupId
            );

          if (hasSecurityGroup) {
            resources.push({
              resourceType: 'ElastiCache',
              resourceId: group.ReplicationGroupId || 'unknown',
              resourceName: group.ReplicationGroupId,
              region,
              details: `Status: ${group.Status} (Replication Group)`,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error checking ElastiCache replication groups: ${error}`);
  }
}
