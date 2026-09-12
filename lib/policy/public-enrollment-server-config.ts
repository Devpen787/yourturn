import type { PublicEnrollmentManifest } from "./public-enrollment-registry.ts";
import { provisionPublicEnrollmentManifest } from "./public-enrollment-provisioning.ts";

export const PUBLIC_ENROLLMENT_ENV = Object.freeze({
  manifest: "YOURTURN_PUBLIC_ENROLLMENT_MANIFEST_JSON",
  version: "YOURTURN_PUBLIC_ENROLLMENT_VERSION",
  digest: "YOURTURN_PUBLIC_ENROLLMENT_DIGEST",
  minimumVersion: "YOURTURN_PUBLIC_ENROLLMENT_MIN_VERSION",
});

export class PublicEnrollmentConfigurationError extends Error {
  constructor(public readonly code:string){super(code);this.name="PublicEnrollmentConfigurationError";}
}
const required=(env:Record<string,string|undefined>,key:string)=>{const v=env[key];if(typeof v!=="string"||v.length===0)throw new PublicEnrollmentConfigurationError(`MISSING_${key}`);return v;};

/**
 * Deployment boundary for public, non-secret enrollment data.
 *
 * There is no built-in/demo mapping and no request-body source. Deployments must
 * supply all three reviewed values: the complete manifest, its exact version and
 * its SHA-256 digest. An optional minimum version prevents a rollback to a
 * previously reviewed manifest. This module does not infer any account/address.
 */
export function loadProvisionedPublicEnrollmentFromEnvironment(env:Record<string,string|undefined>=process.env){
  let manifest:PublicEnrollmentManifest;
  try{manifest=JSON.parse(required(env,PUBLIC_ENROLLMENT_ENV.manifest));}
  catch(error){if(error instanceof PublicEnrollmentConfigurationError)throw error;throw new PublicEnrollmentConfigurationError("INVALID_PUBLIC_ENROLLMENT_JSON");}
  const version=required(env,PUBLIC_ENROLLMENT_ENV.version),manifestDigest=required(env,PUBLIC_ENROLLMENT_ENV.digest);
  const minimumAcceptedVersion=env[PUBLIC_ENROLLMENT_ENV.minimumVersion];
  return provisionPublicEnrollmentManifest({manifest,reviewed:{version,manifestDigest},...(minimumAcceptedVersion?{minimumAcceptedVersion}:{})});
}
