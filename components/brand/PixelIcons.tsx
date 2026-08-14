import { cn } from '@/lib/utils';

type IconProps = {
  className?: string;
};

function PixelArt({
  className,
  map,
  colors,
}: IconProps & { map: string[]; colors: Record<string, string> }) {
  const width = map[0]?.length ?? 0;
  const height = map.length;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {map.flatMap((row, y) =>
        row.split('').flatMap((ch, x) => {
          const fill = colors[ch];
          if (!fill) return [];
          return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
        })
      )}
    </svg>
  );
}

const BUBBLE = [
  '..XXXXXXXXXXXXXX..',
  '.XWWWWWWWWWWWWWWX.',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  'XWWWWWWWWWWWWWWWWX',
  '.XWWWWWWWWWWWWWWX.',
  '..XXXXWWXXXXXXXX..',
  '......XWWX........',
  '.....XWWX.........',
  '....XWWX..........',
  '...XXX............',
];

export function PixelSpeechHeart({ className }: IconProps) {
  const map = BUBBLE.map((row) => row);
  const painted = [...map];
  const heart = [
    [5, 4],
    [6, 4],
    [8, 4],
    [9, 4],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 5],
    [8, 5],
    [9, 5],
    [10, 5],
    [4, 6],
    [5, 6],
    [6, 6],
    [7, 6],
    [8, 6],
    [9, 6],
    [10, 6],
    [5, 7],
    [6, 7],
    [7, 7],
    [8, 7],
    [9, 7],
    [6, 8],
    [7, 8],
    [8, 8],
    [7, 9],
  ];
  for (const [x, y] of heart) {
    const row = painted[y];
    painted[y] = row.slice(0, x) + 'K' + row.slice(x + 1);
  }
  return <PixelArt className={className} map={painted} colors={{ X: '#111', W: '#fff', K: '#111' }} />;
}

export function PixelSpeechSmile({ className }: IconProps) {
  const painted = [...BUBBLE];
  const face = [
    [6, 5],
    [7, 5],
    [10, 5],
    [11, 5],
    [6, 6],
    [7, 6],
    [10, 6],
    [11, 6],
    [6, 8],
    [12, 8],
    [7, 9],
    [8, 9],
    [9, 9],
    [10, 9],
    [11, 9],
  ];
  for (const [x, y] of face) {
    const row = painted[y];
    painted[y] = row.slice(0, x) + 'K' + row.slice(x + 1);
  }
  return <PixelArt className={className} map={painted} colors={{ X: '#111', W: '#fff', K: '#111' }} />;
}

export function PixelCursor({ className }: IconProps) {
  return (
    <PixelArt
      className={className}
      colors={{ X: '#111', W: '#fff' }}
      map={[
        '.XXX..........',
        '.XWWX.........',
        '.XWWWX........',
        '.XWWWWX.......',
        '.XWWWWWX......',
        '.XWWWWWWX.....',
        '.XWWWWWWWX....',
        '.XWWWWWWWWX...',
        '.XWWWWXXXXX...',
        '.XWWWX........',
        '.XWXWWX.......',
        '.XX.XWWX......',
        '....XWWX......',
        '.....XWWX.....',
        '.....XWWX.....',
        '......XX......',
      ]}
    />
  );
}

export function PixelGlobe({ className }: IconProps) {
  return (
    <PixelArt
      className={className}
      colors={{ X: 'currentColor' }}
      map={[
        '....XXXX....',
        '..XX.XX.XX..',
        '.X..XXXX..X.',
        '.X.XX..XX.X.',
        'XXXX....XXXX',
        'X..XXXXXX..X',
        'X..XXXXXX..X',
        'XXXX....XXXX',
        '.X.XX..XX.X.',
        '.X..XXXX..X.',
        '..XX.XX.XX..',
        '....XXXX....',
      ]}
    />
  );
}

export function PixelHeart({ className }: IconProps) {
  return (
    <PixelArt
      className={className}
      colors={{ X: 'currentColor' }}
      map={[
        '.XX..XX.',
        'XXXXXXXX',
        'XXXXXXXX',
        '.XXXXXX.',
        '..XXXX..',
        '...XX...',
      ]}
    />
  );
}

export function PixelSearch({ className }: IconProps) {
  return (
    <PixelArt
      className={className}
      colors={{ X: 'currentColor' }}
      map={[
        '..XXXX....',
        '.XX..XX...',
        'XX....XX..',
        'XX....XX..',
        '.XX..XX...',
        '..XXXX.XX.',
        '.......XX.',
        '........XX',
      ]}
    />
  );
}

export function PixelLightbulb({ className }: IconProps) {
  return (
    <PixelArt
      className={className}
      colors={{ X: 'currentColor' }}
      map={[
        '..XXXX..',
        '.XX..XX.',
        'XX....XX',
        'XX....XX',
        '.XX..XX.',
        '..XXXX..',
        '..X..X..',
        '..XXXX..',
        '...XX...',
      ]}
    />
  );
}
