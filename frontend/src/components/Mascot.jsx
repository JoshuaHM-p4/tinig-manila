import clsx from 'clsx';

/**
 * Tinig mascot — the pixel-art bird with Philippine flag colors.
 * Variants:
 *  - 'idle' (default): standing pose, gently bobs
 *  - 'flying': wings open, used for celebrations / empty states
 *  - 'mark':  small inline mark (no animation)
 */
export default function Mascot({
  variant = 'idle',
  size = 96,
  className = '',
  animate = true,
  haloColor = 'sky',
}) {
  const src = variant === 'flying' ? '/mascot-flying.png' : '/mascot.png';
  const halo = haloColor === 'yellow'
    ? 'bg-flag-yellow/30'
    : haloColor === 'red'
    ? 'bg-flag-red/20'
    : 'bg-sky-300/40';

  return (
    <div
      className={clsx('relative inline-block select-none', className)}
      style={{ width: size, height: size }}
    >
      {animate && (
        <div
          className={clsx(
            'absolute inset-0 rounded-full blur-xl',
            halo,
            'animate-pulse-ring',
          )}
        />
      )}
      <img
        src={src}
        alt="Tinig mascot"
        draggable="false"
        className={clsx(
          'relative w-full h-full object-contain pixelated',
          animate && variant === 'idle' && 'animate-bobble',
          animate && variant === 'flying' && 'animate-wiggle',
        )}
      />
    </div>
  );
}
