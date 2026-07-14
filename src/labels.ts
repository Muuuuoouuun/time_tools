import type { Tool } from './state';
import { navTimer, navStopwatch, navClock, navExam, navPomo } from './icons';

export const TOOL_ORDER: Tool[] = ['timer', 'stopwatch', 'clock', 'exam', 'pomo'];

// [title, subtitle] — from prototype `titles` map (line 417).
export const TOOL_TITLES: Record<Tool, [string, string]> = {
  timer: ['타이머', '카운트다운 · 그룹별 개별 설정'],
  stopwatch: ['스톱워치', '경과 시간 측정 및 랩 기록'],
  clock: ['시계', '현재 시각과 세계 시각'],
  exam: ['교시 스케줄', '수업/시험 교시 자동 전환'],
  pomo: ['뽀모도로', '집중과 휴식 사이클'],
};

export const NAV_ICONS: Record<Tool, () => SVGSVGElement> = {
  timer: navTimer,
  stopwatch: navStopwatch,
  clock: navClock,
  exam: navExam,
  pomo: navPomo,
};
