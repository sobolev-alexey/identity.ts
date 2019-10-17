import { Presentation, PresentationDataModel } from './Presentation';
import { Proof, ProofDataModel, ProofBuildingMethod, ProofParameters } from "./Proof/Proof";
import { VerifiableObject, VerificationErrorCodes } from './VerifiableObject';
import { Schema } from './Schema';
import { ProofTypeManager } from './Proof/ProofTypeManager';

export type VerifiablePresentationDataModel = PresentationDataModel & ProofDataModel;

export class VerifiablePresentation extends VerifiableObject {
    private presentation : Presentation;

    public static Create(presentation : Presentation, proof : Proof) : VerifiablePresentation {
        return new VerifiablePresentation(presentation, proof);
    }

    public static async DecodeFromJSON(presentationData : VerifiablePresentationDataModel, provider : string, proofParameter : ProofParameters, presentationSchema ?: Schema) { 
        let proof : Proof = ProofTypeManager.GetInstance().CreateProofWithBuilder(presentationData.proof.type, proofParameter, presentationData.proof);
        return new VerifiablePresentation( await Presentation.DecodeFromJSON(<PresentationDataModel>presentationData, provider, presentationSchema), proof);
    }
    
    private constructor(presentation : Presentation, proof : Proof) {
        super(proof);
        this.presentation = presentation;
    }

    public Verify() : VerificationErrorCodes {
        //Verification Steps
        if(this.presentation.GetSchema()) {
            if(!this.presentation.GetSchema().IsDIDTrusted(this.proof.GetIssuer().GetDID())) {
                return VerificationErrorCodes.ISSUER_NOT_TRUSTED;
            }
            if(!this.presentation.GetSchema().DoesObjectFollowSchema(this.presentation.EncodeToJSON())) {
                return VerificationErrorCodes.NO_MATCH_SCHEMA;
            }
        }
        if(!this.proof.VerifySignature(this.presentation.EncodeToJSON())) {
            return VerificationErrorCodes.INCORRECT_SIGNATURE;
        }

        //Verify all Verifiable Credentials
        const vcs = this.presentation.GetVerifiableCredentials();
        for(let i=0; i < vcs.length; i++) {
            const code = vcs[i].Verify();
            if(code != VerificationErrorCodes.SUCCESS) {
                return code;
            }
        }

        return VerificationErrorCodes.SUCCESS;
    }

    public EncodeToJSON(): VerifiablePresentationDataModel {
        return { ...this.presentation.EncodeToJSON(), ...{ proof : this.proof.EncodeToJSON()}};
    }

    public GetVerifiedTypes() : string[] {
        const credentials = this.presentation.GetVerifiableCredentials();
        const types : string[]= [];
        for(let i=0; i < credentials.length; i++) {
            types.push(credentials[i].GetCredential().GetType());
        }
        return types;
    }
}