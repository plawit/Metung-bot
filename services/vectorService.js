const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class VectorService {
  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "text-embedding-004" // Gemini's embedding model
    });
    
    this.indexName = process.env.PINECONE_INDEX_NAME || 'finance-assistant';
    this.index = null;
  }

  async initialize() {
    try {
      // Check if index exists, create if not
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);
      
      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: 768, // Gemini text-embedding-004 dimension
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // Wait for index to be ready
        await this.waitForIndexReady();
      }
      
      this.index = this.pinecone.index(this.indexName);
      console.log(`Connected to Pinecone index: ${this.indexName}`);
      
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      throw error;
    }
  }

  async waitForIndexReady() {
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!isReady && attempts < maxAttempts) {
      try {
        const indexDescription = await this.pinecone.describeIndex(this.indexName);
        if (indexDescription.status?.ready) {
          isReady = true;
        } else {
          console.log('Waiting for index to be ready...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      } catch (error) {
        console.log('Index not ready yet, waiting...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      }
    }
    
    if (!isReady) {
      throw new Error('Index creation timeout');
    }
  }

  async createEmbedding(text) {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  async processDocuments() {
    const documentsPath = path.join(__dirname, '..', 'document');
    const files = fs.readdirSync(documentsPath).filter(file => file.endsWith('.txt'));
    
    console.log(`Processing ${files.length} documents...`);
    
    const vectors = [];
    
    for (const file of files) {
      const filePath = path.join(documentsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split content into chunks for better embedding
      const chunks = this.splitTextIntoChunks(content, 500);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.createEmbedding(chunk);
        
        vectors.push({
          id: `${file}_chunk_${i}`,
          values: embedding,
          metadata: {
            filename: file,
            chunk_index: i,
            content: chunk,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    // Upsert vectors to Pinecone
    if (vectors.length > 0) {
      await this.index.upsert(vectors);
      console.log(`Successfully uploaded ${vectors.length} vectors to Pinecone`);
    }
    
    return vectors.length;
  }

  splitTextIntoChunks(text, maxChunkSize = 500) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence + '.';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  async searchSimilarContent(query, topK = 3) {
    try {
      const queryEmbedding = await this.createEmbedding(query);
      
      const searchResults = await this.index.query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true
      });
      
      return searchResults.matches?.map(match => ({
        content: match.metadata?.content || '',
        score: match.score,
        filename: match.metadata?.filename || '',
        chunk_index: match.metadata?.chunk_index || 0
      })) || [];
      
    } catch (error) {
      console.error('Error searching similar content:', error);
      return [];
    }
  }

  async updateDocuments() {
    console.log('Updating document vectors...');
    
    // Delete existing vectors (optional - you might want to be more selective)
    // await this.index.deleteAll();
    
    // Process and upload new documents
    return await this.processDocuments();
  }

  async getIndexStats() {
    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Error getting index stats:', error);
      return null;
    }
  }
}

module.exports = VectorService;