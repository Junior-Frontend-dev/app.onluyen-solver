// database.js - Database module using lowdb
const { join } = require('path');
const { app } = require('electron');

let db;

async function initializeDatabase() {
    try {
        // Dynamically import lowdb and JSONFile
        const { Low } = await import('lowdb');
        const { JSONFile } = await import('lowdb/node');

        const file = join(app.getPath('userData'), 'db.json');
        const adapter = new JSONFile(file);
        db = new Low(adapter, { knowledge: [] });

        // Read data from JSON file, this will create the file if it doesn't exist
        await db.read();

        // Set default data if db.data is null (empty file)
        db.data = db.data || { knowledge: [] };

        await db.write();
        console.log('Database initialized at:', file);
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

async function saveKnowledge(question, answer) {
    try {
        if (!db) {
            console.error('Database not initialized.');
            return null;
        }
        
        const newKnowledge = {
            id: Date.now().toString(), // Simple unique ID
            question,
            answer,
            timestamp: new Date().toISOString()
        };
        
        db.data.knowledge.push(newKnowledge);
        await db.write();
        console.log('Knowledge saved:', newKnowledge);
        return newKnowledge;
    } catch (error) {
        console.error('Error saving knowledge:', error);
        throw error;
    }
}

async function getKnowledge() {
    try {
        if (!db) {
            console.error('Database not initialized.');
            return [];
        }
        return db.data.knowledge;
    } catch (error) {
        console.error('Error getting knowledge:', error);
        return [];
    }
}

async function searchKnowledge(query) {
    try {
        if (!db) {
            console.error('Database not initialized.');
            return [];
        }
        
        const lowerCaseQuery = query.toLowerCase();
        return db.data.knowledge.filter(item =>
            item.question.toLowerCase().includes(lowerCaseQuery) ||
            item.answer.toLowerCase().includes(lowerCaseQuery)
        );
    } catch (error) {
        console.error('Error searching knowledge:', error);
        return [];
    }
}

module.exports = { 
    initializeDatabase, 
    saveKnowledge, 
    getKnowledge, 
    searchKnowledge 
};