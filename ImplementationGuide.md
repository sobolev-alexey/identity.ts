## Implementation Guide

To following steps can be taken to use Digital identity in your applications:
* Create a new Identity
* Creating a new Verifiable Credential (Issuer)
* Communication of Verifiable Credentials and Verifiable Presentations
* Creating a new Verifiable Presentation (Holder)
* Creating a trusted list
* Verifying Verifiable Presentations (Inspector)

### Create a new Identity

##### Generate seed and keypair
In order to create a new DID Document an IOTA Seed and atleast one assymetric encryption keypair is required (See Encryption Techniques). 
The seed and private key need to be stored somewhere secure, while the user is still able to access them.
The seed and keypair can either be generated by external code or using functions from this package:
```
let seed = GenerateSeed();
let keypair = await GenerateRSAKeypair();
```

##### Creating the DID Document
The DID Document is created using the seed. Assymetric keypair have to be attached to the document, only the public key is used.
The Unique Universal IDentifier (UUID) must be a unique identifier on the IOTA network that will resolve to the DID Document.
According to the DID Method from the IOTA Foundation (Will be released later), it is recommended to use the root of a MAM stream, which will contain the DID Document.
```
//The full creation of the DID 
let uuid = mamRoot;
let did = new DID(uuid); 
let document = DIDDocument.createDIDDocument(did);
 
//The simplified helper function
let document = CreateRandomDID(seed);
 
//Attach the keypair with an identifier keyId, which must be unique in the document (Short name recommended to reflect the purpose)
document.AddKeypair(keypair, keyId);
```

##### Publishing the DID Document to the Tangle
The DID Document should be uploaded to the Tangle when the DID represents a non-human Issuer. Any DID that represents a human should not be uploaded as this might violate GDPR. The state and root of the MAM stream should be stored, this allows later revisions of the DID Document to be attached to the same MAM stream.
```
let publisher = new DIDPublisher(provider, seed);

//Exporting - The root should be equal to UUID of the DID
let root = await publisher.PublishDIDDocument(document); 
let mamState = publisher.ExportMAMChannelState();
```
### Creating a new Verifiable Credential
The Issuer of these Credentials must have a DID which is uploaded to the Tangle and accessible through the selected node (Not snapshotted away).

##### Loading the relevant DID Documents
Initially, the Issuer and Subject DID Documents need to retrieved from the Tangle or from storage. The document on the Tangle does not contain the private keys so the used keypair needs to be loaded. 
```
//Retrieves the latest DID Document from the Tangle
let issuerDocument = await DIDDocument.readDIDDocument(provider, issuerMamRoot);

//Set the private key, this enables the keypair to sign. The privatekey should be loaded from the secured location.
let signatureKeypair = issuerDocument.GetKeypair(keyId).GetEncryptionKeypair();
signatureKeypair.SetPrivateKey(privateKey);

//Reconstructed from storage - TODO: For now loading from Tangle
let subjectDocument = await DIDDocument.readDIDDocument(provider, subjectMamRoot);
```
##### Building the Verifiable Credential
Verifiable Credentials should follow a Schematic (See Schematics of Credentials section).  After the schematic is chosen, the individual fields need to be set with the information regarding the subject. Lastly, the credential has to be signed.
```
//This loads a standard schema, 
let schema = SchemaManager.GetInstance().GetSchema(standardSchemaName);

//Fill in the schema
let schemaData = {}; //Make an object, conform to the schema, which contains the data about the subject.
let credential = Credential.Create(schema, issuerDocument.GetDID(), schemaData);

//Sign the schema
let proof = BuildRSAProof({issuer:issuerDocument, issuerKeyId:keyId});
proof.Sign(credential.EncodeToJSON()); //Signs the JSON document
let verifiableCredential = VerifiableCredential.Create(credential, proof);
```

### Communicating Verifiable Credentials and Verifiable Presentations
The exact way to communicate the information inside a Verifiable Credential or Presentation is outside the scope of this library. 
Often this is done through QR, NFC, Tangle etc... However to enable all these communication techniques every component can import and export towards JSON.
The exported JSON confirms to the W3C standards for DID, Verifiable Credentials and Verifiable Presentations. 
All objects that can be communicated have a function "EncodeToJSON" and an "DecodeFromJSON" static factory function.
```
let jsonCredential : VerifiableCredentialDataModel = verifiableCredential.EncodeToJSON();
//Insert communication code from Issuer -> Holder or Holder -> Inspector here
let receivedProof : ProofParameter = await DecodeProofDocument(jsonCredential.proof, provider);
let receivedCredential : VerifiableCredential = await VerifiableCredential.DecodeFromJSON(jsonCredential, receivedProof);
```

### Creating a new Verifiable Presentation
To share Verifiable Credentials as Holder with the Inspectors, the set of credentials need to be signed in order to prevent replay-attacks. 
The signature should include a challenge from the Inspector (A random value) or the challenge could be a timestamp which is young. (For Example, Industry Marketplace uses timestamp which must be younger then 1 minute). 
```
//Preparing the Credentials to send
let challenge : string = Date.now().toString();
let didAuthenticationCredential : VerifiableCredential = SignDIDAuthentication(subjectDocument, keyId, challenge);
let verifiableCredentials : VerifiableCredential[] = [didAuthenticationCredential, otherCredential];

//Create the Verifiable Presentation
let presentation : Presentation = Presentation.Create(verifiableCredentials);
let presentationProof : Proof = BuildRSAProof({issuer:subjectDocument, issuerKeyId:KeyId, challengeNone:challenge});
presentationProof.Sign(presentation.EncodeToJSON());
let verifiablePresentation : VerifiablePresentation = VerifiablePresentation.Create(presentation, presentationProof);
```

### Creating a trusted list
Every inspector needs to decide what DIDs they trust to sign specific types of Verifiable Credentials. The types of credentials are defined by the schematics they use. 
It is important that both parties who are communicating all understand and use the same schematics. When they do, inspectors can list which DIDs they trust to issue credentials for that specific schematic. For example, in the industry marketplace, a specific whitelist schematic was introduced, which one DID of the IOTA Foundation is accepted across all instances. This should be done during the initialisation of the application. 
```
let schematic = SchemaManager.GetInstance().GetSchema(SchematicName);
schematic.AddTrustedDID(issuerDID);
```

### Verifying Verifiable Presentation
A receiving party needs to verify the Verifiable Presentation. This simply checks for the integrity and if the issuers are trusted.
The content of the credentials should be verified according to the applications need. 

```
let result : VerificationErrorCodes = verifiablePresentation.Verify();
//To verify the result
if(result == VerificationErrorCodes.SUCCESS)
```

##### DID Authentication and Trusted Issuers
The verification process will return "untrusted issuer" if the issuers are not generally trusted. Trusted sources should be registered to the Schemas that you entrust them with. To handle DID Authentication the following is required to accept their authentication once:
```
let didAuthSchema = SchemaManager.GetInstance().GetSchema("DIDAuthenticationCredential");
didAuthSchema.AddTrustedDID(holderDID);
verifiablePresentation.Verify();
didAuthSchema.RemoveTrustedDID(holderDID);
```

##### Verify Specific parts of a credential (Like DIDAuthentication age)
To verify specific parts of the credential, you'll need custom code to handle that. For DID Authentication it might be useful to check if the challenge was indeed signed under a minute ago.
```
if(parseInt(verifiablePresentation.EncodeToJSON().proof.nonce) + 60000 > Date.now()) {
    //Young enough
}
```