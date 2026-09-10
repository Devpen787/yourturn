export function hederaErrorStatus(error) {
  return error?.status?.toString?.() ?? null;
}

export function hasExactExpectedHederaStatus(error, expectedStatus) {
  if (!expectedStatus) return false;
  const status = hederaErrorStatus(error);
  return status !== null && status === expectedStatus;
}
