import { Room, RoomOptions, VideoPresets } from 'livekit-client';

/**
 * LiveKit client-side helpers for battle streaming.
 */

const DEFAULT_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
  },
  publishDefaults: {
    videoCodec: 'vp8',
  },
};

/** Create a configured LiveKit Room instance (not yet connected). */
export function createBattleRoom(options?: Partial<RoomOptions>): Room {
  return new Room({ ...DEFAULT_ROOM_OPTIONS, ...options });
}

/** Create a Room and connect to the given server. */
export async function connectToRoom(serverUrl: string, token: string, options?: Partial<RoomOptions>): Promise<Room> {
  const room = createBattleRoom(options);
  await room.connect(serverUrl, token);
  return room;
}
