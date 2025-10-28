/**
 * EC2 Instance information
 */
export interface EC2InstanceInfo {
  /** Instance ID (e.g., i-1234567890abcdef0) */
  instanceId: string;

  /** Instance name from Name tag */
  name: string;

  /** AWS region where the instance is located */
  region: string;

  /** Instance type (e.g., t3.micro, m5.large) */
  instanceType: string;

  /** Number of vCPUs */
  cpuCount: number;

  /** CPU architecture (e.g., x86_64, arm64) */
  cpuArchitecture: string;

  /** Amount of RAM in GB */
  ramGB: number;

  /** Total disk storage in GB across all volumes */
  diskStorageGB: number;

  /** Instance state (running, stopped, etc.) */
  state: string;

  /** On-demand hourly price in USD */
  hourlyPrice: number;

  /** Estimated annual cost in USD (based on 24/7 on-demand pricing) */
  annualCost: number;
}

/**
 * Type of AWS resource using a security group
 */
export type SecurityGroupResourceType =
  | 'EC2'
  | 'RDS'
  | 'LoadBalancer'
  | 'Lambda'
  | 'NetworkInterface'
  | 'ElastiCache'
  | 'Other';

/**
 * Information about a resource using a security group
 */
export interface SecurityGroupResource {
  /** Type of resource */
  resourceType: SecurityGroupResourceType;

  /** Resource identifier (e.g., instance ID, DB identifier, LB ARN) */
  resourceId: string;

  /** Resource name if available */
  resourceName?: string;

  /** AWS region where the resource is located */
  region: string;

  /** Additional details about the resource */
  details?: string;
}

/**
 * Result of checking security group usage
 */
export interface SecurityGroupUsageResult {
  /** The security group ID that was checked */
  securityGroupId: string;

  /** The security group name if available */
  securityGroupName?: string;

  /** VPC ID where the security group exists */
  vpcId?: string;

  /** Whether the security group is currently in use */
  isInUse: boolean;

  /** List of resources using this security group */
  resources: SecurityGroupResource[];

  /** Total count of resources using this security group */
  totalCount: number;
}
