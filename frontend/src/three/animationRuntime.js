export function filterAvailableAnimationMappings(mappings = {}, availableClipNames = []) {
  if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) return {};

  const available = new Set(
    availableClipNames.filter((name) => typeof name === 'string' && name.trim().length > 0),
  );

  return Object.fromEntries(
    Object.entries(mappings)
      .filter(([, groupMappings]) => (
        groupMappings
        && typeof groupMappings === 'object'
        && !Array.isArray(groupMappings)
      ))
      .map(([group, groupMappings]) => [
        group,
        Object.fromEntries(
          Object.entries(groupMappings).filter(([, animationName]) => (
            typeof animationName === 'string'
            && animationName.trim().length > 0
            && available.has(animationName.trim())
          )),
        ),
      ])
      .filter(([, groupMappings]) => Object.keys(groupMappings).length > 0),
  );
}
