import * as fs from 'react-native-fs';
import { Schema } from './Schema';
import { DID } from '../DID/DID';

//TODO: Add DID's to trust
export class SchemaManager {
    private static instance : SchemaManager;
    private schemas : Schema[];

    private constructor() {
        this.schemas = [];

        //Load all default Schemas
        let folderPath : string = __dirname +"/Schemas";
        fs.readdir(folderPath)
        .then(filePaths => {
            for(let i=0; i < filePaths.length; i++) {
                let fileName : string = filePaths[i].substr(0, filePaths[i].lastIndexOf('.'));
                this.AddSchemaFromFile(fileName, folderPath+"/"+filePaths[i]);
            }
        })
        .catch((err) => {
            console.log(err.message, err.code);
        });

        // fs.readdir(folderPath, (err, filePaths) => {
        //     if (err) throw err;
        //     for(let i=0; i < filePaths.length; i++) {
        //         let fileName : string = filePaths[i].substr(0, filePaths[i].lastIndexOf('.'));
        //         this.AddSchemaFromFile(fileName, folderPath+"/"+filePaths[i]);
        //     }
        // })
    }

    public AddSchemaFromFile(name : string, path : string, trustedDIDs ?: DID[]) {
        fs.readFile(path)
        .then(async fileData => {
            await this.schemas.push( new Schema(name, JSON.parse(fileData.toString()), trustedDIDs) );
        })
        .catch((err) => {
            console.log(err.message, err.code);
        });

        // fs.readFile(path, async (err, fileData) => {
        //     if (err) throw err;
        //     await this.schemas.push( new Schema(name, JSON.parse(fileData.toString('utf-8')), trustedDIDs) );
        // })
    }

    public AddSchema(name : string, layout : {}, trustedDIDs ?: DID[]) {
        this.schemas.push( new Schema(name, layout, trustedDIDs) );
    }

    public GetSchema(name : string) : Schema {
        for(let i=0; i < this.schemas.length; i++) {
            if (this.schemas[i].GetName() == name ) {
                return this.schemas[i];
            }
        }
        return undefined;
    }

    public GetSchemaNames() : string[] {
        let schemaNames : string[] = [];
        if (!this.schemas.length) {
            let folderPath : string = __dirname +"/Schemas";
            fs.readdir(folderPath)
            .then(filePaths => {
                for(let i=0; i < filePaths.length; i++) {
                    let fileName : string = filePaths[i].substr(0, filePaths[i].lastIndexOf('.'));
                    this.AddSchemaFromFile(fileName, folderPath+"/"+filePaths[i]);
                    schemaNames.push(fileName);
                }
                return schemaNames;
            })
            .catch((err) => {
                console.log(err.message, err.code);
            });


            // fs.readdir(folderPath, async (err, filePaths) => {
            //     if (err) throw err;
            //     for(let i=0; i < filePaths.length; i++) {
            //         let fileName : string = filePaths[i].substr(0, filePaths[i].lastIndexOf('.'));
            //         await this.AddSchemaFromFile(fileName, folderPath+"/"+filePaths[i]);
            //         schemaNames.push(fileName);
            //     }
            //     return schemaNames;
            // })
        } else {
            for(let i=0; i < this.schemas.length; i++) {
                schemaNames.push(this.schemas[i].GetName());
            }
            return schemaNames;
        }
    }

    static GetInstance() : SchemaManager {
        if(!SchemaManager.instance) {
            SchemaManager.instance = new SchemaManager();
        }
        return SchemaManager.instance;
    }
}