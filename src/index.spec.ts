import { VoiceChannelObserver, Counts } from ".";
import { EventEmitter } from "events";
import { Client, VoiceState } from "discord.js";

describe("VoiceChannelObserver", () => {
  const fakeChannelId = "myChannelId";
  function buildObserver(existingUsers?: string[]) {
    const emitter = new EventEmitter();
    const observer = new VoiceChannelObserver(
      emitter as Client,
      fakeChannelId,
      existingUsers
    );
    return {
      observer,
      emitter,
    };
  }

  beforeEach(() => {});

  describe("to be defined", () => {
    it("with no users", () => {
      const { observer } = buildObserver();
      expect(observer).toBeDefined();
    });

    it("with predefined users", () => {
      const { observer } = buildObserver(["fakeUser"]);
      expect(observer).toBeDefined();
    });
  });

  describe("onIncreased", () => {
    it("changes parameters after join to channel", (done) => {
      const { observer, emitter } = buildObserver();
      observer.onIncreased((counts: Counts) => {
        expect(counts).toEqual({ now: 1, before: 0 });
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: "FROM_CHANNEL_ID",
        } as VoiceState,
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        } as VoiceState
      );
    });
  });

  describe("onDecreased", () => {
    it("changes parameters after leave to channel", (done) => {
      const { observer, emitter } = buildObserver(["fakeUser"]);

      observer.onDecreased((changeObject) => {
        expect(changeObject).toEqual({ now: 0, before: 1 });
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: "TO_CHANNEL_ID",
        }
      );
    });
  });

  describe("onEmpty", () => {
    it("called if count drops to empty", (done) => {
      const { observer, emitter } = buildObserver(["fakeUser"]);

      observer.onEmpty((changeObject) => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: "TO_CHANNEL_ID",
        }
      );
    });

    it("not called count doesn't match", (done) => {
      const { observer, emitter } = buildObserver(["fakeUser", "fakeUser2"]);
      const callback = jest.fn();
      observer.onEmpty(callback);
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: "TO_CHANNEL_ID",
        }
      );
      setTimeout(() => {
        expect(callback).not.toBeCalled();
        done();
      }, 1);
    });
  });

  describe("onNotEmpty", () => {
    it("called if count drops to empty", (done) => {
      const { observer, emitter } = buildObserver();

      observer.onNotEmpty((changeObject) => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: "FROM_CHANNEL_ID",
        },
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        }
      );
    });

    it("not called count doesn't match", (done) => {
      const { observer, emitter } = buildObserver(["otherFakeUser"]);
      const callback = jest.fn();
      observer.onNotEmpty(callback);
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: "asdasd",
        },
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        }
      );
      setTimeout(() => {
        expect(callback).not.toBeCalled();
        done();
      }, 1);
    });
  });

  describe("onChange", () => {
    it("called if count increase", (done) => {
      const { observer, emitter } = buildObserver();

      observer.onChange((changeObject) => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: "FROM_CHANNEL_ID",
        },
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        }
      );
    });
    it("called if count decrease", (done) => {
      const { observer, emitter } = buildObserver(["fakeUser"]);

      observer.onChange((changeObject) => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: "FROM_CHANNEL_ID",
        }
      );
    });
  });

  describe("onThresholdReached", () => {
    it("callback if threshold is reached", (done) => {
      const { observer, emitter } = buildObserver(["anotherFakeUser"]);
      observer.onThresholdReached(2, (changeObject) => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: "FROM_CHANNEL_ID",
        },
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        }
      );
    });

    it("not called count doesn't match", (done) => {
      const { observer, emitter } = buildObserver();
      const callback = jest.fn();
      observer.onThresholdReached(2, callback);
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: "asdasd",
        },
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        }
      );
      setTimeout(() => {
        expect(callback).not.toBeCalled();
        done();
      }, 1);
    });
  });

  describe("onThresholdLeft", () => {
    it("callback if threshold is left", (done) => {
      const { observer, emitter } = buildObserver([
        "fakeUser",
        "anotherFakeUser",
      ]);
      observer.onThresholdLeft(2, (changeObject) => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: "FROM_CHANNEL_ID",
        }
      );
    });

    it("not called count doesn't match", (done) => {
      const { observer, emitter } = buildObserver();
      const callback = jest.fn();
      observer.onThresholdLeft(0, callback);
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: "OTHER_CHANNEL",
        }
      );
      setTimeout(() => {
        expect(callback).not.toBeCalled();
        done();
      }, 1);
    });
  });

  describe("onNothingChanged", () => {
    it("callback if nothing changed", (done) => {
      const { observer, emitter } = buildObserver(["fakeUser"]);
      observer.onNothingChanged(() => {
        done();
      });
      emitter.emit(
        "voiceStateUpdate",
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        },
        {
          id: "fakeUser",
          channelID: fakeChannelId,
        }
      );
    });
  });
});
