import { expect } from 'chai';
import 'mocha';
import { Credential } from '../src/VC/Credential';
import { VerifiableCredential } from '../src/VC/VerifiableCredential';
import { SchemaManager } from './../src/VC/SchemaManager';
import { Schema } from '../src/VC/Schema';
import { DID, DIDDocument, SignDIDAuthentication, VerifyDIDAuthentication, BuildRSAProof } from '../src';
import { CreateRandomDID } from '../src/Helpers/CreateRandomDID';
import { DIDPublisher } from '../src/IOTA/DIDPublisher';
import { GenerateSeed } from '../src/Helpers/GenerateSeed';
import { Presentation } from '../src/VC/Presentation';
import { VerifiablePresentation } from '../src/VC/VerifiablePresentation';
import { Proof, ProofBuildingMethod, ProofParameters } from '../src/VC/Proof/Proof';
import { ProofTypeManager } from '../src/VC/Proof/ProofTypeManager';
import { DecodeProofDocument } from '../src/Helpers/DecodeProofDocument';
import { GenerateRSAKeypair } from '../src/Helpers/GenerateKeypair';
import { RSAKeypair } from '../src/Encryption/RSAKeypair';

const provider : string = "https://nodes.devnet.iota.org:443";

let RandomDID : DID = new DID("did:iota:main:ABCABCABC");

describe('Schemas', function() {
    let schema : Schema;
    let testObject : {};
    
    let SchemaList : string[] = ['DIDAuthenticationCredential', 'DomainValidatedCertificate', 'WhiteListedCredential'];
    it('Should contain a list of default schemas', function() {
        expect(SchemaManager.GetInstance().GetSchemaNames()).to.deep.equal(SchemaList);
    });
    
    it('Should be able to add an extra schema', function() {
        SchemaList.push("IOTATrainingCertificate");
        SchemaManager.GetInstance().AddSchema("IOTATrainingCertificate", {
            type : "object",
            required : ["trainingTitle", "participant", "participationDate"],
            properties : {
                "trainingTitle" : { 
                    type : "string"
                },
                "participant" : { 
                    type : "string"
                },
                "participationDate" : { 
                    type : "string"
                }
            }
        });
        expect(SchemaManager.GetInstance().GetSchemaNames()).to.deep.equal(SchemaList);
    });

    it('Should validate correctly', function() {
        schema = SchemaManager.GetInstance().GetSchema("IOTATrainingCertificate");
        testObject = {
            "trainingTitle" : "IOTA Developer Training",
            "participant" : "Jelly von Yellowburg",
            "participationDate" : new Date().toUTCString()
        };
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.true;
    });

    it('Should validate with extra fields', function() {
        let testObject2 : {} = { ...testObject, ...{"ExtraField" : "Hello World"}};
        expect(schema.DoesObjectFollowSchema(testObject2)).to.be.true;
    });

    it('Should fail with a missing field', function() {
        testObject = {
            "trainingTitle" : "IOTA Developer Training",
            "participant" : "Jelly von Yellowburg"
        };
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.false;
    });

    it('Should fail with a wrong type', function() {
        testObject = {
            "trainingTitle" : "IOTA Developer Training",
            "participant" : "Jelly von Yellowburg",
            "participationDate" : 12
        };
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.false;
    });

    it('Should correctly verify DIDAuthenticationCredential', function() {
        schema = SchemaManager.GetInstance().GetSchema("DIDAuthenticationCredential");
        testObject = {
            "DID" : "did:iota:main:123123"
        }
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.true;
    });

    it('Should correctly verify DomainValidatedCertificate', function() {
        schema = SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate");
        testObject = {
            "id" : "did:iota:main:123123",
            "domains" : ["*.iota.org", "*.reddit.com"]
        }
        expect(schema.DoesObjectFollowSchema(testObject)).to.be.true;
    });

    it('Should not trust a random DID', function() {
        expect(schema.IsDIDTrusted(RandomDID)).to.be.false;
    });

    it('Should add and trust a DID', function() {
        schema.AddTrustedDID(RandomDID);
        expect(schema.IsDIDTrusted(RandomDID)).to.be.true;
    })
});

describe('Verifiable Credentials', async function() {    
    let IssuerDIDDocument : DIDDocument;
    let issuerSeed : string;
    let issuerPrivateKey : string;
    let SubjectDIDDocument : DIDDocument;
    let subjectSeed : string;

    let credential : Credential;
    let verifiableCredential : VerifiableCredential;
    let proofMethod : ProofBuildingMethod;
    let VCProof : Proof;
    let presentation : Presentation;
    let verifiablePresentation : VerifiablePresentation;
    let presentationProof : Proof;

    before(async function() {
        this.timeout(30000);
        issuerSeed = GenerateSeed();
        IssuerDIDDocument = CreateRandomDID(issuerSeed);
        let keypair : RSAKeypair = await GenerateRSAKeypair();
        issuerPrivateKey = keypair.GetPrivateKey();
        IssuerDIDDocument.AddKeypair(keypair, "keys-1");
        let publisher : DIDPublisher = new DIDPublisher(provider, issuerSeed);
        await publisher.PublishDIDDocument(IssuerDIDDocument, "DIDTEST", 9);
        SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate").AddTrustedDID(IssuerDIDDocument.GetDID());
        subjectSeed = GenerateSeed();
        SubjectDIDDocument = CreateRandomDID(subjectSeed);
        let keypair2 : RSAKeypair = await GenerateRSAKeypair();
        SubjectDIDDocument.AddKeypair(keypair2, "keys-1");
        let publisher2 : DIDPublisher = new DIDPublisher(provider, subjectSeed);
        await publisher2.PublishDIDDocument(SubjectDIDDocument, "DIDTEST", 9);
        proofMethod = ProofTypeManager.GetInstance().GetProofBuilder("RsaSignature2018");
    });

    it('Should be able to a credential', function() {
        let domainCertificate = {
            id : SubjectDIDDocument.GetDID().GetDID(),
            domains : [
                "blog.iota.org",
                "coordicide.iota.org",
                "docs.iota.org"
            ]
        };
        credential = Credential.Create(SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate"), IssuerDIDDocument.GetDID(), domainCertificate, GenerateSeed());
        expect(credential.GetCredential()).to.not.be.undefined;
    });

    it('Should be able to Encode / Decode a credential to be the same', function() {
        let importedCredential : Credential = Credential.DecodeFromJSON(credential.EncodeToJSON());
        expect(importedCredential.EncodeToJSON()).to.deep.equal(credential.EncodeToJSON());
    });

    it('Should be able to create, sign and verify a Verifiable Credential' , async function() {
        VCProof = proofMethod({'issuer' : IssuerDIDDocument, 'issuerKeyId' : "keys-1"});
        VCProof.Sign(credential.EncodeToJSON());
        verifiableCredential = VerifiableCredential.Create(credential, VCProof);
        await verifiableCredential.Verify(provider);
    });

    it('Should be able to Encode / Decode a Verifiable Credential and still verify', async function() {
        this.timeout(30000);
        await delay(2000);
        let proofParameters : ProofParameters = await DecodeProofDocument(verifiableCredential.EncodeToJSON().proof, provider);
        let importedVerifiableCredential : VerifiableCredential = VerifiableCredential.DecodeFromJSON(verifiableCredential.EncodeToJSON(), proofParameters);
        await importedVerifiableCredential.Verify(provider);
        expect(importedVerifiableCredential.EncodeToJSON()).to.deep.equal(verifiableCredential.EncodeToJSON());
    });

    it('Should be able to retract a Verifiable Credential' , async function() {
        this.timeout(30000);
        await VCProof.Revoke(credential, provider);
        await delay(10000);
        try {
            await verifiableCredential.Verify(provider);
            console.log("Task completed incorrectly");
        } catch(err) {
            console.log("Task failed succesfully");
        }
    });

    it('Should test all Verification Error codes for Verifiable Credentials', function() {
        
    });

    it('Should be able to create a presentation from a Verifiable Credential', function() {
        presentation = Presentation.Create([verifiableCredential]);
        expect(presentation.EncodeToJSON().verifiableCredential[0]).to.deep.equal(verifiableCredential.EncodeToJSON());
    });

    it('Should be able to Encode / Decode a presentation to be the same', async function() {
        let importPresentation : Presentation = await Presentation.DecodeFromJSON(presentation.EncodeToJSON(), provider);
        expect(importPresentation.EncodeToJSON()).to.deep.equal(presentation.EncodeToJSON());
    });

    it('Should be able to create, sign and verify the Verifiable Presentation', async function() {
        presentationProof = proofMethod({'issuer' : SubjectDIDDocument, 'issuerKeyId' : "keys-1", challengeNonce : "123"});
        presentationProof.Sign(presentation.EncodeToJSON());
        verifiablePresentation = VerifiablePresentation.Create(presentation, presentationProof);
        await verifiablePresentation.Verify(provider);
    });

    //verifiablePresentation Shouldn't this be enough to integrate into VerifiableObject and do DecodeProofDocument?
    it('Should be able to Encode / Decode a Verifiable Presentation and still verify', async function() {
        let proofParameters : ProofParameters = await DecodeProofDocument(verifiablePresentation.EncodeToJSON().proof, provider);
        let importVerifiablePresentation : VerifiablePresentation = await VerifiablePresentation.DecodeFromJSON(verifiablePresentation.EncodeToJSON(), provider, proofParameters);
        await importVerifiablePresentation.Verify(provider);
        expect(importVerifiablePresentation.EncodeToJSON()).to.deep.equal(verifiablePresentation.EncodeToJSON());
    });


    let DIDAuth : VerifiablePresentation;
    it('Should create a DID Authentication Verifiable Presentation', async function() {
        const DIDAuthVC = SignDIDAuthentication(SubjectDIDDocument, "keys-1", GenerateSeed(12));
        const presentation = Presentation.Create([DIDAuthVC]);
        const presentationProof = BuildRSAProof({issuer:SubjectDIDDocument, issuerKeyId:"keys-1", challengeNonce:GenerateSeed(12)});
        presentationProof.Sign(presentation.EncodeToJSON());
        DIDAuth = VerifiablePresentation.Create(presentation, presentationProof);
        SchemaManager.GetInstance().GetSchema("DIDAuthenticationCredential").AddTrustedDID(SubjectDIDDocument.GetDID());
        await DIDAuth.Verify(provider);
        SchemaManager.GetInstance().GetSchema("DIDAuthenticationCredential").RemoveTrustedDID(SubjectDIDDocument.GetDID());
        expect(DIDAuth.GetVerifiedTypes()).to.deep.equal(["DIDAuthenticationCredential"]);
    });

    it('Should be able to verify an imported DID Authentication', async function() {
        await VerifyDIDAuthentication(DIDAuth.EncodeToJSON(), provider);
    });
});


function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}