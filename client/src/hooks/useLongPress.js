/**
 * A standard Javascript helper factory. No React Hooks used!
 * Safely works inside array maps or loops.
 */
export const createLongPressHandlers = (
  onLongPress,
  onClick,
  { delay = 500 } = {},
) => {
  let timerId = null;
  let isLongPressActive = false;

  const start = (event) => {
    isLongPressActive = false;

    // Clear any leftover timer
    if (timerId) clearTimeout(timerId);

    timerId = setTimeout(() => {
      onLongPress(event);
      isLongPressActive = true;
    }, delay);
  };

  const stop = (event) => {
    if (timerId) clearTimeout(timerId);

    // If the timer didn't finish, it's a short click/tap!
    if (!isLongPressActive && onClick) {
      onClick(event);
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: () => timerId && clearTimeout(timerId),
    onTouchStart: start,
    onTouchEnd: stop,
  };
};
