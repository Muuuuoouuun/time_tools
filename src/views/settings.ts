import { el } from '../dom';
import { iconClose, iconCheck, iconSpeaker, iconUpload } from '../icons';
import { soundOptions } from '../state';
import type { Ctx, View } from '../view';

const PERSIST_LIMIT = 1_000_000; // ~1MB: persist custom sound as data URL below this

interface ChipRef { id: string; btn: HTMLButtonElement; check: HTMLSpanElement; }

export function createSettings(): View {
  let root: HTMLElement;
  let chips: ChipRef[] = [];
  let volumePctEl: HTMLSpanElement;
  let slider: HTMLInputElement;
  let uploadLabelEl: HTMLSpanElement;
  let flashTrack: HTMLDivElement;
  let flashKnob: HTMLSpanElement;

  function onUpload(ctx: Ctx, e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    if (f.size <= PERSIST_LIMIT) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        ctx.audio.setCustom(dataUrl);
        ctx.setState({ customName: f.name, customData: dataUrl, sound: 'custom' }, { settings: true, main: true });
      };
      reader.readAsDataURL(f);
    } else {
      const url = URL.createObjectURL(f);
      ctx.audio.setCustom(url);
      ctx.setState({ customName: f.name, customData: null, sound: 'custom' }, { settings: true, main: true });
    }
  }

  function build(r: HTMLElement, ctx: Ctx): void {
    root = r;
    chips = [];
    const s = ctx.state;

    const panel = el('div', {
      class: 'sc',
      style: 'width:380px;height:100%;background:var(--panel);border-left:1px solid var(--border);padding:26px 26px 30px;overflow-y:auto;box-shadow:-24px 0 60px -20px rgba(0,0,0,.5)',
      onclick: (e: Event) => e.stopPropagation(),
    });

    // header
    panel.append(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:24px' }, [
      el('span', { style: 'font-size:16px;font-weight:600' }, ['알림 설정']),
      el('button', {
        class: 'h-text',
        style: 'width:30px;height:30px;border-radius:9px;background:var(--surface);border:none;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer',
        onclick: () => ctx.setState({ settingsOpen: false }),
      }, [iconClose(15)]),
    ]));

    // 기본 알림음
    panel.append(sectionLabel('기본 알림음'));
    const chipWrap = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 24px' });
    for (const o of soundOptions(s.customName)) {
      const check = el('span', { style: 'display:none' }, [iconCheck(12)]);
      const btn = el('button', {
        style: 'display:flex;align-items:center;gap:6px;padding:9px 13px;border-radius:12px;font-size:12.5px;font-weight:500;cursor:pointer',
        onclick: () => { ctx.setState({ sound: o.id }); ctx.audio.play(o.id); },
      }, [check, o.label]) as HTMLButtonElement;
      chips.push({ id: o.id, btn, check });
      chipWrap.append(btn);
    }
    panel.append(chipWrap);

    // 볼륨
    volumePctEl = el('span', { class: 'mono', style: 'font-size:12px;color:var(--muted)' });
    panel.append(el('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px' }, [
      sectionLabel('볼륨'), volumePctEl,
    ]));
    slider = el('input', {
      type: 'range', min: '0', max: '100', value: String(s.volume),
      style: 'flex:1;height:4px;cursor:pointer',
      oninput: (e: Event) => ctx.setState({ volume: Number((e.target as HTMLInputElement).value) }),
    }) as HTMLInputElement;
    panel.append(el('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:24px' }, [
      iconSpeaker(16, false),
      slider,
      el('button', {
        class: 'h-bd2',
        style: 'padding:8px 13px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:12px;font-weight:500;cursor:pointer',
        onclick: () => ctx.audio.play(ctx.state.sound),
      }, ['미리듣기']),
    ]));

    // 커스텀 사운드
    panel.append(sectionLabel('커스텀 사운드'));
    uploadLabelEl = el('span', { style: 'flex:1;font-size:12.5px' });
    const fileInput = el('input', { type: 'file', accept: 'audio/*', style: 'display:none', onchange: (e: Event) => onUpload(ctx, e) });
    panel.append(el('label', {
      class: 'h-accent-bd',
      style: 'display:flex;align-items:center;gap:10px;margin:12px 0 24px;padding:13px 15px;background:var(--surface);border:1px dashed var(--border-2);border-radius:13px;cursor:pointer',
    }, [
      iconUpload(16),
      uploadLabelEl,
      fileInput,
    ]));

    // 화면 깜빡임
    flashKnob = el('span', { style: 'position:absolute;top:3px;width:19px;height:19px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .2s' });
    flashTrack = el('div', { style: 'width:44px;height:25px;border-radius:13px;position:relative;flex:none;transition:.2s' }, [flashKnob]);
    panel.append(el('div', {
      style: 'display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:14px;cursor:pointer',
      onclick: () => ctx.setState({ flash: !ctx.state.flash }),
    }, [
      el('div', {}, [
        el('div', { style: 'font-size:13.5px;font-weight:500' }, ['화면 깜빡임']),
        el('div', { style: 'font-size:11.5px;color:var(--faint);margin-top:2px' }, ['종료 시 화면을 번쩍여 알림']),
      ]),
      flashTrack,
    ]));

    root.replaceChildren(el('div', {
      style: 'position:absolute;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(3px);z-index:50;display:flex;justify-content:flex-end',
      onclick: () => ctx.setState({ settingsOpen: false }),
    }, [panel]));

    update(ctx);
  }

  function update(ctx: Ctx): void {
    const s = ctx.state;
    for (const c of chips) {
      const active = s.sound === c.id;
      c.btn.style.background = active ? 'var(--accent-soft)' : 'var(--surface)';
      c.btn.style.border = '1px solid ' + (active ? 'var(--accent)' : 'var(--border)');
      c.btn.style.color = active ? 'var(--accent)' : 'var(--muted)';
      c.check.style.display = active ? 'flex' : 'none';
    }
    volumePctEl.textContent = s.volume + '%';
    if (document.activeElement !== slider && Number(slider.value) !== s.volume) slider.value = String(s.volume);
    uploadLabelEl.textContent = s.customName || '오디오 파일 업로드';
    uploadLabelEl.style.color = s.customName ? 'var(--text)' : 'var(--muted)';
    flashTrack.style.background = s.flash ? 'var(--accent)' : 'var(--track)';
    flashKnob.style.left = s.flash ? '22px' : '3px';
  }

  return { build, update, rebuild: (ctx) => build(root, ctx) };
}

function sectionLabel(text: string): HTMLSpanElement {
  return el('span', { style: 'font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)' }, [text]);
}
