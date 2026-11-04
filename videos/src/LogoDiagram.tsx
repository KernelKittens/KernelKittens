import React from 'react';
import {tokens, kittenPath} from './tokens';

// Frame-driven twin of the homepage's static kitten mark. No independent clock.
export const LogoDiagram: React.FC<{phase: number}> = ({phase}) => {
  const angle = phase * Math.PI * 2;
  const satelliteX = 400 + Math.cos(angle - 0.75) * 312;
  const satelliteY = 400 + Math.sin(angle - 0.75) * 105;
  return <svg viewBox="0 0 800 800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke={tokens.rule} strokeWidth="0.7" opacity="0.25" />
      </pattern>
    </defs>
    <rect width="800" height="800" fill={tokens.page} />
    <rect x="70" y="70" width="660" height="660" fill="url(#grid)" />
    <g fill="none" stroke={tokens.rule} strokeWidth="1">
      <path d="M70 110V70H110M690 70H730V110M730 690V730H690M110 730H70V690" />
      <path d="M400 60V134M400 666V740M60 400H134M666 400H740" />
      <circle cx="400" cy="400" r="306" />
      <circle cx="400" cy="400" r="274" strokeDasharray="2 13" />
      <ellipse cx="400" cy="400" rx="152" ry="306" transform="rotate(28 400 400)" />
    </g>
    <g stroke={tokens.orange} strokeWidth="1" opacity="0.6">
      {Array.from({length: 72}, (_, index) => {
        const a = index * Math.PI / 36;
        const outer = 307;
        const inner = index % 6 === 0 ? 292 : 300;
        return <line key={index} x1={400 + Math.cos(a) * inner} y1={400 + Math.sin(a) * inner} x2={400 + Math.cos(a) * outer} y2={400 + Math.sin(a) * outer} />;
      })}
    </g>
    <g transform="rotate(-28 400 400)">
      <ellipse cx="400" cy="400" rx="312" ry="105" stroke={tokens.orange} opacity="0.7" strokeWidth="1.1" fill="none" />
      <circle cx={satelliteX} cy={satelliteY} r="5" fill={tokens.orange} />
      <circle cx={satelliteX} cy={satelliteY} r="12" stroke={tokens.orange} strokeWidth="1" fill={tokens.page} />
      <circle cx={satelliteX} cy={satelliteY} r="3" fill={tokens.orange} />
    </g>
    <circle cx="400" cy="400" r="286" fill="none" stroke={tokens.orange} strokeWidth="2" strokeDasharray="84 1713" transform={`rotate(${phase * 360 - 90} 400 400)`} />
    <g transform={`translate(200 ${180 + Math.sin(angle) * 5}) scale(4)`}>
      <path d={kittenPath} fill={tokens.orange} fillRule="evenodd" />
    </g>
    <g fill={tokens.muted} fontFamily={tokens.mono} fontSize="12" letterSpacing="2">
      <text x="83" y="48">KK / 026</text>
      <text x="715" y="48" textAnchor="end">EST. 2026</text>
      <text x="83" y="767">[ #_ ]</text>
      <text x="715" y="767" textAnchor="end">CTF TEAM</text>
    </g>
    <g fill={tokens.orange} fontFamily={tokens.mono} fontSize="10" letterSpacing="1">
      <text x="120" y="201">0x4B</text>
      <text x="636" y="615">0x4B</text>
    </g>
  </svg>;
};
