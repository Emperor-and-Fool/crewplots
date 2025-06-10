import { ObjectId } from 'mongodb';
import { mongoConnection } from '../db-mongo';
import crypto from 'crypto';
import { Readable } from 'stream';

export interface DocumentMetadata {
  _id?: ObjectId;
  filename: string;
  contentType: string;
  size: number;
  uploadDate: Date;
  userId: number;
  documentType: 'id_card' | 'passport' | 'resume' | 'reference' | 'contract' | 'other';
  encryptionKey: string;
  checksumSHA256: string;
  isEncrypted: boolean;
  tags?: string[];
}

export interface DocumentReference {
  documentId: string;
  filename: string;
  contentType: string;
  size: number;
  documentType: string;
  uploadDate: Date;
}

export class DocumentService {
  
  async storeDocument(
    fileBuffer: Buffer, 
    metadata: Omit<DocumentMetadata, '_id' | 'uploadDate' | 'encryptionKey' | 'checksumSHA256' | 'isEncrypted'>
  ): Promise<DocumentReference> {
    const db = mongoConnection.getDatabase();
    const gridFS = mongoConnection.getGridFS();
    
    // Generate encryption key and encrypt content
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    const encryptedBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    
    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Create document metadata
    const documentMetadata: DocumentMetadata = {
      ...metadata,
      uploadDate: new Date(),
      encryptionKey,
      checksumSHA256: checksum,
      isEncrypted: true
    };
    
    // Store file in GridFS
    const uploadStream = gridFS.openUploadStream(metadata.filename, {
      metadata: documentMetadata
    });
    
    const readableStream = new Readable();
    readableStream.push(encryptedBuffer);
    readableStream.push(null);
    
    return new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on('finish', () => {
          resolve({
            documentId: uploadStream.id.toString(),
            filename: metadata.filename,
            contentType: metadata.contentType,
            size: metadata.size,
            documentType: metadata.documentType,
            uploadDate: documentMetadata.uploadDate
          });
        })
        .on('error', reject);
    });
  }
  
  async getDocument(documentId: string): Promise<{ buffer: Buffer; metadata: DocumentMetadata } | null> {
    const gridFS = mongoConnection.getGridFS();
    
    try {
      const objectId = new ObjectId(documentId);
      
      // Get file metadata
      const fileInfo = await gridFS.find({ _id: objectId }).toArray();
      if (fileInfo.length === 0) return null;
      
      const metadata = fileInfo[0].metadata as DocumentMetadata;
      
      // Download encrypted file
      const downloadStream = gridFS.openDownloadStream(objectId);
      const chunks: Buffer[] = [];
      
      return new Promise((resolve, reject) => {
        downloadStream
          .on('data', (chunk) => chunks.push(chunk))
          .on('end', () => {
            const encryptedBuffer = Buffer.concat(chunks);
            
            // Decrypt content
            const decipher = crypto.createDecipher('aes-256-cbc', metadata.encryptionKey);
            const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
            
            // Verify checksum
            const checksum = crypto.createHash('sha256').update(decryptedBuffer).digest('hex');
            if (checksum !== metadata.checksumSHA256) {
              reject(new Error('Document integrity check failed'));
              return;
            }
            
            resolve({ buffer: decryptedBuffer, metadata });
          })
          .on('error', reject);
      });
    } catch (error) {
      console.error('Error retrieving document:', error);
      return null;
    }
  }
  
  async getDocumentMetadata(documentId: string): Promise<DocumentMetadata | null> {
    const gridFS = mongoConnection.getGridFS();
    
    try {
      const objectId = new ObjectId(documentId);
      const fileInfo = await gridFS.find({ _id: objectId }).toArray();
      
      if (fileInfo.length === 0) return null;
      return fileInfo[0].metadata as DocumentMetadata;
    } catch (error) {
      console.error('Error retrieving document metadata:', error);
      return null;
    }
  }
  
  async deleteDocument(documentId: string): Promise<boolean> {
    const gridFS = mongoConnection.getGridFS();
    
    try {
      const objectId = new ObjectId(documentId);
      await gridFS.delete(objectId);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }
  
  async getUserDocuments(userId: number, documentType?: string): Promise<DocumentReference[]> {
    const gridFS = mongoConnection.getGridFS();
    
    const query: any = { 'metadata.userId': userId };
    if (documentType) {
      query['metadata.documentType'] = documentType;
    }
    
    const files = await gridFS.find(query).toArray();
    
    return files.map(file => ({
      documentId: file._id.toString(),
      filename: file.filename,
      contentType: file.metadata.contentType,
      size: file.length,
      documentType: file.metadata.documentType,
      uploadDate: file.metadata.uploadDate
    }));
  }
}

export const documentService = new DocumentService();