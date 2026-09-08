import Dexie, { type EntityTable } from "dexie";
import type { AttendanceStatus } from "@iskool/shared";

/**
 * Offline-first attendance queue. Teachers mark attendance into IndexedDB; a
 * background sync flushes it to the API when connectivity returns. Each entry
 * carries a client-generated id so a retried flush is idempotent server-side
 * (see AttendanceRecord.clientRecordId in the Prisma schema).
 */
export interface QueuedAttendanceMark {
  clientRecordId: string;
  tenantId: string;
  classSectionId: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  markedAt: string;
  syncState: "pending" | "syncing" | "synced" | "error";
  lastError?: string;
}

const db = new Dexie("school-offline") as Dexie & {
  attendanceQueue: EntityTable<QueuedAttendanceMark, "clientRecordId">;
};

db.version(1).stores({
  attendanceQueue: "clientRecordId, [tenantId+classSectionId+date], syncState",
});

export function queueAttendanceMark(
  mark: Omit<QueuedAttendanceMark, "clientRecordId" | "markedAt" | "syncState">,
) {
  return db.attendanceQueue.put({
    ...mark,
    clientRecordId: crypto.randomUUID(),
    markedAt: new Date().toISOString(),
    syncState: "pending",
  });
}

export function pendingMarks() {
  return db.attendanceQueue.where("syncState").anyOf("pending", "error").toArray();
}

export { db as offlineDb };
