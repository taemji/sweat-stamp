const databaseName = "sweat-stamp";
const databaseVersion = 1;
const photoStoreName = "certification-photos";

function openPhotoDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(photoStoreName)) {
        database.createObjectStore(photoStoreName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("사진 저장소를 열 수 없어요."));
  });
}

export async function saveCertificationPhoto(key: string, photo: File) {
  const database = await openPhotoDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(photoStoreName, "readwrite");
      transaction.objectStore(photoStoreName).put(photo, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("사진을 저장할 수 없어요."));
      transaction.onabort = () => reject(transaction.error ?? new Error("사진 저장이 취소됐어요."));
    });
  } finally {
    database.close();
  }
}

export async function getCertificationPhoto(key: string) {
  const database = await openPhotoDatabase();

  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const request = database.transaction(photoStoreName, "readonly").objectStore(photoStoreName).get(key);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error ?? new Error("사진을 불러올 수 없어요."));
    });
  } finally {
    database.close();
  }
}

export async function deleteCertificationPhoto(key: string) {
  const database = await openPhotoDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(photoStoreName, "readwrite");
      transaction.objectStore(photoStoreName).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("사진을 삭제할 수 없어요."));
      transaction.onabort = () => reject(transaction.error ?? new Error("사진 삭제가 취소됐어요."));
    });
  } finally {
    database.close();
  }
}