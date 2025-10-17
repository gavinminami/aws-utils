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
