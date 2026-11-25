import React from 'react';
import { CharacterDef, Role } from '../types/game';

export type PlayerAnimType = 'IDLE' | 'RUN' | 'PASS_UNDER' | 'SET' | 'SPIKE' | 'BLOCK' | 'SERVE';

export interface PlayerVisualState {
  id: string;
  role: Role;
  side: 'player' | 'opponent';
  char: CharacterDef;
  x: number; // 0..1120 court coordinates
  y: number; // 0..560 court coordinates
  anim: PlayerAnimType;
  phaseStep: 0 | 1 | 2; // 0 = windup/squat, 1 = peak/contact, 2 = follow-through/land
  facing: 1 | -1;
  isActivePrompt: boolean;
}

interface PoseAngles {
  jumpY: number;
  squatY: number;
  torsoRot: number;
  leftThighRot: number;
  leftCalfRot: number;
  rightThighRot: number;
  rightCalfRot: number;
  leftUpperArmRot: number;
  leftForearmRot: number;
  rightUpperArmRot: number;
  rightForearmRot: number;
  transitionMs: number;
  timingFn: string;
}

function getPoseForState(anim: PlayerAnimType, step: 0 | 1 | 2): PoseAngles {
  switch (anim) {
    case 'PASS_UNDER': {
      // Passing Bawah: deep athletic dig squat + straight locked forearm platform + upward spring on contact
      if (step === 0) {
        return {
          jumpY: 0,
          squatY: 16,
          torsoRot: 28,
          leftThighRot: -38,
          leftCalfRot: 52,
          rightThighRot: 18,
          rightCalfRot: 26,
          leftUpperArmRot: -48,
          leftForearmRot: -6,
          rightUpperArmRot: -44,
          rightForearmRot: -4,
          transitionMs: 140,
          timingFn: 'cubic-bezier(0.22, 1, 0.36, 1)',
        };
      }
      return {
        jumpY: -12,
        squatY: 6,
        torsoRot: 18,
        leftThighRot: -22,
        leftCalfRot: 28,
        rightThighRot: 14,
        rightCalfRot: 12,
        leftUpperArmRot: -72,
        leftForearmRot: -4,
        rightUpperArmRot: -68,
        rightForearmRot: -4,
        transitionMs: 170,
        timingFn: 'cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    case 'SET': {
      // Set (Umpan Atas): knee coil -> overhead diamond hand push upward
      if (step === 0) {
        return {
          jumpY: 0,
          squatY: 11,
          torsoRot: 6,
          leftThighRot: -26,
          leftCalfRot: 38,
          rightThighRot: 16,
          rightCalfRot: 24,
          leftUpperArmRot: -122,
          leftForearmRot: -55,
          rightUpperArmRot: -116,
          rightForearmRot: -52,
          transitionMs: 130,
          timingFn: 'cubic-bezier(0.22, 1, 0.36, 1)',
        };
      }
      return {
        jumpY: -26,
        squatY: 0,
        torsoRot: -6,
        leftThighRot: -8,
        leftCalfRot: 12,
        rightThighRot: 8,
        rightCalfRot: 10,
        leftUpperArmRot: -162,
        leftForearmRot: -14,
        rightUpperArmRot: -158,
        rightForearmRot: -14,
        transitionMs: 180,
        timingFn: 'cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    case 'BLOCK': {
      // Block: quick coil -> explosive straight jump with both arms angled over net
      if (step === 0) {
        return {
          jumpY: 0,
          squatY: 16,
          torsoRot: 12,
          leftThighRot: -34,
          leftCalfRot: 52,
          rightThighRot: 22,
          rightCalfRot: 36,
          leftUpperArmRot: -88,
          leftForearmRot: -60,
          rightUpperArmRot: -84,
          rightForearmRot: -60,
          transitionMs: 110,
          timingFn: 'ease-out',
        };
      }
      return {
        jumpY: -86,
        squatY: 0,
        torsoRot: 8,
        leftThighRot: -6,
        leftCalfRot: 14,
        rightThighRot: 8,
        rightCalfRot: 16,
        leftUpperArmRot: -166,
        leftForearmRot: 12,
        rightUpperArmRot: -162,
        rightForearmRot: 14,
        transitionMs: 220,
        timingFn: 'cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    case 'SPIKE': {
      // Spike: 0 = explosive leap & bow-and-arrow cockback, 1 = high-speed whip smash, 2 = cushioned landing
      if (step === 0) {
        return {
          jumpY: -94,
          squatY: 0,
          torsoRot: -18,
          leftThighRot: -16,
          leftCalfRot: 48,
          rightThighRot: 16,
          rightCalfRot: 54,
          leftUpperArmRot: -135,
          leftForearmRot: -16,
          rightUpperArmRot: -195,
          rightForearmRot: -75,
          transitionMs: 190,
          timingFn: 'cubic-bezier(0.16, 1, 0.3, 1)',
        };
      }
      if (step === 1) {
        return {
          jumpY: -98,
          squatY: 0,
          torsoRot: 26,
          leftThighRot: 8,
          leftCalfRot: 24,
          rightThighRot: -12,
          rightCalfRot: 22,
          leftUpperArmRot: 28,
          leftForearmRot: 32,
          rightUpperArmRot: -48,
          rightForearmRot: 14,
          transitionMs: 130,
          timingFn: 'cubic-bezier(0.2, 0.95, 0.3, 1)',
        };
      }
      return {
        jumpY: 0,
        squatY: 13,
        torsoRot: 16,
        leftThighRot: -26,
        leftCalfRot: 38,
        rightThighRot: 18,
        rightCalfRot: 26,
        leftUpperArmRot: 22,
        leftForearmRot: 18,
        rightUpperArmRot: 36,
        rightForearmRot: 16,
        transitionMs: 230,
        timingFn: 'cubic-bezier(0.22, 1, 0.36, 1)',
      };
    }

    case 'SERVE': {
      // Servis: 0 = ball toss & crouch, 1 = jump serve overhead strike, 2 = landing follow-through
      if (step === 0) {
        return {
          jumpY: 0,
          squatY: 10,
          torsoRot: -8,
          leftThighRot: -22,
          leftCalfRot: 30,
          rightThighRot: 16,
          rightCalfRot: 22,
          leftUpperArmRot: -115,
          leftForearmRot: -15,
          rightUpperArmRot: -165,
          rightForearmRot: -65,
          transitionMs: 220,
          timingFn: 'ease-out',
        };
      }
      if (step === 1) {
        return {
          jumpY: -78,
          squatY: 0,
          torsoRot: 24,
          leftThighRot: 10,
          leftCalfRot: 28,
          rightThighRot: -10,
          rightCalfRot: 26,
          leftUpperArmRot: 24,
          leftForearmRot: 25,
          rightUpperArmRot: -52,
          rightForearmRot: 12,
          transitionMs: 160,
          timingFn: 'cubic-bezier(0.16, 1, 0.3, 1)',
        };
      }
      return {
        jumpY: 0,
        squatY: 10,
        torsoRot: 12,
        leftThighRot: -20,
        leftCalfRot: 28,
        rightThighRot: 14,
        rightCalfRot: 20,
        leftUpperArmRot: 20,
        leftForearmRot: 15,
        rightUpperArmRot: 28,
        rightForearmRot: 12,
        transitionMs: 220,
        timingFn: 'ease-out',
      };
    }

    case 'RUN': {
      return {
        jumpY: 0,
        squatY: 5,
        torsoRot: 18,
        leftThighRot: 0,
        leftCalfRot: 24,
        rightThighRot: 0,
        rightCalfRot: 24,
        leftUpperArmRot: -25,
        leftForearmRot: -55,
        rightUpperArmRot: 25,
        rightForearmRot: -55,
        transitionMs: 160,
        timingFn: 'ease-out',
      };
    }

    default: {
      // IDLE athletic ready stance
      return {
        jumpY: 0,
        squatY: 7,
        torsoRot: 11,
        leftThighRot: -20,
        leftCalfRot: 28,
        rightThighRot: 14,
        rightCalfRot: 18,
        leftUpperArmRot: -36,
        leftForearmRot: -32,
        rightUpperArmRot: -24,
        rightForearmRot: -38,
        transitionMs: 220,
        timingFn: 'ease-out',
      };
    }
  }
}

export const CourtPlayerSprite: React.FC<{ player: PlayerVisualState }> = ({ player }) => {
  const pose = getPoseForState(player.anim, player.phaseStep);
  const { visual } = player.char;
  const isActionPose = player.anim !== 'IDLE' && player.anim !== 'RUN';
  const isRunning = player.anim === 'RUN';

  const leftPct = (player.x / 1120) * 100;
  const topPct = (player.y / 560) * 100;

  const shadowScale = Math.max(0.42, 1 + pose.jumpY / 220);

  const limbTransition = `transform ${pose.transitionMs}ms ${pose.timingFn}`;

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        zIndex: Math.round(player.y),
        transform: 'translate(-50%, -100%)',
        transition: 'left 260ms cubic-bezier(0.22, 1, 0.36, 1), top 220ms ease-out',
        width: '8.4%',
        height: '24%',
      }}
    >
      {/* Dynamic Floor Shadow */}
      <div
        className="absolute left-1/2 bottom-[-4px] rounded-full bg-black/45"
        style={{
          width: '54%',
          height: '10px',
          transform: `translateX(-50%) scale(${shadowScale})`,
          transition: limbTransition,
        }}
      />

      {/* Active Prompt Target Ring */}
      {player.isActivePrompt && (
        <div
          className="absolute left-1/2 bottom-[-7px] rounded-full border-2 border-amber-400 shadow-[0_0_12px_rgba(250,204,21,0.75)]"
          style={{
            width: '74%',
            height: '16px',
            transform: 'translateX(-50%)',
          }}
        />
      )}

      {/* Skill Aura Glow */}
      {(isActionPose || player.char.rank === 'S+' || player.char.rank === 'S') && (
        <div
          className="absolute inset-x-1 top-2 bottom-2 rounded-full blur-md pointer-events-none"
          style={{
            background: visual.auraColor,
            opacity: isActionPose ? 0.36 : 0.16,
            transform: `translateY(${pose.jumpY * 0.65}px)`,
            transition: limbTransition,
          }}
        />
      )}

      {/* Jump + Squat Container */}
      <div
        className={`w-full h-full ${player.anim === 'IDLE' ? 'court-anim-idle' : ''}`}
        style={{
          transform: `translateY(${pose.jumpY + pose.squatY}px)`,
          transition: limbTransition,
        }}
      >
        <svg
          viewBox="-45 -115 90 120"
          className="w-full h-full overflow-visible"
          style={{ transform: player.facing === -1 ? 'scaleX(-1)' : undefined }}
        >
          {/* Back Leg (Hip -> Knee -> Ankle -> Shoe) */}
          <g
            className={isRunning ? 'court-run-a' : ''}
            style={{
              transformOrigin: '-4px -36px',
              transform: isRunning ? undefined : `rotate(${pose.leftThighRot}deg)`,
              transition: limbTransition,
            }}
          >
            <line x1="-4" y1="-36" x2="-4" y2="-18" stroke="#0F172A" strokeWidth="8.5" strokeLinecap="round" />
            <g
              style={{
                transformOrigin: '-4px -18px',
                transform: `rotate(${pose.leftCalfRot}deg)`,
                transition: limbTransition,
              }}
            >
              <line x1="-4" y1="-18" x2="-4" y2="0" stroke={visual.skinTone} strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="-4" cy="-18" r="4" fill="#0F172A" />
              <ellipse cx="-1" cy="1" rx="7" ry="3.6" fill={visual.jerseyAccent} />
            </g>
          </g>

          {/* Front Leg */}
          <g
            className={isRunning ? 'court-run-b' : ''}
            style={{
              transformOrigin: '4px -36px',
              transform: isRunning ? undefined : `rotate(${pose.rightThighRot}deg)`,
              transition: limbTransition,
            }}
          >
            <line x1="4" y1="-36" x2="4" y2="-18" stroke="#1E293B" strokeWidth="8.5" strokeLinecap="round" />
            <g
              style={{
                transformOrigin: '4px -18px',
                transform: `rotate(${pose.rightCalfRot}deg)`,
                transition: limbTransition,
              }}
            >
              <line x1="4" y1="-18" x2="4" y2="0" stroke={visual.skinTone} strokeWidth="6.5" strokeLinecap="round" />
              <circle cx="4" cy="-18" r="4" fill="#0F172A" />
              <ellipse cx="7" cy="1" rx="7" ry="3.6" fill={visual.jerseyAccent} />
            </g>
          </g>

          {/* Upper Body Group (Torso + Head + Arms) */}
          <g
            style={{
              transformOrigin: '0px -36px',
              transform: `rotate(${pose.torsoRot}deg)`,
              transition: limbTransition,
            }}
          >
            {/* Back Arm */}
            <g
              className={isRunning ? 'court-run-b' : ''}
              style={{
                transformOrigin: '-2px -68px',
                transform: isRunning ? undefined : `rotate(${pose.leftUpperArmRot}deg)`,
                transition: limbTransition,
              }}
            >
              <line x1="-2" y1="-68" x2="-2" y2="-50" stroke="#D1A27E" strokeWidth="5.8" strokeLinecap="round" />
              <g
                style={{
                  transformOrigin: '-2px -50px',
                  transform: `rotate(${pose.leftForearmRot}deg)`,
                  transition: limbTransition,
                }}
              >
                <line x1="-2" y1="-50" x2="-2" y2="-33" stroke="#D1A27E" strokeWidth="5.2" strokeLinecap="round" />
                <circle cx="-2" cy="-32" r="3.4" fill="#D1A27E" />
              </g>
            </g>

            {/* Jersey Torso */}
            <rect
              x="-13"
              y="-73"
              width="26"
              height="39"
              rx="6"
              fill={visual.jerseyColor}
              stroke={visual.jerseyAccent}
              strokeWidth="2.4"
            />
            <text
              x="0"
              y="-49"
              textAnchor="middle"
              fill={visual.jerseyAccent}
              fontSize="13"
              fontWeight="800"
              fontFamily="Barlow Condensed, sans-serif"
              style={player.facing === -1 ? { transform: 'scaleX(-1)', transformOrigin: '0px -54px' } : undefined}
            >
              {visual.jerseyNumber}
            </text>

            {/* Head & Hair */}
            <circle cx="0" cy="-87" r="12.5" fill={visual.skinTone} stroke="#0F172A" strokeWidth="1.5" />
            <path
              d="M-13 -89 Q-12 -103 0 -102 Q13 -103 13 -88 Q6 -94 -13 -89 Z"
              fill={visual.hairColor}
            />
            <polygon points="2,-101 12,-97 3,-93" fill={visual.hairHighlight} />

            {/* Front Hitting Arm */}
            <g
              className={isRunning ? 'court-run-a' : ''}
              style={{
                transformOrigin: '4px -68px',
                transform: isRunning ? undefined : `rotate(${pose.rightUpperArmRot}deg)`,
                transition: limbTransition,
              }}
            >
              <line x1="4" y1="-68" x2="4" y2="-50" stroke={visual.skinTone} strokeWidth="6" strokeLinecap="round" />
              <g
                style={{
                  transformOrigin: '4px -50px',
                  transform: `rotate(${pose.rightForearmRot}deg)`,
                  transition: limbTransition,
                }}
              >
                <line x1="4" y1="-50" x2="4" y2="-33" stroke={visual.skinTone} strokeWidth="5.4" strokeLinecap="round" />
                <circle cx="4" cy="-32" r="3.6" fill={visual.skinTone} />
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* Role & Name Tag */}
      <div
        className="absolute left-1/2 bottom-[-20px] -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-950/75"
        style={{ color: player.side === 'player' ? '#BAE6FD' : '#FECDD3' }}
      >
        {player.char.name.split(' ')[0]} · {player.role}
      </div>
    </div>
  );
};
