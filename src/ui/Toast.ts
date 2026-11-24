// 위 띠 바로 아래에 1.5초 떠올랐다 사라지는 한 줄.
// 2026-11-13 컨셉 시연판: 맨 위에 '안내 띠'(.guide)를 더했다 — 튜토리얼 단계 문장(다음 단계가 올 때까지)과
// 판 시작 때 스테이지 이름·목표 한 줄. 그 밖의 새 사건(새벽 전·친구·자비·들킴·노월·아이템)은 짧은 토스트로.
import { bus } from '../core/events';
import { GameData, characterById, stageById } from '../data';
import { h } from './dom';
import type { RunEventKind } from '../systems/runEvents';

/** 튜토리얼을 마친 뒤 안내 띠가 남는 시간 */
const DONE_HOLD_MS = 2000;
/** 스테이지 소개가 떠 있는 시간 */
const STAGE_INTRO_MS = 3000;

/** 받침 있는 글자 뒤면 '을', 없으면 '를' */
function objectParticle(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return '을(를)';
  return (last - 0xac00) % 28 === 0 ? '를' : '을';
}

/** 랜덤 이벤트 안내 (2026-11-18) */
const EVENT_LINES: Record<RunEventKind, string> = {
  fireflies: '반딧불이가 모였어요 · 곁에 가면 빛이 차올라요',
  lostParade: '길 잃은 주민들이 빛을 찾아와요',
  gift: '지나쳐 준 주민이 작은 선물을 두고 갔어요',
  darkWind: '어둠 바람이 불어요 · 잠깐 적이 빨라져요',
};

export class Toast {
  readonly el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  private readonly guide: HTMLElement;
  private readonly guideStep: HTMLElement;
  private readonly guideText: HTMLElement;
  private readonly guideSub: HTMLElement;
  private guideTimer: number | null = null;
  private hintTimer: number | null = null;
  private mercySeen = false;
  /** 넓히는 길 알림 예약 (2026-11-23) */
  private pathTimer: number | undefined = undefined;

  constructor() {
    this.guideStep = h('span', { class: 'guide__step' });
    this.guideText = h('p', { class: 'guide__text' });
    this.guideSub = h('p', { class: 'guide__sub' });
    this.guide = h('div', { class: 'guide', 'aria-live': 'assertive' }, this.guideStep, this.guideText, this.guideSub);
    this.guide.hidden = true;
    this.el.append(this.guide);

    // 2026-11-12 새 기획 (새 문구)
    // 2026-11-14: 켜면 중앙 광원이 조금 오르고, 꺼지면 알린다 (다시 켜러 가게)
    bus.on('station:lit', (e) => this.show((e.allLit ? '모든 등불이 켜졌어요!' : '등불이 켜졌어요') + (e.centralHeal >= 1 ? ` · 중앙 광원 +${Math.round(e.centralHeal)}` : '')));
    bus.on('station:out', () => this.show('등불이 꺼졌어요'));
    bus.on('player:down', (e) => this.show(`하트 ${e.hearts}개 남았어요`));
    // 2026-11-24 하트로 광원 되살리기 (기획 세션 문구)
    bus.on('central:revived', () => this.show('하트 하나로 광원을 다시 밝혔어요'));
    bus.on('central:reviveHint', () => this.show('광원이 잠들면 루미의 하트로 한 번 깨울 수 있어요'));

    bus.on('run:start', (e) => {
      this.hideGuide(true);
      this.clearHint();
      this.mercySeen = false;
      // 런의 밤(2026-11-23)은 stages.json에 없다 — 밤 번호·구간 이름은 run:start가 함께 보낸다
      const night = e.night !== undefined;
      const stage = night ? null : stageById(e.stageId);
      // 튜토리얼은 단계 안내가 따로 오므로 소개·등불 안내를 띄우지 않는다 (트라이얼·체험판은 띄움, 2026-11-14)
      if (stage?.tutorial) return;
      // 판 소개 (2026-11-13, 제안): 이 판의 목적을 먼저 보여 준다 — 런의 밤은 '밤 n' + 구간 이름
      this.showGuide(night ? { text: `밤 ${e.night}`, sub: e.band ?? '', stage: true } : { text: stage?.name ?? '', sub: stage?.blurb ?? '', stage: true });
      this.guideTimer = window.setTimeout(() => this.hideGuide(), STAGE_INTRO_MS);
      // 판 시작 안내 (2026-11-12, 제안): 등불 자리는 판마다 바뀌므로 노란 화살표를 따라가게 한다 (2026-11-13 '호박빛 표시' → '노란 화살표')
      if (night || (stage?.stations ?? 0) >= 1) this.hintTimer = window.setTimeout(() => this.show('노란 화살표를 따라 꺼진 등불을 켜요'), STAGE_INTRO_MS + 200);
      // 넓히는 길로 밤이 시작되면 (2026-11-23 두 길)
      if (e.path === 'expand') this.pathTimer = window.setTimeout(() => this.show('어둠이 더 거세져요'), STAGE_INTRO_MS + 2800);
    });
    const end = () => {
      // 튜토리얼을 마친 '잘했어요!'는 제 시간(2초)만큼 남긴다
      if (!this.guide.classList.contains('is-done')) this.hideGuide();
      this.clearHint();
    };
    bus.on('game:clear', end);
    bus.on('game:over', end);
    bus.on('ui:navigate', (e) => {
      if (e.to !== 'play') end();
    });

    // 튜토리얼 단계 안내: 다음 단계가 올 때까지 위쪽 가운데에 크게
    bus.on('tutorial:step', (e) => {
      if (e.done) {
        // 게임 쪽 문장이 '잘했어요!'로 시작하면 겹치지 않게 떼어 아래 줄로
        const rest = e.text.replace(/^잘했어요!?\s*/, '').trim();
        this.showGuide({ text: '잘했어요!', sub: rest || '이제 마을을 지킬 수 있어요', done: true });
        this.guideTimer = window.setTimeout(() => this.hideGuide(), DONE_HOLD_MS);
        return;
      }
      this.showGuide({ text: e.text, sub: e.sub, step: e.total > 0 ? `${e.step + 1} / ${e.total}` : '' });
    });

    // 2026-11-13 컨셉 시연판 토스트 (새 문구)
    bus.on('night:phase', (e) => {
      if (e.phase === 'predawn') this.show('새벽 전, 어둠이 몰려와요');
    });
    bus.on('friend:rescued', (e) => {
      const name = characterById(e.characterId).name;
      this.show(`${name}${objectParticle(name)} 되찾았어요! 이제 함께해요`);
    });
    bus.on('mercy:gain', (e) => {
      if (this.mercySeen) return;
      this.mercySeen = true;
      this.show(`그냥 지나가 주면 고마워해요 · 자비 +${e.score}`);
    });
    bus.on('stealth:exposed', () => this.show('풀숲에 너무 오래 있었어요! 들켰어요'));
    // 2026-11-23 어둠의 행렬: 한 마리도 돌려보내지 않고 지나가면 (돌려보낸 것은 점수만 뜸)
    bus.on('parade:passed', (e) => {
      if (e.banished === 0) this.show(e.mercy > 0 ? `길을 터 줬어요 · 자비 +${e.mercy}` : '길을 터 줬어요');
    });
    // 2026-11-18 랜덤 이벤트
    bus.on('run:event', (e) => this.show(EVENT_LINES[e.kind]));
    // 노월 두 모습 (2026-11-23): 찾아온 노월 / 분노한 노월, 진정되면 마음을 엶
    bus.on('witch:spawn', (e) => this.show(e.form === 'angry' ? '분노한 노월이 나타났어요' : '노월이 찾아왔어요'));
    bus.on('witch:returned', () => this.show('노월이 마음을 열었어요'));
    // 빛 레벨 ★ (2026-11-23)
    bus.on('growth:change', (e) => e.ups > 0 && this.show(`빛이 자랐어요 ★${e.level}`));
    bus.on('item:pickup', (e) => {
      const name = GameData.items.find((i) => i.id === e.itemId)?.name;
      if (name) this.show(`${name}${objectParticle(name)} 주웠어요`);
    });
  }

  show(text: string): void {
    if (!text) return;
    const line = h('p', { class: 'toast__line' }, text);
    line.addEventListener('animationend', () => line.remove());
    this.el.append(line);
  }

  private showGuide(o: { text: string; sub?: string; step?: string; done?: boolean; stage?: boolean }): void {
    if (this.guideTimer !== null) window.clearTimeout(this.guideTimer);
    this.guideTimer = null;
    this.guideStep.textContent = o.step ?? '';
    this.guideStep.hidden = !o.step;
    this.guideText.textContent = o.text;
    this.guideSub.textContent = o.sub ?? '';
    this.guideSub.hidden = !o.sub;
    this.guide.classList.toggle('is-done', Boolean(o.done));
    this.guide.classList.toggle('guide--stage', Boolean(o.stage));
    this.guide.classList.remove('is-leaving');
    // 문장이 바뀔 때마다 살짝 떠오르게
    this.guide.hidden = false;
    this.guide.style.animation = 'none';
    void this.guide.offsetWidth;
    this.guide.style.animation = '';
  }

  private hideGuide(now = false): void {
    if (this.guideTimer !== null) window.clearTimeout(this.guideTimer);
    this.guideTimer = null;
    if (this.guide.hidden) return;
    if (now) {
      this.guide.hidden = true;
      return;
    }
    this.guide.classList.add('is-leaving');
    this.guideTimer = window.setTimeout(() => {
      this.guide.hidden = true;
      this.guide.classList.remove('is-leaving');
      this.guideTimer = null;
    }, 400);
  }

  private clearHint(): void {
    window.clearTimeout(this.pathTimer);
    if (this.hintTimer !== null) window.clearTimeout(this.hintTimer);
    this.hintTimer = null;
  }
}
