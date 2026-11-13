export interface StampTime {
  completedAt: string;
}

export function withTimeout<T>(promise: Promise<T>, milliseconds: number, message = "요청 시간이 초과됐어요.") {
  return new Promise<T>((resolve, reject) => {
    const timerId = setTimeout(() => reject(new Error(message)), milliseconds);

    promise.then(
      (value) => {
        clearTimeout(timerId);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timerId);
        reject(error);
      },
    );
  });
}

// When the same member and day exist both on the device and on the server, the earlier stamp wins.
export function shouldUploadPending(pending: StampTime, shared: StampTime | undefined) {
  if (!shared) {
    return true;
  }

  return Date.parse(pending.completedAt) < Date.parse(shared.completedAt);
}
