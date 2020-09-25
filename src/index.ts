import { Client, VoiceState } from "discord.js";
import { EventEmitter } from "events";

export enum Event {
  INCREASE = "increase",
  DECREASE = "decrease",
  NO_CHANGE = "no_change",
}

export interface Counts {
  before: number;
  now: number;
}

export class VoiceChannelObserver {
  private emitter: EventEmitter;

  constructor(
    private client: Client,
    private channelId: string,
    private currentPresentUsers: string[] = []
  ) {
    this.emitter = new EventEmitter();
    this.client.on(
      "voiceStateUpdate",
      (oldMember: VoiceState, newMember: VoiceState) => {
        if (this.hasUserJoined(oldMember, newMember)) {
          const countBefore = this.currentPresentUsers.length;
          this.currentPresentUsers.push(newMember.id);
          const countAfter = this.currentPresentUsers.length;
          this.emitIncrease(countBefore, countAfter);
          return;
        }

        if (this.hasUserLeft(oldMember, newMember)) {
          const countBefore = this.currentPresentUsers.length;
          this.currentPresentUsers = this.currentPresentUsers.filter(
            (userIdInList) => {
              return userIdInList !== newMember.id;
            }
          );
          const countAfter = this.currentPresentUsers.length;
          this.emitDecrease(countBefore, countAfter);
          return;
        }

        this.emitNothingChanged(this.currentPresentUsers.length);
      }
    );
  }

  private isChannelChanged(oldMember: VoiceState, newMember: VoiceState) {
    return oldMember.channelID !== newMember.channelID;
  }

  private hasUserJoined(oldMember: VoiceState, newMember: VoiceState) {
    if (!this.isChannelChanged(oldMember, newMember)) return false;
    return newMember.channelID === this.channelId;
  }

  private hasUserLeft(oldMember: VoiceState, newMember: VoiceState) {
    if (!this.isChannelChanged(oldMember, newMember)) return false;
    return oldMember.channelID === this.channelId;
  }

  private emitIncrease(before: number, now: number) {
    this.emitter.emit(Event.INCREASE, { before, now });
  }

  private emitNothingChanged(count: number) {
    this.emitter.emit(Event.NO_CHANGE, { before: count, now: count });
  }

  private emitDecrease(before: number, now: number) {
    this.emitter.emit(Event.DECREASE, { before, now });
  }

  public onEmpty(callback: (counts: Counts) => void) {
    this.onDecreased((counts: Counts) => {
      if (counts.now === 0 && counts.before > 0) callback(counts);
    });
  }

  public onChange(callback: (counts: Counts) => void) {
    this.onIncreased(callback);
    this.onDecreased(callback);
  }

  public onNothingChanged(callback: (counts: Counts) => void) {
    this.emitter.on(Event.NO_CHANGE, callback);
  }

  public onIncreased(callback: (counts: Counts) => void) {
    this.emitter.on(Event.INCREASE, callback);
  }

  public onDecreased(callback: (counts: Counts) => void) {
    this.emitter.on(Event.DECREASE, callback);
  }

  public onNotEmpty(callback: (counts: Counts) => void) {
    this.emitter.on(Event.INCREASE, (counts: Counts) => {
      console.log(counts);
      if (counts.before === 0 && counts.now > 0) callback(counts);
    });
  }

  public onThresholdReached(
    threshold: number,
    callback: (channelId: string, counts: Counts) => void
  ) {
    this.emitter.on(Event.INCREASE, (counts: Counts) => {
      if (counts.now >= threshold) callback(this.channelId, counts);
    });
  }

  public onThresholdLeft(
    threshold: number,
    callback: (channelId: string, counts: Counts) => void
  ) {
    this.emitter.on(Event.DECREASE, (counts: Counts) => {
      if (counts.now < threshold) callback(this.channelId, counts);
    });
  }
}
