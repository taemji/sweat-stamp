import type { MemberId } from "./member-profiles";

const legacyMemberIds = {
  saem: "sam",
  yum: "yoom",
} as const satisfies Record<string, MemberId>;

export function migrateSelectedMemberId(value: string | null) {
  if (!value) {
    return value;
  }

  return legacyMemberIds[value as keyof typeof legacyMemberIds] ?? value;
}

export function migrateMemberRecord<T>(record: Record<string, T>) {
  const migratedRecord = { ...record };

  for (const [legacyId, nextId] of Object.entries(legacyMemberIds)) {
    if (migratedRecord[legacyId] !== undefined && migratedRecord[nextId] === undefined) {
      migratedRecord[nextId] = migratedRecord[legacyId];
    }

    delete migratedRecord[legacyId];
  }

  return migratedRecord;
}

export function migrateCertificationRecord<T extends { memberId: string }>(record: Record<string, T>) {
  const migratedRecord: Record<string, T> = {};

  for (const [key, certification] of Object.entries(record)) {
    const memberId = key.slice(key.lastIndexOf(":") + 1);

    if (legacyMemberIds[memberId as keyof typeof legacyMemberIds] === undefined) {
      migratedRecord[key] = certification;
    }
  }

  for (const [key, certification] of Object.entries(record)) {
    const separatorIndex = key.lastIndexOf(":");
    const dateKey = separatorIndex >= 0 ? key.slice(0, separatorIndex) : key;
    const legacyId = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : "";
    const nextId = legacyMemberIds[legacyId as keyof typeof legacyMemberIds];

    if (!nextId) {
      continue;
    }

    const nextKey = `${dateKey}:${nextId}`;

    if (migratedRecord[nextKey] === undefined) {
      migratedRecord[nextKey] = {
        ...certification,
        memberId: nextId,
      };
    }
  }

  return migratedRecord;
}

export function getLegacyPhotoKeys(certificationKeys: string[]) {
  return certificationKeys.flatMap((key) => {
    if (key.endsWith(":sam")) {
      return [{ legacyKey: `${key.slice(0, -4)}:saem`, nextKey: key }];
    }

    if (key.endsWith(":yoom")) {
      return [{ legacyKey: `${key.slice(0, -5)}:yum`, nextKey: key }];
    }

    return [];
  });
}