import { createPublicEnrollmentRegistry, type PublicEnrollmentManifest } from "./public-enrollment-registry.ts";

const DIGEST=/^[a-f0-9]{64}$/;
const VERSION=/^[1-9][0-9]{0,18}$/;
const MAX=BigInt("9223372036854775807");

export class PublicEnrollmentProvisioningDenied extends Error {
  constructor(public readonly code:string){super(code);this.name="PublicEnrollmentProvisioningDenied";}
}
function requireProvisioning(ok:unknown,code:string):asserts ok{if(!ok)throw new PublicEnrollmentProvisioningDenied(code);}
function version(v:unknown){requireProvisioning(typeof v==="string"&&VERSION.test(v)&&BigInt(v)<=MAX,"INVALID_PROVISIONING_VERSION");return v;}
function freeze<T>(v:T):T{if(v&&typeof v==="object"){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}

/**
 * Converts owner-reviewed public configuration into a runtime manifest only
 * when it matches an independently reviewed version+digest pin.
 *
 * There is deliberately no environment/request fallback and no account-role
 * inference. Rotating/rebinding records requires a new reviewed pin. The caller
 * remains responsible for replacing old process instances after provisioning.
 */
export function provisionPublicEnrollmentManifest(input:{
  manifest:PublicEnrollmentManifest;
  reviewed:{version:string;manifestDigest:string};
  minimumAcceptedVersion?:string;
  now?:()=>number;
}){
  requireProvisioning(input&&typeof input==="object","PROVISIONING_INPUT_REQUIRED");
  const reviewedVersion=version(input.reviewed?.version),digest=input.reviewed?.manifestDigest;
  requireProvisioning(typeof digest==="string"&&DIGEST.test(digest),"INVALID_PROVISIONING_DIGEST");
  if(input.minimumAcceptedVersion!==undefined){
    const floor=version(input.minimumAcceptedVersion);
    requireProvisioning(BigInt(reviewedVersion)>=BigInt(floor),"PROVISIONING_VERSION_ROLLBACK");
  }
  let manifest:PublicEnrollmentManifest;
  try{manifest=structuredClone(input.manifest);}catch{throw new PublicEnrollmentProvisioningDenied("PROVISIONING_MANIFEST_UNCLONEABLE");}
  const registry=createPublicEnrollmentRegistry(manifest,{now:input.now});
  requireProvisioning(registry.provenance.manifestVersion===reviewedVersion,"PROVISIONING_VERSION_MISMATCH");
  requireProvisioning(registry.provenance.manifestDigest===digest,"PROVISIONING_DIGEST_MISMATCH");
  return freeze({manifest,provenance:registry.provenance});
}
