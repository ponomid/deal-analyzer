export type PropertyType = "single_family" | "duplex" | "triplex" | "multifamily";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: "Single family",
  duplex: "Duplex",
  triplex: "Triplex",
  multifamily: "Multifamily",
};

export function isMultiUnitProperty(type: PropertyType): boolean {
  return type !== "single_family";
}

export function fixedUnitCount(type: PropertyType): number | null {
  if (type === "duplex") return 2;
  if (type === "triplex") return 3;
  return null;
}

export function propertyTypeLabel(type: PropertyType): string {
  return PROPERTY_TYPE_LABELS[type];
}
