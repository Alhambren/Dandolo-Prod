import { useState, useEffect } from "react";
import { GlassCard } from "./GlassCard";

export function EpochCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextSunday = new Date();
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(0, 0, 0, 0);
      
      const difference = nextSunday.getTime() - now.getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <GlassCard className="mb-8">
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-white mb-4">Next Epoch Starts In</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(timeLeft).map(([unit, value]) => (
            <div key={unit} className="text-center">
              <div className="text-2xl font-bold text-purple-400">{value}</div>
              <div className="text-sm text-gray-400 capitalize">{unit}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Rewards are distributed every Sunday at midnight UTC
        </p>
      </div>
    </GlassCard>
  );
}
