import React, { useEffect, useState } from 'react';
import { CharacterDef, DialogueEmotion } from '../types/game';

interface AnimePortraitProps {
  character: CharacterDef;
  emotion?: DialogueEmotion;
  isSpeaking?: boolean;
  facing?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AnimePortrait: React.FC<AnimePortraitProps> = ({
  character,
  emotion = 'neutral',
  isSpeaking = false,
  facing = 'right',
  size = 'lg',
  className = '',
}) => {
  const [mouthFrame, setMouthFrame] = useState(0);
  const [blink, setBlink] = useState(false);

  // Lip-sync cadence while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }
    const timer = window.setInterval(() => {
      setMouthFrame((prev) => (prev + 1) % 4);
    }, 115);
    return () => window.clearInterval(timer);
  }, [isSpeaking]);

  // Natural eye blink
  useEffect(() => {
    const interval = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
    }, 3400 + (character.id.length % 5) * 400);
    return () => window.clearInterval(interval);
  }, [character.id]);

  const { visual } = character;

  const sizeClass =
    size === 'sm'
      ? 'w-16 h-16'
      : size === 'md'
      ? 'w-28 h-28'
      : size === 'lg'
      ? 'w-44 h-48 md:w-56 md:h-60'
      : 'w-56 h-64 md:w-72 md:h-80';

  const animClass =
    emotion === 'awakened'
      ? 'anim-char-awakened'
      : emotion === 'charging'
      ? 'anim-char-charging'
      : emotion === 'shocked'
      ? 'anim-char-shocked'
      : emotion === 'angry'
      ? 'anim-char-angry'
      : emotion === 'determined'
      ? 'anim-char-determined'
      : emotion === 'laughing'
      ? 'anim-char-laughing'
      : emotion === 'injured'
      ? 'anim-char-injured'
      : emotion === 'whisper'
      ? 'anim-char-whisper'
      : isSpeaking
      ? 'anim-char-talking'
      : 'anim-char-neutral';

  const flipStyle = facing === 'left' ? { transform: 'scaleX(-1)' } : undefined;

  const renderHairBack = () => {
    switch (visual.hairStyle) {
      case 'long':
        return (
          <path
            d="M48 75 Q35 125 42 178 L158 178 Q165 125 152 75 Z"
            fill={visual.hairColor}
          />
        );
      case 'ponytail':
        return (
          <path
            d="M132 58 Q174 68 166 142 Q150 116 138 92 Z"
            fill={visual.hairColor}
          />
        );
      case 'twin':
        return (
          <g fill={visual.hairColor}>
            <path d="M52 65 Q22 95 28 158 Q46 130 56 92 Z" />
            <path d="M148 65 Q178 95 172 158 Q154 130 144 92 Z" />
          </g>
        );
      case 'wild':
        return (
          <path
            d="M42 95 L26 65 L52 60 L44 32 L78 44 L100 18 L124 44 L158 32 L148 62 L174 70 L154 98 Z"
            fill={visual.hairColor}
          />
        );
      case 'hood':
        return (
          <path
            d="M38 148 Q35 42 100 28 Q165 42 162 148 Z"
            fill="#1E293B"
            stroke={visual.jerseyAccent}
            strokeWidth="2.5"
          />
        );
      default:
        return null;
    }
  };

  const renderHairFront = () => {
    switch (visual.hairStyle) {
      case 'spiky':
        return (
          <g>
            <path
              d="M52 82 L44 48 L68 58 L74 28 L96 50 L114 24 L126 52 L152 40 L146 82 Q125 60 100 66 Q75 60 52 82 Z"
              fill={visual.hairColor}
            />
            <path d="M74 34 L94 56 L80 62 Z" fill={visual.hairHighlight} opacity="0.65" />
            <path d="M114 30 L125 56 L110 58 Z" fill={visual.hairHighlight} opacity="0.55" />
          </g>
        );
      case 'swept':
        return (
          <g>
            <path
              d="M50 86 Q48 36 102 34 Q152 38 148 84 Q126 62 96 68 Q72 64 50 86 Z"
              fill={visual.hairColor}
            />
            <path
              d="M65 50 Q98 42 135 58"
              stroke={visual.hairHighlight}
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
          </g>
        );
      case 'undercut':
        return (
          <g>
            <path
              d="M54 78 Q56 34 102 32 Q146 34 146 76 Q116 54 54 78 Z"
              fill={visual.hairColor}
            />
            <path d="M70 48 L126 44 L118 54 L76 58 Z" fill={visual.hairHighlight} opacity="0.5" />
          </g>
        );
      case 'crown':
        return (
          <g>
            <path
              d="M48 84 L38 42 L68 54 L84 22 L102 48 L122 20 L134 52 L162 42 L150 84 Q122 58 100 65 Q78 58 48 84 Z"
              fill={visual.hairColor}
            />
            <path d="M84 28 L100 54 L90 58 Z" fill={visual.hairHighlight} opacity="0.7" />
          </g>
        );
      case 'wild':
        return (
          <g>
            <path
              d="M48 84 L58 44 L80 64 L98 30 L114 62 L138 38 L152 84 Q122 58 100 68 Q78 58 48 84 Z"
              fill={visual.hairColor}
            />
            <path d="M98 36 L108 62 L92 64 Z" fill={visual.hairHighlight} opacity="0.75" />
          </g>
        );
      case 'bob':
        return (
          <path
            d="M46 112 Q44 36 100 34 Q156 36 154 112 Q142 74 128 68 Q100 72 72 68 Q58 74 46 112 Z"
            fill={visual.hairColor}
          />
        );
      default:
        return (
          <path
            d="M50 84 Q52 34 100 34 Q148 34 150 84 Q122 60 100 66 Q78 60 50 84 Z"
            fill={visual.hairColor}
          />
        );
    }
  };

  const renderMouth = () => {
    if (emotion === 'shocked') {
      return <ellipse cx="100" cy="117" rx="6" ry="7.5" fill="#7F1D1D" stroke="#0F172A" strokeWidth="1.5" />;
    }
    if (emotion === 'angry') {
      return (
        <path
          d={isSpeaking && mouthFrame % 2 === 1 ? 'M88 116 Q100 110 112 116 Q100 124 88 116 Z' : 'M88 118 Q100 112 112 118'}
          fill={isSpeaking && mouthFrame % 2 === 1 ? '#7F1D1D' : 'none'}
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      );
    }
    if (emotion === 'laughing') {
      return (
        <path
          d="M86 112 Q100 127 114 112 Z"
          fill="#991B1B"
          stroke="#0F172A"
          strokeWidth="2"
        />
      );
    }
    if (emotion === 'confident' || emotion === 'awakened') {
      if (isSpeaking && mouthFrame % 2 === 1) {
        return <ellipse cx="100" cy="116" rx="7" ry="4.5" fill="#7F1D1D" stroke="#0F172A" strokeWidth="1.8" />;
      }
      return (
        <path
          d="M89 116 Q102 121 113 113"
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      );
    }
    // Dynamic talking lip-sync
    if (isSpeaking) {
      if (mouthFrame === 1) {
        return <ellipse cx="100" cy="116" rx="6.5" ry="4.2" fill="#7F1D1D" stroke="#0F172A" strokeWidth="1.8" />;
      }
      if (mouthFrame === 2) {
        return <ellipse cx="100" cy="116" rx="4.5" ry="6" fill="#7F1D1D" stroke="#0F172A" strokeWidth="1.8" />;
      }
      if (mouthFrame === 3) {
        return <path d="M90 116 Q100 120 110 116" fill="none" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />;
      }
    }
    return (
      <path
        d="M91 116 Q100 119 109 116"
        fill="none"
        stroke="#0F172A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    );
  };

  const renderEyes = () => {
    if (blink || emotion === 'laughing') {
      return (
        <g stroke="#0F172A" strokeWidth="2.8" fill="none" strokeLinecap="round">
          <path d="M72 88 Q81 82 90 88" />
          <path d="M110 88 Q119 82 128 88" />
        </g>
      );
    }
    const pupilScale = emotion === 'shocked' ? 3.2 : 5.2;
    const eyeGlow = emotion === 'awakened' || emotion === 'charging';

    return (
      <g>
        {/* Left & Right Eyes */}
        <ellipse cx="81" cy="88" rx="9.5" ry={emotion === 'shocked' ? 8.5 : 6.5} fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
        <ellipse cx="119" cy="88" rx="9.5" ry={emotion === 'shocked' ? 8.5 : 6.5} fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
        <circle
          cx="82"
          cy="88"
          r={pupilScale}
          fill={visual.eyeColor}
          style={eyeGlow ? { filter: `drop-shadow(0 0 6px ${visual.auraColor})` } : undefined}
        />
        <circle
          cx="118"
          cy="88"
          r={pupilScale}
          fill={visual.eyeColor}
          style={eyeGlow ? { filter: `drop-shadow(0 0 6px ${visual.auraColor})` } : undefined}
        />
        <circle cx="80" cy="86" r="2" fill="#FFFFFF" />
        <circle cx="116" cy="86" r="2" fill="#FFFFFF" />
        {/* Eyebrows */}
        <path
          d={
            emotion === 'angry' || emotion === 'determined' || emotion === 'charging'
              ? 'M69 75 L91 81'
              : emotion === 'shocked' || emotion === 'injured'
              ? 'M70 79 Q80 72 90 77'
              : 'M70 77 Q80 74 90 78'
          }
          stroke={visual.hairColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d={
            emotion === 'angry' || emotion === 'determined' || emotion === 'charging'
              ? 'M131 75 L109 81'
              : emotion === 'shocked' || emotion === 'injured'
              ? 'M130 79 Q120 72 110 77'
              : 'M130 77 Q120 74 110 78'
          }
          stroke={visual.hairColor}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  };

  return (
    <div className={`relative select-none flex items-end justify-center ${sizeClass} ${className}`}>
      {/* Dynamic Aura Glow Behind Character */}
      {(emotion === 'charging' || emotion === 'awakened' || character.rank === 'S+' || character.rank === 'S') && (
        <div
          className="absolute inset-2 rounded-full blur-xl opacity-45 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, ${visual.auraColor} 0%, transparent 72%)`,
          }}
        />
      )}

      <div className={`w-full h-full ${animClass}`}>
        <svg viewBox="0 0 200 210" className="w-full h-full overflow-visible" style={flipStyle}>
          {/* Back Hair */}
          {renderHairBack()}

          {/* Shoulders & Jersey */}
          <path
            d="M36 208 Q42 148 76 140 L124 140 Q158 148 164 208 Z"
            fill={visual.jerseyColor}
            stroke="#0F172A"
            strokeWidth="2.5"
          />
          {/* Jersey Trim & Collar */}
          <path d="M74 140 L100 166 L126 140" fill="none" stroke={visual.jerseyAccent} strokeWidth="5" strokeLinejoin="round" />
          <path d="M46 164 L64 152 L60 206" fill="none" stroke={visual.jerseyAccent} strokeWidth="3.5" opacity="0.85" />
          <path d="M154 164 L136 152 L140 206" fill="none" stroke={visual.jerseyAccent} strokeWidth="3.5" opacity="0.85" />

          {/* Jersey Number */}
          <text
            x="100"
            y="194"
            textAnchor="middle"
            fill={visual.jerseyAccent}
            fontSize="20"
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
            style={facing === 'left' ? { transform: 'scaleX(-1)', transformOrigin: '100px 188px' } : undefined}
          >
            {visual.jerseyNumber}
          </text>

          {/* Neck */}
          <rect x="86" y="122" width="28" height="24" rx="8" fill={visual.skinTone} />
          <path d="M86 128 Q100 136 114 128" fill="#000000" opacity="0.12" />

          {/* Ears */}
          <ellipse cx="56" cy="93" rx="6" ry="9" fill={visual.skinTone} stroke="#0F172A" strokeWidth="1.5" />
          <ellipse cx="144" cy="93" rx="6" ry="9" fill={visual.skinTone} stroke="#0F172A" strokeWidth="1.5" />

          {/* Face Shape */}
          <path
            d="M58 76 Q58 44 100 44 Q142 44 142 76 Q142 114 100 130 Q58 114 58 76 Z"
            fill={visual.skinTone}
            stroke="#0F172A"
            strokeWidth="2.2"
          />

          {/* Eyes & Brows */}
          {renderEyes()}

          {/* Nose */}
          <path d="M99 98 L97 104 L102 105" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />

          {/* Mouth */}
          {renderMouth()}

          {/* Accessories */}
          {visual.accessory === 'scar' && (
            <path d="M68 95 L82 106 M73 94 L77 107" stroke="#B91C1C" strokeWidth="2.2" strokeLinecap="round" />
          )}
          {visual.accessory === 'glasses' && (
            <g stroke="#E2E8F0" strokeWidth="2.2" fill="rgba(56,189,248,0.12)">
              <rect x="67" y="80" width="27" height="15" rx="3" />
              <rect x="106" y="80" width="27" height="15" rx="3" />
              <line x1="94" y1="87" x2="106" y2="87" />
            </g>
          )}
          {visual.accessory === 'visor' && (
            <path
              d="M64 81 L136 81 L132 95 L106 95 L100 90 L94 95 L68 95 Z"
              fill={visual.jerseyAccent}
              opacity="0.35"
              stroke={visual.jerseyAccent}
              strokeWidth="2"
            />
          )}
          {visual.accessory === 'mask' && (
            <path
              d="M63 102 Q100 108 137 102 Q134 128 100 132 Q66 128 63 102 Z"
              fill="#0F172A"
              stroke={visual.jerseyAccent}
              strokeWidth="1.8"
            />
          )}

          {/* Front Hair */}
          {renderHairFront()}

          {/* Headband / Crown on top of hair */}
          {visual.accessory === 'headband' && (
            <path
              d="M54 68 Q100 58 146 68 L145 76 Q100 66 55 76 Z"
              fill={visual.jerseyAccent}
              stroke="#0F172A"
              strokeWidth="1.5"
            />
          )}
          {visual.accessory === 'crown' && (
            <path
              d="M72 42 L78 20 L92 34 L100 14 L108 34 L122 20 L128 42 Z"
              fill="#FACC15"
              stroke="#78350F"
              strokeWidth="2"
            />
          )}

          {/* Emotion FX Overlays */}
          {emotion === 'shocked' && (
            <g stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round">
              <line x1="36" y1="54" x2="24" y2="44" />
              <line x1="34" y1="68" x2="20" y2="68" />
              <path d="M154 66 Q160 76 154 80 Q148 76 154 66 Z" fill="#38BDF8" stroke="none" />
            </g>
          )}
          {emotion === 'angry' && (
            <g stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M132 54 Q137 59 132 64" />
              <path d="M142 54 Q137 59 142 64" />
            </g>
          )}
          {emotion === 'injured' && (
            <g>
              <rect x="65" y="103" width="12" height="5" rx="1.5" transform="rotate(-15 71 105)" fill="#FDE68A" stroke="#92400E" strokeWidth="1" />
            </g>
          )}
          {(emotion === 'awakened' || emotion === 'charging') && (
            <g fill={visual.auraColor} opacity="0.85">
              <polygon points="34,110 38,95 42,110 38,120" />
              <polygon points="160,92 164,74 168,92 164,104" />
              <circle cx="48" cy="44" r="3" />
              <circle cx="155" cy="48" r="2.5" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
