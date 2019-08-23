import { expect } from 'chai';
import 'mocha';
import { Credential } from '../src/VC/Credential';
import { VerifiableCredential } from '../src/VC/VerifiableCredential';
import { SchemaManager } from './../src/VC/SchemaManager';
import { Schema } from '../src/VC/Schema';
import { DID, DIDDocument } from '../src';
import { CreateRandomDID } from '../src/Helpers/CreateRandomDID';
import { BuildRSAProof } from '../src/VC/RSAProof';
import { DIDPublisher } from '../src/IOTA/DIDPublisher';
import { GenerateSeed } from '../src/Helpers/GenerateSeed';
import { Presentation } from '../src/VC/Presentation';
import { VerifiablePresentation } from '../src/VC/VerifiablePresentation';
import { VerificationErrorCodes } from '../src/VC/VerifiableObject';
import { Proof } from '../src/VC/Proof';

const provider : string = "https://nodes.devnet.iota.org:443";

let RandomDID : DID = new DID("did:iota:main:ABCABCABC");
let IssuerDIDDocument : DIDDocument;
let issuerSeed : string;
let issuerRoot : string;
let SubjectDIDDocument : DIDDocument;
let TestCredential : VerifiableCredential;

describe('Schemas', function() {
    let schema : Schema;
    let testObject : {};
    
    let SchemaList : string[] = ['DIDAuthenticationCredential', 'DomainValidatedCertificate', 'EclassCredential'];
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
    let credential : Credential;

    before(async function() {
        this.timeout(20000);
        IssuerDIDDocument = await CreateRandomDID("keys-1");
        issuerSeed = GenerateSeed();
        let publisher : DIDPublisher = new DIDPublisher(provider, issuerSeed);
        issuerRoot = await publisher.PublishDIDDocument(IssuerDIDDocument, "DIDTEST", 9);
        SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate").AddTrustedDID(IssuerDIDDocument.GetDID());
        SubjectDIDDocument = await CreateRandomDID("keys-1");
    });

    it('Should create a Credential, which cannot be verified yet', function() {
        let domainCertificate = {
            id : SubjectDIDDocument.GetDID().GetDID(),
            domains : [
                "blog.iota.org",
                "coordicide.iota.org",
                "docs.iota.org"
            ]
        };
        credential = Credential.Create(SchemaManager.GetInstance().GetSchema("DomainValidatedCertificate"), IssuerDIDDocument.GetDID(), domainCertificate);
    });

    it('Should be able to add a RSA proof and verify the Verifiable Credential', function() {
        let credProof : Proof = BuildRSAProof(IssuerDIDDocument, "keys-1", "123");
        credProof.Sign(credential.EncodeToJSON());
        TestCredential = VerifiableCredential.Create(credential, credProof);
        expect(TestCredential.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });

    it('Should be able to verify a Verifiable Presentation', function() {
        let presentation : Presentation = new Presentation([TestCredential]);
        let credProof : Proof = BuildRSAProof(SubjectDIDDocument, "keys-1", "456");
        credProof.Sign(presentation.EncodeToJSON());
        let verifiablePresentation : VerifiablePresentation = new VerifiablePresentation(presentation, credProof);
        expect(verifiablePresentation.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });

    it('Should be able to recognize wrong signatures on Verifiable Presentations', function() {

    });



    /*it('Should be able to export and import to still verify', async function() {
        this.timeout(20000);
        let ExportJSON : any = TestCredential.GetJSONDIDDocument();
        let ImportCredential : VerifiableCredential = VerifiableCredential.ImportVerifiableCredential(ExportJSON);
        let Proof : RSAProof = new RSAProof(ImportCredential, await DIDDocument.readDIDDocument(provider, issuerRoot), "keys-1");
        ImportCredential.SetProof(Proof);
        expect(ImportCredential.Verify()).to.deep.equal(VerificationErrorCodes.SUCCES);
    });*/
   
});

describe("Challenges", function() {

});