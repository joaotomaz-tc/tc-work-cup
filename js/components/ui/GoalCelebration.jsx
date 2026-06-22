import { useEffect } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

const ANIM_SRC = `${import.meta.env.BASE_URL}animations/Goal.json`;
const SOUND_SRC = `${import.meta.env.BASE_URL}sound/goal.mp3`;
const SOUND_DURATION_MS = 6000;
const DISMISS_MS = 6000;

export function GoalCelebration({ onDone }) {
  useEffect(() => {
    // Play sound — silently ignore if the browser blocks autoplay
    const audio = new Audio(SOUND_SRC);
    audio.volume = 0.7;
    audio.play().catch(() => {});

    const stopSound = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, SOUND_DURATION_MS);
    const dismiss = setTimeout(onDone, DISMISS_MS);

    return () => {
      clearTimeout(stopSound);
      clearTimeout(dismiss);
      audio.pause();
    };
  }, []);

  return (
    <div
      className="wc-goal-overlay"
      role="dialog"
      aria-label="Goal celebration"
      onClick={onDone}
    >
      <div className="wc-goal-anim">
        <Player
          src={ANIM_SRC}
          autoplay
          loop={false}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
