import React from 'react';
import {AbsoluteFill, Composition, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {LogoDiagram} from './LogoDiagram';
import {tokens} from './tokens';
import {cues} from './cues';

type Props = {fps: number};
const LogoLoop: React.FC<Props> = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return <AbsoluteFill style={{backgroundColor: tokens.page}}><LogoDiagram phase={frame / (durationInFrames - 1)} /></AbsoluteFill>;
};

const TeamFilm: React.FC<Props> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const scene = cues.find(cue => t >= cue.start && t < cue.end) || cues[3];
  const localTime = t - scene.start;
  const enter = interpolate(localTime, [0, 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exit = interpolate(localTime, [3.6, 3.95], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const brand = scene.kind === 'identity' || scene.kind === 'close';
  return <AbsoluteFill style={{backgroundColor: tokens.page, color: tokens.ink, fontFamily: tokens.display}}>
    <div style={{position: 'absolute', top: 45, left: 58, right: 58, borderTop: `1px solid ${tokens.rule}`, paddingTop: 18, display: 'flex', justifyContent: 'space-between', fontFamily: tokens.mono, fontSize: 14, letterSpacing: 2, color: tokens.muted}}><span>KERNEL KITTENS</span><span>CTF TEAM / EST. 2026</span></div>
    <div style={{position: 'absolute', width: 500, height: 500, right: 25, top: 110}}><LogoDiagram phase={(t % 8) / 8} /></div>
    <div style={{position: 'absolute', left: 65, top: 188, width: 665, opacity: enter * exit, transform: `translateY(${(1 - enter) * 24}px)`}}>
      <div style={{fontFamily: tokens.mono, fontSize: 16, color: tokens.orange, letterSpacing: 2, marginBottom: 26}}>{brand ? '[ #_ ] / KERNEL KITTENS' : 'RESULT 2026 / TEAM RESULT'}</div>
      {brand ? <>
        <div style={{fontSize: 86, letterSpacing: -5, lineHeight: 0.96, fontWeight: 800}}>Kernel<br /><span style={{color: tokens.orange}}>Kittens.</span></div>
        <div style={{fontFamily: tokens.mono, fontSize: 24, marginTop: 34}}>{scene.kind === 'close' ? 'kernelkittens.team' : 'We play CTFs.'}</div>
      </> : scene.kind === 'blackhat' ? <>
        <div style={{fontSize: 107, fontWeight: 800, letterSpacing: -6, color: tokens.orange, lineHeight: 1}}>19<span style={{fontSize: 47, color: tokens.ink, letterSpacing: -2}}> / 3,349*</span></div>
        <div style={{fontSize: 31, lineHeight: 1.25, fontWeight: 700, marginTop: 25}}>BlackHat MEA<br />Qualification CTF 2026</div>
        <div style={{fontFamily: tokens.mono, fontSize: 17, color: tokens.muted, marginTop: 23}}>15 SOLVED / 1,500 POINTS</div>
      </> : <>
        <div style={{fontSize: 104, fontWeight: 800, letterSpacing: -6, color: tokens.orange, lineHeight: 1}}>30<span style={{fontSize: 47, color: tokens.ink, letterSpacing: -2}}> / 30 SOLVED</span></div>
        <div style={{fontSize: 31, fontWeight: 700, marginTop: 25}}>Kaspersky{'{CTF}'} 2026</div>
        <div style={{fontFamily: tokens.mono, fontSize: 21, marginTop: 19}}>3 / 361 TEAMS</div>
        <div style={{fontFamily: tokens.mono, fontSize: 14, color: tokens.muted, lineHeight: 1.5, marginTop: 15}}>DIVISION: NORTH AMERICA,<br />SOUTH AMERICA, CARIBBEAN</div>
      </>}
    </div>
    <div style={{position: 'absolute', bottom: 44, left: 58, right: 58, borderTop: `1px solid ${tokens.rule}`, paddingTop: 16, color: tokens.muted, fontFamily: tokens.mono, fontSize: 12, letterSpacing: 1, display: 'flex', justifyContent: 'space-between'}}><span>WE PLAY CTFS.</span><span>{`0${cues.indexOf(scene) + 1} / 04`}</span></div>
    <div style={{position: 'absolute', left: 58, bottom: 84, height: 2, width: (1164 * ((t % 4) / 4)), backgroundColor: tokens.orange}} />
  </AbsoluteFill>;
};

export const RemotionRoot = () => <>
  <Composition id="KernelLoop" component={LogoLoop} width={800} height={800} fps={60} durationInFrames={480} defaultProps={{fps: 60}} calculateMetadata={({props}) => ({fps: props.fps, durationInFrames: props.fps * 8})} />
  <Composition id="KernelFilm" component={TeamFilm} width={1280} height={720} fps={60} durationInFrames={960} defaultProps={{fps: 60}} calculateMetadata={({props}) => ({fps: props.fps, durationInFrames: props.fps * 16})} />
</>;
