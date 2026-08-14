import { PixelSpeechHeart, PixelSpeechSmile, PixelSearch } from './PixelIcons';

const ICONS = {
  heart: PixelSpeechHeart,
  smile: PixelSpeechSmile,
  search: PixelSearch,
} as const;

export function PublicPageHeader({
  title,
  subtitle,
  kicker,
  icon = 'heart',
  size = 'display',
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  icon?: keyof typeof ICONS;
  size?: 'display' | 'page';
}) {
  const Icon = ICONS[icon];
  const isPage = size === 'page';

  return (
    <div className={`text-center animate-fade-in ${isPage ? 'mb-6 sm:mb-8' : 'mb-8 sm:mb-12'}`}>
      <div className={`flex justify-center ${isPage ? 'mb-3' : 'mb-5'}`}>
        <Icon
          className={
            isPage
              ? 'w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.35)]'
              : 'w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.35)]'
          }
        />
      </div>
      {kicker ? (
        <p className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
          {kicker}
        </p>
      ) : null}
      <h1
        className={
          isPage
            ? 'font-display italic uppercase text-2xl sm:text-4xl text-white tracking-tight px-1 leading-[1.05] break-words'
            : 'font-display italic uppercase text-3xl sm:text-5xl md:text-6xl text-white tracking-tight px-1 leading-[0.95] break-words'
        }
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={
            isPage
              ? 'mt-2 sm:mt-3 text-sm sm:text-base text-white/70 max-w-xl mx-auto px-1'
              : 'mt-4 text-base sm:text-lg text-white/85 max-w-2xl mx-auto px-1'
          }
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
