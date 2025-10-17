import {
  PricingClient,
  GetProductsCommand,
  Filter as PricingFilter,
} from '@aws-sdk/client-pricing';

/**
 * Cache for instance pricing information
 * Key: region:instanceType (e.g., "us-east-1:t3.medium")
 */
const pricingCache = new Map<string, number>();

/**
 * Map AWS region codes to pricing region names
 */
const REGION_NAME_MAP: Record<string, string> = {
  'us-east-1': 'US East (N. Virginia)',
  'us-east-2': 'US East (Ohio)',
  'us-west-1': 'US West (N. California)',
  'us-west-2': 'US West (Oregon)',
  'ca-central-1': 'Canada (Central)',
  'eu-central-1': 'EU (Frankfurt)',
  'eu-west-1': 'EU (Ireland)',
  'eu-west-2': 'EU (London)',
  'eu-west-3': 'EU (Paris)',
  'eu-north-1': 'EU (Stockholm)',
  'eu-south-1': 'EU (Milan)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'ap-northeast-2': 'Asia Pacific (Seoul)',
  'ap-northeast-3': 'Asia Pacific (Osaka)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-south-1': 'Asia Pacific (Mumbai)',
  'sa-east-1': 'South America (Sao Paulo)',
  'me-south-1': 'Middle East (Bahrain)',
  'af-south-1': 'Africa (Cape Town)',
  'ap-east-1': 'Asia Pacific (Hong Kong)',
  'ap-southeast-3': 'Asia Pacific (Jakarta)',
};

/**
 * Get the pricing region name from AWS region code
 */
function getPricingRegion(region: string): string {
  return REGION_NAME_MAP[region] || region;
}

/**
 * Get on-demand hourly pricing for an EC2 instance type in a specific region
 *
 * @param region AWS region code (e.g., "us-east-1")
 * @param instanceType EC2 instance type (e.g., "t3.medium")
 * @param os Operating system (default: "Linux")
 * @returns Hourly price in USD, or 0 if not found
 */
export async function getInstancePricing(
  region: string,
  instanceType: string,
  os: string = 'Linux'
): Promise<number> {
  const cacheKey = `${region}:${instanceType}:${os}`;

  // Check cache first
  if (pricingCache.has(cacheKey)) {
    return pricingCache.get(cacheKey)!;
  }

  try {
    // Pricing API is only available in us-east-1 and ap-south-1
    const pricingClient = new PricingClient({ region: 'us-east-1' });

    const filters: PricingFilter[] = [
      {
        Type: 'TERM_MATCH',
        Field: 'ServiceCode',
        Value: 'AmazonEC2',
      },
      {
        Type: 'TERM_MATCH',
        Field: 'instanceType',
        Value: instanceType,
      },
      {
        Type: 'TERM_MATCH',
        Field: 'location',
        Value: getPricingRegion(region),
      },
      {
        Type: 'TERM_MATCH',
        Field: 'operatingSystem',
        Value: os,
      },
      {
        Type: 'TERM_MATCH',
        Field: 'tenancy',
        Value: 'Shared',
      },
      {
        Type: 'TERM_MATCH',
        Field: 'preInstalledSw',
        Value: 'NA',
      },
      {
        Type: 'TERM_MATCH',
        Field: 'capacitystatus',
        Value: 'Used',
      },
    ];

    const command = new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: filters,
      MaxResults: 1,
    });

    const response = await pricingClient.send(command);

    if (response.PriceList && response.PriceList.length > 0) {
      const priceItem = JSON.parse(response.PriceList[0]);

      // Navigate the pricing structure to find the on-demand price
      const terms = priceItem.terms?.OnDemand;
      if (terms) {
        const termKey = Object.keys(terms)[0];
        const priceDimensions = terms[termKey]?.priceDimensions;
        if (priceDimensions) {
          const dimensionKey = Object.keys(priceDimensions)[0];
          const pricePerUnit = priceDimensions[dimensionKey]?.pricePerUnit?.USD;

          if (pricePerUnit) {
            const hourlyPrice = parseFloat(pricePerUnit);
            pricingCache.set(cacheKey, hourlyPrice);
            return hourlyPrice;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching pricing for ${instanceType} in ${region}:`, error);
  }

  // Return 0 if pricing not found
  return 0;
}

/**
 * Calculate annual cost based on hourly price
 *
 * @param hourlyPrice Hourly price in USD
 * @returns Annual cost in USD (hourly price * 24 hours * 365 days)
 */
export function calculateAnnualCost(hourlyPrice: number): number {
  return Math.round(hourlyPrice * 24 * 365 * 100) / 100; // Round to 2 decimal places
}

/**
 * Get annual cost for an instance
 *
 * @param region AWS region code
 * @param instanceType EC2 instance type
 * @param os Operating system (default: "Linux")
 * @returns Annual cost in USD
 */
export async function getInstanceAnnualCost(
  region: string,
  instanceType: string,
  os: string = 'Linux'
): Promise<number> {
  const hourlyPrice = await getInstancePricing(region, instanceType, os);
  return calculateAnnualCost(hourlyPrice);
}
