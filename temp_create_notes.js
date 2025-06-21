// Temporary script to create proper motivational notes in MongoDB
import { storage } from './server/storage.js';
import { messageStorageService } from './server/services/message-storage-service.js';

async function createMotivationalNotes() {
  try {
    console.log('Creating motivational notes for Finn Visser (id: 5)...');
    
    const finnNote = await messageStorageService.createNoteRef({
      content: 'Ik ben heel gemotiveerd om in de horeca te werken en nieuwe vaardigheden te leren. Ik hou van contact met mensen en werk graag in een team.',
      userId: 5,
      workflow: 'application',
      noteType: 'motivation',
      messageType: 'rich-text',
      priority: 'normal',
      isPrivate: false
    });
    
    console.log('Created note for Finn:', finnNote.id);
    
    console.log('Creating motivational notes for Lisa Bakker (id: 8)...');
    
    const lisaNote = await messageStorageService.createNoteRef({
      content: 'Ik ben een enthousiaste student die graag ervaring wil opdoen in de hospitality sector. Ik ben flexibel, betrouwbaar en werk hard om mijn doelen te bereiken.',
      userId: 8,
      workflow: 'application',
      noteType: 'motivation', 
      messageType: 'rich-text',
      priority: 'normal',
      isPrivate: false
    });
    
    console.log('Created note for Lisa:', lisaNote.id);
    
    console.log('Successfully created motivational notes in MongoDB with proper metadata');
    
  } catch (error) {
    console.error('Error creating notes:', error);
  }
  
  process.exit(0);
}

createMotivationalNotes();