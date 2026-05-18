export function serviceOptions(resourcesData) {
  return resourcesData?.settings?.services || [];
}

export function roomOptions(resourcesData) {
  return resourcesData?.settings?.rooms || [];
}

export function therapistOptions(therapistsData) {
  return therapistsData?.therapists || [];
}
