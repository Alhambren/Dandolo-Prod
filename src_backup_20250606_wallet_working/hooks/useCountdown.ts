import { useState, useEffect } from 'react';

export const useCountdown = (targetUtc: string) => {
  const [delta, setDelta] = useState<number>(() =>
    new Date(targetUtc).getTime() - Date.now()
  );

  useEffect(() => {
    const id = setInterval(() => setDelta(new Date(targetUtc).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetUtc]);

  return {
    days: Math.max(0, Math.floor(delta / 864e5)),
    hours: Math.max(0, Math.floor((delta % 864e5) / 36e5)),
    minutes: Math.max(0, Math.floor((delta % 36e5) / 6e4)),
    seconds: Math.max(0, Math.floor((delta % 6e4) / 1000)),
  };
}; 