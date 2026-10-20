import Phaser from 'phaser';
import type { SimulationSnapshot } from '../engine/simulation/Simulation';
import { getCharacterById } from '../engine/data/characters';
import type { TrainingSession } from '../training/TrainingSession';
import { DUMMY_LABELS } from '../training/TrainingSession';
import { MODE_LABELS, moveInputLabel, signedFrames } from './combatLabels';

/** Read-only training instrumentation, kept below the feet to leave jumps unobstructed. */
export class TrainingHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly status: Phaser.GameObjects.Text;
  private readonly fighters: Phaser.GameObjects.Text[];
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly distance: Phaser.GameObjects.Text;
  private readonly contact: Phaser.GameObjects.Text;
  private readonly panelY: number;

  constructor(scene: Phaser.Scene, private readonly width: number, height: number) {
    const left = width / 2 - 350;
    this.panelY = height - 85;
    const background = scene.add.rectangle(width / 2, this.panelY + 35, 700, 70, 0x14151e, 0.94)
      .setStrokeStyle(1, 0x686271);
    this.status = scene.add.text(width / 2, this.panelY + 4, '', {
      color: '#ffd166', fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.fighters = [0, 1].map((index) => scene.add.text(left + 12 + index * 350, this.panelY + 19, '', {
      color: '#f4f0e8', fontSize: '10px', lineSpacing: 2,
    }));
    this.progress = scene.add.graphics();
    this.distance = scene.add.text(left + 12, this.panelY + 59, '', {
      color: '#b7b2c5', fontSize: '9px',
    });
    this.contact = scene.add.text(width / 2 + 12, this.panelY + 59, '', {
      color: '#ffd166', fontSize: '9px',
    });
    const footerBackground = scene.add.rectangle(width / 2, height - 8, width, 16, 0x14151e, 0.94);
    const footer = scene.add.text(width / 2, height - 8,
      'P PAUSA  ·  . UM FRAME  ·  F2 REINICIA  ·  G ADVERSÁRIO  ·  H COLISÕES  ·  I ENTRADAS  ·  ESC MENU', {
        color: '#e9e4ee', fontSize: '9px',
      }).setOrigin(0.5);
    this.root = scene.add.container(0, 0, [background, this.status, ...this.fighters,
      this.progress, this.distance, this.contact, footerBackground, footer]).setDepth(110).setScrollFactor(0);
  }

  update(snapshot: SimulationSnapshot, session: TrainingSession): void {
    this.status.setText(`TREINO · ${session.paused ? 'PAUSADO' : 'EM CURSO'} · ${DUMMY_LABELS[session.dummyMode]}`);
    this.progress.clear();
    snapshot.characters.forEach((character, index) => {
      const move = character.attack
        ? getCharacterById(character.fighterId)?.moves.find(({ id }) => id === character.attack?.moveId)
        : undefined;
      const lockedFrames = move && character.attack
        ? move.startup + move.activeFrames + move.recovery - character.attack.elapsedFrames
        : character.remainingStateFrames;
      const detail = move
        ? `${moveInputLabel(move)} · S${move.startup} A${move.activeFrames} R${move.recovery}`
        : lockedFrames > 0 ? `Faltam ${lockedFrames}F para recuperar` : 'Pronto para agir';
      this.fighters[index]?.setText(`P${index + 1} · ${MODE_LABELS[character.mode]}\n${detail}`);
      const left = this.width / 2 - 338 + index * 350;
      const barWidth = 320;
      const barY = this.panelY + 48;
      this.progress.fillStyle(0x34313f).fillRect(left, barY, barWidth, 5);
      if (!move || !character.attack) return;
      const total = move.startup + move.activeFrames + move.recovery;
      let offset = 0;
      for (const [duration, color] of [[move.startup, 0xffb454], [move.activeFrames, 0xff687d], [move.recovery, 0x76b8e7]]) {
        const width = duration / total * barWidth;
        this.progress.fillStyle(color).fillRect(left + offset, barY, width, 5);
        offset += width;
      }
      const cursor = Math.min(1, character.attack.elapsedFrames / total) * barWidth;
      this.progress.fillStyle(0xffffff).fillRect(left + cursor, barY - 2, 2, 9);
    });
    const distance = Math.round(Math.abs(snapshot.characters[0].x - snapshot.characters[1].x));
    this.distance.setText(`FRAME ${snapshot.frame} · DISTÂNCIA ${distance} · COLISÕES ${session.showGeometry ? 'VISÍVEIS' : 'OCULTAS'}`);
    const contact = snapshot.recentContacts[snapshot.recentContacts.length - 1]?.event;
    this.contact.setText(contact?.frameAdvantage !== undefined
      ? `REC ${contact.attackerRecoveryFrames}F · STUN ${contact.defenderStunFrames}F · ADV ATAC. ${signedFrames(contact.frameAdvantage)}`
      : 'S: preparo · A: ativo · R: recuperação');
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
