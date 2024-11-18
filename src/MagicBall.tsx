import React, { useState, useEffect } from 'react';

declare global {
  interface DeviceMotionEventPermissionResult {
    state: PermissionState;
  }

  interface DeviceMotionEvent {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}

const Magic8Ball: React.FC = () => {
  const [answer, setAnswer] = useState<string>('Нажми пробел или кликни по шару!');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(!window.DeviceMotionEvent);

  const answers: readonly string[] = [
    'Однозначно да',
    'Определённо да',
    'Можешь быть уверен в этом',
    'Да',
    'Вероятнее всего',
    'Хорошие перспективы',
    'Спроси позже',
    'Пока не ясно',
    'Лучше не рассказывать',
    'Даже не думай',
    'Мой ответ — нет',
    'Определённо нет'
  ] as const;

  const getRandomAnswer = (): string => {
    return answers[Math.floor(Math.random() * answers.length)];
  };

  const triggerShake = (): void => {
    if (!isShaking) {
      setIsShaking(true);
      setAnswer(getRandomAnswer());

      setTimeout(() => {
        setIsShaking(false);
      }, 1000);
    }
  };

  // Обработчик для компьютера (пробел и клик)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent): void => {
      if (event.code === 'Space' && isDebugMode) {
        event.preventDefault();
        triggerShake();
      }
    };

    if (isDebugMode) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isDebugMode, isShaking]);

  // Обработчик для мобильных устройств
  useEffect(() => {
    let lastUpdate = 0;
    let lastX: number | undefined;
    let lastY: number | undefined;
    let lastZ: number | undefined;
    const shakingThreshold = 15;
    let cleanup: (() => void) | undefined;

    const handleMotion = (event: DeviceMotionEvent): void => {
      const current = event.accelerationIncludingGravity;
      if (!current?.x || !current?.y || !current?.z) return;

      const currentTime = new Date().getTime();
      const diffTime = currentTime - lastUpdate;

      if (diffTime > 100) {
        if (lastX !== undefined && lastY !== undefined && lastZ !== undefined) {
          const deltaX = Math.abs(current.x - lastX);
          const deltaY = Math.abs(current.y - lastY);
          const deltaZ = Math.abs(current.z - lastZ);

          if (deltaX + deltaY + deltaZ > shakingThreshold) {
            triggerShake();
          }
        }

        lastX = current.x;
        lastY = current.y;
        lastZ = current.z;
        lastUpdate = currentTime;
      }
    };

    const initMotionListener = async () => {
      const motionEvent = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      const requestPermissionFn = motionEvent?.requestPermission;

      if (requestPermissionFn && typeof requestPermissionFn === 'function') {
        // iOS 13+ requires permission
        const handleClick = async () => {
          try {
            const permissionState = await requestPermissionFn();
            if (permissionState === 'granted') {
              window.addEventListener('devicemotion', handleMotion);
              setIsDebugMode(false);
              cleanup = () => window.removeEventListener('devicemotion', handleMotion);
            }
          } catch (error) {
            setAnswer('Нужно разрешение на использование датчика движения');
            setIsDebugMode(true);
          }
        };

        window.addEventListener('click', handleClick, { once: true });
        cleanup = () => window.removeEventListener('click', handleClick);
      } else if (window.DeviceMotionEvent) {
        // Non-iOS devices with motion support
        window.addEventListener('devicemotion', handleMotion);
        setIsDebugMode(false);
        cleanup = () => window.removeEventListener('devicemotion', handleMotion);
      }
    };

    if (window.DeviceMotionEvent && !isDebugMode) {
      initMotionListener();
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isShaking]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-purple-900 p-4">
      <div
        className={`relative w-64 h-64 rounded-full bg-black flex items-center justify-center ${isShaking ? 'animate-shake' : ''
          } ${isDebugMode ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
        onClick={() => isDebugMode && triggerShake()}
      >
        <div className="w-32 h-32 rounded-full bg-purple-800 flex items-center justify-center">
          <div className="text-white text-center p-4 font-bold">
            {answer}
          </div>
        </div>
      </div>
      <p className="text-white mt-8 text-center">
        {isDebugMode
          ? 'Нажми пробел или кликни по шару для предсказания'
          : 'Задай вопрос и потряси телефон для получения ответа'}
      </p>
      <p className="text-white mt-2 text-center text-sm opacity-60">
        {isDebugMode && 'Режим тестирования активен'}
      </p>
    </div>
  );
};

export default Magic8Ball;
