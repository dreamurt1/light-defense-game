// 위 띠 바로 아래에 1.5초 떠올랐다 사라지는 한 줄.
// 2026-11-13 컨셉 시연판: 맨 위에 '안내 띠'(.guide)를 더했다 — 튜토리얼 단계 문장(다음 단계가 올 때까지)과
// 판 시작 때 스테이지 이름·목표 한 줄. 그 밖의 새 사건(새벽 전·친구·자비·들킴·노월·아이템)은 짧은 토스트로.
import { bus } from '../core/events';
import { GameData, characterById, stageById } from '../data';
import { h } from './dom';

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

export class Toast {
  readonly el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  private readonly guide: HTMLElement;
  private readonly guideStep: HTMLElement;
  private readonly guideText: HTMLElement;
  private readonly guideSub: HTMLElement;
  private guideTimer: number | null = null;
  private hintTimer: number | null = null;
  private mercySeen = false;
  private upsetSeen = false;

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

    bus.on('run:start', (e) => {
      this.hideGuide(true);
      this.clearHint();
      this.mercySeen = false;
      this.upsetSeen = false;
      const stage = stageById(e.stageId);
      // 튜토리얼은 단계 안내가 따로 오므로 소개·등불 안내를 띄우지 않는다 (트라이얼·체험판은 띄움, 2026-11-14)
      if (stage.tutorial) return;
      // 스테이지 소개 (2026-11-13, 제안): 이 판의 목적을 먼저 보여 준다
      this.showGuide({ text: stage.name, sub: stage.blurb ?? '', stage: true });
      this.guideTimer = window.setTimeout(() => this.hideGuide(), STAGE_INTRO_MS);
      // 판 시작 안내 (2026-11-12, 제안): 등불 자리는 판마다 바뀌므로 노란 화살표를 따라가게 한다 (2026-11-13 '호박빛 표시' → '노란 화살표')
      if (stage.stations >= 1) this.hintTimer = window.setTimeout(() => this.show('노란 화살표를 따라 꺼진 등불을 켜요'), STAGE_INTRO_MS + 200);
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
      this.showGuide({ text: e.text, step: e.total > 0 ? `${e.step + 1} / ${e.total}` : '' });
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
    bus.on('passive:upset', () => {
      if (this.upsetSeen) return;
      this.upsetSeen = true;
      this.show('어둠의 주민이 화가 났어요');
    });
    bus.on('stealth:exposed', () => this.show('풀숲에 너무 오래 있었어요! 들켰어요'));
    bus.on('witch:spawn', () => this.show('노월이 나타났어요'));
    bus.on('item:pickup', (e) => {
      const name = GameData.items.find((i) => i.id === e.itemId)?.name;
      if (name) this.show(`${name}${objectParticle(name)} 주웠어요`);
    });
  }

  show(text: string): void {
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
    if (this.hintTimer !== null) window.clearTimeout(this.hintTimer);
    this.hintTimer = null;
  }
}
