import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'AcesAssessmentDB';
const STORE_NAME = 'answers';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'assessment_id' });
      }
    },
  });
}

export async function saveAnswers(assessmentId: string, answers: any[]) {
  const db = await getDB();
  await db.put(STORE_NAME, {
    assessment_id: assessmentId,
    answers,
    updated_at: new Date().toISOString(),
  });
}

export async function getAnswers(assessmentId: string) {
  const db = await getDB();
  return db.get(STORE_NAME, assessmentId);
}

export async function clearAnswers(assessmentId: string) {
  const db = await getDB();
  await db.delete(STORE_NAME, assessmentId);
}
