export function buildShareCardRequest({
  sourceCanvas,
  vehicleName,
  variant,
  color,
  wheels,
  interior,
  roof,
  price,
  city,
}) {
  return {
    sourceCanvas,
    vehicleName,
    variantName: variant,
    color,
    wheels,
    interior,
    roof,
    price,
    city,
  };
}
