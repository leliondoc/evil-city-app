import { useId } from 'react';

// The land and roads share normalized coordinates with the district markers.
// Scenery keeps its proportions in the shorter landscape layout.
const river =
  'M-80 303C45 276 152 360 259 322S355 215 430 201C485 186 490 220 500 250S527 326 586 351S664 401 700 490';
const road =
  'M160 260C214 270 252 214 294 198S350 186 390 168C433 168 455 242 486 242H520C566 242 584 273 620 273C674 277 692 225 727 204S793 173 840 160';
const treeOffsets = [
  [-20, -18],
  [3, -24],
  [27, -16],
  [-37, 0],
  [-11, -2],
  [15, 0],
  [40, 7],
  [-26, 18],
  [0, 20],
  [26, 27],
  [-42, 32],
  [-15, 39],
  [13, 44],
];
const woods = [
  [60, 91, 1],
  [145, 71, 1.05],
  [231, 104, 0.82],
  [53, 200, 0.9],
  [61, 367, 0.9],
  [294, 367, 0.9],
  [383, 385, 0.73],
  [738, 68, 0.65],
  [925, 359, 0.83],
];

function AtlasScene({
  compact = false,
  portrait = false,
}: {
  compact?: boolean;
  portrait?: boolean;
}) {
  const prefix = `atlas-${useId().replace(/:/g, '')}`;
  const ref = (name: string) => `#${prefix}-${name}`;
  const paint = (name: string) => `url(${ref(name)})`;
  const sy = compact ? 250 / 420 : 1;
  const size = compact ? 0.74 : 1;
  const terrainTransform = portrait
    ? 'translate(0 1000) rotate(-90)'
    : `scale(1 ${sy})`;
  const point = (x: number, y: number) =>
    portrait ? { x: y, y: 1000 - x } : { x, y: y * sy };
  const place = (x: number, y: number, scale = 1, rotate = 0) =>
    `translate(${point(x, y).x} ${point(x, y).y}) rotate(${rotate}) scale(${scale * size})`;
  const trees = woods
    .flatMap(([x, y, scale], cluster) =>
      treeOffsets.map(([dx, dy], i) => ({
        x: x + dx * scale,
        y: y + dy * scale,
        scale: scale * (0.78 + ((i * 7 + cluster) % 5) * 0.055),
        kind: (i + cluster) % 3 === 0 ? 'oak' : 'pine',
      })),
    )
    .sort((a, b) => a.y - b.y);
  return (
    <svg
      className={`atlas-land atlas-land-${portrait ? 'portrait' : compact ? 'compact' : 'wide'}`}
      viewBox={portrait ? '0 0 420 1000' : `0 0 1000 ${compact ? 250 : 420}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${prefix}-land`} x2=".3" y2="1">
          <stop stopColor="#a8af73" />
          <stop offset=".55" stopColor="#b8b57c" />
          <stop offset="1" stopColor="#8c9c66" />
        </linearGradient>
        <linearGradient id={`${prefix}-water`} x2="0" y2="1">
          <stop stopColor="#397e83" />
          <stop offset=".5" stopColor="#65a6a1" />
          <stop offset="1" stopColor="#47888b" />
        </linearGradient>
        <radialGradient id={`${prefix}-edge`}>
          <stop offset=".55" stopColor="#263f35" stopOpacity="0" />
          <stop offset="1" stopColor="#263f35" stopOpacity=".26" />
        </radialGradient>
        <pattern
          id={`${prefix}-grain`}
          width="27"
          height="23"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M3 5h2m14 12h1M8 20h2"
            stroke="#eef0b9"
            strokeWidth="1"
            opacity=".26"
          />
          <circle cx="23" cy="4" r=".8" fill="#3c5942" opacity=".13" />
          <circle cx="11" cy="10" r=".6" fill="#3c5942" opacity=".13" />
        </pattern>
        <g id={`${prefix}-pine`}>
          <ellipse cy="3" rx="14" ry="5" fill="#304d38" opacity=".22" />
          <path d="M-2-8 0 5 4 5 3-9" fill="#71553a" />
          <path
            d="M0-43-11-26-7-26-17-11-11-12-21-1Q-2 8 18 0L9-12 14-10 6-26 10-25Z"
            fill="#315344"
            stroke="#2c473a"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M0-41-9-27 0-29-13-13-1-16-16-1Q-6 2 0 0Z" fill="#678465" />
          <path
            d="m0-29 7 3m-8 10 11 5M0 0l13 1"
            fill="none"
            stroke="#90a37a"
            strokeWidth="1"
            opacity=".45"
          />
        </g>
        <g id={`${prefix}-oak`}>
          <ellipse cy="3" rx="17" ry="6" fill="#304d38" opacity=".22" />
          <path
            d="M-3-15-2 5H3L2-16M0-7-8-17m9 7 8-10"
            stroke="#705334"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-17-13C-29-22-18-37-9-34C-12-47 7-49 12-37C26-39 29-23 19-18C26-5 3 0-5-7C-10 0-24-5-17-13Z"
            fill="#577550"
            stroke="#3e5b42"
            strokeWidth="1.6"
          />
          <path
            d="M-18-27Q-18-37-8-33Q-8-43 3-41M-12-17Q-7-24 0-20M6-30q11-5 14 5"
            stroke="#99aa70"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity=".7"
          />
        </g>
        <g id={`${prefix}-mountain`}>
          <path
            d="M-56 7Q-43-8-29-7L-6-56 11-37 18-42 53 9Q28 14 7 9L-15 14Z"
            fill="#596858"
            stroke="#4b5b4d"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="m-6-56-10 35-13 14-21 12 35 3 15-27 11-18Z" fill="#a2a58a" />
          <path
            d="M-6-56 11-37 18-42 34-15 19-26 14-21 3-35-4-23-12-22Z"
            fill="#d2ceb0"
          />
          <path
            d="m-28-7 15-6m16-5 11 14 9 4M-13 4-7-7M30-8 40 4"
            fill="none"
            stroke="#394f45"
            strokeWidth="2"
            opacity=".6"
          />
          <path
            d="M-62 14q16-6 28-1m32 5q24-8 48-2"
            fill="none"
            stroke="#516a4c"
            strokeWidth="2"
            opacity=".45"
          />
        </g>
        <g id={`${prefix}-cottage`}>
          <ellipse cy="4" rx="19" ry="6" fill="#324837" opacity=".2" />
          <path
            d="M-14-15V1L4 6 18 0v-17"
            fill="#d8c490"
            stroke="#61563e"
            strokeWidth="1.5"
          />
          <path d="M4-14V6L18 0v-17" fill="#ae9b70" />
          <path
            d="m-20-14 16-17 26 12-17 9Z"
            fill="#866448"
            stroke="#594d3a"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="m-4-31 7 21-23-4Z" fill="#b58c59" />
          <path d="M-8 3v-10l6 2v10M9-6v5l4-2v-5" fill="#4c5743" />
          <path
            d="m11-26 0-9 4 2v10"
            fill="#a99370"
            stroke="#61563e"
            strokeWidth="1.3"
          />
          <path d="m-11-20 10 4m-6-8 5 2" stroke="#d3ac70" strokeWidth="1.2" />
        </g>
        <g id={`${prefix}-rock`}>
          <path
            d="m-11 2 4-10 11-4 10 12-8 5Z"
            fill="#8d9580"
            stroke="#5a6c58"
            strokeWidth="1.4"
          />
          <path d="m-7-8 11-4-2 9-13 5" fill="#b9b7a0" />
          <path d="m2-3 4 8" stroke="#62715d" strokeWidth="1" />
        </g>
        <g id={`${prefix}-ruin`}>
          <ellipse cy="3" rx="32" ry="9" fill="#536347" opacity=".28" />
          <path
            d="m-23 0 0-25 7-2v7l10-1v-10l9-1v13l12-2v-8l9 3v27l-10 4v-16q-7-7-13 0V4Z"
            fill="#a7a382"
            stroke="#5d6754"
            strokeWidth="1.8"
          />
          <path
            d="m-21-9 7-1m6-5 7-1m7-8 8-1m-4 15 7-1M-16-19v6M-4-27v6"
            stroke="#7b8165"
            strokeWidth="1.5"
          />
          <path
            d="m-28 4 6-6 5 7m24 2 8-6 8 3"
            fill="#939a73"
            stroke="#617553"
            strokeWidth="2"
          />
        </g>
      </defs>

      <g transform={terrainTransform}>
        <rect width="1000" height="420" fill={paint('land')} />
        <path
          d="M-50 28Q103-53 246 48T470 69Q650-50 789 14T1050 11V160Q915 104 782 130T503 119Q375 72 262 134T-50 179Z"
          fill="#849b68"
        />
        <path
          d="M-25 153Q100 74 223 154T405 155Q425 180 425 194Q316 201 253 283T-25 278Z"
          fill="#a3ad71"
        />
        <path
          d="M520 115C587 80 670 96 733 115S900 159 1050 120V338C912 298 826 288 749 315S602 329 566 259S512 170 520 115Z"
          fill="#8fa06b"
        />
        <path
          d="M550 154Q639 107 723 150T906 219"
          fill="none"
          stroke="#c4c38b"
          strokeWidth="3"
          opacity=".55"
        />
        <path
          d="M-20 358Q103 340 208 371T391 345Q477 356 480 450H-20Z"
          fill="#7d9460"
        />
        <path
          d="M688 300Q802 260 1020 315V450H722Q723 371 688 300Z"
          fill="#9ea36c"
        />
        <g fill="none" stroke="#657f55" strokeWidth="2" opacity=".4">
          <path d="M16 267q74-45 133-23M218 47q63-24 123 1M584 104q71-22 130 5M786 326q93-28 170-6M202 403q71-18 104-9" />
          <path d="M567 111q75-25 158 6M812 336q78-19 138-5M18 274q67-34 113-23" />
        </g>

        {/* A continuous river runs beyond both frame edges; banks share its curve. */}
        <path d={river} fill="none" stroke="#617d5a" strokeWidth="61" />
        <path d={river} fill="none" stroke="#c4bb85" strokeWidth="49" />
        <path d={river} fill="none" stroke="#356e74" strokeWidth="42" />
        <path d={river} fill="none" stroke={paint('water')} strokeWidth="35" />
        <path
          d={river}
          fill="none"
          stroke="#a4d0bb"
          strokeWidth="24"
          opacity=".17"
        />
        <g
          fill="none"
          stroke="#cee0bd"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity=".65"
        >
          <path d="M15 300q25 0 43 4m49 19 23 6m32 8q22 5 40 1m99-47 19-14m41-47 17-8m40-13 16-1M513 285l6 14m46 46 14 7m55 40 15 14" />
          <path
            d="m52 312 19 3m110 15 12 1m150-81 12-13m64-22 13-1m111 108 9 9m43 28 10 7"
            opacity=".6"
          />
        </g>
        <g
          fill="none"
          stroke="#d0c18b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 5"
          opacity=".85"
        >
          <path d="M287 198Q271 164 298 111M330 192l-18 31M733 204q60 54 149 44M632 282q58 43 132 74" />
        </g>
        <path
          d={road}
          fill="none"
          stroke="#6e714b"
          strokeWidth="14"
          opacity=".65"
        />
        <path d={road} fill="none" stroke="#c8b680" strokeWidth="10" />
        <path
          d={road}
          fill="none"
          stroke="#f2dc9d"
          strokeWidth="4"
          strokeDasharray="1 10"
          strokeLinecap="round"
        />
        <rect width="1000" height="420" fill={paint('grain')} />
      </g>

      {/* Ridge, woods and settlements are placed deliberately around the four clearings. */}
      <g>
        {[
          [505, 74, 0.76],
          [562, 57, 1.1],
          [623, 68, 1.3],
          [682, 84, 0.9],
        ].map(([x, y, scale], i) => (
          <use
            key={i}
            href={ref('mountain')}
            transform={place(x, y + (compact ? 46 : 22), scale)}
          />
        ))}
        <g transform={terrainTransform}>
          {woods.map(([x, y, scale], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y + 8}
              rx={53 * scale}
              ry={37 * scale}
              fill="#5c7b51"
              opacity=".23"
            />
          ))}
        </g>
        {trees.map((tree, i) => (
          <use
            key={i}
            href={ref(tree.kind)}
            transform={place(tree.x, tree.y, tree.scale)}
          />
        ))}
      </g>

      <g transform={place(296, 117, 0.86, -7)}>
        <path
          d="m-39-22 56-8 23 29-61 11Z"
          fill="#b6a16a"
          stroke="#7b8151"
          strokeWidth="2"
        />
        <path
          d="m-29-21 19 26m-7-28 19 26m-7-28 19 26m-7-28 19 26"
          stroke="#dbc78d"
          strokeWidth="3"
        />
        <path
          d="m-29-19 19 24m-7-26 19 24m-7-26 19 24m-7-26 19 24"
          stroke="#8e914f"
          strokeWidth="1"
        />
      </g>
      <g transform={place(906, 264, 1.2, 9)}>
        <path
          d="m-29-32 71 12-16 57-74-15Z"
          fill="#bbaa70"
          stroke="#6e7e51"
          strokeWidth="2"
        />
        <path
          d="m-30-21 68 12m-72 0 69 12m-73 0 70 13m-74-1 70 13"
          stroke="#e0cf93"
          strokeWidth="4"
        />
        <path
          d="m-30-19 68 12m-72 0 69 12m-73 0 70 13m-74-1 70 13"
          stroke="#858d50"
          strokeWidth="1.5"
        />
        <path d="M-40 0 31 14" stroke="#6c7b4e" strokeWidth="3" />
      </g>
      {[
        [304, 105, 0.8],
        [312, 226, 0.78],
        [343, 238, 0.6],
        [926, 210, 0.9],
        [945, 232, 0.65],
        [755, 144, 0.65],
      ].map(([x, y, scale], i) => (
        <use key={i} href={ref('cottage')} transform={place(x, y, scale)} />
      ))}
      <g transform={place(941, 279, 0.75)}>
        <path
          d="m-12 1 4-36h15l6 35Z"
          fill="#cfbf93"
          stroke="#685e46"
          strokeWidth="2"
        />
        <path
          d="m-13-35 13-15 14 15Z"
          fill="#82634b"
          stroke="#594d3c"
          strokeWidth="2"
        />
        <circle
          cy="-30"
          r="4"
          fill="#ded2a6"
          stroke="#65573f"
          strokeWidth="2"
        />
        <path
          d="M0-30-22-54M0-30 24-52M0-30 22-6M0-30-24-8"
          stroke="#65573f"
          strokeWidth="3"
        />
        <path
          d="m-20-51-5 7 15 12 4-5m26-12-7-5-12 15 5 4m15 27 5-7-15-12-4 5m-26 12 7 5 12-15-5-4"
          fill="#e4d7a3"
          stroke="#817553"
          strokeWidth="1"
        />
      </g>
      <use href={ref('ruin')} transform={place(764, 359, 0.95)} />
      <use href={ref('ruin')} transform={place(696, 150, 0.55)} />
      {[
        [478, 93, 0.6],
        [701, 101, 0.8],
        [670, 92, 0.45],
        [545, 349, 0.75],
        [567, 362, 0.5],
        [436, 380, 0.65],
        [82, 273, 0.55],
        [875, 386, 0.6],
      ].map(([x, y, scale], i) => (
        <use key={i} href={ref('rock')} transform={place(x, y, scale)} />
      ))}
      <g transform={place(843, 318, 0.8)}>
        {[
          [0, 0],
          [24, 5],
          [48, 10],
          [-5, 22],
          [19, 27],
          [43, 32],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M0-8v12" stroke="#7f6944" strokeWidth="3" />
            <circle
              cy="-9"
              r="11"
              fill="#6e854e"
              stroke="#4d6d42"
              strokeWidth="1.5"
            />
            <circle cx="-3" cy="-12" r="6" fill="#9aab66" />
            <circle cx="5" cy="-8" r="2" fill="#c5ad65" />
          </g>
        ))}
      </g>

      {/* The only river crossing is a real bridge, aligned with the road. */}
      <g
        transform={`translate(${point(501, 242).x} ${point(501, 242).y}) rotate(${portrait ? -88 : 2})`}
      >
        <ellipse cy="8" rx="47" ry="9" fill="#214b4a" opacity=".35" />
        <path
          d="M-43-9Q0-23 43-9V12Q0-1-43 12Z"
          fill="#807259"
          stroke="#514f3e"
          strokeWidth="2"
        />
        <path
          d="M-42-12Q0-23 42-12V1Q0-10-42 1Z"
          fill="#cabb90"
          stroke="#6f674e"
          strokeWidth="1.5"
        />
        {[-32, -21, -10, 1, 12, 23, 34].map((x) => (
          <path
            key={x}
            d={`M${x} ${-19 + Math.abs(x) * 0.17}v13`}
            stroke="#8c7e5b"
            strokeWidth="1.5"
          />
        ))}
        <path
          d="M-43-13Q0-26 43-13M-43 3Q0-10 43 3"
          fill="none"
          stroke="#eee0af"
          strokeWidth="3"
        />
        {[-44, 40].map((x) => (
          <g key={x}>
            <path
              d={`M${x}-15v21h5v-21Z`}
              fill="#b7ad88"
              stroke="#685f49"
              strokeWidth="1.5"
            />
            <path d={`M${x}-15h5`} stroke="#eee0af" strokeWidth="3" />
          </g>
        ))}
      </g>
      <g
        className="atlas-geography"
        fill="#3d5943"
        fontFamily="Georgia, serif"
        fontSize="12"
        fontStyle="italic"
        letterSpacing="1"
      >
        <text x="87" y={35 * sy}>
          Bois des murmures
        </text>
        <text x="541" y={132 * sy}>
          Les Hautes Terres
        </text>
        <text x="695" y={403 * sy}>
          Les vieilles marches
        </text>
        <text
          transform={`translate(343 ${291 * sy}) rotate(-31)`}
          fill="#315f64"
          fontSize="11"
        >
          La Serpentine
        </text>
      </g>
      <g
        className="atlas-rose"
        transform={place(942, 75, 0.72)}
        fill="#d4cb99"
        stroke="#53634b"
        strokeWidth="1.2"
      >
        <circle r="26" fill="none" opacity=".65" />
        <circle r="20" fill="none" opacity=".45" />
        <path d="M0-37 8-8 0 0-8-8ZM37 0 8 8 0 0 8-8ZM0 37-8 8 0 0 8 8ZM-37 0-8-8 0 0-8 8Z" />
        <path
          d="M0-37V0L8-8ZM37 0H0L8 8ZM0 37V0L-8 8ZM-37 0H0L-8-8Z"
          fill="#607657"
          stroke="none"
        />
        <circle r="4" fill="#e5d9a5" />
        <text
          y="-44"
          textAnchor="middle"
          fill="#3e5b43"
          stroke="none"
          fontFamily="Georgia, serif"
          fontSize="14"
        >
          N
        </text>
      </g>
      <rect
        width={portrait ? 420 : 1000}
        height={portrait ? 1000 : 420 * sy}
        fill={paint('edge')}
        pointerEvents="none"
      />
    </svg>
  );
}

export function CampaignAtlas() {
  return (
    <>
      <AtlasScene />
      <AtlasScene compact />
      <AtlasScene portrait />
    </>
  );
}
